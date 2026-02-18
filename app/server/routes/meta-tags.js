const express = require('express');
const router = express.Router();
const db = require('../database');
const logger = require('../utils/logger');

// Get meta tags for a job
router.get('/api/meta/job/:id', (req, res) => {
  try {
    const { id } = req.params;

    const job = db.prepare(`
      SELECT 
        j.id,
        j.title,
        j.description,
        j.location,
        j.job_type,
        u.company_name,
        u.logo
      FROM jobs j
      LEFT JOIN users u ON j.employer_id = u.id
      WHERE j.id = ? AND j.status = 'active'
    `).get(id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const baseUrl = process.env.BASE_URL || 'https://wantokjobs.com';
    
    // Extract first 160 characters of description for meta description
    const description = job.description 
      ? job.description.replace(/<[^>]*>/g, '').substring(0, 160) + '...'
      : `${job.job_type} position at ${job.company_name} in ${job.location}`;

    const meta = {
      title: `${job.title} - ${job.company_name} | WantokJobs`,
      description: description,
      image: job.logo 
        ? (job.logo.startsWith('http') ? job.logo : `${baseUrl}${job.logo}`)
        : `${baseUrl}/og-image.png`,
      url: `${baseUrl}/jobs/${job.id}`,
      type: 'website',
      siteName: 'WantokJobs',
      locale: 'en_PG'
    };

    res.json(meta);
  } catch (error) {
    logger.error('Job meta tags error', { error: error.message, jobId: req.params.id });
    res.status(500).json({ error: 'Failed to generate meta tags' });
  }
});

// Get meta tags for a company
router.get('/api/meta/company/:id', (req, res) => {
  try {
    const { id } = req.params;

    const company = db.prepare(`
      SELECT 
        id,
        company_name,
        company_description,
        logo,
        location,
        industry
      FROM users
      WHERE id = ? AND role = 'employer'
    `).get(id);

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const baseUrl = process.env.BASE_URL || 'https://wantokjobs.com';
    
    // Extract first 160 characters of description for meta description
    const description = company.company_description 
      ? company.company_description.substring(0, 160) + '...'
      : `${company.company_name} - ${company.industry || 'Employer'} in ${company.location || 'Papua New Guinea'}`;

    const meta = {
      title: `${company.company_name} - Jobs & Company Profile | WantokJobs`,
      description: description,
      image: company.logo 
        ? (company.logo.startsWith('http') ? company.logo : `${baseUrl}${company.logo}`)
        : `${baseUrl}/og-image.png`,
      url: `${baseUrl}/companies/${company.id}`,
      type: 'profile',
      siteName: 'WantokJobs',
      locale: 'en_PG'
    };

    res.json(meta);
  } catch (error) {
    logger.error('Company meta tags error', { error: error.message, companyId: req.params.id });
    res.status(500).json({ error: 'Failed to generate meta tags' });
  }
});

module.exports = router;
