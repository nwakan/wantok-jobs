/**
 * Jean AI Sales Agent — Core Engine
 * Orchestrates intent classification, flow management, actions, and responses.
 */

const db = require('../../database');
const { classify } = require('./intents');
const { FlowEngine } = require('./flows');
const { getResponse } = require('./responses');
const actions = require('./actions');
const personality = require('./personality');
const linkedin = require('./scrapers/linkedin');
const { extractText: extractPdfText } = require('./parsers/pdf');
const { extractText: extractDocxText, extractDocText } = require('./parsers/docx');
const { parseDocument, formatJobSummary } = require('./parsers/jobParser');
const { processDocumentUpload } = require('./automations');
const logger = require('../../utils/logger');
const path = require('path');
const crypto = require('crypto');

class Jean {
  constructor() {
    this.name = 'Jean';
  }

  /**
   * Check if Jean is enabled
   */
  isEnabled() {
    return actions.isFeatureEnabled(db, 'jean_enabled');
  }

  /**
   * Get or create a chat session
   */
  getSession(userId, sessionToken) {
    let session;
    if (userId) {
      session = db.prepare(
        'SELECT * FROM jean_sessions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1'
      ).get(userId);
    } else if (sessionToken) {
      session = db.prepare(
        'SELECT * FROM jean_sessions WHERE session_token = ? ORDER BY updated_at DESC LIMIT 1'
      ).get(sessionToken);
    }

    // Create new session if none exists or last is stale (>2 hours)
    if (!session || (Date.now() - new Date(session.updated_at).getTime() > 2 * 60 * 60 * 1000)) {
      const token = sessionToken || crypto.randomBytes(16).toString('hex');
      const result = db.prepare(
        'INSERT INTO jean_sessions (user_id, session_token) VALUES (?, ?)'
      ).run(userId || null, token);
      session = db.prepare('SELECT * FROM jean_sessions WHERE id = ?').get(result.lastInsertRowid);
    }

    return session;
  }

  /**
   * Save a message to the session
   */
  saveMessage(sessionId, role, content, metadata = null) {
    db.prepare(
      'INSERT INTO jean_messages (session_id, role, content, metadata) VALUES (?, ?, ?, ?)'
    ).run(sessionId, role, content, metadata ? JSON.stringify(metadata) : null);
    db.prepare("UPDATE jean_sessions SET updated_at = datetime('now') WHERE id = ?").run(sessionId);
  }

