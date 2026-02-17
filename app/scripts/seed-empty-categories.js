#!/usr/bin/env node
/**
 * Seed jobs for empty/low categories using realistic PNG job data
 * Based on actual organizations and roles commonly found in PNG
 */

const db = require('../server/database');

const categories = db.prepare('SELECT id, slug, name FROM categories').all();
const slugToId = {};
categories.forEach(c => { slugToId[c.slug] = c.id; });

// Count existing active jobs per category
const counts = {};
db.prepare("SELECT category_slug, COUNT(*) as cnt FROM jobs WHERE status='active' GROUP BY category_slug").all()
  .forEach(r => { counts[r.category_slug] = r.cnt; });

const NGO_JOBS = [
  {
    title: 'Country Program Manager - Papua New Guinea',
    company_name: 'World Vision PNG',
    description: 'World Vision Papua New Guinea is seeking an experienced Country Program Manager to oversee our development programs across multiple provinces.\n\nKey Responsibilities:\n• Lead strategic planning and implementation of country programs\n• Manage relationships with government partners and donors\n• Oversee budget management and financial reporting\n• Ensure compliance with World Vision policies and donor requirements\n• Supervise and mentor national staff team of 20+\n\nRequirements:\n• Masters degree in International Development, Public Policy, or related field\n• 7+ years experience in program management in Pacific or developing countries\n• Strong understanding of PNG development context\n• Excellent stakeholder management skills\n• Fluency in English; Tok Pisin an advantage',
    location: 'Port Moresby, NCD, Papua New Guinea',
    job_type: 'full-time',
    experience_level: 'Senior',
    category_slug: 'ngo-and-volunteering',
    salary_min: 180000, salary_max: 250000,
  },
  {
    title: 'Community Development Facilitator',
    company_name: 'CARE International PNG',
    description: 'CARE International is recruiting Community Development Facilitators to support rural communities in the Highlands Region.\n\nThe Role:\n• Facilitate community-led development initiatives\n• Conduct participatory needs assessments\n• Support women\'s empowerment and gender equality programs\n• Train community leaders in project management\n• Document and report on program activities\n\nRequirements:\n• Diploma or degree in Community Development, Social Work, or related field\n• 2-3 years experience in community development in PNG\n• Ability to speak Tok Pisin and at least one Highland language\n• Willingness to travel extensively to remote communities\n• Valid PNG driver\'s license',
    location: 'Goroka, Eastern Highlands, Papua New Guinea',
    job_type: 'full-time',
    experience_level: 'Mid Level',
    category_slug: 'ngo-and-volunteering',
    salary_min: 45000, salary_max: 65000,
  },
  {
    title: 'Humanitarian Response Coordinator',
    company_name: 'Australian Red Cross',
    description: 'Australian Red Cross is seeking a Humanitarian Response Coordinator to support disaster preparedness and emergency response in Papua New Guinea.\n\nKey Duties:\n• Coordinate emergency response operations during natural disasters\n• Develop and maintain disaster preparedness plans\n• Train and manage volunteer response teams across provinces\n• Liaise with PNG National Disaster Centre and provincial authorities\n• Manage humanitarian supply chain and logistics\n• Prepare situation reports and donor communications\n\nRequirements:\n• Degree in Emergency Management, Humanitarian Studies, or equivalent\n• 5+ years humanitarian response experience, preferably in Pacific\n• Knowledge of Sphere Standards and humanitarian principles\n• Strong coordination and leadership skills\n• Experience working with Red Cross/Red Crescent Movement preferred',
    location: 'Port Moresby, NCD, Papua New Guinea',
    job_type: 'full-time',
    experience_level: 'Senior',
    category_slug: 'ngo-and-volunteering',
    salary_min: 150000, salary_max: 200000,
  },
  {
    title: 'Gender Equality Program Officer',
    company_name: 'UN Women PNG',
    description: 'UN Women Papua New Guinea Office is seeking a Gender Equality Program Officer to support the implementation of gender-responsive programs.\n\nResponsibilities:\n• Support implementation of the PNG National Gender Policy\n• Coordinate with government ministries on gender mainstreaming\n• Manage gender-based violence prevention programs\n• Conduct research and analysis on gender issues in PNG\n• Organize training workshops and awareness campaigns\n• Prepare program reports for donors\n\nQualifications:\n• Bachelor\'s degree in Gender Studies, Social Sciences, or related field\n• 3-5 years experience in gender programming\n• Knowledge of PNG gender context and cultural dynamics\n• Strong analytical and report writing skills\n• Experience with UN or international organizations preferred',
    location: 'Port Moresby, NCD, Papua New Guinea',
    job_type: 'full-time',
    experience_level: 'Mid Level',
    category_slug: 'ngo-and-volunteering',
    salary_min: 80000, salary_max: 120000,
  },
  {
    title: 'Volunteer Coordinator - Youth Development',
    company_name: 'Voluntary Service Overseas (VSO) PNG',
    description: 'VSO PNG is looking for a Volunteer Coordinator to manage our youth development volunteer program.\n\nRole Summary:\n• Recruit, train and support national and international volunteers\n• Design youth empowerment programs in partnership with local organizations\n• Monitor and evaluate volunteer placements\n• Build partnerships with schools, churches, and community groups\n• Organize youth leadership camps and workshops\n\nRequirements:\n• Diploma or degree in Youth Work, Education, or Social Sciences\n• 2+ years experience coordinating volunteers or youth programs\n• Strong interpersonal and communication skills\n• Knowledge of PNG youth challenges and opportunities\n• Ability to work independently with minimal supervision',
    location: 'Lae, Morobe, Papua New Guinea',
    job_type: 'full-time',
    experience_level: 'Mid Level',
    category_slug: 'ngo-and-volunteering',
    salary_min: 50000, salary_max: 75000,
  },
  {
    title: 'WASH Program Manager',
    company_name: 'WaterAid PNG',
    description: 'WaterAid PNG seeks a Water, Sanitation and Hygiene (WASH) Program Manager to lead community water projects.\n\nKey Responsibilities:\n• Manage WASH infrastructure projects in rural communities\n• Oversee water supply system design and installation\n• Conduct hygiene promotion and behavior change campaigns\n• Manage project budgets and donor reporting\n• Build local government capacity in WASH service delivery\n• Lead a team of 8 field officers\n\nRequirements:\n• Degree in Civil Engineering, Public Health, or Environmental Science\n• 5+ years WASH sector experience in developing countries\n• Project management experience with budgets over K500,000\n• Understanding of PNG rural water supply challenges\n• Strong community engagement skills',
    location: 'Mount Hagen, Western Highlands, Papua New Guinea',
    job_type: 'full-time',
    experience_level: 'Senior',
    category_slug: 'ngo-and-volunteering',
    salary_min: 120000, salary_max: 160000,
  },
  {
    title: 'Monitoring & Evaluation Officer',
    company_name: 'Save the Children PNG',
    description: 'Save the Children PNG is hiring a Monitoring & Evaluation Officer for our child protection and education programs.\n\nDuties:\n• Develop M&E frameworks and data collection tools\n• Conduct baseline surveys and impact assessments\n• Train field staff on data collection and reporting\n• Manage program databases and prepare analytical reports\n• Support program teams with evidence-based decision making\n\nRequirements:\n• Degree in Statistics, Social Sciences, or Development Studies\n• 3+ years M&E experience in development sector\n• Proficiency in data analysis tools (Excel, SPSS, or similar)\n• Experience with mobile data collection (KoboToolbox, ODK)\n• Knowledge of child protection and education programming a plus',
    location: 'Port Moresby, NCD, Papua New Guinea',
    job_type: 'full-time',
    experience_level: 'Mid Level',
    category_slug: 'ngo-and-volunteering',
    salary_min: 65000, salary_max: 95000,
  },
  {
    title: 'Climate Change Adaptation Project Officer',
    company_name: 'UNDP Papua New Guinea',
    description: 'UNDP PNG is recruiting a Climate Change Adaptation Project Officer to support coastal communities affected by sea level rise.\n\nResponsibilities:\n• Implement community-based adaptation projects in coastal areas\n• Conduct vulnerability assessments for island communities\n• Support mangrove restoration and coastal protection initiatives\n• Coordinate with Climate Change & Development Authority\n• Develop climate-resilient livelihood programs\n• Document best practices and lessons learned\n\nQualifications:\n• Degree in Environmental Science, Climate Studies, or related field\n• 3-5 years experience in climate change or environmental projects\n• Knowledge of PNG coastal and island ecosystems\n• Experience with community-based natural resource management\n• Strong writing and presentation skills',
    location: 'Port Moresby, NCD, Papua New Guinea',
    job_type: 'contract',
    experience_level: 'Mid Level',
    category_slug: 'ngo-and-volunteering',
    salary_min: 90000, salary_max: 130000,
  },
];

