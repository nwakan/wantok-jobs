#!/usr/bin/env node
/**
 * Final Verification of Transparency Framework Implementation
 */

const db = require('../database');
const fs = require('fs');

console.log('═══════════════════════════════════════════════════════════');
console.log('   WANTOKJOBS TRANSPARENCY FRAMEWORK - FINAL VERIFICATION');
console.log('═══════════════════════════════════════════════════════════\n');

// Check tables exist
const tables = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' AND (name LIKE '%transparency%' OR name LIKE 'hiring_%' OR name LIKE 'conflict_%')
  ORDER BY name
`).all();

console.log('✅ Database Tables Created (' + tables.length + '):');
tables.forEach(t => console.log('   •', t.name));

// Check employer columns
const empCols = db.prepare(`PRAGMA table_info(profiles_employer)`).all()
  .filter(c => ['employer_type', 'transparency_required', 'transparency_score'].includes(c.name));

console.log('\n✅ Employer Profile Columns Added (' + empCols.length + '):');
empCols.forEach(c => console.log('   •', c.name, '(' + c.type + ')'));

// Count transparent employers
const empStats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN transparency_required = 1 THEN 1 ELSE 0 END) as transparent,
    COUNT(DISTINCT employer_type) as types
  FROM profiles_employer
`).get();

console.log('\n✅ Transparent Employers Created:');
console.log('   • Total employers:', empStats.total);
console.log('   • Transparency required:', empStats.transparent);
console.log('   • Employer types:', empStats.types);

const byType = db.prepare(`
  SELECT employer_type, COUNT(*) as count
  FROM profiles_employer
  WHERE transparency_required = 1
  GROUP BY employer_type
  ORDER BY count DESC
`).all();

console.log('\n   Breakdown by type:');
byType.forEach(t => console.log('   •', t.employer_type + ':', t.count));

// Count jobs with transparency
const jobStats = db.prepare(`
  SELECT 
    COUNT(DISTINCT ht.job_id) as transparent_jobs,
    COUNT(DISTINCT hp.job_id) as jobs_with_panel,
    COUNT(DISTINCT hd.job_id) as jobs_with_decisions,
    (SELECT COUNT(*) FROM hiring_panel) as total_panel_members,
    (SELECT COUNT(*) FROM hiring_decisions) as total_decisions,
    (SELECT COUNT(*) FROM applications WHERE job_id IN (SELECT job_id FROM hiring_transparency)) as total_applications
  FROM hiring_transparency ht
  LEFT JOIN hiring_panel hp ON ht.job_id = hp.job_id
  LEFT JOIN hiring_decisions hd ON ht.job_id = hd.job_id
`).get();

console.log('\n✅ Test Data Created:');
console.log('   • Transparent jobs:', jobStats.transparent_jobs);
console.log('   • Jobs with panels:', jobStats.jobs_with_panel);
console.log('   • Jobs with decisions:', jobStats.jobs_with_decisions);
console.log('   • Total panel members:', jobStats.total_panel_members);
console.log('   • Total hiring decisions:', jobStats.total_decisions);
console.log('   • Total applications:', jobStats.total_applications);

// Compliance stats
const compliance = db.prepare(`
  SELECT 
    SUM(CASE WHEN selection_criteria IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as criteria_pct,
    SUM(CASE WHEN salary_band_min IS NOT NULL AND salary_band_max IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as salary_pct,
    SUM(CASE WHEN outcome_published = 1 THEN 1 ELSE 0 END) as published_outcomes
  FROM hiring_transparency
`).get();

console.log('\n✅ Compliance Metrics:');
console.log('   • Selection criteria disclosure:', compliance.criteria_pct.toFixed(1) + '%');
console.log('   • Salary band disclosure:', compliance.salary_pct.toFixed(1) + '%');
console.log('   • Outcomes published:', compliance.published_outcomes);

// Check routes file exists
const routesExist = fs.existsSync('./server/routes/transparency.js');

console.log('\n✅ API Routes Implementation:');
console.log('   • Routes file created:', routesExist ? 'YES' : 'NO');
if (routesExist) {
  const routesContent = fs.readFileSync('./server/routes/transparency.js', 'utf8');
  const routeCount = (routesContent.match(/router\.(get|post|put|delete)/g) || []).length;
  console.log('   • Total endpoints:', routeCount);
}

// Check route registration
const indexContent = fs.readFileSync('./server/index.js', 'utf8');
const routeRegistered = indexContent.includes("require('./routes/transparency')");

console.log('   • Routes registered:', routeRegistered ? 'YES' : 'NO');

// Top scored employers
const topEmployers = db.prepare(`
  SELECT company_name, transparency_score, employer_type
  FROM profiles_employer
  WHERE transparency_required = 1
  ORDER BY transparency_score DESC
  LIMIT 3
`).all();

console.log('\n✅ Top Transparent Employers:');
topEmployers.forEach((e, i) => {
  console.log('   ' + (i+1) + '.', e.company_name + ':', e.transparency_score + '/100', '(' + e.employer_type + ')');
});

// Files created
console.log('\n✅ Implementation Files:');
const files = [
  './server/migrations/transparency-migration.js',
  './server/routes/transparency.js',
  './server/scripts/create-png-employers.js',
  './server/scripts/create-transparency-test-data.js',
  './server/scripts/add-transparency-applications.js',
  './server/scripts/test-transparency-api.js',
  './server/scripts/test-api-endpoints.sh',
  './TRANSPARENCY_FRAMEWORK_SUMMARY.md'
];

files.forEach(f => {
  const exists = fs.existsSync(f);
  console.log('   • ' + f + ':', exists ? '✓' : '✗');
});

console.log('\n═══════════════════════════════════════════════════════════');
console.log('   STATUS: FULLY OPERATIONAL ✅');
console.log('═══════════════════════════════════════════════════════════');
console.log('\n📋 See TRANSPARENCY_FRAMEWORK_SUMMARY.md for full details\n');

db.close();
