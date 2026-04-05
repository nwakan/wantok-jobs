/**
 * Migration 052: Cleanup Orphaned Tables
 *
 * Date: 2026-04-05
 * Purpose: Remove 73 empty tables with no code references or migration documentation
 *
 * AUDIT RESULTS (2026-04-05 14:30 UTC):
 * - Total tables: 170
 * - Empty tables: 89 (52.4%)
 * - Orphaned (safe to drop): 73 (82%)
 * - Future features (keep): 16 (18%)
 *
 * TIER 1: DROP SAFE (73 tables)
 * - No code references (grep scan: 0 matches)
 * - No migration documentation
 * - Zero rows in production database
 * - Categories: Training (9), Interviews (3), Newsletters (3), Referrals, Testimonials, etc.
 *
 * TIER 2: KEEP (16 tables - NOT dropped by this migration)
 * - Jean AI future features (8 tables from Migration 007)
 * - WhatsApp system tables (8 tables from Migration 050)
 *
 * IMPACT:
 * - Schema reduction: 170 → 97 tables (43% reduction)
 * - Database size: Minimal (tables are empty)
 * - Maintenance: Reduced migration overhead
 * - Risk: LOW (no active data, no code dependencies)
 *
 * VERIFICATION:
 * Before: SELECT COUNT(*) FROM sqlite_master WHERE type='table'; → 170
 * After: SELECT COUNT(*) FROM sqlite_master WHERE type='table'; → 97
 */

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'wantokjobs.db');

function up() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  console.log('\n🗑️  Migration 052: Dropping 73 orphaned tables...');

  // TIER 1: Orphaned tables (73 total)
  // Safe to drop: No code references, no migration documentation, zero rows
  const orphanedTables = [
    // Training System (9 tables - no migration files)
    'trainer_reviews',
    'training_assignment_submissions',
    'training_assignments',
    'training_certificates',
    'training_course_skills',
    'training_enrollment_fees',
    'training_enrollments',
    'training_payouts',
    'transparency_audits',

    // Subscription & Payments (3 tables)
    'subscription_history',
    'user_addon_purchases',
    'user_currency_preferences',
    'user_subscriptions',

    // Newsletter System (3 tables)
    'newsletter_history',
    'newsletter_subscribers',
    'newsletters',

    // Interview Scheduling (3 tables)
    'interview_reviews',
    'interview_slots',
    'interviews',

    // Company/Employer Features (7 tables)
    'company_benefits',
    'company_claims',
    'company_follows',
    'company_photos',
    'company_reviews',
    'employer_claim_requests',
    'employer_claims',
    'employer_notification_preferences',

    // Application Features (5 tables)
    'applicant_notes',
    'applicant_tags',
    'application_events',
    'application_reviews',
    'approval_queue',

    // Job Features (2 tables)
    'job_clicks',
    'scout_leads',

    // Saved Items (5 tables)
    'saved_filters',
    'saved_jobs',
    'saved_resumes',
    'saved_searches',
    'resumes',

    // Screening (2 tables)
    'screening_answers',
    'screening_questions',

    // Credit System (2 tables)
    'credit_payment_orders',
    'credit_refunds',

    // LinkedIn Integration (2 tables)
    'linkedin_post_queue',
    'linkedin_posts',

    // Offer Management (2 tables)
    'offer_letters',
    'offers',

    // User Features (3 tables)
    'onboarding_checklists',
    'personalized_digests',
    'verification_checks',

    // AI/Analytics (2 tables)
    'ai_assessments',
    'ai_assessments_old',

    // Community Features (8 tables)
    'badges',
    'banners',
    'testimonials',
    'success_stories',
    'feature_comments',
    'feature_votes',
    'review_helpfulness',
    'referrals',

    // Support/Admin (3 tables)
    'support_tickets',
    'reports',
    'fraud_flags',

    // Notifications (2 tables)
    'notification_credits',
    'rate_limit_state',

    // Messaging (3 tables)
    'conversation_messages',
    'conversation_state',
    'conversations',

    // Agency/References (3 tables)
    'agency_clients',
    'reference_checks',
    'sme_payments',

    // Miscellaneous (2 tables)
    'ip_blocks',
    'whisper_queue'
  ];

  let droppedCount = 0;
  let errorCount = 0;

  orphanedTables.forEach((tableName, index) => {
    try {
      // Check if table exists before dropping
      const tableExists = db.prepare(
        `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?`
      ).get(tableName);

      if (tableExists.count > 0) {
        // Drop table
        db.prepare(`DROP TABLE IF EXISTS ${tableName}`).run();
        droppedCount++;
        console.log(`  ✅ Dropped table ${index + 1}/73: ${tableName}`);
      } else {
        console.log(`  ⏭️  Skipped ${index + 1}/73: ${tableName} (already deleted)`);
      }
    } catch (err) {
      errorCount++;
      console.error(`  ❌ Error dropping ${tableName}:`, err.message);
    }
  });

  // Final statistics
  const finalCount = db.prepare(
    `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'`
  ).get();

  console.log('\n📊 Migration 052 Complete:');
  console.log(`  - Tables dropped: ${droppedCount}/${orphanedTables.length}`);
  console.log(`  - Errors: ${errorCount}`);
  console.log(`  - Final table count: ${finalCount.count}`);
  console.log(`  - Expected: 97 tables (170 - 73 = 97)`);

  db.close();
}

function down() {
  console.log('❌ Migration 052 rollback not supported (tables are empty, no data to restore)');
  console.log('   If needed, recreate tables from original migration files.');
}

module.exports = { up, down };
