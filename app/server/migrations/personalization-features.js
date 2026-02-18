/**
 * Database migrations for personalization and jobseeker experience features
 */

const db = require('../database');
const logger = require('../utils/logger');

function runMigrations() {
  try {
    // Marketing posts table (Part 1.1)
    db.exec(`
      CREATE TABLE IF NOT EXISTS marketing_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employer_id INTEGER,
        content TEXT NOT NULL,
        content_type TEXT DEFAULT 'email',
        industry TEXT,
        location TEXT,
        company_size TEXT,
        stats TEXT,
        sent INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Personalized digests table (Part 1.2)
    db.exec(`
      CREATE TABLE IF NOT EXISTS personalized_digests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        content_whatsapp TEXT,
        content_email TEXT,
        jobs_included TEXT,
        relevance_scores TEXT,
        sent INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Notifications table (Part 3.9)
    db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT,
        link TEXT,
        read INTEGER DEFAULT 0,
        job_id INTEGER,
        application_id INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
      )
    `);

    // Interview slots table (Part 3.10)
    db.exec(`
      CREATE TABLE IF NOT EXISTS interview_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER NOT NULL,
        application_id INTEGER NOT NULL,
        employer_id INTEGER NOT NULL,
        proposed_times TEXT,
        selected_time TEXT,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'cancelled')),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
        FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    logger.info('✅ Personalization migrations completed successfully');
  } catch (error) {
    logger.error('Migration error', { error: error.message });
    throw error;
  }
}

// Run migrations if called directly
if (require.main === module) {
  runMigrations();
  console.log('Migrations completed');
}

module.exports = { runMigrations };
