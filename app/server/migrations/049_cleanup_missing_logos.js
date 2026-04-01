const db = require('../database');
const logger = require('../utils/logger');

module.exports = {
  up: () => {
    logger.info('Migration 049: Cleaning up missing employer logos');

    // List of logo filenames that don't exist in filesystem
    const missingLogos = [
      'air-vanuatu.png',
      'asian-development-bank-adb-pacific.png',
      'government-of-kiribati-63214.png',
      'government-of-nauru-63218.png',
      'government-of-samoa-63211.png',
      'various-employers.png',
      '202203070340163FMM-btJ_400x400.png'
    ];

    // Set logo_url to NULL for employers with missing logos
    missingLogos.forEach(logo => {
      const result = db.prepare(`
        UPDATE users 
        SET logo_url = NULL 
        WHERE role = 'employer' 
        AND logo_url LIKE '%' || ? || '%'
      `).run(logo);

      if (result.changes > 0) {
        logger.info(`Cleaned ${result.changes} employer(s) with missing logo: ${logo}`);
      }
    });

    logger.info('Migration 049 complete: Missing logos cleaned up');
  },

  down: () => {
    logger.warn('Migration 049 down: Cannot restore logo URLs (data loss)');
    // Cannot reverse this migration without backup
  }
};
