# Mitsubishi FX5 SLMP Protocol Driver

**Version**: 1.0.0  
**Date**: 2025-02-07  
**Platform**: Mitsubishi FX5 Series PLC  
**Protocol**: SLMP (Seamless Message Protocol)

## Overview

SLMP is a Mitsubishi proprietary protocol for communicating with FX5 PLCs over Ethernet/TCP. This driver implements the SLMP protocol stack for reliable real-time communication.

## SLMP Protocol Specification

### Network Layer
- **Transport**: TCP/IP
- **Default Port**: 5007 (Mitsubishi SLMP)
- **Connection**: Persistent (keep-alive)
- **Timeout**: 10 seconds (configurable)

### Frame Structure

```
┌─────────────────────────────────────────────────────┐
│ SLMP Frame Format                                   │
├─────────────────────────────────────────────────────┤
│ Byte Offset │ Size │ Name         │ Description     │
├─────────────┼──────┼──────────────┼─────────────────┤
│ 0-1         │ 2B   │ Subheader    │ 0x5000          │
│ 2-3         │ 2B   │ Length       │ Data length     │
│ 4-5         │ 2B   │ CPU Timer    │ Count/Response  │
│ 6-9         │ 4B   │ Command      │ Function code   │
│ 10-11       │ 2B   │ Sub Code     │ Sub function    │
│ 12-N        │ Var  │ Data         │ Request/Response│
└─────────────────────────────────────────────────────┘
```

### Command Codes

```javascript
// Command Function Codes
const SLMP_COMMANDS = {
  // Memory Operations
  READ_WORD:    0x0401,   // Read word units (D, W registers)
  READ_BIT:     0x0402,   // Read bit units (M, S, X, Y)
  WRITE_WORD:   0x1401,   // Write word units
  WRITE_BIT:    0x1402,   // Write bit units
  
  // Special Operations
  RANDOM_READ:  0x0403,   // Read random word units
  RANDOM_WRITE: 0x1403,   // Write random word units
  
  // Diagnostics
  READ_DEVICE:  0x0424,   // Read device (extended)
  WRITE_DEVICE: 0x1424,   // Write device (extended)
  
  // Program Control
  STOP:         0x0502,   // Stop PLC
  RUN:          0x0501,   // Start PLC
  RESET:        0x0503,   // Reset PLC
  
  // Monitoring
  READ_STATUS:  0x0701,   // Read PLC status
  REMOTE_LOCK:  0x0802,   // Lock/Unlock remote operations
};
```

### Device Address Format

```
Address Format: [Device Code][Number][*Bit]

Device Codes:
- D     : Data Register (16-bit)
- W     : Link Register (16-bit)
- M     : Internal Relay (1-bit)
- S     : Step Relay (1-bit)
- X     : Input Relay (1-bit)
- Y     : Output Relay (1-bit)
- T     : Timer (16-bit)
- C     : Counter (16-bit)
- V     : Edge Relay (1-bit)
- K     : Constant (16-bit read-only)
- H     : Hex constant (read-only)
- KnX   : Special Constant (read-only)
- Z     : Index Register (16-bit)
- L     : Latch Register (16-bit)

Example Addresses:
- D0     : Data Register 0
- D1000  : Data Register 1000
- M100   : Internal Relay 100
- Y20    : Output Relay 20
- T5     : Timer 5
- C10    : Counter 10
```

## SLMP Data Types

```javascript
// Supported Data Types
const DATA_TYPES = {
  BOOL:    { code: 0x00, size: 1,  name: 'Boolean (1-bit)' },
  INT16:   { code: 0x01, size: 2,  name: 'Signed 16-bit' },
  UINT16:  { code: 0x02, size: 2,  name: 'Unsigned 16-bit' },
  INT32:   { code: 0x03, size: 4,  name: 'Signed 32-bit' },
  UINT32:  { code: 0x04, size: 4,  name: 'Unsigned 32-bit' },
  FLOAT:   { code: 0x05, size: 4,  name: 'IEEE 754 Float' },
  DOUBLE:  { code: 0x06, size: 8,  name: 'IEEE 754 Double' },
  STRING:  { code: 0x07, size: 'var', name: 'ASCII String' },
};
```

## Binary Data Encoding

### Read Word Request (Command 0x0401)

