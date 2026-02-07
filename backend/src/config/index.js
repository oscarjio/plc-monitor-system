/**
 * Application Configuration
 * Load from environment variables with defaults
 */

require('dotenv').config();

module.exports = {
  // Server
  PORT: process.env.PORT || 3000,
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: process.env.DB_PORT || 5432,
  DB_NAME: process.env.DB_NAME || 'plc_monitor',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'password',
  DB_POOL_MIN: parseInt(process.env.DB_POOL_MIN || '2'),
  DB_POOL_MAX: parseInt(process.env.DB_POOL_MAX || '10'),

  // Redis (for real-time updates)
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: process.env.REDIS_PORT || 6379,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '7d',

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:4200',

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // Data Acquisition
  DEFAULT_POLL_INTERVAL_MS: parseInt(process.env.DEFAULT_POLL_INTERVAL_MS || '1000'),
  DATA_RETENTION_DAYS: parseInt(process.env.DATA_RETENTION_DAYS || '365'),

  // PLC Connection Timeouts
  PLC_CONNECTION_TIMEOUT_MS: parseInt(process.env.PLC_CONNECTION_TIMEOUT_MS || '5000'),
  PLC_READ_TIMEOUT_MS: parseInt(process.env.PLC_READ_TIMEOUT_MS || '3000'),
  PLC_WRITE_TIMEOUT_MS: parseInt(process.env.PLC_WRITE_TIMEOUT_MS || '3000'),

  // Alarm Configuration
  ALARM_CHECK_INTERVAL_MS: parseInt(process.env.ALARM_CHECK_INTERVAL_MS || '1000'),
  ALARM_HISTORY_RETENTION_DAYS: parseInt(process.env.ALARM_HISTORY_RETENTION_DAYS || '90'),

  // Feature Flags
  ENABLE_WEBSOCKET: process.env.ENABLE_WEBSOCKET !== 'false',
  ENABLE_ALARMS: process.env.ENABLE_ALARMS !== 'false',
  ENABLE_REPORTS: process.env.ENABLE_REPORTS !== 'false',
  ENABLE_AI_ANALYSIS: process.env.ENABLE_AI_ANALYSIS !== 'false'
};
