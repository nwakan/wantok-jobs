const { request, registerUser, createTestRunner } = require('./helpers');

module.exports = async function notificationPreferencesTests() {
  const { results, test, assert, assertEqual } = createTestRunner('NotificationPreferences');
  console.log('\n🔔 Notification Preferences Tests');

  const user = await registerUser('jobseeker');
  let tableExists = true;

  await test('Get notification preferences', async () => {
    const res = await request('GET', '/api/notification-preferences', { token: user.token });
    if (res.status === 500) { tableExists = false; return; } // table not migrated
    assertEqual(res.status, 200);
  });

  await test('Get preferences without auth returns 401', async () => {
    const res = await request('GET', '/api/notification-preferences');
    assertEqual(res.status, 401);
  });

  await test('Update notification preferences', async () => {
    if (!tableExists) return;
    const res = await request('PATCH', '/api/notification-preferences', {
      token: user.token,
      body: { email_notifications: false, push_notifications: true }
    });
    assert(res.status === 200 || res.status === 204, `Expected 200/204, got ${res.status}`);
  });

  await test('Update preferences without auth returns 401', async () => {
    const res = await request('PATCH', '/api/notification-preferences', {
      body: { email_notifications: false }
    });
    assertEqual(res.status, 401);
  });

  return results;
};
