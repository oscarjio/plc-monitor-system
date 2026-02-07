-- PLC Monitor - Database Schema
-- PostgreSQL with TimescaleDB
-- Target: PostgreSQL 14+, TimescaleDB Extension

-- =============================================================================
-- 1. Enable Extensions
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS uuid-ossp;

-- =============================================================================
-- 2. Create Hypertable for Time-Series Data
-- =============================================================================

CREATE TABLE IF NOT EXISTS ts_data (
    time TIMESTAMPTZ NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    tag_name VARCHAR(255) NOT NULL,
    value_numeric DOUBLE PRECISION NULL,
    value_string TEXT NULL,
    quality INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('ts_data', 'time', if_not_exists => TRUE);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ts_data_device_id_time ON ts_data(device_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_ts_data_tag_name_time ON ts_data(tag_name, time DESC);
CREATE INDEX IF NOT EXISTS idx_ts_data_device_id_tag_name_time ON ts_data(device_id, tag_name, time DESC);

-- Enable compression for older data (>7 days)
SELECT add_compression_policy('ts_data', INTERVAL '7 days', if_not_exists => TRUE);

-- =============================================================================
-- 3. Alarms Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS alarms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(255) NOT NULL,
    alarm_name VARCHAR(255) NOT NULL,
    message TEXT,
    priority VARCHAR(50) NOT NULL DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
    time_triggered TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    time_acknowledged TIMESTAMPTZ NULL,
    time_cleared TIMESTAMPTZ NULL,
    is_active BOOLEAN DEFAULT TRUE,
    acknowledged_by UUID NULL,
    metadata JSONB NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alarms_device_id ON alarms(device_id);
CREATE INDEX IF NOT EXISTS idx_alarms_is_active ON alarms(is_active);
CREATE INDEX IF NOT EXISTS idx_alarms_priority ON alarms(priority);
CREATE INDEX IF NOT EXISTS idx_alarms_time_triggered ON alarms(time_triggered DESC);
CREATE INDEX IF NOT EXISTS idx_alarms_active_priority_time ON alarms(is_active, priority, time_triggered DESC);

-- =============================================================================
-- 4. Devices Table (PLC Configuration)
-- =============================================================================

CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    device_name VARCHAR(255) UNIQUE NOT NULL,
    protocol VARCHAR(50) NOT NULL, -- 'SLMP', 'ModbusTCP', 'S7comm', 'EtherNetIP'
    ip_address INET NOT NULL,
    port INT NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    poll_interval_ms INT DEFAULT 1000,
    description TEXT,
    metadata JSONB NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_devices_protocol ON devices(protocol);
CREATE INDEX IF NOT EXISTS idx_devices_is_enabled ON devices(is_enabled);
CREATE INDEX IF NOT EXISTS idx_devices_ip_address ON devices(ip_address);

-- =============================================================================
-- 5. Device Tags Configuration
-- =============================================================================

CREATE TABLE IF NOT EXISTS device_tags (
    id SERIAL PRIMARY KEY,
    device_id INT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    tag_name VARCHAR(255) NOT NULL,
    address VARCHAR(100) NOT NULL, -- Register address, e.g., D100, 0x100
    data_type VARCHAR(50), -- 'INT16', 'INT32', 'FLOAT', 'BOOL', 'STRING'
    unit VARCHAR(50), -- 'RPM', '°C', 'bar', etc.
    min_value NUMERIC NULL,
    max_value NUMERIC NULL,
    access_type VARCHAR(20) DEFAULT 'read', -- 'read', 'write', 'read-write'
    scan_rate_ms INT DEFAULT 1000,
    enabled BOOLEAN DEFAULT TRUE,
    metadata JSONB NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(device_id, tag_name)
);

CREATE INDEX IF NOT EXISTS idx_device_tags_device_id ON device_tags(device_id);
CREATE INDEX IF NOT EXISTS idx_device_tags_enabled ON device_tags(enabled);

-- =============================================================================
-- 6. Alarm Rules
-- =============================================================================

CREATE TABLE IF NOT EXISTS alarm_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id INT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    tag_id INT NOT NULL REFERENCES device_tags(id) ON DELETE CASCADE,
    rule_name VARCHAR(255) NOT NULL,
    alarm_name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- 'threshold', 'deviation', 'state', 'schedule'
    priority VARCHAR(50) NOT NULL DEFAULT 'medium',
    condition JSONB NOT NULL, -- Stores min, max, tolerance, etc.
    is_enabled BOOLEAN DEFAULT TRUE,
    notification_enabled BOOLEAN DEFAULT TRUE,
    notification_channels JSONB NULL, -- ['email', 'sms', 'webhook']
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alarm_rules_device_id ON alarm_rules(device_id);
CREATE INDEX IF NOT EXISTS idx_alarm_rules_is_enabled ON alarm_rules(is_enabled);
CREATE INDEX IF NOT EXISTS idx_alarm_rules_priority ON alarm_rules(priority);

-- =============================================================================
-- 7. Users & Authentication
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'operator', -- 'admin', 'operator', 'viewer'
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- =============================================================================
-- 8. Permissions (RBAC)
-- =============================================================================

CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    role VARCHAR(50) NOT NULL,
    resource VARCHAR(255) NOT NULL, -- 'plcs', 'tags', 'alarms', 'reports'
    action VARCHAR(50) NOT NULL, -- 'create', 'read', 'update', 'delete'
    UNIQUE(role, resource, action)
);

-- Seed default permissions
INSERT INTO permissions (role, resource, action) VALUES
-- Admin
('admin', 'plcs', 'create'),
('admin', 'plcs', 'read'),
('admin', 'plcs', 'update'),
('admin', 'plcs', 'delete'),
('admin', 'alarms', 'create'),
('admin', 'alarms', 'read'),
('admin', 'alarms', 'update'),
('admin', 'alarms', 'delete'),
('admin', 'reports', 'create'),
('admin', 'reports', 'read'),
('admin', 'reports', 'delete'),
-- Operator
('operator', 'plcs', 'read'),
('operator', 'alarms', 'read'),
('operator', 'alarms', 'acknowledge'),
('operator', 'reports', 'read'),
-- Viewer
('viewer', 'plcs', 'read'),
('viewer', 'alarms', 'read'),
('viewer', 'reports', 'read')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 9. Reports
-- =============================================================================

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    template_id UUID NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    report_type VARCHAR(50) NOT NULL, -- 'operational', 'downtime', 'alarm', 'compliance'
    report_format VARCHAR(50) DEFAULT 'pdf', -- 'pdf', 'excel', 'csv', 'json'
    report_data JSONB NULL,
    file_path VARCHAR(500) NULL,
    time_range_start TIMESTAMPTZ,
    time_range_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reports_created_by ON reports(created_by);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_report_type ON reports(report_type);

-- =============================================================================
-- 10. System Configuration
-- =============================================================================

CREATE TABLE IF NOT EXISTS system_config (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    data_type VARCHAR(50), -- 'string', 'int', 'float', 'boolean', 'json'
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Insert default configuration
INSERT INTO system_config (key, value, data_type, description) VALUES
('poll_interval_ms', '1000', 'int', 'Default polling interval in milliseconds'),
('data_retention_days', '365', 'int', 'Raw data retention period in days'),
('alarm_history_retention_days', '90', 'int', 'Alarm history retention in days'),
('max_concurrent_connections', '100', 'int', 'Maximum concurrent PLC connections')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 11. Audit Log
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(255),
    changes JSONB NULL,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource_type ON audit_log(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- =============================================================================
-- 12. View: Active Alarms Summary
-- =============================================================================

CREATE OR REPLACE VIEW active_alarms_summary AS
SELECT 
    COUNT(*) as total_active,
    COUNT(CASE WHEN priority = 'critical' THEN 1 END) as critical,
    COUNT(CASE WHEN priority = 'high' THEN 1 END) as high,
    COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium,
    COUNT(CASE WHEN priority = 'low' THEN 1 END) as low,
    COUNT(CASE WHEN is_active AND time_acknowledged IS NULL THEN 1 END) as unacknowledged
FROM alarms
WHERE is_active = TRUE AND time_cleared IS NULL;

-- =============================================================================
-- 13. View: Device Status
-- =============================================================================

CREATE OR REPLACE VIEW device_status_view AS
SELECT 
    d.id,
    d.device_name,
    d.protocol,
    d.ip_address,
    COUNT(DISTINCT dt.id) as tag_count,
    COUNT(DISTINCT CASE WHEN dt.enabled THEN dt.id END) as enabled_tag_count
FROM devices d
LEFT JOIN device_tags dt ON d.id = dt.device_id
GROUP BY d.id, d.device_name, d.protocol, d.ip_address;

-- =============================================================================
-- 14. Table Constraints & Triggers
-- =============================================================================

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alarm_rules_updated_at BEFORE UPDATE ON alarm_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 15. Grant Permissions (optional)
-- =============================================================================

-- Create read-only user for monitoring
CREATE USER plc_monitor_readonly WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE plc_monitor TO plc_monitor_readonly;
GRANT USAGE ON SCHEMA public TO plc_monitor_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO plc_monitor_readonly;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO plc_monitor_readonly;

-- =============================================================================
-- 16. Cleanup & Retention Policies
-- =============================================================================

-- Create function to clean up old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    DELETE FROM ts_data 
    WHERE time < NOW() - INTERVAL '365 days';
    
    DELETE FROM alarms 
    WHERE time_cleared < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- End of Schema
-- =============================================================================
