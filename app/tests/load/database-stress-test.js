import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const dbQueryDuration = new Trend('db_query_duration');
const slowQueries = new Counter('slow_queries');

// Test configuration - Database stress with heavy queries
export const options = {
  scenarios: {
    read_heavy: {
      executor: 'ramping-vus',
      exec: 'readHeavyTest',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },   // Ramp up to 20 concurrent reads
        { duration: '3m', target: 50 },   // Increase to 50 concurrent reads
        { duration: '2m', target: 100 },  // Spike to 100 concurrent reads
        { duration: '2m', target: 50 },   // Back to 50
        { duration: '1m', target: 0 },    // Ramp down
      ],
      gracefulRampDown: '30s',
    },
    write_operations: {
      executor: 'constant-vus',
      exec: 'writeOperationsTest',
      vus: 10,
      duration: '9m',
      startTime: '0s',
    },
    complex_queries: {
      executor: 'ramping-vus',
      exec: 'complexQueriesTest',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 },   // Ramp up complex queries
        { duration: '4m', target: 20 },   // Hold 20 concurrent complex queries
        { duration: '2m', target: 10 },   // Ramp down
        { duration: '1m', target: 0 },
      ],
      startTime: '1m',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<1000', 'p(99)<2000'],
    'http_req_failed': ['rate<0.05'],
    'errors': ['rate<0.1'],
    'db_query_duration': ['p(95)<800', 'p(99)<1500'],
    'slow_queries': ['count<100'], // Less than 100 queries taking >1s
  },
};

const BASE_URL = 'http://localhost:3001';

// Read-heavy operations (job listings, searches, filters)
export function readHeavyTest() {
  const startTime = Date.now();

  // Heavy pagination query
  let res = http.get(`${BASE_URL}/api/jobs?page=${Math.floor(Math.random() * 20) + 1}&limit=50`);
  const duration = Date.now() - startTime;
  dbQueryDuration.add(duration);
  if (duration > 1000) slowQueries.add(1);
  
  check(res, {
    'jobs pagination loaded': (r) => r.status === 200,
    'pagination response time < 800ms': (r) => r.timings.duration < 800,
  }) || errorRate.add(1);
  sleep(0.5);

  // Complex search with multiple filters
  const categories = ['1', '2', '3', '4', '5'];
  const locations = ['Port Moresby', 'Lae', 'Madang'];
  const jobTypes = ['full-time', 'part-time', 'contract'];
  
  res = http.get(
    `${BASE_URL}/api/jobs/search?` +
    `q=developer&` +
    `category=${categories[Math.floor(Math.random() * categories.length)]}&` +
    `location=${locations[Math.floor(Math.random() * locations.length)]}&` +
    `job_type=${jobTypes[Math.floor(Math.random() * jobTypes.length)]}&` +
    `page=1&limit=20`
  );
  
  check(res, {
    'complex search successful': (r) => r.status === 200,
    'complex search < 1s': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);
  sleep(0.5);

  // Job detail with related data (employer, similar jobs)
  const jobId = Math.floor(Math.random() * 1335) + 1;
  res = http.get(`${BASE_URL}/api/jobs/${jobId}`);
  
  check(res, {
    'job detail loaded': (r) => r.status === 200 || r.status === 404,
    'job detail response time < 400ms': (r) => r.timings.duration < 400,
  }) || errorRate.add(1);
  sleep(0.3);

  // Employer profile with all jobs
  const employerId = Math.floor(Math.random() * 100) + 1;
  res = http.get(`${BASE_URL}/api/employers/${employerId}`);
  
  check(res, {
    'employer profile loaded': (r) => r.status === 200 || r.status === 404,
    'employer query < 600ms': (r) => r.timings.duration < 600,
  }) || errorRate.add(1);
  sleep(0.5);
}

// Write operations (simulating application submissions)
export function writeOperationsTest() {
  // Note: These are GET requests simulating write load
  // In production, would be POST requests with proper auth
  
  // Simulate application submission load
  const jobId = Math.floor(Math.random() * 1335) + 1;
  const res = http.get(`${BASE_URL}/api/jobs/${jobId}`);
  
  check(res, {
    'write operation successful': (r) => r.status === 200 || r.status === 404,
    'write operation < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);
  
  sleep(Math.random() * 2 + 1); // 1-3 seconds between writes
}

// Complex queries with joins and aggregations
export function complexQueriesTest() {
  const startTime = Date.now();

  // Stats query (aggregations across multiple tables)
  let res = http.get(`${BASE_URL}/api/stats`);
  const duration = Date.now() - startTime;
  dbQueryDuration.add(duration);
  if (duration > 1000) slowQueries.add(1);
  
  check(res, {
    'stats query successful': (r) => r.status === 200,
    'stats has job count': (r) => r.json('totalJobs') !== undefined,
    'stats query < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);
  sleep(1);

  // Featured jobs (complex sorting and filtering)
  res = http.get(`${BASE_URL}/api/jobs/featured`);
  
  check(res, {
    'featured jobs loaded': (r) => r.status === 200,
    'featured jobs query < 800ms': (r) => r.timings.duration < 800,
  }) || errorRate.add(1);
  sleep(1);

  // Employer list with job counts (aggregation)
  res = http.get(`${BASE_URL}/api/employers?page=1&limit=50`);
  
  check(res, {
    'employer list loaded': (r) => r.status === 200,
    'employer aggregation < 1s': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);
  sleep(1);

  // Search with advanced filters (multiple joins)
  res = http.get(
    `${BASE_URL}/api/jobs/search?` +
    `q=engineer&` +
    `location=Port+Moresby&` +
    `salary_min=50000&` +
    `salary_max=150000&` +
    `experience_level=mid&` +
    `page=1&limit=20`
  );
  
  check(res, {
    'advanced search successful': (r) => r.status === 200,
    'advanced search < 1.5s': (r) => r.timings.duration < 1500,
  }) || errorRate.add(1);
  sleep(2);

  // Categories with job counts
  res = http.get(`${BASE_URL}/api/categories`);
  
  check(res, {
    'categories with counts loaded': (r) => r.status === 200,
    'categories query < 300ms': (r) => r.timings.duration < 300,
  }) || errorRate.add(1);
  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': JSON.stringify(data, null, 2),
    '/opt/wantokjobs/app/tests/load/database-stress-results.json': JSON.stringify(data),
  };
}
