const { request, registerUser, createTestRunner } = require('./helpers');

module.exports = async function quickApplyTests() {
  const { results, test, assert, assertEqual } = createTestRunner('QuickApply');
  console.log('\n⚡ Quick Apply Tests');

  const employer = await registerUser('employer');

  // Get a valid category
  let categorySlug = 'accounting';
  try {
    const catRes = await request('GET', '/api/categories');
    const cats = catRes.body?.data || catRes.body;
    if (Array.isArray(cats) && cats.length > 0) categorySlug = cats[0].slug;
  } catch {}

  // Create an active job
  const jobRes = await request('POST', '/api/jobs', {
    token: employer.token,
    body: {
      title: 'Quick Apply Test Job',
      description: 'A test job description that is long enough to pass validation checks.',
      location: 'Port Moresby',
      job_type: 'full-time',
      category_slug: categorySlug,
    }
  });
  const jobId = jobRes.body.id || jobRes.body.data?.id;

  await test('Quick apply with valid data', async () => {
    const res = await request('POST', '/api/applications/quick-apply', {
      body: {
        job_id: jobId,
        name: 'John Test',
        email: 'quickapply@example.com',
        phone: '70000001',
        cover_letter: 'I want this job'
      }
    });
    assertEqual(res.status, 201);
    assert(res.body.applicationId, 'Should return applicationId');
  });

  await test('Quick apply missing required fields returns 400', async () => {
    const res = await request('POST', '/api/applications/quick-apply', {
      body: { job_id: jobId, name: 'John' }
    });
    assertEqual(res.status, 400);
  });

  await test('Quick apply invalid email returns 400', async () => {
    const res = await request('POST', '/api/applications/quick-apply', {
      body: { job_id: jobId, name: 'John', email: 'notanemail', phone: '70000002' }
    });
    assertEqual(res.status, 400);
  });

  await test('Quick apply duplicate email for same job returns 400', async () => {
    const res = await request('POST', '/api/applications/quick-apply', {
      body: { job_id: jobId, name: 'John', email: 'quickapply@example.com', phone: '70000001' }
    });
    assertEqual(res.status, 400);
  });

  await test('Quick apply to non-existent job returns 404', async () => {
    const res = await request('POST', '/api/applications/quick-apply', {
      body: { job_id: 999999, name: 'John', email: 'qa2@example.com', phone: '70000003' }
    });
    assertEqual(res.status, 404);
  });

  return results;
};
