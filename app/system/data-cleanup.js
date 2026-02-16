#!/usr/bin/env node
/**
 * WantokJobs Data Cleanup & Admin Fixes
 * Date: 2026-02-17
 */

const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '../server/data/wantokjobs.db');
const db = new Database(dbPath);

const report = {
  timestamp: new Date().toISOString(),
  tasks: []
};

console.log('🔍 WantokJobs Data Cleanup Starting...\n');

// ============================================
// TASK 1: Fix Corrupted Admin Accounts
// ============================================
function task1_fixCorruptedAdmins() {
  console.log('📋 TASK 1: Fixing Corrupted Admin Accounts');
  console.log('=' .repeat(60));
  
  const taskReport = {
    name: 'Fix Corrupted Admin Accounts',
    actions: []
  };

  // First, check the corrupted admins
  const corruptedAdmins = db.prepare(`
    SELECT id, email, name, role, created_at 
    FROM users 
    WHERE id IN (30700, 30701, 30702)
  `).all();

  console.log('\n🔎 Corrupted admin accounts found:');
  corruptedAdmins.forEach(admin => {
    console.log(`  ID ${admin.id}: ${admin.email} | ${admin.name} | Role: ${admin.role}`);
  });

  taskReport.actions.push({
    action: 'Found corrupted admins',
    count: corruptedAdmins.length,
    details: corruptedAdmins
  });

  // Delete them
  const deleteResult = db.prepare(`
    DELETE FROM users 
    WHERE id IN (30700, 30701, 30702) AND role='admin'
  `).run();

  console.log(`\n✅ Deleted ${deleteResult.changes} corrupted admin account(s)`);
  taskReport.actions.push({
    action: 'Deleted corrupted admins',
    count: deleteResult.changes
  });

  // Check for other corrupted users (email without '@')
  const invalidEmails = db.prepare(`
    SELECT id, email, name, role 
    FROM users 
    WHERE email NOT LIKE '%@%'
    LIMIT 100
  `).all();

  console.log(`\n🔎 Found ${invalidEmails.length} users with invalid emails (no '@'):`);
  if (invalidEmails.length > 0) {
    console.log('  Sample (first 10):');
    invalidEmails.slice(0, 10).forEach(user => {
      console.log(`    ID ${user.id}: "${user.email}" | Role: ${user.role}`);
    });
  }

  taskReport.actions.push({
    action: 'Found users with invalid emails',
    count: invalidEmails.length,
    sample: invalidEmails.slice(0, 10)
  });

  // Verify legitimate admin
  const legitimateAdmin = db.prepare(`
    SELECT id, email, role 
    FROM users 
    WHERE id = 1
  `).get();

  console.log(`\n✓ Legitimate admin verified: ID ${legitimateAdmin.id} - ${legitimateAdmin.email}`);
  taskReport.actions.push({
    action: 'Verified legitimate admin',
    admin: legitimateAdmin
  });

  report.tasks.push(taskReport);
  console.log('\n' + '='.repeat(60) + '\n');
}

// ============================================
// TASK 2: Legacy Password Audit
// ============================================
function task2_passwordAudit() {
  console.log('📋 TASK 2: Legacy Password Audit');
  console.log('=' .repeat(60));

  const taskReport = {
    name: 'Legacy Password Audit',
    stats: {}
  };

  // Check if password_format column exists
  const columns = db.prepare(`PRAGMA table_info(users)`).all();
  const hasPasswordFormat = columns.some(col => col.name === 'password_format');

  console.log(`\n🔎 password_format column exists: ${hasPasswordFormat}`);

  // Count total users
  const totalUsers = db.prepare(`SELECT COUNT(*) as count FROM users`).get().count;
  
  // Bcrypt passwords start with $2a$, $2b$, or $2y$
  const bcryptUsers = db.prepare(`
    SELECT COUNT(*) as count 
    FROM users 
    WHERE password_hash LIKE '$2a$%' OR password_hash LIKE '$2b$%' OR password_hash LIKE '$2y$%'
  `).get().count;

  const legacyUsers = totalUsers - bcryptUsers;

  console.log(`\n📊 Password Statistics:`);
  console.log(`  Total users: ${totalUsers.toLocaleString()}`);
  console.log(`  Bcrypt passwords: ${bcryptUsers.toLocaleString()}`);
  console.log(`  Legacy passwords: ${legacyUsers.toLocaleString()}`);
  console.log(`  Legacy percentage: ${((legacyUsers/totalUsers)*100).toFixed(2)}%`);

  taskReport.stats = {
    totalUsers,
    bcryptUsers,
    legacyUsers,
    legacyPercentage: ((legacyUsers/totalUsers)*100).toFixed(2)
  };

  // Sample legacy passwords (first 5 characters only for security)
  const legacySample = db.prepare(`
    SELECT id, email, SUBSTR(password_hash, 1, 5) as pwd_prefix, last_login 
    FROM users 
    WHERE password_hash NOT LIKE '$2%'
    LIMIT 10
  `).all();

  console.log(`\n🔎 Sample legacy password formats (first 5 chars):`);
  legacySample.forEach(user => {
    console.log(`  ID ${user.id}: ${user.pwd_prefix}... | Last login: ${user.last_login || 'never'}`);
  });

  taskReport.stats.sampleLegacyFormats = legacySample;

  // Add password_format column if it doesn't exist
  if (!hasPasswordFormat) {
    console.log(`\n➕ Adding password_format column...`);
    db.prepare(`ALTER TABLE users ADD COLUMN password_format TEXT DEFAULT 'legacy'`).run();
    console.log(`✅ Column added`);
    taskReport.stats.columnAdded = true;

    // Update existing users
    console.log(`\n🔄 Updating password_format for existing users...`);
    const updateBcrypt = db.prepare(`
      UPDATE users 
      SET password_format = 'bcrypt' 
      WHERE password_hash LIKE '$2%'
    `).run();
    
    const updateLegacy = db.prepare(`
      UPDATE users 
      SET password_format = 'legacy' 
      WHERE password_hash NOT LIKE '$2%'
    `).run();

    console.log(`  ✅ Updated ${updateBcrypt.changes} bcrypt users`);
    console.log(`  ✅ Updated ${updateLegacy.changes} legacy users`);
    
    taskReport.stats.bcryptUpdated = updateBcrypt.changes;
    taskReport.stats.legacyUpdated = updateLegacy.changes;
  }

  report.tasks.push(taskReport);
  console.log('\n' + '='.repeat(60) + '\n');
}

