const { request, registerUser, createTestRunner } = require('./helpers');

module.exports = async function savedSearchesTests() {
  const { results, test, assert, assertEqual } = createTestRunner('SavedSearches');
  console.log('\n🔍 Saved Searches Tests');

  const user = await registerUser('jobseeker');
  let savedSearchId;

  await test('Create saved search', async () => {
    const res = await request('POST', '/api/saved-searches', {
      token: user.token,
      body: { name: 'PNG IT Jobs', query: 'developer', location: 'Port Moresby', category: 'it' }
    });
    assert(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
    savedSearchId = res.body.id || res.body.data?.id;
  });

  await test('List saved searches', async () => {
    const res = await request('GET', '/api/saved-searches', { token: user.token });
    assertEqual(res.status, 200);
    const items = res.body.data || res.body;
    assert(Array.isArray(items), 'Should return array');
  });

  await test('List saved searches without auth returns 401', async () => {
    const res = await request('GET', '/api/saved-searches');
    assertEqual(res.status, 401);
  });

  await test('Update saved search', async () => {
    if (!savedSearchId) return;
    const res = await request('PATCH', `/api/saved-searches/${savedSearchId}`, {
      token: user.token,
      body: { name: 'Updated Search' }
    });
    assert(res.status === 200 || res.status === 204, `Expected 200/204, got ${res.status}`);
  });

  await test('Delete saved search', async () => {
    if (!savedSearchId) return;
    const res = await request('DELETE', `/api/saved-searches/${savedSearchId}`, { token: user.token });
    assert(res.status === 200 || res.status === 204, `Expected 200/204, got ${res.status}`);
  });

  await test('Delete non-existent saved search returns 404', async () => {
    const res = await request('DELETE', '/api/saved-searches/999999', { token: user.token });
    assertEqual(res.status, 404);
  });

  return results;
};
