#!/usr/bin/env node
/**
 * WantokJobs Database Backup Agent
 * 
 * Backs up the SQLite database to timestamped files
 * Retention: Keep last 7 daily + last 4 weekly backups
 * 
 * Usage:
 *   node system/agents/db-backup.js           # Run backup
 *   node system/agents/db-backup.js --clean   # Clean old backups only
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../server/data');
const DB_PATH = path.join(DATA_DIR, 'wantokjobs.db');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

const DAILY_BACKUPS_TO_KEEP = 7;
const WEEKLY_BACKUPS_TO_KEEP = 4;

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`✅ Created backup directory: ${BACKUP_DIR}`);
}

/**
 * Create a database backup
 */
function createBackup() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`❌ Database not found: ${DB_PATH}`);
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T');
  const date = timestamp[0];
  const time = timestamp[1].split('Z')[0];
  const backupFilename = `wantokjobs-${date}-${time}.db`;
  const backupPath = path.join(BACKUP_DIR, backupFilename);

  try {
    console.log(`📦 Creating backup: ${backupFilename}`);
    
    // Copy database file (SQLite safe copy)
    fs.copyFileSync(DB_PATH, backupPath);

    // Get file size
    const stats = fs.statSync(backupPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

    console.log(`✅ Backup created: ${backupFilename} (${sizeMB} MB)`);
    
    return backupPath;
  } catch (error) {
    console.error(`❌ Backup failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Clean old backups according to retention policy
 */
function cleanOldBackups() {
  try {
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('wantokjobs-') && file.endsWith('.db'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        timestamp: fs.statSync(path.join(BACKUP_DIR, file)).mtime,
      }))
      .sort((a, b) => b.timestamp - a.timestamp); // Newest first

    if (backups.length === 0) {
      console.log('📭 No backups found');
      return;
    }

    console.log(`📊 Found ${backups.length} backup(s)`);

    // Separate daily and weekly backups
    const now = new Date();
    const dailyBackups = [];
    const weeklyBackups = [];

    backups.forEach(backup => {
      const daysOld = Math.floor((now - backup.timestamp) / (1000 * 60 * 60 * 24));
      
      // If backup is on Sunday or Monday, consider it weekly
      const isWeekly = backup.timestamp.getDay() === 0 || backup.timestamp.getDay() === 1;
      
      if (daysOld < 7) {
        dailyBackups.push(backup);
      } else if (isWeekly) {
        weeklyBackups.push(backup);
      }
    });

    // Keep recent daily backups
    const dailyToKeep = dailyBackups.slice(0, DAILY_BACKUPS_TO_KEEP);
    const weeklyToKeep = weeklyBackups.slice(0, WEEKLY_BACKUPS_TO_KEEP);

    const toKeep = new Set([
      ...dailyToKeep.map(b => b.name),
      ...weeklyToKeep.map(b => b.name)
    ]);

    // Delete old backups
    let deletedCount = 0;
    backups.forEach(backup => {
      if (!toKeep.has(backup.name)) {
        console.log(`🗑️  Deleting old backup: ${backup.name}`);
        fs.unlinkSync(backup.path);
        deletedCount++;
      }
    });

    console.log(`✅ Cleanup complete: ${toKeep.size} kept, ${deletedCount} deleted`);
  } catch (error) {
    console.error(`❌ Cleanup failed: ${error.message}`);
  }
}

/**
 * List all backups
 */
function listBackups() {
  try {
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('wantokjobs-') && file.endsWith('.db'))
      .map(file => {
        const stats = fs.statSync(path.join(BACKUP_DIR, file));
        return {
          name: file,
          size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
          created: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created));

    if (backups.length === 0) {
      console.log('📭 No backups found');
      return;
    }

    console.log(`\n📊 Backups (${backups.length}):\n`);
    backups.forEach(b => {
      console.log(`  ${b.name}`);
      console.log(`    Size: ${b.size} | Created: ${new Date(b.created).toLocaleString()}\n`);
    });
  } catch (error) {
    console.error(`❌ List failed: ${error.message}`);
  }
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);

  console.log('🔧 WantokJobs Database Backup Agent\n');

  if (args.includes('--clean')) {
    console.log('🧹 Running cleanup only...');
    cleanOldBackups();
  } else if (args.includes('--list')) {
    listBackups();
  } else {
    // Full backup cycle
    createBackup();
    cleanOldBackups();
  }

  console.log('\n✅ Done!');
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { createBackup, cleanOldBackups, listBackups };
