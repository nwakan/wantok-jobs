const { request, registerUser, createTestRunner } = require('./helpers');

module.exports = async function performanceTests() {
  const { results, test, assert, assertEqual } = createTestRunner('Performance');
  console.log('\n⚡ Performance Tests');

  async function timed(method, path, opts) {
    const start = Date.now();
    const res = await request(method, path, opts);
    const ms = Date.now() - start;
    return { ...res, ms };
  }

  await test('Health endpoint < 200ms', async () => {
    const { ms } = await timed('GET', '/health');
    assert(ms < 200, `Took ${ms}ms`);
  });

  await test('Job listing < 500ms', async () => {
    const { ms, status } = await timed('GET', '/api/jobs?page=1&limit=10');
    assertEqual(status, 200);
    assert(ms < 500, `Took ${ms}ms`);
  });

  await test('Categories endpoint < 300ms', async () => {
    const { ms, status } = await timed('GET', '/api/categories');
    assertEqual(status, 200);
    assert(ms < 300, `Took ${ms}ms`);
  });

  await test('Job search < 500ms', async () => {
    const { ms, status } = await timed('GET', '/api/jobs?keyword=developer&location=Port%20Moresby');
    assertEqual(status, 200);
    assert(ms < 500, `Took ${ms}ms`);
  });

  await test('Public stats < 500ms', async () => {
    const { ms, status } = await timed('GET', '/api/stats');
    assertEqual(status, 200);
    assert(ms < 500, `Took ${ms}ms`);
  });

  await test('Registration < 1000ms', async () => {
    const start = Date.now();
    await registerUser('jobseeker');
    const ms = Date.now() - start;
    assert(ms < 1000, `Took ${ms}ms`);
  });

  await test('Login < 500ms', async () => {
    const { email, password } = await registerUser('jobseeker');
    const { ms } = await timed('POST', '/api/auth/login', { body: { email, password } });
    assert(ms < 500, `Took ${ms}ms`);
  });

  await test('Chat response < 2000ms', async () => {
    const { ms, status } = await timed('POST', '/api/chat', {
      body: { message: 'Find me a job', session_id: 'perf-1' }
    });
    assertEqual(status, 200);
    assert(ms < 2000, `Took ${ms}ms`);
  });

  return results;
};
