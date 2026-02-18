const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Get transparency badge for an employer
 * @param {number} score - Transparency score (0-100)
 * @param {boolean} required - Whether transparency is required
 * @returns {object} Badge object with emoji, label, color
 */
function getTransparencyBadge(score, required = false) {
  if (!required) {
    return null; // No badge for employers not required to be transparent
  }
  
  if (score >= 80) {
    return {
      emoji: '✅',
      label: 'Transparency Verified',
      level: 'high',
      color: 'green',
      description: 'This employer meets high transparency standards',
    };
  } else if (score >= 50) {
    return {
      emoji: '🟡',
      label: 'Partially Transparent',
      level: 'medium',
      color: 'yellow',
      description: 'Some transparency data provided',
    };
  } else if (score >= 1) {
    return {
      emoji: '🔴',
      label: 'Low Transparency',
      level: 'low',
      color: 'red',
      description: 'Minimal transparency data',
    };
  } else {
    return {
      emoji: '⚫',
      label: 'No Transparency Data',
      level: 'none',
      color: 'black',
      description: 'Required to provide transparency data but has not submitted any',
    };
  }
}

// Export for use in other routes
router.getTransparencyBadge = getTransparencyBadge;

/**
 * Calculate transparency score for an employer
 * Scoring criteria:
 * - Job posted with full selection criteria: +20
 * - Salary band disclosed: +15
 * - All applicants received status updates: +15
 * - Hired within stated timeline: +15
 * - Post-hiring stats published: +15
 * - No unexplained re-advertisements: +10
 * - Panel diversity declared: +10
 */
function calculateTransparencyScore(employerId) {
  try {
    // Get all jobs for this employer with transparency data
    const jobs = db.prepare(`
      SELECT 
        j.id,
        j.created_at,
        ht.selection_criteria,
        ht.salary_band_min,
        ht.salary_band_max,
        ht.outcome_published,
        ht.readvertised,
        ht.readvertise_reason,
        ht.time_to_hire_days,
        ht.application_count,
        ht.position_filled,
        ht.original_closing_date
      FROM jobs j
      LEFT JOIN hiring_transparency ht ON j.id = ht.job_id
      WHERE j.employer_id = ?
        AND j.status IN ('active', 'closed', 'filled')
    `).all(employerId);

    if (jobs.length === 0) return 0;

    let totalScore = 0;
    let jobCount = 0;

    for (const job of jobs) {
      let jobScore = 0;

      // Full selection criteria (+20)
      if (job.selection_criteria) {
        try {
          const criteria = JSON.parse(job.selection_criteria);
          if (Array.isArray(criteria) && criteria.length >= 2) {
            jobScore += 20;
          }
        } catch (e) {
          // Invalid JSON, skip
        }
      }

      // Salary band disclosed (+15)
      if (job.salary_band_min && job.salary_band_max) {
        jobScore += 15;
      }

      // All applicants received status updates (+15)
      // Check if all applications have at least one decision recorded
      const applicationStats = db.prepare(`
        SELECT 
          COUNT(DISTINCT a.id) as total_apps,
          COUNT(DISTINCT hd.application_id) as apps_with_decisions
        FROM applications a
        LEFT JOIN hiring_decisions hd ON a.id = hd.application_id
        WHERE a.job_id = ?
      `).get(job.id);

      if (applicationStats.total_apps > 0 && 
          applicationStats.total_apps === applicationStats.apps_with_decisions) {
        jobScore += 15;
      }

      // Hired within stated timeline (+15)
      if (job.position_filled && job.time_to_hire_days && job.original_closing_date) {
        const closingDate = new Date(job.original_closing_date);
        const createdDate = new Date(job.created_at);
        const expectedDays = Math.ceil((closingDate - createdDate) / (1000 * 60 * 60 * 24)) + 14; // closing + 2 weeks
        if (job.time_to_hire_days <= expectedDays) {
          jobScore += 15;
        }
      }

      // Post-hiring stats published (+15)
      if (job.outcome_published) {
        jobScore += 15;
      }

      // No unexplained re-advertisements (+10)
      if (!job.readvertised || (job.readvertised && job.readvertise_reason)) {
        jobScore += 10;
      }

      // Panel diversity declared (+10)
      const panelStats = db.prepare(`
        SELECT 
          COUNT(*) as total_members,
          SUM(is_independent) as independent_count
        FROM hiring_panel
        WHERE job_id = ?
      `).get(job.id);

      if (panelStats.total_members >= 3 && panelStats.independent_count >= 1) {
        jobScore += 10;
      }

      totalScore += jobScore;
      jobCount++;
    }

    const averageScore = Math.round(totalScore / jobCount);
    
    // Update employer's transparency score
    db.prepare(`
      UPDATE profiles_employer 
      SET transparency_score = ? 
      WHERE user_id = ?
    `).run(averageScore, employerId);

    return averageScore;
  } catch (error) {
    logger.error('Error calculating transparency score', { employerId, error: error.message });
    return 0;
  }
}