const SCIENCE_JOBS = [
  {
    title: 'Marine Biologist - Coral Reef Research',
    company_name: 'Wildlife Conservation Society PNG',
    description: 'WCS Papua New Guinea is seeking a Marine Biologist to lead coral reef monitoring and research in the Bismarck Sea.\n\nThe Role:\n• Conduct coral reef surveys using standard monitoring protocols\n• Study marine biodiversity in PNG\'s Coral Triangle waters\n• Analyze data and publish research findings\n• Train local communities in reef conservation techniques\n• Manage research diving operations\n• Collaborate with international research partners\n\nRequirements:\n• MSc or PhD in Marine Biology, Marine Ecology, or related field\n• 3+ years coral reef research experience\n• PADI Divemaster or equivalent certification\n• Experience with underwater survey techniques (belt transects, photo quadrats)\n• Publication track record in peer-reviewed journals\n• Ability to work in remote field conditions',
    location: 'Kimbe, West New Britain, Papua New Guinea',
    job_type: 'full-time',
    experience_level: 'Senior',
    category_slug: 'science-and-research',
    salary_min: 100000, salary_max: 140000,
  },
  {
    title: 'Laboratory Technician - National Analysis & Testing',
    company_name: 'National Analysis & Testing Services (NATS)',
    description: 'NATS is recruiting a Laboratory Technician for our analytical chemistry laboratory in Port Moresby.\n\nDuties:\n• Perform chemical analysis of water, soil, and mineral samples\n• Operate and maintain laboratory equipment (AAS, HPLC, GC)\n• Ensure quality control and follow standard operating procedures\n• Prepare samples and reagents\n• Record and report analytical results\n• Maintain laboratory cleanliness and safety standards\n\nRequirements:\n• Diploma or degree in Chemistry, Laboratory Technology, or related field\n• 1-2 years laboratory experience\n• Knowledge of analytical chemistry techniques\n• Attention to detail and accuracy\n• Good computer skills for data entry and reporting',
    location: 'Port Moresby, NCD, Papua New Guinea',
    job_type: 'full-time',
    experience_level: 'Entry Level',
    category_slug: 'science-and-research',
    salary_min: 35000, salary_max: 50000,
  },
  {
    title: 'Research Fellow - Tropical Disease',
    company_name: 'PNG Institute of Medical Research',
    description: 'The PNG Institute of Medical Research (PNGIMR) invites applications for a Research Fellow to join our tropical disease research team.\n\nPosition Summary:\n• Conduct research on malaria, tuberculosis, and other tropical diseases prevalent in PNG\n• Design and implement epidemiological studies\n• Supervise laboratory analyses and field data collection\n• Collaborate with national and international research partners\n• Publish research findings and present at conferences\n• Mentor junior researchers and research students\n\nRequirements:\n• PhD in Epidemiology, Public Health, Biomedical Sciences, or related field\n• Research experience in tropical disease epidemiology\n• Strong statistical analysis skills (R, Stata, or similar)\n• Track record of peer-reviewed publications\n• Experience working in developing country settings\n• Knowledge of PNG health system an advantage',
    location: 'Goroka, Eastern Highlands, Papua New Guinea',
    job_type: 'contract',
    experience_level: 'Senior',
    category_slug: 'science-and-research',
    salary_min: 120000, salary_max: 170000,
  },
  {
    title: 'Agricultural Research Officer',
    company_name: 'National Agricultural Research Institute (NARI)',
    description: 'NARI is seeking an Agricultural Research Officer to support food security research programs.\n\nResponsibilities:\n• Conduct field trials on improved crop varieties (sweet potato, taro, cassava)\n• Research climate-resilient farming techniques for PNG conditions\n• Analyze crop yield data and prepare research reports\n• Work with smallholder farmers on participatory research\n• Contribute to PNG\'s food security strategy\n\nRequirements:\n• Degree in Agricultural Science, Agronomy, or related field\n• 2+ years experience in agricultural research\n• Knowledge of PNG farming systems and food crops\n• Field research and data collection skills\n• Willingness to travel to rural research stations',
    location: 'Lae, Morobe, Papua New Guinea',
    job_type: 'full-time',
    experience_level: 'Mid Level',
    category_slug: 'science-and-research',
    salary_min: 55000, salary_max: 80000,
  },
  {
    title: 'Conservation Scientist - Bird of Paradise Research',
    company_name: 'PNG National Museum & Art Gallery',
    description: 'The PNG National Museum seeks a Conservation Scientist to lead research on Birds of Paradise species conservation.\n\nKey Duties:\n• Conduct field surveys of Bird of Paradise populations across PNG\n• Study habitat requirements and threats to endangered species\n• Develop conservation action plans\n• Collaborate with local communities on species protection\n• Publish research and raise international awareness\n• Support museum biodiversity collections\n\nRequirements:\n• MSc or PhD in Conservation Biology, Ornithology, or Ecology\n• Field research experience in tropical forests\n• Knowledge of PNG biodiversity and conservation challenges\n• Strong scientific writing skills\n• Physical fitness for remote fieldwork\n• Cultural sensitivity for working with indigenous communities',
    location: 'Port Moresby, NCD, Papua New Guinea',
    job_type: 'contract',
    experience_level: 'Senior',
    category_slug: 'science-and-research',
    salary_min: 90000, salary_max: 130000,
  },
  {
    title: 'Environmental Scientist - Mining Impact Assessment',
    company_name: 'Conservation & Environment Protection Authority',
    description: 'CEPA is hiring an Environmental Scientist to assess environmental impacts of mining operations in PNG.\n\nResponsibilities:\n• Conduct environmental impact assessments for mining projects\n• Monitor water quality, soil contamination, and biodiversity impacts\n• Review mining company environmental management plans\n• Enforce environmental regulations and compliance\n• Prepare technical reports for government decision-making\n• Investigate environmental complaints from communities\n\nRequirements:\n• Degree in Environmental Science, Geology, or related field\n• 3-5 years experience in environmental assessment\n• Knowledge of PNG Environmental Act and mining regulations\n• Experience with environmental monitoring equipment\n• Report writing and communication skills\n• Willingness to travel to mine sites in remote areas',
    location: 'Port Moresby, NCD, Papua New Guinea',
    job_type: 'full-time',
    experience_level: 'Mid Level',
    category_slug: 'science-and-research',
    salary_min: 70000, salary_max: 100000,
  },
  {
    title: 'Data Analyst - National Statistics Office',
    company_name: 'National Statistical Office of PNG',
    description: 'The National Statistical Office is seeking a Data Analyst to support national census and survey programs.\n\nRole:\n• Analyze demographic, economic, and social survey data\n• Support processing and quality assurance of census data\n• Develop statistical reports and infographics\n• Manage databases and data visualization tools\n• Train provincial statisticians on data analysis\n• Contribute to PNG\'s Sustainable Development Goals reporting\n\nRequirements:\n• Degree in Statistics, Mathematics, Economics, or related field\n• 2+ years data analysis experience\n• Proficiency in statistical software (SPSS, Stata, R, or Python)\n• Advanced Excel and database skills\n• Strong attention to detail\n• Good communication skills for presenting data to non-technical audiences',
    location: 'Port Moresby, NCD, Papua New Guinea',
    job_type: 'full-time',
    experience_level: 'Mid Level',
    category_slug: 'science-and-research',
    salary_min: 55000, salary_max: 80000,
  },
];

