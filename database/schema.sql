-- Initial Database Schema for PLC Monitoring System
-- Target Database: PostgreSQL with TimescaleDB Extension

-- First, ensure the TimescaleDB extension is created:
-- CREATE EXTENSION IF NOT EXISTS timescaledb;

-- =============================================================================
-- 1. Time-Series Data Table
-- This table will store all raw data points from the PLCs.
-- =============================================================================
CREATE TABLE ts_data (
    "time" TIMESTAMPTZ NOT NULL,
    device_id VARCHAR(255) NOT NULL, -- e.g., FX5U_Main_Line
    tag_name VARCHAR(255) NOT NULL,  -- e.g., D100, Motor_Speed
    value_numeric DOUBLE PRECISION NULL, -- For numeric values
    value_string TEXT NULL,              -- For string/boolean values
    quality INT -- Optional: data quality code
);

-- Turn the regular table into a TimescaleDB hypertable, partitioned by time.
SELECT create_hypertable(ts_data, time);

-- Add indexing for common queries
CREATE INDEX ON ts_data (device_id, "time" DESC);
CREATE INDEX ON ts_data (tag_name, "time" DESC);


-- =============================================================================
-- 2. Alarms Table
-- This table stores active and historical alarms.
-- =============================================================================
CREATE TABLE alarms (
    id SERIAL PRIMARY KEY,
    "time_triggered" TIMESTAMPTZ NOT NULL,
    "time_acknowledged" TIMESTAMPTZ NULL,
    "time_cleared" TIMESTAMPTZ NULL,
    device_id VARCHAR(255) NOT NULL,
    alarm_name VARCHAR(255) NOT NULL,
    message TEXT,
    priority INT NOT NULL, -- e.g., 1=High, 2=Medium, 3=Low
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX ON alarms (is_active, priority, "time_triggered" DESC);
CREATE INDEX ON alarms (device_id, "time_triggered" DESC);


-- =============================================================================
-- 3. Device Configuration Table
-- A relational table to store information about connected devices.
-- =============================================================================
CREATE TABLE devices (
    id SERIAL PRIMARY KEY,
    device_name VARCHAR(255) UNIQUE NOT NULL, -- e.g., FX5U_Main_Line
    protocol VARCHAR(50) NOT NULL,            -- SLMP or ModbusTCP
    ip_address VARCHAR(100) NOT NULL,
    port INT NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    description TEXT
);
