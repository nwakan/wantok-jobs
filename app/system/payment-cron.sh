#!/bin/bash
# WantokJobs Payment Automation Cron
# Usage: payment-cron.sh [digest|expire|whatsapp]
APP_DIR="/opt/wantokjobs/app"
API_URL="http://localhost:3001"
LOG="[$(date +'%Y-%m-%d %H:%M:%S')] PAYMENT-CRON"
source "$APP_DIR/.env" 2>/dev/null || true
ADMIN_TOKEN="${ADMIN_CRON_TOKEN:-}"
ACTION="${1:-digest}"
case "$ACTION" in
  digest)
    echo "$LOG - Daily payment digest..."
    curl -sf -X GET "$API_URL/api/admin/payments/digest" -H "Authorization: Bearer $ADMIN_TOKEN" || echo "digest failed"
    ;;
  expire)
    echo "$LOG - Expiring stale payments (>72h)..."
    curl -sf -X POST "$API_URL/api/admin/payments/expire-stale" -H "Authorization: Bearer $ADMIN_TOKEN" || echo "expire failed"
    ;;
  whatsapp)
    echo "$LOG - WhatsApp outbox check..."
    cd "$APP_DIR" && node -e "
const db=require('./server/database');
try{const rows=db.prepare('SELECT * FROM whatsapp_outbox WHERE status='pending' LIMIT 10').all();console.log('Pending:',rows.length);}catch(e){console.log('outbox:',e.message);}
" 2>&1 || true
    ;;
  *)
    echo "$LOG - Usage: digest|expire|whatsapp"; exit 1;;
esac
echo "$LOG - Done."
