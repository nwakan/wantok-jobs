#!/bin/bash
# WantokJobs Production Monitoring Script
# Continuously monitors production health and alerts on issues
# Usage: bash monitor-production.sh [interval_seconds]
# Or install as systemd service for continuous monitoring

INTERVAL=${1:-300}  # Default: 5 minutes
BASE_URL="https://wantokjobs.com"
LOG_FILE="/var/log/wantokjobs-monitor.log"
ALERT_FILE="/tmp/wantokjobs-alerts.txt"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

alert() {
    MSG="🚨 ALERT: $1"
    log "$MSG"
    echo "$MSG" >> "$ALERT_FILE"
}

check_endpoint() {
    local url="$1"
    local name="$2"
    local status=$(curl -s -o /dev/null -w '%{http_code}' "$url")
    
    if [ "$status" = "200" ]; then
        log "✓ $name: OK (200)"
        return 0
    else
        alert "$name returned $status (expected 200)"
        return 1
    fi
}

check_response_time() {
    local url="$1"
    local name="$2"
    local threshold="$3"
    local time=$(curl -s -o /dev/null -w '%{time_total}' "$url")
    local time_ms=$(echo "$time * 1000" | bc)
    
    if (( $(echo "$time < $threshold" | bc -l) )); then
        log "✓ $name: ${time_ms}ms (< ${threshold}s)"
        return 0
    else
        alert "$name response time ${time_ms}ms exceeds threshold ${threshold}s"
        return 1
    fi
}

check_bundle() {
    local bundle=$(curl -s "$BASE_URL" | grep -o 'index-[^.]*\.js' | head -1)
    if [ -n "$bundle" ]; then
        log "✓ Bundle: $bundle"
        echo "$bundle" > /tmp/wantokjobs-current-bundle.txt
        return 0
    else
        alert "Bundle not detected in HTML"
        return 1
    fi
}

check_database() {
    local response=$(curl -s "$BASE_URL/api/jobs?limit=1")
    if echo "$response" | grep -q '"jobs"'; then
        log "✓ Database: Connected and responding"
        return 0
    else
        alert "Database query failed or returned invalid response"
        return 1
    fi
}

check_ssl() {
    local expiry=$(echo | openssl s_client -servername wantokjobs.com -connect wantokjobs.com:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
    if [ -n "$expiry" ]; then
        log "✓ SSL Certificate valid until: $expiry"
        return 0
    else
        alert "SSL certificate check failed"
        return 1
    fi
}

run_health_check() {
    log "==================== Health Check Started ===================="
    
    local failures=0
    
    # Critical endpoints
    check_endpoint "$BASE_URL" "Homepage" || ((failures++))
    check_endpoint "$BASE_URL/health" "API Health" || ((failures++))
    check_endpoint "$BASE_URL/employers" "Employers Page" || ((failures++))
    check_endpoint "$BASE_URL/jobs" "Jobs Page" || ((failures++))
    
    # Performance checks
    check_response_time "$BASE_URL" "Homepage" 3.0 || ((failures++))
    check_response_time "$BASE_URL/api/jobs" "Jobs API" 1.0 || ((failures++))
    
    # System checks
    check_bundle || ((failures++))
    check_database || ((failures++))
    check_ssl || ((failures++))
    
    if [ $failures -eq 0 ]; then
        log "✅ All health checks passed"
    else
        alert "$failures health check(s) failed - review logs"
    fi
    
    log "==================== Health Check Complete ==================="
    log ""
    
    return $failures
}

# Main monitoring loop
log "WantokJobs Production Monitor started (interval: ${INTERVAL}s)"

while true; do
    run_health_check
    
    # Send alerts if any exist
    if [ -f "$ALERT_FILE" ] && [ -s "$ALERT_FILE" ]; then
        # In production, this would integrate with email/Slack/PagerDuty
        log "⚠️  Active alerts detected - see $ALERT_FILE"
        # Clear old alerts after 1 hour
        find "$ALERT_FILE" -mmin +60 -delete 2>/dev/null
    fi
    
    sleep "$INTERVAL"
done
