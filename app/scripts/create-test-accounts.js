/**
 * Create Test Accounts for Facebook App Review
 * 
 * Creates 3 test accounts with proper bcrypt password hashing:
 * 1. reviewer+jobseeker@wantokjobs.com (Jobseeker)
 * 2. reviewer+employer@wantokjobs.com (Employer)
 * 3. reviewer+admin@wantokjobs.com (Admin)
 * 
 * Password: FacebookReview2026!
 * 
 * @date 2026-05-07
 */

const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../server/data/wantokjobs.db');
const db = new Database(dbPath);

const PASSWORD = 'FacebookReview2026!';
const SALT_ROUNDS = 10;

// Test accounts to create
const accounts = [
  {
    email: 'reviewer+jobseeker@wantokjobs.com',
    name: 'Test Jobseeker (Facebook Review)',
    role: 'jobseeker',
  },
  {
    email: 'reviewer+employer@wantokjobs.com',
    name: 'Test Employer (Facebook Review)',
    role: 'employer',
  },
  {
    email: 'reviewer+admin@wantokjobs.com',
    name: 'Test Admin (Facebook Review)',
    role: 'admin',
  },
];

async function createTestAccounts() {
  console.log('[Create Test Accounts] Starting...');
  console.log('[Create Test Accounts] Password:', PASSWORD);
  console.log('');

  try {
    // Hash password once (same password for all accounts)
    console.log('[Create Test Accounts] Hashing password with bcrypt...');
    const hashedPassword = await bcrypt.hash(PASSWORD, SALT_ROUNDS);
    console.log('[Create Test Accounts] ✓ Password hashed successfully');
    console.log('[Create Test Accounts] Hash:', hashedPassword.substring(0, 20) + '...');
    console.log('');

    db.exec('BEGIN TRANSACTION');

    for (const account of accounts) {
      console.log(`[Create Test Accounts] Creating account: ${account.email}`);

      // Check if account already exists
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(account.email);
      if (existing) {
        console.log(`[Create Test Accounts] ⊘ Account already exists (id: ${existing.id}), skipping...`);
        continue;
      }

      // Insert user account
      const insertUser = db.prepare(`
        INSERT INTO users (email, password_hash, name, role, is_verified, email_verified, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, 1, datetime('now'), datetime('now'))
      `);

      const result = insertUser.run(
        account.email,
        hashedPassword,
        account.name,
        account.role
      );

      const userId = result.lastInsertRowid;
      console.log(`[Create Test Accounts] ✓ User created (id: ${userId})`);

      // Create role-specific profile
      if (account.role === 'jobseeker') {
        const insertProfile = db.prepare(`
          INSERT INTO profiles_jobseeker (
            user_id, phone, location, country, bio
          ) VALUES (?, ?, ?, ?, ?)
        `);

        insertProfile.run(
          userId,
          '+675 XXX XXXX',
          'Port Moresby',
          'Papua New Guinea',
          'Test jobseeker account for Facebook App Review. This account is used for testing Facebook Login integration.'
        );
        console.log(`[Create Test Accounts] ✓ Jobseeker profile created`);
      } else if (account.role === 'employer') {
        const insertProfile = db.prepare(`
          INSERT INTO profiles_employer (
            user_id, company_name, industry, company_size, location, country,
            description
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        insertProfile.run(
          userId,
          'Test Company (Facebook Review)',
          'Information Technology',
          '11-50',
          'Port Moresby',
          'Papua New Guinea',
          'Test employer account for Facebook App Review. This account is used for testing Facebook Login integration and employer features.'
        );
        console.log(`[Create Test Accounts] ✓ Employer profile created`);
      }
      // Admin accounts don't have profiles

      console.log('');
    }

    db.exec('COMMIT');
    console.log('[Create Test Accounts] ✓ All test accounts created successfully');
    console.log('');
    console.log('=== TEST CREDENTIALS ===');
    console.log('Email: reviewer+jobseeker@wantokjobs.com');
    console.log('Email: reviewer+employer@wantokjobs.com');
    console.log('Email: reviewer+admin@wantokjobs.com');
    console.log('Password: FacebookReview2026!');
    console.log('');
    console.log('Valid for 1 year from creation date (expires May 2027)');
    console.log('');

    db.close();
    process.exit(0);
  } catch (error) {
    console.error('[Create Test Accounts] ✗ Error:', error.message);
    console.error(error);

    try {
      db.exec('ROLLBACK');
      console.log('[Create Test Accounts] Transaction rolled back');
    } catch (rollbackError) {
      console.error('[Create Test Accounts] Rollback failed:', rollbackError.message);
    }

    db.close();
    process.exit(1);
  }
}

createTestAccounts();
