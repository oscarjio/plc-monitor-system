/**
 * Database Seed Script
 * Creates test data for PLC Monitor system
 */

const prisma = require('./client');

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Create test devices
    console.log('Creating devices...');
    
    const device1 = await prisma.devices.create({
      data: {
        device_name: 'PLC-001',
        protocol: 'SLMP',
        ip_address: '192.168.1.100',
        port: 5007,
        is_enabled: true,
        poll_interval_ms: 1000,
        description: 'Mitsubishi FX5 PLC - Production Line 1',
        metadata: {
          location: 'Factory Floor A',
          manufacturer: 'Mitsubishi',
          model: 'FX5U-64MT/ES',
        },
      },
    });

    const device2 = await prisma.devices.create({
      data: {
        device_name: 'PLC-002',
        protocol: 'ModbusTCP',
        ip_address: '192.168.1.101',
        port: 502,
        is_enabled: true,
        poll_interval_ms: 1000,
        description: 'Siemens S7-1200 PLC - Production Line 2',
        metadata: {
          location: 'Factory Floor B',
          manufacturer: 'Siemens',
          model: 'S7-1200',
        },
      },
    });

    const device3 = await prisma.devices.create({
      data: {
        device_name: 'PLC-003',
        protocol: 'SLMP',
        ip_address: '192.168.1.102',
        port: 5007,
        is_enabled: false,
        poll_interval_ms: 2000,
        description: 'Mitsubishi iQ-R PLC - Packaging Station',
        metadata: {
          location: 'Packaging Area',
          manufacturer: 'Mitsubishi',
          model: 'R08ENCPU',
        },
      },
    });

    console.log(`✓ Created ${3} devices`);

    // Create tags for device 1
    console.log('Creating device tags...');
    
    await prisma.device_tags.createMany({
      data: [
        {
          device_id: device1.id,
          tag_name: 'temperature',
          address: 'D100',
          data_type: 'FLOAT',
          unit: '°C',
          min_value: -50,
          max_value: 150,
          access_type: 'read',
          scan_rate_ms: 1000,
          enabled: true,
        },
        {
          device_id: device1.id,
          tag_name: 'pressure',
          address: 'D102',
          data_type: 'FLOAT',
          unit: 'bar',
          min_value: 0,
          max_value: 10,
          access_type: 'read',
          scan_rate_ms: 1000,
          enabled: true,
        },
        {
          device_id: device1.id,
          tag_name: 'motor_speed',
          address: 'D104',
          data_type: 'INT16',
          unit: 'RPM',
          min_value: 0,
          max_value: 3000,
          access_type: 'read',
          scan_rate_ms: 500,
          enabled: true,
        },
        {
          device_id: device1.id,
          tag_name: 'heater_status',
          address: 'Y0',
          data_type: 'BOOL',
          unit: null,
          access_type: 'read-write',
          scan_rate_ms: 1000,
          enabled: true,
        },
      ],
    });

    // Create tags for device 2
    await prisma.device_tags.createMany({
      data: [
        {
          device_id: device2.id,
          tag_name: 'flow_rate',
          address: '400001',
          data_type: 'FLOAT',
          unit: 'L/min',
          min_value: 0,
          max_value: 100,
          access_type: 'read',
          scan_rate_ms: 1000,
          enabled: true,
        },
        {
          device_id: device2.id,
          tag_name: 'valve_position',
          address: '400003',
          data_type: 'INT16',
          unit: '%',
          min_value: 0,
          max_value: 100,
          access_type: 'read-write',
          scan_rate_ms: 1000,
          enabled: true,
        },
      ],
    });

    console.log(`✓ Created device tags`);

    // Insert some time-series test data
    console.log('Inserting time-series data...');
    
    const now = new Date();
    for (let i = 0; i < 20; i++) {
      const timestamp = new Date(now.getTime() - i * 60000); // Every minute
      
      await prisma.$executeRaw`
        INSERT INTO ts_data (time, device_id, tag_name, value_numeric, quality)
        VALUES 
          (${timestamp}, 'PLC-001', 'temperature', ${25 + Math.random() * 10}, 0),
          (${timestamp}, 'PLC-001', 'pressure', ${5 + Math.random() * 2}, 0),
          (${timestamp}, 'PLC-001', 'motor_speed', ${1500 + Math.random() * 500}, 0)
      `;
    }

    console.log(`✓ Inserted time-series data`);

    // Create test alarms
    console.log('Creating test alarms...');
    
    await prisma.alarms.create({
      data: {
        device_id: 'PLC-001',
        alarm_name: 'HIGH_TEMPERATURE',
        message: 'Temperature exceeded 30°C threshold',
        priority: 'high',
        time_triggered: new Date(),
        is_active: true,
        metadata: {
          threshold: 30,
          current_value: 32.5,
        },
      },
    });

    await prisma.alarms.create({
      data: {
        device_id: 'PLC-002',
        alarm_name: 'LOW_FLOW_RATE',
        message: 'Flow rate below minimum threshold',
        priority: 'medium',
        time_triggered: new Date(Date.now() - 3600000), // 1 hour ago
        time_acknowledged: new Date(Date.now() - 1800000), // 30 min ago
        is_active: true,
        metadata: {
          threshold: 10,
          current_value: 8.2,
        },
      },
    });

    console.log(`✓ Created test alarms`);

    // Create test user
    console.log('Creating test user...');
    
    await prisma.users.create({
      data: {
        username: 'admin',
        email: 'admin@plc-monitor.local',
        password_hash: '$2b$10$rGHEQGVlxFLZ.wQ2Y.0C2OZEQJxGvvQBZdNVy3gQX6jK7m6wZx8pa', // "admin123"
        role: 'admin',
        is_active: true,
      },
    });

    await prisma.users.create({
      data: {
        username: 'operator',
        email: 'operator@plc-monitor.local',
        password_hash: '$2b$10$rGHEQGVlxFLZ.wQ2Y.0C2OZEQJxGvvQBZdNVy3gQX6jK7m6wZx8pa', // "admin123"
        role: 'operator',
        is_active: true,
      },
    });

    console.log(`✓ Created test users (admin/admin123, operator/admin123)`);

    console.log('\n✅ Database seeded successfully!');
    console.log('\nTest Devices:');
    console.log('  - PLC-001: Mitsubishi FX5 (SLMP, 192.168.1.100:5007) [ENABLED]');
    console.log('  - PLC-002: Siemens S7-1200 (Modbus TCP, 192.168.1.101:502) [ENABLED]');
    console.log('  - PLC-003: Mitsubishi iQ-R (SLMP, 192.168.1.102:5007) [DISABLED]');
    console.log('\nTest Users:');
    console.log('  - admin / admin123 (role: admin)');
    console.log('  - operator / admin123 (role: operator)');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seed if called directly
if (require.main === module) {
  seed()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

module.exports = seed;
