/**
 * PLC Monitor - API Server with Scheduler
 * Main application with cron-based data acquisition
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const PLCService = require('./services/plcService');
const DataAcquisitionService = require('./services/dataAcquisitionService');
const schedulerService = require('./services/schedulerService');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize services
const plcService = new PLCService();
const dataAcquisitionService = new DataAcquisitionService(plcService);

// Initialize scheduler
schedulerService.initialize({
  dataAcquisition: dataAcquisitionService
});

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
  const health = dataAcquisitionService.getHealthStatus();
  const schedulerStatus = schedulerService.getStatus();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    scheduler: schedulerStatus,
    dataAcquisition: {
      activePolls: Object.keys(health).length,
      healthyDevices: Object.values(health).filter(h => h.healthy).length,
      unhealthyDevices: Object.values(health).filter(h => !h.healthy).length
    }
  });
});

// API Routes
app.use('/api/plcs', require('./routes/plc'));
app.use('/api/alarms', require('./routes/alarm'));
app.use('/api/tags', require('./routes/tag'));

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

// Scheduler control endpoints
app.get('/api/scheduler/status', (req, res) => {
  const status = schedulerService.getStatus();
  const health = dataAcquisitionService.getHealthStatus();
  
  res.json({
    success: true,
    data: {
      scheduler: status,
      devices: health
    }
  });
});

app.post('/api/scheduler/trigger/:jobName', async (req, res, next) => {
  try {
    const { jobName } = req.params;
    await schedulerService.triggerJob(jobName);
    
    res.json({
      success: true,
      message: `Job ${jobName} triggered manually`
    });
  } catch (err) {
    next(err);
  }
});

app.post('/api/scheduler/start', (req, res) => {
  schedulerService.startAll();
  res.json({
    success: true,
    message: 'All scheduler jobs started'
  });
});

app.post('/api/scheduler/stop', (req, res) => {
  schedulerService.stopAll();
  dataAcquisitionService.stopAll();
  res.json({
    success: true,
    message: 'All scheduler jobs stopped'
  });
});

// Data acquisition control endpoints
app.post('/api/data-acquisition/start-all', async (req, res, next) => {
  try {
    await dataAcquisitionService.startAll();
    res.json({
      success: true,
      message: 'Data acquisition started for all enabled devices'
    });
  } catch (err) {
    next(err);
  }
});

app.post('/api/data-acquisition/stop-all', async (req, res, next) => {
  try {
    await dataAcquisitionService.stopAll();
    res.json({
      success: true,
      message: 'Data acquisition stopped for all devices'
    });
  } catch (err) {
    next(err);
  }
});

app.get('/api/data-acquisition/health', (req, res) => {
  const health = dataAcquisitionService.getHealthStatus();
  res.json({
    success: true,
    data: health
  });
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
  console.log('\n🚀 PLC Monitor API Server with Scheduler Started\n');
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ Health check: http://localhost:${PORT}/health`);
  console.log(`✓ API endpoints: http://localhost:${PORT}/api`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Start scheduler jobs
  console.log('\n📅 Starting cron scheduler...');
  schedulerService.startAll();
  
  // Start initial data acquisition
  console.log('\n🔄 Starting initial data acquisition...');
  dataAcquisitionService.startAll()
    .then(() => {
      console.log('✅ Initial data acquisition started\n');
    })
    .catch(err => {
      console.error('❌ Failed to start data acquisition:', err.message);
    });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  
  // Stop scheduler
  schedulerService.stopAll();
  
  // Stop data acquisition
  await dataAcquisitionService.stopAll();
  
  // Close server
  server.close(async () => {
    const prisma = require('./db/client');
    await prisma.$disconnect();
    console.log('✓ Server closed');
    process.exit(0);
  });
});

module.exports = { app, server, dataAcquisitionService, schedulerService };
