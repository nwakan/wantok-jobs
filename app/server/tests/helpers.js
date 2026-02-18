/**
 * Test Helpers
 * Provides utilities for testing without Jest/Mocha
 */
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

let testCounter = 0;

/**
 * Create an in-memory SQLite database with WantokJobs schema
 */
function createTestDb() {
  const db = new Database(':memory:');
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Copy schema from production database.js
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('jobseeker', 'employer', 'admin')),
      name TEXT NOT NULL,
      phone TEXT,
      status TEXT DEFAULT 'active',
      email_verified INTEGER DEFAULT 0,
      featured INTEGER DEFAULT 0,
      last_login TEXT,
      avatar_url TEXT,
      oauth_provider TEXT,
      oauth_id TEXT,
      is_verified INTEGER DEFAULT 0,
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
      skills TEXT,
      work_history TEXT,
      education TEXT,
      cv_url TEXT,
      desired_job_type TEXT,
      desired_salary_min REAL,
      desired_salary_max REAL,
      availability TEXT,
      profile_complete INTEGER DEFAULT 0,
      headline TEXT,
      gender TEXT,
      date_of_birth TEXT,
      nationality TEXT,
      languages TEXT,
      profile_views INTEGER DEFAULT 0,
      last_active TEXT,
      current_alert_credits INTEGER DEFAULT 0,
      auto_apply_enabled INTEGER DEFAULT 0,
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
      phone TEXT,
      address TEXT,
      city TEXT,
      featured INTEGER DEFAULT 0,
      subscription_plan_id INTEGER,
      plan_expires_at TEXT,
      total_jobs_posted INTEGER DEFAULT 0,
      current_job_posting_credits INTEGER DEFAULT 0,
      current_ai_matching_credits INTEGER DEFAULT 0,
      current_candidate_search_credits INTEGER DEFAULT 0,
      feature_tier TEXT DEFAULT 'free',
      employer_type TEXT,
      transparency_score REAL,
      transparency_required INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employer_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      requirements TEXT,
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
      featured INTEGER DEFAULT 0,
      apply_email TEXT,
      apply_url TEXT,
      company_name TEXT,
      applications_count INTEGER DEFAULT 0,
      remote_work INTEGER DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      data TEXT,
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

    CREATE TABLE IF NOT EXISTS packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      target_role TEXT NOT NULL CHECK(target_role IN ('employer', 'jobseeker')),
      package_type TEXT NOT NULL CHECK(package_type IN ('service_package', 'standard_trial', 'premium_indefinite_trial', 'free')),
      price REAL NOT NULL DEFAULT 0,
      currency TEXT DEFAULT 'PGK',
      description TEXT,
      job_posting_credits INTEGER DEFAULT 0,
      ai_matching_credits INTEGER DEFAULT 0,
      candidate_search_credits INTEGER DEFAULT 0,
      alert_credits INTEGER DEFAULT 0,
      auto_apply_enabled INTEGER DEFAULT 0,
      feature_tier TEXT DEFAULT 'free' CHECK(feature_tier IN ('free', 'basic', 'professional', 'enterprise')),
      trial_duration_days INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      popular INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS credit_wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      balance INTEGER DEFAULT 0,
      reserved_balance INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

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

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_employer ON jobs(employer_id);
    CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
    CREATE INDEX IF NOT EXISTS idx_applications_jobseeker ON applications(jobseeker_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
  `);
  
  return db;
}

/**
 * Simple assertion
 */
function assert(condition, message) {
  testCounter++;
  if (!condition) {
    const error = new Error(message || 'Assertion failed');
    error.testNumber = testCounter;
    throw error;
  }
  console.log(`  ✓ ${message || 'Passed'}`);
}

/**
 * Assert equality (deep comparison for objects/arrays)
 */
function assertEqual(actual, expected, message) {
  const prefix = message ? `${message}: ` : '';
  
  // Handle null/undefined
  if (actual === expected) {
    return assert(true, `${prefix}${JSON.stringify(expected)}`);
  }
  
  // Deep comparison for objects/arrays
  if (typeof actual === 'object' && typeof expected === 'object' && actual !== null && expected !== null) {
    const actualStr = JSON.stringify(actual, Object.keys(actual).sort());
    const expectedStr = JSON.stringify(expected, Object.keys(expected).sort());
    if (actualStr !== expectedStr) {
      throw new Error(`${prefix}Expected ${expectedStr}, got ${actualStr}`);
    }
    return assert(true, `${prefix}objects match`);
  }
  
  if (actual !== expected) {
    throw new Error(`${prefix}Expected ${expected}, got ${actual}`);
  }
  
  assert(true, `${prefix}${expected}`);
}

/**
 * Assert string contains substring
 */
function assertContains(str, substr, message) {
  const prefix = message ? `${message}: ` : '';
  if (!str || typeof str !== 'string') {
    throw new Error(`${prefix}Expected string, got ${typeof str}`);
  }
  if (!str.includes(substr)) {
    throw new Error(`${prefix}Expected "${str}" to contain "${substr}"`);
  }
  assert(true, `${prefix}contains "${substr}"`);
}

/**
 * Create a test user with bcrypt password
 */
function createTestUser(db, overrides = {}) {
  const defaults = {
    email: `test${Date.now()}@example.com`,
    password: 'password123',
    role: 'jobseeker',
    name: 'Test User',
  };
  
  const user = { ...defaults, ...overrides };
  const passwordHash = bcrypt.hashSync(user.password, 10);
  
  const result = db.prepare(`
    INSERT INTO users (email, password_hash, role, name)
    VALUES (?, ?, ?, ?)
  `).run(user.email, passwordHash, user.role, user.name);
  
  return {
    id: result.lastInsertRowid,
    ...user,
    password_hash: passwordHash,
  };
}

/**
 * Create a test job
 */
function createTestJob(db, employerId, overrides = {}) {
  const defaults = {
    title: 'Test Job',
    description: 'Test job description',
    location: 'Port Moresby',
    country: 'Papua New Guinea',
    job_type: 'full-time',
    status: 'active',
  };
  
  const job = { ...defaults, ...overrides };
  
  const result = db.prepare(`
    INSERT INTO jobs (employer_id, title, description, location, country, job_type, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(employerId, job.title, job.description, job.location, job.country, job.job_type, job.status);
  
  return {
    id: result.lastInsertRowid,
    employer_id: employerId,
    ...job,
  };
}

/**
 * Create a mock Express request object
 */
function mockRequest(overrides = {}) {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ip: '127.0.0.1',
    ...overrides,
  };
}

/**
 * Create a mock Express response object
 */
function mockResponse() {
  const res = {
    statusCode: 200,
    data: null,
    headers: {},
  };
  
  res.status = function(code) {
    res.statusCode = code;
    return res;
  };
  
  res.json = function(data) {
    res.data = data;
    return res;
  };
  
  res.send = function(data) {
    res.data = data;
    return res;
  };
  
  res.setHeader = function(key, value) {
    res.headers[key] = value;
    return res;
  };
  
  return res;
}

module.exports = {
  createTestDb,
  assert,
  assertEqual,
  assertContains,
  createTestUser,
  createTestJob,
  mockRequest,
  mockResponse,
};
