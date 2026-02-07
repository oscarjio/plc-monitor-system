/**
 * PLC Routes - Database Integration
 * CRUD operations for PLC configuration and monitoring
 */

const express = require('express');
const repository = require('../db/repository');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/plcs
 * List all PLCs
 */
router.get('/', async (req, res, next) => {
  try {
    const devices = await repository.getAllDevices();
    
    // Transform to match frontend format
    const result = devices.map(d => ({
      id: d.id,
      name: d.device_name,
      protocol: d.protocol,
      ipAddress: d.ip_address.toString(),
      port: d.port,
      enabled: d.is_enabled,
      status: d.is_enabled ? 'online' : 'offline',
      lastSeen: d.updated_at || d.created_at,
      description: d.description,
      tags: d.device_tags
    }));

    res.json({
      success: true,
      data: result,
      count: result.length
    });
  } catch (err) {
    logger.error({ err }, 'Error fetching PLCs');
    next(err);
  }
});

/**
 * GET /api/plcs/:id
 * Get PLC details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const device = await repository.getDeviceById(req.params.id);

    if (!device) {
      return res.status(404).json({
        error: 'Not Found',
        message: `PLC not found: ${req.params.id}`
      });
    }

    const result = {
      id: device.id,
      name: device.device_name,
      protocol: device.protocol,
      ipAddress: device.ip_address.toString(),
      port: device.port,
      enabled: device.is_enabled,
      status: device.is_enabled ? 'online' : 'offline',
      lastSeen: device.updated_at || device.created_at,
      description: device.description,
      metadata: device.metadata,
      tags: device.device_tags.map(t => ({
        id: t.id,
        name: t.tag_name,
        address: t.address,
        dataType: t.data_type,
        unit: t.unit,
        minValue: t.min_value,
        maxValue: t.max_value,
        accessType: t.access_type,
        scanRate: t.scan_rate_ms,
        enabled: t.enabled
      }))
    };

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    logger.error({ err, id: req.params.id }, 'Error fetching PLC');
    next(err);
  }
});

/**
 * POST /api/plcs
 * Create new PLC configuration
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, protocol, ipAddress, port, enabled, description } = req.body;

    if (!name || !protocol || !ipAddress || !port) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Missing required fields: name, protocol, ipAddress, port'
      });
    }

    const device = await repository.createDevice({
      device_name: name,
      protocol,
      ip_address: ipAddress,
      port: parseInt(port),
      is_enabled: enabled !== false,
      description: description || null,
      poll_interval_ms: 1000
    });

    logger.info({ deviceId: device.id, name }, 'PLC created');

    res.status(201).json({
      success: true,
      data: {
        id: device.id,
        name: device.device_name,
        protocol: device.protocol,
        ipAddress: device.ip_address.toString(),
        port: device.port,
        enabled: device.is_enabled,
        description: device.description
      }
    });
  } catch (err) {
    logger.error({ err }, 'Error creating PLC');
    next(err);
  }
});

/**
 * PUT /api/plcs/:id
 * Update PLC configuration
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { name, protocol, ipAddress, port, enabled, description } = req.body;

    const updateData = {};
    if (name) updateData.device_name = name;
    if (protocol) updateData.protocol = protocol;
    if (ipAddress) updateData.ip_address = ipAddress;
    if (port) updateData.port = parseInt(port);
    if (enabled !== undefined) updateData.is_enabled = enabled;
    if (description !== undefined) updateData.description = description;

    const device = await repository.updateDevice(req.params.id, updateData);

    logger.info({ deviceId: device.id, name: device.device_name }, 'PLC updated');

    res.json({
      success: true,
      data: {
        id: device.id,
        name: device.device_name,
        protocol: device.protocol,
        ipAddress: device.ip_address.toString(),
        port: device.port,
        enabled: device.is_enabled,
        description: device.description
      }
    });
  } catch (err) {
    logger.error({ err, id: req.params.id }, 'Error updating PLC');
    
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: 'Not Found',
        message: `PLC not found: ${req.params.id}`
      });
    }
    
    next(err);
  }
});

/**
 * DELETE /api/plcs/:id
 * Delete PLC configuration
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const device = await repository.deleteDevice(req.params.id);

    logger.info({ deviceId: device.id }, 'PLC deleted');

    res.json({
      success: true,
      message: 'PLC deleted successfully',
      data: {
        id: device.id,
        name: device.device_name
      }
    });
  } catch (err) {
    logger.error({ err, id: req.params.id }, 'Error deleting PLC');
    
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: 'Not Found',
        message: `PLC not found: ${req.params.id}`
      });
    }
    
    next(err);
  }
});

/**
 * GET /api/plcs/:id/stats
 * Get PLC statistics
 */
router.get('/:id/stats', async (req, res, next) => {
  try {
    const device = await repository.getDeviceById(req.params.id);

    if (!device) {
      return res.status(404).json({
        error: 'Not Found',
        message: `PLC not found: ${req.params.id}`
      });
    }

    const tags = device.device_tags || [];
    const enabledTags = tags.filter(t => t.enabled);

    // Get recent time-series data
    const latestData = await repository.getLatestTimeSeriesData(device.device_name, 100);

    res.json({
      success: true,
      data: {
        plcId: device.id,
        totalTags: tags.length,
        onlineTags: enabledTags.length,
        offlineTags: tags.length - enabledTags.length,
        dataPointsCollected: latestData.length,
        averageLatency: 25,
        errorRate: 0.5
      }
    });
  } catch (err) {
    logger.error({ err, id: req.params.id }, 'Error fetching PLC stats');
    next(err);
  }
});

/**
 * GET /api/plcs/:id/data
 * Get recent time-series data for a PLC
 */
router.get('/:id/data', async (req, res, next) => {
  try {
    const device = await repository.getDeviceById(req.params.id);

    if (!device) {
      return res.status(404).json({
        error: 'Not Found',
        message: `PLC not found: ${req.params.id}`
      });
    }

    const limit = parseInt(req.query.limit) || 100;
    const data = await repository.getLatestTimeSeriesData(device.device_name, limit);

    res.json({
      success: true,
      data: data.map(d => ({
        time: d.time,
        deviceId: d.device_id,
        tagName: d.tag_name,
        value: d.value_numeric !== null ? d.value_numeric : d.value_string,
        quality: d.quality
      })),
      count: data.length
    });
  } catch (err) {
    logger.error({ err, id: req.params.id }, 'Error fetching PLC data');
    next(err);
  }
});

module.exports = router;
