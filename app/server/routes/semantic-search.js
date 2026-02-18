/**
 * Semantic Search API Routes
 * 
 * Provides semantic job and candidate matching using vector embeddings
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const vectorStore = require('../lib/vector-store');
const logger = require('../utils/logger');
const { expand } = require('../lib/tok-pisin');

/**
 * GET /api/search/semantic?q=painim wok long mining&limit=20
 * Semantic job search with Tok Pisin expansion
 */
router.get('/semantic', async (req, res) => {
  try {
    const { q, limit = 20, min_score = 0.5 } = req.query;
    
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    
    const limitNum = Math.min(parseInt(limit) || 20, 100);
    const minScore = parseFloat(min_score) || 0.5;
    
    // Expand Tok Pisin terms
    const expandedQuery = expand(q);
    
    try {
      // Perform semantic search
      const results = await vectorStore.search(expandedQuery, 'job', limitNum, minScore);
      
      if (results.length === 0) {
        // Fall back to FTS search if no semantic matches
        logger.info('Semantic search returned no results, falling back to FTS', { query: q });
        const ftsResults = performFTSSearch(q, limitNum);
        
        return res.json({
          jobs: ftsResults,
          scores: ftsResults.map(() => ({ score: 0, method: 'fts' })),
          query_expanded: expandedQuery,
          method: 'fts_fallback',
          total: ftsResults.length
        });
      }
      
      // Get job details for matched IDs
      const jobIds = results.map(r => r.entity_id);
      const placeholders = jobIds.map(() => '?').join(',');
      
      const jobs = db.prepare(`
        SELECT 
          j.*,
          u.name as employer_name,
          u.is_verified as employer_verified,
          COALESCE(j.company_display_name, pe.company_name) as company_name,
          COALESCE(j.logo_url, pe.logo_url) as logo_url
        FROM jobs j
        JOIN users u ON j.employer_id = u.id
        LEFT JOIN profiles_employer pe ON u.id = pe.user_id
        WHERE j.id IN (${placeholders}) AND j.status = 'active'
      `).all(...jobIds);
      
      // Map scores back to jobs
      const jobsWithScores = jobs.map(job => {
        const result = results.find(r => r.entity_id === job.id);
        return {
          ...job,
          semantic_score: result ? result.score : 0
        };
      });
      
      // Sort by score
      jobsWithScores.sort((a, b) => b.semantic_score - a.semantic_score);
      
      res.json({
        jobs: jobsWithScores,
        scores: results,
        query_expanded: expandedQuery,
        method: 'semantic',
        total: jobsWithScores.length
      });
      
    } catch (embeddingError) {
      // Fall back to FTS if embedding fails
      logger.error('Semantic search failed, falling back to FTS', { error: embeddingError.message });
      const ftsResults = performFTSSearch(q, limitNum);
      
      return res.json({
        jobs: ftsResults,
        scores: ftsResults.map(() => ({ score: 0, method: 'fts' })),
        query_expanded: expandedQuery,
        method: 'fts_fallback',
        error: embeddingError.message,
        total: ftsResults.length
      });
    }
    
  } catch (error) {
    logger.error('Semantic search error', { error: error.message });
    res.status(500).json({ error: 'Semantic search failed', details: error.message });
  }
});

/**
 * GET /api/search/match-jobs/:userId
 * Find best jobs for a jobseeker using their profile embedding
 */
router.get('/match-jobs/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const minScore = parseFloat(req.query.min_score) || 0.6;
    
    // Check authorization
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    // Check if profile is embedded
    const profileVector = vectorStore.getVector('profile', userId);
    
    if (!profileVector) {
      return res.status(404).json({ 
        error: 'Profile not indexed yet',
        message: 'Your profile needs to be indexed first. This happens automatically.'
      });
    }
    
    // Find similar jobs
    const results = vectorStore.findSimilar('job', userId, limit, minScore);
    
    if (results.length === 0) {
      return res.json({ jobs: [], scores: [], total: 0 });
    }
    
    // Get job details
    const jobIds = results.map(r => r.entity_id);
    const placeholders = jobIds.map(() => '?').join(',');
    
    const jobs = db.prepare(`
      SELECT 
        j.*,
        u.name as employer_name,
        u.is_verified as employer_verified,
        COALESCE(j.company_display_name, pe.company_name) as company_name,
        COALESCE(j.logo_url, pe.logo_url) as logo_url
      FROM jobs j
      JOIN users u ON j.employer_id = u.id
      LEFT JOIN profiles_employer pe ON u.id = pe.user_id
      WHERE j.id IN (${placeholders}) AND j.status = 'active'
    `).all(...jobIds);
    
    // Map scores back to jobs
    const jobsWithScores = jobs.map(job => {
      const result = results.find(r => r.entity_id === job.id);
      return {
        ...job,
        match_score: result ? result.score : 0
      };
    });
    
    // Sort by score
    jobsWithScores.sort((a, b) => b.match_score - a.match_score);
    
    res.json({
      jobs: jobsWithScores,
      scores: results,
      total: jobsWithScores.length
    });
    
  } catch (error) {
    logger.error('Match jobs error', { error: error.message });
    res.status(500).json({ error: 'Failed to match jobs', details: error.message });
  }
});

/**
 * GET /api/search/match-candidates/:jobId
 * Find best candidates for a job (employer only)
 */
