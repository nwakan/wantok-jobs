#!/usr/bin/env node
/**
 * 1. Fix miscategorized jobs
 * 2. Seed realistic jobs for low categories
 * 3. Report miscategorization suggestions
 */

const db = require('../server/database');

// Category slug -> id map
const cats = {};
db.prepare('SELECT id, slug FROM categories').all().forEach(c => { cats[c.slug] = c.id; });

// ===== 1. Fix known miscategorized ReliefWeb jobs =====
console.log('=== Fixing miscategorized jobs ===');
const fixes = [
  { title: 'Program and Communications Coordinator', from: 'government', to: 'ngo-and-volunteering' },
  { title: 'Director, Law and Justice', from: 'government', to: 'legal-and-law' },
  { title: 'Provincial Facilitator, WNB', from: 'government', to: 'ngo-and-volunteering' },
  { title: 'Consultancy Services for the Kokoda Highway Scoping Study', from: 'manufacturing-and-logistics', to: 'engineering' },
];

const updateCat = db.prepare('UPDATE jobs SET category_slug = ?, category_id = ? WHERE title = ? AND category_slug = ?');
for (const f of fixes) {
  const r = updateCat.run(f.to, cats[f.to], f.title, f.from);
  if (r.changes) console.log(`  Fixed: "${f.title}" ${f.from} -> ${f.to}`);
}

// ===== 2. Seed realistic PNG jobs for low categories =====
console.log('\n=== Seeding jobs for low categories ===');

