/**
 * WhatsApp Webhook Routes — ENHANCED
 * Advanced features: account linking, job search, applications, resume upload, alerts
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const jean = require('../utils/jean/index');
const logger = require('../utils/logger');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ─── Database Setup ────────────────────────────────────────

// Ensure whatsapp_sessions table has all needed columns
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS whatsapp_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number TEXT NOT NULL UNIQUE,
      user_id INTEGER,
      session_token TEXT,
      flow_state TEXT,
      otp TEXT,
      otp_expires TEXT,
      last_search_results TEXT,
      last_message_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  
  // Add new columns if they don't exist
  const addColumn = (col, type) => {
    try {
      db.exec(`ALTER TABLE whatsapp_sessions ADD COLUMN ${col} ${type}`);
    } catch (e) {
      // Column exists
    }
  };
  
  addColumn('otp', 'TEXT');
  addColumn('otp_expires', 'TEXT');
  addColumn('last_search_results', 'TEXT');
} catch (e) {
  logger.error('WhatsApp sessions table setup error', { error: e.message });
}

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'wantokjobs-verify';
const API_TOKEN = process.env.WHATSAPP_API_TOKEN;
const API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;

// Directory for uploaded resumes
const RESUMES_DIR = process.env.RESUMES_DIR || path.join(__dirname, '../data/resumes');
if (!fs.existsSync(RESUMES_DIR)) {
  fs.mkdirSync(RESUMES_DIR, { recursive: true });
}

// ─── Helpers ───────────────────────────────────────────────────────

/**
 * Get or create a WhatsApp session for a phone number
 */
function getOrCreateSession(phoneNumber) {
  let session = db.prepare('SELECT * FROM whatsapp_sessions WHERE phone_number = ?').get(phoneNumber);
  
  if (!session) {
    const token = crypto.randomBytes(16).toString('hex');
    db.prepare(
      'INSERT INTO whatsapp_sessions (phone_number, session_token) VALUES (?, ?)'
    ).run(phoneNumber, token);
    session = db.prepare('SELECT * FROM whatsapp_sessions WHERE phone_number = ?').get(phoneNumber);
  } else {
    // Update last_message_at
    db.prepare("UPDATE whatsapp_sessions SET last_message_at = datetime('now') WHERE id = ?").run(session.id);
  }
  
  return session;
}

/**
 * Generate 6-digit OTP
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Check if OTP is valid
 */
function validateOTP(session, otp) {
  if (!session.otp || !session.otp_expires) return false;
  const expires = new Date(session.otp_expires);
  if (new Date() > expires) return false;
  return session.otp === otp;
}

/**
 * Strip HTML tags and format for WhatsApp plain text
 */
function formatForWhatsApp(text) {
  if (!text) return '';
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<strong>(.*?)<\/strong>/gi, '*$1*')
    .replace(/<em>(.*?)<\/em>/gi, '_$1_')
    .replace(/<a\s+href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Format job listing for WhatsApp
 */
function formatJobForWhatsApp(job, index) {
  const emoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'][index - 1] || `${index}.`;
  const salary = job.salary_min 
    ? `💰 ${job.salary_currency || 'K'}${job.salary_min}${job.salary_max ? '-' + job.salary_max : '+'}`
    : '';
  const company = job.company_name ? `🏢 ${job.company_name}` : '';
  
  return `${emoji} *${job.title}*\n📍 ${job.location || 'PNG'} | ${salary}\n${company}\n➡️ Reply "apply ${index}" to apply`;
}

/**
 * Format application status for WhatsApp
 */
function formatApplicationStatus(app, index) {
  const statusEmoji = {
    pending: '⏳',
    reviewed: '👀',
    shortlisted: '✅',
    interviewed: '🎤',
    offered: '🎉',
    hired: '🌟',
    rejected: '❌',
    withdrawn: '🚫'
  }[app.status] || '📋';
  
  const dateStr = new Date(app.applied_at).toLocaleDateString('en-PG', { 
    month: 'short', 
    day: 'numeric' 
  });
  
  return `${index}. ${statusEmoji} *${app.title}*\n   at ${app.company_name || 'Company'} — ${app.status}\n   Applied: ${dateStr}`;
}

/**
 * Send a WhatsApp message
 */
async function sendWhatsAppMessage(to, text) {
  if (!API_TOKEN || !PHONE_ID) {
    logger.warn('WhatsApp API not configured — message not sent', { to });
    return null;
  }

  const url = `${API_URL}/${PHONE_ID}/messages`;
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text }
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      logger.error('WhatsApp API error', { status: res.status, body: errBody, to });
      return null;
    }

    return await res.json();
  } catch (err) {
    logger.error('WhatsApp send failed', { error: err.message, to });
    return null;
  }
}

