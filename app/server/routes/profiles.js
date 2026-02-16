const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get own profile
router.get('/', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, email, role, name FROM users WHERE id = ?').get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let profile = null;

    if (user.role === 'jobseeker') {
      profile = db.prepare('SELECT * FROM profiles_jobseeker WHERE user_id = ?').get(req.user.id);
    } else if (user.role === 'employer') {
      profile = db.prepare('SELECT * FROM profiles_employer WHERE user_id = ?').get(req.user.id);
    }

    res.json({ user, profile });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update own profile
router.put('/', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'jobseeker') {
      const {
        phone,
        location,
        country,
        bio,
        headline,
        skills,
        top_skills,
        work_history,
        education,
        languages,
        certifications,
        volunteer,
        projects,
        awards,
        featured,
        cv_url,
        profile_photo_url,
        profile_banner_url,
        profile_video_url,
        desired_job_type,
        desired_salary_min,
        desired_salary_max,
        availability,
        open_to_work,
        profile_visibility,
        profile_slug,
        social_links
      } = req.body;

      // Check profile completeness
      const profile_complete = !!(phone && location && bio && skills?.length && cv_url);

      // Check if profile_slug is unique (if provided)
      if (profile_slug) {
        const existing = db.prepare('SELECT user_id FROM profiles_jobseeker WHERE profile_slug = ? AND user_id != ?').get(profile_slug, req.user.id);
        if (existing) {
          return res.status(400).json({ error: 'Profile URL already taken' });
        }
      }

      db.prepare(`
        UPDATE profiles_jobseeker SET
          phone = COALESCE(?, phone), 
          location = COALESCE(?, location), 
          country = COALESCE(?, country), 
          bio = COALESCE(?, bio),
          headline = COALESCE(?, headline),
          skills = COALESCE(?, skills), 
          top_skills = COALESCE(?, top_skills),
          work_history = COALESCE(?, work_history), 
          education = COALESCE(?, education),
          languages = COALESCE(?, languages),
          certifications = COALESCE(?, certifications),
          volunteer = COALESCE(?, volunteer),
          projects = COALESCE(?, projects),
          awards = COALESCE(?, awards),
          featured = COALESCE(?, featured),
          cv_url = COALESCE(?, cv_url),
          profile_photo_url = COALESCE(?, profile_photo_url),
          profile_banner_url = COALESCE(?, profile_banner_url),
          profile_video_url = COALESCE(?, profile_video_url),
          desired_job_type = COALESCE(?, desired_job_type),
          desired_salary_min = COALESCE(?, desired_salary_min), 
          desired_salary_max = COALESCE(?, desired_salary_max),
          availability = COALESCE(?, availability),
          open_to_work = COALESCE(?, open_to_work),
          profile_visibility = COALESCE(?, profile_visibility),
          profile_slug = COALESCE(?, profile_slug),
          social_links = COALESCE(?, social_links),
          profile_complete = ?
        WHERE user_id = ?
      `).run(
        phone || null,
        location || null,
        country || null,
        bio || null,
        headline || null,
        skills || null,
        top_skills || null,
        work_history || null,
        education || null,
        languages || null,
        certifications || null,
        volunteer || null,
        projects || null,
        awards || null,
        featured || null,
        cv_url || null,
        profile_photo_url || null,
        profile_banner_url || null,
        profile_video_url || null,
        desired_job_type || null,
        desired_salary_min || null,
        desired_salary_max || null,
        availability || null,
        open_to_work !== undefined ? open_to_work : null,
        profile_visibility || null,
        profile_slug || null,
        social_links || null,
        profile_complete ? 1 : 0,
        req.user.id
      );

      const updated = db.prepare('SELECT * FROM profiles_jobseeker WHERE user_id = ?').get(req.user.id);
      res.json(updated);

    } else if (user.role === 'employer') {
      const {
        company_name,
        industry,
        company_size,
        location,
        country,
        website,
        logo_url,
        description
      } = req.body;

      db.prepare(`
        UPDATE profiles_employer SET
          company_name = ?, industry = ?, company_size = ?,
          location = ?, country = ?, website = ?,
          logo_url = ?, description = ?
        WHERE user_id = ?
      `).run(
        company_name,
        industry,
        company_size,
        location,
        country,
        website,
        logo_url,
        description,
        req.user.id
      );

      const updated = db.prepare('SELECT * FROM profiles_employer WHERE user_id = ?').get(req.user.id);
      res.json(updated);

    } else {
      return res.status(400).json({ error: 'Admin users do not have profiles' });
    }
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get public profile (limited fields)
router.get('/:userId', (req, res) => {
  try {
    const user = db.prepare('SELECT id, role, name FROM users WHERE id = ?').get(req.params.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let profile = null;

    if (user.role === 'jobseeker') {
      // Only public info
      profile = db.prepare(`
        SELECT location, country, bio, skills, work_history, education, desired_job_type, availability
        FROM profiles_jobseeker WHERE user_id = ?
      `).get(req.params.userId);
    } else if (user.role === 'employer') {
      profile = db.prepare(`
        SELECT company_name, industry, company_size, location, country, website, logo_url, description, verified
        FROM profiles_employer WHERE user_id = ?
      `).get(req.params.userId);
    }

    res.json({ user, profile });
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Get profile views analytics
router.get('/views-analytics', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;

    // Only jobseekers have profile views
    if (req.user.role !== 'jobseeker') {
      return res.json({ today: 0, week: 0, trend: 'stable' });
    }

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

    // Also update the profile_views counter in profiles_jobseeker
    db.prepare(`
      UPDATE profiles_jobseeker 
      SET profile_views = ?
      WHERE user_id = ?
    `).run(week.count, userId);

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

module.exports = router;
