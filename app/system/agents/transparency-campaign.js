#!/usr/bin/env node
/**
 * Transparency Marketing Campaign Agent
 * 
 * Generates monthly "State of Transparency" reports for social media
 * Includes:
 * - Month-over-month trends
 * - Best improver of the month
 * - Worst performer
 * - Call to action
 * 
 * Run monthly via cron
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../../server/data/wantokjobs.db');
const db = new Database(dbPath);

console.log('\n=== TRANSPARENCY MARKETING CAMPAIGN ===\n');

const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
const monthShort = new Date().toLocaleDateString('en-US', { month: 'short' });

// Get current stats
const currentStats = db.prepare(`
  SELECT 
    COUNT(*) as total_required,
    COUNT(CASE WHEN transparency_score > 0 THEN 1 END) as with_data,
    AVG(transparency_score) as avg_score,
    COUNT(CASE WHEN transparency_score >= 80 THEN 1 END) as high_scores,
    COUNT(CASE WHEN transparency_score = 0 OR transparency_score IS NULL THEN 1 END) as zero_scores
  FROM profiles_employer
  WHERE transparency_required = 1
`).get();

// Get previous month stats (if available)
const previousStats = db.prepare(`
  SELECT avg_score FROM transparency_monthly_stats
  WHERE month = datetime('now', '-1 month', 'start of month')
`).get();

// Calculate trend
const trend = previousStats 
  ? (currentStats.avg_score > previousStats.avg_score ? 'improving' : 
     currentStats.avg_score < previousStats.avg_score ? 'declining' : 'unchanged')
  : 'baseline';

const trendDiff = previousStats 
  ? Math.abs(currentStats.avg_score - previousStats.avg_score).toFixed(1)
  : 0;

// Get best improver
const bestImprover = db.prepare(`
  SELECT 
    pe.company_name,
    pe.transparency_score as current_score,
    prev.score as previous_score,
    (pe.transparency_score - prev.score) as improvement
  FROM profiles_employer pe
  JOIN (
    SELECT employer_id, score
    FROM transparency_score_history
    WHERE created_at >= datetime('now', '-2 months')
      AND created_at < datetime('now', '-1 month')
  ) prev ON pe.user_id = prev.employer_id
  WHERE pe.transparency_required = 1
    AND (pe.transparency_score - prev.score) > 0
  ORDER BY improvement DESC
  LIMIT 1
`).get();

// Get worst performer (with data)
const worstPerformer = db.prepare(`
  SELECT company_name, transparency_score
  FROM profiles_employer
  WHERE transparency_required = 1
    AND transparency_score > 0
  ORDER BY transparency_score ASC
  LIMIT 1
`).get();

// Get sample zero-score employers
const zeroScoreEmployers = db.prepare(`
  SELECT company_name, employer_type
  FROM profiles_employer
  WHERE transparency_required = 1
    AND (transparency_score = 0 OR transparency_score IS NULL)
  ORDER BY 
    CASE employer_type 
      WHEN 'government' THEN 1 
      ELSE 2 
    END,
    company_name
  LIMIT 5
`).all();

console.log('Current Stats:', currentStats);
console.log('Trend:', trend);
if (bestImprover) console.log('Best Improver:', bestImprover.company_name);
if (worstPerformer) console.log('Worst Performer:', worstPerformer.company_name);

// Generate Facebook post
const facebookPost = `📊 **State of Hiring Transparency — ${month}**\n\n` +
  `PNG's government and public sector employers are being watched. Here's how transparent they were this month:\n\n` +
  `📈 **Overall Score: ${currentStats.avg_score.toFixed(1)}/100** ${trend === 'improving' ? `📈 (+${trendDiff} from last month)` : trend === 'declining' ? `📉 (-${trendDiff} from last month)` : ''}\n\n` +
  `✅ ${currentStats.with_data} of ${currentStats.total_required} employers submitting transparency data\n` +
  `⚫ ${currentStats.zero_scores} employers with ZERO transparency (shame!)\n` +
  `🏆 ${currentStats.high_scores} employers scoring 80+\n\n` +
  (bestImprover ? `**🌟 Best Improver:** ${bestImprover.company_name} — jumped from ${bestImprover.previous_score}/100 to ${bestImprover.current_score}/100. Gutpela wok! 👏\n\n` : '') +
  (worstPerformer ? `**⚠️ Needs Improvement:** ${worstPerformer.company_name} — ${worstPerformer.transparency_score}/100. Jobseekers deserve better.\n\n` : '') +
  (zeroScoreEmployers.length > 0 ? `**⚫ Still No Data:**\n${zeroScoreEmployers.map(e => `• ${e.company_name}`).join('\n')}\n\n` : '') +
  `---\n\n` +
  `**Why This Matters:**\n` +
  `Transparent hiring = fair hiring. When employers hide salary ranges, selection criteria, and processes, it wastes YOUR time and perpetuates inequality.\n\n` +
  `**Demand Transparency:**\n` +
  `🔹 Ask for salary ranges in interviews\n` +
  `🔹 Share this report with your networks\n` +
  `🔹 Apply to transparent employers first\n\n` +
  `The full leaderboard is on WantokJobs.com/transparency/leaderboard 👀\n\n` +
  `#PNGJobs #TransparentHiring #Accountability #WantokJobs 🇵🇬`;

// Generate LinkedIn post
const linkedInPost = `📊 **PNG Hiring Transparency Report — ${month}**\n\n` +
  `Every month, we track hiring transparency across PNG's government and public sector. Here's where we stand:\n\n` +
  `**Key Metrics:**\n` +
  `• Average transparency score: ${currentStats.avg_score.toFixed(1)}/100 ${trend === 'improving' ? '📈' : trend === 'declining' ? '📉' : '→'}\n` +
  `• Employers with data: ${currentStats.with_data}/${currentStats.total_required} (${Math.round(currentStats.with_data / currentStats.total_required * 100)}%)\n` +
  `• High performers (80+): ${currentStats.high_scores}\n` +
  `• Zero-transparency employers: ${currentStats.zero_scores}\n\n` +
  (bestImprover ? `**Best Improver:** ${bestImprover.company_name} improved by ${bestImprover.improvement} points this month. Leadership worth celebrating.\n\n` : '') +
  `**What Transparency Means:**\n` +
  `Transparent employers disclose:\n` +
  `✓ Salary ranges\n` +
  `✓ Clear selection criteria\n` +
  `✓ Hiring timelines\n` +
  `✓ Panel composition\n` +
  `✓ Hiring outcomes\n\n` +
  `**The Bottom Line:**\n` +
  `${trend === 'improving' ? 'We\'re moving in the right direction, but there\'s still work to do.' : 'Progress has stalled. We need stronger accountability.'}\n\n` +
  `See the full leaderboard: wantokjobs.com/transparency/leaderboard\n\n` +
  `#HiringTransparency #PNGJobs #PublicSector #Accountability`;

// Generate Twitter thread
const twitterThread = [
  `📊 PNG HIRING TRANSPARENCY UPDATE — ${monthShort.toUpperCase()} 2026\n\n${currentStats.with_data}/${currentStats.total_required} required employers are submitting data.\n\nAverage score: ${currentStats.avg_score.toFixed(1)}/100 ${trend === 'improving' ? '📈' : trend === 'declining' ? '📉' : '→'}\n\nThread 🧵👇`,
  
  bestImprover 
    ? `🌟 Best Improver: ${bestImprover.company_name}\n\nWent from ${bestImprover.previous_score}/100 → ${bestImprover.current_score}/100\n\nThis is what accountability looks like. 👏`
    : '',
  
  `⚫ ${currentStats.zero_scores} employers still have ZERO transparency data.\n\nThat means:\n• No salary disclosed\n• No selection criteria\n• No hiring outcomes\n\nJobseekers deserve better. 🚩`,
  
  `What makes transparent hiring?\n\n✅ Salary range disclosed\n✅ Clear selection criteria\n✅ Timeline provided\n✅ Panel composition listed\n✅ Outcomes published\n\nThis isn't optional for government — it's accountability.`,
  
  `See the full leaderboard:\nwantokjobs.com/transparency/leaderboard\n\nDemand transparency from your employer. Share this thread. Yumi wok bung! 🇵🇬\n\n#PNGJobs #Transparency`,
].filter(Boolean).map((t, i, arr) => `[${i + 1}/${arr.length}] ${t}`).join('\n\n---\n\n');

// Generate WhatsApp message
const whatsappMessage = `*State of Transparency — ${monthShort}*\n\n` +
  `📊 Average score: ${currentStats.avg_score.toFixed(1)}/100 ${trend === 'improving' ? '📈' : '📉'}\n` +
  `✅ ${currentStats.with_data}/${currentStats.total_required} submitting data\n` +
  `⚫ ${currentStats.zero_scores} with ZERO transparency\n\n` +
  (bestImprover ? `🌟 ${bestImprover.company_name} improved most\n\n` : '') +
  `Full leaderboard: wantokjobs.com/transparency/leaderboard\n\n` +
  `Transparency = Accountability 🇵🇬`;

// Save to marketing_posts table
console.log('\nSaving campaign posts...');

const insertPost = db.prepare(`
  INSERT INTO marketing_posts (platform, content, report_type, status, created_at)
  VALUES (?, ?, 'transparency_campaign', 'pending', datetime('now'))
`);

const postsCreated = db.transaction(() => {
  insertPost.run('facebook', facebookPost);
  insertPost.run('linkedin', linkedInPost);
  insertPost.run('twitter', twitterThread);
  insertPost.run('whatsapp', whatsappMessage);
});

postsCreated();

// Save monthly stats for trend tracking
db.exec(`
  CREATE TABLE IF NOT EXISTS transparency_monthly_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month TEXT NOT NULL,
    avg_score REAL,
    total_required INTEGER,
    with_data INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

db.prepare(`
  INSERT INTO transparency_monthly_stats (month, avg_score, total_required, with_data)
  VALUES (datetime('now', 'start of month'), ?, ?, ?)
`).run(currentStats.avg_score, currentStats.total_required, currentStats.with_data);

console.log('\n✅ Campaign posts created:');
console.log('  • Facebook');
console.log('  • LinkedIn');
console.log('  • Twitter');
console.log('  • WhatsApp');

db.close();
console.log('\n✅ Campaign complete!\n');
