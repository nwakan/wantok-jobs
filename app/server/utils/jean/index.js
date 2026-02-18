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
   * Append follow-up suggestions to response if available
   */
  appendFollowUp(response, user, lastAction) {
    const followUp = personality.getFollowUpSuggestions(user, lastAction);
    if (followUp) {
      if (followUp.text) {
        response.message += '\n\n💡 ' + followUp.text;
      }
      if (followUp.quickReplies && !response.quickReplies?.length) {
        response.quickReplies = followUp.quickReplies;
      }
    }
    return response;
  }

  /**
   * Main message handler
   */
  async processMessage(message, opts = {}) {
    if (!this.isEnabled()) {
      return { message: getResponse('feature_disabled', 'jean_disabled') };
    }

    const { userId, user, pageContext, file, channel, phoneNumber } = opts;
    const sessionToken = opts.sessionToken || crypto.randomBytes(16).toString('hex');

    // WhatsApp employer flow routing
    const isWhatsApp = channel === 'whatsapp' || phoneNumber;
    if (isWhatsApp && phoneNumber) {
      const waHandler = require('./whatsapp-employer');
      
      // Check if this is an employer or potential employer
      const employer = actions.getEmployerByPhone(db, phoneNumber);
      
      // If no session but has phoneNumber, handle as WhatsApp employer
      if (!userId && !employer) {
        // New employer greeting/registration flow
        const greeting = waHandler.handleEmployerGreeting(db, phoneNumber, null);
        if (greeting.is_new) {
          // Start registration flow
          const flow = new FlowEngine(db, null, sessionToken);
          const flowResult = await flow.start('wa-register-employer');
          return { ...flowResult, sessionToken };
        }
      }
      
      // Existing employer — route through WhatsApp handler
      if (employer || (user && user.role === 'employer')) {
        const effectiveUserId = employer?.user_id || userId;
        // Check for hire/posting intents
        const { intent } = classify(message, { user: user || { role: 'employer' }, currentFlow: null });
        
        if (['hire_someone', 'need_worker'].includes(intent)) {
          // Start quick job posting
          const session = this.getSession(effectiveUserId, sessionToken);
          const result = await waHandler.handleQuickJobPost(db, effectiveUserId, message, null);
          if (result.flowState) {
            this.updateFlow(session.id, 'wa-quick-post-active', result.flowState);
          }
          return { ...result, sessionToken: session.session_token };
        }
      }
    }

    if (!userId && !actions.isFeatureEnabled(db, 'guest_chat_enabled')) {
      return { message: getResponse('needs_login', 'default') };
    }

    const session = this.getSession(userId, sessionToken);
    this.saveMessage(session.id, 'user', message, { pageContext });

    if (file) {
      const response = await this.handleFileUpload(session, file, user);
      this.saveMessage(session.id, 'jean', response.message, response.metadata);
      return { ...response, sessionToken: session.session_token };
    }

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

    // Apply mood-aware empathy prefix
    const mood = personality.detectMood(message);
    if (mood && response.message) {
      const empathy = personality.empathize(mood);
      if (empathy && !response.message.startsWith(empathy)) {
        response.message = empathy + '\n\n' + response.message;
      }
    }

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

    if (intent.intent === 'cancel_flow') {
      this.clearFlow(session.id);
      return { message: getResponse('flow', 'cancelled') };
    }

    if (intent.intent === 'skip_step') {
      flowState.stepIndex++;
    }

    const engine = new FlowEngine(db, user?.id || null, session.id);
    const result = await engine.processInput(flowState, message);

    if (result.flowComplete) {
      this.clearFlow(session.id);
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

    switch (intent) {
      case 'greeting':
        return this.handleGreeting(user, session);

      case 'farewell': {
        const name = user?.name?.split(' ')[0];
        const farewells = [
          `See you later${name ? ', ' + name : ''}! Good luck out there. 🤞`,
          `Bye${name ? ' ' + name : ''}! Don't hesitate to come back — mi stap hia olotaim. 😊`,
          `Lukim yu${name ? ', ' + name : ''}! All the best. 🙌`,
          `Take care! Remember, your dream job might be just one application away. 💪`,
          `Orait${name ? ' ' + name : ''}, go well! Mi stap hia sapos yu nidim help. 😊`,
          `Catch you later${name ? ', ' + name : ''}! Wishing you gutpela taim. 🌟`,
        ];
        return { message: personality.randomFrom(farewells), intent };
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
        return {
          message: personality.humanize(getResponse('auto_apply', 'stopped')),
          quickReplies: ['Start Auto-Apply', 'Search Jobs', 'My Applications'],
          intent,
        };

      case 'post_job':
        if (!user) return { message: getResponse('needs_login', 'default'), intent };
        if (user.role !== 'employer') return { message: getResponse('needs_role', 'employer'), intent };
        return this.startFlow(session, 'post-job', user);

      case 'upload_job_document':
        if (!user) return { message: getResponse('needs_login', 'default'), intent };
        if (!actions.isFeatureEnabled(db, 'document_parse_enabled')) {
          return { message: getResponse('feature_disabled', 'document_parse'), intent };
        }
        return { message: personality.humanize(getResponse('document', 'upload_prompt')), intent };

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
        return {
          message: personality.humanize("You can manage your job alerts in your [dashboard](/dashboard/jobseeker/alerts).\n\nOr tell me what kind of jobs you want alerts for and I'll set it up! Bai mi mekim sure yu no misim wanpela gutpela wok. 😊"),
          quickReplies: ['Set Up Alert', 'My Alerts', 'Search Jobs'],
          intent,
        };

      case 'browse_categories':
        return this.handleCategories();

      case 'browse_companies':
        return this.handleCompanies();

      case 'pricing':
        return {
          message: personality.humanize(getResponse('pricing', 'info')),
          quickReplies: ['Register Free', 'Post a Job', 'Contact Sales'],
          intent,
        };

      case 'buy_credits':
      case 'sme_pricing': {
        if (!user) return { message: "To buy credits, I need to know who you are! Please log in or register first. 😊", intent };
        const pricing = require('./sme-pricing');
        return {
          message: personality.humanize(pricing.formatPricingMessage(db, user.id)),
          quickReplies: ['Free Trial', 'Single Post', 'Starter Pack', 'Monthly Plan'],
          intent,
        };
      }

      case 'hire_someone':
      case 'need_worker': {
        // WhatsApp employer quick post
        if (!user || user.role !== 'employer') {
          return {
            message: personality.humanize("I can help you post a job! First, you'll need an employer account. Let me set that up quickly — just takes a minute. 😊"),
            quickReplies: ['Set Up Account', 'Learn More'],
            intent,
          };
        }
        const waHandler = require('./whatsapp-employer');
        const result = await waHandler.handleQuickJobPost(db, user.id, message, null);
        if (result.flowState) {
          this.updateFlow(session.id, 'wa-quick-post-active', result.flowState);
        }
        return result;
      }

      case 'check_my_jobs_wa': {
        if (!user || user.role !== 'employer') {
          return { message: getResponse('needs_role', 'employer'), intent };
        }
        return this.handleManageJobs(user);
      }

      case 'payment_confirm': {
        if (!user) return { message: getResponse('needs_login', 'default'), intent };
        // Extract reference code
        const refMatch = message.match(/WJ\d+[A-Z0-9]+/i);
        if (refMatch) {
          return {
            message: personality.humanize(
              `✅ Payment confirmation received for ${refMatch[0]}!\n\n` +
              `Mi bai checkim payment bilong yu. You'll get a notification when approved (usually within 2-24 hours).\n\n` +
              `Need help? Contact support@wantokjobs.com 📧`
            ),
            quickReplies: ['Check My Credits', 'Post a Job'],
            intent,
          };
        }
        return {
          message: personality.humanize(
            "I didn't catch your reference code. When you made the payment, you should have received a code like 'WJ12345ABC'. Can you share that?"
          ),
          intent,
        };
      }

      case 'help_register':
        return {
          message: personality.humanize(getResponse('register', 'guide')),
          quickReplies: ['I\'m a Jobseeker', 'I\'m an Employer'],
          intent,
        };

      case 'help_login':
        return {
          message: personality.humanize(getResponse('login', 'guide')),
          quickReplies: ['Reset Password', 'Register Instead'],
          intent,
        };

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
        return {
          message: personality.humanize("Check your [offer letters](/dashboard/jobseeker/offers) in the dashboard. 📬\n\nIf you've received an offer — congratulations! Amamas tru! 🎉"),
          quickReplies: ['My Applications', 'My Interviews', 'Search More Jobs'],
          intent,
        };

      case 'check_credits':
        if (!user) return { message: getResponse('needs_login', 'default'), intent };
        return this.handleCredits(user);

      case 'employer_analytics':
        if (!user) return { message: getResponse('needs_login', 'default'), intent };
        return {
          message: personality.humanize("View your [analytics dashboard](/dashboard/employer/analytics) for detailed stats on views, applications, and performance. 📊\n\nWant me to give you a quick summary of how your jobs are doing? Tokim mi!"),
          quickReplies: ['Quick Summary', 'My Jobs', 'Post a Job'],
          intent,
        };

      case 'celebration': {
        const celebs = [
          "That's AMAZING news! 🎉🎊 Congratulations!! I'm so happy for you! All that effort paid off. Yu mekim gutpela wok tru! You deserve it!",
          "CONGRATULATIONS!! 🎉 That's wonderful — I knew you'd find the right fit! Amamas tru! Best of luck in your new role! 🌟",
          "Yes!! 🙌🎉 Em nau ya! That's what I love to hear! You did it! Wishing you all the best in your new position! Nambawan!",
          "WOW! 🎊🎉 This is what WantokJobs is all about — connecting the right people with the right opportunities. So proud of you! Gutpela tru!",
          "🎉🎊 EM NAU! That's incredible news! From Lae to wherever you are — I'm celebrating with you! You worked hard and it paid off! 💪",
        ];
        return { message: personality.randomFrom(celebs), intent };
      }

      case 'struggling': {
        const encouragements = [
          "I hear you — job searching can be really tough, especially when it takes longer than expected. But you're doing the right thing by keeping at it. 💪 Yu no ken givap!\n\nLet me help make it easier. I can:\n• Search for jobs matching your skills\n• Set up auto-apply so I apply for you automatically\n• Help polish your profile to stand out\n\nWhat sounds good?",
          "Don't give up — the right opportunity is out there. Bai em i kam! Let me help you find it. 💪\n\nWant me to:\n• Search for new openings right now?\n• Set up alerts so you don't miss anything?\n• Review your profile to make sure it stands out?\n\nYumi wok bung — we'll get through this together!",
          "Mi harim yu — it's not easy, but plenty of people have been where you are and found their breakthrough. The PNG job market moves in waves — sometimes you just need to catch the right one. 💪\n\n• Is your profile complete and up to date?\n• Have you tried auto-apply?\n• Want me to search different categories?\n\nLet's try a fresh approach! Strongim yu yet!",
        ];
        return {
          message: personality.randomFrom(encouragements),
          quickReplies: ['Search Jobs', 'Set Up Auto-Apply', 'Update My Profile'],
          intent,
        };
      }

      case 'feature_request':
        if (!user) {
          return { 
            message: "You need to be logged in to submit feature requests. Sign up or log in first!\n\nOnce you're in, you can tell me your ideas and I'll submit them for you. Or browse requests others have made at [/features](/features).",
            quickReplies: ['Login', 'Register', 'View Feature Requests'],
            intent 
          };
        }
        return this.startFlow(session, 'feature-request', user);

      case 'view_features':
        return this.handleViewFeatureRequests();

      case 'contact_support':
        return this.startFlow(session, 'contact-support', user);

      case 'faq':
        return {
          message: personality.humanize("Check our [FAQ page](/faq) for common questions, or ask me directly — I might know the answer! 😊\n\nMi save planti samting bilong WantokJobs, so just askim mi!"),
          quickReplies: ['How Does It Work?', 'Is It Free?', 'Contact Support'],
          intent,
        };

      case 'confirm':
        return this.handleConfirmOutOfFlow(session, user);

      default: {
        const name = user?.name?.split(' ')[0] || 'there';
        const fallback = user
          ? `Sori ${name}, mi no klia long dispela. But no worries — I can help with:\n\n🔍 Finding jobs — just tell me what you're looking for\n👤 Your profile — I'll update it for you through chat\n📄 Your CV — I'll build it from scratch\n📨 Applying — I can apply to jobs for you\n💰 Pricing — I'll explain how it works\n\nJust tell me in your own words what you need — tokim mi tasol!`
          : "Hmm, mi no klia long dispela — but no worries! Here's what I can do:\n\n🔍 **Find jobs** — tell me what you're looking for\n📂 **Browse by category** — mining, health, IT, and more\n💰 **Pricing** — it's free for job seekers!\n📝 **Sign up** — I'll walk you through it\n\nWhat would you like to do?";
        return {
          message: personality.humanize(fallback),
          quickReplies: user
            ? ['Search Jobs', 'My Profile', 'My Applications', 'Help']
            : ['Search Jobs', 'Browse Categories', 'Register', 'Pricing'],
          intent,
        };
      }
    }
  }

  // ─── Intent Handlers ───────────────────────────────────

  handleGreeting(user, session) {
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
      const response = {
        message: personality.humanize(
          getResponse('search', 'no_results'),
          { noResults: true }
        ),
        quickReplies: ['Show All Jobs', 'Browse Categories', 'Set Up Job Alert'],
        intent: 'search_jobs',
      };
      return this.appendFollowUp(response, user, 'search');
    }

    const jobList = result.jobs.map((j, i) => personality.formatJobCard(j, i + 1)).join('\n\n');

    const intros = result.total <= 5
      ? [
          `Here's what I found — ${personality.naturalCount(result.total, 'job')}:`,
          `Found ${personality.naturalCount(result.total, 'match')} for you:`,
        ]
      : [
          `Found ${result.total} jobs! Here are the top matches:`,
          `Plenty of options — ${result.total} jobs! Here are the best ones:`,
        ];
    const intro = personality.randomFrom(intros);

    const followUp = user
      ? "\n\nWant details on any of these? I can also apply for you! Tokim mi tasol."
      : "\n\nInterested in any? [Create a free account](/register) to apply — takes 30 seconds! Em i fri!";

    const response = {
      message: `${intro}\n\n${jobList}${followUp}`,
      quickReplies: user ? ['Apply to #1', 'Save #1', 'Show More', 'Set Alert'] : ['Register', 'Show More'],
      intent: 'search_jobs',
    };
    return this.appendFollowUp(response, user, 'search');
  }

  handleJobDetails(params) {
    if (!params.job_id) {
      return { message: personality.humanize("Which job would you like details on? Give me a job number or tell me what you're looking for."), intent: 'job_details' };
    }
    const job = actions.getJob(db, params.job_id);
    if (!job) return { message: personality.humanize("I couldn't find that job — em i lus pinis. It may have been removed or the listing closed. Want me to search for something similar?"), intent: 'job_details' };

    const card = personality.formatJobCard(job, 1);
    const desc = job.description ? `\n\n${job.description.substring(0, 500)}...` : '';
    const msg = `Here are the details:\n\n${card}${desc}\n\n➡️ [View Full Job](/jobs/${job.id})`;

    return {
      message: personality.humanize(msg),
      quickReplies: ['Apply Now', 'Save Job', 'Similar Jobs'],
      intent: 'job_details',
    };
  }

  async startProfileFlow(session, user) {
    if (!user) return { message: getResponse('needs_login', 'default'), intent: 'update_profile' };

    // Show current profile summary before starting flow
    const profileData = actions.getProfile(db, user.id);
    if (profileData?.profile) {
      const summary = personality.formatProfileSummary(profileData.profile, profileData.user);
      // If profile is mostly complete, show it
      if (summary && !summary.includes('empty')) {
        // Still start the flow for missing fields
      }
    }

    const flowName = user.role === 'employer' ? 'update-profile-employer' : 'update-profile-jobseeker';
    return this.startFlow(session, flowName, user);
  }

  async handleLinkedInImport(session, params, user) {
    if (!user) return { message: getResponse('needs_login', 'default'), intent: 'import_linkedin' };
    if (!actions.isFeatureEnabled(db, 'linkedin_import_enabled')) {
      return { message: getResponse('feature_disabled', 'linkedin_import'), intent: 'import_linkedin' };
    }

    const url = params.url || '';
    if (!url) return { message: personality.humanize("Please paste your LinkedIn profile URL (e.g. linkedin.com/in/yourname). Bai mi ridim na putim long profile bilong yu!"), intent: 'import_linkedin' };

    try {
      const data = await linkedin.scrapeProfile('https://' + url.replace(/^https?:\/\//, ''), db);
      const summary = linkedin.formatLinkedinSummary(data);

      this.updateFlow(session.id, 'linkedin-confirm', { linkedinData: data });

      const subcat = data.type === 'company' ? 'found_employer' : 'found';
      return {
        message: personality.humanize(getResponse('linkedin', subcat, { summary })),
        quickReplies: ['Yes, save it', 'No thanks'],
        intent: 'import_linkedin',
      };
    } catch (error) {
      return { message: personality.humanize(getResponse('linkedin', 'error')), intent: 'import_linkedin' };
    }
  }

  async handleApply(session, params, user, pageContext) {
    if (!user) return { message: getResponse('needs_login', 'default'), intent: 'apply_job' };
    if (user.role !== 'jobseeker') return { message: getResponse('needs_role', 'jobseeker'), intent: 'apply_job' };

    const jobId = params.job_id || (pageContext?.jobId);
    if (!jobId) {
      return { message: personality.humanize("Which job would you like to apply for? Give me the job number or search for one first. Mi stap redi!"), intent: 'apply_job' };
    }

    const job = actions.getJob(db, jobId);
    if (!job) return { message: personality.humanize("I couldn't find that job — em i lus pinis. It may have been removed."), intent: 'apply_job' };

    const profile = actions.getProfile(db, user.id);
    if (!profile?.profile?.profile_complete) {
      return {
        message: personality.humanize(getResponse('apply', 'no_profile')),
        quickReplies: ['Update Profile', 'Apply Anyway'],
        intent: 'apply_job',
      };
    }

    try {
      const questions = db.prepare('SELECT * FROM screening_questions WHERE job_id = ?').all(jobId);
      if (questions.length > 0) {
        // TODO: screening Q&A flow
      }
    } catch (e) {}

    const result = actions.applyToJob(db, user.id, jobId, '');

    if (result.error === 'already_applied') {
      return {
        message: personality.humanize(getResponse('apply', 'already_applied')),
        quickReplies: ['My Applications', 'Similar Jobs', 'Search Jobs'],
        intent: 'apply_job',
      };
    }

    if (result.success) {
      const followUp = personality.getFollowUpSuggestions(user, 'applied');
      const response = {
        message: personality.humanize(
          getResponse('apply', 'success', { title: job.title, company: job.company_name || 'the employer' }),
          { justApplied: true }
        ),
        quickReplies: ['Search Similar Jobs', 'My Applications', 'Set Up Auto-Apply'],
        intent: 'apply_job',
      };
      if (followUp?.text) {
        response.message += '\n\n💡 ' + followUp.text;
      }
      if (followUp?.quickReplies) {
        response.quickReplies = followUp.quickReplies;
      }
      return response;
    }

    return { message: personality.humanize("Something went wrong with the application. Sori tru! Please try again or apply through the [job page](/jobs/" + jobId + ")."), intent: 'apply_job' };
  }

  handleCheckApplications(user) {
    const apps = actions.getMyApplications(db, user.id);
    if (!apps.length) {
      return {
        message: personality.humanize("You haven't applied to any jobs yet — but no worries, let's change that! Mi ken helpim yu painim gutpela wok. 💪"),
        quickReplies: ['Search Jobs', 'Browse Categories', 'Build My CV'],
        intent: 'check_applications',
      };
    }
    const list = apps.slice(0, 10).map((a, i) => {
      const status = { pending: '⏳', reviewed: '👀', shortlisted: '⭐', rejected: '❌', hired: '✅' }[a.status] || '📋';
      return `${i + 1}. ${status} **${a.title}** — ${a.company_name || 'Company'}\n   Status: ${a.status} | Applied: ${new Date(a.applied_at).toLocaleDateString()}`;
    }).join('\n\n');

    const shortlisted = apps.filter(a => a.status === 'shortlisted').length;
    const hired = apps.filter(a => a.status === 'hired').length;
    let extra = '';
    if (hired > 0) extra = `\n\n🎉 ${personality.naturalCount(hired, 'offer')} — amamas tru! Congratulations!`;
    else if (shortlisted > 0) extra = `\n\n🌟 ${personality.naturalCount(shortlisted, 'application')} shortlisted — gutpela tru! Em i lukim nais!`;

    const response = {
      message: personality.humanize(`📨 Your applications (${personality.naturalCount(apps.length, 'application')}):\n\n${list}${extra}`),
      quickReplies: ['Search More Jobs', 'Update Profile', 'Set Up Auto-Apply'],
      intent: 'check_applications',
    };
    return this.appendFollowUp(response, user, 'search');
  }

  handleManageJobs(user) {
    if (user.role !== 'employer') return { message: getResponse('needs_role', 'employer'), intent: 'manage_jobs' };
    const jobs = actions.getEmployerJobs(db, user.id);
    if (!jobs.length) {
      return {
        message: personality.humanize("You haven't posted any jobs yet — let's get your first one up! Em i isi tasol, bai mi helpim yu. 😊"),
        quickReplies: ['Post a Job', 'Upload Job Document'],
        intent: 'manage_jobs',
      };
    }
    const activeCount = jobs.filter(j => j.status === 'active').length;
    const totalApplicants = jobs.reduce((sum, j) => sum + (j.applicant_count || 0), 0);
    const list = jobs.slice(0, 10).map((j, i) => {
      const status = { active: '🟢', closed: '🔴', draft: '📝' }[j.status] || '⚪';
      return `${i + 1}. ${status} **${j.title}** — ${personality.naturalCount(j.applicant_count || 0, 'applicant')}\n   📍 ${j.location || 'PNG'} | Status: ${j.status}`;
    }).join('\n\n');

    return {
      message: personality.humanize(`📋 Your job listings (${personality.naturalCount(jobs.length, 'job')}, ${activeCount} active, ${personality.naturalCount(totalApplicants, 'applicant')} total):\n\n${list}\n\nTell me a job number to manage it, or say "post a job" to create a new one.`),
      quickReplies: ['Post a Job', 'View Applicants', 'Analytics'],
      intent: 'manage_jobs',
    };
  }

  handleViewApplicants(user, params) {
    if (user.role !== 'employer') return { message: getResponse('needs_role', 'employer'), intent: 'view_applicants' };
    if (!params.job_id) {
      const jobs = actions.getEmployerJobs(db, user.id).filter(j => j.applicant_count > 0);
      if (!jobs.length) return {
        message: personality.humanize("No applications yet — but don't worry! Share your job listings to get more visibility. Spredem tok bilong wok! 📢"),
        quickReplies: ['My Jobs', 'Post a Job'],
        intent: 'view_applicants',
      };
      const list = jobs.map((j, i) => `${i + 1}. **${j.title}** — ${personality.naturalCount(j.applicant_count, 'applicant')}`).join('\n');
      return {
        message: personality.humanize(`Which job's applicants would you like to review?\n\n${list}`),
        quickReplies: jobs.slice(0, 3).map((j, i) => `#${i + 1} ${j.title.substring(0, 20)}`),
        intent: 'view_applicants',
      };
    }
    const result = actions.getJobApplicants(db, user.id, params.job_id);
    if (result.error) return { message: personality.humanize("I couldn't access those applicants — sori tru. Try again or check your [dashboard](/dashboard/employer)."), intent: 'view_applicants' };
    if (!result.applicants.length) return {
      message: personality.humanize(`No applicants yet for "${result.job.title}". Give it some time — ol manmeri bai lukim! Spredem tok! 🙏`),
      quickReplies: ['Share Job', 'My Jobs'],
      intent: 'view_applicants',
    };
    const list = result.applicants.map((a, i) => {
      const status = { pending: '⏳', shortlisted: '⭐', rejected: '❌' }[a.status] || '📋';
      return `${i + 1}. ${status} **${a.name}** — ${a.headline || 'Jobseeker'}\n   📍 ${a.location || '?'} | Skills: ${(a.skills || '').substring(0, 80)}`;
    }).join('\n\n');

    const response = {
      message: personality.humanize(`Applicants for **${result.job.title}** (${personality.naturalCount(result.applicants.length, 'person')}):\n\n${list}\n\nSay "shortlist #1" or "reject #2" to update status. Yu ken lukim profile bilong ol tu!`),
      quickReplies: ['Shortlist #1', 'View Profile #1', 'Message #1'],
      intent: 'view_applicants',
    };
    return this.appendFollowUp(response, user, 'viewed-applicants');
  }

  handleSaveJob(user, params, pageContext) {
    const jobId = params.job_id || pageContext?.jobId;
    if (!jobId) return { message: personality.humanize("Which job would you like to save? Give me the job number. Mi bai keepim long yu!"), intent: 'save_job' };
    const result = actions.saveJob(db, user.id, jobId);
    if (result.success) {
      const response = {
        message: personality.humanize("✅ Job saved! View your [saved jobs](/dashboard/jobseeker/saved-jobs). Gutpela — you can come back to it anytime!"),
        quickReplies: ['Apply Now', 'Search More Jobs', 'My Saved Jobs'],
        intent: 'save_job',
      };
      return this.appendFollowUp(response, user, 'saved-job');
    }
    return { message: personality.humanize("Looks like that job is already in your saved list! Em i stap pinis. 😊"), quickReplies: ['My Saved Jobs', 'Search Jobs'], intent: 'save_job' };
  }

  handleSavedJobs(user) {
    const jobs = actions.getSavedJobs(db, user.id);
    if (!jobs.length) return {
      message: personality.humanize("No saved jobs yet — when you spot something you like, say 'save job' and I'll keep it for you! 📌 Em i isi tasol."),
      quickReplies: ['Search Jobs', 'Browse Categories'],
      intent: 'saved_jobs',
    };
    const list = jobs.map((j, i) => personality.formatJobCard(j, i + 1)).join('\n\n');
    return {
      message: personality.humanize(`📌 Your saved jobs (${personality.naturalCount(jobs.length, 'job')}):\n\n${list}\n\nReady to apply to any of these? Tokim mi!`),
      quickReplies: ['Apply to #1', 'Search More Jobs', 'Remove #1'],
      intent: 'saved_jobs',
    };
  }

  handleCategories() {
    const cats = actions.getCategories(db);
    const list = cats.map(c => `• **${c.name}** (${personality.naturalCount(c.job_count, 'job')})`).join('\n');
    return {
      message: personality.humanize(getResponse('categories', 'list', { list })),
      quickReplies: cats.slice(0, 4).map(c => c.name),
      intent: 'browse_categories',
    };
  }

  handleCompanies() {
    const stats = actions.getPublicStats(db);
    return {
      message: personality.humanize(`We have ${stats.employers} employers on WantokJobs — from big mining companies to local businesses across PNG, long olgeta hap. 🏢\n\nBrowse them at [Companies](/companies), or tell me a company name and I'll look them up!`),
      quickReplies: ['Browse Companies', 'Who\'s Hiring?', 'Search Jobs'],
      intent: 'browse_companies',
    };
  }

  handleMessages(user) {
    const msgs = actions.getMessages(db, user.id);
    const unread = msgs.filter(m => !m.is_read).length;
    if (!msgs.length) return {
      message: personality.humanize("No messages yet — when employers or jobseekers reach out, you'll see them here. 📬 Mi bai tokim yu!"),
      quickReplies: user.role === 'employer' ? ['My Jobs', 'Post a Job'] : ['Search Jobs', 'My Profile'],
      intent: 'check_messages',
    };
    const list = msgs.slice(0, 5).map(m => {
      const read = m.is_read ? '' : '🔴 ';
      return `${read}**${m.sender_name}**: ${m.content.substring(0, 80)}...`;
    }).join('\n');
    const urgency = unread > 3 ? ' You\'ve got a few to catch up on — hariap!' : '';
    return {
      message: personality.humanize(`📬 Messages (${personality.naturalCount(unread, 'unread message')}):\n\n${list}${urgency}\n\n[View all messages](/dashboard/${user.role}/messages)`),
      quickReplies: ['View All Messages', 'My Applications'],
      intent: 'check_messages',
    };
  }

  handleNotifications(user) {
    const count = actions.getUnreadCount(db, user.id);
    const notifs = actions.getNotifications(db, user.id, 5);
    if (!notifs.length) return {
      message: personality.humanize("No notifications — you're all caught up! Isi tasol. ✨"),
      quickReplies: user.role === 'employer' ? ['My Jobs', 'Post a Job'] : ['Search Jobs', 'My Applications'],
      intent: 'check_notifications',
    };
    const list = notifs.map(n => {
      const read = n.is_read ? '' : '🔴 ';
      return `${read}${n.title}: ${n.message}`;
    }).join('\n');
    return {
      message: personality.humanize(`🔔 Notifications (${personality.naturalCount(count, 'unread')}):\n\n${list}`),
      quickReplies: ['Mark All Read', 'My Applications', 'Search Jobs'],
      intent: 'check_notifications',
    };
  }

  handleInterviews(user) {
    const interviews = actions.getMyInterviews(db, user.id, user.role);
    if (!interviews.length) return {
      message: personality.humanize("No interviews scheduled yet. Keep applying — bai em i kam! Wok hat na bai yu kisim! 💪"),
      quickReplies: ['My Applications', 'Search Jobs'],
      intent: 'check_interviews',
    };
    const list = interviews.slice(0, 5).map(i => {
      const date = new Date(i.scheduled_at).toLocaleString();
      return `📅 **${i.title || 'Interview'}** ${i.company_name ? `at ${i.company_name}` : ''}\n   ${date} | ${i.location || i.meeting_url || 'TBD'}`;
    }).join('\n\n');
    return {
      message: personality.humanize(`Your upcoming interviews — gutpela tru! 🎉\n\n${list}\n\nGood luck! Prepare well and be yourself — yu ken mekim! Employers want to see the real you.`),
      quickReplies: ['My Applications', 'Update Profile'],
      intent: 'check_interviews',
    };
  }

  handleCredits(user) {
    const credits = actions.getCreditStatus(db, user.id);
    if (!credits.balance) return {
      message: personality.humanize("No credit balance found. Check [Pricing](/pricing) for available packages — we've got options for every budget! Em i stat long fri! 💰"),
      quickReplies: ['View Pricing', 'Contact Sales'],
      intent: 'check_credits',
    };
    return {
      message: personality.humanize(`💰 Credit Balance:\n\n• Job Posts: ${credits.balance.job_posts || 0}\n• AI Features: ${credits.balance.ai_features || 0}\n\n[View details](/dashboard/${user.role}/billing)`),
      quickReplies: ['Buy More Credits', 'Post a Job', 'My Jobs'],
      intent: 'check_credits',
    };
  }

  handleConfirmOutOfFlow(session, user) {
    if (session.current_flow === 'linkedin-confirm' && session.flow_state) {
      try {
        const state = JSON.parse(session.flow_state);
        const data = state.linkedinData;
        if (data && user) {
          if (data.type === 'company' && user.role === 'employer') {
            const profileData = linkedin.toEmployerProfile(data);
            actions.updateEmployerProfile(db, user.id, profileData);
            this.clearFlow(session.id);
            const followUp = personality.getFollowUpSuggestions(user, 'profile-updated');
            const response = {
              message: personality.humanize("✅ Company profile updated from LinkedIn! Nau em i lukim gutpela tru. 🎉"),
              quickReplies: ['Post a Job', 'My Jobs'],
              intent: 'confirm',
            };
            if (followUp?.text) response.message += '\n\n💡 ' + followUp.text;
            if (followUp?.quickReplies) response.quickReplies = followUp.quickReplies;
            return response;
          } else if (data.type === 'person') {
            const profileData = linkedin.toJobseekerProfile(data);
            actions.updateJobseekerProfile(db, user.id, profileData);
            this.clearFlow(session.id);
            const followUp = personality.getFollowUpSuggestions(user, 'profile-updated');
            const response = {
              message: personality.humanize("✅ Profile updated from LinkedIn! Em i gutpela tru. 🎉\n\nWant me to build your CV from it?"),
              quickReplies: ['Build CV', 'Search Jobs', 'No thanks'],
              intent: 'confirm',
            };
            if (followUp?.text) response.message += '\n\n💡 ' + followUp.text;
            if (followUp?.quickReplies) response.quickReplies = followUp.quickReplies;
            return response;
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
          if (result.success) {
            const followUp = personality.getFollowUpSuggestions(user, 'job-posted');
            const response = {
              message: personality.humanize("✅ Job posted! It's now live — ol manmeri bai lukim nau! 🎉"),
              quickReplies: ['My Jobs', 'Post Another'],
              intent: 'confirm',
            };
            if (followUp?.text) response.message += '\n\n💡 ' + followUp.text;
            if (followUp?.quickReplies) response.quickReplies = followUp.quickReplies;
            return response;
          }
          return { message: personality.humanize("Couldn't post that draft — sori tru. " + (result.error || '')), intent: 'confirm' };
        }
      } catch (e) {}
    }

    this.clearFlow(session.id);
    return { message: personality.humanize("I'm not sure what to confirm. What would you like to do? Tokim mi!"), quickReplies: ['Search Jobs', 'My Profile', 'Help'], intent: 'unknown' };
  }

  /**
   * Handle file uploads (PDF/DOCX for job posting)
   */
  async handleFileUpload(session, file, user) {
    if (!user || user.role !== 'employer') {
      return { message: personality.humanize("Document upload for job creation is available for employers. Please [log in](/login) as an employer to use this feature.") };
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
        return { message: personality.humanize("I can process PDF and Word documents (.pdf, .doc, .docx). Please upload one of those formats — bai mi ridim!") };
      }
    } catch (error) {
      return { message: getResponse('document', 'parse_error') };
    }

    if (!text || text.length < 50) {
      return { message: getResponse('document', 'parse_error') };
    }

    const parsedJobs = parseDocument(text, file.originalname || 'upload');

    if (!parsedJobs.length) {
      return { message: getResponse('document', 'parse_error') };
    }

    const prefs = actions.getEmployerPrefs(db, user.id);
    const results = processDocumentUpload(db, user.id, session.id, parsedJobs, prefs);

    if (prefs.auto_post === 'auto') {
      const summaries = results.map((r, i) => `${i + 1}. ✅ **${r.title}**`).join('\n');
      return {
        message: personality.humanize(getResponse('document', 'auto_posted', { count: results.length, summaries })),
      };
    } else {
      const summaries = results.map((r, i) => formatJobSummary(parsedJobs[i], i)).join('\n\n');
      if (parsedJobs.length === 1) {
        this.updateFlow(session.id, 'draft-approval', { draftId: results[0].draftId });
        return {
          message: personality.humanize(getResponse('document', 'single_job', { summary: summaries })),
          quickReplies: ['Post Now', 'Edit', 'Discard'],
        };
      }
      return {
        message: personality.humanize(getResponse('document', 'found_jobs', { count: parsedJobs.length, summaries })),
        quickReplies: ['Approve All', 'Review One by One'],
      };
    }
  }

  handleViewFeatureRequests() {
    const features = actions.getTopFeatureRequests(db, 5);
    const stats = actions.getFeatureStats(db);
    
    if (features.length === 0) {
      return {
        message: personality.humanize("No feature requests yet! Be the first to suggest an improvement. 💡\n\nWhat would you like to see added to WantokJobs?"),
        quickReplies: ['Submit a Request', 'View All Features'],
        intent: 'view_features',
      };
    }
    
    const list = features.map((f, i) => {
      const statusEmoji = {
        submitted: '📝',
        under_review: '👀',
        planned: '📋',
        in_progress: '⚙️',
        completed: '✅',
        declined: '❌'
      }[f.status] || '📝';
      
      return `${i + 1}. ${statusEmoji} **${f.title}**\n   ${f.vote_count} votes • ${f.comment_count} comments\n   By ${f.submitter_name}`;
    }).join('\n\n');
    
    return {
      message: personality.humanize(`🌟 **Top Feature Requests**\n\n${stats.total} total • ${stats.planned} planned • ${stats.completed} completed\n\n${list}\n\n[View all requests](/features) or tell me your idea!`),
      quickReplies: ['Submit a Request', 'View All Features', 'Search Jobs'],
      intent: 'view_features',
    };
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

const jean = new Jean();
module.exports = jean;
