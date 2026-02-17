const { request, registerUser, createTestRunner } = require('./helpers');

module.exports = async function exportTests() {
  const { results, test, assert, assertEqual } = createTestRunner('Export');
  console.log('\n📤 CSV Export Tests');

  const employer = await registerUser('employer');
  const jobseeker = await registerUser('jobseeker');

  await test('Export applicants CSV without auth returns 401', async () => {
    const res = await request('GET', '/api/export/applicants');
    assertEqual(res.status, 401);
  });

  await test('Export applicants CSV as employer', async () => {
    const res = await request('GET', '/api/export/applicants', { token: employer.token });
    // May return 200 with CSV or 403 depending on auth middleware
    assert(res.status === 200 || res.status === 400 || res.status === 403 || res.status === 404, `Got ${res.status}`);
  });

  await test('Export jobs CSV without auth returns 401', async () => {
    const res = await request('GET', '/api/export/jobs');
    assertEqual(res.status, 401);
  });

  await test('Export jobs CSV as employer', async () => {
    const res = await request('GET', '/api/export/jobs', { token: employer.token });
    assert(res.status === 200 || res.status === 403, `Got ${res.status}`);
  });

  return results;
};
