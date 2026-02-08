/**
 * Tag Routes - Enhanced for UI Management
 * CRUD operations for device tags
 */

const express = require('express');
const repository = require('../db/repository');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/tags
 * Get all tags (optionally filter by device)
 */
router.get('/', async (req, res, next) => {
  try {
    const { deviceId } = req.query;

    let tags;
    if (deviceId) {
      tags = await repository.getTagsByDevice(deviceId);
    } else {
      // Get all tags (could be slow with many devices)
      const devices = await repository.getAllDevices();
      tags = devices.flatMap(d => d.device_tags || []);
    }

    res.json({
      success: true,
      data: tags.map(t => ({
        id: t.id,
        deviceId: t.device_id,
        name: t.tag_name,
        address: t.address,
        dataType: t.data_type,
        unit: t.unit,
        minValue: t.min_value,
        maxValue: t.max_value,
        accessType: t.access_type,
        scanRate: t.scan_rate_ms,
        enabled: t.enabled
      })),
      count: tags.length
    });
  } catch (err) {
    logger.error({ err }, 'Error fetching tags');
    next(err);
  }
});

/**
 * POST /api/tags
 * Create a new tag
 */
router.post('/', async (req, res, next) => {
  try {
    const { deviceId, tagName, address, dataType, unit, minValue, maxValue, enabled } = req.body;

    if (!deviceId || !tagName || !address || !dataType) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Missing required fields: deviceId, tagName, address, dataType'
      });
    }

    const tag = await repository.createTag({
      device_id: parseInt(deviceId),
      tag_name: tagName,
      address,
      data_type: dataType,
      unit: unit || null,
      min_value: minValue !== undefined ? parseFloat(minValue) : null,
      max_value: maxValue !== undefined ? parseFloat(maxValue) : null,
      access_type: 'read',
      scan_rate_ms: 1000,
      enabled: enabled !== false
    });

    logger.info({ tagId: tag.id, tagName }, 'Tag created');

    res.status(201).json({
      success: true,
      data: {
        id: tag.id,
        deviceId: tag.device_id,
        name: tag.tag_name,
        address: tag.address,
        dataType: tag.data_type,
        unit: tag.unit,
        minValue: tag.min_value,
        maxValue: tag.max_value,
        enabled: tag.enabled
      }
    });
  } catch (err) {
    logger.error({ err }, 'Error creating tag');
    
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Tag with this name already exists for this device'
      });
    }
    
    next(err);
  }
});

/**
 * PUT /api/tags/:id
 * Update a tag
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { tagName, address, dataType, unit, minValue, maxValue, enabled } = req.body;

    const updateData = {};
    if (tagName) updateData.tag_name = tagName;
    if (address) updateData.address = address;
    if (dataType) updateData.data_type = dataType;
    if (unit !== undefined) updateData.unit = unit;
    if (minValue !== undefined) updateData.min_value = minValue !== null ? parseFloat(minValue) : null;
    if (maxValue !== undefined) updateData.max_value = maxValue !== null ? parseFloat(maxValue) : null;
    if (enabled !== undefined) updateData.enabled = enabled;

    const tag = await repository.updateTag(parseInt(req.params.id), updateData);

    logger.info({ tagId: tag.id, tagName: tag.tag_name }, 'Tag updated');

    res.json({
      success: true,
      data: {
        id: tag.id,
        deviceId: tag.device_id,
        name: tag.tag_name,
        address: tag.address,
        dataType: tag.data_type,
        unit: tag.unit,
        minValue: tag.min_value,
        maxValue: tag.max_value,
        enabled: tag.enabled
      }
    });
  } catch (err) {
    logger.error({ err, id: req.params.id }, 'Error updating tag');
    
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: 'Not Found',
        message: `Tag not found: ${req.params.id}`
      });
    }
    
    next(err);
  }
});

/**
 * DELETE /api/tags/:id
 * Delete a tag
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const tag = await repository.deleteTag(parseInt(req.params.id));

    logger.info({ tagId: tag.id }, 'Tag deleted');

    res.json({
      success: true,
      message: 'Tag deleted successfully',
      data: {
        id: tag.id,
        name: tag.tag_name
      }
    });
  } catch (err) {
    logger.error({ err, id: req.params.id }, 'Error deleting tag');
    
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: 'Not Found',
        message: `Tag not found: ${req.params.id}`
      });
    }
    
    next(err);
  }
});

/**
 * GET /api/tags/:id/current-value
 * Get current value for a tag (from latest time-series data)
 */
router.get('/:id/current-value', async (req, res, next) => {
  try {
    // TODO: Implement fetching latest value from ts_data
    res.json({
      success: true,
      data: {
        tagId: req.params.id,
        value: null,
        quality: 'unknown',
        timestamp: new Date().toISOString(),
        message: 'Not implemented yet - will fetch from ts_data'
      }
    });
  } catch (err) {
    logger.error({ err, id: req.params.id }, 'Error fetching tag value');
    next(err);
  }
});

module.exports = router;
