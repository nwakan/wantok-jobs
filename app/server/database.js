const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists — use DATA_DIR env for persistent volumes (Fly.io etc)
const dataDir = process.env.DATA_DIR ? path.join(process.env.DATA_DIR) : path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'wantokjobs.db');
const db = new Database(dbPath);

// Performance: WAL mode + busy timeout
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');
db.pragma('cache_size = -8000'); // 8MB cache

// Run PRAGMA optimize periodically (every 2 hours)
setInterval(() => {
  try { db.pragma('optimize'); } catch (e) { /* ignore */ }
}, 2 * 60 * 60 * 1000);

// Graceful shutdown
function closeDatabase() {
  try {
    db.pragma('optimize');
    db.close();
    console.log('📦 Database connection closed');
  } catch (e) { /* already closed */ }
}
process.on('SIGINT', () => { closeDatabase(); process.exit(0); });
process.on('SIGTERM', () => { closeDatabase(); process.exit(0); });
process.on('exit', closeDatabase);

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
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'shortlisted', 'interviewed', 'offered', 'hired', 'rejected', 'withdrawn')),
      status_updated_at TEXT DEFAULT (datetime('now')),
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
    
    -- Additional performance indexes (API audit improvements)
    CREATE INDEX IF NOT EXISTS idx_jobs_employer_status ON jobs(employer_id, status);
    CREATE INDEX IF NOT EXISTS idx_jobs_category_status ON jobs(category_slug, status);
    CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_jobs_views_status ON jobs(views_count DESC, status);
    CREATE INDEX IF NOT EXISTS idx_applications_job_status ON applications(job_id, status);
    CREATE INDEX IF NOT EXISTS idx_applications_applicant_created ON applications(jobseeker_id, applied_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_created ON saved_jobs(user_id, created_at DESC);

    -- Credit packages (replaces old subscription plans)
    CREATE TABLE IF NOT EXISTS packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      target_role TEXT NOT NULL CHECK(target_role IN ('employer', 'jobseeker')),
      package_type TEXT NOT NULL CHECK(package_type IN ('service_package', 'standard_trial', 'premium_indefinite_trial', 'free')),
      price REAL NOT NULL DEFAULT 0,
      currency TEXT DEFAULT 'PGK',
      description TEXT,
      -- Employer credits
      job_posting_credits INTEGER DEFAULT 0,
      ai_matching_credits INTEGER DEFAULT 0,
      candidate_search_credits INTEGER DEFAULT 0,
      -- Jobseeker credits
      alert_credits INTEGER DEFAULT 0,
      auto_apply_enabled INTEGER DEFAULT 0,
      -- Feature tier unlocked by this package
      feature_tier TEXT DEFAULT 'free' CHECK(feature_tier IN ('free', 'basic', 'professional', 'enterprise')),
      -- Trial duration (days, 0 = not a trial)
      trial_duration_days INTEGER DEFAULT 0,
      -- Display
      sort_order INTEGER DEFAULT 0,
      popular INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Keep legacy plans table for migration reference (read-only)
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
      plan_id INTEGER DEFAULT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'PGK',
      status TEXT NOT NULL DEFAULT 'pending',
      payment_method TEXT,
      payment_ref TEXT,
      invoice_number TEXT UNIQUE,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Credit transaction ledger
    CREATE TABLE IF NOT EXISTS credit_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      credit_type TEXT NOT NULL CHECK(credit_type IN ('job_posting', 'ai_matching', 'candidate_search', 'alert', 'job_post')),
      amount INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      reason TEXT NOT NULL,
      reference_type TEXT,
      reference_id INTEGER,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Credit wallets for tracking balances
    CREATE TABLE IF NOT EXISTS credit_wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      balance INTEGER DEFAULT 0,
      reserved_balance INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- SME payments for WhatsApp employer flow
    CREATE TABLE IF NOT EXISTS sme_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      package_key TEXT NOT NULL,
      amount INTEGER NOT NULL,
      currency TEXT DEFAULT 'PGK',
      payment_method TEXT DEFAULT 'bank_transfer',
      reference_code TEXT UNIQUE,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','verified','rejected','expired')),
      admin_notes TEXT,
      verified_by INTEGER,
      verified_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
    );

    -- WhatsApp employers (phone number to user mapping)
    CREATE TABLE IF NOT EXISTS whatsapp_employers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
      to_status TEXT NOT NULL,
      changed_by INTEGER,
      notes TEXT,
      ai_generated INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS interviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      employer_id INTEGER REFERENCES users(id),
      jobseeker_id INTEGER REFERENCES users(id),
      scheduled_at DATETIME,
      proposed_times TEXT,
      confirmed_time DATETIME,
      duration_minutes INTEGER DEFAULT 60,
      type TEXT DEFAULT 'in-person' CHECK(type IN ('in-person', 'phone', 'video')),
      location TEXT,
      video_link TEXT,
      notes TEXT,
      status TEXT DEFAULT 'scheduled' CHECK(status IN ('proposed', 'scheduled', 'confirmed', 'completed', 'cancelled', 'no-show')),
      interviewer_name TEXT,
      interviewer_email TEXT,
      feedback TEXT,
      feedback_rating INTEGER CHECK(feedback_rating >= 1 AND feedback_rating <= 5),
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now')),
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

    CREATE TABLE IF NOT EXISTS newsletter_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      content TEXT NOT NULL,
      target_audience TEXT DEFAULT 'all' CHECK(target_audience IN ('all', 'employers', 'jobseekers')),
      recipient_count INTEGER DEFAULT 0,
      sent_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      sent_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
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

    -- Task 4: Report Job/Employer
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id INTEGER,
      job_id INTEGER,
      employer_id INTEGER,
      reason TEXT NOT NULL CHECK(reason IN ('scam', 'misleading', 'inappropriate', 'duplicate', 'other')),
      details TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'dismissed')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS company_follows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      employer_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, employer_id)
    );

    CREATE TABLE IF NOT EXISTS training_providers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      website TEXT,
      location TEXT,
      category TEXT,
      logo_url TEXT,
      featured INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS training_courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      duration TEXT,
      price REAL,
      currency TEXT DEFAULT 'PGK',
      mode TEXT DEFAULT 'in-person',
      url TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (provider_id) REFERENCES training_providers(id) ON DELETE CASCADE
    );

    -- Search analytics: track what users search for
    CREATE TABLE IF NOT EXISTS search_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT,
      category TEXT,
      location TEXT,
      results_count INTEGER DEFAULT 0,
      user_id INTEGER,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_search_analytics_created ON search_analytics(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON search_analytics(query, created_at DESC);

    -- Job click tracking
    CREATE TABLE IF NOT EXISTS job_clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      user_id INTEGER,
      source TEXT DEFAULT 'search',
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_job_clicks_job ON job_clicks(job_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_job_clicks_created ON job_clicks(created_at DESC);

    CREATE TABLE IF NOT EXISTS testimonials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Jobseeker',
      company TEXT,
      quote TEXT NOT NULL,
      photo_url TEXT,
      rating INTEGER DEFAULT 5 CHECK(rating BETWEEN 1 AND 5),
      featured INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_testimonials_status ON testimonials(status, featured DESC);

    -- Additional indexes for new tables
    CREATE INDEX IF NOT EXISTS idx_company_follows_user ON company_follows(user_id);
    CREATE INDEX IF NOT EXISTS idx_company_follows_employer ON company_follows(employer_id);
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
    CREATE INDEX IF NOT EXISTS idx_activity_log_user_action ON activity_log(user_id, action, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email, subscribed);
    CREATE INDEX IF NOT EXISTS idx_newsletter_history_admin ON newsletter_history(admin_id, sent_at DESC);
    CREATE INDEX IF NOT EXISTS idx_banners_placement ON banners(placement, active);
    CREATE INDEX IF NOT EXISTS idx_company_reviews_approved ON company_reviews(company_id, approved, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_reports_job ON reports(job_id);
    CREATE INDEX IF NOT EXISTS idx_reports_employer ON reports(employer_id);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_interviews_application ON interviews(application_id);
    CREATE INDEX IF NOT EXISTS idx_interviews_scheduled ON interviews(scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status, scheduled_at);
  `);

  // Add columns to existing tables (safe ALTER TABLE)
  addColumn('users', 'status', "TEXT DEFAULT 'active'");
  addColumn('users', 'email_verified', 'INTEGER DEFAULT 0');
  addColumn('users', 'featured', 'INTEGER DEFAULT 0');
  addColumn('users', 'last_login', 'TEXT');
  addColumn('users', 'avatar_url', 'TEXT');
  addColumn('users', 'phone', 'TEXT');
  
  // OAuth support columns
  addColumn('users', 'oauth_provider', 'TEXT');  // 'google', 'facebook', null (regular)
  addColumn('users', 'oauth_id', 'TEXT');  // Provider's user ID

  addColumn('profiles_jobseeker', 'headline', 'TEXT');
  addColumn('profiles_jobseeker', 'gender', 'TEXT');
  addColumn('profiles_jobseeker', 'date_of_birth', 'TEXT');
  addColumn('profiles_jobseeker', 'nationality', 'TEXT');
  addColumn('profiles_jobseeker', 'languages', 'TEXT');
  addColumn('profiles_jobseeker', 'profile_views', 'INTEGER DEFAULT 0');
  addColumn('profiles_jobseeker', 'last_active', 'TEXT');
  // Jobseeker credit system columns
  addColumn('profiles_jobseeker', 'current_alert_credits', 'INTEGER DEFAULT 0');
  addColumn('profiles_jobseeker', 'auto_apply_enabled', 'INTEGER DEFAULT 0');
  addColumn('profiles_jobseeker', 'has_standard_trial_activated', 'INTEGER DEFAULT 0');
  addColumn('profiles_jobseeker', 'standard_trial_end_date', 'TEXT');
  addColumn('profiles_jobseeker', 'has_premium_indefinite_trial', 'INTEGER DEFAULT 0');
  addColumn('profiles_jobseeker', 'premium_trial_override_by', 'TEXT');
  addColumn('profiles_jobseeker', 'last_annual_credit_reset_year', 'INTEGER');
  addColumn('profiles_jobseeker', 'active_package_id', 'INTEGER');

  addColumn('profiles_employer', 'phone', 'TEXT');
  addColumn('profiles_employer', 'address', 'TEXT');
  addColumn('profiles_employer', 'city', 'TEXT');
  addColumn('profiles_employer', 'featured', 'INTEGER DEFAULT 0');
  addColumn('profiles_employer', 'subscription_plan_id', 'INTEGER');  // legacy
  addColumn('profiles_employer', 'plan_expires_at', 'TEXT');  // legacy
  addColumn('profiles_employer', 'total_jobs_posted', 'INTEGER DEFAULT 0');
  // Credit system columns
  addColumn('profiles_employer', 'current_job_posting_credits', 'INTEGER DEFAULT 0');
  addColumn('profiles_employer', 'current_ai_matching_credits', 'INTEGER DEFAULT 0');
  addColumn('profiles_employer', 'current_candidate_search_credits', 'INTEGER DEFAULT 0');
  addColumn('profiles_employer', 'feature_tier', "TEXT DEFAULT 'free'");
  addColumn('profiles_employer', 'has_standard_trial_activated', 'INTEGER DEFAULT 0');
  addColumn('profiles_employer', 'standard_trial_end_date', 'TEXT');
  addColumn('profiles_employer', 'has_premium_indefinite_trial', 'INTEGER DEFAULT 0');
  addColumn('profiles_employer', 'premium_trial_override_by', 'TEXT');
  addColumn('profiles_employer', 'last_annual_credit_reset_year', 'INTEGER');

  addColumn('jobs', 'featured', 'INTEGER DEFAULT 0');
  addColumn('jobs', 'apply_email', 'TEXT');
  addColumn('jobs', 'apply_url', 'TEXT');
  addColumn('jobs', 'company_name', 'TEXT');
  addColumn('jobs', 'applications_count', 'INTEGER DEFAULT 0');
  // Orders table migration: add new columns for credit system
  addColumn('orders', 'package_id', 'INTEGER');
  addColumn('orders', 'user_id', 'INTEGER');  // alias for employer_id (supports jobseeker orders)
  addColumn('orders', 'job_id', 'INTEGER');
  addColumn('orders', 'duration_days', 'INTEGER');
  addColumn('orders', 'ai_matching_addon', 'INTEGER DEFAULT 0');
  addColumn('orders', 'candidate_search_addon', 'INTEGER DEFAULT 0');
  addColumn('orders', 'approved_by', 'INTEGER');
  addColumn('orders', 'approved_at', 'TEXT');

  addColumn('jobs', 'price_per_day', 'REAL');
  addColumn('jobs', 'posting_days', 'INTEGER DEFAULT 30');
  addColumn('jobs', 'credits_used', 'INTEGER DEFAULT 1');
  
  // Task 3: Featured/Sponsored Jobs
  addColumn('jobs', 'is_featured', 'INTEGER DEFAULT 0');
  addColumn('jobs', 'featured_until', 'TEXT');
  
  // Task 5: Employer Verification Badge
  addColumn('users', 'is_verified', 'INTEGER DEFAULT 0');

  // Credit transaction indexes
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON credit_transactions(user_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(credit_type)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_packages_role ON packages(target_role, active)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)`);
  } catch(e) {}

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

// Ensure a legacy plan placeholder exists for new credit-based orders
try {
  const hasLegacyPlaceholder = db.prepare('SELECT id FROM plans WHERE id = 0').get();
  if (!hasLegacyPlaceholder) {
    db.prepare("INSERT INTO plans (id, name, price, currency, duration_days, job_limit, active) VALUES (0, 'Credit Package', 0, 'PGK', 0, 0, 0)").run();
  }
} catch(e) {}

// Seed credit packages if empty
const hasPackages = db.prepare('SELECT COUNT(*) as count FROM packages').get();
if (hasPackages.count === 0) {
  const pkgs = [
    // Employer packages
    ['Free Tier', 'employer-free', 'employer', 'free', 0, 'PGK', 'Basic free account — 1 job posting', 1, 0, 0, 0, 0, 'free', 0, 0, 0],
    ['Starter Pack', 'employer-starter', 'employer', 'service_package', 500, 'PGK', '5 job postings + 3 AI matches + 10 candidate searches', 5, 3, 10, 0, 0, 'basic', 0, 1, 0],
    ['Pro Pack', 'employer-pro', 'employer', 'service_package', 1800, 'PGK', '20 job postings + 15 AI matches + 50 candidate searches', 20, 15, 50, 0, 0, 'professional', 0, 2, 1],
    ['Enterprise Pack', 'employer-enterprise', 'employer', 'service_package', 7500, 'PGK', '100 job postings + unlimited AI matching & search', 100, 999, 999, 0, 0, 'enterprise', 0, 3, 0],
    ['Employer Trial', 'employer-trial', 'employer', 'standard_trial', 0, 'PGK', '14-day free trial with credits', 3, 2, 5, 0, 0, 'basic', 14, 4, 0],
    // Jobseeker packages
    ['Free Job Seeker', 'jobseeker-free', 'jobseeker', 'free', 0, 'PGK', 'Basic free account', 0, 0, 0, 0, 0, 'free', 0, 0, 0],
    ['Starter Alert Pack', 'jobseeker-starter', 'jobseeker', 'service_package', 20, 'PGK', '50 job alert credits', 0, 0, 0, 50, 0, 'basic', 0, 1, 0],
    ['Pro Alert Pack', 'jobseeker-pro', 'jobseeker', 'service_package', 60, 'PGK', '200 alert credits + auto-apply', 0, 0, 0, 200, 1, 'professional', 0, 2, 1],
    ['Premium Alert Pack', 'jobseeker-premium', 'jobseeker', 'service_package', 120, 'PGK', '500 alert credits + auto-apply', 0, 0, 0, 500, 1, 'professional', 0, 3, 0],
    ['Job Seeker Trial', 'jobseeker-trial', 'jobseeker', 'standard_trial', 0, 'PGK', '14-day free trial with alerts', 0, 0, 0, 20, 1, 'basic', 14, 4, 0],
  ];
  const insertPkg = db.prepare(`INSERT INTO packages (name, slug, target_role, package_type, price, currency, description, job_posting_credits, ai_matching_credits, candidate_search_credits, alert_credits, auto_apply_enabled, feature_tier, trial_duration_days, sort_order, popular) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  for (const p of pkgs) insertPkg.run(...p);
  console.log('🌱 Credit packages seeded');
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
