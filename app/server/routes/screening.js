const { validate, schemas } = require("../middleware/validate");
const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

// POST /jobs/:jobId/questions - Employer adds screening questions
router.post('/jobs/:jobId/questions', authenticateToken, validate(schemas.screeningQuestion), (req, res) => {
  try {
    const { jobId } = req.params;
    const { question, question_type, options, required, sort_order } = req.body;
    const userId = req.user.id;

    // Verify job ownership
    const job = db.prepare('SELECT * FROM jobs WHERE id = ? AND employer_id = ?').get(jobId, userId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found or access denied' });
    }

    const result = db.prepare(`
      INSERT INTO screening_questions (job_id, question, question_type, options, required, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(jobId, question, question_type, options ? JSON.stringify(options) : null, required || 1, sort_order || 0);

    const newQuestion = db.prepare('SELECT * FROM screening_questions WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ question: newQuestion });
  } catch (error) {
    console.error('Error creating screening question:', error);
    res.status(500).json({ error: 'Failed to create screening question' });
  }
});

// GET /jobs/:jobId/questions - Get screening questions for a job
router.get('/jobs/:jobId/questions', (req, res) => {
  try {
    const { jobId } = req.params;

    const questions = db.prepare(`
      SELECT * FROM screening_questions 
      WHERE job_id = ? 
      ORDER BY sort_order, id
    `).all(jobId);

    res.json({ questions });
  } catch (error) {
    console.error('Error fetching screening questions:', error);
    res.status(500).json({ error: 'Failed to fetch screening questions' });
  }
});

// POST /applications/:appId/answers - Jobseeker submits answers
router.post('/applications/:appId/answers', authenticateToken, (req, res) => {
  try {
    const { appId } = req.params;
    const { answers } = req.body; // Array of { question_id, answer }
    const userId = req.user.id;

    // Verify application ownership
    const application = db.prepare('SELECT * FROM applications WHERE id = ? AND jobseeker_id = ?').get(appId, userId);
    if (!application) {
      return res.status(404).json({ error: 'Application not found or access denied' });
    }

    const insert = db.prepare(`
      INSERT INTO screening_answers (application_id, question_id, answer)
      VALUES (?, ?, ?)
    `);

    const savedAnswers = [];
    for (const ans of answers) {
      const result = insert.run(appId, ans.question_id, ans.answer);
      savedAnswers.push({
        id: result.lastInsertRowid,
        application_id: appId,
        question_id: ans.question_id,
        answer: ans.answer
      });
    }

    res.status(201).json({ answers: savedAnswers });
  } catch (error) {
    console.error('Error saving screening answers:', error);
    res.status(500).json({ error: 'Failed to save screening answers' });
  }
});

module.exports = router;
