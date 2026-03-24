#!/usr/bin/env node
/**
 * Daily Verification Sweep
 * Runs automated verification checks on all jobs and employers
 * Scheduled via cron: daily at 2 AM
 */

const VerifierAgent = require('./verifier-agent');
const FraudDetectorAgent = require('./fraud-detector-agent');
const db = require('../server/database');

(async () => {
  console.log(`[${new Date().toISOString()}] Starting daily verification sweep...`);
  
  const verifier = new VerifierAgent();
  const fraudDetector = new FraudDetectorAgent();
  
  try {
    // 1. Verify all active jobs posted in last 30 days
    const recentJobs = db.prepare(`
      SELECT id FROM jobs 
      WHERE status = 'active' 
      AND created_at > datetime('now', '-30 days')
      AND id NOT IN (
        SELECT entity_id FROM verification_checks 
        WHERE entity_type = 'job' 
        AND check_type = 'comprehensive'
      )
      LIMIT 50
    `).all();
    
    console.log(`Found ${recentJobs.length} unverified jobs`);
    
    for (const job of recentJobs) {
      try {
        await verifier.verifyJob(job.id);
        console.log(`✅ Verified job ${job.id}`);
      } catch (err) {
        console.error(`❌ Failed to verify job ${job.id}:`, err.message);
      }
    }
    
    // 2. Run fraud detection on employers with recent activity
    const activeEmployers = db.prepare(`
      SELECT DISTINCT employer_id FROM jobs 
      WHERE created_at > datetime('now', '-7 days')
      LIMIT 20
    `).all();
    
    console.log(`Checking ${activeEmployers.length} active employers for fraud`);
    
    for (const { employer_id } of activeEmployers) {
      try {
        await fraudDetector.detectFraud('employer', employer_id);
        console.log(`✅ Checked employer ${employer_id}`);
      } catch (err) {
        console.error(`❌ Failed to check employer ${employer_id}:`, err.message);
      }
    }
    
    // 3. Review flagged entities
    const flagged = db.prepare(`
      SELECT * FROM fraud_flags 
      WHERE resolved = 0 
      AND severity IN ('high', 'critical')
      ORDER BY created_at DESC
      LIMIT 10
    `).all();
    
    if (flagged.length > 0) {
      console.log(`⚠️  ${flagged.length} unresolved fraud flags requiring review`);
      flagged.forEach(flag => {
        console.log(`  - ${flag.entity_type} ${flag.entity_id}: ${flag.flag_type} (${flag.severity})`);
      });
    }
    
    console.log(`[${new Date().toISOString()}] Daily verification sweep complete`);
    
  } catch (err) {
    console.error('Fatal error in verification sweep:', err);
    process.exit(1);
  } finally {
    verifier.close();
    fraudDetector.close();
    db.close();
  }
  
  process.exit(0);
})();
