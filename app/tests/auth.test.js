const { request, registerUser, loginUser, solveCaptcha, createTestRunner } = require('./helpers');

module.exports = async function authTests() {
  const { results, test, assert, assertEqual } = createTestRunner('Auth');

  console.log('\n🔐 Auth Tests');

  // --- Registration ---
  await test('Register jobseeker succeeds', async () => {
    const { token, user } = await registerUser('jobseeker');
    assert(token, 'Should return token');
    assertEqual(user.role, 'jobseeker');
    assert(user.id > 0, 'Should have user ID');
  });

  await test('Register employer succeeds', async () => {
    const { token, user } = await registerUser('employer');
    assert(token, 'Should return token');
    assertEqual(user.role, 'employer');
  });

  await test('Register with duplicate email fails', async () => {
    const { email } = await registerUser('jobseeker');
    const captcha = await solveCaptcha();
    const res = await request('POST', '/api/auth/register', {
      body: { email, password: 'TestPass123!', name: 'Dup', role: 'jobseeker', ...captcha }
    });
    assertEqual(res.status, 400);
  });

  await test('Register with weak password fails', async () => {
    const captcha = await solveCaptcha();
    const res = await request('POST', '/api/auth/register', {
      body: { email: 'weak@test.com', password: '123', name: 'Weak', role: 'jobseeker', ...captcha }
    });
    assertEqual(res.status, 400);
  });

  await test('Register with invalid role fails', async () => {
    const captcha = await solveCaptcha();
    const res = await request('POST', '/api/auth/register', {
      body: { email: 'bad@test.com', password: 'TestPass123!', name: 'Bad', role: 'superadmin', ...captcha }
    });
    assert(res.status >= 400, 'Should reject invalid role');
  });

  await test('Register without captcha fails', async () => {
    const res = await request('POST', '/api/auth/register', {
      body: { email: 'nocap@test.com', password: 'TestPass123!', name: 'NoCap', role: 'jobseeker' }
    });
    assertEqual(res.status, 400);
  });

  await test('Register with wrong captcha answer fails', async () => {
    const captcha = await solveCaptcha();
    const res = await request('POST', '/api/auth/register', {
      body: { email: 'wrongcap@test.com', password: 'TestPass123!', name: 'Wrong', role: 'jobseeker', captcha_id: captcha.captcha_id, captcha_answer: '99999' }
    });
    assertEqual(res.status, 400);
  });

  // --- Login ---
  await test('Login with valid credentials succeeds', async () => {
    const { email, password } = await registerUser('jobseeker');
    const { token, user } = await loginUser(email, password);
    assert(token, 'Should return token');
    assert(user.email === email, 'Should return correct email');
  });

  await test('Login with wrong password fails', async () => {
    const { email } = await registerUser('jobseeker');
    const res = await request('POST', '/api/auth/login', {
      body: { email, password: 'WrongPassword123!' }
    });
    assertEqual(res.status, 401);
  });

  await test('Login with non-existent email fails', async () => {
    const res = await request('POST', '/api/auth/login', {
      body: { email: 'nonexistent@nowhere.com', password: 'SomePass123!' }
    });
    assertEqual(res.status, 401);
  });

  // --- Email Verification ---
  await test('Verify email with invalid token fails', async () => {
    const res = await request('GET', '/api/auth/verify-email?token=invalidtoken123');
    assertEqual(res.status, 400);
  });

  await test('Verify email without token fails', async () => {
    const res = await request('GET', '/api/auth/verify-email');
    assertEqual(res.status, 400);
  });

  // --- Password Reset ---
  await test('Forgot password always returns success (no email leak)', async () => {
    const res = await request('POST', '/api/auth/forgot-password', {
      body: { email: 'nonexistent@nowhere.com' }
    });
    assertEqual(res.status, 200);
    assert(res.body.message, 'Should return a message');
  });

  await test('Forgot password with valid email succeeds', async () => {
    const { email } = await registerUser('jobseeker');
    const res = await request('POST', '/api/auth/forgot-password', { body: { email } });
    assertEqual(res.status, 200);
  });

  await test('Reset password with invalid token fails', async () => {
    const res = await request('POST', '/api/auth/reset-password', {
      body: { token: 'badtoken', password: 'NewPass123!' }
    });
    assertEqual(res.status, 400);
  });

  // --- Change Password ---
  await test('Change password with valid current password succeeds', async () => {
    const { token, password } = await registerUser('jobseeker');
    const res = await request('POST', '/api/auth/change-password', {
      token,
      body: { currentPassword: password, newPassword: 'NewSecure456!' }
    });
    assertEqual(res.status, 200);
  });

  await test('Change password with wrong current password fails', async () => {
    const { token } = await registerUser('jobseeker');
    const res = await request('POST', '/api/auth/change-password', {
      token,
      body: { currentPassword: 'WrongPass999!', newPassword: 'NewSecure456!' }
    });
    assertEqual(res.status, 401);
  });

  await test('Change password with weak new password fails', async () => {
    const { token, password } = await registerUser('jobseeker');
    const res = await request('POST', '/api/auth/change-password', {
      token,
      body: { currentPassword: password, newPassword: '123' }
    });
    assertEqual(res.status, 400);
  });

  // --- Get Current User ---
  await test('GET /api/auth/me returns user info', async () => {
    const { token, user } = await registerUser('jobseeker');
    const res = await request('GET', '/api/auth/me', { token });
    assertEqual(res.status, 200);
    assertEqual(res.body.id, user.id);
    assertEqual(res.body.role, 'jobseeker');
  });

  await test('GET /api/auth/me without token returns 401', async () => {
    const res = await request('GET', '/api/auth/me');
    assertEqual(res.status, 401);
  });

  await test('GET /api/auth/me with invalid token returns 403', async () => {
    const res = await request('GET', '/api/auth/me', { token: 'invalid.token.here' });
    assertEqual(res.status, 403);
  });

  return results;
};
