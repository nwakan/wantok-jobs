#!/usr/bin/env node
/**
 * Database Cleanup Script: Remove literal \r\n characters
 * 
 * This script removes literal newline and carriage return characters
 * from text fields in the WantokJobs database.
 * 
 * SAFETY: Creates backup before any modifications
 * 
 * Usage: node scripts/cleanup-newline-characters.js
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/wantokjobs.db');
const BACKUP_PATH = `${DB_PATH}.backup_${new Date().toISOString().replace(/[:.]/g, '-')}`;

console.log('\n🔧 WantokJobs Database Cleanup - Remove Literal Newline Characters\n');
console.log('=' .repeat(70));

// Check if database exists
if (!fs.existsSync(DB_PATH)) {
  console.error('❌ Error: Database not found at', DB_PATH);
  process.exit(1);
}

// Create backup
console.log('\n📦 Creating backup...');
try {
  fs.copyFileSync(DB_PATH, BACKUP_PATH);
  const stats = fs.statSync(BACKUP_PATH);
  console.log(`✅ Backup created: ${BACKUP_PATH}`);
  console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
} catch (error) {
  console.error('❌ Failed to create backup:', error.message);
  process.exit(1);
}

// Open database
const db = new Database(DB_PATH);

console.log('\n🔍 Analyzing database for literal newline characters...\n');

const results = {
  profiles_employer: { fields: [], total: 0 },
  jobs: { fields: [], total: 0 }
};

// Check profiles_employer table
const employerFields = ['industry', 'description', 'bio', 'about', 'tagline', 'company_name'];

employerFields.forEach(field => {
  try {
    // Check if field exists
    const checkField = db.prepare(`SELECT COUNT(*) as count FROM pragma_table_info('profiles_employer') WHERE name = ?`).get(field);
    
    if (checkField.count === 0) {
      console.log(`⚠️  Field profiles_employer.${field} does not exist, skipping...`);
      return;
    }
    
    const count = db.prepare(
      `SELECT COUNT(*) as count FROM profiles_employer 
       WHERE ${field} LIKE '%\\r\\n%' OR ${field} LIKE '%\\n%' OR ${field} LIKE '%\\r%'`
    ).get().count;
    
    if (count > 0) {
      results.profiles_employer.fields.push({ field, count });
      results.profiles_employer.total += count;
      console.log(`   profiles_employer.${field}: ${count} records affected`);
    }
  } catch (error) {
    console.log(`⚠️  Error checking profiles_employer.${field}:`, error.message);
  }
});

// Check jobs table
const jobFields = ['title', 'description', 'requirements', 'company_name'];

jobFields.forEach(field => {
  try {
    const checkField = db.prepare(`SELECT COUNT(*) as count FROM pragma_table_info('jobs') WHERE name = ?`).get(field);
    
    if (checkField.count === 0) {
      console.log(`⚠️  Field jobs.${field} does not exist, skipping...`);
      return;
    }
    
    const count = db.prepare(
      `SELECT COUNT(*) as count FROM jobs 
       WHERE ${field} LIKE '%\\r\\n%' OR ${field} LIKE '%\\n%' OR ${field} LIKE '%\\r%'`
    ).get().count;
    
    if (count > 0) {
      results.jobs.fields.push({ field, count });
      results.jobs.total += count;
      console.log(`   jobs.${field}: ${count} records affected`);
    }
  } catch (error) {
    console.log(`⚠️  Error checking jobs.${field}:`, error.message);
  }
});

console.log('\n' + '='.repeat(70));

const totalAffected = results.profiles_employer.total + results.jobs.total;

if (totalAffected === 0) {
  console.log('\n✅ No records found with literal newline characters.');
  console.log('   Database is clean!');
  db.close();
  process.exit(0);
}

console.log(`\n⚠️  Found ${totalAffected} records with literal newline characters.`);
console.log('\n🔧 Cleaning database...\n');

let cleanedCount = 0;

// Clean profiles_employer
results.profiles_employer.fields.forEach(({ field }) => {
  try {
    const stmt = db.prepare(
      `UPDATE profiles_employer 
       SET ${field} = REPLACE(REPLACE(REPLACE(${field}, '\\r\\n', ''), '\\n', ''), '\\r', '')
       WHERE ${field} LIKE '%\\r\\n%' OR ${field} LIKE '%\\n%' OR ${field} LIKE '%\\r%'`
    );
    const info = stmt.run();
    cleanedCount += info.changes;
    console.log(`✅ Cleaned profiles_employer.${field}: ${info.changes} records updated`);
  } catch (error) {
    console.error(`❌ Error cleaning profiles_employer.${field}:`, error.message);
  }
});

// Clean jobs
results.jobs.fields.forEach(({ field }) => {
  try {
    const stmt = db.prepare(
      `UPDATE jobs 
       SET ${field} = REPLACE(REPLACE(REPLACE(${field}, '\\r\\n', ''), '\\n', ''), '\\r', '')
       WHERE ${field} LIKE '%\\r\\n%' OR ${field} LIKE '%\\n%' OR ${field} LIKE '%\\r%'`
    );
    const info = stmt.run();
    cleanedCount += info.changes;
    console.log(`✅ Cleaned jobs.${field}: ${info.changes} records updated`);
  } catch (error) {
    console.error(`❌ Error cleaning jobs.${field}:`, error.message);
  }
});

console.log('\n' + '='.repeat(70));

// Verify cleanup
console.log('\n🔍 Verifying cleanup...\n');

let remainingIssues = 0;

[...employerFields].forEach(field => {
  try {
    const count = db.prepare(
      `SELECT COUNT(*) as count FROM profiles_employer 
       WHERE ${field} LIKE '%\\r\\n%' OR ${field} LIKE '%\\n%' OR ${field} LIKE '%\\r%'`
    ).get();
    
    if (count.count > 0) {
      remainingIssues += count.count;
      console.log(`⚠️  profiles_employer.${field}: ${count.count} issues remain`);
    }
  } catch (error) {
    // Field doesn't exist, skip
  }
});

[...jobFields].forEach(field => {
  try {
    const count = db.prepare(
      `SELECT COUNT(*) as count FROM jobs 
       WHERE ${field} LIKE '%\\r\\n%' OR ${field} LIKE '%\\n%' OR ${field} LIKE '%\\r%'`
    ).get();
    
    if (count.count > 0) {
      remainingIssues += count.count;
      console.log(`⚠️  jobs.${field}: ${count.count} issues remain`);
    }
  } catch (error) {
    // Field doesn't exist, skip
  }
});

db.close();

console.log('\n' + '='.repeat(70));

if (remainingIssues === 0) {
  console.log('\n✅ SUCCESS: All literal newline characters removed!');
  console.log(`   ${cleanedCount} records cleaned`);
  console.log(`\n📦 Backup available at: ${BACKUP_PATH}`);
  console.log('\n🚀 Database is now ready for production use.');
} else {
  console.log(`\n⚠️  WARNING: ${remainingIssues} issues remain after cleanup`);
  console.log('   Manual inspection may be required.');
  console.log(`\n📦 Backup available at: ${BACKUP_PATH}`);
}

console.log('\n' + '='.repeat(70) + '\n');
