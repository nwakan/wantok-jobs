#!/usr/bin/env node
/**
 * WantokJobs Profile Data Cleanup Script
 * 
 * Run: node scripts/clean-profiles.js [--dry-run]
 * 
 * Tasks:
 * 1. Strip \r\n and \rn artifacts from employer locations
 * 2. Auto-assign industries based on company name/description
 * 3. Remove clearly spam jobseeker accounts
 */

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'server', 'data', 'wantokjobs.db');
const DRY_RUN = process.argv.includes('--dry-run');

console.log(`🧹 WantokJobs Profile Cleanup ${DRY_RUN ? '(DRY RUN)' : ''}`);
console.log('='.repeat(60));

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// ============================================================
// 1. Clean employer locations
// ============================================================
function cleanEmployerLocations() {
  console.log('\n📍 Cleaning employer locations...');
  
  const employers = db.prepare(`
    SELECT id, user_id, location, address, city FROM profiles_employer 
    WHERE location IS NOT NULL AND location != ''
  `).all();

  let cleaned = 0;
  const update = db.prepare('UPDATE profiles_employer SET location = ?, city = ? WHERE id = ?');

  for (const emp of employers) {
    let loc = emp.location;
    const original = loc;

    // Strip \r\n, \rn, \r, \n artifacts
    loc = loc.replace(/\\r\\n/g, ', ').replace(/\\rn/g, ', ').replace(/\r\n/g, ', ').replace(/\r/g, ', ').replace(/\n/g, ', ');
    
    // Remove postal/PO Box info
    loc = loc.replace(/P\.?\s*O\.?\s*Box\s*\d+[^,]*/gi, '').trim();
    
    // Remove excessive commas, spaces
    loc = loc.replace(/,\s*,/g, ',').replace(/,\s*$/, '').replace(/^\s*,/, '').trim();
    
    // Extract city name (first meaningful part, typically a PNG city)
    const pngCities = [
      'Port Moresby', 'Lae', 'Madang', 'Wewak', 'Goroka', 'Mount Hagen',
      'Kokopo', 'Rabaul', 'Kimbe', 'Popondetta', 'Alotau', 'Daru',
      'Vanimo', 'Kavieng', 'Mendi', 'Kundiawa', 'Kerema', 'Lorengau',
      'Arawa', 'Buka', 'Tabubil', 'Lihir', 'Tari', 'Wabag'
    ];

    let city = emp.city || '';
    for (const c of pngCities) {
      if (loc.toLowerCase().includes(c.toLowerCase())) {
        city = c;
        break;
      }
    }

    // If location is too long (>100 chars), likely full address — trim to city
    if (loc.length > 100 && city) {
      loc = city;
    }

    if (loc !== original || city !== emp.city) {
      if (!DRY_RUN) update.run(loc, city || null, emp.id);
      cleaned++;
      if (cleaned <= 5) {
        console.log(`  "${original.substring(0, 60)}..." → "${loc}"`);
      }
    }
  }

  console.log(`  ✅ Cleaned ${cleaned} of ${employers.length} employer locations`);
}

