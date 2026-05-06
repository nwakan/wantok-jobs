/**
 * WhatsApp Context Enrichment Module
 * 
 * Provides comprehensive user context for WhatsApp conversations:
 * - Registration status (linked/not linked/not registered)
 * - Conversation history (previous messages, last interaction)
 * - User profile (role, activity stats)
 * - Personalization data (preferences, behavior)
 * 
 * User Requirements (2026-05-06):
 * "Whatsapp chat should know the whatsapp number so it can actually look up 
 * the number to confirm if user is registered or not. Must check previous 
 * chats to understand the whatsapp user. Each whatsapp user must have a 
 * profile with chat history so easy to know and respond in a more customised, 
 * familiar approach. Should know user type, preferences, etc."
 */

const db = require('../database');
const logger = require('../utils/logger');

/**
 * Get comprehensive WhatsApp context for a phone number
 * 
 * @param {string} phoneNumber - WhatsApp number (e.g., '+67583411067')
 * @param {object|null} session - WhatsApp session from whatsapp_sessions table
 * @param {object|null} user - User object from users table (if registered)
 * @returns {object} Complete WhatsApp context object
 */
function getWhatsAppContext(phoneNumber, session, user) {
  const context = {
    phoneNumber,
    timestamp: new Date().toISOString(),
  };

  try {
    // ─── 1. REGISTRATION STATUS ───────────────────────────────
    context.registration = getRegistrationStatus(session, user);

    // ─── 2. CONVERSATION HISTORY ──────────────────────────────
    context.conversationHistory = getConversationHistory(phoneNumber);

    // ─── 3. USER PROFILE & ACTIVITY ───────────────────────────
    if (user) {
      context.userProfile = getUserProfile(user);
    }

    // ─── 4. ONBOARDING STATE ──────────────────────────────────
    context.onboarding = getOnboardingState(session);

    // ─── 5. CONTEXT SUMMARY (Human-Readable) ──────────────────
    context.summary = generateContextSummary(context);

  } catch (err) {
    logger.error('WhatsApp context enrichment error', { 
      error: err.message, 
      phoneNumber,
      stack: err.stack 
    });
    
    // Return minimal context on error
    context.error = err.message;
    context.registration = { status: 'unknown' };
    context.conversationHistory = { totalMessages: 0, isReturningUser: false };
  }

  return context;
}

/**
 * Determine registration status
 * 
 * @param {object|null} session - WhatsApp session
 * @param {object|null} user - User object
 * @returns {object} Registration status details
 */
function getRegistrationStatus(session, user) {
  if (session?.user_id && user) {
    return {
      status: 'registered_linked',
      isRegistered: true,
      isLinked: true,
      userId: user.id,
      userRole: user.role,
      userName: user.name,
      registeredAt: user.created_at,
    };
  }

  if (!session?.user_id && user) {
    return {
      status: 'registered_not_linked',
      isRegistered: true,
      isLinked: false,
      userId: user.id,
      userRole: user.role,
      userName: user.name,
    };
  }

  return {
    status: 'not_registered',
    isRegistered: false,
    isLinked: false,
  };
}

/**
 * Get conversation history statistics
 * 
 * @param {string} phoneNumber - WhatsApp number
 * @returns {object} Conversation history details
 */
