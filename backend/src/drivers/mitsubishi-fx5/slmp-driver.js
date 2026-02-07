/**
 * Mitsubishi FX5 SLMP Protocol Driver
 * 
 * Implements SLMP (Seamless Message Protocol) for communicating with
 * Mitsubishi FX5 Series PLCs over Ethernet/TCP.
 * 
 * @author PLC Code Development Agent
 * @version 1.0.0
 * @date 2025-02-07
 */

const net = require('net');
const EventEmitter = require('events');
const logger = require('../../utils/logger');

/**
 * SLMP Command Codes
 */
const SLMP_COMMANDS = {
  READ_WORD:     0x0401,  // Read word units (D, W registers)
  READ_BIT:      0x0402,  // Read bit units (M, S, X, Y)
  WRITE_WORD:    0x1401,  // Write word units
  WRITE_BIT:     0x1402,  // Write bit units
  RANDOM_READ:   0x0403,  // Read random word units
  RANDOM_WRITE:  0x1403,  // Write random word units
  READ_DEVICE:   0x0424,  // Read device (extended)
  WRITE_DEVICE:  0x1424,  // Write device (extended)
  READ_STATUS:   0x0701,  // Read PLC status
};

/**
 * Device Address Map
 */
const DEVICE_CODES = {
  D: 0xA8,   // Data Register (16-bit)
  W: 0xB4,   // Link Register (16-bit)
  M: 0x90,   // Internal Relay (1-bit)
  S: 0x98,   // Step Relay (1-bit)
  X: 0x9C,   // Input Relay (1-bit)
  Y: 0x9D,   // Output Relay (1-bit)
  T: 0xC7,   // Timer (16-bit)
  C: 0xC8,   // Counter (16-bit)
  V: 0xAE,   // Edge Relay (1-bit)
  K: 0xAC,   // Constant (read-only)
  H: 0xAD,   // Hex Constant (read-only)
  Z: 0xCC,   // Index Register (16-bit)
  L: 0xB2,   // Latch Register (16-bit)
};

/**
 * Data Type Definitions
 */
const DATA_TYPES = {
  BOOL:    { code: 0x00, size: 1, name: 'Boolean' },
  INT16:   { code: 0x01, size: 2, name: 'Int16' },
  UINT16:  { code: 0x02, size: 2, name: 'UInt16' },
  INT32:   { code: 0x03, size: 4, name: 'Int32' },
  UINT32:  { code: 0x04, size: 4, name: 'UInt32' },
  FLOAT:   { code: 0x05, size: 4, name: 'Float' },
  DOUBLE:  { code: 0x06, size: 8, name: 'Double' },
  STRING:  { code: 0x07, size: 0, name: 'String' },
};

/**
 * Connection State Enum
 */
const ConnectionState = {
  DISCONNECTED: 'disconnected',
  CONNECTING:   'connecting',
  CONNECTED:    'connected',
  ERROR:        'error',
};

/**
 * SLMP Error Codes
 */
const SLMP_ERROR_CODES = {
  0x0000: 'No Error',
  0x0100: 'Function code error',
  0x0101: 'Parameter error',
  0x0102: 'Parameter data error',
  0x0103: 'Invalid address',
  0x0104: 'PLC is busy',
  0x0105: 'PLC is in program edit mode',
  0x0106: 'PLC is password protected',
  0x0107: 'PLC communication error',
  0x0201: 'Write/Calculation error',
  0x0202: 'Program error',
  0x0203: 'Memory allocation error',
  0x9000: 'Block transfer error',
};

/**
 * Mitsubishi FX5 SLMP Driver Class
 */
class SlmpDriver extends EventEmitter {
  /**
   * Constructor
   * @param {Object} config - Configuration object
   * @param {string} config.host - PLC IP address
   * @param {number} config.port - PLC port (default: 5007)
   * @param {number} config.timeout - Connection timeout in ms (default: 10000)
   * @param {number} config.keepAliveInterval - Keep-alive interval in ms (default: 5000)
   * @param {number} config.maxRetries - Max connection retries (default: 3)
   */
  constructor(config = {}) {
    super();
    
    this.config = {
      host: config.host || 'localhost',
      port: config.port || 5007,
      timeout: config.timeout || 10000,
      keepAliveInterval: config.keepAliveInterval || 5000,
      maxRetries: config.maxRetries || 3,
      verbose: config.verbose || false,
    };

    this.socket = null;
    this.state = ConnectionState.DISCONNECTED;
    this.messageQueue = [];
    this.pendingRequests = new Map();
    this.sequenceNumber = 0;
    this.keepAliveTimer = null;
    this.retryCount = 0;
  }

