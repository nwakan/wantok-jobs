/**
 * WhatsApp Registration Flow Handler
 * 
 * Provides conversational, multi-step registration process for WhatsApp users.
 * Handles name collection, email validation, role detection, password generation,
 * and account creation with WhatsApp number linking.
 * 
 * Created: 2026-05-06
 */

const db = require('../database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * Registration flow steps
 */
const STEPS = {
  NAME: 'name',
  EMAIL: 'email',
  ROLE: 'role',
  PASSWORD: 'password',
  COMPLETE: 'complete'
};

/**
 * Start registration flow for a WhatsApp user
 * @param {string} phone - WhatsApp phone number
 * @param {object} session - WhatsApp session object
 * @returns {Promise<{message: string, step: string}>}
 */
async function startRegistration(phone, session) {
  try {
    // Initialize registration flow
    const now = new Date().toISOString();
    
    db.prepare(`
      UPDATE whatsapp_sessions 
      SET 
        registration_flow_active = 1,
        registration_step = ?,
        registration_data = '{}',
        registration_started_at = ?
      WHERE phone_number = ?
    `).run(STEPS.NAME, now, phone);
    
    const welcomeMessage = `🎉 Great! Let's get you registered. It only takes 2 minutes!

First, what's your full name? (e.g., John Doe)`;
    
    return {
      message: welcomeMessage,
      step: STEPS.NAME
    };
  } catch (error) {
    console.error('[WhatsApp Registration] Error starting registration:', error);
    throw error;
  }
}

/**
 * Process a registration step based on current state
 * @param {string} phone - WhatsApp phone number
 * @param {object} session - WhatsApp session object
 * @param {string} userMessage - User's message
 * @returns {Promise<{message: string, step: string, completed: boolean, error?: string}>}
 */
async function processRegistrationStep(phone, session, userMessage) {
  try {
    const currentStep = session.registration_step;
    const registrationData = session.registration_data ? JSON.parse(session.registration_data) : {};
    
    // Route to appropriate step handler
    switch (currentStep) {
      case STEPS.NAME:
        return await collectName(phone, userMessage, registrationData);
      
      case STEPS.EMAIL:
        return await collectEmail(phone, userMessage, registrationData);
      
      case STEPS.ROLE:
        return await collectRole(phone, userMessage, registrationData);
      
      case STEPS.PASSWORD:
        return await completeRegistration(phone, registrationData);
      
      default:
        return {
          message: "❌ Oops, something went wrong with the registration. Let's start over. Reply 'register' to try again.",
          step: null,
          completed: false,
          error: 'Invalid step'
        };
    }
  } catch (error) {
    console.error('[WhatsApp Registration] Error processing step:', error);
    return {
      message: "❌ Sorry, there was an error. Let's start over. Reply 'register' to try again.",
      step: null,
      completed: false,
      error: error.message
    };
  }
}

/**
 * Collect and validate user's full name
 * @param {string} phone - WhatsApp phone number
 * @param {string} message - User's name input
 * @param {object} data - Current registration data
 * @returns {Promise<{message: string, step: string, completed: boolean}>}
 */
async function collectName(phone, message, data) {
  const name = message.trim();
  
  // Validation: Must have at least 2 words (first + last name)
  const words = name.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 2) {
    return {
      message: "That doesn't look like a full name. Can you provide your first and last name? (e.g., John Doe)",
      step: STEPS.NAME,
      completed: false
    };
  }
  
  // Validation: No numbers
  if (/\d/.test(name)) {
    return {
      message: "Names shouldn't contain numbers. Can you provide your real name? (e.g., John Doe)",
      step: STEPS.NAME,
      completed: false
    };
  }
  
  // Validation: Max 100 characters
  if (name.length > 100) {
    return {
      message: "That name is too long. Can you provide a shorter version? (max 100 characters)",
      step: STEPS.NAME,
      completed: false
    };
  }
  
  // Store name and move to email step
  data.name = name;
  
  db.prepare(`
    UPDATE whatsapp_sessions 
    SET 
      registration_step = ?,
      registration_data = ?
    WHERE phone_number = ?
  `).run(STEPS.EMAIL, JSON.stringify(data), phone);
  
  return {
    message: `Thanks, ${words[0]}! 👋\n\nNow, what's your email address? (We'll use this for your account login and important notifications)`,
    step: STEPS.EMAIL,
    completed: false
  };
}

