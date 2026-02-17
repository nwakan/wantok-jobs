#!/usr/bin/env node
/**
 * Clean job descriptions: strip HTML artifacts, normalize formatting
 */

const db = require('../server/database');

const jobs = db.prepare("SELECT id, title, description FROM jobs WHERE status = 'active' AND description IS NOT NULL").all();
console.log(`Processing ${jobs.length} job descriptions...`);

function cleanDescription(desc) {
  if (!desc) return desc;
  let d = desc;
  
  // Remove HTML tags but preserve structure
  d = d.replace(/<br\s*\/?>/gi, '\n');
  d = d.replace(/<\/p>/gi, '\n\n');
  d = d.replace(/<\/div>/gi, '\n');
  d = d.replace(/<\/li>/gi, '\n');
  d = d.replace(/<li[^>]*>/gi, '• ');
  d = d.replace(/<\/h[1-6]>/gi, '\n\n');
  d = d.replace(/<h[1-6][^>]*>/gi, '');
  d = d.replace(/<\/?(?:strong|b)>/gi, '');
  d = d.replace(/<\/?(?:em|i)>/gi, '');
  d = d.replace(/<\/?(?:ul|ol)>/gi, '\n');
  d = d.replace(/<\/?(?:span|font|a|table|tr|td|th|tbody|thead)[^>]*>/gi, '');
  d = d.replace(/<[^>]+>/g, ''); // Remove remaining tags
  
  // Decode HTML entities
  d = d.replace(/&amp;/g, '&');
  d = d.replace(/&lt;/g, '<');
  d = d.replace(/&gt;/g, '>');
  d = d.replace(/&quot;/g, '"');
  d = d.replace(/&#0?39;/g, "'");
  d = d.replace(/&nbsp;/g, ' ');
  d = d.replace(/&mdash;/g, '—');
  d = d.replace(/&ndash;/g, '–');
  d = d.replace(/&bull;/g, '•');
  d = d.replace(/&rsquo;/g, "'");
  d = d.replace(/&lsquo;/g, "'");
  d = d.replace(/&rdquo;/g, '"');
  d = d.replace(/&ldquo;/g, '"');
  d = d.replace(/&#\d+;/g, '');
  
  // Clean up whitespace
  d = d.replace(/\r\n/g, '\n');
  d = d.replace(/[ \t]+/g, ' ');
  d = d.replace(/ *\n */g, '\n');
  d = d.replace(/\n{3,}/g, '\n\n');
  
  // Normalize bullet points
  d = d.replace(/^[-*]\s/gm, '• ');
  d = d.replace(/^\s*[oO]\s+/gm, '• ');
  
  // Remove leading/trailing whitespace
  d = d.trim();
  
  return d;
}

const update = db.prepare('UPDATE jobs SET description = ? WHERE id = ?');

const tx = db.transaction(() => {
  let cleaned = 0;
  for (const job of jobs) {
    const clean = cleanDescription(job.description);
    if (clean !== job.description) {
      update.run(clean, job.id);
      cleaned++;
    }
  }
  return cleaned;
});

const cleaned = tx();
console.log(`Cleaned ${cleaned} job descriptions.`);
