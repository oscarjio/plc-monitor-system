/**
 * PLC Driver - Base class for all PLC communication protocols
 */

const logger = require('../utils/logger');

class PLCDriver {
  constructor(config) {
    this.config = config;
    this.connected = false;
    this.lastError = null;
    this.lastSuccessTime = null;
  }

  /**
   * Connect to PLC
   * @returns {Promise<void>}
   */
  async connect() {
    throw new Error('connect() must be implemented by subclass');
  }

  /**
   * Disconnect from PLC
   * @returns {Promise<void>}
   */
  async disconnect() {
    throw new Error('disconnect() must be implemented by subclass');
  }

  /**
   * Read values from PLC
   * @param {Array} tags - Array of tag addresses to read
   * @returns {Promise<Object>} - Map of tag address to value
   */
  async read(tags) {
    throw new Error('read() must be implemented by subclass');
  }

  /**
   * Write value to PLC
   * @param {string} tag - Tag address
   * @param {any} value - Value to write
   * @returns {Promise<void>}
   */
  async write(tag, value) {
    throw new Error('write() must be implemented by subclass');
  }

  /**
   * Check if connection is alive
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    throw new Error('healthCheck() must be implemented by subclass');
  }

  /**
   * Get driver name
   * @returns {string}
   */
  getName() {
    throw new Error('getName() must be implemented by subclass');
  }

  /**
   * Get connection status
   * @returns {Object}
   */
  getStatus() {
    return {
      connected: this.connected,
      lastError: this.lastError,
      lastSuccessTime: this.lastSuccessTime,
      uptime: this.connected ? Date.now() - this.lastSuccessTime : 0
    };
  }
}

module.exports = PLCDriver;
