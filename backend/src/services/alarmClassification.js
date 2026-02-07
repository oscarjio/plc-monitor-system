/**
 * Alarm Classification Service
 * Maps alarms to A/B/C severity levels
 */

const logger = require('../utils/logger');

/**
 * Alarm Classification Levels
 */
const AlarmClass = {
  A: 'A', // KRITISK - Critical
  B: 'B', // VARNING - Warning
  C: 'C'  // INFO - Information
};

/**
 * Alarm Class Configuration
 */
const AlarmClassConfig = {
  A: {
    name: 'KRITISK',
    nameEn: 'CRITICAL',
    color: '#DC2626',      // Red-600
    bgColor: '#FEE2E2',    // Red-100
    soundFile: 'critical-alarm.mp3',
    soundVolume: 1.0,
    priority: 1,
    requiresAcknowledgement: true,
    autoEscalate: true,
    escalateAfterMinutes: 5,
    notificationChannels: ['ui', 'sound', 'email', 'sms'],
    uiStyle: {
      banner: true,
      popup: true,
      blink: true,
      size: 'large'
    }
  },
  B: {
    name: 'VARNING',
    nameEn: 'WARNING',
    color: '#F59E0B',      // Amber-500
    bgColor: '#FEF3C7',    // Amber-100
    soundFile: 'warning-beep.mp3',
    soundVolume: 0.6,
    priority: 2,
    requiresAcknowledgement: false,
    autoEscalate: true,
    escalateAfterMinutes: 30,
    notificationChannels: ['ui', 'sound', 'email'],
    uiStyle: {
      banner: false,
      popup: false,
      blink: false,
      size: 'medium'
    }
  },
  C: {
    name: 'INFO',
    nameEn: 'INFORMATION',
    color: '#3B82F6',      // Blue-500
    bgColor: '#DBEAFE',    // Blue-100
    soundFile: null,       // No sound
    soundVolume: 0,
    priority: 3,
    requiresAcknowledgement: false,
    autoEscalate: false,
    escalateAfterMinutes: null,
    notificationChannels: ['ui'],
    uiStyle: {
      banner: false,
      popup: false,
      blink: false,
      size: 'small'
    }
  }
};

/**
 * Map database priority to alarm class
 */
const priorityToClass = {
  'critical': AlarmClass.A,
  'high': AlarmClass.A,
  'medium': AlarmClass.B,
  'low': AlarmClass.C,
  'info': AlarmClass.C
};

/**
 * Alarm classification keywords for auto-detection
 */
const alarmKeywords = {
  A: [
    'overflow', 'failure', 'fault', 'emergency', 'critical',
    'shutdown', 'trip', 'stopped', 'power loss', 'offline',
    'disconnected', 'fire', 'leak', 'explosion', 'danger'
  ],
  B: [
    'warning', 'high', 'low', 'approaching', 'limit',
    'degraded', 'timeout', 'delay', 'slow', 'unstable',
    'deviation', 'abnormal', 'unusual'
  ],
  C: [
    'info', 'information', 'notice', 'started', 'stopped',
    'connected', 'completed', 'ready', 'idle', 'normal'
  ]
};

class AlarmClassificationService {
  /**
   * Classify an alarm based on priority and name
   * @param {Object} alarm - Alarm object with priority and alarm_name
   * @returns {string} - Alarm class (A, B, or C)
   */
  classifyAlarm(alarm) {
    // First try priority-based classification
    if (alarm.priority && priorityToClass[alarm.priority]) {
      return priorityToClass[alarm.priority];
    }

    // Then try keyword-based classification
    if (alarm.alarm_name) {
      const alarmName = alarm.alarm_name.toLowerCase();
      
      // Check for A-class keywords
      for (const keyword of alarmKeywords.A) {
        if (alarmName.includes(keyword)) {
          return AlarmClass.A;
        }
      }

      // Check for B-class keywords
      for (const keyword of alarmKeywords.B) {
        if (alarmName.includes(keyword)) {
          return AlarmClass.B;
        }
      }

      // Check for C-class keywords
      for (const keyword of alarmKeywords.C) {
        if (alarmName.includes(keyword)) {
          return AlarmClass.C;
        }
      }
    }

    // Default to B-class (warning) if unable to classify
    logger.warn({ alarm }, 'Unable to classify alarm - defaulting to B-class');
    return AlarmClass.B;
  }

  /**
   * Get configuration for an alarm class
   * @param {string} alarmClass - Alarm class (A, B, or C)
   * @returns {Object} - Configuration object
   */
  getClassConfig(alarmClass) {
    return AlarmClassConfig[alarmClass] || AlarmClassConfig.B;
  }

