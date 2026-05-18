/**
 * Employer Reactivation Campaign - Segmentation & Export Script
 * 
 * Context: WantokJobs platform has been dead for 77 days with zero active jobs.
 * Last job posted: February 24, 2026. All 797 jobs expired after 30-day TTL.
 * 
 * Purpose: Segment 231 real employers into tiers for targeted reactivation campaign.
 * 
 * Segmentation Strategy:
 * - Tier 1 (High-Value): 20-30 employers - 3+ jobs posted, 10+ applications per job
 * - Tier 2 (Engaged): 50-70 employers - 2 jobs posted, 5+ applications per job  
 * - Tier 3 (Trial Users): 80-100 employers - 1 job only, <5 applications
 * - Tier 4 (Low-Quality): 30-50 employers - Ignore for initial campaign
 * 
 * Campaign Offer: 60 days FREE Premium (PGK 598 value)
 * Goal: Reactivate 20-30 employers posting 50+ jobs within 2 weeks
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Initialize database connection
const dbPath = path.join(__dirname, '../server/data/wantokjobs.db');
const db = new Database(dbPath, { readonly: true });

console.log('\n=== EMPLOYER REACTIVATION CAMPAIGN - SEGMENTATION ===\n');
console.log(`Database: ${dbPath}`);
console.log(`Execution time: ${new Date().toISOString()}\n`);

/**
 * Query: Get all real employers with job posting history and application metrics
 * 
 * Excludes:
 * - User ID 11 (bulk import account)
 * - @wantokjobs.com platform emails
 * - import-* placeholder accounts
 */
const employerQuery = `
  SELECT 
    u.id as employer_id,
    u.email,
    pe.company_name,
    u.created_at as registered_at,
    
    -- Job posting metrics
    COUNT(DISTINCT j.id) as total_jobs_posted,
    COUNT(DISTINCT CASE WHEN j.status = 'closed' THEN j.id END) as expired_jobs,
    COUNT(DISTINCT CASE WHEN j.status = 'active' THEN j.id END) as active_jobs,
    MAX(j.created_at) as last_job_date,
    ROUND((julianday('now') - julianday(MAX(j.created_at))), 0) as days_since_last_job,
    
    -- Application metrics
    COUNT(DISTINCT a.id) as total_applications_received,
    ROUND(CAST(COUNT(DISTINCT a.id) AS FLOAT) / NULLIF(COUNT(DISTINCT j.id), 0), 2) as avg_applications_per_job,
    
    -- Engagement metrics
    MAX(a.created_at) as last_application_date,
    ROUND((julianday('now') - julianday(MAX(a.created_at))), 0) as days_since_last_application,
    
    -- Email domain classification
    CASE 
      WHEN u.email LIKE '%@gmail.com' OR u.email LIKE '%@yahoo.com' OR u.email LIKE '%@hotmail.com' THEN 'personal'
      WHEN u.email LIKE '%@wantokjobs.com' THEN 'platform'
      WHEN u.email LIKE 'import-%' THEN 'import'
      ELSE 'corporate'
    END as email_type
    
  FROM users u
  LEFT JOIN jobs j ON j.employer_id = u.id
  LEFT JOIN profiles_employer pe ON u.id = pe.user_id
  LEFT JOIN applications a ON a.job_id = j.id
  
  WHERE u.role = 'employer'
    AND u.id != 11  -- Exclude bulk import account
    AND u.email NOT LIKE '%@wantokjobs.com'  -- Exclude platform accounts
    AND u.email NOT LIKE 'import-%'  -- Exclude import placeholders
  
  GROUP BY u.id, u.email, pe.company_name, u.created_at
  HAVING COUNT(DISTINCT j.id) > 0  -- Must have posted at least 1 job
  
  ORDER BY total_jobs_posted DESC, total_applications_received DESC;
`;

console.log('[1/5] Querying production database for real employers...');
const employers = db.prepare(employerQuery).all();
console.log(`✅ Found ${employers.length} real employers with job posting history\n`);

/**
 * Tier Assignment Logic
 * 
 * Tier 1 (High-Value):
 * - 3+ jobs posted
 * - 10+ average applications per job
 * - Corporate email domain preferred
 * 
 * Tier 2 (Engaged):
 * - 2+ jobs posted
 * - 5+ average applications per job
 * 
 * Tier 3 (Trial Users):
 * - 1 job posted
 * - <5 average applications per job
 * 
 * Tier 4 (Low-Quality):
 * - Personal email domains
 * - 0 applications received
 * - Likely test/spam accounts
 */
function assignTier(employer) {
  const { total_jobs_posted, avg_applications_per_job, email_type, total_applications_received } = employer;
  
  // Tier 4: Low-quality (exclude from campaign)
  if (email_type === 'personal' && total_applications_received === 0) {
    return { tier: 4, priority: 'Exclude', reason: 'Personal email, zero applications' };
  }
  
  if (total_jobs_posted === 1 && total_applications_received === 0) {
    return { tier: 4, priority: 'Exclude', reason: 'Single job, zero applications (likely test)' };
  }
  
  // Tier 1: High-value
  if (total_jobs_posted >= 3 && avg_applications_per_job >= 10) {
    return { tier: 1, priority: 'HIGH', reason: '3+ jobs, 10+ apps/job' };
  }
  
  // Tier 2: Engaged
  if (total_jobs_posted >= 2 && avg_applications_per_job >= 5) {
    return { tier: 2, priority: 'MEDIUM', reason: '2+ jobs, 5+ apps/job' };
  }
  
  // Tier 3: Trial users
  if (total_jobs_posted >= 1) {
    return { tier: 3, priority: 'LOW', reason: '1+ jobs posted' };
  }
  
  // Default: Tier 4
  return { tier: 4, priority: 'Exclude', reason: 'Did not meet tier criteria' };
}

