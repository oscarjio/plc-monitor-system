# PLC Monitor - Full Stack Setup Guide

Complete guide for running the entire PLC Monitor system (frontend + backend + database).

## Prerequisites

- **Node.js** 18+ and npm 10+
- **PostgreSQL** 14+ with TimescaleDB extension
- **Git**
- **Linux/Unix** environment (or WSL on Windows)

## Quick Start (Development)

### 1. Clone the Repository

```bash
git clone https://github.com/oscarjio/plc-monitor-system.git
cd plc-monitor-system
```

### 2. Setup Database

```bash
# Create database
createdb plc_monitor

# Create TimescaleDB extension (optional but recommended)
psql plc_monitor -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"
```

### 3. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env  # Edit database connection settings

# Run database migrations
npx prisma migrate dev

# Seed database with sample data (optional)
npm run seed
```

### 4. Setup Frontend

```bash
cd ../frontend

# Install dependencies
npm install

# No additional configuration needed (environment files already configured)
```

### 5. Start the Full Stack

**Option A: Using separate terminals (recommended for development)**

Terminal 1 - Backend:
```bash
cd backend
npm run start:scheduler
```

Terminal 2 - Frontend:
```bash
cd frontend
npm start
```

**Option B: Using background processes**

```bash
# Start backend
cd backend && npm run start:scheduler &

# Start frontend
cd frontend && npm start &
```

### 6. Access the Application

- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3001/api
- **Health Check**: http://localhost:3001/health
- **Verification Page**: Open `verify-integration.html` in a browser

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                             │
│                    http://localhost:4200                    │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/REST API
                     │
┌────────────────────▼────────────────────────────────────────┐
│                   Angular Frontend                          │
│  - Components (Dashboard, PLC List, PLC Detail)             │
│  - Services (PlcService with HttpClient)                    │
│  - Routing & Navigation                                     │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP GET/POST/PUT/DELETE
                     │ http://localhost:3001/api
┌────────────────────▼────────────────────────────────────────┐
│                  Node.js Backend API                        │
│  - Express REST API                                         │
│  - PLC Service (connection management)                      │
│  - Data Acquisition Service (polling)                       │
│  - Cron Scheduler (periodic tasks)                          │
└────────────────────┬────────────────────────────────────────┘
                     │ Prisma ORM
                     │
┌────────────────────▼────────────────────────────────────────┐
│              PostgreSQL Database                            │
│  - devices (PLC configuration)                              │
│  - device_tags (tag definitions)                            │
│  - ts_data (time-series tag values)                         │
│  - alarms (alarm history)                                   │
└─────────────────────────────────────────────────────────────┘
```

## Configuration

### Backend Configuration (.env)

```bash
# Database
DATABASE_URL="postgresql://plc_app:password@localhost:5432/plc_monitor"

# Server
PORT=3001
NODE_ENV=development

# PLC Connection (for testing)
PLC_HOST=localhost
PLC_PORT=5007

# Polling
POLLING_INTERVAL=1000
```

### Frontend Configuration

Configuration is handled by environment files:

**Development** (`src/environments/environment.ts`):
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3001/api',
  apiBaseUrl: 'http://localhost:3001'
};
```

**Production** (`src/environments/environment.prod.ts`):
```typescript
export const environment = {
  production: true,
  apiUrl: '/api',  // Relative URL for production
  apiBaseUrl: ''
};
```

## API Endpoints

### System
- `GET /health` - Backend health check
- `GET /api/stats` - System statistics (devices, alarms)

### PLCs
- `GET /api/plcs` - List all PLCs
- `GET /api/plcs/:id` - Get specific PLC with tags
- `POST /api/plcs` - Create new PLC
- `PUT /api/plcs/:id` - Update PLC configuration
- `DELETE /api/plcs/:id` - Delete PLC

### Tags
- `GET /api/plcs/:id/tags` - Get all tags for a PLC
- `POST /api/plcs/:id/tags` - Create new tag
- `PUT /api/tags/:id` - Update tag
- `DELETE /api/tags/:id` - Delete tag

## Testing Integration

### Automated Test Script

```bash
cd plc-monitor
./test-integration.sh
```

This script tests:
- Backend health check
- All API endpoints
- Frontend availability
- CORS configuration

### Manual Verification

1. **Visual Verification Page**
   ```bash
   # Start a simple HTTP server in the project root
   python3 -m http.server 8080
   
   # Open http://localhost:8080/verify-integration.html
   ```

2. **Frontend UI Testing**
   - Open http://localhost:4200
   - Navigate to Dashboard → Should show statistics
   - Navigate to PLCs → Should show list of PLCs from database
   - Click on a PLC → Should show details and tags

3. **API Testing with curl**
   ```bash
   # Get all PLCs
   curl http://localhost:3001/api/plcs
   
   # Get stats
   curl http://localhost:3001/api/stats
   
   # Health check
   curl http://localhost:3001/health
   ```

## Troubleshooting

### Backend won't start

1. **Check database connection**
   ```bash
   psql -d plc_monitor -c "SELECT 1"
   ```

2. **Verify .env file exists**
   ```bash
   cd backend
   cat .env
   ```

3. **Check for port conflicts**
   ```bash
   lsof -i :3001
   # Kill any process using port 3001 if needed
   ```

### Frontend shows no data

1. **Check browser console** (F12 → Console tab)
   - Look for CORS errors
   - Look for HTTP errors (404, 500, etc.)

2. **Verify backend is running**
   ```bash
   curl http://localhost:3001/health
   ```

3. **Check network tab** (F12 → Network)
   - Look for failed API calls
   - Verify requests are going to http://localhost:3001

### CORS errors

If you see "CORS policy" errors in browser console:

1. **Verify backend CORS is enabled**
   ```bash
   cd backend
   grep -r "cors" src/
   ```

2. **Test CORS manually**
   ```bash
   curl -H "Origin: http://localhost:4200" \
        -H "Access-Control-Request-Method: GET" \
        -X OPTIONS \
        http://localhost:3001/api/plcs -v
   ```

### Database connection errors

1. **Verify PostgreSQL is running**
   ```bash
   sudo systemctl status postgresql
   # or
   pg_isready
   ```

2. **Check database exists**
   ```bash
   psql -l | grep plc_monitor
   ```

3. **Run migrations**
   ```bash
   cd backend
   npx prisma migrate dev
   ```

## Development Workflow

### Making Frontend Changes

```bash
cd frontend
npm start  # Changes auto-reload

