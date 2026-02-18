/**
 * Test: Public Stats API
 * Tests /api/stats endpoints
 */

module.exports = async function testStats(helpers) {
  const { createTestDb, createTestUser, createTestJob, assert, assertEqual } = helpers;
  const db = createTestDb();
  
  // Create test data
  const jobseeker1 = createTestUser(db, { role: 'jobseeker', name: 'Jobseeker 1' });
  const jobseeker2 = createTestUser(db, { role: 'jobseeker', name: 'Jobseeker 2' });
  const employer1 = createTestUser(db, { role: 'employer', name: 'Employer 1' });
  const employer2 = createTestUser(db, { role: 'employer', name: 'Employer 2' });
  
  // Create employer profiles
  db.prepare('INSERT INTO profiles_employer (user_id, company_name) VALUES (?, ?)').run(employer1.id, 'Company A');
  db.prepare('INSERT INTO profiles_employer (user_id, company_name) VALUES (?, ?)').run(employer2.id, 'Company B');
  
  // Create jobs
  const job1 = createTestJob(db, employer1.id, { status: 'active' });
  const job2 = createTestJob(db, employer1.id, { status: 'active' });
  const job3 = createTestJob(db, employer2.id, { status: 'closed' });
  
  // Test: Count jobseekers
  const jobseekerCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('jobseeker');
  assertEqual(jobseekerCount.count, 2, 'Should have 2 jobseekers');
  
  // Test: Count employers
  const employerCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('employer');
  assertEqual(employerCount.count, 2, 'Should have 2 employers');
  
  // Test: Count active jobs
  const activeJobsCount = db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'active'").get();
  assertEqual(activeJobsCount.count, 2, 'Should have 2 active jobs');
  
  // Test: Total jobs
  const totalJobsCount = db.prepare('SELECT COUNT(*) as count FROM jobs').get();
  assertEqual(totalJobsCount.count, 3, 'Should have 3 total jobs');
  
  // Test: Stats shape
  const stats = {
    totalJobseekers: jobseekerCount.count,
    totalEmployers: employerCount.count,
    activeJobs: activeJobsCount.count,
    totalJobs: totalJobsCount.count,
  };
  
  assert(typeof stats.totalJobseekers === 'number', 'totalJobseekers should be a number');
  assert(typeof stats.totalEmployers === 'number', 'totalEmployers should be a number');
  assert(typeof stats.activeJobs === 'number', 'activeJobs should be a number');
  assert(typeof stats.totalJobs === 'number', 'totalJobs should be a number');
  assert(stats.activeJobs <= stats.totalJobs, 'Active jobs should not exceed total jobs');
  
  db.close();
};
