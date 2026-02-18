/**
 * Job Validator Middleware
 * Validates job submissions for quality and completeness
 */

const db = require('../database');

/**
 * Validate job data before creation/update
 */
function validateJobData(req, res, next) {
  const {
    title,
    description,
    location,
    salary_min,
    salary_max,
    application_deadline,
  } = req.body;

  const errors = [];
  const warnings = [];

  // 1. Title validation
  if (!title || title.trim().length === 0) {
    errors.push('Job title is required');
  } else if (title.length < 5) {
    errors.push('Job title must be at least 5 characters');
  } else if (title.length > 200) {
    errors.push('Job title must not exceed 200 characters');
  }

  // 2. Description validation
  if (!description || description.trim().length === 0) {
    errors.push('Job description is required');
  } else if (description.length < 100) {
    errors.push('Job description must be at least 100 characters. Provide more details about the role, responsibilities, and requirements.');
  } else if (description.length > 10000) {
    errors.push('Job description must not exceed 10,000 characters');
  }

  // 3. Location validation
  if (!location || location.trim().length === 0) {
    errors.push('Job location is required');
  }

  // 4. Salary validation
  if (!salary_min && !salary_max) {
    warnings.push('Salary range not provided. Jobs with salary information get 3x more applications.');
  }

  if (salary_min && salary_max && salary_min > salary_max) {
    errors.push('Minimum salary cannot be greater than maximum salary');
  }

  // 5. Closing date validation
  if (application_deadline) {
    const deadline = new Date(application_deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (deadline < today) {
      errors.push('Application deadline must be in the future');
    }
  }

  // 6. Check for duplicate jobs (same title + same employer within 30 days)
  if (title && req.user && req.method === 'POST') {
    try {
      const duplicate = db.prepare(`
        SELECT id, title, created_at
        FROM jobs
        WHERE employer_id = ?
          AND LOWER(title) = LOWER(?)
          AND created_at >= datetime('now', '-30 days')
          AND status IN ('active', 'draft')
        LIMIT 1
      `).get(req.user.id, title.trim());

      if (duplicate) {
        errors.push(
          `You posted a similar job "${duplicate.title}" recently (${new Date(duplicate.created_at).toLocaleDateString()}). ` +
          `Please edit that job instead of creating a duplicate.`
        );
      }
    } catch (e) {
      console.error('Duplicate check failed:', e.message);
    }
  }

  // 7. For government/SOE employers: salary is REQUIRED
  if (req.user) {
    try {
      const employer = db.prepare(`
        SELECT pe.*, u.email, tc.transparency_required
        FROM profiles_employer pe
        JOIN users u ON pe.user_id = u.id
        LEFT JOIN transparency_companies tc ON u.id = tc.user_id
        WHERE pe.user_id = ?
      `).get(req.user.id);

      if (employer?.transparency_required === 1 && (!salary_min && !salary_max)) {
        errors.push(
          'As a government or state-owned employer, you must provide salary range information. ' +
          'This is required under the PNG Employment Transparency Framework.'
        );
      }
    } catch (e) {
      console.error('Transparency check failed:', e.message);
    }
  }

  // Return errors or continue
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Job validation failed',
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    });
  }

  // Attach warnings to request for logging
  if (warnings.length > 0) {
    req.jobValidationWarnings = warnings;
  }

  next();
}

module.exports = { validateJobData };
