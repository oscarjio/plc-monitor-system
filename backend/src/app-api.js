/**
 * PLC Monitor - REST API Server
 * Main API application with database integration
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/plcs', require('./routes/plc'));
app.use('/api/alarms', require('./routes/alarm'));

// Stats endpoint
app.get('/api/stats', async (req, res, next) => {
  try {
    const repository = require('./db/repository');
    
    const [deviceStats, alarmStats] = await Promise.all([
      repository.getDeviceStats(),
      repository.getAlarmStats()
    ]);

    res.json({
      success: true,
      data: {
        devices: deviceStats,
        alarms: {
          critical: parseInt(alarmStats.critical) || 0,
          high: parseInt(alarmStats.high) || 0,
          medium: parseInt(alarmStats.medium) || 0,
          low: parseInt(alarmStats.low) || 0,
          unacknowledged: parseInt(alarmStats.unacknowledged) || 0
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log('\n🚀 PLC Monitor API Server Started');
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ Health check: http://localhost:${PORT}/health`);
  console.log(`✓ API endpoints: http://localhost:${PORT}/api`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  
  server.close(async () => {
    const prisma = require('./db/client');
    await prisma.$disconnect();
    console.log('✓ Server closed');
    process.exit(0);
  });
});

module.exports = app;
