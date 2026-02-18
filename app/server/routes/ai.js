/**
 * AI Router API — exposes AI capabilities and usage stats
 */
const express = require('express');
const router = express.Router();
const { route, getUsageStats } = require('../lib/ai-router');
const auth = require('../middleware/auth');

// GET /api/ai/status — usage stats (admin only)
router.get('/status', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  res.json({ stats: getUsageStats() });
});

// POST /api/ai/generate — general AI generation (admin only for now)
router.post('/generate', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  
  const { prompt, task, systemPrompt, maxTokens, temperature, provider } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });
  
  try {
    const result = await route(prompt, {
      task: task || 'general',
      systemPrompt,
      maxTokens,
      temperature,
      preferProvider: provider,
    });
    res.json({ result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/ai/job-match — calculate job-profile compatibility
router.post('/job-match', auth, async (req, res) => {
  const { jobDescription, jobRequirements, jobTitle, userSkills, userExperience, userLocation } = req.body;
  
  const prompt = `Analyze the compatibility between this job and candidate. Return ONLY a JSON object.

Job: "${jobTitle}"
Description: ${(jobDescription || '').slice(0, 500)}
Requirements: ${(jobRequirements || '').slice(0, 300)}

Candidate:
Skills: ${userSkills || 'Not specified'}
Experience: ${userExperience || 'Not specified'}  
Location: ${userLocation || 'Not specified'}

Return JSON: {"score": 0-100, "skillMatch": 0-100, "locationMatch": 0-100, "experienceMatch": 0-100, "tips": ["tip1", "tip2"], "summary": "one line summary"}`;

  try {
    const result = await route(prompt, {
      task: 'matching',
      systemPrompt: 'You are a recruitment matching engine. Return only valid JSON, no markdown.',
      maxTokens: 500,
      temperature: 0.3,
    });
    
    // Parse the JSON from response
    let match;
    try {
      const jsonStr = result.text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      match = JSON.parse(jsonStr);
    } catch {
      match = { score: 50, summary: 'Unable to calculate match', tips: [] };
    }
    
    res.json({ match, provider: result.provider, model: result.model });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/ai/cover-letter — generate cover letter
router.post('/cover-letter', auth, async (req, res) => {
  const { jobTitle, companyName, jobDescription, userName, userSkills, userExperience } = req.body;
  
  const prompt = `Write a professional cover letter for this job application.

Applicant: ${userName}
Skills: ${userSkills || 'Not specified'}
Experience: ${userExperience || 'Not specified'}

Job: ${jobTitle} at ${companyName}
Description: ${(jobDescription || '').slice(0, 500)}

Write a concise, professional cover letter (3 paragraphs max). Be specific to the role. No generic filler.`;

  try {
    const result = await route(prompt, {
      task: 'coverletter',
      systemPrompt: 'You write professional, concise cover letters for job applications in Papua New Guinea. Be direct and specific.',
      maxTokens: 1024,
      temperature: 0.7,
    });
    
    res.json({ coverLetter: result.text, provider: result.provider });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/ai/improve-job — improve a job description
router.post('/improve-job', auth, async (req, res) => {
  if (req.user.role !== 'employer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Employers only' });
  }
  
  const { title, description, requirements } = req.body;
  
  const prompt = `Improve this job posting to attract better candidates in Papua New Guinea.

Title: ${title}
Description: ${(description || '').slice(0, 1000)}
Requirements: ${(requirements || '').slice(0, 500)}

Return JSON: {"title": "improved title", "description": "improved description", "requirements": "improved requirements", "tips": ["what was improved and why"]}`;

  try {
    const result = await route(prompt, {
      task: 'jobdesc',
      systemPrompt: 'You are a recruitment specialist for Papua New Guinea. Improve job postings to be clear, inclusive, and attractive. Include salary transparency suggestions. Return only valid JSON.',
      maxTokens: 1500,
      temperature: 0.6,
    });
    
    let improved;
    try {
      const jsonStr = result.text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      improved = JSON.parse(jsonStr);
    } catch {
      improved = { tips: ['Could not parse improvement. Try again.'] };
    }
    
    res.json({ improved, provider: result.provider });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
