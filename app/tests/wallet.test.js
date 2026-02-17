const { request, registerUser, createTestRunner } = require('./helpers');

module.exports = async function walletTests() {
  const { results, test, assert, assertEqual } = createTestRunner('Wallet');
  console.log('\n💰 Wallet Tests');

  const user = await registerUser('employer');
  const jobseeker = await registerUser('jobseeker');

  await test('Get wallet balance (authenticated)', async () => {
    const res = await request('GET', '/api/wallet', { token: user.token });
    assert(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
  });

  await test('Get wallet balance without auth returns 401', async () => {
    const res = await request('GET', '/api/wallet');
    assertEqual(res.status, 401);
  });

  await test('Get wallet transactions', async () => {
    const res = await request('GET', '/api/wallet/transactions', { token: user.token });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await test('Deposit to wallet', async () => {
    const res = await request('POST', '/api/wallet/deposit', {
      token: user.token,
      body: { amount: 50, reference: 'TEST-DEP-001', method: 'bank_transfer' }
    });
    assert(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
  });

  await test('Deposit without auth returns 401', async () => {
    const res = await request('POST', '/api/wallet/deposit', {
      body: { amount: 50 }
    });
    assertEqual(res.status, 401);
  });

  await test('Request refund for non-existent transaction returns 404', async () => {
    const res = await request('POST', '/api/wallet/refund/999999', { token: user.token });
    assert(res.status === 404 || res.status === 400, `Expected 404/400, got ${res.status}`);
  });

  await test('Get refunds list', async () => {
    const res = await request('GET', '/api/wallet/refunds', { token: user.token });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await test('Non-admin cannot access admin wallet endpoints', async () => {
    const res = await request('GET', '/api/wallet/admin/deposits', { token: user.token });
    assertEqual(res.status, 403);
  });

  return results;
};
