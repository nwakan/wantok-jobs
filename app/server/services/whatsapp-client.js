/**
 * WhatsApp Client Service for Jean AI
 * Uses whatsapp-web.js to connect a WhatsApp number as Jean's interface.
 * 
 * Run standalone: node server/services/whatsapp-client.js
 * Or integrate into the main Express app.
 * 
 * First run shows a QR code — scan with WhatsApp on the Jean phone number.
 * Subsequent runs use saved session (LocalAuth).
 */
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');
const db = require('../database');

// Import Jean handler
let jean;
try {
  jean = require('../utils/jean/index');
} catch(e) {
  console.error('Failed to load Jean:', e.message);
  process.exit(1);
}

const SESSION_DIR = path.join(__dirname, '../../.wwebjs_auth');

// Ensure session directory exists
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

// Ensure whatsapp_sessions table exists
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS whatsapp_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number TEXT NOT NULL UNIQUE,
      user_id INTEGER,
      session_token TEXT,
      flow_state TEXT,
      last_search_results TEXT,
      otp TEXT,
      otp_expires TEXT,
      last_message_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  // Add columns if they don't exist
  try { db.exec("ALTER TABLE whatsapp_sessions ADD COLUMN last_search_results TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE whatsapp_sessions ADD COLUMN otp TEXT"); } catch(e) {}
  try { db.exec("ALTER TABLE whatsapp_sessions ADD COLUMN otp_expires TEXT"); } catch(e) {}
} catch(e) {}

const crypto = require('crypto');

// ─── Session helpers ────────────────────────────────────────────

function getOrCreateSession(phoneNumber) {
  let session = db.prepare('SELECT * FROM whatsapp_sessions WHERE phone_number = ?').get(phoneNumber);
  if (!session) {
    const token = crypto.randomBytes(16).toString('hex');
    db.prepare('INSERT INTO whatsapp_sessions (phone_number, session_token) VALUES (?, ?)').run(phoneNumber, token);
    session = db.prepare('SELECT * FROM whatsapp_sessions WHERE phone_number = ?').get(phoneNumber);
  } else {
    db.prepare("UPDATE whatsapp_sessions SET last_message_at = datetime('now') WHERE id = ?").run(session.id);
  }
  return session;
}

function findUserByPhone(phoneNumber) {
  const normalized = phoneNumber.replace(/^\+/, '').replace(/\s/g, '');
  return db.prepare(
    "SELECT * FROM users WHERE REPLACE(REPLACE(phone, '+', ''), ' ', '') = ? OR REPLACE(REPLACE(phone, '+', ''), ' ', '') LIKE ? LIMIT 1"
  ).get(normalized, `%${normalized.slice(-8)}`);
}

function findUserByEmail(email) {
  return db.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1").get(email.trim());
}

// ─── Message formatting ─────────────────────────────────────────

function formatForWhatsApp(text) {
  if (!text) return '';
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<strong>(.*?)<\/strong>/gi, '*$1*')
    .replace(/<em>(.*?)<\/em>/gi, '_$1_')
    .replace(/<a\s+href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}


// ─── Send message helper (avoids quoted/echo reply) ────────────────
// IMPORTANT: Always use sendMsg() instead of msg.reply()
// msg.reply() creates a quoted message that echoes the user's text
async function sendMsg(from, text) {
  const chatId = from.includes('@') ? from : from + '@c.us';
  await client.sendMessage(chatId, text);
}

// ─── Account linking flow ───────────────────────────────────────

