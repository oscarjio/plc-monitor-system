# Backend Quick Start Guide

## Prerequisites
- Node.js 18+ installed
- PostgreSQL running with database `plc_monitor`
- Database user: `plc_app` with password: `plc_app_password_2024`

## 1. Install Dependencies
```bash
cd backend
npm install
```

## 2. Configure Environment
The `.env` file is already configured:
```bash
DATABASE_URL="postgresql://plc_app:plc_app_password_2024@localhost:5432/plc_monitor"
PORT=3001
NODE_ENV=development
```

## 3. Start the Server

### Option A: Full Server (Recommended)
Includes API + Data Acquisition + Scheduler
```bash
npm run start:scheduler
```

### Option B: API Only
Just the REST API without data polling
```bash
npm run start:api
```

### Option C: Development Mode
Auto-restart on file changes
```bash
npm run dev
```

## 4. Verify It's Running

### Health Check
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-08T...",
  "uptime": 5.123
}
```

### List PLCs
```bash
curl http://localhost:3001/api/plcs
```

### Get Statistics
```bash
curl http://localhost:3001/api/stats
```

## 5. Common Endpoints

```bash
# PLCs
GET    http://localhost:3001/api/plcs
POST   http://localhost:3001/api/plcs
GET    http://localhost:3001/api/plcs/:id
PUT    http://localhost:3001/api/plcs/:id
DELETE http://localhost:3001/api/plcs/:id

# Tags
GET    http://localhost:3001/api/tags?deviceId=2
POST   http://localhost:3001/api/tags
PUT    http://localhost:3001/api/tags/:id
DELETE http://localhost:3001/api/tags/:id

# Alarms
GET    http://localhost:3001/api/alarms
GET    http://localhost:3001/api/alarms/active
POST   http://localhost:3001/api/alarms/:id/acknowledge

# System
GET    http://localhost:3001/api/stats
GET    http://localhost:3001/api/scheduler/status
```

## 6. Stopping the Server

Press `Ctrl+C` in the terminal running the server.

## Troubleshooting

### Database Connection Error
```bash
# Check if PostgreSQL is running
systemctl status postgresql

# Verify database exists
psql -U plc_app -d plc_monitor -c "SELECT 1"
```

### Port Already in Use
```bash
# Find what's using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>
```

### PLC Connection Errors in Logs
This is normal during development - there are no physical PLCs connected.
The API still works perfectly!

## Next Steps
- See `README.md` for detailed API documentation
- See `BACKEND_STATUS_REPORT.md` for complete status
- Run frontend: `cd ../frontend && npm start`
