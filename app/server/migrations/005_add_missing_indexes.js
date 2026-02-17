/**
 * 005: Add missing indexes for performance
 */

module.exports = {
  up(db) {
    const indexes = [
      // applications(jobseeker_id, job_id) unique — already exists as UNIQUE constraint, but ensure index
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_jobseeker_job ON applications(jobseeker_id, job_id)",
      // application_events(application_id)
      "CREATE INDEX IF NOT EXISTS idx_application_events_app ON application_events(application_id)",
      // notifications(user_id, read)
      "CREATE INDEX IF NOT EXISTS idx_notifications_user_read_v2 ON notifications(user_id, read)",
      // job_views(job_id, viewed_at)
      "CREATE INDEX IF NOT EXISTS idx_job_views_job_viewed ON job_views(job_id, viewed_at)",
      // users(account_status)
      "CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status)",
      // users(force_password_reset)
      "CREATE INDEX IF NOT EXISTS idx_users_force_pw_reset ON users(force_password_reset)",
    ];

    let created = 0;
    for (const sql of indexes) {
      try {
        db.exec(sql);
        created++;
      } catch (err) {
        // Table might not exist (e.g., job_views), skip gracefully
        if (err.message.includes('no such table')) {
          console.log(`    → Skipped (table missing): ${sql.split(' ON ')[1]}`);
        } else {
          throw err;
        }
      }
    }
    console.log(`    → Created/verified ${created} indexes`);
  },

  down(db) {
    const drops = [
      "DROP INDEX IF EXISTS idx_applications_jobseeker_job",
      "DROP INDEX IF EXISTS idx_application_events_app",
      "DROP INDEX IF EXISTS idx_notifications_user_read_v2",
      "DROP INDEX IF EXISTS idx_job_views_job_viewed",
      "DROP INDEX IF EXISTS idx_users_account_status",
      "DROP INDEX IF EXISTS idx_users_force_pw_reset",
    ];
    for (const sql of drops) {
      db.exec(sql);
    }
    console.log('    → Dropped migration indexes');
  }
};
