import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users over 2 minutes
    { duration: '3m', target: 50 },   // Ramp up to 50 users over 3 minutes
    { duration: '5m', target: 100 },  // Ramp up to 100 users over 5 minutes
    { duration: '5m', target: 100 },  // Hold 100 users for 5 minutes (peak load)
    { duration: '2m', target: 50 },   // Ramp down to 50 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95% requests < 500ms, 99% < 1s
    'http_req_failed': ['rate<0.05'],   // Error rate < 5%
    'errors': ['rate<0.1'],              // Custom error rate < 10%
  },
};

const BASE_URL = 'http://localhost:3001';

export default function () {
  // Test 1: Homepage / Health Check
  let res = http.get(`${BASE_URL}/api/health`);
  check(res, {
    'health check status 200': (r) => r.status === 200,
    'health check has status': (r) => r.json('status') === 'ok',
  }) || errorRate.add(1);
  sleep(1);

  // Test 2: Job Listings (Most common query)
  res = http.get(`${BASE_URL}/api/jobs?page=1&limit=20`);
  check(res, {
    'job listing status 200': (r) => r.status === 200,
    'job listing returns array': (r) => Array.isArray(r.json('jobs')),
    'job listing response time < 300ms': (r) => r.timings.duration < 300,
  }) || errorRate.add(1);
  sleep(2);

  // Test 3: Job Search with Filters
  res = http.get(`${BASE_URL}/api/jobs/search?q=developer&location=Port+Moresby&page=1&limit=20`);
  check(res, {
    'search status 200': (r) => r.status === 200,
    'search returns results': (r) => r.json('jobs') !== undefined,
    'search response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);
  sleep(2);

  // Test 4: Job Details (High traffic endpoint)
  const jobId = Math.floor(Math.random() * 1335) + 1; // Random job ID (1-1335)
  res = http.get(`${BASE_URL}/api/jobs/${jobId}`);
  check(res, {
    'job detail status 200 or 404': (r) => r.status === 200 || r.status === 404,
    'job detail response time < 200ms': (r) => r.timings.duration < 200,
  }) || errorRate.add(1);
  sleep(1);

  // Test 5: Categories Endpoint
  res = http.get(`${BASE_URL}/api/categories`);
  check(res, {
    'categories status 200': (r) => r.status === 200,
    'categories returns array': (r) => Array.isArray(r.json()),
    'categories response time < 100ms': (r) => r.timings.duration < 100,
  }) || errorRate.add(1);
  sleep(1);

  // Test 6: Featured Jobs
  res = http.get(`${BASE_URL}/api/jobs/featured`);
  check(res, {
    'featured jobs status 200': (r) => r.status === 200,
    'featured jobs response time < 300ms': (r) => r.timings.duration < 300,
  }) || errorRate.add(1);
  sleep(2);

  // Test 7: Employer Listings
  res = http.get(`${BASE_URL}/api/employers?page=1&limit=20`);
  check(res, {
    'employers status 200': (r) => r.status === 200,
    'employers returns data': (r) => r.json() !== undefined,
    'employers response time < 400ms': (r) => r.timings.duration < 400,
  }) || errorRate.add(1);
  sleep(2);

  // Test 8: Stats Endpoint (Analytics)
  res = http.get(`${BASE_URL}/api/stats`);
  check(res, {
    'stats status 200': (r) => r.status === 200,
    'stats has job count': (r) => r.json('totalJobs') !== undefined,
    'stats response time < 200ms': (r) => r.timings.duration < 200,
  }) || errorRate.add(1);
  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': JSON.stringify(data, null, 2),
    '/opt/wantokjobs/app/tests/load/api-load-test-results.json': JSON.stringify(data),
  };
}