// GET /api/transparency/job/:jobId - Public: get transparency data for a job
router.get('/job/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;

    // Get job details
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    // Get transparency data
    const transparency = db.prepare('SELECT * FROM hiring_transparency WHERE job_id = ?').get(jobId);
    
    // Get hiring panel
    const panel = db.prepare('SELECT * FROM hiring_panel WHERE job_id = ?').all(jobId);

    // Get outcome stats (if published)
    let outcomeStats = null;
    if (transparency?.outcome_published) {
      outcomeStats = {
        applicationCount: transparency.application_count,
        shortlistCount: transparency.shortlist_count,
        interviewCount: transparency.interview_count,
        positionFilled: transparency.position_filled,
        timeToHireDays: transparency.time_to_hire_days,
        genderStats: transparency.gender_stats ? JSON.parse(transparency.gender_stats) : null,
        provincialStats: transparency.provincial_stats ? JSON.parse(transparency.provincial_stats) : null,
      };
    }

    res.json({
      success: true,
      data: {
        job: {
          id: job.id,
          title: job.title,
          employerId: job.employer_id,
        },
        transparency: transparency ? {
          salaryBandMin: transparency.salary_band_min,
          salaryBandMax: transparency.salary_band_max,
          salaryCurrency: transparency.salary_currency,
          selectionCriteria: transparency.selection_criteria ? JSON.parse(transparency.selection_criteria) : null,
          panelSize: transparency.panel_size,
          panelIndependent: transparency.panel_independent,
          closingDateEnforced: transparency.closing_date_enforced,
          originalClosingDate: transparency.original_closing_date,
          extendedClosingDate: transparency.extended_closing_date,
          extensionReason: transparency.extension_reason,
        } : null,
        panel,
        outcomeStats,
      },
    });
  } catch (error) {
    logger.error('Error fetching job transparency', { jobId: req.params.jobId, error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch transparency data' });
  }
});

// GET /api/transparency/employer/:id - Public: employer transparency profile + score
router.get('/employer/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Get employer profile
    const employer = db.prepare(`
      SELECT 
        u.id,
        u.email,
        pe.company_name,
        pe.employer_type,
        pe.transparency_required,
        pe.transparency_score,
        pe.industry,
        pe.location,
        pe.country
      FROM users u
      JOIN profiles_employer pe ON u.id = pe.user_id
      WHERE u.id = ?
    `).get(id);

    if (!employer) {
      return res.status(404).json({ success: false, error: 'Employer not found' });
    }

    // Get transparency stats
    const stats = db.prepare(`
      SELECT 
        COUNT(DISTINCT j.id) as total_jobs,
        COUNT(DISTINCT ht.job_id) as transparent_jobs,
        AVG(CASE WHEN ht.outcome_published = 1 THEN 1 ELSE 0 END) as outcome_publish_rate
      FROM jobs j
      LEFT JOIN hiring_transparency ht ON j.id = ht.job_id
      WHERE j.employer_id = ?
    `).get(id);

    // Recalculate score
    const score = calculateTransparencyScore(id);
    
    // Get transparency badge
    const badge = getTransparencyBadge(score, employer.transparency_required);

    res.json({
      success: true,
      data: {
        employer: {
          id: employer.id,
          companyName: employer.company_name,
          employerType: employer.employer_type,
          transparencyRequired: employer.transparency_required,
          transparencyScore: score,
          transparencyBadge: badge,
          industry: employer.industry,
          location: employer.location,
          country: employer.country,
        },
        stats: {
          totalJobs: stats.total_jobs,
          transparentJobs: stats.transparent_jobs,
          outcomePublishRate: parseFloat((stats.outcome_publish_rate * 100).toFixed(1)),
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching employer transparency', { employerId: req.params.id, error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch employer transparency profile' });
  }
});

