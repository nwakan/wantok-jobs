/**
 * Jean AI Chat Persistence Service
 * Handles storing and retrieving chat sessions and messages
 * 
 * FIXED: Converted from Knex to better-sqlite3 syntax
 * Author: Agent Zero (Top-notch Developer Mode)
 * Date: 2026-03-24
 */

const db = require('../database');
const { v4: uuidv4 } = require('uuid');

class ChatPersistenceService {
  /**
   * Create or get a chat session
   */
  getOrCreateSession(sessionId, platform = 'web', metadata = {}) {
    try {
      // Check if session exists
      let session = db.prepare(
        'SELECT * FROM chat_sessions WHERE session_id = ?'
      ).get(sessionId);

      if (!session) {
        // Create new session
        const now = new Date().toISOString();
        const result = db.prepare(`
          INSERT INTO chat_sessions (
            session_id, platform, metadata, created_at, last_activity_at, is_active
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          sessionId,
          platform,
          JSON.stringify(metadata),
          now,
          now,
          1
        );

        session = db.prepare(
          'SELECT * FROM chat_sessions WHERE id = ?'
        ).get(result.lastInsertRowid);
      } else {
        // Update last activity
        db.prepare(
          'UPDATE chat_sessions SET last_activity_at = ? WHERE id = ?'
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
   */
  saveMessage(sessionId, role, content, metadata = {}) {
    try {
      const session = this.getOrCreateSession(sessionId);

      const result = db.prepare(`
        INSERT INTO chat_messages (
          session_id, role, content, intent, confidence, metadata,
          tokens_used, model, response_time_ms, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        session.id,
        role,
        content,
        metadata.intent || null,
        metadata.confidence || null,
        JSON.stringify(metadata),
        metadata.tokensUsed || null,
        metadata.model || null,
        metadata.responseTime || null,
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
   */
  getHistory(sessionId, limit = 20) {
    try {
      const session = db.prepare(
        'SELECT * FROM chat_sessions WHERE session_id = ?'
      ).get(sessionId);

      if (!session) {
        return [];
      }

      const messages = db.prepare(`
        SELECT * FROM chat_messages
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
   */
  getSessionStats(sessionId) {
    try {
      const session = db.prepare(
        'SELECT * FROM chat_sessions WHERE session_id = ?'
      ).get(sessionId);

      if (!session) {
        return null;
      }

      const stats = db.prepare(`
        SELECT 
          COUNT(*) as message_count,
          SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as user_messages,
          SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) as assistant_messages,
          SUM(tokens_used) as total_tokens,
          AVG(response_time_ms) as avg_response_time
        FROM chat_messages
        WHERE session_id = ?
      `).get(session.id);

      return {
        session_id: sessionId,
        platform: session.platform,
        created_at: session.created_at,
        last_activity_at: session.last_activity_at,
        is_active: session.is_active,
        ...stats
      };
    } catch (error) {
      console.error('Error getting session stats:', error);
      throw error;
    }
  }

  /**
   * Close a session
   */
  closeSession(sessionId) {
    try {
      db.prepare(
        'UPDATE chat_sessions SET is_active = 0 WHERE session_id = ?'
      ).run(sessionId);
      return true;
    } catch (error) {
      console.error('Error closing session:', error);
      throw error;
    }
  }

  /**
   * Delete old sessions (cleanup)
   */
  cleanupOldSessions(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = db.prepare(`
        DELETE FROM chat_sessions
        WHERE is_active = 0
        AND last_activity_at < ?
      `).run(cutoffDate.toISOString());

      return result.changes;
    } catch (error) {
      console.error('Error cleaning up sessions:', error);
      throw error;
    }
  }
}

module.exports = new ChatPersistenceService();