/**
 * Download WhatsApp media (document/image)
 */
async function downloadWhatsAppMedia(mediaId) {
  if (!API_TOKEN) return null;
  
  try {
    // Step 1: Get media URL
    const mediaUrl = `${API_URL}/${mediaId}`;
    const mediaRes = await fetch(mediaUrl, {
      headers: { 'Authorization': `Bearer ${API_TOKEN}` }
    });
    
    if (!mediaRes.ok) {
      logger.error('Failed to get media URL', { mediaId, status: mediaRes.status });
      return null;
    }
    
    const mediaData = await mediaRes.json();
    const downloadUrl = mediaData.url;
    const mimeType = mediaData.mime_type;
    
    // Step 2: Download the file
    const fileRes = await fetch(downloadUrl, {
      headers: { 'Authorization': `Bearer ${API_TOKEN}` }
    });
    
    if (!fileRes.ok) {
      logger.error('Failed to download media', { downloadUrl, status: fileRes.status });
      return null;
    }
    
    const buffer = Buffer.from(await fileRes.arrayBuffer());
    
    // Determine extension from mime type
    const ext = mimeType === 'application/pdf' ? '.pdf'
            : mimeType.includes('word') || mimeType.includes('document') ? '.docx'
            : '.bin';
    
    return { buffer, mimeType, ext };
  } catch (err) {
    logger.error('Media download error', { error: err.message, mediaId });
    return null;
  }
}

/**
 * Save resume to file system and update user profile
 */
async function saveResume(userId, buffer, ext) {
  const filename = `resume_${userId}_${Date.now()}${ext}`;
  const filepath = path.join(RESUMES_DIR, filename);
  
  fs.writeFileSync(filepath, buffer);
  
  // Update user profile
  db.prepare('UPDATE profiles_jobseeker SET cv_url = ? WHERE user_id = ?')
    .run(`/uploads/resumes/${filename}`, userId);
  
  return filepath;
}

// ─── Account Linking Logic ─────────────────────────────────────────

/**
 * Handle account linking flow
 * Returns { handled: true, message: string } if it handled the message
 */
async function handleAccountLinking(session, message, phone) {
  // Check if already linked
  if (session.user_id) {
    return { handled: false };
  }
  
  // State: waiting for OTP
  if (session.flow_state === 'awaiting_otp' && session.otp) {
    const otpMatch = message.match(/\b\d{6}\b/);
    if (otpMatch && validateOTP(session, otpMatch[0])) {
      // Link account
      const user = db.prepare('SELECT * FROM users WHERE id = ?')
        .get(session.otp_user_id || session.user_id);
      
      if (!user) {
        db.prepare('UPDATE whatsapp_sessions SET flow_state = NULL, otp = NULL, otp_expires = NULL WHERE id = ?')
          .run(session.id);
        return { 
          handled: true, 
          message: "Oops, I couldn't find that account. Let's start over — send me your registered email address. 📧" 
        };
      }
      
      // Update session and user
      db.prepare('UPDATE whatsapp_sessions SET user_id = ?, flow_state = NULL, otp = NULL, otp_expires = NULL WHERE id = ?')
        .run(user.id, session.id);
      db.prepare('UPDATE users SET phone = ? WHERE id = ?')
        .run(phone, user.id);
      
      const firstName = user.name.split(' ')[0];
      return {
        handled: true,
        message: `Account linked! ✅ You're now connected as ${firstName}.\n\nI can help you:\n🔍 Search jobs\n📝 Apply to positions\n📋 Track your applications\n🔔 Set up alerts\n📄 Upload your CV\n\nJust say "help" or "menu" anytime! Mi stap hia blong helpim yu. 🇵🇬`
      };
    } else {
      return {
        handled: true,
        message: "That code doesn't match. Please check and try again, or send your email to restart the linking process. 🔢"
      };
    }
  }
  
  // State: waiting for email
  const emailMatch = message.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  if (emailMatch) {
    const email = emailMatch[0].toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(email);
    
    if (user) {
      const otp = generateOTP();
      const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      db.prepare('UPDATE whatsapp_sessions SET flow_state = ?, otp = ?, otp_expires = ?, user_id = ? WHERE id = ?')
        .run('awaiting_otp', otp, expires.toISOString(), user.id, session.id);
      
      // TODO: Send OTP via email (if email service configured)
      // For now, show it in WhatsApp
      return {
        handled: true,
        message: `I found your account! ✅\n\nYour verification code is: *${otp}*\n\nReply with this code to confirm and link your account.\n\n_Code expires in 10 minutes._`
      };
    } else {
      return {
        handled: true,
        message: `I couldn't find an account with that email. 😕\n\nWant to register? Visit https://wantokjobs.com/register\n\nAlready have an account? Double-check the email and try again!`
      };
    }
  }
  
  // First-time user greeting
  return {
    handled: true,
    message: `Hi! I'm Jean from WantokJobs 🇵🇬\n\nI can help you find jobs, apply, and more.\n\nTo get started, link your WantokJobs account by replying with your *registered email address*.\n\n_Don't have an account? Register at https://wantokjobs.com/register_`
  };
}