async function handleAccountLinking(msg, session, text) {
  const flowState = session.flow_state ? JSON.parse(session.flow_state) : null;
  
  // Check if in OTP verification
  if (flowState?.step === 'awaiting_otp') {
    if (text.trim() === session.otp && new Date(session.otp_expires) > new Date()) {
      // OTP correct — link account
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(flowState.pending_user_id);
      if (user) {
        db.prepare('UPDATE whatsapp_sessions SET user_id = ?, flow_state = NULL, otp = NULL, otp_expires = NULL WHERE id = ?')
          .run(user.id, session.id);
        // Update user's phone number
        db.prepare("UPDATE users SET phone = ? WHERE id = ?").run(session.phone_number, user.id);
        await sendMsg(msg.from, `✅ *Account linked!* You're now connected as *${user.name.split(' ')[0]}*.\n\nI can help you search jobs, apply, track applications, and more. Type *help* for a list of commands.`);
        return true;
      }
    } else if (session.otp_expires && new Date(session.otp_expires) <= new Date()) {
      db.prepare("UPDATE whatsapp_sessions SET flow_state = NULL, otp = NULL, otp_expires = NULL WHERE id = ?").run(session.id);
      await sendMsg(msg.from, '⏰ That code has expired. Send your email again to get a new one.');
      return true;
    } else {
      await sendMsg(msg.from, '❌ Wrong code. Please try again or send your email to get a new code.');
      return true;
    }
  }
  
  // Check if text looks like an email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(text.trim())) {
    const user = findUserByEmail(text.trim());
    if (user) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min
      db.prepare("UPDATE whatsapp_sessions SET otp = ?, otp_expires = ?, flow_state = ? WHERE id = ?")
        .run(otp, expires, JSON.stringify({ step: 'awaiting_otp', pending_user_id: user.id }), session.id);
      await sendMsg(msg.from, `📧 Found your account, *${user.name.split(' ')[0]}*!\n\nYour verification code is: *${otp}*\n\nReply with this code to link your account. Expires in 10 minutes.`);
      return true;
    } else {
      await sendMsg(msg.from, `❌ No account found for that email. Make sure you're using the email you registered with on WantokJobs.\n\nDon't have an account? Register at wantokjobs.com/register`);
      return true;
    }
  }
  
  return false; // Not an account linking message
}

// ─── Job search ─────────────────────────────────────────────────

async function handleJobSearch(msg, session, text) {
  const searchPatterns = [
    /^(?:search|find|look for|painim|painim wok|show me)\s+(.+)/i,
    /^(?:jobs?\s+(?:in|for|about))\s+(.+)/i,
    /^(?:wok\s+(?:long|bilong))\s+(.+)/i,
  ];
  
  let query = null;
  for (const pattern of searchPatterns) {
    const match = text.match(pattern);
    if (match) { query = match[1].trim(); break; }
  }
  if (!query) return false;
  
  // Search jobs in DB
  const jobs = db.prepare(`
    SELECT j.id, j.title, j.location, j.salary_min, j.salary_max, j.job_type,
           pe.company_name
    FROM jobs j
    LEFT JOIN users u ON j.employer_id = u.id
    LEFT JOIN profiles_employer pe ON pe.user_id = u.id
    WHERE j.status = 'active'
      AND (j.title LIKE ? OR j.description LIKE ? OR j.location LIKE ? OR pe.company_name LIKE ?)
    ORDER BY j.created_at DESC
    LIMIT 5
  `).all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`);
  
  if (jobs.length === 0) {
    await sendMsg(msg.from, `🔍 No jobs found matching "${query}". Try different keywords or check wantokjobs.com for all listings.`);
    return true;
  }
  
  // Store search results in session
  db.prepare('UPDATE whatsapp_sessions SET last_search_results = ? WHERE id = ?')
    .run(JSON.stringify(jobs.map(j => j.id)), session.id);
  
  let response = `🔍 *Top jobs matching "${query}":*\n`;
  jobs.forEach((job, i) => {
    const salary = job.salary_min && job.salary_max 
      ? `💰 K${job.salary_min.toLocaleString()}-K${job.salary_max.toLocaleString()}`
      : job.salary_min ? `💰 K${job.salary_min.toLocaleString()}+` : '';
    response += `\n${i + 1}️⃣ *${job.title}*\n`;
    response += `📍 ${job.location || 'PNG'} ${salary}\n`;
    response += `🏢 ${job.company_name || 'Employer'}\n`;
  });
  response += `\n➡️ Reply *apply 1* to apply, or *more 1* for details.`;
  
  await sendMsg(msg.from, response);
  return true;
}

// ─── Job application ────────────────────────────────────────────

async function handleJobApply(msg, session, text) {
  const applyMatch = text.match(/^(?:apply|aplai|mi laik aplai)\s+(?:#?(\d+)|for\s+(.+))/i);
  if (!applyMatch) return false;
  
  if (!session.user_id) {
    await sendMsg(msg.from, '📋 You need to link your account first to apply. Send me your WantokJobs email address to get started.');
    return true;
  }
  
  let jobId;
  if (applyMatch[1]) {
    // Apply by search result number
    const num = parseInt(applyMatch[1]);
    if (session.last_search_results) {
      const results = JSON.parse(session.last_search_results);
      if (num >= 1 && num <= results.length) {
        jobId = results[num - 1];
      }
    }
    // Also try as direct job ID
    if (!jobId) jobId = parseInt(applyMatch[1]);
  }
  
  if (!jobId) {
    await sendMsg(msg.from, '❓ Which job? Try *apply 1* (from search results) or *apply #123* (job ID).');
    return true;
  }
  
  const job = db.prepare(`
    SELECT j.*, pe.company_name FROM jobs j
    LEFT JOIN users u ON j.employer_id = u.id
    LEFT JOIN profiles_employer pe ON pe.user_id = u.id
    WHERE j.id = ? AND j.status = 'active'
  `).get(jobId);
  
  if (!job) {
    await sendMsg(msg.from, '❌ Job not found or no longer active.');
    return true;
  }
  
  // Check if already applied
  const existing = db.prepare('SELECT id FROM applications WHERE job_id = ? AND jobseeker_id = ?').get(jobId, session.user_id);
  if (existing) {
    await sendMsg(msg.from, `📋 You've already applied for *${job.title}* at ${job.company_name || 'this employer'}.`);
    return true;
  }
  
  // Create application
  try {
    db.prepare("INSERT INTO applications (job_id, jobseeker_id, status, applied_at) VALUES (?, ?, 'applied', datetime('now'))").run(jobId, session.user_id);
    await sendMsg(msg.from, `✅ *Applied!* Your application for *${job.title}* at ${job.company_name || 'employer'} has been submitted.\n\nType *my applications* to track your status.`);
  } catch(e) {
    await sendMsg(msg.from, '❌ Something went wrong. Please try again or apply at wantokjobs.com.');
  }
  return true;
}

