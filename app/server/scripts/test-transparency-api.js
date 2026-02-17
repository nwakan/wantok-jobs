#!/usr/bin/env node
/**
 * Test Transparency API Endpoints
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/wantokjobs.db');
const db = new Database(dbPath);

console.log('Testing Transparency Framework API Data\n');
console.log('='.repeat(60));

// Test 1: Get a job with transparency data
console.log('\n1. Job Transparency Data');
console.log('-'.repeat(60));

const sampleJob = db.prepare(`
  SELECT 
    j.id, j.title, j.employer_id,
    ht.*
  FROM jobs j
  INNER JOIN hiring_transparency ht ON j.id = ht.job_id
  WHERE ht.outcome_published = 1
  LIMIT 1
`).get();

if (sampleJob) {
  console.log(`Job: ${sampleJob.title} (ID: ${sampleJob.id})`);
  console.log(`Salary: PGK ${sampleJob.salary_band_min} - ${sampleJob.salary_band_max}`);
  console.log(`Selection Criteria: ${sampleJob.selection_criteria ? 'YES' : 'NO'}`);
  console.log(`Panel Size: ${sampleJob.panel_size || 0} (${sampleJob.panel_independent || 0} independent)`);
  console.log(`Applications: ${sampleJob.application_count}, Shortlisted: ${sampleJob.shortlist_count}, Interviewed: ${sampleJob.interview_count}`);
  console.log(`Position Filled: ${sampleJob.position_filled ? 'YES' : 'NO'}`);
  console.log(`Time to Hire: ${sampleJob.time_to_hire_days || 'N/A'} days`);
  console.log(`Outcome Published: ${sampleJob.outcome_published ? 'YES' : 'NO'}`);
  
  if (sampleJob.gender_stats) {
    const genderStats = JSON.parse(sampleJob.gender_stats);
    console.log(`Gender Stats: Male=${genderStats.male}, Female=${genderStats.female}`);
  }
  
  if (sampleJob.provincial_stats) {
    const provStats = JSON.parse(sampleJob.provincial_stats);
    console.log(`Provincial Stats: ${Object.keys(provStats).length} provinces represented`);
  }
}

// Test 2: Get hiring panel
console.log('\n2. Hiring Panel Members');
console.log('-'.repeat(60));

if (sampleJob) {
  const panel = db.prepare(`
    SELECT * FROM hiring_panel WHERE job_id = ?
  `).all(sampleJob.id);
  
  console.log(`Total panel members: ${panel.length}`);
  panel.forEach((member, i) => {
    console.log(`  ${i+1}. ${member.member_name} - ${member.member_role || 'Member'}`);
    console.log(`     Title: ${member.member_title}`);
    console.log(`     Independent: ${member.is_independent ? 'YES' : 'NO'}`);
    if (member.conflict_declared) {
      console.log(`     ⚠️  Conflict declared: ${member.conflict_details}`);
    }
  });
}

// Test 3: Get hiring decisions audit trail
console.log('\n3. Hiring Decisions Audit Trail');
console.log('-'.repeat(60));

if (sampleJob) {
  const decisionStats = db.prepare(`
    SELECT 
      stage,
      COUNT(*) as count,
      COUNT(DISTINCT application_id) as unique_apps
    FROM hiring_decisions
    WHERE job_id = ?
    GROUP BY stage
    ORDER BY 
      CASE stage
        WHEN 'applied' THEN 1
        WHEN 'screening' THEN 2
        WHEN 'shortlisted' THEN 3
        WHEN 'interview' THEN 4
        WHEN 'offered' THEN 5
        WHEN 'hired' THEN 6
        ELSE 99
      END
  `).all(sampleJob.id);
  
  console.log('Decision pipeline:');
  decisionStats.forEach(stat => {
    console.log(`  ${stat.stage}: ${stat.unique_apps} candidates (${stat.count} decisions)`);
  });
}

// Test 4: Employer transparency profile
console.log('\n4. Employer Transparency Profile');
console.log('-'.repeat(60));

const transparentEmployers = db.prepare(`
  SELECT 
    u.id,
    pe.company_name,
    pe.employer_type,
    pe.transparency_required,
    pe.transparency_score,
    (SELECT COUNT(*) FROM jobs WHERE employer_id = u.id) as total_jobs,
    (SELECT COUNT(*) FROM jobs j 
     INNER JOIN hiring_transparency ht ON j.id = ht.job_id 
     WHERE j.employer_id = u.id) as transparent_jobs,
    (SELECT COUNT(*) FROM jobs j
     INNER JOIN hiring_transparency ht ON j.id = ht.job_id
     WHERE j.employer_id = u.id AND ht.outcome_published = 1) as published_outcomes
  FROM users u
  INNER JOIN profiles_employer pe ON u.id = pe.user_id
  WHERE pe.transparency_required = 1
  ORDER BY pe.transparency_score DESC
  LIMIT 5
`).all();

console.log(`Top transparent employers (showing 5):\n`);
transparentEmployers.forEach((emp, i) => {
  console.log(`${i+1}. ${emp.company_name}`);
  console.log(`   Type: ${emp.employer_type}`);
  console.log(`   Score: ${emp.transparency_score}/100`);
  console.log(`   Jobs: ${emp.transparent_jobs}/${emp.total_jobs} with transparency data`);
  console.log(`   Published outcomes: ${emp.published_outcomes}`);
  console.log('');
});

// Test 5: Platform-wide statistics
console.log('5. Platform-Wide Transparency Stats');
console.log('-'.repeat(60));

const platformStats = db.prepare(`
  SELECT 
    COUNT(DISTINCT pe.user_id) as transparent_employers,
    COUNT(DISTINCT j.id) as total_jobs,
    COUNT(DISTINCT ht.job_id) as transparent_jobs,
    AVG(pe.transparency_score) as avg_score,
    SUM(CASE WHEN ht.outcome_published = 1 THEN 1 ELSE 0 END) as published_outcomes
  FROM profiles_employer pe
  LEFT JOIN jobs j ON pe.user_id = j.employer_id
  LEFT JOIN hiring_transparency ht ON j.id = ht.job_id
  WHERE pe.transparency_required = 1
`).get();

console.log(`Transparent employers: ${platformStats.transparent_employers}`);
console.log(`Jobs with transparency data: ${platformStats.transparent_jobs}/${platformStats.total_jobs}`);
console.log(`Average transparency score: ${platformStats.avg_score ? platformStats.avg_score.toFixed(1) : 'N/A'}/100`);
console.log(`Published outcomes: ${platformStats.published_outcomes}`);

// Breakdown by employer type
const byType = db.prepare(`
  SELECT 
    pe.employer_type,
    COUNT(DISTINCT pe.user_id) as employer_count,
    AVG(pe.transparency_score) as avg_score,
    COUNT(DISTINCT ht.job_id) as transparent_jobs
  FROM profiles_employer pe
  LEFT JOIN jobs j ON pe.user_id = j.employer_id
  LEFT JOIN hiring_transparency ht ON j.id = ht.job_id
  WHERE pe.transparency_required = 1
  GROUP BY pe.employer_type
  ORDER BY employer_count DESC
`).all();

console.log('\nBy employer type:');
byType.forEach(type => {
  console.log(`  ${type.employer_type}: ${type.employer_count} employers, ${type.transparent_jobs} transparent jobs, avg score ${type.avg_score ? type.avg_score.toFixed(1) : 'N/A'}/100`);
});

// Test 6: Conflict declarations
console.log('\n6. Conflict of Interest Declarations');
console.log('-'.repeat(60));

const conflicts = db.prepare(`
  SELECT 
    cd.*,
    j.title as job_title,
    hp.member_name
  FROM conflict_declarations cd
  INNER JOIN jobs j ON cd.job_id = j.id
  LEFT JOIN hiring_panel hp ON cd.panel_member_id = hp.id
  LIMIT 5
`).all();

console.log(`Total conflicts declared: ${conflicts.length > 0 ? conflicts.length : 'None'}`);
conflicts.forEach((conf, i) => {
  console.log(`\n${i+1}. Job: ${conf.job_title}`);
  console.log(`   Declared by: ${conf.declared_by}`);
  console.log(`   Type: ${conf.conflict_type}`);
  console.log(`   Description: ${conf.description}`);
  console.log(`   Action taken: ${conf.action_taken}`);
});

// Test 7: Selection Criteria Compliance
console.log('\n7. Selection Criteria Compliance');
console.log('-'.repeat(60));

const criteriaStats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN selection_criteria IS NOT NULL THEN 1 ELSE 0 END) as with_criteria
  FROM hiring_transparency
`).get();

console.log(`Jobs with selection criteria: ${criteriaStats.with_criteria}/${criteriaStats.total} (${((criteriaStats.with_criteria/criteriaStats.total)*100).toFixed(1)}%)`);

// Sample criteria
const sampleCriteria = db.prepare(`
  SELECT selection_criteria
  FROM hiring_transparency
  WHERE selection_criteria IS NOT NULL
  LIMIT 1
`).get();

if (sampleCriteria) {
  console.log('\nExample selection criteria:');
  const criteria = JSON.parse(sampleCriteria.selection_criteria);
  criteria.forEach((c, i) => {
    console.log(`  ${i+1}. ${c.criterion} (${c.weight_percent}%)`);
    console.log(`     ${c.description}`);
  });
}

// Test 8: Salary Transparency
console.log('\n8. Salary Transparency');
console.log('-'.repeat(60));

const salaryStats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN salary_band_min IS NOT NULL AND salary_band_max IS NOT NULL THEN 1 ELSE 0 END) as with_salary
  FROM hiring_transparency
`).get();

console.log(`Jobs with salary bands: ${salaryStats.with_salary}/${salaryStats.total} (${((salaryStats.with_salary/salaryStats.total)*100).toFixed(1)}%)`);

// Sample salary ranges
const salaryRanges = db.prepare(`
  SELECT 
    j.title,
    ht.salary_band_min,
    ht.salary_band_max,
    ht.salary_currency
  FROM hiring_transparency ht
  INNER JOIN jobs j ON ht.job_id = j.id
  WHERE ht.salary_band_min IS NOT NULL
  LIMIT 3
`).all();

console.log('\nSample salary ranges:');
salaryRanges.forEach(job => {
  console.log(`  ${job.title}: ${job.salary_currency} ${job.salary_band_min.toLocaleString()} - ${job.salary_band_max.toLocaleString()}`);
});

// Test 9: Outcome Publication Rate
console.log('\n9. Outcome Publication Rate');
console.log('-'.repeat(60));

const outcomeStats = db.prepare(`
  SELECT 
    COUNT(*) as total_completed,
    SUM(CASE WHEN outcome_published = 1 THEN 1 ELSE 0 END) as published
  FROM hiring_transparency
  WHERE position_filled = 1 OR position_cancelled = 1
`).get();

const publicationRate = outcomeStats.total_completed > 0 
  ? ((outcomeStats.published / outcomeStats.total_completed) * 100).toFixed(1)
  : 0;

console.log(`Completed hiring processes: ${outcomeStats.total_completed}`);
console.log(`Published outcomes: ${outcomeStats.published}`);
console.log(`Publication rate: ${publicationRate}%`);

console.log('\n' + '='.repeat(60));
console.log('✅ All transparency data tests completed successfully!');
console.log('='.repeat(60) + '\n');

db.close();