  /**
   * Enrich alarm object with classification data
   * @param {Object} alarm - Alarm object
   * @returns {Object} - Enriched alarm object
   */
  enrichAlarm(alarm) {
    const alarmClass = this.classifyAlarm(alarm);
    const config = this.getClassConfig(alarmClass);

    return {
      ...alarm,
      alarmClass,
      className: config.name,
      classNameEn: config.nameEn,
      color: config.color,
      bgColor: config.bgColor,
      soundFile: config.soundFile,
      soundVolume: config.soundVolume,
      requiresAcknowledgement: config.requiresAcknowledgement,
      uiStyle: config.uiStyle,
      notificationChannels: config.notificationChannels
    };
  }

  /**
   * Check if alarm needs escalation
   * @param {Object} alarm - Alarm object with time_triggered
   * @returns {boolean} - True if needs escalation
   */
  needsEscalation(alarm) {
    if (!alarm.is_active || alarm.time_acknowledged) {
      return false;
    }

    const alarmClass = this.classifyAlarm(alarm);
    const config = this.getClassConfig(alarmClass);

    if (!config.autoEscalate) {
      return false;
    }

    const triggeredTime = new Date(alarm.time_triggered);
    const now = new Date();
    const minutesElapsed = (now - triggeredTime) / 60000;

    return minutesElapsed > config.escalateAfterMinutes;
  }

  /**
   * Get escalated alarm class
   * @param {string} currentClass - Current alarm class
   * @returns {string} - Escalated class
   */
  escalateClass(currentClass) {
    if (currentClass === AlarmClass.C) {
      return AlarmClass.B;
    }
    if (currentClass === AlarmClass.B) {
      return AlarmClass.A;
    }
    return AlarmClass.A; // Already at highest
  }

  /**
   * Get alarm statistics by class
   * @param {Array} alarms - Array of alarms
   * @returns {Object} - Statistics by class
   */
  getStatsByClass(alarms) {
    const stats = {
      A: { count: 0, unacknowledged: 0 },
      B: { count: 0, unacknowledged: 0 },
      C: { count: 0, unacknowledged: 0 },
      total: alarms.length
    };

    for (const alarm of alarms) {
      const alarmClass = this.classifyAlarm(alarm);
      stats[alarmClass].count++;
      
      if (!alarm.time_acknowledged && alarm.is_active) {
        stats[alarmClass].unacknowledged++;
      }
    }

    return stats;
  }

  /**
   * Filter alarms by class
   * @param {Array} alarms - Array of alarms
   * @param {string} alarmClass - Alarm class to filter
   * @returns {Array} - Filtered alarms
   */
  filterByClass(alarms, alarmClass) {
    return alarms.filter(alarm => this.classifyAlarm(alarm) === alarmClass);
  }

  /**
   * Sort alarms by priority (A > B > C, then by time)
   * @param {Array} alarms - Array of alarms
   * @returns {Array} - Sorted alarms
   */
  sortByPriority(alarms) {
    return alarms.sort((a, b) => {
      const classA = this.classifyAlarm(a);
      const classB = this.classifyAlarm(b);
      
      const configA = this.getClassConfig(classA);
      const configB = this.getClassConfig(classB);
      
      // Sort by priority first
      if (configA.priority !== configB.priority) {
        return configA.priority - configB.priority;
      }
      
      // Then by time (newest first)
      return new Date(b.time_triggered) - new Date(a.time_triggered);
    });
  }

  /**
   * Get alarm class summary for dashboard
   * @param {Array} alarms - Active alarms
   * @returns {Object} - Dashboard summary
   */
  getDashboardSummary(alarms) {
    const activeAlarms = alarms.filter(a => a.is_active);
    const stats = this.getStatsByClass(activeAlarms);
    
    return {
      critical: {
        count: stats.A.count,
        unacknowledged: stats.A.unacknowledged,
        color: AlarmClassConfig.A.color,
        label: 'KRITISKA LARM'
      },
      warning: {
        count: stats.B.count,
        unacknowledged: stats.B.unacknowledged,
        color: AlarmClassConfig.B.color,
        label: 'VARNINGAR'
      },
      info: {
        count: stats.C.count,
        unacknowledged: stats.C.unacknowledged,
        color: AlarmClassConfig.C.color,
        label: 'INFO'
      },
      total: activeAlarms.length,
      totalUnacknowledged: stats.A.unacknowledged + stats.B.unacknowledged + stats.C.unacknowledged
    };
  }
}

// Export singleton
module.exports = new AlarmClassificationService();
module.exports.AlarmClass = AlarmClass;
module.exports.AlarmClassConfig = AlarmClassConfig;
