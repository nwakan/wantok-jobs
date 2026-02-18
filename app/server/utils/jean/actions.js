/**
 * Jean Action Executor
 * Calls existing API route logic directly (no HTTP round-trip).
 * All functions take (db, userId) and return data or throw.
 */

const logger = require('../../utils/logger');

const actions = {
  // ─── Profile ───────────────────────────────────────────
  getProfile(db, userId) {
    const user = db.prepare('SELECT id, email, role, name FROM users WHERE id = ?').get(userId);
    if (!user) return null;
    let profile = null;
    if (user.role === 'jobseeker') {
      profile = db.prepare('SELECT * FROM profiles_jobseeker WHERE user_id = ?').get(userId);
    } else if (user.role === 'employer') {
      profile = db.prepare('SELECT * FROM profiles_employer WHERE user_id = ?').get(userId);
    }
    return { user, profile };
  },

  updateJobseekerProfile(db, userId, data) {
    const fields = [
      'phone', 'location', 'country', 'bio', 'headline', 'skills', 'top_skills',
      'work_history', 'education', 'languages', 'certifications', 'volunteer',
      'projects', 'awards', 'desired_job_type', 'desired_salary_min',
      'desired_salary_max', 'availability', 'open_to_work', 'social_links',
    ];
    const sets = [];
    const values = [];
    for (const f of fields) {
      if (data[f] !== undefined) {
        sets.push(`${f} = ?`);
        values.push(typeof data[f] === 'object' ? JSON.stringify(data[f]) : data[f]);
      }
    }
    if (sets.length === 0) return null;

    // Check profile completeness
    const profile = db.prepare('SELECT * FROM profiles_jobseeker WHERE user_id = ?').get(userId);
    const merged = { ...profile, ...data };
    const complete = !!(merged.phone && merged.location && merged.bio && merged.skills);
    sets.push('profile_complete = ?');
    values.push(complete ? 1 : 0);

    values.push(userId);
    db.prepare(`UPDATE profiles_jobseeker SET ${sets.join(', ')} WHERE user_id = ?`).run(...values);
    return db.prepare('SELECT * FROM profiles_jobseeker WHERE user_id = ?').get(userId);
  },

  updateEmployerProfile(db, userId, data) {
    const fields = ['company_name', 'industry', 'company_size', 'location', 'country', 'website', 'description'];
    const sets = [];
    const values = [];
    for (const f of fields) {
      if (data[f] !== undefined) {
        sets.push(`${f} = ?`);
        values.push(data[f]);
      }
    }
    if (sets.length === 0) return null;
    values.push(userId);
    db.prepare(`UPDATE profiles_employer SET ${sets.join(', ')} WHERE user_id = ?`).run(...values);
    return db.prepare('SELECT * FROM profiles_employer WHERE user_id = ?').get(userId);
  },

  // ─── Job Search ────────────────────────────────────────
  async searchJobs(db, params = {}) {
    const { search, location, category, job_type, page = 1, limit = 5 } = params;
    
    // Try semantic search first if search query exists
    if (search && search.trim().length > 0) {
      try {
        const vectorStore = require('../../lib/vector-store');
        const { expand } = require('../../lib/tok-pisin');
        
        // Expand Tok Pisin terms
        const expandedQuery = expand(search);
        
        // Perform semantic search
        const semanticResults = await vectorStore.search('job', expandedQuery, limit * 3, 0.5);
        
        if (semanticResults && semanticResults.length > 0) {
          const jobIds = semanticResults.map(r => r.entity_id);
          const placeholders = jobIds.map(() => '?').join(',');
          
          let where = [`j.id IN (${placeholders})`, "j.status = 'active'"];
          let binds = [...jobIds];
          
          // Apply additional filters
          if (location) {
            where.push("j.location LIKE ?");
            binds.push(`%${location}%`);
          }
          if (category) {
            where.push("j.category_slug = ?");
            binds.push(category);
          }
          if (job_type) {
            where.push("j.job_type = ?");
            binds.push(job_type);
          }
          
          const sql = `
            SELECT j.id, j.title, j.location, j.job_type, j.salary_min, j.salary_max,
                   j.salary_currency, j.created_at, j.category_slug,
                   pe.company_name, pe.logo_url
            FROM jobs j
            LEFT JOIN profiles_employer pe ON j.employer_id = pe.user_id
            WHERE ${where.join(' AND ')}
            LIMIT ?
          `;
          
          const jobs = db.prepare(sql).all(...binds, limit);
          
          // Map semantic scores
          jobs.forEach(job => {
            const result = semanticResults.find(r => r.entity_id === job.id);
            if (result) job.semantic_score = result.score;
          });
          
          return { 
            jobs, 
            total: jobs.length, 
            page: 1, 
            pages: 1,
            method: 'semantic' 
          };
        }
      } catch (e) {
        logger.error('Jean semantic search failed, falling back to keyword search:', e.message);
        // Fall through to keyword search
      }
    }
    
    // Keyword search fallback
    const where = ["j.status = 'active'"];
    const binds = [];

    if (search) {
      where.push("(j.title LIKE ? OR j.description LIKE ? OR j.skills LIKE ?)");
      const term = `%${search}%`;
      binds.push(term, term, term);
    }
    if (location) {
      where.push("j.location LIKE ?");
      binds.push(`%${location}%`);
    }
    if (category) {
      where.push("j.category_slug = ?");
      binds.push(category);
    }
    if (job_type) {
      where.push("j.job_type = ?");
      binds.push(job_type);
    }

    const offset = (page - 1) * limit;
    const countSql = `SELECT COUNT(*) as total FROM jobs j WHERE ${where.join(' AND ')}`;
    const total = db.prepare(countSql).get(...binds).total;

    const sql = `
      SELECT j.id, j.title, j.location, j.job_type, j.salary_min, j.salary_max,
             j.salary_currency, j.created_at, j.category_slug,
             pe.company_name, pe.logo_url
      FROM jobs j
      LEFT JOIN profiles_employer pe ON j.employer_id = pe.user_id
      WHERE ${where.join(' AND ')}
      ORDER BY j.featured DESC, j.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const jobs = db.prepare(sql).all(...binds, limit, offset);
    return { jobs, total, page, pages: Math.ceil(total / limit), method: 'keyword' };
  },

  getJob(db, jobId) {
    return db.prepare(`
      SELECT j.*, pe.company_name, pe.logo_url, pe.location as company_location
      FROM jobs j
      LEFT JOIN profiles_employer pe ON j.employer_id = pe.user_id
      WHERE j.id = ?
    `).get(jobId);
  },

  // ─── Applications ──────────────────────────────────────
  applyToJob(db, userId, jobId, coverLetter) {
    // Check already applied
    const existing = db.prepare(
      'SELECT id FROM applications WHERE jobseeker_id = ? AND job_id = ?'
    ).get(userId, jobId);
    if (existing) return { error: 'already_applied', applicationId: existing.id };

    // Check job exists and is active
    const job = db.prepare("SELECT id, title, employer_id FROM jobs WHERE id = ? AND status = 'active'").get(jobId);
    if (!job) return { error: 'job_not_found' };

    // Get profile for application data
    const profile = db.prepare('SELECT * FROM profiles_jobseeker WHERE user_id = ?').get(userId);

    const result = db.prepare(`
      INSERT INTO applications (jobseeker_id, job_id, cover_letter, status, applied_at)
      VALUES (?, ?, ?, 'pending', datetime('now'))
    `).run(userId, jobId, coverLetter || '');

    // Create notification for employer
    try {
      const user = db.prepare('SELECT name FROM users WHERE id = ?').get(userId);
      db.prepare(`
        INSERT INTO notifications (user_id, type, title, message, link, created_at)
        VALUES (?, 'new_application', 'New Application', ?, ?, datetime('now'))
      `).run(job.employer_id, `${user?.name || 'Someone'} applied for ${job.title}`, `/dashboard/employer/applicants`);
    } catch (e) { /* notification failure shouldn't block application */ }

    return { success: true, applicationId: result.lastInsertRowid, jobTitle: job.title };
  },

  getMyApplications(db, userId) {
    return db.prepare(`
      SELECT a.id, a.status, a.applied_at, j.title, j.location,
             pe.company_name
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      LEFT JOIN profiles_employer pe ON j.employer_id = pe.user_id
      WHERE a.jobseeker_id = ?
      ORDER BY a.applied_at DESC
      LIMIT 20
    `).all(userId);
  },

  // ─── Employer: Applicants ──────────────────────────────
  getJobApplicants(db, userId, jobId) {
    // Verify employer owns the job
    const job = db.prepare('SELECT id, title FROM jobs WHERE id = ? AND employer_id = ?').get(jobId, userId);
    if (!job) return { error: 'not_your_job' };

    const applicants = db.prepare(`
      SELECT a.id, a.status, a.applied_at, a.cover_letter,
             u.name, u.email, pj.headline, pj.skills, pj.location, pj.phone
      FROM applications a
      JOIN users u ON a.jobseeker_id = u.id
      LEFT JOIN profiles_jobseeker pj ON a.jobseeker_id = pj.user_id
      WHERE a.job_id = ?
      ORDER BY a.applied_at DESC
    `).all(jobId);

    return { job, applicants };
  },

  updateApplicationStatus(db, userId, applicationId, status) {
    // Verify employer owns the job for this application
    const app = db.prepare(`
      SELECT a.id, a.jobseeker_id as applicant_id, j.employer_id, j.title
      FROM applications a JOIN jobs j ON a.job_id = j.id
      WHERE a.id = ?
    `).get(applicationId);
    if (!app || app.employer_id !== userId) return { error: 'not_authorized' };

    db.prepare('UPDATE applications SET status = ? WHERE id = ?').run(status, applicationId);

    // Notify applicant
    try {
      db.prepare(`
        INSERT INTO notifications (user_id, type, title, message, link, created_at)
        VALUES (?, 'application_update', 'Application Update', ?, '/dashboard/jobseeker/applications', datetime('now'))
      `).run(app.applicant_id, `Your application for "${app.title}" has been ${status}`);
    } catch (e) {}

    return { success: true };
  },

  // ─── Employer: Post Job ────────────────────────────────
  postJob(db, userId, data) {
    const result = db.prepare(`
      INSERT INTO jobs (
        employer_id, title, description, requirements, location, country,
        job_type, experience_level, category_slug, skills, salary_min, salary_max,
        salary_currency, application_deadline, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      userId, data.title, data.description, data.requirements || null,
      data.location || null, data.country || 'Papua New Guinea',
      data.job_type || 'full-time', data.experience_level || null,
      data.category_slug || null, data.skills || null,
      data.salary_min || null, data.salary_max || null,
      data.salary_currency || 'PGK', data.application_deadline || null,
      data.status || 'active'
    );
    return { success: true, jobId: result.lastInsertRowid };
  },

  // ─── Employer: My Jobs ─────────────────────────────────
  getEmployerJobs(db, userId) {
    return db.prepare(`
      SELECT j.id, j.title, j.status, j.location, j.job_type, j.created_at,
             (SELECT COUNT(*) FROM applications WHERE job_id = j.id) as applicant_count
      FROM jobs j WHERE j.employer_id = ?
      ORDER BY j.created_at DESC LIMIT 20
    `).all(userId);
  },

  // ─── Job Drafts ────────────────────────────────────────
  createJobDraft(db, userId, sessionId, data) {
    const result = db.prepare(`
      INSERT INTO jean_job_drafts (
        user_id, session_id, source_filename, title, description, requirements,
        location, country, job_type, experience_level, category_slug, skills,
        salary_min, salary_max, salary_currency, application_deadline, raw_text, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
    `).run(
      userId, sessionId, data.source_filename || null,
      data.title, data.description, data.requirements || null,
      data.location || null, data.country || 'Papua New Guinea',
      data.job_type || null, data.experience_level || null,
      data.category_slug || null, data.skills || null,
      data.salary_min || null, data.salary_max || null,
      data.salary_currency || 'PGK', data.application_deadline || null,
      data.raw_text || null
    );
    return { draftId: result.lastInsertRowid };
  },

  approveDraft(db, userId, draftId) {
    const draft = db.prepare('SELECT * FROM jean_job_drafts WHERE id = ? AND user_id = ?').get(draftId, userId);
    if (!draft) return { error: 'draft_not_found' };

    const jobResult = this.postJob(db, userId, draft);
    if (jobResult.success) {
      db.prepare("UPDATE jean_job_drafts SET status = 'posted', job_id = ? WHERE id = ?")
        .run(jobResult.jobId, draftId);
    }
    return { ...jobResult, draftId };
  },

  approveAllDrafts(db, userId, sessionId) {
    const drafts = db.prepare(
      "SELECT * FROM jean_job_drafts WHERE user_id = ? AND session_id = ? AND status = 'draft'"
    ).all(userId, sessionId);

    const results = [];
    for (const draft of drafts) {
      results.push(this.approveDraft(db, userId, draft.id));
    }
    return results;
  },

  // ─── Categories ────────────────────────────────────────
  getCategories(db) {
    return db.prepare(`
      SELECT c.slug, c.name, c.icon, COUNT(j.id) as job_count
      FROM categories c
      LEFT JOIN jobs j ON j.category_slug = c.slug AND j.status = 'active'
      GROUP BY c.slug
      ORDER BY job_count DESC
    `).all();
  },

  // ─── Saved Jobs ────────────────────────────────────────
  saveJob(db, userId, jobId) {
    try {
      db.prepare('INSERT OR IGNORE INTO saved_jobs (user_id, job_id, created_at) VALUES (?, ?, datetime("now"))').run(userId, jobId);
      return { success: true };
    } catch (e) {
      return { error: e.message };
    }
  },

  getSavedJobs(db, userId) {
    return db.prepare(`
      SELECT j.id, j.title, j.location, j.job_type, j.salary_min, j.salary_max,
             pe.company_name, sj.created_at as saved_at
      FROM saved_jobs sj
      JOIN jobs j ON sj.job_id = j.id
      LEFT JOIN profiles_employer pe ON j.employer_id = pe.user_id
      WHERE sj.user_id = ?
      ORDER BY sj.created_at DESC LIMIT 20
    `).all(userId);
  },

  // ─── Notifications ─────────────────────────────────────
  getNotifications(db, userId, limit = 10) {
    return db.prepare(`
      SELECT id, type, title, message, link, is_read, created_at
      FROM notifications WHERE user_id = ?
      ORDER BY created_at DESC LIMIT ?
    `).all(userId, limit);
  },

  getUnreadCount(db, userId) {
    return db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(userId).count;
  },

  // ─── Messages ──────────────────────────────────────────
  getMessages(db, userId) {
    return db.prepare(`
      SELECT m.id, m.sender_id, m.content, m.is_read, m.created_at,
             u.name as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.receiver_id = ?
      ORDER BY m.created_at DESC LIMIT 20
    `).all(userId);
  },

  // ─── Interviews ────────────────────────────────────────
  getMyInterviews(db, userId, role) {
    if (role === 'jobseeker') {
      return db.prepare(`
        SELECT i.*, j.title, pe.company_name
        FROM interviews i
        JOIN jobs j ON i.job_id = j.id
        LEFT JOIN profiles_employer pe ON j.employer_id = pe.user_id
        WHERE i.applicant_id = ?
        ORDER BY i.scheduled_at ASC
      `).all(userId);
    }
    return db.prepare(`
      SELECT i.*, j.title, u.name as applicant_name
      FROM interviews i
      JOIN jobs j ON i.job_id = j.id
      JOIN users u ON i.applicant_id = u.id
      WHERE j.employer_id = ?
      ORDER BY i.scheduled_at ASC
    `).all(userId);
  },

  // ─── Credits ───────────────────────────────────────────
  getCreditStatus(db, userId) {
    try {
      const balance = db.prepare('SELECT * FROM credit_balances WHERE user_id = ?').get(userId);
      const recent = db.prepare(
        'SELECT * FROM credit_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 5'
      ).all(userId);
      return { balance, recent };
    } catch (e) {
      return { balance: null, recent: [] };
    }
  },

  // ─── Auto-Apply ────────────────────────────────────────
  createAutoApplyRule(db, userId, rule) {
    const result = db.prepare(`
      INSERT INTO jean_auto_apply (user_id, keywords, categories, min_salary, max_salary,
        locations, job_types, exclude_companies, max_daily, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      userId,
      JSON.stringify(rule.keywords || []),
      JSON.stringify(rule.categories || []),
      rule.min_salary || null,
      rule.max_salary || null,
      JSON.stringify(rule.locations || []),
      JSON.stringify(rule.job_types || []),
      JSON.stringify(rule.exclude_companies || []),
      rule.max_daily || 5
    );
    return { ruleId: result.lastInsertRowid };
  },

  getAutoApplyRules(db, userId) {
    return db.prepare('SELECT * FROM jean_auto_apply WHERE user_id = ?').all(userId);
  },

  toggleAutoApply(db, userId, active) {
    db.prepare('UPDATE jean_auto_apply SET active = ? WHERE user_id = ?').run(active ? 1 : 0, userId);
    return { success: true };
  },

  getAutoApplyStats(db, userId) {
    const rules = db.prepare('SELECT * FROM jean_auto_apply WHERE user_id = ?').all(userId);
    const today = db.prepare(`
      SELECT COUNT(*) as count FROM jean_auto_apply_log
      WHERE user_id = ? AND date(created_at) = date('now')
    `).get(userId).count;
    const week = db.prepare(`
      SELECT COUNT(*) as count FROM jean_auto_apply_log
      WHERE user_id = ? AND created_at >= datetime('now', '-7 days')
    `).get(userId).count;
    return { rules, today, week };
  },

  // ─── Employer Preferences ──────────────────────────────
  getEmployerPrefs(db, userId) {
    let prefs = db.prepare('SELECT * FROM jean_employer_prefs WHERE user_id = ?').get(userId);
    if (!prefs) {
      db.prepare('INSERT OR IGNORE INTO jean_employer_prefs (user_id) VALUES (?)').run(userId);
      prefs = db.prepare('SELECT * FROM jean_employer_prefs WHERE user_id = ?').get(userId);
    }
    return prefs;
  },

  updateEmployerPrefs(db, userId, data) {
    const fields = ['auto_post', 'default_category', 'default_location', 'default_country',
                     'default_job_type', 'notify_on_post', 'notify_on_application'];
    const sets = [];
    const values = [];
    for (const f of fields) {
      if (data[f] !== undefined) {
        sets.push(`${f} = ?`);
        values.push(data[f]);
      }
    }
    if (sets.length === 0) return null;
    sets.push("updated_at = datetime('now')");
    values.push(userId);

    // Ensure row exists
    db.prepare('INSERT OR IGNORE INTO jean_employer_prefs (user_id) VALUES (?)').run(userId);
    db.prepare(`UPDATE jean_employer_prefs SET ${sets.join(', ')} WHERE user_id = ?`).run(...values);
    return db.prepare('SELECT * FROM jean_employer_prefs WHERE user_id = ?').get(userId);
  },

  // ─── Jean Settings (Admin) ─────────────────────────────
  getSetting(db, key) {
    const row = db.prepare('SELECT value FROM jean_settings WHERE key = ?').get(key);
    return row ? row.value : null;
  },

  getSettings(db) {
    return db.prepare('SELECT * FROM jean_settings ORDER BY key').all();
  },

  updateSetting(db, key, value) {
    db.prepare("UPDATE jean_settings SET value = ?, updated_at = datetime('now') WHERE key = ?").run(value, key);
    return { key, value };
  },

  isFeatureEnabled(db, feature) {
    const val = this.getSetting(db, feature);
    return val === 'true' || val === '1';
  },

  // ─── Contact form ──────────────────────────────────────
  submitContact(db, data) {
    const result = db.prepare(`
      INSERT INTO contact_messages (name, email, subject, message, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(data.name, data.email, data.subject || 'Chat Support', data.message);
    return { success: true, id: result.lastInsertRowid };
  },

  // ─── Stats ─────────────────────────────────────────────
  getPublicStats(db) {
    const jobs = db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status = 'active'").get().c;
    const employers = db.prepare("SELECT COUNT(DISTINCT employer_id) FROM jobs WHERE status = 'active'").get()['COUNT(DISTINCT employer_id)'];
    const users = db.prepare("SELECT COUNT(*) as c FROM users WHERE account_status != 'spam'").get().c;
    return { active_jobs: jobs, employers, users };
  },

  // ─── Feature Requests ──────────────────────────────────
  createFeatureRequest(db, userId, data) {
    const { stripHtml } = require('../../utils/sanitizeHtml');
    const cleanTitle = stripHtml(data.title).trim();
    const cleanDescription = stripHtml(data.description).trim();
    
    if (cleanTitle.length < 5) return { error: 'Title must be at least 5 characters' };
    if (cleanDescription.length < 20) return { error: 'Description must be at least 20 characters' };
    
    const result = db.prepare(`
      INSERT INTO feature_requests (user_id, title, description, category)
      VALUES (?, ?, ?, ?)
    `).run(userId, cleanTitle, cleanDescription, data.category || 'general');
    
    return { success: true, featureId: result.lastInsertRowid };
  },

  getTopFeatureRequests(db, limit = 10) {
    const features = db.prepare(`
      SELECT 
        fr.id, fr.title, fr.description, fr.category, fr.status,
        fr.vote_count, fr.comment_count, fr.created_at,
        u.name as submitter_name
      FROM feature_requests fr
      LEFT JOIN users u ON fr.user_id = u.id
      ORDER BY fr.vote_count DESC, fr.created_at DESC
      LIMIT ?
    `).all(limit);
    
    // Extract first names only
    return features.map(f => ({
      ...f,
      submitter_name: f.submitter_name ? f.submitter_name.split(' ')[0] : 'Anonymous'
    }));
  },

  getFeatureStats(db) {
    const total = db.prepare('SELECT COUNT(*) as c FROM feature_requests').get().c;
    const planned = db.prepare("SELECT COUNT(*) as c FROM feature_requests WHERE status = 'planned'").get().c;
    const inProgress = db.prepare("SELECT COUNT(*) as c FROM feature_requests WHERE status = 'in_progress'").get().c;
    const completed = db.prepare("SELECT COUNT(*) as c FROM feature_requests WHERE status = 'completed'").get().c;
    return { total, planned, inProgress, completed };
  },
};

module.exports = actions;
