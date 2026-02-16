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
        skills,
        work_history,
        education,
        cv_url,
        desired_job_type,
        desired_salary_min,
        desired_salary_max,
        availability
      } = req.body;

      // Check profile completeness
      const profile_complete = !!(phone && location && bio && skills?.length && cv_url);

      db.prepare(`
        UPDATE profiles_jobseeker SET
          phone = COALESCE(?, phone), location = COALESCE(?, location), 
          country = COALESCE(?, country), bio = COALESCE(?, bio),
          skills = COALESCE(?, skills), work_history = COALESCE(?, work_history), 
          education = COALESCE(?, education),
          cv_url = COALESCE(?, cv_url), desired_job_type = COALESCE(?, desired_job_type),
          desired_salary_min = COALESCE(?, desired_salary_min), 
          desired_salary_max = COALESCE(?, desired_salary_max),
          availability = COALESCE(?, availability), profile_complete = ?
        WHERE user_id = ?
      `).run(
        phone || null,
        location || null,
        country || null,
        bio || null,
        skills ? JSON.stringify(skills) : null,
        work_history ? JSON.stringify(work_history) : null,
        education ? JSON.stringify(education) : null,
        cv_url || null,
        desired_job_type || null,
        desired_salary_min || null,
        desired_salary_max || null,
        availability || null,
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

module.exports = router;
