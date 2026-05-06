/**
 * WhatsApp Employer Actions Module
 * Handles employer-specific WhatsApp commands: post job, view jobs, manage applicants
 */

const db = require('../database');
const logger = require('../utils/logger');

/**
 * Handle "post job" command - Multi-step conversational job posting flow
 * @param {Object} session - WhatsApp session object
 * @param {string} message - User message text
 * @param {Object} user - User object (must be employer)
 * @param {string} phone - WhatsApp phone number
 * @returns {Object} { handled: boolean, message: string, continueFlow: boolean }
 */
async function handlePostJob(session, message, user, phone) {
  // Check if user is employer
  if (!user || user.role !== 'employer') {
    return {
      handled: true,
      message: `To post jobs, you need an employer account. 🏢\n\nIf you're hiring, please register as an employer at https://wantokjobs.com/register\n\nOr send "help" for more options!`
    };
  }

  // Get or initialize job posting flow state
  let flowState = {};
  try {
    flowState = JSON.parse(session.flow_state || '{}');
  } catch (e) {
    flowState = {};
  }

  // Start new job posting flow
  if (!flowState.job_posting_active) {
    flowState = {
      job_posting_active: true,
      step: 'title',
      data: {},
      started_at: new Date().toISOString()
    };

    db.prepare('UPDATE whatsapp_sessions SET flow_state = ? WHERE id = ?')
      .run(JSON.stringify(flowState), session.id);

    return {
      handled: true,
      message: `Let's create a job posting! 🎉\n\n*Step 1 of 5*\nWhat's the job title? (e.g., Accountant, Driver, IT Manager)`,
      continueFlow: true
    };
  }

  // Process based on current step
  const lower = message.toLowerCase().trim();

  // Allow user to cancel flow
  if (lower === 'cancel' || lower === 'stop') {
    db.prepare('UPDATE whatsapp_sessions SET flow_state = NULL WHERE id = ?')
      .run(session.id);

    return {
      handled: true,
      message: `Job posting cancelled. No worries! You can start again anytime with "post job". 👍`
    };
  }

  // Step 1: Collect Job Title
  if (flowState.step === 'title') {
    const title = message.trim();

    // Validation
    if (title.length < 3) {
      return {
        handled: true,
        message: `That's too short for a job title. Please provide a proper job title (e.g., Accountant, Driver, IT Manager)`,
        continueFlow: true
      };
    }

    if (title.length > 100) {
      return {
        handled: true,
        message: `That's too long. Job title should be under 100 characters. Try shortening it!`,
        continueFlow: true
      };
    }

    flowState.data.title = title;
    flowState.step = 'location';

    db.prepare('UPDATE whatsapp_sessions SET flow_state = ? WHERE id = ?')
      .run(JSON.stringify(flowState), session.id);

    return {
      handled: true,
      message: `Great! ✅ Job title: *${title}*\n\n*Step 2 of 5*\nWhere is this job located? (e.g., Port Moresby, Lae, Mt Hagen, Remote)`,
      continueFlow: true
    };
  }

  // Step 2: Collect Location
  if (flowState.step === 'location') {
    const location = message.trim();

    // Validation
    if (location.length < 2) {
      return {
        handled: true,
        message: `Please provide a valid location (e.g., Port Moresby, Lae, Remote)`,
        continueFlow: true
      };
    }

    flowState.data.location = location;
    flowState.step = 'description';

    db.prepare('UPDATE whatsapp_sessions SET flow_state = ? WHERE id = ?')
      .run(JSON.stringify(flowState), session.id);

    return {
      handled: true,
      message: `Perfect! ✅ Location: *${location}*\n\n*Step 3 of 5*\nDescribe the job role and responsibilities.\n\nType a brief description (you can edit it later on the website).`,
      continueFlow: true
    };
  }

  // Step 3: Collect Description
  if (flowState.step === 'description') {
    const description = message.trim();

    // Validation
    if (description.length < 20) {
      return {
        handled: true,
        message: `Description is too short. Please provide at least 20 characters describing the role.`,
        continueFlow: true
      };
    }

    if (description.length > 5000) {
      return {
        handled: true,
        message: `Description is too long. Please keep it under 5000 characters.`,
        continueFlow: true
      };
    }

    flowState.data.description = description;
    flowState.step = 'salary';

    db.prepare('UPDATE whatsapp_sessions SET flow_state = ? WHERE id = ?')
      .run(JSON.stringify(flowState), session.id);

    return {
      handled: true,
      message: `Excellent! ✅ Description saved.\n\n*Step 4 of 5*\nWhat's the salary range?\n\nExamples:\n• "50000 PGK per year"\n• "2000-3000 PGK per month"\n• "25 PGK per hour"\n• Type "skip" to leave it blank`,
      continueFlow: true
    };
  }

  // Step 4: Collect Salary (Optional)
  if (flowState.step === 'salary') {
    if (lower === 'skip') {
      flowState.data.salary_min = null;
      flowState.data.salary_max = null;
      flowState.data.salary_currency = 'PGK';
      flowState.data.salary_period = 'year';
    } else {
      // Parse salary from message
      const salaryData = parseSalary(message);

      if (!salaryData.valid) {
        return {
          handled: true,
          message: `I couldn't understand that salary format. Try:\n• "50000 PGK per year"\n• "2000-3000 per month"\n• "25 per hour"\n\nOr type "skip" to leave it blank.`,
          continueFlow: true
        };
      }

      flowState.data.salary_min = salaryData.min;
      flowState.data.salary_max = salaryData.max;
      flowState.data.salary_currency = salaryData.currency;
      flowState.data.salary_period = salaryData.period;
    }

    flowState.step = 'confirm';

    db.prepare('UPDATE whatsapp_sessions SET flow_state = ? WHERE id = ?')
      .run(JSON.stringify(flowState), session.id);

    // Generate salary display text
    let salaryText = 'Not specified';
    if (flowState.data.salary_min || flowState.data.salary_max) {
      const min = flowState.data.salary_min;
      const max = flowState.data.salary_max;
      const currency = flowState.data.salary_currency;
      const period = flowState.data.salary_period;

      if (min && max && min !== max) {
        salaryText = `${currency} ${min.toLocaleString()} - ${max.toLocaleString()} per ${period}`;
      } else if (min || max) {
        salaryText = `${currency} ${(min || max).toLocaleString()} per ${period}`;
      }
    }

    return {
      handled: true,
      message: `Great! ✅\n\n*Step 5 of 5 - Review Your Job Posting*\n\n📋 *Job Title:* ${flowState.data.title}\n📍 *Location:* ${flowState.data.location}\n💰 *Salary:* ${salaryText}\n\n📝 *Description:*\n${flowState.data.description.substring(0, 200)}${flowState.data.description.length > 200 ? '...' : ''}\n\n━━━━━━━━━━━━━━━━\nReply *"confirm"* to post this job\nReply *"cancel"* to start over`,
      continueFlow: true
    };
  }

  // Step 5: Confirmation
  if (flowState.step === 'confirm') {
    if (lower !== 'confirm') {
      return {
        handled: true,
        message: `Please reply "confirm" to post the job or "cancel" to start over.`,
        continueFlow: true
      };
    }

    // Get employer profile
    const profile = db.prepare('SELECT * FROM profiles_employer WHERE user_id = ?').get(user.id);

    // Create job in database
    const result = db.prepare(`
      INSERT INTO jobs (
        employer_id, title, description, location,
        salary_min, salary_max, salary_currency, salary_period,
        job_type, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))
    `).run(
      user.id,
      flowState.data.title,
      flowState.data.description,
      flowState.data.location,
      flowState.data.salary_min,
      flowState.data.salary_max,
      flowState.data.salary_currency || 'PGK',
      flowState.data.salary_period || 'year',
      'full-time'
    );

    const jobId = result.lastInsertRowid;

    // Clear flow state
    db.prepare('UPDATE whatsapp_sessions SET flow_state = NULL WHERE id = ?')
      .run(session.id);

    // Generate salary display text
    let salaryText = '';
    if (flowState.data.salary_min || flowState.data.salary_max) {
      const min = flowState.data.salary_min;
      const max = flowState.data.salary_max;
      const currency = flowState.data.salary_currency;
      const period = flowState.data.salary_period;

      if (min && max && min !== max) {
        salaryText = `\n💰 *Salary:* ${currency} ${min.toLocaleString()} - ${max.toLocaleString()} per ${period}`;
      }      } else if (min || max) {
        salaryText = `\n💰 *Salary:* ${currency} ${(min || max).toLocaleString()} per ${period}`;
      }
    }

    return {
      handled: true,
      message: `🎉 *Job Posted Successfully!*\n\n📋 *${flowState.data.title}*\n📍 Location: ${flowState.data.location}${salaryText}\n\n✅ Your job is now live on WantokJobs!\n🔗 https://wantokjobs.com/jobs/${jobId}\n\nWhat's next?\n• Applicants will see your job immediately\n• You'll get notifications when people apply\n• Manage applications at https://wantokjobs.com/dashboard/employer\n\nWant to post another job? Just type "post job" anytime! 🚀`
    };
  }

  return { handled: false };
}