// ============================================================
// 2. Auto-assign industries
// ============================================================
function assignIndustries() {
  console.log('\n🏭 Auto-assigning industries...');

  const INDUSTRY_KEYWORDS = {
    'Mining & Resources': ['mining', 'mineral', 'gold', 'copper', 'newcrest', 'barrick', 'ok tedi', 'lihir', 'porgera', 'ramu'],
    'Banking & Finance': ['bank', 'banking', 'finance', 'financial', 'bsp', 'kina bank', 'westpac', 'anz', 'microfinance', 'insurance'],
    'Oil & Gas': ['oil', 'gas', 'petroleum', 'exxon', 'santos', 'lng', 'interoil'],
    'Government & Public Sector': ['government', 'department', 'authority', 'national', 'provincial', 'public service', 'commission'],
    'NGO & Development': ['ngo', 'foundation', 'charity', 'aid', 'development', 'united nations', 'world bank', 'usaid', 'ausaid', 'undp', 'unicef', 'oxfam'],
    'Education & Training': ['university', 'school', 'college', 'education', 'training', 'institute', 'academy', 'unitech', 'upng'],
    'Healthcare & Medical': ['hospital', 'health', 'medical', 'clinic', 'pharmacy', 'doctor', 'nursing'],
    'Construction & Engineering': ['construction', 'engineering', 'building', 'infrastructure', 'contractor'],
    'Hospitality & Tourism': ['hotel', 'resort', 'tourism', 'travel', 'hospitality', 'lodge', 'airlines', 'air niugini'],
    'Telecommunications': ['telecom', 'digicel', 'telikom', 'bmobile', 'datec', 'communication'],
    'Retail & Wholesale': ['retail', 'wholesale', 'store', 'shop', 'supermarket', 'trading', 'cpl', 'brian bell'],
    'Agriculture & Fisheries': ['agriculture', 'farm', 'coffee', 'cocoa', 'palm oil', 'fisheries', 'plantation'],
    'Logging & Forestry': ['logging', 'forestry', 'timber', 'lumber'],
    'Shipping & Logistics': ['shipping', 'logistics', 'transport', 'freight', 'cargo', 'steamships'],
    'Manufacturing': ['manufacturing', 'factory', 'production', 'processing'],
    'Legal': ['law', 'legal', 'lawyer', 'attorney', 'solicitor', 'barrister'],
    'Media & Communications': ['media', 'news', 'radio', 'television', 'newspaper', 'post-courier', 'national', 'emtv'],
    'Real Estate & Property': ['real estate', 'property', 'housing'],
    'Security': ['security', 'guard', 'protection'],
    'Consulting & Professional Services': ['consulting', 'consultant', 'advisory', 'accountant', 'audit', 'kpmg', 'deloitte', 'pwc'],
    'Information Technology': ['technology', 'software', 'it ', 'digital', 'computer', 'data', 'tech'],
    'Insurance': ['insurance', 'underwriter'],
    'Energy & Utilities': ['energy', 'power', 'electricity', 'water', 'utility', 'png power'],
    'Aviation & Transport': ['aviation', 'airline', 'airport', 'pilot', 'flight'],
  };

  const employers = db.prepare(`
    SELECT id, company_name, description, industry FROM profiles_employer 
    WHERE (industry IS NULL OR industry = '')
  `).all();

  let assigned = 0;
  const update = db.prepare('UPDATE profiles_employer SET industry = ? WHERE id = ?');

  for (const emp of employers) {
    const text = `${emp.company_name || ''} ${emp.description || ''}`.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;

    for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
      let score = 0;
      for (const kw of keywords) {
        if (text.includes(kw)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = industry;
      }
    }

    if (bestMatch && bestScore >= 1) {
      if (!DRY_RUN) update.run(bestMatch, emp.id);
      assigned++;
      if (assigned <= 10) {
        console.log(`  "${(emp.company_name || 'Unknown').substring(0, 40)}" → ${bestMatch} (score: ${bestScore})`);
      }
    }
  }

  console.log(`  ✅ Assigned industry to ${assigned} of ${employers.length} employers without industry`);
}

