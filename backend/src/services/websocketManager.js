/**
 * WebSocket Manager
 * Handles real-time bidirectional communication with clients
 */

const logger = require('../utils/logger');

class WebSocketManager {
  constructor(io) {
    this.io = io;
    this.subscriptions = new Map(); // socketId -> subscribed tags
  }

  /**
   * Setup WebSocket event handlers
   */
  setupHandlers() {
    this.io.on('connection', (socket) => {
      logger.info({ socketId: socket.id }, 'WebSocket client connected');

      // Initialize subscriptions for this client
      this.subscriptions.set(socket.id, {
        tags: new Set(),
        devices: new Set()
      });

      // Client events
      socket.on('subscribe:tags', (data) => {
        this._handleSubscribeTags(socket, data);
      });

      socket.on('unsubscribe:tags', (data) => {
        this._handleUnsubscribeTags(socket, data);
      });

      socket.on('subscribe:device', (data) => {
        this._handleSubscribeDevice(socket, data);
      });

      socket.on('unsubscribe:device', (data) => {
        this._handleUnsubscribeDevice(socket, data);
      });

      socket.on('write:tag', (data) => {
        this.io.emit('tag:write:request', {
          socketId: socket.id,
          data
        });
      });

      socket.on('acknowledge:alarm', (data) => {
        this.io.emit('alarm:acknowledge:request', {
          socketId: socket.id,
          data
        });
      });

      socket.on('disconnect', () => {
        this._handleDisconnect(socket);
      });

      socket.on('error', (err) => {
        logger.error({ err, socketId: socket.id }, 'WebSocket error');
      });
    });

    logger.info('WebSocket handlers configured');
  }

  /**
   * Handle tag subscription
   * @private
   */
  _handleSubscribeTags(socket, data) {
    const { deviceId, tags } = data;

    try {
      const subs = this.subscriptions.get(socket.id);
      if (!subs) return;

      // Add tags to subscription
      if (Array.isArray(tags)) {
        tags.forEach(tag => {
          subs.tags.add(`${deviceId}:${tag}`);
        });
      }

      logger.debug({
        socketId: socket.id,
        deviceId,
        tagCount: tags?.length || 0
      }, 'Tags subscribed');

      socket.emit('subscribe:tags:ack', { success: true });
    } catch (err) {
      logger.error({ err, socketId: socket.id }, 'Subscription error');
      socket.emit('error', { message: 'Subscription failed' });
    }
  }

  /**
   * Handle tag unsubscription
   * @private
   */
  _handleUnsubscribeTags(socket, data) {
    const { deviceId, tags } = data;

    try {
      const subs = this.subscriptions.get(socket.id);
      if (!subs) return;

      if (Array.isArray(tags)) {
        tags.forEach(tag => {
          subs.tags.delete(`${deviceId}:${tag}`);
        });
      }

      logger.debug({
        socketId: socket.id,
        deviceId,
        tagCount: tags?.length || 0
      }, 'Tags unsubscribed');

      socket.emit('unsubscribe:tags:ack', { success: true });
    } catch (err) {
      logger.error({ err, socketId: socket.id }, 'Unsubscription error');
    }
  }

  /**
   * Handle device subscription
   * @private
   */
  _handleSubscribeDevice(socket, data) {
    const { deviceId } = data;

    try {
      const subs = this.subscriptions.get(socket.id);
      if (!subs) return;

      subs.devices.add(deviceId);

      logger.debug({ socketId: socket.id, deviceId }, 'Device subscribed');
      socket.emit('subscribe:device:ack', { success: true });
    } catch (err) {
      logger.error({ err, socketId: socket.id }, 'Device subscription error');
      socket.emit('error', { message: 'Device subscription failed' });
    }
  }

  /**
   * Handle device unsubscription
   * @private
   */
  _handleUnsubscribeDevice(socket, data) {
    const { deviceId } = data;

    try {
      const subs = this.subscriptions.get(socket.id);
      if (!subs) return;

      subs.devices.delete(deviceId);

      logger.debug({ socketId: socket.id, deviceId }, 'Device unsubscribed');
      socket.emit('unsubscribe:device:ack', { success: true });
    } catch (err) {
      logger.error({ err, socketId: socket.id }, 'Device unsubscription error');
    }
  }

  /**
   * Handle client disconnect
   * @private
   */
  _handleDisconnect(socket) {
    this.subscriptions.delete(socket.id);
    logger.info({ socketId: socket.id }, 'WebSocket client disconnected');
  }

  /**
   * Broadcast tag update
   * @param {string} deviceId - Device ID
   * @param {Object} data - Tag data
   */
  broadcastTagUpdate(deviceId, data) {
    this.io.emit('tag:update', {
      deviceId,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast alarm event
   * @param {string} type - Event type (triggered, acknowledged, cleared)
   * @param {Object} alarm - Alarm data
   */
  broadcastAlarmEvent(type, alarm) {
    this.io.emit(`alarm:${type}`, {
      alarm,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast device status change
   * @param {string} deviceId - Device ID
   * @param {Object} status - Device status
   */
  broadcastDeviceStatus(deviceId, status) {
    this.io.emit('device:status', {
      deviceId,
      status,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast system event
   * @param {string} type - Event type
   * @param {Object} data - Event data
   */
  broadcastSystemEvent(type, data) {
    this.io.emit('system:event', {
      type,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get connected clients count
   * @returns {number}
   */
  getConnectedClientsCount() {
    return this.io.engine.clientsCount;
  }

  /**
   * Get subscriptions for a socket
   * @param {string} socketId - Socket ID
   * @returns {Object}
   */
  getSubscriptions(socketId) {
    return this.subscriptions.get(socketId);
  }

  /**
   * Get all subscriptions
   * @returns {Map}
   */
  getAllSubscriptions() {
    return this.subscriptions;
  }

  /**
   * Send message to specific socket
   * @param {string} socketId - Socket ID
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  sendToSocket(socketId, event, data) {
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit(event, data);
    }
  }

  /**
   * Broadcast to all clients except sender
   * @param {string} socketId - Sender socket ID
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  broadcastExcept(socketId, event, data) {
    this.io.except(socketId).emit(event, data);
  }
}

module.exports = WebSocketManager;