/**
 * Handle "view my jobs" command - Show employer's active job postings
 * @param {Object} user - User object (must be employer)
 * @returns {Object} { handled: boolean, message: string }
 */
async function handleViewMyJobs(user) {
  // Check if user is employer
  if (!user || user.role !== 'employer') {
    return {
      handled: true,
      message: `This feature is for employers only. If you're hiring, please register as an employer at https://wantokjobs.com/register`
    };
  }

  // Query employer's jobs
  const jobs = db.prepare(`
    SELECT 
      j.id, j.title, j.location, j.status, j.created_at,
      j.salary_min, j.salary_max, j.salary_currency, j.salary_period,
      COUNT(a.id) as application_count
    FROM jobs j
    LEFT JOIN applications a ON j.id = a.job_id
    WHERE j.employer_id = ?
    GROUP BY j.id
    ORDER BY j.created_at DESC
    LIMIT 10
  `).all(user.id);

  if (jobs.length === 0) {
    return {
      handled: true,
      message: `You haven't posted any jobs yet. 📋\n\nWant to post your first job? Just type "post job" and I'll guide you through it! 🚀`
    };
  }

  // Format jobs list
  const jobsList = jobs.map((job, index) => {
    const statusEmoji = job.status === 'active' ? '✅' : job.status === 'closed' ? '🔒' : '⏸️';
    const appCountText = job.application_count > 0 ? ` (${job.application_count} ${job.application_count === 1 ? 'applicant' : 'applicants'})` : '';
    
    let salaryText = '';
    if (job.salary_min || job.salary_max) {
      const min = job.salary_min;
      const max = job.salary_max;
      const currency = job.salary_currency || 'PGK';
      const period = job.salary_period || 'year';

      if (min && max && min !== max) {
        salaryText = `\n   💰 ${currency} ${min.toLocaleString()} - ${max.toLocaleString()} per ${period}`;
      } else if (min || max) {
        salaryText = `\n   💰 ${currency} ${(min || max).toLocaleString()} per ${period}`;
      }
    }

    return `${index + 1}. ${statusEmoji} *${job.title}*\n   📍 ${job.location}${salaryText}${appCountText}`;
  }).join('\n\n');

  return {
    handled: true,
    message: `📋 *Your Job Postings (${jobs.length})*\n\n${jobsList}\n\n━━━━━━━━━━━━━━━━\nManage jobs: https://wantokjobs.com/dashboard/employer/jobs\nPost another: Type "post job"`
  };
}