  /**
   * Get recent chat history
   */
  getHistory(sessionId, limit = 20) {
    return db.prepare(
      'SELECT role, content, metadata, created_at FROM jean_messages WHERE session_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(sessionId, limit).reverse();
  }

  /**
   * Main message handler
   * @param {string} message - User input text
   * @param {object} opts - { userId, sessionToken, user, pageContext, file }
   * @returns {object} { message, quickReplies?, attachments? }
   */
  async processMessage(message, opts = {}) {
    if (!this.isEnabled()) {
      return { message: getResponse('feature_disabled', 'jean_disabled') };
    }

    const { userId, user, pageContext, file } = opts;
    const sessionToken = opts.sessionToken || crypto.randomBytes(16).toString('hex');

    // Guest chat check
    if (!userId && !actions.isFeatureEnabled(db, 'guest_chat_enabled')) {
      return { message: getResponse('needs_login', 'default') };
    }

    // Get/create session
    const session = this.getSession(userId, sessionToken);

    // Save user message
    this.saveMessage(session.id, 'user', message, { pageContext });

    // Handle file uploads
    if (file) {
      const response = await this.handleFileUpload(session, file, user);
      this.saveMessage(session.id, 'jean', response.message, response.metadata);
      return { ...response, sessionToken: session.session_token };
    }

    // Check for active flow
    let flowState = null;
    if (session.current_flow && session.flow_state) {
      try { flowState = JSON.parse(session.flow_state); } catch (e) {}
    }

    let response;

    if (flowState) {
      response = await this.handleFlowInput(session, flowState, message, user);
    } else {
      response = await this.handleNewMessage(session, message, user, pageContext);
    }

    // Apply mood prefix if detected
    const mood = personality.detectMood(message);
    if (mood && response.message) {
      const empathy = personality.empathize(mood);
      if (empathy && !response.message.startsWith(empathy)) {
        response.message = empathy + '\n\n' + response.message;
      }
    }

    // Save Jean's response
    this.saveMessage(session.id, 'jean', response.message, {
      quickReplies: response.quickReplies,
      intent: response.intent,
    });

    return { ...response, sessionToken: session.session_token };
  }

  /**
   * Handle input when a flow is active
   */
  async handleFlowInput(session, flowState, message, user) {
    const { classify: classifyIntent } = require('./intents');
    const intent = classifyIntent(message, { user, currentFlow: flowState.flow });

    // Cancel flow
    if (intent.intent === 'cancel_flow') {
      this.clearFlow(session.id);
      return { message: getResponse('flow', 'cancelled') };
    }

    // Skip step
    if (intent.intent === 'skip_step') {
      flowState.stepIndex++;
      // Pass through to flow engine
    }

    const engine = new FlowEngine(db, user?.id || null, session.id);
    const result = await engine.processInput(flowState, message);

    if (result.flowComplete) {
      this.clearFlow(session.id);
      // Handle draft approval follow-ups
      if (result.awaitingDraftApproval) {
        this.updateFlow(session.id, 'draft-approval', { draftId: result.awaitingDraftApproval });
      }
    } else if (result.state) {
      this.updateFlow(session.id, result.state.flow, result.state);
    }

    return {
      message: result.message,
      quickReplies: result.quickReplies,
    };
  }

  /**
   * Handle a new message (no active flow)
   */
  async handleNewMessage(session, message, user, pageContext) {
    const context = {
      user,
      currentFlow: null,
      lastIntent: null,
      pageContext,
    };

    const { intent, confidence, params } = classify(message, context);

    // ─── Route by intent ─────────────────────────────────
    switch (intent) {
      case 'greeting':
        return this.handleGreeting(user, session);

      case 'farewell': {
        const name = user?.name?.split(' ')[0];
        const farewells = [
          `See you later${name ? ', ' + name : ''}! Good luck out there. 🤞`,
          `Bye${name ? ' ' + name : ''}! Don't hesitate to come back — I'm always here. 😊`,
          `Lukim yu${name ? ', ' + name : ''}! All the best. 🙌`,
          `Take care! Remember, your dream job might be just one application away. 💪`,
        ];
        return { message: farewells[Math.floor(Math.random() * farewells.length)], intent };
      }

      case 'search_jobs':
        return this.handleJobSearch(params, user);

      case 'job_details':
        return this.handleJobDetails(params);

      case 'update_profile':
        return this.startProfileFlow(session, user);

      case 'import_linkedin':
        return this.handleLinkedInImport(session, params, user);

      case 'build_resume':
        if (!user) return { message: getResponse('needs_login', 'default'), intent };
        return this.startFlow(session, 'build-resume', user);

      case 'apply_job':
        return this.handleApply(session, params, user, pageContext);

      case 'check_applications':
        if (!user) return { message: getResponse('needs_login', 'default'), intent };
        return this.handleCheckApplications(user);

      case 'auto_apply_setup':
        if (!user) return { message: getResponse('needs_login', 'default'), intent };
        if (!actions.isFeatureEnabled(db, 'auto_apply_enabled')) {
          return { message: getResponse('feature_disabled', 'auto_apply'), intent };
        }
        return this.startFlow(session, 'auto-apply-setup', user);

      case 'stop_auto_apply':
        if (!user) return { message: getResponse('needs_login', 'default'), intent };
        actions.toggleAutoApply(db, user.id, false);
        return { message: getResponse('auto_apply', 'stopped'), intent };

      case 'post_job':
        if (!user) return { message: getResponse('needs_login', 'default'), intent };
        if (user.role !== 'employer') return { message: getResponse('needs_role', 'employer'), intent };
        return this.startFlow(session, 'post-job', user);

      case 'upload_job_document':
        if (!user) return { message: getResponse('needs_login', 'default'), intent };
        if (!actions.isFeatureEnabled(db, 'document_parse_enabled')) {
          return { message: getResponse('feature_disabled', 'document_parse'), intent };
        }
        return { message: getResponse('document', 'upload_prompt'), intent };

      case 'manage_jobs':
        if (!user) return { message: getResponse('needs_login', 'default'), intent };
        return this.handleManageJobs(user);

      case 'view_applicants':
        if (!user) return { message: getResponse('needs_login', 'default'), intent };
        return this.handleViewApplicants(user, params);

      case 'employer_prefs':
        if (!user) return { message: getResponse('needs_login', 'default'), intent };
        return this.startFlow(session, 'employer-prefs', user);

      case 'save_job':
        if (!user) return { message: getResponse('needs_login', 'default'), intent };
        return this.handleSaveJob(user, params, pageContext);

      case 'saved_jobs':
        if (!user) return { message: getResponse('needs_login', 'default'), intent };
        return this.handleSavedJobs(user);

      case 'job_alerts':
        if (!user) return { message: getResponse('needs_login', 'default'), intent };
        return { message: "You can manage your job alerts in your [dashboard](/dashboard/jobseeker/alerts).\n\nOr tell me what kind of jobs you want alerts for and I'll set it up!", intent };

      case 'browse_categories':
        return this.handleCategories();

      case 'browse_companies':
        return this.handleCompanies();

      case 'pricing':
        return { message: getResponse('pricing', 'info'), intent };

      case 'help_register':
        return { message: getResponse('register', 'guide'), intent };

      case 'help_login':
        return { message: getResponse('login', 'guide'), intent };

      case 'check_messages':
        if (!user) return { message: getResponse('needs_login', 'default'), intent };
        return this.handleMessages(user);

      case 'check_notifications':
        if (!user) return { message: getResponse('needs_login', 'default'), intent };
        return this.handleNotifications(user);

      case 'check_interviews':
        if (!user) return { message: getResponse('needs_login', 'default'), intent };
        return this.handleInterviews(user);

      case 'check_offers':
        if (!user) return { message: getResponse('needs_login', 'default'), intent };
        return { message: "Check your [offer letters](/dashboard/jobseeker/offers) in the dashboard.", intent };

      case 'check_credits':
        if (!user) return { message: getResponse('needs_login', 'default'), intent };
        return this.handleCredits(user);

      case 'employer_analytics':
        if (!user) return { message: getResponse('needs_login', 'default'), intent };
        return { message: "View your [analytics dashboard](/dashboard/employer/analytics) for detailed stats on views, applications, and performance.", intent };

      case 'contact_support':
        return this.startFlow(session, 'contact-support', user);

      case 'faq':
        return { message: "Check our [FAQ page](/faq) for common questions, or ask me directly — I might know the answer! 😊", intent };

      case 'confirm':
        // Context-dependent confirm (e.g., draft approval)
        return this.handleConfirmOutOfFlow(session, user);

      default: {
        const fallback = user
          ? `I'm not quite sure what you need, ${user.name?.split(' ')[0] || 'there'}. But I can help with:\n\n🔍 Finding jobs — just tell me what you're looking for\n👤 Your profile — I'll update it for you through chat\n📄 Your CV — I'll build it from scratch\n📨 Applying — I can apply to jobs for you\n💰 Pricing — I'll explain how it works\n\nJust tell me in your own words what you need!`
          : "I didn't quite catch that — but no worries! Here's what I can do:\n\n🔍 **Find jobs** — tell me what you're looking for\n📂 **Browse by category** — mining, health, IT, and more\n💰 **Pricing** — it's free for job seekers!\n📝 **Sign up** — I'll walk you through it\n\nWhat would you like to do?";
        return { message: fallback, intent };
      }
    }
  }

  // ─── Intent Handlers ───────────────────────────────────

  handleGreeting(user, session) {
    // Count previous sessions for this user
    let sessionCount = 0;
    if (user) {
      try {
        sessionCount = db.prepare('SELECT COUNT(*) as c FROM jean_sessions WHERE user_id = ?').get(user.id).c;
      } catch (e) {}
    }

    const greeting = personality.getGreeting(user, null, sessionCount);

    if (user) {
      return {
        message: greeting,
        quickReplies: user.role === 'employer'
          ? ['Post a Job', 'View Applicants', 'My Jobs', 'Upload Job Descriptions']
          : ['Search Jobs', 'My Applications', 'Update Profile', 'Build My CV'],
        intent: 'greeting',
      };
    }
    return {
      message: greeting,
      quickReplies: ['Search Jobs', 'Browse Categories', 'Register', 'How Does It Work?'],
      intent: 'greeting',
    };
  }

  handleJobSearch(params, user) {
    const searchParams = {};
    if (params.location) searchParams.location = params.location;
    if (params.job_type) searchParams.job_type = params.job_type;
    if (params.search) searchParams.search = params.search;

    const result = actions.searchJobs(db, { ...searchParams, limit: 5 });

    if (result.total === 0) {
      return {
        message: personality.humanize(
          "Hmm, nothing matched that search. 😕 Try broader keywords or a different location.\n\nOr tell me what kind of work you're looking for and I'll dig deeper!",
          { noResults: true }
        ),
        quickReplies: ['Show All Jobs', 'Browse Categories', 'Set Up Job Alert'],
        intent: 'search_jobs',
      };
    }

    const jobList = result.jobs.map((j, i) => personality.formatJobCard(j, i + 1)).join('\n\n');

    const intro = result.total <= 5
      ? `Here's what I found — ${personality.naturalCount(result.total, 'job')}:`
      : `Found ${result.total} jobs! Here are the top matches:`;

    const followUp = user
      ? "\n\nWant details on any of these? I can also apply for you!"
      : "\n\nInterested in any? [Create a free account](/register) to apply — takes 30 seconds!";

    return {
      message: `${intro}\n\n${jobList}${followUp}`,
      quickReplies: user ? ['Apply to #1', 'Save #1', 'Show More', 'Set Alert'] : ['Register', 'Show More'],
      intent: 'search_jobs',
    };
  }

  handleJobDetails(params) {
    if (!params.job_id) {
      return { message: "Which job would you like details on? Give me a job number or tell me what you're looking for.", intent: 'job_details' };
    }
    const job = actions.getJob(db, params.job_id);
    if (!job) return { message: "I couldn't find that job. It may have been removed.", intent: 'job_details' };

    const parts = [`**${job.title}**`, `🏢 ${job.company_name || 'Company'}`];
    if (job.location) parts.push(`📍 ${job.location}`);
    if (job.job_type) parts.push(`💼 ${job.job_type}`);
    if (job.salary_min) parts.push(`💰 K${job.salary_min}${job.salary_max ? '-' + job.salary_max : '+'}`);
    if (job.description) parts.push(`\n${job.description.substring(0, 500)}...`);
    parts.push(`\n➡️ [View Full Job](/jobs/${job.id})`);

    return {
      message: parts.join('\n'),
      quickReplies: ['Apply Now', 'Save Job', 'Similar Jobs'],
      intent: 'job_details',
    };
  }

  async startProfileFlow(session, user) {
    if (!user) return { message: getResponse('needs_login', 'default'), intent: 'update_profile' };
    const flowName = user.role === 'employer' ? 'update-profile-employer' : 'update-profile-jobseeker';
    return this.startFlow(session, flowName, user);
  }

  async handleLinkedInImport(session, params, user) {
    if (!user) return { message: getResponse('needs_login', 'default'), intent: 'import_linkedin' };
    if (!actions.isFeatureEnabled(db, 'linkedin_import_enabled')) {
      return { message: getResponse('feature_disabled', 'linkedin_import'), intent: 'import_linkedin' };
    }

    const url = params.url || '';
    if (!url) return { message: "Please paste your LinkedIn profile URL (e.g. linkedin.com/in/yourname)", intent: 'import_linkedin' };

    try {
      const data = await linkedin.scrapeProfile('https://' + url.replace(/^https?:\/\//, ''), db);
      const summary = linkedin.formatLinkedinSummary(data);

      // Store in session context for follow-up confirmation
      this.updateFlow(session.id, 'linkedin-confirm', { linkedinData: data });

      const subcat = data.type === 'company' ? 'found_employer' : 'found';
      return {
        message: getResponse('linkedin', subcat, { summary }),
        quickReplies: ['Yes, save it', 'No thanks'],
        intent: 'import_linkedin',
      };
    } catch (error) {
      return { message: getResponse('linkedin', 'error'), intent: 'import_linkedin' };
    }
  }

  async handleApply(session, params, user, pageContext) {
    if (!user) return { message: getResponse('needs_login', 'default'), intent: 'apply_job' };
    if (user.role !== 'jobseeker') return { message: getResponse('needs_role', 'jobseeker'), intent: 'apply_job' };

    const jobId = params.job_id || (pageContext?.jobId);
    if (!jobId) {
      return { message: "Which job would you like to apply for? Give me the job number or search for one first.", intent: 'apply_job' };
    }

    const job = actions.getJob(db, jobId);
    if (!job) return { message: "I couldn't find that job. It may have been removed.", intent: 'apply_job' };

    // Check profile completeness
    const profile = actions.getProfile(db, user.id);
    if (!profile?.profile?.profile_complete) {
      return {
        message: getResponse('apply', 'no_profile'),
        quickReplies: ['Update Profile', 'Apply Anyway'],
        intent: 'apply_job',
      };
    }

    // Check screening questions
    try {
      const questions = db.prepare('SELECT * FROM screening_questions WHERE job_id = ?').all(jobId);
      if (questions.length > 0) {
        // Start screening flow — for now, direct apply
        // TODO: screening Q&A flow
      }
    } catch (e) {}

    const cvNote = profile.profile.cv_url ? ' and attach your CV' : '';
    const result = actions.applyToJob(db, user.id, jobId, '');

    if (result.error === 'already_applied') {
      return { message: getResponse('apply', 'already_applied'), intent: 'apply_job' };
    }

    if (result.success) {
      return {
        message: getResponse('apply', 'success', { title: job.title, company: job.company_name || 'the employer' }),
        intent: 'apply_job',
      };
    }

    return { message: "Something went wrong with the application. Please try again or apply through the [job page](/jobs/" + jobId + ").", intent: 'apply_job' };
  }

  handleCheckApplications(user) {
    const apps = actions.getMyApplications(db, user.id);
    if (!apps.length) {
      return { message: "You haven't applied to any jobs yet. Want me to help you find some?", quickReplies: ['Search Jobs'], intent: 'check_applications' };
    }
    const list = apps.slice(0, 10).map((a, i) => {
      const status = { pending: '⏳', reviewed: '👀', shortlisted: '⭐', rejected: '❌', hired: '✅' }[a.status] || '📋';
      return `${i + 1}. ${status} **${a.title}** — ${a.company_name || 'Company'}\n   Status: ${a.status} | Applied: ${new Date(a.applied_at).toLocaleDateString()}`;
    }).join('\n\n');
    return { message: `📨 Your applications (${apps.length}):\n\n${list}`, intent: 'check_applications' };
  }

  handleManageJobs(user) {
    if (user.role !== 'employer') return { message: getResponse('needs_role', 'employer'), intent: 'manage_jobs' };
    const jobs = actions.getEmployerJobs(db, user.id);
    if (!jobs.length) {
      return { message: "You haven't posted any jobs yet. Want to create one?", quickReplies: ['Post a Job'], intent: 'manage_jobs' };
    }
    const list = jobs.slice(0, 10).map((j, i) => {
      const status = { active: '🟢', closed: '🔴', draft: '📝' }[j.status] || '⚪';
      return `${i + 1}. ${status} **${j.title}** — ${j.applicant_count} applicants\n   📍 ${j.location || 'PNG'} | Status: ${j.status}`;
    }).join('\n\n');
    return { message: `📋 Your job listings (${jobs.length}):\n\n${list}`, intent: 'manage_jobs' };
  }

  handleViewApplicants(user, params) {
    if (user.role !== 'employer') return { message: getResponse('needs_role', 'employer'), intent: 'view_applicants' };
    if (!params.job_id) {
      // Show all jobs with applicant counts
      const jobs = actions.getEmployerJobs(db, user.id).filter(j => j.applicant_count > 0);
      if (!jobs.length) return { message: "No applications yet. Share your job listings to get more visibility!", intent: 'view_applicants' };
      const list = jobs.map((j, i) => `${i + 1}. **${j.title}** — ${j.applicant_count} applicants`).join('\n');
      return { message: `Which job's applicants would you like to see?\n\n${list}`, intent: 'view_applicants' };
    }
    const result = actions.getJobApplicants(db, user.id, params.job_id);
    if (result.error) return { message: "I couldn't access those applicants.", intent: 'view_applicants' };
    if (!result.applicants.length) return { message: `No applicants yet for "${result.job.title}".`, intent: 'view_applicants' };
    const list = result.applicants.map((a, i) => {
      const status = { pending: '⏳', shortlisted: '⭐', rejected: '❌' }[a.status] || '📋';
      return `${i + 1}. ${status} **${a.name}** — ${a.headline || 'Jobseeker'}\n   📍 ${a.location || '?'} | Skills: ${(a.skills || '').substring(0, 80)}`;
    }).join('\n\n');
    return { message: `Applicants for **${result.job.title}** (${result.applicants.length}):\n\n${list}\n\nSay "shortlist #1" or "reject #2" to update status.`, intent: 'view_applicants' };
  }

  handleSaveJob(user, params, pageContext) {
    const jobId = params.job_id || pageContext?.jobId;
    if (!jobId) return { message: "Which job would you like to save? Give me the job number.", intent: 'save_job' };
    const result = actions.saveJob(db, user.id, jobId);
    if (result.success) return { message: "✅ Job saved! View your [saved jobs](/dashboard/jobseeker/saved-jobs).", intent: 'save_job' };
    return { message: "Couldn't save that job. It may already be in your saved list.", intent: 'save_job' };
  }

  handleSavedJobs(user) {
    const jobs = actions.getSavedJobs(db, user.id);
    if (!jobs.length) return { message: "No saved jobs yet. Find something you like and say 'save job #123'!", intent: 'saved_jobs' };
    const list = jobs.map((j, i) => `${i + 1}. **${j.title}** — ${j.company_name || 'Company'}\n   📍 ${j.location || 'PNG'}`).join('\n\n');
    return { message: `📌 Your saved jobs (${jobs.length}):\n\n${list}`, intent: 'saved_jobs' };
  }

  handleCategories() {
    const cats = actions.getCategories(db);
    const list = cats.map(c => `• **${c.name}** (${c.job_count} jobs)`).join('\n');
    return { message: getResponse('categories', 'list', { list }), intent: 'browse_categories' };
  }

  handleCompanies() {
    const stats = actions.getPublicStats(db);
    return {
      message: `We have ${stats.employers} employers on WantokJobs. Browse them at [Companies](/companies).\n\nLooking for a specific company? Tell me the name!`,
      intent: 'browse_companies',
    };
  }

  handleMessages(user) {
    const msgs = actions.getMessages(db, user.id);
    const unread = msgs.filter(m => !m.is_read).length;
    if (!msgs.length) return { message: "No messages yet. Messages from employers will appear here.", intent: 'check_messages' };
    const list = msgs.slice(0, 5).map(m => {
      const read = m.is_read ? '' : '🔴 ';
      return `${read}**${m.sender_name}**: ${m.content.substring(0, 80)}...`;
    }).join('\n');
    return { message: `📬 Messages (${unread} unread):\n\n${list}\n\n[View all messages](/dashboard/${user.role}/messages)`, intent: 'check_messages' };
  }

  handleNotifications(user) {
    const count = actions.getUnreadCount(db, user.id);
    const notifs = actions.getNotifications(db, user.id, 5);
    if (!notifs.length) return { message: "No notifications. You're all caught up! ✨", intent: 'check_notifications' };
    const list = notifs.map(n => {
      const read = n.is_read ? '' : '🔴 ';
      return `${read}${n.title}: ${n.message}`;
    }).join('\n');
    return { message: `🔔 Notifications (${count} unread):\n\n${list}`, intent: 'check_notifications' };
  }

  handleInterviews(user) {
    const interviews = actions.getMyInterviews(db, user.id, user.role);
    if (!interviews.length) return { message: "No interviews scheduled.", intent: 'check_interviews' };
    const list = interviews.slice(0, 5).map(i => {
      const date = new Date(i.scheduled_at).toLocaleString();
      return `📅 **${i.title || 'Interview'}** ${i.company_name ? `at ${i.company_name}` : ''}\n   ${date} | ${i.location || i.meeting_url || 'TBD'}`;
    }).join('\n\n');
    return { message: `Your upcoming interviews:\n\n${list}`, intent: 'check_interviews' };
  }

  handleCredits(user) {
    const credits = actions.getCreditStatus(db, user.id);
    if (!credits.balance) return { message: "No credit balance found. Check [Pricing](/pricing) for available packages.", intent: 'check_credits' };
    return {
      message: `💰 Credit Balance:\n\n• Job Posts: ${credits.balance.job_posts || 0}\n• AI Features: ${credits.balance.ai_features || 0}\n\n[View details](/dashboard/${user.role}/billing)`,
      intent: 'check_credits',
    };
  }

  handleConfirmOutOfFlow(session, user) {
    // Check if there's a pending action in session context
    if (session.current_flow === 'linkedin-confirm' && session.flow_state) {
      try {
        const state = JSON.parse(session.flow_state);
        const data = state.linkedinData;
        if (data && user) {
          if (data.type === 'company' && user.role === 'employer') {
            const profileData = linkedin.toEmployerProfile(data);
            actions.updateEmployerProfile(db, user.id, profileData);
            this.clearFlow(session.id);
            return { message: "✅ Company profile updated from LinkedIn!", intent: 'confirm' };
          } else if (data.type === 'person') {
            const profileData = linkedin.toJobseekerProfile(data);
            actions.updateJobseekerProfile(db, user.id, profileData);
            this.clearFlow(session.id);
            return { message: "✅ Profile updated from LinkedIn! Want me to build your CV from it?", quickReplies: ['Build CV', 'No thanks'], intent: 'confirm' };
          }
        }
      } catch (e) {}
    }

    if (session.current_flow === 'draft-approval' && session.flow_state) {
      try {
        const state = JSON.parse(session.flow_state);
        if (state.draftId && user) {
          const result = actions.approveDraft(db, user.id, state.draftId);
          this.clearFlow(session.id);
          if (result.success) return { message: `✅ Job posted! It's now live.`, intent: 'confirm' };
          return { message: "Couldn't post that draft. " + (result.error || ''), intent: 'confirm' };
        }
      } catch (e) {}
    }

    this.clearFlow(session.id);
    return { message: "I'm not sure what to confirm. What would you like to do?", intent: 'unknown' };
  }

  /**
   * Handle file uploads (PDF/DOCX for job posting)
   */
  async handleFileUpload(session, file, user) {
    if (!user || user.role !== 'employer') {
      return { message: "Document upload for job creation is available for employers. Please [log in](/login) as an employer." };
    }
    if (!actions.isFeatureEnabled(db, 'document_parse_enabled')) {
      return { message: getResponse('feature_disabled', 'document_parse') };
    }

    const ext = path.extname(file.originalname || file.filename || '').toLowerCase();
    let text;

    try {
      if (ext === '.pdf') {
        text = extractPdfText(file.path);
      } else if (ext === '.docx') {
        text = extractDocxText(file.path);
      } else if (ext === '.doc') {
        text = extractDocText(file.path);
      } else {
        return { message: "I can process PDF and Word documents (.pdf, .doc, .docx). Please upload one of those formats." };
      }
    } catch (error) {
      return { message: getResponse('document', 'parse_error') };
    }

    if (!text || text.length < 50) {
      return { message: getResponse('document', 'parse_error') };
    }

    // Parse into structured jobs
    const parsedJobs = parseDocument(text, file.originalname || 'upload');

    if (!parsedJobs.length) {
      return { message: getResponse('document', 'parse_error') };
    }

    // Get employer preferences
    const prefs = actions.getEmployerPrefs(db, user.id);

    // Process based on preferences
    const results = processDocumentUpload(db, user.id, session.id, parsedJobs, prefs);

    if (prefs.auto_post === 'auto') {
      const summaries = results.map((r, i) => `${i + 1}. ✅ **${r.title}**`).join('\n');
      return {
        message: getResponse('document', 'auto_posted', { count: results.length, summaries }),
      };
    } else {
      const summaries = results.map((r, i) => formatJobSummary(parsedJobs[i], i)).join('\n\n');
      if (parsedJobs.length === 1) {
        this.updateFlow(session.id, 'draft-approval', { draftId: results[0].draftId });
        return {
          message: getResponse('document', 'single_job', { summary: summaries }),
          quickReplies: ['Post Now', 'Edit', 'Discard'],
        };
      }
      return {
        message: getResponse('document', 'found_jobs', { count: parsedJobs.length, summaries }),
        quickReplies: ['Approve All', 'Review One by One'],
      };
    }
  }

  // ─── Flow helpers ──────────────────────────────────────

  async startFlow(session, flowName, user) {
    const engine = new FlowEngine(db, user?.id || null, session.id);
    const result = await engine.start(flowName);

    if (!result.flowComplete && result.state) {
      this.updateFlow(session.id, flowName, result.state);
    }

    return {
      message: result.message,
      quickReplies: result.quickReplies,
      intent: flowName,
    };
  }

  updateFlow(sessionId, flowName, state) {
    db.prepare(
      'UPDATE jean_sessions SET current_flow = ?, flow_state = ? WHERE id = ?'
    ).run(flowName, JSON.stringify(state), sessionId);
  }

  clearFlow(sessionId) {
    db.prepare(
      'UPDATE jean_sessions SET current_flow = NULL, flow_state = NULL WHERE id = ?'
    ).run(sessionId);
  }
}

// Singleton
const jean = new Jean();
module.exports = jean;
