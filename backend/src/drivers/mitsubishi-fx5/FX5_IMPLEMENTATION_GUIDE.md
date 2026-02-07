# Mitsubishi FX5 PLC - Implementation Guide

**Version**: 1.0.0  
**Date**: 2025-02-07  
**Scope**: Complete development and optimization for FX5-series PLCs

## Table of Contents

1. [Getting Started](#getting-started)
2. [FX5 Architecture Overview](#fx5-architecture-overview)
3. [Programming Standards](#programming-standards)
4. [Performance Optimization](#performance-optimization)
5. [Communication Protocols](#communication-protocols)
6. [Firmware Development](#firmware-development)
7. [Testing & Validation](#testing--validation)
8. [Troubleshooting](#troubleshooting)
9. [Reference](#reference)

---

## Getting Started

### Hardware Requirements

```
Mitsubishi FX5U Series PLC:
├─ CPU Module: FX5U-32MR/DS
├─ Memory: 16KB (program) + 128KB (data)
├─ I/O Modules: 16 DI + 16 DO (expandable)
├─ Ethernet: Built-in (10/100 Mbps)
├─ Communications: SLMP, Modbus TCP
└─ Operating Temp: 0-50°C
```

### Development Tools

**Recommended Software**:
- **GX Works 3**: Official Mitsubishi IDE (Windows only)
- **GX Developer**: Legacy IDE (for older syntax)
- **VS Code + PLC Extensions**: For Structured Text
- **Node.js 18+**: For SLMP driver development
- **Docker**: For containerized testing

**Essential Libraries**:
```javascript
// Node.js/JavaScript
const net = require('net');           // TCP/IP networking
const EventEmitter = require('events'); // Event handling
const SlmpDriver = require('./slmp-driver.js');
```

### Initial Setup

```bash
# 1. Install Node.js dependencies
npm install

# 2. Load SLMP driver
const SlmpDriver = require('./slmp-driver');

# 3. Create PLC instance
const plc = new SlmpDriver({
  host: '192.168.1.100',
  port: 5007,
  timeout: 10000
});

# 4. Connect and test
await plc.connect();
const status = await plc.readStatus();
console.log('PLC Status:', status);
```

---

## FX5 Architecture Overview

### Memory Layout

```
Memory Space (Total: 144KB)
┌─────────────────────────────────────┐
│ Program Area (16 KB)                │ 0x0000 - 0x3FFF
├─────────────────────────────────────┤
│ Data Registers (D) - 64KB           │ 0x0000 - 0xFFFF
│ Link Registers (W) - 64KB           │ 0x0000 - 0xFFFF
├─────────────────────────────────────┤
│ Internal Relays (M) - 1KB (8000 bits)
├─────────────────────────────────────┤
│ Input Relays (X) - 128 bits (16 bytes)
├─────────────────────────────────────┤
│ Output Relays (Y) - 128 bits (16 bytes)
├─────────────────────────────────────┤
│ Step Relays (S) - 1KB (8000 bits)
├─────────────────────────────────────┤
│ Timers (T) - 100 units
├─────────────────────────────────────┤
│ Counters (C) - 100 units
└─────────────────────────────────────┘
```

### Device Categories

#### 1. Input Devices (Read-only from program)
```
X0-X377      : External inputs (up to 3072 inputs with expansion)
K            : Constants (fixed values)
H            : Hex constants
```

#### 2. Output Devices (Write from program)
```
Y0-Y377      : External outputs
D0-D9999     : Data registers (16-bit word)
W0-W9999     : Link registers (for communication)
M0-M9999     : Internal relays (1-bit)
S0-S9999     : Step relays (1-bit)
T0-T99       : Timer current values
C0-C99       : Counter current values
L0-L99       : Latch registers
V0-V15       : Edge relays
```

#### 3. Function Codes
```
T0-T99       : Timer coils (100 total)
C0-C99       : Counter coils (100 total)
```

### Execution Model

**Scan Cycle** (10-50ms typical):
```
┌─ Read Inputs ─────────────────┐
│  • X relays (real world)       │
│  • D registers (from network)  │
│  • Timer completion status     │
└────────────────────────────────┘
        ↓
┌─ Execute Program ─────────────┐
│  • Process ladder logic        │
│  • Calculate outputs           │
│  • Update data registers       │
└────────────────────────────────┘
        ↓
┌─ Write Outputs ───────────────┐
│  • Y relays (real world)       │
│  • W registers (network)       │
│  • Update status               │
└────────────────────────────────┘
        ↓
┌─ Wait for next cycle ─────────┐
│  Cycle time: ~10-50ms          │
└────────────────────────────────┘
```

---

## Programming Standards

### Code Organization Best Practices

#### 1. Structured Program Layout

```
FX5 Program Structure:
├─ Initialization Section
│  ├─ Clear flags (M0-M99)
│  ├─ Set defaults (D0-D99)
│  └─ Initialize timers
├─ Main Control Logic
│  ├─ Read inputs
│  ├─ Process data
│  ├─ Calculate outputs
│  └─ Update status
├─ Safety & Monitoring
│  ├─ Watchdog timer
│  ├─ Fault detection
│  ├─ Alarm conditions
│  └─ Emergency stop
├─ Diagnostics & Logging
│  ├─ Data logging
│  ├─ Error counters
│  └─ Performance metrics
└─ Output Section
   └─ Write all results
```

#### 2. Naming Conventions

```
Device Naming Standard:
┌──────┬──────────────────┬─────────────────┐
│Type  │ Range            │ Purpose         │
├──────┼──────────────────┼─────────────────┤
│X     │ X0-X99           │ Safety inputs   │
│      │ X100-X199        │ Mode selectors  │
│      │ X200-X299        │ Status inputs   │
│──────┼──────────────────┼─────────────────┤
│Y     │ Y0-Y99           │ Control outputs │
│      │ Y100-Y199        │ Status outputs  │
│──────┼──────────────────┼─────────────────┤
│M     │ M0-M99           │ Control flags   │
│      │ M100-M199        │ Status flags    │
│      │ M200-M299        │ Temporary work  │
│──────┼──────────────────┼─────────────────┤
│D     │ D0-D99           │ System params   │
│      │ D100-D199        │ Setpoints       │
│      │ D200-D299        │ Measured data   │
│      │ D1000-D1999      │ Log buffer      │
│──────┼──────────────────┼─────────────────┤
│T     │ T0-T49           │ Cycle timers    │
│      │ T50-T99          │ Control timers  │
│──────┼──────────────────┼─────────────────┤
│C     │ C0-C49           │ Event counters  │
│      │ C50-C99          │ Control counters│
└──────┴──────────────────┴─────────────────┘
```

#### 3. Register Documentation

```
Example: D100-D199 = Setpoint Section

D100: Temperature Setpoint (0-10000 = 0-100°C)
      ├─ Units: 0.01°C per count
      ├─ Default: 2500 (25°C)
      └─ Updated by: Network command or analog input
      
D101: Pressure Setpoint (0-4000 = 0-40 bar)
      ├─ Units: 0.01 bar per count
      └─ Default: 2000 (20 bar)

D110-D119: Configuration Flags
D110: Enable Temperature Control (0=off, 1=on)
D111: Control Mode (0=heating, 1=cooling, 2=auto)
D112: PID Cycle Time (ms) - default 100

D200-D299: Real-time Data Log
      - Store measured values at regular intervals
      - Ring buffer, auto-wrap at D299
      - Use D300 as log pointer
```

### Structured Text Guidelines

#### 1. Function Block Template

```structured-text
FUNCTION_BLOCK FB_TemperatureController
  
  VAR_INPUT
    SetPoint_Real : REAL;        (* Input setpoint *)
    ActualTemp_Real : REAL;      (* Measured temperature *)
    Enable : BOOL;               (* Enable control *)
  END_VAR
  
  VAR_OUTPUT
    HeaterOutput : BOOL;         (* Heater command *)
    CoolerOutput : BOOL;         (* Cooler command *)
    Status : INT;                (* Status code *)
  END_VAR
  
  VAR
    Error_Real : REAL;           (* Temperature error *)
    Integral_Real : REAL;        (* Integral accumulator *)
    PrevError_Real : REAL;       (* Previous error *)
    PIDOut_Real : REAL;          (* PID output *)
    
    (* PID Coefficients *)
    KP : REAL := 1.0;            (* Proportional *)
    KI : REAL := 0.1;            (* Integral *)
    KD : REAL := 0.05;           (* Derivative *)
  END_VAR
  
  (* Main logic *)
  CALL PIDCalculate();
  
  PROCEDURE PIDCalculate()
    Error_Real := SetPoint_Real - ActualTemp_Real;
    
    (* P term *)
    (* I term with anti-windup *)
    (* D term *)
    
    (* Output logic *)
    HeaterOutput := (PIDOut_Real > 50.0);
    CoolerOutput := (PIDOut_Real < -50.0);
  END_PROCEDURE
  
END_FUNCTION_BLOCK
```

#### 2. Error Handling Pattern

```structured-text
PROGRAM SafetyProgram
  VAR
    Status : INT;  (* 0=OK, 1=Warning, 2=Error *)
    ErrorCode : INT;
    ErrorMsg : STRING[100];
  END_VAR
  
  TRY
    (* Main logic *)
    CALL ProcessData();
  EXCEPT
    Status := 2;  (* Error *)
    ErrorCode := ERR_CODE;
    ErrorMsg := 'Processing failed';
  END_TRY
  
  (* Always execute safety logic *)
  IF Status > 0 THEN
    CALL EmergencyShutdown();
  END_IF;
  
END_PROGRAM
```

### Ladder Logic Guidelines

#### 1. Rung Best Practices

```
✓ Good: Clear, single purpose
│        │
├────────+─[ Condition ]──[ Action ]─┐
│        │                            │
│        └────────────────────────────┘

✗ Bad: Multiple purposes in one rung
│        │
├────────+─[ Cond1 ]──[ Act1 ]
│        ├─[ Cond2 ]──[ Act2 ]
│        ├─[ Cond3 ]──[ Act3 ]
│        │
│        └────────────────────────────┘

✓ Better: Separate logical blocks
│
├─ Input Section (Rungs 1-10)
├─ Processing Section (Rungs 11-40)
├─ Output Section (Rungs 41-50)
│
└─ Diagnostics Section (Rungs 51-end)
```

#### 2. Common Patterns

**Set-Reset Latch**:
```
Rung 1: Set condition    ─[ S M0 ]
Rung 2: Reset condition  ─[ R M0 ]
Rung 3: Use latch        ─[ M0 ]─[ Y0 ]
```

**Rising Edge Detection**:
```
Rung 1: | X0 |/| M0 |──[ M0 ]  (* Detect change *)
Rung 2: | M0 |──[ Action ]    (* Execute action *)
```

**Counter with Limit**:
```
Rung 1: | Counter < Limit |──[ INC C0 ]
Rung 2: | C0 >= Limit |──[ SET Alarm ]
Rung 3: | Reset |──[ RESET C0 ]
```

---

## Performance Optimization

### 1. Cycle Time Reduction

#### Analysis & Profiling

```
Identify bottlenecks:
┌─────────────────────────────────────────┐
│ SLMP Communication (typically ~10-50ms) │
│   • Network latency                     │
│   • PLC response time                   │
│   • Batching opportunities              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Data Processing (typically ~1-5ms)      │
│   • Algorithm complexity                │
│   • Memory access patterns              │
│   • Register allocation                 │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ I/O Operations (typically ~0.5-2ms)     │
│   • Read inputs                         │
│   • Write outputs                       │
│   • Discrete bit operations             │
└─────────────────────────────────────────┘
```

#### Optimization Strategies

```javascript
// Strategy 1: Batch Register Reads
// ❌ Inefficient - 10 separate reads
for (let i = 0; i < 10; i++) {
  const value = await plc.readWordUnits('D' + i, 1);
  processData(value);
}

// ✅ Efficient - Single batched read
const data = await plc.readWordUnits('D0', 10);
for (let i = 0; i < 10; i++) {
  processData(data.readUInt16LE(i * 2));
}

// Strategy 2: Selective Polling
// ✅ Only read when data is likely changed
if (triggerChanged) {
  const newValue = await plc.readWordUnits('D100', 1);
  if (newValue !== previousValue) {
    processUpdate(newValue);
  }
}

// Strategy 3: Priority-based Polling
// ✅ Critical registers polled frequently, others less often
const POLL_RATES = {
  critical: 50,    // Every 50ms
  normal: 200,     // Every 200ms
  background: 1000 // Every 1000ms
};
```

### 2. Memory Optimization

#### Register Allocation Strategy

```
Efficient Allocation:
┌──────────────────────────────────────┐
│ D0-D99: Frequently used              │
│  ├─ Setpoints                        │
│  ├─ Current values                   │
│  └─ Status flags                     │
├──────────────────────────────────────┤
│ D100-D199: Medium frequency          │
│  ├─ Calculated values                │
│  ├─ Moving averages                  │
│  └─ Temporary buffers                │
├──────────────────────────────────────┤
│ D200-D999: Low frequency             │
│  ├─ Diagnostic data                  │
│  ├─ Logging                          │
│  └─ Archived values                  │
└──────────────────────────────────────┘
```

#### Data Type Selection

```
Optimize data types:

╔═══════════════════════════════════╗
║ 16-bit Word (Most efficient)      ║
║ └─ Use for: Counters, timers, IDs ║
╚═══════════════════════════════════╝

╔═══════════════════════════════════╗
║ 32-bit Double Word (2 registers)  ║
║ └─ Use for: Large counters, times ║
╚═══════════════════════════════════╝

╔═══════════════════════════════════╗
║ Single Bit (1 flag bit)           ║
║ └─ Use for: Boolean states        ║
╚═══════════════════════════════════╝

❌ Avoid storing single bits in 16-bit registers
✅ Pack multiple bits into single word
```

### 3. Network Optimization

#### SLMP Protocol Tuning

```javascript
// Configuration for optimal performance
const plcConfig = {
  // Reduce frequency of non-critical updates
  keepAliveInterval: 10000,  // 10 sec instead of 5 sec
  
  // Batch operations
  batchSize: 32,              // Read up to 32 words at once
  
  // Timeout optimization
  timeout: 5000,              // 5 sec (reasonable default)
  
  // Connection pooling
  maxConnections: 3,          // Parallel connections
  
  // Data compression (if supported)
  compression: false,         // Usually not beneficial
};

// Batch Reading Strategy
async function efficientRead(plc) {
  // Read related blocks together
  const criticalData = await plc.readWordUnits('D0', 50);
  const config = await plc.readWordUnits('D100', 20);
  const status = await plc.readWordUnits('D200', 30);
  
  return { criticalData, config, status };
}

// Selective Write Optimization
async function efficientWrite(plc) {
  // Batch writes to same block
  const valuesToWrite = [100, 200, 300, 400];
  await plc.writeWordUnits('D0', valuesToWrite);
}
```

### 4. Algorithm Optimization

#### Fixed-Point vs Floating-Point

```structured-text
(* ❌ SLOW: Floating-point calculations *)
FUNCTION_BLOCK SlowPID
  VAR
    actual_temp_float : REAL;  (* Floating-point *)
    setpoint_float : REAL;
    error : REAL;
  END_VAR
  
  error := setpoint_float - actual_temp_float;
  (* Floating-point arithmetic is 5-10x slower *)
END_FUNCTION_BLOCK

(* ✅ FAST: Fixed-point calculations *)
FUNCTION_BLOCK FastPID
  VAR
    actual_temp : INT;    (* Fixed-point: D100 = 1°C *)
    setpoint : INT;
    error : INT;
  END_VAR
  
  error := setpoint - actual_temp;
  (* Integer arithmetic is native speed *)
  
  (* Scale results when needed *)
  scaled_result := error * 100 / 256;
END_FUNCTION_BLOCK
```

#### Lookup Tables vs Calculations

```
Optimization: Use lookup tables for:
├─ Non-linear conversions (sensor calibration)
├─ Trigonometric functions
├─ Complex transformations
└─ Frequently calculated values

Storage: Lookup tables use register space efficiently
┌─────────────────────────────────────────┐
│ D1000-D1255: Sensor A calibration       │
│ D1256-D1511: Sensor B calibration       │
│ D1512-D1767: Motor curve data           │
└─────────────────────────────────────────┘
```

---

## Communication Protocols

### SLMP Protocol Details

#### Message Flow

```
Client (Node.js)          Network          Server (FX5 PLC)
     │                      │                      │
     │──Request Frame───────>│                      │
     │ (Command + Data)      │────Received──────────>│
     │                       │                      │
     │                       │<───Response Frame────│
     │<──────Response Frame──│  (Data + Status)     │
     │ (Parsed + Validated)  │                      │
```

#### Read Operation Example

```javascript
// Complete SLMP read operation
async function readTemperature(plc) {
  try {
    // Build frame
    const frame = Buffer.alloc(12);
    frame.writeUInt16LE(0x5000, 0);    // Subheader
    frame.writeUInt16LE(0x0004, 2);    // Length
    frame.writeUInt16LE(seqNum++, 4);  // Sequence
    frame.writeUInt16LE(0x0401, 6);    // Read word command
    frame.writeUInt16LE(0x0000, 8);    // Sub code
    // ... device address and count
    
    // Send and get response
    const response = await plc.sendRequest(frame);
    
    // Parse response
    const temperature = response.readUInt16LE(0);
    return temperature / 100;  // Convert to degrees
    
  } catch (error) {
    logger.error('Read failed:', error);
    throw error;
  }
}
```

### Modbus TCP Protocol

**For non-Mitsubishi devices**, use Modbus TCP:

```javascript
const ModbusTCP = require('modbus-tcp');

const modbusClient = new ModbusTCP({
  host: '192.168.1.101',
  port: 502,
  unitId: 1
});

// Read holding registers (16-bit)
const regs = await modbusClient.readHoldingRegisters(0, 10);

// Write registers
await modbusClient.writeMultipleRegisters(0, [100, 200, 300]);
```

---

## Firmware Development

### Structure & Organization

```
FX5 Firmware Project:
├─ Main Program
│  ├─ Initialization (run once)
│  ├─ Cyclic Logic (runs every scan)
│  └─ Interrupt Handlers
├─ Subroutines (CALL blocks)
│  ├─ InputProcessing
│  ├─ DataCalculation
│  ├─ OutputControl
│  └─ Diagnostics
├─ Interrupt Programs
│  ├─ FastInterrupt (high priority)
│  └─ TimerInterrupt
└─ Global Data
   ├─ Registers (D0-D9999)
   ├─ Relays (M, S, V)
   ├─ Timers (T0-T99)
   └─ Counters (C0-C99)
```

### Development Workflow

**Step 1: Design Phase**
```
├─ Define I/O requirements
├─ Plan register allocation
├─ Design control algorithms
└─ Document logic flow
```

**Step 2: Implementation**
```
├─ Write Structured Text or Ladder Logic
├─ Add comments and documentation
├─ Implement error handling
└─ Test individual functions
```

**Step 3: Testing**
```
├─ Unit test each function
├─ Integration test with simulation
├─ Load on actual hardware
└─ Validate performance
```

**Step 4: Deployment**
```
├─ Backup original firmware
├─ Upload to PLC
├─ Verify operation
└─ Monitor for issues
```

### Backup & Version Control

```bash
# Always backup before changes
$ mitsubishi-backup.sh --model FX5U --output backup-2025-02-07.bin

# Version control (git)
$ git init
$ git add *.st *.lad *.gx3
$ git commit -m "feat: Add temperature control logic v1.0"
$ git tag -a v1.0.0 -m "Initial release"
```

---

## Testing & Validation

### Unit Testing Framework

```javascript
// test/slmp-driver.test.js

const SlmpDriver = require('../slmp-driver');
const assert = require('assert');

describe('SLMP Driver Tests', () => {
  
  let plc;
  
  before(async () => {
    plc = new SlmpDriver({
      host: '192.168.1.100',
      port: 5007,
      timeout: 10000
    });
    await plc.connect();
  });
  
  after(() => {
    plc.disconnect();
  });
  
  it('should read word units', async () => {
    const data = await plc.readWordUnits('D0', 10);
    assert(Buffer.isBuffer(data), 'Response should be buffer');
    assert.equal(data.length, 20, 'Should return 10 words (20 bytes)');
  });
  
  it('should write word units', async () => {
    const values = [100, 200, 300];
    await plc.writeWordUnits('D0', values);
    
    const data = await plc.readWordUnits('D0', 3);
    assert.equal(data.readUInt16LE(0), 100);
    assert.equal(data.readUInt16LE(2), 200);
    assert.equal(data.readUInt16LE(4), 300);
  });
  
  it('should handle connection timeout', async () => {
    const badPlc = new SlmpDriver({
      host: '192.168.1.255',  // Invalid
      port: 5007,
      timeout: 1000
    });
    
    try {
      await badPlc.connect();
      assert.fail('Should timeout');
    } catch (error) {
      assert(error.message.includes('timeout') || error.message.includes('ECONNREFUSED'));
    }
  });
  
});
```

### Integration Testing

```javascript
// test/integration.test.js

describe('Temperature Control Integration', () => {
  
  it('should implement complete control loop', async () => {
    const plc = new SlmpDriver(CONFIG);
    await plc.connect();
    
    // Set setpoint
    await plc.writeWordUnits('D100', [2500]);  // 25°C
    
    // Read status
    let actualTemp = await plc.readWordUnits('D1', 1);
    
    // Verify heater/cooler response
    let heater = await plc.readBitUnits('Y0', 1);
    
    // Simulate heating (add to temperature)
    if (heater) {
      actualTemp += 5;
    }
    
    // Verify convergence
    assert(actualTemp < 2800, 'Should reach setpoint');
    
    plc.disconnect();
  });
  
});
```

### Validation Checklist

```
┌─────────────────────────────────────────────┐
│ Firmware Validation Checklist               │
├─────────────────────────────────────────────┤
│ □ Inputs read correctly                     │
│ □ Outputs control relays properly           │
│ □ Timers function correctly                 │
│ □ Counters increment accurately             │
│ □ Data registers hold values                │
│ □ Register 32-bit operations work           │
│ □ Bit operations (M, S, V) functional      │
│ □ Subroutines execute in order              │
│ □ Interrupts trigger properly               │
│ □ Watchdog timer functions                  │
│ □ Error handling works                      │
│ □ Performance within spec (cycle < 50ms)    │
│ □ Memory usage within limits                │
│ □ No register conflicts                     │
│ □ No infinite loops                         │
│ □ Documentation complete                    │
└─────────────────────────────────────────────┘
```

---

## Troubleshooting

### Connection Issues

```
Problem: Cannot connect to FX5 PLC

Diagnosis:
┌─────────────────────────────────────────────┐
│ 1. Network connectivity                     │
│    $ ping 192.168.1.100                     │
│    → ICMP timeout = network issue           │
│                                             │
│ 2. SLMP port (5007)                         │
│    $ nc -zv 192.168.1.100 5007              │
│    → Connection refused = PLC not listening │
│                                             │
│ 3. Firewall rules                           │
│    $ iptables -L | grep 5007                │
│    → Check PLC firewall settings            │
│                                             │
│ 4. PLC status                               │
│    → Check physical LED indicators          │
│    → Verify power supply                    │
│    → Check Ethernet cable                   │
│                                             │
│ 5. Driver configuration                     │
│    → Verify IP address and port             │
│    → Check timeout values                   │
│    → Review connection logs                 │
└─────────────────────────────────────────────┘

Solution:
1. Verify IP address:     ipconfiguration or ipconfig
2. Test ping:             ping <PLC_IP>
3. Check firewall:        Disable temporarily if trusted network
4. Power cycle PLC:       Turn off, wait 10s, turn on
5. Update driver config:  Increase timeout to 15000ms
6. Check GX Works:        Verify PLC is running program
```

### Data Read/Write Issues

```
Problem: Reading/writing incorrect data

Diagnosis:
┌─────────────────────────────────────────────┐
│ 1. Address Format                           │
│    ✓ Correct:  "D0", "D100", "M50", "Y20"  │
│    ✗ Wrong:    "0", "D", "D0-D9"           │
│                                             │
│ 2. Data Type Mismatch                       │
│    INT range: -32768 to 32767               │
│    Verify actual stored value in registers  │
│                                             │
│ 3. Register Allocation Conflict             │
│    Check if another program uses same regs  │
│                                             │
│ 4. Byte Order (Endianness)                  │
│    SLMP uses little-endian                  │
│    readUInt16LE() for proper conversion     │
│                                             │
│ 5. Bit Packing                              │
│    Single bits packed into bytes            │
│    Verify packing/unpacking logic           │
└─────────────────────────────────────────────┘

Solution:
1. Verify register exists:  GX Works → Address List
2. Check data type:         D* = 16-bit INT
3. Use correct read method: readWordUnits(), not readBitUnits()
4. Test with known value:   Manually set D0=1000, read back
5. Add logging:             Log all read/write operations
```

### Performance Issues

```
Problem: Slow cycle time or missed deadlines

Solution:
┌─────────────────────────────────────────────┐
│ 1. Reduce polling frequency                 │
│    - Don't read every cycle                 │
│    - Batch reads together                   │
│    - Skip non-critical updates              │
│                                             │
│ 2. Optimize PLC program                     │
│    - Minimize floating-point operations     │
│    - Use fixed-point math                   │
│    - Eliminate nested loops                 │
│                                             │
│ 3. Check network latency                    │
│    $ ping -c 100 <PLC_IP> | awk ...         │
│    → Should be < 5ms (local network)        │
│                                             │
│ 4. Profile code execution                   │
│    - Add timing marks (GX Works)            │
│    - Measure individual blocks              │
│    - Identify bottlenecks                   │
│                                             │
│ 5. Monitor PLC diagnostics                  │
│    - Check CPU usage                        │
│    - Review memory allocation               │
│    - Look for error conditions              │
└─────────────────────────────────────────────┘
```

---

## Reference

### Mitsubishi FX5 Resources

- **Official Manual**: CPU Module User's Manual (Document MELSEC iQ)
- **SLMP Specification**: SLMP Protocol Technical Specification v2.5
- **GX Works 3**: Latest version available at Mitsubishi website

### Related Protocols

- **Modbus TCP**: For multi-vendor integration
- **OPC-UA**: For enterprise integration
- **MQTT**: For cloud connectivity

### Performance Targets

```
┌─────────────────────┬──────────┬─────────┐
│ Metric              │ Target   │ Typical │
├─────────────────────┼──────────┼─────────┤
│ Cycle Time          │ < 50ms   │ 20ms    │
│ Read Latency        │ < 100ms  │ 30ms    │
│ Write Latency       │ < 50ms   │ 20ms    │
│ Network Throughput  │ > 80%    │ 90%     │
│ Uptime              │ 99.5%    │ 99.8%   │
└─────────────────────┴──────────┴─────────┘
```

---

**Document Version**: 1.0.0  
**Status**: Production Ready  
**Last Updated**: 2025-02-07  
**Maintained By**: PLC Code Development Agent
