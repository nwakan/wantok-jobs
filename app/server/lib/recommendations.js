const db = require('../database');
const logger = require('../utils/logger');
const cache = require('./cache');

/**
 * Smart Job Recommendations Engine
 * 
 * Scoring weights:
 *   Category match: 30pts
 *   Skill match:    25pts
 *   Location match: 20pts
 *   Recency:        15pts
 *   Popularity:     10pts
 */

const WEIGHTS = {
  category: 30,
  skill: 25,
  location: 20,
  recency: 15,
  popularity: 10,
};

/**
 * Get personalized recommendations for a logged-in jobseeker
 */
function getPersonalizedRecommendations(userId, limit = 10) {
  // Gather user profile data
  const profile = db.prepare('SELECT * FROM profiles_jobseeker WHERE user_id = ?').get(userId);
  
  // User's skills (from user_skills table)
  const userSkillRows = db.prepare(`
    SELECT s.name FROM user_skills us JOIN skills s ON us.skill_id = s.id WHERE us.user_id = ?
  `).all(userId);
  const userSkills = userSkillRows.map(r => r.name.toLowerCase());
  
  // Also parse skills from profile JSON
  if (profile?.skills) {
    try {
      const profileSkills = JSON.parse(profile.skills);
      if (Array.isArray(profileSkills)) {
        profileSkills.forEach(s => {
          const sk = (typeof s === 'string' ? s : s.name || '').toLowerCase().trim();
          if (sk && !userSkills.includes(sk)) userSkills.push(sk);
        });
      }
    } catch (e) {}
  }

  // Categories from applied jobs + saved jobs
  const appliedCategories = db.prepare(`
    SELECT DISTINCT j.category_slug, j.category_id
    FROM applications a JOIN jobs j ON a.job_id = j.id
    WHERE a.jobseeker_id = ?
  `).all(userId);

  const savedCategories = db.prepare(`
    SELECT DISTINCT j.category_slug, j.category_id
    FROM saved_jobs sj JOIN jobs j ON sj.job_id = j.id
    WHERE sj.user_id = ?
  `).all(userId);

  const categorySlugs = new Set();
  const categoryIds = new Set();
  [...appliedCategories, ...savedCategories].forEach(r => {
    if (r.category_slug) categorySlugs.add(r.category_slug);
    if (r.category_id) categoryIds.add(r.category_id);
  });

  // User location
  const userLocation = (profile?.location || '').toLowerCase().trim();

  // Already applied job IDs (exclude from recommendations)
  const appliedJobIds = db.prepare(
    'SELECT job_id FROM applications WHERE jobseeker_id = ?'
  ).all(userId).map(r => r.job_id);

  // Get candidate jobs (active, recent, not already applied)
  let excludeClause = '';
  const params = [];
  if (appliedJobIds.length > 0) {
    excludeClause = `AND j.id NOT IN (${appliedJobIds.map(() => '?').join(',')})`;
    params.push(...appliedJobIds);
  }

  const jobs = db.prepare(`
    SELECT j.id, j.title, j.location, j.job_type, j.salary_min, j.salary_max,
           j.salary_currency, j.created_at, j.views_count, j.category_slug,
           j.category_id, j.skills, j.industry, j.is_featured,
           COALESCE(j.company_display_name, pe.company_name) as company_name,
           COALESCE(j.logo_url, pe.logo_url) as logo_url,
           u.is_verified as employer_verified,
           (SELECT COUNT(*) FROM applications WHERE job_id = j.id) as applications_count
    FROM jobs j
    JOIN users u ON j.employer_id = u.id
    LEFT JOIN profiles_employer pe ON j.employer_id = pe.user_id
    WHERE j.status = 'active' ${excludeClause}
    ORDER BY j.created_at DESC
    LIMIT 200
  `).all(...params);

  // Also get categories for each job via job_categories
  const jobCategoryMap = {};
  if (jobs.length > 0) {
    const jobIds = jobs.map(j => j.id);
    const placeholders = jobIds.map(() => '?').join(',');
    const jcRows = db.prepare(`
      SELECT jc.job_id, c.slug FROM job_categories jc
      JOIN categories c ON jc.category_id = c.id
      WHERE jc.job_id IN (${placeholders})
    `).all(...jobIds);
    jcRows.forEach(r => {
      if (!jobCategoryMap[r.job_id]) jobCategoryMap[r.job_id] = [];
      jobCategoryMap[r.job_id].push(r.slug);
    });
  }

  // Score each job
  const now = Date.now();
  const maxViews = Math.max(1, ...jobs.map(j => j.views_count || 0));

  const scored = jobs.map(job => {
    let score = 0;

    // Category match (30pts)
    const jobCats = jobCategoryMap[job.id] || [];
    if (job.category_slug) jobCats.push(job.category_slug);
    const catMatch = jobCats.some(slug => categorySlugs.has(slug)) || 
                     (job.category_id && categoryIds.has(job.category_id));
    if (catMatch) score += WEIGHTS.category;

    // Skill match (25pts) — proportional to how many skills match
    if (userSkills.length > 0) {
      const jobSkillsText = (job.skills || job.title || '').toLowerCase();
      let matched = 0;
      userSkills.forEach(skill => {
        if (jobSkillsText.includes(skill)) matched++;
      });
      score += WEIGHTS.skill * Math.min(1, matched / Math.max(1, Math.min(userSkills.length, 5)));
    }

    // Location match (20pts)
    if (userLocation && job.location) {
      const jobLoc = job.location.toLowerCase();
      if (jobLoc === userLocation) {
        score += WEIGHTS.location;
      } else if (jobLoc.includes(userLocation) || userLocation.includes(jobLoc.split(',')[0].trim())) {
        score += WEIGHTS.location * 0.6;
      }
    }

    // Recency (15pts) — decay over 30 days
    const ageMs = now - new Date(job.created_at).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    score += WEIGHTS.recency * Math.max(0, 1 - ageDays / 30);

    // Popularity (10pts)
    score += WEIGHTS.popularity * ((job.views_count || 0) / maxViews);

    return { ...job, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/**
 * Get popular/trending recommendations for anonymous users
 */
function getPopularRecommendations(limit = 10) {
  const cacheKey = 'recommendations:popular';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const jobs = db.prepare(`
    SELECT j.id, j.title, j.location, j.job_type, j.salary_min, j.salary_max,
           j.salary_currency, j.created_at, j.views_count, j.is_featured,
           j.category_slug,
           COALESCE(j.company_display_name, pe.company_name) as company_name,
           COALESCE(j.logo_url, pe.logo_url) as logo_url,
           u.is_verified as employer_verified,
           (SELECT COUNT(*) FROM applications WHERE job_id = j.id) as applications_count
    FROM jobs j
    JOIN users u ON j.employer_id = u.id
    LEFT JOIN profiles_employer pe ON j.employer_id = pe.user_id
    WHERE j.status = 'active'
    ORDER BY
      CASE WHEN (j.is_featured = 1 AND (j.featured_until IS NULL OR j.featured_until > datetime('now'))) THEN 0 ELSE 1 END,
      (j.views_count * 0.4 + (SELECT COUNT(*) FROM applications WHERE job_id = j.id) * 0.6) DESC,
      j.created_at DESC
    LIMIT ?
  `).all(limit);

  cache.set(cacheKey, jobs, 300); // 5 min cache
  return jobs;
}

/**
 * Get improved similar jobs for a specific job
 */
function getSimilarJobs(jobId, limit = 6) {
  const job = db.prepare(`
    SELECT id, title, location, category_slug, category_id, industry, skills, employer_id
    FROM jobs WHERE id = ?
  `).get(jobId);

  if (!job) return [];

  // Get this job's categories
  const jobCats = db.prepare(`
    SELECT c.slug, c.id FROM job_categories jc
    JOIN categories c ON jc.category_id = c.id WHERE jc.job_id = ?
  `).all(jobId);
  const catSlugs = new Set(jobCats.map(c => c.slug));
  if (job.category_slug) catSlugs.add(job.category_slug);
  const catIds = new Set(jobCats.map(c => c.id));
  if (job.category_id) catIds.add(job.category_id);

  // Extract keywords from title
  const titleWords = (job.title || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const jobSkills = (job.skills || '').toLowerCase();

  const candidates = db.prepare(`
    SELECT j.id, j.title, j.location, j.job_type, j.salary_min, j.salary_max,
           j.salary_currency, j.created_at, j.views_count, j.category_slug,
           j.category_id, j.skills, j.industry, j.employer_id, j.is_featured,
           COALESCE(j.company_display_name, pe.company_name) as company_name,
           COALESCE(j.logo_url, pe.logo_url) as logo_url,
           u.is_verified as employer_verified
    FROM jobs j
    JOIN users u ON j.employer_id = u.id
    LEFT JOIN profiles_employer pe ON j.employer_id = pe.user_id
    WHERE j.status = 'active' AND j.id != ?
    ORDER BY j.created_at DESC
    LIMIT 150
  `).all(jobId);

  // Build category map
  const candidateIds = candidates.map(c => c.id);
  const candCatMap = {};
  if (candidateIds.length > 0) {
    const ph = candidateIds.map(() => '?').join(',');
    db.prepare(`
      SELECT jc.job_id, c.slug FROM job_categories jc
      JOIN categories c ON jc.category_id = c.id
      WHERE jc.job_id IN (${ph})
    `).all(...candidateIds).forEach(r => {
      if (!candCatMap[r.job_id]) candCatMap[r.job_id] = [];
      candCatMap[r.job_id].push(r.slug);
    });
  }

  const now = Date.now();
  const maxViews = Math.max(1, ...candidates.map(c => c.views_count || 0));

  const scored = candidates.map(c => {
    let score = 0;

    // Category match (30pts)
    const cCats = candCatMap[c.id] || [];
    if (c.category_slug) cCats.push(c.category_slug);
    if (cCats.some(s => catSlugs.has(s)) || (c.category_id && catIds.has(c.category_id))) {
      score += WEIGHTS.category;
    }

    // Skill/keyword match (25pts)
    const cText = ((c.title || '') + ' ' + (c.skills || '')).toLowerCase();
    let kwMatches = 0;
    titleWords.forEach(w => { if (cText.includes(w)) kwMatches++; });
    if (jobSkills) {
      const jobSkillArr = jobSkills.split(/[,;|]+/).map(s => s.trim()).filter(Boolean);
      jobSkillArr.forEach(s => { if (cText.includes(s)) kwMatches++; });
    }
    score += WEIGHTS.skill * Math.min(1, kwMatches / Math.max(1, titleWords.length));

    // Location match (20pts)
    if (job.location && c.location) {
      const jl = job.location.toLowerCase();
      const cl = c.location.toLowerCase();
      if (jl === cl) score += WEIGHTS.location;
      else if (cl.includes(jl.split(',')[0].trim()) || jl.includes(cl.split(',')[0].trim())) score += WEIGHTS.location * 0.6;
    }

    // Recency (15pts)
    const ageDays = (now - new Date(c.created_at).getTime()) / (86400000);
    score += WEIGHTS.recency * Math.max(0, 1 - ageDays / 30);

    // Popularity (10pts)
    score += WEIGHTS.popularity * ((c.views_count || 0) / maxViews);

    // Bonus: same employer
    if (c.employer_id === job.employer_id) score += 5;

    return { ...c, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

module.exports = { getPersonalizedRecommendations, getPopularRecommendations, getSimilarJobs };
