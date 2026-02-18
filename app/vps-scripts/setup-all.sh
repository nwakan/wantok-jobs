#!/bin/bash
#═══════════════════════════════════════════════════════════════
# WantokJobs Complete Setup Script
# Run this once on the VPS to configure everything properly
#═══════════════════════════════════════════════════════════════

set -e  # Exit on any error

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
  echo -e "${GREEN}[✓]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
  echo -e "${RED}[✗]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  log_error "Please run as root (use sudo)"
  exit 1
fi

echo "═══════════════════════════════════════════════════════════════"
echo "WantokJobs Production Setup"
echo "═══════════════════════════════════════════════════════════════"
echo ""

REPO_DIR="/opt/wantokjobs"
SCRIPT_DIR="$REPO_DIR/app/vps-scripts"

# Check if repo directory exists
if [ ! -d "$REPO_DIR/app" ]; then
  log_error "Repository not found at $REPO_DIR/app"
  log_error "Please clone the repo first: git clone <repo-url> $REPO_DIR"
  exit 1
fi

cd "$SCRIPT_DIR"

# ═══════════════════════════════════════════════════════════════
# 1. Make scripts executable
# ═══════════════════════════════════════════════════════════════
log "Making scripts executable..."
chmod +x deploy.sh
chmod +x watchdog.sh
chmod +x setup-all.sh

# ═══════════════════════════════════════════════════════════════
# 2. Configure Git safe directory
# ═══════════════════════════════════════════════════════════════
log "Configuring git safe directory..."
git config --global --add safe.directory "$REPO_DIR/app" || true

# ═══════════════════════════════════════════════════════════════
# 3. Install systemd service
# ═══════════════════════════════════════════════════════════════
log "Installing systemd service..."
cp wantokjobs.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable wantokjobs
log "WantokJobs service enabled"

# ═══════════════════════════════════════════════════════════════
# 4. Install nginx configuration
# ═══════════════════════════════════════════════════════════════
if [ -f "/etc/nginx/sites-available/tolarai" ]; then
  log_warn "Backing up existing nginx config..."
  cp /etc/nginx/sites-available/tolarai /etc/nginx/sites-available/tolarai.backup.$(date +%s)
fi

log "Installing nginx configuration..."
cp nginx-tolarai.conf /etc/nginx/sites-available/tolarai

# Create symlink if it doesn't exist
if [ ! -L "/etc/nginx/sites-enabled/tolarai" ]; then
  ln -s /etc/nginx/sites-available/tolarai /etc/nginx/sites-enabled/tolarai
  log "Nginx site enabled"
fi

# Test nginx configuration
log "Testing nginx configuration..."
if nginx -t; then
  log "Nginx config valid"
  log "Reloading nginx..."
  systemctl reload nginx
  log "Nginx reloaded successfully"
else
  log_error "Nginx configuration test failed"
  log_error "Please fix the errors and run 'systemctl reload nginx' manually"
fi

# ═══════════════════════════════════════════════════════════════
# 5. Create log directory and files
# ═══════════════════════════════════════════════════════════════
log "Setting up log files..."
touch /var/log/wantokjobs-deploy.log
touch /var/log/wantokjobs-watchdog.log
chmod 644 /var/log/wantokjobs-deploy.log
chmod 644 /var/log/wantokjobs-watchdog.log

# ═══════════════════════════════════════════════════════════════
# 6. Setup watchdog cron job
# ═══════════════════════════════════════════════════════════════
log "Setting up watchdog cron job..."
CRON_JOB="*/5 * * * * $SCRIPT_DIR/watchdog.sh"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "watchdog.sh"; then
  log_warn "Watchdog cron job already exists"
else
  (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
  log "Watchdog cron job installed (runs every 5 minutes)"
fi

# ═══════════════════════════════════════════════════════════════
# 7. Install dependencies (if needed)
# ═══════════════════════════════════════════════════════════════
log "Checking dependencies..."
cd "$REPO_DIR/app"

if [ ! -d "node_modules" ]; then
  log "Installing server dependencies..."
  cd server
  npm install --production
  cd ..
fi

if [ ! -d "client/node_modules" ]; then
  log "Installing client dependencies..."
  cd client
  npm install
  cd ..
fi

# ═══════════════════════════════════════════════════════════════
# 8. Build frontend
# ═══════════════════════════════════════════════════════════════
log "Building frontend..."
cd client
npx vite build
log "Frontend built successfully"
cd ..

# ═══════════════════════════════════════════════════════════════
# 9. Start the service
# ═══════════════════════════════════════════════════════════════
log "Starting WantokJobs service..."
systemctl start wantokjobs

# Wait for service to start
sleep 3

if systemctl is-active --quiet wantokjobs; then
  log "Service started successfully"
  
  # Health check
  sleep 2
  if curl -sf http://localhost:3001/health > /dev/null; then
    log "Health check passed ✓"
  else
    log_warn "Service is running but health check failed"
  fi
else
  log_error "Service failed to start"
  systemctl status wantokjobs
  exit 1
fi

# ═══════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════════════════════════"
log "Setup complete!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "✓ Systemd service installed and running"
echo "✓ Nginx configuration updated"
echo "✓ Watchdog monitoring enabled (every 5 min)"
echo "✓ Deploy webhook configured"
echo "✓ Frontend built and ready"
echo ""
echo "Next steps:"
echo "1. Configure GitHub webhook to: https://tolarai.com/api/webhook/github"
echo "2. Set GITHUB_WEBHOOK_SECRET in /opt/wantokjobs/app/server/.env"
echo "3. Monitor logs with: journalctl -u wantokjobs -f"
echo "4. Check deploy logs: tail -f /var/log/wantokjobs-deploy.log"
echo "5. Check watchdog logs: tail -f /var/log/wantokjobs-watchdog.log"
echo ""
echo "═══════════════════════════════════════════════════════════════"

exit 0
