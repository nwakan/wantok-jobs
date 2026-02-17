#!/usr/bin/env node
const http = require('http');
const { spawn } = require('child_process');
const PORT = 3098;
const BASE = `http://localhost:${PORT}`;
let PASS = 0, FAIL = 0;

function req(path, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(BASE + path);
    const o = { hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: opts.method || 'GET', headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } };
    const r = http.request(o, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } }); });
    r.on('error', reject);
    if (opts.body) r.write(JSON.stringify(opts.body));
    r.end();
  });
}

const ok = (n) => { console.log(`  ✅ ${n}`); PASS++; };
const fail = (n, d) => { console.log(`  ❌ ${n}${d ? ': ' + String(d?.error || JSON.stringify(d)).substring(0, 80) : ''}`); FAIL++; };

async function run() {
  console.log('🧪 WANTOKJOBS E2E TEST SUITE\n');

  // 1. PUBLIC
  console.log('=== 1. PUBLIC ===');
  let r = await req('/api/plans');
  r.plans?.length >= 5 ? ok(`Plans (${r.plans.length})`) : fail('Plans', r);
  r = await req('/api/categories');
  r.categories?.length >= 20 ? ok(`Categories (${r.categories.length})`) : fail('Categories', r);
  r = await req('/api/jobs?limit=2');
  r.data?.length > 0 ? ok(`Jobs (${r.data.length})`) : fail('Jobs', r);
  const firstJobId = r.data?.[0]?.id || 62;
  r = await req(`/api/jobs/${firstJobId}`);
  r.title ? ok(`Job detail`) : fail('Job detail', r);
  r = await req('/api/companies');
  r.data?.length > 0 ? ok(`Companies (${r.data.length})`) : fail('Companies', r);

  // 2. AUTH
  console.log('\n=== 2. AUTH ===');
  r = await req('/api/auth/login', { method: 'POST', body: { email: 'admin@wantokjobs.com', password: 'admin123' } });
  const at = r.token; at ? ok('Admin login') : fail('Admin login', r);

  const ts = Date.now();
  r = await req('/api/auth/register', { method: 'POST', body: { email: `js${ts}@t.com`, password: 'pass123', role: 'jobseeker', name: 'TestJS' } });
  let jt = r.token; jt ? ok('Register jobseeker') : fail('Reg JS', r);

  r = await req('/api/auth/register', { method: 'POST', body: { email: `e${ts}@t.com`, password: 'pass123', role: 'employer', name: 'TestEmp' } });
  let et = r.token; et ? ok('Register employer') : fail('Reg Emp', r);

  r = await req('/api/auth/me', { headers: { Authorization: `Bearer ${jt}` } });
  r.role === 'jobseeker' ? ok('GET /me') : fail('/me', r);

  r = await req('/api/auth/forgot-password', { method: 'POST', body: { email: `js${ts}@t.com` } });
  r.message ? ok('Forgot password') : fail('Forgot pw', r);

  r = await req('/api/auth/change-password', { method: 'POST', headers: { Authorization: `Bearer ${jt}` }, body: { currentPassword: 'pass123', newPassword: 'new123' } });
  r.message ? ok('Change password') : fail('Change pw', r);

  r = await req('/api/auth/login', { method: 'POST', body: { email: `js${ts}@t.com`, password: 'new123' } });
  jt = r.token; jt ? ok('Login new password') : fail('Login new pw', r);

  // 3. EMPLOYER
  console.log('\n=== 3. EMPLOYER ===');
  r = await req('/api/jobs', { method: 'POST', headers: { Authorization: `Bearer ${et}` }, body: { title: 'E2E Test Job', description: 'This is a comprehensive test job posting for end-to-end testing purposes.', location: 'Port Moresby', job_type: 'full-time', salary_min: 5000 } });
  const jobId = r.id; jobId ? ok(`Post job (#${jobId})`) : fail('Post job', r);

  r = await req('/api/jobs/my', { headers: { Authorization: `Bearer ${et}` } });
  (Array.isArray(r) && r.length > 0) || r.data?.length > 0 ? ok('My jobs') : fail('My jobs', r);

  r = await req('/api/profile', { headers: { Authorization: `Bearer ${et}` } });
  (r.user || r.profile || r.user_id) ? ok('Employer profile') : fail('Emp profile', r);

  r = await req(`/api/screening/jobs/${jobId}/questions`, { method: 'POST', headers: { Authorization: `Bearer ${et}` }, body: { question: '3+ years exp?', question_type: 'yes_no' } });
  !r.error ? ok('Add screening Q') : fail('Screening Q', r);

  r = await req(`/api/screening/jobs/${jobId}/questions`);
  (r.questions?.length > 0 || (Array.isArray(r) && r.length > 0)) ? ok(`Get screening Q`) : fail('Get screening', r);

  // 4. JOBSEEKER
  console.log('\n=== 4. JOBSEEKER ===');
  r = await req('/api/applications', { method: 'POST', headers: { Authorization: `Bearer ${jt}` }, body: { job_id: jobId, cover_letter: 'Very interested!' } });
  const appId = r.id; appId ? ok(`Apply (#${appId})`) : fail('Apply', r);

  r = await req('/api/applications/my', { headers: { Authorization: `Bearer ${jt}` } });
  Array.isArray(r) && r.length > 0 ? ok('My applications') : fail('My apps', r);

  r = await req(`/api/saved-jobs/${jobId}`, { method: 'POST', headers: { Authorization: `Bearer ${jt}` } });
  !r.error ? ok('Save job') : fail('Save job', r);

  r = await req('/api/saved-jobs', { headers: { Authorization: `Bearer ${jt}` } });
  Array.isArray(r) && r.length > 0 ? ok('Saved jobs') : fail('Saved jobs', r);

  r = await req('/api/job-alerts', { method: 'POST', headers: { Authorization: `Bearer ${jt}` }, body: { keywords: 'accountant', location: 'Lae', frequency: 'daily' } });
  !r.error ? ok('Create alert') : fail('Create alert', r);

  r = await req('/api/job-alerts', { headers: { Authorization: `Bearer ${jt}` } });
  (Array.isArray(r) && r.length > 0) || r.alerts?.length > 0 ? ok('Get alerts') : fail('Get alerts', r);

  // 5. PIPELINE
  console.log('\n=== 5. APPLICATION PIPELINE ===');
  r = await req(`/api/applications/job/${jobId}`, { headers: { Authorization: `Bearer ${et}` } });
  Array.isArray(r) && r.length > 0 ? ok('View applicants') : fail('View applicants', r);

  for (const s of ['screening', 'shortlisted', 'interview', 'offered']) {
    r = await req(`/api/applications/${appId}/status`, { method: 'PUT', headers: { Authorization: `Bearer ${et}` }, body: { status: s } });
    r.status === s ? ok(`→ ${s}`) : fail(`→ ${s}`, r);
  }

  // 6. NOTIFICATIONS
  console.log('\n=== 6. NOTIFICATIONS ===');
  r = await req('/api/notifications', { headers: { Authorization: `Bearer ${jt}` } });
  Array.isArray(r) && r.length > 0 ? ok(`JS notifs (${r.length})`) : fail('JS notifs', r);
  r = await req('/api/notifications', { headers: { Authorization: `Bearer ${et}` } });
  Array.isArray(r) && r.length > 0 ? ok(`Emp notifs (${r.length})`) : fail('Emp notifs', r);
  r = await req('/api/notifications', { headers: { Authorization: `Bearer ${at}` } });
  Array.isArray(r) && r.length > 0 ? ok(`Admin notifs (${r.length})`) : fail('Admin notifs', r);

  // 7. CONTACT & MESSAGES
  console.log('\n=== 7. CONTACT & MESSAGES ===');
  r = await req('/api/contact', { method: 'POST', body: { name: 'Test User', email: 'x@x.com', subject: 'Hello There', message: 'This is a test contact form submission for E2E testing.' } });
  !r.error ? ok('Contact form') : fail('Contact', r);

  // Send message to the newly registered jobseeker
  const meData = await req('/api/auth/me', { headers: { Authorization: `Bearer ${jt}` } });
  r = await req('/api/messages', { method: 'POST', headers: { Authorization: `Bearer ${at}` }, body: { to_user_id: meData.id, subject: 'Hi', body: 'Welcome!' } });
  !r.error ? ok('Send message') : fail('Send msg', r);

  // 8. ADMIN
  console.log('\n=== 8. ADMIN ===');
  r = await req('/api/admin/stats', { headers: { Authorization: `Bearer ${at}` } });
  r.totalUsers > 0 ? ok(`Stats (${r.totalUsers} users)`) : fail('Stats', r);

  r = await req('/api/admin/users?limit=3', { headers: { Authorization: `Bearer ${at}` } });
  (r.data || r).length > 0 ? ok('Users list') : fail('Users', r);

  r = await req('/api/analytics/admin/overview', { headers: { Authorization: `Bearer ${at}` } });
  !r.error ? ok('Analytics') : fail('Analytics', r);

  // 9. ORDERS
  console.log('\n=== 9. ORDERS ===');
  // Get a purchasable package
  r = await req('/api/credits/packages', { headers: { Authorization: `Bearer ${et}` } });
  const pkgId = r.packages?.find(p => p.price > 0)?.id;
  pkgId ? ok('Get packages') : fail('Get packages', r);

  r = await req('/api/orders', { method: 'POST', headers: { Authorization: `Bearer ${et}` }, body: { package_id: pkgId, payment_method: 'bank_transfer' } });
  (r.id || r.order?.id) ? ok(`Create order`) : fail('Create order', r);

  r = await req('/api/orders/my', { headers: { Authorization: `Bearer ${et}` } });
  (Array.isArray(r) && r.length > 0) || r.orders?.length > 0 ? ok('My orders') : fail('My orders', r);

  // Test credit status
  r = await req('/api/credits/status', { headers: { Authorization: `Bearer ${et}` } });
  r.credits ? ok('Credit status') : fail('Credit status', r);

  // Test trial activation
  r = await req('/api/credits/trial/activate', { method: 'POST', headers: { Authorization: `Bearer ${et}` } });
  r.success || r.error?.includes('already') ? ok('Trial activation') : fail('Trial activation', r);

// 10. FILE UPLOADS
  console.log('\n=== 10. FILE UPLOADS ===');
  // Test avatar upload with a tiny PNG
  const FormData = (await import('node:buffer')).Buffer;
  // 1x1 red PNG
  const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
  const boundary = '----TestBoundary' + Date.now();
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="avatar"; filename="test.png"\r\nContent-Type: image/png\r\n\r\n`),
    tinyPng,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const avatarRes = await fetch(`http://localhost:${PORT}/api/uploads/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${et}`, 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  }).then(r => r.json());
  avatarRes.url ? ok('Avatar upload') : fail('Avatar upload', avatarRes);

  // Verify file is served
  if (avatarRes.url) {
    const fileRes = await fetch(`http://localhost:${PORT}${avatarRes.url}`);
    fileRes.ok ? ok('Serve uploaded file') : fail('Serve uploaded file', fileRes.status);
  }

  // DONE
  console.log(`\n${'='.repeat(44)}`);
  console.log(`📊 RESULTS: ${PASS} passed, ${FAIL} failed (${PASS + FAIL} total)`);
  console.log('='.repeat(44));
}

// Start server then run tests
const srv = spawn('node', ['server/index.js'], { cwd: __dirname, env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'] });
srv.stdout.on('data', d => { if (d.toString().includes('running on port')) setTimeout(() => run().then(() => { srv.kill(); process.exit(FAIL); }), 500); });
srv.stderr.on('data', d => process.stderr.write(d));
setTimeout(() => { console.error('Server start timeout'); srv.kill(); process.exit(1); }, 10000);
