/**
 * Fraud Detector Agent - Task 17: Candidate Verification Automation
 * 
 * Detects and flags fraudulent activity across jobs, employers, and jobseekers.
 * 
 * Author: Agent Zero
 * Date: 2026-03-24
 */

const Database = require('better-sqlite3');
const path = require('path');

class FraudDetectorAgent {
  constructor(dbPath) {
    this.db = new Database(dbPath || path.join(__dirname, '../../server/data/wantokjobs.db'));
    this.name = 'FraudDetectorAgent';
    console.log('✅ FraudDetectorAgent initialized');
  }

  async detectFraud(entityType, entityId) {
    try {
      console.log(`\nDetecting fraud for ${entityType} ID: ${entityId}`);
      let flags = [];

      if (entityType === 'employer') {
        const employer = this.db.prepare('SELECT * FROM users WHERE id = ? AND role = "employer"').get(entityId);
        if (!employer) throw new Error(`Employer ${entityId} not found`);
        flags = [...await this.detectDuplicateAccounts(employer), ...await this.detectFakeEmployer(employer)];
      } else if (entityType === 'job') {
        const job = this.db.prepare('SELECT * FROM jobs WHERE id = ?').get(entityId);
        if (!job) throw new Error(`Job ${entityId} not found`);
        flags = await this.detectScamJob(job);
      } else if (entityType === 'jobseeker') {
        flags = await this.detectMassApplyBot(entityId);
      }

      flags.forEach(flag => this.saveFraudFlag(flag));
      console.log(`  ✅ Fraud detection complete: ${flags.length} flags`);
      return { entityType, entityId, flags };
    } catch (error) {
      console.error(`❌ Fraud detection failed:`, error.message);
      throw error;
    }
  }

  async detectDuplicateAccounts(employer) {
    const flags = [];
    const emailDomain = employer.email.split('@')[1];
    const similarCompanies = this.db.prepare(`SELECT id, company_name, email FROM users WHERE role = 'employer' AND id != ? AND email LIKE ?`).all(employer.id, `%@${emailDomain}`);

    for (const company of similarCompanies) {
      const similarity = this.calculateSimilarity(employer.company_name?.toLowerCase() || '', company.company_name?.toLowerCase() || '');
      if (similarity > 0.7) {
        flags.push({ entity_type: 'employer', entity_id: employer.id, flag_type: 'duplicate_account', severity: 'high',
          details: JSON.stringify({ reason: 'Same email domain with similar company name', similarity_score: similarity, duplicate_id: company.id }) });
      }
    }
    return flags;
  }

  async detectFakeEmployer(employer) {
    const flags = [];
    const freeProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    const emailDomain = employer.email.split('@')[1]?.toLowerCase();
    if (freeProviders.includes(emailDomain)) {
      flags.push({ entity_type: 'employer', entity_id: employer.id, flag_type: 'fake_employer', severity: 'medium',
        details: JSON.stringify({ reason: 'Using free email provider', email_domain: emailDomain }) });
    }
    return flags;
  }

  async detectMassApplyBot(userId) {
    const flags = [];
    const oneHourAgo = new Date(Date.now() - 60*60*1000).toISOString();
    const recentApps = this.db.prepare('SELECT COUNT(*) as count FROM applications WHERE user_id = ? AND created_at > ?').get(userId, oneHourAgo);
    if (recentApps.count > 50) {
      flags.push({ entity_type: 'jobseeker', entity_id: userId, flag_type: 'mass_apply_bot', severity: 'critical',
        details: JSON.stringify({ reason: '>50 applications in 1 hour', count: recentApps.count }) });
    }
    return flags;
  }

  async detectScamJob(job) {
    const flags = [];
    const scamKeywords = ['work from home', 'earn money fast', 'no experience required'];
    const desc = (job.description || '').toLowerCase();
    const matchedKeywords = scamKeywords.filter(k => desc.includes(k));
    if (matchedKeywords.length > 0 && job.salary_max > 10000) {
      flags.push({ entity_type: 'job', entity_id: job.id, flag_type: 'scam_posting', severity: 'critical',
        details: JSON.stringify({ reason: 'Scam keywords + high salary', keywords: matchedKeywords }) });
    }
    return flags;
  }

  calculateSimilarity(str1, str2) {
    const set1 = new Set(str1.toLowerCase().split(' '));
    const set2 = new Set(str2.toLowerCase().split(' '));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    return intersection.size / Math.max(set1.size, set2.size);
  }

  saveFraudFlag(data) {
    this.db.prepare('INSERT INTO fraud_flags (entity_type, entity_id, flag_type, severity, details) VALUES (?, ?, ?, ?, ?)').run(
      data.entity_type, data.entity_id, data.flag_type, data.severity, data.details);
  }

  close() { this.db.close(); }
}

module.exports = FraudDetectorAgent;
