/**
 * AI Job Formatter v2 — HYBRID REGEX + LLM
 * 
 * Primary: Regex-based parser (handles 80-90% of jobs)
 * Fallback: LLM formatter (complex/unusual formats only)
 * 
 * Reduces LLM API calls by 80-90%
 */

const { route } = require('./ai-router');

/**
 * Regex-based job description parser
 * Handles common patterns in job postings
 */
class RegexJobParser {
  constructor(rawText) {
    this.rawText = rawText;
    this.lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    this.sections = {
      about: '',
      responsibilities: [],
      requirements: [],
      benefits: [],
      howToApply: '',
      closingInfo: ''
    };
    this.confidence = 0;
  }

  /**
   * Main parsing entry point
   */
  parse() {
    if (!this.rawText || this.rawText.length < 50) {
      this.confidence = 0;
      return {
        sections: this.sections,
        confidence: this.confidence
      };
    }

    // Try different parsing strategies
    this.detectSections();
    this.extractAboutSection();
    this.extractResponsibilitiesSection();
    this.extractRequirementsSection();
    this.extractBenefitsSection();
    this.extractHowToApplySection();
    this.extractClosingInfoSection();
    
    // Calculate confidence based on sections found
    this.calculateConfidence();
    
    return {
      sections: this.sections,
      confidence: this.confidence
    };
  }

  /**
   * Pre-process raw text to split inline section headers onto their own lines.
   * Many PNG job posts have headers like "About You To be considered..." all on one line.
   */
  preprocessText() {
    const inlineHeaderPattern = /(?<=\.\s|[.!?]\s{1,3}|\s{2,})(About\s+(?:the\s+)?(?:Role|Position|Company|Us|You|Job)|Key\s+Accountabilities|Responsibilities|Requirements|Qualifications|Duties|How\s+to\s+Apply|Life\s+at\s+\w+|Working\s+at\s+\w+|Why\s+(?:Join|Work)|Benefits|What\s+We\s+Offer|Selection\s+Criteria|Equal\s+Opportunity|The\s+(?:Ideal\s+)?Candidate)(?=\s)/g;
    
    let text = this.rawText.replace(inlineHeaderPattern, '\n$1');
    this.lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  }

