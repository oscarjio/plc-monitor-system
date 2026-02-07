/**
 * Database Repository
 * High-level database operations for PLC Monitor
 */

const prisma = require('./client');

class Repository {
  /**
   * DEVICES
   */
  async getAllDevices() {
    return await prisma.devices.findMany({
      include: {
        device_tags: true,
      },
    });
  }

  async getDeviceById(id) {
    return await prisma.devices.findUnique({
      where: { id: parseInt(id) },
      include: {
        device_tags: true,
        alarm_rules: true,
      },
    });
  }

  async getDeviceByName(name) {
    return await prisma.devices.findUnique({
      where: { device_name: name },
      include: {
        device_tags: true,
      },
    });
  }

  async createDevice(data) {
    return await prisma.devices.create({
      data,
    });
  }

  async updateDevice(id, data) {
    return await prisma.devices.update({
      where: { id: parseInt(id) },
      data,
    });
  }

  async deleteDevice(id) {
    return await prisma.devices.delete({
      where: { id: parseInt(id) },
    });
  }

  /**
   * DEVICE TAGS
   */
  async getTagsByDevice(deviceId) {
    return await prisma.device_tags.findMany({
      where: { device_id: parseInt(deviceId) },
    });
  }

  async createTag(data) {
    return await prisma.device_tags.create({
      data,
    });
  }

  async updateTag(id, data) {
    return await prisma.device_tags.update({
      where: { id: parseInt(id) },
      data,
    });
  }

  async deleteTag(id) {
    return await prisma.device_tags.delete({
      where: { id: parseInt(id) },
    });
  }

  /**
   * TIME-SERIES DATA (using raw SQL since Prisma doesn't support ts_data)
   */
  async insertTimeSeriesData(deviceId, tagName, value, quality = 0) {
    const valueNumeric = typeof value === 'number' ? value : null;
    const valueString = typeof value === 'string' ? value : null;

    return await prisma.$executeRaw`
      INSERT INTO ts_data (time, device_id, tag_name, value_numeric, value_string, quality)
      VALUES (NOW(), ${deviceId}, ${tagName}, ${valueNumeric}, ${valueString}, ${quality})
    `;
  }

  async getTimeSeriesData(deviceId, tagName, startTime, endTime, limit = 1000) {
    const query = `
      SELECT time, device_id, tag_name, value_numeric, value_string, quality
      FROM ts_data
      WHERE device_id = $1
        AND tag_name = $2
        AND time >= $3
        AND time <= $4
      ORDER BY time DESC
      LIMIT $5
    `;
    
    return await prisma.$queryRawUnsafe(
      query,
      deviceId,
      tagName,
      startTime,
      endTime,
      limit
    );
  }

  async getLatestTimeSeriesData(deviceId, limit = 100) {
    const query = `
      SELECT time, device_id, tag_name, value_numeric, value_string, quality
      FROM ts_data
      WHERE device_id = $1
      ORDER BY time DESC
      LIMIT $2
    `;
    
    return await prisma.$queryRawUnsafe(query, deviceId, limit);
  }

  /**
   * ALARMS
   */
  async getActiveAlarms() {
    return await prisma.alarms.findMany({
      where: {
        is_active: true,
        time_cleared: null,
      },
      orderBy: [
        { priority: 'asc' },
        { time_triggered: 'desc' },
      ],
    });
  }

  async getAlarmsByDevice(deviceId) {
    return await prisma.alarms.findMany({
      where: { device_id: deviceId },
      orderBy: { time_triggered: 'desc' },
      take: 100,
    });
  }

  async createAlarm(data) {
    return await prisma.alarms.create({
      data,
    });
  }

  async acknowledgeAlarm(alarmId, userId) {
    return await prisma.alarms.update({
      where: { id: alarmId },
      data: {
        time_acknowledged: new Date(),
        acknowledged_by: userId,
      },
    });
  }

  async clearAlarm(alarmId) {
    return await prisma.alarms.update({
      where: { id: alarmId },
      data: {
        time_cleared: new Date(),
        is_active: false,
      },
    });
  }

  /**
   * ALARM RULES
   */
  async getAlarmRules(deviceId = null) {
    const where = deviceId ? { device_id: parseInt(deviceId) } : {};
    return await prisma.alarm_rules.findMany({
      where,
      include: {
        devices: true,
        device_tags: true,
      },
    });
  }

  async createAlarmRule(data) {
    return await prisma.alarm_rules.create({
      data,
    });
  }

  /**
   * USERS
   */
  async getUserByUsername(username) {
    return await prisma.users.findUnique({
      where: { username },
    });
  }

  async createUser(data) {
    return await prisma.users.create({
      data,
    });
  }

  /**
   * REPORTS
   */
  async createReport(data) {
    return await prisma.reports.create({
      data,
    });
  }

  async getReports(limit = 50) {
    return await prisma.reports.findMany({
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        users: {
          select: {
            username: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * SYSTEM CONFIG
   */
  async getConfig(key) {
    return await prisma.system_config.findUnique({
      where: { key },
    });
  }

  async setConfig(key, value, dataType = 'string', description = null) {
    return await prisma.system_config.upsert({
      where: { key },
      update: { value, updated_at: new Date() },
      create: { key, value, data_type: dataType, description },
    });
  }

  /**
   * STATISTICS
   */
  async getDeviceStats() {
    const total = await prisma.devices.count();
    const enabled = await prisma.devices.count({ where: { is_enabled: true } });
    const disabled = total - enabled;

    return {
      total,
      enabled,
      disabled,
    };
  }

  async getAlarmStats() {
    const result = await prisma.$queryRaw`
      SELECT 
        COUNT(*) FILTER (WHERE priority = 'critical') as critical,
        COUNT(*) FILTER (WHERE priority = 'high') as high,
        COUNT(*) FILTER (WHERE priority = 'medium') as medium,
        COUNT(*) FILTER (WHERE priority = 'low') as low,
        COUNT(*) FILTER (WHERE time_acknowledged IS NULL) as unacknowledged
      FROM alarms
      WHERE is_active = true AND time_cleared IS NULL
    `;

    return result[0];
  }
}

module.exports = new Repository();
