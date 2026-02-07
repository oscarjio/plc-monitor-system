/**
 * Scheduler Service
 * Manages cron jobs for data acquisition and health checks
 */

const cron = require('node-cron');
const logger = require('../utils/logger');

class SchedulerService {
  constructor() {
    this.jobs = new Map();
    this.dataAcquisitionService = null;
  }

  /**
   * Initialize scheduler with services
   * @param {Object} services - Service instances
   */
  initialize(services) {
    this.dataAcquisitionService = services.dataAcquisition;
    logger.info('Scheduler service initialized');
  }

  /**
   * Start data acquisition cron job
   * Runs every 30 minutes (cron: star-slash-30 star star star star)
   */
  startDataAcquisitionJob() {
    if (this.jobs.has('dataAcquisition')) {
      logger.warn('Data acquisition job already running');
      return;
    }

    // Run every 30 minutes
    const job = cron.schedule('*/30 * * * *', async () => {
      logger.info('🔄 Cron: Data acquisition job triggered');
      
      try {
        if (!this.dataAcquisitionService) {
          logger.error('Data acquisition service not initialized');
          return;
        }

        // Start all enabled device polls
        await this.dataAcquisitionService.startAll();
        
        logger.info('✅ Cron: Data acquisition started successfully');
      } catch (err) {
        logger.error({ err }, '❌ Cron: Data acquisition job failed');
      }
    }, {
      timezone: "UTC"
    });

    this.jobs.set('dataAcquisition', job);
    logger.info('📅 Data acquisition cron job started (every 30 minutes)');
  }

  /**
   * Start health check cron job
   * Runs every 30 minutes (cron: star-slash-30 star star star star)
   */
  startHealthCheckJob() {
    if (this.jobs.has('healthCheck')) {
      logger.warn('Health check job already running');
      return;
    }

    // Run every 30 minutes
    const job = cron.schedule('*/30 * * * *', async () => {
      logger.info('🏥 Cron: Health check job triggered');
      
      try {
        if (!this.dataAcquisitionService) {
          logger.error('Data acquisition service not initialized');
          return;
        }

        const health = this.dataAcquisitionService.getHealthStatus();
        
        let healthyCount = 0;
        let unhealthyCount = 0;
        let alerts = [];

        for (const [deviceId, status] of Object.entries(health)) {
          if (status.healthy) {
            healthyCount++;
          } else {
            unhealthyCount++;
            
            // Check if data is too old
            if (status.minutesSinceLastData > 60) {
              alerts.push({
                deviceId,
                issue: 'stale_data',
                minutesSinceLastData: status.minutesSinceLastData,
                lastDataTime: status.lastDataTime
              });
            }

            // Check if not polling
            if (!status.isPolling) {
              alerts.push({
                deviceId,
                issue: 'not_polling',
                message: 'Device polling stopped'
              });
            }

            // Check rate limiting
            if (status.rateLimitBackoffMs > 0) {
              alerts.push({
                deviceId,
                issue: 'rate_limited',
                backoffMs: status.rateLimitBackoffMs
              });
            }
          }
        }

        logger.info({
          healthy: healthyCount,
          unhealthy: unhealthyCount,
          total: healthyCount + unhealthyCount,
          alerts: alerts.length
        }, '🏥 Health check completed');

        // Log alerts
        if (alerts.length > 0) {
          for (const alert of alerts) {
            logger.warn({ alert }, `⚠️  Health alert: ${alert.deviceId} - ${alert.issue}`);
          }

          // Attempt auto-recovery for stale data
          await this._attemptAutoRecovery(alerts);
        }

      } catch (err) {
        logger.error({ err }, '❌ Cron: Health check job failed');
      }
    }, {
      timezone: "UTC"
    });

    this.jobs.set('healthCheck', job);
    logger.info('📅 Health check cron job started (every 30 minutes)');
  }