// ============================================
// TASK 4: Clean Up Test/Garbage Data
// ============================================
function task4_cleanupTestData() {
  console.log('📋 TASK 4: Clean Up Test/Garbage Data');
  console.log('=' .repeat(60));

  const taskReport = {
    name: 'Clean Up Test Data',
    removals: []
  };

  // Check for test users
  const testUsers = db.prepare(`
    SELECT id, email, name, role 
    FROM users 
    WHERE email LIKE '%test%' 
       OR name LIKE '%test%'
       OR email LIKE '%dummy%'
       OR email LIKE '%fake%'
    LIMIT 50
  `).all();

  console.log(`\n🔎 Found ${testUsers.length} potential test users`);
  if (testUsers.length > 0) {
    console.log('  Sample:');
    testUsers.slice(0, 10).forEach(user => {
      console.log(`    ID ${user.id}: ${user.email} | ${user.name}`);
    });
  }

  taskReport.removals.push({
    type: 'test_users',
    count: testUsers.length,
    sample: testUsers.slice(0, 10)
  });

  // Check for test jobs
  const testJobs = db.prepare(`
    SELECT id, title, company_name 
    FROM jobs 
    WHERE title LIKE '%test%' 
       OR title LIKE '%dummy%'
       OR company_name LIKE '%test%'
    LIMIT 50
  `).all();

  console.log(`\n🔎 Found ${testJobs.length} potential test jobs`);
  if (testJobs.length > 0) {
    console.log('  Sample:');
    testJobs.slice(0, 10).forEach(job => {
      console.log(`    ID ${job.id}: ${job.title} at ${job.company_name}`);
    });
  }

  taskReport.removals.push({
    type: 'test_jobs',
    count: testJobs.length,
    sample: testJobs.slice(0, 10)
  });

  // Check for duplicate jobs (same title + company)
  const duplicateJobs = db.prepare(`
    SELECT title, company_name, COUNT(*) as count, GROUP_CONCAT(id) as ids
    FROM jobs
    WHERE company_name IS NOT NULL
    GROUP BY LOWER(TRIM(title)), LOWER(TRIM(company_name))
    HAVING count > 1
    ORDER BY count DESC
    LIMIT 20
  `).all();

  console.log(`\n🔎 Found ${duplicateJobs.length} sets of duplicate jobs`);
  if (duplicateJobs.length > 0) {
    console.log('  Top duplicates:');
    duplicateJobs.slice(0, 10).forEach(job => {
      console.log(`    "${job.title}" at "${job.company_name}": ${job.count} copies (IDs: ${job.ids})`);
    });
  }

  taskReport.removals.push({
    type: 'duplicate_jobs',
    count: duplicateJobs.length,
    sample: duplicateJobs.slice(0, 10)
  });

  // Check for test articles
  const testArticles = db.prepare(`
    SELECT id, title, author_id, status
    FROM articles 
    WHERE title LIKE '%test%' 
       OR title LIKE '%dummy%'
       OR content LIKE '%test content%'
    LIMIT 20
  `).all();

  console.log(`\n🔎 Found ${testArticles.length} potential test articles`);
  if (testArticles.length > 0) {
    testArticles.slice(0, 5).forEach(article => {
      console.log(`    ID ${article.id}: ${article.title}`);
    });
  }

  taskReport.removals.push({
    type: 'test_articles',
    count: testArticles.length,
    sample: testArticles.slice(0, 5)
  });

  // Check for test reviews
  const testReviews = db.prepare(`
    SELECT id, company_id, rating, title, pros, cons
    FROM company_reviews 
    WHERE title LIKE '%test%' 
       OR pros LIKE '%test%'
       OR cons LIKE '%test%'
       OR pros LIKE '%dummy%'
    LIMIT 20
  `).all();

  console.log(`\n🔎 Found ${testReviews.length} potential test reviews`);
  if (testReviews.length > 0) {
    testReviews.slice(0, 5).forEach(review => {
      console.log(`    ID ${review.id}: Company ${review.company_id} - ${review.title || review.pros?.substring(0, 50)}`);
    });
  }

  taskReport.removals.push({
    type: 'test_reviews',
    count: testReviews.length,
    sample: testReviews.slice(0, 5)
  });

  console.log(`\n⚠️  No automatic deletion performed - manual review recommended`);
  console.log(`    Use this report to decide what to clean up`);

  report.tasks.push(taskReport);
  console.log('\n' + '='.repeat(60) + '\n');
}

// ============================================
// Main Execution
// ============================================
try {
  task1_fixCorruptedAdmins();
  task2_passwordAudit();
  task4_cleanupTestData();

  console.log('✅ All tasks completed successfully!\n');
  
  // Save report as JSON for programmatic access
  const fs = require('fs');
  const reportPath = path.join(__dirname, '../cleanup-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 JSON report saved to: ${reportPath}\n`);

} catch (error) {
  console.error('❌ Error during cleanup:', error);
  process.exit(1);
} finally {
  db.close();
}
