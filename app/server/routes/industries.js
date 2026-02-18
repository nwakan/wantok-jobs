const logger = require('../utils/logger');
const express = require('express');
const router = express.Router();
const db = require('../database');
const cache = require('../lib/cache');

// Industry definitions with SEO content for key Pacific industries
const INDUSTRIES = {
  'mining': {
    name: 'Mining & Resources',
    slug: 'mining',
    description: 'The Pacific Islands region is rich in mineral resources, with Papua New Guinea leading as one of the top mining nations in the Asia-Pacific. From PNG\'s gold and copper mines to Fiji\'s bauxite deposits and Solomon Islands\' gold projects, the sector offers high-paying careers in exploration, extraction, processing, and environmental management across the Pacific.',
    icon: '⛏️',
    color: '#D97706',
    categorySlugs: ['mining-and-resources', 'engineering', 'science-and-research'],
    keywords: ['mining', 'resources', 'exploration', 'extraction', 'minerals', 'gold', 'copper', 'LNG', 'Pacific Islands'],
    tips: [
      'Mining jobs in PNG often require FIFO (Fly-In Fly-Out) arrangements with roster patterns like 4/2 or 3/1.',
      'Many roles require a valid work permit and medical clearance including drug and alcohol testing.',
      'Experience with Ok Tedi, Porgera, Lihir, or Wafi-Golpu projects in PNG is highly valued by employers.',
      'Safety certifications (IOSH, NEBOSH) significantly boost your employability across the Pacific mining sector.',
      'Salary packages often include housing, flights, and hardship allowances — negotiate the full package.',
      'Gold Ridge (Solomon Islands) and Fiji\'s Vatukoula Gold Mine also offer career opportunities in the region.'
    ],
    metaTitle: 'Mining & Resources Jobs — Pacific Islands | WantokJobs',
    metaDescription: 'Find mining and resources jobs across PNG and the Pacific Islands. Explore careers in gold, copper, LNG exploration, extraction, and mine management with top employers.'
  },
  'construction': {
    name: 'Construction',
    slug: 'construction',
    description: 'Construction across PNG and the Pacific Islands is booming with major infrastructure projects including roads, bridges, commercial buildings, and government facilities. From PNG\'s Highlands Highway upgrades to Fiji\'s hotel developments and Samoa\'s cyclone-resilient infrastructure, the sector offers diverse opportunities from skilled trades to project management.',
    icon: '🏗️',
    color: '#EA580C',
    categorySlugs: ['construction-and-trades', 'engineering', 'manufacturing-and-logistics'],
    keywords: ['construction', 'building', 'trades', 'infrastructure', 'project management', 'civil engineering', 'Pacific'],
    tips: [
      'Construction in PNG and the Pacific often involves remote site work — be prepared for basic living conditions on some projects.',
      'Trade qualifications from Australia and New Zealand are widely recognised across the Pacific.',
      'Familiarity with tropical building standards and cyclone-resistant construction is essential across Pacific nations.',
      'Many construction companies offer competitive expat packages including accommodation and R&R flights.',
      'Safety induction (white card equivalent) is typically required before starting on any site.',
      'Fiji and Vanuatu have growing tourism infrastructure projects creating strong demand for tradespeople.'
    ],
    metaTitle: 'Construction Jobs — Pacific Islands | WantokJobs',
    metaDescription: 'Browse construction and trades jobs across PNG and the Pacific Islands. Find opportunities in building, civil engineering, project management, and skilled trades.'
  },
  'banking': {
    name: 'Banking & Finance',
    slug: 'banking',
    description: 'The Pacific Islands\' financial sector spans major institutions like BSP Financial Group (operating across PNG, Fiji, and the Solomons), Kina Bank, Westpac PNG, ANZ Pacific, and HFC Bank Fiji. The industry offers careers in retail banking, corporate finance, insurance, microfinance, and fintech across the region.',
    icon: '🏦',
    color: '#2563EB',
    categorySlugs: ['banking-and-finance', 'accounting', 'management-and-executive'],
    keywords: ['banking', 'finance', 'accounting', 'insurance', 'investment', 'BSP', 'Kina Bank', 'Pacific'],
    tips: [
      'BSP Financial Group is the largest bank in PNG and the Pacific, with operations in Fiji, Solomon Islands, and Samoa.',
      'CPA PNG or CA qualifications are highly valued for senior finance and accounting roles.',
      'Microfinance and mobile banking (e.g., MiBank, BSP\'s MyBank, M-PAiSA in Fiji) are growing sectors with new opportunities.',
      'Port Moresby and Suva are the main hubs for banking careers, though regional branches offer opportunities across Pacific nations.',
      'Experience with IFRS reporting standards is increasingly required for finance roles across the Pacific.'
    ],
    metaTitle: 'Banking & Finance Jobs — Pacific Islands | WantokJobs',
    metaDescription: 'Explore banking and finance careers across PNG and the Pacific Islands. Find jobs with BSP, Kina Bank, Westpac, ANZ Pacific, and other leading financial institutions.'
  },
  'health': {
    name: 'Health & Medical',
    slug: 'health',
    description: 'Healthcare across the Pacific Islands faces significant challenges but offers rewarding careers. From hospitals in Port Moresby and Suva to rural health centres in the Solomon Islands and Vanuatu, medical professionals make a real difference. NGOs, government agencies, and regional bodies like SPC are major employers.',
    icon: '🏥',
    color: '#DC2626',
    categorySlugs: ['health-and-medical', 'ngo-and-volunteering', 'science-and-research'],
    keywords: ['health', 'medical', 'nursing', 'doctor', 'hospital', 'healthcare', 'public health', 'Pacific'],
    tips: [
      'PNG Medical Board registration is required for practitioners in PNG — allow 4-6 weeks for processing. Fiji and other Pacific nations have similar registration requirements.',
      'Rural health postings often come with additional allowances and housing provided by the government.',
      'NGOs like MSF, WHO, and UNICEF frequently recruit health professionals for programs across the Pacific.',
      'Tropical medicine experience is highly valued — consider completing a Diploma of Tropical Medicine.',
      'Community health worker roles are critical across the Pacific and offer pathways into healthcare management.',
      'The Fiji National University and University of PNG are key training institutions for Pacific health professionals.'
    ],
    metaTitle: 'Health & Medical Jobs — Pacific Islands | WantokJobs',
    metaDescription: 'Find healthcare and medical jobs across PNG and the Pacific Islands. Explore nursing, doctor, public health, and medical professional opportunities.'
  },
  'education': {
    name: 'Education',
    slug: 'education',
    description: 'Education is a growing sector across the Pacific Islands with opportunities in primary, secondary, tertiary, and vocational education. From PNG\'s universities to Fiji\'s international schools, USP campuses across the region, and TVET institutions, qualified educators are in high demand.',
    icon: '🎓',
    color: '#7C3AED',
    categorySlugs: ['education-and-training'],
    keywords: ['education', 'teaching', 'training', 'university', 'school', 'TVET', 'lecturer', 'Pacific'],
    tips: [
      'Teaching Service Commission (TSC) registration is required for roles in PNG government schools.',
      'International schools in Port Moresby, Lae, Suva, and Honiara offer competitive packages for qualified teachers.',
      'TVET (Technical and Vocational Education Training) is a growing area with government investment across the Pacific.',
      'University of PNG, PNG University of Technology, USP, and Fiji National University regularly recruit academic staff.',
      'Teaching English as a second language (TESOL/TEFL) qualifications open additional opportunities across the region.',
      'The University of the South Pacific (USP) has campuses across 12 Pacific Island nations — a major employer.'
    ],
    metaTitle: 'Education Jobs — Pacific Islands | WantokJobs',
    metaDescription: 'Discover education and teaching jobs across PNG and the Pacific Islands. Find positions in schools, universities, TVET institutions, and training organisations.'
  },
  'technology': {
    name: 'IT & Technology',
    slug: 'technology',
    description: 'The Pacific Islands\' technology sector is rapidly evolving with digital transformation across government and business. From Digicel and Telikom in PNG to Vodafone Fiji and regional submarine cable projects, the ICT industry offers exciting opportunities for tech professionals across the Pacific.',
    icon: '💻',
    color: '#0891B2',
    categorySlugs: ['ict-and-technology', 'engineering'],
    keywords: ['IT', 'technology', 'software', 'ICT', 'telecommunications', 'digital', 'Digicel', 'Telikom', 'Pacific'],
    tips: [
      'Digicel PNG and Telikom PNG are the largest telecommunications employers in PNG; Vodafone Fiji leads in Fiji.',
      'Remote work opportunities are growing across the Pacific, but many IT roles still require on-site presence.',
      'Government digital transformation projects (GovNet, eGovernment) create demand for IT consultants across Pacific nations.',
      'Cybersecurity skills are increasingly in demand as Pacific businesses move online.',
      'Cloud computing experience (AWS, Azure) is highly sought after by enterprises across the region.',
      'The Coral Sea Cable and other submarine cable projects are expanding connectivity and creating new tech roles.'
    ],
    metaTitle: 'IT & Technology Jobs — Pacific Islands | WantokJobs',
    metaDescription: 'Browse IT and technology jobs across PNG and the Pacific Islands. Find careers in software development, telecommunications, cybersecurity, and digital transformation.'
  },
  'oil-gas': {
    name: 'Oil & Gas',
    slug: 'oil-gas',
    description: 'Papua New Guinea is a significant LNG producer with the PNG LNG project operated by ExxonMobil and the upcoming Papua LNG project by TotalEnergies. Timor-Leste\'s Greater Sunrise field also offers growing opportunities. The sector provides some of the highest-paying jobs across the Pacific.',
    icon: '🛢️',
    color: '#1D4ED8',
    categorySlugs: ['mining-and-resources', 'engineering', 'manufacturing-and-logistics'],
    keywords: ['oil', 'gas', 'LNG', 'petroleum', 'ExxonMobil', 'TotalEnergies', 'Santos', 'pipeline', 'Pacific'],
    tips: [
      'PNG LNG (ExxonMobil) and Papua LNG (TotalEnergies) are the major project operators hiring in this sector.',
      'BOSIET/HUET safety certification is typically required for offshore and facility-based roles.',
      'Engineering, HSE, and operations roles often offer salary packages exceeding K200,000 per annum.',
      'National content requirements mean local citizens are prioritised — develop your skills to compete.',
      'The Hides Gas Conditioning Plant and Kutubu facilities are key employment locations in PNG.',
      'Timor-Leste\'s Greater Sunrise gas field is expected to create significant new opportunities in the region.'
    ],
    metaTitle: 'Oil & Gas Jobs — Pacific Islands | WantokJobs',
    metaDescription: 'Find oil and gas jobs across PNG and the Pacific. Explore LNG, petroleum engineering, and energy sector careers with ExxonMobil, TotalEnergies, and Santos.'
  },
  'government': {
    name: 'Government',
    slug: 'government',
    description: 'Government is one of the largest employers across the Pacific Islands, with positions in national departments, provincial administrations, and statutory authorities. From PNG\'s public service to Fiji\'s civil service and regional bodies like the Pacific Islands Forum, public service careers offer stability and the chance to shape the Pacific\'s future.',
    icon: '🏛️',
    color: '#059669',
    categorySlugs: ['government', 'administration', 'community-and-development'],
    keywords: ['government', 'public service', 'administration', 'policy', 'provincial', 'department', 'Pacific'],
    tips: [
      'Most PNG government positions are advertised through the Department of Personnel Management (DPM).',
      'Public service roles follow the PNG General Orders salary structure — research pay scales before applying.',
      'Provincial government roles often require willingness to be based outside Port Moresby.',
      'Graduate development programs are offered by several government departments — great entry point.',
      'Strong written communication skills are essential as government roles involve extensive report writing.',
      'Regional bodies like the Pacific Islands Forum Secretariat, SPC, and SPREP offer careers across the Pacific.'
    ],
    metaTitle: 'Government Jobs — Pacific Islands | WantokJobs',
    metaDescription: 'Explore government and public service jobs across PNG and the Pacific Islands. Find careers in national departments, provincial administration, regional bodies, and statutory authorities.'
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
