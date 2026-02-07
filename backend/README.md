# PLC Monitor - Backend API Server

Real-time SCADA backend for monitoring industrial PLCs using modern protocols.

## Features

- 🔌 **Multi-Protocol Support**: SLMP (Mitsubishi FX5U), Modbus TCP, and extensible for others
- 📊 **Real-time Data Acquisition**: Configurable polling and data buffering
- 🚨 **Intelligent Alarm System**: Threshold, deviation, and state-based alarms
- 📈 **Time-Series Database**: PostgreSQL + TimescaleDB for efficient data storage
- 🔄 **WebSocket Real-time Updates**: Live tag data and event streaming
- 📋 **REST API**: Comprehensive API for all operations
- 🔐 **Authentication & Authorization**: JWT-based security with RBAC
- 📄 **Report Generation**: Automated report creation and export
- 🏥 **System Monitoring**: Health checks, statistics, and logging

## Prerequisites

- Node.js 18+ ([Download](https://nodejs.org/))
- npm 10+ (comes with Node.js)
- PostgreSQL 14+ ([Download](https://www.postgresql.org/))
- TimescaleDB Extension ([Installation Guide](https://docs.timescale.com/install/latest/installation-apt/))
- Redis (optional, for real-time features)

## Installation

### 1. Clone the Repository

```bash
cd plc-monitor
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
# Copy example configuration
cp .env.example .env

# Edit configuration with your settings
nano .env
```

Key settings to configure:
- `PORT`: Server port (default: 3000)
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`: Database connection
- `JWT_SECRET`: Change this to a strong random string
- `CORS_ORIGIN`: Frontend URL (default: http://localhost:4200)

### 4. Setup Database

```bash
# Create database
createdb plc_monitor

# Create TimescaleDB extension
psql plc_monitor -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"

# Run migrations
npm run migrate
```

### 5. Start the Server

#### Development Mode (with auto-reload)
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000` by default.

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication

All endpoints (except `/auth`) require JWT token in the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

### Core Endpoints

#### Authentication
```
POST   /auth/login          - User login
POST   /auth/refresh        - Refresh JWT token
GET    /auth/me             - Get current user info
```

#### PLC Management
```
GET    /plcs                - List all PLCs
GET    /plcs/:id            - Get PLC details
POST   /plcs                - Create new PLC
PUT    /plcs/:id            - Update PLC config
DELETE /plcs/:id            - Delete PLC
POST   /plcs/:id/test       - Test connection
GET    /plcs/:id/status     - Get real-time status
GET    /plcs/:id/stats      - Get statistics
```

#### Tag Operations
```
GET    /tags/:plcId         - List tags for a PLC
GET    /tags/:plcId/:tagId  - Get tag details
POST   /tags/:plcId/:tagId/write - Write value
GET    /tags/:plcId/:tagId/history - Get tag history
GET    /tags/:plcId/:tagId/stats   - Get tag stats
```

#### Alarm Management
```
GET    /alarms              - List alarms
GET    /alarms/active       - Get active alarms
GET    /alarms/history      - Get alarm history
POST   /alarms/:id/acknowledge - Acknowledge alarm
DELETE /alarms/:id          - Clear alarm
GET    /alarms/stats        - Get alarm statistics
```

#### Reports
```
GET    /reports             - List reports
POST   /reports/generate    - Generate new report
GET    /reports/:id         - Get report details
GET    /reports/:id/download - Download report
DELETE /reports/:id         - Delete report
GET    /reports/templates   - Get report templates
```

#### System
```
GET    /system/health       - System health status
GET    /system/stats        - System statistics
GET    /system/config       - System configuration
GET    /system/version      - Version information
GET    /system/info         - System information
GET    /system/logs         - Recent logs
```

### Health Check

```bash
curl http://localhost:3000/health
```

## WebSocket Events

### Client → Server
```javascript
// Subscribe to tag updates
socket.emit('subscribe:tags', {
  deviceId: 'PLC-001',
  tags: ['D100', 'D101']
});

// Unsubscribe
socket.emit('unsubscribe:tags', {
  deviceId: 'PLC-001',
  tags: ['D100']
});

// Write tag value
socket.emit('write:tag', {
  deviceId: 'PLC-001',
  tag: 'D100',
  value: 1234
});

// Acknowledge alarm
socket.emit('acknowledge:alarm', {
  alarmId: 'ALARM001',
  userId: 'user123'
});
```

### Server → Client
```javascript
// Tag value update
socket.on('tag:update', (data) => {
  console.log('Tag updated:', data);
  // { deviceId, data: { tag: value }, timestamp }
});

// Alarm events
socket.on('alarm:triggered', (alarm) => { });
socket.on('alarm:acknowledged', (alarm) => { });
socket.on('alarm:cleared', (alarm) => { });

// Device status
socket.on('device:status', (status) => { });

// System event
socket.on('system:event', (event) => { });
```

## Configuration

### PLC Connections

Configure PLCs in your database or via API:

```json
{
  "name": "Production Line 1",
  "protocol": "SLMP",
  "ipAddress": "192.168.1.100",
  "port": 5007,
  "enabled": true
}
```

Supported protocols:
- **SLMP**: Mitsubishi FX5U, FX5, iQ-F Series
- **ModbusTCP**: Most industrial devices

### Alarm Rules

```json
{
  "deviceId": "PLC-001",
  "tagName": "Temperature",
  "alarmName": "High Temperature",
  "type": "threshold",
  "priority": "high",
  "threshold": {
    "max": 80,
    "min": 0
  },
  "enabled": true
}
```

Alarm types:
- **threshold**: Min/max value checks
- **deviation**: Change detection
- **state**: Equipment state changes

### Data Retention

Configure data retention in `.env`:

```
DATA_RETENTION_DAYS=365        # Keep raw data for 1 year
ALARM_HISTORY_RETENTION_DAYS=90 # Keep alarms for 90 days
```

## Development

### Project Structure

```
src/
├── app.js                    # Main application
├── config/
│   └── index.js              # Configuration loading
├── drivers/                  # PLC protocol drivers
│   ├── plcDriver.js          # Base driver class
│   ├── slmpDriver.js         # SLMP implementation
│   ├── modbusTcpDriver.js    # Modbus TCP implementation
│   └── protocolFactory.js    # Driver factory
├── middleware/
│   ├── auth.js               # JWT authentication
│   └── errorHandler.js       # Error handling
├── routes/                   # API routes
│   ├── auth.js
│   ├── plc.js
│   ├── tag.js
│   ├── alarm.js
│   ├── report.js
│   └── system.js
├── services/                 # Business logic
│   ├── plcService.js         # PLC connection management
│   ├── dataAcquisitionService.js # Polling & collection
│   ├── alarmService.js       # Alarm management
│   └── websocketManager.js   # Real-time communication
└── utils/
    └── logger.js             # Structured logging
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- plc.test.js
```

### Linting

```bash
# Check code style
npm run lint

# Fix style issues
npm run lint -- --fix
```

## Database Schema

### Key Tables

#### `ts_data` - Time-series data
```sql
CREATE TABLE ts_data (
  time TIMESTAMPTZ NOT NULL,
  device_id VARCHAR(255),
  tag_name VARCHAR(255),
  value_numeric DOUBLE PRECISION,
  value_string TEXT,
  quality INT
);
```

#### `alarms` - Alarm history
```sql
CREATE TABLE alarms (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(255),
  alarm_name VARCHAR(255),
  message TEXT,
  priority INT,
  time_triggered TIMESTAMPTZ,
  time_acknowledged TIMESTAMPTZ,
  time_cleared TIMESTAMPTZ,
  is_active BOOLEAN
);
```

#### `devices` - PLC configuration
```sql
CREATE TABLE devices (
  id SERIAL PRIMARY KEY,
  device_name VARCHAR(255) UNIQUE,
  protocol VARCHAR(50),
  ip_address VARCHAR(100),
  port INT,
  is_enabled BOOLEAN,
  description TEXT
);
```

## Troubleshooting

### Connection Issues

1. **Check PLC Network Connectivity**
   ```bash
   ping <plc_ip_address>
   ```

2. **Verify Port Access**
   ```bash
   telnet <plc_ip_address> 5007  # SLMP default port
   ```

3. **Review Logs**
   ```bash
   # Check latest log messages
   tail -f backend.log
   ```

### Database Issues

```bash
# Check database connection
psql -h localhost -U postgres -d plc_monitor -c "SELECT 1"

# View database size
psql -d plc_monitor -c "SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) 
FROM pg_database;"

# Restart database
sudo systemctl restart postgresql
```

### WebSocket Connection

```bash
# Test WebSocket connection
wscat -c ws://localhost:3000/socket.io/
```

## Performance Tuning

### Database Optimization

```sql
-- Create compression policy for old data
SELECT add_compression_policy('ts_data', INTERVAL '7 days');

-- Set up continuous aggregation
CREATE MATERIALIZED VIEW avg_tags_1h AS
SELECT time_bucket('1 hour', time) as bucket,
       device_id,
       tag_name,
       avg(value_numeric) as avg_value
FROM ts_data
GROUP BY bucket, device_id, tag_name;
```

### Connection Pooling

Adjust in `.env`:
```
DB_POOL_MIN=2
DB_POOL_MAX=10
```

### Polling Intervals

Balance between data freshness and system load:
```
DEFAULT_POLL_INTERVAL_MS=1000  # 1 second (high frequency)
```

## Deployment

### Docker

```bash
# Build Docker image
docker build -t plc-monitor-backend .

# Run container
docker run -p 3000:3000 --env-file .env plc-monitor-backend
```

### Kubernetes

See `k8s/` directory for deployment manifests.

### Systemd Service

```bash
# Create service file
sudo cp plc-monitor.service /etc/systemd/system/

# Start service
sudo systemctl start plc-monitor
sudo systemctl enable plc-monitor

# View logs
sudo journalctl -u plc-monitor -f
```

## Security

### Authentication
- Implement strong password policies
- Use HTTPS/TLS in production
- Rotate JWT secrets regularly

### Database
- Use encrypted connections (SSL/TLS)
- Implement row-level security
- Regular backups with encryption

### API Security
- Rate limiting (implemented via middleware)
- Input validation (Joi schemas)
- SQL injection prevention (ORM)

### Network
- Firewall rules for PLC access
- VPN for remote access
- Network segmentation

## Contributing

1. Create feature branch: `git checkout -b feature/xyz`
2. Commit changes: `git commit -am 'Add feature'`
3. Push branch: `git push origin feature/xyz`
4. Submit pull request

## License

MIT

## Support

- Documentation: See `docs/`
- Issues: GitHub Issues
- Email: support@example.com

---

**Version**: 1.0.0  
**Last Updated**: 2025-02-07  
**Maintained By**: PLC SCADA System Team
