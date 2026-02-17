const { request, registerUser, createTestRunner } = require('./helpers');

module.exports = async function referralTests() {
  const { results, test, assert, assertEqual } = createTestRunner('Referrals');
  console.log('\n🔗 Referral Tests');

  const user = await registerUser('jobseeker');

  await test('Get my referral code', async () => {
    const res = await request('GET', '/api/referrals/my-code', { token: user.token });
    assertEqual(res.status, 200);
    assert(res.body.code || res.body.referral_code, 'Should return a referral code');
  });

  await test('Get referral code without auth returns 401', async () => {
    const res = await request('GET', '/api/referrals/my-code');
    assertEqual(res.status, 401);
  });

  await test('Get referral stats', async () => {
    const res = await request('GET', '/api/referrals/stats', { token: user.token });
    assertEqual(res.status, 200);
  });

  await test('Get referral stats without auth returns 401', async () => {
    const res = await request('GET', '/api/referrals/stats');
    assertEqual(res.status, 401);
  });

  await test('Track referral click', async () => {
    const codeRes = await request('GET', '/api/referrals/my-code', { token: user.token });
    const code = codeRes.body.code || codeRes.body.referral_code;
    const res = await request('POST', '/api/referrals/track', { body: { code } });
    assert(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
  });

  await test('Track referral with invalid code', async () => {
    const res = await request('POST', '/api/referrals/track', { body: { code: 'INVALID999' } });
    assert(res.status === 200 || res.status === 404 || res.status === 400, `Got ${res.status}`);
  });

  return results;
};
