#!/bin/bash
# Test Transparency API Endpoints via HTTP

echo "=========================================="
echo "Transparency API Endpoint Tests"
echo "=========================================="
echo ""

BASE_URL="http://localhost:3001"

# Get a test job ID
JOB_ID=$(node -e "
const db = require('./server/database');
const job = db.prepare('SELECT job_id FROM hiring_transparency LIMIT 1').get();
console.log(job ? job.job_id : 8291);
process.exit(0);
" 2>/dev/null | tail -1)

echo "Using test job ID: $JOB_ID"
echo ""

# Test 1: GET /api/transparency/job/:jobId
echo "1. GET /api/transparency/job/$JOB_ID"
echo "------------------------------------------"
curl -s "$BASE_URL/api/transparency/job/$JOB_ID" | jq '.' 2>/dev/null || echo "Server not running or jq not installed"
echo ""
echo ""

# Get an employer ID
EMPLOYER_ID=$(node -e "
const db = require('./server/database');
const emp = db.prepare('SELECT user_id FROM profiles_employer WHERE transparency_required = 1 LIMIT 1').get();
console.log(emp ? emp.user_id : 1);
process.exit(0);
" 2>/dev/null | tail -1)

# Test 2: GET /api/transparency/employer/:id
echo "2. GET /api/transparency/employer/$EMPLOYER_ID"
echo "------------------------------------------"
curl -s "$BASE_URL/api/transparency/employer/$EMPLOYER_ID" | jq '.' 2>/dev/null || echo "Server not running or jq not installed"
echo ""
echo ""

# Test 3: GET /api/transparency/employer/:id/jobs
echo "3. GET /api/transparency/employer/$EMPLOYER_ID/jobs"
echo "------------------------------------------"
curl -s "$BASE_URL/api/transparency/employer/$EMPLOYER_ID/jobs" | jq '.' 2>/dev/null || echo "Server not running or jq not installed"
echo ""
echo ""

# Test 4: GET /api/transparency/stats
echo "4. GET /api/transparency/stats"
echo "------------------------------------------"
curl -s "$BASE_URL/api/transparency/stats" | jq '.' 2>/dev/null || echo "Server not running or jq not installed"
echo ""
echo ""

# Test 5: GET /api/transparency/employer/:id/score
echo "5. GET /api/transparency/employer/$EMPLOYER_ID/score"
echo "------------------------------------------"
curl -s "$BASE_URL/api/transparency/employer/$EMPLOYER_ID/score" | jq '.' 2>/dev/null || echo "Server not running or jq not installed"
echo ""
echo ""

echo "=========================================="
echo "Note: If 'Server not running' appears,"
echo "start the server with: npm start"
echo "=========================================="
