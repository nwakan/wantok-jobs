# UptimeRobot Setup Guide for WantokJobs

**Date**: 2026-03-22
**Service**: WantokJobs Production Monitoring
**Owner**: Nick Wakan

## Overview

UptimeRobot provides external uptime monitoring with instant alerts when the site goes down.

## Setup Instructions

### 1. Create Account

1. Go to https://uptimerobot.com/
2. Sign up with email: nick.wakan@gmail.com (or admin email)
3. Verify email and log in

### 2. Add Monitors (Free Tier: 50 monitors, 5-minute intervals)

#### Monitor 1: WantokJobs Main Domain

- **Monitor Type**: HTTP(s)
- **Friendly Name**: WantokJobs Production (wantokjobs.com)
- **URL**: https://wantokjobs.com/api/health
- **Monitoring Interval**: 5 minutes (free tier)
- **Monitor Timeout**: 30 seconds
- **Alert Contacts**: Add email (nick.wakan@gmail.com)
- **Keyword Monitoring**: Optional - check for "ok" in response
- **Click "Create Monitor"**

#### Monitor 2: Alt Domain

- **Monitor Type**: HTTP(s)
- **Friendly Name**: WantokJobs Alt Domain (wantokjobs.com)
- **URL**: https://wantokjobs.com/api/health
- **Monitoring Interval**: 5 minutes
- **Monitor Timeout**: 30 seconds
- **Alert Contacts**: nick.wakan@gmail.com
- **Click "Create Monitor"**

#### Monitor 3: Legacy Domain

- **Monitor Type**: HTTP(s)
- **Friendly Name**: WantokJobs Legacy (jobs.wantokjobs.com)
- **URL**: https://jobs.wantokjobs.com/api/health
- **Monitoring Interval**: 5 minutes
- **Monitor Timeout**: 30 seconds
- **Alert Contacts**: nick.wakan@gmail.com
- **Click "Create Monitor"**

### 3. Configure Alert Channels

#### Email Alerts (Default)

- Already configured with signup email
- Alerts sent when:
  - Site goes down (3 consecutive checks fail)
  - Site comes back up

#### SMS Alerts (Optional - Paid Feature)

- Requires Pro plan ($7/month)
- Add mobile number for critical alerts

#### Webhook Alerts (Advanced - Optional)

- **Webhook URL**: https://wantokjobs.com/api/webhook/uptime
- Can trigger automated recovery actions
- Requires backend implementation

### 4. Public Status Page (Optional)

Create a public status page for transparency:

1. Go to "Status Pages" in UptimeRobot dashboard
2. Click "Add Status Page"
3. Configure:
   - **Name**: WantokJobs System Status
   - **Custom Domain**: status.wantokjobs.com (requires DNS setup)
   - **Monitors**: Select all 3 monitors
   - **Show Response Times**: Yes
   - **Show Uptime Percentage**: Yes
4. Click "Create Status Page"

#### DNS Setup for Status Page (if using custom domain)

```bash
# Add CNAME record in Cloudflare:
status.wantokjobs.com  →  stats.uptimerobot.com
```

### 5. Verification

After setup, verify monitors are working:

1. Check UptimeRobot dashboard
2. All monitors should show "Up" status (green)
3. Response times should be <500ms
4. Test alert by temporarily stopping service:
   ```bash
   sudo systemctl stop wantokjobs.service
   # Wait 15 minutes for 3 failed checks
   # Verify email alert received
   sudo systemctl start wantokjobs.service
   # Wait 5 minutes
   # Verify "back online" email
   ```

## Expected Behavior

### Normal Operation

- All monitors: ✅ Up (green)
- Response time: 50-300ms
- Uptime: 99%+
- No alerts

### Downtime Alert

- Email subject: "WantokJobs Production (wantokjobs.com) is DOWN"
- Email body: Reason, timestamp, last uptime
- Alert sent after 3 consecutive failures (15 minutes on free tier)

### Recovery Alert

- Email subject: "WantokJobs Production (wantokjobs.com) is UP"
- Email body: Downtime duration, timestamp

## Monitoring Best Practices

1. **Check health endpoint regularly**: Ensure /api/health returns valid JSON
2. **Monitor response times**: Investigate if >1 second
3. **Review uptime trends**: Monthly reports in UptimeRobot dashboard
4. **Set up multiple contacts**: Add backup email/SMS
5. **Test alerts quarterly**: Verify notification system works

## Alternative Free Monitoring Services

If UptimeRobot limits are reached:

- **BetterUptime**: 10 monitors, 30-second intervals (free)
- **Freshping**: 50 monitors, 1-minute intervals (free)
- **StatusCake**: 10 monitors, 5-minute intervals (free)
- **Pingdom** (Solarwinds): 1 monitor (free trial)

## Current Monitoring Stack

**Internal (VPS)**:
- ✅ Watchdog script (5-minute health checks, auto-restart)
- ✅ Disk alerts (6-hour intervals, 85% threshold)
- ✅ Guardian health-monitor (5-minute intervals)

**External (Recommended - UptimeRobot)**:
- ⏳ Pending setup
- Monitors: wantokjobs.com, wantokjobs.com, jobs.wantokjobs.com
- Alerts: Email (nick.wakan@gmail.com)

## Support

- UptimeRobot Docs: https://uptimerobot.com/docs
- Support: support@uptimerobot.com
- Status: https://status.uptimerobot.com

---

**Setup Status**: 📋 Documentation created, awaiting manual setup
**Next Action**: Owner to create UptimeRobot account and configure monitors
