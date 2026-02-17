const { request, registerUser, createTestRunner } = require('./helpers');
const crypto = require('crypto');

module.exports = async function newsletterTests() {
  const { results, test, assert, assertEqual } = createTestRunner('Newsletter');
  console.log('\n📰 Newsletter Tests');

  const rand = crypto.randomBytes(4).toString('hex');

  await test('Subscribe to newsletter', async () => {
    const res = await request('POST', '/api/newsletter', {
      body: { email: `news_${rand}@example.com` }
    });
    assert(res.status === 200 || res.status === 201, `Got ${res.status}`);
  });

  await test('Subscribe with same email fails or is idempotent', async () => {
    const res = await request('POST', '/api/newsletter', {
      body: { email: `news_${rand}@example.com` }
    });
    assert(res.status === 200 || res.status === 400 || res.status === 409, `Got ${res.status}`);
  });

  await test('Subscribe with invalid email fails', async () => {
    const res = await request('POST', '/api/newsletter', {
      body: { email: 'not-an-email' }
    });
    assert(res.status >= 400, 'Should reject invalid email');
  });

  await test('Subscribe with empty email fails', async () => {
    const res = await request('POST', '/api/newsletter', { body: { email: '' } });
    assert(res.status >= 400, 'Should reject empty email');
  });

  await test('Unsubscribe from newsletter', async () => {
    const res = await request('POST', '/api/newsletter/unsubscribe', {
      body: { email: `news_${rand}@example.com` }
    });
    assertEqual(res.status, 200);
  });

  await test('Newsletter history requires admin', async () => {
    const user = await registerUser('jobseeker');
    const res = await request('GET', '/api/newsletter/history', { token: user.token });
    assertEqual(res.status, 403);
  });

  await test('Newsletter stats requires admin', async () => {
    const user = await registerUser('jobseeker');
    const res = await request('GET', '/api/newsletter/stats', { token: user.token });
    assertEqual(res.status, 403);
  });

  return results;
};
