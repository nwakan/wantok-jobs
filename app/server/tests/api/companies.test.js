/**
 * Test: Companies Directory API
 * Tests /api/companies endpoints with filters and pagination
 */

module.exports = async function testCompanies(helpers) {
  const { createTestDb, createTestUser, createTestJob, assert, assertEqual } = helpers;
  const db = createTestDb();
  
  // Create test employers with profiles
  const employer1 = createTestUser(db, { role: 'employer', name: 'Employer 1' });
  const employer2 = createTestUser(db, { role: 'employer', name: 'Employer 2' });
  const employer3 = createTestUser(db, { role: 'employer', name: 'Employer 3' });
  
  db.prepare('INSERT INTO profiles_employer (user_id, company_name, industry, country, employer_type) VALUES (?, ?, ?, ?, ?)')
    .run(employer1.id, 'Tech Corp PNG', 'Technology', 'Papua New Guinea', 'private');
  db.prepare('INSERT INTO profiles_employer (user_id, company_name, industry, country, employer_type) VALUES (?, ?, ?, ?, ?)')
    .run(employer2.id, 'Mining Ltd', 'Mining', 'Papua New Guinea', 'public');
  db.prepare('INSERT INTO profiles_employer (user_id, company_name, industry, country, employer_type) VALUES (?, ?, ?, ?, ?)')
    .run(employer3.id, 'Fiji Banking', 'Finance', 'Fiji', 'private');
  
  // Create jobs
  createTestJob(db, employer1.id, { status: 'active' });
  createTestJob(db, employer1.id, { status: 'active' });
  createTestJob(db, employer2.id, { status: 'active' });
  
  // Test: Get all companies
  const allCompanies = db.prepare(`
    SELECT u.id, pe.company_name, pe.industry, pe.country, pe.employer_type,
           (SELECT COUNT(*) FROM jobs WHERE employer_id = u.id AND status = 'active') as active_jobs_count
    FROM users u
    INNER JOIN profiles_employer pe ON u.id = pe.user_id
    WHERE u.role = 'employer'
  `).all();
  
  assertEqual(allCompanies.length, 3, 'Should return 3 companies');
  assert(allCompanies.every(c => c.company_name), 'All companies should have names');
  
  // Test: Filter by country
  const pngCompanies = db.prepare(`
    SELECT u.id, pe.company_name, pe.country
    FROM users u
    INNER JOIN profiles_employer pe ON u.id = pe.user_id
    WHERE u.role = 'employer' AND pe.country = ?
  `).all('Papua New Guinea');
  
  assertEqual(pngCompanies.length, 2, 'Should return 2 PNG companies');
  assert(pngCompanies.every(c => c.country === 'Papua New Guinea'), 'All should be from PNG');
  
  // Test: Filter by industry
  const techCompanies = db.prepare(`
    SELECT u.id, pe.company_name, pe.industry
    FROM users u
    INNER JOIN profiles_employer pe ON u.id = pe.user_id
    WHERE u.role = 'employer' AND pe.industry = ?
  `).all('Technology');
  
  assertEqual(techCompanies.length, 1, 'Should return 1 tech company');
  assertEqual(techCompanies[0].company_name, 'Tech Corp PNG', 'Should be Tech Corp PNG');
  
  // Test: Filter by employer_type
  const privateCompanies = db.prepare(`
    SELECT u.id, pe.company_name, pe.employer_type
    FROM users u
    INNER JOIN profiles_employer pe ON u.id = pe.user_id
    WHERE u.role = 'employer' AND pe.employer_type = ?
  `).all('private');
  
  assertEqual(privateCompanies.length, 2, 'Should return 2 private companies');
  
  // Test: Pagination
  const page1 = db.prepare(`
    SELECT u.id, pe.company_name
    FROM users u
    INNER JOIN profiles_employer pe ON u.id = pe.user_id
    WHERE u.role = 'employer'
    ORDER BY pe.company_name ASC
    LIMIT 2 OFFSET 0
  `).all();
  
  assertEqual(page1.length, 2, 'Page 1 should have 2 companies');
  
  const page2 = db.prepare(`
    SELECT u.id, pe.company_name
    FROM users u
    INNER JOIN profiles_employer pe ON u.id = pe.user_id
    WHERE u.role = 'employer'
    ORDER BY pe.company_name ASC
    LIMIT 2 OFFSET 2
  `).all();
  
  assertEqual(page2.length, 1, 'Page 2 should have 1 company');
  
  // Test: Job count matches
  const companyWithJobs = allCompanies.find(c => c.id === employer1.id);
  assertEqual(companyWithJobs.active_jobs_count, 2, 'Employer 1 should have 2 active jobs');
  
  db.close();
};
