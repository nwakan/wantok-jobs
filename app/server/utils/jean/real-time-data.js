/**
 * Real-Time Database Query Helper
 * Provides live data context for AI Router to generate accurate, data-driven responses.
 */

/**
 * Get real-time database data for AI context
 * @param {string} intent - Classified intent (search_jobs, check_applications, etc.)
 * @param {object} params - Intent parameters (search, location, job_id, etc.)
 * @param {object} user - User object (id, name, role, etc.)
 * @param {object} db - Database instance
 * @returns {object} Context data for AI prompt
 */
function getRealTimeData(intent, params, user, db) {
  const data = {};
  
  try {
    // ─── Job Search Intent ───────────────────────────────────
    if (intent === 'search_jobs') {
      const category = params?.search || params?.category || '';
      const location = params?.location || '';
      
      // Build WHERE clause dynamically
      let whereClause = 'status = "active"';
      const queryParams = [];
      
      if (category) {
        whereClause += ' AND (title LIKE ? OR category LIKE ? OR description LIKE ?)';
        queryParams.push(`%${category}%`, `%${category}%`, `%${category}%`);
      }
      
      if (location) {
        whereClause += ' AND location LIKE ?';
        queryParams.push(`%${location}%`);
      }
      
      // Get job count
      const jobCountResult = db.prepare(
        `SELECT COUNT(*) as count FROM jobs WHERE ${whereClause}`
      ).get(...queryParams);
      
      data.jobCount = jobCountResult?.count || 0;
      data.searchCategory = category || 'all jobs';
      data.searchLocation = location || 'all locations';
      
      // Get top 3 matching jobs for reference
      if (data.jobCount > 0) {
        const topJobs = db.prepare(
          `SELECT id, title, company_name, location, salary_min, salary_max 
           FROM jobs 
           WHERE ${whereClause} 
           ORDER BY created_at DESC 
           LIMIT 3`
        ).all(...queryParams);
        
        data.topJobs = topJobs.map(j => ({
          id: j.id,
          title: j.title,
          company: j.company_name,
          location: j.location,
          salary: j.salary_min && j.salary_max ? `K${j.salary_min}-${j.salary_max}` : 'Negotiable'
        }));
      }
    }
    
    // ─── Check Applications Intent ───────────────────────────
    if (intent === 'check_applications' && user) {
      const appCountResult = db.prepare(
        'SELECT COUNT(*) as count FROM applications WHERE user_id = ?'
      ).get(user.id);
      
      data.applicationCount = appCountResult?.count || 0;
      
      // Get recent applications
      if (data.applicationCount > 0) {
        const recentApps = db.prepare(
          `SELECT a.id, a.status, a.applied_at, j.title, j.company_name 
           FROM applications a 
           JOIN jobs j ON a.job_id = j.id 
           WHERE a.user_id = ? 
           ORDER BY a.applied_at DESC 
           LIMIT 5`
        ).all(user.id);
        
        data.recentApplications = recentApps.map(a => ({
          id: a.id,
          title: a.title,
          company: a.company_name,
          status: a.status,
          appliedAt: a.applied_at
        }));
      }
    }
    
    // ─── Job Details Intent ──────────────────────────────────
    if (intent === 'job_details' && params?.job_id) {
      const job = db.prepare(
        `SELECT id, title, company_name, location, salary_min, salary_max, 
                description, job_type, status, views_count 
         FROM jobs 
         WHERE id = ?`
      ).get(params.job_id);
      
      if (job) {
        data.job = {
          id: job.id,
          title: job.title,
          company: job.company_name,
          location: job.location,
          salary: job.salary_min && job.salary_max ? `K${job.salary_min}-${job.salary_max}` : 'Negotiable',
          jobType: job.job_type,
          status: job.status,
          views: job.views_count || 0,
          description: job.description ? job.description.substring(0, 500) : ''
        };
        
        // Check if user already applied
        if (user) {
          const alreadyApplied = db.prepare(
            'SELECT id FROM applications WHERE user_id = ? AND job_id = ?'
          ).get(user.id, params.job_id);
          data.alreadyApplied = !!alreadyApplied;
        }
      }
    }
    
    // ─── Manage Jobs Intent (Employer) ──────────────────────
    if (intent === 'manage_jobs' && user && user.role === 'employer') {
      const myJobsResult = db.prepare(
        'SELECT COUNT(*) as count FROM jobs WHERE employer_id = ?'
      ).get(user.id);
      
      data.totalJobs = myJobsResult?.count || 0;
      
      const activeJobsResult = db.prepare(
        'SELECT COUNT(*) as count FROM jobs WHERE employer_id = ? AND status = "active"'
      ).get(user.id);
      
      data.activeJobs = activeJobsResult?.count || 0;
    }
    
    // ─── View Applicants Intent (Employer) ──────────────────
    if (intent === 'view_applicants' && user && user.role === 'employer') {
      const applicantsResult = db.prepare(
        `SELECT COUNT(*) as count 
         FROM applications a 
         JOIN jobs j ON a.job_id = j.id 
         WHERE j.employer_id = ?`
      ).get(user.id);
      
      data.totalApplicants = applicantsResult?.count || 0;
      
      const pendingResult = db.prepare(
        `SELECT COUNT(*) as count 
         FROM applications a 
         JOIN jobs j ON a.job_id = j.id 
         WHERE j.employer_id = ? AND a.status IN ('applied', 'screening')`
      ).get(user.id);
      
      data.pendingApplicants = pendingResult?.count || 0;
    }
    
    // ─── Platform Stats (Admin/General) ──────────────────────
    const platformStats = db.prepare(
      `SELECT 
        (SELECT COUNT(*) FROM jobs WHERE status = 'active') as active_jobs,
        (SELECT COUNT(*) FROM users WHERE role = 'employer') as employers,
        (SELECT COUNT(*) FROM users WHERE role = 'jobseeker') as jobseekers`
    ).get();
    
    data.platformStats = {
      activeJobs: platformStats?.active_jobs || 0,
      employers: platformStats?.employers || 0,
      jobSeekers: platformStats?.jobseekers || 0
    };
    
    // ─── User Context ────────────────────────────────────────
    if (user) {
      data.userName = user.name;
      data.userRole = user.role;
      data.userId = user.id;
    }
    
  } catch (error) {
    console.error('[real-time-data] Query error:', error.message);
    // Return empty data object on error (don't break AI Router)
  }
  
  return data;
}

module.exports = { getRealTimeData };
