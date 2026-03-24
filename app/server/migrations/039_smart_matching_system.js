/**
 * Migration 039: Smart Matching System
 * 
 * Task: Task 18 - Smart Matching Algorithms (Matchmaker + Screener + Ranker)
 * Date: 2026-03-24
 * 
 * Creates 4 new tables for AI-powered candidate screening, matching, and ranking:
 * 1. screening_questions - Auto-generated questions for each job
 * 2. screening_answers - Applicant responses to screening questions
 * 3. ai_assessments - AI analysis of applications (match scores, screening scores, rankings)
 * 4. application_events - Pipeline tracking for applicant journey
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../data/wantokjobs.db');
const db = new Database(dbPath);

console.log('\n🚀 Migration 039: Smart Matching System');
console.log('=' + '='.repeat(79));
console.log(`Database: ${dbPath}`);
console.log(`Time: ${new Date().toISOString()}`);
console.log('=' + '='.repeat(79) + '\n');

try {
  db.exec('BEGIN TRANSACTION');

  // 1. screening_questions table
  console.log('📋 Creating screening_questions table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS screening_questions (
      question_id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT NOT NULL CHECK (question_type IN ('text', 'multiple_choice', 'yes_no', 'numeric', 'date')),
      question_order INTEGER NOT NULL,
      is_required BOOLEAN NOT NULL DEFAULT 1,
      options TEXT,
      expected_answer TEXT,
      weight REAL NOT NULL DEFAULT 1.0,
      category TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_screening_questions_job ON screening_questions(job_id, question_order)`);
  console.log('✅ screening_questions table created');

  // 2. screening_answers table
  console.log('📋 Creating screening_answers table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS screening_answers (
      answer_id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      answer_text TEXT NOT NULL,
      ai_score REAL,
      ai_feedback TEXT,
      flagged BOOLEAN DEFAULT 0,
      flag_reason TEXT,
      answered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES screening_questions(question_id) ON DELETE CASCADE,
      UNIQUE(application_id, question_id)
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_screening_answers_application ON screening_answers(application_id, ai_score DESC)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_screening_answers_question ON screening_answers(question_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_screening_answers_flagged ON screening_answers(flagged, application_id)`);
  console.log('✅ screening_answers table created');

  // 3. ai_assessments table
  console.log('📋 Creating ai_assessments table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_assessments (
      assessment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL UNIQUE,
      job_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      match_score REAL NOT NULL DEFAULT 0.0,
      match_breakdown TEXT NOT NULL,
      match_explanation_en TEXT,
      match_explanation_tp TEXT,
      screening_score REAL DEFAULT NULL,
      screening_questions_answered INTEGER DEFAULT 0,
      screening_questions_total INTEGER DEFAULT 0,
      profile_completeness REAL DEFAULT 0.0,
      combined_score REAL NOT NULL DEFAULT 0.0,
      rank_position INTEGER DEFAULT NULL,
      rank_percentile REAL DEFAULT NULL,
      recommended_action TEXT CHECK (recommended_action IN ('shortlist', 'consider', 'review', 'reject')),
      recommendation_reason TEXT,
      has_red_flags BOOLEAN DEFAULT 0,
      red_flags TEXT,
      assessed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_ai_assessments_application ON ai_assessments(application_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_ai_assessments_job_score ON ai_assessments(job_id, combined_score DESC)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_ai_assessments_job_rank ON ai_assessments(job_id, rank_position ASC)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_ai_assessments_user ON ai_assessments(user_id, assessed_at DESC)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_ai_assessments_action ON ai_assessments(recommended_action, job_id)`);
  console.log('✅ ai_assessments table created');

  // 4. application_events table
  console.log('📋 Creating application_events table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS application_events (
      event_id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      event_type TEXT NOT NULL CHECK (event_type IN (
        'applied', 'screening_completed', 'assessed', 'ranked', 'shortlisted', 
        'reviewed', 'interview_scheduled', 'interview_completed', 
        'offered', 'offer_accepted', 'offer_declined', 'rejected', 'withdrawn'
      )),
      event_data TEXT,
      triggered_by TEXT CHECK (triggered_by IN ('user', 'employer', 'ai', 'system')),
      triggered_by_id INTEGER,
      event_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_application_events_application ON application_events(application_id, event_timestamp DESC)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_application_events_type ON application_events(event_type, event_timestamp DESC)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_application_events_triggered ON application_events(triggered_by, triggered_by_id, event_timestamp DESC)`);
  console.log('✅ application_events table created');

  db.exec('COMMIT');
  console.log('\n✅ Migration 039 completed successfully!\n');
  process.exit(0);

} catch (error) {
  db.exec('ROLLBACK');
  console.error('\n❌ Migration 039 failed:');
  console.error(error.message);
  console.error(error.stack);
  process.exit(1);
}
