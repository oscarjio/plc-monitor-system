/**
 * PLC Service
 * Manages connections to multiple PLCs
 * Handles connection pooling and health checks
 */

const ProtocolFactory = require('../drivers/protocolFactory');
const logger = require('../utils/logger');
const config = require('../config');

class PLCService {
  constructor() {
    this.drivers = new Map(); // deviceId -> driver
    this.healthCheckInterval = null;
  }

  /**
   * Connect to a PLC
   * @param {Object} plcConfig - PLC configuration
   * @returns {Promise<Object>} - Connection result
   */
  async connectPLC(plcConfig) {
    const { id, protocol, ipAddress, port } = plcConfig;

    try {
      logger.info({ plcConfig }, `Connecting to PLC: ${id}`);

      // Check if already connected
      if (this.drivers.has(id)) {
        logger.warn({ id }, 'PLC already connected');
        return { success: false, message: 'Already connected' };
      }

      // Create driver
      const driver = ProtocolFactory.createDriver(protocol, plcConfig);

      // Connect
      await driver.connect();

      // Store driver
      this.drivers.set(id, driver);

      logger.info({ id }, `Successfully connected to PLC: ${id}`);
      return { success: true, driver };
    } catch (err) {
      logger.error({ err, id }, `Failed to connect to PLC: ${id}`);
      throw err;
    }
  }

  /**
   * Disconnect from a PLC
   * @param {string} deviceId - Device ID
   * @returns {Promise<void>}
   */
  async disconnectPLC(deviceId) {
    try {
      const driver = this.drivers.get(deviceId);
      if (!driver) {
        logger.warn({ deviceId }, 'PLC not found');
        return;
      }

      await driver.disconnect();
      this.drivers.delete(deviceId);

      logger.info({ deviceId }, `Disconnected from PLC: ${deviceId}`);
    } catch (err) {
      logger.error({ err, deviceId }, `Error disconnecting from PLC: ${deviceId}`);
      throw err;
    }
  }

  /**
   * Get driver for a PLC
   * @param {string} deviceId - Device ID
   * @returns {PLCDriver}
   */
  getDriver(deviceId) {
    const driver = this.drivers.get(deviceId);
    if (!driver) {
      throw new Error(`No driver found for PLC: ${deviceId}`);
    }
    return driver;
  }

  /**
   * Read data from PLC
   * @param {string} deviceId - Device ID
   * @param {Array} tags - Tag addresses to read
   * @returns {Promise<Object>}
   */
  async readTags(deviceId, tags) {
    const driver = this.getDriver(deviceId);
    return await driver.read(tags);
  }

  /**
   * Write data to PLC
   * @param {string} deviceId - Device ID
   * @param {string} tag - Tag address
   * @param {any} value - Value to write
   * @returns {Promise<boolean>}
   */
  async writeTag(deviceId, tag, value) {
    const driver = this.getDriver(deviceId);
    return await driver.write(tag, value);
  }

  /**
   * Get connection status for a PLC
   * @param {string} deviceId - Device ID
   * @returns {Object}
   */
  getStatus(deviceId) {
    const driver = this.drivers.get(deviceId);
    if (!driver) {
      return { connected: false, error: 'Not connected' };
    }
    return driver.getStatus();
  }

  /**
   * Get status of all connected PLCs
   * @returns {Object}
   */
  getAllStatus() {
    const status = {};
    for (const [deviceId, driver] of this.drivers.entries()) {
      status[deviceId] = driver.getStatus();
    }
    return status;
  }

  /**
   * Check health of all connections
   */
  async healthCheckAll() {
    const results = {};

    for (const [deviceId, driver] of this.drivers.entries()) {
      try {
        const isHealthy = await driver.healthCheck();
        results[deviceId] = {
          healthy: isHealthy,
          status: driver.getStatus()
        };

        const logLevel = isHealthy ? 'debug' : 'warn';
        logger[logLevel]({ deviceId, isHealthy }, `Health check: ${deviceId}`);
      } catch (err) {
        results[deviceId] = {
          healthy: false,
          error: err.message,
          status: driver.getStatus()
        };
        logger.error({ err, deviceId }, `Health check failed: ${deviceId}`);
      }
    }

    return results;
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks(intervalMs = 30000) {
    if (this.healthCheckInterval) {
      return; // Already running
    }

    logger.info({ intervalMs }, 'Starting health checks');

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.healthCheckAll();
      } catch (err) {
        logger.error({ err }, 'Health check error');
      }
    }, intervalMs);
  }

  /**
   * Stop health checks
   */
  stopHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info('Health checks stopped');
    }
  }

  /**
   * Get list of connected PLCs
   * @returns {Array}
   */
  getConnectedPLCs() {
    return Array.from(this.drivers.keys());
  }

  /**
   * Reconnect to a PLC
   * @param {string} deviceId - Device ID
   * @param {Object} plcConfig - PLC configuration
   * @returns {Promise<void>}
   */
  async reconnectPLC(deviceId, plcConfig) {
    try {
      await this.disconnectPLC(deviceId);
      await this.connectPLC(plcConfig);
      logger.info({ deviceId }, `Reconnected to PLC: ${deviceId}`);
    } catch (err) {
      logger.error({ err, deviceId }, `Failed to reconnect to PLC: ${deviceId}`);
      throw err;
    }
  }

  /**
   * Disconnect all PLCs
   * @returns {Promise<void>}
   */
  async disconnectAll() {
    const deviceIds = Array.from(this.drivers.keys());

    for (const deviceId of deviceIds) {
      try {
        await this.disconnectPLC(deviceId);
      } catch (err) {
        logger.error({ err, deviceId }, `Error disconnecting: ${deviceId}`);
      }
    }

    logger.info('All PLCs disconnected');
  }
}

module.exports = PLCService;
