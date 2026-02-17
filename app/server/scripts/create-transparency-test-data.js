#!/usr/bin/env node
/**
 * Create Test Data for Transparency Framework
 * Creates jobs, applications, hiring decisions, panel members, and transparency data
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/wantokjobs.db');
const db = new Database(dbPath);

// Sample PNG names for test applicants
const pngNames = [
  'James Kila', 'Mary Koim', 'Peter Wama', 'Grace Kewa', 'John Naime',
  'Sarah Toke', 'David Kanau', 'Helen Bae', 'Michael Kup', 'Ruth Baiva',
  'Thomas Pato', 'Lucy Kori', 'Philip Asi', 'Anna Waripi', 'Daniel Gima',
  'Betty Koale', 'Mark Toua', 'Rose Kila', 'Paul Kewa', 'Jane Wama'
];

// Selection criteria templates
const criteriaTemplates = {
  senior: [
    { criterion: 'Relevant work experience', weight_percent: 30, description: 'Minimum 7 years in similar role' },
    { criterion: 'Educational qualifications', weight_percent: 20, description: 'University degree required' },
    { criterion: 'Leadership skills', weight_percent: 25, description: 'Demonstrated team management experience' },
    { criterion: 'Technical expertise', weight_percent: 15, description: 'Industry-specific knowledge' },
    { criterion: 'Interview performance', weight_percent: 10, description: 'Communication and problem-solving' },
  ],
  mid: [
    { criterion: 'Relevant experience', weight_percent: 35, description: 'Minimum 3-5 years' },
    { criterion: 'Educational qualifications', weight_percent: 25, description: 'Diploma or degree' },
    { criterion: 'Technical skills', weight_percent: 20, description: 'Job-specific competencies' },
    { criterion: 'Interview performance', weight_percent: 20, description: 'Communication skills' },
  ],
  entry: [
    { criterion: 'Educational qualifications', weight_percent: 40, description: 'Relevant diploma or degree' },
    { criterion: 'Relevant experience or internships', weight_percent: 20, description: 'Any work experience' },
    { criterion: 'Aptitude test', weight_percent: 20, description: 'Problem-solving ability' },
    { criterion: 'Interview performance', weight_percent: 20, description: 'Communication and enthusiasm' },
  ],
};

// Job templates
const jobTemplates = [
  { title: 'Senior Policy Advisor', level: 'senior', salary: [120000, 150000], category: 'Policy & Strategy' },
  { title: 'Project Manager', level: 'mid', salary: [80000, 100000], category: 'Project Management' },
  { title: 'Finance Officer', level: 'mid', salary: [70000, 85000], category: 'Accounting & Finance' },
  { title: 'HR Coordinator', level: 'mid', salary: [65000, 80000], category: 'Human Resources' },
  { title: 'Communications Officer', level: 'entry', salary: [50000, 65000], category: 'Marketing & Communications' },
  { title: 'Research Analyst', level: 'mid', salary: [70000, 90000], category: 'Research & Analysis' },
  { title: 'IT Support Specialist', level: 'entry', salary: [55000, 70000], category: 'Information Technology' },
  { title: 'Procurement Officer', level: 'mid', salary: [65000, 80000], category: 'Supply Chain & Logistics' },
  { title: 'Legal Officer', level: 'mid', salary: [75000, 95000], category: 'Legal' },
  { title: 'Engineering Technician', level: 'entry', salary: [60000, 75000], category: 'Engineering' },
];

// Panel member names (PNG context)
const panelMembers = [
  { name: 'John Kewa', title: 'Director of HR', independent: false },
  { name: 'Mary Toua', title: 'Deputy Secretary', independent: false },
  { name: 'Peter Kanau', title: 'Section Head', independent: false },
  { name: 'Grace Bae', title: 'External Consultant', independent: true },
  { name: 'Dr. James Wama', title: 'Independent Expert', independent: true },
  { name: 'Sarah Kila', title: 'PSC Representative', independent: true },
];

// Provinces for stats
const provinces = [
  'National Capital District', 'Central', 'Morobe', 'Eastern Highlands', 
  'Western Highlands', 'East New Britain', 'Madang', 'Southern Highlands',
  'Western', 'Gulf', 'Milne Bay', 'East Sepik'
];

console.log('Creating Transparency Test Data...\n');

// Get 10 transparent employers (mix of types)
const employers = db.prepare(`
  SELECT 
    u.id,
    pe.company_name,
    pe.employer_type
  FROM users u
  JOIN profiles_employer pe ON u.id = pe.user_id
  WHERE pe.transparency_required = 1
  ORDER BY RANDOM()
  LIMIT 10
`).all();

console.log(`Selected ${employers.length} employers for test data\n`);

// Get some existing jobseekers for applications
let jobseekers = db.prepare(`
  SELECT id, name, email
  FROM users
  WHERE role = 'jobseeker'
  LIMIT 50
`).all();

// If not enough jobseekers, create some test ones
if (jobseekers.length < 20) {
  console.log('Creating additional test jobseekers...');
  const bcrypt = require('bcryptjs');
  const passwordHash = bcrypt.hashSync('TestPassword123!', 10);
  
  for (let i = jobseekers.length; i < 20; i++) {
    const name = pngNames[i % pngNames.length];
    const email = `jobseeker-${i}@test.wantokjobs.com`;
    
    try {
      const result = db.prepare(`
        INSERT INTO users (email, password_hash, name, role, account_status)
        VALUES (?, ?, ?, 'jobseeker', 'active')
      `).run(email, passwordHash, name);
      
      jobseekers.push({ id: result.lastInsertRowid, name, email });
    } catch (e) {
      // Skip if exists
    }
  }
  console.log(`Now have ${jobseekers.length} jobseekers\n`);
}

let totalJobsCreated = 0;
let totalApplicationsCreated = 0;
let totalDecisionsCreated = 0;
let totalPanelMembersCreated = 0;

// For each employer, create 1-2 jobs
for (const employer of employers) {
  console.log(`\n=== ${employer.company_name} (${employer.employer_type}) ===`);
  
  const numJobs = Math.random() > 0.5 ? 2 : 1;
  
  for (let j = 0; j < numJobs; j++) {
    const jobTemplate = jobTemplates[Math.floor(Math.random() * jobTemplates.length)];
    const criteria = criteriaTemplates[jobTemplate.level];
    
    // Create job
    const closingDate = new Date();
    closingDate.setDate(closingDate.getDate() - Math.floor(Math.random() * 30) - 10); // 10-40 days ago
    
    const jobResult = db.prepare(`
      INSERT INTO jobs (
        employer_id, title, description, requirements, location, industry,
        job_type, status, application_deadline, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'full-time', ?, ?, datetime('now', ?))
    `).run(
      employer.id,
      jobTemplate.title,
      `We are seeking a qualified ${jobTemplate.title} to join our team. This is an excellent opportunity to work in ${employer.company_name}.`,
      `• ${criteria.map(c => c.description).join('\\n• ')}\\n• Must be a PNG citizen\\n• Strong communication skills`,
      'Port Moresby, National Capital District',
      jobTemplate.category,
      Math.random() > 0.3 ? 'active' : 'closed',
      closingDate.toISOString(),
      `-${Math.floor(Math.random() * 30) + 20} days` // Created 20-50 days ago
    );
    
    const jobId = jobResult.lastInsertRowid;
    totalJobsCreated++;
    
    console.log(`  ✓ Created job: ${jobTemplate.title} (ID: ${jobId})`);
    
    // Create transparency data
    db.prepare(`
      INSERT INTO hiring_transparency (
        job_id, salary_band_min, salary_band_max, salary_currency,
        selection_criteria, original_closing_date, closing_date_enforced
      ) VALUES (?, ?, ?, 'PGK', ?, ?, 1)
    `).run(
      jobId,
      jobTemplate.salary[0],
      jobTemplate.salary[1],
      JSON.stringify(criteria),
      closingDate.toISOString()
    );
    
    // Create hiring panel (3-5 members)
    const panelSize = Math.floor(Math.random() * 3) + 3; // 3-5 members
    const selectedPanel = [];
    
    for (let p = 0; p < panelSize; p++) {
      const member = panelMembers[p % panelMembers.length];
      db.prepare(`
        INSERT INTO hiring_panel (
          job_id, member_name, member_role, member_title, is_independent
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        jobId,
        member.name,
        p === 0 ? 'Chair' : (member.independent ? 'External Assessor' : 'Member'),
        member.title,
        member.independent ? 1 : 0
      );
      totalPanelMembersCreated++;
      selectedPanel.push(member);
    }
    
    console.log(`    • Panel: ${panelSize} members (${selectedPanel.filter(m => m.independent).length} independent)`);
    
    // Create applications (8-15 per job)
    const numApplications = Math.floor(Math.random() * 8) + 8;
    const selectedApplicants = [];
    
    for (let a = 0; a < numApplications; a++) {
      const applicant = jobseekers[Math.floor(Math.random() * jobseekers.length)];
      
      try {
        const appResult = db.prepare(`
          INSERT INTO applications (
            job_id, user_id, cover_letter, status, created_at
          ) VALUES (?, ?, ?, 'pending', datetime('now', ?))
        `).run(
          jobId,
          applicant.id,
          `I am writing to express my interest in the ${jobTemplate.title} position.`,
          `-${Math.floor(Math.random() * 15) + 5} days` // Applied 5-20 days ago
        );
        
        selectedApplicants.push({
          id: appResult.lastInsertRowid,
          userId: applicant.id,
          name: applicant.name,
        });
        totalApplicationsCreated++;
      } catch (e) {
        // Skip duplicate applications
      }
    }
    
    console.log(`    • Applications: ${selectedApplicants.length}`);
    
    // Simulate hiring pipeline
    // Stage 1: All applied
    for (const app of selectedApplicants) {
      db.prepare(`
        INSERT INTO hiring_decisions (
          job_id, application_id, stage, decision, decided_by, decided_at
        ) VALUES (?, ?, 'applied', 'advance', 'System', datetime('now', ?))
      `).run(jobId, app.id, `-${Math.floor(Math.random() * 15) + 4} days`);
      totalDecisionsCreated++;
    }
    
    // Stage 2: Screening - pass 60%
    const screeningPass = selectedApplicants.slice(0, Math.floor(selectedApplicants.length * 0.6));
    for (const app of selectedApplicants) {
      const passed = screeningPass.includes(app);
      db.prepare(`
        INSERT INTO hiring_decisions (
          job_id, application_id, stage, decision, reasoning, decided_by, decided_at
        ) VALUES (?, ?, 'screening', ?, ?, ?, datetime('now', ?))
      `).run(
        jobId,
        app.id,
        passed ? 'advance' : 'reject',
        passed ? 'Meets minimum qualifications' : 'Does not meet minimum requirements',
        selectedPanel[0].name,
        `-${Math.floor(Math.random() * 10) + 2} days`
      );
      totalDecisionsCreated++;
    }
    
    // Stage 3: Shortlist - pass 40% of original
    const shortlist = screeningPass.slice(0, Math.floor(selectedApplicants.length * 0.4));
    for (const app of screeningPass) {
      const shortlisted = shortlist.includes(app);
      
      // Generate scores
      const scores = {};
      let totalScore = 0;
      for (const criterion of criteria) {
        const score = Math.floor(Math.random() * 30) + 60; // 60-90
        scores[criterion.criterion] = score;
        totalScore += score * (criterion.weight_percent / 100);
      }
      
      db.prepare(`
        INSERT INTO hiring_decisions (
          job_id, application_id, stage, decision, reasoning, score, 
          criteria_scores, decided_by, decided_at
        ) VALUES (?, ?, 'shortlisted', ?, ?, ?, ?, ?, datetime('now', ?))
      `).run(
        jobId,
        app.id,
        shortlisted ? 'advance' : 'reject',
        shortlisted ? 'Strong candidate for interview' : 'Other candidates scored higher',
        Math.round(totalScore),
        JSON.stringify(scores),
        'Panel',
        `-${Math.floor(Math.random() * 5) + 1} days`
      );
      totalDecisionsCreated++;
    }
    
    console.log(`    • Shortlisted: ${shortlist.length}`);
    
    // Stage 4: Interview
    const interviewPassed = shortlist.slice(0, Math.floor(shortlist.length * 0.5));
    for (const app of shortlist) {
      const passed = interviewPassed.includes(app);
      const interviewScore = Math.floor(Math.random() * 25) + 65; // 65-90
      
      db.prepare(`
        INSERT INTO hiring_decisions (
          job_id, application_id, stage, decision, reasoning, score, decided_by, decided_at
        ) VALUES (?, ?, 'interview', ?, ?, ?, ?, datetime('now', '-1 days'))
      `).run(
        jobId,
        app.id,
        passed ? 'advance' : 'reject',
        passed ? 'Excellent interview performance' : 'Good candidate but others performed better',
        interviewScore,
        selectedPanel[0].name
      );
      totalDecisionsCreated++;
    }
    
    console.log(`    • Interviewed: ${shortlist.length}, passed: ${interviewPassed.length}`);
    
    // Stage 5: Offer - 30% of jobs have been filled
    const shouldFill = Math.random() < 0.3;
    if (shouldFill && interviewPassed.length > 0) {
      const hired = interviewPassed[0];
      
      db.prepare(`
        INSERT INTO hiring_decisions (
          job_id, application_id, stage, decision, decided_by, decided_at
        ) VALUES (?, ?, 'offered', 'advance', ?, datetime('now', '-1 days'))
      `).run(jobId, hired.id, selectedPanel[0].name);
      totalDecisionsCreated++;
      
      db.prepare(`
        INSERT INTO hiring_decisions (
          job_id, application_id, stage, decision, decided_by
        ) VALUES (?, ?, 'hired', 'advance', ?)
      `).run(jobId, hired.id, selectedPanel[0].name);
      totalDecisionsCreated++;
      
      console.log(`    • HIRED: ${hired.name}`);
      
      // Calculate time to hire
      const jobCreated = db.prepare('SELECT created_at FROM jobs WHERE id = ?').get(jobId);
      const timeToHireDays = Math.floor(Math.random() * 20) + 30; // 30-50 days
      
      // Generate outcome stats
      const genderStats = {
        male: Math.floor(selectedApplicants.length * 0.6),
        female: Math.floor(selectedApplicants.length * 0.35),
        other: 0,
        undisclosed: selectedApplicants.length - Math.floor(selectedApplicants.length * 0.6) - Math.floor(selectedApplicants.length * 0.35)
      };
      
      const provincialStats = {};
      for (const province of provinces.slice(0, 5)) {
        provincialStats[province] = Math.floor(Math.random() * 5) + 1;
      }
      
      // Publish outcome
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
      `).run(
        timeToHireDays,
        JSON.stringify(genderStats),
        JSON.stringify(provincialStats),
        jobId
      );
    } else if (Math.random() < 0.1) {
      // 10% cancelled
      db.prepare(`
        UPDATE hiring_transparency
        SET 
          position_cancelled = 1,
          cancellation_reason = 'Budget constraints'
        WHERE job_id = ?
      `).run(jobId);
      
      console.log(`    • JOB CANCELLED`);
    }
    
    // Add conflict declaration on 20% of jobs
    if (Math.random() < 0.2 && selectedPanel.length > 0) {
      const panelMemberId = db.prepare(`
        SELECT id FROM hiring_panel WHERE job_id = ? LIMIT 1
      `).get(jobId).id;
      
      db.prepare(`
        INSERT INTO conflict_declarations (
          job_id, panel_member_id, declared_by, conflict_type, description, action_taken
        ) VALUES (?, ?, ?, 'professional', 'Previously worked with one of the candidates', 'continued_with_disclosure')
      `).run(jobId, panelMemberId, selectedPanel[0].name);
      
      db.prepare(`
        UPDATE hiring_panel
        SET conflict_declared = 1, conflict_details = 'Previously worked with one of the candidates'
        WHERE id = ?
      `).run(panelMemberId);
      
      console.log(`    • Conflict declared`);
    }
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log('Summary:');
console.log(`  Employers: ${employers.length}`);
console.log(`  Jobs created: ${totalJobsCreated}`);
console.log(`  Applications created: ${totalApplicationsCreated}`);
console.log(`  Hiring decisions: ${totalDecisionsCreated}`);
console.log(`  Panel members: ${totalPanelMembersCreated}`);
console.log(`${'='.repeat(60)}\n`);

// Calculate transparency scores for all employers
console.log('Calculating transparency scores...');
for (const employer of employers) {
  // This would normally be done via the API calculateTransparencyScore function
  // For now, just set a placeholder
  const jobs = db.prepare(`
    SELECT COUNT(*) as count FROM jobs WHERE employer_id = ?
  `).get(employer.id);
  
  const score = Math.floor(Math.random() * 40) + 60; // 60-100 placeholder
  db.prepare(`
    UPDATE profiles_employer SET transparency_score = ? WHERE user_id = ?
  `).run(score, employer.id);
  
  console.log(`  ${employer.company_name}: ${score}/100`);
}

console.log('\n✅ Test data creation complete!');

db.close();