/**
 * Collect and validate user's email address
 * @param {string} phone - WhatsApp phone number
 * @param {string} message - User's email input
 * @param {object} data - Current registration data
 * @returns {Promise<{message: string, step: string, completed: boolean}>}
 */
async function collectEmail(phone, message, data) {
  const email = message.trim().toLowerCase();
  
  // Validation: Email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      message: "That doesn't look like a valid email address. Can you provide your email? (e.g., john@example.com)",
      step: STEPS.EMAIL,
      completed: false
    };
  }
  
  // Validation: Max 100 characters
  if (email.length > 100) {
    return {
      message: "That email is too long. Can you provide a shorter email address? (max 100 characters)",
      step: STEPS.EMAIL,
      completed: false
    };
  }
  
  // Check if email already exists
  const existingUser = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email);
  if (existingUser) {
    return {
      message: `❌ This email (${email}) is already registered. If you forgot your password, please visit the website to reset it.\n\nIf you want to use a different email, just type it now.`,
      step: STEPS.EMAIL,
      completed: false
    };
  }
  
  // Store email and move to role step
  data.email = email;
  
  db.prepare(`
    UPDATE whatsapp_sessions 
    SET 
      registration_step = ?,
      registration_data = ?
    WHERE phone_number = ?
  `).run(STEPS.ROLE, JSON.stringify(data), phone);
  
  return {
    message: `Perfect! ✅\n\nAre you looking for a job (jobseeker) or hiring employees (employer)?\n\nReply:\n- 'Jobseeker' or 'Looking for a job'\n- 'Employer' or 'Hiring'`,
    step: STEPS.ROLE,
    completed: false
  };
}

/**
 * Detect and validate user's role (jobseeker or employer)
 * @param {string} phone - WhatsApp phone number
 * @param {string} message - User's role input
 * @param {object} data - Current registration data
 * @returns {Promise<{message: string, step: string, completed: boolean}>}
 */
async function collectRole(phone, message, data) {
  const input = message.toLowerCase().trim();
  
  // Role detection patterns
  const jobseekerPatterns = [
    /jobseeker/i,
    /job seeker/i,
    /looking for.*job/i,
    /find.*job/i,
    /need.*job/i,
    /want.*job/i,
    /search.*job/i,
    /employee/i,
    /work/i
  ];
  
  const employerPatterns = [
    /employer/i,
    /hiring/i,
    /hire/i,
    /recruit/i,
    /company/i,
    /business/i,
    /looking for.*staff/i,
    /need.*staff/i,
    /find.*employee/i
  ];
  
  let role = null;
  
  if (jobseekerPatterns.some(pattern => pattern.test(input))) {
    role = 'jobseeker';
  } else if (employerPatterns.some(pattern => pattern.test(input))) {
    role = 'employer';
  }
  
  if (!role) {
    return {
      message: "I didn't catch that. Are you looking for a job (jobseeker) or hiring employees (employer)?\n\nReply:\n- 'Jobseeker'\n- 'Employer'",
      step: STEPS.ROLE,
      completed: false
    };
  }
  
  // Store role and move to password generation step
  data.role = role;
  
  db.prepare(`
    UPDATE whatsapp_sessions 
    SET 
      registration_step = ?,
      registration_data = ?
    WHERE phone_number = ?
  `).run(STEPS.PASSWORD, JSON.stringify(data), phone);
  
  return {
    message: `Got it! You're registering as a ${role}. 👍\n\nGenerating your account now... ⏳`,
    step: STEPS.PASSWORD,
    completed: false
  };
}

/**
 * Generate secure random password
 * @returns {string} - 12-character password
 */
function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%&';
  let password = '';
  
  // Use crypto.randomBytes for cryptographic randomness
  const randomBytes = crypto.randomBytes(12);
  
  for (let i = 0; i < 12; i++) {
    password += chars[randomBytes[i] % chars.length];
  }
  
  return password;
}

