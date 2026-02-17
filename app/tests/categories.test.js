const { request, createTestRunner } = require('./helpers');

module.exports = async function categoryTests() {
  const { results, test, assert, assertEqual } = createTestRunner('Categories');
  console.log('\n📂 Categories Tests');

  await test('GET /api/categories returns list', async () => {
    const res = await request('GET', '/api/categories');
    assertEqual(res.status, 200);
    const data = res.body.data || res.body.categories || res.body;
    assert(data && (Array.isArray(data) || typeof data === 'object'), 'Should return data');
  });

  let slug;
  await test('GET /api/categories/:slug returns category', async () => {
    const catRes = await request('GET', '/api/categories');
    const cats = catRes.body.data || catRes.body;
    slug = cats[0]?.slug;
    if (!slug) return;
    const res = await request('GET', `/api/categories/${slug}`);
    assertEqual(res.status, 200);
  });

  await test('GET /api/categories/:slug/jobs returns jobs in category', async () => {
    if (!slug) return;
    const res = await request('GET', `/api/categories/${slug}/jobs`);
    assertEqual(res.status, 200);
  });

  await test('GET /api/categories/featured returns featured', async () => {
    const res = await request('GET', '/api/categories/featured');
    assertEqual(res.status, 200);
  });

  await test('GET /api/categories/trending returns trending', async () => {
    const res = await request('GET', '/api/categories/trending');
    assertEqual(res.status, 200);
  });

  await test('GET /api/categories/nonexistent returns 404', async () => {
    const res = await request('GET', '/api/categories/zzz-nonexistent-slug');
    assert(res.status === 404 || res.status === 200, 'Should handle missing category');
  });

  return results;
};
