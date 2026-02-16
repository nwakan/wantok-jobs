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

// Helper to add columns safely (SQLite limitation)
function addColumn(table, column, type) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  } catch(e) {
    // Column likely exists, ignore
  }
}

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

    -- New tables for v2
    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      currency TEXT DEFAULT 'PGK',
      duration_days INTEGER NOT NULL,
      job_limit INTEGER NOT NULL,
      featured_jobs INTEGER DEFAULT 0,
      resume_views INTEGER,
      ai_screening INTEGER DEFAULT 0,
      priority_support INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employer_id INTEGER NOT NULL,
      plan_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'PGK',
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed', 'refunded')),
      payment_method TEXT,
      payment_ref TEXT,
      invoice_number TEXT UNIQUE,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES plans(id)
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      parent_id INTEGER,
      icon TEXT,
      job_count INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS job_categories (
      job_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      PRIMARY KEY (job_id, category_id),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS screening_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      question TEXT NOT NULL,
      question_type TEXT NOT NULL CHECK(question_type IN ('text', 'yes_no', 'multiple_choice', 'number')),
      options TEXT,
      required INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS screening_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      answer TEXT,
      ai_score REAL,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES screening_questions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      category TEXT,
      normalized_name TEXT
    );

    CREATE TABLE IF NOT EXISTS user_skills (
      user_id INTEGER NOT NULL,
      skill_id INTEGER NOT NULL,
      proficiency TEXT CHECK(proficiency IN ('beginner', 'intermediate', 'advanced', 'expert')),
      years_experience REAL,
      PRIMARY KEY (user_id, skill_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS job_skills (
      job_id INTEGER NOT NULL,
      skill_id INTEGER NOT NULL,
      required INTEGER DEFAULT 1,
      PRIMARY KEY (job_id, skill_id),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS job_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      keywords TEXT,
      category_id INTEGER,
      location TEXT,
      job_type TEXT,
      salary_min REAL,
      frequency TEXT DEFAULT 'daily' CHECK(frequency IN ('instant', 'daily', 'weekly')),
      channel TEXT DEFAULT 'email' CHECK(channel IN ('email', 'sms', 'whatsapp', 'push')),
      active INTEGER DEFAULT 1,
      last_sent TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS saved_resumes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employer_id INTEGER NOT NULL,
      jobseeker_id INTEGER NOT NULL,
      notes TEXT,
      folder TEXT DEFAULT 'default',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(employer_id, jobseeker_id),
      FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (jobseeker_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS company_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      reviewer_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      title TEXT,
      pros TEXT,
      cons TEXT,
      advice TEXT,
      is_current_employee INTEGER DEFAULT 0,
      approved INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS application_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      from_status TEXT,
      to_status TEXT,
      changed_by INTEGER,
      notes TEXT,
      ai_generated INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ai_assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL CHECK(entity_type IN ('application', 'job', 'profile', 'match')),
      entity_id INTEGER NOT NULL,
      assessment_type TEXT,
      score REAL,
      explanation TEXT,
      details TEXT,
      model_version TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS resumes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT DEFAULT 'My Resume',
      file_url TEXT,
      file_name TEXT,
      parsed_data TEXT,
      is_primary INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS banners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employer_id INTEGER NOT NULL,
      title TEXT,
      image_url TEXT,
      link_url TEXT,
      placement TEXT NOT NULL CHECK(placement IN ('homepage_top', 'homepage_side', 'search_top', 'search_side', 'job_detail')),
      impressions INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      start_date TEXT,
      end_date TEXT,
      active INTEGER DEFAULT 1,
      FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      content TEXT,
      excerpt TEXT,
      category TEXT,
      tags TEXT,
      featured_image TEXT,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
      ai_generated INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      published_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      user_id INTEGER,
      name TEXT,
      subscribed INTEGER DEFAULT 1,
      frequency TEXT DEFAULT 'weekly',
      last_sent TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS admin_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id INTEGER NOT NULL,
      to_user_id INTEGER NOT NULL,
      subject TEXT,
      body TEXT,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      metadata TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS ip_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_address TEXT NOT NULL,
      reason TEXT,
      blocked_by INTEGER,
      expires_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (blocked_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS email_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      subject TEXT,
      body_html TEXT,
      body_text TEXT,
      variables TEXT,
      active INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'new' CHECK(status IN ('new', 'read', 'replied')),
      admin_reply TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Additional indexes for new tables
    CREATE INDEX IF NOT EXISTS idx_orders_employer ON orders(employer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_job_categories_job ON job_categories(job_id);
    CREATE INDEX IF NOT EXISTS idx_job_categories_category ON job_categories(category_id);
    CREATE INDEX IF NOT EXISTS idx_screening_questions_job ON screening_questions(job_id);
    CREATE INDEX IF NOT EXISTS idx_screening_answers_application ON screening_answers(application_id);
    CREATE INDEX IF NOT EXISTS idx_job_alerts_user ON job_alerts(user_id);
    CREATE INDEX IF NOT EXISTS idx_saved_resumes_employer ON saved_resumes(employer_id);
    CREATE INDEX IF NOT EXISTS idx_company_reviews_company ON company_reviews(company_id);
    CREATE INDEX IF NOT EXISTS idx_application_events_application ON application_events(application_id);
    CREATE INDEX IF NOT EXISTS idx_ai_assessments_entity ON ai_assessments(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_resumes_user ON resumes(user_id);
    CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
    CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
  `);

  // Add columns to existing tables (safe ALTER TABLE)
  addColumn('users', 'status', "TEXT DEFAULT 'active'");
  addColumn('users', 'email_verified', 'INTEGER DEFAULT 0');
  addColumn('users', 'featured', 'INTEGER DEFAULT 0');
  addColumn('users', 'last_login', 'TEXT');
  addColumn('users', 'avatar_url', 'TEXT');
  addColumn('users', 'phone', 'TEXT');

  addColumn('profiles_jobseeker', 'headline', 'TEXT');
  addColumn('profiles_jobseeker', 'gender', 'TEXT');
  addColumn('profiles_jobseeker', 'date_of_birth', 'TEXT');
  addColumn('profiles_jobseeker', 'nationality', 'TEXT');
  addColumn('profiles_jobseeker', 'languages', 'TEXT');
  addColumn('profiles_jobseeker', 'profile_views', 'INTEGER DEFAULT 0');
  addColumn('profiles_jobseeker', 'last_active', 'TEXT');

  addColumn('profiles_employer', 'phone', 'TEXT');
  addColumn('profiles_employer', 'address', 'TEXT');
  addColumn('profiles_employer', 'city', 'TEXT');
  addColumn('profiles_employer', 'featured', 'INTEGER DEFAULT 0');
  addColumn('profiles_employer', 'subscription_plan_id', 'INTEGER');
  addColumn('profiles_employer', 'plan_expires_at', 'TEXT');
  addColumn('profiles_employer', 'total_jobs_posted', 'INTEGER DEFAULT 0');

  addColumn('jobs', 'featured', 'INTEGER DEFAULT 0');
  addColumn('jobs', 'apply_email', 'TEXT');
  addColumn('jobs', 'apply_url', 'TEXT');
  addColumn('jobs', 'company_name', 'TEXT');
  addColumn('jobs', 'applications_count', 'INTEGER DEFAULT 0');

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

// Full-text search index for jobs
try {
  db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS jobs_fts USING fts5(
    title, description, location, company_name,
    content='jobs', content_rowid='id',
    tokenize='porter unicode61'
  )`);
} catch (e) { /* FTS5 already exists */ }

module.exports = db;
