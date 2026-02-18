#!/bin/bash
# Run this ONCE on the VPS to install the watchdog
set -e

cp /opt/wantokjobs/vps-scripts/watchdog.sh /opt/wantokjobs/watchdog.sh
chmod +x /opt/wantokjobs/watchdog.sh

# Add cron entry (every 2 minutes)
(crontab -l 2>/dev/null | grep -v "watchdog.sh"; echo "*/2 * * * * /opt/wantokjobs/watchdog.sh >> /var/log/wantokjobs-watchdog.log 2>&1") | crontab -

# Ensure systemd auto-restarts on crash
SERVICE_FILE="/etc/systemd/system/wantokjobs.service"
if [ -f "$SERVICE_FILE" ]; then
    if ! grep -q "Restart=always" "$SERVICE_FILE"; then
        sed -i '/\[Service\]/a Restart=always\nRestartSec=5' "$SERVICE_FILE"
        systemctl daemon-reload
        echo "✅ systemd restart policy added"
    else
        echo "✅ systemd restart policy already set"
    fi
fi

echo "✅ Watchdog installed — checking every 2 minutes"
echo "✅ Logs at /var/log/wantokjobs-watchdog.log"
