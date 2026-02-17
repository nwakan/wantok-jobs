#!/usr/bin/env node
/**
 * Add applications and hiring decisions to transparency jobs
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/wantokjobs.db');
const db = new Database(dbPath);

const pngNames = [
  'James Kila', 'Mary Koim', 'Peter Wama', 'Grace Kewa', 'John Naime',
  'Sarah Toke', 'David Kanau', 'Helen Bae', 'Michael Kup', 'Ruth Baiva',
  'Thomas Pato', 'Lucy Kori', 'Philip Asi', 'Anna Waripi', 'Daniel Gima',
  'Betty Koale', 'Mark Toua', 'Rose Kila', 'Paul Kewa', 'Jane Wama',
  'Robert Mondo', 'Susan Vele', 'Joseph Kone', 'Jennifer Aisi', 'Andrew Siune'
];

const provinces = [
  'National Capital District', 'Central', 'Morobe', 'Eastern Highlands',
  'Western Highlands', 'East New Britain', 'Madang', 'Southern Highlands'
];

console.log('Adding applications to transparency jobs...\n');

// Get or create test jobseekers
let jobseekers = db.prepare(`
  SELECT id, name FROM users WHERE role = 'jobseeker' LIMIT 100
`).all();

if (jobseekers.length < 25) {
  console.log('Creating test jobseekers...');
  const passwordHash = bcrypt.hashSync('TestPass123!', 10);
  
  for (let i = 0; i < 25; i++) {
    const name = pngNames[i];
    const email = `test-jobseeker-${i}@wantokjobs.com`;
    
    try {
      const result = db.prepare(`
        INSERT INTO users (email, password_hash, name, role, account_status)
        VALUES (?, ?, ?, 'jobseeker', 'active')
      `).run(email, passwordHash, name);
      
      jobseekers.push({ id: result.lastInsertRowid, name });
      console.log(`  ✓ Created: ${name}`);
    } catch (e) {
      // Already exists, try to get it
      const existing = db.prepare(`SELECT id, name FROM users WHERE email = ?`).get(email);
      if (existing) jobseekers.push(existing);
    }
  }
  console.log(`\nTotal jobseekers: ${jobseekers.length}\n`);
}

// Get transparent jobs that need applications
const jobs = db.prepare(`
  SELECT 
    j.id, j.title, j.employer_id, j.created_at,
    ht.selection_criteria
  FROM jobs j
  INNER JOIN hiring_transparency ht ON j.id = ht.job_id
  WHERE NOT EXISTS (SELECT 1 FROM applications WHERE job_id = j.id)
  ORDER BY j.created_at DESC
  LIMIT 15
`).all();

console.log(`Found ${jobs.length} jobs needing applications\n`);

let totalApps = 0;
let totalDecisions = 0;

for (const job of jobs) {
  console.log(`Job ${job.id}: ${job.title}`);
  
  const criteria = JSON.parse(job.selection_criteria || '[]');
  const numApplicants = Math.floor(Math.random() * 8) + 8; // 8-15
  
  // Select random applicants
  const selectedApplicants = [];
  const usedIndices = new Set();
  
  while (selectedApplicants.length < numApplicants && selectedApplicants.length < jobseekers.length) {
    const idx = Math.floor(Math.random() * jobseekers.length);
    if (!usedIndices.has(idx)) {
      usedIndices.add(idx);
      selectedApplicants.push(jobseekers[idx]);
    }
  }
  
  // Get panel info
  const panel = db.prepare('SELECT member_name FROM hiring_panel WHERE job_id = ? LIMIT 1').get(job.id);
  const decidedBy = panel ? panel.member_name : 'Panel';
  
  // Create applications
  for (let i = 0; i < selectedApplicants.length; i++) {
    const applicant = selectedApplicants[i];
    
    const appResult = db.prepare(`
      INSERT INTO applications (
        job_id, jobseeker_id, cover_letter, status, applied_at
      ) VALUES (?, ?, ?, 'applied', datetime('now', ?))
    `).run(
      job.id,
      applicant.id,
      `I am interested in the ${job.title} position and believe I have the qualifications needed.`,
      `-${Math.floor(Math.random() * 10) + 5} days`
    );
    
    const appId = appResult.lastInsertRowid;
    selectedApplicants[i].appId = appId;
    totalApps++;
  }
  
  console.log(`  • Created ${selectedApplicants.length} applications`);
  
  // Stage 1: All applied
  for (const app of selectedApplicants) {
    db.prepare(`
      INSERT INTO hiring_decisions (
        job_id, application_id, stage, decision, decided_by, decided_at
      ) VALUES (?, ?, 'applied', 'advance', 'System', datetime('now', ?))
    `).run(job.id, app.appId, `-${Math.floor(Math.random() * 8) + 4} days`);
    totalDecisions++;
  }
  
  // Stage 2: Screening - 60% pass
  const screeningCount = Math.floor(selectedApplicants.length * 0.6);
  for (let i = 0; i < selectedApplicants.length; i++) {
    const app = selectedApplicants[i];
    const passed = i < screeningCount;
    
    db.prepare(`
      INSERT INTO hiring_decisions (
        job_id, application_id, stage, decision, reasoning, decided_by, decided_at
      ) VALUES (?, ?, 'screening', ?, ?, ?, datetime('now', ?))
    `).run(
      job.id,
      app.appId,
      passed ? 'advance' : 'reject',
      passed ? 'Meets requirements' : 'Does not meet minimum qualifications',
      decidedBy,
      `-${Math.floor(Math.random() * 5) + 2} days`
    );
    totalDecisions++;
  }
  
  // Stage 3: Shortlist - 40% of original
  const shortlistCount = Math.floor(selectedApplicants.length * 0.4);
  for (let i = 0; i < screeningCount; i++) {
    const app = selectedApplicants[i];
    const shortlisted = i < shortlistCount;
    
    // Generate criterion scores
    const scores = {};
    let totalScore = 0;
    for (const crit of criteria) {
      const score = Math.floor(Math.random() * 30) + 60;
      scores[crit.criterion] = score;
      totalScore += score * (crit.weight_percent / 100);
    }
    
    db.prepare(`
      INSERT INTO hiring_decisions (
        job_id, application_id, stage, decision, reasoning, score, criteria_scores, decided_by, decided_at
      ) VALUES (?, ?, 'shortlisted', ?, ?, ?, ?, ?, datetime('now', ?))
    `).run(
      job.id,
      app.appId,
      shortlisted ? 'advance' : 'reject',
      shortlisted ? 'Strong candidate' : 'Other candidates scored higher',
      Math.round(totalScore),
      JSON.stringify(scores),
      decidedBy,
      `-${Math.floor(Math.random() * 3) + 1} days`
    );
    totalDecisions++;
  }
  
  console.log(`  • Shortlisted: ${shortlistCount} candidates`);
  
  // Stage 4: Interview - 50% of shortlist
  const interviewCount = Math.floor(shortlistCount * 0.5);
  for (let i = 0; i < shortlistCount; i++) {
    const app = selectedApplicants[i];
    const interviewed = i < interviewCount;
    const score = Math.floor(Math.random() * 25) + 65;
    
    db.prepare(`
      INSERT INTO hiring_decisions (
        job_id, application_id, stage, decision, reasoning, score, decided_by, decided_at
      ) VALUES (?, ?, 'interview', ?, ?, ?, ?, datetime('now', '-1 days'))
    `).run(
      job.id,
      app.appId,
      interviewed ? 'advance' : 'reject',
      interviewed ? 'Strong interview performance' : 'Other candidates stronger',
      score,
      decidedBy
    );
    totalDecisions++;
  }
  
  console.log(`  • Interviewed: ${interviewCount} candidates`);
  
  // 40% chance position is filled
  if (interviewCount > 0 && Math.random() < 0.4) {
    const hiredApp = selectedApplicants[0];
    
    db.prepare(`
      INSERT INTO hiring_decisions (
        job_id, application_id, stage, decision, decided_by
      ) VALUES (?, ?, 'offered', 'advance', ?)
    `).run(job.id, hiredApp.appId, decidedBy);
    totalDecisions++;
    
    db.prepare(`
      INSERT INTO hiring_decisions (
        job_id, application_id, stage, decision, decided_by
      ) VALUES (?, ?, 'hired', 'advance', ?)
    `).run(job.id, hiredApp.appId, decidedBy);
    totalDecisions++;
    
    // Calculate time to hire
    const daysAgo = Math.floor(Math.random() * 20) + 25; // 25-45 days
    
    // Generate stats
    const genderStats = {
      male: Math.floor(selectedApplicants.length * 0.55),
      female: Math.floor(selectedApplicants.length * 0.4),
      other: 0,
      undisclosed: selectedApplicants.length - Math.floor(selectedApplicants.length * 0.55) - Math.floor(selectedApplicants.length * 0.4)
    };
    
    const provincialStats = {};
    const numProvinces = Math.floor(Math.random() * 4) + 3;
    for (let p = 0; p < numProvinces; p++) {
      const province = provinces[p % provinces.length];
      provincialStats[province] = Math.floor(Math.random() * 4) + 1;
    }
    
    db.prepare(`
      UPDATE hiring_transparency
      SET 
        position_filled = 1,
        time_to_hire_days = ?,
        gender_stats = ?,
        provincial_stats = ?,
        outcome_published = 1,
        outcome_published_at = datetime('now')
      WHERE job_id = ?
    `).run(daysAgo, JSON.stringify(genderStats), JSON.stringify(provincialStats), job.id);
    
    console.log(`  ✓ HIRED: ${hiredApp.name} (${daysAgo} days)`);
  }
  
  // Update counts
  db.prepare(`
    UPDATE hiring_transparency
    SET 
      application_count = ?,
      shortlist_count = ?,
      interview_count = ?
    WHERE job_id = ?
  `).run(selectedApplicants.length, shortlistCount, interviewCount, job.id);
  
  console.log('');
}

console.log(`${'='.repeat(60)}`);
console.log(`Summary:`);
console.log(`  Jobs processed: ${jobs.length}`);
console.log(`  Applications created: ${totalApps}`);
console.log(`  Decisions recorded: ${totalDecisions}`);
console.log(`${'='.repeat(60)}\n`);

console.log('✅ Complete!');

db.close();
