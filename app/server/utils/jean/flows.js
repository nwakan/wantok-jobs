/**
 * Jean Conversational Flows
 * State machines for multi-step interactions.
 * Each flow has steps, transforms, and an execute action.
 */

const { getResponse } = require('./responses');
const actions = require('./actions');
const personality = require('./personality');
const logger = require('../../utils/logger');

/**
 * Flow definitions — each step has:
 * - key: unique identifier
 * - ask: question to ask (or function(context) => string)
 * - field: target field name(s)
 * - transform: optional function to process input
 * - validate: optional function returning error string or null
 * - skip: optional function(context) => boolean (skip if already filled)
 * - quickReplies: optional array of suggested responses
 */
const FLOW_DEFS = {
  // ─── Jobseeker Profile ──────────────────────────────────
  'update-profile-jobseeker': {
    steps: [
      {
        key: 'headline',
        ask: "What's your job title or professional headline? (e.g. 'Diesel Mechanic', 'Experienced Accountant')",
        field: 'headline',
        skip: (ctx) => !!ctx.profile?.headline,
      },
      {
        key: 'location',
        ask: "Where are you based? (e.g. 'Port Moresby, NCD', 'Lae, Morobe')",
        field: 'location',
        skip: (ctx) => !!ctx.profile?.location,
      },
      {
        key: 'phone',
        ask: "Your phone number? (e.g. '7xxx xxxx')",
        field: 'phone',
        skip: (ctx) => !!ctx.profile?.phone,
      },
      {
        key: 'skills',
        ask: "What are your main skills? List them separated by commas.",
        field: 'skills',
        transform: (input) => {
          const skills = input.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
          return JSON.stringify(skills);
        },
        skip: (ctx) => {
          try { return JSON.parse(ctx.profile?.skills || '[]').length > 0; } catch { return false; }
        },
      },
      {
        key: 'bio',
        ask: "Give me a short bio — 2-3 sentences about your experience and what you're good at.",
        field: 'bio',
        validate: (input) => input.length < 10 ? 'Too short — give me at least a sentence!' : null,
        skip: (ctx) => !!ctx.profile?.bio,
      },
      {
        key: 'desired_job_type',
        ask: "What type of work are you looking for?",
        field: 'desired_job_type',
        quickReplies: ['Full-time', 'Part-time', 'Contract', 'Casual', 'Any'],
        transform: (input) => {
          const map = { 'full time': 'full-time', 'fulltime': 'full-time', 'part time': 'part-time', 'parttime': 'part-time' };
          return map[input.toLowerCase()] || input.toLowerCase();
        },
        skip: (ctx) => !!ctx.profile?.desired_job_type,
      },
      {
        key: 'salary',
        ask: "Expected salary range in Kina? (e.g. 'K2000-3500' or 'negotiable')",
        fields: ['desired_salary_min', 'desired_salary_max'],
        transform: (input) => {
          if (/negoti/i.test(input)) return { desired_salary_min: null, desired_salary_max: null };
          const match = input.match(/k?\s*(\d[\d,]*)\s*[-–to]*\s*k?\s*(\d[\d,]*)?/i);
          if (match) {
            return {
              desired_salary_min: parseInt(match[1].replace(/,/g, '')),
              desired_salary_max: match[2] ? parseInt(match[2].replace(/,/g, '')) : null,
            };
          }
          return { desired_salary_min: null, desired_salary_max: null };
        },
        skip: (ctx) => ctx.profile?.desired_salary_min != null,
      },
    ],
    onStart: async (ctx) => {
      const data = actions.getProfile(ctx.db, ctx.userId);
      if (!data) return { error: 'Profile not found' };
      ctx.profile = data.profile;
      ctx.user = data.user;

      // Check which fields are missing
      const missing = [];
      for (const step of FLOW_DEFS['update-profile-jobseeker'].steps) {
        if (!step.skip || !step.skip(ctx)) missing.push(step.key);
      }

      if (missing.length === 0) {
        return {
          done: true,
          message: getResponse('profile', 'already_complete', {
            summary: formatJobseekerSummary(ctx.profile, ctx.user),
          }),
        };
      }

      return {
        message: personality.humanize(getResponse('profile', 'missing_fields', {
          percent: Math.round(((7 - missing.length) / 7) * 100),
          fields: missing.join(', '),
        }), { flowStep: true }),
      };
    },
    onComplete: async (ctx, collected) => {
      const data = {};
      for (const [key, value] of Object.entries(collected)) {
        if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
          Object.assign(data, value);
        } else {
          data[key] = value;
        }
      }
      const updated = actions.updateJobseekerProfile(ctx.db, ctx.userId, data);
      const summary = personality.formatProfileSummary(updated, ctx.user);
      const followUp = personality.getFollowUpSuggestions({ role: 'jobseeker' }, 'profile-updated');
      let msg = personality.humanize(getResponse('profile', 'saved', { summary }), { profileComplete: true });
      if (followUp?.text) msg += '\n\n💡 ' + followUp.text;
      return {
        message: msg,
        quickReplies: followUp?.quickReplies,
      };
    },
  },

  // ─── Employer Profile ──────────────────────────────────
  'update-profile-employer': {
    steps: [
      {
        key: 'company_name',
        ask: "What's your company name?",
        field: 'company_name',
        skip: (ctx) => !!ctx.profile?.company_name,
      },
      {
        key: 'industry',
        ask: "What industry? (e.g. Mining, Construction, IT, Healthcare)",
        field: 'industry',
        skip: (ctx) => !!ctx.profile?.industry,
      },
      {
        key: 'company_size',
        ask: "Company size?",
        field: 'company_size',
        quickReplies: ['1-10', '11-50', '51-200', '201-500', '500+'],
        skip: (ctx) => !!ctx.profile?.company_size,
      },
      {
        key: 'location',
        ask: "Where is your company based?",
        field: 'location',
        skip: (ctx) => !!ctx.profile?.location,
      },
      {
        key: 'website',
        ask: "Company website? (or 'skip')",
        field: 'website',
        skip: (ctx) => !!ctx.profile?.website,
      },
      {
        key: 'description',
        ask: "Brief description of your company — what do you do?",
        field: 'description',
        skip: (ctx) => !!ctx.profile?.description,
      },
    ],
    onStart: async (ctx) => {
      const data = actions.getProfile(ctx.db, ctx.userId);
      if (!data) return { error: 'Profile not found' };
      ctx.profile = data.profile;
      ctx.user = data.user;
      const missing = FLOW_DEFS['update-profile-employer'].steps.filter(s => !s.skip || !s.skip(ctx));
      if (missing.length === 0) {
        return { done: true, message: getResponse('profile', 'already_complete', { summary: formatEmployerSummary(ctx.profile) }) };
      }
      return { message: getResponse('profile', 'start_employer') };
    },
    onComplete: async (ctx, collected) => {
      const updated = actions.updateEmployerProfile(ctx.db, ctx.userId, collected);
      const summary = formatEmployerSummary(updated);
      const followUp = personality.getFollowUpSuggestions({ role: 'employer' }, 'profile-updated');
      let msg = personality.humanize(getResponse('profile', 'saved', { summary }), { profileComplete: true });
      if (followUp?.text) msg += '\n\n💡 ' + followUp.text;
      return {
        message: msg,
        quickReplies: followUp?.quickReplies,
      };
    },
  },

  // ─── Resume Builder ────────────────────────────────────
  'build-resume': {
    steps: [
      {
        key: 'work_history',
        ask: "Tell me about a job you've had. Include:\n• Company name\n• Your role/title\n• When you worked there (e.g. 2018-2024)\n• Brief description\n\nOr say 'done' if finished.",
        field: 'work_history',
        multi: true, // Allows multiple entries
        transform: (input) => {
          // Parse work entry from natural language
          const lines = input.split('\n').map(l => l.trim()).filter(Boolean);
          const entry = { title: '', company: '', start_date: '', end_date: '', description: '' };

          // Try to extract structured data
          const dateMatch = input.match(/(\d{4})\s*[-–to]+\s*(\d{4}|present|current|now)/i);
          if (dateMatch) {
            entry.start_date = dateMatch[1];
            entry.end_date = /present|current|now/i.test(dateMatch[2]) ? 'Present' : dateMatch[2];
          }

          // Simple heuristic: first line or pre-comma is company/role
          const parts = input.replace(/\d{4}\s*[-–to]+\s*\w+/gi, '').trim();
          const commaSplit = parts.split(/[,;]/);
          if (commaSplit.length >= 2) {
            entry.company = commaSplit[0].trim();
            entry.title = commaSplit[1].trim();
            entry.description = commaSplit.slice(2).join(', ').trim();
          } else {
            entry.description = parts;
          }

          return entry;
        },
        isDone: (input) => /^(done|finish|no more|that'?s?\s*(all|it)|nogat)/i.test(input),
      },
      {
        key: 'education',
        ask: "Now education. What's your highest qualification?\nInclude: degree/cert name, institution, and year.\n\nOr 'skip'.",
        field: 'education',
        multi: true,
        transform: (input) => {
          const entry = { degree: '', institution: '', year: '', field: '' };
          const yearMatch = input.match(/\b(19|20)\d{2}\b/);
          if (yearMatch) entry.year = yearMatch[0];

          // Try "Degree from/at Institution"
          const fromMatch = input.match(/(.+?)\s+(?:from|at)\s+(.+)/i);
          if (fromMatch) {
            entry.degree = fromMatch[1].replace(/\b(19|20)\d{2}\b/, '').trim();
            entry.institution = fromMatch[2].replace(/\b(19|20)\d{2}\b/, '').trim();
          } else {
            const commaSplit = input.split(/[,;]/);
            entry.degree = (commaSplit[0] || '').replace(/\b(19|20)\d{2}\b/, '').trim();
            entry.institution = (commaSplit[1] || '').replace(/\b(19|20)\d{2}\b/, '').trim();
          }
          return entry;
        },
        isDone: (input) => /^(done|finish|no more|that'?s?\s*(all|it)|nogat)/i.test(input),
      },
      {
        key: 'certifications',
        ask: "Any certifications or licenses? (e.g. First Aid, Confined Space, Driver's License)\n\nOr 'skip'.",
        field: 'certifications',
        transform: (input) => input,
      },
    ],
    onStart: async (ctx) => {
      const data = actions.getProfile(ctx.db, ctx.userId);
      ctx.profile = data?.profile;
      ctx.user = data?.user;
      ctx.collectedWork = [];
      ctx.collectedEdu = [];
      return { message: getResponse('resume', 'start') };
    },
    onComplete: async (ctx, collected) => {
      const updates = {};
      if (collected.work_history) {
        updates.work_history = JSON.stringify(
          Array.isArray(collected.work_history) ? collected.work_history : [collected.work_history]
        );
      }
      if (collected.education) {
        updates.education = JSON.stringify(
          Array.isArray(collected.education) ? collected.education : [collected.education]
        );
      }
      if (collected.certifications) {
        updates.certifications = collected.certifications;
      }
      actions.updateJobseekerProfile(ctx.db, ctx.userId, updates);

      const profile = actions.getProfile(ctx.db, ctx.userId);
      const followUp = personality.getFollowUpSuggestions({ role: 'jobseeker' }, 'resume-built');
      let msg = personality.humanize(getResponse('resume', 'from_profile', {
        preview: formatResumeSummary(profile.user, profile.profile),
      }));
      if (followUp?.text) msg += '\n\n💡 ' + followUp.text;
      return {
        message: msg,
        quickReplies: followUp?.quickReplies,
      };
    },
  },

  // ─── Post Job ──────────────────────────────────────────
  'post-job': {
    steps: [
      { key: 'title', ask: "What's the job title?", field: 'title', validate: (v) => v.length < 3 ? 'Title too short' : null },
      { key: 'description', ask: "Describe the role — responsibilities, day-to-day duties.", field: 'description', validate: (v) => v.length < 20 ? 'Please provide more detail' : null },
      { key: 'requirements', ask: "What qualifications or experience needed? (or 'skip')", field: 'requirements' },
      { key: 'location', ask: "Where is this job based? (e.g. 'Port Moresby, NCD')", field: 'location' },
      { key: 'job_type', ask: "What type of employment?", field: 'job_type', quickReplies: ['Full-time', 'Part-time', 'Contract', 'Casual'] },
      { key: 'experience_level', ask: "Experience level?", field: 'experience_level', quickReplies: ['Entry Level', 'Mid Level', 'Senior', 'Executive'] },
      {
        key: 'category_slug',
        ask: (ctx) => {
          const cats = actions.getCategories(ctx.db);
          const list = cats.map(c => `• ${c.name} (${c.job_count} jobs)`).join('\n');
          return `Which category fits best?\n\n${list}`;
        },
        field: 'category_slug',
        transform: (input, ctx) => {
          const cats = actions.getCategories(ctx.db);
          const lower = input.toLowerCase();
          const match = cats.find(c => c.name.toLowerCase().includes(lower) || c.slug.includes(lower));
          return match ? match.slug : input.toLowerCase().replace(/\s+/g, '-');
        },
      },
      {
        key: 'salary',
        ask: "Salary range in Kina? (e.g. 'K3000-5000 per fortnight' or 'negotiable')",
        fields: ['salary_min', 'salary_max'],
        transform: (input) => {
          if (/negoti/i.test(input)) return { salary_min: null, salary_max: null };
          const match = input.match(/k?\s*(\d[\d,]*)\s*[-–to]*\s*k?\s*(\d[\d,]*)?/i);
          if (match) {
            return {
              salary_min: parseInt(match[1].replace(/,/g, '')),
              salary_max: match[2] ? parseInt(match[2].replace(/,/g, '')) : null,
            };
          }
          return { salary_min: null, salary_max: null };
        },
      },
      { key: 'application_deadline', ask: "Application closing date? (e.g. '2026-03-15' or 'open')", field: 'application_deadline',
        transform: (input) => /open|none|no\s*deadline/i.test(input) ? null : input },
    ],
    onStart: async (ctx) => {
      return { message: getResponse('post_job', 'start') };
    },
    onComplete: async (ctx, collected) => {
      // Flatten multi-field entries
      const data = {};
      for (const [key, value] of Object.entries(collected)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          Object.assign(data, value);
        } else {
          data[key] = value;
        }
      }

      // Check employer pref for auto vs draft
      const prefs = actions.getEmployerPrefs(ctx.db, ctx.userId);

      if (prefs.auto_post === 'auto') {
        const result = actions.postJob(ctx.db, ctx.userId, data);
        const followUp = personality.getFollowUpSuggestions({ role: 'employer' }, 'job-posted');
        let msg = personality.humanize(getResponse('post_job', 'posted', { title: data.title }), { firstJob: true });
        if (followUp?.text) msg += '\n\n💡 ' + followUp.text;
        return { message: msg, quickReplies: followUp?.quickReplies };
      } else {
        // Save as draft
        const draft = actions.createJobDraft(ctx.db, ctx.userId, ctx.sessionId, { ...data, source_filename: 'chat' });
        return {
          message: personality.humanize(`📝 Draft saved: **${data.title}**\n\nWant me to post it now, or review it in your [dashboard](/dashboard/employer/jobs)? Tokim mi!`),
          quickReplies: ['Post Now', 'Save as Draft'],
          awaitingDraftApproval: draft.draftId,
        };
      }
    },
  },

  // ─── Auto-Apply Setup ──────────────────────────────────
  'auto-apply-setup': {
    steps: [
      {
        key: 'keywords',
        ask: "What keywords should I look for? (e.g. 'mechanic, driver, welder')",
        field: 'keywords',
        transform: (input) => input.split(/[,;]+/).map(s => s.trim()).filter(Boolean),
      },
      {
        key: 'categories',
        ask: (ctx) => {
          const cats = actions.getCategories(ctx.db);
          const list = cats.slice(0, 10).map(c => `• ${c.name}`).join('\n');
          return `Any specific categories?\n\n${list}\n\nOr say 'any' for all.`;
        },
        field: 'categories',
        transform: (input, ctx) => {
          if (/any|all/i.test(input)) return [];
          const cats = actions.getCategories(ctx.db);
          return input.split(/[,;]+/).map(s => {
            const t = s.trim().toLowerCase();
            const match = cats.find(c => c.name.toLowerCase().includes(t) || c.slug.includes(t));
            return match ? match.slug : t.replace(/\s+/g, '-');
          }).filter(Boolean);
        },
      },
      {
        key: 'min_salary',
        ask: "Minimum salary in Kina? (e.g. 'K2000' or 'any')",
        field: 'min_salary',
        transform: (input) => {
          if (/any|no\s*min|negoti/i.test(input)) return null;
          const match = input.match(/k?\s*(\d[\d,]*)/i);
          return match ? parseInt(match[1].replace(/,/g, '')) : null;
        },
      },
      {
        key: 'locations',
        ask: "Preferred location? (e.g. 'Port Moresby', 'Lae', or 'anywhere')",
        field: 'locations',
        transform: (input) => {
          if (/any|anywhere|all/i.test(input)) return [];
          return input.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
        },
      },
      {
        key: 'max_daily',
        ask: "How many applications per day max? (1-10, default 5)",
        field: 'max_daily',
        transform: (input) => {
          const n = parseInt(input);
          return (n >= 1 && n <= 10) ? n : 5;
        },
      },
    ],
    onStart: async (ctx) => {
      return { message: getResponse('auto_apply', 'setup') };
    },
    onComplete: async (ctx, collected) => {
      const minScore = actions.getSetting(ctx.db, 'auto_apply_min_match_score') || '70';
      const rule = {
        keywords: collected.keywords,
        categories: collected.categories,
        min_salary: collected.min_salary,
        locations: collected.locations,
        max_daily: collected.max_daily,
      };
      actions.createAutoApplyRule(ctx.db, ctx.userId, rule);
      return {
        message: personality.humanize(getResponse('auto_apply', 'activated', { min_score: minScore })),
        quickReplies: ['My Applications', 'Search Jobs', 'Stop Auto-Apply'],
      };
    },
  },

  // ─── Employer Preferences ──────────────────────────────
  'employer-prefs': {
    steps: [
      {
        key: 'auto_post',
        ask: "How should I handle uploaded job documents?\n\n**Review** — Create drafts, you approve each one\n**Auto-post** — Post immediately, notify you\n**Batch** — Create all drafts, you approve the batch",
        field: 'auto_post',
        quickReplies: ['Review', 'Auto-post', 'Batch'],
        transform: (input) => {
          if (/auto/i.test(input)) return 'auto';
          if (/batch/i.test(input)) return 'batch';
          return 'review';
        },
      },
      {
        key: 'default_location',
        ask: "Default job location? (or 'skip')",
        field: 'default_location',
      },
      {
        key: 'notify_on_application',
        ask: "Notify you when someone applies?",
        field: 'notify_on_application',
        quickReplies: ['Yes', 'No'],
        transform: (input) => /yes|y|sure/i.test(input) ? 1 : 0,
      },
    ],
    onStart: async (ctx) => {
      const prefs = actions.getEmployerPrefs(ctx.db, ctx.userId);
      return {
        message: getResponse('employer_prefs', 'current', {
          auto_post: prefs.auto_post,
          location: prefs.default_location || 'Not set',
          category: prefs.default_category || 'Not set',
          notify: prefs.notify_on_application ? 'On' : 'Off',
        }),
      };
    },
    onComplete: async (ctx, collected) => {
      actions.updateEmployerPrefs(ctx.db, ctx.userId, collected);
      return {
        message: personality.humanize(getResponse('employer_prefs', 'updated', { summary: JSON.stringify(collected) })),
        quickReplies: ['Post a Job', 'My Jobs', 'Upload Document'],
      };
    },
  },

  // ─── Contact Support ───────────────────────────────────
  'contact-support': {
    steps: [
      { key: 'subject', ask: "What's this about?", field: 'subject', quickReplies: ['Technical Issue', 'Billing Question', 'Report a Problem', 'General Inquiry'] },
      { key: 'message', ask: "Please describe your issue or question in detail.", field: 'message', validate: (v) => v.length < 10 ? 'Please provide more detail' : null },
      { key: 'email', ask: "Your email address (so we can respond)?", field: 'email', skip: (ctx) => !!ctx.userEmail },
    ],
    onStart: async (ctx) => {
      const data = ctx.userId ? actions.getProfile(ctx.db, ctx.userId) : null;
      ctx.userEmail = data?.user?.email;
      ctx.userName = data?.user?.name;
      return { message: getResponse('contact', 'prompt') };
    },
    onComplete: async (ctx, collected) => {
      const email = collected.email || ctx.userEmail;
      actions.submitContact(ctx.db, {
        name: ctx.userName || 'Chat User',
        email,
        subject: collected.subject,
        message: collected.message,
      });
      return {
        message: personality.humanize(getResponse('contact', 'submitted', { email })),
        quickReplies: ['Search Jobs', 'My Profile', 'FAQ'],
      };
    },
  },

  // ─── Feature Request ───────────────────────────────────
  'feature-request': {
    steps: [
      { 
        key: 'title', 
        ask: "What's the title of your feature request? Give it a short, clear name.", 
        field: 'title',
        validate: (v) => v.length < 5 ? 'Title must be at least 5 characters' : (v.length > 200 ? 'Title is too long (max 200 characters)' : null)
      },
      { 
        key: 'description', 
        ask: "Now describe your idea in detail. What problem does it solve? How would it help you or other users?", 
        field: 'description',
        validate: (v) => v.length < 20 ? 'Please provide more detail (at least 20 characters)' : (v.length > 2000 ? 'Description is too long (max 2000 characters)' : null)
      },
      { 
        key: 'category', 
        ask: "What category does this fit into?", 
        field: 'category',
        quickReplies: ['General', 'Jobs', 'Employers', 'Jobseekers', 'Transparency', 'Mobile', 'Other'],
        transform: (v) => v.toLowerCase()
      },
    ],
    onStart: async (ctx) => {
      return { 
        message: personality.humanize("Great! Let's submit your feature request. Your voice matters — mi laik harim tingting bilong yu! 💡")
      };
    },
    onComplete: async (ctx, collected) => {
      const result = actions.createFeatureRequest(ctx.db, ctx.userId, collected);
      if (result.error) {
        return {
          message: `Oops, something went wrong: ${result.error}. Sori tru! Please try again.`,
          quickReplies: ['Try Again', 'View Features', 'Search Jobs'],
        };
      }
      return {
        message: personality.humanize(`✅ Your feature request has been submitted! Others can vote on it at [/features](/features).\n\nTenkyu tru for helping us improve WantokJobs! 🙌`),
        quickReplies: ['View All Requests', 'Submit Another', 'Search Jobs'],
      };
    },
  },
};

