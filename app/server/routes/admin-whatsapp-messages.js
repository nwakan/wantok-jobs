/**
 * Admin WhatsApp Messages Viewer API
 * 
 * Provides endpoints for viewing and managing WhatsApp message history
 * in the admin dashboard.
 * 
 * @date 2026-05-07
 */

const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');
const { authenticateToken, requireRole } = require('../middleware/auth');

const dbPath = path.join(__dirname, '../data/wantokjobs.db');

/**
 * GET /api/admin/whatsapp-messages/conversations
 * 
 * Retrieve list of WhatsApp conversations with metadata.
 * 
 * Query Parameters:
 * - page (number): Page number (default: 1)
 * - limit (number): Results per page (default: 20)
 * - search (string): Search by phone number, email, or name
 * - registered (boolean): Filter by registration status
 * - days (number): Filter by recent activity (e.g., last 7 days)
 * 
 * Response:
 * {
 *   conversations: [
 *     {
 *       phone_number: '+675XXXXXXXX',
 *       user_id: 123 | null,
 *       user_email: 'user@example.com' | null,
 *       user_name: 'John Doe' | null,
 *       user_role: 'jobseeker' | 'employer' | null,
 *       message_count: 25,
 *       last_message_at: '2026-05-07 09:30:00',
 *       first_message_at: '2026-05-06 14:20:00'
 *     }
 *   ],
 *   pagination: {
 *     page: 1,
 *     limit: 20,
 *     total: 50,
 *     pages: 3
 *   }
 * }
 */
router.get('/conversations', authenticateToken, requireRole('admin'), (req, res) => {
  const db = new Database(dbPath, { readonly: true });

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const registered = req.query.registered; // true, false, or undefined (all)
    const days = parseInt(req.query.days) || null;
    const offset = (page - 1) * limit;

    // Build WHERE clauses
    let whereClauses = [];
    let params = [];

    if (search) {
      whereClauses.push('(ws.phone_number LIKE ? OR u.email LIKE ? OR u.name LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (registered === 'true') {
      whereClauses.push('ws.user_id IS NOT NULL');
    } else if (registered === 'false') {
      whereClauses.push('ws.user_id IS NULL');
    }

    if (days) {
      whereClauses.push("jm.created_at >= datetime('now', '-' || ? || ' days')");
      params.push(days);
    }

    const whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    // Count total conversations
    const countQuery = `
      SELECT COUNT(DISTINCT ws.phone_number) AS total
      FROM whatsapp_sessions ws
      LEFT JOIN users u ON ws.user_id = u.id
      LEFT JOIN jean_sessions js ON js.platform_id = ws.id AND js.platform = 'whatsapp'
      LEFT JOIN jean_messages jm ON jm.session_id = js.id
      ${whereClause}
    `;

    const countResult = db.prepare(countQuery).get(...params);
    const total = countResult.total;
    const pages = Math.ceil(total / limit);

    // Retrieve conversations
    const query = `
      SELECT 
        ws.phone_number,
        ws.user_id,
        u.email AS user_email,
        u.name AS user_name,
        u.role AS user_role,
        COUNT(jm.id) AS message_count,
        MAX(jm.created_at) AS last_message_at,
        MIN(jm.created_at) AS first_message_at
      FROM whatsapp_sessions ws
      LEFT JOIN users u ON ws.user_id = u.id
      LEFT JOIN jean_sessions js ON js.platform_id = ws.id AND js.platform = 'whatsapp'
      LEFT JOIN jean_messages jm ON jm.session_id = js.id
      ${whereClause}
      GROUP BY ws.phone_number
      ORDER BY last_message_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);
    const conversations = db.prepare(query).all(...params);

    res.json({
      conversations,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    });
  } catch (error) {
    console.error('[Admin WhatsApp Messages] Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch WhatsApp conversations' });
  } finally {
    db.close();
  }
});

/**
 * GET /api/admin/whatsapp-messages/thread/:phone_number
 * 
 * Retrieve full message thread for a specific phone number.
 * 
 * Query Parameters:
 * - startDate (string): Filter messages after this date (ISO 8601)
 * - endDate (string): Filter messages before this date (ISO 8601)
 * - limit (number): Max messages to return (default: 100)
 * 
 * Response:
 * {
 *   phone_number: '+675XXXXXXXX',
 *   user: {
 *     id: 123,
 *     email: 'user@example.com',
 *     name: 'John Doe',
 *     role: 'jobseeker'
 *   } | null,
 *   messages: [
 *     {
 *       id: 1,
 *       role: 'user' | 'jean',
 *       content: 'Hello WantokJobs',
 *       intent: 'greeting',
 *       confidence: 0.95,
 *       created_at: '2026-05-07 09:30:00'
 *     }
 *   ],
 *   total_messages: 25
 * }
 */
router.get('/thread/:phone_number', authenticateToken, requireRole('admin'), (req, res) => {
  const db = new Database(dbPath, { readonly: true });

  try {
    const phoneNumber = req.params.phone_number;
    const startDate = req.query.startDate || null;
    const endDate = req.query.endDate || null;
    const limit = parseInt(req.query.limit) || 100;

    // Build WHERE clauses for date filtering
    let whereClauses = ['ws.phone_number = ?'];
    let params = [phoneNumber];

    if (startDate) {
      whereClauses.push('jm.created_at >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereClauses.push('jm.created_at <= ?');
      params.push(endDate);
    }

    const whereClause = whereClauses.join(' AND ');

    // Get user info (if registered)
    const userQuery = `
      SELECT u.id, u.email, u.name, u.role
      FROM whatsapp_sessions ws
      LEFT JOIN users u ON ws.user_id = u.id
      WHERE ws.phone_number = ?
    `;
    const userResult = db.prepare(userQuery).get(phoneNumber);

    // Get messages
    const messagesQuery = `
      SELECT 
        jm.id,
        jm.role,
        jm.content,
        jm.intent,
        jm.confidence,
        datetime(jm.created_at, 'localtime') AS created_at
      FROM jean_messages jm
      JOIN jean_sessions js ON jm.session_id = js.id
      JOIN whatsapp_sessions ws ON js.platform_id = ws.id AND js.platform = 'whatsapp'
      WHERE ${whereClause}
      ORDER BY jm.created_at ASC
      LIMIT ?
    `;

    params.push(limit);
    const messages = db.prepare(messagesQuery).all(...params);

    // Count total messages (without limit)
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM jean_messages jm
      JOIN jean_sessions js ON jm.session_id = js.id
      JOIN whatsapp_sessions ws ON js.platform_id = ws.id AND js.platform = 'whatsapp'
      WHERE ws.phone_number = ?
    `;
    const countResult = db.prepare(countQuery).get(phoneNumber);

    res.json({
      phone_number: phoneNumber,
      user: userResult && userResult.id ? {
        id: userResult.id,
        email: userResult.email,
        name: userResult.name,
        role: userResult.role
      } : null,
      messages,
      total_messages: countResult.total
    });
  } catch (error) {
    console.error('[Admin WhatsApp Messages] Error fetching message thread:', error);
    res.status(500).json({ error: 'Failed to fetch WhatsApp message thread' });
  } finally {
    db.close();
  }
});

