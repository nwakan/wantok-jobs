#!/bin/bash
# WantokJobs Production Deployment Verification Script
# Usage: bash verify-deployment.sh [expected-bundle-hash]

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

EXPECTED_BUNDLE="${1:-}"
PROD_URL="https://wantokjobs.com"
FAILURES=0

echo -e "${BLUE}=== WantokJobs Deployment Verification ===${NC}"
echo -e "Production URL: $PROD_URL"
echo -e "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

# Test 1: Homepage accessibility
echo -n "[1/10] Testing homepage accessibility... "
if curl -sf -o /dev/null -w '%{http_code}' "$PROD_URL" | grep -q '^200$'; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILURES++))
fi

# Test 2: Bundle hash verification
echo -n "[2/10] Verifying bundle deployment... "
ACTUAL_BUNDLE=$(curl -s "$PROD_URL" | grep -o 'index-[^.]*\.js' | head -1)
if [ -n "$ACTUAL_BUNDLE" ]; then
    if [ -n "$EXPECTED_BUNDLE" ] && [ "$ACTUAL_BUNDLE" != "$EXPECTED_BUNDLE" ]; then
        echo -e "${YELLOW}⚠ WARNING${NC}"
        echo "  Expected: $EXPECTED_BUNDLE"
        echo "  Actual: $ACTUAL_BUNDLE"
    else
        echo -e "${GREEN}✓ PASS${NC} ($ACTUAL_BUNDLE)"
    fi
else
    echo -e "${RED}✗ FAIL (bundle not found)${NC}"
    ((FAILURES++))
fi

# Test 3: /employers route
echo -n "[3/10] Testing /employers route... "
if curl -sf -o /dev/null -w '%{http_code}' "$PROD_URL/employers" | grep -q '^200$'; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILURES++))
fi

# Test 4: /companies redirect
echo -n "[4/10] Testing /companies redirect... "
if curl -sf -o /dev/null -w '%{http_code}' "$PROD_URL/companies" | grep -q '^200$'; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILURES++))
fi

# Test 5: Jean AI health endpoint
echo -n "[5/10] Testing Jean AI chat health... "
RESPONSE=$(curl -s "$PROD_URL/api/chat/health")
if echo "$RESPONSE" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "  Response: $RESPONSE"
    ((FAILURES++))
fi

# Test 6: API health
echo -n "[6/10] Testing API health endpoint... "
if curl -sf -o /dev/null -w '%{http_code}' "$PROD_URL/health" | grep -q '^200$'; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILURES++))
fi

# Test 7: Jobs listing
echo -n "[7/10] Testing jobs API endpoint... "
if curl -sf -o /dev/null -w '%{http_code}' "$PROD_URL/api/jobs" | grep -q '^200$'; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILURES++))
fi

# Test 8: Service worker
echo -n "[8/10] Testing service worker... "
if curl -sf -o /dev/null -w '%{http_code}' "$PROD_URL/sw.js" | grep -q '^200$'; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILURES++))
fi

# Test 9: Manifest
echo -n "[9/10] Testing PWA manifest... "
if curl -sf -o /dev/null -w '%{http_code}' "$PROD_URL/manifest.json" | grep -q '^200$'; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILURES++))
fi

# Test 10: HTTPS/Security headers
echo -n "[10/10] Testing security headers... "
HEADERS=$(curl -sI "$PROD_URL")
if echo "$HEADERS" | grep -qi "strict-transport-security"; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${YELLOW}⚠ WARNING (HSTS not found)${NC}"
fi

echo ""
echo -e "${BLUE}=== Summary ===${NC}"
if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo -e "Production deployment verified successfully."
    exit 0
else
    echo -e "${RED}✗ $FAILURES test(s) failed${NC}"
    echo -e "Please investigate and retry deployment."
    exit 1
fi
