#!/bin/bash
# WantokJobs Master Crontab Installer
# Run on VPS: sudo bash /opt/wantokjobs/app/system/setup-crontab.sh
LOG="[CRONTAB $(date +'%Y-%m-%d %H:%M:%S')]"
echo "$LOG Installing cron jobs..."
(crontab -l 2>/dev/null | grep -v wantokjobs | grep -v payment-cron) | crontab - 2>/dev/null || true
(crontab -l 2>/dev/null; echo "
# === WantokJobs Automated Jobs ==="; echo "*/5 * * * * /opt/wantokjobs/app/vps-scripts/watchdog.sh >> /var/log/wantokjobs-watchdog.log 2>&1"; echo "0 2 * * * /opt/wantokjobs/app/system/backup-cron.sh >> /var/log/wantokjobs-backup.log 2>&1"; echo "0 9 * * * /opt/wantokjobs/app/system/payment-cron.sh digest >> /var/log/wantokjobs-cron.log 2>&1"; echo "30 2 * * * /opt/wantokjobs/app/system/payment-cron.sh expire >> /var/log/wantokjobs-cron.log 2>&1"; echo "*/5 * * * * /opt/wantokjobs/app/system/payment-cron.sh whatsapp >> /var/log/wantokjobs-cron.log 2>&1"; echo "0 3 * * * cd /opt/wantokjobs/app && node scripts/expire-jobs.js >> /var/log/wantokjobs-cron.log 2>&1"; echo "0 8 * * * cd /opt/wantokjobs/app && node scripts/send-job-alerts.js >> /var/log/wantokjobs-cron.log 2>&1"; echo "0 1 * * * cd /opt/wantokjobs/app && node system/agents/job-indexer.js >> /var/log/wantokjobs-cron.log 2>&1"; echo "0 4 * * 0 cd /opt/wantokjobs/app && node system/data-cleanup.js >> /var/log/wantokjobs-cron.log 2>&1") | crontab -
echo "$LOG Done. Active jobs:"
crontab -l | grep -v "^#" | grep -v "^$"
