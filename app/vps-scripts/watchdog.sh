#!/bin/bash
#═══════════════════════════════════════════════════════════════
# WantokJobs Watchdog Script
# Monitors the service and restarts if it's down
# Should be run via cron every 5 minutes
#═══════════════════════════════════════════════════════════════

SERVICE="wantokjobs"
LOGFILE="/var/log/wantokjobs-watchdog.log"
MAX_LOG_LINES=500

# Logging function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOGFILE"
}

# Check if service is running
if ! systemctl is-active --quiet "$SERVICE"; then
  log "⚠ Service $SERVICE is down - attempting restart"
  
  # Try to restart the service
  if systemctl restart "$SERVICE"; then
    log "✓ Service $SERVICE restarted successfully"
    
    # Wait for health check
    sleep 3
    if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
      log "✓ Health check passed"
    else
      log "⚠ Health check failed after restart"
    fi
  else
    log "✗ Failed to restart service $SERVICE"
    # Send notification (optional - uncomment if you have mail configured)
    # echo "WantokJobs service failed to restart on $(hostname)" | mail -s "WantokJobs Alert" admin@tolarai.com
  fi
else
  # Service is running - verify it's responding
  if ! curl -sf http://localhost:3001/health > /dev/null 2>&1; then
    log "⚠ Service $SERVICE is running but not responding to health checks - restarting"
    systemctl restart "$SERVICE"
    sleep 3
    if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
      log "✓ Service recovered after restart"
    else
      log "✗ Service still not responding after restart"
    fi
  fi
fi

# Trim log file
if [ -f "$LOGFILE" ]; then
  tail -n "$MAX_LOG_LINES" "$LOGFILE" > "$LOGFILE.tmp" && mv "$LOGFILE.tmp" "$LOGFILE"
fi

exit 0
