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

/**
 * GET /api/jobseeker/resume/templates
 * List available resume templates
 */
router.get('/templates', authenticateToken, requireRole('jobseeker'), (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'professional', name: 'Professional', description: 'Clean and modern — great for corporate roles', color: '#2563eb' },
      { id: 'creative', name: 'Creative', description: 'Bold layout — suits marketing, design, and media', color: '#7c3aed' },
      { id: 'minimal', name: 'Minimal', description: 'Simple and elegant — works for any industry', color: '#374151' },
    ]
  });
});

/**
 * GET /api/jobseeker/resume/download/:template
 * Download resume with a specific template style
 */
router.get('/download/:template', authenticateToken, requireRole('jobseeker'), (req, res) => {
  try {
    const userId = req.user.id;
    const template = req.params.template || 'professional';

    // Validate template
    const validTemplates = ['professional', 'creative', 'minimal'];
    if (!validTemplates.includes(template)) {
      return res.status(400).json({ success: false, error: 'Invalid template. Choose: professional, creative, or minimal' });
    }

    const user = db.prepare('SELECT name, email, phone FROM users WHERE id = ?').get(userId);
    const profile = db.prepare('SELECT * FROM profiles_jobseeker WHERE user_id = ?').get(userId);

    if (!user || !profile) {
      return res.status(404).json({ success: false, error: 'Profile not found. Complete your profile first.' });
    }

    const skills = profile.skills ? JSON.parse(profile.skills) : [];
    const workHistory = profile.work_history ? JSON.parse(profile.work_history) : [];
    const education = profile.education ? JSON.parse(profile.education) : [];

    const data = {
      name: user.name,
      email: user.email,
      phone: user.phone || profile.phone,
      location: profile.location,
      country: profile.country,
      headline: profile.headline,
      bio: profile.bio,
      skills,
      workHistory,
      education,
    };

    let html;
    switch (template) {
      case 'creative':
        html = generateCreativeResumeHTML(data);
        break;
      case 'minimal':
        html = generateMinimalResumeHTML(data);
        break;
      default:
        html = generateResumeHTML(data);
    }

    const filename = `${user.name.replace(/\s+/g, '_')}_Resume_${template}.html`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(html);

  } catch (error) {
    logger.error('Resume template download error', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to generate resume' });
  }
});

/**
 * Creative resume template — bold sidebar layout
 */
function generateCreativeResumeHTML(data) {
  const { name, email, phone, location, country, headline, bio, skills, workHistory, education } = data;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} - Resume</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; line-height: 1.6; color: #333; background: #fff; }
    .container { display: flex; max-width: 900px; margin: 0 auto; min-height: 100vh; }
    .sidebar { width: 280px; background: linear-gradient(180deg, #7c3aed 0%, #5b21b6 100%); color: #fff; padding: 40px 24px; flex-shrink: 0; }
    .main { flex: 1; padding: 40px 32px; }
    .sidebar h1 { font-size: 28px; margin-bottom: 6px; }
    .sidebar .headline { font-size: 14px; opacity: 0.9; margin-bottom: 24px; font-style: italic; }
    .sidebar h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; margin: 24px 0 12px; opacity: 0.8; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 6px; }
    .sidebar .contact-item { font-size: 13px; margin-bottom: 8px; opacity: 0.9; }
    .sidebar .skill-tag { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 12px; font-size: 12px; margin: 3px 2px; }
    .main h2 { color: #7c3aed; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 1px; }
    .main section { margin-bottom: 28px; }
    .bio { color: #4b5563; margin-bottom: 24px; font-size: 15px; }
    .exp-item { margin-bottom: 18px; padding-left: 14px; border-left: 3px solid #7c3aed; }
    .exp-title { font-weight: 600; color: #1f2937; font-size: 15px; }
    .exp-org { color: #7c3aed; font-size: 14px; font-weight: 500; }
    .exp-period { color: #9ca3af; font-size: 12px; margin-bottom: 4px; }
    .exp-desc { color: #4b5563; font-size: 13px; }
    @media print { .container { min-height: auto; } body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="sidebar">
      <h1>${name || 'Your Name'}</h1>
      ${headline ? `<div class="headline">${headline}</div>` : ''}
      
      <h3>Contact</h3>
      ${email ? `<div class="contact-item">📧 ${email}</div>` : ''}
      ${phone ? `<div class="contact-item">📱 ${phone}</div>` : ''}
      ${location ? `<div class="contact-item">📍 ${location}${country ? `, ${country}` : ''}</div>` : ''}
      
      ${skills.length > 0 ? `
        <h3>Skills</h3>
        <div>${skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}</div>
      ` : ''}
      
      ${education.length > 0 ? `
        <h3>Education</h3>
        ${education.map(e => `
          <div style="margin-bottom:12px;">
            <div style="font-weight:600;font-size:13px;">${e.degree || 'Degree'}</div>
            <div style="font-size:12px;opacity:0.8;">${e.institution || ''}</div>
            ${e.year ? `<div style="font-size:11px;opacity:0.7;">${e.year}</div>` : ''}
          </div>
        `).join('')}
      ` : ''}
    </div>
    
    <div class="main">
      ${bio ? `
        <section>
          <h2>About Me</h2>
          <div class="bio">${bio}</div>
        </section>
      ` : ''}
      
      ${workHistory.length > 0 ? `
        <section>
          <h2>Experience</h2>
          ${workHistory.map(j => `
            <div class="exp-item">
              <div class="exp-title">${j.title || 'Position'}</div>
              <div class="exp-org">${j.company || 'Company'}</div>
              ${j.start_date ? `<div class="exp-period">${j.start_date} — ${j.end_date || 'Present'}</div>` : ''}
              ${j.description ? `<div class="exp-desc">${j.description}</div>` : ''}
            </div>
          `).join('')}
        </section>
      ` : ''}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Minimal resume template — clean, black-and-white, ATS-friendly
 */
function generateMinimalResumeHTML(data) {
  const { name, email, phone, location, country, headline, bio, skills, workHistory, education } = data;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} - Resume</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Georgia, 'Times New Roman', serif; line-height: 1.7; color: #222; max-width: 700px; margin: 0 auto; padding: 48px 24px; }
    header { text-align: center; margin-bottom: 32px; }
    h1 { font-size: 28px; font-weight: 400; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px; }
    .subtitle { font-size: 14px; color: #666; margin-bottom: 12px; }
    .contact-line { font-size: 13px; color: #555; }
    .contact-line span { margin: 0 8px; }
    hr { border: none; border-top: 1px solid #ccc; margin: 20px 0; }
    h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 2px; color: #333; margin-bottom: 12px; font-weight: 400; }
    section { margin-bottom: 24px; }
    .bio { font-size: 14px; color: #444; }
    .entry { margin-bottom: 16px; }
    .entry-header { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; }
    .entry-title { font-weight: 600; font-size: 15px; }
    .entry-period { font-size: 13px; color: #888; }
    .entry-org { font-size: 14px; color: #555; margin-bottom: 4px; }
    .entry-desc { font-size: 13px; color: #444; }
    .skills-list { font-size: 14px; color: #444; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <header>
    <h1>${name || 'Your Name'}</h1>
    ${headline ? `<div class="subtitle">${headline}</div>` : ''}
    <div class="contact-line">
      ${[email, phone, location && `${location}${country ? `, ${country}` : ''}`].filter(Boolean).join(' · ')}
    </div>
  </header>

  ${bio ? `<hr><section><h2>Summary</h2><div class="bio">${bio}</div></section>` : ''}

  ${workHistory.length > 0 ? `
    <hr>
    <section>
      <h2>Experience</h2>
      ${workHistory.map(j => `
        <div class="entry">
          <div class="entry-header">
            <span class="entry-title">${j.title || 'Position'}</span>
            ${j.start_date ? `<span class="entry-period">${j.start_date} — ${j.end_date || 'Present'}</span>` : ''}
          </div>
          <div class="entry-org">${j.company || ''}</div>
          ${j.description ? `<div class="entry-desc">${j.description}</div>` : ''}
        </div>
      `).join('')}
    </section>
  ` : ''}

  ${education.length > 0 ? `
    <hr>
    <section>
      <h2>Education</h2>
      ${education.map(e => `
        <div class="entry">
          <div class="entry-header">
            <span class="entry-title">${e.degree || 'Degree'}</span>
            ${e.year ? `<span class="entry-period">${e.year}</span>` : ''}
          </div>
          <div class="entry-org">${e.institution || ''}${e.field ? ` — ${e.field}` : ''}</div>
        </div>
      `).join('')}
    </section>
  ` : ''}

  ${skills.length > 0 ? `
    <hr>
    <section>
      <h2>Skills</h2>
      <div class="skills-list">${skills.join(' · ')}</div>
    </section>
  ` : ''}
</body>
</html>`;
}

module.exports = router;
