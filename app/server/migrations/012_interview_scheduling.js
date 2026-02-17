/**
 * Migration: Interview Scheduling Enhancement
 * Adds proposed_times, confirmed_time, employer_id, jobseeker_id columns
 * to support multi-slot interview proposals
 */
const db = require('../database');
const logger = require('../utils/logger');

function up() {
  const cols = db.pragma('table_info(interviews)').map(c => c.name);
  
  const additions = [
    ['proposed_times', "ALTER TABLE interviews ADD COLUMN proposed_times TEXT"],
    ['confirmed_time', "ALTER TABLE interviews ADD COLUMN confirmed_time DATETIME"],
    ['employer_id', "ALTER TABLE interviews ADD COLUMN employer_id INTEGER REFERENCES users(id)"],
    ['jobseeker_id', "ALTER TABLE interviews ADD COLUMN jobseeker_id INTEGER REFERENCES users(id)"],
  ];

  for (const [col, sql] of additions) {
    if (!cols.includes(col)) {
      db.prepare(sql).run();
      logger.info(`Added column ${col} to interviews`);
    }
  }

  // Add 'proposed' to status check constraint if not present
  // SQLite doesn't support ALTER CHECK, so we handle this in app logic
  
  // Backfill employer_id and jobseeker_id from applications
  db.prepare(`
    UPDATE interviews SET 
      employer_id = (SELECT j.employer_id FROM applications a JOIN jobs j ON a.job_id = j.id WHERE a.id = interviews.application_id),
      jobseeker_id = (SELECT a.jobseeker_id FROM applications a WHERE a.id = interviews.application_id)
    WHERE employer_id IS NULL OR jobseeker_id IS NULL
  `).run();

  logger.info('Migration 012_interview_scheduling complete');
}

module.exports = { up };
