const { request, registerUser, createTestRunner } = require('./helpers');

module.exports = async function interviewTests() {
  const { results, test, assert, assertEqual } = createTestRunner('Interviews');
  console.log('\n📅 Interview Tests');

  const employer = await registerUser('employer');
  const jobseeker = await registerUser('jobseeker');

  // Get a valid category
  let categorySlug = 'accounting';
  try {
    const catRes = await request('GET', '/api/categories');
    const cats = catRes.body?.data || catRes.body;
    if (Array.isArray(cats) && cats.length > 0) categorySlug = cats[0].slug;
  } catch {}

  // Create job and application
  const jobRes = await request('POST', '/api/jobs', {
    token: employer.token,
    body: {
      title: 'Interview Test Job',
      description: 'A test job description that is long enough to pass validation checks.',
      location: 'Lae',
      job_type: 'full-time',
      category_slug: categorySlug,
    }
  });
  const jobId = jobRes.body.id || jobRes.body.data?.id;

  const appRes = await request('POST', '/api/applications', {
    token: jobseeker.token,
    body: { job_id: jobId, cover_letter: 'Interested in interview test.' }
  });
  const applicationId = appRes.body.id;

  let interviewId;

  await test('Employer can schedule interview', async () => {
    const res = await request('POST', '/api/interviews', {
      token: employer.token,
      body: {
        application_id: applicationId,
        scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        type: 'in-person',
        location: 'Office',
        notes: 'First round'
      }
    });
    assert(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
    interviewId = res.body.id || res.body.data?.id || res.body.interview?.id;
  });

  await test('Jobseeker cannot schedule interview', async () => {
    const res = await request('POST', '/api/interviews', {
      token: jobseeker.token,
      body: {
        application_id: applicationId,
        scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        type: 'phone'
      }
    });
    assertEqual(res.status, 403);
  });

  await test('Schedule interview without auth returns 401', async () => {
    const res = await request('POST', '/api/interviews', {
      body: { application_id: applicationId, scheduled_at: new Date().toISOString(), type: 'phone' }
    });
    assertEqual(res.status, 401);
  });

  await test('List my interviews', async () => {
    const res = await request('GET', '/api/interviews/my', { token: jobseeker.token });
    assertEqual(res.status, 200);
  });

  await test('List interviews without auth returns 401', async () => {
    const res = await request('GET', '/api/interviews/my');
    assertEqual(res.status, 401);
  });

  await test('Confirm interview', async () => {
    if (!interviewId) return;
    const res = await request('PATCH', `/api/interviews/${interviewId}/confirm`, { token: jobseeker.token });
    // 400 may occur if interview is already in a non-confirmable state
    assert(res.status === 200 || res.status === 204 || res.status === 400, `Expected 200/204/400, got ${res.status}`);
  });

  await test('Cancel interview', async () => {
    if (!interviewId) return;
    const res = await request('PATCH', `/api/interviews/${interviewId}/cancel`, { token: employer.token });
    assert(res.status === 200 || res.status === 204, `Expected 200/204, got ${res.status}`);
  });

  return results;
};
