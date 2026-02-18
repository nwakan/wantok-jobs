#!/usr/bin/env node
/**
 * Fix transparency_required flag for employers
 * 
 * Rules:
 * - MANDATORY: government, SOE, statutory
 * - MANDATORY: Known public/listed mining companies
 * - MANDATORY: NGOs (Foundation, Alliance, NGO, Charity)
 * - OPTIONAL: Regular private companies
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../server/data/wantokjobs.db');
const db = new Database(dbPath);

console.log('\n=== FIXING TRANSPARENCY REQUIREMENTS ===\n');

// Known publicly listed mining companies (must keep transparency_required=1)
const publicMiningCompanies = [
  'Ok Tedi Mining Limited',
  'Ok Tedi Mining',
  'K92 Mining Limited',
  'K92 Mining Inc',
  'K92 Mining',
  'Simberi Gold Company Limited',
  'Simberi Gold',
  'Newcrest Mining',
  'Newcrest',
  'Barrick Gold',
  'Barrick',
  'Harmony Gold',
  'Oil Search',
  'Santos',
];

// Known recruitment agencies (should NOT be required)
const recruitmentAgencies = [
  'PeopleConnexion',
  'Select PNG',
  'Concept Recruitment',
  'Star HR Limited',
  'Star HR',
  'PNGworkForce.com',
  'png work force',
  'PNGworkForce',
];

// Test companies (should NOT be required)
const testCompanies = [
  'TestCorp',
  'Test Company 22',
];

// National Fisheries Authority should be statutory
console.log('1. Fixing National Fisheries Authority employer_type...');
const nfaResult = db.prepare(`
  UPDATE profiles_employer
  SET employer_type = 'statutory'
  WHERE company_name = 'National Fisheries Authority'
`).run();
console.log(`   Updated ${nfaResult.changes} record(s)`);

// Step 1: Keep transparency_required=1 for government, SOE, statutory
console.log('\n2. Ensuring government/SOE/statutory keep transparency_required=1...');
const ensureGovt = db.prepare(`
  UPDATE profiles_employer
  SET transparency_required = 1
  WHERE employer_type IN ('government', 'soe', 'statutory')
`).run();
console.log(`   Ensured ${ensureGovt.changes} government/SOE/statutory employers`);

// Step 2: Keep for known public mining companies
console.log('\n3. Keeping transparency_required=1 for public mining companies...');
let miningKept = 0;
for (const company of publicMiningCompanies) {
  const result = db.prepare(`
    UPDATE profiles_employer
    SET transparency_required = 1
    WHERE company_name LIKE ?
      AND employer_type = 'private'
  `).run(`%${company}%`);
  miningKept += result.changes;
}
console.log(`   Kept ${miningKept} mining company(ies)`);

// Step 3: Keep for NGOs (Foundation, Alliance, NGO, Charity)
console.log('\n4. Keeping transparency_required=1 for NGOs...');
const ngoResult = db.prepare(`
  UPDATE profiles_employer
  SET transparency_required = 1
  WHERE employer_type = 'private'
    AND (
      company_name LIKE '%Foundation%'
      OR company_name LIKE '%Alliance%'
      OR company_name LIKE '%NGO%'
      OR company_name LIKE '%Charity%'
    )
`).run();
console.log(`   Kept ${ngoResult.changes} NGO(s)`);

// Step 4: REMOVE from recruitment agencies
console.log('\n5. Removing transparency_required from recruitment agencies...');
let agenciesRemoved = 0;
for (const agency of recruitmentAgencies) {
  const result = db.prepare(`
    UPDATE profiles_employer
    SET transparency_required = 0
    WHERE company_name LIKE ?
      AND employer_type = 'private'
  `).run(`%${agency}%`);
  agenciesRemoved += result.changes;
}
console.log(`   Removed from ${agenciesRemoved} recruitment agency(ies)`);

// Step 5: REMOVE from test companies
console.log('\n6. Removing transparency_required from test companies...');
let testRemoved = 0;
for (const testCo of testCompanies) {
  const result = db.prepare(`
    UPDATE profiles_employer
    SET transparency_required = 0
    WHERE company_name LIKE ?
  `).run(`%${testCo}%`);
  testRemoved += result.changes;
}
console.log(`   Removed from ${testRemoved} test company(ies)`);

// Step 6: REMOVE from other common private companies that shouldn't be required
console.log('\n7. Removing transparency_required from regular private companies...');
const regularPrivateCompanies = [
  'Digicel',
  'DHL',
  'Carpenter',
  'Lamana Hotel',
  'Deloitte',
  'Airways',
  'Highland Products',
  'Hastings Deering',
  'Seaside Developments',
  'BrandForce',
  'LAE BASE',
  'Modern Pharmaceutical',
  'Grand Columbia',
  'PNG Namba Wan Trophy',
  'NextGen Technology',
  'Traisa Transport',
  'Pacific Services Group',
  'Bishop Brothers',
  'InterOil Products',
  'Air Energi',
  'KK Kingston',
  'Paradise Investment',
  'Monadelphous',
  'PNG Ventures',
  'Zenag Chicken',
  'Coffey International',
  'Monier',
  'Homestate',
  'Oceanic Communications',
  'Dunlop',
  'MTIS PNG',
];

let regularRemoved = 0;
for (const company of regularPrivateCompanies) {
  const result = db.prepare(`
    UPDATE profiles_employer
    SET transparency_required = 0
    WHERE company_name LIKE ?
      AND employer_type = 'private'
      AND company_name NOT LIKE '%Foundation%'
      AND company_name NOT LIKE '%Alliance%'
      AND company_name NOT LIKE '%NGO%'
      AND company_name NOT LIKE '%Charity%'
  `).run(`%${company}%`);
  regularRemoved += result.changes;
}
console.log(`   Removed from ${regularRemoved} regular private company(ies)`);

// Summary
console.log('\n=== SUMMARY ===\n');
const afterCounts = db.prepare(`
  SELECT 
    employer_type,
    COUNT(*) as count,
    SUM(CASE WHEN transparency_required = 1 THEN 1 ELSE 0 END) as required_count
  FROM profiles_employer
  GROUP BY employer_type
`).all();
console.table(afterCounts);

console.log('\nTransparency-required employers now:');
const requiredNow = db.prepare(`
  SELECT company_name, employer_type
  FROM profiles_employer
  WHERE transparency_required = 1
  ORDER BY employer_type, company_name
`).all();
console.log(`Total: ${requiredNow.length}`);
console.table(requiredNow);

db.close();
console.log('\n✅ Cleanup complete!\n');