// ─── Application status ─────────────────────────────────────────

async function handleApplicationStatus(msg, session, text) {
  if (!/^(?:my applications|check status|applications|status|ol aplai bilong mi)/i.test(text)) return false;
  
  if (!session.user_id) {
    await sendMsg(msg.from, '📋 Link your account first by sending me your WantokJobs email.');
    return true;
  }
  
  const apps = db.prepare(`
    SELECT a.status, j.title, pe.company_name, a.applied_at
    FROM applications a
    JOIN jobs j ON j.id = a.job_id
    LEFT JOIN users u ON j.employer_id = u.id
    LEFT JOIN profiles_employer pe ON pe.user_id = u.id
    WHERE a.jobseeker_id = ?
    ORDER BY a.applied_at DESC
    LIMIT 10
  `).all(session.user_id);
  
  if (apps.length === 0) {
    await sendMsg(msg.from, "📋 You haven't applied to any jobs yet. Type *search [keyword]* to find jobs!");
    return true;
  }
  
  const statusEmoji = { applied: '⏳', screening: '🔍', shortlisted: '⭐', interview: '📅', offered: '🎉', hired: '✅', rejected: '❌', withdrawn: '↩️' };
  
  let response = '📋 *Your Applications:*\n';
  apps.forEach((a, i) => {
    const emoji = statusEmoji[a.status] || '📋';
    response += `\n${i + 1}. *${a.title}* at ${a.company_name || 'Employer'}\n   ${emoji} ${a.status.charAt(0).toUpperCase() + a.status.slice(1)}`;
  });
  
  await sendMsg(msg.from, response);
  return true;
}


// ─── Phone registration check ──────────────────────────────────────
async function handlePhoneCheck(from, session, text) {
  if (!/\b(registered|linked|my number|check.*number|number.*registered|account.*linked|is my|am i registered|do i have)\b/i.test(text)) return false;

  const phone = from.replace('@c.us', '');
  const user = findUserByPhone(phone);

  if (user || session.user_id) {
    const linkedUser = user || (session.user_id ? db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id) : null);
    if (linkedUser) {
      await sendMsg(from,
        `✅ *Yes, your number is registered!*

` +
        `👤 Name: ${linkedUser.name}
` +
        `📧 Email: ${linkedUser.email}
` +
        `🎭 Role: ${linkedUser.role}

` +
        `Your WhatsApp is linked to your WantokJobs account. Type *help* to see what I can do for you!`
      );
      return true;
    }
  }

  // Not registered
  await sendMsg(from,
    `❌ *Your number is not yet registered.*

` +
    `To get started:
` +
    `1️⃣ Register at https://wantokjobs.com/register
` +
    `2️⃣ Then send me your email address here to link your account

` +
    `Already have an account? Send me your *email address* and I'll link it! 📧`
  );
  return true;
}

