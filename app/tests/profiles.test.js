const { request, registerUser, createTestRunner } = require('./helpers');

module.exports = async function profileTests() {
  const { results, test, assert, assertEqual } = createTestRunner('Profiles');

  console.log('\n👤 Profile Tests');

  const jobseeker = await registerUser('jobseeker');
  const employer = await registerUser('employer');

  // --- Get Profile ---
  await test('Jobseeker can get own profile', async () => {
    const res = await request('GET', '/api/profile', { token: jobseeker.token });
    assertEqual(res.status, 200);
    assert(res.body.user, 'Should have user');
    assertEqual(res.body.user.role, 'jobseeker');
  });

  await test('Employer can get own profile', async () => {
    const res = await request('GET', '/api/profile', { token: employer.token });
    assertEqual(res.status, 200);
    assertEqual(res.body.user.role, 'employer');
  });

  await test('Unauthenticated user cannot get profile', async () => {
    const res = await request('GET', '/api/profile');
    assertEqual(res.status, 401);
  });

  // --- Update Jobseeker Profile ---
  await test('Jobseeker can update profile', async () => {
    const res = await request('PUT', '/api/profile', {
      token: jobseeker.token,
      body: {
        phone: '+675 1234567',
        location: 'Port Moresby',
        bio: 'Experienced developer looking for new opportunities.',
        headline: 'Full Stack Developer',
        skills: JSON.stringify(['JavaScript', 'Node.js', 'Python']),
      }
    });
    assertEqual(res.status, 200);
  });

  await test('Jobseeker profile update persists', async () => {
    const res = await request('GET', '/api/profile', { token: jobseeker.token });
    assertEqual(res.status, 200);
    assert(res.body.profile, 'Should have profile');
    assertEqual(res.body.profile.location, 'Port Moresby');
  });

  await test('Bio length limit is enforced', async () => {
    const longBio = 'x'.repeat(3000);
    const res = await request('PUT', '/api/profile', {
      token: jobseeker.token,
      body: { bio: longBio }
    });
    assert(res.status >= 400, 'Should reject overly long bio');
  });

  // --- Update Employer Profile ---
  await test('Employer can update profile', async () => {
    const res = await request('PUT', '/api/profile', {
      token: employer.token,
      body: {
        company_name: 'Test Company PNG',
        industry: 'Technology',
        company_size: '10-50',
        description: 'A great company in PNG.',
        website: 'https://testcompany.pg',
        location: 'Lae',
      }
    });
    assertEqual(res.status, 200);
  });

  await test('Employer profile update persists', async () => {
    const res = await request('GET', '/api/profile', { token: employer.token });
    assertEqual(res.status, 200);
    assert(res.body.profile, 'Should have profile');
    assertEqual(res.body.profile.company_name, 'Test Company PNG');
  });

  return results;
};
