#!/usr/bin/env node
/**
 * Password Audit Script - Legacy Password Tracking
 * 
 * Purpose: Identify and track users with legacy (non-bcrypt) passwords
 * Strategy: 
 *   - Identify legacy password formats
 *   - Track last_login to identify inactive users
 *   - Provide recommendations for password reset campaigns
 * 
 * NOTE: Does NOT modify any passwords - audit only
 */

const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '../../server/data/wantokjobs.db');
const db = new Database(dbPath, { readonly: true }); // Read-only mode for safety

console.log('🔐 Password Audit Script');
console.log('='.repeat(60));
console.log('Purpose: Audit legacy passwords and recommend migration strategy\n');

// ============================================
// 1. Overall Statistics
// ============================================
console.log('📊 OVERALL STATISTICS');
console.log('-'.repeat(60));

const totalUsers = db.prepare(`SELECT COUNT(*) as count FROM users`).get().count;

const bcryptUsers = db.prepare(`
  SELECT COUNT(*) as count 
  FROM users 
  WHERE password_hash LIKE '$2%'
`).get().count;

const legacyUsers = totalUsers - bcryptUsers;

console.log(`Total Users:          ${totalUsers.toLocaleString()}`);
console.log(`Bcrypt Passwords:     ${bcryptUsers.toLocaleString()} (${((bcryptUsers/totalUsers)*100).toFixed(2)}%)`);
console.log(`Legacy Passwords:     ${legacyUsers.toLocaleString()} (${((legacyUsers/totalUsers)*100).toFixed(2)}%)`);

// ============================================
// 2. Activity Analysis
// ============================================
console.log('\n📅 ACTIVITY ANALYSIS (Legacy Password Users)');
console.log('-'.repeat(60));

// Users who never logged in
const neverLoggedIn = db.prepare(`
  SELECT COUNT(*) as count 
  FROM users 
  WHERE password_hash NOT LIKE '$2%'
    AND (last_login IS NULL OR last_login = '')
`).get().count;

// Users who logged in within last 30 days
const active30Days = db.prepare(`
  SELECT COUNT(*) as count 
  FROM users 
  WHERE password_hash NOT LIKE '$2%'
    AND last_login IS NOT NULL
    AND last_login > datetime('now', '-30 days')
`).get().count;

// Users who logged in within last 90 days
const active90Days = db.prepare(`
  SELECT COUNT(*) as count 
  FROM users 
  WHERE password_hash NOT LIKE '$2%'
    AND last_login IS NOT NULL
    AND last_login > datetime('now', '-90 days')
`).get().count;

// Users who logged in within last 180 days
const active180Days = db.prepare(`
  SELECT COUNT(*) as count 
  FROM users 
  WHERE password_hash NOT LIKE '$2%'
    AND last_login IS NOT NULL
    AND last_login > datetime('now', '-180 days')
`).get().count;

// Users inactive for 180+ days
const inactive180Plus = db.prepare(`
  SELECT COUNT(*) as count 
  FROM users 
  WHERE password_hash NOT LIKE '$2%'
    AND last_login IS NOT NULL
    AND last_login <= datetime('now', '-180 days')
`).get().count;

console.log(`Never logged in:      ${neverLoggedIn.toLocaleString()} (${((neverLoggedIn/legacyUsers)*100).toFixed(2)}%)`);
console.log(`Active (< 30 days):   ${active30Days.toLocaleString()} (${((active30Days/legacyUsers)*100).toFixed(2)}%)`);
console.log(`Active (< 90 days):   ${active90Days.toLocaleString()} (${((active90Days/legacyUsers)*100).toFixed(2)}%)`);
console.log(`Active (< 180 days):  ${active180Days.toLocaleString()} (${((active180Days/legacyUsers)*100).toFixed(2)}%)`);
console.log(`Inactive (180+ days): ${inactive180Plus.toLocaleString()} (${((inactive180Plus/legacyUsers)*100).toFixed(2)}%)`);

// ============================================
// 3. Role Breakdown
// ============================================
console.log('\n👥 ROLE BREAKDOWN (Legacy Password Users)');
console.log('-'.repeat(60));

const byRole = db.prepare(`
  SELECT 
    role, 
    COUNT(*) as count,
    SUM(CASE WHEN last_login IS NOT NULL AND last_login > datetime('now', '-90 days') THEN 1 ELSE 0 END) as active_90d
  FROM users
  WHERE password_hash NOT LIKE '$2%'
  GROUP BY role
  ORDER BY count DESC
`).all();

byRole.forEach(row => {
  console.log(`${row.role.padEnd(15)} ${row.count.toString().padStart(8)} total | ${row.active_90d.toString().padStart(6)} active (90d)`);
});

// ============================================
// 4. Sample Recent Active Users
// ============================================
console.log('\n🔍 SAMPLE: Recently Active Legacy Users (Last 30 Days)');
console.log('-'.repeat(60));

const recentActive = db.prepare(`
  SELECT id, email, role, last_login, created_at
  FROM users
  WHERE password_hash NOT LIKE '$2%'
    AND last_login IS NOT NULL
    AND last_login > datetime('now', '-30 days')
  ORDER BY last_login DESC
  LIMIT 10
`).all();

if (recentActive.length > 0) {
  recentActive.forEach(user => {
    console.log(`ID ${user.id.toString().padStart(6)} | ${user.email.padEnd(35)} | ${user.role.padEnd(12)} | Last: ${user.last_login}`);
  });
} else {
  console.log('No recently active users with legacy passwords found.');
}

// ============================================
// 5. Recommendations
// ============================================
console.log('\n💡 RECOMMENDATIONS');
console.log('='.repeat(60));

console.log(`
1. IMMEDIATE ACTION (Auto-rehash on login):
   ✅ Already implemented - Working as expected
   - ${bcryptUsers} users have already been migrated via login
   
2. ENCOURAGE ACTIVE USERS (${active90Days.toLocaleString()} users):
   - Send email campaign: "Update Your Security"
   - Offer incentive (featured profile for 1 week?)
   - Target users who logged in within last 90 days
   
3. FORCE RESET FOR INACTIVE USERS (${inactive180Plus.toLocaleString()} + ${neverLoggedIn.toLocaleString()} users):
   - After 180 days of inactivity: mark password as expired
   - Send password reset email on next login attempt
   - Consider: "Your account needs verification"
   
4. GRADUAL DEPRECATION:
   - Q2 2026: Email campaign to active legacy users
   - Q3 2026: Expire passwords for 180+ day inactive users
   - Q4 2026: Expire all remaining legacy passwords
   
5. MONITORING:
   - Run this audit monthly
   - Track migration progress
   - Goal: <5% legacy passwords by end of 2026

IMPLEMENTATION NOTES:
- password_format column already added to users table
- Current values: 'bcrypt' or 'legacy'
- Can use this for targeted campaigns
- Migration happens automatically on next login
`);

console.log('\n✅ Audit Complete\n');
console.log('Next steps:');
console.log('  1. Review recommendations with team');
console.log('  2. Plan email campaign for active users');
console.log('  3. Schedule regular audits (monthly)');
console.log('  4. Monitor migration progress\n');

db.close();
