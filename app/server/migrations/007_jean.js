/**
 * Migration 007: Jean AI Sales Agent tables
 * - Chat sessions & messages
 * - Employer automation preferences
 * - Jobseeker auto-apply rules & logs
 * - LinkedIn import cache
 * - Admin feature toggles
 */

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'wantokjobs.db');

function up() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    -- Jean chat sessions
    CREATE TABLE IF NOT EXISTS jean_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      session_token TEXT,
      current_flow TEXT,
      flow_state TEXT,
      context TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_jean_sessions_user ON jean_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_jean_sessions_token ON jean_sessions(session_token);

    -- Jean chat messages
    CREATE TABLE IF NOT EXISTS jean_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES jean_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user','jean','system')),
      content TEXT NOT NULL,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_jean_messages_session ON jean_messages(session_id);

    -- Employer automation preferences
    CREATE TABLE IF NOT EXISTS jean_employer_prefs (
      user_id INTEGER PRIMARY KEY,
      auto_post TEXT DEFAULT 'review' CHECK(auto_post IN ('review','auto','batch')),
      default_category TEXT,
      default_location TEXT,
      default_country TEXT DEFAULT 'Papua New Guinea',
      default_job_type TEXT DEFAULT 'full-time',
      notify_on_post INTEGER DEFAULT 1,
      notify_on_application INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Jobseeker auto-apply rules
    CREATE TABLE IF NOT EXISTS jean_auto_apply (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      keywords TEXT,
      categories TEXT,
      min_salary INTEGER,
      max_salary INTEGER,
      locations TEXT,
      job_types TEXT,
      exclude_companies TEXT,
      max_daily INTEGER DEFAULT 5,
      active INTEGER DEFAULT 1,
      last_run DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_jean_auto_apply_user ON jean_auto_apply(user_id);
    CREATE INDEX IF NOT EXISTS idx_jean_auto_apply_active ON jean_auto_apply(active);

    -- Auto-apply log
    CREATE TABLE IF NOT EXISTS jean_auto_apply_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_id INTEGER REFERENCES jean_auto_apply(id),
      user_id INTEGER NOT NULL,
      job_id INTEGER NOT NULL,
      application_id INTEGER,
      match_score REAL,
      status TEXT DEFAULT 'applied',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_jean_auto_apply_log_user ON jean_auto_apply_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_jean_auto_apply_log_job ON jean_auto_apply_log(job_id);

    -- LinkedIn import cache
    CREATE TABLE IF NOT EXISTS jean_linkedin_cache (
      url TEXT PRIMARY KEY,
      data TEXT,
      fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Jean admin settings (feature toggles)
    CREATE TABLE IF NOT EXISTS jean_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Insert default settings
    INSERT OR IGNORE INTO jean_settings (key, value, description) VALUES
      ('jean_enabled', 'true', 'Master toggle for Jean AI assistant'),
      ('voice_enabled', 'true', 'Allow voice input/output'),
      ('auto_apply_enabled', 'true', 'Allow jobseekers to set up auto-apply rules'),
      ('auto_post_enabled', 'true', 'Allow employers to auto-post jobs from uploads'),
      ('linkedin_import_enabled', 'true', 'Allow LinkedIn profile import'),
      ('document_parse_enabled', 'true', 'Allow PDF/Word document parsing for job creation'),
      ('max_auto_apply_daily', '10', 'Max auto-applications per user per day'),
      ('max_linkedin_scrapes_hourly', '10', 'Max LinkedIn scrapes per hour globally'),
      ('auto_apply_min_match_score', '70', 'Minimum match score for auto-apply (0-100)'),
      ('guest_chat_enabled', 'true', 'Allow non-logged-in users to chat with Jean'),
      ('proactive_triggers_enabled', 'true', 'Show proactive chat suggestions on pages'),
      ('jean_greeting', 'Hi! I''m Jean, your WantokJobs assistant. How can I help you today?', 'Jean''s default greeting message'),
      ('jean_offline_message', 'Jean is currently offline. Please try again later or contact us at support@wantokjobs.com', 'Message shown when Jean is disabled');

    -- Job drafts table (for employer document uploads)
    CREATE TABLE IF NOT EXISTS jean_job_drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      session_id INTEGER,
      source_filename TEXT,
      title TEXT,
      description TEXT,
      requirements TEXT,
      location TEXT,
      country TEXT DEFAULT 'Papua New Guinea',
      job_type TEXT,
      experience_level TEXT,
      category_slug TEXT,
      skills TEXT,
      salary_min INTEGER,
      salary_max INTEGER,
      salary_currency TEXT DEFAULT 'PGK',
      application_deadline TEXT,
      raw_text TEXT,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','approved','posted','rejected')),
      job_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_jean_job_drafts_user ON jean_job_drafts(user_id);
    CREATE INDEX IF NOT EXISTS idx_jean_job_drafts_status ON jean_job_drafts(status);
  `);

  console.log('Migration 007: Jean AI tables created');
  db.close();
}

function down() {
  const db = new Database(DB_PATH);
  db.exec(`
    DROP TABLE IF EXISTS jean_auto_apply_log;
    DROP TABLE IF EXISTS jean_auto_apply;
    DROP TABLE IF EXISTS jean_employer_prefs;
    DROP TABLE IF EXISTS jean_job_drafts;
    DROP TABLE IF EXISTS jean_messages;
    DROP TABLE IF EXISTS jean_sessions;
    DROP TABLE IF EXISTS jean_linkedin_cache;
    DROP TABLE IF EXISTS jean_settings;
  `);
  console.log('Migration 007: Jean AI tables dropped');
  db.close();
}

if (require.main === module) {
  const arg = process.argv[2];
  if (arg === 'down') { down(); } else { up(); }
  process.exit(0);
}

module.exports = { up, down };
