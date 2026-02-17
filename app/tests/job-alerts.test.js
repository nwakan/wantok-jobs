const { request, registerUser, createTestRunner } = require('./helpers');
const crypto = require('crypto');

module.exports = async function jobAlertsTests() {
  const { results, test, assert, assertEqual } = createTestRunner('JobAlerts');
  console.log('\n🔔 Job Alerts Tests');

  const user = await registerUser('jobseeker');
  const rand = crypto.randomBytes(4).toString('hex');

  await test('Subscribe to job alerts (anonymous)', async () => {
    const res = await request('POST', '/api/job-alerts/subscribe', {
      body: { email: `alert_${rand}@example.com`, frequency: 'weekly' }
    });
    assert(res.status === 200 || res.status === 201, `Got ${res.status}`);
  });

  let alertId;
  await test('Create job alert (authenticated)', async () => {
    const res = await request('POST', '/api/job-alerts', {
      token: user.token,
      body: { keywords: 'engineer', location: 'Lae', frequency: 'daily' }
    });
    assert(res.status === 200 || res.status === 201, `Got ${res.status}`);
    alertId = res.body.id || res.body.data?.id;
  });

  await test('List job alerts', async () => {
    const res = await request('GET', '/api/job-alerts', { token: user.token });
    assertEqual(res.status, 200);
  });

  await test('Update job alert', async () => {
    if (!alertId) return;
    const res = await request('PUT', `/api/job-alerts/${alertId}`, {
      token: user.token,
      body: { keyword: 'senior engineer' }
    });
    assertEqual(res.status, 200);
  });

  await test('Delete job alert', async () => {
    if (!alertId) return;
    const res = await request('DELETE', `/api/job-alerts/${alertId}`, { token: user.token });
    assertEqual(res.status, 200);
  });

  await test('Job alerts without auth returns 401', async () => {
    const res = await request('GET', '/api/job-alerts');
    assertEqual(res.status, 401);
  });

  return results;
};
