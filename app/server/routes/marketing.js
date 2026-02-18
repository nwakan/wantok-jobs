/**
 * Marketing Dashboard API Routes
 * Provides access to Village Network marketing content and stats
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

// All marketing routes require admin or marketing role
router.use(authenticateToken);
router.use((req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'marketing') {
    return res.status(403).json({ error: 'Access denied. Admin or marketing role required.' });
  }
  next();
});

// GET /api/marketing/posts — List marketing posts with filters
router.get('/posts', (req, res) => {
  try {
    const { platform, status, date_from, date_to, report_type, limit = 50, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM marketing_posts WHERE 1=1';
    const params = [];
    
    if (platform) {
      query += ' AND platform = ?';
      params.push(platform);
    }
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    if (report_type) {
      query += ' AND report_type = ?';
      params.push(report_type);
    }
    
    if (date_from) {
      query += ' AND created_at >= ?';
      params.push(date_from);
    }
    
    if (date_to) {
      query += ' AND created_at <= ?';
      params.push(date_to);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const posts = db.prepare(query).all(...params);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM marketing_posts WHERE 1=1';
    const countParams = [];
    
    if (platform) {
      countQuery += ' AND platform = ?';
      countParams.push(platform);
    }
    
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    
    if (report_type) {
      countQuery += ' AND report_type = ?';
      countParams.push(report_type);
    }
    
    if (date_from) {
      countQuery += ' AND created_at >= ?';
      countParams.push(date_from);
    }
    
    if (date_to) {
      countQuery += ' AND created_at <= ?';
      countParams.push(date_to);
    }
    
    const { total } = db.prepare(countQuery).get(...countParams);
    
    res.json({
      success: true,
      posts,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Marketing posts fetch error', { error: error.message, requestId: req.id });
    res.status(500).json({ error: 'Failed to fetch marketing posts' });
  }
});

// GET /api/marketing/posts/:id — Get single post
router.get('/posts/:id', (req, res) => {
  try {
    const post = db.prepare('SELECT * FROM marketing_posts WHERE id = ?').get(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Include job details if job_id present
    if (post.job_id) {
      const job = db.prepare(`
        SELECT j.*, pe.company_name
        FROM jobs j
        LEFT JOIN profiles_employer pe ON j.employer_id = pe.user_id
        WHERE j.id = ?
      `).get(post.job_id);
      
      post.job = job;
    }
    
    res.json({ success: true, post });
  } catch (error) {
    logger.error('Marketing post fetch error', { error: error.message, id: req.params.id, requestId: req.id });
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// PUT /api/marketing/posts/:id — Edit/approve/reject a post
router.put('/posts/:id', (req, res) => {
  try {
    const { content, status, scheduled_at } = req.body;
    
    const post = db.prepare('SELECT * FROM marketing_posts WHERE id = ?').get(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const updates = [];
    const params = [];
    
    if (content !== undefined) {
      updates.push('content = ?');
      params.push(content);
    }
    
    if (status !== undefined) {
      if (!['pending', 'approved', 'rejected', 'published'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      updates.push('status = ?');
      params.push(status);
      
      // If publishing, set posted_at
      if (status === 'published') {
        updates.push("posted_at = datetime('now')");
      }
    }
    
    if (scheduled_at !== undefined) {
      updates.push('scheduled_at = ?');
      params.push(scheduled_at);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    params.push(req.params.id);
    
    db.prepare(`
      UPDATE marketing_posts
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...params);
    
    const updated = db.prepare('SELECT * FROM marketing_posts WHERE id = ?').get(req.params.id);
    
    res.json({ success: true, post: updated });
  } catch (error) {
    logger.error('Marketing post update error', { error: error.message, id: req.params.id, requestId: req.id });
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// POST /api/marketing/posts/:id/publish — Mark as published
router.post('/posts/:id/publish', (req, res) => {
  try {
    const post = db.prepare('SELECT * FROM marketing_posts WHERE id = ?').get(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    db.prepare(`
      UPDATE marketing_posts
      SET status = 'published', posted_at = datetime('now')
      WHERE id = ?
    `).run(req.params.id);
    
    const updated = db.prepare('SELECT * FROM marketing_posts WHERE id = ?').get(req.params.id);
    
    res.json({ success: true, post: updated });
  } catch (error) {
    logger.error('Marketing post publish error', { error: error.message, id: req.params.id, requestId: req.id });
    res.status(500).json({ error: 'Failed to publish post' });
  }
});

// DELETE /api/marketing/posts/:id — Delete a post
router.delete('/posts/:id', (req, res) => {
  try {
    const post = db.prepare('SELECT * FROM marketing_posts WHERE id = ?').get(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    db.prepare('DELETE FROM marketing_posts WHERE id = ?').run(req.params.id);
    
    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    logger.error('Marketing post delete error', { error: error.message, id: req.params.id, requestId: req.id });
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// GET /api/marketing/stats — Marketing overview stats
router.get('/stats', (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (date_from) {
      dateFilter += ' AND created_at >= ?';
      params.push(date_from);
    }
    
    if (date_to) {
      dateFilter += ' AND created_at <= ?';
      params.push(date_to);
    }
    
    // Posts by platform and status
    const postsByPlatform = db.prepare(`
      SELECT 
        platform,
        status,
        COUNT(*) as count
      FROM marketing_posts
      WHERE 1=1 ${dateFilter}
      GROUP BY platform, status
    `).all(...params);
    
    // Total posts this week
    const postsThisWeek = db.prepare(`
      SELECT COUNT(*) as count FROM marketing_posts
      WHERE created_at >= datetime('now', '-7 days')
    `).get().count;
    
    // Whispers sent
    const whispersSent = db.prepare(`
      SELECT COUNT(*) as count FROM whisper_queue
      WHERE status = 'sent' ${dateFilter}
    `).all(...params)[0]?.count || 0;
    
    const whispersPending = db.prepare(`
      SELECT COUNT(*) as count FROM whisper_queue
      WHERE status = 'pending'
    `).get().count;
    
    // Success stories
    const storiesCollected = db.prepare(`
      SELECT COUNT(*) as count FROM success_stories
      WHERE consent_given = 1 ${dateFilter}
    `).all(...params)[0]?.count || 0;
    
    const storiesPublished = db.prepare(`
      SELECT COUNT(*) as count FROM success_stories
      WHERE published = 1 ${dateFilter}
    `).all(...params)[0]?.count || 0;
    
    // Recent agent runs
    const recentRuns = db.prepare(`
      SELECT agent, status, started_at, completed_at, posts_generated, whispers_sent
      FROM marketing_runs
      ORDER BY started_at DESC
      LIMIT 10
    `).all();
    
    res.json({
      success: true,
      stats: {
        posts_this_week: postsThisWeek,
        posts_by_platform: postsByPlatform,
        whispers_sent: whispersSent,
        whispers_pending: whispersPending,
        stories_collected: storiesCollected,
        stories_published: storiesPublished,
      },
      recent_runs: recentRuns,
    });
  } catch (error) {
    logger.error('Marketing stats error', { error: error.message, requestId: req.id });
    res.status(500).json({ error: 'Failed to fetch marketing stats' });
  }
});

// GET /api/marketing/whispers — Whisper queue status
router.get('/whispers', (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        wq.*,
        u.name as user_name,
        u.email as user_email,
        j.title as job_title,
        pe.company_name
      FROM whisper_queue wq
      JOIN users u ON wq.user_id = u.id
      JOIN jobs j ON wq.job_id = j.id
      LEFT JOIN profiles_employer pe ON j.employer_id = pe.user_id
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      query += ' AND wq.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY wq.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const whispers = db.prepare(query).all(...params);
    
    // Get counts by status
    const counts = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM whisper_queue
      GROUP BY status
    `).all();
    
    res.json({
      success: true,
      whispers,
      counts: counts.reduce((acc, c) => ({ ...acc, [c.status]: c.count }), {}),
    });
  } catch (error) {
    logger.error('Whispers fetch error', { error: error.message, requestId: req.id });
    res.status(500).json({ error: 'Failed to fetch whispers' });
  }
});

// GET /api/marketing/stories — Success stories list
router.get('/stories', (req, res) => {
  try {
    const { consent_given, published, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        ss.*,
        u.name as user_name,
        j.title as job_title,
        pe.company_name
      FROM success_stories ss
      JOIN users u ON ss.user_id = u.id
      LEFT JOIN jobs j ON ss.job_id = j.id
      LEFT JOIN profiles_employer pe ON j.employer_id = pe.user_id
      WHERE 1=1
    `;
    const params = [];
    
    if (consent_given !== undefined) {
      query += ' AND ss.consent_given = ?';
      params.push(consent_given === 'true' || consent_given === '1' ? 1 : 0);
    }
    
    if (published !== undefined) {
      query += ' AND ss.published = ?';
      params.push(published === 'true' || published === '1' ? 1 : 0);
    }
    
    query += ' ORDER BY ss.collected_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const stories = db.prepare(query).all(...params);
    
    // Get counts
    const counts = db.prepare(`
      SELECT 
        SUM(CASE WHEN consent_given = 1 THEN 1 ELSE 0 END) as consented,
        SUM(CASE WHEN published = 1 THEN 1 ELSE 0 END) as published,
        COUNT(*) as total
      FROM success_stories
    `).get();
    
    res.json({
      success: true,
      stories,
      counts,
    });
  } catch (error) {
    logger.error('Success stories fetch error', { error: error.message, requestId: req.id });
    res.status(500).json({ error: 'Failed to fetch success stories' });
  }
});

// POST /api/marketing/run/:agent — Manually trigger an agent
router.post('/run/:agent', (req, res) => {
  try {
    const agent = req.params.agent;
    const allowedAgents = ['insider', 'market-reporter', 'whisper', 'success-stories', 'scorecard'];
    
    if (!allowedAgents.includes(agent)) {
      return res.status(400).json({ error: 'Invalid agent name' });
    }
    
    const agentPath = require('path').join(__dirname, '../../system/agents', `${agent}.js`);
    
    // Run async without blocking
    const { spawn } = require('child_process');
    const proc = spawn('node', [agentPath], { detached: true, stdio: 'ignore' });
    proc.unref();
    
    logger.info('Marketing agent triggered manually', { agent, user: req.user.id, requestId: req.id });
    
    res.json({ success: true, message: `${agent} agent started`, agent });
  } catch (error) {
    logger.error('Marketing agent trigger error', { error: error.message, requestId: req.id });
    res.status(500).json({ error: 'Failed to trigger agent' });
  }
});

module.exports = router;
