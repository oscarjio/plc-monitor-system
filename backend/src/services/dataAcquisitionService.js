/**
 * Data Acquisition Service - Enhanced with Rate Limiting & DB Integration
 * Handles periodic polling of PLCs with robust error handling
 */

const logger = require('../utils/logger');
const config = require('../config');
const { EventEmitter } = require('events');
const repository = require('../db/repository');

class DataAcquisitionService extends EventEmitter {
  constructor(plcService) {
    super();
    this.plcService = plcService;
    this.polls = new Map(); // deviceId -> poll config
    this.pollIntervals = new Map(); // deviceId -> interval handle
    this.buffer = new Map(); // deviceId -> data buffer
    this.retryState = new Map(); // deviceId -> retry state
    this.lastDataTime = new Map(); // deviceId -> last successful poll time
    this.rateLimitState = new Map(); // deviceId -> rate limit state
  }

  /**
   * Start polling for a device
   * @param {string} deviceId - Device ID
   * @param {Array} tags - Tags to poll
   * @param {number} intervalMs - Poll interval in milliseconds
   */
  startPoll(deviceId, tags, intervalMs = config.DEFAULT_POLL_INTERVAL_MS || 1000) {
    try {
      logger.info({
        deviceId,
        tagCount: tags.length,
        intervalMs
      }, `Starting poll for ${deviceId}`);

      // Initialize state
      this.polls.set(deviceId, { tags, intervalMs });
      this.buffer.set(deviceId, []);
      this.retryState.set(deviceId, { attempts: 0, nextRetryTime: null });
      this.rateLimitState.set(deviceId, { backoffMs: 0, lastRateLimitTime: null });
      this.lastDataTime.set(deviceId, new Date());

      // Start polling
      this.pollIntervals.set(deviceId, setInterval(async () => {
        await this._pollDevice(deviceId);
      }, intervalMs));

      // Run first poll immediately
      this._pollDevice(deviceId);
    } catch (err) {
      logger.error({ err, deviceId }, `Failed to start poll: ${deviceId}`);
      throw err;
    }
  }

  /**
   * Stop polling for a device
   * @param {string} deviceId - Device ID
   */
  stopPoll(deviceId) {
    try {
      const interval = this.pollIntervals.get(deviceId);
      if (interval) {
        clearInterval(interval);
        this.pollIntervals.delete(deviceId);
      }

      this.polls.delete(deviceId);
      this.buffer.delete(deviceId);
      this.retryState.delete(deviceId);
      this.rateLimitState.delete(deviceId);
      this.lastDataTime.delete(deviceId);

      logger.info({ deviceId }, `Stopped poll for ${deviceId}`);
    } catch (err) {
      logger.error({ err, deviceId }, `Failed to stop poll: ${deviceId}`);
      throw err;
    }
  }

