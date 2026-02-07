# PLC Monitor - Quick Start Guide

## 🚀 Start the System

### 1. Start Backend API
```bash
cd /home/clawd/clawd/plc-monitor/backend
PORT=3001 node src/app-api.js
```

Expected output:
```
🚀 PLC Monitor API Server Started
✓ Server running on http://localhost:3001
✓ Health check: http://localhost:3001/health
```

### 2. Start Frontend (separate terminal)
```bash
cd /home/clawd/clawd/plc-monitor/frontend
npm start
```

Expected output:
```
Angular Live Development Server is listening on localhost:4200
```

### 3. Access the System
- **Frontend Dashboard**: http://localhost:4200
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

---

## 📊 Test the API

```bash
# System stats
curl http://localhost:3001/api/stats

# List all PLCs
curl http://localhost:3001/api/plcs

# Get specific PLC with tags
curl http://localhost:3001/api/plcs/1

# Get alarms
curl http://localhost:3001/api/alarms/stats

# Get time-series data
curl http://localhost:3001/api/plcs/1/data?limit=10
```

---

## 🗄️ Database Access

```bash
# Connect to database
PGPASSWORD='plc_app_password_2024' psql -h localhost -U plc_app -d plc_monitor

# Common queries
\dt                            # List tables
SELECT * FROM devices;         # View PLCs
SELECT * FROM alarms;          # View alarms
SELECT COUNT(*) FROM ts_data;  # Count time-series records
```

---

## 🧪 Reseed Test Data

```bash
cd /home/clawd/clawd/plc-monitor/backend
node src/db/seed.js
```

This creates:
- 3 test PLCs (PLC-001, PLC-002, PLC-003)
- 6 device tags
- 60 time-series data points
- 2 test alarms
- 2 test users (admin/admin123, operator/admin123)

---

## 🔧 Useful Commands

### Backend
```bash
# Install dependencies
npm install

# Run Prisma migrations
npx prisma migrate dev

# Regenerate Prisma Client
npx prisma generate

# View database in Prisma Studio
npx prisma studio
```

### Database
```bash
# Restart PostgreSQL
sudo systemctl restart postgresql

# Check PostgreSQL status
systemctl status postgresql

# Backup database
pg_dump -U plc_app plc_monitor > backup.sql

# Restore database
psql -U plc_app plc_monitor < backup.sql
```

---

## 📁 File Locations

- **Backend API**: `/home/clawd/clawd/plc-monitor/backend/src/app-api.js`
- **Database Config**: `/home/clawd/clawd/plc-monitor/backend/.env`
- **Schema**: `/home/clawd/clawd/plc-monitor/backend/src/db/schema.sql`
- **Repository**: `/home/clawd/clawd/plc-monitor/backend/src/db/repository.js`
- **Frontend**: `/home/clawd/clawd/plc-monitor/frontend/`

---

## 🐛 Troubleshooting

### Port 3001 already in use
```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>
```

### Database connection error
```bash
# Check PostgreSQL is running
systemctl status postgresql

# Test connection
PGPASSWORD='plc_app_password_2024' psql -h localhost -U plc_app -d plc_monitor -c "SELECT 1"
```

### Prisma Client not found
```bash
cd /home/clawd/clawd/plc-monitor/backend
npx prisma generate
```

---

## 📞 Support

- **Status Report**: `PHASE2_COMPLETION_REPORT.md`
- **Development Status**: `DEVELOPMENT_STATUS.md`
- **API Documentation**: Coming in Phase 3

---

Last Updated: 2026-02-07
