const logger = require('../utils/logger');
const { validate, schemas } = require("../middleware/validate");
const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// POST /jobs/:jobId/questions - Employer adds screening questions
router.post('/jobs/:jobId/questions', authenticateToken, requireRole('employer', 'admin'), validate(schemas.screeningQuestion), (req, res) => {
  try {
    const { jobId } = req.params;
    const { question, question_type, options, required, sort_order } = req.body;
    const userId = req.user.id;

    // Verify job ownership (or admin)
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.employer_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to add questions to this job' });
    }

    const result = db.prepare(`
      INSERT INTO screening_questions (job_id, question, question_type, options, required, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(jobId, question, question_type, options ? JSON.stringify(options) : null, required || 1, sort_order || 0);

    const newQuestion = db.prepare('SELECT * FROM screening_questions WHERE id = ?').get(result.lastInsertRowid);
    
    // Parse options back to JSON
    if (newQuestion.options) {
      try {
        newQuestion.options = JSON.parse(newQuestion.options);
      } catch(e) {
        newQuestion.options = null;
      }
    }

    res.status(201).json({ question: newQuestion });
  } catch (error) {
    logger.error('Error creating screening question', { error: error.message });
    res.status(500).json({ error: 'Failed to create screening question' });
  }
});

// GET /jobs/:jobId/questions - Get screening questions for a job (public)
router.get('/jobs/:jobId/questions', (req, res) => {
  try {
    const { jobId } = req.params;

    // Verify job exists
    const job = db.prepare('SELECT id FROM jobs WHERE id = ?').get(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const questions = db.prepare(`
      SELECT * FROM screening_questions 
      WHERE job_id = ? 
      ORDER BY sort_order, id
    `).all(jobId);

    // Parse options JSON
    questions.forEach(q => {
      if (q.options) {
        try {
          q.options = JSON.parse(q.options);
        } catch(e) {
          q.options = null;
        }
      }
    });

    res.json({ questions });
  } catch (error) {
    logger.error('Error fetching screening questions', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch screening questions' });
  }
});

// DELETE /jobs/:jobId/questions/:questionId - Delete a screening question
router.delete('/jobs/:jobId/questions/:questionId', authenticateToken, requireRole('employer', 'admin'), (req, res) => {
  try {
    const { jobId, questionId } = req.params;
    const userId = req.user.id;

    // Verify job ownership
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.employer_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = db.prepare('DELETE FROM screening_questions WHERE id = ? AND job_id = ?').run(questionId, jobId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    logger.error('Error deleting screening question', { error: error.message });
    res.status(500).json({ error: 'Failed to delete screening question' });
  }
});

// POST /applications/:appId/answers - Jobseeker submits screening answers
router.post('/applications/:appId/answers', authenticateToken, requireRole('jobseeker'), validate(schemas.screeningAnswers), (req, res) => {
  try {
    const { appId } = req.params;
    const { answers } = req.body; // Array of { question_id, answer }
    const userId = req.user.id;

    // Verify application ownership
    const application = db.prepare('SELECT * FROM applications WHERE id = ? AND jobseeker_id = ?').get(appId, userId);
    if (!application) {
      return res.status(404).json({ error: 'Application not found or access denied' });
    }

    // Check if answers already exist (prevent duplicate submissions)
    const existingAnswers = db.prepare('SELECT COUNT(*) as count FROM screening_answers WHERE application_id = ?').get(appId);
    if (existingAnswers?.count > 0) {
      return res.status(400).json({ error: 'Screening answers already submitted for this application' });
    }

    // Verify all questions exist and belong to this job
    const job_id = application.job_id;
    const questions = db.prepare('SELECT id, required FROM screening_questions WHERE job_id = ?').all(job_id);
    
    if (questions.length === 0) {
      return res.status(400).json({ error: 'No screening questions found for this job' });
    }

    // Check that all required questions are answered
    const requiredQuestionIds = questions.filter(q => q.required === 1).map(q => q.id);
    const answeredQuestionIds = answers.map(a => a.question_id);
    const missingRequired = requiredQuestionIds.filter(id => !answeredQuestionIds.includes(id));

    if (missingRequired.length > 0) {
      return res.status(400).json({ 
        error: 'All required questions must be answered',
        missing_questions: missingRequired
      });
    }

    // Insert answers
    const insert = db.prepare(`
      INSERT INTO screening_answers (application_id, question_id, answer)
      VALUES (?, ?, ?)
    `);

    const savedAnswers = [];
    for (const ans of answers) {
      // Verify question belongs to this job
      const questionValid = questions.find(q => q.id === ans.question_id);
      if (!questionValid) {
        return res.status(400).json({ error: `Invalid question_id: ${ans.question_id}` });
      }

      const result = insert.run(appId, ans.question_id, ans.answer);
      savedAnswers.push({
        id: result.lastInsertRowid,
        application_id: appId,
        question_id: ans.question_id,
        answer: ans.answer
      });
    }

    // Update application to screening status
    db.prepare(`UPDATE applications SET status = 'screening', updated_at = datetime('now') WHERE id = ?`).run(appId);

    res.status(201).json({ answers: savedAnswers, message: 'Screening answers submitted successfully' });
  } catch (error) {
    logger.error('Error saving screening answers', { error: error.message });
    res.status(500).json({ error: 'Failed to save screening answers' });
  }
});

// GET /applications/:appId/answers - Get screening answers for an application (employer or applicant)
router.get('/applications/:appId/answers', authenticateToken, (req, res) => {
  try {
    const { appId } = req.params;
    const userId = req.user.id;

    // Get application to verify access
    const application = db.prepare(`
      SELECT a.*, j.employer_id
      FROM applications a
      INNER JOIN jobs j ON a.job_id = j.id
      WHERE a.id = ?
    `).get(appId);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Check access: must be the applicant, the employer, or admin
    if (application.jobseeker_id !== userId && 
        application.employer_id !== userId && 
        req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to view these answers' });
    }

    const answers = db.prepare(`
      SELECT sa.*, sq.question, sq.question_type, sq.options, sq.required
      FROM screening_answers sa
      INNER JOIN screening_questions sq ON sa.question_id = sq.id
      WHERE sa.application_id = ?
      ORDER BY sq.sort_order, sq.id
    `).all(appId);

    // Parse options JSON
    answers.forEach(a => {
      if (a.options) {
        try {
          a.options = JSON.parse(a.options);
        } catch(e) {
          a.options = null;
        }
      }
    });

    res.json({ answers });
  } catch (error) {
    logger.error('Error fetching screening answers', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch screening answers' });
  }
});

module.exports = router;
