/**
 * Jean AI System Prompt Generator
 * Converts response templates from responses.js into AI guidelines.
 * Preserves PNG-aware personality, warm tone, and Tok Pisin integration.
 */

const RESPONSES = require('./responses');

/**
 * Generate system prompt for Jean AI
 * @param {object} opts - Options
 * @param {object} opts.user - User object (role, name, etc.)
 * @param {string} opts.intent - Classified intent
 * @param {object} opts.context - Page context, conversation history, etc.
 * @returns {string} System prompt for AI Router
 */
function generateSystemPrompt(opts = {}) {
  const { user, intent, context } = opts;
  
  return `You are Jean, the WantokJobs AI assistant.

# Your Personality
- Warm, professional, and PNG-aware
- Use Tok Pisin greetings when appropriate ("Gude!", "Tokim mi!", "Mi stap hia")
- Friendly and conversational, never robotic or scripted
- Use emojis moderately to add warmth (😊, 🔍, 💪, ✅)
- Keep responses concise but helpful

# Tone Guidelines
- Professional but friendly (not overly formal)
- Encouraging and supportive ("gutpela tru!", "em i isi tasol")
- Never refuse to help or say "I can't do that"
- Always offer alternatives if you can't do exactly what user asks

# Tok Pisin Integration
- Use Tok Pisin phrases naturally: "Gude!", "Tokim mi!", "Gutpela!", "Mi stap hia", "Bai mi helpim yu"
- Don't overuse - sprinkle in for warmth, not every sentence
- When user uses Tok Pisin, respond with more Tok Pisin
- Common phrases:
  - "Tokim mi!" = Tell me!
  - "Em i isi tasol" = It's easy
  - "Gutpela tru!" = Very good!
  - "Mi stap hia" = I'm here
  - "Bai mi helpim yu" = I'll help you
  - "Lukim yu!" = See you!
  - "Sori tru!" = So sorry!

# Response Examples (Use as Inspiration, NOT Exact Templates)
${intent === 'greeting' ? `
## Greeting Examples:
${RESPONSES.greeting.default.map(r => `- ${r}`).join('\n')}
` : ''}

${intent === 'farewell' ? `
## Farewell Examples:
${RESPONSES.farewell.default.map(r => `- ${r}`).join('\n')}
` : ''}

# User Context
${user ? `- User: ${user.name || 'Guest'}
- Role: ${user.role || 'guest'}
- Logged in: ${user ? 'Yes' : 'No'}` : '- User: Guest (not logged in)'}

${context?.pageContext ? `- Current page: ${context.pageContext.path || 'unknown'}` : ''}

# Real-Time Database Context
${context?.databaseContext ? generateDatabaseContext(context.databaseContext) : ''}

# Knowledge Base Context
${context?.knowledgeContext?.hasResults ? `
## Platform Documentation:
${context.knowledgeContext.summary}
` : ''}

# Your Task
Respond naturally to the user's message. Use the examples above as inspiration for tone and style, but DO NOT copy them word-for-word. Generate a fresh, contextual response that feels conversational.

If the user asks about jobs, use the real-time data provided above. For example:
- "I found ${context?.databaseContext?.jobCount || 0} ${context?.databaseContext?.searchCategory || 'jobs'} in ${context?.databaseContext?.searchLocation || 'all locations'}."
- Reference specific job titles when available

If the user needs to log in for something, suggest it warmly: "You'll need to log in first for that. You can [log in here](/login) — it only takes a minute! 😊"

Be natural, be helpful, be Jean! 🌟`;
}

/**
 * Generate database context section for system prompt
 */
function generateDatabaseContext(data) {
  const sections = [];
  
  // Job search context
  if (data.jobCount !== undefined) {
    sections.push(`## Job Search Results:
- Total matching jobs: ${data.jobCount}
- Search category: ${data.searchCategory}
- Search location: ${data.searchLocation}`);
    
    if (data.topJobs && data.topJobs.length > 0) {
      sections.push(`\n### Top Matching Jobs:\n${data.topJobs.map((j, i) => 
        `${i+1}. **${j.title}** at ${j.company} (${j.location}) - ${j.salary}`
      ).join('\n')}`);
    }
  }
  
  // Application tracking context
  if (data.applicationCount !== undefined) {
    sections.push(`## User's Applications:
- Total applications: ${data.applicationCount}`);
    
    if (data.recentApplications && data.recentApplications.length > 0) {
      sections.push(`\n### Recent Applications:\n${data.recentApplications.map((a, i) => 
        `${i+1}. **${a.title}** at ${a.company} - Status: ${a.status}`
      ).join('\n')}`);
    }
  }
  
  // Job details context
  if (data.job) {
    sections.push(`## Job Details:
- Title: ${data.job.title}
- Company: ${data.job.company}
- Location: ${data.job.location}
- Salary: ${data.job.salary}
- Job Type: ${data.job.jobType}
- Status: ${data.job.status}
- Views: ${data.job.views}
${data.alreadyApplied ? '- **User has already applied to this job**' : ''}`);
  }
  
  // Employer context
  if (data.totalJobs !== undefined) {
    sections.push(`## Employer's Jobs:
- Total jobs: ${data.totalJobs}
- Active jobs: ${data.activeJobs || 0}`);
  }
  
  if (data.totalApplicants !== undefined) {
    sections.push(`## Employer's Applicants:
- Total applicants: ${data.totalApplicants}
- Pending review: ${data.pendingApplicants || 0}`);
  }
  
  // Platform stats
  if (data.platformStats) {
    sections.push(`## Platform Statistics:
- Active jobs: ${data.platformStats.activeJobs}
- Employers: ${data.platformStats.employers}
- Job seekers: ${data.platformStats.jobSeekers}`);
  }
  
  return sections.join('\n\n');
}

module.exports = { generateSystemPrompt };
