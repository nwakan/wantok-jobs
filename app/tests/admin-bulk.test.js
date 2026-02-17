const { request, registerUser, createTestRunner } = require('./helpers');

module.exports = async function adminBulkTests() {
  const { results, test, assert, assertEqual } = createTestRunner('AdminBulk');
  console.log('\n🛡️  Admin Bulk Action Tests');

  const employer = await registerUser('employer');
  const jobseeker = await registerUser('jobseeker');

  await test('Non-admin cannot bulk update jobs', async () => {
    const res = await request('POST', '/api/admin/jobs/bulk', {
      token: employer.token,
      body: { action: 'close', ids: [1, 2, 3] }
    });
    assertEqual(res.status, 403);
  });

  await test('Non-admin cannot bulk update users', async () => {
    const res = await request('POST', '/api/admin/users/bulk', {
      token: employer.token,
      body: { action: 'suspend', ids: [1, 2, 3] }
    });
    assertEqual(res.status, 403);
  });

  await test('Unauthenticated cannot bulk update jobs', async () => {
    const res = await request('POST', '/api/admin/jobs/bulk', {
      body: { action: 'close', ids: [1] }
    });
    assertEqual(res.status, 401);
  });

  await test('Unauthenticated cannot bulk update users', async () => {
    const res = await request('POST', '/api/admin/users/bulk', {
      body: { action: 'suspend', ids: [1] }
    });
    assertEqual(res.status, 401);
  });

  return results;
};
