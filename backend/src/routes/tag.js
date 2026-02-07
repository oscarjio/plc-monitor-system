/**
 * Tag Routes
 * Tag read/write operations and monitoring
 */

const express = require('express');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Mock tags database
 */
const tags = [
  { plcId: 'PLC-001', id: 'TAG001', address: 'D100', name: 'Motor Speed', dataType: 'WORD', value: 1500, unit: 'RPM' },
  { plcId: 'PLC-001', id: 'TAG002', address: 'D101', name: 'Temperature', dataType: 'WORD', value: 65, unit: '°C' },
  { plcId: 'PLC-002', id: 'TAG003', address: '100', name: 'Pressure', dataType: 'WORD', value: 3.5, unit: 'bar' }
];

/**
 * GET /api/tags/:plcId
 * List all tags for a PLC
 */
router.get('/:plcId', (req, res, next) => {
  try {
    const { plcId } = req.params;
    const plcTags = tags.filter(t => t.plcId === plcId);

    res.json({
      success: true,
      data: plcTags,
      count: plcTags.length
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tags/:plcId/:tagId
 * Get specific tag details
 */
router.get('/:plcId/:tagId', (req, res, next) => {
  try {
    const { plcId, tagId } = req.params;
    const tag = tags.find(t => t.plcId === plcId && t.id === tagId);

    if (!tag) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Tag not found'
      });
    }

    res.json({
      success: true,
      data: tag
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tags/:plcId/:tagId/history
 * Get tag value history
 */
router.get('/:plcId/:tagId/history', (req, res, next) => {
  try {
    const { plcId, tagId } = req.params;
    const { limit = 100, timeRange = '1h' } = req.query;

    const tag = tags.find(t => t.plcId === plcId && t.id === tagId);

    if (!tag) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Tag not found'
      });
    }

    // Mock historical data
    const history = Array.from({ length: parseInt(limit) }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
      value: tag.value + Math.random() * 10 - 5,
      quality: 'good'
    }));

    res.json({
      success: true,
      data: history,
      count: history.length,
      timeRange
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tags/:plcId/:tagId/write
 * Write value to tag
 */
router.post('/:plcId/:tagId/write', (req, res, next) => {
  try {
    const { plcId, tagId } = req.params;
    const { value } = req.body;

    const tag = tags.find(t => t.plcId === plcId && t.id === tagId);

    if (!tag) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Tag not found'
      });
    }

    const oldValue = tag.value;
    tag.value = value;

    logger.info({ plcId, tagId, oldValue, newValue: value }, 'Tag written');

    res.json({
      success: true,
      message: 'Value written successfully',
      data: {
        plcId,
        tagId,
        oldValue,
        newValue: value,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tags/:plcId/:tagId/stats
 * Get tag statistics
 */
router.get('/:plcId/:tagId/stats', (req, res, next) => {
  try {
    const { plcId, tagId } = req.params;
    const tag = tags.find(t => t.plcId === plcId && t.id === tagId);

    if (!tag) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Tag not found'
      });
    }

    res.json({
      success: true,
      data: {
        tagId,
        currentValue: tag.value,
        minValue: Math.min(tag.value - 5, tag.value),
        maxValue: Math.max(tag.value + 5, tag.value),
        averageValue: tag.value,
        readCount: 1000,
        errorCount: 5,
        lastUpdate: new Date().toISOString()
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
