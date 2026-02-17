const { request, registerUser, createTestRunner } = require('./helpers');

module.exports = async function applicationTests() {
  const { results, test, assert, assertEqual } = createTestRunner('Applications');

  console.log('\n📋 Application Tests');

  // Setup
  const employer = await registerUser('employer');
  const jobseeker = await registerUser('jobseeker');
  const jobseeker2 = await registerUser('jobseeker');

  // Get a valid category
  let categorySlug = 'general';
  try {
    const catRes = await request('GET', '/api/categories');
    const cats = catRes.body?.data || catRes.body;
    if (Array.isArray(cats) && cats.length > 0) categorySlug = cats[0].slug;
  } catch {}

  // Create a job
  const jobRes = await request('POST', '/api/jobs', {
    token: employer.token,
    body: {
      title: 'Test Job for Applications',
      description: 'A test job description that is long enough to pass validation checks.',
      location: 'Lae',
      job_type: 'full-time',
      category_slug: categorySlug,
    }
  });
  const jobId = jobRes.body.id || jobRes.body.data?.id;

  let applicationId;

  // --- Apply ---
  await test('Jobseeker can apply to a job', async () => {
    const res = await request('POST', '/api/applications', {
      token: jobseeker.token,
      body: { job_id: jobId, cover_letter: 'I am interested in this position.' }
    });
    assertEqual(res.status, 201);
    applicationId = res.body.id;
    assert(applicationId, 'Should return application ID');
  });

  await test('Cannot apply twice to same job', async () => {
    const res = await request('POST', '/api/applications', {
      token: jobseeker.token,
      body: { job_id: jobId, cover_letter: 'Duplicate' }
    });
    assertEqual(res.status, 400);
  });

  await test('Employer cannot apply to jobs', async () => {
    const res = await request('POST', '/api/applications', {
      token: employer.token,
      body: { job_id: jobId, cover_letter: 'I am employer' }
    });
    assertEqual(res.status, 403);
  });

  await test('Cannot apply to non-existent job', async () => {
    const res = await request('POST', '/api/applications', {
      token: jobseeker2.token,
      body: { job_id: 99999, cover_letter: 'Test' }
    });
    assertEqual(res.status, 404);
  });

  // --- Privacy Leak Test (Critical Bug #1) ---
  await test('GET /api/applications/my does NOT expose notes, employer_notes, rating, tags', async () => {
    const res = await request('GET', '/api/applications/my', { token: jobseeker.token });
    assertEqual(res.status, 200);
    assert(Array.isArray(res.body), 'Should return array');
    if (res.body.length > 0) {
      const app = res.body[0];
      const json = JSON.stringify(app);
      // These fields should NOT be visible to jobseekers
      const leaked = [];
      if ('notes' in app) leaked.push('notes');
      if ('employer_notes' in app) leaked.push('employer_notes');
      if ('rating' in app) leaked.push('rating');
      if ('tags' in app) leaked.push('tags');
      if ('ai_score' in app) leaked.push('ai_score');
      assert(leaked.length === 0, `PRIVACY LEAK: Fields exposed to jobseeker: ${leaked.join(', ')}`);
    }
  });

  // --- Get Applications for Job (Employer) ---
  await test('Employer can see applications for their job', async () => {
    const res = await request('GET', `/api/applications/job/${jobId}`, { token: employer.token });
    assertEqual(res.status, 200);
    assert(res.body.data, 'Should have data array');
    assert(res.body.total > 0, 'Should have at least 1 application');
  });

  await test('Other employer cannot see applications', async () => {
    const other = await registerUser('employer');
    const res = await request('GET', `/api/applications/job/${jobId}`, { token: other.token });
    assertEqual(res.status, 403);
  });

  // --- Status Transitions (Critical Bug #2) ---
  await test('Valid status transition: applied → screening', async () => {
    if (!applicationId) return;
    const res = await request('PUT', `/api/applications/${applicationId}/status`, {
      token: employer.token,
      body: { status: 'screening' }
    });
    assertEqual(res.status, 200);
    assertEqual(res.body.status, 'screening');
  });

  await test('Valid status transition: screening → shortlisted', async () => {
    if (!applicationId) return;
    const res = await request('PUT', `/api/applications/${applicationId}/status`, {
      token: employer.token,
      body: { status: 'shortlisted' }
    });
    assertEqual(res.status, 200);
  });

  await test('Invalid transition: shortlisted → hired (must go through interview, offered)', async () => {
    if (!applicationId) return;
    const res = await request('PUT', `/api/applications/${applicationId}/status`, {
      token: employer.token,
      body: { status: 'hired' }
    });
    assertEqual(res.status, 400);
  });

  await test('Invalid transition: shortlisted → applied (no backward)', async () => {
    if (!applicationId) return;
    const res = await request('PUT', `/api/applications/${applicationId}/status`, {
      token: employer.token,
      body: { status: 'applied' }
    });
    assertEqual(res.status, 400);
  });

  await test('Invalid status value is rejected', async () => {
    if (!applicationId) return;
    const res = await request('PUT', `/api/applications/${applicationId}/status`, {
      token: employer.token,
      body: { status: 'promoted' }
    });
    assertEqual(res.status, 400);
  });

  // Continue valid transitions
  await test('Valid: shortlisted → interview → offered → hired', async () => {
    if (!applicationId) return;
    let res = await request('PUT', `/api/applications/${applicationId}/status`, {
      token: employer.token, body: { status: 'interview' }
    });
    assertEqual(res.status, 200);

    res = await request('PUT', `/api/applications/${applicationId}/status`, {
      token: employer.token, body: { status: 'offered' }
    });
    assertEqual(res.status, 200);

    res = await request('PUT', `/api/applications/${applicationId}/status`, {
      token: employer.token, body: { status: 'hired' }
    });
    assertEqual(res.status, 200);
  });

  await test('Cannot transition from hired (terminal state)', async () => {
    if (!applicationId) return;
    const res = await request('PUT', `/api/applications/${applicationId}/status`, {
      token: employer.token, body: { status: 'rejected' }
    });
    assertEqual(res.status, 400);
  });

  // --- Notes & Tags & Rating ---
  // Create a second application for these tests
  const app2Res = await request('POST', '/api/applications', {
    token: jobseeker2.token,
    body: { job_id: jobId, cover_letter: 'Second applicant here.' }
  });
  const app2Id = app2Res.body?.id;

  await test('Employer can add notes to application', async () => {
    if (!app2Id) return;
    const res = await request('POST', '/api/applications/notes', {
      token: employer.token,
      body: { applicationId: app2Id, notes: 'Great candidate' }
    });
    assertEqual(res.status, 200);
  });

  await test('Employer can rate an applicant', async () => {
    if (!app2Id) return;
    const res = await request('POST', '/api/applications/rate', {
      token: employer.token,
      body: { applicationId: app2Id, rating: 4 }
    });
    assertEqual(res.status, 200);
  });

  await test('Rating out of range is rejected', async () => {
    if (!app2Id) return;
    const res = await request('POST', '/api/applications/rate', {
      token: employer.token,
      body: { applicationId: app2Id, rating: 10 }
    });
    assertEqual(res.status, 400);
  });

  await test('Employer can add tag to application', async () => {
    if (!app2Id) return;
    const res = await request('POST', '/api/applications/tag', {
      token: employer.token,
      body: { applicationId: app2Id, tag: 'strong-candidate', color: 'green' }
    });
    assertEqual(res.status, 200);
  });

  // --- Compare ---
  await test('Compare applications works with valid IDs', async () => {
    if (!applicationId || !app2Id) return;
    const res = await request('GET', `/api/applications/compare?ids=${applicationId},${app2Id}`, {
      token: employer.token
    });
    assertEqual(res.status, 200);
    assert(res.body.data, 'Should have data');
    assertEqual(res.body.data.length, 2);
  });

  await test('Compare with less than 2 IDs fails', async () => {
    if (!applicationId) return;
    const res = await request('GET', `/api/applications/compare?ids=${applicationId}`, {
      token: employer.token
    });
    assertEqual(res.status, 400);
  });

  return results;
};