# Code changes in src/app/...
# Browser will hot-reload automatically
```

### Making Backend Changes

```bash
cd backend
npm run dev  # Uses nodemon for auto-restart

# Code changes in src/...
# Server will restart automatically
```

### Database Schema Changes

```bash
cd backend

# 1. Edit prisma/schema.prisma
nano prisma/schema.prisma

# 2. Create migration
npx prisma migrate dev --name describe_your_change

# 3. Generate Prisma Client
npx prisma generate

# 4. Restart backend
```

## Production Deployment

### Build Frontend

```bash
cd frontend
npm run build

# Output in frontend/dist/frontend/browser/
```

### Run Backend in Production

```bash
cd backend
NODE_ENV=production npm start
```

### Docker Deployment (Optional)

See individual `Dockerfile` in backend/ and frontend/ directories.

```bash
# Build backend image
cd backend
docker build -t plc-monitor-backend .

# Build frontend image
cd frontend
docker build -t plc-monitor-frontend .

# Run with docker-compose (create docker-compose.yml)
docker-compose up -d
```

## Monitoring & Logs

### Backend Logs

Backend logs to console. In production, redirect to a file:

```bash
npm start > backend.log 2>&1 &
```

### View Scheduler Activity

The backend includes a cron scheduler that:
- Polls PLCs for data every 30 minutes
- Runs health checks every 30 minutes
- Cleans up old data daily at 2 AM UTC

Check logs for lines like:
```
[INFO] 🚀 Starting all cron jobs...
[INFO] 📅 Data acquisition cron job started
[INFO] 📅 Health check cron job started
```

### Database Query Monitoring

Enable Prisma query logging:

```bash
# In .env
DATABASE_URL="...?connect_timeout=10&pool_timeout=10"
DEBUG=prisma:query
```

## Performance Tips

1. **Database Indexing**
   - Indexes are automatically created by Prisma migrations
   - Consider adding composite indexes for common queries

2. **Connection Pooling**
   - Adjust Prisma connection pool size in DATABASE_URL
   - Default: 10 connections

3. **Frontend Bundle Size**
   - Use lazy loading for routes
   - Enable production build optimizations

4. **Polling Intervals**
   - Adjust POLLING_INTERVAL in .env based on your needs
   - Lower values = more real-time, higher load

## Security Considerations

### Development
- Default CORS allows all origins
- No authentication required
- Database credentials in .env

### Production
- [ ] Enable authentication/authorization
- [ ] Restrict CORS to specific origins
- [ ] Use environment variables for secrets
- [ ] Enable HTTPS/TLS
- [ ] Use database connection encryption
- [ ] Implement rate limiting
- [ ] Set up firewall rules

## Additional Resources

- **Backend README**: `backend/README.md`
- **Frontend README**: `frontend/README.md`
- **Development Status**: `DEVELOPMENT_STATUS.md`
- **API Documentation**: Backend README contains full API reference
- **Database Schema**: `backend/prisma/schema.prisma`

## Support

For issues or questions:
1. Check this guide first
2. Review `DEVELOPMENT_STATUS.md` for known issues
3. Check backend/frontend logs
4. Review API documentation in backend README

---

**Last Updated**: 2025-02-08
**Version**: 1.0.0
**Status**: Full Stack Integration Complete ✅