console.log('[2/5] Assigning tiers based on engagement metrics...');
const segmentedEmployers = employers.map(employer => {
  const tierInfo = assignTier(employer);
  return {
    ...employer,
    ...tierInfo
  };
});

const tierCounts = {
  tier1: segmentedEmployers.filter(e => e.tier === 1).length,
  tier2: segmentedEmployers.filter(e => e.tier === 2).length,
  tier3: segmentedEmployers.filter(e => e.tier === 3).length,
  tier4: segmentedEmployers.filter(e => e.tier === 4).length,
};

console.log(`✅ Segmentation complete:`);
console.log(`   - Tier 1 (HIGH): ${tierCounts.tier1} employers`);
console.log(`   - Tier 2 (MEDIUM): ${tierCounts.tier2} employers`);
console.log(`   - Tier 3 (LOW): ${tierCounts.tier3} employers`);
console.log(`   - Tier 4 (Exclude): ${tierCounts.tier4} employers\n`);

/**
 * Export to CSV
 * 
 * Format:
 * employer_id,email,company_name,tier,priority,total_jobs_posted,avg_applications_per_job,
 * days_since_last_job,last_job_date,email_type,reason
 */
console.log('[3/5] Exporting to CSV...');

const csvHeaders = [
  'employer_id',
  'email',
  'company_name',
  'tier',
  'priority',
  'total_jobs_posted',
  'expired_jobs',
  'active_jobs',
  'total_applications_received',
  'avg_applications_per_job',
  'days_since_last_job',
  'last_job_date',
  'days_since_last_application',
  'email_type',
  'reason',
  'registered_at'
].join(',');

const csvRows = segmentedEmployers.map(e => [
  e.employer_id,
  `"${e.email}"`,  // Quote emails to handle commas
  `"${e.company_name || ''}"`,  // Quote company names
  e.tier,
  e.priority,
  e.total_jobs_posted,
  e.expired_jobs,
  e.active_jobs,
  e.total_applications_received,
  e.avg_applications_per_job,
  e.days_since_last_job,
  e.last_job_date || '',
  e.days_since_last_application || '',
  e.email_type,
  `"${e.reason}"`,
  e.registered_at
].join(','));

const csvContent = [csvHeaders, ...csvRows].join('\n');

const csvPath = path.join(__dirname, '../../employer_reactivation_segments.csv');
fs.writeFileSync(csvPath, csvContent, 'utf8');

console.log(`✅ CSV exported to: ${csvPath}\n`);

/**
 * Campaign Target Summary
 * 
 * Initial campaign targets Tier 1 + Tier 2 employers only.
 * Tier 3 gets follow-up campaign if Tier 1/2 response is good.
 * Tier 4 excluded from all campaigns.
 */
console.log('[4/5] Generating campaign target summary...');

const campaignTargets = segmentedEmployers.filter(e => e.tier <= 2);
const totalTargets = campaignTargets.length;
const expectedResponders = Math.round(totalTargets * 0.15);  // 15% response rate
const expectedJobPosters = Math.round(expectedResponders * 0.70);  // 70% conversion to posting
const expectedJobs = Math.round(expectedJobPosters * 2.5);  // 2.5 jobs per poster

console.log(`Campaign Target Analysis:`);
console.log(`   - Total recipients (Tier 1+2): ${totalTargets}`);
console.log(`   - Expected email opens (25%): ${Math.round(totalTargets * 0.25)}`);
console.log(`   - Expected click-throughs (40% of opens): ${Math.round(totalTargets * 0.25 * 0.40)}`);
console.log(`   - Expected responders (15%): ${expectedResponders}`);
console.log(`   - Expected job posters (70% of responders): ${expectedJobPosters}`);
console.log(`   - Expected new jobs (2.5 per poster): ${expectedJobs}\n`);

console.log('[5/5] Email campaign preview...');
console.log(`\nEmail Campaign Settings:`);
console.log(`   - Subject: "WantokJobs Platform Upgrade Complete - 60 Days Free Premium"`);
console.log(`   - Offer: PGK 598 value (PGK 299/month × 2 months)`);
console.log(`   - Sequence: 3 emails over 7 days (Day 1, Day 4, Day 7)`);
console.log(`   - Urgency: 14-day offer expiration`);
console.log(`   - Call-to-action: Login → Post Job\n`);

console.log(`✅ Segmentation complete!\n`);
console.log(`Next steps:`);
console.log(`   1. Review CSV: ${csvPath}`);
console.log(`   2. Create email campaign templates`);
console.log(`   3. Send Tier 1+2 campaign (${totalTargets} recipients)`);
console.log(`   4. Track responses and job postings`);
console.log(`   5. Follow up with Tier 3 if campaign succeeds\n`);

console.log(`Campaign Goal: Reactivate 20-30 employers posting 50+ jobs within 2 weeks\n`);

// Close database connection
db.close();