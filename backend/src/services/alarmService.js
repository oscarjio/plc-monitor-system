/**
 * Alarm Service
 * Manages alarm rules, triggering, and acknowledgment
 */

const logger = require('../utils/logger');
const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');

class AlarmService extends EventEmitter {
  constructor() {
    super();
    this.rules = new Map(); // ruleId -> alarm rule
    this.activeAlarms = new Map(); // alarmId -> alarm state
    this.alarmHistory = [];
  }

  /**
   * Create an alarm rule
   * @param {Object} ruleConfig - Alarm rule configuration
   * @returns {string} - Rule ID
   */
  createRule(ruleConfig) {
    const {
      deviceId,
      tagName,
      alarmName,
      type,
      threshold,
      priority = 'medium',
      enabled = true
    } = ruleConfig;

    const ruleId = uuidv4();

    const rule = {
      id: ruleId,
      deviceId,
      tagName,
      alarmName,
      type, // 'threshold', 'deviation', 'state', etc.
      threshold,
      priority, // 'low', 'medium', 'high', 'critical'
      enabled,
      createdAt: new Date().toISOString()
    };

    this.rules.set(ruleId, rule);

    logger.info({ ruleId, alarmName }, `Alarm rule created: ${alarmName}`);
    this.emit('rule:created', rule);

    return ruleId;
  }

