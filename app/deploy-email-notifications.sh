#!/bin/bash
set -e

echo "📧 Deploying Email Notification Updates to VPS..."

VPS_HOST="root@172.19.0.1"
VPS_APP_DIR="/opt/wantokjobs/app"

# Files to deploy
FILES=(
  "server/lib/email.js"
  "server/routes/admin-payments.js"
  "server/routes/admin-bank-reconcile.js"
)

echo "📦 Copying files to VPS..."
for file in "${FILES[@]}"; do
  echo "  → $file"
  scp "$file" "$VPS_HOST:$VPS_APP_DIR/$file"
done

echo "🔄 Restarting wantokjobs service..."
ssh "$VPS_HOST" "systemctl restart wantokjobs"

echo "⏳ Waiting for service to start..."
sleep 3

echo "✅ Checking service status..."
ssh "$VPS_HOST" "systemctl status wantokjobs --no-pager | head -20"

echo ""
echo "🎉 Email notifications deployed!"
echo ""
echo "📧 Email templates added:"
echo "  ✅ payment_verified — Approval confirmation with credits added"
echo "  ✅ payment_rejected — Rejection notice with reason"
echo ""
echo "🔔 Notification channels now active:"
echo "  ✅ In-app notification (existing)"
echo "  ✅ WhatsApp notification (via outbox queue)"
echo "  ✅ Email notification (via Brevo) — NEW!"
echo ""
echo "📝 Note: Emails only send if user has an email address."
echo "   WhatsApp-only employers will skip email silently."
echo ""