/**
 * Complete registration: create user account and link WhatsApp
 * @param {string} phone - WhatsApp phone number
 * @param {object} data - Registration data {name, email, role}
 * @returns {Promise<{message: string, step: string, completed: boolean}>}
 */
async function completeRegistration(phone, data) {
  try {
    const { name, email, role } = data;
    
    // Generate secure password
    const plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    const now = new Date().toISOString();
    
    // Create user account
    const userResult = db.prepare(`
      INSERT INTO users (name, email, password, role, phone, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run(name, email, hashedPassword, role, phone, now, now);
    
    const userId = userResult.lastInsertRowid;
    
    // Link WhatsApp session to user account
    db.prepare(`
      UPDATE whatsapp_sessions 
      SET 
        user_id = ?,
        registration_flow_active = 0,
        registration_step = ?,
        registration_completed_at = ?
      WHERE phone_number = ?
    `).run(userId, STEPS.COMPLETE, now, phone);
    
    // Create role-specific profile
    if (role === 'jobseeker') {
      db.prepare(`
        INSERT INTO profiles_jobseeker (user_id, created_at, updated_at)
        VALUES (?, ?, ?)
      `).run(userId, now, now);
    } else if (role === 'employer') {
      db.prepare(`
        INSERT INTO profiles_employer (user_id, created_at, updated_at)
        VALUES (?, ?, ?)
      `).run(userId, now, now);
    }
    
    // Success message with password
    const successMessage = `🎉 Registration complete!\n\n✅ Your account has been created:\n\n📧 Email: ${email}\n🔑 Password: ${plainPassword}\n\n⚠️ **IMPORTANT**: Save this password! You can change it later in your profile settings.\n\nWhat would you like to do?\n\nReply:\n- 'Find jobs' to search for opportunities\n- 'Help' for assistance`;
    
    return {
      message: successMessage,
      step: STEPS.COMPLETE,
      completed: true
    };
  } catch (error) {
    console.error('[WhatsApp Registration] Error completing registration:', error);
    
    // Reset registration flow on error
    db.prepare(`
      UPDATE whatsapp_sessions 
      SET 
        registration_flow_active = 0,
        registration_step = NULL,
        registration_data = NULL
      WHERE phone_number = ?
    `).run(phone);
    
    return {
      message: "❌ Sorry, there was an error creating your account. Please try again later or contact support.",
      step: null,
      completed: false,
      error: error.message
    };
  }
}

/**
 * Cancel active registration flow
 * @param {string} phone - WhatsApp phone number
 * @returns {Promise<{message: string, cancelled: boolean}>}
 */
async function cancelRegistration(phone) {
  try {
    db.prepare(`
      UPDATE whatsapp_sessions 
      SET 
        registration_flow_active = 0,
        registration_step = NULL,
        registration_data = NULL
      WHERE phone_number = ?
    `).run(phone);
    
    return {
      message: "Registration cancelled. You can start again anytime by replying 'register'.",
      cancelled: true
    };
  } catch (error) {
    console.error('[WhatsApp Registration] Error cancelling registration:', error);
    return {
      message: "Error cancelling registration. Please try again.",
      cancelled: false
    };
  }
}

/**
 * Check if user is in active registration flow
 * @param {object} session - WhatsApp session object
 * @returns {boolean}
 */
function isInRegistrationFlow(session) {
  return session.registration_flow_active === 1;
}

/**
 * Get registration progress percentage
 * @param {object} session - WhatsApp session object
 * @returns {number} - Progress percentage (0-100)
 */
function getRegistrationProgress(session) {
  if (!session.registration_flow_active) return 0;
  
  const stepOrder = [STEPS.NAME, STEPS.EMAIL, STEPS.ROLE, STEPS.PASSWORD, STEPS.COMPLETE];
  const currentIndex = stepOrder.indexOf(session.registration_step);
  
  if (currentIndex === -1) return 0;
  
  return Math.round((currentIndex / stepOrder.length) * 100);
}

module.exports = {
  startRegistration,
  processRegistrationStep,
  cancelRegistration,
  isInRegistrationFlow,
  getRegistrationProgress,
  STEPS
};
