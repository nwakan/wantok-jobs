/**
 * Test helpers for WantokJobs API tests
 * Provides: test DB setup, HTTP helpers, auth helpers, cleanup
 */
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

let serverProcess = null;
let BASE_URL = '';
let TEST_DB_PATH = '';

/**
 * Copy production DB and start server on random port
 */
async function setupTestServer() {
  const srcDb = path.join(__dirname, '..', 'server', 'data', 'wantokjobs.db');
  // Create a temp directory so server finds "wantokjobs.db" inside it
  const testDataDir = path.join(__dirname, '..', 'server', 'data', `testdir_${Date.now()}`);
  fs.mkdirSync(testDataDir, { recursive: true });
  TEST_DB_PATH = path.join(testDataDir, 'wantokjobs.db');

  // Copy DB (skip WAL/SHM for clean test state)
  fs.copyFileSync(srcDb, TEST_DB_PATH);

  // Find a free port
  const port = 10000 + Math.floor(Math.random() * 50000);
  BASE_URL = `http://127.0.0.1:${port}`;

  // Start server as child process
  const { spawn } = require('child_process');
  serverProcess = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: testDataDir,
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret-key-for-testing-only',
      // Override DB filename
      DATABASE_PATH: TEST_DB_PATH,
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // Wait for server to be ready
  let ready = false;
  const startTime = Date.now();
  while (!ready && Date.now() - startTime < 15000) {
    try {
      await request('GET', '/health');
      ready = true;
    } catch {
      await sleep(200);
    }
  }

  if (!ready) {
    // Collect stderr for debugging
    let stderr = '';
    serverProcess.stderr.on('data', d => stderr += d.toString());
    await sleep(500);
    throw new Error(`Server failed to start on port ${port}. stderr: ${stderr}`);
  }

  return { port, BASE_URL };
}

/**
 * Cleanup: kill server, remove test DB
 */
async function teardown() {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    await sleep(500);
    serverProcess.kill('SIGKILL');
    serverProcess = null;
  }
  // Clean up test DB directory
  if (TEST_DB_PATH) {
    const dir = path.dirname(TEST_DB_PATH);
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Make an HTTP request. Returns { status, headers, body (parsed JSON or string) }
 */
function request(method, urlPath, { body, token, headers: extraHeaders } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const headers = { ...extraHeaders };

    if (body && typeof body === 'object') {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const payload = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers,
      timeout: 10000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = data;
        try { parsed = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

/**
 * Get a CAPTCHA and return { captcha_id, captcha_answer }
 * Parses the math question to get the answer
 */
async function solveCaptcha(debug = false) {
  const res = await request('GET', '/api/auth/captcha');
  if (res.status !== 200) throw new Error(`Failed to get captcha: ${res.status} ${JSON.stringify(res.body)}`);
  const { id, question } = res.body;
  if (!id || !question) throw new Error(`Invalid captcha response: ${JSON.stringify(res.body)}`);
  // Parse "What is X + Y?" or "What is X - Y?"
  const match = question.match(/(\d+)\s*([+\-])\s*(\d+)/);
  if (!match) throw new Error(`Cannot parse captcha: ${question}`);
  const [, a, op, b] = match;
  const answer = op === '+' ? parseInt(a) + parseInt(b) : parseInt(a) - parseInt(b);
  return { captcha_id: id, captcha_answer: String(answer) };
}

/**
 * Register a new user and return { token, user }
 */
async function registerUser(role = 'jobseeker', overrides = {}) {
  const rand = crypto.randomBytes(4).toString('hex');
  const captcha = await solveCaptcha();
  const data = {
    email: `test_${rand}@example.com`,
    password: 'TestPass123!',
    name: `Test User ${rand}`,
    role,
    ...captcha,
    ...overrides,
  };
  const res = await request('POST', '/api/auth/register', { body: data });
  if (res.status !== 201) {
    throw new Error(`Register failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.token, user: res.body.user, password: data.password, email: data.email };
}

/**
 * Login and return { token, user }
 */
async function loginUser(email, password) {
  const res = await request('POST', '/api/auth/login', { body: { email, password } });
  if (res.status !== 200) throw new Error(`Login failed: ${JSON.stringify(res.body)}`);
  return { token: res.body.token, user: res.body.user };
}

/**
 * Simple test runner helper
 */
function createTestRunner(suiteName) {
  const results = { passed: 0, failed: 0, errors: [] };

  async function test(name, fn) {
    try {
      await fn();
      results.passed++;
      process.stdout.write(`  ✅ ${name}\n`);
    } catch (err) {
      results.failed++;
      results.errors.push({ test: name, error: err.message });
      process.stdout.write(`  ❌ ${name}: ${err.message}\n`);
    }
  }

  function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
  }

  function assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }

  function assertIncludes(str, substr, message) {
    if (typeof str !== 'string' || !str.includes(substr)) {
      throw new Error(message || `Expected "${str}" to include "${substr}"`);
    }
  }

  function assertNotIncludes(str, substr, message) {
    if (typeof str === 'string' && str.includes(substr)) {
      throw new Error(message || `Expected "${str}" NOT to include "${substr}"`);
    }
  }

  return { results, test, assert, assertEqual, assertIncludes, assertNotIncludes };
}

module.exports = {
  setupTestServer,
  teardown,
  request,
  solveCaptcha,
  registerUser,
  loginUser,
  createTestRunner,
  sleep,
  get BASE_URL() { return BASE_URL; },
};
