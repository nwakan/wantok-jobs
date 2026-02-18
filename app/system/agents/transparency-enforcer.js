#!/usr/bin/env node
/**
 * Transparency Enforcer Agent
 * 
 * Enforces transparency requirements:
 * 1. Creates blank transparency records for jobs from required employers
 * 2. Flags non-compliance (missing salary, criteria, outcomes)
 * 3. Sends reminders to employers
 * 4. Tracks compliance status
 * 
 * Run daily via cron or on-demand
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../server/data/wantokjobs.db');
const db = new Database(dbPath);

// Create transparency_flags table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS transparency_flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    employer_id INTEGER NOT NULL,
    flag_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'warning',
    message TEXT NOT NULL,
    resolved INTEGER NOT NULL DEFAULT 0,
    resolved_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (job_id) REFERENCES jobs(id),
    FOREIGN KEY (employer_id) REFERENCES users(id)
  );
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_transparency_flags_job ON transparency_flags(job_id);
  CREATE INDEX IF NOT EXISTS idx_transparency_flags_employer ON transparency_flags(employer_id);
  CREATE INDEX IF NOT EXISTS idx_transparency_flags_resolved ON transparency_flags(resolved);
`);

console.log('\n=== TRANSPARENCY ENFORCER ===\n');

const now = new Date();
const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

// Step 1: Find all active jobs from transparency-required employers
console.log('1. Finding jobs from transparency-required employers...');
const jobsNeedingTransparency = db.prepare(`
  SELECT 
    j.id,
    j.title,
    j.employer_id,
    j.status,
    j.created_at,
    pe.company_name,
    pe.employer_type,
    ht.job_id as has_transparency
  FROM jobs j
  JOIN profiles_employer pe ON j.employer_id = pe.user_id
  LEFT JOIN hiring_transparency ht ON j.id = ht.job_id
  WHERE pe.transparency_required = 1
    AND j.status IN ('active', 'closed', 'filled')
  ORDER BY j.created_at DESC
`).all();

console.log(`   Found ${jobsNeedingTransparency.length} jobs from required employers`);

// Step 2: Create blank transparency records for jobs without one
let recordsCreated = 0;
let flagsCreated = 0;

for (const job of jobsNeedingTransparency) {
  if (!job.has_transparency) {
    // Create blank transparency record
    db.prepare(`
      INSERT INTO hiring_transparency (
        job_id,
        created_at,
        updated_at
      ) VALUES (?, datetime('now'), datetime('now'))
    `).run(job.id);
    
    recordsCreated++;
    console.log(`   ✓ Created blank transparency record for Job #${job.id}: ${job.title}`);
  }
}

console.log(`\n2. Created ${recordsCreated} blank transparency records`);

// Step 3: Check for missing data and create flags
console.log('\n3. Checking for compliance violations...');

// Get all transparency records with job info
const transparencyRecords = db.prepare(`
  SELECT 
    j.id as job_id,
    j.title,
    j.employer_id,
    j.status,
    j.created_at,
    pe.company_name,
    pe.employer_type,
    ht.salary_band_min,
    ht.salary_band_max,
    ht.selection_criteria,
    ht.outcome_published,
    ht.created_at as transparency_created
  FROM jobs j
  JOIN profiles_employer pe ON j.employer_id = pe.user_id
  JOIN hiring_transparency ht ON j.id = ht.job_id
  WHERE pe.transparency_required = 1
    AND j.status IN ('active', 'closed', 'filled')
`).all();

for (const record of transparencyRecords) {
  const jobCreated = new Date(record.created_at);
  const isOlderThan48h = jobCreated < twoDaysAgo;
  const isOlderThan7d = jobCreated < sevenDaysAgo;
  const isGovt = record.employer_type === 'government';
  
  // Check for existing unresolved flags for this job
  const existingFlags = db.prepare(`
    SELECT flag_type FROM transparency_flags
    WHERE job_id = ? AND resolved = 0
  `).all(record.job_id);
  
  const existingFlagTypes = existingFlags.map(f => f.flag_type);
  
  // Flag 1: Missing salary range (48h for all, 7d critical for govt)
  if (!record.salary_band_min || !record.salary_band_max) {
    if (isOlderThan48h && !existingFlagTypes.includes('no_salary')) {
      const severity = (isGovt && isOlderThan7d) ? 'critical' : 'warning';
      db.prepare(`
        INSERT INTO transparency_flags (
          job_id, employer_id, flag_type, severity, message
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        record.job_id,
        record.employer_id,
        'no_salary',
        severity,
        `Job posted ${Math.floor((now - jobCreated) / (1000 * 60 * 60 * 24))} days ago without salary range disclosed`
      );
      flagsCreated++;
      console.log(`   🚩 ${severity.toUpperCase()}: ${record.company_name} - Job #${record.job_id} missing salary`);
    }
  }
  
  // Flag 2: Missing selection criteria (48h)
  if (!record.selection_criteria) {
    if (isOlderThan48h && !existingFlagTypes.includes('no_criteria')) {
      db.prepare(`
        INSERT INTO transparency_flags (
          job_id, employer_id, flag_type, severity, message
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        record.job_id,
        record.employer_id,
        'no_criteria',
        'warning',
        `Job posted without selection criteria - jobseekers don't know what you're looking for`
      );
      flagsCreated++;
      console.log(`   🚩 WARNING: ${record.company_name} - Job #${record.job_id} missing criteria`);
    }
  }
  
  // Flag 3: Job closed/filled without outcome published
  if ((record.status === 'closed' || record.status === 'filled') && !record.outcome_published) {
    if (!existingFlagTypes.includes('no_outcome')) {
      db.prepare(`
        INSERT INTO transparency_flags (
          job_id, employer_id, flag_type, severity, message
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        record.job_id,
        record.employer_id,
        'no_outcome',
        'warning',
        'Job closed without publishing hiring outcome - complete transparency requires outcome disclosure'
      );
      flagsCreated++;
      console.log(`   🚩 WARNING: ${record.company_name} - Job #${record.job_id} closed without outcome`);
    }
  }
  
  // Flag 4: Check for excessive re-advertisements
  const readCount = db.prepare(`
    SELECT COUNT(*) as count
    FROM hiring_transparency
    WHERE job_id = ? AND readvertised = 1
  `).get(record.job_id);
  
  if (readCount && readCount.count > 2 && !existingFlagTypes.includes('excessive_readvertising')) {
    db.prepare(`
      INSERT INTO transparency_flags (
        job_id, employer_id, flag_type, severity, message
      ) VALUES (?, ?, ?, ?, ?)
    `).run(
      record.job_id,
      record.employer_id,
      'excessive_readvertising',
      'info',
      `Job re-advertised ${readCount.count} times - consider reviewing selection process`
    );
    flagsCreated++;
    console.log(`   🚩 INFO: ${record.company_name} - Job #${record.job_id} readvertised ${readCount.count} times`);
  }
}

console.log(`\n   Created ${flagsCreated} new compliance flags`);

// Step 4: Summary of current flags
console.log('\n4. Current compliance status:');

const flagSummary = db.prepare(`
  SELECT 
    flag_type,
    severity,
    COUNT(*) as count
  FROM transparency_flags
  WHERE resolved = 0
  GROUP BY flag_type, severity
  ORDER BY 
    CASE severity 
      WHEN 'critical' THEN 1 
      WHEN 'warning' THEN 2 
      ELSE 3 
    END,
    flag_type
`).all();

console.table(flagSummary);

// Step 5: Top violators
console.log('\n5. Employers with most unresolved flags:');
const topViolators = db.prepare(`
  SELECT 
    pe.company_name,
    pe.employer_type,
    COUNT(tf.id) as flag_count,
    SUM(CASE WHEN tf.severity = 'critical' THEN 1 ELSE 0 END) as critical_count,
    SUM(CASE WHEN tf.severity = 'warning' THEN 1 ELSE 0 END) as warning_count
  FROM transparency_flags tf
  JOIN profiles_employer pe ON tf.employer_id = pe.user_id
  WHERE tf.resolved = 0
  GROUP BY tf.employer_id
  ORDER BY critical_count DESC, flag_count DESC
  LIMIT 10
`).all();

console.table(topViolators);

// Step 6: Create notifications for employers (store for later delivery)
console.log('\n6. Creating employer notifications...');

// Ensure notifications table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS transparency_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employer_id INTEGER NOT NULL,
    notification_type TEXT NOT NULL,
    message TEXT NOT NULL,
    sent INTEGER NOT NULL DEFAULT 0,
    sent_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (employer_id) REFERENCES users(id)
  );
`);

// For each employer with unresolved flags, create a reminder notification
const employersWithFlags = db.prepare(`
  SELECT DISTINCT
    tf.employer_id,
    pe.company_name,
    COUNT(tf.id) as flag_count,
    GROUP_CONCAT(DISTINCT tf.flag_type) as flag_types
  FROM transparency_flags tf
  JOIN profiles_employer pe ON tf.employer_id = pe.user_id
  WHERE tf.resolved = 0
  GROUP BY tf.employer_id
`).all();

let notificationsCreated = 0;
for (const employer of employersWithFlags) {
  // Check if we already sent a notification in the last 24 hours
  const recentNotification = db.prepare(`
    SELECT id FROM transparency_notifications
    WHERE employer_id = ?
      AND created_at > datetime('now', '-1 day')
  `).get(employer.employer_id);
  
  if (!recentNotification) {
    const flagTypes = employer.flag_types.split(',');
    let message = `Hi ${employer.company_name},\n\n`;
    message += `You have ${employer.flag_count} outstanding transparency compliance issue(s):\n\n`;
    
    if (flagTypes.includes('no_salary')) {
      message += `• Missing salary range disclosure\n`;
    }
    if (flagTypes.includes('no_criteria')) {
      message += `• Selection criteria not specified\n`;
    }
    if (flagTypes.includes('no_outcome')) {
      message += `• Hiring outcome not published for closed positions\n`;
    }
    
    message += `\nPlease log in to WantokJobs to update your job postings and maintain transparency compliance.\n`;
    message += `\nTransparency helps jobseekers and improves PNG's hiring standards.`;
    
    db.prepare(`
      INSERT INTO transparency_notifications (
        employer_id, notification_type, message
      ) VALUES (?, ?, ?)
    `).run(employer.employer_id, 'compliance_reminder', message);
    
    notificationsCreated++;
  }
}

console.log(`   Created ${notificationsCreated} notification(s)`);

// Final stats
console.log('\n=== SUMMARY ===');
console.log(`• Blank transparency records created: ${recordsCreated}`);
console.log(`• New compliance flags raised: ${flagsCreated}`);
console.log(`• Employer notifications queued: ${notificationsCreated}`);
console.log(`• Total unresolved flags: ${db.prepare('SELECT COUNT(*) as count FROM transparency_flags WHERE resolved = 0').get().count}`);

db.close();
console.log('\n✅ Enforcement complete!\n');