// ============================================================
// 3. Remove spam jobseeker accounts
// ============================================================
function removeSpamJobseekers() {
  console.log('\n🗑️  Identifying spam jobseeker accounts...');

  // Known spam patterns
  const SPAM_PATTERNS = [
    '3 Yes',
    'test test',
    'asdf',
    'aaa',
    'xxx',
    '123',
  ];

  // Count spam by name pattern
  const nameCounts = db.prepare(`
    SELECT u.name, COUNT(*) as cnt 
    FROM users u 
    JOIN profiles_jobseeker p ON u.id = p.user_id
    WHERE u.role = 'jobseeker'
    GROUP BY u.name 
    HAVING cnt > 5
    ORDER BY cnt DESC
    LIMIT 20
  `).all();

  console.log('  Top repeated names:');
  for (const nc of nameCounts) {
    console.log(`    "${nc.name}" × ${nc.cnt}`);
  }

  // Find spam accounts: known bot patterns like "3 No", "3 Yes", "2 Yes", etc.
  // These are clearly automated registrations
  const KNOWN_SPAM_NAMES = ['3 No', '3 Yes', '2 Yes', '1 Yes', '2 No', '1 No'];
  
  const spamUsers = db.prepare(`
    SELECT u.id, u.name, u.email
    FROM users u
    LEFT JOIN profiles_jobseeker p ON u.id = p.user_id
    WHERE u.role = 'jobseeker'
    AND (
      u.name IN (${KNOWN_SPAM_NAMES.map(() => '?').join(',')})
      OR (
        u.name IN (
          SELECT name FROM users WHERE role = 'jobseeker' GROUP BY name HAVING COUNT(*) > 10
        )
        AND (p.phone IS NULL OR p.phone = '')
        AND (p.bio IS NULL OR p.bio = '')
        AND (p.skills IS NULL OR p.skills = '' OR p.skills = '[]')
        AND (p.work_history IS NULL OR p.work_history = '' OR p.work_history = '[]')
        AND (p.education IS NULL OR p.education = '' OR p.education = '[]')
      )
    )
  `).all(...KNOWN_SPAM_NAMES);

  console.log(`\n  Found ${spamUsers.length} likely spam accounts (repeated names + empty profiles)`);

  // Also find pattern-based spam
  let patternSpam = 0;
  for (const pattern of SPAM_PATTERNS) {
    const count = db.prepare(`
      SELECT COUNT(*) as cnt FROM users u
      JOIN profiles_jobseeker p ON u.id = p.user_id
      WHERE u.role = 'jobseeker' AND u.name = ?
      AND (p.phone IS NULL OR p.phone = '')
      AND (p.bio IS NULL OR p.bio = '')
    `).get(pattern);
    if (count.cnt > 0) {
      console.log(`  Pattern "${pattern}": ${count.cnt} accounts`);
      patternSpam += count.cnt;
    }
  }

  if (!DRY_RUN && spamUsers.length > 0) {
    console.log('\n  Deactivating spam accounts...');
    
    // Don't delete — just mark as inactive by setting a flag
    // First check if deactivated column exists
    try {
      db.exec('ALTER TABLE users ADD COLUMN deactivated INTEGER DEFAULT 0');
    } catch (e) { /* already exists */ }

    const deactivate = db.prepare('UPDATE users SET deactivated = 1 WHERE id = ?');
    const deactivateMany = db.transaction((ids) => {
      for (const id of ids) {
        deactivate.run(id);
      }
    });

    deactivateMany(spamUsers.map(u => u.id));
    console.log(`  ✅ Deactivated ${spamUsers.length} spam accounts (reversible)`);
  } else if (DRY_RUN) {
    console.log(`  Would deactivate ${spamUsers.length} spam accounts`);
  }
}

// ============================================================
// 4. Summary stats
// ============================================================
function printStats() {
  console.log('\n📊 Database Summary:');
  
  const totalJobseekers = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'jobseeker'").get();
  const totalEmployers = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'employer'").get();
  const withIndustry = db.prepare("SELECT COUNT(*) as cnt FROM profiles_employer WHERE industry IS NOT NULL AND industry != ''").get();
  const withBio = db.prepare("SELECT COUNT(*) as cnt FROM profiles_jobseeker WHERE bio IS NOT NULL AND bio != ''").get();
  const withSkills = db.prepare("SELECT COUNT(*) as cnt FROM profiles_jobseeker WHERE skills IS NOT NULL AND skills != '' AND skills != '[]'").get();

  console.log(`  Jobseekers: ${totalJobseekers.cnt}`);
  console.log(`  Employers: ${totalEmployers.cnt}`);
  console.log(`  Employers with industry: ${withIndustry.cnt}`);
  console.log(`  Jobseekers with bio: ${withBio.cnt}`);
  console.log(`  Jobseekers with skills: ${withSkills.cnt}`);
}

// ============================================================
// Run all tasks
// ============================================================
try {
  cleanEmployerLocations();
  assignIndustries();
  removeSpamJobseekers();
  printStats();
  console.log('\n✅ Cleanup complete!');
} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
} finally {
  db.close();
}
