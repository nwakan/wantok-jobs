#!/bin/bash
# WantokJobs Watchdog — run via cron every 2 minutes
# crontab -e → */2 * * * * /opt/wantokjobs/watchdog.sh >> /var/log/wantokjobs-watchdog.log 2>&1

SITE_URL="http://localhost:3000"
SERVICE_NAME="wantokjobs"
LOG_TAG="[watchdog]"
MAX_RESTARTS=3
RESTART_COUNT_FILE="/tmp/wantokjobs-restart-count"

# Reset counter every hour
if [ -f "$RESTART_COUNT_FILE" ]; then
    FILE_AGE=$(( $(date +%s) - $(stat -c %Y "$RESTART_COUNT_FILE" 2>/dev/null || echo 0) ))
    if [ "$FILE_AGE" -gt 3600 ]; then
        echo 0 > "$RESTART_COUNT_FILE"
    fi
fi

RESTART_COUNT=$(cat "$RESTART_COUNT_FILE" 2>/dev/null || echo 0)

# Health check — 10 second timeout
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$SITE_URL" 2>/dev/null)

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 400 ]; then
    # Site is up — reset counter
    echo 0 > "$RESTART_COUNT_FILE"
    exit 0
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') $LOG_TAG Site DOWN (HTTP $HTTP_CODE). Restart count: $RESTART_COUNT"

if [ "$RESTART_COUNT" -ge "$MAX_RESTARTS" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') $LOG_TAG Max restarts ($MAX_RESTARTS) reached this hour. Skipping."
    exit 1
fi

# Attempt restart
echo "$(date '+%Y-%m-%d %H:%M:%S') $LOG_TAG Restarting $SERVICE_NAME..."
systemctl restart "$SERVICE_NAME" 2>/dev/null || {
    # Fallback: try pm2 or direct node
    cd /opt/wantokjobs/app && pm2 restart wantokjobs 2>/dev/null || {
        echo "$(date '+%Y-%m-%d %H:%M:%S') $LOG_TAG Could not restart via systemd or pm2"
        exit 1
    }
}

echo $(( RESTART_COUNT + 1 )) > "$RESTART_COUNT_FILE"

# Verify recovery after 15 seconds
sleep 15
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$SITE_URL" 2>/dev/null)
if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 400 ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') $LOG_TAG ✅ Recovery successful (HTTP $HTTP_CODE)"
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') $LOG_TAG ❌ Recovery FAILED (HTTP $HTTP_CODE)"
fi
