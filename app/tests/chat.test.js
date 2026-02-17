const { request, registerUser, createTestRunner } = require('./helpers');

module.exports = async function chatTests() {
  const { results, test, assert, assertEqual } = createTestRunner('Chat');
  console.log('\n💬 Chat/Jean AI Tests');

  await test('GET /api/chat/settings returns settings', async () => {
    const res = await request('GET', '/api/chat/settings');
    assertEqual(res.status, 200);
    assert(res.body, 'Should have body');
  });

  await test('POST /api/chat with greeting', async () => {
    const res = await request('POST', '/api/chat', {
      body: { message: 'Hello', session_id: 'test-1' }
    });
    assertEqual(res.status, 200);
    assert(res.body.reply || res.body.message || res.body.response, 'Should have reply');
  });

  await test('POST /api/chat with job search intent', async () => {
    const res = await request('POST', '/api/chat', {
      body: { message: 'I am looking for accounting jobs in Port Moresby', session_id: 'test-2' }
    });
    assertEqual(res.status, 200);
  });

  await test('POST /api/chat with help intent', async () => {
    const res = await request('POST', '/api/chat', {
      body: { message: 'How do I apply for a job?', session_id: 'test-3' }
    });
    assertEqual(res.status, 200);
  });

  await test('POST /api/chat with empty message', async () => {
    const res = await request('POST', '/api/chat', {
      body: { message: '', session_id: 'test-4' }
    });
    assert(res.status === 200 || res.status === 400, `Got ${res.status}`);
  });

  await test('POST /api/chat with authenticated user', async () => {
    const user = await registerUser('jobseeker');
    const res = await request('POST', '/api/chat', {
      token: user.token,
      body: { message: 'What jobs match my profile?', session_id: 'test-5' }
    });
    assertEqual(res.status, 200);
  });

  await test('GET /api/chat/history returns history', async () => {
    const res = await request('GET', '/api/chat/history?session_id=test-1');
    assertEqual(res.status, 200);
  });

  await test('POST /api/chat XSS in message is handled', async () => {
    const res = await request('POST', '/api/chat', {
      body: { message: '<script>alert(1)</script>', session_id: 'test-xss' }
    });
    assert(res.status === 200 || res.status === 400, 'Should handle XSS');
    if (res.status === 200) {
      const reply = JSON.stringify(res.body);
      assert(!reply.includes('<script>'), 'Should not reflect XSS');
    }
  });

  await test('Chat admin settings require admin', async () => {
    const user = await registerUser('jobseeker');
    const res = await request('GET', '/api/chat/admin/settings', { token: user.token });
    assertEqual(res.status, 403);
  });

  await test('Chat admin stats require admin', async () => {
    const user = await registerUser('employer');
    const res = await request('GET', '/api/chat/admin/stats', { token: user.token });
    assertEqual(res.status, 403);
  });

  return results;
};
