/**
 * Jean Automations Engine
 * Handles auto-apply execution and auto-post from document uploads.
 * Designed to be called by a cron job or on-demand.
 */

const actions = require('./actions');
const logger = require('../../utils/logger');

/**
 * Run auto-apply for all active rules
 * Called by cron (e.g., every hour or daily)
 */
function runAutoApply(db) {
  if (!actions.isFeatureEnabled(db, 'auto_apply_enabled')) {
    logger.info('Auto-apply disabled by admin');
    return { skipped: true, reason: 'disabled' };
  }

  const minScore = parseInt(actions.getSetting(db, 'auto_apply_min_match_score') || '70');
  const maxDailyGlobal = parseInt(actions.getSetting(db, 'max_auto_apply_daily') || '10');

  const rules = db.prepare("SELECT * FROM jean_auto_apply WHERE active = 1").all();
  const results = { processed: 0, applied: 0, skipped: 0, errors: 0 };

  for (const rule of rules) {
    try {
      const dailyCount = db.prepare(`
        SELECT COUNT(*) as c FROM jean_auto_apply_log
        WHERE user_id = ? AND date(created_at) = date('now')
      `).get(rule.user_id).c;

      const maxDaily = Math.min(rule.max_daily || 5, maxDailyGlobal);
      if (dailyCount >= maxDaily) {
        results.skipped++;
        continue;
      }

      const remaining = maxDaily - dailyCount;
      const keywords = safeParseJSON(rule.keywords, []);
      const categories = safeParseJSON(rule.categories, []);
      const locations = safeParseJSON(rule.locations, []);
      const jobTypes = safeParseJSON(rule.job_types, []);

      // Find matching jobs
      const candidates = findMatchingJobs(db, {
        keywords, categories, locations, jobTypes,
        minSalary: rule.min_salary,
        userId: rule.user_id,
        limit: remaining * 3, // Fetch more than needed for scoring
      });

      // Score and filter
      const profile = db.prepare('SELECT * FROM profiles_jobseeker WHERE user_id = ?').get(rule.user_id);
      const profileSkills = safeParseJSON(profile?.skills, []).map(s => s.toLowerCase());

      let applied = 0;
      for (const job of candidates) {
        if (applied >= remaining) break;

        const score = scoreMatch(job, { keywords, profileSkills, locations, categories });
        if (score < minScore) continue;

        // Check not already applied
        const existing = db.prepare(
          'SELECT id FROM applications WHERE jobseeker_id = ? AND job_id = ?'
        ).get(rule.user_id, job.id);
        if (existing) continue;

        // Check not in auto-apply log (prevent re-attempts)
        const logged = db.prepare(
          'SELECT id FROM jean_auto_apply_log WHERE user_id = ? AND job_id = ?'
        ).get(rule.user_id, job.id);
        if (logged) continue;

        // Apply!
        try {
          const result = actions.applyToJob(db, rule.user_id, job.id,
            `Auto-applied via WantokJobs Smart Apply (${score}% match)`);

          db.prepare(`
            INSERT INTO jean_auto_apply_log (rule_id, user_id, job_id, application_id, match_score, status)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(rule.id, rule.user_id, job.id,
            result.applicationId || null, score,
            result.success ? 'applied' : 'failed');

          if (result.success) {
            applied++;
            results.applied++;

            // Notify user
            try {
              db.prepare(`
                INSERT INTO notifications (user_id, type, title, message, link, created_at)
                VALUES (?, 'auto_apply', 'Auto-Applied', ?, '/dashboard/jobseeker/applications', datetime('now'))
              `).run(rule.user_id, `Jean auto-applied you to "${job.title}" (${score}% match)`);
            } catch (e) {}
          }
        } catch (e) {
          logger.error('Auto-apply application error', { userId: rule.user_id, jobId: job.id, error: e.message });
          results.errors++;
        }
      }

      // Update last_run
      db.prepare("UPDATE jean_auto_apply SET last_run = datetime('now') WHERE id = ?").run(rule.id);
      results.processed++;

    } catch (e) {
      logger.error('Auto-apply rule error', { ruleId: rule.id, error: e.message });
      results.errors++;
    }
  }

  logger.info('Auto-apply run complete', results);
  return results;
}

/**
 * Find jobs matching criteria
 */
function findMatchingJobs(db, criteria) {
  const where = ["j.status = 'active'"];
  const binds = [];

  // Don't match jobs they already applied to
  where.push("j.id NOT IN (SELECT job_id FROM applications WHERE jobseeker_id = ?)");
  binds.push(criteria.userId);

  // Keyword matching (in title, description, skills)
  if (criteria.keywords?.length) {
    const kwClauses = criteria.keywords.map(() =>
      "(j.title LIKE ? OR j.description LIKE ? OR j.skills LIKE ?)"
    );
    where.push('(' + kwClauses.join(' OR ') + ')');
    for (const kw of criteria.keywords) {
      const term = `%${kw}%`;
      binds.push(term, term, term);
    }
  }

  // Category filter
  if (criteria.categories?.length) {
    where.push('j.category_slug IN (' + criteria.categories.map(() => '?').join(',') + ')');
    binds.push(...criteria.categories);
  }

  // Location filter
  if (criteria.locations?.length) {
    const locClauses = criteria.locations.map(() => 'j.location LIKE ?');
    where.push('(' + locClauses.join(' OR ') + ')');
    for (const loc of criteria.locations) binds.push(`%${loc}%`);
  }

  // Salary filter
  if (criteria.minSalary) {
    where.push('(j.salary_max >= ? OR j.salary_max IS NULL)');
    binds.push(criteria.minSalary);
  }

  const sql = `
    SELECT j.id, j.title, j.description, j.location, j.job_type, j.skills,
           j.salary_min, j.salary_max, j.category_slug, j.created_at,
           pe.company_name
    FROM jobs j
    LEFT JOIN profiles_employer pe ON j.employer_id = pe.user_id
    WHERE ${where.join(' AND ')}
    ORDER BY j.created_at DESC
    LIMIT ?
  `;
  binds.push(criteria.limit || 20);

  return db.prepare(sql).all(...binds);
}

/**
 * Score a job match (0-100)
 */
function scoreMatch(job, criteria) {
  let score = 50; // Base score for matching keywords

  // Keyword title match (high value)
  const title = (job.title || '').toLowerCase();
  for (const kw of (criteria.keywords || [])) {
    if (title.includes(kw.toLowerCase())) score += 15;
  }

  // Skills overlap
  const jobSkills = (job.skills || '').toLowerCase().split(/[,;]+/).map(s => s.trim());
  const overlap = criteria.profileSkills.filter(s => jobSkills.some(js => js.includes(s) || s.includes(js)));
  score += Math.min(overlap.length * 5, 20);

  // Category match
  if (criteria.categories?.includes(job.category_slug)) score += 10;

  // Location match
  const jobLoc = (job.location || '').toLowerCase();
  for (const loc of (criteria.locations || [])) {
    if (jobLoc.includes(loc.toLowerCase())) { score += 5; break; }
  }

  // Recency bonus
  const daysOld = (Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24);
  if (daysOld < 7) score += 5;

  return Math.min(Math.round(score), 100);
}

/**
 * Process uploaded document into drafts or auto-post
 */
function processDocumentUpload(db, userId, sessionId, parsedJobs, prefs) {
  const autoPost = prefs?.auto_post || 'review';
  const results = [];

  for (const job of parsedJobs) {
    // Apply employer defaults
    if (prefs?.default_location && !job.location) job.location = prefs.default_location;
    if (prefs?.default_category && !job.category_slug) job.category_slug = prefs.default_category;
    if (prefs?.default_country && !job.country) job.country = prefs.default_country;
    if (prefs?.default_job_type && !job.job_type) job.job_type = prefs.default_job_type;

    if (autoPost === 'auto') {
      // Post immediately
      const result = actions.postJob(db, userId, job);
      results.push({ ...result, title: job.title, action: 'posted' });

      // Notify
      if (prefs?.notify_on_post) {
        try {
          db.prepare(`
            INSERT INTO notifications (user_id, type, title, message, link, created_at)
            VALUES (?, 'auto_post', 'Job Auto-Posted', ?, '/dashboard/employer/jobs', datetime('now'))
          `).run(userId, `Jean auto-posted: "${job.title}"`);
        } catch (e) {}
      }
    } else {
      // Create draft
      const draft = actions.createJobDraft(db, userId, sessionId, job);
      results.push({ ...draft, title: job.title, action: 'drafted' });
    }
  }

  return results;
}

function safeParseJSON(str, fallback) {
  if (!str) return fallback;
  if (Array.isArray(str)) return str;
  try { return JSON.parse(str); } catch { return fallback; }
}

module.exports = { runAutoApply, processDocumentUpload, findMatchingJobs, scoreMatch };
