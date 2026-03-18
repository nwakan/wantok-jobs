#!/bin/bash
set -e
if [ 0 -ne 3 ]; then
    echo "Usage: -bash <subdomain> <absolute-app-root> <backend-port>"
    exit 1
fi
SUBDOMAIN=
APPROOT=
PORT=
CONF=/etc/nginx/sites-available/.conf
TEMPLATE=/a0/usr/projects/project_1_-_wantokjobs/app/app/vps-scripts/nginx-subdomain-template.conf
sed "s|$1||g;s|$2||g;s|$3||g"  > 
ln -sf  /etc/nginx/sites-enabled/.conf
echo "Reloading nginx..."
nginx -s reload
echo "Subdomain  onboarded with static root /client/dist and backend on :"