  /**
   * Connect to PLC
   * @returns {Promise<void>}
   */
  async connect() {
    return new Promise((resolve, reject) => {
      if (this.state === ConnectionState.CONNECTED) {
        return resolve();
      }

      this.state = ConnectionState.CONNECTING;
      logger.info(`[SLMP] Connecting to ${this.config.host}:${this.config.port}`);

      try {
        this.socket = net.createConnection({
          host: this.config.host,
          port: this.config.port,
          timeout: this.config.timeout,
        });

        this.socket.on('connect', () => {
          this.state = ConnectionState.CONNECTED;
          this.retryCount = 0;
          logger.info(`[SLMP] Connected to ${this.config.host}:${this.config.port}`);
          this.emit('connected');
          this.startKeepAlive();
          resolve();
        });

        this.socket.on('data', (data) => this.handleData(data));
        
        this.socket.on('error', (error) => {
          this.state = ConnectionState.ERROR;
          logger.error(`[SLMP] Socket error: ${error.message}`);
          this.emit('error', error);
          reject(error);
        });

        this.socket.on('close', () => {
          this.state = ConnectionState.DISCONNECTED;
          this.stopKeepAlive();
          logger.warn(`[SLMP] Connection closed`);
          this.emit('disconnected');
        });

        this.socket.on('timeout', () => {
          logger.warn(`[SLMP] Connection timeout`);
          this.disconnect();
        });

      } catch (error) {
        this.state = ConnectionState.ERROR;
        logger.error(`[SLMP] Connection failed: ${error.message}`);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from PLC
   */
  disconnect() {
    this.stopKeepAlive();
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.state = ConnectionState.DISCONNECTED;
    this.pendingRequests.clear();
    logger.info('[SLMP] Disconnected');
  }

  /**
   * Handle incoming data
   * @param {Buffer} data - Received data buffer
   */
  handleData(data) {
    try {
      if (this.config.verbose) {
        logger.debug(`[SLMP] Received ${data.length} bytes`);
      }

      // Parse SLMP response
      const response = this.parseResponse(data);
      
      if (response && response.sequenceNumber !== undefined) {
        const request = this.pendingRequests.get(response.sequenceNumber);
        
        if (request) {
          this.pendingRequests.delete(response.sequenceNumber);
          
          if (response.errorCode !== 0x0000) {
            const error = new Error(
              `SLMP Error: ${SLMP_ERROR_CODES[response.errorCode] || 'Unknown error'}`
            );
            error.code = response.errorCode;
            request.reject(error);
          } else {
            request.resolve(response.data);
          }
        }
      }
    } catch (error) {
      logger.error(`[SLMP] Data parsing error: ${error.message}`);
      this.emit('error', error);
    }
  }

  /**
   * Read word units (16-bit registers)
   * @param {string} address - Device address (e.g., "D0", "D1000")
   * @param {number} count - Number of words to read
   * @returns {Promise<Buffer>} - Read data
   */
  async readWordUnits(address, count = 1) {
    const request = this.buildReadWordRequest(address, count);
    return this.sendRequest(request);
  }

  /**
   * Read bit units (individual bits)
   * @param {string} address - Device address (e.g., "M0", "Y20")
   * @param {number} count - Number of bits to read
   * @returns {Promise<Buffer>} - Read data (packed as bits)
   */
  async readBitUnits(address, count = 1) {
    const request = this.buildReadBitRequest(address, count);
    return this.sendRequest(request);
  }

  /**
   * Write word units (16-bit registers)
   * @param {string} address - Device address (e.g., "D0")
   * @param {number[]} values - Array of 16-bit values to write
   * @returns {Promise<void>}
   */
  async writeWordUnits(address, values) {
    const request = this.buildWriteWordRequest(address, values);
    return this.sendRequest(request);
  }

  /**
   * Write bit units (individual bits)
   * @param {string} address - Device address (e.g., "M0", "Y20")
   * @param {boolean[]} values - Array of bit values
   * @returns {Promise<void>}
   */
  async writeBitUnits(address, values) {
    const request = this.buildWriteBitRequest(address, values);
    return this.sendRequest(request);
  }

  /**
   * Random read (read multiple non-contiguous addresses)
   * @param {Array<{address: string, count: number}>} requests - Read requests
   * @returns {Promise<Object>} - Map of address -> data
   */
  async randomRead(requests) {
    const request = this.buildRandomReadRequest(requests);
    const response = await this.sendRequest(request);
    
    const result = {};
    let offset = 0;
    
    for (const req of requests) {
      const size = (req.count * 2);
      result[req.address] = response.slice(offset, offset + size);
      offset += size;
    }
    
    return result;
  }

  /**
   * Read PLC status
   * @returns {Promise<Object>} - PLC status information
   */
  async readStatus() {
    const request = this.buildStatusRequest();
    const data = await this.sendRequest(request);
    
    return {
      runMode: data.readUInt16LE(0),
      errorCode: data.readUInt16LE(2),
      cpuType: data.readUInt16LE(4),
    };
  }

  /**
   * Build SLMP read word request frame
   * @private
   */
  buildReadWordRequest(address, count) {
    const { device, number } = this.parseAddress(address);
    
    const data = Buffer.alloc(10);
    data.writeUInt16LE(SLMP_COMMANDS.READ_WORD, 0); // Command
    data.writeUInt16LE(0x0000, 2);                  // Sub code
    data.writeUInt16LE(number, 4);                  // Start address
    data.writeUInt8(DEVICE_CODES[device], 6);      // Device code
    data.writeUInt16LE(count, 7);                  // Count
    
    return this.buildFrame(data);
  }

  /**
   * Build SLMP read bit request frame
   * @private
   */
  buildReadBitRequest(address, count) {
    const { device, number } = this.parseAddress(address);
    
    const data = Buffer.alloc(10);
    data.writeUInt16LE(SLMP_COMMANDS.READ_BIT, 0);
    data.writeUInt16LE(0x0000, 2);
    data.writeUInt16LE(number, 4);
    data.writeUInt8(DEVICE_CODES[device], 6);
    data.writeUInt16LE(count, 7);
    
    return this.buildFrame(data);
  }

  /**
   * Build SLMP write word request frame
   * @private
   */
  buildWriteWordRequest(address, values) {
    const { device, number } = this.parseAddress(address);
    
    const count = values.length;
    const dataSize = 10 + (count * 2);
    const data = Buffer.alloc(dataSize);
    
    data.writeUInt16LE(SLMP_COMMANDS.WRITE_WORD, 0);
    data.writeUInt16LE(0x0000, 2);
    data.writeUInt16LE(number, 4);
    data.writeUInt8(DEVICE_CODES[device], 6);
    data.writeUInt16LE(count, 7);
    
    for (let i = 0; i < count; i++) {
      data.writeUInt16LE(values[i], 9 + (i * 2));
    }
    
    return this.buildFrame(data);
  }

  /**
   * Build SLMP write bit request frame
   * @private
   */
  buildWriteBitRequest(address, values) {
    const { device, number } = this.parseAddress(address);
    const count = values.length;
    
    // Pack bits into bytes
    const byteCount = Math.ceil(count / 8);
    const dataSize = 10 + byteCount;
    const data = Buffer.alloc(dataSize);
    
    data.writeUInt16LE(SLMP_COMMANDS.WRITE_BIT, 0);
    data.writeUInt16LE(0x0000, 2);
    data.writeUInt16LE(number, 4);
    data.writeUInt8(DEVICE_CODES[device], 6);
    data.writeUInt16LE(count, 7);
    
    // Pack bit values
    let bitIndex = 0;
    for (let i = 0; i < count; i++) {
      const byteIndex = 9 + Math.floor(i / 8);
      const bitOffset = i % 8;
      if (values[i]) {
        data[byteIndex] |= (1 << bitOffset);
      }
    }
    
    return this.buildFrame(data);
  }

  /**
   * Build SLMP random read request
   * @private
   */
  buildRandomReadRequest(requests) {
    const dataSize = 4 + (requests.length * 4);
    const data = Buffer.alloc(dataSize);
    
    data.writeUInt16LE(SLMP_COMMANDS.RANDOM_READ, 0);
    data.writeUInt16LE(0x0000, 2);
    
    for (let i = 0; i < requests.length; i++) {
      const req = requests[i];
      const { device, number } = this.parseAddress(req.address);
      
      const offset = 4 + (i * 4);
      data.writeUInt16LE(number, offset);
      data.writeUInt8(DEVICE_CODES[device], offset + 2);
      data.writeUInt8(req.count || 1, offset + 3);
    }
    
    return this.buildFrame(data);
  }

  /**
   * Build SLMP status request
   * @private
   */
  buildStatusRequest() {
    const data = Buffer.alloc(4);
    data.writeUInt16LE(SLMP_COMMANDS.READ_STATUS, 0);
    data.writeUInt16LE(0x0000, 2);
    return this.buildFrame(data);
  }

  /**
   * Build SLMP frame header
   * @private
   */
  buildFrame(dataPayload) {
    const frame = Buffer.alloc(12 + dataPayload.length);
    
    frame.writeUInt16LE(0x5000, 0);                    // Subheader
    frame.writeUInt16LE(dataPayload.length, 2);        // Length (little-endian)
    this.sequenceNumber = (this.sequenceNumber + 1) % 0x10000;
    frame.writeUInt16LE(this.sequenceNumber, 4);       // CPU Timer/Sequence
    frame.write(dataPayload, 6);                       // Command + Data
    
    return frame;
  }

  /**
   * Parse SLMP response frame
   * @private
   */
  parseResponse(buffer) {
    if (buffer.length < 12) {
      throw new Error('Invalid SLMP response: Too short');
    }

    const subheader = buffer.readUInt16LE(0);
    if (subheader !== 0xD000) {
      throw new Error('Invalid SLMP response: Bad subheader');
    }

    const length = buffer.readUInt16LE(2);
    const sequenceNumber = buffer.readUInt16LE(4);
    const errorCode = buffer.readUInt16LE(6);

    const data = buffer.slice(12, 12 + length);

    return {
      sequenceNumber,
      errorCode,
      data,
    };
  }

  /**
   * Send request and wait for response
   * @private
   */
  sendRequest(frame) {
    return new Promise((resolve, reject) => {
      if (this.state !== ConnectionState.CONNECTED) {
        return reject(new Error('PLC not connected'));
      }

      const seqNum = frame.readUInt16LE(4);
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(seqNum);
        reject(new Error('SLMP request timeout'));
      }, this.config.timeout);

      this.pendingRequests.set(seqNum, {
        resolve: (data) => {
          clearTimeout(timeout);
          resolve(data);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });

      try {
        this.socket.write(frame);
      } catch (error) {
        this.pendingRequests.delete(seqNum);
        reject(error);
      }
    });
  }

  /**
   * Parse device address (e.g., "D0" -> {device: "D", number: 0})
   * @private
   */
  parseAddress(address) {
    const match = address.match(/^([A-Z])(\d+)$/);
    if (!match) {
      throw new Error(`Invalid device address: ${address}`);
    }
    return {
      device: match[1],
      number: parseInt(match[2], 10),
    };
  }

  /**
   * Start keep-alive timer
   * @private
   */
  startKeepAlive() {
    this.keepAliveTimer = setInterval(() => {
      if (this.state === ConnectionState.CONNECTED) {
        this.readStatus().catch(() => {
          // Ignore keep-alive errors
        });
      }
    }, this.config.keepAliveInterval);
  }

  /**
   * Stop keep-alive timer
   * @private
   */
  stopKeepAlive() {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  /**
   * Get connection state
   */
  getState() {
    return this.state;
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.state === ConnectionState.CONNECTED;
  }

  /**
   * Get driver statistics
   */
  getStats() {
    return {
      state: this.state,
      host: this.config.host,
      port: this.config.port,
      connected: this.isConnected(),
      pendingRequests: this.pendingRequests.size,
      sequenceNumber: this.sequenceNumber,
    };
  }
}

module.exports = SlmpDriver;
module.exports.SLMP_COMMANDS = SLMP_COMMANDS;
module.exports.DEVICE_CODES = DEVICE_CODES;
module.exports.DATA_TYPES = DATA_TYPES;
module.exports.ConnectionState = ConnectionState;