  /**
   * Update an alarm rule
   * @param {string} ruleId - Rule ID
   * @param {Object} updates - Updates to apply
   */
  updateRule(ruleId, updates) {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule not found: ${ruleId}`);
    }

    Object.assign(rule, updates);
    this.rules.set(ruleId, rule);

    logger.info({ ruleId }, `Alarm rule updated: ${rule.alarmName}`);
    this.emit('rule:updated', rule);
  }

  /**
   * Delete an alarm rule
   * @param {string} ruleId - Rule ID
   */
  deleteRule(ruleId) {
    if (!this.rules.has(ruleId)) {
      throw new Error(`Rule not found: ${ruleId}`);
    }

    this.rules.delete(ruleId);
    logger.info({ ruleId }, 'Alarm rule deleted');
    this.emit('rule:deleted', { ruleId });
  }

  /**
   * Evaluate data against alarm rules
   * @param {Object} data - Data point with deviceId, tags
   */
  evaluateData(data) {
    const { deviceId, tags } = data;

    for (const [ruleId, rule] of this.rules.entries()) {
      if (!rule.enabled || rule.deviceId !== deviceId) continue;

      const tagData = tags[rule.tagName];
      if (!tagData) continue;

      const value = tagData.value;
      const shouldAlarm = this._evaluateRule(rule, value);

      if (shouldAlarm) {
        this._triggerAlarm(rule, value);
      } else {
        this._clearAlarm(rule);
      }
    }
  }

  /**
   * Evaluate a single rule against a value
   * @private
   */
  _evaluateRule(rule, value) {
    if (value === null) return false;

    const { type, threshold } = rule;

    switch (type) {
      case 'threshold':
        return this._evaluateThreshold(value, threshold);

      case 'deviation':
        return this._evaluateDeviation(value, threshold);

      case 'state':
        return value !== threshold.normalState;

      default:
        return false;
    }
  }

  /**
   * Evaluate threshold alarm
   * @private
   */
  _evaluateThreshold(value, threshold) {
    if (threshold.min !== undefined && value < threshold.min) {
      return true;
    }
    if (threshold.max !== undefined && value > threshold.max) {
      return true;
    }
    return false;
  }

  /**
   * Evaluate deviation alarm
   * @private
   */
  _evaluateDeviation(value, threshold) {
    // Simplified: just check if value exceeds tolerance
    return Math.abs(value - threshold.setPoint) > threshold.tolerance;
  }

  /**
   * Trigger an alarm
   * @private
   */
  _triggerAlarm(rule, value) {
    const alarmKey = `${rule.deviceId}:${rule.tagName}:${rule.id}`;
    const existingAlarm = Array.from(this.activeAlarms.values())
      .find(a => a.key === alarmKey && !a.clearedAt);

    if (existingAlarm) {
      return; // Already triggered
    }

    const alarmId = uuidv4();
    const alarm = {
      id: alarmId,
      key: alarmKey,
      ruleId: rule.id,
      deviceId: rule.deviceId,
      tagName: rule.tagName,
      alarmName: rule.alarmName,
      priority: rule.priority,
      value,
      message: `${rule.alarmName}: value is ${value}`,
      triggeredAt: new Date().toISOString(),
      acknowledgedAt: null,
      clearedAt: null,
      acknowledgedBy: null
    };

    this.activeAlarms.set(alarmId, alarm);
    this.alarmHistory.push(alarm);

    logger.warn({
      alarmId,
      alarmName: rule.alarmName,
      deviceId: rule.deviceId,
      value
    }, `Alarm triggered: ${rule.alarmName}`);

    this.emit('alarm:triggered', alarm);
  }

  /**
   * Clear an alarm
   * @private
   */
  _clearAlarm(rule) {
    const alarmKey = `${rule.deviceId}:${rule.tagName}:${rule.id}`;
    const alarm = Array.from(this.activeAlarms.values())
      .find(a => a.key === alarmKey && !a.clearedAt);

    if (!alarm) return;

    alarm.clearedAt = new Date().toISOString();

    logger.info({
      alarmId: alarm.id,
      alarmName: rule.alarmName
    }, `Alarm cleared: ${rule.alarmName}`);

    this.emit('alarm:cleared', alarm);

    // Keep in active for a bit, then archive
    setTimeout(() => {
      this.activeAlarms.delete(alarm.id);
    }, 60000); // Keep for 1 minute
  }

  /**
   * Acknowledge an alarm
   * @param {string} alarmId - Alarm ID
   * @param {string} userId - User ID
   * @returns {Object} - Updated alarm
   */
  acknowledgeAlarm(alarmId, userId) {
    const alarm = this.activeAlarms.get(alarmId);
    if (!alarm) {
      throw new Error(`Alarm not found: ${alarmId}`);
    }

    alarm.acknowledgedAt = new Date().toISOString();
    alarm.acknowledgedBy = userId;

    logger.info({
      alarmId,
      userId
    }, `Alarm acknowledged: ${alarm.alarmName}`);

    this.emit('alarm:acknowledged', alarm);
    return alarm;
  }

  /**
   * Get active alarms
   * @param {string} deviceId - Optional filter by device
   * @returns {Array}
   */
  getActiveAlarms(deviceId = null) {
    let alarms = Array.from(this.activeAlarms.values())
      .filter(a => !a.clearedAt);

    if (deviceId) {
      alarms = alarms.filter(a => a.deviceId === deviceId);
    }

    return alarms.sort((a, b) => {
      // Sort by priority and time
      const priorityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
      const aPriority = priorityOrder[a.priority] || 99;
      const bPriority = priorityOrder[b.priority] || 99;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      return new Date(b.triggeredAt) - new Date(a.triggeredAt);
    });
  }

  /**
   * Get alarm history
   * @param {number} limit - Maximum records to return
   * @returns {Array}
   */
  getAlarmHistory(limit = 100) {
    return this.alarmHistory
      .sort((a, b) => new Date(b.triggeredAt) - new Date(a.triggeredAt))
      .slice(0, limit);
  }

  /**
   * Get alarm statistics
   * @returns {Object}
   */
  getStatistics() {
    const stats = {
      totalRules: this.rules.size,
      enabledRules: Array.from(this.rules.values()).filter(r => r.enabled).length,
      activeAlarms: this.getActiveAlarms().length,
      acknowledgedAlarms: this.getActiveAlarms()
        .filter(a => a.acknowledgedAt).length,
      alarmsByPriority: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      totalTriggered: this.alarmHistory.length
    };

    for (const alarm of this.getActiveAlarms()) {
      stats.alarmsByPriority[alarm.priority]++;
    }

    return stats;
  }

  /**
   * Get all rules
   * @returns {Array}
   */
  getRules() {
    return Array.from(this.rules.values());
  }

  /**
   * Get rules for a device
   * @param {string} deviceId - Device ID
   * @returns {Array}
   */
  getRulesByDevice(deviceId) {
    return Array.from(this.rules.values())
      .filter(r => r.deviceId === deviceId);
  }
}

module.exports = AlarmService;