const newJobs = [
  // NGO & Volunteering (currently 1 + 2 fixes = 3, need more)
  {
    title: 'Community Development Officer - Western Highlands',
    description: 'Plan and implement community development programs in Western Highlands Province. Work with local communities to identify needs and develop sustainable solutions.\n\nKey Responsibilities:\n• Conduct community needs assessments\n• Design and implement development projects\n• Monitor and evaluate program outcomes\n• Build capacity of local community groups\n• Prepare reports for donors and stakeholders\n\nRequirements:\n• Degree in Social Science, Community Development or related field\n• 3+ years experience in community development in PNG\n• Strong communication skills in English and Tok Pisin\n• Willingness to travel to remote areas\n• Experience with participatory development approaches',
    company_name: 'World Vision PNG',
    location: 'Mt Hagen, Western Highlands',
    category_slug: 'ngo-and-volunteering',
    experience_level: 'Mid Level',
    salary_min: 45000, salary_max: 70000,
    job_type: 'full-time',
  },
  {
    title: 'Humanitarian Response Coordinator',
    description: 'Coordinate humanitarian response activities across Papua New Guinea for natural disasters and emergencies.\n\nResponsibilities:\n• Lead emergency response planning and coordination\n• Manage relationships with government agencies and NGO partners\n• Oversee logistics and supply chain for emergency operations\n• Prepare situation reports and donor updates\n• Train and mentor national staff in emergency response\n• Ensure compliance with humanitarian standards (Sphere, CHS)\n\nRequirements:\n• Bachelor\'s degree in International Development, Humanitarian Studies or related\n• 5+ years humanitarian experience, preferably in Pacific region\n• Strong leadership and coordination skills\n• Fluency in English; Tok Pisin advantageous\n• Experience with cluster coordination system',
    company_name: 'CARE International PNG',
    location: 'Port Moresby, NCD',
    category_slug: 'ngo-and-volunteering',
    experience_level: 'Senior',
    salary_min: 80000, salary_max: 130000,
    job_type: 'full-time',
  },
  {
    title: 'Gender Equality Program Officer',
    description: 'Support the implementation of gender equality and women\'s empowerment programs across PNG provinces.\n\nKey Duties:\n• Implement gender mainstreaming activities\n• Conduct gender analysis and assessments\n• Support women\'s savings groups and livelihoods programs\n• Facilitate training on gender-based violence prevention\n• Document best practices and lessons learned\n• Engage with provincial and district government partners\n\nRequirements:\n• Degree in Gender Studies, Social Sciences, or Development Studies\n• 2+ years experience in gender programming\n• Understanding of PNG cultural context and gender dynamics\n• Strong facilitation and training skills\n• Ability to work in remote and challenging environments',
    company_name: 'Oxfam in PNG',
    location: 'Lae, Morobe Province',
    category_slug: 'ngo-and-volunteering',
    experience_level: 'Mid Level',
    salary_min: 40000, salary_max: 65000,
    job_type: 'full-time',
  },
  {
    title: 'Volunteer Coordinator - Youth Development',
    description: 'Manage and coordinate volunteer programs focused on youth development across urban and rural areas of PNG.\n\nResponsibilities:\n• Recruit, train and manage local and international volunteers\n• Design youth engagement activities and programs\n• Partner with schools, churches and community organizations\n• Monitor volunteer welfare and program quality\n• Manage volunteer database and reporting\n\nRequirements:\n• Diploma or degree in Youth Work, Social Science, or related field\n• Experience in volunteer management\n• Strong organizational and people skills\n• Knowledge of PNG youth issues\n• Valid driver\'s license',
    company_name: 'Voluntary Service Overseas (VSO)',
    location: 'Port Moresby, NCD',
    category_slug: 'ngo-and-volunteering',
    experience_level: 'Mid Level',
    salary_min: 35000, salary_max: 55000,
    job_type: 'full-time',
  },
  {
    title: 'WASH Project Officer',
    description: 'Implement Water, Sanitation and Hygiene (WASH) projects in rural communities of Sepik Region.\n\nDuties:\n• Oversee construction and rehabilitation of water supply systems\n• Conduct hygiene promotion activities in communities\n• Train community water committees on system maintenance\n• Collect and analyze WASH data for reporting\n• Coordinate with provincial health authorities\n\nRequirements:\n• Degree in Public Health, Engineering, or Environmental Science\n• 2+ years WASH sector experience in PNG or Pacific\n• Knowledge of community-led total sanitation approaches\n• Ability to work in remote locations for extended periods\n• Motorbike license preferred',
    company_name: 'WaterAid PNG',
    location: 'Wewak, East Sepik Province',
    category_slug: 'ngo-and-volunteering',
    experience_level: 'Mid Level',
    salary_min: 42000, salary_max: 68000,
    job_type: 'full-time',
  },
  {
    title: 'Monitoring & Evaluation Specialist - Climate Adaptation',
    description: 'Lead M&E activities for climate change adaptation programs in coastal communities of Papua New Guinea.\n\nResponsibilities:\n• Design and implement M&E frameworks\n• Develop data collection tools and methodologies\n• Conduct baseline and endline surveys\n• Analyze program data and produce reports\n• Build M&E capacity of partner organizations\n• Contribute to global learning on climate adaptation\n\nRequirements:\n• Master\'s degree in relevant field\n• 5+ years M&E experience in development sector\n• Strong quantitative and qualitative research skills\n• Experience with climate change or environmental programs\n• Proficiency in data analysis software (SPSS, Stata, R)',
    company_name: 'UNDP Papua New Guinea',
    location: 'Port Moresby, NCD',
    category_slug: 'ngo-and-volunteering',
    experience_level: 'Senior',
    salary_min: 90000, salary_max: 140000,
    job_type: 'contract',
  },

  // Hospitality & Tourism (currently 5, add 7 more)
  {
    title: 'Hotel General Manager - Kokopo',
    description: 'Lead all operations at a premier resort hotel in Kokopo, East New Britain Province.\n\nResponsibilities:\n• Oversee all hotel departments including F&B, housekeeping, front office\n• Manage annual budgets and revenue targets\n• Ensure exceptional guest experiences\n• Recruit, train and develop staff\n• Maintain property standards and compliance\n• Drive marketing and sales initiatives\n\nRequirements:\n• 8+ years hotel management experience\n• Proven track record in hospitality leadership\n• Strong financial management skills\n• Knowledge of PNG tourism industry advantageous\n• Degree in Hospitality Management or equivalent',
    company_name: 'Kokopo Beach Bungalow Resort',
    location: 'Kokopo, East New Britain',
    category_slug: 'hospitality-and-tourism',
    experience_level: 'Senior',
    salary_min: 90000, salary_max: 150000,
    job_type: 'full-time',
  },
  {
    title: 'Tour Guide - Trekking & Cultural Tours',
    description: 'Lead guided trekking and cultural tours along the Kokoda Track and surrounding areas.\n\nDuties:\n• Guide tourists along Kokoda Track and other trekking routes\n• Provide historical and cultural commentary\n• Ensure safety of all tour participants\n• Coordinate with local communities and porters\n• Maintain equipment and first aid supplies\n\nRequirements:\n• Extensive knowledge of Kokoda Track and PNG history\n• First Aid certification\n• Physical fitness for multi-day treks\n• Excellent English communication skills\n• Minimum 2 years guiding experience',
    company_name: 'PNG Trekking Adventures',
    location: 'Port Moresby / Kokoda, Central & Northern',
    category_slug: 'hospitality-and-tourism',
    experience_level: 'Mid Level',
    salary_min: 30000, salary_max: 50000,
    job_type: 'full-time',
  },
  {
    title: 'Executive Chef - International Hotel',
    description: 'Lead the kitchen team at a leading international hotel in Port Moresby.\n\nResponsibilities:\n• Plan menus incorporating local and international cuisine\n• Manage kitchen operations and food quality standards\n• Control food costs and inventory\n• Train and develop kitchen staff\n• Ensure food safety and hygiene compliance\n• Cater for conferences and special events\n\nRequirements:\n• Professional culinary qualifications\n• 5+ years as Executive Chef or Sous Chef\n• Experience in hotel or resort kitchens\n• Knowledge of Pacific and Asian cuisines\n• Strong leadership and team management',
    company_name: 'Hilton Port Moresby',
    location: 'Port Moresby, NCD',
    category_slug: 'hospitality-and-tourism',
    experience_level: 'Senior',
    salary_min: 70000, salary_max: 120000,
    job_type: 'full-time',
  },
  {
    title: 'Front Office Supervisor',
    description: 'Supervise front desk operations at a busy hotel in Lae.\n\nDuties:\n• Manage check-in/check-out processes\n• Supervise front office team of 6 staff\n• Handle guest complaints and requests\n• Manage room reservations and occupancy\n• Prepare daily reports for management\n• Coordinate with housekeeping and maintenance\n\nRequirements:\n• 2+ years front office or reception experience\n• Excellent customer service skills\n• Computer literacy (property management systems)\n• Good English and Tok Pisin communication\n• Certificate in Hospitality or equivalent',
    company_name: 'Lae International Hotel',
    location: 'Lae, Morobe Province',
    category_slug: 'hospitality-and-tourism',
    experience_level: 'Mid Level',
    salary_min: 28000, salary_max: 45000,
    job_type: 'full-time',
  },
  {
    title: 'Restaurant Manager',
    description: 'Manage daily operations of a popular restaurant and bar in Port Moresby.\n\nResponsibilities:\n• Oversee restaurant service and operations\n• Manage staff scheduling and performance\n• Control costs and maximize revenue\n• Ensure food safety and liquor licensing compliance\n• Handle customer relations and marketing\n\nRequirements:\n• 3+ years restaurant management experience\n• Strong business and financial acumen\n• Excellent customer service orientation\n• Knowledge of PNG food safety regulations\n• Ability to work evenings and weekends',
    company_name: 'Airways Hotel',
    location: 'Port Moresby, NCD',
    category_slug: 'hospitality-and-tourism',
    experience_level: 'Mid Level',
    salary_min: 35000, salary_max: 55000,
    job_type: 'full-time',
  },
  {
    title: 'Dive Operations Manager - Rabaul',
    description: 'Manage diving operations at a premier dive resort in Rabaul, East New Britain.\n\nDuties:\n• Plan and lead dive excursions\n• Maintain dive equipment and boats\n• Ensure diver safety and compliance with PADI standards\n• Train and supervise dive staff\n• Market dive packages to tourists\n• Manage bookings and logistics\n\nRequirements:\n• PADI Divemaster or Instructor certification\n• 3+ years dive operations experience\n• Knowledge of Rabaul/Kimbe Bay dive sites preferred\n• Strong swimming and rescue skills\n• Business management experience',
    company_name: 'Rabaul Dive Adventures',
    location: 'Rabaul, East New Britain',
    category_slug: 'hospitality-and-tourism',
    experience_level: 'Mid Level',
    salary_min: 40000, salary_max: 65000,
    job_type: 'full-time',
  },
  {
    title: 'Tourism Marketing Officer',
    description: 'Promote PNG tourism destinations through marketing campaigns and partnerships.\n\nResponsibilities:\n• Develop marketing materials for PNG tourism products\n• Manage social media and digital marketing channels\n• Coordinate with tourism operators and stakeholders\n• Attend trade shows and tourism expos\n• Analyze market trends and visitor data\n\nRequirements:\n• Degree in Marketing, Tourism, or Communications\n• 2+ years marketing experience, tourism preferred\n• Strong digital marketing and social media skills\n• Creative thinking and content creation ability\n• Knowledge of PNG tourism industry',
    company_name: 'PNG Tourism Promotion Authority',
    location: 'Port Moresby, NCD',
    category_slug: 'hospitality-and-tourism',
    experience_level: 'Mid Level',
    salary_min: 38000, salary_max: 60000,
    job_type: 'full-time',
  },

  // Security (currently 6, add 6 more)
  {
    title: 'Security Operations Manager',
    description: 'Manage security operations across multiple sites for a major mining company in PNG.\n\nResponsibilities:\n• Oversee security teams at mine site and accommodation\n• Develop and implement security policies and procedures\n• Conduct risk assessments and threat analysis\n• Manage relationships with police and community leaders\n• Investigate security incidents and prepare reports\n• Coordinate emergency response plans\n\nRequirements:\n• 8+ years security management experience\n• Background in military, police, or corporate security\n• Knowledge of PNG security environment\n• Strong leadership and crisis management skills\n• Certificate IV in Security Risk Management or equivalent',
    company_name: 'Newcrest Mining PNG',
    location: 'Lihir, New Ireland Province',
    category_slug: 'security',
    experience_level: 'Senior',
    salary_min: 80000, salary_max: 130000,
    job_type: 'full-time',
  },
  {
    title: 'Security Guard - Day Shift',
    description: 'Provide security services at a commercial property in Port Moresby.\n\nDuties:\n• Monitor CCTV and access control systems\n• Conduct regular patrols of premises\n• Control entry and exit of visitors and vehicles\n• Respond to security incidents and alarms\n• Maintain security logs and reports\n• Assist with emergency evacuations\n\nRequirements:\n• Grade 10 education minimum\n• Security guard license or willingness to obtain\n• Good physical fitness\n• Reliable and trustworthy character\n• Basic English and Tok Pisin communication\n• Previous security experience preferred',
    company_name: 'Guard Dog Security Services',
    location: 'Port Moresby, NCD',
    category_slug: 'security',
    experience_level: 'Entry Level',
    salary_min: 18000, salary_max: 28000,
    job_type: 'full-time',
  },
  {
    title: 'Cybersecurity Analyst',
    description: 'Protect organizational IT systems and data from cyber threats.\n\nResponsibilities:\n• Monitor network traffic for security threats\n• Conduct vulnerability assessments and penetration testing\n• Implement security policies and access controls\n• Respond to and investigate security incidents\n• Maintain firewalls, IDS/IPS systems\n• Conduct security awareness training for staff\n\nRequirements:\n• Degree in IT, Computer Science, or Cybersecurity\n• 3+ years cybersecurity experience\n• Knowledge of security frameworks (ISO 27001, NIST)\n• Experience with SIEM tools and incident response\n• Relevant certifications (CISSP, CEH, CompTIA Security+) preferred',
    company_name: 'Bank of South Pacific',
    location: 'Port Moresby, NCD',
    category_slug: 'security',
    experience_level: 'Mid Level',
    salary_min: 55000, salary_max: 90000,
    job_type: 'full-time',
  },
  {
    title: 'Loss Prevention Officer - Retail',
    description: 'Prevent theft and losses at a major retail chain across PNG stores.\n\nDuties:\n• Conduct store surveillance and loss prevention audits\n• Investigate internal and external theft\n• Install and maintain security equipment\n• Train store staff on loss prevention procedures\n• Prepare investigation reports\n• Liaise with police on criminal matters\n\nRequirements:\n• 2+ years loss prevention or security experience\n• Knowledge of retail security practices\n• Strong observation and investigation skills\n• Valid driver\'s license\n• Willingness to travel between stores',
    company_name: 'CPL Group',
    location: 'Port Moresby, NCD',
    category_slug: 'security',
    experience_level: 'Mid Level',
    salary_min: 32000, salary_max: 50000,
    job_type: 'full-time',
  },
  {
    title: 'Fire & Safety Officer',
    description: 'Ensure workplace fire safety and occupational health compliance at an industrial facility.\n\nResponsibilities:\n• Conduct fire risk assessments and safety inspections\n• Develop and implement fire safety plans\n• Organize fire drills and emergency exercises\n• Maintain fire suppression equipment\n• Train staff on fire safety procedures\n• Ensure compliance with PNG OH&S legislation\n\nRequirements:\n• Certificate in Fire Safety or Occupational Health & Safety\n• 3+ years fire safety or OH&S experience\n• Knowledge of PNG safety regulations\n• First Aid and firefighting qualifications\n• Strong communication and training skills',
    company_name: 'Nambawan Super Limited',
    location: 'Port Moresby, NCD',
    category_slug: 'security',
    experience_level: 'Mid Level',
    salary_min: 40000, salary_max: 65000,
    job_type: 'full-time',
  },
  {
    title: 'Executive Protection Specialist',
    description: 'Provide close protection services for corporate executives and VIPs in Papua New Guinea.\n\nDuties:\n• Plan and execute security for executive travel and events\n• Conduct advance reconnaissance of venues and routes\n• Coordinate with local security and law enforcement\n• Maintain situational awareness and threat intelligence\n• Drive armored and standard vehicles\n\nRequirements:\n• Military or police background with close protection training\n• 5+ years executive protection experience\n• Knowledge of PNG security landscape\n• Advanced driving skills\n• First Aid certification\n• Excellent physical fitness',
    company_name: 'Pacific Security Group',
    location: 'Port Moresby, NCD',
    category_slug: 'security',
    experience_level: 'Senior',
    salary_min: 60000, salary_max: 95000,
    job_type: 'full-time',
  },

  // Legal & Law (currently 6, add 6 more)
  {
    title: 'Litigation Lawyer - Commercial',
    description: 'Handle commercial litigation matters for a leading PNG law firm.\n\nResponsibilities:\n• Represent clients in National and Supreme Court proceedings\n• Draft legal documents, pleadings and submissions\n• Conduct legal research and case preparation\n• Advise clients on commercial disputes\n• Manage case files and billing\n• Mentor junior lawyers and paralegals\n\nRequirements:\n• LLB from recognized university\n• Admitted to practice in PNG\n• 4+ years post-admission litigation experience\n• Strong advocacy and negotiation skills\n• Knowledge of PNG commercial law\n• Excellent written and oral communication',
    company_name: 'Allens Linklaters PNG',
    location: 'Port Moresby, NCD',
    category_slug: 'legal-and-law',
    experience_level: 'Mid Level',
    salary_min: 60000, salary_max: 100000,
    job_type: 'full-time',
  },
  {
    title: 'Legal Officer - Land & Property',
    description: 'Provide legal support for land acquisition and property matters.\n\nDuties:\n• Conduct land title searches and due diligence\n• Draft and review land lease agreements\n• Advise on customary land issues\n• Liaise with Lands Department and provincial authorities\n• Support dispute resolution processes\n• Maintain land records and documentation\n\nRequirements:\n• LLB degree\n• 2+ years experience in land/property law\n• Knowledge of PNG Land Act and customary land tenure\n• Strong attention to detail\n• Good stakeholder management skills',
    company_name: 'Nambawan Super Limited',
    location: 'Port Moresby, NCD',
    category_slug: 'legal-and-law',
    experience_level: 'Mid Level',
    salary_min: 50000, salary_max: 80000,
    job_type: 'full-time',
  },
  {
    title: 'Compliance Manager',
    description: 'Lead regulatory compliance and governance for a financial institution.\n\nResponsibilities:\n• Ensure compliance with Bank of PNG regulations\n• Develop and implement compliance policies\n• Conduct compliance audits and reviews\n• Manage anti-money laundering (AML) program\n• Report to board on compliance matters\n• Train staff on regulatory requirements\n\nRequirements:\n• Degree in Law, Finance, or Business\n• 5+ years compliance or regulatory experience\n• Knowledge of PNG banking and financial regulations\n• Understanding of AML/CTF frameworks\n• Strong analytical and communication skills',
    company_name: 'Kina Bank',
    location: 'Port Moresby, NCD',
    category_slug: 'legal-and-law',
    experience_level: 'Senior',
    salary_min: 80000, salary_max: 140000,
    job_type: 'full-time',
  },
  {
    title: 'Paralegal - Criminal Law',
    description: 'Provide paralegal support for criminal defense and prosecution matters.\n\nDuties:\n• Prepare court documents and filings\n• Conduct legal research on criminal cases\n• Interview witnesses and prepare statements\n• Organize case files and evidence\n• Attend court hearings and take notes\n• Assist lawyers with trial preparation\n\nRequirements:\n• Diploma in Legal Studies or Paralegal Studies\n• 1+ years paralegal experience\n• Knowledge of PNG criminal law and procedures\n• Good organizational skills\n• Fluent in English and Tok Pisin\n• Computer literacy (MS Office)',
    company_name: 'Public Solicitor\'s Office',
    location: 'Port Moresby, NCD',
    category_slug: 'legal-and-law',
    experience_level: 'Entry Level',
    salary_min: 25000, salary_max: 40000,
    job_type: 'full-time',
  },
  {
    title: 'Environmental Law Consultant',
    description: 'Provide legal advice on environmental and resource management matters in PNG.\n\nResponsibilities:\n• Advise on environmental impact assessments\n• Review environmental permits and compliance\n• Support negotiations on resource extraction agreements\n• Advise on biodiversity and conservation law\n• Draft environmental policies and guidelines\n• Represent clients before environmental tribunals\n\nRequirements:\n• LLB with specialization in environmental law\n• 5+ years experience in environmental/resource law\n• Knowledge of PNG Environment Act and related legislation\n• Experience in mining or petroleum sector preferred\n• Strong research and analytical skills',
    company_name: 'Ashurst PNG',
    location: 'Port Moresby, NCD',
    category_slug: 'legal-and-law',
    experience_level: 'Senior',
    salary_min: 90000, salary_max: 160000,
    job_type: 'contract',
  },
  {
    title: 'Court Registrar Assistant',
    description: 'Support court registry operations at the National Court of Justice.\n\nDuties:\n• Process court documents and filings\n• Maintain court records and databases\n• Schedule court hearings and notify parties\n• Assist judges with administrative matters\n• Issue court orders and certified copies\n• Provide information to legal practitioners and public\n\nRequirements:\n• Diploma in Legal Studies or Business Administration\n• Knowledge of court procedures\n• Strong organizational and filing skills\n• Computer literacy\n• Good communication in English and Tok Pisin\n• Attention to detail and accuracy',
    company_name: 'National Judicial Staff Services',
    location: 'Port Moresby, NCD',
    category_slug: 'legal-and-law',
    experience_level: 'Entry Level',
    salary_min: 22000, salary_max: 35000,
    job_type: 'full-time',
  },
];

