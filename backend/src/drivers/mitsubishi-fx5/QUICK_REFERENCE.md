# FX5 SLMP Driver - Quick Reference Guide

**Quick lookup for common operations and patterns**

---

## 📌 Connection Essentials

### Connect & Disconnect

```javascript
const SlmpDriver = require('./slmp-driver');

const plc = new SlmpDriver({
  host: '192.168.1.100',
  port: 5007,
  timeout: 10000
});

await plc.connect();           // Connect to PLC
console.log(plc.isConnected()); // true/false
plc.disconnect();              // Close connection
```

---

## 📊 Reading Data

### Single Register Read

```javascript
// Read 1 word from D0
const data = await plc.readWordUnits('D0', 1);
const value = data.readUInt16LE(0);
```

### Block Read

```javascript
// Read 10 words from D100-D109
const block = await plc.readWordUnits('D100', 10);

// Access individual values
for (let i = 0; i < 10; i++) {
  const val = block.readUInt16LE(i * 2);
  console.log(`D${100 + i} = ${val}`);
}
```

### Bit Read

```javascript
// Read 8 bits from M0-M7
const bits = await plc.readBitUnits('M0', 8);
console.log(bits);  // [true, false, true, ...]
```

### Status Read

```javascript
const status = await plc.readStatus();
// { runMode, errorCode, cpuType }
```

---

## ✍️ Writing Data

### Single Value

```javascript
await plc.writeWordUnits('D0', [1000]);
```

### Multiple Values

```javascript
const values = [100, 200, 300, 400, 500];
await plc.writeWordUnits('D10', values);
```

### Bit Operations

```javascript
// Set single bit
await plc.writeBitUnits('Y0', [true]);

// Set multiple bits
await plc.writeBitUnits('M0', [true, false, true, false]);

// Set all bits in range
const bits = new Array(16).fill(false);
bits[0] = true;  // M0 ON
bits[5] = true;  // M5 ON
await plc.writeBitUnits('M0', bits);
```

---

## 🔄 Common Device Patterns

### Temperature Sensor

```javascript
// Read temperature from D1 (raw value)
const tempData = await plc.readWordUnits('D1', 1);
const tempRaw = tempData.readUInt16LE(0);
const tempCelsius = tempRaw / 100;  // Convert 0.01°C per unit
```

### Pressure Sensor

```javascript
// Read pressure from D2 (raw value)
const pressData = await plc.readWordUnits('D2', 1);
const pressRaw = pressData.readUInt16LE(0);
const pressBar = pressRaw / 100;  // Convert 0.01 bar per unit
```

### Counter

```javascript
// Read counter C0
const countData = await plc.readWordUnits('C0', 1);
const count = countData.readUInt16LE(0);
```

### Timer

```javascript
// Read timer T0 (current value)
const timerData = await plc.readWordUnits('T0', 1);
const timerMs = timerData.readUInt16LE(0);  // Depends on timer scale
```

### Relay Control

```javascript
// Turn ON output Y0
await plc.writeBitUnits('Y0', [true]);

// Turn OFF output Y0
await plc.writeBitUnits('Y0', [false]);

// Check input X0
const inputBits = await plc.readBitUnits('X0', 1);
if (inputBits[0]) {
  console.log('X0 is ON');
}
```

---

## 🔗 Address Quick Reference

### Data Registers (16-bit)

| Address | Use | Range |
|---------|-----|-------|
| D0-D99 | System | Fast access |
| D100-D199 | Setpoints | Configuration |
| D200-D299 | Measurements | Current values |
| D1000+ | Logging | Historical data |

### Bit Devices (1-bit)

| Address | Use | Count |
|---------|-----|-------|
| M0-M9999 | Internal | 10,000 max |
| X0-X377 | Inputs | 384 max |
| Y0-Y377 | Outputs | 384 max |
| S0-S9999 | Steps | 10,000 max |

### Special

| Address | Use | Count |
|---------|-----|-------|
| T0-T99 | Timers | 100 |
| C0-C99 | Counters | 100 |
| L0-L99 | Latch | 100 |
| V0-V15 | Edge | 16 |

---

## ⚡ Performance Tips

### Batch Operations (✅ Fast)

```javascript
// ✅ Good: Single read operation
const data = await plc.readWordUnits('D0', 50);

// ❌ Slow: 50 separate reads
for (let i = 0; i < 50; i++) {
  await plc.readWordUnits('D' + i, 1);
}
```

### Selective Polling (✅ Efficient)

```javascript
// ✅ Good: Poll only when needed
if (hasUpdate) {
  const newValue = await plc.readWordUnits('D100', 1);
}

// ❌ Slow: Continuous polling
setInterval(async () => {
  const value = await plc.readWordUnits('D100', 1);
}, 10);  // Every 10ms
```

### Optimal Polling Frequency

```javascript
const pollRates = {
  critical: 50,      // 50ms - Critical sensors
  normal: 200,       // 200ms - Normal monitoring
  background: 1000   // 1s - Low priority
};

// Critical (temperature, pressure)
setInterval(async () => {
  const temp = await plc.readWordUnits('D1', 1);
  updateDisplay(temp);
}, pollRates.critical);

// Normal (status, flags)
setInterval(async () => {
  const status = await plc.readWordUnits('D50', 10);
  updateUI(status);
}, pollRates.normal);

// Background (logging, diagnostics)
setInterval(async () => {
  const log = await plc.readWordUnits('D200', 50);
  saveToDatabase(log);
}, pollRates.background);
```

---

## 🛡️ Error Handling Patterns

### Basic Try-Catch