// ─── Flow Engine ─────────────────────────────────────────

class FlowEngine {
  constructor(db, userId, sessionId) {
    this.db = db;
    this.userId = userId;
    this.sessionId = sessionId;
  }

  /**
   * Start a new flow
   */
  async start(flowName) {
    const def = FLOW_DEFS[flowName];
    if (!def) return { error: `Unknown flow: ${flowName}` };

    const ctx = this._makeContext();
    const state = { flow: flowName, stepIndex: 0, collected: {}, multiBuffer: {} };

    // Run onStart hook
    if (def.onStart) {
      const result = await def.onStart(ctx);
      if (result.done) return { message: result.message, flowComplete: true };
      if (result.error) return { message: result.error, flowComplete: true };

      // Skip already-filled steps
      state.stepIndex = this._findNextStep(def, state, ctx);

      if (state.stepIndex >= def.steps.length) {
        return { message: result.message + '\n\nLooks like everything is already filled in!', flowComplete: true };
      }

      const step = def.steps[state.stepIndex];
      const ask = typeof step.ask === 'function' ? step.ask(ctx) : step.ask;
      return {
        message: result.message + '\n\n' + ask,
        quickReplies: step.quickReplies,
        state,
      };
    }

    const step = def.steps[0];
    const ask = typeof step.ask === 'function' ? step.ask(ctx) : step.ask;
    return { message: ask, quickReplies: step.quickReplies, state };
  }