// ─── WhatsApp-Specific Command Handlers ────────────────────────────

/**
 * Handle WhatsApp-specific commands
 * Returns { handled: true, message: string } if handled
 */
async function handleWhatsAppCommands(session, message, user) {
  const lower = message.toLowerCase().trim();
  
  // ─── Help / Menu ───────────────────────────────────────
  if (/^(help|menu|commands|what can you do)\b/i.test(lower)) {
    return {
      handled: true,
      message: `🤖 *Jean - WantokJobs Assistant*

Here's what I can do:

🔍 *Search* — "search accountant jobs in Lae"
📝 *Apply* — "apply 1" (after search)
📋 *Status* — "my applications"
📄 *Resume* — Send me a PDF/Word document
🔔 *Alerts* — "alert me for IT jobs"
💡 *Suggest* — "I have a feature request"
❓ *Help* — Show this menu

Just type naturally — I understand English and Tok Pisin! 🇵🇬`
    };
  }
  
  // ─── Job Search ─────────────────────────────────────────
  if (/\b(search|find|painim)\b.*\b(job|wok)\b/i.test(lower) || /^jobs?\s+in\b/i.test(lower)) {
    // Extract search terms
    const searchTerms = message.replace(/\b(search|find|painim|for|jobs?|wok)\b/gi, '').trim();
    
    const searchParams = { limit: 5 };
    
    // Extract location
    const locations = ['port moresby', 'lae', 'mt hagen', 'mount hagen', 'madang', 'kokopo', 'goroka'];
    for (const loc of locations) {
      if (lower.includes(loc)) {
        searchParams.location = loc;
        break;
      }
    }
    
    // Remaining text is search query
    if (searchTerms) {
      searchParams.search = searchTerms;
    }
    
    const jobs = db.prepare(`
      SELECT j.id, j.title, j.location, j.salary_min, j.salary_max, j.salary_currency,
             pe.company_name
      FROM jobs j
      LEFT JOIN profiles_employer pe ON j.employer_id = pe.user_id
      WHERE j.status = 'active'
        ${searchParams.search ? "AND (j.title LIKE ? OR j.description LIKE ? OR j.skills LIKE ?)" : ""}
        ${searchParams.location ? "AND j.location LIKE ?" : ""}
      ORDER BY j.featured DESC, j.created_at DESC
      LIMIT ?
    `).all(
      ...(searchParams.search ? [`%${searchParams.search}%`, `%${searchParams.search}%`, `%${searchParams.search}%`] : []),
      ...(searchParams.location ? [`%${searchParams.location}%`] : []),
      searchParams.limit
    );
    
    if (jobs.length === 0) {
      return {
        handled: true,
        message: `Sori, I couldn't find any jobs matching "${searchTerms}". 😕\n\nTry:\n• Broader keywords\n• Different location\n• "show all jobs"\n\nOr set up an alert so I notify you when something matches! Bai mi helpim yu.`
      };
    }
    
    // Store search results in session
    db.prepare('UPDATE whatsapp_sessions SET last_search_results = ? WHERE id = ?')
      .run(JSON.stringify(jobs.map(j => j.id)), session.id);
    
    const jobList = jobs.map((j, i) => formatJobForWhatsApp(j, i + 1)).join('\n\n');
    
    return {
      handled: true,
      message: `🔍 *Top ${jobs.length} jobs matching "${searchTerms || 'all categories'}":*\n\n${jobList}\n\n_Reply "apply 1", "more 2", or "save 3" to interact with a job!_`
    };
  }
  
  // ─── Apply to Job ───────────────────────────────────────
  const applyMatch = lower.match(/\b(apply|aplai)\s+(\d+)\b/);
  if (applyMatch) {
    const index = parseInt(applyMatch[2]) - 1;
    
    if (!user) {
      return {
        handled: true,
        message: `You need to be linked to apply for jobs. Send me your registered email address to get started! 📧`
      };
    }
    
    // Get job from last search
    let jobId;
    try {
      const lastSearch = JSON.parse(session.last_search_results || '[]');
      jobId = lastSearch[index];
    } catch (e) {}
    
    if (!jobId) {
      return {
        handled: true,
        message: `I couldn't find job #${index + 1}. Try searching again first! Use "search jobs" to see available positions.`
      };
    }
    
    const job = db.prepare('SELECT * FROM jobs WHERE id = ? AND status = ?').get(jobId, 'active');
    if (!job) {
      return {
        handled: true,
        message: `That job is no longer available. Em i lus pinis. Try searching for similar positions!`
      };
    }
    
    // Check if already applied
    const existing = db.prepare('SELECT id FROM applications WHERE job_id = ? AND jobseeker_id = ?')
      .get(jobId, user.id);
    if (existing) {
      return {
        handled: true,
        message: `You've already applied for *${job.title}*! Check your application status with "my applications". 📋`
      };
    }
    
    // Check if profile is complete
    const profile = db.prepare('SELECT * FROM profiles_jobseeker WHERE user_id = ?').get(user.id);
    if (!profile || !profile.cv_url) {
      return {
        handled: true,
        message: `To apply, I need your CV first! 📄\n\nSend me your resume as a PDF or Word document, and I'll save it to your profile.\n\nThen you can apply with just a message! Mi bai helpim yu.`
      };
    }
    
    // Submit application
    db.prepare(`
      INSERT INTO applications (job_id, jobseeker_id, cover_letter, cv_url, status, applied_at)
      VALUES (?, ?, ?, ?, 'applied', datetime('now'))
    `).run(jobId, user.id, '', profile.cv_url);
    
    // Notify employer
    try {
      db.prepare(`
        INSERT INTO notifications (user_id, type, title, message, link, created_at)
        VALUES (?, 'new_application', 'New Application', ?, '/dashboard/employer/applicants', datetime('now'))
      `).run(job.employer_id, `${user.name} applied for ${job.title}`);
    } catch (e) {}
    
    return {
      handled: true,
      message: `Applied! ✅\n\nYour application for *${job.title}* at ${job.company_name || 'the employer'} has been submitted.\n\nGutpela! Check status anytime with "my applications". Best of luck! 🙌`
    };
  }
  
  // ─── My Applications ────────────────────────────────────
  if (/\b(my|check|view)\b.*\b(application|status)\b/i.test(lower) || /^applications?\b/i.test(lower)) {
    if (!user) {
      return {
        handled: true,
        message: `Link your account first to see your applications. Send me your registered email! 📧`
      };
    }
    
    const apps = db.prepare(`
      SELECT a.id, a.status, a.applied_at, j.title, j.location,
             pe.company_name
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      LEFT JOIN profiles_employer pe ON j.employer_id = pe.user_id
      WHERE a.jobseeker_id = ?
      ORDER BY a.applied_at DESC
      LIMIT 10
    `).all(user.id);
    
    if (apps.length === 0) {
      return {
        handled: true,
        message: `You haven't applied to any jobs yet! 📭\n\nWant me to search for opportunities? Just say "search jobs" or tell me what kind of work you're looking for.\n\nMi stap hia blong helpim yu painim gutpela wok! 💪`
      };
    }
    
    const appList = apps.map((a, i) => formatApplicationStatus(a, i + 1)).join('\n\n');
    
    return {
      handled: true,
      message: `📋 *Your Applications (${apps.length} total):*\n\n${appList}\n\nKeep it up! Bai yu kisim wok! 💪`
    };
  }
  
  // ─── Set Job Alert ──────────────────────────────────────
  if (/\b(alert|notify)\b.*\b(job|wok)\b/i.test(lower) || /\balert me\b/i.test(lower)) {
    if (!user) {
      return {
        handled: true,
        message: `Link your account first to set up alerts. Send me your email! 📧`
      };
    }
    
    // Extract keywords
    const keywords = message.replace(/\b(alert|notify|me|for|jobs?|wok)\b/gi, '').trim();
    
    if (!keywords) {
      return {
        handled: true,
        message: `What kind of jobs should I alert you about? 🔔\n\nExamples:\n• "alert me for IT jobs"\n• "alert accountant jobs in Lae"\n• "notify me when driver jobs are posted"\n\nJust tell me what you're looking for!`
      };
    }
    
    // Create job alert
    db.prepare(`
      INSERT INTO job_alerts (user_id, keywords, channel, frequency, active, created_at)
      VALUES (?, ?, 'whatsapp', 'instant', 1, datetime('now'))
    `).run(user.id, keywords);
    
    return {
      handled: true,
      message: `Alert set! ✅\n\nI'll message you on WhatsApp when new jobs matching "${keywords}" are posted.\n\nYou can manage alerts anytime with "my alerts" or turn them off with "stop alerts".\n\nMi bai tokim yu! 🔔`
    };
  }
  
  // ─── Save Job ───────────────────────────────────────────
  const saveMatch = lower.match(/\b(save|bookmark)\s+(\d+)\b/);
  if (saveMatch) {
    const index = parseInt(saveMatch[2]) - 1;
    
    if (!user) {
      return {
        handled: true,
        message: `Link your account first to save jobs. Send me your email! 📧`
      };
    }
    
    // Get job from last search
    let jobId;
    try {
      const lastSearch = JSON.parse(session.last_search_results || '[]');
      jobId = lastSearch[index];
    } catch (e) {}
    
    if (!jobId) {
      return {
        handled: true,
        message: `I couldn't find job #${index + 1}. Try searching again first!`
      };
    }
    
    try {
      db.prepare('INSERT OR IGNORE INTO saved_jobs (user_id, job_id, created_at) VALUES (?, ?, datetime("now"))')
        .run(user.id, jobId);
      
      const job = db.prepare('SELECT title FROM jobs WHERE id = ?').get(jobId);
      
      return {
        handled: true,
        message: `Saved! ✅\n\n*${job?.title || 'Job'}* has been added to your saved jobs.\n\nView all saved jobs with "my saved jobs". Mi keepim long yu! 📌`
      };
    } catch (e) {
      return {
        handled: true,
        message: `That job is already in your saved list! Em i stap pinis. 😊`
      };
    }
  }
  
  // Not a WhatsApp-specific command
  return { handled: false };
}

