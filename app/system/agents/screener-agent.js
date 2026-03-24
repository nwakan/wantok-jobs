#!/usr/bin/env node
/**
 * Screener Agent - AI-Powered Candidate Screening
 * Task: Task 18 - Smart Matching (Component 2)
 * Date: 2026-03-24
 */

const Database = require('better-sqlite3');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const dbPath = path.resolve(__dirname, '../../server/data/wantokjobs.db');
const db = new Database(dbPath);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

class ScreenerAgent {
  async generateScreeningQuestions(jobId, jobData) {
    try {
      const existing = db.prepare('SELECT COUNT(*) as count FROM screening_questions WHERE job_id = ?').get(jobId);
      if (existing.count > 0) return [];

      const prompt = `Generate 5-7 screening questions for:\nTitle: ${jobData.title}\nDescription: ${jobData.description}\n\nReturn JSON array: [{"question_text":"","question_type":"text","category":"skill","weight":1.0,"expected_answer":""}]`;
      
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }]
      });

      const questions = JSON.parse(response.content[0].text.match(/\[\s*\{[\s\S]*\}\s*\]/)[0]);
      
      const stmt = db.prepare('INSERT INTO screening_questions (job_id, question_text, question_type, question_order, is_required, expected_answer, weight, category) VALUES (?, ?, ?, ?, 1, ?, ?, ?)');
      
      questions.forEach((q, i) => stmt.run(jobId, q.question_text, q.question_type, i+1, q.expected_answer, q.weight || 1.0, q.category || 'general'));
      
      return questions;
    } catch (error) {
      console.error('[ScreenerAgent] Error:', error);
      return [];
    }
  }

  async scoreScreeningAnswer(applicationId, questionId, answerText) {
    try {
      const q = db.prepare('SELECT * FROM screening_questions WHERE question_id = ?').get(questionId);
      if (!q) return { ai_score: 0, ai_feedback: 'Invalid question', flagged: 1 };

      const prompt = `Score answer (0.0-1.0):\nQ: ${q.question_text}\nExpected: ${q.expected_answer}\nAnswer: ${answerText}\n\nReturn JSON: {"ai_score":0.85,"ai_feedback":"","flagged":0}`;
      
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }]
      });

      const score = JSON.parse(response.content[0].text.match(/\{[\s\S]*\}/)[0]);
      
      db.prepare('INSERT INTO screening_answers (application_id, question_id, answer_text, ai_score, ai_feedback, flagged) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(application_id, question_id) DO UPDATE SET ai_score=excluded.ai_score, ai_feedback=excluded.ai_feedback').run(
        applicationId, questionId, answerText, score.ai_score || 0, score.ai_feedback || '', score.flagged ? 1 : 0
      );
      
      return score;
    } catch (error) {
      console.error('[ScreenerAgent] Scoring error:', error);
      return { ai_score: 0.5, ai_feedback: 'Error', flagged: 0 };
    }
  }

  calculateScreeningScore(applicationId) {
    const result = db.prepare('SELECT AVG(ai_score) as avg_score, COUNT(*) as answered, (SELECT COUNT(*) FROM screening_questions sq JOIN applications a ON sq.job_id = a.job_id WHERE a.id = ?) as total FROM screening_answers WHERE application_id = ?').get(applicationId, applicationId);
    return { score: result.avg_score || 0, answered: result.answered, total: result.total };
  }
}

module.exports = new ScreenerAgent();
