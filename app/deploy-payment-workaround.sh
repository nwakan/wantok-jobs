#!/bin/bash
set -e

echo "🚀 Deploying Payment Workaround Features to VPS..."

VPS_HOST="root@172.19.0.1"
VPS_APP_DIR="/opt/wantokjobs/app"

# Files to deploy
FILES=(
  "server/utils/jean/whatsapp-notify.js"
  "server/utils/jean/receipt-handler.js"
  "server/utils/jean/payment-digest.js"
  "server/utils/jean/sme-pricing.js"
  "server/routes/admin-payments.js"
  "server/routes/admin-bank-reconcile.js"
  "server/index.js"
  "server/migrations/018_payment_workaround.js"
)

echo "📦 Copying files to VPS..."
for file in "${FILES[@]}"; do
  echo "  → $file"
  scp "$file" "$VPS_HOST:$VPS_APP_DIR/$file"
done

echo "🔧 Running migrations on VPS..."
ssh "$VPS_HOST" "cd $VPS_APP_DIR && node server/migrations/runner.js"

echo "🔄 Restarting wantokjobs service..."
ssh "$VPS_HOST" "systemctl restart wantokjobs"

echo "⏳ Waiting for service to start..."
sleep 3

echo "✅ Checking service status..."
ssh "$VPS_HOST" "systemctl status wantokjobs --no-pager | head -20"

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📋 Summary of changes:"
echo "  ✅ WhatsApp Auto-Confirm Loop"
echo "  ✅ Receipt Photo Storage"
echo "  ✅ Daily Pending Digest"
echo "  ✅ Auto-Expire Stale Payments"
echo "  ✅ CSV Bank Reconciliation"
echo ""
echo "🔗 New API endpoints:"
echo "  GET  /api/admin/payments/digest"
echo "  POST /api/admin/payments/expire-stale"
echo "  POST /api/admin/reconcile/upload"
echo "  POST /api/admin/reconcile/confirm"
echo ""
