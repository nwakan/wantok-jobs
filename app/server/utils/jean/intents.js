/**
 * Jean Intent Classification
 * Rule-based intent detection with keyword matching, Tok Pisin support,
 * and contextual awareness.
 */

const INTENTS = {
  // ─── Greetings ─────────────────────────────────────────
  greeting: {
    patterns: [
      /^(hi|hello|hey|g'?day|good\s*(morning|afternoon|evening)|howdy|yo|sup)/i,
      /^(gutpela|apinun|moningtaim|gude?)/i, // Tok Pisin
    ],
    priority: 1,
  },
  farewell: {
    patterns: [
      /^(bye|goodbye|see\s*ya|later|thanks?\s*(bye|for)|cheers|lukim\s*yu)/i,
    ],
    priority: 1,
  },

  // ─── Job Search ────────────────────────────────────────
  search_jobs: {
    patterns: [
      /\b(search|find|look\s*(for|ing)?|show|browse|list)\b.*(job|position|wok|vacanc|opening|role)/i,
      /\b(job|wok|position|role)s?\b.*(search|find|available|near|in\s+\w+)/i,
      /\bwok\b.*\b(painim|lukim)\b/i, // Tok Pisin: look for work
      /\bany\s*(job|wok|position|opening)s?\b/i,
      /\bwhat('?s| is)\s*(available|open|hiring)/i,
    ],
    priority: 5,
    requiresAuth: false,
  },
  job_details: {
    patterns: [
      /\b(tell|more|detail|about|info|describe)\b.*\b(job|position|role|this)\b/i,
      /\bjob\s*#?\d+\b/i,
    ],
    priority: 4,
  },

  // ─── Profile Management ────────────────────────────────
  update_profile: {
    patterns: [
      /\b(update|edit|change|fix|set\s*up|complete|fill)\b.*\b(profile|bio|headline|skills?|info|details)\b/i,
      /\b(my|profile)\b.*\b(update|edit|change|incomplete|empty|missing)\b/i,
      /\bprofile\b/i,
    ],
    priority: 5,
    requiresAuth: true,
  },
  import_linkedin: {
    patterns: [
      /\blinkedin\b/i,
      /\blinkedin\.com\b/i,
      /\bimport\b.*\b(profile|cv|resume)\b/i,
    ],
    priority: 8,
    requiresAuth: true,
  },

  // ─── CV / Resume ───────────────────────────────────────
  build_resume: {
    patterns: [
      /\b(build|create|make|generate|write)\b.*\b(cv|resume|curriculum)\b/i,
      /\b(cv|resume)\b.*\b(build|create|make|download|preview|help)\b/i,
      /\bupload\b.*\b(cv|resume)\b/i,
    ],
    priority: 6,
    requiresAuth: true,
    requiredRole: 'jobseeker',
  },

  // ─── Applications ──────────────────────────────────────
  apply_job: {
    patterns: [
      /\b(apply|appla?i|submit|send)\b.*\b(job|position|role|application|this)\b/i,
      /\b(application|apply)\b/i,
      /\bmi\s*laik\s*(apla?i|wok)\b/i, // Tok Pisin: I want to apply
    ],
    priority: 7,
    requiresAuth: true,
    requiredRole: 'jobseeker',
  },
  check_applications: {
    patterns: [
      /\b(my|check|view|see|status)\b.*\b(application|applied|submission)/i,
      /\bapplication\s*(status|update|progress)\b/i,
    ],
    priority: 5,
    requiresAuth: true,
    requiredRole: 'jobseeker',
  },
  auto_apply_setup: {
    patterns: [
      /\bauto[\s-]?apply\b/i,
      /\b(automatic|automated)\b.*\bappl/i,
      /\bapply\b.*\b(automatically|for\s*me)\b/i,
      /\b(turn|set|enable|start)\b.*\bauto/i,
    ],
    priority: 8,
    requiresAuth: true,
    requiredRole: 'jobseeker',
  },
  stop_auto_apply: {
    patterns: [
      /\b(stop|disable|turn\s*off|cancel|pause)\b.*\bauto[\s-]?apply\b/i,
    ],
    priority: 9,
    requiresAuth: true,
    requiredRole: 'jobseeker',
  },

  // ─── Employer: Job Posting ─────────────────────────────
  post_job: {
    patterns: [
      /\b(post|create|add|new|publish)\b.*\b(job|position|vacanc|listing|role)\b/i,
      /\bjob\b.*\b(post|create|listing)\b/i,
    ],
    priority: 6,
    requiresAuth: true,
    requiredRole: 'employer',
  },
  hire_someone: {
    patterns: [
      /\b(i\s*need|need|looking\s*for|want|hiring|hire|recruiting|recruit)\b.*\b(a|an|someone|wanpela)\b/i,
      /\bmi\s*nidim\s*(wanpela|sampela)/i, // Tok Pisin: I need someone
      /\b(driver|mechanic|accountant|worker|staff|cleaner|security|cook|teacher|nurse|engineer)\b.*\b(in|at|for|long)\b/i,
    ],
    priority: 7,
    requiresAuth: false, // Allow WhatsApp users to trigger this
  },
  need_worker: {
    patterns: [
      /\bneed\s*(a|an)?\s*(driver|mechanic|accountant|worker|staff)/i,
      /\blooking\s*for\s*(staff|worker|employee|someone)/i,
    ],
    priority: 7,
    requiresAuth: false,
  },
  upload_job_document: {
    patterns: [
      /\b(upload|attach|send)\b.*\b(pdf|doc|document|file|jd|description)\b/i,
      /\b(pdf|doc|word|document)\b.*\b(upload|job|position)\b/i,
      /\b(i have|here'?s?)\b.*\b(pdf|doc|file|document)\b/i,
      /\bpositions?\s*to\s*(upload|post|fill)\b/i,
    ],
    priority: 8,
    requiresAuth: true,
    requiredRole: 'employer',
  },
  manage_jobs: {
    patterns: [
      /\b(my|manage|edit|close|view|see)\b.*\bjob(s| listing| post)/i,
      /\bjob\b.*\b(edit|close|delete|update|status)\b/i,
    ],
    priority: 5,
    requiresAuth: true,
    requiredRole: 'employer',
  },
  check_my_jobs_wa: {
    patterns: [
      /\bhow\s*(are|is)\s*my\s*job/i,
      /\bmy\s*post(s|ing)?/i,
      /\bjob\s*stats?\b/i,
      /\bhow.*doing\b/i,
    ],
    priority: 5,
    requiresAuth: false, // WhatsApp users
  },
  payment_confirm: {
    patterns: [
      /\b(i'?ve?\s*)?(paid|sent|transferred|made\s*payment)/i,
      /\bhere'?s?\s*(the)?\s*(receipt|proof|payment)/i,
      /\bpayment\s*(done|sent|complete)/i,
      /\bmi\s*pinis\s*pei/i, // Tok Pisin: I've paid
    ],
    priority: 8,
    requiresAuth: false,
  },
  view_applicants: {
    patterns: [
      /\b(view|show|see|check|list|who)\b.*\b(applicant|candidate|applied|application)/i,
      /\bapplicant/i,
      /\bwho\s*(applied|is\s*interested)\b/i,
    ],
    priority: 6,
    requiresAuth: true,
    requiredRole: 'employer',
  },
  employer_prefs: {
    patterns: [
      /\b(set|change|update)\b.*\b(preference|setting|auto[\s-]?post|automation)\b/i,
      /\bauto[\s-]?post\b/i,
    ],
    priority: 7,
    requiresAuth: true,
    requiredRole: 'employer',
  },

  // ─── Saved Jobs / Alerts ───────────────────────────────
  save_job: {
    patterns: [
      /\b(save|bookmark|favourite|favorite|keep)\b.*\b(job|this|position)\b/i,
    ],
    priority: 6,
    requiresAuth: true,
  },
  saved_jobs: {
    patterns: [
      /\b(my|view|show|see)\b.*\bsaved\b/i,
      /\bsaved\s*jobs?\b/i,
    ],
    priority: 5,
    requiresAuth: true,
  },
  job_alerts: {
    patterns: [
      /\b(set|create|manage|my)\b.*\balert/i,
      /\balert\b.*\b(set|create|new|job|wok)\b/i,
      /\bnotif(y|ication)\b.*\bnew\s*job/i,
    ],
    priority: 6,
    requiresAuth: true,
  },

  // ─── Categories / Companies ────────────────────────────
  browse_categories: {
    patterns: [
      /\bcategor(y|ies)?\b/i,
      /\b(industr(y|ies)|sector|field)s?\b/i,
      /\bwhat\s*(type|kind)s?\s*of\s*(job|work|wok)/i,
    ],
    priority: 3,
  },
  browse_companies: {
    patterns: [
      /\bcompan(y|ies)\b/i,
      /\b(employer|business|organisation|organization)s?\b.*\b(list|browse|view|see|who)/i,
      /\bwho'?s?\s*hiring\b/i,
    ],
    priority: 3,
  },

  // ─── Pricing / Plans ──────────────────────────────────
  pricing: {
    patterns: [
      /\b(price|pricing|cost|plan|package|credit|how\s*much|fee|pay|mani)\b/i,
    ],
    priority: 4,
  },
  buy_credits: {
    patterns: [
      /\b(buy|purchase|get|add)\b.*\b(credit|package|plan)\b/i,
      /\bhow\s*much.*\bpost\b/i,
      /\bwant\s*(more)?\s*credit/i,
    ],
    priority: 6,
    requiresAuth: false, // WhatsApp users can inquire
  },
  sme_pricing: {
    patterns: [
      /\bsme\s*pricing\b/i,
      /\bwhatsapp.*pric/i,
      /\bsmall\s*business.*pric/i,
    ],
    priority: 6,
  },

  // ─── Auth ──────────────────────────────────────────────
  help_register: {
    patterns: [
      /\b(register|sign\s*up|create\s*account|join|new\s*user)\b/i,
    ],
    priority: 5,
  },
  help_login: {
    patterns: [
      /\b(log\s*in|sign\s*in|can'?t\s*log|password|forgot|reset)\b/i,
    ],
    priority: 5,
  },

  // ─── Messages / Notifications ──────────────────────────
  check_messages: {
    patterns: [
      /\b(my|check|view|see|read)\b.*\b(message|inbox|mail)\b/i,
      /\bmessage/i,
    ],
    priority: 4,
    requiresAuth: true,
  },
  check_notifications: {
    patterns: [
      /\b(notification|alert|bell|unread)\b/i,
    ],
    priority: 4,
    requiresAuth: true,
  },

  // ─── Interviews / Offers ───────────────────────────────
  check_interviews: {
    patterns: [
      /\b(interview|schedule|meeting)\b/i,
    ],
    priority: 5,
    requiresAuth: true,
  },
  check_offers: {
    patterns: [
      /\b(offer|offer\s*letter)\b/i,
    ],
    priority: 5,
    requiresAuth: true,
  },

  // ─── Feature Requests ──────────────────────────────────
  feature_request: {
    patterns: [
      /\b(feature|suggestion|idea|improvement|request|wish|would\s*be\s*nice)\b/i,
      /\b(i\s*have\s*a|can\s*you\s*add|please\s*add|you\s*should)\b.*\b(suggestion|idea|feature|improvement)\b/i,
      /\b(can\s*you|could\s*you|please)\b.*\b(add|implement|build|create|make)\b/i,
      /\bi\s*wish\s*(the\s*site|wantokjobs|this)\b.*\b(had|could|would)\b/i,
    ],
    priority: 7,
    requiresAuth: false, // Allow viewing but creating requires auth
  },
  view_features: {
    patterns: [
      /\b(what|show|list|view|see)\b.*\b(feature|suggestion|request|idea)s?\b/i,
      /\bfeatures?\b.*\b(request|suggest|people|user|want)\b/i,
      /\bwhat\s*(are\s*)?people\s*(requesting|asking|suggesting)\b/i,
    ],
    priority: 6,
    requiresAuth: false,
  },

  // ─── Contact / Help ────────────────────────────────────
  celebration: {
    patterns: [
      /\b(got|received|accepted|landed)\b.*\b(job|offer|hired|position)\b/i,
      /\b(hired|employed|start(ing|ed)?)\b.*\bnew\s*(job|role|position)\b/i,
      /\byay|woohoo|amazing|awesome|thank you so much\b/i,
    ],
    priority: 6,
  },
  struggling: {
    patterns: [
      /\b(months?|weeks?|long time)\b.*\b(no luck|searching|looking|nothing)\b/i,
      /\b(struggling|hard|difficult|giving up|hopeless)\b.*\b(job|work|find)\b/i,
      /\bno\s*(luck|response|call\s*back)\b/i,
    ],
    priority: 6,
  },
  contact_support: {
    patterns: [
      /\b(contact|support|help|complaint|issue|problem|report)\b/i,
      /\b(talk|speak)\b.*\b(human|person|support|team)\b/i,
    ],
    priority: 2,
  },
  faq: {
    patterns: [
      /\b(faq|frequently|how\s*(does|do|to)|what\s*(is|are)|explain)\b/i,
    ],
    priority: 2,
  },

  // ─── Analytics (Employer) ──────────────────────────────
  employer_analytics: {
    patterns: [
      /\b(analytics|stats|statistics|performance|views|how\s*(is|are)\s*my\s*job)/i,
    ],
    priority: 5,
    requiresAuth: true,
    requiredRole: 'employer',
  },

  // ─── Credits ───────────────────────────────────────────
  check_credits: {
    patterns: [
      /\b(credit|balance|subscription|billing|order)\b/i,
    ],
    priority: 4,
    requiresAuth: true,
  },
};

/**
 * Classify user message into an intent
 * @param {string} message - User's message text
 * @param {object} context - { user, currentFlow, lastIntent, pageContext }
 * @returns {{ intent: string, confidence: number, params: object }}
 */
function classify(message, context = {}) {
  const text = message.trim();
  if (!text) return { intent: 'greeting', confidence: 0.5, params: {} };

  // If user is in an active flow, check for flow-control intents first
  if (context.currentFlow) {
    // Cancel/stop/back commands
    if (/^(cancel|stop|quit|exit|never\s*mind|back|go\s*back)\b/i.test(text)) {
      return { intent: 'cancel_flow', confidence: 1.0, params: {} };
    }
    // Skip command
    if (/^(skip|next|pass|na?h?)\b/i.test(text)) {
      return { intent: 'skip_step', confidence: 1.0, params: {} };
    }
    // Yes/confirm
    if (/^(yes|yeah?|yep|yup|ok(ay)?|sure|go\s*ahead|confirm|approve|yas|em\s*tasol)\b/i.test(text)) {
      return { intent: 'confirm', confidence: 1.0, params: {} };
    }
    // No/reject
    if (/^(no(pe)?|nah?|not?\s*yet|don'?t|nogat)\b/i.test(text)) {
      return { intent: 'reject', confidence: 1.0, params: {} };
    }
    // Otherwise treat as flow input
    return { intent: 'flow_input', confidence: 0.9, params: { text } };
  }

  // Check for URLs (LinkedIn, documents)
  const linkedinMatch = text.match(/linkedin\.com\/(?:in|company)\/[\w-]+/i);
  if (linkedinMatch) {
    return { intent: 'import_linkedin', confidence: 1.0, params: { url: linkedinMatch[0] } };
  }

  // Score each intent
  let bestIntent = null;
  let bestScore = 0;

  for (const [name, def] of Object.entries(INTENTS)) {
    // Check auth requirements
    if (def.requiresAuth && !context.user) continue;
    if (def.requiredRole && context.user?.role !== def.requiredRole) {
      // Employer intents shouldn't match for jobseekers and vice versa
      if (def.requiredRole === 'employer' && context.user?.role === 'jobseeker') continue;
      if (def.requiredRole === 'jobseeker' && context.user?.role === 'employer') continue;
    }

    for (const pattern of def.patterns) {
      if (pattern.test(text)) {
        const score = def.priority + (text.length < 20 ? 1 : 0);
        if (score > bestScore) {
          bestScore = score;
          bestIntent = name;
        }
        break;
      }
    }
  }

  if (bestIntent) {
    return {
      intent: bestIntent,
      confidence: Math.min(bestScore / 10, 1.0),
      params: extractParams(text, bestIntent),
    };
  }

  // Fallback
  return { intent: 'unknown', confidence: 0.1, params: { text } };
}

/**
 * Extract parameters from message based on intent
 */
function extractParams(text, intent) {
  const params = {};

  // Extract location mentions
  const locations = [
    'port moresby', 'lae', 'mt hagen', 'mount hagen', 'kokopo', 'madang',
    'goroka', 'kimbe', 'wewak', 'alotau', 'rabaul', 'kavieng', 'mendi',
    'kundiawa', 'popondetta', 'daru', 'vanimo', 'lorengau', 'ncd',
    'morobe', 'wnb', 'enbp', 'esp', 'whp', 'ehp', 'milne bay',
  ];
  const lower = text.toLowerCase();
  for (const loc of locations) {
    if (lower.includes(loc)) {
      params.location = loc;
      break;
    }
  }

  // Extract salary mentions
  const salaryMatch = text.match(/k?\s*(\d[\d,]*)\s*(?:[-–to]+\s*k?\s*(\d[\d,]*))?/i);
  if (salaryMatch && intent.includes('job')) {
    params.salary_min = parseInt(salaryMatch[1].replace(/,/g, ''));
    if (salaryMatch[2]) params.salary_max = parseInt(salaryMatch[2].replace(/,/g, ''));
  }

  // Extract job type
  if (/full[\s-]?time/i.test(text)) params.job_type = 'full-time';
  else if (/part[\s-]?time/i.test(text)) params.job_type = 'part-time';
  else if (/contract/i.test(text)) params.job_type = 'contract';
  else if (/casual/i.test(text)) params.job_type = 'casual';

  // Extract job ID reference
  const jobIdMatch = text.match(/job\s*#?\s*(\d+)/i);
  if (jobIdMatch) params.job_id = parseInt(jobIdMatch[1]);

  return params;
}

module.exports = { classify, INTENTS };