// ─── Webhook Verification ──────────────────────────────────────────

router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    logger.info('WhatsApp webhook verified');
    return res.status(200).send(challenge);
  }

  logger.warn('WhatsApp webhook verification failed', { mode, token: token?.slice(0, 4) + '...' });
  res.sendStatus(403);
});

// ─── Incoming Messages ─────────────────────────────────────────────

router.post('/webhook', async (req, res) => {
  // Respond 200 immediately (WhatsApp requires fast ack)
  res.sendStatus(200);

  try {
    const messages = extractMessages(req.body);
    
    for (const msg of messages) {
      await handleIncomingMessage(msg);
    }
  } catch (err) {
    logger.error('WhatsApp webhook processing error', { error: err.message, stack: err.stack });
  }
});

/**
 * Extract messages from various provider formats
 */
function extractMessages(body) {
  const messages = [];

  // WhatsApp Cloud API format
  if (body?.object === 'whatsapp_business_account') {
    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value || {};
        const msgs = value.messages || [];
        for (const m of msgs) {
          messages.push({
            from: m.from,
            type: m.type,
            text: m.text?.body || '',
            // Interactive button reply
            buttonReplyId: m.interactive?.button_reply?.id,
            buttonReplyTitle: m.interactive?.button_reply?.title,
            // Media
            mediaId: m.image?.id || m.document?.id,
            mediaType: m.type === 'image' ? 'image' : m.type === 'document' ? 'document' : null,
            mediaMime: m.image?.mime_type || m.document?.mime_type,
            caption: m.image?.caption || m.document?.caption,
            filename: m.document?.filename,
            timestamp: m.timestamp,
          });
        }
      }
    }
    return messages;
  }

  // Twilio format
  if (body?.From && body?.Body !== undefined) {
    messages.push({
      from: body.From.replace('whatsapp:', '').replace('+', ''),
      type: body.NumMedia > 0 ? 'document' : 'text',
      text: body.Body || '',
      mediaId: body.MediaUrl0 || null,
      mediaType: body.MediaContentType0 || null,
      timestamp: Math.floor(Date.now() / 1000),
    });
    return messages;
  }

  // 360dialog / generic format
  if (body?.messages?.length) {
    for (const m of body.messages) {
      messages.push({
        from: m.from || m.phone,
        type: m.type || 'text',
        text: m.text?.body || m.body || m.text || '',
        timestamp: m.timestamp,
      });
    }
  }

  return messages;
}

