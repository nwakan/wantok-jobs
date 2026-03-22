/**
 * Jean AI Chat Persistence Service
 * Handles storing and retrieving chat sessions and messages
 * 
 * Author: Agent Zero (Top-notch Developer Mode)
 * Date: 2026-03-22
 */

const db = require('../database');
const { v4: uuidv4 } = require('uuid');

class ChatPersistenceService {
  /**
   * Create or get a chat session
   */
  async getOrCreateSession(sessionId, platform = 'web', metadata = {}) {
    try {
      // Check if session exists
      let session = await db('chat_sessions')
        .where({ session_id: sessionId })
        .first();

      if (!session) {
        // Create new session
        const [id] = await db('chat_sessions').insert({
          session_id: sessionId,
          platform: platform,
          metadata: JSON.stringify(metadata),
          created_at: new Date(),
          last_activity_at: new Date(),
          is_active: true,
        });

        session = await db('chat_sessions').where({ id }).first();
      } else {
        // Update last activity
        await db('chat_sessions')
          .where({ id: session.id })
          .update({ last_activity_at: new Date() });
      }

      return session;
    } catch (error) {
      console.error('Error getting/creating session:', error);
      throw error;
    }
  }

  /**
   * Save a chat message
   */
  async saveMessage(sessionId, role, content, metadata = {}) {
    try {
      const session = await this.getOrCreateSession(sessionId);

      const [messageId] = await db('chat_messages').insert({
        session_id: session.id,
        role: role,
        content: content,
        intent: metadata.intent || null,
        confidence: metadata.confidence || null,
        metadata: JSON.stringify(metadata),
        tokens_used: metadata.tokensUsed || null,
        model: metadata.model || null,
        response_time_ms: metadata.responseTime || null,
        created_at: new Date(),
      });

      return messageId;
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  }

  /**
   * Get conversation history for a session
   */
  async getHistory(sessionId, limit = 20) {
    try {
      const session = await db('chat_sessions')
        .where({ session_id: sessionId })
        .first();

      if (!session) {
        return [];
      }

      const messages = await db('chat_messages')
        .where({ session_id: session.id })
        .orderBy('created_at', 'desc')
        .limit(limit)
        .select('role', 'content', 'created_at', 'intent', 'confidence');

      // Return in chronological order
      return messages.reverse();
    } catch (error) {
      console.error('Error getting history:', error);
      return [];
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(sessionId) {
    try {
      const session = await db('chat_sessions')
        .where({ session_id: sessionId })
        .first();

      if (!session) {
        return null;
      }

      const stats = await db('chat_messages')
        .where({ session_id: session.id })
        .select(
          db.raw('COUNT(*) as message_count'),
          db.raw('SUM(tokens_used) as total_tokens'),
          db.raw('AVG(response_time_ms) as avg_response_time')
        )
        .first();

      return {
        session_id: sessionId,
        created_at: session.created_at,
        last_activity: session.last_activity_at,
        message_count: stats.message_count || 0,
        total_tokens: stats.total_tokens || 0,
        avg_response_time: stats.avg_response_time || 0,
      };
    } catch (error) {
      console.error('Error getting session stats:', error);
      return null;
    }
  }

  /**
   * Close/deactivate a session
   */
  async closeSession(sessionId) {
    try {
      await db('chat_sessions')
        .where({ session_id: sessionId })
        .update({ is_active: false });
    } catch (error) {
      console.error('Error closing session:', error);
    }
  }

  /**
   * Clean up old inactive sessions (data retention)
   */
  async cleanupOldSessions(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const deletedCount = await db('chat_sessions')
        .where('is_active', false)
        .where('last_activity_at', '<', cutoffDate)
        .delete();

      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old sessions:', error);
      return 0;
    }
  }
}

module.exports = new ChatPersistenceService();