// ─── Help menu ──────────────────────────────────────────────────

async function handleHelp(msg, text) {
  if (!/^(?:help|menu|commands|helpim mi|helpim|start|\?|hi|hello|hey)$/i.test(text.trim())) return false;
  
  await sendMsg(msg.from, 
    `🤖 *Jean — WantokJobs Assistant* 🇵🇬\n\n` +
    `Here's what I can do:\n\n` +
    `🔍 *Search* — "search accountant jobs in Lae"\n` +
    `📝 *Apply* — "apply 1" (from search) or "apply #123"\n` +
    `📋 *Status* — "my applications"\n` +
    `📄 *Resume* — Send me a PDF/Word document\n` +
    `🔔 *Alerts* — "alert me for IT jobs"\n` +
    `💡 *Suggest* — "I have a feature request"\n` +
    `🔗 *Link Account* — Send your email to connect\n` +
    `❓ *Help* — Show this menu\n\n` +
    `Mi save tok English na Tok Pisin! 🇵🇬\n` +
    `Visit: wantokjobs.com`
  );
  return true;
}

// ─── Main message handler ───────────────────────────────────────

async function handleMessage(msg) {
  // Ignore group messages and status broadcasts
  if (msg.from.includes('@g.us') || msg.from === 'status@broadcast') return;
  
  const phone = msg.from.replace('@c.us', '');
  const text = msg.body?.trim();
  if (!text && !msg.hasMedia) return;
  
  console.log(`📩 ${phone}: ${text || '[media]'}`);
  
  const session = getOrCreateSession(phone);
  
  // Auto-link by phone if not already linked
  if (!session.user_id) {
    const user = findUserByPhone(phone);
    if (user) {
      db.prepare('UPDATE whatsapp_sessions SET user_id = ? WHERE id = ?').run(user.id, session.id);
      session.user_id = user.id;
    }
  }
  
  // Handle commands in order of priority
  if (await handlePhoneCheck(msg.from, session, text)) return;
  if (await handleHelp(msg, text)) return;
  if (await handleAccountLinking(msg, session, text)) return;
  if (await handleJobSearch(msg, session, text)) return;
  if (await handleJobApply(msg, session, text)) return;
  if (await handleApplicationStatus(msg, session, text)) return;
  
  // Fall through to Jean for general conversation
  try {
    const user = session.user_id ? db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id) : null;
    
    const response = await jean.processMessage(text, {
      userId: user?.id || null,
      user: user || null,
      sessionToken: session.session_token,
      pageContext: 'whatsapp',
    });
    
    const formatted = formatForWhatsApp(response.message);
    if (formatted) await sendMsg(msg.from, formatted);
  } catch(e) {
    console.error('Jean error:', e.message);
    await sendMsg(msg.from, 'Sorry, I had trouble with that. Try again or type *help* for commands. 🙏');
  }
}

// ─── Client setup ───────────────────────────────────────────────

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: SESSION_DIR }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  },
});

client.on('qr', (qr) => {
  console.log('\n📱 Scan this QR code with WhatsApp on the Jean phone number (+67577839784):');
  console.log('─'.repeat(50));
  qrcode.generate(qr, { small: true });
  console.log('─'.repeat(50));
  console.log('Open WhatsApp > Settings > Linked Devices > Link a Device\n');
});

client.on('ready', () => {
  console.log('✅ Jean WhatsApp client is ready!');
  console.log(`📱 Connected as: ${client.info?.pushname || 'Unknown'} (${client.info?.wid?.user || 'Unknown'})`);
});

client.on('authenticated', () => {
  console.log('🔐 WhatsApp authenticated');
});

client.on('auth_failure', (msg) => {
  console.error('❌ WhatsApp auth failed:', msg);
});

client.on('disconnected', (reason) => {
  console.log('⚠️ WhatsApp disconnected:', reason);
  // Auto-reconnect after 5 seconds
  setTimeout(() => {
    console.log('🔄 Reconnecting...');
    client.initialize();
  }, 5000);
});

client.on('message', handleMessage);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down WhatsApp client...');
  await client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await client.destroy();
  process.exit(0);
});

console.log('🚀 Starting Jean WhatsApp client...');
client.initialize();

module.exports = client;
