const logger = require('../utils/logger');
const express = require('express');
const router = express.Router();
const db = require('../database');
const cache = require('../lib/cache');

// Industry definitions with SEO content for key PNG industries
const INDUSTRIES = {
  'mining': {
    name: 'Mining & Resources',
    slug: 'mining',
    description: 'Papua New Guinea is one of the richest mineral resource countries in the Asia-Pacific region. The mining sector is a major contributor to PNG\'s GDP, offering high-paying careers in exploration, extraction, processing, and environmental management.',
    icon: '⛏️',
    color: '#D97706',
    categorySlugs: ['mining-and-resources', 'engineering', 'science-and-research'],
    keywords: ['mining', 'resources', 'exploration', 'extraction', 'minerals', 'gold', 'copper', 'LNG'],
    tips: [
      'Mining jobs in PNG often require FIFO (Fly-In Fly-Out) arrangements with roster patterns like 4/2 or 3/1.',
      'Many roles require a valid PNG work permit and medical clearance including drug and alcohol testing.',
      'Experience with Ok Tedi, Porgera, Lihir, or Wafi-Golpu projects is highly valued by employers.',
      'Safety certifications (IOSH, NEBOSH) significantly boost your employability in PNG mining.',
      'Salary packages often include housing, flights, and hardship allowances — negotiate the full package.'
    ],
    metaTitle: 'Mining & Resources Jobs in PNG | WantokJobs',
    metaDescription: 'Find mining and resources jobs in Papua New Guinea. Explore careers in gold, copper, LNG exploration, extraction, and mine management with top PNG employers.'
  },
  'construction': {
    name: 'Construction',
    slug: 'construction',
    description: 'PNG\'s construction industry is booming with major infrastructure projects including roads, bridges, commercial buildings, and government facilities. The sector offers diverse opportunities from skilled trades to project management.',
    icon: '🏗️',
    color: '#EA580C',
    categorySlugs: ['construction-and-trades', 'engineering', 'manufacturing-and-logistics'],
    keywords: ['construction', 'building', 'trades', 'infrastructure', 'project management', 'civil engineering'],
    tips: [
      'Construction in PNG often involves remote site work — be prepared for basic living conditions on some projects.',
      'Trade qualifications from Australia and New Zealand are widely recognised in PNG.',
      'Familiarity with tropical building standards and cyclone-resistant construction is a plus.',
      'Many construction companies offer competitive expat packages including accommodation and R&R flights.',
      'Safety induction (white card equivalent) is typically required before starting on any site.'
    ],
    metaTitle: 'Construction Jobs in PNG | WantokJobs',
    metaDescription: 'Browse construction and trades jobs in Papua New Guinea. Find opportunities in building, civil engineering, project management, and skilled trades.'
  },
  'banking': {
    name: 'Banking & Finance',
    slug: 'banking',
    description: 'Papua New Guinea\'s financial sector includes major banks like BSP Financial Group, Kina Bank, and Westpac PNG. The industry offers careers in retail banking, corporate finance, insurance, microfinance, and fintech.',
    icon: '🏦',
    color: '#2563EB',
    categorySlugs: ['banking-and-finance', 'accounting', 'management-and-executive'],
    keywords: ['banking', 'finance', 'accounting', 'insurance', 'investment', 'BSP', 'Kina Bank'],
    tips: [
      'BSP Financial Group is the largest bank in PNG and frequently hires across all levels.',
      'CPA PNG or CA qualifications are highly valued for senior finance and accounting roles.',
      'Microfinance and mobile banking (e.g., MiBank, BSP\'s MyBank) are growing sectors with new opportunities.',
      'Port Moresby is the hub for banking careers, though regional branches offer opportunities in other centres.',
      'Experience with IFRS reporting standards is increasingly required for finance roles in PNG.'
    ],
    metaTitle: 'Banking & Finance Jobs in PNG | WantokJobs',
    metaDescription: 'Explore banking and finance careers in Papua New Guinea. Find jobs with BSP, Kina Bank, Westpac PNG, and other leading financial institutions.'
  },
  'health': {
    name: 'Health & Medical',
    slug: 'health',
    description: 'PNG\'s healthcare sector faces significant challenges but offers rewarding careers. From hospitals in Port Moresby to rural health centres, medical professionals make a real difference. NGOs and government agencies are major employers.',
    icon: '🏥',
    color: '#DC2626',
    categorySlugs: ['health-and-medical', 'ngo-and-volunteering', 'science-and-research'],
    keywords: ['health', 'medical', 'nursing', 'doctor', 'hospital', 'healthcare', 'public health'],
    tips: [
      'PNG Medical Board registration is required for all medical practitioners — allow 4-6 weeks for processing.',
      'Rural health postings often come with additional allowances and housing provided by the government.',
      'NGOs like MSF, WHO, and UNICEF frequently recruit health professionals for PNG programs.',
      'Tropical medicine experience is highly valued — consider completing a Diploma of Tropical Medicine.',
      'Community health worker roles are critical in PNG and offer pathways into healthcare management.'
    ],
    metaTitle: 'Health & Medical Jobs in PNG | WantokJobs',
    metaDescription: 'Find healthcare and medical jobs in Papua New Guinea. Explore nursing, doctor, public health, and medical professional opportunities across PNG.'
  },
  'education': {
    name: 'Education',
    slug: 'education',
    description: 'Education is a growing sector in PNG with opportunities in primary, secondary, tertiary, and vocational education. International schools, universities, and TVET institutions all seek qualified educators.',
    icon: '🎓',
    color: '#7C3AED',
    categorySlugs: ['education-and-training'],
    keywords: ['education', 'teaching', 'training', 'university', 'school', 'TVET', 'lecturer'],
    tips: [
      'Teaching Service Commission (TSC) registration is required for roles in government schools.',
      'International schools in Port Moresby and Lae offer competitive packages for qualified teachers.',
      'TVET (Technical and Vocational Education Training) is a growing area with government investment.',
      'University of PNG and PNG University of Technology regularly recruit academic staff.',
      'Teaching English as a second language (TESOL/TEFL) qualifications open additional opportunities.'
    ],
    metaTitle: 'Education Jobs in PNG | WantokJobs',
    metaDescription: 'Discover education and teaching jobs in Papua New Guinea. Find positions in schools, universities, TVET institutions, and training organisations.'
  },
  'technology': {
    name: 'IT & Technology',
    slug: 'technology',
    description: 'PNG\'s technology sector is rapidly evolving with digital transformation across government and business. From telecommunications to software development, the ICT industry offers exciting opportunities for tech professionals.',
    icon: '💻',
    color: '#0891B2',
    categorySlugs: ['ict-and-technology', 'engineering'],
    keywords: ['IT', 'technology', 'software', 'ICT', 'telecommunications', 'digital', 'Digicel', 'Telikom'],
    tips: [
      'Digicel PNG and Telikom PNG are the largest telecommunications employers in the country.',
      'Remote work opportunities are growing, but many IT roles still require on-site presence in Port Moresby.',
      'Government digital transformation projects (GovNet, eGovernment) create demand for IT consultants.',
      'Cybersecurity skills are increasingly in demand as PNG businesses move online.',
      'Cloud computing experience (AWS, Azure) is highly sought after by PNG enterprises.'
    ],
    metaTitle: 'IT & Technology Jobs in PNG | WantokJobs',
    metaDescription: 'Browse IT and technology jobs in Papua New Guinea. Find careers in software development, telecommunications, cybersecurity, and digital transformation.'
  },
  'oil-gas': {
    name: 'Oil & Gas',
    slug: 'oil-gas',
    description: 'Papua New Guinea is a significant LNG producer with the PNG LNG project operated by ExxonMobil and the upcoming Papua LNG project by TotalEnergies. The sector offers some of the highest-paying jobs in the country.',
    icon: '🛢️',
    color: '#1D4ED8',
    categorySlugs: ['mining-and-resources', 'engineering', 'manufacturing-and-logistics'],
    keywords: ['oil', 'gas', 'LNG', 'petroleum', 'ExxonMobil', 'TotalEnergies', 'Santos', 'pipeline'],
    tips: [
      'PNG LNG (ExxonMobil) and Papua LNG (TotalEnergies) are the major project operators hiring in this sector.',
      'BOSIET/HUET safety certification is typically required for offshore and facility-based roles.',
      'Engineering, HSE, and operations roles often offer salary packages exceeding K200,000 per annum.',
      'National content requirements mean PNG citizens are prioritised — develop your skills to compete.',
      'The Hides Gas Conditioning Plant and Kutubu facilities are key employment locations.'
    ],
    metaTitle: 'Oil & Gas Jobs in PNG | WantokJobs',
    metaDescription: 'Find oil and gas jobs in Papua New Guinea. Explore LNG, petroleum engineering, and energy sector careers with ExxonMobil, TotalEnergies, and Santos.'
  },
  'government': {
    name: 'Government',
    slug: 'government',
    description: 'The PNG Government is one of the largest employers in the country, with positions across national departments, provincial administrations, and statutory authorities. Public service careers offer stability and the chance to shape PNG\'s future.',
    icon: '🏛️',
    color: '#059669',
    categorySlugs: ['government', 'administration', 'community-and-development'],
    keywords: ['government', 'public service', 'administration', 'policy', 'provincial', 'department'],
    tips: [
      'Most government positions are advertised through the Department of Personnel Management (DPM).',
      'Public service roles follow the PNG General Orders salary structure — research pay scales before applying.',
      'Provincial government roles often require willingness to be based outside Port Moresby.',
      'Graduate development programs are offered by several government departments — great entry point.',
      'Strong written communication skills are essential as government roles involve extensive report writing.'
    ],
    metaTitle: 'Government Jobs in PNG | WantokJobs',
    metaDescription: 'Explore government and public service jobs in Papua New Guinea. Find careers in national departments, provincial administration, and statutory authorities.'
  }
};