/**
 * Parse salary from natural language message
 * @param {string} message - User message containing salary info
 * @returns {Object} { valid: boolean, min: number, max: number, currency: string, period: string }
 */
function parseSalary(message) {
  const result = {
    valid: false,
    min: null,
    max: null,
    currency: 'PGK',
    period: 'year'
  };

  // Extract currency (default PGK)
  const currencyMatch = message.match(/\b(PGK|K|AUD|USD|NZD)\b/i);
  if (currencyMatch) {
    result.currency = currencyMatch[1].toUpperCase() === 'K' ? 'PGK' : currencyMatch[1].toUpperCase();
  }

  // Extract period
  if (/\b(per hour|hourly|hour)\b/i.test(message)) {
    result.period = 'hour';
  } else if (/\b(per month|monthly|month)\b/i.test(message)) {
    result.period = 'month';
  } else if (/\b(per week|weekly|week)\b/i.test(message)) {
    result.period = 'week';
  } else if (/\b(per year|yearly|annually|year|annual)\b/i.test(message)) {
    result.period = 'year';
  } else if (/\b(fortnightly|fortnight)\b/i.test(message)) {
    result.period = 'fortnight';
  }

  // Extract salary numbers
  // Pattern 1: Range with dash (e.g., "50000-70000", "2000 - 3000")
  const rangeMatch = message.match(/\b(\d{1,3}(?:,?\d{3})*)\s*-\s*(\d{1,3}(?:,?\d{3})*)\b/);
  if (rangeMatch) {
    result.min = parseInt(rangeMatch[1].replace(/,/g, ''));
    result.max = parseInt(rangeMatch[2].replace(/,/g, ''));
    result.valid = true;
    return result;
  }

  // Pattern 2: Range with "to" (e.g., "50000 to 70000")
  const rangeToMatch = message.match(/\b(\d{1,3}(?:,?\d{3})*)\s+to\s+(\d{1,3}(?:,?\d{3})*)\b/i);
  if (rangeToMatch) {
    result.min = parseInt(rangeToMatch[1].replace(/,/g, ''));
    result.max = parseInt(rangeToMatch[2].replace(/,/g, ''));
    result.valid = true;
    return result;
  }

  // Pattern 3: Single number (e.g., "50000", "2,500")
  const singleMatch = message.match(/\b(\d{1,3}(?:,?\d{3})*)\b/);
  if (singleMatch) {
    const amount = parseInt(singleMatch[1].replace(/,/g, ''));
    result.min = amount;
    result.max = amount;
    result.valid = true;
    return result;
  }

  return result;
}

module.exports = {
  handlePostJob,
  handleViewMyJobs,
  parseSalary
};
