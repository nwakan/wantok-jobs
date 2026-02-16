#!/bin/bash
# WantokJobs Daily Database Backup (Cron-compatible)
# Add to crontab: 0 2 * * * /opt/wantokjobs/app/system/backup-cron.sh >> /var/log/wantokjobs-backup.log 2>&1

set -e
cd "$(dirname "$0")/.."

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 WantokJobs Database Backup"
echo "📅 $(date '+%Y-%m-%d %H:%M:%S')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Run backup agent
node system/agents/db-backup.js

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
