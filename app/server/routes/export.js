const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const router = express.Router();

// UTF-8 BOM for Excel compatibility
const BOM = '\uFEFF';

function escapeCSV(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function csvRow(fields) {
  return fields.map(escapeCSV).join(',');
}

function sendCSV(res, filename, headers, rows) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  let csv = BOM + csvRow(headers) + '\n';
  for (const row of rows) {
    csv += csvRow(row) + '\n';
  }
  res.send(csv);
}

// All routes require employer auth
router.use(authenticateToken, requireRole('employer', 'admin'));

// GET /api/export/applicants?job_id=X
router.get('/applicants', (req, res) => {
  const { job_id } = req.query;
  if (!job_id) return res.status(400).json({ error: 'job_id is required' });

  // Verify employer owns this job (unless admin)
  const job = db.prepare('SELECT id, title, employer_id FROM jobs WHERE id = ?').get(job_id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (req.user.role !== 'admin' && job.employer_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const applicants = db.prepare(`
    SELECT u.name, u.email, u.phone, a.status, a.applied_at, a.cover_letter
    FROM applications a
    JOIN users u ON u.id = a.jobseeker_id
    WHERE a.job_id = ?
    ORDER BY a.applied_at DESC
  `).all(job_id);

  const headers = ['Name', 'Email', 'Phone', 'Status', 'Applied At', 'Cover Letter'];
  const rows = applicants.map(a => [a.name, a.email, a.phone, a.status, a.applied_at, a.cover_letter]);
  const safeTitle = (job.title || 'job').replace(/[^a-zA-Z0-9]/g, '_');
  sendCSV(res, `applicants_${safeTitle}_${new Date().toISOString().slice(0,10)}.csv`, headers, rows);
});

// GET /api/export/applicants/all
router.get('/applicants/all', (req, res) => {
  const applicants = db.prepare(`
    SELECT j.title AS job_title, u.name, u.email, u.phone, a.status, a.applied_at, a.cover_letter
    FROM applications a
    JOIN users u ON u.id = a.jobseeker_id
    JOIN jobs j ON j.id = a.job_id
    WHERE j.employer_id = ?
    ORDER BY a.applied_at DESC
  `).all(req.user.id);

  const headers = ['Job Title', 'Name', 'Email', 'Phone', 'Status', 'Applied At', 'Cover Letter'];
  const rows = applicants.map(a => [a.job_title, a.name, a.email, a.phone, a.status, a.applied_at, a.cover_letter]);
  sendCSV(res, `all_applicants_${new Date().toISOString().slice(0,10)}.csv`, headers, rows);
});

// GET /api/export/jobs
router.get('/jobs', (req, res) => {
  const jobsList = db.prepare(`
    SELECT j.title, j.status, j.location, 
           CASE WHEN j.salary_min IS NOT NULL AND j.salary_max IS NOT NULL 
                THEN j.salary_currency || ' ' || j.salary_min || ' - ' || j.salary_max
                WHEN j.salary_min IS NOT NULL THEN j.salary_currency || ' ' || j.salary_min
                ELSE '' END AS salary,
           j.views_count,
           (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applications_count,
           j.created_at AS posted_at
    FROM jobs j
    WHERE j.employer_id = ?
    ORDER BY j.created_at DESC
  `).all(req.user.id);

  const headers = ['Title', 'Status', 'Location', 'Salary', 'Views', 'Applications', 'Posted At'];
  const rows = jobsList.map(j => [j.title, j.status, j.location, j.salary, j.views_count, j.applications_count, j.posted_at]);
  sendCSV(res, `my_jobs_${new Date().toISOString().slice(0,10)}.csv`, headers, rows);
});

module.exports = router;
