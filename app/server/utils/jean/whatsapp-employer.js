/**
 * WhatsApp Employer Handler for Jean
 * Handles SME employer flow via WhatsApp — quick job posting, credit purchases, payments
 */

const pricing = require('./sme-pricing');
const personality = require('./personality');
const actions = require('./actions');
const { generateText } = require('../../lib/ai-router');
const logger = require('../../utils/logger');

/**
 * Parse natural language job description into structured data
 * Uses AI for complex messages, regex for simple ones
 */
async function parseJobFromMessage(message) {
  const text = message.trim();

  // Try simple regex patterns first
  const simplePatterns = {
    title: /(?:need|looking for|hiring|want)\s+(?:a\s+|an\s+)?([a-z\s]+?)(?:\s+in|\s+at|\s+for|\s*,|\s*$)/i,
    location: /\b(?:in|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/,
    salary: /k\s*(\d+(?:,?\d+)*)\s*(?:-|to)?\s*(?:k\s*(\d+(?:,?\d+)*))?(?:\s*per\s*(fortnight|month|week|year|hour))?/i,
  };

  const simple = {
    title: null,
    location: null,
    salary_min: null,
    salary_max: null,
    salary_period: null,
  };

  const titleMatch = text.match(simplePatterns.title);
  if (titleMatch) simple.title = titleMatch[1].trim();

  const locMatch = text.match(simplePatterns.location);
  if (locMatch) simple.location = locMatch[1];

  const salaryMatch = text.match(simplePatterns.salary);
  if (salaryMatch) {
    simple.salary_min = parseInt(salaryMatch[1].replace(/,/g, ''));
    if (salaryMatch[2]) simple.salary_max = parseInt(salaryMatch[2].replace(/,/g, ''));
    if (salaryMatch[3]) simple.salary_period = salaryMatch[3].toLowerCase();
  }

  // If we got all fields from regex, return immediately
  if (simple.title && simple.location) {
    return {
      ...simple,
      description: text,
      confidence: 0.8,
      method: 'regex',
    };
  }

  // Otherwise use AI for complex parsing
  try {
    const prompt = `Extract job posting details from this message. Return JSON only, no explanation.

Message: "${text}"

Extract:
- title: job title/role
- location: city/province in Papua New Guinea
- salary_min: minimum salary (number only, no currency)
- salary_max: maximum salary if mentioned (number only)
- salary_period: "fortnight", "month", "week", "year", or null
- job_type: "full-time", "part-time", "contract", "casual", or null
- description: brief description of the role

Return valid JSON object with these fields.`;

    const result = await generateText(prompt, { temperature: 0.3, maxTokens: 500 });
    
    // Clean and parse JSON
    let jsonText = result.text.trim();
    jsonText = jsonText.replace(/^```json?\s*/, '').replace(/\s*```$/, '');
    
    const parsed = JSON.parse(jsonText);
    
    return {
      ...parsed,
      confidence: 0.9,
      method: 'ai',
    };
  } catch (e) {
    logger.error('WhatsApp employer AI parse failed:', e.message);
    // Fallback to simple parse
    return {
      ...simple,
      description: text,
      confidence: 0.5,
      method: 'fallback',
    };
  }
}

/**
 * Handle employer greeting/registration
 */
function handleEmployerGreeting(db, phoneNumber, user) {
  // Check if phone is linked to an employer
  const linked = db.prepare(`
    SELECT we.*, u.name, u.email, pe.company_name 
    FROM whatsapp_employers we
    JOIN users u ON we.user_id = u.id
    LEFT JOIN profiles_employer pe ON u.id = pe.user_id
    WHERE we.phone_number = ?
  `).get(phoneNumber);

  if (linked) {
    const name = linked.name?.split(' ')[0] || 'there';
    const company = linked.company_name ? ` at ${linked.company_name}` : '';
    
    // Get job stats
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_jobs,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_jobs,
        (SELECT COUNT(*) FROM applications a JOIN jobs j ON a.job_id = j.id WHERE j.employer_id = ?) as total_applicants
      FROM jobs WHERE employer_id = ?
    `).get(linked.user_id, linked.user_id);

    const balance = pricing.getBalance(db, linked.user_id);

    let msg = `👋 Hey ${name}${company}! Good to have you back.\n\n`;
    msg += `📊 **Your Stats:**\n`;
    msg += `• ${stats.active_jobs || 0} active job${stats.active_jobs === 1 ? '' : 's'}\n`;
    msg += `• ${stats.total_applicants || 0} applicant${stats.total_applicants === 1 ? '' : 's'} total\n`;
    msg += `• ${balance.available} credit${balance.available === 1 ? '' : 's'} available\n\n`;
    msg += `What can I help you with today? 😊`;

    return {
      message: personality.humanize(msg),
      quickReplies: ['Post a Job', 'Check Applicants', 'Buy Credits'],
      user_id: linked.user_id,
      is_new: false,
    };
  }

  // New employer
  const msg = `👋 Welcome to WantokJobs! I'm Jean, your hiring assistant.\n\n` +
    `I can help you post jobs and find the right people — all via WhatsApp! Em i isi tasol.\n\n` +
    `First, what's your company name?`;

  return {
    message: personality.humanize(msg),
    quickReplies: null,
    is_new: true,
  };
}

/**
 * Create a lightweight employer account for WhatsApp
 */
function createQuickEmployer(db, phoneNumber, companyName, location) {
  try {
    // Create user account
    const email = `whatsapp_${phoneNumber.replace(/\+/g, '')}@temp.wantokjobs.com`;
    const userResult = db.prepare(`
      INSERT INTO users (email, name, role, password_hash, account_status, email_verified, created_at)
      VALUES (?, ?, 'employer', '', 'unverified', 0, datetime('now'))
    `).run(email, companyName);

    const userId = userResult.lastInsertRowid;

    // Create employer profile
    db.prepare(`
      INSERT INTO profiles_employer (user_id, company_name, location, country, profile_complete)
      VALUES (?, ?, ?, 'Papua New Guinea', 0)
    `).run(userId, companyName, location || null);

    // Link WhatsApp number
    db.prepare(`
      INSERT INTO whatsapp_employers (phone_number, user_id, verified, created_at)
      VALUES (?, ?, 0, datetime('now'))
    `).run(phoneNumber, userId);

    // Initialize credit wallet
    db.prepare(`
      INSERT INTO credit_wallets (user_id, balance, reserved_balance)
      VALUES (?, 0, 0)
    `).run(userId);

    return { success: true, user_id: userId };
  } catch (e) {
    logger.error('Failed to create quick employer:', e.message);
    return { error: e.message };
  }
}

/**
 * Handle quick job posting flow
 */
async function handleQuickJobPost(db, userId, message, flowState) {
  const state = flowState || { step: 'parse' };

  if (state.step === 'parse') {
    // Parse the job from message
    const parsed = await parseJobFromMessage(message);

    if (!parsed.title) {
      return {
        message: personality.humanize(
          "I couldn't quite catch the job title. Can you tell me again?\n\n" +
          "For example: 'I need a driver in Lae, K800 per fortnight'"
        ),
        flowState: state,
      };
    }

    // Build job card
    let card = `📋 **${parsed.title}**\n`;
    if (parsed.location) card += `📍 ${parsed.location}\n`;
    if (parsed.salary_min) {
      card += `💰 K${parsed.salary_min}`;
      if (parsed.salary_max) card += `-${parsed.salary_max}`;
      if (parsed.salary_period) card += ` per ${parsed.salary_period}`;
      card += `\n`;
    }

    // Check if user has credits or can use free trial
    const balance = pricing.getBalance(db, userId);
    const canUseFree = pricing.canPostFree(db, userId);

    if (balance.available > 0) {
      card += `\n✅ You have ${balance.available} credit${balance.available > 1 ? 's' : ''}. This will use 1 credit.\n\n`;
      state.has_credits = true;
    } else if (canUseFree) {
      card += `\n🎉 Your first job post is **FREE** for 7 days!\n\n`;
      state.is_free_trial = true;
    } else {
      card += `\n⚠️ You need 1 credit to post this job (K50 for single post).\n\n`;
      state.needs_payment = true;
    }

    card += `Should I post this now? (Yes/No/Edit)`;

    state.step = 'confirm';
    state.parsed_job = parsed;

    return {
      message: personality.humanize(card),
      quickReplies: state.needs_payment ? ['Buy Credits', 'Edit Job', 'Cancel'] : ['Yes', 'Edit', 'No'],
      flowState: state,
    };
  }

  if (state.step === 'confirm') {
    const input = message.toLowerCase().trim();

    if (/^(yes|y|ok|post|go|confirm|em tasol)/.test(input)) {
      // Check credits again
      const balance = pricing.getBalance(db, userId);
      const canUseFree = pricing.canPostFree(db, userId);

      if (balance.available === 0 && !canUseFree) {
        return {
          message: personality.humanize(
            "You don't have any credits. Would you like to buy some?\n\n" + 
            pricing.formatPricingMessage(db, userId)
          ),
          quickReplies: ['Buy Credits', 'Cancel'],
          flowState: null,
        };
      }

      // Post the job
      const jobData = {
        title: state.parsed_job.title,
        description: state.parsed_job.description || state.parsed_job.title,
        location: state.parsed_job.location,
        salary_min: state.parsed_job.salary_min,
        salary_max: state.parsed_job.salary_max,
        job_type: state.parsed_job.job_type || 'full-time',
        status: 'active',
        country: 'Papua New Guinea',
      };

      const result = actions.postJob(db, userId, jobData);

      if (result.success) {
        // Deduct credit (or mark free trial used)
        if (canUseFree) {
          pricing.deductCredit(db, userId, result.jobId, 'Free trial - first job post');
          // Add the free credit first so deduction works
          db.prepare(`
            UPDATE credit_wallets SET balance = balance + 1 WHERE user_id = ?
          `).run(userId);
        } else {
          pricing.deductCredit(db, userId, result.jobId, 'Job post via WhatsApp');
        }

        // Get real-time stats
        const stats = getLocationStats(db, state.parsed_job.location);

        let msg = `✅ **Job Posted!** It's now live on WantokJobs! 🎉\n\n`;
        msg += `**${state.parsed_job.title}**\n`;
        if (state.parsed_job.location) msg += `📍 ${state.parsed_job.location}\n`;
        msg += `\n🔗 View: https://wantokjobs.com/jobs/${result.jobId}\n\n`;

        if (stats.jobseekers > 0) {
          msg += `💡 **Good news!** ${stats.jobseekers} jobseeker${stats.jobseekers === 1 ? '' : 's'} in ${state.parsed_job.location}`;
          if (stats.matching_alerts > 0) {
            msg += `, and ${stats.matching_alerts} will get alerts about your job!`;
          }
          msg += `\n\n`;
        }

        const newBalance = pricing.getBalance(db, userId);
        msg += `📊 You have ${newBalance.available} credit${newBalance.available === 1 ? '' : 's'} left.`;

        if (newBalance.available === 0) {
          msg += `\n\nWant to post more? ${pricing.getPackageRecommendation(db, userId).reason}`;
        }

        return {
          message: personality.humanize(msg),
          quickReplies: newBalance.available > 0 ? ['Post Another Job', 'Check Applicants', 'Buy More Credits'] : ['Buy Credits', 'Check Applicants'],
          flowState: null,
        };
      }

      return {
        message: personality.humanize("Sorry, something went wrong posting the job. Sori tru! Please try again."),
        quickReplies: ['Try Again', 'Contact Support'],
        flowState: null,
      };
    }

    if (/^(no|n|cancel|stop|nogat)/.test(input)) {
      return {
        message: personality.humanize("No worries! Job post cancelled. Want to try something else?"),
        quickReplies: ['Post a Different Job', 'Check Applicants', 'Buy Credits'],
        flowState: null,
      };
    }

    if (/edit/.test(input)) {
      return {
        message: personality.humanize("Orait! Tell me what to change — title, location, or salary?"),
        quickReplies: ['Change Title', 'Change Location', 'Change Salary', 'Rewrite Everything'],
        flowState: { ...state, step: 'edit' },
      };
    }

    // Unclear response
    return {
      message: personality.humanize("I didn't quite catch that. Should I post this job? (Yes/No/Edit)"),
      quickReplies: ['Yes', 'No', 'Edit'],
      flowState: state,
    };
  }

  if (state.step === 'edit') {
    // Handle editing
    return {
      message: personality.humanize("Editing not yet implemented — coming soon! For now, you can repost with the changes you want. 😊"),
      quickReplies: ['Post New Job', 'Cancel'],
      flowState: null,
    };
  }

  return {
    message: personality.humanize("Something went wrong with the job posting flow. Sori tru! Let's start fresh."),
    quickReplies: ['Post a Job', 'Help'],
    flowState: null,
  };
}

/**
 * Get location-based stats for sales pitch
 */
function getLocationStats(db, location) {
  if (!location) return { jobseekers: 0, active_jobs: 0, matching_alerts: 0 };

  try {
    const jobseekerCount = db.prepare(`
      SELECT COUNT(DISTINCT pj.user_id) as count
      FROM profiles_jobseeker pj
      JOIN users u ON pj.user_id = u.id
      WHERE pj.location LIKE ? AND u.account_status = 'active'
    `).get(`%${location}%`);

    const activeJobs = db.prepare(`
      SELECT COUNT(*) as count FROM jobs 
      WHERE location LIKE ? AND status = 'active'
    `).get(`%${location}%`);

    const alerts = db.prepare(`
      SELECT COUNT(*) as count FROM job_alerts
      WHERE location LIKE ? AND active = 1
    `).get(`%${location}%`);

    return {
      jobseekers: jobseekerCount?.count || 0,
      active_jobs: activeJobs?.count || 0,
      matching_alerts: alerts?.count || 0,
    };
  } catch (e) {
    logger.error('Failed to get location stats:', e.message);
    return { jobseekers: 0, active_jobs: 0, matching_alerts: 0 };
  }
}

/**
 * Get job performance stats for upsell
 */
function getJobPerformanceStats(db, category, location) {
  try {
    const stats = db.prepare(`
      SELECT 
        AVG(app_count) as avg_applications,
        AVG(julianday(COALESCE(hired_at, datetime('now'))) - julianday(j.created_at)) as avg_days_to_fill
      FROM jobs j
      LEFT JOIN (
        SELECT job_id, COUNT(*) as app_count, MIN(CASE WHEN status = 'hired' THEN applied_at END) as hired_at
        FROM applications
        GROUP BY job_id
      ) a ON j.id = a.job_id
      WHERE j.status IN ('active', 'closed')
        ${category ? "AND j.category_slug = ?" : ""}
        ${location ? "AND j.location LIKE ?" : ""}
        AND j.created_at >= datetime('now', '-90 days')
    `).get(...[category, location ? `%${location}%` : null].filter(Boolean));

    return {
      avg_applications: Math.round(stats?.avg_applications || 0),
      avg_days_to_fill: Math.round(stats?.avg_days_to_fill || 0),
    };
  } catch (e) {
    return { avg_applications: 0, avg_days_to_fill: 0 };
  }
}

module.exports = {
  parseJobFromMessage,
  handleEmployerGreeting,
  createQuickEmployer,
  handleQuickJobPost,
  getLocationStats,
  getJobPerformanceStats,
};