const insert = db.prepare(`
  INSERT INTO jobs (employer_id, title, description, company_name, location, country, job_type, 
    experience_level, source, category_slug, category_id, status, salary_min, salary_max, salary_currency,
    created_at, updated_at)
  VALUES (1, ?, ?, ?, ?, 'PG', ?, ?, 'seeded', ?, ?, 'active', ?, ?, 'PGK', datetime('now'), datetime('now'))
`);

// Check for existing titles to avoid duplicates
const existingTitles = new Set(
  db.prepare("SELECT title FROM jobs WHERE status='active'").all().map(r => r.title)
);

const tx = db.transaction(() => {
  let added = 0;
  for (const job of newJobs) {
    if (existingTitles.has(job.title)) {
      console.log(`  Skip (exists): ${job.title}`);
      continue;
    }
    insert.run(
      job.title, job.description, job.company_name, job.location,
      job.job_type, job.experience_level, job.category_slug, cats[job.category_slug],
      job.salary_min, job.salary_max
    );
    console.log(`  Added: ${job.title} [${job.category_slug}]`);
    added++;
  }
  return added;
});

const added = tx();
console.log(`\nAdded ${added} new jobs.`);

// ===== 3. Miscategorization check =====
console.log('\n=== Miscategorization Analysis ===');

