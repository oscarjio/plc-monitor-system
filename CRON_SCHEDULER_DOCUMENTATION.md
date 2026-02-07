# PLC Monitor - Cron Scheduler Documentation

## 🎯 Overview

The PLC Monitor backend includes an advanced cron-based scheduling system for:
- **Automated data acquisition** from PLCs
- **Health monitoring** and auto-recovery
- **Data cleanup** and maintenance
- **Rate limiting** with exponential backoff
- **Retry logic** for failed connections

---

## 📅 Cron Jobs

### 1. Data Acquisition Job
**Schedule**: Every 30 minutes (`*/30 * * * *`)  
**Function**: Starts polling for all enabled PLCs  
**Actions**:
- Loads enabled devices from database
- Starts polling for each device
- Saves data to TimescaleDB hypertable
- Broadcasts data via WebSocket

### 2. Health Check Job
**Schedule**: Every 30 minutes (`*/30 * * * *`)  
**Function**: Monitors health of all polling devices  
**Checks**:
- Last data received time (alerts if > 60 minutes old)
- Polling status (alerts if stopped)
- Rate limiting status
- Buffer sizes

**Auto-Recovery**:
- Automatically attempts reconnection for stale devices
- Stops and restarts polling with 2-second delay
- Logs all recovery attempts

### 3. Data Cleanup Job
**Schedule**: Daily at 2 AM UTC (`0 2 * * *`)  
**Function**: Cleans old data and maintains performance  
**Actions**:
- Clears in-memory buffers older than 1 hour
- Database cleanup handled by PostgreSQL retention policies
- Maintains system performance

---

## 🛡️ Rate Limiting & Retry Logic

### Exponential Backoff
When PLC responds with "too many requests":
1. **First hit**: 30-second backoff
2. **Second hit**: 60-second backoff
3. **Third hit**: 120-second backoff
4. **Fourth hit**: 240-second backoff

### Retry Strategy
For failed poll attempts:
- **Max retries**: 3 attempts
- **Retry delay**: 5 seconds between attempts
- **After max retries**: 2-minute cooldown before next attempt

### Rate Limit Detection
Automatically detects rate limiting from:
- "too many requests" error messages
- HTTP 429 status codes
- "rate limit" or "throttled" keywords in errors

---

## 🚀 Starting the Scheduler

### Option 1: npm script (recommended)
```bash
cd /home/clawd/clawd/plc-monitor/backend
npm run start:scheduler
```

### Option 2: Direct node command
```bash
cd /home/clawd/clawd/plc-monitor/backend
PORT=3001 node src/app-with-scheduler.js
```

### Option 3: Development mode with auto-reload
```bash
cd /home/clawd/clawd/plc-monitor/backend
npm run dev
```

---

## 📊 API Endpoints

### Scheduler Control

#### Get Scheduler Status
```bash
GET /api/scheduler/status
```
**Response**:
```json
{
  "success": true,
  "data": {
    "scheduler": {
      "totalJobs": 3,
      "jobs": {
        "dataAcquisition": { "running": true, "name": "dataAcquisition" },
        "healthCheck": { "running": true, "name": "healthCheck" },
        "dataCleanup": { "running": true, "name": "dataCleanup" }
      }
    },
    "devices": {
      "PLC-001": {
        "isPolling": true,
        "lastDataTime": "2026-02-07T23:38:14.944Z",
        "minutesSinceLastData": 0,
        "healthy": true,
        "retryAttempts": 0,
        "nextRetryTime": null,
        "rateLimitBackoffMs": 0,
        "bufferSize": 0
      }
    }
  }
}
```

#### Start All Scheduler Jobs
```bash
POST /api/scheduler/start
```

#### Stop All Scheduler Jobs
```bash
POST /api/scheduler/stop
```

#### Trigger Job Manually
```bash
POST /api/scheduler/trigger/:jobName

# Examples:
curl -X POST http://localhost:3001/api/scheduler/trigger/dataAcquisition
curl -X POST http://localhost:3001/api/scheduler/trigger/healthCheck
```

### Data Acquisition Control

#### Start Data Acquisition for All Devices
```bash
POST /api/data-acquisition/start-all
```

#### Stop Data Acquisition
```bash
POST /api/data-acquisition/stop-all
```

#### Get Health Status
```bash
GET /api/data-acquisition/health
```
**Response**:
```json
{
  "success": true,
  "data": {
    "PLC-001": {
      "isPolling": true,
      "lastDataTime": "2026-02-07T23:38:14.944Z",
      "minutesSinceLastData": 0,
      "healthy": true,
      "retryAttempts": 0,
      "nextRetryTime": null,
      "rateLimitBackoffMs": 0,
      "bufferSize": 15
    }
  }
}
```

---

## 🧪 Testing

### Test Scheduler Functionality
```bash
cd /home/clawd/clawd/plc-monitor/backend
node test-scheduler.js
```

Expected output:
```
🧪 Testing Scheduler Service
✓ Services initialized
📊 Initial Status: { totalJobs: 0, jobs: {} }
🚀 Starting scheduler...
📅 Data acquisition cron job started (every 30 minutes)
📅 Health check cron job started (every 30 minutes)
📅 Data cleanup cron job started (daily at 2 AM UTC)
✅ All cron jobs started (3 active)
```

### Manual Health Check
```bash
curl http://localhost:3001/api/data-acquisition/health
```

