/**
 * Migration 055: Employer Profile Enhancements - Tagline, Banner, and Video
 * 
 * This migration adds three missing employer branding features:
 * 1. Tagline/Slogan (VARCHAR 150) - Short company motto/catchphrase
 * 2. Cover Photo/Banner (TEXT) - Hero image URL for employer profile
 * 3. Company Video URL (TEXT) - YouTube/Vimeo embed URL for employer profile
 * 
 * Matches industry standards:
 * - LinkedIn: Company tagline + cover photo
 * - Glassdoor: Company banner + video
 * - Indeed: Employer branding elements
 * 
 * @see EMPLOYER_PROFILES_JOBS_IMPROVEMENT_PLAN.md
 * @date 2026-05-07
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/wantokjobs.db');
const db = new Database(dbPath);

try {
  console.log('[Migration 055] Starting employer profile enhancements...');
  
  // Start transaction
  db.exec('BEGIN TRANSACTION');
  
  // Check if columns already exist (idempotent migration)
  const tableInfo = db.prepare(`PRAGMA table_info(profiles_employer)`).all();
  const existingColumns = tableInfo.map(col => col.name);
  
  const hasTagline = existingColumns.includes('tagline');
  const hasBanner = existingColumns.includes('cover_photo_url');
  const hasVideo = existingColumns.includes('company_video_url');
  
  // Add tagline column if missing
  if (!hasTagline) {
    console.log('[Migration 055] Adding tagline column...');
    db.exec(`
      ALTER TABLE profiles_employer 
      ADD COLUMN tagline VARCHAR(150) DEFAULT NULL
    `);
    console.log('[Migration 055] ✓ Added tagline column (max 150 chars)');
  } else {
    console.log('[Migration 055] ⊘ Skipping tagline column (already exists)');
  }
  
  // Add cover_photo_url column if missing
  if (!hasBanner) {
    console.log('[Migration 055] Adding cover_photo_url column...');
    db.exec(`
      ALTER TABLE profiles_employer 
      ADD COLUMN cover_photo_url TEXT DEFAULT NULL
    `);
    console.log('[Migration 055] ✓ Added cover_photo_url column (1920x400px recommended)');
  } else {
    console.log('[Migration 055] ⊘ Skipping cover_photo_url column (already exists)');
  }
  
  // Add company_video_url column if missing
  if (!hasVideo) {
    console.log('[Migration 055] Adding company_video_url column...');
    db.exec(`
      ALTER TABLE profiles_employer 
      ADD COLUMN company_video_url TEXT DEFAULT NULL
    `);
    console.log('[Migration 055] ✓ Added company_video_url column (YouTube/Vimeo URL)');
  } else {
    console.log('[Migration 055] ⊘ Skipping company_video_url column (already exists)');
  }
  
  // Commit transaction
  db.exec('COMMIT');
  
  console.log('[Migration 055] ✓ Migration completed successfully');
  console.log('[Migration 055] Summary:');
  console.log(`  - tagline: ${hasTagline ? 'already existed' : 'created'}`);
  console.log(`  - cover_photo_url: ${hasBanner ? 'already existed' : 'created'}`);
  console.log(`  - company_video_url: ${hasVideo ? 'already existed' : 'created'}`);
  
  db.close();
  process.exit(0);
  
} catch (error) {
  console.error('[Migration 055] ✗ Migration failed:', error.message);
  console.error(error);
  
  // Rollback on error
  try {
    db.exec('ROLLBACK');
    console.log('[Migration 055] Transaction rolled back');
  } catch (rollbackError) {
    console.error('[Migration 055] Rollback failed:', rollbackError.message);
  }
  
  db.close();
  process.exit(1);
}
