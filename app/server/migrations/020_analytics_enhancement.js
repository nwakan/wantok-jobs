const logger = require('../utils/logger');

module.exports = {
  name: '020_analytics_enhancement',
  description: 'Add analytics caching and enhanced tracking fields',

  up: (db) => {
    logger.info('Running migration: 020_analytics_enhancement');

    // Create analytics_cache table for performance optimization
    db.exec(`
      CREATE TABLE IF NOT EXISTS analytics_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        metric_name TEXT UNIQUE NOT NULL,
        metric_value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now')),
        expires_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_analytics_cache_name ON analytics_cache(metric_name);
      CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires ON analytics_cache(expires_at);
    `);

    // Add tracking fields to jobs table if they don't exist
    const addColumn = (table, column, type) => {
      try {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
        logger.info(`Added column ${column} to ${table}`);
      } catch (e) {
        if (e.message.includes('duplicate column')) {
          logger.info(`Column ${column} already exists in ${table}`);
        } else {
          throw e;
        }
      }
    };

    addColumn('jobs', 'views INTEGER DEFAULT 0');
    addColumn('jobs', 'last_viewed_at TEXT');
    addColumn('jobs', 'unique_viewers INTEGER DEFAULT 0');
    addColumn('applications', 'source_channel TEXT');

    // Create job_views tracking table for detailed analytics
    db.exec(`
      CREATE TABLE IF NOT EXISTS job_views (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER NOT NULL,
        viewer_id INTEGER,
        viewer_ip TEXT,
        viewed_at TEXT DEFAULT (datetime('now')),
        source_channel TEXT,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_job_views_job ON job_views(job_id);
      CREATE INDEX IF NOT EXISTS idx_job_views_viewer ON job_views(viewer_id);
      CREATE INDEX IF NOT EXISTS idx_job_views_date ON job_views(viewed_at);
    `);

    logger.info('✅ Migration 020_analytics_enhancement completed');
  },

  down: (db) => {
    logger.info('Reverting migration: 020_analytics_enhancement');
    db.exec('DROP TABLE IF EXISTS analytics_cache');
    db.exec('DROP TABLE IF EXISTS job_views');
    // Note: Cannot remove columns from SQLite tables easily
    logger.info('✅ Migration 020_analytics_enhancement reverted');
  }
};
