#!/usr/bin/env node
/**
 * Seed Science & Research jobs for PNG
 */
const db = require('../server/database');

const JOBS = [
  {
    title: 'Marine Biologist – Coral Reef Monitoring Program',
    company_name: 'Wildlife Conservation Society PNG',
    description: 'WCS Papua New Guinea seeks a Marine Biologist to lead coral reef monitoring across Kimbe Bay and Milne Bay Marine Protected Areas.\n\nResponsibilities:\n• Conduct underwater reef health surveys using point-intercept and photo-quadrat methods\n• Analyse coral bleaching patterns and produce quarterly health reports\n• Train community rangers in basic reef monitoring techniques\n• Collaborate with CEPA and provincial fisheries officers on marine conservation policy\n• Manage and maintain the PNG Reef Database\n\nThis is a field-heavy role requiring 60%+ time on remote island field stations.',
    requirements: 'BSc/MSc in Marine Biology or Marine Science. PADI Advanced Open Water (minimum). 3+ years reef survey experience in tropical Indo-Pacific. Statistical analysis skills (R or Python). Ability to live in remote conditions. Valid PNG work permit or citizenship.',
    location: 'Kimbe, West New Britain Province',
    experience_level: 'Mid-level',
    industry: 'Conservation',
    salary_min: 85000, salary_max: 120000,
    job_type: 'full-time',
  },
  {
    title: 'Environmental Scientist – Mining Impact Assessment',
    company_name: 'Newcrest Mining Limited',
    description: 'Newcrest\'s Lihir Gold operation requires an Environmental Scientist to manage environmental monitoring and impact assessments.\n\nKey Duties:\n• Conduct water quality, air quality, and sediment sampling programs\n• Prepare environmental monitoring reports for CEPA compliance\n• Lead baseline studies for mine expansion environmental impact statements\n• Manage rehabilitation trials on disturbed mine land\n• Liaise with local landowner communities on environmental grievances\n• Supervise a team of 4 environmental technicians',
    requirements: 'BSc/MSc in Environmental Science, Chemistry, or related discipline. 4+ years experience in environmental monitoring, preferably mining sector. Knowledge of PNG Environment Act 2000. Experience with water quality analysis (ICP-MS, IC). Strong report writing skills. Willingness to work FIFO roster (3 weeks on / 1 week off).',
    location: 'Lihir Island, New Ireland Province',
    experience_level: 'Mid-level',
    industry: 'Mining',
    salary_min: 120000, salary_max: 180000,
    job_type: 'full-time',
  },
  {
    title: 'Agricultural Research Officer – Cocoa & Coconut',
    company_name: 'PNG Cocoa Coconut Institute (CCI)',
    description: 'The Cocoa Coconut Institute seeks a Research Officer to join our plant breeding and agronomy team at the Tavilo Research Station.\n\nResponsibilities:\n• Conduct field trials on cocoa hybrid varieties for yield and disease resistance\n• Monitor Cocoa Pod Borer (CPB) spread and evaluate integrated pest management strategies\n• Collect and analyse agronomic data from on-station and on-farm trials\n• Publish research findings in CCI Technical Bulletins\n• Provide technical advice to extension officers and smallholder farmers\n• Maintain germplasm collections',
    requirements: 'BSc in Agriculture, Agronomy, or Plant Science. 2+ years field research experience. Knowledge of tropical tree crops preferred. Data analysis skills (Excel, GenStat or R). Ability to work in rural East New Britain. PNG citizen preferred.',
    location: 'Tavilo, East New Britain Province',
    experience_level: 'Entry-level',
    industry: 'Agriculture',
    salary_min: 45000, salary_max: 65000,
    job_type: 'full-time',
  },
  {
    title: 'Laboratory Technician – National Analysis Laboratory',
    company_name: 'National Analytical Laboratory (NAL)',
    description: 'NAL, the premier analytical testing facility in PNG, is hiring a Laboratory Technician for our chemistry section in Lae.\n\nDuties:\n• Prepare samples and perform chemical analyses (water, soil, mineral)\n• Operate and maintain analytical instruments (AAS, UV-Vis, pH meters)\n• Follow standard operating procedures and quality assurance protocols\n• Record results accurately in LIMS database\n• Assist with ISO 17025 accreditation documentation\n• Maintain laboratory cleanliness and safety standards',
    requirements: 'Diploma or BSc in Chemistry, Applied Science, or Laboratory Technology. Hands-on experience with wet chemistry techniques. Familiarity with laboratory safety protocols. Attention to detail and accurate record-keeping. Computer literacy. Lae-based or willing to relocate.',
    location: 'Lae, Morobe Province',
    experience_level: 'Entry-level',
    industry: 'Laboratory Services',
    salary_min: 35000, salary_max: 50000,
    job_type: 'full-time',
  },
  {
    title: 'Research Assistant – School of Natural & Physical Sciences',
    company_name: 'University of Papua New Guinea (UPNG)',
    description: 'UPNG invites applications for a Research Assistant position in the School of Natural & Physical Sciences, supporting a 3-year ARC-funded project on PNG freshwater biodiversity.\n\nResponsibilities:\n• Collect freshwater invertebrate and fish samples from river systems in Central and Gulf Provinces\n• Process and identify specimens using morphological and molecular (DNA barcoding) methods\n• Maintain specimen databases and contribute to scientific publications\n• Assist with undergraduate teaching laboratories\n• Coordinate logistics for remote field expeditions',
    requirements: 'BSc in Biology, Zoology, or Environmental Science from a recognised university. Field sampling experience in PNG desirable. Basic molecular biology lab skills preferred. Valid PNG driver\'s licence. Physical fitness for fieldwork in remote terrain. Strong organisational skills.',
    location: 'Waigani, NCD (Port Moresby)',
    experience_level: 'Entry-level',
    industry: 'Higher Education',
    salary_min: 38000, salary_max: 52000,
    job_type: 'full-time',
  },
  {
    title: 'Conservation Scientist – Tree Kangaroo Conservation Program',
    company_name: 'Woodland Park Zoo / TKCP',
    description: 'The Tree Kangaroo Conservation Program (TKCP) seeks a Conservation Scientist to lead biodiversity monitoring in the YUS Conservation Area, Huon Peninsula.\n\nKey Responsibilities:\n• Design and implement long-term wildlife monitoring protocols for Matschie\'s tree kangaroo and other endemic species\n• Manage camera trap networks and analyse occupancy data\n• Work closely with YUS landowner communities to integrate traditional ecological knowledge\n• Prepare grant reports and scientific manuscripts\n• Mentor PNG national research staff and university students\n• Coordinate with Conservation and Environment Protection Authority (CEPA)',
    requirements: 'MSc/PhD in Conservation Biology, Ecology, or Wildlife Management. 3+ years tropical field research experience. Strong quantitative ecology skills (occupancy modelling, distance sampling). Community engagement experience in Melanesia or Pacific Islands. Grant writing experience. Willingness to live in remote Huon Peninsula field station for extended periods.',
    location: 'YUS Conservation Area, Morobe Province',
    experience_level: 'Senior',
    industry: 'Conservation',
    salary_min: 100000, salary_max: 150000,
    job_type: 'full-time',
  },
  {
    title: 'Geologist – Exploration Division',
    company_name: 'Ok Tedi Mining Limited',
    description: 'Ok Tedi Mining Limited is recruiting a Geologist for our Exploration Division based at the Tabubil mine site in Western Province.\n\nDuties:\n• Conduct geological mapping and core logging for brownfield exploration targets\n• Interpret geochemical and geophysical data to generate drill targets\n• Manage diamond drill programs and ensure core handling/storage to industry standards\n• Build and update 3D geological models (Leapfrog Geo)\n• Prepare technical reports for internal and regulatory purposes\n• Mentor graduate geologists and field technicians',
    requirements: 'BSc/MSc in Geology or Geoscience. 5+ years exploration or mine geology experience, preferably porphyry copper-gold systems. Proficiency in Leapfrog Geo, ArcGIS, and Micromine. Understanding of PNG Mineral Resources Authority regulatory requirements. FIFO roster: 4 weeks on / 2 weeks off. PNG citizen or valid work permit.',
    location: 'Tabubil, Western Province',
    experience_level: 'Mid-level',
    industry: 'Mining',
    salary_min: 150000, salary_max: 220000,
    job_type: 'full-time',
  },
  {
    title: 'Lecturer in Applied Physics – PNG University of Technology',
    company_name: 'PNG University of Technology (UNITECH)',
    description: 'UNITECH\'s Department of Applied Physics invites applications for a Lecturer position.\n\nResponsibilities:\n• Teach undergraduate courses in mechanics, thermodynamics, and electronics\n• Supervise final-year student research projects\n• Conduct research aligned with PNG development priorities (renewable energy, materials science, or geophysics)\n• Publish in peer-reviewed journals and present at national/international conferences\n• Contribute to department administration and curriculum development\n• Engage with industry partners for applied research collaboration',
    requirements: 'PhD in Physics, Applied Physics, or closely related field. Teaching experience at university level. Active research program with publication record. Ability to supervise postgraduate students. Commitment to capacity building in PNG. Familiarity with laboratory equipment maintenance in resource-constrained settings.',
    location: 'Lae, Morobe Province',
    experience_level: 'Senior',
    industry: 'Higher Education',
    salary_min: 90000, salary_max: 130000,
    job_type: 'full-time',
  },
  {
    title: 'Fisheries Research Officer',
    company_name: 'National Fisheries Authority (NFA)',
    description: 'The National Fisheries Authority is seeking a Fisheries Research Officer to support sustainable management of PNG\'s tuna and coastal fisheries.\n\nDuties:\n• Collect and analyse catch and effort data from commercial and artisanal fisheries\n• Conduct stock assessment modelling for key tuna species (skipjack, yellowfin, bigeye)\n• Participate in WCPFC Scientific Committee meetings and working groups\n• Design and implement fishery-independent surveys\n• Prepare policy briefs for NFA management on harvest strategy options\n• Collaborate with SPC (Pacific Community) scientists on regional assessments',
    requirements: 'BSc/MSc in Fisheries Science, Marine Biology, or Quantitative Ecology. Experience with stock assessment software (Stock Synthesis, MULTIFAN-CL) preferred. Strong data analysis and statistical skills. Understanding of Pacific tuna fisheries management frameworks. Excellent written and verbal English. PNG citizen or eligible for work permit.',
    location: 'Port Moresby, NCD',
    experience_level: 'Mid-level',
    industry: 'Fisheries',
    salary_min: 70000, salary_max: 95000,
    job_type: 'full-time',
  },
  {
    title: 'Research Fellow – Climate Change Adaptation',
    company_name: 'Divine Word University (DWU)',
    description: 'DWU\'s Faculty of Health Sciences invites applications for a Research Fellow to lead a new climate change and health adaptation research program.\n\nResponsibilities:\n• Design and implement research on climate change impacts on food security and health in PNG highlands and coastal communities\n• Secure competitive research funding (ARC, ACIAR, WHO)\n• Supervise Masters and Honours students\n• Build partnerships with PNG government agencies (CCDA, NDOH) and international research networks\n• Publish findings in high-impact journals\n• Develop community-based adaptation interventions',
    requirements: 'PhD in Environmental Health, Climate Science, Public Health, or related field. Demonstrated research track record with publications. Experience working in Pacific Island countries. Grant acquisition experience. Strong community engagement and participatory research skills. Ability to work in Madang and travel to remote field sites.',
    location: 'Madang, Madang Province',
    experience_level: 'Senior',
    industry: 'Higher Education',
    salary_min: 95000, salary_max: 140000,
    job_type: 'full-time',
  },
];

const insert = db.prepare(`
  INSERT INTO jobs (title, description, requirements, location, country, job_type, experience_level, industry,
    salary_min, salary_max, salary_currency, status, source, employer_id, company_name,
    category_slug, category_id, created_at, updated_at)
  VALUES (@title, @description, @requirements, @location, 'Papua New Guinea', @job_type, @experience_level, @industry,
    @salary_min, @salary_max, 'PGK', 'active', 'seed', 11, @company_name,
    'science-and-research', 19, datetime('now'), datetime('now'))
`);

const tx = db.transaction(() => {
  let count = 0;
  for (const job of JOBS) {
    insert.run(job);
    count++;
    console.log(`  ✓ ${job.title} (${job.company_name})`);
  }
  return count;
});

console.log('Seeding Science & Research jobs...');
const n = tx();
console.log(`\nDone! Inserted ${n} jobs.`);

// Update category job count
db.prepare("UPDATE categories SET job_count = (SELECT COUNT(*) FROM jobs WHERE category_slug = 'science-and-research' AND status = 'active') WHERE slug = 'science-and-research'").run();
console.log('Category job_count updated.');

process.exit(0);
