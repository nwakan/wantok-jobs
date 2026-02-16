const Database = require('better-sqlite3');
const db = new Database('./server/data/wantokjobs.db');

// Category metadata with SEEK-style descriptions and lucide-react icon names
const categoryData = {
  'accounting': {
    icon_name: 'Calculator',
    description: 'Find accounting, bookkeeping, and financial reporting jobs in PNG. Opportunities for qualified accountants, auditors, and finance professionals.',
    meta_title: 'Accounting Jobs in PNG | WantokJobs',
    meta_description: 'Discover accounting and bookkeeping jobs in Papua New Guinea. Apply to top employers hiring accountants, auditors, and financial professionals.',
    featured: 1,
    trending: 0
  },
  'administration': {
    icon_name: 'FileText',
    description: 'Administrative, office management, and executive assistant roles across PNG. Support businesses with your organizational skills.',
    meta_title: 'Administration Jobs in PNG | WantokJobs',
    meta_description: 'Browse administrative, receptionist, and office management jobs in Papua New Guinea. Apply for roles in leading PNG organizations.',
    featured: 1,
    trending: 1
  },
  'banking-and-finance': {
    icon_name: 'DollarSign',
    description: 'Banking, finance, and investment opportunities in PNG financial sector. Join banks, credit unions, and financial institutions.',
    meta_title: 'Banking & Finance Jobs in PNG | WantokJobs',
    meta_description: 'Find banking, finance, and investment jobs in PNG. Opportunities with major banks, microfinance, and financial services companies.',
    featured: 1,
    trending: 0
  },
  'community-and-development': {
    icon_name: 'Users',
    description: 'Community development, social work, and project coordination roles. Make a difference in PNG communities.',
    meta_title: 'Community Development Jobs in PNG | WantokJobs',
    meta_description: 'Explore community development, social work, and project management jobs in PNG. Join organizations driving positive change.',
    featured: 0,
    trending: 1
  },
  'construction-and-trades': {
    icon_name: 'Hammer',
    description: 'Construction, building trades, and project management opportunities. Carpenters, electricians, plumbers, and construction managers.',
    meta_title: 'Construction & Trades Jobs in PNG | WantokJobs',
    meta_description: 'Find construction, carpentry, electrical, and plumbing jobs in Papua New Guinea. Apply to major infrastructure projects.',
    featured: 1,
    trending: 0
  },
  'education-and-training': {
    icon_name: 'GraduationCap',
    description: 'Teaching, training, and education administration roles across PNG. Opportunities for qualified teachers and education professionals.',
    meta_title: 'Education & Teaching Jobs in PNG | WantokJobs',
    meta_description: 'Discover teaching and education jobs in PNG. Primary, secondary, vocational training, and university positions available.',
    featured: 1,
    trending: 0
  },
  'engineering': {
    icon_name: 'Cog',
    description: 'Engineering opportunities in mechanical, electrical, civil, and mining engineering. Join PNG major infrastructure and resource projects.',
    meta_title: 'Engineering Jobs in PNG | WantokJobs',
    meta_description: 'Browse engineering jobs in PNG — civil, mechanical, electrical, mining. Work on major projects with top employers.',
    featured: 1,
    trending: 1
  },
  'government': {
    icon_name: 'Landmark',
    description: 'Public sector and government roles across national, provincial, and local levels. Serve PNG through public service careers.',
    meta_title: 'Government Jobs in PNG | WantokJobs',
    meta_description: 'Find government and public sector jobs in Papua New Guinea. National, provincial, and district government opportunities.',
    featured: 0,
    trending: 0
  },
  'health-and-medical': {
    icon_name: 'Heart',
    description: 'Healthcare and medical jobs for doctors, nurses, and allied health professionals. Join PNG health sector.',
    meta_title: 'Health & Medical Jobs in PNG | WantokJobs',
    meta_description: 'Explore healthcare jobs in PNG — doctors, nurses, medical officers, pharmacists, and allied health roles.',
    featured: 1,
    trending: 0
  },
  'hospitality-and-tourism': {
    icon_name: 'Coffee',
    description: 'Hospitality, tourism, and hotel management opportunities. Chefs, waiters, hotel managers, and tour operators.',
    meta_title: 'Hospitality & Tourism Jobs in PNG | WantokJobs',
    meta_description: 'Find hospitality, hotel, restaurant, and tourism jobs in Papua New Guinea. Apply to top PNG hotels and resorts.',
    featured: 0,
    trending: 0
  },
  'hr-and-recruitment': {
    icon_name: 'UserPlus',
    description: 'Human resources, recruitment, and people management roles. HR managers, recruiters, and training coordinators.',
    meta_title: 'HR & Recruitment Jobs in PNG | WantokJobs',
    meta_description: 'Browse human resources, recruitment, and training jobs in PNG. HR manager and specialist opportunities.',
    featured: 0,
    trending: 1
  },
  'ict-and-technology': {
    icon_name: 'Code',
    description: 'Information technology and software development opportunities. Developers, network engineers, IT support, and digital professionals.',
    meta_title: 'IT & Technology Jobs in PNG | WantokJobs',
    meta_description: 'Find IT, software development, and technology jobs in Papua New Guinea. Opportunities for developers, engineers, and IT professionals.',
    featured: 1,
    trending: 1
  },
  'legal-and-law': {
    icon_name: 'Scale',
    description: 'Legal opportunities for lawyers, paralegals, and legal assistants. Join PNG law firms and corporate legal teams.',
    meta_title: 'Legal & Law Jobs in PNG | WantokJobs',
    meta_description: 'Explore legal jobs in PNG — lawyers, solicitors, paralegals. Opportunities in law firms and corporate legal departments.',
    featured: 0,
    trending: 0
  },
  'management-and-executive': {
    icon_name: 'Briefcase',
    description: 'Executive, management, and leadership roles. CEOs, directors, general managers, and senior management positions.',
    meta_title: 'Management & Executive Jobs in PNG | WantokJobs',
    meta_description: 'Find executive and senior management jobs in PNG. CEO, director, and general manager opportunities with top employers.',
    featured: 1,
    trending: 1
  },
  'manufacturing-and-logistics': {
    icon_name: 'Truck',
    description: 'Manufacturing, supply chain, and logistics opportunities. Production managers, warehouse staff, and logistics coordinators.',
    meta_title: 'Manufacturing & Logistics Jobs in PNG | WantokJobs',
    meta_description: 'Browse manufacturing, warehousing, and logistics jobs in Papua New Guinea. Supply chain and production roles.',
    featured: 1,
    trending: 0
  },
  'marketing-and-sales': {
    icon_name: 'TrendingUp',
    description: 'Marketing, sales, and business development roles. Join PNG businesses as a sales rep, marketing manager, or account executive.',
    meta_title: 'Marketing & Sales Jobs in PNG | WantokJobs',
    meta_description: 'Find marketing, sales, and business development jobs in PNG. Opportunities with leading PNG companies.',
    featured: 1,
    trending: 0
  },
  'mining-and-resources': {
    icon_name: 'Pickaxe',
    description: 'Mining, oil & gas, and natural resources opportunities. Join PNG resource sector with major mining companies and contractors.',
    meta_title: 'Mining & Resources Jobs in PNG | WantokJobs',
    meta_description: 'Explore mining, oil, gas, and resources jobs in Papua New Guinea. Opportunities with major mining companies.',
    featured: 1,
    trending: 1
  },
  'ngo-and-volunteering': {
    icon_name: 'Globe',
    description: 'NGO, charity, and volunteering opportunities. Make a difference with international and local development organizations.',
    meta_title: 'NGO & Volunteering Jobs in PNG | WantokJobs',
    meta_description: 'Find NGO, charity, and volunteer jobs in Papua New Guinea. Work with development organizations making an impact.',
    featured: 0,
    trending: 0
  },
  'science-and-research': {
    icon_name: 'Microscope',
    description: 'Scientific research, laboratory, and technical roles. Opportunities for scientists, researchers, and lab technicians.',
    meta_title: 'Science & Research Jobs in PNG | WantokJobs',
    meta_description: 'Discover science and research jobs in PNG — laboratory, field research, and scientific positions.',
    featured: 0,
    trending: 1
  },
  'security': {
    icon_name: 'Shield',
    description: 'Security, safety, and protection roles. Security guards, safety officers, and security management positions.',
    meta_title: 'Security Jobs in PNG | WantokJobs',
    meta_description: 'Browse security guard, safety officer, and security management jobs in Papua New Guinea.',
    featured: 0,
    trending: 0
  }
};

// Update each category
const updateStmt = db.prepare(`
  UPDATE categories 
  SET description = ?, meta_title = ?, meta_description = ?, icon_name = ?, featured = ?, trending = ?
  WHERE slug = ?
`);

let updated = 0;
for (const [slug, data] of Object.entries(categoryData)) {
  const result = updateStmt.run(
    data.description,
    data.meta_title,
    data.meta_description,
    data.icon_name,
    data.featured,
    data.trending,
    slug
  );
  if (result.changes > 0) updated++;
}

console.log(`✓ Updated ${updated} categories with descriptions, icons, and featured/trending flags`);
db.close();
