#!/usr/bin/env node
/**
 * Transparency Scorer Agent
 * 
 * Recalculates ALL transparency scores daily for required employers
 * 
 * Scoring criteria (out of 100):
 * - Job posted with full selection criteria: +20
 * - Salary band disclosed: +15
 * - All applicants received status updates: +15
 * - Hired within stated timeline: +15
 * - Post-hiring stats published: +15
 * - No unexplained re-advertisements: +10
 * - Panel diversity declared: +10
 * 
 * Employers with NO transparency data get score = 0
 * 
 * Run daily via cron
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../server/data/wantokjobs.db');
const db = new Database(dbPath);

console.log('\n=== TRANSPARENCY SCORER ===\n');

// Get all transparency-required employers
const requiredEmployers = db.prepare(`
  SELECT user_id, company_name, employer_type
  FROM profiles_employer
  WHERE transparency_required = 1
  ORDER BY company_name
`).all();

console.log(`Found ${requiredEmployers.length} transparency-required employers\n`);

let scoresUpdated = 0;
let zeroScores = 0;
let highScores = 0;
let lowScores = 0;

for (const employer of requiredEmployers) {
  // Get all jobs for this employer with transparency data
  const jobs = db.prepare(`
    SELECT 
      j.id,
      j.created_at,
      j.status,
      ht.selection_criteria,
      ht.salary_band_min,
      ht.salary_band_max,
      ht.outcome_published,
      ht.readvertised,
      ht.readvertise_reason,
      ht.time_to_hire_days,
      ht.application_count,
      ht.position_filled,
      ht.original_closing_date
    FROM jobs j
    INNER JOIN hiring_transparency ht ON j.id = ht.job_id
    WHERE j.employer_id = ?
      AND j.status IN ('active', 'closed', 'filled')
  `).all(employer.user_id);

  // If employer has NO transparency data at all, score = 0
  if (jobs.length === 0) {
    db.prepare(`
      UPDATE profiles_employer 
      SET transparency_score = 0
      WHERE user_id = ?
    `).run(employer.user_id);
    
    zeroScores++;
    continue;
  }

  // Calculate score across all jobs
  let totalScore = 0;
  let jobCount = 0;

  for (const job of jobs) {
    let jobScore = 0;

    // Full selection criteria (+20)
    if (job.selection_criteria) {
      try {
        const criteria = JSON.parse(job.selection_criteria);
        if (Array.isArray(criteria) && criteria.length >= 2) {
          jobScore += 20;
        }
      } catch (e) {
        // Invalid JSON, skip
      }
    }

    // Salary band disclosed (+15)
    if (job.salary_band_min && job.salary_band_max) {
      jobScore += 15;
    }

    // All applicants received status updates (+15)
    const applicationStats = db.prepare(`
      SELECT 
        COUNT(DISTINCT a.id) as total_apps,
        COUNT(DISTINCT hd.application_id) as apps_with_decisions
      FROM applications a
      LEFT JOIN hiring_decisions hd ON a.id = hd.application_id
      WHERE a.job_id = ?
    `).get(job.id);

    if (applicationStats.total_apps > 0 && 
        applicationStats.total_apps === applicationStats.apps_with_decisions) {
      jobScore += 15;
    }

    // Hired within stated timeline (+15)
    if (job.position_filled && job.time_to_hire_days && job.original_closing_date) {
      const closingDate = new Date(job.original_closing_date);
      const createdDate = new Date(job.created_at);
      const expectedDays = Math.ceil((closingDate - createdDate) / (1000 * 60 * 60 * 24)) + 14; // closing + 2 weeks
      if (job.time_to_hire_days <= expectedDays) {
        jobScore += 15;
      }
    }

    // Post-hiring stats published (+15)
    if (job.outcome_published) {
      jobScore += 15;
    }

    // No unexplained re-advertisements (+10)
    if (!job.readvertised || (job.readvertised && job.readvertise_reason)) {
      jobScore += 10;
    }

    // Panel diversity declared (+10)
    const panelStats = db.prepare(`
      SELECT 
        COUNT(*) as total_members,
        SUM(is_independent) as independent_count
      FROM hiring_panel
      WHERE job_id = ?
    `).get(job.id);

    if (panelStats.total_members >= 3 && panelStats.independent_count >= 1) {
      jobScore += 10;
    }

    totalScore += jobScore;
    jobCount++;
  }

  const averageScore = Math.round(totalScore / jobCount);
  
  // Update employer's transparency score
  db.prepare(`
    UPDATE profiles_employer 
    SET transparency_score = ?
    WHERE user_id = ?
  `).run(averageScore, employer.user_id);

  scoresUpdated++;
  
  // Track distribution
  if (averageScore === 0) {
    zeroScores++;
  } else if (averageScore >= 80) {
    highScores++;
    console.log(`✅ ${employer.company_name}: ${averageScore}/100 (${jobs.length} jobs)`);
  } else if (averageScore < 50) {
    lowScores++;
    console.log(`🔴 ${employer.company_name}: ${averageScore}/100 (${jobs.length} jobs)`);
  }
}

// Calculate statistics
console.log('\n=== SCORING SUMMARY ===\n');

const stats = db.prepare(`
  SELECT 
    COUNT(*) as total_employers,
    COUNT(CASE WHEN transparency_score IS NOT NULL THEN 1 END) as scored_employers,
    COUNT(CASE WHEN transparency_score = 0 THEN 1 END) as zero_score,
    COUNT(CASE WHEN transparency_score BETWEEN 1 AND 49 THEN 1 END) as low_score,
    COUNT(CASE WHEN transparency_score BETWEEN 50 AND 79 THEN 1 END) as medium_score,
    COUNT(CASE WHEN transparency_score >= 80 THEN 1 END) as high_score,
    AVG(transparency_score) as avg_score
  FROM profiles_employer
  WHERE transparency_required = 1
`).get();

console.log('Overall Statistics:');
console.table({
  'Total Required Employers': stats.total_employers,
  'Scored Employers': stats.scored_employers,
  'Average Score': Math.round(stats.avg_score * 10) / 10,
  '⚫ No Data (0)': stats.zero_score,
  '🔴 Low (1-49)': stats.low_score,
  '🟡 Medium (50-79)': stats.medium_score,
  '✅ High (80-100)': stats.high_score,
});

// Breakdown by employer type
console.log('\nBreakdown by Employer Type:');
const byType = db.prepare(`
  SELECT 
    employer_type,
    COUNT(*) as count,
    AVG(transparency_score) as avg_score,
    MIN(transparency_score) as min_score,
    MAX(transparency_score) as max_score
  FROM profiles_employer
  WHERE transparency_required = 1
  GROUP BY employer_type
  ORDER BY avg_score DESC
`).all();

console.table(byType);

// Top performers
console.log('\nTop 10 Performers:');
const topPerformers = db.prepare(`
  SELECT company_name, employer_type, transparency_score
  FROM profiles_employer
  WHERE transparency_required = 1
    AND transparency_score > 0
  ORDER BY transparency_score DESC
  LIMIT 10
`).all();
console.table(topPerformers);

// Bottom performers (excluding zero scores)
console.log('\nBottom 10 Performers (with some data):');
const bottomPerformers = db.prepare(`
  SELECT company_name, employer_type, transparency_score
  FROM profiles_employer
  WHERE transparency_required = 1
    AND transparency_score > 0
  ORDER BY transparency_score ASC
  LIMIT 10
`).all();
console.table(bottomPerformers);

// Zero score employers (most important to highlight)
console.log('\nEmployers with NO transparency data (score = 0):');
const zeroScoreEmployers = db.prepare(`
  SELECT company_name, employer_type
  FROM profiles_employer
  WHERE transparency_required = 1
    AND transparency_score = 0
  ORDER BY employer_type, company_name
  LIMIT 20
`).all();
console.log(`Total: ${stats.zero_score}`);
console.table(zeroScoreEmployers);

db.close();
console.log('\n✅ Scoring complete!\n');
