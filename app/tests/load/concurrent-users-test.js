import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const journeyDuration = new Trend('journey_duration');

// Test configuration - Simulate realistic user behavior
export const options = {
  scenarios: {
    job_seekers: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 },  // Ramp up to 20 job seekers
        { duration: '5m', target: 50 },  // Increase to 50 job seekers
        { duration: '3m', target: 50 },  // Hold 50 job seekers
        { duration: '2m', target: 0 },   // Ramp down
      ],
      gracefulRampDown: '30s',
    },
    employers: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '3m', target: 10 },  // Ramp up to 10 employers
        { duration: '5m', target: 20 },  // Increase to 20 employers
        { duration: '2m', target: 20 },  // Hold 20 employers
        { duration: '2m', target: 0 },   // Ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<800', 'p(99)<1500'],
    'http_req_failed': ['rate<0.05'],
    'errors': ['rate<0.1'],
    'journey_duration': ['p(95)<60000'], // 95% of user journeys < 60 seconds
  },
};

const BASE_URL = 'http://localhost:3001';

// Job Seeker Journey (Browse → Search → View → Apply)
export default function () {
  const journeyStart = Date.now();
  const scenario = __ENV.SCENARIO || 'job_seekers';

  if (scenario === 'job_seekers' || !scenario) {
    jobSeekerJourney();
  } else if (scenario === 'employers') {
    employerJourney();
  }

  journeyDuration.add(Date.now() - journeyStart);
}

function jobSeekerJourney() {
  // Step 1: Visit Homepage
  group('Homepage Visit', () => {
    const res = http.get(`${BASE_URL}/`);
    check(res, {
      'homepage loaded': (r) => r.status === 200,
      'homepage response time < 1s': (r) => r.timings.duration < 1000,
    }) || errorRate.add(1);
    sleep(Math.random() * 3 + 2); // Think time: 2-5 seconds
  });

  // Step 2: Browse Job Listings
  group('Browse Jobs', () => {
    const res = http.get(`${BASE_URL}/api/jobs?page=1&limit=20`);
    check(res, {
      'jobs loaded': (r) => r.status === 200,
      'jobs array returned': (r) => Array.isArray(r.json('jobs')),
      'jobs response time < 500ms': (r) => r.timings.duration < 500,
    }) || errorRate.add(1);
    sleep(Math.random() * 4 + 3); // Think time: 3-7 seconds (reading job titles)
  });

  // Step 3: Search for Specific Job
  group('Search Jobs', () => {
    const searchTerms = ['developer', 'engineer', 'manager', 'sales', 'accountant', 'nurse'];
    const locations = ['Port Moresby', 'Lae', 'Madang', 'Mt Hagen', 'Kokopo'];
    const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];
    
    const res = http.get(`${BASE_URL}/api/jobs/search?q=${term}&location=${location}&page=1&limit=20`);
    check(res, {
      'search successful': (r) => r.status === 200,
      'search results returned': (r) => r.json('jobs') !== undefined,
      'search response time < 600ms': (r) => r.timings.duration < 600,
    }) || errorRate.add(1);
    sleep(Math.random() * 5 + 3); // Think time: 3-8 seconds (reviewing search results)
  });

  // Step 4: View Job Details (2-3 jobs)
  group('View Job Details', () => {
    const numJobs = Math.floor(Math.random() * 2) + 2; // View 2-3 jobs
    for (let i = 0; i < numJobs; i++) {
      const jobId = Math.floor(Math.random() * 1335) + 1;
      const res = http.get(`${BASE_URL}/api/jobs/${jobId}`);
      check(res, {
        'job detail loaded': (r) => r.status === 200 || r.status === 404,
        'job detail response time < 300ms': (r) => r.timings.duration < 300,
      }) || errorRate.add(1);
      sleep(Math.random() * 8 + 5); // Think time: 5-13 seconds (reading job description)
    }
  });

  // Step 5: View Categories (Optional)
  if (Math.random() > 0.5) { // 50% of users check categories
    group('View Categories', () => {
      const res = http.get(`${BASE_URL}/api/categories`);
      check(res, {
        'categories loaded': (r) => r.status === 200,
        'categories response time < 200ms': (r) => r.timings.duration < 200,
      }) || errorRate.add(1);
      sleep(Math.random() * 2 + 1); // Think time: 1-3 seconds
    });
  }

  // Step 6: View Featured Jobs (Optional)
  if (Math.random() > 0.6) { // 40% of users check featured jobs
    group('View Featured Jobs', () => {
      const res = http.get(`${BASE_URL}/api/jobs/featured`);
      check(res, {
        'featured jobs loaded': (r) => r.status === 200,
        'featured response time < 400ms': (r) => r.timings.duration < 400,
      }) || errorRate.add(1);
      sleep(Math.random() * 3 + 2); // Think time: 2-5 seconds
    });
  }
}

function employerJourney() {
  // Step 1: Visit Homepage
  group('Employer Homepage', () => {
    const res = http.get(`${BASE_URL}/`);
    check(res, {
      'homepage loaded': (r) => r.status === 200,
    }) || errorRate.add(1);
    sleep(Math.random() * 2 + 1);
  });

  // Step 2: View Employer Dashboard (Would require auth, simulating browse)
  group('Browse Employers', () => {
    const res = http.get(`${BASE_URL}/api/employers?page=1&limit=20`);
    check(res, {
      'employers loaded': (r) => r.status === 200,
      'employers response time < 500ms': (r) => r.timings.duration < 500,
    }) || errorRate.add(1);
    sleep(Math.random() * 4 + 3);
  });

  // Step 3: View Posted Jobs Stats
  group('View Stats', () => {
    const res = http.get(`${BASE_URL}/api/stats`);
    check(res, {
      'stats loaded': (r) => r.status === 200,
      'stats has data': (r) => r.json('totalJobs') !== undefined,
      'stats response time < 300ms': (r) => r.timings.duration < 300,
    }) || errorRate.add(1);
    sleep(Math.random() * 3 + 2);
  });

  // Step 4: Browse Job Listings (Competitor Analysis)
  group('Browse Jobs', () => {
    const res = http.get(`${BASE_URL}/api/jobs?page=1&limit=20`);
    check(res, {
      'jobs loaded': (r) => r.status === 200,
      'jobs response time < 500ms': (r) => r.timings.duration < 500,
    }) || errorRate.add(1);
    sleep(Math.random() * 5 + 4);
  });
}

export function handleSummary(data) {
  return {
    'stdout': JSON.stringify(data, null, 2),
    '/opt/wantokjobs/app/tests/load/concurrent-users-results.json': JSON.stringify(data),
  };
}
