#!/bin/bash
# One-time setup for WantokJobs auto-deploy webhook
set -e

DEPLOY_SECRET="wantok-$(openssl rand -hex 16)"
SCRIPT_DIR="/opt/wantokjobs/vps-scripts"
SERVICE_FILE="/etc/systemd/system/wantokjobs-deploy.service"

# Create systemd service
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=WantokJobs Auto-Deploy Webhook
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/node ${SCRIPT_DIR}/deploy-webhook.js
WorkingDirectory=/opt/wantokjobs/app
Environment=DEPLOY_SECRET=${DEPLOY_SECRET}
Environment=DEPLOY_PORT=9091
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
systemctl daemon-reload
systemctl enable wantokjobs-deploy
systemctl start wantokjobs-deploy

# Add nginx proxy for external webhook access
NGINX_CONF="/etc/nginx/sites-available/deploy-webhook"
if command -v nginx &>/dev/null; then
  cat > "$NGINX_CONF" << 'NGINX'
# Add this location block to your existing tolarai.com server block:
# location /deploy-webhook {
#     proxy_pass http://127.0.0.1:9091/webhook;
#     proxy_set_header X-Hub-Signature-256 $http_x_hub_signature_256;
#     proxy_set_header Content-Type $content_type;
# }
NGINX
  echo "📝 Nginx config hint saved to $NGINX_CONF"
  echo "   Add the location block to your existing server config and reload nginx"
fi

echo ""
echo "✅ Auto-deploy webhook installed!"
echo ""
echo "🔑 Deploy secret: ${DEPLOY_SECRET}"
echo "   Save this — you'll need it for GitHub webhook config"
echo ""
echo "📡 Endpoints:"
echo "   Health:  curl http://localhost:9091/health"
echo "   Manual:  curl \"http://localhost:9091/deploy?token=${DEPLOY_SECRET}\""
echo "   Webhook: POST http://localhost:9091/webhook (for GitHub)"
echo ""
echo "📋 GitHub webhook setup:"
echo "   1. Go to https://github.com/nwakan/wantok-jobs/settings/hooks"
echo "   2. Add webhook:"
echo "      Payload URL: https://tolarai.com/deploy-webhook"
echo "      Content type: application/json"
echo "      Secret: ${DEPLOY_SECRET}"
echo "      Events: Just the push event"
echo ""
echo "🔧 To expose via Cloudflare/nginx, proxy /deploy-webhook to localhost:9091/webhook"
echo ""
echo "📄 Logs: journalctl -u wantokjobs-deploy -f"
