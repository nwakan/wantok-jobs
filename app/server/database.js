const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'wantokjobs.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('jobseeker', 'employer', 'admin')),
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS profiles_jobseeker (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      phone TEXT,
      location TEXT,
      country TEXT,
      bio TEXT,
      skills TEXT, -- JSON array
      work_history TEXT, -- JSON array
      education TEXT, -- JSON array
      cv_url TEXT,
      desired_job_type TEXT,
      desired_salary_min REAL,
      desired_salary_max REAL,
      availability TEXT,
      profile_complete INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS profiles_employer (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      company_name TEXT,
      industry TEXT,
      company_size TEXT,
      location TEXT,
      country TEXT,
      website TEXT,
      logo_url TEXT,
      description TEXT,
      verified INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employer_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      requirements TEXT, -- JSON array
      location TEXT,
      country TEXT,
      job_type TEXT CHECK(job_type IN ('full-time', 'part-time', 'contract', 'casual', 'internship')),
      experience_level TEXT,
      industry TEXT,
      salary_min REAL,
      salary_max REAL,
      salary_currency TEXT DEFAULT 'PGK',
      application_deadline TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('draft', 'active', 'closed', 'filled')),
      views_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      jobseeker_id INTEGER NOT NULL,
      cover_letter TEXT,
      cv_url TEXT,
      status TEXT DEFAULT 'applied' CHECK(status IN ('applied', 'screening', 'shortlisted', 'interview', 'offered', 'rejected', 'withdrawn')),
      ai_score REAL,
      applied_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (jobseeker_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(job_id, jobseeker_id)
    );

    CREATE TABLE IF NOT EXISTS saved_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      job_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      UNIQUE(user_id, job_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      data TEXT, -- JSON
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_employer ON jobs(employer_id);
    CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
    CREATE INDEX IF NOT EXISTS idx_applications_jobseeker ON applications(jobseeker_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_saved_jobs_user ON saved_jobs(user_id);
  `);

  console.log('✅ Database initialized');
}

initializeDatabase();

// Auto-seed admin + sample data on fresh DB
const hasAdmin = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get();
if (hasAdmin.count === 0) {
  try {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, ?, ?)').run('admin@wantokjobs.com', hash, 'admin', 'Admin User');
    console.log('🌱 Admin user seeded: admin@wantokjobs.com / admin123');
  } catch (e) { console.error('Seed error:', e.message); }
}

module.exports = db;