// GET /api/transparency/employer/:id/jobs - Public: all transparent jobs for employer
router.get('/employer/:id/jobs', (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const jobs = db.prepare(`
      SELECT 
        j.id,
        j.title,
        j.status,
        j.created_at,
        ht.salary_band_min,
        ht.salary_band_max,
        ht.salary_currency,
        ht.outcome_published,
        ht.position_filled,
        ht.time_to_hire_days
      FROM jobs j
      INNER JOIN hiring_transparency ht ON j.id = ht.job_id
      WHERE j.employer_id = ?
      ORDER BY j.created_at DESC
      LIMIT ? OFFSET ?
    `).all(id, parseInt(limit), parseInt(offset));

    const total = db.prepare(`
      SELECT COUNT(*) as count
      FROM jobs j
      INNER JOIN hiring_transparency ht ON j.id = ht.job_id
      WHERE j.employer_id = ?
    `).get(id).count;

    res.json({
      success: true,
      data: jobs,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    logger.error('Error fetching employer transparent jobs', { employerId: req.params.id, error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch transparent jobs' });
  }
});

// POST /api/transparency/job/:jobId - Employer: set/update transparency data
router.post('/job/:jobId', authenticateToken, (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    // Verify job ownership
    const job = db.prepare('SELECT employer_id FROM jobs WHERE id = ?').get(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    if (job.employer_id !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized to update this job' });
    }

    const {
      salaryBandMin,
      salaryBandMax,
      salaryCurrency = 'PGK',
      selectionCriteria,
      panelSize,
      panelIndependent = 0,
      internalCandidatesConsidered = 0,
      closingDateEnforced = 1,
      originalClosingDate,
      extendedClosingDate,
      extensionReason,
    } = req.body;

    // Validate selection criteria
    if (selectionCriteria && !Array.isArray(selectionCriteria)) {
      return res.status(400).json({ success: false, error: 'Selection criteria must be an array' });
    }

    // Check if transparency record exists
    const existing = db.prepare('SELECT id FROM hiring_transparency WHERE job_id = ?').get(jobId);

    if (existing) {
      // Update existing
      db.prepare(`
        UPDATE hiring_transparency SET
          salary_band_min = COALESCE(?, salary_band_min),
          salary_band_max = COALESCE(?, salary_band_max),
          salary_currency = COALESCE(?, salary_currency),
          selection_criteria = COALESCE(?, selection_criteria),
          panel_size = COALESCE(?, panel_size),
          panel_independent = COALESCE(?, panel_independent),
          internal_candidates_considered = COALESCE(?, internal_candidates_considered),
          closing_date_enforced = COALESCE(?, closing_date_enforced),
          original_closing_date = COALESCE(?, original_closing_date),
          extended_closing_date = COALESCE(?, extended_closing_date),
          extension_reason = COALESCE(?, extension_reason),
          updated_at = datetime('now')
        WHERE job_id = ?
      `).run(
        salaryBandMin,
        salaryBandMax,
        salaryCurrency,
        selectionCriteria ? JSON.stringify(selectionCriteria) : null,
        panelSize,
        panelIndependent,
        internalCandidatesConsidered,
        closingDateEnforced,
        originalClosingDate,
        extendedClosingDate,
        extensionReason,
        jobId
      );
    } else {
      // Create new
      db.prepare(`
        INSERT INTO hiring_transparency (
          job_id, salary_band_min, salary_band_max, salary_currency,
          selection_criteria, panel_size, panel_independent,
          internal_candidates_considered, closing_date_enforced,
          original_closing_date, extended_closing_date, extension_reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        jobId,
        salaryBandMin,
        salaryBandMax,
        salaryCurrency,
        selectionCriteria ? JSON.stringify(selectionCriteria) : null,
        panelSize,
        panelIndependent,
        internalCandidatesConsidered,
        closingDateEnforced,
        originalClosingDate,
        extendedClosingDate,
        extensionReason
      );
    }

    // Recalculate employer's transparency score
    calculateTransparencyScore(userId);

    res.json({ success: true, message: 'Transparency data updated' });
  } catch (error) {
    logger.error('Error updating job transparency', { jobId: req.params.jobId, error: error.message });
    res.status(500).json({ success: false, error: 'Failed to update transparency data' });
  }
});

// POST /api/transparency/job/:jobId/panel - Employer: add panel member
router.post('/job/:jobId/panel', authenticateToken, (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    // Verify job ownership
    const job = db.prepare('SELECT employer_id FROM jobs WHERE id = ?').get(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    if (job.employer_id !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const {
      memberName,
      memberRole,
      memberTitle,
      isIndependent = 0,
    } = req.body;

    if (!memberName) {
      return res.status(400).json({ success: false, error: 'Member name is required' });
    }

    const result = db.prepare(`
      INSERT INTO hiring_panel (
        job_id, member_name, member_role, member_title, is_independent
      ) VALUES (?, ?, ?, ?, ?)
    `).run(jobId, memberName, memberRole, memberTitle, isIndependent);

    // Update panel counts in hiring_transparency
    const panelStats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(is_independent) as independent
      FROM hiring_panel
      WHERE job_id = ?
    `).get(jobId);

    db.prepare(`
      UPDATE hiring_transparency
      SET panel_size = ?, panel_independent = ?
      WHERE job_id = ?
    `).run(panelStats.total, panelStats.independent, jobId);

    res.json({
      success: true,
      data: { id: result.lastInsertRowid },
    });
  } catch (error) {
    logger.error('Error adding panel member', { jobId: req.params.jobId, error: error.message });
    res.status(500).json({ success: false, error: 'Failed to add panel member' });
  }
});

// POST /api/transparency/job/:jobId/decision - Employer: record hiring decision
router.post('/job/:jobId/decision', authenticateToken, (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    // Verify job ownership
    const job = db.prepare('SELECT employer_id FROM jobs WHERE id = ?').get(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    if (job.employer_id !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const {
      applicationId,
      stage,
      decision,
      reasoning,
      score,
      criteriaScores,
      decidedBy,
    } = req.body;

    if (!stage || !decision) {
      return res.status(400).json({ success: false, error: 'Stage and decision are required' });
    }

    const result = db.prepare(`
      INSERT INTO hiring_decisions (
        job_id, application_id, stage, decision, reasoning, score, criteria_scores, decided_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      jobId,
      applicationId,
      stage,
      decision,
      reasoning,
      score,
      criteriaScores ? JSON.stringify(criteriaScores) : null,
      decidedBy
    );

    // Update stage counts in hiring_transparency
    const stageCounts = db.prepare(`
      SELECT 
        COUNT(DISTINCT CASE WHEN stage = 'applied' THEN application_id END) as application_count,
        COUNT(DISTINCT CASE WHEN stage = 'shortlisted' THEN application_id END) as shortlist_count,
        COUNT(DISTINCT CASE WHEN stage = 'interview' THEN application_id END) as interview_count
      FROM hiring_decisions
      WHERE job_id = ?
    `).get(jobId);

    db.prepare(`
      UPDATE hiring_transparency
      SET application_count = ?, shortlist_count = ?, interview_count = ?
      WHERE job_id = ?
    `).run(
      stageCounts.application_count,
      stageCounts.shortlist_count,
      stageCounts.interview_count,
      jobId
    );

    res.json({
      success: true,
      data: { id: result.lastInsertRowid },
    });
  } catch (error) {
    logger.error('Error recording hiring decision', { jobId: req.params.jobId, error: error.message });
    res.status(500).json({ success: false, error: 'Failed to record decision' });
  }
});

// POST /api/transparency/job/:jobId/outcome - Employer: publish hiring outcome
router.post('/job/:jobId/outcome', authenticateToken, (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    // Verify job ownership
    const job = db.prepare('SELECT employer_id, created_at FROM jobs WHERE id = ?').get(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    if (job.employer_id !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const {
      positionFilled,
      positionCancelled = 0,
      cancellationReason,
      genderStats,
      provincialStats,
    } = req.body;

    // Calculate time to hire
    const hiredDecision = db.prepare(`
      SELECT decided_at
      FROM hiring_decisions
      WHERE job_id = ? AND stage = 'hired'
      ORDER BY decided_at DESC
      LIMIT 1
    `).get(jobId);

    let timeToHireDays = null;
    if (hiredDecision) {
      const createdDate = new Date(job.created_at);
      const hiredDate = new Date(hiredDecision.decided_at);
      timeToHireDays = Math.ceil((hiredDate - createdDate) / (1000 * 60 * 60 * 24));
    }

    db.prepare(`
      UPDATE hiring_transparency
      SET 
        position_filled = ?,
        position_cancelled = ?,
        cancellation_reason = ?,
        time_to_hire_days = ?,
        gender_stats = ?,
        provincial_stats = ?,
        outcome_published = 1,
        outcome_published_at = datetime('now')
      WHERE job_id = ?
    `).run(
      positionFilled,
      positionCancelled,
      cancellationReason,
      timeToHireDays,
      genderStats ? JSON.stringify(genderStats) : null,
      provincialStats ? JSON.stringify(provincialStats) : null,
      jobId
    );

    // Recalculate transparency score
    calculateTransparencyScore(userId);

    res.json({ success: true, message: 'Outcome published' });
  } catch (error) {
    logger.error('Error publishing outcome', { jobId: req.params.jobId, error: error.message });
    res.status(500).json({ success: false, error: 'Failed to publish outcome' });
  }
});

// GET /api/transparency/job/:jobId/audit - Auditor: full audit trail
router.get('/job/:jobId/audit', authenticateToken, requireRole(['admin', 'auditor']), (req, res) => {
  try {
    const { jobId } = req.params;

    // Get all hiring decisions
    const decisions = db.prepare(`
      SELECT 
        hd.*,
        a.user_id as applicant_id,
        u.email as applicant_email
      FROM hiring_decisions hd
      LEFT JOIN applications a ON hd.application_id = a.id
      LEFT JOIN users u ON a.user_id = u.id
      WHERE hd.job_id = ?
      ORDER BY hd.decided_at ASC
    `).all(jobId);

    // Get conflict declarations
    const conflicts = db.prepare(`
      SELECT *
      FROM conflict_declarations
      WHERE job_id = ?
    `).all(jobId);

    // Get transparency data
    const transparency = db.prepare('SELECT * FROM hiring_transparency WHERE job_id = ?').get(jobId);

    // Get panel
    const panel = db.prepare('SELECT * FROM hiring_panel WHERE job_id = ?').all(jobId);

    res.json({
      success: true,
      data: {
        decisions,
        conflicts,
        transparency,
        panel,
      },
    });
  } catch (error) {
    logger.error('Error fetching audit trail', { jobId: req.params.jobId, error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch audit trail' });
  }
});

// POST /api/transparency/audit - Admin: create audit assignment
router.post('/audit', authenticateToken, requireRole(['admin']), (req, res) => {
  try {
    const {
      employerId,
      auditorId,
      auditorType = 'platform',
      auditPeriodStart,
      auditPeriodEnd,
    } = req.body;

    if (!employerId) {
      return res.status(400).json({ success: false, error: 'Employer ID is required' });
    }

    const result = db.prepare(`
      INSERT INTO transparency_audits (
        employer_id, auditor_id, auditor_type, audit_period_start, audit_period_end
      ) VALUES (?, ?, ?, ?, ?)
    `).run(employerId, auditorId, auditorType, auditPeriodStart, auditPeriodEnd);

    res.json({
      success: true,
      data: { id: result.lastInsertRowid },
    });
  } catch (error) {
    logger.error('Error creating audit', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to create audit' });
  }
});

// GET /api/transparency/stats - Public: platform-wide transparency stats
router.get('/stats', (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(DISTINCT pe.user_id) as transparent_employers,
        COUNT(DISTINCT j.id) as total_jobs,
        COUNT(DISTINCT ht.job_id) as transparent_jobs,
        AVG(pe.transparency_score) as avg_score,
        SUM(CASE WHEN ht.outcome_published = 1 THEN 1 ELSE 0 END) as published_outcomes
      FROM profiles_employer pe
      LEFT JOIN jobs j ON pe.user_id = j.employer_id
      LEFT JOIN hiring_transparency ht ON j.id = ht.job_id
      WHERE pe.transparency_required = 1
    `).get();

    // Get breakdown by employer type
    const byType = db.prepare(`
      SELECT 
        pe.employer_type,
        COUNT(DISTINCT pe.user_id) as employer_count,
        AVG(pe.transparency_score) as avg_score
      FROM profiles_employer pe
      WHERE pe.transparency_required = 1
      GROUP BY pe.employer_type
    `).all();

    res.json({
      success: true,
      data: {
        transparentEmployers: stats.transparent_employers,
        totalJobs: stats.total_jobs,
        transparentJobs: stats.transparent_jobs,
        averageScore: parseFloat((stats.avg_score || 0).toFixed(1)),
        publishedOutcomes: stats.published_outcomes,
        byEmployerType: byType,
      },
    });
  } catch (error) {
    logger.error('Error fetching transparency stats', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// POST /api/transparency/conflict - Panel member/Employer: declare conflict of interest
router.post('/conflict', authenticateToken, (req, res) => {
  try {
    const {
      jobId,
      panelMemberId,
      conflictType,
      description,
      actionTaken,
    } = req.body;

    if (!jobId || !conflictType || !description) {
      return res.status(400).json({ 
        success: false, 
        error: 'Job ID, conflict type, and description are required' 
      });
    }

    const result = db.prepare(`
      INSERT INTO conflict_declarations (
        job_id, panel_member_id, declared_by, conflict_type, description, action_taken
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(jobId, panelMemberId, req.user.email, conflictType, description, actionTaken);

    // Update panel member's conflict status if panel_member_id provided
    if (panelMemberId) {
      db.prepare(`
        UPDATE hiring_panel
        SET conflict_declared = 1, conflict_details = ?
        WHERE id = ?
      `).run(description, panelMemberId);
    }

    res.json({
      success: true,
      data: { id: result.lastInsertRowid },
    });
  } catch (error) {
    logger.error('Error declaring conflict', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to declare conflict' });
  }
});

// GET /api/transparency/employer/:id/score - Public: detailed score breakdown
router.get('/employer/:id/score', (req, res) => {
  try {
    const { id } = req.params;

    // Get all jobs with detailed scoring
    const jobs = db.prepare(`
      SELECT 
        j.id,
        j.title,
        j.created_at,
        ht.*
      FROM jobs j
      LEFT JOIN hiring_transparency ht ON j.id = ht.job_id
      WHERE j.employer_id = ?
        AND j.status IN ('active', 'closed', 'filled')
      ORDER BY j.created_at DESC
    `).all(id);

    const breakdown = jobs.map(job => {
      const scores = {};
      let total = 0;

      // Full selection criteria (+20)
      if (job.selection_criteria) {
        try {
          const criteria = JSON.parse(job.selection_criteria);
          if (Array.isArray(criteria) && criteria.length >= 2) {
            scores.selectionCriteria = 20;
            total += 20;
          } else {
            scores.selectionCriteria = 0;
          }
        } catch (e) {
          scores.selectionCriteria = 0;
        }
      } else {
        scores.selectionCriteria = 0;
      }

      // Salary band disclosed (+15)
      scores.salaryBand = (job.salary_band_min && job.salary_band_max) ? 15 : 0;
      total += scores.salaryBand;

      // All applicants received status updates (+15)
      const applicationStats = db.prepare(`
        SELECT 
          COUNT(DISTINCT a.id) as total_apps,
          COUNT(DISTINCT hd.application_id) as apps_with_decisions
        FROM applications a
        LEFT JOIN hiring_decisions hd ON a.id = hd.application_id
        WHERE a.job_id = ?
      `).get(job.id);

      scores.statusUpdates = (applicationStats.total_apps > 0 && 
                             applicationStats.total_apps === applicationStats.apps_with_decisions) ? 15 : 0;
      total += scores.statusUpdates;

      // Hired within timeline (+15)
      scores.timeline = 0;
      if (job.position_filled && job.time_to_hire_days && job.original_closing_date) {
        const closingDate = new Date(job.original_closing_date);
        const createdDate = new Date(job.created_at);
        const expectedDays = Math.ceil((closingDate - createdDate) / (1000 * 60 * 60 * 24)) + 14;
        if (job.time_to_hire_days <= expectedDays) {
          scores.timeline = 15;
          total += 15;
        }
      }

      // Post-hiring stats published (+15)
      scores.outcomePublished = job.outcome_published ? 15 : 0;
      total += scores.outcomePublished;

      // No unexplained re-advertisements (+10)
      scores.readvertising = (!job.readvertised || (job.readvertised && job.readvertise_reason)) ? 10 : 0;
      total += scores.readvertising;

      // Panel diversity (+10)
      const panelStats = db.prepare(`
        SELECT 
          COUNT(*) as total_members,
          SUM(is_independent) as independent_count
        FROM hiring_panel
        WHERE job_id = ?
      `).get(job.id);

      scores.panelDiversity = (panelStats.total_members >= 3 && panelStats.independent_count >= 1) ? 10 : 0;
      total += scores.panelDiversity;

      return {
        jobId: job.id,
        jobTitle: job.title,
        scores,
        total,
      };
    });

    const averageScore = breakdown.length > 0
      ? Math.round(breakdown.reduce((sum, j) => sum + j.total, 0) / breakdown.length)
      : 0;

    res.json({
      success: true,
      data: {
        averageScore,
        breakdown,
      },
    });
  } catch (error) {
    logger.error('Error fetching score breakdown', { employerId: req.params.id, error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch score breakdown' });
  }
});

module.exports = router;
