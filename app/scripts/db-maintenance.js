#!/usr/bin/env node
/**
 * WantokJobs Database Maintenance Script
 * 
 * Performs routine SQLite maintenance tasks:
 * - ANALYZE, integrity check, FTS rebuild, WAL checkpoint
 * - Table/index stats, stale data cleanup
 * 
 * Usage: node scripts/db-maintenance.js [--dry-run]
 * 
 * Cron (weekly Sunday 3AM UTC):
 * 0 3 * * 0 cd /opt/wantokjobs/app && node scripts/db-maintenance.js >> /var/log/wantokjobs-maintenance.log 2>&1
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dryRun = process.argv.includes('--dry-run');
const startTime = Date.now();
const report = [];

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  report.push(msg);
}

// Open database
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'server', 'data');
const dbPath = path.join(dataDir, 'wantokjobs.db');

if (!fs.existsSync(dbPath)) {
  console.error(`Database not found: ${dbPath}`);
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma('busy_timeout = 10000');

log(`=== WantokJobs DB Maintenance${dryRun ? ' (DRY RUN)' : ''} ===`);
log(`Database: ${dbPath} (${(fs.statSync(dbPath).size / 1024 / 1024).toFixed(2)} MB)`);

// 1. ANALYZE
try {
  if (!dryRun) db.exec('ANALYZE');
  log('✅ ANALYZE — query planner statistics updated');
} catch (e) {
  log(`❌ ANALYZE failed: ${e.message}`);
}

// 2. Integrity check
try {
  const result = db.pragma('integrity_check');
  const ok = result.length === 1 && result[0].integrity_check === 'ok';
  if (ok) {
    log('✅ Integrity check — ok');
  } else {
    log(`⚠️  Integrity check — ${result.length} issue(s):`);
    result.slice(0, 10).forEach(r => log(`   ${r.integrity_check}`));
  }
} catch (e) {
  log(`❌ Integrity check failed: ${e.message}`);
}

// 3. FTS rebuild
try {
  const ftsExists = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='jobs_fts'"
  ).get();
  if (ftsExists) {
    if (!dryRun) {
      db.exec("INSERT INTO jobs_fts(jobs_fts) VALUES('rebuild')");
    }
    log('✅ FTS rebuild — jobs_fts rebuilt');
  } else {
    log('ℹ️  FTS rebuild — jobs_fts table not found, skipped');
  }
} catch (e) {
  log(`❌ FTS rebuild failed: ${e.message}`);
}

// 4. WAL checkpoint
try {
  if (!dryRun) {
    const wal = db.pragma('wal_checkpoint(TRUNCATE)');
    const w = wal[0] || {};
    log(`✅ WAL checkpoint — busy:${w.busy} checkpointed:${w.checkpointed} log:${w.log}`);
  } else {
    log('✅ WAL checkpoint — skipped (dry run)');
  }
} catch (e) {
  log(`❌ WAL checkpoint failed: ${e.message}`);
}

// 5. Table stats
log('\n📊 Table Statistics:');
try {
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  ).all();
  for (const t of tables) {
    try {
      const count = db.prepare(`SELECT COUNT(*) as c FROM "${t.name}"`).get().c;
      log(`   ${t.name}: ${count.toLocaleString()} rows`);
    } catch (e) {
      log(`   ${t.name}: (error: ${e.message})`);
    }
  }
} catch (e) {
  log(`❌ Table stats failed: ${e.message}`);
}

// 6. Index stats
log('\n📊 Index Statistics:');
try {
  const indexes = db.prepare(
    "SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY tbl_name, name"
  ).all();
  log(`   ${indexes.length} indexes total`);
  for (const idx of indexes) {
    log(`   ${idx.tbl_name}.${idx.name}`);
  }
} catch (e) {
  log(`❌ Index stats failed: ${e.message}`);
}

// 7. Stale data cleanup
log('\n🧹 Stale Data Cleanup:');

function cleanupTable(label, sql, params = []) {
  try {
    // Check if table exists first
    const tableName = sql.match(/FROM\s+(\w+)/i)?.[1];
    if (tableName) {
      const exists = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
      ).get(tableName);
      if (!exists) {
        log(`   ${label}: table ${tableName} not found, skipped`);
        return;
      }
    }
    
    // Count first
    const countSql = sql.replace(/^DELETE/i, 'SELECT COUNT(*) as c');
    const count = db.prepare(countSql).get(...params).c;
    
    if (count === 0) {
      log(`   ${label}: 0 rows to clean`);
      return;
    }
    
    if (!dryRun) {
      const result = db.prepare(sql).run(...params);
      log(`   ${label}: ${result.changes} rows deleted`);
    } else {
      log(`   ${label}: ${count} rows would be deleted (dry run)`);
    }
  } catch (e) {
    log(`   ${label}: error — ${e.message}`);
  }
}

cleanupTable(
  'Expired deposit_intents (>7 days)',
  "DELETE FROM deposit_intents WHERE status IN ('awaiting_payment','expired') AND created_at < datetime('now', '-7 days')"
);

cleanupTable(
  'Old search_analytics (>90 days)',
  "DELETE FROM search_analytics WHERE created_at < datetime('now', '-90 days')"
);

cleanupTable(
  'Read notifications (>90 days)',
  "DELETE FROM notifications WHERE read = 1 AND created_at < datetime('now', '-90 days')"
);

cleanupTable(
  'Old job_clicks (>180 days)',
  "DELETE FROM job_clicks WHERE created_at < datetime('now', '-180 days')"
);

// 8. Final ANALYZE after cleanup
if (!dryRun) {
  try {
    db.exec('ANALYZE');
  } catch (e) { /* ignore */ }
}

// Summary
const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
const dbSizeAfter = (fs.statSync(dbPath).size / 1024 / 1024).toFixed(2);
log(`\n✅ Maintenance complete in ${elapsed}s — DB size: ${dbSizeAfter} MB`);

db.close();
