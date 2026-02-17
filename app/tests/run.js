#!/usr/bin/env node
/**
 * WantokJobs API Test Runner
 * Usage: node tests/run.js
 * No external dependencies required.
 */
const { setupTestServer, teardown } = require('./helpers');

const testSuites = [
  { name: 'Auth', fn: require('./auth.test.js') },
  { name: 'Jobs', fn: require('./jobs.test.js') },
  { name: 'Applications', fn: require('./applications.test.js') },
  { name: 'Profiles', fn: require('./profiles.test.js') },
  { name: 'Admin', fn: require('./admin.test.js') },
  { name: 'Security', fn: require('./security.test.js') },
  { name: 'Categories', fn: require('./categories.test.js') },
  { name: 'Notifications', fn: require('./notifications.test.js') },
  { name: 'Newsletter', fn: require('./newsletter.test.js') },
  { name: 'Chat', fn: require('./chat.test.js') },
  { name: 'Stats', fn: require('./stats.test.js') },
  { name: 'SavedJobs', fn: require('./saved-jobs.test.js') },
  { name: 'Companies', fn: require('./companies.test.js') },
  { name: 'EmployerAnalytics', fn: require('./employer-analytics.test.js') },
  { name: 'JobAlerts', fn: require('./job-alerts.test.js') },
  { name: 'Reviews', fn: require('./reviews.test.js') },
  { name: 'Performance', fn: require('./performance.test.js') },
  { name: 'EdgeCases', fn: require('./edge-cases.test.js') },
];

async function main() {
  console.log('🚀 WantokJobs API Test Suite\n');
  console.log('Setting up test server...');

  let totalPassed = 0;
  let totalFailed = 0;
  let allErrors = [];

  try {
    const { port } = await setupTestServer();
    console.log(`✅ Test server running on port ${port}\n`);

    for (const suite of testSuites) {
      try {
        const results = await suite.fn();
        totalPassed += results.passed;
        totalFailed += results.failed;
        allErrors.push(...results.errors.map(e => ({ suite: suite.name, ...e })));
      } catch (err) {
        console.error(`\n💥 Suite "${suite.name}" crashed: ${err.message}`);
        totalFailed++;
        allErrors.push({ suite: suite.name, test: 'SUITE_CRASH', error: err.message });
      }
    }
  } catch (err) {
    console.error(`\n💥 Setup failed: ${err.message}`);
    process.exit(1);
  } finally {
    console.log('\nTearing down...');
    await teardown();
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`📊 RESULTS: ${totalPassed} passed, ${totalFailed} failed, ${totalPassed + totalFailed} total`);
  
  if (allErrors.length > 0) {
    console.log('\n❌ Failures:');
    for (const err of allErrors) {
      console.log(`  [${err.suite}] ${err.test}: ${err.error}`);
    }
  }

  console.log('='.repeat(60));
  process.exit(totalFailed > 0 ? 1 : 0);
}

main();
