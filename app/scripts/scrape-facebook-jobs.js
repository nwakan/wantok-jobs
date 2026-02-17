#!/usr/bin/env node
/**
 * Scrape job posts from PNG company Facebook pages.
 *
 * Facebook requires authentication for most access, so this script supports
 * multiple modes:
 *
 *   1. Direct fetch (tries mobile UA on facebook.com - may be blocked)
 *   2. HTML file input: place downloaded HTML in scripts/fb-pages/ directory
 *      e.g. scripts/fb-pages/BSPFinancialGroupLimited.html
 *   3. Can be extended with puppeteer/playwright if a browser is available
 *
 * Usage:
 *   node scripts/scrape-facebook-jobs.js              # try direct fetch
 *   node scripts/scrape-facebook-jobs.js --from-files  # read from fb-pages/
 */
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const db = require('../server/database');

const JOB_KEYWORDS = /\b(vacanc|position|hiring|apply|job|career|recruit|opportunit|wok\b|role|application|closing date|deadline)/i;

const PAGES = [
  { slug: 'BSPFinancialGroupLimited', company: 'BSP Financial Group' },
  { slug: 'digicelPNG', company: 'Digicel PNG' },
  { slug: 'PNGAir', company: 'PNG Air' },
  { slug: 'OkTediMining', company: 'Ok Tedi Mining' },
  { slug: 'KumulPetroleum', company: 'Kumul Petroleum' },
  { slug: 'CPLGroupPNG', company: 'CPL Group PNG' },
  { slug: 'NDBpng', company: 'National Development Bank PNG' },
  { slug: 'SteamshipsTC', company: 'Steamships Trading Company' },
  { slug: 'NASFUND', company: 'NASFUND' },
  { slug: 'PNGJobs', company: 'PNG Jobs' },
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const loc = res.headers.location;
        // If redirected to login, that means we're blocked
        if (loc.includes('/login')) {
          resolve({ blocked: true, html: '' });
          return;
        }
        return fetchUrl(loc.startsWith('/') ? new URL(loc, url).href : loc).then(resolve, reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ blocked: false, html: data }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#x27;/g, "'")
    .replace(/&#\d+;/g, '').replace(/[ \t]+/g, ' ')
    .split('\n').map(l => l.trim()).filter(Boolean).join('\n')
    .trim();
}

/**
 * Extract posts from Facebook page HTML.
 * Works with various FB HTML formats (mbasic, mobile, desktop).
 */
function extractPosts(html) {
  const posts = [];

  // Strategy 1: mbasic.facebook.com - posts are in <div> with story_body_container or similar
  // Strategy 2: m.facebook.com - posts in data-ft divs
  // Strategy 3: generic - look for large text blocks between common delimiters

  // Try to find post blocks - Facebook uses various class names
  const postPatterns = [
    // mbasic posts
    /<div[^>]*class="[^"]*(?:story_body_container|_5rgt)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi,
    // mobile posts
    /<div[^>]*data-ft[^>]*>([\s\S]*?)(?=<div[^>]*data-ft|<footer|$)/gi,
    // article tags
    /<article[^>]*>([\s\S]*?)<\/article>/gi,
    // userContent divs
    /<div[^>]*class="[^"]*userContent[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
  ];

  for (const pattern of postPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const text = stripHtml(match[1]);
      if (text.length > 30) {
        posts.push(text);
      }
    }
    if (posts.length > 0) break;
  }

  // Fallback: split on <hr> or timeline separators and filter for substantial blocks
  if (posts.length === 0) {
    const blocks = html.split(/<hr\b[^>]*>|class="[^"]*(?:separator|divider)[^"]*"/i);
    for (const block of blocks) {
      const text = stripHtml(block);
      if (text.length > 100 && text.length < 5000) {
        posts.push(text);
      }
    }
  }

  return posts;
}

/**
 * Extract a title from post text (first line or first sentence).
 */
