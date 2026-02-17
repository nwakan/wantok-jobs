const { request, registerUser, solveCaptcha, createTestRunner } = require('./helpers');

module.exports = async function edgeCaseTests() {
  const { results, test, assert, assertEqual } = createTestRunner('EdgeCases');
  console.log('\n🔬 Edge Case Tests');

  // --- Empty/null inputs ---
  await test('Register with empty body returns 400', async () => {
    const res = await request('POST', '/api/auth/register', { body: {} });
    assert(res.status >= 400, `Got ${res.status}`);
  });

  await test('Login with empty body returns 400/401', async () => {
    const res = await request('POST', '/api/auth/login', { body: {} });
    assert(res.status >= 400, `Got ${res.status}`);
  });

  await test('Create job with empty body returns 400/401', async () => {
    const res = await request('POST', '/api/jobs', { body: {} });
    assert(res.status >= 400, `Got ${res.status}`);
  });

  await test('Apply with empty body returns 400/401', async () => {
    const res = await request('POST', '/api/applications', { body: {} });
    assert(res.status >= 400, `Got ${res.status}`);
  });

  // --- SQL injection in auth ---
  await test('SQL injection in login email', async () => {
    const res = await request('POST', '/api/auth/login', {
      body: { email: "' OR 1=1 --", password: 'anything' }
    });
    assert(res.status === 400 || res.status === 401, `Got ${res.status}`);
  });

  await test('SQL injection in login password', async () => {
    const res = await request('POST', '/api/auth/login', {
      body: { email: 'test@test.com', password: "' OR '1'='1" }
    });
    assertEqual(res.status, 401);
  });

  // --- XSS in various inputs ---
  await test('XSS in newsletter email', async () => {
    const res = await request('POST', '/api/newsletter', {
      body: { email: '<script>alert(1)</script>@evil.com' }
    });
    assert(res.status >= 400, 'Should reject XSS email');
  });

  await test('XSS in chat message is safe', async () => {
    const res = await request('POST', '/api/chat', {
      body: { message: '<img src=x onerror=alert(1)>', session_id: 'xss-1' }
    });
    if (res.status === 200) {
      const text = JSON.stringify(res.body);
      assert(!text.includes('onerror'), 'Should not reflect XSS payload');
    }
  });

  // --- Auth bypass attempts ---
  await test('Access protected route with Bearer null', async () => {
    const res = await request('GET', '/api/auth/me', { token: 'null' });
    assertEqual(res.status, 403);
  });

  await test('Access protected route with Bearer undefined', async () => {
    const res = await request('GET', '/api/auth/me', { token: 'undefined' });
    assertEqual(res.status, 403);
  });

  await test('JWT with tampered payload is rejected', async () => {
    // Take a valid-looking JWT structure but with wrong signature
    const fakeJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6ImFkbWluIn0.tampered';
    const res = await request('GET', '/api/auth/me', { token: fakeJwt });
    assertEqual(res.status, 403);
  });

  // --- Large payloads ---
  await test('Very long job title is rejected', async () => {
    const employer = await registerUser('employer');
    const res = await request('POST', '/api/jobs', {
      token: employer.token,
      body: { title: 'A'.repeat(1000), description: 'Valid desc.', location: 'Lae', job_type: 'full-time', category_slug: 'accounting' }
    });
    assert(res.status >= 400, `Should reject long title, got ${res.status}`);
  });

  await test('Unicode in job search works', async () => {
    const res = await request('GET', '/api/jobs?keyword=' + encodeURIComponent('日本語テスト'));
    assertEqual(res.status, 200);
  });

  // --- Boundary IDs ---
  await test('Negative job ID returns 404', async () => {
    const res = await request('GET', '/api/jobs/-1');
    assert(res.status === 404 || res.status === 400, `Got ${res.status}`);
  });

  await test('Zero job ID returns 404', async () => {
    const res = await request('GET', '/api/jobs/0');
    assert(res.status === 404 || res.status === 400, `Got ${res.status}`);
  });

  await test('Non-numeric job ID returns 404', async () => {
    const res = await request('GET', '/api/jobs/abc');
    assert(res.status === 404 || res.status === 400, `Got ${res.status}`);
  });

  // --- Content-Type edge cases ---
  await test('POST with text/plain body is handled', async () => {
    const res = await request('POST', '/api/auth/login', {
      body: 'not json',
      headers: { 'Content-Type': 'text/plain' }
    });
    assert(res.status >= 400, `Got ${res.status}`);
  });

  // --- Concurrent operations ---
  await test('Concurrent registrations do not conflict', async () => {
    const promises = Array.from({ length: 3 }, () => registerUser('jobseeker'));
    const results_arr = await Promise.allSettled(promises);
    const succeeded = results_arr.filter(r => r.status === 'fulfilled');
    assert(succeeded.length === 3, `Only ${succeeded.length}/3 registrations succeeded`);
  });

  return results;
};