// GET / - List all industries
router.get('/', (req, res) => {
  try {
    const cached = cache.get('industries:list');
    if (cached) return res.json(cached);

    const industries = Object.values(INDUSTRIES).map(ind => {
      // Get job count for this industry's categories
      const placeholders = ind.categorySlugs.map(() => '?').join(',');
      const row = db.prepare(`
        SELECT COUNT(DISTINCT j.id) as job_count
        FROM jobs j
        JOIN job_categories jc ON j.id = jc.job_id
        JOIN categories c ON jc.category_id = c.id
        WHERE j.status = 'active' AND c.slug IN (${placeholders})
      `).get(...ind.categorySlugs);

      return {
        name: ind.name,
        slug: ind.slug,
        icon: ind.icon,
        color: ind.color,
        description: ind.description.substring(0, 150) + '...',
        jobCount: row?.job_count || 0
      };
    });

    const result = { industries };
    cache.set('industries:list', result, 600);
    res.json(result);
  } catch (error) {
    logger.error('Error fetching industries list', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch industries' });
  }
});

// GET /:slug - Get industry details with stats, jobs, employers
router.get('/:slug', (req, res) => {
  try {
    const { slug } = req.params;
    const industry = INDUSTRIES[slug];
    
    if (!industry) {
      return res.status(404).json({ error: 'Industry not found' });
    }

    const cacheKey = `industries:${slug}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const placeholders = industry.categorySlugs.map(() => '?').join(',');

    // Get job count
    const statsRow = db.prepare(`
      SELECT 
        COUNT(DISTINCT j.id) as job_count,
        AVG(CASE WHEN j.salary_min > 0 THEN j.salary_min END) as avg_salary_min,
        AVG(CASE WHEN j.salary_max > 0 THEN j.salary_max END) as avg_salary_max
      FROM jobs j
      JOIN job_categories jc ON j.id = jc.job_id
      JOIN categories c ON jc.category_id = c.id
      WHERE j.status = 'active' AND c.slug IN (${placeholders})
    `).get(...industry.categorySlugs);

    // Get featured/top jobs (6)
    const jobs = db.prepare(`
      SELECT j.id, j.title, j.company_name, j.company_display_name, j.location, 
             j.job_type, j.salary_min, j.salary_max, j.salary_currency,
             j.created_at, j.logo_url, j.featured, j.experience_level
      FROM jobs j
      JOIN job_categories jc ON j.id = jc.job_id
      JOIN categories c ON jc.category_id = c.id
      WHERE j.status = 'active' AND c.slug IN (${placeholders})
      ORDER BY j.featured DESC, j.created_at DESC
      LIMIT 6
    `).all(...industry.categorySlugs);

    // Get top employers
    const employers = db.prepare(`
      SELECT 
        COALESCE(j.company_display_name, j.company_name) as name,
        j.logo_url,
        COUNT(DISTINCT j.id) as job_count
      FROM jobs j
      JOIN job_categories jc ON j.id = jc.job_id
      JOIN categories c ON jc.category_id = c.id
      WHERE j.status = 'active' AND c.slug IN (${placeholders})
        AND j.company_name IS NOT NULL AND j.company_name != ''
      GROUP BY COALESCE(j.company_display_name, j.company_name)
      ORDER BY job_count DESC
      LIMIT 8
    `).all(...industry.categorySlugs);

    // Get related industries (exclude current)
    const related = Object.values(INDUSTRIES)
      .filter(i => i.slug !== slug)
      .map(i => ({ name: i.name, slug: i.slug, icon: i.icon }));

    const result = {
      industry: {
        name: industry.name,
        slug: industry.slug,
        description: industry.description,
        icon: industry.icon,
        color: industry.color,
        tips: industry.tips,
        keywords: industry.keywords,
        metaTitle: industry.metaTitle,
        metaDescription: industry.metaDescription
      },
      stats: {
        jobCount: statsRow?.job_count || 0,
        avgSalaryMin: Math.round(statsRow?.avg_salary_min || 0),
        avgSalaryMax: Math.round(statsRow?.avg_salary_max || 0)
      },
      jobs,
      employers,
      related,
      categorySlugs: industry.categorySlugs
    };

    cache.set(cacheKey, result, 300);
    res.json(result);
  } catch (error) {
    logger.error('Error fetching industry details', { error: error.message, slug: req.params.slug });
    res.status(500).json({ error: 'Failed to fetch industry details' });
  }
});

module.exports = router;