  /**
   * Process input for an active flow
   */
  async processInput(state, input) {
    const def = FLOW_DEFS[state.flow];
    if (!def) return { error: 'Flow not found', flowComplete: true };

    const ctx = this._makeContext();
    // Restore profile context if needed
    if (def.onStart && !ctx.profile) {
      const data = actions.getProfile(this.db, this.userId);
      if (data) { ctx.profile = data.profile; ctx.user = data.user; }
    }

    const step = def.steps[state.stepIndex];
    if (!step) return { message: 'Flow completed!', flowComplete: true };

    // Handle multi-entry steps
    if (step.multi) {
      if (step.isDone && step.isDone(input)) {
        // Move to next step
        if (state.multiBuffer[step.key]?.length > 0) {
          state.collected[step.key] = state.multiBuffer[step.key];
        }
      } else {
        // Transform and buffer
        const value = step.transform ? step.transform(input, ctx) : input;
        if (!state.multiBuffer[step.key]) state.multiBuffer[step.key] = [];
        state.multiBuffer[step.key].push(value);

        // Ask for more
        const morePrompts = [
          "✅ Got it! Any more to add? (say 'done' when finished)",
          "✅ Saved! More to add? Say 'done' when you're finished. Em i isi tasol!",
          "✅ Nice one! Got any more? (say 'done' to move on)",
        ];
        return {
          message: personality.randomFrom(morePrompts),
          state,
        };
      }
    } else {
      // Validate
      if (step.validate) {
        const err = step.validate(input);
        if (err) return { message: `⚠️ ${err}`, state };
      }

      // Transform
      let value = step.transform ? step.transform(input, ctx) : input;

      // Multi-field transforms return objects
      if (step.fields && typeof value === 'object') {
        state.collected[step.key] = value;
      } else {
        state.collected[step.field || step.key] = value;
      }
    }

    // Advance to next non-skipped step
    state.stepIndex++;
    state.stepIndex = this._findNextStep(def, state, ctx);

    // Flow complete?
    if (state.stepIndex >= def.steps.length) {
      // Flatten collected data
      const flatCollected = {};
      for (const [key, val] of Object.entries(state.collected)) {
        if (typeof val === 'object' && val !== null && !Array.isArray(val) && !key.includes('history') && !key.includes('education')) {
          Object.assign(flatCollected, val);
        } else {
          flatCollected[key] = val;
        }
      }

      if (def.onComplete) {
        const result = await def.onComplete(ctx, flatCollected);
        return { ...result, flowComplete: true };
      }
      return { message: 'Done! ✅', flowComplete: true };
    }

    // Ask next question
    const nextStep = def.steps[state.stepIndex];
    const ask = typeof nextStep.ask === 'function' ? nextStep.ask(ctx) : nextStep.ask;
    return { message: ask, quickReplies: nextStep.quickReplies, state };
  }