```
Hex Format:
50 00 | 0C 00 | 00 00 | 01 04 | 00 00 | 10 00 | 44 30 30 30 | 10 00

Breakdown:
- 50 00      : Subheader
- 0C 00      : Length = 12 bytes
- 00 00      : CPU Timer
- 01 04       : Command = 0x0401 (Read Word)
- 00 00       : Sub Code
- 10 00       : Start address (little-endian)
- 44 30 30 30 : "D000" (address string)
- 10 00       : Count = 16 points
```

### Write Word Request (Command 0x1401)

```
Hex Format:
50 00 | 16 00 | 00 00 | 01 14 | 00 00 | 10 00 | 44 30 30 30 | 01 00 | XX XX XX XX ...

Breakdown:
- 50 00      : Subheader
- 16 00      : Length = 22 bytes
- 00 00      : CPU Timer
- 01 14       : Command = 0x1401 (Write Word)
- 00 00       : Sub Code
- 10 00       : Start address
- 44 30 30 30 : "D000" (address string)
- 01 00       : Count = 1 point
- XX XX XX XX : Data (little-endian)
```

## Implementation Details

### Connection Management

```javascript
// Connection States
enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING   = 'connecting',
  CONNECTED    = 'connected',
  ERROR        = 'error',
}

// Keep-Alive Strategy
- Interval: 5 seconds
- Message: PING (NOP operation)
- Timeout: 10 seconds
- Retry: 3 attempts before reconnect
```

### Error Handling

```javascript
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
```

### Timeout & Retry Logic

```
Read Operation Flow:
┌─────────────────────────────────────────┐
│ Send Read Request                       │
├─────────────────────────────────────────┤
│ ├─ Set timeout: 10s                     │
│ ├─ Wait for response                    │
│ └─ On timeout: retry (max 3)            │
├─────────────────────────────────────────┤
│ Parse Response                          │
├─────────────────────────────────────────┤
│ ├─ Validate subheader                   │
│ ├─ Check length                         │
│ ├─ Parse error code                     │
│ ├─ Extract data                         │
│ └─ Validate checksum (if enabled)       │
├─────────────────────────────────────────┤
│ Return Data or Error                    │
└─────────────────────────────────────────┘
```

## Performance Optimization

### Read Optimization
- **Batch Reading**: Group consecutive registers
- **Block Reading**: Read up to 960 words in single operation
- **Selective Polling**: Only read changed addresses
- **Priority Levels**: Critical tags read more frequently

### Write Optimization
- **Write Queuing**: Queue writes, batch send
- **Write Coalescing**: Merge consecutive write requests
- **Atomic Operations**: Lock for write consistency
- **Non-blocking Writes**: Async write with callback

### Network Optimization
- **Connection Pooling**: Reuse TCP connections
- **Keep-Alive**: Prevent connection timeout
- **Compression**: Optional data compression
- **MTU Optimization**: Respect network MTU size

## Security Considerations

1. **Network Security**
   - Use VPN for remote access
   - Firewall rules: Only allow port 5007 from known hosts
   - Disable internet access to SLMP port

2. **Authentication**
   - Password protection on PLC
   - Remote lock to prevent unauthorized changes
   - Audit logging for all operations

3. **Data Protection**
   - Validate all received data
   - Checksum verification
   - Range checking for write operations

## Troubleshooting

### Connection Issues
```
Problem: Cannot connect to PLC
├─ Check IP address and port
├─ Verify firewall rules
├─ Ping the PLC IP
├─ Check network cable (if local)
└─ Power cycle PLC
```

### Data Issues
```
Problem: Incorrect data values
├─ Verify address format
├─ Check data type alignment
├─ Validate address range
├─ Check PLC memory layout
└─ Review PLC program logic
```

### Performance Issues
```
Problem: Slow response times
├─ Reduce polling frequency
├─ Batch read requests
├─ Check network latency (ping)
├─ Monitor PLC CPU usage
└─ Consider network upgrade
```

## References

- **Mitsubishi FX5 Manual**: CPU Module User's Manual
- **SLMP Specification**: SLMP Protocol Technical Specification v2.5
- **Ethernet Communication**: FX5 Ethernet Communication Manual

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-02-07 | Initial SLMP driver specification |

---

**Document**: SLMP_DRIVER.md  
**Status**: Production Ready  
**Maintained By**: PLC Code Development Agent
