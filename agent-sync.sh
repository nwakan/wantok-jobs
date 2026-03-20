#!/bin/bash
# Agent Zero sync script - commit changes, push to GitHub, restart service
# Usage: bash agent-sync.sh push "commit message"
cd /opt/wantokjobs/app
MSG="${2:-auto-sync $(date +%Y-%m-%d_%H:%M)}"
git add -A
if git diff --staged --quiet; then
  echo "Nothing to commit"
else
  git commit -m "$MSG"
  echo "Committed: $MSG"
fi
export GIT_SSH_COMMAND="ssh -i /root/.ssh/github_deploy_key -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
git push origin main && echo "Pushed to GitHub" || echo "Push failed"
systemctl restart wantokjobs && echo "Service restarted"
echo "Sync complete!"
