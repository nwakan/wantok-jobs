const logger = require('../utils/logger');
const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const router = express.Router();

// Get pipeline analytics (employer only)
router.get('/', authenticateToken, requireRole('employer', 'admin'), (req, res) => {
  try {
    const employerId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    // Get applications for employer's jobs
    const applicationsQuery = isAdmin
      ? `SELECT a.*, ae.from_status, ae.to_status, ae.created_at as event_time, j.title as job_title
         FROM applications a
         LEFT JOIN application_events ae ON a.id = ae.application_id
         LEFT JOIN jobs j ON a.job_id = j.id`
      : `SELECT a.*, ae.from_status, ae.to_status, ae.created_at as event_time, j.title as job_title
         FROM applications a
         LEFT JOIN application_events ae ON a.id = ae.application_id
         INNER JOIN jobs j ON a.job_id = j.id
         WHERE j.employer_id = ?`;

    const applications = isAdmin
      ? db.prepare(applicationsQuery).all()
      : db.prepare(applicationsQuery).all(employerId);

    // Applications per stage (funnel data)
    const stageCountsQuery = isAdmin
      ? `SELECT status, COUNT(*) as count FROM applications GROUP BY status`
      : `SELECT a.status, COUNT(*) as count
         FROM applications a
         INNER JOIN jobs j ON a.job_id = j.id
         WHERE j.employer_id = ?
         GROUP BY a.status`;

    const stageCounts = isAdmin
      ? db.prepare(stageCountsQuery).all()
      : db.prepare(stageCountsQuery).all(employerId);

    const funnelData = {
      applied: 0,
      screening: 0,
      shortlisted: 0,
      interview: 0,
      offered: 0,
      hired: 0,
      rejected: 0,
      withdrawn: 0
    };

    stageCounts.forEach(row => {
      funnelData[row.status] = row.count;
    });

    // Average time in each stage (days)
    const stageTimesQuery = isAdmin
      ? `SELECT 
           ae.from_status,
           ae.to_status,
           AVG(julianday(ae.created_at) - julianday(a.applied_at)) as avg_days
         FROM application_events ae
         INNER JOIN applications a ON ae.application_id = a.id
         WHERE ae.from_status IS NOT NULL
         GROUP BY ae.from_status, ae.to_status`
      : `SELECT 
           ae.from_status,
           ae.to_status,
           AVG(julianday(ae.created_at) - julianday(a.applied_at)) as avg_days
         FROM application_events ae
         INNER JOIN applications a ON ae.application_id = a.id
         INNER JOIN jobs j ON a.job_id = j.id
         WHERE j.employer_id = ? AND ae.from_status IS NOT NULL
         GROUP BY ae.from_status, ae.to_status`;

    const stageTimes = isAdmin
      ? db.prepare(stageTimesQuery).all()
      : db.prepare(stageTimesQuery).all(employerId);

    const averageTimeInStage = {
      applied: 0,
      screening: 0,
      shortlisted: 0,
      interview: 0,
      offered: 0
    };

    stageTimes.forEach(row => {
      if (averageTimeInStage[row.from_status] !== undefined) {
        averageTimeInStage[row.from_status] = Math.round(row.avg_days * 10) / 10;
      }
    });

    // Time-to-hire (applied → hired average)
    const timeToHireQuery = isAdmin
      ? `SELECT AVG(julianday(a.updated_at) - julianday(a.applied_at)) as avg_days
         FROM applications a
         WHERE a.status = 'hired'`
      : `SELECT AVG(julianday(a.updated_at) - julianday(a.applied_at)) as avg_days
         FROM applications a
         INNER JOIN jobs j ON a.job_id = j.id
         WHERE j.employer_id = ? AND a.status = 'hired'`;

    const timeToHireResult = isAdmin
      ? db.prepare(timeToHireQuery).get()
      : db.prepare(timeToHireQuery).get(employerId);

    const timeToHire = timeToHireResult?.avg_days 
      ? Math.round(timeToHireResult.avg_days * 10) / 10 
      : null;

    // Conversion rates
    const totalApplications = funnelData.applied + funnelData.screening + funnelData.shortlisted + 
                               funnelData.interview + funnelData.offered + funnelData.hired;

    const conversionRates = {
      appliedToScreening: funnelData.screening > 0 && totalApplications > 0
        ? Math.round((funnelData.screening / totalApplications) * 100)
        : 0,
      screeningToShortlisted: funnelData.shortlisted > 0 && funnelData.screening > 0
        ? Math.round((funnelData.shortlisted / funnelData.screening) * 100)
        : 0,
      shortlistedToInterview: funnelData.interview > 0 && funnelData.shortlisted > 0
        ? Math.round((funnelData.interview / funnelData.shortlisted) * 100)
        : 0,
      interviewToOffered: funnelData.offered > 0 && funnelData.interview > 0
        ? Math.round((funnelData.offered / funnelData.interview) * 100)
        : 0,
      offeredToHired: funnelData.hired > 0 && funnelData.offered > 0
        ? Math.round((funnelData.hired / funnelData.offered) * 100)
        : 0,
      appliedToHired: funnelData.hired > 0 && totalApplications > 0
        ? Math.round((funnelData.hired / totalApplications) * 100)
        : 0
    };

    // Drop-off rate per stage
    const dropOffRates = {
      applied: funnelData.rejected > 0 && totalApplications > 0
        ? Math.round((funnelData.rejected / totalApplications) * 100)
        : 0,
      withdrawn: funnelData.withdrawn > 0 && totalApplications > 0
        ? Math.round((funnelData.withdrawn / totalApplications) * 100)
        : 0
    };

    // Applications this week vs previous week
    const thisWeekQuery = isAdmin
      ? `SELECT COUNT(*) as count FROM applications 
         WHERE date(applied_at) >= date('now', '-7 days')`
      : `SELECT COUNT(*) as count FROM applications a
         INNER JOIN jobs j ON a.job_id = j.id
         WHERE j.employer_id = ? AND date(a.applied_at) >= date('now', '-7 days')`;

    const lastWeekQuery = isAdmin
      ? `SELECT COUNT(*) as count FROM applications 
         WHERE date(applied_at) >= date('now', '-14 days') 
         AND date(applied_at) < date('now', '-7 days')`
      : `SELECT COUNT(*) as count FROM applications a
         INNER JOIN jobs j ON a.job_id = j.id
         WHERE j.employer_id = ? 
         AND date(a.applied_at) >= date('now', '-14 days') 
         AND date(a.applied_at) < date('now', '-7 days')`;

    const thisWeek = isAdmin
      ? db.prepare(thisWeekQuery).get()
      : db.prepare(thisWeekQuery).get(employerId);
    const lastWeek = isAdmin
      ? db.prepare(lastWeekQuery).get()
      : db.prepare(lastWeekQuery).get(employerId);

    const weeklyTrend = {
      thisWeek: thisWeek?.count || 0,
      lastWeek: lastWeek?.count || 0,
      change: lastWeek?.count > 0 
        ? Math.round(((thisWeek?.count || 0) - lastWeek.count) / lastWeek.count * 100)
        : 0
    };

    // Applications this month vs previous month
    const thisMonthQuery = isAdmin
      ? `SELECT COUNT(*) as count FROM applications 
         WHERE date(applied_at) >= date('now', 'start of month')`
      : `SELECT COUNT(*) as count FROM applications a
         INNER JOIN jobs j ON a.job_id = j.id
         WHERE j.employer_id = ? AND date(a.applied_at) >= date('now', 'start of month')`;

    const lastMonthQuery = isAdmin
      ? `SELECT COUNT(*) as count FROM applications 
         WHERE date(applied_at) >= date('now', 'start of month', '-1 month')
         AND date(applied_at) < date('now', 'start of month')`
      : `SELECT COUNT(*) as count FROM applications a
         INNER JOIN jobs j ON a.job_id = j.id
         WHERE j.employer_id = ? 
         AND date(a.applied_at) >= date('now', 'start of month', '-1 month')
         AND date(a.applied_at) < date('now', 'start of month')`;

    const thisMonth = isAdmin
      ? db.prepare(thisMonthQuery).get()
      : db.prepare(thisMonthQuery).get(employerId);
    const lastMonth = isAdmin
      ? db.prepare(lastMonthQuery).get()
      : db.prepare(lastMonthQuery).get(employerId);

    const monthlyTrend = {
      thisMonth: thisMonth?.count || 0,
      lastMonth: lastMonth?.count || 0,
      change: lastMonth?.count > 0
        ? Math.round(((thisMonth?.count || 0) - lastMonth.count) / lastMonth.count * 100)
        : 0
    };

    // Top performing jobs (most applications, best conversion)
    const topJobsQuery = isAdmin
      ? `SELECT 
           j.id,
           j.title,
           COUNT(a.id) as application_count,
           SUM(CASE WHEN a.status = 'hired' THEN 1 ELSE 0 END) as hired_count,
           ROUND(CAST(SUM(CASE WHEN a.status = 'hired' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(a.id) * 100, 1) as conversion_rate
         FROM jobs j
         LEFT JOIN applications a ON j.id = a.job_id
         GROUP BY j.id
         HAVING application_count > 0
         ORDER BY application_count DESC
         LIMIT 10`
      : `SELECT 
           j.id,
           j.title,
           COUNT(a.id) as application_count,
           SUM(CASE WHEN a.status = 'hired' THEN 1 ELSE 0 END) as hired_count,
           ROUND(CAST(SUM(CASE WHEN a.status = 'hired' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(a.id) * 100, 1) as conversion_rate
         FROM jobs j
         LEFT JOIN applications a ON j.id = a.job_id
         WHERE j.employer_id = ?
         GROUP BY j.id
         HAVING application_count > 0
         ORDER BY application_count DESC
         LIMIT 10`;

    const topJobs = isAdmin
      ? db.prepare(topJobsQuery).all()
      : db.prepare(topJobsQuery).all(employerId);

    res.json({
      funnelData,
      averageTimeInStage,
      timeToHire,
      conversionRates,
      dropOffRates,
      weeklyTrend,
      monthlyTrend,
      topJobs,
      totalApplications,
      activePipeline: funnelData.applied + funnelData.screening + funnelData.shortlisted + funnelData.interview + funnelData.offered
    });

  } catch (error) {
    logger.error('Pipeline analytics error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch pipeline analytics' });
  }
});

module.exports = router;