  _findNextStep(def, state, ctx) {
    let idx = state.stepIndex;
    while (idx < def.steps.length) {
      const step = def.steps[idx];
      if (step.skip && step.skip(ctx)) {
        idx++;
      } else {
        break;
      }
    }
    return idx;
  }

  _makeContext() {
    return { db: this.db, userId: this.userId, sessionId: this.sessionId };
  }
}

// ─── Formatters ──────────────────────────────────────────

function formatJobseekerSummary(profile, user) {
  if (!profile) return 'No profile data';
  const parts = [];
  if (profile.headline) parts.push(`👤 **${profile.headline}**`);
  if (user?.name) parts.push(`Name: ${user.name}`);
  if (profile.location) parts.push(`📍 ${profile.location}`);
  if (profile.phone) parts.push(`📱 ${profile.phone}`);
  try {
    const skills = JSON.parse(profile.skills || '[]');
    if (skills.length) parts.push(`🛠️ Skills: ${skills.join(', ')}`);
  } catch {}
  if (profile.bio) parts.push(`📝 Bio: ${profile.bio.substring(0, 100)}...`);
  if (profile.desired_job_type) parts.push(`💼 Looking for: ${profile.desired_job_type}`);
  if (profile.desired_salary_min) parts.push(`💰 Salary: K${profile.desired_salary_min}${profile.desired_salary_max ? '-' + profile.desired_salary_max : '+'}`);
  return parts.join('\n');
}

