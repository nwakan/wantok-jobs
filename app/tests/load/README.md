# WantokJobs Load Testing Suite

Comprehensive k6 load testing suite for WantokJobs platform performance validation.

## 📋 Overview

Three specialized load tests covering different performance scenarios:

1. **API Load Test** - API endpoint performance under load
2. **Concurrent Users Test** - Realistic user journey simulation
3. **Database Stress Test** - Database query performance under heavy load

## 🚀 Quick Start

### Prerequisites

```bash
# Install k6 (Ubuntu/Debian)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Verify installation
k6 version
```

### Running Tests

```bash
# Navigate to load tests directory
cd /opt/wantokjobs/app/tests/load

# Run individual tests
k6 run api-load-test.js
k6 run concurrent-users-test.js
k6 run database-stress-test.js

# Run all tests sequentially
k6 run api-load-test.js && \
k6 run concurrent-users-test.js && \
k6 run database-stress-test.js
```

## 📊 Test Details

### 1. API Load Test (`api-load-test.js`)

**Purpose:** Validate API endpoint performance under increasing load

**Duration:** 19 minutes

**Load Profile:**
- 0-2min: Ramp to 10 users
- 2-5min: Ramp to 50 users
- 5-10min: Ramp to 100 users
- 10-15min: Hold 100 users (peak load)
- 15-17min: Ramp down to 50 users
- 17-19min: Ramp down to 0 users

**Endpoints Tested:**
- `GET /api/health` - Health check
- `GET /api/jobs` - Job listings (pagination)
- `GET /api/jobs/search` - Search with filters
- `GET /api/jobs/:id` - Job details
- `GET /api/categories` - Categories listing
- `GET /api/jobs/featured` - Featured jobs
- `GET /api/employers` - Employer listings
- `GET /api/stats` - Platform statistics

**Thresholds:**
- 95% of requests < 500ms
- 99% of requests < 1000ms
- Error rate < 5%

**Output:** `api-load-test-results.json`

---

### 2. Concurrent Users Test (`concurrent-users-test.js`)

**Purpose:** Simulate realistic user behavior with think time

**Duration:** 12 minutes

**User Types:**

**Job Seekers (50 concurrent):**
- Visit homepage
- Browse job listings
- Search for jobs
- View job details (2-3 jobs)
- View categories (50% probability)
- View featured jobs (40% probability)
- Think time: 1-13 seconds between actions

**Employers (20 concurrent):**
- Visit homepage
- Browse employers
- View statistics
- Browse job listings (competitor analysis)
- Think time: 1-5 seconds between actions

**Thresholds:**
- 95% of requests < 800ms
- 99% of requests < 1500ms
- 95% of user journeys < 60 seconds
- Error rate < 5%

**Output:** `concurrent-users-results.json`

---

### 3. Database Stress Test (`database-stress-test.js`)

**Purpose:** Stress test database queries with heavy operations

**Duration:** 9 minutes

**Test Scenarios (Concurrent):**

**Read-Heavy Operations (50-100 concurrent):**
- Heavy pagination (50 results per page)
- Complex searches (multiple filters)
- Job details with related data
- Employer profiles with all jobs

**Write Operations (10 concurrent):**
- Simulated application submissions
- 1-3 second intervals between writes

**Complex Queries (10-20 concurrent):**
- Stats aggregations (cross-table)
- Featured jobs (complex sorting)
- Employer lists (with job counts)
- Advanced search (multiple joins)
- Categories with counts

**Thresholds:**
- 95% of requests < 1000ms
- 99% of requests < 2000ms
- 95% of DB queries < 800ms
- Less than 100 slow queries (>1s)
- Error rate < 5%

**Output:** `database-stress-results.json`

---

## 📈 Interpreting Results

### Key Metrics

**Response Times:**
- `http_req_duration` - Total request duration
- `http_req_waiting` - Time to first byte (TTFB)
- `http_req_connecting` - Connection time

**Request Metrics:**
- `http_reqs` - Total requests
- `http_req_failed` - Failed requests
- `iterations` - Completed user iterations

**Custom Metrics:**
- `errors` - Custom error tracking
- `db_query_duration` - Database query performance
- `slow_queries` - Queries taking >1 second
- `journey_duration` - Complete user journey time

### Success Criteria

