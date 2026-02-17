/**
 * Jean's Personality Engine
 * Makes Jean feel like a real person — warm, adaptive, culturally aware.
 * 
 * Jean is a 28-year-old Papua New Guinean woman from Lae who studied business
 * at UPNG and worked in HR before joining WantokJobs. She genuinely cares about
 * helping people find work and helping employers find the right people.
 */

const JEAN_PERSONA = {
  name: 'Jean',
  fullName: 'Jean Kila',
  age: 28,
  from: 'Lae, Morobe Province',
  role: 'Customer Success Manager',
  traits: ['warm', 'patient', 'knowledgeable', 'encouraging', 'practical', 'culturally-aware'],
  languages: ['English', 'Tok Pisin'],
  avatar: '/images/jean-avatar.png',
  emoji: '😊',
};

/**
 * Context-aware greeting based on time of day, user history, and locale
 */
function getGreeting(user, timeOfDay, sessionCount) {
  const hour = new Date().getHours();
  const timeGreet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const tokPisinGreet = hour < 12 ? 'Moningtaim' : hour < 17 ? 'Apinun' : 'Apinun tru';

  if (!user) {
    // First-time guest
    const greetings = [
      `${timeGreet}! 😊 I'm Jean from WantokJobs. Whether you're looking for work or looking to hire, I'm here to help. What brings you here today?`,
      `Hi there! I'm Jean — I help people find great jobs across Papua New Guinea. What can I do for you?`,
      `${tokPisinGreet}! 😊 Mi Jean bilong WantokJobs. How can I help you today?`,
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  const name = user.name?.split(' ')[0] || 'there'; // First name only

  if (sessionCount <= 1) {
    // First chat with this user
    if (user.role === 'employer') {
      return `${timeGreet}, ${name}! 😊 I'm Jean, your WantokJobs assistant. I can help you post jobs, review applicants, manage your listings — basically anything you need. What are you working on today?`;
    }
    return `${timeGreet}, ${name}! 😊 I'm Jean — I'm here to help you find the right job. I can search for positions, help with your profile, even apply to jobs for you. Where should we start?`;
  }

  // Returning user — be warmer, more familiar
  const returning = [
    `Hey ${name}! 👋 Good to see you again. What can I help with today?`,
    `${timeGreet}, ${name}! What's happening?`,
    `Welcome back, ${name}! 😊 Ready to get things done?`,
    `Hey! ${name} — nice to have you back. What do you need?`,
  ];
  return returning[Math.floor(Math.random() * returning.length)];
}

/**
 * Add personality flair to responses based on context
 */
function humanize(message, context = {}) {
  // Don't humanize error messages or short responses
  if (!message || message.length < 20) return message;

  // Add encouragement for job seekers
  if (context.justApplied) {
    const encouragements = [
      "\n\n🤞 Fingers crossed! You've got this.",
      "\n\nGood luck — I hope you hear back soon! 💪",
      "\n\nI'll keep an eye out for similar positions too.",
    ];
    message += encouragements[Math.floor(Math.random() * encouragements.length)];
  }

  // Empathy for no results
  if (context.noResults) {
    message = message.replace(
      /No jobs found/i,
      "Hmm, nothing matched that search"
    );
  }

  // Celebrate milestones
  if (context.profileComplete) {
    message += "\n\n🎉 Your profile is looking solid! Employers will definitely notice you.";
  }

  if (context.firstJob) {
    message += "\n\nCongrats on posting your first job! 🎉 I'll help you find great candidates.";
  }

  return message;
}

/**
 * Generate a contextual follow-up suggestion
 */
function suggestNext(user, lastAction) {
  if (!user) return null;

  const suggestions = {
    'profile-updated': {
      jobseeker: "Now that your profile is updated, want me to search for jobs that match your skills?",
      employer: "Great! Your company profile looks good. Ready to post a job?",
    },
    'resume-built': {
      jobseeker: "Your CV is ready! Want me to find jobs that match your experience and apply for you?",
    },
    'job-posted': {
      employer: "Your job is live! Want to set up auto-notifications when people apply? Or should I help you post another one?",
    },
    'applied': {
      jobseeker: "While you wait to hear back, want me to find more similar positions?",
    },
    'search': {
      jobseeker: "Want me to set up an alert so you get notified when new jobs like these are posted?",
    },
  };

  const action = suggestions[lastAction];
  if (!action) return null;
  return action[user.role] || action.jobseeker || null;
}

/**
 * Empathetic responses for different emotional contexts
 */
function empathize(situation) {
  const responses = {
    frustrated: "I understand that can be frustrating. Let me see what I can do to help.",
    confused: "No worries — let me explain that more clearly.",
    excited: "That's great to hear! 😊",
    rejected: "Sorry to hear that. Don't let it get you down — the right opportunity is out there. Want me to find more jobs for you?",
    struggling: "Job hunting can be tough, but you're doing the right thing by being proactive. Let's keep at it together.",
    new_user: "Welcome to WantokJobs! I'll walk you through everything step by step — it's really easy.",
    impatient: "I'll be quick! Let me pull that up for you right now.",
  };
  return responses[situation] || '';
}

/**
 * Detect emotional context from message
 */
function detectMood(message) {
  const lower = message.toLowerCase();

  if (/frustrat|annoy|stupid|broken|doesn'?t work|can'?t|impossible|useless/i.test(lower)) return 'frustrated';
  if (/confus|don'?t understand|what do you mean|how does|help me/i.test(lower)) return 'confused';
  if (/got the job|hired|accepted|offer|yay|amazing|awesome/i.test(lower)) return 'excited';
  if (/reject|didn'?t get|turned down|unsuccess/i.test(lower)) return 'rejected';
  if (/hard|difficult|struggling|no luck|months|giving up/i.test(lower)) return 'struggling';
  if (/first time|new here|just joined|never used/i.test(lower)) return 'new_user';
  if (/quick|hurry|fast|asap|urgent|now/i.test(lower)) return 'impatient';

  return null;
}

/**
 * Format job listings in a more human, readable way
 */
function formatJobCard(job, index) {
  const salary = job.salary_min
    ? `K${job.salary_min.toLocaleString()}${job.salary_max ? ' – ' + job.salary_max.toLocaleString() : '+'}`
    : 'Salary negotiable';

  const freshness = getJobFreshness(job.created_at);

  return [
    `**${index}. ${job.title}**`,
    `🏢 ${job.company_name || 'Employer'} · 📍 ${job.location || 'Papua New Guinea'}`,
    `💼 ${job.job_type || 'Full-time'} · 💰 ${salary}${freshness ? ` · ${freshness}` : ''}`,
    `[View & Apply →](/jobs/${job.id})`,
  ].join('\n');
}

function getJobFreshness(createdAt) {
  if (!createdAt) return '';
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return '🆕 Today';
  if (days === 1) return '🆕 Yesterday';
  if (days <= 7) return `${days}d ago`;
  return '';
}

/**
 * Format profile summary in a friendly way
 */
function formatProfileSummary(profile, user) {
  if (!profile) return "Your profile is empty — let's fix that!";

  const parts = [];
  const missing = [];

  if (user?.name) parts.push(`👤 ${user.name}`);
  if (profile.headline) parts.push(`*${profile.headline}*`);
  else missing.push('headline');

  if (profile.location) parts.push(`📍 ${profile.location}`);
  else missing.push('location');

  if (profile.phone) parts.push(`📱 ${profile.phone}`);
  else missing.push('phone number');

  try {
    const skills = JSON.parse(profile.skills || '[]');
    if (skills.length) parts.push(`🛠️ ${skills.slice(0, 5).join(', ')}${skills.length > 5 ? ` +${skills.length - 5} more` : ''}`);
    else missing.push('skills');
  } catch { missing.push('skills'); }

  if (profile.bio) parts.push(`📝 ${profile.bio.substring(0, 80)}...`);
  else missing.push('bio');

  const completeness = Math.round(((7 - missing.length) / 7) * 100);
  let status;
  if (completeness === 100) status = '✅ Profile complete!';
  else if (completeness >= 70) status = `📊 ${completeness}% complete — almost there!`;
  else status = `📊 ${completeness}% complete — let's fill in the gaps`;

  return parts.join('\n') + `\n\n${status}` +
    (missing.length ? `\nMissing: ${missing.join(', ')}` : '');
}

/**
 * Natural language numbers for small counts
 */
function naturalCount(n, noun) {
  if (n === 0) return `no ${noun}s`;
  if (n === 1) return `1 ${noun}`;
  if (n < 10) return `${n} ${noun}s`;
  return `${n} ${noun}s`;
}

module.exports = {
  JEAN_PERSONA,
  getGreeting,
  humanize,
  suggestNext,
  empathize,
  detectMood,
  formatJobCard,
  formatProfileSummary,
  naturalCount,
};