  /**
   * Detect section headers and split text into blocks
   */
  detectSections() {
    // Pre-process to split inline headers
    this.preprocessText();
    
    this.sectionBlocks = [];
    
    const sectionHeaderRegex = /^(?:#+\s*)?(?:about\s+(?:the\s+)?(?:role|position|company|us|you|job)|about|overview|company|introduction|background|responsibilities|key\s+accountabilities|accountabilities|duties|key\s+tasks|role\s+(?:summary|description|purpose)|the\s+role|tasks|requirements|qualifications|must\s+have|essential|desired|preferred|skills|experience|education|criteria|selection\s+criteria|competencies|benefits|perks|salary|compensation|offer|we\s+offer|what\s+we\s+offer|package|life\s+at|working\s+at|why\s+(?:join|work)|how\s+to\s+apply|application|submit|send|to\s+apply|interested\s+candidates|deadline|closing|applications?\s+close|contact|email|phone|equal\s+opportunity|eeo)/i;
    
    let currentSection = null;
    let currentContent = [];
    
    for (const line of this.lines) {
      // Check if this line is a section header
      const headerMatch = line.match(sectionHeaderRegex);
      
      if (headerMatch || this.isSectionHeader(line)) {
        // Save previous section
        if (currentSection) {
          this.sectionBlocks.push({
            header: currentSection,
            content: currentContent.join('\n')
          });
        }
        
        // Split header from trailing content on the same line
        // e.g. "About You To be considered..." → header="About You", content starts with "To be considered..."
        const matchedText = headerMatch ? headerMatch[0] : line;
        const remainder = line.slice(matchedText.length).trim();
        
        currentSection = matchedText;
        currentContent = remainder ? [remainder] : [];
      } else {
        currentContent.push(line);
      }
    }
    
    // Save last section
    if (currentSection) {
      this.sectionBlocks.push({
        header: currentSection,
        content: currentContent.join('\n')
      });
    }
  }

  /**
   * Check if a line looks like a section header
   * (ALL CAPS, short, ends with colon, etc.)
   */
  isSectionHeader(line) {
    // ALL CAPS headers (e.g., "REQUIREMENTS:")
    if (line === line.toUpperCase() && line.length < 50 && /[A-Z]{3,}/.test(line)) {
      return true;
    }
    
    // Headers ending with colon
    if (line.endsWith(':') && line.length < 60 && !line.includes(',')) {
      return true;
    }
    
    // Bold/markdown headers (##, ###, etc.)
    if (/^#{1,4}\s+[A-Z]/.test(line)) {
      return true;
    }
    
    // Numbered headers (1. Requirements, 2. Responsibilities)
    if (/^\d+\.\s+[A-Z]/.test(line) && line.length < 60) {
      return true;
    }
    
    return false;
  }

  /**
   * Extract "about" section
   */
  extractAboutSection() {
    const aboutPatterns = [
      /about(?:\s+(?:the|this))?\s+(?:role|position|job|company|us)/i,
      /company\s+(?:overview|background|profile)/i,
      /introduction/i,
      /overview/i
    ];
    
    for (const block of this.sectionBlocks) {
      for (const pattern of aboutPatterns) {
        if (pattern.test(block.header)) {
          this.sections.about = block.content.slice(0, 500);
          return;
        }
      }
    }
    
    // Fallback: use first 2-3 paragraphs
    if (!this.sections.about) {
      const firstParagraphs = this.lines.slice(0, 3).join(' ');
      this.sections.about = firstParagraphs.slice(0, 300);
    }
  }

  /**
   * Extract responsibilities section
   */
  extractResponsibilitiesSection() {
    const respPatterns = [
      /(?:key\s+)?responsibilities/i,
      /(?:key\s+)?accountabilities/i,
      /duties/i,
      /(?:key\s+)?tasks/i,
      /role\s+(?:description|summary|purpose)/i,
      /about\s+the\s+role/i,
      /the\s+role/i,
      /what\s+you(?:'ll|\s+will)\s+do/i,
      /scope\s+of\s+(?:work|role)/i
    ];
    
    for (const block of this.sectionBlocks) {
      for (const pattern of respPatterns) {
        if (pattern.test(block.header)) {
          this.sections.responsibilities = this.extractBulletPoints(block.content);
          return;
        }
      }
    }
  }

  /**
   * Extract requirements section
   */
  extractRequirementsSection() {
    const reqPatterns = [
      /requirements/i,
      /qualifications/i,
      /must\s+have/i,
      /essential\s+(?:skills|qualifications)/i,
      /skills\s+(?:and\s+)?(?:experience|qualifications)/i,
      /what\s+(?:we(?:'re|\s+are)\s+looking\s+for|you\s+need)/i,
      /about\s+you/i,
      /the\s+(?:ideal\s+)?candidate/i,
      /who\s+(?:we(?:'re|\s+are)\s+looking\s+for|you\s+are)/i,
      /selection\s+criteria/i,
      /minimum\s+(?:requirements|qualifications)/i,
      /desired\s+(?:skills|qualifications|experience)/i,
      /competencies/i,
      /criteria/i
    ];
    
    for (const block of this.sectionBlocks) {
      for (const pattern of reqPatterns) {
        if (pattern.test(block.header)) {
          this.sections.requirements = this.extractBulletPoints(block.content);
          return;
        }
      }
    }
  }

  /**
   * Extract benefits section
   */
  extractBenefitsSection() {
    const benefitsPatterns = [
      /benefits/i,
      /perks/i,
      /compensation/i,
      /salary/i,
      /what\s+we\s+offer/i,
      /we\s+offer/i,
      /why\s+(?:join|work)/i,
      /life\s+at/i,
      /working\s+at/i,
      /package/i,
      /remuneration/i
    ];
    
    for (const block of this.sectionBlocks) {
      for (const pattern of benefitsPatterns) {
        if (pattern.test(block.header)) {
          this.sections.benefits = this.extractBulletPoints(block.content);
          return;
        }
      }
    }
    
    // Also look for salary mentions in the text
    const salaryMatch = this.rawText.match(/(?:salary|compensation)[\s:]*(?:PGK|K|\$)?\s*[\d,]+(?: ?- ?[\d,]+)?/i);
    if (salaryMatch && this.sections.benefits.length === 0) {
      this.sections.benefits.push(salaryMatch[0]);
    }
  }

  /**
   * Extract "how to apply" section
   */
  extractHowToApplySection() {
    const applyPatterns = [
      /how\s+to\s+apply/i,
      /application\s+(?:process|instructions)/i,
      /to\s+apply/i,
      /(?:send|submit)\s+(?:your\s+)?(?:cv|resume|application)/i,
      /interested\s+candidates/i
    ];
    
    for (const block of this.sectionBlocks) {
      for (const pattern of applyPatterns) {
        if (pattern.test(block.header)) {
          this.sections.howToApply = block.content.slice(0, 400);
          return;
        }
      }
    }
    
    // Fallback: look for email/contact in text
    const emailMatch = this.rawText.match(/(?:send|email|apply).*?(?:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (emailMatch) {
      this.sections.howToApply = emailMatch[0].slice(0, 200);
    }
  }

  /**
   * Extract closing info (deadline, contact)
   */
  extractClosingInfoSection() {
    const closingPatterns = [
      /deadline/i,
      /closing\s+date/i,
      /applications?\s+close/i,
      /(?:contact|for\s+(?:more\s+)?information)/i
    ];
    
    for (const block of this.sectionBlocks) {
      for (const pattern of closingPatterns) {
        if (pattern.test(block.header)) {
          this.sections.closingInfo = block.content.slice(0, 300);
          return;
        }
      }
    }
    
    // Look for deadline patterns
    const deadlineMatch = this.rawText.match(/(?:deadline|closing\s+date|applications?\s+close)[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}\s+\w+\s+\d{4})/i);
    if (deadlineMatch) {
      this.sections.closingInfo = deadlineMatch[0];
    }
  }

  /**
   * Extract bullet points from text
   * Handles: •, -, *, numbered lists
   */
  extractBulletPoints(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const bullets = [];
    
    for (const line of lines) {
      // Remove bullet markers
      const cleaned = line
        .replace(/^[•\-\*]\s*/, '')
        .replace(/^\d+\.\s*/, '')
        .trim();
      
      if (cleaned.length > 10 && cleaned.length < 300) {
        bullets.push(cleaned);
      }
    }
    
    // If no bullets found, try splitting by sentences
    if (bullets.length === 0 && text.length > 20) {
      const sentences = text.split(/[.;]\s+/).filter(s => s.length > 15 && s.length < 300);
      return sentences.slice(0, 10);
    }
    
    return bullets.slice(0, 10); // Max 10 items per section
  }

  /**
   * Calculate parsing confidence
   * Based on number of sections found and quality of extraction
   */
  calculateConfidence() {
    let score = 0;
    const weights = {
      about: 0.15,
      responsibilities: 0.25,
      requirements: 0.25,
      benefits: 0.15,
      howToApply: 0.10,
      closingInfo: 0.10
    };
    
    // About section
    if (this.sections.about && this.sections.about.length > 50) {
      score += weights.about;
    }
    
    // Responsibilities
    if (this.sections.responsibilities.length >= 3) {
      score += weights.responsibilities;
    } else if (this.sections.responsibilities.length >= 1) {
      score += weights.responsibilities * 0.5;
    }
    
    // Requirements
    if (this.sections.requirements.length >= 3) {
      score += weights.requirements;
    } else if (this.sections.requirements.length >= 1) {
      score += weights.requirements * 0.5;
    }
    
    // Benefits
    if (this.sections.benefits.length >= 1) {
      score += weights.benefits;
    }
    
    // How to apply
    if (this.sections.howToApply && this.sections.howToApply.length > 20) {
      score += weights.howToApply;
    }
    
    // Closing info
    if (this.sections.closingInfo && this.sections.closingInfo.length > 10) {
      score += weights.closingInfo;
    }
    
    this.confidence = score;
  }

  getResult() {
    return {
      sections: this.sections,
      confidence: this.confidence,
      method: 'regex'
    };
  }
}

/**
 * LLM-based fallback formatter (original implementation)
 */
async function formatWithLLM(rawText, jobTitle = '', companyName = '') {
  const systemPrompt = `You are a job description parser. Extract key sections from job postings.
Output ONLY valid JSON (no markdown, no code blocks, no explanations).

Format:
{
  "about": "Brief about the company/role (2-3 sentences)",
  "responsibilities": ["Task 1", "Task 2", ...],
  "requirements": ["Requirement 1", "Requirement 2", ...],
  "benefits": ["Benefit 1", "Benefit 2", ...],
  "howToApply": "Application instructions",
  "closingInfo": "Deadline and contact details"
}

CRITICAL RULES FOR DUPLICATE REMOVAL:
- MERGE duplicate sections: If "responsibilities" appears twice in different places, combine into ONE list
- REMOVE redundant content: If requirements appear as both paragraphs AND bullet points, extract ONLY the bullet points
- De-duplicate items: If same requirement/responsibility appears multiple times, include it ONLY ONCE
- If a section heading repeats (e.g., "Key Responsibilities" appears twice), merge all content under that heading into one section
- Job descriptions often repeat content - your job is to extract it ONCE in the most structured format

Additional Rules:
- Keep it concise - 3-5 unique bullet points per section (not 10+ repetitive ones)
- If a section is not mentioned, use empty string or empty array
- Handle Tok Pisin text (Papua New Guinea language)
- Extract salary/benefits clearly
- Preserve phone numbers, emails, deadlines exactly`;

  const prompt = `Job Title: ${jobTitle}
Company: ${companyName}

Job Description:
${rawText.slice(0, 4000)}

Extract structured sections as JSON:`;

  const response = await route(prompt, {
    task: 'job-format',
    systemPrompt,
    maxTokens: 2000,
    temperature: 0.3
  });

  // Parse JSON response
  let cleaned = response.text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '');
  const parsed = JSON.parse(cleaned);

  return {
    about: parsed.about || '',
    responsibilities: Array.isArray(parsed.responsibilities) ? parsed.responsibilities : [],
    requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
    benefits: Array.isArray(parsed.benefits) ? parsed.benefits : [],
    howToApply: parsed.howToApply || '',
    closingInfo: parsed.closingInfo || ''
  };
}

/**
 * Format a job description - HYBRID APPROACH
 * @param {string} rawText - Raw job description text
 * @param {string} jobTitle - Job title for context
 * @param {string} companyName - Company name for context
 * @returns {Promise<Object>} Formatted sections and HTML
 */
async function formatJobDescription(rawText, jobTitle = '', companyName = '') {
  if (!rawText || rawText.trim().length < 50) {
    return {
      about: rawText || '',
      responsibilities: [],
      requirements: [],
      benefits: [],
      howToApply: '',
      closingInfo: '',
      formatted_html: `<p>${escapeHtml(rawText || 'No description available')}</p>`,
      method: 'fallback-empty'
    };
  }

  // Check if content is already well-structured (has HTML or clear sections)
  const hasHTML = /<[^>]+>/.test(rawText);
  
  // If already structured and has HTML, minimal processing
  if (hasHTML && rawText.length > 200) {
    return {
      about: extractAbout(rawText),
      responsibilities: [],
      requirements: [],
      benefits: [],
      howToApply: extractHowToApply(rawText),
      closingInfo: extractClosingInfo(rawText),
      formatted_html: cleanAndFormatHTML(rawText),
      method: 'html-passthrough'
    };
  }

  // Step 1: Try regex parser
  const parser = new RegexJobParser(rawText);
  const parseResult = parser.parse();
  
  console.log(`Job Formatter: Regex parser confidence: ${(parseResult.confidence * 100).toFixed(1)}%`);
  
  // If regex parser has high confidence (>70%), use it
  if (parseResult.confidence >= 0.5) {
    const formatted_html = buildFormattedHTML(parseResult.sections);
    
    return {
      ...parseResult.sections,
      formatted_html,
      method: 'regex',
      confidence: parseResult.confidence
    };
  }
  
  // Step 2: Low confidence, fall back to LLM
  console.log(`Job Formatter: Regex confidence too low (${(parseResult.confidence * 100).toFixed(1)}%), using LLM fallback`);
  
  try {
    const llmSections = await formatWithLLM(rawText, jobTitle, companyName);
    const formatted_html = buildFormattedHTML(llmSections);
    
    return {
      ...llmSections,
      formatted_html,
      method: 'llm-fallback',
      confidence: 1.0
    };
    
  } catch (error) {
    console.error('Job Formatter: LLM fallback failed:', error.message);
    
    // Ultimate fallback: use regex result even if low confidence
    const formatted_html = buildFormattedHTML(parseResult.sections);
    
    return {
      ...parseResult.sections,
      formatted_html,
      method: 'regex-forced',
      confidence: parseResult.confidence
    };
  }
}

/**
 * Build formatted HTML from structured sections
 * De-duplicates items within each section to prevent repetition
 */
function buildFormattedHTML(sections) {
  // Add HTML comment to flag this as complete formatted description
  let html = '<!-- FORMATTED_DESCRIPTION: Complete job description with all sections merged and deduplicated. Do not render raw description or separate requirements. -->\n';

  if (sections.about) {
    html += `<h3 class="text-lg font-bold text-gray-900 mb-3">About the Role</h3>\n`;
    html += `<p class="text-gray-700 mb-6 leading-relaxed">${escapeHtml(sections.about)}</p>\n`;
  }

  // De-duplicate responsibilities
  if (sections.responsibilities && sections.responsibilities.length > 0) {
    const uniqueResponsibilities = deduplicateItems(sections.responsibilities);
    if (uniqueResponsibilities.length > 0) {
      html += `<h3 class="text-lg font-bold text-gray-900 mb-3">Key Responsibilities</h3>\n`;
      html += `<ul class="space-y-2 mb-6">\n`;
      uniqueResponsibilities.forEach(item => {
        html += `  <li class="flex items-start gap-2"><span class="text-primary-600 mt-1">•</span><span class="text-gray-700">${escapeHtml(item)}</span></li>\n`;
      });
      html += `</ul>\n`;
    }
  }

  // De-duplicate requirements
  if (sections.requirements && sections.requirements.length > 0) {
    const uniqueRequirements = deduplicateItems(sections.requirements);
    if (uniqueRequirements.length > 0) {
      html += `<h3 class="text-lg font-bold text-gray-900 mb-3">Requirements</h3>\n`;
      html += `<ul class="space-y-2 mb-6">\n`;
      uniqueRequirements.forEach(item => {
        const boldItem = boldifyKeyTerms(item);
        html += `  <li class="flex items-start gap-2"><span class="text-primary-600 mt-1">✓</span><span class="text-gray-700">${boldItem}</span></li>\n`;
      });
      html += `</ul>\n`;
    }
  }

  // De-duplicate benefits
  if (sections.benefits && sections.benefits.length > 0) {
    const uniqueBenefits = deduplicateItems(sections.benefits);
    if (uniqueBenefits.length > 0) {
      html += `<h3 class="text-lg font-bold text-gray-900 mb-3">Benefits & Compensation</h3>\n`;
      html += `<ul class="space-y-2 mb-6">\n`;
      uniqueBenefits.forEach(item => {
        const boldItem = boldifyKeyTerms(item);
        html += `  <li class="flex items-start gap-2"><span class="text-green-600 mt-1">✓</span><span class="text-gray-700">${boldItem}</span></li>\n`;
      });
      html += `</ul>\n`;
    }
  }

  if (sections.howToApply) {
    html += `<h3 class="text-lg font-bold text-gray-900 mb-3">How to Apply</h3>\n`;
    html += `<p class="text-gray-700 mb-6 leading-relaxed">${escapeHtml(sections.howToApply)}</p>\n`;
  }

  if (sections.closingInfo) {
    html += `<div class="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">\n`;
    html += `  <p class="text-gray-800 font-medium">${boldifyKeyTerms(sections.closingInfo)}</p>\n`;
    html += `</div>\n`;
  }

  return html || '<p class="text-gray-500">No description available</p>';
}

/**
 * De-duplicate items in a list based on normalized text similarity
 */
function deduplicateItems(items) {
  if (!items || items.length === 0) return [];
  
  const seen = new Set();
  const unique = [];
  
  for (const item of items) {
    // Normalize: lowercase, remove extra spaces, remove punctuation for comparison
    const normalized = item.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Skip empty items
    if (!normalized) continue;
    
    // Check for exact duplicates and very similar items (substring match)
    let isDuplicate = false;
    for (const seenItem of seen) {
      if (seenItem === normalized || 
          seenItem.includes(normalized) || 
          normalized.includes(seenItem)) {
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) {
      seen.add(normalized);
      unique.push(item);
    }
  }
  
  return unique;
}

/**
 * Bold key terms like salary ranges, deadlines, qualifications
 */
function boldifyKeyTerms(text) {
  let result = escapeHtml(text);
  
  // Bold salary amounts
  result = result.replace(/(\bPGK\s*[\d,]+(?:\s*-\s*[\d,]+)?)/gi, '<strong>$1</strong>');
  result = result.replace(/(\$\s*[\d,]+(?:\s*-\s*[\d,]+)?)/g, '<strong>$1</strong>');
  
  // Bold deadlines
  result = result.replace(/(deadline|closes|closing date|due date)(\s*:\s*[\w\s,]+)/gi, '<strong>$1$2</strong>');
  
  // Bold degree requirements
  result = result.replace(/\b(Bachelor|Master|PhD|Degree|Diploma|Certificate)('?s?)?\s+(in\s+[\w\s]+)?/gi, '<strong>$&</strong>');
  
  // Bold years of experience
  result = result.replace(/\b(\d+\+?\s*years?(?:\s+of)?\s+experience)/gi, '<strong>$1</strong>');
  
  return result;
}

/**
 * Extract "about" section from raw text
 */
function extractAbout(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  // First 2-3 non-empty lines often contain the about section
  return lines.slice(0, 3).join(' ').slice(0, 300);
}

/**
 * Extract how to apply info
 */
function extractHowToApply(text) {
  const applyRegex = /(?:how to apply|application process|to apply|send (?:cv|resume|application))[:\s]*(.*?)(?:\n\n|\n(?=[A-Z])|$)/is;
  const match = text.match(applyRegex);
  return match ? match[1].trim().slice(0, 300) : '';
}

/**
 * Extract closing info (deadline, contact)
 */
function extractClosingInfo(text) {
  const closingRegex = /(?:deadline|closing date|applications close|contact)[:\s]*(.*?)(?:\n\n|\n(?=[A-Z])|$)/is;
  const match = text.match(closingRegex);
  return match ? match[1].trim().slice(0, 200) : '';
}

/**
 * Clean and format existing HTML
 */
function cleanAndFormatHTML(html) {
  // Basic HTML cleanup
  return html
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .trim();
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

module.exports = { formatJobDescription, RegexJobParser };