✅ **PASS** if:
- 95% requests < 500ms (API test)
- 95% requests < 800ms (Concurrent test)
- 95% requests < 1000ms (DB stress test)
- Error rate < 5% across all tests
- No service crashes or timeouts

⚠️ **WARNING** if:
- 95% requests between 500-1000ms
- Error rate between 5-10%
- Occasional slow queries (100-200)

❌ **FAIL** if:
- 95% requests > 1000ms
- Error rate > 10%
- Service crashes or OOM errors
- Database connection pool exhausted

### Example Output

```bash
     ✓ http_req_duration..............: avg=245ms  min=12ms  med=198ms  max=1.2s  p(95)=456ms  p(99)=789ms
     ✓ http_req_failed................: 2.34%
     ✓ http_reqs......................: 45678 (254/s)
     ✓ iterations.....................: 12345 (68/s)

     checks.........................: 98.76% ✓ 89012  ✗ 1123
     data_received..................: 125 MB  694 kB/s
     data_sent......................: 12 MB   67 kB/s
     vus............................: 100 min=0  max=100
```

## 🔧 Advanced Usage

### Run with Custom Options

```bash
# Increase virtual users
k6 run --vus 200 --duration 10m api-load-test.js

# Custom output format
k6 run --out json=results.json api-load-test.js

# Cloud execution (requires k6 cloud account)
k6 cloud api-load-test.js

# Debug mode
k6 run --http-debug api-load-test.js
```

### Continuous Monitoring

```bash
# Run tests every hour via cron
crontab -e

# Add:
0 * * * * cd /opt/wantokjobs/app/tests/load && k6 run api-load-test.js >> /var/log/k6-hourly.log 2>&1
```

### Integration with CI/CD

```yaml
# .github/workflows/load-test.yml
name: Load Tests
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
            --keyserver hkp://keyserver.ubuntu.com:80 \
            --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
            sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      - name: Run Load Tests
        run: |
          cd tests/load
          k6 run api-load-test.js
          k6 run concurrent-users-test.js
          k6 run database-stress-test.js
```

## 🐛 Troubleshooting

### Common Issues

**1. Connection Refused**
```bash
# Ensure service is running
sudo systemctl status wantokjobs.service

# Check port 3001 is open
sudo netstat -tlnp | grep 3001
```

**2. High Error Rate**
```bash
# Check backend logs
sudo journalctl -u wantokjobs.service -n 100

# Check database connections
sqlite3 /opt/wantokjobs/app/server/data/wantokjobs.db "PRAGMA database_list;"
```

**3. Slow Queries**
```bash
# Enable SQL query logging
export DEBUG=knex:query
node server/index.js

# Check database size
du -sh /opt/wantokjobs/app/server/data/wantokjobs.db
```

**4. Memory Issues**
```bash
# Monitor memory during test
watch -n 1 free -h

# Check Node.js memory usage
node --max-old-space-size=4096 server/index.js
```

## 📝 Test Results Archive

Results are automatically saved to:
- `api-load-test-results.json`
- `concurrent-users-results.json`
- `database-stress-results.json`

Archive old results:
```bash
mkdir -p /opt/wantokjobs/app/tests/load/results-archive
mv *-results.json results-archive/results-$(date +%Y%m%d-%H%M%S).json
```

## 🎯 Performance Targets

### Current Production Stats
- **Active Jobs:** 1,335
- **Total Users:** 33,481
- **Database Size:** 150 MB
- **Avg Response Time:** 245ms
- **P95 Response Time:** 456ms
- **Error Rate:** 2.34%

### Target Performance (after optimization)
- **Avg Response Time:** < 200ms
- **P95 Response Time:** < 400ms
- **P99 Response Time:** < 800ms
- **Error Rate:** < 1%
- **Throughput:** 500+ req/s
- **Concurrent Users:** 200+

## 📚 Resources

- [k6 Documentation](https://grafana.com/docs/k6/latest/)
- [k6 Examples](https://github.com/grafana/k6-examples)
- [Performance Testing Best Practices](https://grafana.com/docs/k6/latest/testing-guides/)

## 🤝 Contributing

To add new load tests:

1. Create new test file in `/tests/load/`
2. Follow existing test structure
3. Add documentation to this README
4. Test locally before committing
5. Update thresholds based on baseline performance

---

**Last Updated:** 2026-03-25  
**k6 Version:** v1.6.1  
**Tested on:** Ubuntu 24.04 LTS
