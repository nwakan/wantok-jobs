const { request, createTestRunner } = require('./helpers');

module.exports = async function companiesTests() {
  const { results, test, assert, assertEqual } = createTestRunner('Companies');
  console.log('\n🏢 Companies Tests');

  await test('GET /api/companies returns list', async () => {
    const res = await request('GET', '/api/companies');
    assertEqual(res.status, 200);
  });

  await test('GET /api/companies/99999 returns 404', async () => {
    const res = await request('GET', '/api/companies/99999');
    assertEqual(res.status, 404);
  });

  return results;
};
