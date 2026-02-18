#!/usr/bin/env node
'use strict';
/**
 * Marketing System Migration
 * Creates all tables needed for the Village Network marketing automation
 */

const path = require('path');
const Database = require(path.join(__dirname, 'node_modules/better-sqlite3'));
const dbPath = path.join(__dirname, 'server/data/wantokjobs.db');

console.log('🔧 Marketing System Migration starting...\n');

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// Wrap all in a transaction
const migrate = db.transaction(() => {
  // 1. Marketing Posts table
  console.log('Creating marketing_posts table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS marketing_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      content TEXT NOT NULL,
      job_id INTEGER,
      report_type TEXT,
      status TEXT DEFAULT 'pending',
      scheduled_at TEXT,
      posted_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    )
  `);
  
  // Index for queries
  db.exec('CREATE INDEX IF NOT EXISTS idx_marketing_posts_status ON marketing_posts(status, platform)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_marketing_posts_created ON marketing_posts(created_at DESC)');
  
  // 2. Marketing Config table
  console.log('Creating marketing_config table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS marketing_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL UNIQUE,
      api_key TEXT,
      api_secret TEXT,
      page_id TEXT,
      access_token TEXT,
      enabled INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  
  // Insert default platforms
  const platforms = ['facebook', 'twitter', 'linkedin', 'whatsapp'];
  const insert = db.prepare('INSERT OR IGNORE INTO marketing_config (platform) VALUES (?)');
  for (const platform of platforms) {
    insert.run(platform);
  }
  
  // 3. Whisper Queue table
  console.log('Creating whisper_queue table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS whisper_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      job_id INTEGER NOT NULL,
      phone TEXT NOT NULL,
      message TEXT NOT NULL,
      match_score INTEGER,
      status TEXT DEFAULT 'pending',
      sent_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    )
  `);
  
  db.exec('CREATE INDEX IF NOT EXISTS idx_whisper_queue_status ON whisper_queue(status, created_at)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_whisper_queue_user ON whisper_queue(user_id, created_at DESC)');
  
  // 4. Success Stories table
  console.log('Creating success_stories table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS success_stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      job_id INTEGER,
      employer_id INTEGER,
      story_short TEXT,
      story_long TEXT,
      story_stats TEXT,
      consent_given INTEGER DEFAULT 0,
      published INTEGER DEFAULT 0,
      collected_at TEXT DEFAULT (datetime('now')),
      published_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL,
      FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
  
  db.exec('CREATE INDEX IF NOT EXISTS idx_success_stories_consent ON success_stories(consent_given, published)');
  
  // 5. Marketing State tracking (for orchestrator)
  console.log('Creating marketing_runs table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS marketing_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent TEXT NOT NULL,
      status TEXT DEFAULT 'running',
      posts_generated INTEGER DEFAULT 0,
      whispers_sent INTEGER DEFAULT 0,
      stories_collected INTEGER DEFAULT 0,
      error TEXT,
      started_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    )
  `);
  
  db.exec('CREATE INDEX IF NOT EXISTS idx_marketing_runs_agent ON marketing_runs(agent, started_at DESC)');
  
  console.log('✅ All tables created successfully!\n');
});

try {
  migrate();
  
  // Verify tables
  console.log('📊 Verifying tables...');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'marketing_%' OR name = 'whisper_queue' OR name = 'success_stories'").all();
  console.log(`Found ${tables.length} marketing-related tables:`);
  tables.forEach(t => console.log(`  ✓ ${t.name}`));
  
  // Show counts
  console.log('\n📈 Current data:');
  const postCount = db.prepare('SELECT COUNT(*) as c FROM marketing_posts').get().c;
  const whisperCount = db.prepare('SELECT COUNT(*) as c FROM whisper_queue').get().c;
  const storyCount = db.prepare('SELECT COUNT(*) as c FROM success_stories').get().c;
  console.log(`  • Marketing posts: ${postCount}`);
  console.log(`  • Whispers queued: ${whisperCount}`);
  console.log(`  • Success stories: ${storyCount}`);
  
  console.log('\n✅ Migration complete!');
  
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
} finally {
  db.close();
}
