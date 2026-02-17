const { request, registerUser, createTestRunner } = require('./helpers');

module.exports = async function badgeTests() {
  const { results, test, assert, assertEqual } = createTestRunner('Badges');
  console.log('\n🏅 Badge Tests');

  const user = await registerUser('jobseeker');

  await test('Get my badges', async () => {
    const res = await request('GET', '/api/badges/my', { token: user.token });
    assertEqual(res.status, 200);
  });

  await test('Get badges without auth returns 401', async () => {
    const res = await request('GET', '/api/badges/my');
    assertEqual(res.status, 401);
  });

  await test('Check badges', async () => {
    const res = await request('GET', '/api/badges/check', { token: user.token });
    assertEqual(res.status, 200);
  });

  await test('Check badges without auth returns 401', async () => {
    const res = await request('GET', '/api/badges/check');
    assertEqual(res.status, 401);
  });

  await test('Get user badges by id', async () => {
    const res = await request('GET', `/api/badges/user/${user.user.id}`);
    assertEqual(res.status, 200);
  });

  await test('Get badges for non-existent user', async () => {
    const res = await request('GET', '/api/badges/user/999999');
    assert(res.status === 200 || res.status === 404, `Got ${res.status}`);
  });

  return results;
};
