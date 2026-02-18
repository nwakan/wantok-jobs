const express = require('express');
const db = require('../database');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/transparency-public/leaderboard
 * Public transparency leaderboard - ranked list of all required employers
 */
router.get('/leaderboard', (req, res) => {
  try {
    const { employer_type, limit = 100, offset = 0 } = req.query;

    let whereClause = 'WHERE pe.transparency_required = 1';
    const params = [];

    if (employer_type) {
      whereClause += ' AND pe.employer_type = ?';
      params.push(employer_type);
    }

    const leaderboard = db.prepare(`
      SELECT 
        pe.user_id,
        pe.company_name,
        pe.employer_type,
        pe.transparency_score,
        pe.industry,
        pe.location,
        COUNT(DISTINCT j.id) as jobs_posted,
        COUNT(DISTINCT ht.job_id) as transparent_jobs,
        SUM(CASE 
          WHEN ht.salary_band_min IS NOT NULL AND ht.salary_band_max IS NOT NULL 
          THEN 1 ELSE 0 
        END) as jobs_with_salary,
        AVG(ht.time_to_hire_days) as avg_time_to_hire,
        SUM(CASE WHEN ht.outcome_published = 1 THEN 1 ELSE 0 END) as outcomes_published
      FROM profiles_employer pe
      LEFT JOIN jobs j ON pe.user_id = j.employer_id
      LEFT JOIN hiring_transparency ht ON j.id = ht.job_id
      ${whereClause}
      GROUP BY pe.user_id
      ORDER BY 
        CASE 
          WHEN pe.transparency_score IS NULL THEN 0 
          ELSE pe.transparency_score 
        END DESC,
        pe.company_name ASC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), parseInt(offset));

    // Calculate derived metrics and assign color bands
    const enrichedLeaderboard = leaderboard.map(employer => {
      const score = employer.transparency_score || 0;
      let band, emoji;
      
      if (score >= 80) {
        band = 'high';
        emoji = '✅';
      } else if (score >= 50) {
        band = 'medium';
        emoji = '🟡';
      } else if (score >= 1) {
        band = 'low';
        emoji = '🔴';
      } else {
        band = 'none';
        emoji = '⚫';
      }

      const salaryDisclosureRate = employer.transparent_jobs > 0
        ? Math.round((employer.jobs_with_salary / employer.transparent_jobs) * 100)
        : 0;

      return {
        employerId: employer.user_id,
        companyName: employer.company_name,
        employerType: employer.employer_type,
        industry: employer.industry,
        location: employer.location,
        score,
        band,
        emoji,
        jobsPosted: employer.jobs_posted,
        transparentJobs: employer.transparent_jobs,
        salaryDisclosureRate,
        avgTimeToHire: employer.avg_time_to_hire ? Math.round(employer.avg_time_to_hire) : null,
        outcomesPublished: employer.outcomes_published,
      };
    });

    // Get total count for pagination
    const totalQuery = whereClause === 'WHERE pe.transparency_required = 1'
      ? db.prepare('SELECT COUNT(*) as count FROM profiles_employer WHERE transparency_required = 1').get()
      : db.prepare(`SELECT COUNT(*) as count FROM profiles_employer WHERE transparency_required = 1 AND employer_type = ?`).get(employer_type);

    res.json({
      success: true,
      data: enrichedLeaderboard,
      pagination: {
        total: totalQuery.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    logger.error('Error fetching transparency leaderboard', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /api/transparency-public/stats
 * Platform-wide transparency statistics
 */
router.get('/stats', (req, res) => {
  try {
    // Overall stats
    const overall = db.prepare(`
      SELECT 
        COUNT(DISTINCT pe.user_id) as total_required_employers,
        COUNT(DISTINCT CASE WHEN pe.transparency_score > 0 THEN pe.user_id END) as employers_with_data,
        AVG(CASE WHEN pe.transparency_score > 0 THEN pe.transparency_score END) as avg_score_nonzero,
        AVG(pe.transparency_score) as avg_score_all,
        COUNT(DISTINCT j.id) as total_jobs,
        COUNT(DISTINCT ht.job_id) as transparent_jobs,
        SUM(CASE WHEN ht.salary_band_min IS NOT NULL THEN 1 ELSE 0 END) as jobs_with_salary,
        AVG(ht.time_to_hire_days) as avg_time_to_hire
      FROM profiles_employer pe
      LEFT JOIN jobs j ON pe.user_id = j.employer_id
      LEFT JOIN hiring_transparency ht ON j.id = ht.job_id
      WHERE pe.transparency_required = 1
    `).get();

    // Stats by employer type
    const byType = db.prepare(`
      SELECT 
        pe.employer_type,
        COUNT(DISTINCT pe.user_id) as employer_count,
        AVG(pe.transparency_score) as avg_score,
        COUNT(DISTINCT j.id) as jobs_posted,
        COUNT(DISTINCT ht.job_id) as transparent_jobs,
        SUM(CASE WHEN ht.salary_band_min IS NOT NULL THEN 1 ELSE 0 END) as jobs_with_salary
      FROM profiles_employer pe
      LEFT JOIN jobs j ON pe.user_id = j.employer_id
      LEFT JOIN hiring_transparency ht ON j.id = ht.job_id
      WHERE pe.transparency_required = 1
      GROUP BY pe.employer_type
    `).all();

    // Score distribution
    const distribution = db.prepare(`
      SELECT 
        COUNT(CASE WHEN transparency_score = 0 OR transparency_score IS NULL THEN 1 END) as no_data,
        COUNT(CASE WHEN transparency_score BETWEEN 1 AND 49 THEN 1 END) as low,
        COUNT(CASE WHEN transparency_score BETWEEN 50 AND 79 THEN 1 END) as medium,
        COUNT(CASE WHEN transparency_score >= 80 THEN 1 END) as high
      FROM profiles_employer
      WHERE transparency_required = 1
    `).get();

    // Best performers
    const bestPerformers = db.prepare(`
      SELECT company_name, employer_type, transparency_score
      FROM profiles_employer
      WHERE transparency_required = 1 
        AND transparency_score > 0
      ORDER BY transparency_score DESC, company_name ASC
      LIMIT 5
    `).all();

    // Worst performers (with some data)
    const worstPerformers = db.prepare(`
      SELECT company_name, employer_type, transparency_score
      FROM profiles_employer
      WHERE transparency_required = 1 
        AND transparency_score > 0
      ORDER BY transparency_score ASC, company_name ASC
      LIMIT 5
    `).all();

    // Zero-data employers sample
    const noDataEmployers = db.prepare(`
      SELECT company_name, employer_type
      FROM profiles_employer
      WHERE transparency_required = 1 
        AND (transparency_score = 0 OR transparency_score IS NULL)
      ORDER BY 
        CASE employer_type 
          WHEN 'government' THEN 1 
          WHEN 'soe' THEN 2 
          WHEN 'statutory' THEN 3 
          ELSE 4 
        END,
        company_name ASC
      LIMIT 10
    `).all();

    // Salary disclosure rate
    const salaryDisclosureRate = overall.transparent_jobs > 0
      ? Math.round((overall.jobs_with_salary / overall.transparent_jobs) * 100)
      : 0;

    // Overall compliance rate (employers with score > 0)
    const complianceRate = overall.total_required_employers > 0
      ? Math.round((overall.employers_with_data / overall.total_required_employers) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        overall: {
          totalRequiredEmployers: overall.total_required_employers,
          employersWithData: overall.employers_with_data,
          complianceRate,
          avgScoreAll: parseFloat((overall.avg_score_all || 0).toFixed(1)),
          avgScoreNonZero: parseFloat((overall.avg_score_nonzero || 0).toFixed(1)),
          totalJobs: overall.total_jobs,
          transparentJobs: overall.transparent_jobs,
          salaryDisclosureRate,
          avgTimeToHire: overall.avg_time_to_hire ? Math.round(overall.avg_time_to_hire) : null,
        },
        byEmployerType: byType.map(type => ({
          employerType: type.employer_type,
          employerCount: type.employer_count,
          avgScore: parseFloat((type.avg_score || 0).toFixed(1)),
          jobsPosted: type.jobs_posted,
          transparentJobs: type.transparent_jobs,
          salaryDisclosureRate: type.transparent_jobs > 0
            ? Math.round((type.jobs_with_salary / type.transparent_jobs) * 100)
            : 0,
        })),
        distribution,
        bestPerformers,
        worstPerformers,
        noDataEmployers,
      },
    });
  } catch (error) {
    logger.error('Error fetching transparency stats', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/transparency-public/flags
 * Admin: Get all unresolved transparency flags
 */
router.get('/flags', (req, res) => {
  try {
    const { resolved = 0, severity, employer_id, limit = 50, offset = 0 } = req.query;

    let whereClause = 'WHERE tf.resolved = ?';
    const params = [parseInt(resolved)];

    if (severity) {
      whereClause += ' AND tf.severity = ?';
      params.push(severity);
    }

    if (employer_id) {
      whereClause += ' AND tf.employer_id = ?';
      params.push(parseInt(employer_id));
    }

    const flags = db.prepare(`
      SELECT 
        tf.id,
        tf.job_id,
        tf.employer_id,
        tf.flag_type,
        tf.severity,
        tf.message,
        tf.resolved,
        tf.resolved_at,
        tf.created_at,
        j.title as job_title,
        pe.company_name as employer_name,
        pe.employer_type
      FROM transparency_flags tf
      JOIN jobs j ON tf.job_id = j.id
      JOIN profiles_employer pe ON tf.employer_id = pe.user_id
      ${whereClause}
      ORDER BY 
        CASE tf.severity 
          WHEN 'critical' THEN 1 
          WHEN 'warning' THEN 2 
          ELSE 3 
        END,
        tf.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), parseInt(offset));

    const totalQuery = db.prepare(`
      SELECT COUNT(*) as count
      FROM transparency_flags tf
      ${whereClause}
    `).get(...params);

    res.json({
      success: true,
      data: flags,
      pagination: {
        total: totalQuery.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    logger.error('Error fetching transparency flags', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch flags' });
  }
});

module.exports = router;