const CATEGORY_KEYWORDS = {
  'ngo-and-volunteering': /\bngo\b|volunteer|humanitarian|relief|aid worker|development officer|facilitator|program officer|wash\b|undp|unicef|oxfam|care international|world vision|red cross/i,
  'hospitality-and-tourism': /hotel|resort|chef|cook|waiter|housekeep|tourism|hospitality|front desk|concierge|bartender|dive|tour guide|restaurant/i,
  'security': /security|guard|surveillance|loss prevention|fire safety|protective|cctv|patrol|cyber.?security/i,
  'legal-and-law': /\blaw\b|legal|lawyer|solicitor|barrister|paralegal|compliance|court|litigation|justice|attorney|counsel/i,
  'health-and-medical': /doctor|nurse|medical|health|clinical|pharmacy|hospital|midwife|surgeon|dental/i,
  'education-and-training': /teacher|lecturer|trainer|education|school|university|academic|curriculum|principal/i,
  'engineering': /engineer|engineering|structural|mechanical|electrical|civil engineer|surveyor/i,
  'ict-and-technology': /\bict\b|\bit\b|software|developer|programmer|database|network|systems admin|web dev|cyber/i,
  'mining-and-resources': /mining|mine site|geologist|metallurg|drill|extraction|mineral|petroleum|oil.?gas/i,
  'accounting': /accountant|accounting|auditor|bookkeeper|tax|cpa|financial reporting/i,
  'banking-and-finance': /bank|finance|loan|credit|investment|treasury|financial analyst/i,
  'hr-and-recruitment': /human resource|\bhr\b|recruitment|people.*culture|talent|workforce|payroll officer/i,
  'management-and-executive': /general manager|director|ceo|managing director|country manager|executive|chief/i,
  'marketing-and-sales': /marketing|sales|advertising|brand|promotion|business development|commercial/i,
  'government': /government|public service|department of|provincial admin|district admin/i,
  'construction-and-trades': /construction|carpenter|plumber|electrician|welder|builder|trades|mason/i,
  'manufacturing-and-logistics': /manufactur|logistics|warehouse|supply chain|transport|shipping|freight|production/i,
};