/**
 * Handle a single incoming message
 */
async function handleIncomingMessage(msg) {
  const phone = msg.from;
  if (!phone) return;

  logger.info('WhatsApp message received', { from: phone, type: msg.type });

  const session = getOrCreateSession(phone);
  const user = session.user_id
    ? db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id)
    : null;

  // Handle button replies — treat as text
  let messageText = msg.text;
  if (msg.buttonReplyTitle) {
    messageText = msg.buttonReplyTitle;
  }

  // ─── Handle Resume/Document Upload ─────────────────────
  if (msg.mediaId && msg.mediaType === 'document' && user) {
    const isPdf = msg.mediaMime === 'application/pdf';
    const isDoc = msg.mediaMime?.includes('word') || msg.mediaMime?.includes('document') || 
                  msg.filename?.match(/\.(doc|docx)$/i);
    
    if (isPdf || isDoc) {
      try {
        const media = await downloadWhatsAppMedia(msg.mediaId);
        if (media) {
          const filepath = await saveResume(user.id, media.buffer, media.ext);
          logger.info('Resume uploaded via WhatsApp', { userId: user.id, filepath });
          
          await sendWhatsAppMessage(phone, 
            `Resume received! ✅\n\nI've saved your CV to your profile. You can now apply for jobs with just a message!\n\nTry "search jobs" to find opportunities, then reply "apply 1" to submit your application.\n\nGutpela wok! 📄`
          );
          return;
        }
      } catch (err) {
        logger.error('Resume upload error', { error: err.message, userId: user.id });
        await sendWhatsAppMessage(phone,
          `Sori, I had trouble saving your CV. Please try again or upload it at https://wantokjobs.com/dashboard 📄`
        );
        return;
      }
    }
  }

  if (!messageText && msg.type === 'text') {
    return; // Empty message
  }

  // ─── Account Linking Flow ──────────────────────────────
  const linkingResult = await handleAccountLinking(session, messageText, phone);
  if (linkingResult.handled) {
    await sendWhatsAppMessage(phone, linkingResult.message);
    return;
  }

  // ─── WhatsApp-Specific Commands ────────────────────────
  const commandResult = await handleWhatsAppCommands(session, messageText, user);
  if (commandResult.handled) {
    await sendWhatsAppMessage(phone, commandResult.message);
    return;
  }

  // ─── Fallback to Jean AI ───────────────────────────────
  try {
    const response = await jean.processMessage(messageText, {
      userId: user?.id || null,
      user: user || null,
      sessionToken: session.session_token,
      pageContext: 'whatsapp',
    });

    const formattedText = formatForWhatsApp(response.message);
    await sendWhatsAppMessage(phone, formattedText);
  } catch (err) {
    logger.error('Jean processing error for WhatsApp', { error: err.message, phone });
    await sendWhatsAppMessage(phone, 
      'Sorry, I had trouble processing that. Please try again! 🙏'
    );
  }
}

module.exports = router;
