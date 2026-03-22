#!/bin/bash
# WantokJobs Comprehensive Smoke Testing Suite
# Tests all critical platform features after deployment
# Usage: bash smoke-test.sh

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BASE_URL="https://wantokjobs.com"
FAILURES=0
WARNINGS=0

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
pass() { echo -e "${GREEN}✓ PASS${NC} $1"; }
fail() { echo -e "${RED}✗ FAIL${NC} $1"; ((FAILURES++)); }
warn() { echo -e "${YELLOW}⚠ WARN${NC} $1"; ((WARNINGS++)); }

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  WantokJobs Smoke Test Suite${NC}"
echo -e "${BLUE}  $(date)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

# Frontend Tests
log "🌐 Frontend Tests"
echo -n "  Homepage... "
if curl -sf "$BASE_URL" -o /dev/null; then pass "200 OK"; else fail "Failed to load"; fi

echo -n "  /employers page... "
if curl -sf "$BASE_URL/employers" -o /dev/null; then pass "200 OK"; else fail "Failed to load"; fi

echo -n "  /jobs page... "
if curl -sf "$BASE_URL/jobs" -o /dev/null; then pass "200 OK"; else fail "Failed to load"; fi

echo -n "  /login page... "
if curl -sf "$BASE_URL/login" -o /dev/null; then pass "200 OK"; else fail "Failed to load"; fi

echo -n "  /register page... "
if curl -sf "$BASE_URL/register" -o /dev/null; then pass "200 OK"; else fail "Failed to load"; fi

echo -n "  Legacy /companies redirect... "
if curl -sf "$BASE_URL/companies" -o /dev/null; then pass "Redirect working"; else fail "Redirect broken"; fi

echo ""

# API Tests
log "🔌 API Endpoint Tests"
echo -n "  /health... "
HEALTH=$(curl -s "$BASE_URL/health")
if echo "$HEALTH" | grep -q '"status":"ok"'; then pass "Healthy"; else fail "Unhealthy: $HEALTH"; fi

echo -n "  /api/jobs (public)... "
if curl -sf "$BASE_URL/api/jobs" -o /dev/null; then pass "200 OK"; else fail "Failed"; fi

echo -n "  /api/stats... "
if curl -sf "$BASE_URL/api/stats" -o /dev/null; then pass "200 OK"; else fail "Failed"; fi

echo -n "  /api/categories... "
if curl -sf "$BASE_URL/api/categories" -o /dev/null; then pass "200 OK"; else fail "Failed"; fi

echo -n "  /api/employers (public)... "
if curl -sf "$BASE_URL/api/employers" -o /dev/null; then pass "200 OK"; else fail "Failed"; fi

echo ""

# Jean AI Tests
log "🤖 Jean AI Chat Tests"
echo -n "  /api/chat/health... "
CHAT_HEALTH=$(curl -s "$BASE_URL/api/chat/health")
if echo "$CHAT_HEALTH" | grep -q 'status'; then pass "Responding"; else fail "Not responding: $CHAT_HEALTH"; fi

echo ""

# Static Assets
log "📦 Static Assets Tests"
echo -n "  Main JS bundle... "
BUNDLE=$(curl -s "$BASE_URL" | grep -o 'index-[^.]*\.js' | head -1)
if [ -n "$BUNDLE" ]; then
    if curl -sf "$BASE_URL/assets/$BUNDLE" -o /dev/null; then
        pass "$BUNDLE loaded"
    else
        fail "$BUNDLE not found"
    fi
else
    fail "Bundle not detected in HTML"
fi

echo -n "  Service Worker... "
if curl -sf "$BASE_URL/sw.js" -o /dev/null; then pass "Available"; else warn "Missing"; fi

echo -n "  PWA Manifest... "
if curl -sf "$BASE_URL/manifest.json" -o /dev/null; then pass "Available"; else warn "Missing"; fi

echo -n "  Offline page... "
if curl -sf "$BASE_URL/offline.html" -o /dev/null; then pass "Available"; else warn "Missing"; fi

echo ""

# SEO & Metadata
log "🔍 SEO & Metadata Tests"
HOME_HTML=$(curl -s "$BASE_URL")

echo -n "  Title tag... "
if echo "$HOME_HTML" | grep -q "<title>"; then pass "Present"; else fail "Missing"; fi

echo -n "  Meta description... "
if echo "$HOME_HTML" | grep -q 'meta name="description"'; then pass "Present"; else warn "Missing"; fi

echo -n "  Open Graph tags... "
if echo "$HOME_HTML" | grep -q 'property="og:'; then pass "Present"; else warn "Missing"; fi

echo -n "  Canonical URL... "
if echo "$HOME_HTML" | grep -q 'rel="canonical"'; then pass "Present"; else warn "Missing"; fi

echo ""

# Security Headers
log "🔒 Security Headers Tests"
HEADERS=$(curl -sI "$BASE_URL")

echo -n "  HTTPS redirect... "
if echo "$HEADERS" | grep -q "HTTP/2 200"; then pass "HTTPS active"; else warn "HTTP detected"; fi

echo -n "  X-Content-Type-Options... "
if echo "$HEADERS" | grep -qi "x-content-type-options"; then pass "Present"; else warn "Missing"; fi

echo -n "  X-Frame-Options... "
if echo "$HEADERS" | grep -qi "x-frame-options"; then pass "Present"; else warn "Missing"; fi

echo -n "  Content-Security-Policy... "
if echo "$HEADERS" | grep -qi "content-security-policy"; then pass "Present"; else warn "Missing"; fi

echo ""

# Performance Tests
log "⚡ Performance Tests"
echo -n "  Homepage load time... "
LOAD_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL")
if (( $(echo "$LOAD_TIME < 3.0" | bc -l) )); then
    pass "${LOAD_TIME}s (good)"
elif (( $(echo "$LOAD_TIME < 5.0" | bc -l) )); then
    warn "${LOAD_TIME}s (acceptable)"
else
    fail "${LOAD_TIME}s (slow)"
fi

echo -n "  API response time... "
API_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL/api/jobs")
if (( $(echo "$API_TIME < 1.0" | bc -l) )); then
    pass "${API_TIME}s (fast)"
elif (( $(echo "$API_TIME < 2.0" | bc -l) )); then
    warn "${API_TIME}s (acceptable)"
else
    fail "${API_TIME}s (slow)"
fi

echo ""

# Database Connectivity (via API)
log "💾 Database Tests (via API)"
echo -n "  Jobs query... "
JOBS_DATA=$(curl -s "$BASE_URL/api/jobs?limit=1")
if echo "$JOBS_DATA" | grep -q '"jobs"'; then pass "Querying successfully"; else fail "Query failed"; fi

echo -n "  Stats query... "
STATS_DATA=$(curl -s "$BASE_URL/api/stats")
if echo "$STATS_DATA" | grep -q 'jobsCount'; then pass "Querying successfully"; else fail "Query failed"; fi

echo ""

# Summary
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Test Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"

if [ $FAILURES -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo -e "Platform is healthy and ready for production."
    exit 0
elif [ $FAILURES -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s)${NC}"
    echo -e "Platform is functional but has non-critical issues."
    exit 0
else
    echo -e "${RED}✗ $FAILURES failure(s), $WARNINGS warning(s)${NC}"
    echo -e "Platform has critical issues requiring attention."
    exit 1
fi