function getConversationHistory(phoneNumber) {
  try {
    // Get conversation stats
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(CASE WHEN jm.role = 'user' THEN 1 END) as user_messages,
        COUNT(CASE WHEN jm.role = 'jean' THEN 1 END) as ai_messages,
        MAX(jm.created_at) as last_interaction,
        MIN(jm.created_at) as first_interaction
      FROM jean_messages jm
      JOIN jean_sessions js ON jm.session_id = js.id
      JOIN whatsapp_sessions ws ON js.session_token = ws.session_token
      WHERE ws.phone_number = ? AND js.platform = 'whatsapp'
    `).get(phoneNumber);

    if (!stats || stats.total_messages === 0) {
      return {
        totalMessages: 0,
        userMessages: 0,
        aiMessages: 0,
        isReturningUser: false,
        isFirstContact: true,
      };
    }

    // Get recent conversation (last 10 messages)
    const recentMessages = db.prepare(`
      SELECT 
        jm.role,
        jm.content,
        jm.intent,
        jm.created_at
      FROM jean_messages jm
      JOIN jean_sessions js ON jm.session_id = js.id
      JOIN whatsapp_sessions ws ON js.session_token = ws.session_token
      WHERE ws.phone_number = ? AND js.platform = 'whatsapp'
      ORDER BY jm.created_at DESC
      LIMIT 10
    `).all(phoneNumber);

    return {
      totalMessages: stats.total_messages,
      userMessages: stats.user_messages,
      aiMessages: stats.ai_messages,
      lastInteraction: stats.last_interaction,
      firstInteraction: stats.first_interaction,
      isReturningUser: stats.total_messages > 0,
      isFirstContact: stats.total_messages === 0,
      recentMessages: recentMessages.reverse(), // Chronological order
    };
  } catch (err) {
    logger.error('Conversation history query error', { error: err.message, phoneNumber });
    return {
      totalMessages: 0,
      isReturningUser: false,
      isFirstContact: true,
      error: err.message,
    };
  }
}

/**
 * Get user profile and activity statistics
 * 
 * @param {object} user - User object from users table
 * @returns {object} User profile details
 */
function getUserProfile(user) {
  const profile = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.created_at,
  };

  try {
    if (user.role === 'jobseeker') {
      // Get jobseeker activity stats
      const activity = db.prepare(`
        SELECT
          (SELECT COUNT(*) FROM applications WHERE user_id = ?) as applications_count,
          (SELECT COUNT(*) FROM applications WHERE user_id = ? AND status = 'pending') as pending_applications,
          (SELECT COUNT(*) FROM saved_jobs WHERE user_id = ?) as saved_jobs_count,
          (SELECT COUNT(*) FROM job_alerts WHERE user_id = ? AND active = 1) as active_alerts
      `).get(user.id, user.id, user.id, user.id);

      profile.activity = activity;
      profile.hasApplied = activity.applications_count > 0;
      profile.hasPendingApplications = activity.pending_applications > 0;
    } else if (user.role === 'employer') {
      // Get employer activity stats
      const activity = db.prepare(`
        SELECT
          (SELECT COUNT(*) FROM jobs WHERE company_id = ? AND status = 'active') as active_jobs,
          (SELECT COUNT(*) FROM jobs WHERE company_id = ?) as total_jobs,
          (SELECT COUNT(*) FROM applications a 
           JOIN jobs j ON a.job_id = j.id 
           WHERE j.company_id = ?) as total_applications,
          (SELECT COUNT(*) FROM applications a 
           JOIN jobs j ON a.job_id = j.id 
           WHERE j.company_id = ? AND a.status = 'pending') as pending_applications
      `).get(user.id, user.id, user.id, user.id);

      profile.activity = activity;
      profile.hasActiveJobs = activity.active_jobs > 0;
      profile.hasApplications = activity.total_applications > 0;
    }
  } catch (err) {
    logger.error('User profile query error', { error: err.message, userId: user.id });
    profile.activityError = err.message;
  }

  return profile;
}

/**
 * Get onboarding state from WhatsApp session
 * 
 * @param {object|null} session - WhatsApp session
 * @returns {object} Onboarding state details
 */
function getOnboardingState(session) {
  if (!session) {
    return {
      state: 'new',
      greeted: false,
      roleIdentified: false,
    };
  }

  return {
    state: session.onboarding_state || 'new',
    greeted: !!session.greeted,
    greetedAt: session.last_greeting_at,
    roleIdentified: !!session.user_role,
    identifiedRole: session.user_role,
  };
}

/**
 * Generate human-readable context summary for Jean AI system prompt
 * 
 * @param {object} context - Complete WhatsApp context
 * @returns {string} Human-readable summary
 */
function generateContextSummary(context) {
  const lines = [];

  // Registration status
  if (context.registration.status === 'not_registered') {
    lines.push('**User Status**: New WhatsApp user (not registered on WantokJobs).');
    lines.push('**Guidance**: When relevant, naturally explain registration benefits without forcing signup.');
  } else if (context.registration.status === 'registered_linked') {
    lines.push(`**User Status**: Registered ${context.registration.userRole} (${context.registration.userName}).`);
    lines.push('**Account**: Fully linked to WhatsApp. You have access to their complete profile.');
  } else if (context.registration.status === 'registered_not_linked') {
    lines.push(`**User Status**: Registered ${context.registration.userRole} but WhatsApp not linked yet.`);
    lines.push('**Guidance**: Offer to help link their account for easier communication.');
  }

  // Conversation history
  if (context.conversationHistory.isFirstContact) {
    lines.push('**Conversation History**: First-time WhatsApp conversation.');
    lines.push('**Approach**: Greet warmly, introduce yourself as Jean, explain your capabilities.');
  } else {
    lines.push(`**Conversation History**: Returning user - ${context.conversationHistory.totalMessages} previous messages.`);
    lines.push(`**Last Contact**: ${context.conversationHistory.lastInteraction}`);
    lines.push('**Approach**: Be familiar and context-aware. Reference previous conversations when relevant.');
  }

  // User activity (if registered)
  if (context.userProfile) {
    if (context.userProfile.role === 'jobseeker' && context.userProfile.activity) {
      const act = context.userProfile.activity;
      lines.push(`**Activity**: ${act.applications_count} applications, ${act.saved_jobs_count} saved jobs, ${act.active_alerts} alerts.`);
      if (act.pending_applications > 0) {
        lines.push(`**Insight**: User has ${act.pending_applications} pending applications - can offer status updates.`);
      }
    } else if (context.userProfile.role === 'employer' && context.userProfile.activity) {
      const act = context.userProfile.activity;
      lines.push(`**Activity**: ${act.active_jobs} active jobs, ${act.total_applications} total applications received.`);
      if (act.pending_applications > 0) {
        lines.push(`**Insight**: ${act.pending_applications} pending applications need review.`);
      }
    }
  }

  // Onboarding state
  if (!context.onboarding.greeted) {
    lines.push('**Onboarding**: User has NOT been greeted yet. Start with warm welcome.');
  }
  if (!context.onboarding.roleIdentified) {
    lines.push('**Role Detection**: User role NOT identified yet. Ask naturally if they are looking for a job or hiring.');
  } else {
    lines.push(`**Role**: User identified as ${context.onboarding.identifiedRole}.`);
  }

  // Join and return
  return lines.join('\n');
}

module.exports = {
  getWhatsAppContext,
};