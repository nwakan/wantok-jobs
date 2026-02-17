const { request, registerUser, createTestRunner } = require('./helpers');

module.exports = async function messagingTests() {
  const { results, test, assert, assertEqual } = createTestRunner('Messaging');
  console.log('\n💬 Messaging & Conversations Tests');

  const user1 = await registerUser('employer');
  const user2 = await registerUser('jobseeker');
  let conversationId;

  // --- Conversations ---
  await test('Create conversation', async () => {
    const res = await request('POST', '/api/conversations', {
      token: user1.token,
      body: { recipient_id: user2.user.id, message: 'Hello from employer' }
    });
    assert(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
    conversationId = res.body.id || res.body.conversation_id || res.body.data?.id;
  });

  await test('List conversations', async () => {
    const res = await request('GET', '/api/conversations', { token: user1.token });
    assertEqual(res.status, 200);
  });

  await test('List conversations without auth returns 401', async () => {
    const res = await request('GET', '/api/conversations');
    assertEqual(res.status, 401);
  });

  await test('Get unread count', async () => {
    const res = await request('GET', '/api/conversations/unread-count', { token: user2.token });
    assertEqual(res.status, 200);
  });

  await test('Get conversation detail', async () => {
    if (!conversationId) return;
    const res = await request('GET', `/api/conversations/${conversationId}`, { token: user1.token });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await test('Reply to conversation', async () => {
    if (!conversationId) return;
    const res = await request('POST', `/api/conversations/${conversationId}`, {
      token: user2.token,
      body: { message: 'Reply from jobseeker' }
    });
    assert(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
  });

  // --- Messages (legacy) ---
  await test('Send message', async () => {
    const res = await request('POST', '/api/messages', {
      token: user1.token,
      body: { recipient_id: user2.user.id, subject: 'Test', content: 'Hello' }
    });
    assert(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
  });

  await test('Send message without auth returns 401', async () => {
    const res = await request('POST', '/api/messages', {
      body: { recipient_id: user2.user.id, subject: 'Test', content: 'Hello' }
    });
    assertEqual(res.status, 401);
  });

  await test('List messages', async () => {
    const res = await request('GET', '/api/messages', { token: user1.token });
    assertEqual(res.status, 200);
  });

  await test('Get non-existent message returns 404', async () => {
    const res = await request('GET', '/api/messages/999999', { token: user1.token });
    assertEqual(res.status, 404);
  });

  return results;
};