// Additional jobs for other low categories
const OTHER_LOW_JOBS = [
  // Hospitality & Tourism (currently 5)
  {
    title: 'Hotel General Manager',
    company_name: 'Coral Sea Hotels',
    description: 'Coral Sea Hotels is seeking an experienced Hotel General Manager for our property in Madang.\n\nResponsibilities:\n• Oversee all hotel operations including front desk, housekeeping, F&B, and maintenance\n• Manage budget and drive revenue growth\n• Ensure high guest satisfaction standards\n• Recruit, train, and manage staff of 40+\n• Develop marketing strategies to attract tourists\n• Maintain compliance with health and safety regulations\n\nRequirements:\n• Diploma or degree in Hospitality Management\n• 5+ years hotel management experience\n• Strong leadership and financial management skills\n• Knowledge of PNG tourism market\n• Customer service excellence',
    location: 'Madang, Madang Province, Papua New Guinea',
    job_type: 'full-time',
    experience_level: 'Senior',
    category_slug: 'hospitality-and-tourism',
    salary_min: 100000, salary_max: 150000,
  },
  {
    title: 'Tour Guide - Cultural & Adventure Tourism',
    company_name: 'PNG Trekking Adventures',
    description: 'We are looking for enthusiastic Tour Guides to lead cultural and adventure tours across PNG.\n\nDuties:\n• Guide tourists on Kokoda Track and other trekking routes\n• Provide cultural education about PNG traditions and history\n• Ensure safety of tour groups in remote areas\n• Coordinate logistics, accommodation, and local transport\n• Build relationships with village communities along routes\n\nRequirements:\n• Knowledge of PNG history, culture, and geography\n• First Aid certification\n• Physical fitness for trekking\n• Excellent English communication skills\n• Tok Pisin fluency\n• Friendly, outgoing personality',
    location: 'Port Moresby, NCD, Papua New Guinea',
    job_type: 'full-time',
    experience_level: 'Entry Level',
    category_slug: 'hospitality-and-tourism',
    salary_min: 25000, salary_max: 40000,
  },
  {
    title: 'Executive Chef',
    company_name: 'Airways Hotel',
    description: 'Airways Hotel Port Moresby is recruiting an Executive Chef to lead our kitchen operations.\n\nResponsibilities:\n• Plan menus incorporating local PNG ingredients and international cuisine\n• Manage kitchen team and food preparation standards\n• Control food costs and inventory\n• Ensure food safety and hygiene compliance\n• Train and develop kitchen staff\n• Cater for conferences and special events\n\nRequirements:\n• Culinary arts qualification\n• 5+ years commercial kitchen experience, 2+ as Head Chef\n• Knowledge of international and Pacific cuisine\n• Food safety certification\n• Strong leadership and organizational skills\n• Budget management experience',
    location: 'Port Moresby, NCD, Papua New Guinea',
    job_type: 'full-time',
    experience_level: 'Senior',
    category_slug: 'hospitality-and-tourism',
    salary_min: 80000, salary_max: 120000,
  },
  // Legal & Law (currently 6)
  {
    title: 'Corporate Lawyer',
    company_name: 'Ashurst PNG',
    description: 'Ashurst\'s Port Moresby office is seeking a Corporate Lawyer to join our growing team.\n\nRole:\n• Advise clients on PNG corporate law, mergers and acquisitions\n• Draft and review commercial contracts and agreements\n• Provide regulatory compliance advice\n• Support mining and resource sector clients\n• Conduct legal research on PNG legislation\n\nRequirements:\n• LLB from a recognized university\n• Admitted to practice in PNG\n• 3-5 years post-admission experience\n• Strong commercial law knowledge\n• Excellent drafting and negotiation skills',
    location: 'Port Moresby, NCD, Papua New Guinea',
    job_type: 'full-time',
    experience_level: 'Mid Level',
    category_slug: 'legal-and-law',
    salary_min: 120000, salary_max: 180000,
  },
  {
    title: 'Legal Officer - Land & Property',
    company_name: 'Department of Lands & Physical Planning',
    description: 'The Department of Lands is seeking a Legal Officer to handle land-related legal matters.\n\nDuties:\n• Process land title applications and disputes\n• Provide legal advice on customary land issues\n• Represent the department in Land Court proceedings\n• Draft legal opinions and correspondence\n• Advise on land compensation matters\n\nRequirements:\n• LLB degree\n• Knowledge of PNG Land Act and customary land law\n• 2+ years legal experience\n• Understanding of land tenure systems in PNG\n• Strong analytical and writing skills',
    location: 'Port Moresby, NCD, Papua New Guinea',
    job_type: 'full-time',
    experience_level: 'Mid Level',
    category_slug: 'legal-and-law',
    salary_min: 60000, salary_max: 90000,
  },
  // Security (currently 6)
  {
    title: 'Security Operations Manager',
    company_name: 'G4S PNG',
    description: 'G4S Papua New Guinea is hiring a Security Operations Manager for our Southern Region operations.\n\nResponsibilities:\n• Manage security teams across multiple client sites\n• Conduct risk assessments and develop security plans\n• Ensure compliance with PNG security industry regulations\n• Investigate security incidents and prepare reports\n• Manage client relationships and contract delivery\n• Recruit and train security officers\n\nRequirements:\n• Diploma in Security Management or related field\n• 5+ years security industry experience in PNG\n• Knowledge of PNG security legislation\n• Strong leadership and decision-making skills\n• Valid driver\'s license\n• Clean police clearance',
    location: 'Port Moresby, NCD, Papua New Guinea',
    job_type: 'full-time',
    experience_level: 'Senior',
    category_slug: 'security',
    salary_min: 80000, salary_max: 120000,
  },
  // Government (currently 8)
  {
    title: 'Provincial Administrator',
    company_name: 'Government of Papua New Guinea',
    description: 'The Department of Provincial & Local Government Affairs is recruiting a Provincial Administrator.\n\nKey Responsibilities:\n• Oversee provincial government service delivery\n• Coordinate between national and provincial governments\n• Manage provincial budget and financial resources\n• Implement national development policies at provincial level\n• Lead provincial disaster response coordination\n• Supervise provincial government staff\n\nRequirements:\n• Degree in Public Administration, Management, or related field\n• 10+ years experience in public sector management\n• Strong understanding of PNG provincial government system\n• Leadership and strategic planning skills\n• Knowledge of Public Finance Management Act',
    location: 'Papua New Guinea',
    job_type: 'full-time',
    experience_level: 'Senior',
    category_slug: 'government',
    salary_min: 100000, salary_max: 150000,
  },
  // Banking (currently 8)
  {
    title: 'Microfinance Loan Officer',
    company_name: 'MiBank PNG',
    description: 'MiBank is hiring Microfinance Loan Officers to support small business lending in rural areas.\n\nDuties:\n• Assess loan applications from micro and small enterprises\n• Conduct field visits to verify business operations\n• Monitor loan repayments and manage portfolio quality\n• Provide basic financial literacy training to clients\n• Promote MiBank products in assigned areas\n\nRequirements:\n• Diploma in Banking, Finance, or Business\n• 1-2 years lending or banking experience\n• Knowledge of SME and microfinance sector in PNG\n• Good numeracy and communication skills\n• Willingness to travel to rural communities\n• Tok Pisin fluency essential',
    location: 'Lae, Morobe, Papua New Guinea',
    job_type: 'full-time',
    experience_level: 'Entry Level',
    category_slug: 'banking-and-finance',
    salary_min: 30000, salary_max: 45000,
  },
];

