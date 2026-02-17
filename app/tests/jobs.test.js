const { request, registerUser, createTestRunner } = require('./helpers');

module.exports = async function jobTests() {
  const { results, test, assert, assertEqual } = createTestRunner('Jobs');

  console.log('\n💼 Jobs Tests');

  // Setup: create employer and jobseeker
  const employer = await registerUser('employer');
  const jobseeker = await registerUser('jobseeker');

  // We need a valid category slug - fetch from existing data
  let categorySlug = 'general';
  try {
    const catRes = await request('GET', '/api/categories');
    if (catRes.status === 200 && Array.isArray(catRes.body?.data) && catRes.body.data.length > 0) {
      categorySlug = catRes.body.data[0].slug;
    } else if (catRes.status === 200 && Array.isArray(catRes.body) && catRes.body.length > 0) {
      categorySlug = catRes.body[0].slug;
    }
  } catch {}

  const jobData = {
    title: 'Software Developer',
    description: 'We need a great developer to join our team and build amazing things.',
    location: 'Port Moresby',
    job_type: 'full-time',
    category_slug: categorySlug,
    salary_min: 50000,
    salary_max: 80000,
    salary_currency: 'PGK',
  };

  let createdJobId;

  // --- Create ---
  await test('Employer can create a job', async () => {
    const res = await request('POST', '/api/jobs', { token: employer.token, body: jobData });
    assert(res.status === 201 || res.status === 200, `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    createdJobId = res.body.id || res.body.data?.id;
    assert(createdJobId, 'Should return job ID');
  });

  await test('Jobseeker cannot create a job', async () => {
    const res = await request('POST', '/api/jobs', { token: jobseeker.token, body: jobData });
    assertEqual(res.status, 403);
  });

  await test('Unauthenticated user cannot create a job', async () => {
    const res = await request('POST', '/api/jobs', { body: jobData });
    assertEqual(res.status, 401);
  });

  await test('Create job without title fails', async () => {
    const res = await request('POST', '/api/jobs', {
      token: employer.token,
      body: { ...jobData, title: '' }
    });
    assert(res.status >= 400, 'Should reject job without title');
  });

  // --- Read ---
  await test('GET /api/jobs returns list of jobs', async () => {
    const res = await request('GET', '/api/jobs');
    assertEqual(res.status, 200);
    assert(res.body.data, 'Should have data array');
    assert(res.body.total >= 0, 'Should have total count');
  });

  await test('GET /api/jobs/:id returns single job', async () => {
    if (!createdJobId) return;
    const res = await request('GET', `/api/jobs/${createdJobId}`);
    assertEqual(res.status, 200);
    assert(res.body.title, 'Should have title');
  });

  await test('GET /api/jobs/99999 returns 404', async () => {
    const res = await request('GET', '/api/jobs/99999');
    assertEqual(res.status, 404);
  });

  await test('GET /api/jobs/my returns employer jobs', async () => {
    const res = await request('GET', '/api/jobs/my', { token: employer.token });
    assertEqual(res.status, 200);
    assert(Array.isArray(res.body.data), 'Should return array');
  });

  // --- Search & Filtering ---
  await test('Search jobs by keyword', async () => {
    const res = await request('GET', '/api/jobs?keyword=developer');
    assertEqual(res.status, 200);
  });

  await test('Filter jobs by location', async () => {
    const res = await request('GET', '/api/jobs?location=Port%20Moresby');
    assertEqual(res.status, 200);
  });

  await test('Filter jobs by job_type', async () => {
    const res = await request('GET', '/api/jobs?job_type=full-time');
    assertEqual(res.status, 200);
  });

  await test('Pagination works', async () => {
    const res = await request('GET', '/api/jobs?page=1&limit=2');
    assertEqual(res.status, 200);
    assert(res.body.data.length <= 2, 'Should respect limit');
  });

  // --- Update ---
  await test('Employer can update own job', async () => {
    if (!createdJobId) return;
    const res = await request('PUT', `/api/jobs/${createdJobId}`, {
      token: employer.token,
      body: { title: 'Senior Software Developer' }
    });
    assertEqual(res.status, 200);
  });

  await test('Other employer cannot update job', async () => {
    if (!createdJobId) return;
    const other = await registerUser('employer');
    const res = await request('PUT', `/api/jobs/${createdJobId}`, {
      token: other.token,
      body: { title: 'Hacked Title' }
    });
    assertEqual(res.status, 403);
  });

  // --- Featured Jobs ---
  await test('GET /api/jobs/featured returns featured jobs', async () => {
    const res = await request('GET', '/api/jobs/featured');
    assertEqual(res.status, 200);
    assert(res.body.data, 'Should have data');
  });

  // --- Similar Jobs ---
  await test('GET /api/jobs/:id/similar returns similar jobs', async () => {
    if (!createdJobId) return;
    const res = await request('GET', `/api/jobs/${createdJobId}/similar`);
    assertEqual(res.status, 200);
    assert(res.body.data, 'Should have data array');
  });

  // --- Status Change ---
  await test('Employer can change job status', async () => {
    if (!createdJobId) return;
    const res = await request('PATCH', `/api/jobs/${createdJobId}/status`, {
      token: employer.token,
      body: { status: 'closed' }
    });
    assertEqual(res.status, 200);
    // Reactivate for later tests
    await request('PATCH', `/api/jobs/${createdJobId}/status`, {
      token: employer.token,
      body: { status: 'active' }
    });
  });

  // --- Delete ---
  await test('Employer can delete own job', async () => {
    // Create a throwaway job
    const res1 = await request('POST', '/api/jobs', { token: employer.token, body: jobData });
    const delId = res1.body.id || res1.body.data?.id;
    if (!delId) return;
    const res = await request('DELETE', `/api/jobs/${delId}`, { token: employer.token });
    assertEqual(res.status, 200);
  });

  // --- Suggestions ---
  await test('GET /api/jobs/suggestions returns autocomplete', async () => {
    const res = await request('GET', '/api/jobs/suggestions?q=dev&type=keyword');
    assertEqual(res.status, 200);
    assert(res.body.data, 'Should have data');
  });

  return results;
};
