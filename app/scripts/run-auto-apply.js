#!/usr/bin/env node
/**
 * Run Jean auto-apply automation
 * Intended for cron: e.g. 0 */2 * * * cd /path/to/app && node scripts/run-auto-apply.js
 */
const db = require('../server/database');
const { runAutoApply } = require('../server/utils/jean/automations');

console.log(`[${new Date().toISOString()}] Running auto-apply...`);

try {
  const results = runAutoApply(db);
  console.log('Results:', JSON.stringify(results, null, 2));
  if (results.applied > 0) {
    console.log(`✓ Applied to ${results.applied} jobs for ${results.processed} rules.`);
  } else if (results.skipped) {
    console.log('⏭ Auto-apply is disabled by admin.');
  } else {
    console.log('No new applications this run.');
  }
} catch (err) {
  console.error('Auto-apply error:', err);
  process.exit(1);
}

process.exit(0);
