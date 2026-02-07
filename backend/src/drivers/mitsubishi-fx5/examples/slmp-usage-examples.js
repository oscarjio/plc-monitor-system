/**
 * SLMP Driver Usage Examples
 * 
 * Complete examples demonstrating various SLMP operations
 * for Mitsubishi FX5 PLC communication.
 * 
 * @author PLC Code Development Agent
 * @version 1.0.0
 * @date 2025-02-07
 */

const SlmpDriver = require('../slmp-driver');

/**
 * Example 1: Basic Connection and Status Check
 */
async function example1_BasicConnection() {
  console.log('\n=== Example 1: Basic Connection ===');

  const plc = new SlmpDriver({
    host: '192.168.1.100',
    port: 5007,
    timeout: 10000
  });

  try {
    // Connect to PLC
    await plc.connect();
    console.log('✓ Connected to PLC');

    // Read PLC status
    const status = await plc.readStatus();
    console.log('PLC Status:', {
      runMode: status.runMode,
      errorCode: status.errorCode,
      cpuType: status.cpuType
    });

    // Get driver statistics
    const stats = plc.getStats();
    console.log('Driver Stats:', stats);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    plc.disconnect();
  }
}


/**
 * Example 2: Read Data Registers
 */
async function example2_ReadRegisters() {
  console.log('\n=== Example 2: Read Data Registers ===');

  const plc = new SlmpDriver({
    host: '192.168.1.100',
    port: 5007
  });

  try {
    await plc.connect();

    // Read single register D0
    const d0 = await plc.readWordUnits('D0', 1);
    console.log('D0 =', d0.readUInt16LE(0));

    // Read block of registers D100-D109 (10 words)
    const block = await plc.readWordUnits('D100', 10);
    console.log('D100-D109 =', Array.from(block).map((b, i) => 
      i % 2 === 0 ? block.readUInt16LE(i) : null
    ).filter(v => v !== null));

    // Read large block (up to 960 words in FX5)
    const largeBlock = await plc.readWordUnits('D1000', 256);
    console.log(`✓ Read 256 words from D1000-D1255 (${largeBlock.length} bytes)`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    plc.disconnect();
  }
}


/**
 * Example 3: Write Data Registers
 */
async function example3_WriteRegisters() {
  console.log('\n=== Example 3: Write Data Registers ===');

  const plc = new SlmpDriver({
    host: '192.168.1.100',
    port: 5007
  });

  try {
    await plc.connect();

    // Write single value to D0
    await plc.writeWordUnits('D0', [1000]);
    console.log('✓ Wrote 1000 to D0');

    // Write multiple values to D10-D12
    const values = [100, 200, 300];
    await plc.writeWordUnits('D10', values);
    console.log('✓ Wrote', values, 'to D10-D12');

    // Verify writes by reading back
    const readBack = await plc.readWordUnits('D0', 13);
    console.log('Verification:', {
      D0: readBack.readUInt16LE(0),
      D10: readBack.readUInt16LE(20),
      D11: readBack.readUInt16LE(22),
      D12: readBack.readUInt16LE(24)
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    plc.disconnect();
  }
}


/**
 * Example 4: Read/Write Bit Units
 */
async function example4_BitOperations() {
  console.log('\n=== Example 4: Bit Operations ===');

  const plc = new SlmpDriver({
    host: '192.168.1.100',
    port: 5007
  });

  try {
    await plc.connect();

    // Read bit units (e.g., M0-M15)
    const bits = await plc.readBitUnits('M0', 16);
    console.log('M0-M15 bits:', bits);

    // Write bit units
    const bitValues = [true, false, true, false, true, false, true, false];
    await plc.writeBitUnits('M0', bitValues);
    console.log('✓ Wrote 8 bits to M0-M7');

    // Read output bits Y0-Y15
    const outputBits = await plc.readBitUnits('Y0', 16);
    console.log('Y0-Y15 status:', outputBits);

    // Set specific input bits
    const inputBits = [true, true, false, false, true];
    await plc.writeBitUnits('X0', inputBits);
    console.log('✓ Set X0-X4 bits');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    plc.disconnect();
  }
}


/**
 * Example 5: Temperature Control Loop
 */
async function example5_TemperatureControl() {
  console.log('\n=== Example 5: Temperature Control Loop ===');

  const plc = new SlmpDriver({
    host: '192.168.1.100',
    port: 5007
  });

  try {
    await plc.connect();

    // Set temperature setpoint D100 = 2500 (25°C)
    await plc.writeWordUnits('D100', [2500]);
    console.log('✓ Set temperature setpoint to 25°C');

    // Control loop (simulate 10 cycles)
    for (let cycle = 0; cycle < 10; cycle++) {
      // Read actual temperature D1
      const tempRaw = await plc.readWordUnits('D1', 1);
      const tempValue = tempRaw.readUInt16LE(0);
      const tempCelsius = tempValue / 100;

      // Read heater status Y0
      const heaterBits = await plc.readBitUnits('Y0', 1);
      const heaterOn = heaterBits[0];

      console.log(`Cycle ${cycle + 1}: Temp=${tempCelsius}°C, Heater=${heaterOn ? 'ON' : 'OFF'}`);

      // Wait 100ms between reads
      await new Promise(resolve => setTimeout(resolve, 100));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    plc.disconnect();
  }
}


/**
 * Example 6: Random Read (Non-sequential Addresses)
 */
async function example6_RandomRead() {
  console.log('\n=== Example 6: Random Read ===');

  const plc = new SlmpDriver({
    host: '192.168.1.100',
    port: 5007
  });

  try {
    await plc.connect();

    // Read multiple non-sequential addresses
    const requests = [
      { address: 'D0', count: 1 },   // Temperature
      { address: 'D10', count: 2 },  // Setpoint + Mode
      { address: 'D100', count: 5 }  // Configuration
    ];

    const results = await plc.randomRead(requests);
    console.log('Random read results:', results);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    plc.disconnect();
  }
}


/**
 * Example 7: Continuous Monitoring
 */
async function example7_ContinuousMonitoring() {
  console.log('\n=== Example 7: Continuous Monitoring ===');

  const plc = new SlmpDriver({
    host: '192.168.1.100',
    port: 5007
  });

  const config = {
    pollInterval: 500,   // 500ms between polls
    duration: 5000,      // Run for 5 seconds
    moniteredAddresses: ['D0', 'D1', 'D100', 'D101']
  };

  try {
    await plc.connect();

    const startTime = Date.now();
    const pollInterval = setInterval(async () => {
      try {
        // Batch read all monitored addresses
        const data0 = await plc.readWordUnits('D0', 2);
        const data100 = await plc.readWordUnits('D100', 2);

        const elapsed = Date.now() - startTime;
        console.log(`[${elapsed}ms] D0=${data0.readUInt16LE(0)} D1=${data0.readUInt16LE(2)} D100=${data100.readUInt16LE(0)} D101=${data100.readUInt16LE(2)}`);

      } catch (error) {
        console.error('Poll error:', error.message);
      }

      // Stop after duration
      if (Date.now() - startTime > config.duration) {
        clearInterval(pollInterval);
        plc.disconnect();
        console.log('✓ Monitoring complete');
      }
    }, config.pollInterval);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}


/**
 * Example 8: Error Handling & Recovery
 */
async function example8_ErrorHandling() {
  console.log('\n=== Example 8: Error Handling & Recovery ===');

  const plc = new SlmpDriver({
    host: '192.168.1.100',
    port: 5007,
    timeout: 3000,
    maxRetries: 3
  });

  try {
    await plc.connect();

    // Attempt operation with retry logic
    const maxAttempts = 3;
    let success = false;

    for (let attempt = 1; attempt <= maxAttempts && !success; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxAttempts}...`);
        const data = await plc.readWordUnits('D0', 10);
        console.log('✓ Read successful');
        success = true;
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error.message);
        if (attempt < maxAttempts) {
          console.log('Retrying in 500ms...');
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          throw new Error('All attempts failed');
        }
      }
    }

  } catch (error) {
    console.error('❌ Final error:', error.message);
    // Fallback behavior
    console.log('→ Using cached data or entering safe mode');
  } finally {
    plc.disconnect();
  }
}


/**
 * Example 9: Event-Based Monitoring
 */
async function example9_EventMonitoring() {
  console.log('\n=== Example 9: Event-Based Monitoring ===');

  const plc = new SlmpDriver({
    host: '192.168.1.100',
    port: 5007
  });

  // Set up event listeners
  plc.on('connected', () => {
    console.log('📡 PLC connected');
  });

  plc.on('disconnected', () => {
    console.log('🔌 PLC disconnected');
  });

  plc.on('error', (error) => {
    console.error('⚠️  PLC error:', error.message);
  });

  try {
    await plc.connect();

    // Simulate some operations
    for (let i = 0; i < 3; i++) {
      const status = await plc.readStatus();
      console.log(`Read ${i + 1}: Status =`, status.runMode);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    plc.disconnect();
  }
}


/**
 * Example 10: Performance Testing
 */
async function example10_PerformanceTesting() {
  console.log('\n=== Example 10: Performance Testing ===');

  const plc = new SlmpDriver({
    host: '192.168.1.100',
    port: 5007
  });

  try {
    await plc.connect();

    // Test 1: Single read latency
    const start1 = Date.now();
    for (let i = 0; i < 100; i++) {
      await plc.readWordUnits('D0', 1);
    }
    const time1 = Date.now() - start1;
    console.log(`100 single reads: ${time1}ms (avg: ${(time1/100).toFixed(2)}ms/read)`);

    // Test 2: Batched read latency
    const start2 = Date.now();
    for (let i = 0; i < 10; i++) {
      await plc.readWordUnits('D0', 100);
    }
    const time2 = Date.now() - start2;
    console.log(`10 batch reads (100 words each): ${time2}ms (avg: ${(time2/10).toFixed(2)}ms/batch)`);

    // Test 3: Write performance
    const start3 = Date.now();
    const values = Array(50).fill(0).map((_, i) => i * 10);
    for (let i = 0; i < 10; i++) {
      await plc.writeWordUnits('D0', values);
    }
    const time3 = Date.now() - start3;
    console.log(`10 writes (50 values each): ${time3}ms (avg: ${(time3/10).toFixed(2)}ms/write)`);

    // Summary
    console.log('\nPerformance Summary:');
    console.log(`- Single read latency: ${(time1/100).toFixed(2)}ms`);
    console.log(`- Throughput (batched): ${((100 * 10) / (time2/1000)).toFixed(0)} words/sec`);
    console.log(`- Write throughput: ${((50 * 10) / (time3/1000)).toFixed(0)} words/sec`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    plc.disconnect();
  }
}


/**
 * Main: Run all examples
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  Mitsubishi FX5 SLMP Driver - Usage Examples       ║');
  console.log('╚════════════════════════════════════════════════════╝');

  const examples = [
    { name: 'Basic Connection', fn: example1_BasicConnection },
    { name: 'Read Registers', fn: example2_ReadRegisters },
    { name: 'Write Registers', fn: example3_WriteRegisters },
    { name: 'Bit Operations', fn: example4_BitOperations },
    { name: 'Temperature Control', fn: example5_TemperatureControl },
    { name: 'Random Read', fn: example6_RandomRead },
    { name: 'Continuous Monitoring', fn: example7_ContinuousMonitoring },
    { name: 'Error Handling', fn: example8_ErrorHandling },
    { name: 'Event Monitoring', fn: example9_EventMonitoring },
    { name: 'Performance Testing', fn: example10_PerformanceTesting }
  ];

  // Run selected example (modify index to run different example)
  const exampleIndex = process.argv[2] ? parseInt(process.argv[2]) - 1 : 0;
  
  if (exampleIndex >= 0 && exampleIndex < examples.length) {
    const example = examples[exampleIndex];
    console.log(`\nRunning: ${example.name}`);
    try {
      await example.fn();
    } catch (error) {
      console.error('Fatal error:', error);
    }
  } else {
    console.log('\nAvailable examples:');
    examples.forEach((ex, i) => {
      console.log(`  ${i + 1}. ${ex.name}`);
    });
    console.log('\nUsage: node slmp-usage-examples.js [1-10]');
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  example1_BasicConnection,
  example2_ReadRegisters,
  example3_WriteRegisters,
  example4_BitOperations,
  example5_TemperatureControl,
  example6_RandomRead,
  example7_ContinuousMonitoring,
  example8_ErrorHandling,
  example9_EventMonitoring,
  example10_PerformanceTesting
};
