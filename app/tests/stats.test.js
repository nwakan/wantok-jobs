const { request, registerUser, createTestRunner } = require('./helpers');

module.exports = async function statsTests() {
  const { results, test, assert, assertEqual } = createTestRunner('Stats');
  console.log('\n📊 Stats Tests');

  await test('GET /api/stats returns public stats', async () => {
    const res = await request('GET', '/api/stats');
    assertEqual(res.status, 200);
  });

  await test('GET /api/stats/public returns public stats', async () => {
    const res = await request('GET', '/api/stats/public');
    assertEqual(res.status, 200);
  });

  await test('GET /api/stats/categories returns category stats', async () => {
    const res = await request('GET', '/api/stats/categories');
    assertEqual(res.status, 200);
  });

  await test('GET /api/stats/top-employers returns top employers', async () => {
    const res = await request('GET', '/api/stats/top-employers');
    assertEqual(res.status, 200);
  });

  await test('Stats dashboard requires admin', async () => {
    const user = await registerUser('jobseeker');
    const res = await request('GET', '/api/stats/dashboard', { token: user.token });
    assertEqual(res.status, 403);
  });

  await test('Stats dashboard without auth returns 401', async () => {
    const res = await request('GET', '/api/stats/dashboard');
    assertEqual(res.status, 401);
  });

  return results;
};