function extractTitle(text) {
  const lines = text.split('\n').filter(l => l.trim().length > 5);
  if (!lines.length) return null;

  let title = lines[0].trim();
  // If first line is very long, try to extract a shorter title
  if (title.length > 120) {
    const sentEnd = title.search(/[.!?]/);
    if (sentEnd > 10 && sentEnd < 120) {
      title = title.slice(0, sentEnd + 1);
    } else {
      title = title.slice(0, 100) + '...';
    }
  }
  return title;
}

/**
 * Try to extract a post URL from the HTML near a post.
 */
function extractPostUrls(html) {
  const urls = [];
  const re = /href="(\/(?:story\.php|permalink\.php)[^"]+|\/[^/]+\/posts\/[^"]+)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = 'https://www.facebook.com' + m[1].replace(/&amp;/g, '&');
    if (!urls.includes(url)) urls.push(url);
  }
  return urls;
}

function guessCategory(title) {
  const t = title.toLowerCase();
  if (/engineer|mechanic|electrical/i.test(t)) return { slug: 'engineering', id: 8 };
  if (/accountant|financ|audit/i.test(t)) return { slug: 'accounting', id: 1 };
  if (/admin|secretary|clerk/i.test(t)) return { slug: 'administration', id: 2 };
  if (/manag|director|executive|ceo/i.test(t)) return { slug: 'management-and-executive', id: 15 };
  if (/health|nurse|doctor|medical/i.test(t)) return { slug: 'health-and-medical', id: 10 };
  if (/teach|education|lecturer|trainer/i.test(t)) return { slug: 'education-and-training', id: 7 };
  if (/driver|logistics|warehouse|supply/i.test(t)) return { slug: 'manufacturing-and-logistics', id: 16 };
  if (/security|guard/i.test(t)) return { slug: 'security', id: 20 };
  if (/mining|geolog/i.test(t)) return { slug: 'mining-and-resources', id: 18 };
  if (/sale|marketing/i.test(t)) return { slug: 'marketing-and-sales', id: 17 };
  if (/it |software|developer|tech/i.test(t)) return { slug: 'ict-and-technology', id: 12 };
  if (/legal|law/i.test(t)) return { slug: 'legal-and-law', id: 14 };
  if (/hotel|tourism|hospitality|chef|cook/i.test(t)) return { slug: 'hospitality-and-tourism', id: 11 };
  if (/hr|human resource|recruit/i.test(t)) return { slug: 'hr-and-recruitment', id: 13 };
  if (/construct|building|carpenter|plumber/i.test(t)) return { slug: 'construction-and-trades', id: 6 };
  if (/bank/i.test(t)) return { slug: 'banking-and-finance', id: 3 };
  return { slug: 'administration', id: 2 };
}

// Get existing facebook-sourced jobs for dedup
function getExistingKeys() {
  const existing = new Set();
  try {
    db.prepare("SELECT title, company_name FROM jobs WHERE source='facebook'").all()
      .forEach(j => existing.add((j.title + '||' + (j.company_name || '')).toLowerCase()));
  } catch (e) { /* table may not exist yet */ }
  return existing;
}

const insert = db.prepare(`
  INSERT INTO jobs (title, description, requirements, location, country, job_type, experience_level,
    salary_currency, status, source, external_url, employer_id, company_name,
    category_slug, category_id, created_at, updated_at)
  VALUES (@title, @description, @requirements, @location, 'Papua New Guinea', @job_type, 'Mid-level',
    'PGK', 'active', 'facebook', @external_url, 11, @company_name,
    @category_slug, @category_id, datetime('now'), datetime('now'))
`);

