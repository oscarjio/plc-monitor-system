/**
 * Test Scheduler Service
 * Quick test script to verify cron scheduling works
 */

const schedulerService = require('./src/services/schedulerService');
const PLCService = require('./src/services/plcService');
const DataAcquisitionService = require('./src/services/dataAcquisitionService');

console.log('🧪 Testing Scheduler Service\n');

// Initialize services
const plcService = new PLCService();
const dataAcquisitionService = new DataAcquisitionService(plcService);

schedulerService.initialize({
  dataAcquisition: dataAcquisitionService
});

console.log('✓ Services initialized');

// Get initial status
console.log('\n📊 Initial Status:');
console.log(schedulerService.getStatus());

// Start scheduler
console.log('\n🚀 Starting scheduler...');
schedulerService.startAll();

// Get status after start
console.log('\n📊 Status after start:');
const status = schedulerService.getStatus();
console.log(`Total jobs: ${status.totalJobs}`);
console.log('Jobs:', Object.keys(status.jobs));

// Test manual trigger
console.log('\n🔧 Testing manual trigger of health check...');
schedulerService.triggerJob('healthCheck')
  .then(() => {
    console.log('✓ Manual trigger successful');
    
    // Wait 5 seconds then show health status
    setTimeout(() => {
      console.log('\n🏥 Health Status:');
      const health = dataAcquisitionService.getHealthStatus();
      console.log(JSON.stringify(health, null, 2));
      
      // Stop scheduler
      console.log('\n🛑 Stopping scheduler...');
      schedulerService.stopAll();
      
      console.log('✅ Test completed successfully\n');
      process.exit(0);
    }, 5000);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });

// Keep process alive
setTimeout(() => {}, 10000);