  /**
   * Attempt automatic recovery for unhealthy devices
   * @private
   */
  async _attemptAutoRecovery(alerts) {
    const staleDataAlerts = alerts.filter(a => a.issue === 'stale_data');
    
    if (staleDataAlerts.length === 0) return;

    logger.info({ count: staleDataAlerts.length }, 
      '🔧 Attempting auto-recovery for stale data devices');

    for (const alert of staleDataAlerts) {
      try {
        logger.info({ deviceId: alert.deviceId }, 
          'Attempting reconnection...');
        
        // Stop existing poll
        this.dataAcquisitionService.stopPoll(alert.deviceId);
        
        // Wait 2 seconds
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Restart from database configuration
        await this.dataAcquisitionService.startAll();
        
        logger.info({ deviceId: alert.deviceId }, 
          '✅ Auto-recovery successful');
      } catch (err) {
        logger.error({ 
          err, 
          deviceId: alert.deviceId 
        }, '❌ Auto-recovery failed');
      }
    }
  }

  /**
   * Start data cleanup cron job
   * Runs daily at 2 AM (cron: 0 2 star star star)
   */
  startDataCleanupJob() {
    if (this.jobs.has('dataCleanup')) {
      logger.warn('Data cleanup job already running');
      return;
    }

    // Run daily at 2 AM UTC
    const job = cron.schedule('0 2 * * *', async () => {
      logger.info('🧹 Cron: Data cleanup job triggered');
      
      try {
        const repository = require('../db/repository');
        
        // Clear old time-series data (older than retention period)
        // This is handled by PostgreSQL retention policies in schema
        
        // Clear memory buffers older than 1 hour
        if (this.dataAcquisitionService) {
          const oneHourAgo = Date.now() - 3600000;
          
          for (const [deviceId, lastTime] of this.dataAcquisitionService.lastDataTime.entries()) {
            if (lastTime < oneHourAgo) {
              this.dataAcquisitionService.clearBuffer(deviceId);
              logger.debug({ deviceId }, 'Cleared stale buffer');
            }
          }
        }

        logger.info('✅ Cron: Data cleanup completed');
      } catch (err) {
        logger.error({ err }, '❌ Cron: Data cleanup job failed');
      }
    }, {
      timezone: "UTC"
    });

    this.jobs.set('dataCleanup', job);
    logger.info('📅 Data cleanup cron job started (daily at 2 AM UTC)');
  }

  /**
   * Start all cron jobs
   */
  startAll() {
    logger.info('🚀 Starting all cron jobs...');
    
    this.startDataAcquisitionJob();
    this.startHealthCheckJob();
    this.startDataCleanupJob();
    
    logger.info(`✅ All cron jobs started (${this.jobs.size} active)`);
  }

  /**
   * Stop specific cron job
   * @param {string} jobName - Job name
   */
  stopJob(jobName) {
    const job = this.jobs.get(jobName);
    if (job) {
      job.stop();
      this.jobs.delete(jobName);
      logger.info({ jobName }, 'Cron job stopped');
    }
  }

  /**
   * Stop all cron jobs
   */
  stopAll() {
    logger.info('Stopping all cron jobs...');
    
    for (const [jobName, job] of this.jobs.entries()) {
      job.stop();
      logger.info({ jobName }, 'Cron job stopped');
    }
    
    this.jobs.clear();
    logger.info('All cron jobs stopped');
  }

  /**
   * Get status of all cron jobs
   * @returns {Object}
   */
  getStatus() {
    const status = {};
    
    for (const [jobName, job] of this.jobs.entries()) {
      status[jobName] = {
        running: true, // node-cron doesn't expose running state easily
        name: jobName
      };
    }
    
    return {
      totalJobs: this.jobs.size,
      jobs: status
    };
  }

  /**
   * Trigger a job manually (for testing)
   * @param {string} jobName - Job name
   */
  async triggerJob(jobName) {
    logger.info({ jobName }, 'Manually triggering cron job');
    
    switch (jobName) {
      case 'dataAcquisition':
        if (this.dataAcquisitionService) {
          await this.dataAcquisitionService.startAll();
        }
        break;
      case 'healthCheck':
        if (this.dataAcquisitionService) {
          const health = this.dataAcquisitionService.getHealthStatus();
          logger.info({ health }, 'Health check result');
        }
        break;
      default:
        logger.warn({ jobName }, 'Unknown job name');
    }
  }
}

// Export singleton instance
module.exports = new SchedulerService();