function formatEmployerSummary(profile) {
  if (!profile) return 'No profile data';
  const parts = [];
  if (profile.company_name) parts.push(`🏢 **${profile.company_name}**`);
  if (profile.industry) parts.push(`Industry: ${profile.industry}`);
  if (profile.company_size) parts.push(`Size: ${profile.company_size} employees`);
  if (profile.location) parts.push(`📍 ${profile.location}`);
  if (profile.website) parts.push(`🌐 ${profile.website}`);
  if (profile.description) parts.push(`📝 ${profile.description.substring(0, 100)}...`);
  return parts.join('\n');
}

function formatResumeSummary(user, profile) {
  const parts = [];
  if (user?.name) parts.push(`**${user.name}**`);
  if (profile?.headline) parts.push(profile.headline);
  if (profile?.location) parts.push(`📍 ${profile.location}`);

  try {
    const work = JSON.parse(profile?.work_history || '[]');
    if (work.length) {
      parts.push('\n**Work Experience:**');
      for (const w of work) {
        parts.push(`• ${w.title || 'Role'} at ${w.company || 'Company'} (${w.start_date || '?'}–${w.end_date || 'Present'})`);
      }
    }
  } catch {}

  try {
    const edu = JSON.parse(profile?.education || '[]');
    if (edu.length) {
      parts.push('\n**Education:**');
      for (const e of edu) {
        parts.push(`• ${e.degree || 'Qualification'} — ${e.institution || 'Institution'} ${e.year || ''}`);
      }
    }
  } catch {}

  try {
    const skills = JSON.parse(profile?.skills || '[]');
    if (skills.length) parts.push(`\n**Skills:** ${skills.join(', ')}`);
  } catch {}

  if (profile?.certifications) parts.push(`\n**Certifications:** ${profile.certifications}`);

  return parts.join('\n');
}

module.exports = { FlowEngine, FLOW_DEFS };
