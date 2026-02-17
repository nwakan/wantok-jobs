const { request, registerUser, createTestRunner } = require('./helpers');

module.exports = async function notificationTests() {
  const { results, test, assert, assertEqual } = createTestRunner('Notifications');
  console.log('\n🔔 Notifications Tests');

  const user = await registerUser('jobseeker');

  await test('GET /api/notifications returns list', async () => {
    const res = await request('GET', '/api/notifications', { token: user.token });
    assertEqual(res.status, 200);
  });

  await test('GET /api/notifications without auth returns 401', async () => {
    const res = await request('GET', '/api/notifications');
    assertEqual(res.status, 401);
  });

  await test('GET /api/notifications/unread-count returns count', async () => {
    const res = await request('GET', '/api/notifications/unread-count', { token: user.token });
    assertEqual(res.status, 200);
    assert(res.body.count !== undefined || res.body.unread !== undefined, 'Should have count');
  });

  await test('PUT /api/notifications/read-all marks all read', async () => {
    const res = await request('PUT', '/api/notifications/read-all', { token: user.token });
    assertEqual(res.status, 200);
  });

  await test('PUT /api/notifications/mark-read works', async () => {
    const res = await request('PUT', '/api/notifications/mark-read', { token: user.token, body: { ids: [] } });
    assert(res.status === 200 || res.status === 400, 'Should handle empty ids');
  });

  await test('PUT /api/notifications/99999/read returns 404 or 200', async () => {
    const res = await request('PUT', '/api/notifications/99999/read', { token: user.token });
    assert(res.status === 200 || res.status === 403 || res.status === 404, `Got ${res.status}`);
  });

  return results;
};
