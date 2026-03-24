#!/usr/bin/env node
/**
 * Matchmaker Agent - AI-Powered Job-Candidate Matching
 * Task: Task 18 - Smart Matching (Component 4)
 * Date: 2026-03-24
 */

const Database = require('better-sqlite3');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const dbPath = path.resolve(__dirname, '../../server/data/wantokjobs.db');
const db = new Database(dbPath);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

class MatchmakerAgent {
  calculateSkillsMatch(jobSkills, userSkills) {
    if (!jobSkills || !userSkills) return 0;
    const jobSet = new Set(jobSkills.toLowerCase().split(',').map(s => s.trim()));
    const userSet = new Set(userSkills.toLowerCase().split(',').map(s => s.trim()));
    const intersection = [...jobSet].filter(s => userSet.has(s)).length;
    return jobSet.size > 0 ? intersection / jobSet.size : 0;
  }

  calculateExperienceMatch(requiredYears, userYears) {
    if (!requiredYears || !userYears) return 0.5;
    if (userYears >= requiredYears) return 1.0;
    return Math.max(0, userYears / requiredYears);
  }

  calculateLocationMatch(jobLocation, userLocation) {
    if (!jobLocation || !userLocation) return 0.5;
    const jobLoc = jobLocation.toLowerCase();
    const userLoc = userLocation.toLowerCase();
    if (jobLoc === userLoc) return 1.0;
    if (jobLoc.includes(userLoc) || userLoc.includes(jobLoc)) return 0.8;
    const pngCities = ['port moresby', 'lae', 'madang', 'mount hagen', 'goroka'];
    if (pngCities.some(c => jobLoc.includes(c) && userLoc.includes(c))) return 0.6;
    return 0.3;
  }

  calculateSalaryMatch(jobMin, jobMax, userExpectation) {
    if (!jobMin || !userExpectation) return 0.5;
    const jobMid = (jobMin + (jobMax || jobMin)) / 2;
    if (userExpectation <= jobMax) return 1.0;
    if (userExpectation <= jobMid * 1.2) return 0.7;
    return 0.3;
  }

  calculateIndustryMatch(jobIndustry, userIndustry) {
    if (!jobIndustry || !userIndustry) return 0.5;
    return jobIndustry.toLowerCase() === userIndustry.toLowerCase() ? 1.0 : 0.4;
  }

  async calculateMatchScore(jobId, userId) {
    try {
      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId);

      if (!job || !user) return null;

      const skills = this.calculateSkillsMatch(job.required_skills, profile?.skills || '');
      const experience = this.calculateExperienceMatch(job.experience_years, profile?.years_experience || 0);
      const location = this.calculateLocationMatch(job.location, profile?.location || '');
      const salary = this.calculateSalaryMatch(job.salary_min, job.salary_max, profile?.salary_expectation || 0);
      const industry = this.calculateIndustryMatch(job.industry, profile?.industry || '');

      const matchScore = (skills * 0.4) + (experience * 0.2) + (location * 0.15) + (salary * 0.15) + (industry * 0.1);

      const breakdown = JSON.stringify({
        skills: skills.toFixed(2),
        experience: experience.toFixed(2),
        location: location.toFixed(2),
        salary: salary.toFixed(2),
        industry: industry.toFixed(2)
      });

      return { matchScore, breakdown, jobTitle: job.title, userName: user.name };
    } catch (error) {
      console.error('[MatchmakerAgent] Error:', error);
      return null;
    }
  }

  async generateMatchExplanation(matchData, language = 'en') {
    try {
      const prompt = language === 'tp'
        ? `Tok Pisin: Explain why candidate matches job (score ${(matchData.matchScore * 100).toFixed(0)}%). Job: ${matchData.jobTitle}. Skills: ${matchData.breakdown.skills}, Experience: ${matchData.breakdown.experience}. Use simple Tok Pisin.`
        : `English: Explain why candidate matches job (score ${(matchData.matchScore * 100).toFixed(0)}%). Job: ${matchData.jobTitle}. Breakdown: ${JSON.stringify(matchData.breakdown)}`;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }]
      });

      return response.content[0].text.trim();
    } catch (error) {
      return language === 'tp' ? 'Yu fitim dispela wok gut.' : 'Good match for this position.';
    }
  }

  async findMatchesForJob(jobId, limit = 10) {
    try {
      const applications = db.prepare('SELECT user_id FROM applications WHERE job_id = ?').all(jobId);
      const matches = [];

      for (const app of applications) {
        const matchData = await this.calculateMatchScore(jobId, app.user_id);
        if (matchData) matches.push({ ...matchData, userId: app.user_id });
      }

      return matches.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
    } catch (error) {
      console.error('[MatchmakerAgent] Find matches error:', error);
      return [];
    }
  }

  async findMatchesForUser(userId, limit = 10) {
    try {
      const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId);
      if (!profile) return [];

      const jobs = db.prepare('SELECT id FROM jobs WHERE status = "active" LIMIT 100').all();
      const matches = [];

      for (const job of jobs) {
        const matchData = await this.calculateMatchScore(job.id, userId);
        if (matchData && matchData.matchScore > 0.5) {
          matches.push({ ...matchData, jobId: job.id });
        }
      }

      return matches.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
    } catch (error) {
      console.error('[MatchmakerAgent] User matches error:', error);
      return [];
    }
  }

  async saveMatch(applicationId, matchData) {
    try {
      const app = db.prepare('SELECT job_id, user_id FROM applications WHERE id = ?').get(applicationId);
      if (!app) return false;

      const explanationEn = await this.generateMatchExplanation(matchData, 'en');
      const explanationTp = await this.generateMatchExplanation(matchData, 'tp');

      db.prepare(`
        INSERT INTO ai_assessments (
          application_id, job_id, user_id, match_score, match_breakdown,
          match_explanation_en, match_explanation_tp
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(application_id) DO UPDATE SET
          match_score = excluded.match_score,
          match_breakdown = excluded.match_breakdown,
          match_explanation_en = excluded.match_explanation_en,
          match_explanation_tp = excluded.match_explanation_tp,
          updated_at = CURRENT_TIMESTAMP
      `).run(
        applicationId,
        app.job_id,
        app.user_id,
        matchData.matchScore,
        matchData.breakdown,
        explanationEn,
        explanationTp
      );

      return true;
    } catch (error) {
      console.error('[MatchmakerAgent] Save match error:', error);
      return false;
    }
  }
}

module.exports = new MatchmakerAgent();
