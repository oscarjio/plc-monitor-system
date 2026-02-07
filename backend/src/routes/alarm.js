/**
 * Alarm Routes - Database Integration with A/B/C Classification
 * Alarm management and history with severity classification
 */

const express = require('express');
const repository = require('../db/repository');
const alarmClassification = require('../services/alarmClassification');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/alarms
 * Get all alarms with A/B/C classification
 */
router.get('/', async (req, res, next) => {
  try {
    const { active, deviceId, alarmClass } = req.query;

    let alarms;
    if (deviceId) {
      alarms = await repository.getAlarmsByDevice(deviceId);
    } else if (active === 'true') {
      alarms = await repository.getActiveAlarms();
    } else {
      alarms = await repository.getActiveAlarms(); // Default to active
    }

    // Enrich with classification
    let enrichedAlarms = alarms.map(a => alarmClassification.enrichAlarm(a));

    // Filter by alarm class if requested
    if (alarmClass) {
      enrichedAlarms = enrichedAlarms.filter(a => a.alarmClass === alarmClass.toUpperCase());
    }

    // Sort by priority (A > B > C)
    enrichedAlarms = alarmClassification.sortByPriority(enrichedAlarms);

    res.json({
      success: true,
      data: enrichedAlarms.map(a => ({
        id: a.id,
        deviceId: a.device_id,
        name: a.alarm_name,
        message: a.message,
        priority: a.priority,
        alarmClass: a.alarmClass,
        className: a.className,
        classNameEn: a.classNameEn,
        color: a.color,
        bgColor: a.bgColor,
        soundFile: a.soundFile,
        soundVolume: a.soundVolume,
        requiresAcknowledgement: a.requiresAcknowledgement,
        uiStyle: a.uiStyle,
        timeTriggered: a.time_triggered,
        timeAcknowledged: a.time_acknowledged,
        timeCleared: a.time_cleared,
        isActive: a.is_active,
        acknowledgedBy: a.acknowledged_by,
        metadata: a.metadata
      })),
      count: enrichedAlarms.length
    });
  } catch (err) {
    logger.error({ err }, 'Error fetching alarms');
    next(err);
  }
});

/**
 * GET /api/alarms/stats
 * Get alarm statistics with A/B/C breakdown
 */
router.get('/stats', async (req, res, next) => {
  try {
    const activeAlarms = await repository.getActiveAlarms();
    
    // Get stats by class
    const clasStats = alarmClassification.getStatsByClass(activeAlarms);
    
    // Get legacy priority stats
    const priorityStats = await repository.getAlarmStats();

    res.json({
      success: true,
      data: {
        // A/B/C Classification
        byClass: {
          A: {
            name: 'KRITISK',
            nameEn: 'CRITICAL',
            count: clasStats.A.count,
            unacknowledged: clasStats.A.unacknowledged,
            color: alarmClassification.getClassConfig('A').color
          },
          B: {
            name: 'VARNING',
            nameEn: 'WARNING',
            count: clasStats.B.count,
            unacknowledged: clasStats.B.unacknowledged,
            color: alarmClassification.getClassConfig('B').color
          },
          C: {
            name: 'INFO',
            nameEn: 'INFORMATION',
            count: clasStats.C.count,
            unacknowledged: clasStats.C.unacknowledged,
            color: alarmClassification.getClassConfig('C').color
          }
        },
        // Legacy priority breakdown
        byPriority: {
          critical: parseInt(priorityStats.critical) || 0,
          high: parseInt(priorityStats.high) || 0,
          medium: parseInt(priorityStats.medium) || 0,
          low: parseInt(priorityStats.low) || 0,
          unacknowledged: parseInt(priorityStats.unacknowledged) || 0
        },
        // Totals
        total: activeAlarms.length,
        totalUnacknowledged: clasStats.A.unacknowledged + 
                            clasStats.B.unacknowledged + 
                            clasStats.C.unacknowledged
      }
    });
  } catch (err) {
    logger.error({ err }, 'Error fetching alarm stats');
    next(err);
  }
});

/**
 * GET /api/alarms/dashboard
 * Get dashboard summary with A/B/C classification
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const activeAlarms = await repository.getActiveAlarms();
    const summary = alarmClassification.getDashboardSummary(activeAlarms);

    res.json({
      success: true,
      data: summary
    });
  } catch (err) {
    logger.error({ err }, 'Error fetching alarm dashboard');
    next(err);
  }
});

/**
 * GET /api/alarms/by-class/:class
 * Get alarms filtered by A/B/C class
 */
router.get('/by-class/:class', async (req, res, next) => {
  try {
    const { class: alarmClass } = req.params;
    
    if (!['A', 'B', 'C'].includes(alarmClass.toUpperCase())) {
      return res.status(400).json({
        error: 'Invalid alarm class',
        message: 'Alarm class must be A, B, or C'
      });
    }

    const activeAlarms = await repository.getActiveAlarms();
    const filtered = alarmClassification.filterByClass(activeAlarms, alarmClass.toUpperCase());
    const enriched = filtered.map(a => alarmClassification.enrichAlarm(a));

    res.json({
      success: true,
      data: enriched,
      count: enriched.length,
      alarmClass: alarmClass.toUpperCase()
    });
  } catch (err) {
    logger.error({ err }, 'Error fetching alarms by class');
    next(err);
  }
});