/**
 * GET /api/admin/whatsapp-messages/stats
 * 
 * Retrieve WhatsApp usage statistics.
 * 
 * Response:
 * {
 *   total_conversations: 50,
 *   total_messages: 437,
 *   registered_users: 30,
 *   non_registered_users: 20,
 *   active_24h: 5,
 *   active_7d: 15,
 *   active_30d: 35,
 *   messages_by_day: [
 *     { date: '2026-05-07', count: 25 },
 *     { date: '2026-05-06', count: 30 }
 *   ]
 * }
 */
router.get('/stats', authenticateToken, requireRole('admin'), (req, res) => {
  const db = new Database(dbPath, { readonly: true }
);

  try {
    // Total conversations
    const totalConversationsQuery = `
      SELECT COUNT(DISTINCT ws.phone_number) AS total
      FROM whatsapp_sessions ws
    `;
    const totalConversations = db.prepare(totalConversationsQuery).get().total;

    // Total messages
    const totalMessagesQuery = `
      SELECT COUNT(*) AS total
      FROM jean_messages jm
      JOIN jean_sessions js ON jm.session_id = js.id
      WHERE js.platform = 'whatsapp'
    `;
    const totalMessages = db.prepare(totalMessagesQuery).get().total;

    // Registered vs non-registered users
    const registeredUsersQuery = `
      SELECT 
        SUM(CASE WHEN user_id IS NOT NULL THEN 1 ELSE 0 END) AS registered,
        SUM(CASE WHEN user_id IS NULL THEN 1 ELSE 0 END) AS non_registered
      FROM whatsapp_sessions
    `;
    const userStats = db.prepare(registeredUsersQuery).get();

    // Active users (24h, 7d, 30d)
    const active24hQuery = `
      SELECT COUNT(DISTINCT ws.phone_number) AS active
      FROM whatsapp_sessions ws
      JOIN jean_sessions js ON js.platform_id = ws.id AND js.platform = 'whatsapp'
      JOIN jean_messages jm ON jm.session_id = js.id
      WHERE jm.created_at >= datetime('now', '-1 day')
    `;
    const active24h = db.prepare(active24hQuery).get().active;

    const active7dQuery = `
      SELECT COUNT(DISTINCT ws.phone_number) AS active
      FROM whatsapp_sessions ws
      JOIN jean_sessions js ON js.platform_id = ws.id AND js.platform = 'whatsapp'
      JOIN jean_messages jm ON jm.session_id = js.id
      WHERE jm.created_at >= datetime('now', '-7 days')
    `;
    const active7d = db.prepare(active7dQuery).get().active;

    const active30dQuery = `
      SELECT COUNT(DISTINCT ws.phone_number) AS active
      FROM whatsapp_sessions ws
      JOIN jean_sessions js ON js.platform_id = ws.id AND js.platform = 'whatsapp'
      JOIN jean_messages jm ON jm.session_id = js.id
      WHERE jm.created_at >= datetime('now', '-30 days')
    `;
    const active30d = db.prepare(active30dQuery).get().active;

    // Messages by day (last 7 days)
    const messagesByDayQuery = `
      SELECT 
        DATE(jm.created_at) AS date,
        COUNT(*) AS count
      FROM jean_messages jm
      JOIN jean_sessions js ON jm.session_id = js.id
      WHERE js.platform = 'whatsapp'
        AND jm.created_at >= datetime('now', '-7 days')
      GROUP BY DATE(jm.created_at)
      ORDER BY date DESC
    `;
    const messagesByDay = db.prepare(messagesByDayQuery).all();

    res.json({
      total_conversations: totalConversations,
      total_messages: totalMessages,
      registered_users: userStats.registered || 0,
      non_registered_users: userStats.non_registered || 0,
      active_24h: active24h,
      active_7d: active7d,
      active_30d: active30d,
      messages_by_day: messagesByDay
    });
  } catch (error) {
    console.error('[Admin WhatsApp Messages] Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch WhatsApp statistics' });
  } finally {
    db.close();
  }
});

module.exports = router;