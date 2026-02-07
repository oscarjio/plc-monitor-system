/**
 * SCADA Platform - Main Express Application
 * Integrates Mitsubishi FX5 PLC via SLMP Driver
 * Real-time WebSocket updates, REST API
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const dotenv = require('dotenv');
const SlmpDriver = require('./drivers/mitsubishi-fx5/slmp-driver');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Configuration
const PORT = process.env.PORT || 3000;
const PLC_HOST = process.env.PLC_HOST || 'localhost';
const PLC_PORT = process.env.PLC_PORT || 5007;
const POLLING_INTERVAL = process.env.POLLING_INTERVAL || 1000; // 1 second

// PLC Driver Instance
let plcDriver = null;
let pollingTimer = null;
let connectedClients = new Set();
let lastData = {};

/**
 * Initialize PLC Driver
 */
async function initPLC() {
  try {
    plcDriver = new SlmpDriver({
      host: PLC_HOST,
      port: PLC_PORT,
      timeout: 5000,
      keepAliveInterval: 10000,
    });

    plcDriver.on('connected', () => {
      console.log('✅ PLC Connected');
      broadcastMessage({ type: 'plc:connected', status: 'connected' });
      startPolling();
    });

    plcDriver.on('disconnected', () => {
      console.log('❌ PLC Disconnected');
      broadcastMessage({ type: 'plc:disconnected', status: 'disconnected' });
      stopPolling();
    });

    plcDriver.on('error', (error) => {
      console.error('⚠️  PLC Error:', error.message);
      broadcastMessage({ type: 'plc:error', error: error.message });
    });

    await plcDriver.connect();
    return true;
  } catch (error) {
    console.error('Failed to initialize PLC:', error.message);
    return false;
  }
}

/**
 * Poll PLC and send data to WebSocket clients
 */
async function pollPLC() {
  if (!plcDriver || plcDriver.state !== 'connected') {
    return;
  }

  try {
    // Read example tags (D1 = Temperature, D2 = Pressure, Y0 = Heater Status)
    const temperature = await plcDriver.readWordUnits('D1', 1);
    const pressure = await plcDriver.readWordUnits('D2', 1);
    const heater = await plcDriver.readBitUnits('Y0', 1);

    const data = {
      timestamp: new Date().toISOString(),
      tags: {
        temperature: temperature.readUInt16LE(0) / 100, // Scale by 0.01
        pressure: pressure.readUInt16LE(0) / 100,
        heater: (heater[0] & 0x01) === 1,
      },
    };

    lastData = data;
    broadcastMessage({ type: 'plc:data', data });
  } catch (error) {
    console.error('Polling error:', error.message);
  }
}

/**
 * Start periodic polling
 */
function startPolling() {
  if (pollingTimer) return;
  
  console.log(`📊 Starting polling every ${POLLING_INTERVAL}ms`);
  
  // Poll immediately
  pollPLC();
  
  // Then poll on interval
  pollingTimer = setInterval(pollPLC, POLLING_INTERVAL);
}

/**
 * Stop polling
 */
function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
    console.log('⏸️  Polling stopped');
  }
}

/**
 * Broadcast message to all connected WebSocket clients
 */
function broadcastMessage(message) {
  const json = JSON.stringify(message);
  
  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  });
}

/**
 * WebSocket Connection Handler
 */
wss.on('connection', (ws) => {
  console.log('🔌 WebSocket client connected');
  connectedClients.add(ws);

  // Send current data to new client
  if (Object.keys(lastData).length > 0) {
    ws.send(JSON.stringify({ type: 'plc:data', data: lastData }));
  }

  // Handle incoming commands
  ws.on('message', async (message) => {
    try {
      const command = JSON.parse(message);

      if (command.type === 'plc:write') {
        const { address, values, type } = command;

        if (type === 'word') {
          await plcDriver.writeWordUnits(address, values);
          console.log(`✍️  Wrote to ${address}:`, values);
        } else if (type === 'bit') {
          await plcDriver.writeBitUnits(address, values);
          console.log(`✍️  Wrote bit to ${address}:`, values);
        }

        ws.send(JSON.stringify({ type: 'command:success', address, values }));
      }
    } catch (error) {
      console.error('Command error:', error.message);
      ws.send(JSON.stringify({ type: 'command:error', error: error.message }));
    }
  });

  ws.on('close', () => {
    connectedClients.delete(ws);
    console.log('🔌 WebSocket client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error.message);
    connectedClients.delete(ws);
  });
});

/**
 * REST API Routes
 */

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    plc: plcDriver ? plcDriver.state : 'not-initialized',
    clients: connectedClients.size,
    lastData: Object.keys(lastData).length > 0 ? lastData : null,
  });
});

// Get current PLC data
app.get('/api/plc/data', (req, res) => {
  if (Object.keys(lastData).length === 0) {
    return res.status(503).json({ error: 'No data available - PLC not connected' });
  }
  res.json(lastData);
});

// Read PLC tag
app.get('/api/plc/read/:address/:count?', async (req, res) => {
  try {
    const { address, count } = req.params;
    const n = parseInt(count) || 1;

    if (!plcDriver || plcDriver.state !== 'connected') {
      return res.status(503).json({ error: 'PLC not connected' });
    }

    const data = await plcDriver.readWordUnits(address, n);
    const values = [];
    
    for (let i = 0; i < n; i++) {
      values.push(data.readUInt16LE(i * 2));
    }

    res.json({ address, values, count: n });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Write PLC tag
app.post('/api/plc/write/:address', express.json(), async (req, res) => {
  try {
    const { address } = req.params;
    const { values, type } = req.body;

    if (!Array.isArray(values)) {
      return res.status(400).json({ error: 'Values must be an array' });
    }

    if (!plcDriver || plcDriver.state !== 'connected') {
      return res.status(503).json({ error: 'PLC not connected' });
    }

    if (type === 'bit') {
      await plcDriver.writeBitUnits(address, values);
    } else {
      await plcDriver.writeWordUnits(address, values);
    }

    res.json({ success: true, address, values, type: type || 'word' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Express error:', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

/**
 * Start Server
 */
async function start() {
  console.log('\n🚀 SCADA Platform Backend Starting...\n');

  // Initialize PLC
  const plcReady = await initPLC();
  if (!plcReady) {
    console.warn('⚠️  PLC initialization failed, but server will continue...');
  }

  // Start HTTP server
  server.listen(PORT, () => {
    console.log(`\n✅ Server running on http://localhost:${PORT}`);
    console.log(`📊 WebSocket ready at ws://localhost:${PORT}`);
    console.log(`❤️  Health check: http://localhost:${PORT}/health\n`);
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  stopPolling();
  if (plcDriver) {
    plcDriver.disconnect();
  }
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Start
start();

module.exports = { app, server, wss };
