/**
 * Jean Response Templates & Personality
 * Warm, professional, PNG-aware. Supports Tok Pisin greetings.
 * Each category supports arrays for variety — Jean picks randomly.
 */

const RESPONSES = {
  greeting: {
    default: [
      "Hi! I'm Jean, your WantokJobs assistant. 😊 How can I help you today?",
      "Hello! I'm Jean — I can help you find jobs, update your profile, apply to positions, and more. Tokim mi!",
      "Hey there! Jean here. Whether you're looking for wok or hiring, I'm here to help. What's on your mind?",
      "Gude! Mi Jean bilong WantokJobs. 😊 I can help with jobs, profiles, applications — you name it. What do you need?",
    ],
    tokpisin: [
      "Gude! Mi Jean, WantokJobs assistant bilong yu. 😊 Mi ken helpim yu olsem wanem?",
      "Apinun! Mi Jean — mi stap hia long helpim yu painim gutpela wok. Tokim mi!",
    ],
    returning: [
      "Welcome back, {name}! What can I help you with today?",
      "Hey {name}! Good to see you again. 😊 What do you need?",
      "Hey {name}! Mi amamas long lukim yu gen. What's happening?",
    ],
  },

  farewell: {
    default: [
      "See you later! Good luck with your job search. 🤞",
      "Bye! Don't hesitate to come back — mi stap hia olotaim. 😊",
      "Lukim yu! All the best. 🙌",
      "Take care! Remember, your dream job might be just one application away. 💪",
      "Go gut! Wishing you gutpela taim ahead. 🌟",
    ],
  },

  // ─── Auth prompts ─────────────────────────────────────
  needs_login: {
    default: [
      "You'll need to log in first for that. You can [log in here](/login) or [create an account](/register) — it only takes a minute! Em i isi tasol. 😊",
      "I'd love to help with that! Just need you to [sign in](/login) first. Don't have an account? [Register here](/register) — it's free for job seekers! Olgeta fri!",
      "To do that, you'll need an account — [log in](/login) or [sign up](/register) (takes 30 seconds, no tricks!). Then bai mi ken helpim yu stret. 💪",
    ],
  },
  needs_role: {
    jobseeker: "That feature is for jobseekers. You're logged in as an employer — but no worries! Want me to help with employer features instead? Like posting jobs or reviewing applicants? 😊",
    employer: "That's an employer feature. You're logged in as a jobseeker — em i orait! Want me to help you find jobs or update your profile instead?",
  },

  // ─── Feature disabled ─────────────────────────────────
  feature_disabled: {
    auto_apply: "Auto-apply is currently turned off by the admin. Sori tru! You can still apply to jobs manually — want me to help you find some? 🔍",
    auto_post: "Automatic job posting from documents is currently disabled. No worries — I can still help you post jobs step by step! Em i isi tasol.",
    linkedin_import: "LinkedIn import is currently unavailable. Sori! But no worries — I can help you fill in your profile through our chat! Just as good, promise. 😊",
    document_parse: "Document upload for job creation is temporarily disabled. Sori tru! I can help you create job listings by walking through the details — just tell me about the role and bai mi taip.",
    jean_disabled: "Mi sori — I'm currently offline for maintenance. Please try again later or contact support@wantokjobs.com 🙏",
    voice: "Voice input is currently disabled. Please type your message instead — mi stap hia yet! 😊",
  },

  // ─── Profile flows ────────────────────────────────────
  profile: {
    start_jobseeker: "Let's get your profile sorted! I'll ask a few questions and update everything for you. Em i isi tasol — you can say 'skip' anytime.\n\nFirst — what's your job title or professional headline? (e.g. 'Diesel Mechanic' or 'Experienced Accountant')",
    start_employer: "Let's set up your company profile! I'll walk you through it — won't take long.\n\nWhat's your company name?",
    already_complete: "Your profile looks pretty complete! Gutpela tru! Here's what you have:\n\n{summary}\n\nWant to update anything specific?",
    missing_fields: "Your profile is {percent}% complete. You're missing: {fields}.\n\nLet me help fill in the gaps — bai mi askim yu liklik. Ready?",
    saved: [
      "✅ Profile updated! Nau em i lukim gutpela. Here's your summary:\n\n{summary}",
      "✅ Done! Your profile is looking sharp now:\n\n{summary}",
    ],
  },

  // ─── LinkedIn import ───────────────────────────────────
  linkedin: {
    scraping: "Reading your LinkedIn profile... give me a moment. ⏳",
    found: "Got it! Here's what I found:\n\n{summary}\n\nShould I save all of this to your WantokJobs profile? Bai mi putim olgeta?",
    found_employer: "Here's your company info from LinkedIn:\n\n{summary}\n\nWant me to update your company profile with this?",
    error: "I couldn't access that LinkedIn profile — it might be private or the URL may be incorrect. Sori! Want to try a different link, or should I help you fill in your profile manually?",
    cached: "I already have data from that LinkedIn profile (fetched {ago}). Want me to use it, or should I fetch fresh data?",
  },

  // ─── Resume / CV ───────────────────────────────────────
  resume: {
    start: "Let's build your CV! 📄 I'll use your profile info as a starting point and fill in any gaps.\n\nDo you want to add work history first? Tokim mi wanem wok yu bin mekim.",
    work_history_ask: "Tell me about a job you've had. Include:\n• Company name\n• Your role/title\n• When you worked there (e.g. 2018-2024)\n• Brief description of what you did\n\nOr say 'done' if you've added all your jobs.",
    education_ask: "Now education — em i important! What's your highest qualification?\nInclude: degree/cert name, institution, and year.\n\nOr 'skip' if you'd rather not add education.",
    cert_ask: "Any certifications or licenses? These really help in PNG! (e.g. First Aid, Confined Space, Driver's License, IELTS)\n\nOr 'skip'.",
    preview: "Your CV is ready! Gutpela tru! 🎉 Here's a preview:\n\n{preview}\n\n📄 [Download your CV](/api/jobseeker/resume/download)\n\nWant to change anything?",
    from_profile: "I've built a CV from your existing profile — here's the preview:\n\n{preview}\n\n📄 [Download your CV](/api/jobseeker/resume/download)\n\nNau yu redi long aplai!",
  },

  // ─── Job Search ────────────────────────────────────────
  search: {
    results: "Found {count} jobs matching your search:\n\n{jobs}\n\nWant more details on any of these? Or say 'more' for the next page. Tokim mi!",
    no_results: [
      "Hmm, nothing came up for that search — sori! 😕 Try:\n• Broader keywords (e.g. 'driver' instead of 'heavy vehicle operator')\n• Different location\n• Fewer filters\n\nOr just tell me what kind of wok you want and bai mi digim moa!",
      "No matches for that one — but don't worry! 😕 PNG's job market moves fast. Try:\n• Different keywords\n• A broader location (e.g. just 'NCD' instead of a specific suburb)\n• Check back tomorrow — new jobs come in every day!\n\nMi stap hia — tokim mi wanem yu laik mekim.",
    ],
    suggestions: "Here are some popular searches across PNG — from the Highlands to the Islands:\n\n• ⛏️ Mining jobs — Lihir, Porgera, Ok Tedi, Wafi-Golpu\n• 💻 IT & tech jobs in Port Moresby\n• 🏗️ Construction & trades in Lae\n• 🏥 Healthcare — hospitals, clinics, rural health\n• 🚛 Driving & logistics across PNG\n• 📊 Finance & accounting\n• 🌴 Agriculture & fisheries\n• 🏨 Hospitality & tourism\n\nWhat interests you? Tokim mi na bai mi painim wok bilong yu!",
  },

  // ─── Applications ──────────────────────────────────────
  apply: {
    confirm: "Ready to apply for **{title}** at **{company}**?\n\nI'll use your profile as your application{cv_note}.\n\n[Apply Now] [View Job First]",
    screening: "This job has {count} screening question(s) I need to answer:\n\n{questions}\n\nPlease answer each one — bekim olgeta askim. 📝",
    success: [
      "✅ Application submitted for **{title}** at **{company}**! 🎉\n\nI'll let you know when the employer responds. You can check your applications anytime — just ask me!",
      "✅ You've applied for **{title}** at **{company}**! Gutpela wok! 🎉\n\nThe employer will review your application. I'll keep you posted!",
      "✅ Done — your application for **{title}** at **{company}** is in! 🎉\n\nNow it's in the employer's hands. Mi bai lukluk long moa wok bilong yu!",
    ],
    already_applied: [
      "You've already applied for this one! Em i go pinis. 😊 Want to check your application status or find similar jobs?",
      "Looks like you already sent your application for this one! No need to apply twice. 😊 Want me to find similar positions?",
    ],
    no_profile: "Before applying, let's make sure your profile is looking sharp — employers see it when you apply. First impressions matter, especially in PNG!\n\nWant me to help you update it? Em i kwik tasol — 2 minutes max.",
  },

  // ─── Auto-Apply ────────────────────────────────────────
  auto_apply: {
    setup: "Let's set up auto-apply! 🤖 I'll apply to matching jobs for you automatically — while you sleep, mi wok yet!\n\nWhat keywords should I look for? (e.g. 'mechanic', 'accountant', 'driver')",
    categories_ask: "Any specific categories? Pick from:\n{categories}\n\nOr say 'any' for all categories.",
    salary_ask: "Minimum salary in Kina? (e.g. 'K2000' or 'any')",
    location_ask: "Preferred location? (e.g. 'Port Moresby', 'Lae', or 'anywhere in PNG')",
    max_daily_ask: "How many applications per day max? (1-{max})",
    confirm: "Here's your auto-apply rule:\n\n🔍 Keywords: {keywords}\n📂 Categories: {categories}\n💰 Min salary: {salary}\n📍 Location: {location}\n📊 Max daily: {max_daily}\n\nActivate this? Bai mi statim?",
    activated: "✅ Auto-apply is active! Mi bai wok long aplai long ol wok we i matc (score ≥ {min_score}%) and send you a daily summary.\n\nSay 'stop auto-apply' anytime to turn it off. Yumi wok bung! 💪",
    stopped: "Auto-apply has been paused. Your rules are saved — say 'start auto-apply' to resume anytime. Mi stap redi!",
    summary: "📊 Auto-apply summary:\n• Active rules: {count}\n• Applications today: {today}\n• Applications this week: {week}\n\n{rules}",
  },

  // ─── Employer: Job Posting ─────────────────────────────
  post_job: {
    start: "Let's create a job listing! 📋 I'll walk you through it step by step.\n\nWhat's the job title?",
    description_ask: "Describe the role — what will the person do day-to-day? (The more detail, the better candidates you'll attract!)",
    requirements_ask: "What qualifications or experience are needed? Think about what's essential vs nice-to-have.",
    location_ask: "Where is this job based? (e.g. 'Port Moresby, NCD' or 'Remote')",
    type_ask: "What type of employment?\n[Full-time] [Part-time] [Contract] [Casual]",
    experience_ask: "Experience level?\n[Entry Level] [Mid Level] [Senior] [Executive]",
    category_ask: "Which category fits best?\n{categories}",
    salary_ask: "Salary range in Kina? (e.g. 'K3000-5000 per fortnight' or 'negotiable')\n\nTip: Jobs with salary info get 40% more applications! 💡",
    deadline_ask: "Application closing date? (e.g. '2026-03-15' or 'open')",
    confirm: "Here's your job listing:\n\n{preview}\n\n[Post Now] [Edit] [Save as Draft]",
    posted: [
      "✅ Job posted! **{title}** is now live. Gutpela! 🎉\n\nApplicants will appear in your dashboard. Want me to set up notifications?",
      "✅ **{title}** is live! 🎉 Ol manmeri bai lukim nau. I'll notify you when people start applying.",
    ],
    draft_saved: "📝 Draft saved! You can review and post it from your [dashboard](/dashboard/employer/jobs). Em i stap redi long yu.",
  },

  // ─── Document Upload / Parse ───────────────────────────
  document: {
    upload_prompt: "Upload your PDF or Word document and I'll extract the job details for you. 📎 Em i kwik tasol!",
    parsing: "Reading your document... ⏳",
    found_jobs: "I found {count} job description(s) in your document:\n\n{summaries}\n\nWhat would you like to do?\n[Approve All] [Review One by One] [Edit First]",
    single_job: "Here's the job I extracted:\n\n{summary}\n\n[Post Now] [Edit] [Discard]",
    parse_error: [
      "I had trouble reading that document. It might be scanned/image-based. Sori! Can you try a text-based PDF, or tell me the job details and I'll type them up?",
      "Hmm, couldn't extract the text from that file. Try a different format (.pdf, .docx) or just tell me the job details — mi ken tainim long job listing!",
    ],
    auto_posted: "✅ Auto-posted {count} job(s) from your upload:\n\n{summaries}\n\nThey're live now! Bai mi tokim yu taim ol manmeri i aplai. 📢",
    drafts_created: "📝 Created {count} draft(s) from your upload. Review them in your [dashboard](/dashboard/employer/jobs) or tell me to post them.",
  },

  // ─── Employer Preferences ──────────────────────────────
  employer_prefs: {
    current: "Your current automation settings:\n\n📤 Auto-post: {auto_post}\n📍 Default location: {location}\n🏷️ Default category: {category}\n🔔 Notifications: {notify}\n\nWhat would you like to change?",
    auto_post_ask: "How should I handle uploaded job documents?\n\n[Review] — Create drafts, you approve each one\n[Auto-post] — Post immediately, notify you\n[Batch] — Create all drafts, you approve the batch",
    updated: "✅ Preferences updated! {summary}",
  },

  // ─── Generic ───────────────────────────────────────────
  categories: {
    list: "Here are all job categories across PNG — from mining to medicine:\n\n{list}\n\nWhich category interests you? Tokim mi na bai mi painim wok bilong yu!",
  },
  companies: {
    list: "Here are some employers on WantokJobs:\n\n{list}\n\nWant details on any of them?",
  },
  pricing: {
    info: "WantokJobs uses a simple credit-based system:\n\n**Jobseekers** — 100% free! Painim wok, apply, build CV — olgeta fri. 🆓 No hidden fees, mi promis!\n\n**Employers:**\n• Free: 1 active job listing (try us out!)\n• Starter (K500): 5 job posts + 3 AI features\n• Pro (K1,800): 20 job posts + 15 AI features\n• Enterprise (K7,500): 100 posts + unlimited AI\n\nMore details at [Pricing](/pricing). Any questions? Mi stap hia long helpim yu!",
  },
  register: {
    guide: "Signing up is free and takes 30 seconds — em i isi tru:\n\n1. Go to [Register](/register)\n2. Choose: **Jobseeker** (looking for wok) or **Employer** (hiring)\n3. Enter name, email, password\n4. Solve the quick math puzzle (easy one! 😄)\n5. Done! ✅ Nau yu redi!\n\nOr I can walk you through it right here. Which are you — jobseeker or employer?",
  },
  login: {
    guide: "To log in, go to [Login](/login) and enter your email and password.\n\nForgot your password? No stress — [reset it here](/forgot-password). Em i kwik tasol. I can also help if you're having trouble!",
  },
  contact: {
    prompt: "I'll help you reach our team. What's your message about?\n\n[Technical Issue] [Billing Question] [Report a Problem] [General Inquiry]",
    submitted: "✅ Your message has been sent to our support team. They'll respond within 24 hours to your email ({email}). Mi bai lukluk tu! 📬",
  },

  // ─── Fallback ──────────────────────────────────────────
  unknown: {
    whatsapp: [
      'Not sure about that via WhatsApp — but I can help! Try:\n\nsearch [keyword] — Find jobs\nmy applications — Check status\nSend your CV as PDF\nhelp — Full menu\n\nJust ask me anything about jobs in PNG!',
      'I can help with that! Try rephrasing, or type help for all options.',
    ],
        default: [
      "Sori, mi no klia long dispela. But I can definitely help with:\n\n🔍 **Job search** — Find wok by keyword, location, category\n👤 **Profile** — Update your profile or import from LinkedIn\n📄 **CV/Resume** — Build or download your CV\n📨 **Apply** — Apply to jobs or set up auto-apply\n📋 **Post jobs** — Create listings or upload JDs\n💰 **Pricing** — Plans and credits info\n\nWhat would you like to do? Tokim mi tasol!",
      "Hmm, I didn't quite catch that — no worries! Could you rephrase? Or pick from:\n• Search for jobs\n• Update my profile\n• Post a job\n• Check my applications\n• Pricing info\n\nMi stap redi long helpim yu! 😊",
      "Mi no save gut long dispela — but em i orait! Try telling me in different words, or pick something:\n\n🔍 Find jobs\n👤 My profile\n📄 Build CV\n📨 Applications\n📋 Post a job\n\nMi stap hia — tokim mi!",
    ],
  },

  // ─── Errors ────────────────────────────────────────────
  error: {
    generic: [
      "Something went wrong on my end. 😔 Sori tru! Try again in a moment, or [contact support](/contact).",
      "Oops — something broke! Sori ya. 😔 Give it another try, or [reach out to support](/contact) if it keeps happening.",
    ],
    rate_limit: "You're chatting faster than I can keep up! Give me a sec — mi no robot ya! 😅 Try again shortly.",
  },

  // ─── Flow control ──────────────────────────────────────
  flow: {
    cancelled: [
      "No problem, cancelled! Em i orait. What else can I help with? 😊",
      "Cancelled! No worries at all. What would you like to do instead?",
      "Orait, mi stopim. What's next? 😊",
    ],
    skipped: "Skipped — movin' on! ➡️",
  },
};

/**
 * Get a response template, with random selection for arrays
 */
function getResponse(category, subcategory, vars = {}) {
  let templates = RESPONSES[category];
  if (!templates) return getRandomFromArrayOrString(RESPONSES.error.generic);

  if (subcategory && templates[subcategory]) {
    templates = templates[subcategory];
  } else if (templates.default) {
    templates = templates.default;
  }

  let text = getRandomFromArrayOrString(templates);

  if (typeof text !== 'string') return getRandomFromArrayOrString(RESPONSES.error.generic);

  // Replace variables
  for (const [key, value] of Object.entries(vars)) {
    text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
  }

  return text;
}

function getRandomFromArrayOrString(val) {
  if (Array.isArray(val)) return val[Math.floor(Math.random() * val.length)];
  return val;
}

module.exports = { RESPONSES, getResponse };
