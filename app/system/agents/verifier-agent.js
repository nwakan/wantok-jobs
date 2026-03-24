/**
 * Verifier Agent - Task 17: Candidate Verification Automation
 * 
 * Responsibilities:
 * - Verify job postings (company registry, email, phone, website)
 * - Verify employer accounts (PNG IPA registry, business registration)
 * - Calculate confidence scores (0-100)
 * - Store verification checks in database
 * 
 * Integration Points:
 * - POST /api/jobs (new job submission)
 * - Employer registration flow
 * - Scheduled cron job (daily re-verification)
 * 
 * Author: Agent Zero
 * Date: 2026-03-24
 */

const Database = require('better-sqlite3');
const path = require('path');
const https = require('https');
const dns = require('dns').promises;
const { URL } = require('url');

class VerifierAgent {
  constructor(dbPath) {
    this.db = new Database(dbPath || path.join(__dirname, '../../server/data/wantokjobs.db'));
    this.name = 'VerifierAgent';
    console.log('✅ VerifierAgent initialized');
  }

  /**
   * Main verification entry point for jobs
   */
  async verifyJob(jobId) {
    try {
      console.log(`
Verifying job ID: ${jobId}`);

      const job = this.db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
      if (!job) throw new Error(`Job ${jobId} not found`);

      console.log(`  Company: ${job.company_name}`);
      console.log(`  Email: ${job.apply_email || 'N/A'}`);
      console.log(`  Website: ${job.company_website || 'N/A'}`);

      const checks = {
        company: await this.checkCompanyRegistry(job.company_name),
        email: await this.verifyEmail(job.apply_email, job.company_website),
        website: await this.verifyWebsite(job.company_website),
      };

      const confidence = this.calculateConfidence(checks);
      const status = this.determineStatus(confidence, checks);

      ['company_registry', 'email', 'website'].forEach((type, i) => {
        const checkType = ['company', 'email', 'website'][i];
        this.saveVerificationCheck({
          entity_type: 'job',
          entity_id: jobId,
          check_type: type,
          status: checks[checkType].verified ? 'verified' : 'failed',
          confidence_score: checks[checkType].score,
          details: JSON.stringify(checks[checkType].details),
          checked_by: 'agent'
        });
      });

      console.log(`
  ✅ Verification complete`);
      console.log(`     Overall confidence: ${confidence}%`);
      console.log(`     Status: ${status}`);

      return { jobId, confidence, status, checks };
    } catch (error) {
      console.error(`❌ Verification failed for job ${jobId}:`, error.message);
      throw error;
    }
  }

  async checkCompanyRegistry(companyName) {
    try {
      if (!companyName || companyName === 'Various Employers') {
        return { verified: false, score: 0, details: { reason: 'Generic or missing company name' } };
      }

      const knownCompanies = [
        'Bank South Pacific', 'BSP', 'Air Niugini', 'PNG Power',
        'Bank of Papua New Guinea', 'BPNG', 'Ok Tedi Mining',
        'Santos Energy', 'NAC', 'Nasfund', 'Nambawan Super',
        'Digicel', 'Telikom', 'bmobile', 'ExxonMobil PNG',
        'Oil Search', 'Newcrest Mining', 'Barrick Gold',
        'PNG Ports', 'Steamships', 'NCDC', 'PNG University of Technology'
      ];

      const normalized = companyName.toLowerCase();
      const isKnown = knownCompanies.some(c => normalized.includes(c.toLowerCase()));

      if (isKnown) {
        return {
          verified: true,
          score: 100,
          details: { source: 'Known PNG company (whitelist)', company: companyName }
        };
      }

      return {
        verified: false,
        score: 50,
        details: { 
          reason: 'Company not in known list',
          note: 'PNG IPA registry API integration pending',
          company: companyName 
        }
      };
    } catch (error) {
      return { verified: false, score: 0, details: { error: error.message } };
    }
  }

