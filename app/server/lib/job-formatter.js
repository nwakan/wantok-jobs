/**
 * AI Job Formatter
 * Parses raw job descriptions into structured sections using AI
 */

const { route } = require('./ai-router');

/**
 * Format a job description using AI to extract structured sections
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
      formatted_html: `<p>${escapeHtml(rawText || 'No description available')}</p>`
    };
  }

  // Check if content is already well-structured (has HTML or clear sections)
  const hasHTML = /<[^>]+>/.test(rawText);
  const hasSections = /(?:responsibilities|requirements|qualifications|benefits|about|apply)/i.test(rawText);
  
  // If already structured and has HTML, minimal processing
  if (hasHTML && rawText.length > 200) {
    return {
      about: extractAbout(rawText),
      responsibilities: [],
      requirements: [],
      benefits: [],
      howToApply: extractHowToApply(rawText),
      closingInfo: extractClosingInfo(rawText),
      formatted_html: cleanAndFormatHTML(rawText)
    };
  }

  try {
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

Rules:
- Keep it concise - 3-5 bullet points per section
- Remove duplicate content
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
    let parsed;
    try {
      // Clean response - remove markdown code blocks if present
      let cleaned = response.text.trim();
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '');
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error('Job Formatter: Failed to parse AI response:', e.message);
      // Fallback to basic structure
      return {
        about: extractAbout(rawText),
        responsibilities: [],
        requirements: [],
        benefits: [],
        howToApply: extractHowToApply(rawText),
        closingInfo: extractClosingInfo(rawText),
        formatted_html: `<p>${escapeHtml(rawText)}</p>`
      };
    }

    // Build formatted HTML
    const formatted_html = buildFormattedHTML({
      about: parsed.about || '',
      responsibilities: Array.isArray(parsed.responsibilities) ? parsed.responsibilities : [],
      requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
      benefits: Array.isArray(parsed.benefits) ? parsed.benefits : [],
      howToApply: parsed.howToApply || '',
      closingInfo: parsed.closingInfo || ''
    });

    return {
      about: parsed.about || '',
      responsibilities: Array.isArray(parsed.responsibilities) ? parsed.responsibilities : [],
      requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
      benefits: Array.isArray(parsed.benefits) ? parsed.benefits : [],
      howToApply: parsed.howToApply || '',
      closingInfo: parsed.closingInfo || '',
      formatted_html
    };

  } catch (error) {
    console.error('Job Formatter: AI formatting failed:', error.message);
    
    // Fallback: basic extraction
    return {
      about: extractAbout(rawText),
      responsibilities: [],
      requirements: [],
      benefits: [],
      howToApply: extractHowToApply(rawText),
      closingInfo: extractClosingInfo(rawText),
      formatted_html: `<div class="whitespace-pre-wrap">${escapeHtml(rawText)}</div>`
    };
  }
}

/**
 * Build formatted HTML from structured sections
 */
function buildFormattedHTML(sections) {
  let html = '';

  if (sections.about) {
    html += `<h3 class="text-lg font-bold text-gray-900 mb-3">About the Role</h3>\n`;
    html += `<p class="text-gray-700 mb-6 leading-relaxed">${escapeHtml(sections.about)}</p>\n`;
  }

  if (sections.responsibilities && sections.responsibilities.length > 0) {
    html += `<h3 class="text-lg font-bold text-gray-900 mb-3">Key Responsibilities</h3>\n`;
    html += `<ul class="space-y-2 mb-6">\n`;
    sections.responsibilities.forEach(item => {
      html += `  <li class="flex items-start gap-2"><span class="text-primary-600 mt-1">•</span><span class="text-gray-700">${escapeHtml(item)}</span></li>\n`;
    });
    html += `</ul>\n`;
  }

  if (sections.requirements && sections.requirements.length > 0) {
    html += `<h3 class="text-lg font-bold text-gray-900 mb-3">Requirements</h3>\n`;
    html += `<ul class="space-y-2 mb-6">\n`;
    sections.requirements.forEach(item => {
      const boldItem = boldifyKeyTerms(item);
      html += `  <li class="flex items-start gap-2"><span class="text-primary-600 mt-1">✓</span><span class="text-gray-700">${boldItem}</span></li>\n`;
    });
    html += `</ul>\n`;
  }

  if (sections.benefits && sections.benefits.length > 0) {
    html += `<h3 class="text-lg font-bold text-gray-900 mb-3">Benefits & Compensation</h3>\n`;
    html += `<ul class="space-y-2 mb-6">\n`;
    sections.benefits.forEach(item => {
      const boldItem = boldifyKeyTerms(item);
      html += `  <li class="flex items-start gap-2"><span class="text-green-600 mt-1">✓</span><span class="text-gray-700">${boldItem}</span></li>\n`;
    });
    html += `</ul>\n`;
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

module.exports = { formatJobDescription };
