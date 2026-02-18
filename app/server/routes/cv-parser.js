/**
 * CV Parser — Upload a CV (PDF/image) and extract structured profile data
 * Uses Groq AI (free tier) to parse CV text into structured fields.
 * 
 * POST /api/cv/parse - Upload CV file, get structured data back
 * POST /api/cv/apply - Parse CV and auto-fill profile
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const db = require('../database');
const logger = require('../utils/logger');

// Use the AI router for Groq access
let aiRouter;
try { aiRouter = require('../lib/ai-router'); } catch(e) { logger.error('AI router not available for CV parser'); }

const MAX_CV_TEXT_LENGTH = 10000;

/**
 * Extract structured profile from CV text using AI
 */
async function parseCV(cvText) {
  if (!aiRouter) throw new Error('AI router not available');
  
  const trimmedText = cvText.slice(0, MAX_CV_TEXT_LENGTH);
  
  const prompt = `You are a CV parser for a PNG job platform. Extract structured data from this CV/resume text.

Return ONLY a JSON object with these fields (use null for missing fields):
{
  "name": "Full Name",
  "headline": "Professional headline (e.g. 'Experienced Accountant')",
  "bio": "Brief professional summary (2-3 sentences)",
  "skills": ["skill1", "skill2", ...],
  "work_history": [
    {"title": "Job Title", "company": "Company Name", "start_year": 2020, "end_year": 2024, "description": "Brief description"}
  ],
  "education": [
    {"degree": "Degree Name", "field": "Field of Study", "institution": "University/College", "year": 2020}
  ],
  "location": "City, Province or Country",
  "phone": "Phone number if present",
  "email": "Email if present",
  "desired_job_type": "full-time|part-time|contract|casual",
  "experience_years": 5,
  "languages": ["English", "Tok Pisin"]
}

CV TEXT:
${trimmedText}`;

  const result = await aiRouter.route(prompt, {
    task: 'cv_parse',
    maxTokens: 2000,
    temperature: 0.1
  });

  // Extract JSON from response
  const text = typeof result === 'string' ? result : result.text || result.content || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI did not return valid JSON');
  
  return JSON.parse(jsonMatch[0]);
}

// POST /api/cv/parse — Parse CV text and return structured data (no auth required for preview)
router.post('/parse', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string' || text.trim().length < 50) {
      return res.status(400).json({ error: 'CV text must be at least 50 characters' });
    }
    
    const parsed = await parseCV(text.trim());
    
    res.json({
      success: true,
      data: parsed,
      source: 'ai',
      confidence: parsed.name ? 'high' : 'low'
    });
  } catch (error) {
    logger.error('CV parse error', { error: error.message });
    res.status(500).json({ error: 'Failed to parse CV: ' + error.message });
  }
});

// POST /api/cv/apply — Parse CV and update profile (auth required)
router.post('/apply', authenticateToken, requireRole('jobseeker'), async (req, res) => {
  try {
    const { text, overwrite = false } = req.body;
    
    if (!text || typeof text !== 'string' || text.trim().length < 50) {
      return res.status(400).json({ error: 'CV text must be at least 50 characters' });
    }
    
    const parsed = await parseCV(text.trim());
    
    // Get current profile
    const profile = db.prepare('SELECT * FROM profiles_jobseeker WHERE user_id = ?').get(req.user.id);
    if (!profile) {
      return res.status(404).json({ error: 'Jobseeker profile not found' });
    }
    
    // Build update — only fill empty fields unless overwrite=true
    const updates = {};
    
    if (parsed.headline && (overwrite || !profile.headline)) updates.headline = parsed.headline;
    if (parsed.bio && (overwrite || !profile.bio)) updates.bio = parsed.bio;
    if (parsed.skills && Array.isArray(parsed.skills) && parsed.skills.length > 0) {
      const existingSkills = safeJsonParse(profile.skills) || [];
      if (overwrite || existingSkills.length === 0) {
        updates.skills = JSON.stringify(parsed.skills);
      } else {
        // Merge skills
        const merged = [...new Set([...existingSkills, ...parsed.skills])];
        updates.skills = JSON.stringify(merged);
      }
    }
    if (parsed.work_history && (overwrite || !profile.work_history || profile.work_history === '[]')) {
      updates.work_history = JSON.stringify(parsed.work_history);
    }
    if (parsed.education && (overwrite || !profile.education || profile.education === '[]')) {
      updates.education = JSON.stringify(parsed.education);
    }
    if (parsed.location && (overwrite || !profile.location)) updates.location = parsed.location;
    if (parsed.desired_job_type && (overwrite || !profile.desired_job_type)) updates.desired_job_type = parsed.desired_job_type;
    if (parsed.phone && (overwrite || !profile.phone)) updates.phone = parsed.phone;
    
    // Apply updates
    if (Object.keys(updates).length > 0) {
      const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
      const values = [...Object.values(updates), req.user.id];
      db.prepare(`UPDATE profiles_jobseeker SET ${setClauses}, updated_at = datetime('now') WHERE user_id = ?`).run(...values);
      
      // Update user name if missing
      if (parsed.name) {
        const user = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
        if (!user.name || user.name === '') {
          db.prepare('UPDATE users SET name = ? WHERE id = ?').run(parsed.name, req.user.id);
        }
      }
      
      // Recalculate profile completeness
      const updatedProfile = db.prepare('SELECT * FROM profiles_jobseeker WHERE user_id = ?').get(req.user.id);
      const completeness = calculateCompleteness(updatedProfile);
      db.prepare('UPDATE profiles_jobseeker SET profile_complete = ? WHERE user_id = ?').run(completeness, req.user.id);
      
      logger.info('CV applied to profile', { userId: req.user.id, fields: Object.keys(updates).length });
    }
    
    res.json({
      success: true,
      fieldsUpdated: Object.keys(updates),
      parsed,
      message: Object.keys(updates).length > 0 
        ? `Updated ${Object.keys(updates).length} profile fields from your CV`
        : 'No new fields to update (profile already complete)'
    });
  } catch (error) {
    logger.error('CV apply error', { error: error.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to apply CV data: ' + error.message });
  }
});

function safeJsonParse(str) {
  try { return JSON.parse(str); } catch { return null; }
}

function calculateCompleteness(p) {
  let score = 0;
  if (p.bio) score += 15;
  if (p.skills && p.skills !== '[]') score += 20;
  if (p.work_history && p.work_history !== '[]') score += 25;
  if (p.education && p.education !== '[]') score += 20;
  if (p.cv_url) score += 10;
  if (p.phone) score += 5;
  if (p.location) score += 5;
  return score;
}

module.exports = router;
