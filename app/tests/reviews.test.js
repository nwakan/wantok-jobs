const { request, registerUser, createTestRunner } = require('./helpers');

module.exports = async function reviewsTests() {
  const { results, test, assert, assertEqual } = createTestRunner('Reviews');
  console.log('\n⭐ Reviews Tests');

  await test('GET /api/reviews returns list', async () => {
    const res = await request('GET', '/api/reviews');
    assertEqual(res.status, 200);
  });

  await test('GET /api/reviews/99999 returns 404', async () => {
    const res = await request('GET', '/api/reviews/99999');
    assertEqual(res.status, 404);
  });

  await test('POST /api/reviews without auth returns 401', async () => {
    const res = await request('POST', '/api/reviews', {
      body: { company_id: 1, rating: 5, title: 'Great', review: 'Great company' }
    });
    assertEqual(res.status, 401);
  });

  return results;
};
