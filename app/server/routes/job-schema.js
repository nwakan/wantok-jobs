const express = require('express');
const router = express.Router();
const db = require('../database');
const logger = require('../utils/logger');

// Get JSON-LD schema for a specific job
router.get('/api/jobs/:id/schema', (req, res) => {
  try {
    const { id } = req.params;

    const job = db.prepare(`
      SELECT 
        j.*,
        u.company_name,
        u.logo,
        u.website
      FROM jobs j
      LEFT JOIN users u ON j.employer_id = u.id
      WHERE j.id = ? AND j.status = 'active'
    `).get(id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const baseUrl = process.env.BASE_URL || 'https://wantokjobs.com';
    
    // Map employment types to Google's schema requirements
    const employmentTypeMap = {
      'full-time': 'FULL_TIME',
      'part-time': 'PART_TIME',
      'contract': 'CONTRACTOR',
      'temporary': 'TEMPORARY',
      'internship': 'INTERN',
      'volunteer': 'VOLUNTEER',
      'casual': 'PER_DIEM',
    };

    // Build the JobPosting schema
    const schema = {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      "title": job.title,
      "description": job.description || job.requirements || 'No description available',
      "datePosted": job.created_at,
      "validThrough": job.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      "employmentType": employmentTypeMap[job.job_type] || 'FULL_TIME',
      "hiringOrganization": {
        "@type": "Organization",
        "name": job.company_name || 'Unknown Company',
        "sameAs": job.website || `${baseUrl}/companies/${job.employer_id}`,
      },
      "jobLocation": {
        "@type": "Place",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": job.location || 'Papua New Guinea',
          "addressCountry": "PG"
        }
      },
      "identifier": {
        "@type": "PropertyValue",
        "name": "WantokJobs",
        "value": `WJ-${job.id}`
      },
      "url": `${baseUrl}/jobs/${job.id}`
    };

    // Add logo if available
    if (job.logo) {
      schema.hiringOrganization.logo = job.logo.startsWith('http') 
        ? job.logo 
        : `${baseUrl}${job.logo}`;
    }

    // Add salary if available
    if (job.salary_min || job.salary_max) {
      const salaryValue = {};
      
      if (job.salary_min && job.salary_max) {
        salaryValue["@type"] = "QuantitativeValue";
        salaryValue.minValue = parseFloat(job.salary_min);
        salaryValue.maxValue = parseFloat(job.salary_max);
        salaryValue.unitText = job.salary_period || 'YEAR';
      } else if (job.salary_min) {
        salaryValue["@type"] = "QuantitativeValue";
        salaryValue.value = parseFloat(job.salary_min);
        salaryValue.unitText = job.salary_period || 'YEAR';
      }

      schema.baseSalary = {
        "@type": "MonetaryAmount",
        "currency": "PGK",
        "value": salaryValue
      };
    }

    // Add application URL
    schema.directApply = true;
    schema.applicationContact = {
      "@type": "ContactPoint",
      "contactType": "HR",
      "url": `${baseUrl}/jobs/${job.id}`
    };

    // Add job category if available
    if (job.category) {
      schema.industry = job.category;
    }

    // Add experience level if available
    if (job.experience_level) {
      schema.experienceRequirements = {
        "@type": "OccupationalExperienceRequirements",
        "monthsOfExperience": job.experience_level === 'entry' ? 0 : 
                              job.experience_level === 'mid' ? 24 : 60
      };
    }

    // Add education requirements if available
    if (job.education_level) {
      schema.educationRequirements = {
        "@type": "EducationalOccupationalCredential",
        "credentialCategory": job.education_level
      };
    }

    res.json(schema);
  } catch (error) {
    logger.error('Job schema error', { error: error.message, jobId: req.params.id });
    res.status(500).json({ error: 'Failed to generate job schema' });
  }
});

module.exports = router;
