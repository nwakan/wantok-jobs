const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/wantokjobs.db');
const db = new Database(dbPath);

console.log('=== Migration 038: Premium Subscriptions System ===');
console.log('Database:', dbPath);

try {
  db.exec('BEGIN TRANSACTION');

  // 1. SUBSCRIPTION_TIERS TABLE
  console.log('\n1. Creating subscription_tiers table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscription_tiers (
      tier_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      tier_type TEXT NOT NULL CHECK(tier_type IN ('jobseeker', 'employer')),
      price_pgk INTEGER NOT NULL,
      price_usd REAL NOT NULL,
      billing_period TEXT NOT NULL CHECK(billing_period IN ('monthly', 'annual', 'per_job')),
      features TEXT NOT NULL,
      credits_per_period INTEGER DEFAULT 0,
      max_active_jobs INTEGER DEFAULT 0,
      priority_support INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      display_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  console.log('✅ subscription_tiers table created');

  // 2. USER_SUBSCRIPTIONS TABLE
  console.log('\n2. Creating user_subscriptions table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_subscriptions (
      subscription_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      tier_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      auto_renew INTEGER DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'cancelled', 'expired', 'pending')),
      payment_method TEXT,
      last_payment_date TEXT,
      next_billing_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (tier_id) REFERENCES subscription_tiers(tier_id) ON DELETE RESTRICT
    )
  `);
  console.log('✅ user_subscriptions table created');

  // 3. SUBSCRIPTION_FEATURES TABLE
  console.log('\n3. Creating subscription_features table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscription_features (
      feature_id INTEGER PRIMARY KEY AUTOINCREMENT,
      feature_name TEXT NOT NULL UNIQUE,
      feature_type TEXT NOT NULL,
      description TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  console.log('✅ subscription_features table created');

  // 4. SUBSCRIPTION_HISTORY TABLE
  console.log('\n4. Creating subscription_history table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscription_history (
      history_id INTEGER PRIMARY KEY AUTOINCREMENT,
      subscription_id INTEGER NOT NULL,
      billing_date TEXT NOT NULL,
      amount_pgk INTEGER NOT NULL,
      amount_usd REAL NOT NULL,
      payment_status TEXT NOT NULL CHECK(payment_status IN ('pending', 'paid', 'failed', 'refunded')),
      payment_method TEXT,
      transaction_id TEXT,
      invoice_url TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(subscription_id) ON DELETE CASCADE
    )
  `);
  console.log('✅ subscription_history table created');

  // 5. PERFORMANCE INDEXES
  console.log('\n5. Creating performance indexes...');
  db.exec(`CREATE INDEX IF NOT EXISTS idx_subscription_tiers_type ON subscription_tiers(tier_type, is_active)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id, status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_user_subscriptions_tier ON user_subscriptions(tier_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_user_subscriptions_dates ON user_subscriptions(end_date, status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_subscription_history_sub ON subscription_history(subscription_id, billing_date DESC)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_subscription_history_status ON subscription_history(payment_status, billing_date DESC)`);
  console.log('✅ 6 indexes created');

  // 6. SEED SUBSCRIPTION TIERS
  console.log('\n6. Seeding subscription tiers...');
  const insertTier = db.prepare(`
    INSERT INTO subscription_tiers (
      name, tier_type, price_pgk, price_usd, billing_period, features,
      credits_per_period, max_active_jobs, priority_support, display_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertTier.run('Premium Match', 'jobseeker', 19, 5.00, 'monthly',
    JSON.stringify(['ai_match_scoring', 'priority_applications', 'detailed_analytics', 'resume_optimization']),
    0, 0, 0, 1);
  insertTier.run('Premium Alerts', 'jobseeker', 15, 4.00, 'monthly',
    JSON.stringify(['instant_alerts', 'custom_filters', 'priority_notifications', 'saved_searches_unlimited']),
    0, 0, 0, 2);
  insertTier.run('Premium Plus', 'jobseeker', 29, 8.00, 'monthly',
    JSON.stringify(['ai_match_scoring', 'instant_alerts', 'priority_applications', 'resume_optimization', 'detailed_analytics', 'custom_filters', 'priority_support']),
    0, 0, 1, 3);
  insertTier.run('Premium Match', 'employer', 69, 19.00, 'per_job',
    JSON.stringify(['ai_candidate_matching', 'priority_listing', 'applicant_scoring', 'match_alerts']),
    0, 1, 0, 4);
  insertTier.run('Employer Pro', 'employer', 149, 40.00, 'monthly',
    JSON.stringify(['unlimited_jobs', 'ai_candidate_matching', 'priority_listing', 'advanced_analytics', 'applicant_tracking', 'custom_branding', 'team_accounts']),
    0, 10, 0, 5);
  insertTier.run('Employer Enterprise', 'employer', 399, 110.00, 'monthly',
    JSON.stringify(['unlimited_jobs', 'ai_candidate_matching', 'priority_listing', 'advanced_analytics', 'applicant_tracking', 'custom_branding', 'team_accounts', 'dedicated_support', 'custom_integration', 'api_access', 'white_label']),
    0, -1, 1, 6);
  console.log('✅ 6 subscription tiers seeded');

  // 7. SEED SUBSCRIPTION FEATURES
  console.log('\n7. Seeding subscription features...');
  const insertFeature = db.prepare(`INSERT INTO subscription_features (feature_name, feature_type, description) VALUES (?, ?, ?)`);
  const features = [
    ['ai_match_scoring', 'matching', 'AI-powered job-candidate match scoring'],
    ['priority_applications', 'application', 'Priority processing for applications'],
    ['detailed_analytics', 'analytics', 'Advanced analytics dashboard'],
    ['resume_optimization', 'profile', 'AI-powered resume optimization'],
    ['instant_alerts', 'notification', 'Real-time job alerts'],
    ['custom_filters', 'search', 'Advanced search filters'],
    ['priority_notifications', 'notification', 'Priority notification delivery'],
    ['saved_searches_unlimited', 'search', 'Unlimited saved searches'],
    ['ai_candidate_matching', 'matching', 'AI-powered candidate matching'],
    ['priority_listing', 'visibility', 'Priority search placement'],
    ['applicant_scoring', 'ats', 'Automatic applicant scoring'],
    ['match_alerts', 'notification', 'High-match candidate alerts'],
    ['unlimited_jobs', 'posting', 'Unlimited job postings'],
    ['advanced_analytics', 'analytics', 'Comprehensive analytics'],
    ['applicant_tracking', 'ats', 'Full ATS with pipeline management'],
    ['custom_branding', 'branding', 'Custom company branding'],
    ['team_accounts', 'collaboration', 'Multiple recruiter accounts'],
    ['dedicated_support', 'support', 'Dedicated account manager'],
    ['custom_integration', 'integration', 'Custom HR system integrations'],
    ['api_access', 'integration', 'API access for programmatic management'],
    ['white_label', 'branding', 'White-label solution']
  ];
  for (const [name, type, desc] of features) {
    insertFeature.run(name, type, desc);
  }
  console.log('✅ 21 subscription features seeded');

  db.exec('COMMIT');
  console.log('\n✅ Migration 038 completed successfully!');

} catch (error) {
  db.exec('ROLLBACK');
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
} finally {
  db.close();
}