const allJobs = db.prepare("SELECT id, title, description, category_slug FROM jobs WHERE status='active'").all();
let suggestions = 0;

for (const job of allJobs) {
  const text = (job.title + ' ' + (job.description || '')).toLowerCase();
  const matches = [];
  
  for (const [slug, regex] of Object.entries(CATEGORY_KEYWORDS)) {
    if (slug === job.category_slug) continue;
    const m = text.match(regex);
    if (m) matches.push({ slug, match: m[0] });
  }
  
  // Only flag if there's a strong match for another category and no match for current
  const currentRegex = CATEGORY_KEYWORDS[job.category_slug];
  const matchesCurrent = currentRegex ? currentRegex.test(text) : false;
  
  if (matches.length > 0 && !matchesCurrent) {
    console.log(`  [${job.id}] "${job.title}" is ${job.category_slug}, but matches: ${matches.map(m => m.slug + '(' + m.match + ')').join(', ')}`);
    suggestions++;
  }
}

console.log(`\nFound ${suggestions} potential miscategorization(s).`);

// Final category counts
console.log('\n=== Updated Category Counts ===');
db.prepare("SELECT category_slug, COUNT(*) as c FROM jobs WHERE status='active' GROUP BY category_slug ORDER BY c").all()
  .forEach(r => console.log(`  ${r.c}\t${r.category_slug}`));
