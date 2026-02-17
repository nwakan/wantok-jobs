const { request, registerUser, createTestRunner } = require('./helpers');

module.exports = async function employerAnalyticsTests() {
  const { results, test, assert, assertEqual } = createTestRunner('EmployerAnalytics');
  console.log('\n📈 Employer Analytics Tests');

  const employer = await registerUser('employer');
  const jobseeker = await registerUser('jobseeker');

  await test('Employer can access analytics', async () => {
    const res = await request('GET', '/api/employer/analytics', { token: employer.token });
    assertEqual(res.status, 200);
  });

  await test('Jobseeker cannot access employer analytics', async () => {
    const res = await request('GET', '/api/employer/analytics', { token: jobseeker.token });
    assertEqual(res.status, 403);
  });

  await test('Unauthenticated cannot access employer analytics', async () => {
    const res = await request('GET', '/api/employer/analytics');
    assertEqual(res.status, 401);
  });

  await test('Employer can access pipeline analytics', async () => {
    const res = await request('GET', '/api/employer/pipeline-analytics', { token: employer.token });
    assertEqual(res.status, 200);
  });

  await test('Jobseeker cannot access pipeline analytics', async () => {
    const res = await request('GET', '/api/employer/pipeline-analytics', { token: jobseeker.token });
    assertEqual(res.status, 403);
  });

  return results;
};
