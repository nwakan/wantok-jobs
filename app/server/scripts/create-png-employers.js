#!/usr/bin/env node
/**
 * Create PNG Government/SOE/Statutory Employer Profiles
 * Creates comprehensive employer accounts for transparency framework
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/wantokjobs.db');
const db = new Database(dbPath);

// Helper to create slug from name
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Generic password hash (will be same for all import accounts)
const passwordHash = bcrypt.hashSync('WantokJobs2026!Import', 10);

// PNG Employer Data
const employers = {
  government: [
    { name: 'Department of Finance', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'Managing PNG\'s public finances and economic policy' },
    { name: 'Department of Treasury', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'PNG\'s central fiscal authority' },
    { name: 'Department of Personnel Management', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'Managing PNG\'s public service workforce' },
    { name: 'Department of National Planning & Monitoring', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'Coordinating national development planning' },
    { name: 'Department of Education', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'Overseeing PNG\'s education system' },
    { name: 'Department of Health', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'Managing PNG\'s healthcare services' },
    { name: 'Department of Justice & Attorney General', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'Administering justice and legal affairs' },
    { name: 'Department of Foreign Affairs', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'Managing PNG\'s international relations' },
    { name: 'Department of Works & Implementation', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'Infrastructure development and maintenance' },
    { name: 'Department of Transport', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'Regulating PNG\'s transport sector' },
    { name: 'Department of Agriculture & Livestock', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'Supporting PNG\'s agricultural sector' },
    { name: 'Department of Lands & Physical Planning', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'Managing land administration and planning' },
    { name: 'Department of Commerce & Industry', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'Promoting trade and industry development' },
    { name: 'Department of Labour & Industrial Relations', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'Regulating employment and labor relations' },
    { name: 'Department of Communication & Information Technology', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'ICT policy and regulation' },
    { name: 'Department of Environment & Conservation', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'Environmental protection and conservation' },
    { name: 'Department of Mining', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'Regulating PNG\'s mining sector' },
    { name: 'Department of Petroleum & Energy', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'Energy policy and petroleum regulation' },
    { name: 'Department of Defence', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'PNG Defence Force administration' },
    { name: 'Department of Correctional Services', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'Managing PNG\'s correctional system' },
    { name: 'Department of Community Development & Religion', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'Community development and religious affairs' },
    { name: 'Department of Higher Education Research Science & Technology', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'Tertiary education and research' },
    { name: 'Department of Provincial & Local Government Affairs', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'Coordinating provincial governance' },
    { name: 'Department of Internal Security', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'National security and law enforcement' },
    { name: 'Department of Immigration & Border Security', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'Managing immigration and border control' },
  ],
  soe: [
    { name: 'Kumul Petroleum Holdings Limited', industry: 'Oil & Gas', location: 'Port Moresby, National Capital District', description: 'PNG\'s national oil and gas company' },
    { name: 'Kumul Consolidated Holdings', industry: 'Investment Management', location: 'Port Moresby, National Capital District', description: 'Managing PNG\'s state-owned enterprises' },
    { name: 'PNG Power Limited', industry: 'Utilities', location: 'Port Moresby, National Capital District', description: 'PNG\'s national electricity provider' },
    { name: 'Water PNG', industry: 'Utilities', location: 'Port Moresby, National Capital District', description: 'Water and sewerage services' },
    { name: 'Air Niugini', industry: 'Aviation', location: 'Port Moresby, National Capital District', description: 'PNG\'s national airline' },
    { name: 'Post PNG', industry: 'Postal Services', location: 'Port Moresby, National Capital District', description: 'National postal and courier services' },
    { name: 'Telikom PNG', industry: 'Telecommunications', location: 'Port Moresby, National Capital District', description: 'Telecommunications services provider' },
    { name: 'National Development Bank', industry: 'Banking & Finance', location: 'Port Moresby, National Capital District', description: 'Development financing institution' },
    { name: 'PNG Ports Corporation', industry: 'Transportation & Logistics', location: 'Port Moresby, National Capital District', description: 'Managing PNG\'s port facilities' },
    { name: 'Eda Ranu', industry: 'Utilities', location: 'Port Moresby, National Capital District', description: 'Water supply for Port Moresby' },
    { name: 'Motor Vehicle Insurance Limited (MVIL)', industry: 'Insurance', location: 'Port Moresby, National Capital District', description: 'Compulsory third party motor vehicle insurance' },
    { name: 'National Housing Corporation', industry: 'Real Estate', location: 'Port Moresby, National Capital District', description: 'Public housing development' },
    { name: 'National Broadcasting Corporation (NBC)', industry: 'Media & Broadcasting', location: 'Port Moresby, National Capital District', description: 'PNG\'s national broadcaster' },
    { name: 'National Fisheries Authority (NFA)', industry: 'Fisheries', location: 'Port Moresby, National Capital District', description: 'Regulating PNG\'s fishing industry' },
    { name: 'National Airports Corporation (NAC)', industry: 'Aviation', location: 'Port Moresby, National Capital District', description: 'Managing PNG\'s airports' },
    { name: 'PNG Forest Authority', industry: 'Forestry', location: 'Port Moresby, National Capital District', description: 'Forest management and regulation' },
    { name: 'PNG Maritime Transport Limited', industry: 'Transportation & Logistics', location: 'Port Moresby, National Capital District', description: 'Maritime transport services' },
    { name: 'PNG DataCo', industry: 'Telecommunications', location: 'Port Moresby, National Capital District', description: 'Telecommunications infrastructure provider' },
  ],
  statutory: [
    { name: 'Bank of Papua New Guinea', industry: 'Banking & Finance', location: 'Port Moresby, National Capital District', description: 'PNG\'s central bank' },
    { name: 'Investment Promotion Authority (IPA)', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'Promoting and facilitating investment in PNG' },
    { name: 'Internal Revenue Commission (IRC)', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'Tax administration and collection' },
    { name: 'Independent Consumer & Competition Commission (ICCC)', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'Consumer protection and competition regulation' },
    { name: 'National Statistical Office', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'National statistics and data collection' },
    { name: 'Electoral Commission of PNG', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'Administering national elections' },
    { name: 'Ombudsman Commission', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'Investigating government misconduct' },
    { name: 'Public Services Commission', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'Public service appointments and management' },
    { name: 'Teaching Service Commission', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'Managing PNG\'s teaching workforce' },
    { name: 'National Research Institute', industry: 'Research', location: 'Port Moresby, National Capital District', description: 'Policy research and analysis' },
    { name: 'Conservation & Environment Protection Authority (CEPA)', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'Environmental regulation and protection' },
    { name: 'National Information & Communications Technology Authority (NICTA)', industry: 'Telecommunications', location: 'Port Moresby, National Capital District', description: 'ICT regulation and licensing' },
    { name: 'Securities Commission of PNG', industry: 'Banking & Finance', location: 'Port Moresby, National Capital District', description: 'Regulating securities markets' },
    { name: 'National Gaming Control Board', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'Regulating gaming and gambling' },
    { name: 'Tourism Promotion Authority', industry: 'Tourism & Hospitality', location: 'Port Moresby, National Capital District', description: 'Promoting PNG tourism' },
  ],
  provincial: [
    { name: 'Central Provincial Government', industry: 'Government', location: 'Port Moresby, Central Province', description: 'Provincial administration for Central Province' },
    { name: 'Eastern Highlands Provincial Government', industry: 'Government', location: 'Goroka, Eastern Highlands Province', description: 'Provincial administration for Eastern Highlands' },
    { name: 'East New Britain Provincial Government', industry: 'Government', location: 'Kokopo, East New Britain Province', description: 'Provincial administration for East New Britain' },
    { name: 'East Sepik Provincial Government', industry: 'Government', location: 'Wewak, East Sepik Province', description: 'Provincial administration for East Sepik' },
    { name: 'Enga Provincial Government', industry: 'Government', location: 'Wabag, Enga Province', description: 'Provincial administration for Enga' },
    { name: 'Gulf Provincial Government', industry: 'Government', location: 'Kerema, Gulf Province', description: 'Provincial administration for Gulf' },
    { name: 'Hela Provincial Government', industry: 'Government', location: 'Tari, Hela Province', description: 'Provincial administration for Hela' },
    { name: 'Jiwaka Provincial Government', industry: 'Government', location: 'Banz, Jiwaka Province', description: 'Provincial administration for Jiwaka' },
    { name: 'Madang Provincial Government', industry: 'Government', location: 'Madang, Madang Province', description: 'Provincial administration for Madang' },
    { name: 'Manus Provincial Government', industry: 'Government', location: 'Lorengau, Manus Province', description: 'Provincial administration for Manus' },
    { name: 'Milne Bay Provincial Government', industry: 'Government', location: 'Alotau, Milne Bay Province', description: 'Provincial administration for Milne Bay' },
    { name: 'Morobe Provincial Government', industry: 'Government', location: 'Lae, Morobe Province', description: 'Provincial administration for Morobe' },
    { name: 'New Ireland Provincial Government', industry: 'Government', location: 'Kavieng, New Ireland Province', description: 'Provincial administration for New Ireland' },
    { name: 'Northern (Oro) Provincial Government', industry: 'Government', location: 'Popondetta, Northern (Oro) Province', description: 'Provincial administration for Northern Province' },
    { name: 'Autonomous Region of Bougainville', industry: 'Government', location: 'Buka, Autonomous Region of Bougainville', description: 'Autonomous regional government' },
    { name: 'Simbu (Chimbu) Provincial Government', industry: 'Government', location: 'Kundiawa, Simbu (Chimbu) Province', description: 'Provincial administration for Simbu' },
    { name: 'Southern Highlands Provincial Government', industry: 'Government', location: 'Mendi, Southern Highlands Province', description: 'Provincial administration for Southern Highlands' },
    { name: 'West New Britain Provincial Government', industry: 'Government', location: 'Kimbe, West New Britain Province', description: 'Provincial administration for West New Britain' },
    { name: 'Western (Fly) Provincial Government', industry: 'Government', location: 'Daru, Western Province', description: 'Provincial administration for Western Province' },
    { name: 'Western Highlands Provincial Government', industry: 'Government', location: 'Mount Hagen, Western Highlands Province', description: 'Provincial administration for Western Highlands' },
    { name: 'West Sepik (Sandaun) Provincial Government', industry: 'Government', location: 'Vanimo, West Sepik (Sandaun) Province', description: 'Provincial administration for West Sepik' },
    { name: 'National Capital District Commission', industry: 'Government', location: 'Port Moresby, National Capital District', description: 'Administration for National Capital District' },
  ],
};

console.log('Creating PNG Employer Profiles...\n');

let createdCount = 0;
let skippedCount = 0;

// Process each employer type
for (const [type, companies] of Object.entries(employers)) {
  console.log(`\n=== Creating ${type.toUpperCase()} employers ===`);
  
  for (const company of companies) {
    const slug = slugify(company.name);
    const email = `import-${slug}@wantokjobs.com`;
    
    try {
      // Check if user already exists
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      
      if (existingUser) {
        console.log(`  ⏭️  Skipped: ${company.name} (already exists)`);
        skippedCount++;
        continue;
      }

      // Create user account
      const userResult = db.prepare(`
        INSERT INTO users (email, password_hash, name, role, account_status, created_at, updated_at)
        VALUES (?, ?, ?, 'employer', 'active', datetime('now'), datetime('now'))
      `).run(email, passwordHash, company.name);

      const userId = userResult.lastInsertRowid;

      // Create employer profile
      db.prepare(`
        INSERT INTO profiles_employer (
          user_id, company_name, industry, location, country, description,
          employer_type, transparency_required, transparency_score
        ) VALUES (?, ?, ?, ?, 'Papua New Guinea', ?, ?, 1, 0)
      `).run(userId, company.name, company.industry, company.location, company.description, type);

      console.log(`  ✓ Created: ${company.name}`);
      createdCount++;
    } catch (error) {
      console.error(`  ✗ Error creating ${company.name}:`, error.message);
    }
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`Total employers created: ${createdCount}`);
console.log(`Total employers skipped: ${skippedCount}`);
console.log(`${'='.repeat(60)}\n`);

db.close();
