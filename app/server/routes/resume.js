const logger = require('../utils/logger');
const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const router = express.Router();

/**
 * GET /api/jobseeker/resume/preview
 * Get formatted profile data for resume preview
 */
router.get('/preview', authenticateToken, requireRole('jobseeker'), (req, res) => {
  try {
    const userId = req.user.id;

    // Get user basic info
    const user = db.prepare(`
      SELECT name, email, phone FROM users WHERE id = ?
    `).get(userId);

    // Get jobseeker profile
    const profile = db.prepare(`
      SELECT * FROM profiles_jobseeker WHERE user_id = ?
    `).get(userId);

    if (!user || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Parse JSON fields
    const skills = profile.skills ? JSON.parse(profile.skills) : [];
    const workHistory = profile.work_history ? JSON.parse(profile.work_history) : [];
    const education = profile.education ? JSON.parse(profile.education) : [];

    res.json({
      personal: {
        name: user.name,
        email: user.email,
        phone: user.phone || profile.phone,
        location: profile.location,
        country: profile.country,
        headline: profile.headline,
        bio: profile.bio
      },
      skills,
      workHistory,
      education,
      preferences: {
        desired_job_type: profile.desired_job_type,
        desired_salary_min: profile.desired_salary_min,
        desired_salary_max: profile.desired_salary_max,
        availability: profile.availability
      }
    });

  } catch (error) {
    logger.error('Resume preview error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch resume data' });
  }
});

/**
 * GET /api/jobseeker/resume/download
 * Generate and download a simple HTML resume
 */
router.get('/download', authenticateToken, requireRole('jobseeker'), (req, res) => {
  try {
    const userId = req.user.id;

    // Get user basic info
    const user = db.prepare(`
      SELECT name, email, phone FROM users WHERE id = ?
    `).get(userId);

    // Get jobseeker profile
    const profile = db.prepare(`
      SELECT * FROM profiles_jobseeker WHERE user_id = ?
    `).get(userId);

    if (!user || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Parse JSON fields
    const skills = profile.skills ? JSON.parse(profile.skills) : [];
    const workHistory = profile.work_history ? JSON.parse(profile.work_history) : [];
    const education = profile.education ? JSON.parse(profile.education) : [];

    // Generate clean HTML resume
    const html = generateResumeHTML({
      name: user.name,
      email: user.email,
      phone: user.phone || profile.phone,
      location: profile.location,
      country: profile.country,
      headline: profile.headline,
      bio: profile.bio,
      skills,
      workHistory,
      education
    });

    // Set headers for download
    const filename = `${user.name.replace(/\s+/g, '_')}_Resume.html`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(html);

  } catch (error) {
    logger.error('Resume download error', { error: error.message });
    res.status(500).json({ error: 'Failed to generate resume' });
  }
});

/**
 * Generate clean HTML resume
 */
function generateResumeHTML(data) {
  const {
    name,
    email,
    phone,
    location,
    country,
    headline,
    bio,
    skills,
    workHistory,
    education
  } = data;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} - Resume</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #fff;
    }
    header {
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    h1 {
      color: #1e40af;
      font-size: 32px;
      margin-bottom: 10px;
    }
    .headline {
      color: #6b7280;
      font-size: 18px;
      font-style: italic;
      margin-bottom: 15px;
    }
    .contact {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      color: #4b5563;
      font-size: 14px;
    }
    .contact span {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    section {
      margin-bottom: 30px;
    }
    h2 {
      color: #1e40af;
      font-size: 20px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 8px;
      margin-bottom: 15px;
    }
    .bio {
      color: #4b5563;
      margin-bottom: 20px;
    }
    .skills {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .skill {
      background: #e0e7ff;
      color: #1e40af;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 14px;
    }
    .experience-item,
    .education-item {
      margin-bottom: 20px;
      padding-left: 15px;
      border-left: 3px solid #e5e7eb;
    }
    .item-title {
      font-weight: 600;
      color: #1f2937;
      font-size: 16px;
    }
    .item-org {
      color: #6b7280;
      font-size: 14px;
      margin-bottom: 5px;
    }
    .item-period {
      color: #9ca3af;
      font-size: 13px;
      margin-bottom: 8px;
    }
    .item-description {
      color: #4b5563;
      font-size: 14px;
    }
    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <header>
    <h1>${name || 'Professional Resume'}</h1>
    ${headline ? `<div class="headline">${headline}</div>` : ''}
    <div class="contact">
      ${email ? `<span>📧 ${email}</span>` : ''}
      ${phone ? `<span>📱 ${phone}</span>` : ''}
      ${location && country ? `<span>📍 ${location}, ${country}</span>` : location ? `<span>📍 ${location}</span>` : ''}
    </div>
  </header>

  ${bio ? `
  <section>
    <h2>Professional Summary</h2>
    <div class="bio">${bio}</div>
  </section>
  ` : ''}

  ${skills && skills.length > 0 ? `
  <section>
    <h2>Skills</h2>
    <div class="skills">
      ${skills.map(skill => `<span class="skill">${skill}</span>`).join('')}
    </div>
  </section>
  ` : ''}

  ${workHistory && workHistory.length > 0 ? `
  <section>
    <h2>Work Experience</h2>
    ${workHistory.map(job => `
      <div class="experience-item">
        <div class="item-title">${job.title || 'Position'}</div>
        <div class="item-org">${job.company || 'Company'}</div>
        ${job.start_date || job.end_date ? `
          <div class="item-period">
            ${job.start_date || 'Start'} - ${job.end_date || 'Present'}
          </div>
        ` : ''}
        ${job.description ? `<div class="item-description">${job.description}</div>` : ''}
      </div>
    `).join('')}
  </section>
  ` : ''}

  ${education && education.length > 0 ? `
  <section>
    <h2>Education</h2>
    ${education.map(edu => `
      <div class="education-item">
        <div class="item-title">${edu.degree || 'Degree'}</div>
        <div class="item-org">${edu.institution || 'Institution'}</div>
        ${edu.year ? `<div class="item-period">${edu.year}</div>` : ''}
        ${edu.field ? `<div class="item-description">Field: ${edu.field}</div>` : ''}
      </div>
    `).join('')}
  </section>
  ` : ''}

  <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
    Resume generated from WantokJobs • ${new Date().toLocaleDateString()}
  </footer>
</body>
</html>`;
}

module.exports = router;