  async verifyEmail(email, companyWebsite) {
    try {
      if (!email) return { verified: false, score: 0, details: { reason: 'No email provided' } };

      const emailDomain = email.split('@')[1];
      if (!emailDomain) return { verified: false, score: 0, details: { reason: 'Invalid email format' } };

      const freeProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
      const isFreeProvider = freeProviders.includes(emailDomain.toLowerCase());

      if (isFreeProvider) {
        return {
          verified: false,
          score: 30,
          details: { reason: 'Free email provider', domain: emailDomain }
        };
      }

      let domainMatch = false;
      if (companyWebsite) {
        try {
          const websiteDomain = new URL(companyWebsite).hostname.replace('www.', '');
          domainMatch = emailDomain.toLowerCase() === websiteDomain.toLowerCase();
        } catch (e) {}
      }

      try {
        const mxRecords = await dns.resolveMx(emailDomain);
        if (mxRecords && mxRecords.length > 0) {
          return {
            verified: true,
            score: domainMatch ? 100 : 80,
            details: { domain: emailDomain, mxRecords: mxRecords.length, domainMatch }
          };
        }
      } catch (error) {
        return { verified: false, score: 50, details: { domain: emailDomain, error: 'MX lookup failed' } };
      }

      return { verified: false, score: 40, details: { domain: emailDomain } };
    } catch (error) {
      return { verified: false, score: 0, details: { error: error.message } };
    }
  }

  async verifyWebsite(websiteUrl) {
    try {
      if (!websiteUrl) return { verified: false, score: 0, details: { reason: 'No website provided' } };

      let url;
      try {
        url = new URL(websiteUrl);
      } catch (e) {
        return { verified: false, score: 0, details: { reason: 'Invalid URL format' } };
      }

      return new Promise((resolve) => {
        const request = https.get(url, { timeout: 5000 }, (res) => {
          const statusCode = res.statusCode;
          request.abort();

          if (statusCode === 200) {
            resolve({ verified: true, score: 100, details: { url: websiteUrl, statusCode } });
          } else if (statusCode >= 300 && statusCode < 400) {
            resolve({ verified: true, score: 80, details: { url: websiteUrl, statusCode } });
          } else {
            resolve({ verified: false, score: 30, details: { url: websiteUrl, statusCode } });
          }
        });

        request.on('error', (error) => {
          resolve({ verified: false, score: 0, details: { url: websiteUrl, error: error.message } });
        });

        request.on('timeout', () => {
          request.abort();
          resolve({ verified: false, score: 20, details: { url: websiteUrl, error: 'Timeout' } });
        });
      });
    } catch (error) {
      return { verified: false, score: 0, details: { error: error.message } };
    }
  }

  calculateConfidence(checks) {
    const weights = { company: 0.40, email: 0.20, website: 0.40 };
    return Math.round(
      (checks.company.score * weights.company) +
      (checks.email.score * weights.email) +
      (checks.website.score * weights.website)
    );
  }

  determineStatus(confidence, checks) {
    if (confidence >= 80) return 'verified';
    if (confidence >= 50) return 'pending';
    if (checks.company.score === 0 && checks.website.score === 0) return 'flagged';
    return 'failed';
  }

  saveVerificationCheck(data) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO verification_checks (entity_type, entity_id, check_type, status, confidence_score, details, checked_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(entity_type, entity_id, check_type) DO UPDATE SET
          status = excluded.status,
          confidence_score = excluded.confidence_score,
          details = excluded.details,
          checked_at = datetime('now'),
          checked_by = excluded.checked_by
      `);

      stmt.run(
        data.entity_type,
        data.entity_id,
        data.check_type,
        data.status,
        data.confidence_score,
        data.details,
        data.checked_by
      );
    } catch (error) {
      console.error('Failed to save verification check:', error.message);
    }
  }

  close() {
    this.db.close();
    console.log('✅ VerifierAgent closed');
  }
}

module.exports = VerifierAgent;

if (require.main === module) {
  (async () => {
    const agent = new VerifierAgent();
    try {
      const jobId = process.argv[2] || 1;
      console.log(`
🔍 Testing Verifier Agent with job ID: ${jobId}`);
      const result = await agent.verifyJob(parseInt(jobId));
      console.log(`
📊 Final Result:`, JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    } finally {
      agent.close();
    }
  })();
}
