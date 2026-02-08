# PLC Monitor - Start Guide
**Full Stack Startup Guide**

## Prerequisites

✅ Node.js 18+ installed  
✅ PostgreSQL running with `plc_monitor` database  
✅ Database user: `plc_app` / `plc_app_password_2024`  

## Quick Start (Both Services)

### Option 1: Separate Terminals (Recommended for Development)

**Terminal 1 - Backend:**
```bash
cd /home/clawd/clawd/plc-monitor/backend
npm run start:scheduler
```
Expected output:
```
🚀 PLC Monitor API Server with Scheduler Started
✓ Server running on http://localhost:3001
✓ Health check: http://localhost:3001/health
✓ API endpoints: http://localhost:3001/api
✓ Environment: development
📅 Starting cron scheduler...
✅ Initial data acquisition started
```

**Terminal 2 - Frontend:**
```bash
cd /home/clawd/clawd/plc-monitor/frontend
npm start
```
Expected output:
```
✔ Building...
Application bundle generation complete.
Watch mode enabled. Watching for file changes...
➜  Local:   http://localhost:4200/
```

**Open in browser:**
```
http://localhost:4200
```

### Option 2: Background Mode

```bash
# Start backend in background
cd /home/clawd/clawd/plc-monitor/backend
npm run start:scheduler > backend.log 2>&1 &
echo "Backend PID: $!"

# Start frontend in background
cd /home/clawd/clawd/plc-monitor/frontend
npm start > frontend.log 2>&1 &
echo "Frontend PID: $!"

# Check logs
tail -f backend.log
tail -f frontend.log
```

## Verification Steps

### 1. Check Backend Health
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-08T...",
  "uptime": 5.123,
  "environment": "development",
  "scheduler": {
    "totalJobs": 3,
    "jobs": { ... }
  },
  "dataAcquisition": {
    "activePolls": 2,
    "healthyDevices": 2,
    "unhealthyDevices": 0
  }
}
```

### 2. Check Backend API
```bash
curl http://localhost:3001/api/plcs
```

Expected: JSON response with PLC list

### 3. Check Frontend
Open browser: http://localhost:4200

You should see:
- Dashboard with statistics
- PLC list
- Navigation menu

## Testing Integration

### Test 1: View PLCs
1. Open http://localhost:4200
2. Click "PLC Lista" in navigation
3. You should see PLCs from backend (e.g., PLC-002, PLC-003, EDITED-PLC)

### Test 2: Create New PLC
1. Click "Ny Station / PLC" button
2. Fill in form:
   - Name: `Test-Integration-PLC`
   - Protocol: `SLMP`
   - IP: `192.168.1.250`
   - Port: `5007`
3. Click "Skapa PLC"
4. Should see success message and PLC appears in list

### Test 3: Edit PLC
1. Click "Redigera" on any PLC
2. Change name or description
3. Click "Spara ändringar"
4. Should see updated data

### Test 4: Tags Management
1. Click "Tags" button on a PLC
2. Click "Ny Tag"
3. Create a tag:
   - Tag name: `test_temp`
   - Address: `D200`
   - Datatype: `FLOAT`
   - Unit: `°C`
4. Click "Skapa"
5. Tag should appear in tags table

## Troubleshooting

### Backend Won't Start

**Problem:** Port 3001 already in use
```bash
# Find process using port
lsof -i :3001

# Kill it
kill -9 <PID>
```

**Problem:** Database connection error
```bash
# Check PostgreSQL is running
systemctl status postgresql

# Test database connection
psql -U plc_app -d plc_monitor -c "SELECT 1"
```

### Frontend Won't Start

**Problem:** Port 4200 already in use
```bash
# Find process using port
lsof -i :4200

# Kill it
kill -9 <PID>
```

**Problem:** Node modules not installed
```bash
cd frontend
npm install
```

### Frontend Can't Connect to Backend

**Symptom:** Error in browser console: "Failed to fetch" or CORS errors

**Solution:**
1. Check backend is running:
   ```bash
   curl http://localhost:3001/health
   ```

2. Check CORS is enabled in backend (it is by default)

3. Check browser console for specific error

4. Verify API URL in `frontend/src/app/services/plc.service.ts`:
   ```typescript
   private readonly API_URL = 'http://localhost:3001/api';
   ```

### PLC Connection Errors in Backend Logs

**This is normal!** The backend logs will show connection errors like:
```
[ERROR] [SLMP] Socket error
❌ PLC Disconnected
```

This happens because there are no physical PLCs connected. The API still works perfectly!

## Stopping Services

### Foreground (Ctrl+C in each terminal)
- Press `Ctrl+C` in backend terminal
- Press `Ctrl+C` in frontend terminal

### Background Mode
```bash
# Find processes
ps aux | grep "node.*plc-monitor"

# Kill by PID
kill <backend-pid>
kill <frontend-pid>

# Or kill all node processes (use with caution!)
pkill -f "node.*plc-monitor"
```

## Development Workflow

### Making Frontend Changes
Frontend has **hot reload** - just save files and browser auto-refreshes!

```bash
# Frontend automatically reloads on file changes
# No restart needed!
```

### Making Backend Changes
Backend needs manual restart:

```bash
# Stop backend (Ctrl+C)
# Start again
npm run start:scheduler
```

Or use nodemon for auto-reload:
```bash
npm run dev  # Uses nodemon
```

### Database Changes
If you modify database schema:

```bash
cd backend
npx prisma db pull           # Pull changes from database
npx prisma generate          # Regenerate Prisma client
npm run start:scheduler      # Restart backend
```

## Common Development Tasks

### View API Logs
```bash
# Backend logs
tail -f backend/backend.log

# Or if running in terminal, logs appear there
```

### Test API Endpoints
```bash
# Get all PLCs
curl http://localhost:3001/api/plcs

# Get specific PLC
curl http://localhost:3001/api/plcs/2

# Get statistics
curl http://localhost:3001/api/stats

# Get scheduler status
curl http://localhost:3001/api/scheduler/status
```

### Clear Browser Cache
If frontend behaves strangely:
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"

## Production Deployment

For production deployment, see:
- `backend/README.md` - Backend deployment guide
- `IMPLEMENTATION_GUIDE.md` - Full deployment instructions

### Quick Production Build

**Backend:**
```bash
cd backend
NODE_ENV=production npm start
```

**Frontend:**
```bash
cd frontend
npm run build
# Serve dist/ folder with nginx or similar
```

## Useful URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:4200 | Main web interface |
| Backend API | http://localhost:3001/api | REST API |
| Health Check | http://localhost:3001/health | Backend health |
| Scheduler Status | http://localhost:3001/api/scheduler/status | Cron jobs |
| PLC List | http://localhost:3001/api/plcs | All PLCs |
| Statistics | http://localhost:3001/api/stats | System stats |

## Need Help?

1. **Check logs** first
2. **Review error messages** in browser console (F12)
3. **Test backend** with curl before blaming frontend
4. **Read documentation:**
   - `BACKEND_STATUS_REPORT.md` - Complete backend docs
   - `backend/README.md` - Backend API reference
   - `IMPLEMENTATION_GUIDE.md` - Full system guide

---

**Quick Commands Cheat Sheet:**
```bash
# Backend
cd backend && npm run start:scheduler

# Frontend  
cd frontend && npm start

# Backend health
curl http://localhost:3001/health

# View PLCs
curl http://localhost:3001/api/plcs

# Stop all
pkill -f "node.*plc-monitor"
```

**You're all set! Happy coding! 🚀**
