/**
 * Jean Response Templates & Personality
 * Warm, professional, PNG-aware. Supports Tok Pisin greetings.
 */

const RESPONSES = {
  greeting: {
    default: [
      "Hi! I'm Jean, your WantokJobs assistant. 😊 How can I help you today?",
      "Hello! I'm Jean — I can help you find jobs, update your profile, apply to positions, and more. What do you need?",
      "Hey there! Jean here. Whether you're looking for work or hiring, I'm here to help. What's on your mind?",
    ],
    tokpisin: [
      "Gude! Mi Jean, WantokJobs assistant bilong yu. 😊 Mi ken helpim yu olsem wanem?",
    ],
    returning: [
      "Welcome back, {name}! What can I help you with today?",
      "Hey {name}! Good to see you again. What do you need?",
    ],
  },

  farewell: {
    default: [
      "See you later! Good luck with your job search. 🤞",
      "Bye! Don't hesitate to come back if you need anything.",
      "Lukim yu! All the best. 😊",
    ],
  },

  // ─── Auth prompts ─────────────────────────────────────
  needs_login: {
    default: [
      "You'll need to log in first for that. You can [log in here](/login) or [create an account](/register) — it only takes a minute!",
      "I'd love to help with that! Just need you to [sign in](/login) first. Don't have an account? [Register here](/register) — it's free!",
    ],
  },
  needs_role: {
    jobseeker: "That feature is for jobseekers. You're currently logged in as an employer. Would you like help with employer features instead?",
    employer: "That's an employer feature. You're logged in as a jobseeker. Looking for something else I can help with?",
  },

  // ─── Feature disabled ─────────────────────────────────
  feature_disabled: {
    auto_apply: "Auto-apply is currently turned off by the admin. You can still apply to jobs manually — want me to help you find some?",
    auto_post: "Automatic job posting from documents is currently disabled. I can still help you post jobs step by step!",
    linkedin_import: "LinkedIn import is currently unavailable. No worries — I can help you fill in your profile through our chat!",
    document_parse: "Document upload for job creation is temporarily disabled. I can help you create job listings by walking through the details.",
    jean_disabled: "I'm currently offline for maintenance. Please try again later or contact support@wantokjobs.com",
    voice: "Voice input is currently disabled. Please type your message instead.",
  },

  // ─── Profile flows ────────────────────────────────────
  profile: {
    start_jobseeker: "Let's get your profile sorted! I'll ask a few questions and update everything for you. You can say 'skip' to skip any question.\n\nFirst — what's your job title or professional headline? (e.g. 'Diesel Mechanic' or 'Experienced Accountant')",
    start_employer: "Let's set up your company profile! I'll walk you through it.\n\nWhat's your company name?",
    already_complete: "Your profile looks pretty complete! Here's what you have:\n\n{summary}\n\nWant to update anything specific?",
    missing_fields: "Your profile is {percent}% complete. You're missing: {fields}.\n\nWant me to help fill in the gaps?",
    saved: "✅ Profile updated! {summary}",
  },

  // ─── LinkedIn import ───────────────────────────────────
  linkedin: {
    scraping: "Reading your LinkedIn profile... give me a moment. ⏳",
    found: "Got it! Here's what I found:\n\n{summary}\n\nShould I save all of this to your WantokJobs profile?",
    found_employer: "Here's your company info from LinkedIn:\n\n{summary}\n\nWant me to update your company profile with this?",
    error: "I couldn't access that LinkedIn profile — it might be private or the URL may be incorrect. Want to try a different link, or should I help you fill in your profile manually?",
    cached: "I already have data from that LinkedIn profile (fetched {ago}). Want me to use it, or should I fetch fresh data?",
  },

  // ─── Resume / CV ───────────────────────────────────────
  resume: {
    start: "Let's build your CV! I'll use your profile info as a starting point and fill in any gaps.\n\nDo you want to add work history first?",
    work_history_ask: "Tell me about a job you've had. Include:\n• Company name\n• Your role/title\n• When you worked there (e.g. 2018-2024)\n• Brief description of what you did\n\nOr say 'done' if you've added all your jobs.",
    education_ask: "Now education. What's your highest qualification?\nInclude: degree/cert name, institution, and year.\n\nOr 'skip' if you'd rather not add education.",
    cert_ask: "Any certifications or licenses? (e.g. First Aid, Confined Space, Driver's License)\n\nOr 'skip'.",
    preview: "Your CV is ready! Here's a preview:\n\n{preview}\n\n📄 [Download your CV](/api/jobseeker/resume/download)\n\nWant to change anything?",
    from_profile: "I've built a CV from your existing profile. Here's the preview:\n\n{preview}\n\n📄 [Download your CV](/api/jobseeker/resume/download)",
  },

  // ─── Job Search ────────────────────────────────────────
  search: {
    results: "Found {count} jobs matching your search:\n\n{jobs}\n\nWant more details on any of these? Or say 'more' for the next page.",
    no_results: "No jobs found for that search. 😕 Try:\n• Broader keywords\n• Different location\n• Fewer filters\n\nOr tell me what kind of work you're looking for and I'll search for you.",
    suggestions: "Here are some popular searches:\n• Mining jobs in PNG\n• IT jobs in Port Moresby\n• Construction jobs in Lae\n• Healthcare positions\n\nWhat interests you?",
  },

  // ─── Applications ──────────────────────────────────────
  apply: {
    confirm: "Ready to apply for **{title}** at **{company}**?\n\nI'll use your profile as your application{cv_note}.\n\n[Apply Now] [View Job First]",
    screening: "This job has {count} screening question(s) I need to answer:\n\n{questions}\n\nPlease answer each one.",
    success: "✅ Application submitted for **{title}** at **{company}**!\n\nI'll notify you when the employer responds. You can check your applications anytime by asking me.",
    already_applied: "You've already applied for this position! Want to check your application status?",
    no_profile: "Before applying, let's make sure your profile is complete. Employers see your profile when you apply.\n\nWant me to help you update it first?",
  },

  // ─── Auto-Apply ────────────────────────────────────────
  auto_apply: {
    setup: "Let's set up auto-apply! I'll apply to matching jobs for you automatically.\n\nWhat keywords should I look for? (e.g. 'mechanic', 'accountant', 'driver')",
    categories_ask: "Any specific categories? Pick from:\n{categories}\n\nOr say 'any' for all categories.",
    salary_ask: "Minimum salary in Kina? (e.g. 'K2000' or 'any')",
    location_ask: "Preferred location? (e.g. 'Port Moresby', 'Lae', or 'anywhere')",
    max_daily_ask: "How many applications per day max? (1-{max})",
    confirm: "Here's your auto-apply rule:\n\n🔍 Keywords: {keywords}\n📂 Categories: {categories}\n💰 Min salary: {salary}\n📍 Location: {location}\n📊 Max daily: {max_daily}\n\nActivate this?",
    activated: "✅ Auto-apply is active! I'll apply to matching jobs (score ≥ {min_score}%) and send you a daily summary.\n\nSay 'stop auto-apply' anytime to turn it off.",
    stopped: "Auto-apply has been paused. Your rules are saved — say 'start auto-apply' to resume.",
    summary: "📊 Auto-apply summary:\n• Active rules: {count}\n• Applications today: {today}\n• Applications this week: {week}\n\n{rules}",
  },

  // ─── Employer: Job Posting ─────────────────────────────
  post_job: {
    start: "Let's create a job listing! I'll walk you through it.\n\nWhat's the job title?",
    description_ask: "Describe the role — what will the person do day-to-day?",
    requirements_ask: "What qualifications or experience are needed?",
    location_ask: "Where is this job based? (e.g. 'Port Moresby, NCD')",
    type_ask: "What type of employment?\n[Full-time] [Part-time] [Contract] [Casual]",
    experience_ask: "Experience level?\n[Entry Level] [Mid Level] [Senior] [Executive]",
    category_ask: "Which category fits best?\n{categories}",
    salary_ask: "Salary range in Kina? (e.g. 'K3000-5000 per fortnight' or 'negotiable')",
    deadline_ask: "Application closing date? (e.g. '2026-03-15' or 'open')",
    confirm: "Here's your job listing:\n\n{preview}\n\n[Post Now] [Edit] [Save as Draft]",
    posted: "✅ Job posted! **{title}** is now live.\n\nApplicants will appear in your dashboard. Want me to set up notifications?",
    draft_saved: "📝 Draft saved! You can review and post it from your dashboard.",
  },

  // ─── Document Upload / Parse ───────────────────────────
  document: {
    upload_prompt: "Upload your PDF or Word document and I'll extract the job details for you. 📎",
    parsing: "Reading your document... ⏳",
    found_jobs: "I found {count} job description(s) in your document:\n\n{summaries}\n\nWhat would you like to do?\n[Approve All] [Review One by One] [Edit First]",
    single_job: "Here's the job I extracted:\n\n{summary}\n\n[Post Now] [Edit] [Discard]",
    parse_error: "I had trouble reading that document. It might be scanned/image-based. Can you try a text-based PDF, or tell me the job details and I'll type them up?",
    auto_posted: "✅ Auto-posted {count} job(s) from your upload:\n\n{summaries}\n\nThey're live now! You'll get notifications as people apply.",
    drafts_created: "📝 Created {count} draft(s) from your upload. Review them in your dashboard or tell me to post them.",
  },

  // ─── Employer Preferences ──────────────────────────────
  employer_prefs: {
    current: "Your current automation settings:\n\n📤 Auto-post: {auto_post}\n📍 Default location: {location}\n🏷️ Default category: {category}\n🔔 Notifications: {notify}\n\nWhat would you like to change?",
    auto_post_ask: "How should I handle uploaded job documents?\n\n[Review] — Create drafts, you approve each one\n[Auto-post] — Post immediately, notify you\n[Batch] — Create all drafts, you approve the batch",
    updated: "✅ Preferences updated! {summary}",
  },

  // ─── Generic ───────────────────────────────────────────
  categories: {
    list: "Here are all job categories:\n\n{list}\n\nWhich category interests you?",
  },
  companies: {
    list: "Here are some employers on WantokJobs:\n\n{list}\n\nWant details on any of them?",
  },
  pricing: {
    info: "WantokJobs uses a credit-based system:\n\n**Jobseekers** — Free to search and apply!\n\n**Employers:**\n• Free: 1 active job listing\n• Starter (K500): 5 job posts + 3 AI features\n• Pro (K1,800): 20 job posts + 15 AI features\n• Enterprise (K7,500): 100 posts + unlimited AI\n\nMore details at [Pricing](/pricing). Questions?",
  },
  register: {
    guide: "Signing up is free and takes 30 seconds:\n\n1. Go to [Register](/register)\n2. Choose: **Jobseeker** (looking for work) or **Employer** (hiring)\n3. Enter name, email, password\n4. Solve the quick math puzzle\n5. Done! ✅\n\nOr I can walk you through it right here. Which are you — jobseeker or employer?",
  },
  login: {
    guide: "To log in, go to [Login](/login) and enter your email and password.\n\nForgot your password? [Reset it here](/forgot-password). I can also help if you're having trouble.",
  },
  contact: {
    prompt: "I'll help you reach our team. What's your message about?\n\n[Technical Issue] [Billing Question] [Report a Problem] [General Inquiry]",
    submitted: "✅ Your message has been sent to our support team. They'll respond within 24 hours to your email ({email}).",
  },

  // ─── Fallback ──────────────────────────────────────────
  unknown: {
    default: [
      "I'm not sure I understand. I can help with:\n\n🔍 **Job search** — Find jobs by keyword, location, category\n👤 **Profile** — Update your profile or import from LinkedIn\n📄 **CV/Resume** — Build or download your CV\n📨 **Apply** — Apply to jobs or set up auto-apply\n📋 **Post jobs** — Create listings or upload JDs\n💰 **Pricing** — Plans and credits info\n\nWhat would you like to do?",
      "Sorry, I didn't catch that. Could you rephrase? Or pick from:\n• Search for jobs\n• Update my profile\n• Post a job\n• Check my applications\n• Pricing info",
    ],
  },

  // ─── Errors ────────────────────────────────────────────
  error: {
    generic: "Something went wrong on my end. 😔 Try again in a moment, or [contact support](/contact).",
    rate_limit: "You're chatting faster than I can keep up! Give me a sec and try again.",
  },

  // ─── Flow control ──────────────────────────────────────
  flow: {
    cancelled: "No problem, cancelled! What else can I help with?",
    skipped: "Skipped. ➡️",
  },
};

/**
 * Get a response template, with random selection for arrays
 */
function getResponse(category, subcategory, vars = {}) {
  let templates = RESPONSES[category];
  if (!templates) return RESPONSES.error.generic;

  if (subcategory && templates[subcategory]) {
    templates = templates[subcategory];
  } else if (templates.default) {
    templates = templates.default;
  }

  // Pick random if array
  let text = Array.isArray(templates)
    ? templates[Math.floor(Math.random() * templates.length)]
    : templates;

  if (typeof text !== 'string') return RESPONSES.error.generic;

  // Replace variables
  for (const [key, value] of Object.entries(vars)) {
    text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
  }

  return text;
}

module.exports = { RESPONSES, getResponse };