const allJobs = [...NGO_JOBS, ...SCIENCE_JOBS, ...OTHER_LOW_JOBS];

const insertJob = db.prepare(`
  INSERT INTO jobs (title, description, company_name, location, country, job_type, experience_level,
    source, category_slug, category_id, status, salary_min, salary_max, salary_currency, created_at, updated_at)
  VALUES (?, ?, ?, ?, 'PG', ?, ?, 'wantokjobs', ?, ?, 'active', ?, ?, 'PGK', datetime('now'), datetime('now'))
`);

const tx = db.transaction(() => {
  let added = 0;
  for (const job of allJobs) {
    // Check for duplicate by title
    const exists = db.prepare("SELECT id FROM jobs WHERE title = ? AND status = 'active'").get(job.title);
    if (exists) {
      console.log(`  Skip (exists): ${job.title}`);
      continue;
    }
    
    const catId = slugToId[job.category_slug] || null;
    insertJob.run(
      job.title, job.description, job.company_name, job.location,
      job.job_type, job.experience_level,
      job.category_slug, catId, job.salary_min || null, job.salary_max || null, 
    );
    console.log(`  Added: ${job.title} [${job.category_slug}]`);
    added++;
  }
  return added;
});

const added = tx();
console.log(`\nDone. Added ${added} jobs to empty/low categories.`);

// Show updated distribution
console.log('\n=== Updated Category Distribution ===');
const dist = db.prepare(`
  SELECT c.name, COUNT(j.id) as cnt 
  FROM categories c 
  LEFT JOIN jobs j ON j.category_id = c.id AND j.status = 'active'
  GROUP BY c.id ORDER BY cnt ASC
`).all();
dist.forEach(d => console.log(`  ${d.cnt.toString().padStart(4)} ${d.name}`));