/**
 * GET /api/alarms/:id
 * Get single alarm with classification
 */
router.get('/:id', async (req, res, next) => {
  try {
    const alarms = await repository.getActiveAlarms();
    const alarm = alarms.find(a => a.id === req.params.id);

    if (!alarm) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Alarm not found: ${req.params.id}`
      });
    }

    const enriched = alarmClassification.enrichAlarm(alarm);
    const needsEscalation = alarmClassification.needsEscalation(alarm);

    res.json({
      success: true,
      data: {
        ...enriched,
        needsEscalation,
        escalatedClass: needsEscalation 
          ? alarmClassification.escalateClass(enriched.alarmClass)
          : null
      }
    });
  } catch (err) {
    logger.error({ err, id: req.params.id }, 'Error fetching alarm');
    next(err);
  }
});

/**
 * POST /api/alarms/:id/acknowledge
 * Acknowledge an alarm
 */
router.post('/:id/acknowledge', async (req, res, next) => {
  try {
    const { userId } = req.body;

    const alarm = await repository.acknowledgeAlarm(req.params.id, userId || null);
    const enriched = alarmClassification.enrichAlarm(alarm);

    logger.info({ 
      alarmId: alarm.id, 
      userId, 
      alarmClass: enriched.alarmClass 
    }, 'Alarm acknowledged');

    res.json({
      success: true,
      data: {
        id: alarm.id,
        alarmClass: enriched.alarmClass,
        timeAcknowledged: alarm.time_acknowledged,
        acknowledgedBy: alarm.acknowledged_by
      }
    });
  } catch (err) {
    logger.error({ err, id: req.params.id }, 'Error acknowledging alarm');
    
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: 'Not Found',
        message: `Alarm not found: ${req.params.id}`
      });
    }
    
    next(err);
  }
});

/**
 * POST /api/alarms/:id/clear
 * Clear an alarm
 */
router.post('/:id/clear', async (req, res, next) => {
  try {
    const alarm = await repository.clearAlarm(req.params.id);
    const enriched = alarmClassification.enrichAlarm(alarm);

    logger.info({ 
      alarmId: alarm.id,
      alarmClass: enriched.alarmClass
    }, 'Alarm cleared');

    res.json({
      success: true,
      data: {
        id: alarm.id,
        alarmClass: enriched.alarmClass,
        timeCleared: alarm.time_cleared,
        isActive: alarm.is_active
      }
    });
  } catch (err) {
    logger.error({ err, id: req.params.id }, 'Error clearing alarm');
    
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: 'Not Found',
        message: `Alarm not found: ${req.params.id}`
      });
    }
    
    next(err);
  }
});

/**
 * POST /api/alarms
 * Create a new alarm with automatic classification
 */
router.post('/', async (req, res, next) => {
  try {
    const { deviceId, alarmName, message, priority, metadata } = req.body;

    if (!deviceId || !alarmName) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Missing required fields: deviceId, alarmName'
      });
    }

    const alarm = await repository.createAlarm({
      device_id: deviceId,
      alarm_name: alarmName,
      message: message || null,
      priority: priority || 'medium',
      metadata: metadata || null,
      is_active: true
    });

    const enriched = alarmClassification.enrichAlarm(alarm);

    logger.info({ 
      alarmId: alarm.id, 
      deviceId, 
      alarmName,
      alarmClass: enriched.alarmClass,
      priority: alarm.priority
    }, 'Alarm created');

    res.status(201).json({
      success: true,
      data: {
        id: alarm.id,
        deviceId: alarm.device_id,
        name: alarm.alarm_name,
        message: alarm.message,
        priority: alarm.priority,
        alarmClass: enriched.alarmClass,
        className: enriched.className,
        color: enriched.color,
        soundFile: enriched.soundFile,
        requiresAcknowledgement: enriched.requiresAcknowledgement,
        timeTriggered: alarm.time_triggered
      }
    });
  } catch (err) {
    logger.error({ err }, 'Error creating alarm');
    next(err);
  }
});

/**
 * POST /api/alarms/test-classification
 * Test alarm classification (for debugging)
 */
router.post('/test-classification', (req, res) => {
  const { alarmName, priority } = req.body;
  
  const testAlarm = {
    alarm_name: alarmName || 'Test Alarm',
    priority: priority || 'medium',
    time_triggered: new Date(),
    is_active: true
  };

  const enriched = alarmClassification.enrichAlarm(testAlarm);

  res.json({
    success: true,
    data: {
      input: testAlarm,
      classification: {
        alarmClass: enriched.alarmClass,
        className: enriched.className,
        color: enriched.color,
        soundFile: enriched.soundFile,
        requiresAcknowledgement: enriched.requiresAcknowledgement,
        uiStyle: enriched.uiStyle
      }
    }
  });
});

module.exports = router;
