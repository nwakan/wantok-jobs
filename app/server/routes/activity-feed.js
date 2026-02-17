const express = require('express');
const router = express.Router();
const db = require('../database');

/**
 * GET /api/activity/feed
 * Returns recent public activity events for social proof
 * Privacy: first name + last initial only, no emails
 */
router.get('/feed', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    // Recent job postings (last 7 days)
    const recentJobs = db.prepare(`
      SELECT j.title, j.company_name, j.created_at, j.location,
             u.name as employer_name
      FROM jobs j
      LEFT JOIN users u ON j.employer_id = u.id
      WHERE j.status = 'active' 
        AND j.created_at > datetime('now', '-7 days')
      ORDER BY j.created_at DESC
      LIMIT ?
    `).all(limit);

    // Recent signups (last 7 days, non-spam)
    const recentSignups = db.prepare(`
      SELECT name, role, created_at
      FROM users
      WHERE COALESCE(account_status, 'active') != 'spam'
        AND created_at > datetime('now', '-7 days')
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit);

    // Recent applications (last 7 days)
    const recentApplications = db.prepare(`
      SELECT j.title as job_title, j.company_name, a.created_at
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.created_at > datetime('now', '-7 days')
        AND a.status != 'withdrawn'
      ORDER BY a.created_at DESC
      LIMIT ?
    `).all(limit);

    // Today's stats
    const todayStats = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM jobs WHERE status = 'active' AND created_at > datetime('now', '-24 hours')) as jobs_today,
        (SELECT COUNT(*) FROM users WHERE COALESCE(account_status,'active') != 'spam' AND created_at > datetime('now', '-24 hours')) as signups_today,
        (SELECT COUNT(*) FROM applications WHERE created_at > datetime('now', '-24 hours') AND status != 'withdrawn') as applications_today,
        (SELECT COUNT(*) FROM job_views WHERE viewed_at > datetime('now', '-24 hours')) as views_today
    `).get();

    // Build unified event feed
    const events = [];

    // Job postings — group by employer
    const employerJobs = {};
    for (const j of recentJobs) {
      const name = j.company_name || j.employer_name || 'A company';
      if (!employerJobs[name]) employerJobs[name] = { count: 0, latest: j.created_at, titles: [] };
      employerJobs[name].count++;
      if (employerJobs[name].titles.length < 2) employerJobs[name].titles.push(j.title);
    }
    for (const [name, data] of Object.entries(employerJobs)) {
      events.push({
        type: 'job_posted',
        icon: '🏢',
        text: data.count === 1 
          ? `${name} posted "${truncate(data.titles[0], 40)}"`
          : `${name} posted ${data.count} new jobs`,
        time: data.latest
      });
    }

    // Signups — privacy: first name + last initial
    for (const u of recentSignups) {
      const displayName = anonymizeName(u.name);
      const roleLabel = u.role === 'employer' ? 'as an employer' : 'as a job seeker';
      events.push({
        type: 'signup',
        icon: u.role === 'employer' ? '🏢' : '👤',
        text: `${displayName} joined ${roleLabel}`,
        time: u.created_at
      });
    }

    // Applications
    for (const a of recentApplications) {
      events.push({
        type: 'application',
        icon: '📋',
        text: `Someone applied to "${truncate(a.job_title, 40)}"`,
        time: a.created_at
      });
    }

    // Sort by time descending
    events.sort((a, b) => new Date(b.time) - new Date(a.time));

    res.json({
      events: events.slice(0, limit),
      stats: {
        jobsToday: todayStats.jobs_today || 0,
        signupsToday: todayStats.signups_today || 0,
        applicationsToday: todayStats.applications_today || 0,
        viewsToday: todayStats.views_today || 0,
      }
    });
  } catch (error) {
    console.error('Activity feed error:', error.message);
    res.status(500).json({ error: 'Failed to load activity feed' });
  }
});

function anonymizeName(name) {
  if (!name) return 'Someone';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '...' : str;
}

module.exports = router;