router.get('/match-candidates/:jobId', authenticateToken, requireRole('employer', 'admin'), async (req, res) => {
  try {
    const jobId = parseInt(req.params.jobId);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const minScore = parseFloat(req.query.min_score) || 0.6;
    
    // Check if job exists and user owns it (unless admin)
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    if (req.user.role !== 'admin' && job.employer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    // Check if job is embedded
    const jobVector = vectorStore.getVector('job', jobId);
    
    if (!jobVector) {
      return res.status(404).json({ 
        error: 'Job not indexed yet',
        message: 'This job needs to be indexed first. This happens automatically.'
      });
    }
    
    // Find similar profiles
    const results = vectorStore.findSimilar('profile', jobId, limit, minScore);
    
    if (results.length === 0) {
      return res.json({ candidates: [], scores: [], total: 0 });
    }
    
    // Get candidate details
    const userIds = results.map(r => r.entity_id);
    const placeholders = userIds.map(() => '?').join(',');
    
    const candidates = db.prepare(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        p.headline,
        p.location,
        p.country,
        p.skills,
        p.bio,
        p.desired_job_type,
        p.desired_salary_min,
        p.desired_salary_max,
        p.availability,
        p.profile_photo_url,
        p.cv_url,
        p.last_active
      FROM users u
      JOIN profiles_jobseeker p ON p.user_id = u.id
      WHERE u.id IN (${placeholders}) AND u.status = 'active'
    `).all(...userIds);
    
    // Map scores back to candidates
    const candidatesWithScores = candidates.map(candidate => {
      const result = results.find(r => r.entity_id === candidate.id);
      return {
        ...candidate,
        match_score: result ? result.score : 0
      };
    });
    
    // Sort by score
    candidatesWithScores.sort((a, b) => b.match_score - a.match_score);
    
    res.json({
      candidates: candidatesWithScores,
      scores: results,
      total: candidatesWithScores.length
    });
    
  } catch (error) {
    logger.error('Match candidates error', { error: error.message });
    res.status(500).json({ error: 'Failed to match candidates', details: error.message });
  }
});

/**
 * GET /api/search/similar/:jobId
 * Find similar jobs to a given job
 */
router.get('/similar/:jobId', async (req, res) => {
  try {
    const jobId = parseInt(req.params.jobId);
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const minScore = parseFloat(req.query.min_score) || 0.5;
    
    // Check if job exists
    const job = db.prepare('SELECT * FROM jobs WHERE id = ? AND status = ?').get(jobId, 'active');
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Check if job is embedded
    const jobVector = vectorStore.getVector('job', jobId);
    
    if (!jobVector) {
      return res.status(404).json({ 
        error: 'Job not indexed yet',
        message: 'This job needs to be indexed first.'
      });
    }
    
    // Find similar jobs
    const results = vectorStore.findSimilar('job', jobId, limit, minScore);
    
    if (results.length === 0) {
      return res.json({ jobs: [], scores: [], total: 0 });
    }
    
    // Get job details
    const jobIds = results.map(r => r.entity_id);
    const placeholders = jobIds.map(() => '?').join(',');
    
    const jobs = db.prepare(`
      SELECT 
        j.*,
        u.name as employer_name,
        u.is_verified as employer_verified,
        COALESCE(j.company_display_name, pe.company_name) as company_name,
        COALESCE(j.logo_url, pe.logo_url) as logo_url
      FROM jobs j
      JOIN users u ON j.employer_id = u.id
      LEFT JOIN profiles_employer pe ON u.id = pe.user_id
      WHERE j.id IN (${placeholders}) AND j.status = 'active'
    `).all(...jobIds);
    
    // Map scores back to jobs
    const jobsWithScores = jobs.map(job => {
      const result = results.find(r => r.entity_id === job.id);
      return {
        ...job,
        similarity_score: result ? result.score : 0
      };
    });
    
    // Sort by score
    jobsWithScores.sort((a, b) => b.similarity_score - a.similarity_score);
    
    res.json({
      jobs: jobsWithScores,
      scores: results,
      total: jobsWithScores.length
    });
    
  } catch (error) {
    logger.error('Similar jobs error', { error: error.message });
    res.status(500).json({ error: 'Failed to find similar jobs', details: error.message });
  }
});

/**
 * Fallback FTS search
 */
function performFTSSearch(query, limit) {
  try {
    const ftsIds = db.prepare('SELECT rowid FROM jobs_fts WHERE jobs_fts MATCH ?').all(query.replace(/[^\w\s]/g, ' '));
    
    if (ftsIds.length === 0) {
      return [];
    }
    
    const placeholders = ftsIds.map(() => '?').join(',');
    const jobs = db.prepare(`
      SELECT 
        j.*,
        u.name as employer_name,
        u.is_verified as employer_verified,
        COALESCE(j.company_display_name, pe.company_name) as company_name,
        COALESCE(j.logo_url, pe.logo_url) as logo_url
      FROM jobs j
      JOIN users u ON j.employer_id = u.id
      LEFT JOIN profiles_employer pe ON u.id = pe.user_id
      WHERE j.id IN (${placeholders}) AND j.status = 'active'
      LIMIT ?
    `).all(...ftsIds.map(r => r.rowid), limit);
    
    return jobs;
  } catch (e) {
    logger.error('FTS fallback failed', { error: e.message });
    return [];
  }
}

module.exports = router;
