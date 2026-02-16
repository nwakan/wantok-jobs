const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');
const { authenticateToken, requireJobseeker } = require('../middleware/auth');

const db = new Database(path.join(__dirname, '../data/wantokjobs.db'));

// Profile views analytics for jobseeker
router.get('/profile-views', authenticateToken, requireJobseeker, (req, res) => {
  try {
    const userId = req.user.id;

    // Get profile views from activity_log (when employers view jobseeker profiles)
    const today = db.prepare(`
      SELECT COUNT(*) as count
      FROM activity_log
      WHERE entity_type = 'profile'
        AND entity_id = ?
        AND action = 'profile_view'
        AND date(created_at) = date('now')
    `).get(userId);

    const week = db.prepare(`
      SELECT COUNT(*) as count
      FROM activity_log
      WHERE entity_type = 'profile'
        AND entity_id = ?
        AND action = 'profile_view'
        AND created_at >= datetime('now', '-7 days')
    `).get(userId);

    const lastWeek = db.prepare(`
      SELECT COUNT(*) as count
      FROM activity_log
      WHERE entity_type = 'profile'
        AND entity_id = ?
        AND action = 'profile_view'
        AND created_at >= datetime('now', '-14 days')
        AND created_at < datetime('now', '-7 days')
    `).get(userId);

    // Determine trend
    let trend = 'stable';
    if (week.count > lastWeek.count * 1.1) trend = 'up';
    else if (week.count < lastWeek.count * 0.9) trend = 'down';

    res.json({
      today: today.count,
      week: week.count,
      trend
    });
  } catch (error) {
    console.error('Profile views analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch profile views' });
  }
});

// Salary insights based on jobseeker's desired role
router.get('/salary', authenticateToken, requireJobseeker, (req, res) => {
  try {
    const userId = req.user.id;

    // Get jobseeker's desired job type or most recent application
    const profile = db.prepare(`
      SELECT desired_job_type, headline
      FROM profiles_jobseeker
      WHERE user_id = ?
    `).get(userId);

    if (!profile) {
      return res.json(null);
    }

    // Try to extract role from headline (e.g., "Senior Software Developer")
    const headline = profile.headline || '';
    
    // For simplicity, get salary stats for jobs matching keywords in headline
    const keywords = headline.split(' ').filter(w => w.length > 4).slice(0, 2); // Take first 2 significant words
    
    if (keywords.length === 0) {
      return res.json(null);
    }

    // Build search condition
    const searchCondition = keywords.map(() => `title LIKE ?`).join(' OR ');
    const searchParams = keywords.map(k => `%${k}%`);

    const salaryStats = db.prepare(`
      SELECT 
        COUNT(*) as job_count,
        AVG((salary_min + salary_max) / 2) as avg_salary,
        MIN(salary_min) as min_salary,
        MAX(salary_max) as max_salary
      FROM jobs
      WHERE status = 'active'
        AND salary_min IS NOT NULL
        AND salary_max IS NOT NULL
        AND (${searchCondition})
    `).get(...searchParams);

    if (!salaryStats || salaryStats.job_count === 0) {
      return res.json(null);
    }

    res.json({
      role_name: keywords.join(' '),
      avg: Math.round(salaryStats.avg_salary),
      min: Math.round(salaryStats.min_salary),
      max: Math.round(salaryStats.max_salary),
      job_count: salaryStats.job_count
    });
  } catch (error) {
    console.error('Salary insights error:', error);
    res.status(500).json({ error: 'Failed to fetch salary insights' });
  }
});

module.exports = router;
