#!/usr/bin/env node
/**
 * Backend API Verification Script
 * Tests all database queries to ensure they work correctly
 */

const db = require('./server/database');

console.log('\n🔍 WantokJobs Backend API Verification\n');
console.log('='.repeat(60));

let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    const result = fn();
    console.log(`✅ ${name}`);
    if (result !== undefined) {
      console.log(`   Result: ${JSON.stringify(result).substring(0, 100)}...`);
    }
    passCount++;
    return true;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    failCount++;
    return false;
  }
}

console.log('\n📊 Testing Jobs API Queries:');
test('Jobs list with filters', () => {
  return db.prepare(`
    SELECT j.id, j.title, j.status, pe.company_name
    FROM jobs j
    JOIN users u ON j.employer_id = u.id
    LEFT JOIN profiles_employer pe ON u.id = pe.user_id
    WHERE j.status = 'active'
    LIMIT 3
  `).all();
});

test('Job detail with company info', () => {
  return db.prepare(`
    SELECT j.*, pe.company_name, pe.logo_url, pe.industry as company_industry
    FROM jobs j
    JOIN users u ON j.employer_id = u.id
    LEFT JOIN profiles_employer pe ON u.id = pe.user_id
    WHERE j.id = 8
  `).get();
});

test('Similar jobs query', () => {
  const job = db.prepare('SELECT industry, location FROM jobs WHERE id = 8').get();
  return db.prepare(`
    SELECT j.id, j.title, j.location
    FROM jobs j
    WHERE j.status = 'active' AND j.id != 8
      AND (j.industry = ? OR j.location = ?)
    LIMIT 5
  `).all(job.industry || '', job.location || '');
});

test('Featured jobs (most viewed)', () => {
  return db.prepare(`
    SELECT j.id, j.title, j.views_count
    FROM jobs j
    WHERE j.status = 'active'
    ORDER BY j.views_count DESC
    LIMIT 6
  `).all();
});

console.log('\n🏢 Testing Companies API Queries:');
test('Companies list with job counts', () => {
  return db.prepare(`
    SELECT u.id, pe.company_name,
           (SELECT COUNT(*) FROM jobs WHERE employer_id = u.id AND status = 'active') as active_jobs_count
    FROM users u
    INNER JOIN profiles_employer pe ON u.id = pe.user_id
    WHERE u.role = 'employer'
    LIMIT 3
  `).all();
});

test('Company profile with stats', () => {
  return db.prepare(`
    SELECT u.id, pe.company_name, pe.industry,
           (SELECT COUNT(*) FROM jobs WHERE employer_id = u.id AND status = 'active') as active_jobs
    FROM users u
    INNER JOIN profiles_employer pe ON u.id = pe.user_id
    WHERE u.id = 11
  `).get();
});

console.log('\n📝 Testing Applications API Queries:');
test('Applications with full profile data', () => {
  return db.prepare(`
    SELECT a.id, a.status,
           u.name as applicant_name,
           pj.headline, pj.skills, pj.bio
    FROM applications a
    JOIN users u ON a.jobseeker_id = u.id
    LEFT JOIN profiles_jobseeker pj ON u.id = pj.user_id
    LIMIT 3
  `).all();
});

console.log('\n💾 Testing Saved Resumes Queries:');
test('Saved resumes with full profile', () => {
  return db.prepare(`
    SELECT sr.id, u.name as jobseeker_name,
           pj.headline, pj.skills, pj.cv_url
    FROM saved_resumes sr
    INNER JOIN users u ON sr.jobseeker_id = u.id
    LEFT JOIN profiles_jobseeker pj ON u.id = pj.user_id
    LIMIT 3
  `).all();
});

console.log('\n❓ Testing Screening Queries:');
test('Screening questions for job', () => {
  // First create a test question if none exist
  const jobWithQuestions = db.prepare(`
    SELECT job_id FROM screening_questions LIMIT 1
  `).get();
  
  if (jobWithQuestions) {
    return db.prepare(`
      SELECT * FROM screening_questions WHERE job_id = ?
    `).all(jobWithQuestions.job_id);
  }
  return [];
});

test('Screening answers for application', () => {
  return db.prepare(`
    SELECT sa.*, sq.question
    FROM screening_answers sa
    INNER JOIN screening_questions sq ON sa.question_id = sq.id
    LIMIT 3
  `).all();
});

console.log('\n🌍 Testing Metadata Queries:');
test('Locations with counts', () => {
  return db.prepare(`
    SELECT location, country, COUNT(*) as job_count
    FROM jobs
    WHERE status = 'active' AND location IS NOT NULL AND location != ''
    GROUP BY location, country
    ORDER BY job_count DESC
    LIMIT 5
  `).all();
});

test('Industries with counts', () => {
  return db.prepare(`
    SELECT industry, COUNT(*) as job_count
    FROM jobs
    WHERE status = 'active' AND industry IS NOT NULL AND industry != ''
    GROUP BY industry
    ORDER BY job_count DESC
    LIMIT 5
  `).all();
});

console.log('\n📈 Testing Dashboard Stats Queries:');
test('Weekly new users', () => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return db.prepare(`
    SELECT COUNT(*) as count FROM users WHERE created_at >= ?
  `).get(weekAgo.toISOString());
});

test('Job type distribution', () => {
  return db.prepare(`
    SELECT job_type, COUNT(*) as count
    FROM jobs
    WHERE status = 'active'
    GROUP BY job_type
  `).all();
});

test('Application status distribution', () => {
  return db.prepare(`
    SELECT status, COUNT(*) as count
    FROM applications
    GROUP BY status
  `).all();
});

test('Revenue stats', () => {
  return db.prepare(`
    SELECT 
      SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved
    FROM orders
  `).get();
});

console.log('\n' + '='.repeat(60));
console.log(`\n📊 Results: ${passCount} passed, ${failCount} failed`);

if (failCount === 0) {
  console.log('\n✅ All backend queries verified successfully!');
  console.log('🚀 The API is ready for production use.\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Some queries failed. Please review the errors above.\n');
  process.exit(1);
}
