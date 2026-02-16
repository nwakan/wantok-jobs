#!/bin/bash
# VPS Database Backup Script
# Run on VPS: /opt/wantokjobs/vps-backup.sh
# Add to crontab: 0 3 * * * /opt/wantokjobs/vps-backup.sh >> /var/log/wantokjobs-backup.log 2>&1

set -e

APP_DIR="/opt/wantokjobs/app"
DB_FILE="$APP_DIR/server/data/wantokjobs.db"
BACKUP_DIR="$APP_DIR/server/data/backups"
OFFSITE_DIR="/root/wantokjobs-backups"  # Off-disk backup location
S3_BUCKET="${WANTOK_S3_BUCKET}"  # Optional: S3 bucket for offsite backups

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 WantokJobs VPS Database Backup"
echo "📅 $(date '+%Y-%m-%d %H:%M:%S')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if database exists
if [ ! -f "$DB_FILE" ]; then
  echo "❌ Database not found: $DB_FILE"
  exit 1
fi

# Create backup directories
mkdir -p "$BACKUP_DIR"
mkdir -p "$OFFSITE_DIR"

# Run the backup agent
cd "$APP_DIR"
node system/agents/db-backup.js

# Get latest backup
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/wantokjobs-*.db 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
  echo "❌ No backup found"
  exit 1
fi

BACKUP_NAME=$(basename "$LATEST_BACKUP")
BACKUP_SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)

echo "✅ Local backup created: $BACKUP_NAME ($BACKUP_SIZE)"

# Copy to offsite directory
cp "$LATEST_BACKUP" "$OFFSITE_DIR/"
echo "✅ Copied to offsite: $OFFSITE_DIR/$BACKUP_NAME"

# Optional: Upload to S3 (requires aws-cli)
if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
  echo "📤 Uploading to S3: s3://$S3_BUCKET/backups/$BACKUP_NAME"
  aws s3 cp "$LATEST_BACKUP" "s3://$S3_BUCKET/backups/$BACKUP_NAME" --storage-class STANDARD_IA
  echo "✅ S3 upload complete"
fi

# Clean old offsite backups (keep last 30)
echo "🧹 Cleaning old offsite backups..."
cd "$OFFSITE_DIR"
ls -t wantokjobs-*.db 2>/dev/null | tail -n +31 | xargs -r rm -f
OFFSITE_COUNT=$(ls -1 wantokjobs-*.db 2>/dev/null | wc -l)
echo "✅ Offsite backups: $OFFSITE_COUNT files"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Backup complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
