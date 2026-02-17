#!/usr/bin/env node
/**
 * Lightweight migration runner for better-sqlite3
 * Usage:
 *   node server/migrations/runner.js           # run pending migrations
 *   node server/migrations/runner.js --status   # show migration state
 *   node server/migrations/runner.js --rollback # undo last migration
 */

const path = require('path');
const fs = require('fs');

// Load DB — support being called from project root or migrations dir
let db;
try {
  db = require('../database');
} catch {
  db = require(path.join(__dirname, '..', 'database'));
}

// Ensure _migrations table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    applied_at TEXT DEFAULT (datetime('now'))
  )
`);

function getMigrationFiles() {
  const dir = __dirname;
  return fs.readdirSync(dir)
    .filter(f => /^\d{3}_.*\.js$/.test(f) && f !== 'runner.js')
    .sort();
}

function getApplied() {
  return db.prepare('SELECT name FROM _migrations ORDER BY name').all().map(r => r.name);
}

function showStatus() {
  const files = getMigrationFiles();
  const applied = new Set(getApplied());
  console.log('\nMigration Status:');
  console.log('─'.repeat(60));
  for (const f of files) {
    const status = applied.has(f) ? '✅ applied' : '⏳ pending';
    console.log(`  ${status}  ${f}`);
  }
  if (files.length === 0) console.log('  No migration files found.');
  console.log('');
}

function runPending() {
  const files = getMigrationFiles();
  const applied = new Set(getApplied());
  const pending = files.filter(f => !applied.has(f));

  if (pending.length === 0) {
    console.log('✅ All migrations are up to date.');
    return;
  }

  console.log(`\nRunning ${pending.length} pending migration(s)...\n`);

  for (const file of pending) {
    const migration = require(path.join(__dirname, file));
    console.log(`  ▶ ${file}...`);
    
    const runInTransaction = db.transaction(() => {
      migration.up(db);
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
    });

    try {
      runInTransaction();
      console.log(`  ✅ ${file} applied.`);
    } catch (err) {
      console.error(`  ❌ ${file} FAILED: ${err.message}`);
      process.exit(1);
    }
  }

  console.log('\n✅ All migrations applied.\n');
}

function rollbackLast() {
  const applied = getApplied();
  if (applied.length === 0) {
    console.log('Nothing to rollback.');
    return;
  }

  const last = applied[applied.length - 1];
  const migration = require(path.join(__dirname, last));

  if (!migration.down) {
    console.error(`❌ ${last} has no down() function — cannot rollback.`);
    process.exit(1);
  }

  console.log(`\n  ▼ Rolling back ${last}...`);

  const runInTransaction = db.transaction(() => {
    migration.down(db);
    db.prepare('DELETE FROM _migrations WHERE name = ?').run(last);
  });

  try {
    runInTransaction();
    console.log(`  ✅ ${last} rolled back.\n`);
  } catch (err) {
    console.error(`  ❌ Rollback FAILED: ${err.message}`);
    process.exit(1);
  }
}

// CLI
const arg = process.argv[2];
if (arg === '--status') {
  showStatus();
} else if (arg === '--rollback') {
  rollbackLast();
} else {
  runPending();
}
