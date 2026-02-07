/**
 * Protocol Factory
 * Creates PLC driver instances based on protocol type
 */

const SlmpDriver = require('./slmpDriver');
const ModbusTcpDriver = require('./modbusTcpDriver');
const logger = require('../utils/logger');

class ProtocolFactory {
  /**
   * Create a PLC driver instance
   * @param {string} protocol - Protocol type (SLMP, ModbusTCP, etc.)
   * @param {Object} config - PLC configuration
   * @returns {PLCDriver} - Driver instance
   */
  static createDriver(protocol, config) {
    const protocolUpper = protocol.toUpperCase();

    switch (protocolUpper) {
      case 'SLMP':
      case 'MITSUBISHI':
      case 'FX5U':
        logger.debug({ protocol, config }, 'Creating SLMP driver');
        return new SlmpDriver(config);

      case 'MODBUS_TCP':
      case 'MODBUS':
      case 'MODBUSTCP':
        logger.debug({ protocol, config }, 'Creating Modbus TCP driver');
        return new ModbusTcpDriver(config);

      default:
        throw new Error(`Unsupported protocol: ${protocol}`);
    }
  }

  /**
   * Get list of supported protocols
   * @returns {Array<string>}
   */
  static getSupportedProtocols() {
    return [
      'SLMP',
      'ModbusTCP'
    ];
  }

  /**
   * Check if protocol is supported
   * @param {string} protocol - Protocol name
   * @returns {boolean}
   */
  static isSupported(protocol) {
    return this.getSupportedProtocols()
      .map(p => p.toUpperCase())
      .includes(protocol.toUpperCase());
  }

  /**
   * Get protocol info
   * @param {string} protocol - Protocol name
   * @returns {Object} - Protocol info
   */
  static getProtocolInfo(protocol) {
    const infos = {
      'SLMP': {
        name: 'SLMP',
        fullName: 'Simple and Lightweight Message Protocol',
        vendor: 'Mitsubishi',
        devices: ['FX5U', 'FX5', 'iQ-F Series'],
        defaultPort: 5007,
        description: 'Protocol for Mitsubishi FX5U and compatible PLCs'
      },
      'MODBUS_TCP': {
        name: 'ModbusTCP',
        fullName: 'Modbus TCP/IP',
        vendor: 'Modbus Organization',
        devices: ['Allen Bradley', 'Schneider Electric', 'Siemens', 'Others'],
        defaultPort: 502,
        description: 'Industry standard TCP/IP protocol for industrial devices'
      }
    };

    return infos[protocol.toUpperCase()] || null;
  }
}

module.exports = ProtocolFactory;