```javascript
try {
  const data = await plc.readWordUnits('D0', 1);
  console.log('Success:', data.readUInt16LE(0));
} catch (error) {
  console.error('Read failed:', error.message);
}
```

### With Retry Logic

```javascript
async function readWithRetry(address, count, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await plc.readWordUnits(address, count);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(r => setTimeout(r, 100));  // Wait 100ms
    }
  }
}

const data = await readWithRetry('D0', 10);
```

### Connection Check

```javascript
if (!plc.isConnected()) {
  try {
    await plc.connect();
  } catch (error) {
    console.error('Cannot connect:', error.message);
    // Use cached data or enter safe mode
  }
}
```

### Graceful Degradation

```javascript
async function safeRead(address, count, defaultValue) {
  try {
    return await plc.readWordUnits(address, count);
  } catch (error) {
    console.warn('Read failed, using default:', error.message);
    return defaultValue;
  }
}

const data = safeRead('D0', 10, Buffer.alloc(20));
```

---

## 📈 Control Loop Pattern

### Temperature Control

```javascript
async function temperatureControl() {
  const plc = new SlmpDriver({ host: '192.168.1.100' });
  await plc.connect();

  const setpoint = 25000;  // 25.00°C
  const kp = 1.0;          // Proportional gain
  
  while (true) {
    try {
      // Read actual temperature
      const tempData = await plc.readWordUnits('D1', 1);
      const actual = tempData.readUInt16LE(0);
      
      // Calculate error
      const error = setpoint - actual;
      
      // Control decision (simplified P-only)
      const heaterOn = error > 100;  // 1.00°C threshold
      
      // Write control output
      await plc.writeBitUnits('Y0', [heaterOn]);
      
      console.log(`Temp: ${actual/100}°C, Heater: ${heaterOn}`);
      
    } catch (error) {
      console.error('Control error:', error.message);
    }
    
    // Cycle time: 100ms
    await new Promise(r => setTimeout(r, 100));
  }
}
```

### Data Logging

```javascript
async function dataLogging() {
  const plc = new SlmpDriver({ host: '192.168.1.100' });
  await plc.connect();

  setInterval(async () => {
    try {
      // Read all sensor data at once
      const data = await plc.readWordUnits('D0', 20);
      
      const record = {
        timestamp: new Date().toISOString(),
        temperature: data.readUInt16LE(0) / 100,
        pressure: data.readUInt16LE(2) / 100,
        humidity: data.readUInt16LE(4) / 100,
        flow: data.readUInt16LE(6)
      };
      
      // Store in database
      database.insert(record);
      
    } catch (error) {
      console.error('Logging error:', error.message);
    }
  }, 1000);  // Log every second
}
```

---

## 🔍 Debugging

### Enable Verbose Logging

```javascript
const plc = new SlmpDriver({
  host: '192.168.1.100',
  verbose: true  // Enable debug output
});
```

### Check Connection Status

```javascript
console.log(plc.getState());      // 'connected', 'disconnected', etc.
console.log(plc.isConnected());   // true/false
console.log(plc.getStats());      // Full statistics
```

### Monitor Events

```javascript
plc.on('connected', () => console.log('✓ Connected'));
plc.on('disconnected', () => console.log('✗ Disconnected'));
plc.on('error', (err) => console.error('⚠️ Error:', err.message));
```

### Test Specific Address

```javascript
async function testAddress(address) {
  try {
    // Determine device type
    const device = address.match(/^([A-Z])/)[1];
    
    if ('DWL'.includes(device)) {
      // Word unit
      const data = await plc.readWordUnits(address, 1);
      console.log(`${address} = ${data.readUInt16LE(0)}`);
    } else {
      // Bit unit
      const bits = await plc.readBitUnits(address, 1);
      console.log(`${address} = ${bits[0]}`);
    }
  } catch (error) {
    console.error(`Error reading ${address}:`, error.message);
  }
}

testAddress('D100');  // Test register
testAddress('Y0');    // Test output
testAddress('M50');   // Test relay
```

---

## 🚀 Quick Start Template

```javascript
const SlmpDriver = require('./slmp-driver');

async function main() {
  const plc = new SlmpDriver({
    host: '192.168.1.100',
    port: 5007,
    timeout: 10000,
    verbose: false
  });

  try {
    // Connect
    await plc.connect();
    console.log('✓ Connected');

    // Read
    const data = await plc.readWordUnits('D0', 10);
    console.log('Data:', data);

    // Write
    await plc.writeWordUnits('D0', [100, 200, 300]);
    console.log('✓ Write complete');

    // Control
    await plc.writeBitUnits('Y0', [true]);
    console.log('✓ Output set');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    plc.disconnect();
  }
}

main();
```

---

## 📞 Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 0x0100 | Function code error | Check command code |
| 0x0103 | Invalid address | Verify address format (D0, M50, etc.) |
| 0x0104 | PLC is busy | Reduce polling frequency |
| 0x0105 | Program edit mode | Stop editing, restart PLC |
| 0x0106 | Password protected | Check PLC security settings |
| TIMEOUT | No response | Check network, PLC power, firewall |
| ECONNREFUSED | Cannot connect | Verify IP, port 5007, network |

---

## 📚 Reference Links

- **Full Guide**: `FX5_IMPLEMENTATION_GUIDE.md`
- **Examples**: `slmp-usage-examples.js`
- **Protocol Spec**: `SLMP_DRIVER.md`
- **API Docs**: `README.md`

---

**Quick Reference v1.0**  
Last Updated: 2025-02-07  
For detailed information, see full documentation.
