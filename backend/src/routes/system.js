/**
 * System Routes
 * System health, configuration, and statistics
 */

const express = require('express');
const os = require('os');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/system/health
 * System health status
 */
router.get('/health', (req, res, next) => {
  try {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();

    res.json({
      success: true,
      status: 'operational',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      },
      cpu: {
        cores: os.cpus().length,
        loadAverage: os.loadavg()
      },
      services: {
        api: 'operational',
        database: 'operational',
        websocket: 'operational',
        plcDriver: 'operational'
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/system/stats
 * System statistics
 */
router.get('/stats', (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        plcs: {
          total: 3,
          online: 2,
          offline: 1
        },
        tags: {
          total: 48,
          online: 45,
          offline: 3
        },
        data: {
          pointsCollected: 1248960,
          pointsPerSecond: 14.2
        },
        alarms: {
          active: 2,
          acknowledged: 1,
          cleared: 47
        },
        api: {
          requestsPerSecond: 8.3,
          averageLatency: 45,
          errorRate: 0.2
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/system/config
 * Get system configuration
 */
router.get('/config', (req, res, next) => {
  try {
    const config = require('../config');

    res.json({
      success: true,
      data: {
        server: {
          port: config.PORT,
          host: config.HOST,
          environment: config.NODE_ENV
        },
        database: {
          host: config.DB_HOST,
          port: config.DB_PORT,
          name: config.DB_NAME
        },
        dataAcquisition: {
          defaultPollIntervalMs: config.DEFAULT_POLL_INTERVAL_MS,
          dataRetentionDays: config.DATA_RETENTION_DAYS
        },
        alarms: {
          checkIntervalMs: config.ALARM_CHECK_INTERVAL_MS,
          historyRetentionDays: config.ALARM_HISTORY_RETENTION_DAYS
        },
        features: {
          websocket: config.ENABLE_WEBSOCKET,
          alarms: config.ENABLE_ALARMS,
          reports: config.ENABLE_REPORTS,
          aiAnalysis: config.ENABLE_AI_ANALYSIS
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/system/version
 * Get version information
 */
router.get('/version', (req, res, next) => {
  try {
    const packageJson = require('../../package.json');

    res.json({
      success: true,
      data: {
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description,
        node: process.version,
        platform: process.platform,
        arch: process.arch
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/system/logs
 * Get recent system logs
 */
router.get('/logs', (req, res, next) => {
  try {
    const { level = 'info', limit = 100 } = req.query;

    // Mock: return sample logs
    const mockLogs = [
      {
        timestamp: new Date(Date.now() - 60000).toISOString(),
        level: 'info',
        module: 'plc-driver',
        message: 'Connected to PLC-001'
      },
      {
        timestamp: new Date(Date.now() - 30000).toISOString(),
        level: 'info',
        module: 'data-acquisition',
        message: 'Polled 48 tags from PLC-001'
      },
      {
        timestamp: new Date(Date.now() - 10000).toISOString(),
        level: 'warn',
        module: 'plc-driver',
        message: 'Connection timeout: PLC-003'
      }
    ];

    res.json({
      success: true,
      data: mockLogs,
      count: mockLogs.length
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/system/info
 * Get system information
 */
router.get('/info', (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        systemName: 'PLC Monitor System',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: Math.floor(process.uptime()),
        startTime: new Date(Date.now() - process.uptime() * 1000).toISOString(),
        hostname: os.hostname(),
        platform: os.platform(),
        architecture: os.arch(),
        totalMemory: Math.round(os.totalmem() / 1024 / 1024),
        freeMemory: Math.round(os.freemem() / 1024 / 1024)
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