  /**
   * Internal method to poll a device with retry and rate limiting
   * @private
   */
  async _pollDevice(deviceId) {
    try {
      const pollConfig = this.polls.get(deviceId);
      if (!pollConfig) return;

      // Check rate limit backoff
      const rateLimitState = this.rateLimitState.get(deviceId);
      if (rateLimitState.backoffMs > 0) {
        const now = Date.now();
        const timeSinceRateLimit = now - (rateLimitState.lastRateLimitTime || 0);
        
        if (timeSinceRateLimit < rateLimitState.backoffMs) {
          logger.debug({ deviceId, backoffRemaining: rateLimitState.backoffMs - timeSinceRateLimit }, 
            'Skipping poll due to rate limit backoff');
          return;
        } else {
          // Reset backoff
          rateLimitState.backoffMs = 0;
          logger.info({ deviceId }, 'Rate limit backoff expired, resuming polling');
        }
      }

      // Check retry state
      const retryState = this.retryState.get(deviceId);
      if (retryState.nextRetryTime && Date.now() < retryState.nextRetryTime) {
        logger.debug({ deviceId, nextRetry: new Date(retryState.nextRetryTime) }, 
          'Waiting for retry timer');
        return;
      }

      const { tags } = pollConfig;

      // Attempt to poll with retry logic
      const result = await this._pollWithRetry(deviceId, tags, retryState);
      
      if (result.success) {
        // Process successful data
        await this._processSuccessfulPoll(deviceId, result.data);
        
        // Reset retry state
        retryState.attempts = 0;
        retryState.nextRetryTime = null;
        
        // Update last data time
        this.lastDataTime.set(deviceId, new Date());
      }
    } catch (err) {
      logger.error({ err, deviceId }, `Poll error: ${deviceId}`);
      
      // Emit error event
      this.emit('error', {
        deviceId,
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Poll with retry logic (max 3 attempts, 5s delay)
   * @private
   */
  async _pollWithRetry(deviceId, tags, retryState, maxRetries = 3) {
    const retryDelayMs = 5000; // 5 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const driver = this.plcService.getDriver(deviceId);
        const data = await driver.read(tags);
        
        return { success: true, data };
      } catch (err) {
        // Check if rate limited
        if (this._isRateLimitError(err)) {
          await this._handleRateLimit(deviceId, err);
          return { success: false, error: 'rate_limited' };
        }

        logger.warn({ 
          deviceId, 
          attempt, 
          maxRetries, 
          error: err.message 
        }, `Poll attempt ${attempt}/${maxRetries} failed`);

        if (attempt < maxRetries) {
          // Wait before retry
          await this._sleep(retryDelayMs);
        } else {
          // Max retries exceeded
          logger.error({ deviceId, attempts: maxRetries }, 
            'Max poll retries exceeded');
          
          // Set next retry time (2 minutes from now)
          retryState.nextRetryTime = Date.now() + 120000;
          retryState.attempts = attempt;
          
          return { success: false, error: err.message };
        }
      }
    }

    return { success: false, error: 'max_retries_exceeded' };
  }

  /**
   * Check if error is rate limit related
   * @private
   */
  _isRateLimitError(err) {
    const rateLimitIndicators = [
      'too many requests',
      'rate limit',
      '429',
      'throttled'
    ];
    
    const errorMsg = err.message.toLowerCase();
    return rateLimitIndicators.some(indicator => errorMsg.includes(indicator));
  }

  /**
   * Handle rate limiting with exponential backoff
   * @private
   */
  async _handleRateLimit(deviceId, err) {
    const rateLimitState = this.rateLimitState.get(deviceId);
    
    // Exponential backoff: 30s, 60s, 120s, 240s
    const backoffSteps = [30000, 60000, 120000, 240000];
    const currentBackoff = rateLimitState.backoffMs;
    const currentIndex = backoffSteps.indexOf(currentBackoff);
    const nextBackoff = currentIndex >= 0 && currentIndex < backoffSteps.length - 1
      ? backoffSteps[currentIndex + 1]
      : backoffSteps[0];

    rateLimitState.backoffMs = nextBackoff;
    rateLimitState.lastRateLimitTime = Date.now();

    logger.warn({ 
      deviceId, 
      backoffMs: nextBackoff,
      backoffSeconds: nextBackoff / 1000,
      error: err.message 
    }, 'Rate limit hit - applying exponential backoff');

    // Emit rate limit event
    this.emit('rateLimit', {
      deviceId,
      backoffMs: nextBackoff,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Process successful poll data - save to DB and emit events
   * @private
   */
  async _processSuccessfulPoll(deviceId, rawData) {
    const timestamp = new Date();
    
    // Process data
    const processedData = {
      timestamp: timestamp.toISOString(),
      deviceId,
      tags: {}
    };

    // Save each tag to database
    for (const [tagName, value] of Object.entries(rawData)) {
      const quality = value !== null ? 0 : 1; // 0 = good, 1 = bad
      
      processedData.tags[tagName] = {
        value,
        timestamp: timestamp.toISOString(),
        quality: quality === 0 ? 'good' : 'bad'
      };

      // Save to time-series database
      try {
        await repository.insertTimeSeriesData(deviceId, tagName, value, quality);
      } catch (dbErr) {
        logger.error({ 
          err: dbErr, 
          deviceId, 
          tagName 
        }, 'Failed to save time-series data');
      }
    }

    // Add to buffer
    const buffer = this.buffer.get(deviceId) || [];
    buffer.push(processedData);
    
    // Keep buffer size limited (last 1000 records)
    if (buffer.length > 1000) {
      buffer.shift();
    }
    
    this.buffer.set(deviceId, buffer);

    // Emit events
    this.emit('data', processedData);
    this.emit(`data:${deviceId}`, processedData);

    // Log success
    logger.debug({
      deviceId,
      tagCount: Object.keys(rawData).length,
      timestamp: timestamp.toISOString()
    }, `Poll successful - data saved to DB`);
  }

  /**
   * Sleep helper
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get health status for all devices
   * @returns {Object}
   */
  getHealthStatus() {
    const status = {};
    const now = new Date();

    for (const [deviceId, lastTime] of this.lastDataTime.entries()) {
      const timeSinceLastData = now - lastTime;
      const minutesSinceLastData = Math.floor(timeSinceLastData / 60000);
      
      const retryState = this.retryState.get(deviceId);
      const rateLimitState = this.rateLimitState.get(deviceId);
      const isPolling = this.pollIntervals.has(deviceId);

      status[deviceId] = {
        isPolling,
        lastDataTime: lastTime.toISOString(),
        minutesSinceLastData,
        healthy: minutesSinceLastData < 60 && isPolling,
        retryAttempts: retryState?.attempts || 0,
        nextRetryTime: retryState?.nextRetryTime 
          ? new Date(retryState.nextRetryTime).toISOString() 
          : null,
        rateLimitBackoffMs: rateLimitState?.backoffMs || 0,
        bufferSize: (this.buffer.get(deviceId) || []).length
      };
    }

    return status;
  }

  /**
   * Start all polls from database
   */
  async startAll() {
    logger.info('Starting all data acquisition polls from database');
    
    try {
      const devices = await repository.getAllDevices();
      
      for (const device of devices) {
        if (!device.is_enabled) {
          logger.info({ deviceId: device.id, name: device.device_name }, 
            'Skipping disabled device');
          continue;
        }

        const tags = device.device_tags
          .filter(t => t.enabled)
          .map(t => t.address);

        if (tags.length === 0) {
          logger.warn({ deviceId: device.id }, 'No enabled tags for device');
          continue;
        }

        // Start polling
        this.startPoll(
          device.device_name, 
          tags, 
          device.poll_interval_ms || 1000
        );
      }

      logger.info({ deviceCount: devices.length }, 
        'All enabled devices started polling');
    } catch (err) {
      logger.error({ err }, 'Failed to start all polls');
      throw err;
    }
  }

  /**
   * Stop all polls
   */
  async stopAll() {
    logger.info('Stopping all data acquisition polls');

    for (const deviceId of this.pollIntervals.keys()) {
      this.stopPoll(deviceId);
    }
  }

  /**
   * Get buffered data for a device
   * @param {string} deviceId - Device ID
   * @param {number} limit - Maximum number of records to return
   * @returns {Array}
   */
  getBufferedData(deviceId, limit = 100) {
    const buffer = this.buffer.get(deviceId) || [];
    return buffer.slice(-limit);
  }

  /**
   * Clear buffer for a device
   * @param {string} deviceId - Device ID
   */
  clearBuffer(deviceId) {
    this.buffer.delete(deviceId);
  }
}

module.exports = DataAcquisitionService;
