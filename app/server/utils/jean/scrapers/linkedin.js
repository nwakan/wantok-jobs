/**
 * LinkedIn Profile Scraper
 * Uses Puppeteer (available on VPS) to scrape public LinkedIn profiles.
 * Falls back gracefully if Puppeteer unavailable (sandbox/dev).
 */

const logger = require('../../../utils/logger');

let puppeteer = null;
try {
  puppeteer = require('puppeteer-core');
} catch (e) {
  try { puppeteer = require('puppeteer'); } catch (e2) {}
}

const CHROME_PATH = process.env.CHROME_PATH || '/usr/bin/google-chrome-stable';
const SCRAPE_TIMEOUT = 30000;

/**
 * Scrape a public LinkedIn profile
 * @param {string} url - LinkedIn profile URL
 * @param {object} db - Database instance (for caching)
 * @returns {object} Extracted profile data
 */
async function scrapeProfile(url, db) {
  // Normalize URL
  if (!url.startsWith('http')) url = 'https://' + url;
  if (!url.includes('linkedin.com')) throw new Error('Not a LinkedIn URL');

  // Check cache
  if (db) {
    try {
      const cached = db.prepare('SELECT data, fetched_at FROM jean_linkedin_cache WHERE url = ?').get(url);
      if (cached) {
        const age = Date.now() - new Date(cached.fetched_at).getTime();
        if (age < 24 * 60 * 60 * 1000) { // 24 hour cache
          return { ...JSON.parse(cached.data), cached: true };
        }
      }
    } catch (e) {}
  }

  // Check rate limit
  if (db) {
    try {
      const hourlyCount = db.prepare(`
        SELECT COUNT(*) as c FROM jean_linkedin_cache 
        WHERE fetched_at >= datetime('now', '-1 hour')
      `).get().c;
      const maxHourly = parseInt(db.prepare("SELECT value FROM jean_settings WHERE key = 'max_linkedin_scrapes_hourly'").get()?.value || '10');
      if (hourlyCount >= maxHourly) {
        throw new Error('LinkedIn scrape rate limit reached. Try again later.');
      }
    } catch (e) {
      if (e.message.includes('rate limit')) throw e;
    }
  }

  if (!puppeteer) {
    throw new Error('Puppeteer not available. LinkedIn import requires the VPS environment.');
  }

  let browser = null;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      timeout: 15000,
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    // Block images/media for speed
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'media', 'font'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: SCRAPE_TIMEOUT });

    // Check if it's a company or personal profile
    const isCompany = url.includes('/company/');

    let data;
    if (isCompany) {
      data = await scrapeCompanyPage(page);
    } else {
      data = await scrapePersonalPage(page);
    }

    data.source_url = url;
    data.scraped_at = new Date().toISOString();

    // Cache result
    if (db) {
      try {
        db.prepare('INSERT OR REPLACE INTO jean_linkedin_cache (url, data, fetched_at) VALUES (?, ?, datetime("now"))').run(url, JSON.stringify(data));
      } catch (e) {}
    }

    return data;

  } catch (error) {
    logger.error('LinkedIn scrape error', { url, error: error.message });
    throw new Error(`Could not access LinkedIn profile: ${error.message}`);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

async function scrapePersonalPage(page) {
  const data = {
    type: 'person',
    name: '',
    headline: '',
    location: '',
    bio: '',
    skills: [],
    work_history: [],
    education: [],
    profile_photo_url: null,
  };

  try {
    // Name
    data.name = await page.$eval('h1', el => el.textContent.trim()).catch(() => '');
    
    // Headline
    data.headline = await page.$eval('.text-body-medium', el => el.textContent.trim()).catch(() => '');
    if (!data.headline) {
      data.headline = await page.$eval('[data-generated-suggestion-target]', el => el.textContent.trim()).catch(() => '');
    }

    // Location
    data.location = await page.$eval('.text-body-small.inline', el => el.textContent.trim()).catch(() => '');

    // Bio/About
    data.bio = await page.$eval('#about ~ div .inline-show-more-text', el => el.textContent.trim()).catch(() => '');
    if (!data.bio) {
      data.bio = await page.$eval('section.pv-about-section p', el => el.textContent.trim()).catch(() => '');
    }

    // Experience
    const experiences = await page.$$eval('#experience ~ div ul > li', (items) => {
      return items.slice(0, 10).map(item => {
        const title = item.querySelector('.t-bold span')?.textContent?.trim() || '';
        const company = item.querySelector('.t-normal span')?.textContent?.trim() || '';
        const period = item.querySelector('.t-black--light span')?.textContent?.trim() || '';
        const desc = item.querySelector('.inline-show-more-text')?.textContent?.trim() || '';
        return { title, company, period, description: desc };
      });
    }).catch(() => []);

    for (const exp of experiences) {
      const dates = exp.period.match(/(\w+\s*\d{4})\s*[-–]\s*(\w+\s*\d{4}|Present)/i);
      data.work_history.push({
        title: exp.title,
        company: exp.company.replace(/^·\s*/, ''),
        start_date: dates ? dates[1] : '',
        end_date: dates ? dates[2] : '',
        description: exp.description.substring(0, 500),
      });
    }

    // Education
    const eduItems = await page.$$eval('#education ~ div ul > li', (items) => {
      return items.slice(0, 5).map(item => {
        const institution = item.querySelector('.t-bold span')?.textContent?.trim() || '';
        const degree = item.querySelector('.t-normal span')?.textContent?.trim() || '';
        const period = item.querySelector('.t-black--light span')?.textContent?.trim() || '';
        return { institution, degree, period };
      });
    }).catch(() => []);

    for (const edu of eduItems) {
      const year = edu.period.match(/\d{4}/)?.[0] || '';
      data.education.push({
        degree: edu.degree,
        institution: edu.institution,
        year,
      });
    }

    // Skills (from skills section)
    data.skills = await page.$$eval('#skills ~ div ul li .t-bold span', (els) => {
      return els.slice(0, 20).map(el => el.textContent.trim());
    }).catch(() => []);

    // Profile photo
    data.profile_photo_url = await page.$eval('img.pv-top-card-profile-picture__image', el => el.src).catch(() => null);

  } catch (error) {
    logger.warn('LinkedIn parse warning', { error: error.message });
  }

  return data;
}

async function scrapeCompanyPage(page) {
  const data = {
    type: 'company',
    company_name: '',
    industry: '',
    company_size: '',
    location: '',
    website: '',
    description: '',
    logo_url: null,
  };

  try {
    data.company_name = await page.$eval('h1', el => el.textContent.trim()).catch(() => '');
    data.industry = await page.$eval('.org-top-card-summary-info-list__info-item', el => el.textContent.trim()).catch(() => '');
    data.description = await page.$eval('.org-about-us-organization-description__text', el => el.textContent.trim()).catch(() => '');

    // Company size and location from info list
    const infoItems = await page.$$eval('.org-top-card-summary-info-list__info-item', els => els.map(el => el.textContent.trim())).catch(() => []);
    for (const item of infoItems) {
      if (/employees/i.test(item)) data.company_size = item;
      if (/,/.test(item) && !/employees/i.test(item)) data.location = item;
    }

    data.website = await page.$eval('a[data-control-name="top_card_website"]', el => el.href).catch(() => '');
    data.logo_url = await page.$eval('.org-top-card-primary-content__logo', el => el.src).catch(() => null);

  } catch (error) {
    logger.warn('LinkedIn company parse warning', { error: error.message });
  }

  return data;
}

/**
 * Convert scraped LinkedIn data to WantokJobs profile fields
 */
function toJobseekerProfile(linkedinData) {
  return {
    headline: linkedinData.headline || null,
    location: linkedinData.location || null,
    bio: linkedinData.bio || null,
    skills: linkedinData.skills?.length ? JSON.stringify(linkedinData.skills) : null,
    work_history: linkedinData.work_history?.length ? JSON.stringify(linkedinData.work_history) : null,
    education: linkedinData.education?.length ? JSON.stringify(linkedinData.education) : null,
    profile_photo_url: linkedinData.profile_photo_url || null,
  };
}

function toEmployerProfile(linkedinData) {
  return {
    company_name: linkedinData.company_name || null,
    industry: linkedinData.industry || null,
    company_size: linkedinData.company_size || null,
    location: linkedinData.location || null,
    website: linkedinData.website || null,
    description: linkedinData.description || null,
    logo_url: linkedinData.logo_url || null,
  };
}

function formatLinkedinSummary(data) {
  const parts = [];
  if (data.type === 'person') {
    if (data.name) parts.push(`👤 **${data.name}**`);
    if (data.headline) parts.push(data.headline);
    if (data.location) parts.push(`📍 ${data.location}`);
    if (data.bio) parts.push(`\n📝 ${data.bio.substring(0, 200)}${data.bio.length > 200 ? '...' : ''}`);
    if (data.work_history?.length) {
      parts.push(`\n💼 **Work History** (${data.work_history.length}):`);
      for (const w of data.work_history.slice(0, 3)) {
        parts.push(`• ${w.title} at ${w.company} (${w.start_date}–${w.end_date})`);
      }
      if (data.work_history.length > 3) parts.push(`  ...and ${data.work_history.length - 3} more`);
    }
    if (data.education?.length) {
      parts.push(`\n🎓 **Education** (${data.education.length}):`);
      for (const e of data.education.slice(0, 2)) {
        parts.push(`• ${e.degree} — ${e.institution} ${e.year}`);
      }
    }
    if (data.skills?.length) {
      parts.push(`\n🛠️ **Skills:** ${data.skills.slice(0, 10).join(', ')}${data.skills.length > 10 ? '...' : ''}`);
    }
  } else {
    if (data.company_name) parts.push(`🏢 **${data.company_name}**`);
    if (data.industry) parts.push(`Industry: ${data.industry}`);
    if (data.company_size) parts.push(`Size: ${data.company_size}`);
    if (data.location) parts.push(`📍 ${data.location}`);
    if (data.website) parts.push(`🌐 ${data.website}`);
    if (data.description) parts.push(`\n📝 ${data.description.substring(0, 200)}...`);
  }
  return parts.join('\n');
}

module.exports = { scrapeProfile, toJobseekerProfile, toEmployerProfile, formatLinkedinSummary };