async function processPage(pageInfo, html, existing) {
  const posts = extractPosts(html);
  const postUrls = extractPostUrls(html);
  let added = 0;

  console.log(`  Found ${posts.length} text blocks in ${pageInfo.slug}`);

  for (let i = 0; i < posts.length; i++) {
    const text = posts[i];
    if (!JOB_KEYWORDS.test(text)) continue;

    const title = extractTitle(text);
    if (!title) continue;

    const key = (title + '||' + pageInfo.company).toLowerCase();
    if (existing.has(key)) continue;

    const url = postUrls[i] || `https://www.facebook.com/${pageInfo.slug}`;
    const cat = guessCategory(title);

    // Detect job type from text
    const ftMatch = text.match(/(full[- ]?time|part[- ]?time|contract|casual)/i);
    const job_type = ftMatch ? ftMatch[1].toLowerCase().replace(/\s+/g, '-') : 'full-time';

    // Detect location from text
    const locMatch = text.match(/(?:location|based in|located at)[:\s]+([A-Za-z\s,]+?)(?:\.|,|\n|$)/i);
    const location = locMatch ? locMatch[1].trim() : 'Papua New Guinea';

    insert.run({
      title,
      description: text.slice(0, 3000),
      requirements: '',
      location,
      job_type,
      external_url: url,
      company_name: pageInfo.company,
      category_slug: cat.slug,
      category_id: cat.id,
    });

    existing.add(key);
    added++;
    console.log(`    + ${title}`);
  }

  return added;
}

async function scrapeFromFiles() {
  const dir = path.join(__dirname, 'fb-pages');
  if (!fs.existsSync(dir)) {
    console.log('No fb-pages/ directory found. Create it and add HTML files.');
    console.log('Files should be named like: BSPFinancialGroupLimited.html');
    fs.mkdirSync(dir, { recursive: true });
    return;
  }

  const existing = getExistingKeys();
  let totalAdded = 0;

  for (const page of PAGES) {
    const filePath = path.join(dir, `${page.slug}.html`);
    if (!fs.existsSync(filePath)) {
      console.log(`  Skip ${page.slug} - no HTML file`);
      continue;
    }

    console.log(`Processing ${page.company} from file...`);
    const html = fs.readFileSync(filePath, 'utf8');
    totalAdded += await processPage(page, html, existing);
  }

  console.log(`\nTotal added from files: ${totalAdded}`);
}

async function scrapeDirect() {
  const existing = getExistingKeys();
  let totalAdded = 0;
  let blocked = 0;

  for (const page of PAGES) {
    console.log(`Fetching ${page.company} (${page.slug})...`);
    try {
      await new Promise(r => setTimeout(r, 2000)); // Rate limit

      // Try different Facebook URLs
      const urls = [
        `https://www.facebook.com/${page.slug}`,
        `https://m.facebook.com/${page.slug}`,
        `https://mbasic.facebook.com/${page.slug}`,
      ];

      let html = '';
      let wasBlocked = true;

      for (const url of urls) {
        try {
          const result = await fetchUrl(url);
          if (!result.blocked && result.html.length > 1000 && !result.html.includes('login_form')) {
            html = result.html;
            wasBlocked = false;
            console.log(`  ✓ Got content from ${url} (${html.length} bytes)`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (wasBlocked) {
        console.log(`  ✗ ${page.slug} - blocked (login required)`);
        blocked++;
        continue;
      }

      totalAdded += await processPage(page, html, existing);
    } catch (err) {
      console.error(`  ✗ Error: ${err.message}`);
    }
  }

  console.log(`\nDone! Added: ${totalAdded}, Blocked: ${blocked}/${PAGES.length}`);
  if (blocked > 0) {
    console.log('\nFacebook requires authentication for page access.');
    console.log('To use file-based mode:');
    console.log('  1. Save page HTML to scripts/fb-pages/<slug>.html');
    console.log('  2. Run: node scripts/scrape-facebook-jobs.js --from-files');
  }
}

const mode = process.argv.includes('--from-files') ? 'files' : 'direct';
console.log(`Facebook Job Scraper - mode: ${mode}`);
console.log(`Pages: ${PAGES.length}\n`);

(mode === 'files' ? scrapeFromFiles() : scrapeDirect()).catch(err => {
  console.error('Scrape failed:', err);
  process.exit(1);
});
