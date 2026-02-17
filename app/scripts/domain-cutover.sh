#!/bin/bash
# Domain cutover: tolarai.com → wantokjobs.com
# Run on VPS as root. Feb 22, 3AM MYT planned.
#
# Prerequisites:
#   1. DNS: wantokjobs.com A record → 76.13.190.157 (set in Cloudflare)
#   2. SSL cert for wantokjobs.com (Cloudflare handles this if proxied)
#
# What this does:
#   1. Creates Nginx config for wantokjobs.com
#   2. Adds redirect from tolarai.com → wantokjobs.com
#   3. Tests and reloads Nginx

set -euo pipefail

echo "=== WantokJobs Domain Cutover ==="
echo "From: tolarai.com → To: wantokjobs.com"
echo ""

# Backup existing config
cp /etc/nginx/sites-available/tolarai /etc/nginx/sites-available/tolarai.bak

# Create wantokjobs.com config
cat > /etc/nginx/sites-available/wantokjobs << 'NGINX'
# WantokJobs.com - Production
server {
    listen 80;
    server_name wantokjobs.com www.wantokjobs.com;

    # Redirect HTTP → HTTPS (handled by Cloudflare if proxied)
    # If using Cloudflare proxy, this block serves as origin
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass $http_upgrade;
    }

    # API with rate limiting
    location /api {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot)$ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    # Security headers
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    client_max_body_size 10m;
}

# tolarai.com → redirect to wantokjobs.com
server {
    listen 80;
    listen 443 ssl;
    server_name tolarai.com www.tolarai.com;

    ssl_certificate /etc/nginx/ssl/tolarai.crt;
    ssl_certificate_key /etc/nginx/ssl/tolarai.key;

    return 301 https://wantokjobs.com$request_uri;
}
NGINX

# Enable new config
ln -sf /etc/nginx/sites-available/wantokjobs /etc/nginx/sites-enabled/wantokjobs
rm -f /etc/nginx/sites-enabled/tolarai

# Test config
echo "Testing Nginx config..."
nginx -t

echo ""
echo "Reloading Nginx..."
nginx -s reload

echo ""
echo "✅ Domain cutover complete!"
echo "   wantokjobs.com → active"
echo "   tolarai.com → 301 redirect to wantokjobs.com"
echo ""
echo "Don't forget:"
echo "  1. Update .env SITE_URL=https://wantokjobs.com"
echo "  2. Update sitemap.xml base URL"
echo "  3. Submit new sitemap to Google Search Console"
echo "  4. Update social media links"
