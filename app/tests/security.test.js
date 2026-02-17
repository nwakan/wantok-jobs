const { request, registerUser, createTestRunner } = require('./helpers');

module.exports = async function securityTests() {
  const { results, test, assert, assertEqual } = createTestRunner('Security');

  console.log('\n🔒 Security Tests');

  const employer = await registerUser('employer');
  const jobseeker = await registerUser('jobseeker');

  let categorySlug = 'general';
  try {
    const catRes = await request('GET', '/api/categories');
    const cats = catRes.body?.data || catRes.body;
    if (Array.isArray(cats) && cats.length > 0) categorySlug = cats[0].slug;
  } catch {}

  // --- XSS Prevention (Critical Bug #5) ---
  await test('XSS in job title is stripped', async () => {
    const res = await request('POST', '/api/jobs', {
      token: employer.token,
      body: {
        title: '<script>alert("xss")</script>Developer',
        description: 'A valid description that is long enough for the validation.',
        location: 'Lae',
        job_type: 'full-time',
        category_slug: categorySlug,
      }
    });
    if (res.status === 201 || res.status === 200) {
      const jobId = res.body.id || res.body.data?.id;
      const getRes = await request('GET', `/api/jobs/${jobId}`);
      assert(!getRes.body.title.includes('<script>'), `XSS not stripped from title: ${getRes.body.title}`);
    }
  });

  await test('XSS in job description is stripped', async () => {
    const res = await request('POST', '/api/jobs', {
      token: employer.token,
      body: {
        title: 'Safe Title Here',
        description: '<img onerror="alert(1)" src="x">A valid long description here.',
        location: 'Lae',
        job_type: 'full-time',
        category_slug: categorySlug,
      }
    });
    if (res.status === 201 || res.status === 200) {
      const jobId = res.body.id || res.body.data?.id;
      const getRes = await request('GET', `/api/jobs/${jobId}`);
      assert(!getRes.body.description.includes('onerror'), `XSS not stripped from description`);
    }
  });

  await test('XSS in registration name is stripped', async () => {
    const { token } = await registerUser('jobseeker', { name: '<script>alert(1)</script>John' });
    const res = await request('GET', '/api/auth/me', { token });
    assert(!res.body.name.includes('<script>'), `XSS in name: ${res.body.name}`);
  });

  await test('XSS in cover letter is stripped', async () => {
    // Create a job first
    const jobRes = await request('POST', '/api/jobs', {
      token: employer.token,
      body: {
        title: 'XSS Cover Test',
        description: 'A valid description that is long enough for the validation.',
        location: 'Lae',
        job_type: 'full-time',
        category_slug: categorySlug,
      }
    });
    const jobId = jobRes.body.id || jobRes.body.data?.id;
    if (!jobId) return;

    const js2 = await registerUser('jobseeker');
    const res = await request('POST', '/api/applications', {
      token: js2.token,
      body: { job_id: jobId, cover_letter: '<script>steal(cookies)</script>I am interested.' }
    });
    if (res.status === 201) {
      assert(!JSON.stringify(res.body).includes('<script>'), 'XSS in cover letter not stripped');
    }
  });

  await test('XSS in profile bio is stripped', async () => {
    const res = await request('PUT', '/api/profile', {
      token: jobseeker.token,
      body: { bio: '<iframe src="evil.com"></iframe>Normal bio text' }
    });
    if (res.status === 200) {
      const profileRes = await request('GET', '/api/profile', { token: jobseeker.token });
      const bio = profileRes.body.profile?.bio || '';
      assert(!bio.includes('<iframe'), `XSS in bio: ${bio}`);
    }
  });

  // --- SQL Injection ---
  await test('SQL injection in job search keyword', async () => {
    const res = await request('GET', '/api/jobs?keyword=\'; DROP TABLE jobs; --');
    assertEqual(res.status, 200); // Should not crash
  });

  await test('SQL injection in location filter', async () => {
    const res = await request('GET', '/api/jobs?location=\' OR 1=1 --');
    assertEqual(res.status, 200);
  });

  await test('SQL injection in job ID parameter', async () => {
    const res = await request('GET', '/api/jobs/1%20OR%201=1');
    // Should either 404 or 200 for actual ID 1, not return all jobs
    assert(res.status === 404 || res.status === 200, 'Should handle gracefully');
  });

  // --- Auth Bypass (Critical Bug #6) ---
  await test('Jobseeker cannot access employer job list', async () => {
    const res = await request('GET', '/api/jobs/my', { token: jobseeker.token });
    assertEqual(res.status, 403);
  });

  await test('Jobseeker cannot update application status', async () => {
    // Create a job and application
    const jobRes = await request('POST', '/api/jobs', {
      token: employer.token,
      body: {
        title: 'Auth Test Job',
        description: 'Description for auth test job that is long enough.',
        location: 'Goroka',
        job_type: 'full-time',
        category_slug: categorySlug,
      }
    });
    const jobId = jobRes.body.id || jobRes.body.data?.id;
    if (!jobId) return;

    const appRes = await request('POST', '/api/applications', {
      token: jobseeker.token,
      body: { job_id: jobId, cover_letter: 'Test' }
    });
    const appId = appRes.body?.id;
    if (!appId) return;

    const res = await request('PUT', `/api/applications/${appId}/status`, {
      token: jobseeker.token,
      body: { status: 'shortlisted' }
    });
    assertEqual(res.status, 403);
  });

  await test('Employer cannot apply to jobs', async () => {
    const res = await request('POST', '/api/applications', {
      token: employer.token,
      body: { job_id: 1, cover_letter: 'I am employer' }
    });
    assertEqual(res.status, 403);
  });

  await test('Jobseeker cannot rate applicants', async () => {
    const res = await request('POST', '/api/applications/rate', {
      token: jobseeker.token,
      body: { applicationId: 1, rating: 5 }
    });
    assertEqual(res.status, 403);
  });

  await test('Jobseeker cannot add tags to applications', async () => {
    const res = await request('POST', '/api/applications/tag', {
      token: jobseeker.token,
      body: { applicationId: 1, tag: 'hack' }
    });
    assertEqual(res.status, 403);
  });

  await test('Jobseeker cannot save employer notes', async () => {
    const res = await request('POST', '/api/applications/notes', {
      token: jobseeker.token,
      body: { applicationId: 1, notes: 'hacked' }
    });
    assertEqual(res.status, 403);
  });

  // --- Token Manipulation ---
  await test('Expired/invalid JWT is rejected', async () => {
    const res = await request('GET', '/api/auth/me', { token: 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MX0.invalid' });
    assertEqual(res.status, 403);
  });

  await test('Missing Authorization header returns 401', async () => {
    const res = await request('GET', '/api/auth/me');
    assertEqual(res.status, 401);
  });

  // --- Rate Limiting ---
  await test('Health endpoint works under normal load', async () => {
    const res = await request('GET', '/health');
    assertEqual(res.status, 200);
  });

  return results;
};
