#!/usr/bin/env node
/**
 * Create employer profiles WITH user accounts for major PNG companies
 * This solves the FOREIGN KEY constraint issue
 */

require('dotenv').config();
const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

const DB_PATH = path.join(__dirname, '../server/data/wantokjobs.db');
const db = new Database(DB_PATH);

// Companies that need profiles (from our analysis)
const COMPANIES_TO_CREATE = [
  { name: 'United Nations', industry: 'International Organization', email: 'jobs@un.org' },
  { name: 'Ok Tedi Mining Limited', industry: 'Mining & Resources', email: 'careers@oktedi.com' },
  { name: 'Able Computing', industry: 'IT & Technology', email: 'jobs@ablecomputing.com.pg' },
  { name: 'Baker Boy', industry: 'Food & Beverage', email: 'careers@bakerboy.com.pg' },
  { name: 'CreditBank PNG', industry: 'Banking & Finance', email: 'hr@creditbank.com.pg' },
  { name: 'Wildlife Conservation Society PNG', industry: 'Conservation & NGO', email: 'jobs@wcspng.org' },
  { name: 'PNG Cocoa Coconut Institute', industry: 'Agriculture & Research', email: 'cci@ccipng.org' },
  { name: 'National Analytical Laboratory', industry: 'Government & Research', email: 'nal@gov.pg' },
  { name: 'University of Papua New Guinea', industry: 'Education', email: 'hr@upng.ac.pg' },
  { name: 'Woodland Park Zoo', industry: 'Conservation', email: 'jobs@zoo.org' },
  { name: 'PNG University of Technology', industry: 'Education', email: 'hr@unitech.ac.pg' },
  { name: 'Divine Word University', industry: 'Education', email: 'hr@dwu.ac.pg' },
];

console.log('🏢 Creating employer profiles with user accounts...\n');

const createEmployer = db.transaction((company) => {
  // Check if employer already exists
  const existing = db.prepare(`
    SELECT id, company_name FROM profiles_employer 
    WHERE LOWER(company_name) LIKE ?
  `).get(`%${company.name.toLowerCase()}%`);
  
  if (existing) {
    console.log(`  ✓ ${company.name} already exists (ID: ${existing.id})`);
    return existing.id;
  }
  
  // Create user account
  const email = company.email;
  const password = crypto.randomBytes(32).toString('hex'); // Random password
  const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
  
  try {
    const userInsert = db.prepare(`
      INSERT INTO users (email, password, role, created_at, updated_at)
      VALUES (?, ?, 'employer', datetime('now'), datetime('now'))
    `);
    
    const userResult = userInsert.run(email, hashedPassword);
    const userId = userResult.lastInsertRowid;
    
    // Create employer profile
    const empInsert = db.prepare(`
      INSERT INTO profiles_employer (
        user_id, company_name, industry, employer_type, verified, 
        description, feature_tier
      )
      VALUES (?, ?, ?, 'company', 0, ?, 'free')
    `);
    
    const empResult = empInsert.run(
      userId,
      company.name,
      company.industry,
      `${company.name} employer profile - Auto-created for job reassignment`
    );
    
    console.log(`  ✨ Created ${company.name} (Employer ID: ${empResult.lastInsertRowid}, User ID: ${userId})`);
    return empResult.lastInsertRowid;
    
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed: users.email')) {
      // User exists, try to find and create profile
      const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (user) {
        // Check if profile exists for this user
        const profile = db.prepare('SELECT id FROM profiles_employer WHERE user_id = ?').get(user.id);
        if (profile) {
          console.log(`  ℹ️  ${company.name} profile exists for user ${user.id}`);
          return profile.id;
        }
        
        // Create profile for existing user
        const empInsert = db.prepare(`
          INSERT INTO profiles_employer (
            user_id, company_name, industry, employer_type, verified,
            description, feature_tier
          )
          VALUES (?, ?, ?, 'company', 0, ?, 'free')
        `);
        
        const empResult = empInsert.run(
          user.id,
          company.name,
          company.industry,
          `${company.name} employer profile - Auto-created`
        );
        
        console.log(`  ✨ Created profile for existing user: ${company.name} (ID: ${empResult.lastInsertRowid})`);
        return empResult.lastInsertRowid;
      }
    }
    console.error(`  ❌ Failed to create ${company.name}:`, err.message);
    return null;
  }
});

COMPANIES_TO_CREATE.forEach(company => {
  createEmployer(company);
});

console.log('\n✅ Employer creation complete!\n');

// Show summary
console.log('📊 Employer profiles:');
const profiles = db.prepare(`
  SELECT id, company_name, industry, 
         (SELECT COUNT(*) FROM jobs WHERE employer_id = profiles_employer.id) as job_count
  FROM profiles_employer
  WHERE company_name IN (${COMPANIES_TO_CREATE.map(() => '?').join(',')})
`).all(...COMPANIES_TO_CREATE.map(c => c.name));

profiles.forEach(p => {
  console.log(`  [${p.id}] ${p.company_name} (${p.industry}) - ${p.job_count} jobs`);
});

db.close();