### Trigger Data Acquisition Manually
```bash
curl -X POST http://localhost:3001/api/scheduler/trigger/dataAcquisition
```

---

## 📈 Monitoring

### Check Server Health
```bash
curl http://localhost:3001/health
```

Returns:
- Server uptime
- Scheduler status (total jobs, active jobs)
- Data acquisition stats (active polls, healthy/unhealthy devices)

### View Logs
Logs include:
- ✅ Successful polls and data saves
- ⚠️ Rate limit hits with backoff times
- 🔧 Auto-recovery attempts
- ❌ Failed connection attempts
- 🏥 Health check results

### Database Monitoring
```sql
-- Check recent data acquisitions
SELECT device_id, tag_name, time, value_numeric 
FROM ts_data 
ORDER BY time DESC 
LIMIT 20;

-- Count data points per device
SELECT device_id, COUNT(*) as data_points 
FROM ts_data 
GROUP BY device_id;

-- Check data freshness
SELECT device_id, MAX(time) as last_data 
FROM ts_data 
GROUP BY device_id;
```

---

## ⚡ Performance

### Memory Management
- In-memory buffers limited to last 1000 records per device
- Buffers cleared for devices with stale data (>1 hour)
- Old buffers cleaned daily at 2 AM

### Database Optimization
- TimescaleDB hypertable for efficient time-series storage
- Automatic compression for data older than 7 days
- Retention policies defined in schema

### Rate Limiting
- Exponential backoff prevents overwhelming PLCs
- Automatic detection and handling
- Logs all rate limit events

---

## 🔧 Configuration

### Environment Variables
```bash
# .env file
DATABASE_URL="postgresql://plc_app:password@localhost:5432/plc_monitor"
PORT=3001
NODE_ENV=development
```

### Cron Schedules
Edit in `src/services/schedulerService.js`:
```javascript
// Every 30 minutes
cron.schedule('*/30 * * * *', ...);

// Every hour
cron.schedule('0 * * * *', ...);

// Daily at 2 AM
cron.schedule('0 2 * * *', ...);

// Every 15 minutes
cron.schedule('*/15 * * * *', ...);
```

### Retry Configuration
Edit in `src/services/dataAcquisitionService.js`:
```javascript
const maxRetries = 3;
const retryDelayMs = 5000; // 5 seconds
const cooldownMs = 120000; // 2 minutes
```

### Backoff Configuration
```javascript
const backoffSteps = [30000, 60000, 120000, 240000]; // 30s, 60s, 120s, 240s
```

---

## 🚨 Alerts & Events

### Event Emitters
The system emits events for integration:

```javascript
// Data successfully acquired
dataAcquisitionService.on('data', (data) => {
  console.log('New data:', data);
});

// Rate limit hit
dataAcquisitionService.on('rateLimit', (event) => {
  console.warn('Rate limited:', event.deviceId, event.backoffMs);
});

// Error occurred
dataAcquisitionService.on('error', (event) => {
  console.error('Error:', event.deviceId, event.error);
});
```

### Health Alerts
Automatically logged when:
- **Stale data**: No data received for >60 minutes
- **Polling stopped**: Device polling unexpectedly stopped
- **Rate limited**: Device is currently rate limited

---

## 📝 Example Use Cases

### 1. Production Monitoring
```bash
# Start scheduler for continuous monitoring
npm run start:scheduler

# Check health every 5 minutes (manually or via external monitor)
curl http://localhost:3001/api/data-acquisition/health
```

### 2. Development Testing
```bash
# Start in development mode with auto-reload
npm run dev

# Manually trigger data acquisition
curl -X POST http://localhost:3001/api/scheduler/trigger/dataAcquisition

# Watch logs for activity
tail -f logs/app.log
```

### 3. Maintenance Mode
```bash
# Stop all polling
curl -X POST http://localhost:3001/api/data-acquisition/stop-all

# Perform maintenance...

# Resume polling
curl -X POST http://localhost:3001/api/data-acquisition/start-all
```

---

## 🔗 Integration with Clawdbot Cron

For redundancy, you can also set up Clawdbot cron jobs:

```bash
# In Clawdbot, schedule a job to ping the trigger endpoint
*/30 * * * * curl -X POST http://localhost:3001/api/scheduler/trigger/healthCheck
```

This provides dual redundancy:
- Node-cron handles internal scheduling
- Clawdbot ensures external monitoring and triggers

---

## 📚 File Structure

```
backend/
├── src/
│   ├── app-with-scheduler.js          # Main app with scheduler
│   ├── services/
│   │   ├── schedulerService.js        # Cron job scheduler
│   │   ├── dataAcquisitionService.js  # Enhanced with rate limiting
│   │   └── plcService.js              # PLC connection management
│   ├── db/
│   │   ├── repository.js              # Database operations
│   │   └── client.js                  # Prisma client
│   └── routes/                        # API endpoints
├── test-scheduler.js                  # Test script
└── package.json                       # npm scripts
```

---

## ✅ Best Practices

1. **Always start with scheduler** (`npm run start:scheduler`) in production
2. **Monitor health endpoint** regularly for early issue detection
3. **Check logs** for rate limiting and retry patterns
4. **Adjust cron schedules** based on your PLC polling requirements
5. **Use manual triggers** for testing before relying on cron
6. **Set up external monitoring** (Clawdbot cron) for redundancy

---

**Last Updated**: 2026-02-07  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
