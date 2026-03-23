#!/usr/bin/env node
/**
 * WantokJobs Master Job Scraper
 * Runs employer website scrapers only (NOT job boards)
 * 
 * Scrapers:
 * - scrape-companies.js (7 employer career pages)
 * 
 * Schedule: Daily at 6:00 AM PNG time
 * 
 * NOTE: Job board scrapers (PNGWorkforce, Pacific Jobs, etc.) are DISABLED
 * per user directive 2026-03-23. Only scrape direct employer websites.
 */

const { execSync } = require('child_process');
const path = require('path');

const SCRAPERS = [
  'scrape-companies.js'  // ✅ Employer websites only (7 companies)
];

const runScraper = (scriptName) => {
  const scriptPath = path.join(__dirname, scriptName);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running: ${scriptName}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('='.repeat(60));
  
  try {
    const output = execSync(`node ${scriptPath}`, {
      cwd: __dirname,
      encoding: 'utf8',
      timeout: 300000, // 5 minutes max per scraper
      stdio: 'pipe'
    });
    console.log(output);
    console.log(`✅ ${scriptName} completed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ ${scriptName} failed:`);
    console.error(error.message);
    if (error.stdout) console.log('STDOUT:', error.stdout);
    if (error.stderr) console.error('STDERR:', error.stderr);
    return false;
  }
};

const main = async () => {
  console.log('🤖 WantokJobs Master Job Scraper');
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Scrapers to run: ${SCRAPERS.length}`);
  
  const results = {
    total: SCRAPERS.length,
    successful: 0,
    failed: 0,
    scrapers: {}
  };
  
  for (const scraper of SCRAPERS) {
    const success = runScraper(scraper);
    results.scrapers[scraper] = success ? 'success' : 'failed';
    if (success) {
      results.successful++;
    } else {
      results.failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 SCRAPING SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total scrapers: ${results.total}`);
  console.log(`✅ Successful: ${results.successful}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Completed: ${new Date().toISOString()}`);
  console.log('='.repeat(60));
  
  // Exit with error if any scrapers failed
  if (results.failed > 0) {
    console.error(`\n⚠️  ${results.failed} scraper(s) failed. Check logs above.`);
    process.exit(1);
  }
  
  console.log('\n✨ All scrapers completed successfully!');
  process.exit(0);
};

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
