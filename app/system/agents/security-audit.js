#!/usr/bin/env node

/**
 * Security Audit Script for WantokJobs
 * 
 * Automatically checks for:
 * - XSS payloads in database
 * - SQL injection patterns
 * - Suspicious user registrations (bot patterns)
 * - Rate limit violations
 * 
 * Usage:
 *   node system/agents/security-audit.js
 *   node system/agents/security-audit.js --json
 *   node system/agents/security-audit.js --fix  (auto-clean XSS)
 * 
 * Can be added to cron:
 *   0 2 * * * cd /opt/wantokjobs/app && node system/agents/security-audit.js >> /var/log/security-audit.log 2>&1
 */

const db = require('../../server/database');
const { stripHtml } = require('../../server/utils/sanitizeHtml');

// XSS pattern detection
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>/gi,
  /<object[^>]*>/gi,
  /<embed[^>]*>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<img[^>]+src/gi,
  /data:text\/html/gi,
  /<svg[^>]*>/gi,
  /<link[^>]*>/gi,
  /<meta[^>]*>/gi
];

// SQL injection patterns
const SQL_PATTERNS = [
  /('|--|;|\/\*|\*\/)/,
  /(\bOR\b|\bAND\b|\bUNION\b|\bSELECT\b|\bDROP\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b)/i,
  /(xp_|sp_)/i,
  /(\bEXEC\b|\bEXECUTE\b)/i
];

// Bot email patterns
const BOT_EMAIL_PATTERNS = [
  /test@/i,
  /example@/i,
  /demo@/i,
  /fake@/i,
  /bot@/i,
  /spam@/i,
  /@temp\./i,
  /@throwaway\./i,
  /@guerrillamail\./i,
  /@10minutemail\./i,
  /@workauto\.net/i
];

const findings = {
  xss: {
    jobs: [],
    users: [],
    reviews: [],
    applications: [],
    contact_messages: []
  },
  sql_injection: {
    jobs: [],
    users: [],
    reviews: []
  },
  suspicious_users: [],
  rate_limit_violations: [],
  summary: {
    total_issues: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  }
};

/**
 * Check if text contains XSS patterns
 */
function hasXSS(text) {
  if (!text || typeof text !== 'string') return false;
  return XSS_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Check if text contains SQL injection patterns
 */
function hasSQLInjection(text) {
  if (!text || typeof text !== 'string') return false;
  return SQL_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Check if email looks like a bot/temp address
 */
function isBotEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return BOT_EMAIL_PATTERNS.some(pattern => pattern.test(email));
}

/**
 * Scan jobs table for XSS
 */
function scanJobs() {
  console.log('🔍 Scanning jobs table...');
  
  const jobs = db.prepare(`
    SELECT id, title, description, requirements, location, employer_id 
    FROM jobs 
    WHERE status = 'active'
  `).all();

  for (const job of jobs) {
    const issues = [];
    
    if (hasXSS(job.title)) issues.push({ field: 'title', value: job.title });
    if (hasXSS(job.description)) issues.push({ field: 'description', value: job.description.substring(0, 100) + '...' });
    if (hasXSS(job.requirements)) issues.push({ field: 'requirements', value: job.requirements.substring(0, 100) + '...' });
    if (hasXSS(job.location)) issues.push({ field: 'location', value: job.location });
    
    if (hasSQLInjection(job.title)) issues.push({ field: 'title', type: 'sql', value: job.title });
    
    if (issues.length > 0) {
      findings.xss.jobs.push({ id: job.id, employer_id: job.employer_id, issues });
      findings.summary.critical++;
    }
  }
  
  console.log(`  Found ${findings.xss.jobs.length} jobs with XSS/SQL issues`);
}

/**
 * Scan users table for XSS
 */
function scanUsers() {
  console.log('🔍 Scanning users table...');
  
  const users = db.prepare(`
    SELECT id, name, email, role, created_at 
    FROM users
  `).all();

  for (const user of users) {
    const issues = [];
    
    if (hasXSS(user.name)) {
      issues.push({ field: 'name', value: user.name });
      findings.summary.critical++;
    }
    
    if (hasSQLInjection(user.name)) {
      issues.push({ field: 'name', type: 'sql', value: user.name });
      findings.summary.high++;
    }
    
    if (issues.length > 0) {
      findings.xss.users.push({ id: user.id, email: user.email, role: user.role, issues });
    }
    
    // Check for bot patterns
    if (isBotEmail(user.email)) {
      findings.suspicious_users.push({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        created_at: user.created_at,
        reason: 'Bot/temp email pattern'
      });
      findings.summary.medium++;
    }
  }
  
  console.log(`  Found ${findings.xss.users.length} users with XSS/SQL issues`);
  console.log(`  Found ${findings.suspicious_users.length} suspicious users`);
}

/**
 * Scan reviews table for XSS
 */
function scanReviews() {
  console.log('🔍 Scanning reviews table...');
  
  const reviews = db.prepare(`
    SELECT id, title, pros, cons, advice, reviewer_id 
    FROM company_reviews
  `).all();

  for (const review of reviews) {
    const issues = [];
    
    if (hasXSS(review.title)) issues.push({ field: 'title', value: review.title });
    if (hasXSS(review.pros)) issues.push({ field: 'pros', value: review.pros.substring(0, 100) + '...' });
    if (hasXSS(review.cons)) issues.push({ field: 'cons', value: review.cons.substring(0, 100) + '...' });
    if (hasXSS(review.advice)) issues.push({ field: 'advice', value: review.advice.substring(0, 100) + '...' });
    
    if (issues.length > 0) {
      findings.xss.reviews.push({ id: review.id, reviewer_id: review.reviewer_id, issues });
      findings.summary.high++;
    }
  }
  
  console.log(`  Found ${findings.xss.reviews.length} reviews with XSS issues`);
}

/**
 * Scan applications table for XSS
 */
function scanApplications() {
  console.log('🔍 Scanning applications table...');
  
  const applications = db.prepare(`
    SELECT id, cover_letter, jobseeker_id 
    FROM applications
    WHERE cover_letter IS NOT NULL
  `).all();

  for (const app of applications) {
    const issues = [];
    
    if (hasXSS(app.cover_letter)) {
      issues.push({ field: 'cover_letter', value: app.cover_letter.substring(0, 100) + '...' });
    }
    
    if (issues.length > 0) {
      findings.xss.applications.push({ id: app.id, jobseeker_id: app.jobseeker_id, issues });
      findings.summary.medium++;
    }
  }
  
  console.log(`  Found ${findings.xss.applications.length} applications with XSS issues`);
}

/**
 * Scan contact messages for XSS
 */
function scanContactMessages() {
  console.log('🔍 Scanning contact messages...');
  
  const messages = db.prepare(`
    SELECT id, name, subject, message 
    FROM contact_messages
  `).all();

  for (const msg of messages) {
    const issues = [];
    
    if (hasXSS(msg.name)) issues.push({ field: 'name', value: msg.name });
    if (hasXSS(msg.subject)) issues.push({ field: 'subject', value: msg.subject });
    if (hasXSS(msg.message)) issues.push({ field: 'message', value: msg.message.substring(0, 100) + '...' });
    
    if (issues.length > 0) {
      findings.xss.contact_messages.push({ id: msg.id, issues });
      findings.summary.low++;
    }
  }
  
  console.log(`  Found ${findings.xss.contact_messages.length} contact messages with XSS issues`);
}

/**
 * Check for rate limit violations
 */
function checkRateLimits() {
  console.log('🔍 Checking for rate limit violations...');
  
  // Check for users with excessive job postings in 24h
  const excessiveJobPosters = db.prepare(`
    SELECT employer_id, COUNT(*) as count, MAX(created_at) as latest
    FROM jobs
    WHERE created_at > datetime('now', '-24 hours')
    GROUP BY employer_id
    HAVING count > 20
  `).all();
  
  for (const poster of excessiveJobPosters) {
    const user = db.prepare('SELECT email, name FROM users WHERE id = ?').get(poster.employer_id);
    findings.rate_limit_violations.push({
      user_id: poster.employer_id,
      email: user?.email,
      name: user?.name,
      type: 'excessive_job_postings',
      count: poster.count,
      timeframe: '24h',
      latest: poster.latest
    });
    findings.summary.high++;
  }
  
  // Check for users with excessive applications in 24h
  const excessiveApplicants = db.prepare(`
    SELECT jobseeker_id, COUNT(*) as count, MAX(applied_at) as latest
    FROM applications
    WHERE applied_at > datetime('now', '-24 hours')
    GROUP BY jobseeker_id
    HAVING count > 50
  `).all();
  
  for (const applicant of excessiveApplicants) {
    const user = db.prepare('SELECT email, name FROM users WHERE id = ?').get(applicant.jobseeker_id);
    findings.rate_limit_violations.push({
      user_id: applicant.jobseeker_id,
      email: user?.email,
      name: user?.name,
      type: 'excessive_applications',
      count: applicant.count,
      timeframe: '24h',
      latest: applicant.latest
    });
    findings.summary.high++;
  }
  
  console.log(`  Found ${findings.rate_limit_violations.length} rate limit violations`);
}

/**
 * Auto-fix XSS issues (sanitize)
 */
function autoFix() {
  console.log('\n🔧 Auto-fixing XSS issues...');
  
  let fixed = 0;
  
  // Fix jobs
  for (const job of findings.xss.jobs) {
    const current = db.prepare('SELECT title, description, requirements, location FROM jobs WHERE id = ?').get(job.id);
    if (!current) continue;
    
    db.prepare(`
      UPDATE jobs 
      SET title = ?, description = ?, requirements = ?, location = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      stripHtml(current.title),
      stripHtml(current.description),
      current.requirements ? stripHtml(current.requirements) : null,
      current.location ? stripHtml(current.location) : null,
      job.id
    );
    fixed++;
  }
  
  // Fix users
  for (const user of findings.xss.users) {
    const current = db.prepare('SELECT name FROM users WHERE id = ?').get(user.id);
    if (!current) continue;
    
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(stripHtml(current.name), user.id);
    fixed++;
  }
  
  // Fix reviews
  for (const review of findings.xss.reviews) {
    const current = db.prepare('SELECT title, pros, cons, advice FROM company_reviews WHERE id = ?').get(review.id);
    if (!current) continue;
    
    db.prepare(`
      UPDATE company_reviews 
      SET title = ?, pros = ?, cons = ?, advice = ?
      WHERE id = ?
    `).run(
      stripHtml(current.title),
      stripHtml(current.pros),
      stripHtml(current.cons),
      current.advice ? stripHtml(current.advice) : null,
      review.id
    );
    fixed++;
  }
  
  // Fix applications
  for (const app of findings.xss.applications) {
    const current = db.prepare('SELECT cover_letter FROM applications WHERE id = ?').get(app.id);
    if (!current) continue;
    
    db.prepare('UPDATE applications SET cover_letter = ? WHERE id = ?').run(
      stripHtml(current.cover_letter),
      app.id
    );
    fixed++;
  }
  
  console.log(`✅ Fixed ${fixed} XSS issues`);
}

/**
 * Generate report
 */
function generateReport(jsonOutput = false) {
  findings.summary.total_issues = 
    findings.xss.jobs.length +
    findings.xss.users.length +
    findings.xss.reviews.length +
    findings.xss.applications.length +
    findings.xss.contact_messages.length +
    findings.suspicious_users.length +
    findings.rate_limit_violations.length;

  if (jsonOutput) {
    console.log(JSON.stringify(findings, null, 2));
    return;
  }

  console.log('\n' + '='.repeat(60));
  console.log('🛡️  SECURITY AUDIT REPORT');
  console.log('='.repeat(60));
  console.log(`Scan Date: ${new Date().toISOString()}`);
  console.log(`Total Issues: ${findings.summary.total_issues}`);
  console.log(`  Critical: ${findings.summary.critical}`);
  console.log(`  High: ${findings.summary.high}`);
  console.log(`  Medium: ${findings.summary.medium}`);
  console.log(`  Low: ${findings.summary.low}`);
  console.log('='.repeat(60));

  if (findings.xss.jobs.length > 0) {
    console.log('\n🚨 CRITICAL: XSS in Jobs');
    findings.xss.jobs.forEach(job => {
      console.log(`  Job ID ${job.id} (Employer: ${job.employer_id}):`);
      job.issues.forEach(issue => {
        console.log(`    - ${issue.field}: ${issue.value.substring(0, 80)}...`);
      });
    });
  }

  if (findings.xss.users.length > 0) {
    console.log('\n🚨 CRITICAL: XSS in Users');
    findings.xss.users.forEach(user => {
      console.log(`  User ID ${user.id} (${user.email}):`);
      user.issues.forEach(issue => {
        console.log(`    - ${issue.field}: ${issue.value}`);
      });
    });
  }

  if (findings.suspicious_users.length > 0) {
    console.log('\n⚠️  SUSPICIOUS USERS');
    findings.suspicious_users.forEach(user => {
      console.log(`  ${user.email} (ID: ${user.id}, Role: ${user.role}) - ${user.reason}`);
    });
  }

  if (findings.rate_limit_violations.length > 0) {
    console.log('\n⚠️  RATE LIMIT VIOLATIONS');
    findings.rate_limit_violations.forEach(violation => {
      console.log(`  ${violation.email} (${violation.type}): ${violation.count} actions in ${violation.timeframe}`);
    });
  }

  if (findings.summary.total_issues === 0) {
    console.log('\n✅ No security issues found!');
  } else {
    console.log('\n💡 Recommendation: Review and address these issues immediately.');
    console.log('   Run with --fix to automatically sanitize XSS payloads.');
  }
  
  console.log('='.repeat(60) + '\n');
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const autoFixMode = args.includes('--fix');

  console.log('🛡️  WantokJobs Security Audit\n');
  
  try {
    scanJobs();
    scanUsers();
    scanReviews();
    scanApplications();
    scanContactMessages();
    checkRateLimits();
    
    if (autoFixMode && findings.summary.total_issues > 0) {
      autoFix();
    }
    
    generateReport(jsonOutput);
    
    // Exit with error code if critical issues found
    process.exit(findings.summary.critical > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Audit failed:', error.message);
    console.error(error.stack);
    process.exit(2);
  }
}

if (require.main === module) {
  main();
}

module.exports = { scanJobs, scanUsers, scanReviews, checkRateLimits, findings };
