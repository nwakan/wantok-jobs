const { request, registerUser, createTestRunner } = require('./helpers');

module.exports = async function savedJobsTests() {
  const { results, test, assert, assertEqual } = createTestRunner('SavedJobs');
  console.log('\n💾 Saved Jobs Tests');

  const employer = await registerUser('employer');
  const jobseeker = await registerUser('jobseeker');

  // Create a job
  let jobId;
  const catRes = await request('GET', '/api/categories');
  const cats = catRes.body?.data || catRes.body;
  const slug = Array.isArray(cats) && cats.length > 0 ? cats[0].slug : 'accounting';

  const jobRes = await request('POST', '/api/jobs', {
    token: employer.token,
    body: { title: 'Save Test Job', description: 'Long enough description for validation.', location: 'Lae', job_type: 'full-time', category_slug: slug }
  });
  jobId = jobRes.body.id || jobRes.body.data?.id;

  await test('Save a job', async () => {
    if (!jobId) return;
    const res = await request('POST', `/api/saved-jobs/${jobId}`, { token: jobseeker.token });
    assertEqual(res.status, 200);
  });

  await test('Get saved jobs', async () => {
    const res = await request('GET', '/api/saved-jobs', { token: jobseeker.token });
    assertEqual(res.status, 200);
    const data = res.body.data || res.body;
    assert(Array.isArray(data), 'Should be array');
  });

  await test('Unsave a job', async () => {
    if (!jobId) return;
    const res = await request('DELETE', `/api/saved-jobs/${jobId}`, { token: jobseeker.token });
    assertEqual(res.status, 200);
  });

  await test('Save job without auth returns 401', async () => {
    const res = await request('POST', '/api/saved-jobs/1');
    assertEqual(res.status, 401);
  });

  return results;
};
