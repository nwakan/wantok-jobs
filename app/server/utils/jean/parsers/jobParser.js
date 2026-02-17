/**
 * Job Description Parser
 * Splits multi-job documents into individual JDs and extracts structured fields.
 */

const logger = require('../../../utils/logger');

// Common section headers for job descriptions
const SECTION_PATTERNS = {
  title: /^(?:position|job)\s*(?:title|name)\s*[:：]\s*(.+)/im,
  description: /(?:^|\n)(?:description|overview|about\s*the\s*(?:role|position)|summary|purpose)\s*[:：]?\s*\n([\s\S]*?)(?=\n(?:qualif|require|responsib|key\s*duties|experience|location|salary|how\s*to|closing|deadline|about\s*us|who\s*we)|$)/i,
  requirements: /(?:^|\n)(?:qualif|require|essential|minimum|who\s*we'?re?\s*looking|key\s*(?:require|criteria)|experience\s*(?:require|needed)|selection\s*criteria)\s*[:：]?\s*\n([\s\S]*?)(?=\n(?:description|responsib|location|salary|how\s*to|closing|deadline|about\s*us|desir(?:ed|able))|$)/i,
  responsibilities: /(?:^|\n)(?:responsib|key\s*duties|duties|role\s*(?:duties|responsib)|what\s*you'?ll?\s*do)\s*[:：]?\s*\n([\s\S]*?)(?=\n(?:qualif|require|location|salary|experience|about|closing)|$)/i,
  location: /(?:location|based\s*(?:in|at)|work\s*location|duty\s*station)\s*[:：]\s*(.+)/i,
  salary: /(?:salary|remuneration|compensation|pay|package)\s*[:：]\s*(.+)/i,
  job_type: /(?:employment\s*type|job\s*type|contract\s*type|type\s*of\s*(?:employment|contract)|engagement)\s*[:：]\s*(.+)/i,
  experience: /(?:experience\s*(?:level|required)?|years?\s*of\s*experience)\s*[:：]\s*(.+)/i,
  deadline: /(?:closing\s*date|deadline|applications?\s*(?:close|due)|apply\s*by)\s*[:：]\s*(.+)/i,
  company: /(?:company|organisation|organization|employer|about\s*us)\s*[:：]\s*(.+)/i,
};

// Job type normalization
const JOB_TYPE_MAP = {
  'full time': 'full-time', 'full-time': 'full-time', 'fulltime': 'full-time', 'permanent': 'full-time',
  'part time': 'part-time', 'part-time': 'part-time', 'parttime': 'part-time',
  'contract': 'contract', 'fixed term': 'contract', 'fixed-term': 'contract', 'temporary': 'contract',
  'casual': 'casual', 'relief': 'casual',
};

// Experience level normalization
const EXP_LEVEL_MAP = {
  'entry': 'entry', 'junior': 'entry', 'graduate': 'entry', 'trainee': 'entry',
  'mid': 'mid', 'intermediate': 'mid', 'experienced': 'mid',
  'senior': 'senior', 'lead': 'senior', 'principal': 'senior',
  'executive': 'executive', 'director': 'executive', 'manager': 'senior', 'head': 'executive',
};

// Category detection keywords
const CATEGORY_MAP = {
  'mining-and-resources': ['mining', 'mineral', 'geological', 'ore', 'drill', 'extraction', 'quarry'],
  'health-and-medical': ['health', 'medical', 'nurse', 'doctor', 'clinical', 'hospital', 'pharmacy', 'dental'],
  'education-and-training': ['education', 'teacher', 'lecturer', 'trainer', 'school', 'university', 'curriculum'],
  'ict-and-technology': ['it', 'ict', 'software', 'developer', 'programmer', 'network', 'database', 'cyber', 'tech'],
  'finance': ['finance', 'accountant', 'accounting', 'audit', 'tax', 'banking', 'financial'],
  'construction-and-trades': ['construction', 'builder', 'carpenter', 'plumber', 'electrician', 'welder', 'trades'],
  'manufacturing-and-logistics': ['manufacturing', 'logistics', 'warehouse', 'supply chain', 'shipping', 'transport'],
  'hospitality': ['hotel', 'hospitality', 'chef', 'cook', 'tourism', 'restaurant', 'food service'],
  'community-and-development': ['community', 'ngo', 'development', 'aid', 'humanitarian', 'social work'],
  'engineering': ['engineer', 'engineering', 'mechanical', 'electrical', 'civil', 'structural'],
  'administration': ['admin', 'administration', 'office', 'secretary', 'receptionist', 'clerk', 'data entry'],
  'management-and-executive': ['manager', 'director', 'executive', 'ceo', 'cfo', 'general manager', 'managing'],
  'hr-and-recruitment': ['hr', 'human resource', 'recruitment', 'talent', 'people', 'staffing'],
  'marketing-and-sales': ['marketing', 'sales', 'advertising', 'brand', 'promotion', 'business development'],
  'legal-and-law': ['legal', 'lawyer', 'solicitor', 'compliance', 'regulatory', 'law'],
  'government': ['government', 'public service', 'public sector', 'minister', 'policy'],
  'agriculture-and-environment': ['agriculture', 'farming', 'environment', 'forestry', 'fisheries', 'conservation'],
  'science-and-research': ['science', 'research', 'laboratory', 'scientist', 'analyst'],
};

/**
 * Split a document into individual job descriptions
 */
function splitJobs(text) {
  // Common separators between jobs in multi-job documents
  const separators = [
    /\n-{3,}\n/g,                           // ---
    /\n={3,}\n/g,                           // ===
    /\n\*{3,}\n/g,                          // ***
    /\nPage\s*\d+\s*(?:of\s*\d+)?\n/gi,    // Page breaks
    /\n(?:Position|Job)\s*(?:#|\d+)\s*[:：]/gi,  // Position #1:
  ];

  // Try each separator
  for (const sep of separators) {
    const parts = text.split(sep).filter(p => p.trim().length > 100);
    if (parts.length > 1) return parts;
  }

  // Try to detect multiple job titles
  const titlePattern = /(?:^|\n)(?:Position|Job)\s*(?:Title|Name)\s*[:：]\s*.+/gim;
  const titleMatches = [...text.matchAll(titlePattern)];
  if (titleMatches.length > 1) {
    const parts = [];
    for (let i = 0; i < titleMatches.length; i++) {
      const start = titleMatches[i].index;
      const end = i + 1 < titleMatches.length ? titleMatches[i + 1].index : text.length;
      parts.push(text.substring(start, end).trim());
    }
    return parts.filter(p => p.length > 50);
  }

  // Single job
  return [text];
}

/**
 * Parse a single job description text into structured fields
 */
function parseJob(text) {
  const job = {
    title: null,
    description: null,
    requirements: null,
    location: null,
    country: 'Papua New Guinea',
    job_type: null,
    experience_level: null,
    category_slug: null,
    skills: null,
    salary_min: null,
    salary_max: null,
    salary_currency: 'PGK',
    application_deadline: null,
    raw_text: text,
  };

  // Extract title
  const titleMatch = text.match(SECTION_PATTERNS.title);
  if (titleMatch) {
    job.title = titleMatch[1].trim();
  } else {
    // First non-empty line as title
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 0 && lines[0].length < 200) {
      job.title = lines[0].replace(/^[\s*#-]+/, '').trim();
    }
  }

  // Extract description (combine description + responsibilities)
  const descMatch = text.match(SECTION_PATTERNS.description);
  const respMatch = text.match(SECTION_PATTERNS.responsibilities);
  const descParts = [];
  if (descMatch) descParts.push(descMatch[1].trim());
  if (respMatch) descParts.push('**Responsibilities:**\n' + respMatch[1].trim());
  job.description = descParts.join('\n\n') || text.substring(0, 2000);

  // Extract requirements
  const reqMatch = text.match(SECTION_PATTERNS.requirements);
  if (reqMatch) job.requirements = reqMatch[1].trim();

  // Extract location
  const locMatch = text.match(SECTION_PATTERNS.location);
  if (locMatch) {
    job.location = locMatch[1].trim();
    // Try to detect PNG locations
    if (/png|papua/i.test(job.location)) job.country = 'Papua New Guinea';
  }

  // Extract and normalize job type
  const typeMatch = text.match(SECTION_PATTERNS.job_type);
  if (typeMatch) {
    const raw = typeMatch[1].trim().toLowerCase();
    for (const [key, val] of Object.entries(JOB_TYPE_MAP)) {
      if (raw.includes(key)) { job.job_type = val; break; }
    }
  }

  // Extract experience level
  const expMatch = text.match(SECTION_PATTERNS.experience);
  if (expMatch) {
    const raw = expMatch[1].trim().toLowerCase();
    for (const [key, val] of Object.entries(EXP_LEVEL_MAP)) {
      if (raw.includes(key)) { job.experience_level = val; break; }
    }
  }

  // Extract salary
  const salaryMatch = text.match(SECTION_PATTERNS.salary);
  if (salaryMatch) {
    const salaryText = salaryMatch[1];
    const nums = salaryText.match(/[\$kK]?\s*(\d[\d,]*)/g);
    if (nums) {
      const values = nums.map(n => parseInt(n.replace(/[\$kK,\s]/g, '')));
      job.salary_min = values[0];
      if (values.length > 1) job.salary_max = values[1];
    }
    if (/usd|\$/i.test(salaryText)) job.salary_currency = 'USD';
    else if (/aud/i.test(salaryText)) job.salary_currency = 'AUD';
  }

  // Extract deadline
  const deadlineMatch = text.match(SECTION_PATTERNS.deadline);
  if (deadlineMatch) {
    job.application_deadline = deadlineMatch[1].trim();
    // Try to normalize date
    const dateMatch = job.application_deadline.match(/(\d{1,2})\s*(?:\/|-)\s*(\d{1,2})\s*(?:\/|-)\s*(\d{2,4})/);
    if (dateMatch) {
      const year = dateMatch[3].length === 2 ? '20' + dateMatch[3] : dateMatch[3];
      job.application_deadline = `${year}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
    }
  }

  // Detect category from content
  const fullText = (job.title + ' ' + job.description + ' ' + (job.requirements || '')).toLowerCase();
  let bestCategory = null;
  let bestScore = 0;
  for (const [slug, keywords] of Object.entries(CATEGORY_MAP)) {
    const score = keywords.reduce((sum, kw) => sum + (fullText.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; bestCategory = slug; }
  }
  if (bestScore >= 1) job.category_slug = bestCategory;

  // Extract skills from requirements/description
  const skillPatterns = [
    /(?:skills?|competenc|proficien)\s*[:：]?\s*([\s\S]*?)(?:\n\n|\n[A-Z])/i,
  ];
  for (const pattern of skillPatterns) {
    const sm = (job.requirements || job.description || '').match(pattern);
    if (sm) {
      const skills = sm[1].split(/[•\-,;\n]+/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 50);
      if (skills.length > 0) job.skills = skills.join(', ');
      break;
    }
  }

  return job;
}

/**
 * Parse a full document (possibly multi-job) into structured jobs
 */
function parseDocument(text, sourceFilename) {
  const sections = splitJobs(text);
  return sections.map(section => {
    const job = parseJob(section);
    job.source_filename = sourceFilename;
    return job;
  });
}

function formatJobSummary(job, index) {
  const parts = [];
  parts.push(`📋 **${index !== undefined ? `Draft ${index + 1}: ` : ''}${job.title || 'Untitled Position'}**`);
  if (job.location) parts.push(`📍 ${job.location}`);
  if (job.job_type) parts.push(`💼 ${job.job_type}`);
  if (job.salary_min) {
    const curr = job.salary_currency === 'PGK' ? 'K' : job.salary_currency + ' ';
    parts.push(`💰 ${curr}${job.salary_min.toLocaleString()}${job.salary_max ? '-' + job.salary_max.toLocaleString() : '+'}`);
  }
  if (job.category_slug) parts.push(`🏷️ ${job.category_slug.replace(/-/g, ' ')}`);
  if (job.application_deadline) parts.push(`📅 Closes: ${job.application_deadline}`);
  return parts.join(' | ');
}

module.exports = { splitJobs, parseJob, parseDocument, formatJobSummary };
