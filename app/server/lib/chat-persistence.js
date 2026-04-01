/**
 * Jean AI Chat Persistence Service
 * Handles storing and retrieving chat sessions and messages
 *
 * UPDATED: Now uses jean_sessions and jean_messages tables (Migration 048)
 * Author: Agent Zero
 * Date: 2026-04-01
 */

const db = require('../database');
const { v4: uuidv4 } = require('uuid');

class ChatPersistenceService {
  /**
   * Create or get a chat session
   * @param {string} sessionId - Session token (UUID)
   * @param {string} platform - Platform: 'web', 'whatsapp', 'mobile'
   * @param {object} metadata - Additional session metadata (userId, etc.)
   */
  getOrCreateSession(sessionId, platform = 'web', metadata = {}) {
    try {
      // Check if session exists
      let session = db.prepare(
        'SELECT * FROM jean_sessions WHERE session_token = ?'
      ).get(sessionId);

      if (!session) {
        // Create new session
        const now = new Date().toISOString();
        const result = db.prepare(`
          INSERT INTO jean_sessions (
            user_id, session_token, platform, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?)
        `).run(
          metadata.userId || null,
          sessionId,
          platform,
          now,
          now
        );

        session = db.prepare(
          'SELECT * FROM jean_sessions WHERE id = ?'
        ).get(result.lastInsertRowid);
      } else {
        // Update last activity (updated_at)
        db.prepare(
          'UPDATE jean_sessions SET updated_at = ? WHERE id = ?'
        ).run(new Date().toISOString(), session.id);
      }

      return session;
    } catch (error) {
      console.error('Error getting/creating session:', error);
      throw error;
    }
  }

  /**
   * Save a chat message
   * @param {string} sessionId - Session token (UUID)
   * @param {string} role - 'user' or 'assistant'
   * @param {string} content - Message content
   * @param {object} metadata - Additional metadata (intent, confidence, tokens, etc.)
   */
  saveMessage(sessionId, role, content, metadata = {}) {
    try {
      const session = this.getOrCreateSession(sessionId, metadata.platform || 'web', metadata);

      // Build metadata JSON including tokens, model, response time
      const fullMetadata = {
        ...metadata,
        tokensUsed: metadata.tokensUsed || metadata.tokens_used || null,
        model: metadata.model || null,
        responseTime: metadata.responseTime || metadata.response_time_ms || null,
      };

      const result = db.prepare(`
        INSERT INTO jean_messages (
          session_id, role, content, intent, confidence, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        session.id,
        role,
        content,
        metadata.intent || null,
        metadata.confidence || null,
        JSON.stringify(fullMetadata),
        new Date().toISOString()
      );

      return result.lastInsertRowid;
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  }

  /**
   * Get conversation history for a session
   * @param {string} sessionId - Session token (UUID)
   * @param {number} limit - Maximum number of messages to return
   */
  getHistory(sessionId, limit = 20) {
    try {
      const session = db.prepare(
        'SELECT * FROM jean_sessions WHERE session_token = ?'
      ).get(sessionId);

      if (!session) {
        return [];
      }

      const messages = db.prepare(`
        SELECT * FROM jean_messages
        WHERE session_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `).all(session.id, limit);

      return messages.reverse();
    } catch (error) {
      console.error('Error getting history:', error);
      throw error;
    }
  }

  /**
   * Get session statistics
   * @param {string} sessionId - Session token (UUID)
   */
  getSessionStats(sessionId) {
    try {
      const session = db.prepare(
        'SELECT * FROM jean_sessions WHERE session_token = ?'
      ).get(sessionId);

      if (!session) {
        return null;
      }

      // Parse metadata to extract tokens and response times
      const stats = db.prepare(`
        SELECT
          COUNT(*) as message_count,
          SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as user_messages,
          SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) as assistant_messages
        FROM jean_messages
        WHERE session_id = ?
      `).get(session.id);

      // Calculate total tokens and avg response time from metadata JSON
      const messages = db.prepare(
        'SELECT metadata FROM jean_messages WHERE session_id = ? AND metadata IS NOT NULL'
      ).all(session.id);

      let totalTokens = 0;
      let totalResponseTime = 0;
      let responseCount = 0;

      messages.forEach(msg => {
        try {
          const meta = JSON.parse(msg.metadata);
          if (meta.tokensUsed) totalTokens += meta.tokensUsed;
          if (meta.responseTime) {
            totalResponseTime += meta.responseTime;
            responseCount++;
          }
        } catch (e) {}
      });

      return {
        session_id: sessionId,
        platform: session.platform,
        created_at: session.created_at,
        last_activity_at: session.updated_at,
        is_active: 1, // All sessions are active in new schema
        ...stats,
        total_tokens: totalTokens,
        avg_response_time: responseCount > 0 ? totalResponseTime / responseCount : null,
      };
    } catch (error) {
      console.error('Error getting session stats:', error);
      throw error;
    }
  }

  /**
   * Close a session (mark as inactive)
   * Note: jean_sessions doesn't have is_active field, so this is a no-op
   * Sessions are considered inactive after 2 hours (handled in jean/index.js)
   */
  closeSession(sessionId) {
    try {
      // No-op: jean_sessions doesn't have is_active field
      // Sessions expire based on updated_at timestamp (2 hour timeout in jean/index.js)
      return true;
    } catch (error) {
      console.error('Error closing session:', error);
      throw error;
    }
  }

  /**
   * Delete old sessions (cleanup)
   * @param {number} daysOld - Delete sessions older than this many days
   */
  cleanupOldSessions(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = db.prepare(`
        DELETE FROM jean_sessions
        WHERE updated_at < ?
      `).run(cutoffDate.toISOString());

      return result.changes;
    } catch (error) {
      console.error('Error cleaning up sessions:', error);
      throw error;
    }
  }
}

module.exports = new ChatPersistenceService();
