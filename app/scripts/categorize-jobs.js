#!/usr/bin/env node
/**
 * Categorize all jobs by mapping industry → category_slug/category_id
 * Also handles messy/inconsistent industry values from different scrapers
 */

const db = require('../server/database');

// Map industry strings (lowercase) → category slug
const industryToCategorySlug = {
  // Direct matches
  'accounting': 'accounting',
  'accounting / finance': 'accounting',
  'administration': 'administration',
  'administration / office support': 'administration',
  'administration / office support, security, services': 'administration',
  'banking & finance': 'banking-and-finance',
  'banking and finance': 'banking-and-finance',
  'community & development': 'community-and-development',
  'community and development': 'community-and-development',
  'construction & trades': 'construction-and-trades',
  'construction and trades': 'construction-and-trades',
  'education & training': 'education-and-training',
  'education and training': 'education-and-training',
  'engineering': 'engineering',
  'government': 'government',
  'health & medical': 'health-and-medical',
  'health and medical': 'health-and-medical',
  'hospitality & tourism': 'hospitality-and-tourism',
  'hospitality and tourism': 'hospitality-and-tourism',
  'hr & recruitment': 'hr-and-recruitment',
  'hr-recruitment': 'hr-and-recruitment',
  'human resources': 'hr-and-recruitment',
  'business, human resources and recruitment': 'hr-and-recruitment',
  'ict & technology': 'ict-and-technology',
  'ict and technology': 'ict-and-technology',
  'information technology': 'ict-and-technology',
  'it': 'ict-and-technology',
  'legal & law': 'legal-and-law',
  'legal and law': 'legal-and-law',
  'management & executive': 'management-and-executive',
  'management and executive': 'management-and-executive',
  'manufacturing & logistics': 'manufacturing-and-logistics',
  'manufacturing and logistics': 'manufacturing-and-logistics',
  'manufacturing/ transport / logistics jobs': 'manufacturing-and-logistics',
  'logistics, transport and supply': 'manufacturing-and-logistics',
  'logistics, transport and supply, services, shipping': 'manufacturing-and-logistics',
  'marketing & sales': 'marketing-and-sales',
  'marketing and sales': 'marketing-and-sales',
  'marketing, sales': 'marketing-and-sales',
  'fmcg, sales': 'marketing-and-sales',
  'merchandising': 'marketing-and-sales',
  'mining & resources': 'mining-and-resources',
  'mining and resources': 'mining-and-resources',
  'mining, oil and gas': 'mining-and-resources',
  'mining, oil and gas, mining, oil and gas': 'mining-and-resources',
  'ngo & volunteering': 'ngo-and-volunteering',
  'ngo and volunteering': 'ngo-and-volunteering',
  'science & research': 'science-and-research',
  'science and research': 'science-and-research',
  'security': 'security',
  // Multi-category / ambiguous — pick best fit
  'airline / airport / travel, operations support': 'hospitality-and-tourism',
};

// Build category slug → id map
const categories = db.prepare('SELECT id, slug FROM categories').all();
const slugToId = {};
categories.forEach(c => { slugToId[c.slug] = c.id; });

// Title-based fallback categorization (keywords → slug)
const titleKeywords = [
  { keywords: ['accountant', 'accounts clerk', 'finance officer', 'auditor', 'bookkeeper'], slug: 'accounting' },
  { keywords: ['nurse', 'doctor', 'medical', 'health officer', 'pharmacist', 'midwife'], slug: 'health-and-medical' },
  { keywords: ['teacher', 'lecturer', 'trainer', 'education'], slug: 'education-and-training' },
  { keywords: ['engineer', 'engineering'], slug: 'engineering' },
  { keywords: ['driver', 'logistics', 'warehouse', 'transport', 'shipping'], slug: 'manufacturing-and-logistics' },
  { keywords: ['security', 'guard'], slug: 'security' },
  { keywords: ['developer', 'software', 'programmer', 'it support', 'network', 'systems admin', 'technician'], slug: 'ict-and-technology' },
  { keywords: ['sales', 'marketing', 'business development'], slug: 'marketing-and-sales' },
  { keywords: ['lawyer', 'legal', 'solicitor', 'attorney'], slug: 'legal-and-law' },
  { keywords: ['mining', 'geologist', 'exploration'], slug: 'mining-and-resources' },
  { keywords: ['chef', 'cook', 'hotel', 'tourism', 'hospitality', 'resort'], slug: 'hospitality-and-tourism' },
  { keywords: ['admin', 'receptionist', 'clerk', 'office', 'secretary', 'coordinator'], slug: 'administration' },
  { keywords: ['hr', 'human resource', 'recruitment'], slug: 'hr-and-recruitment' },
  { keywords: ['manager', 'director', 'ceo', 'executive', 'general manager', 'country manager'], slug: 'management-and-executive' },
  { keywords: ['construction', 'builder', 'carpenter', 'plumber', 'electrician', 'welder', 'fitter'], slug: 'construction-and-trades' },
  { keywords: ['bank', 'loan', 'credit', 'financial'], slug: 'banking-and-finance' },
  { keywords: ['ngo', 'volunteer', 'humanitarian', 'relief', 'aid worker', 'development officer'], slug: 'ngo-and-volunteering' },
  { keywords: ['government', 'public service', 'civil servant'], slug: 'government' },
  { keywords: ['community', 'social worker', 'welfare'], slug: 'community-and-development' },
  { keywords: ['scientist', 'researcher', 'laboratory', 'lab tech'], slug: 'science-and-research' },
];

function categorizeByTitle(title) {
  const lower = title.toLowerCase();
  for (const rule of titleKeywords) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) return rule.slug;
    }
  }
  return null;
}

// Get all uncategorized active jobs
const jobs = db.prepare("SELECT id, title, industry FROM jobs WHERE status = 'active' AND (category_slug IS NULL OR category_slug = '')").all();

console.log(`Found ${jobs.length} uncategorized active jobs`);

let matched = 0, titleMatched = 0, unmatched = 0;
const unmatchedJobs = [];

const update = db.prepare('UPDATE jobs SET category_slug = ?, category_id = ? WHERE id = ?');

const tx = db.transaction(() => {
  for (const job of jobs) {
    let slug = null;
    
    // Try industry mapping first
    if (job.industry) {
      slug = industryToCategorySlug[job.industry.toLowerCase().trim()];
    }
    
    // Fallback to title-based
    if (!slug) {
      slug = categorizeByTitle(job.title);
      if (slug) titleMatched++;
    }
    
    if (slug && slugToId[slug]) {
      update.run(slug, slugToId[slug], job.id);
      matched++;
    } else {
      unmatched++;
      unmatchedJobs.push({ id: job.id, title: job.title, industry: job.industry });
    }
  }
});

tx();

console.log(`\nResults:`);
console.log(`  Industry-matched: ${matched - titleMatched}`);
console.log(`  Title-matched: ${titleMatched}`);
console.log(`  Unmatched: ${unmatched}`);

if (unmatchedJobs.length > 0) {
  console.log(`\nUnmatched jobs:`);
  unmatchedJobs.forEach(j => console.log(`  [${j.id}] "${j.title}" (industry: ${j.industry || 'null'})`));
}

// Show category distribution
console.log('\n=== Category Distribution ===');
const dist = db.prepare(`
  SELECT c.name, COUNT(j.id) as job_count 
  FROM categories c 
  LEFT JOIN jobs j ON j.category_id = c.id AND j.status = 'active'
  GROUP BY c.id 
  ORDER BY job_count DESC
`).all();
dist.forEach(d => console.log(`  ${d.job_count.toString().padStart(4)} ${d.name}`));
