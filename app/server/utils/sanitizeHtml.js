/**
 * HTML/XSS Sanitization Utilities
 * 
 * Prevents XSS attacks by stripping HTML tags and dangerous patterns from user input.
 * 
 * Usage:
 *   const safeTitle = stripHtml(userInput);
 *   const safeDesc = stripHtml(req.body.description);
 */

/**
 * Strip ALL HTML tags from input string.
 * Removes: <script>, <img>, <a>, and all other HTML/XML tags.
 * 
 * @param {string} input - User input to sanitize
 * @returns {string} - Plain text with HTML tags removed
 */
function stripHtml(input) {
  if (typeof input !== 'string') return '';
  
  let cleaned = input;
  
  // Strip all HTML/XML tags: <tag>, </tag>, <tag/>
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  
  // Decode common HTML entities that could be used to bypass filters
  cleaned = cleaned
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/&amp;/gi, '&');
  
  // Strip any remaining tags after entity decode
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  
  // Remove javascript: and data: URLs
  cleaned = cleaned.replace(/javascript:/gi, '');
  cleaned = cleaned.replace(/data:text\/html/gi, '');
  
  // Remove on* event handlers (onclick, onerror, onload, etc.)
  cleaned = cleaned.replace(/on\w+\s*=/gi, '');
  
  // Trim whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * Strip HTML but preserve line breaks (convert <br> to \n).
 * Useful for descriptions/content where formatting matters.
 * 
 * @param {string} input - User input
 * @returns {string} - Plain text with line breaks preserved
 */
function stripHtmlPreserveBreaks(input) {
  if (typeof input !== 'string') return '';
  
  let cleaned = input;
  
  // Convert <br>, <br/>, <br /> to newlines
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
  
  // Convert </p> and </div> to double newlines
  cleaned = cleaned.replace(/<\/(p|div)>/gi, '\n\n');
  
  // Now strip all remaining HTML
  cleaned = stripHtml(cleaned);
  
  // Normalize multiple newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
}

/**
 * Sanitize email address - strip HTML and validate format.
 * 
 * @param {string} email - Email input
 * @returns {string} - Sanitized email or empty string if invalid
 */
function sanitizeEmail(email) {
  if (typeof email !== 'string') return '';
  
  // Strip HTML first
  let cleaned = stripHtml(email).toLowerCase().trim();
  
  // Basic email validation regex
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
  
  if (!emailRegex.test(cleaned)) {
    return ''; // Invalid email
  }
  
  return cleaned;
}

/**
 * Validate and sanitize URL.
 * Blocks javascript:, data:, and other dangerous protocols.
 * 
 * @param {string} url - URL input
 * @returns {string} - Sanitized URL or empty string if dangerous
 */
function sanitizeUrl(url) {
  if (typeof url !== 'string') return '';
  
  const cleaned = url.trim();
  
  // Block dangerous protocols
  const dangerousProtocols = /^(javascript|data|vbscript|file):/i;
  if (dangerousProtocols.test(cleaned)) {
    return '';
  }
  
  // Only allow http, https, mailto
  const allowedProtocols = /^(https?|mailto):/i;
  if (cleaned.includes(':') && !allowedProtocols.test(cleaned)) {
    return '';
  }
  
  return cleaned;
}

/**
 * Check if input contains XSS patterns.
 * Use for logging/monitoring suspicious submissions.
 * 
 * @param {string} input - User input to test
 * @returns {boolean} - True if XSS patterns detected
 */
function hasXssPatterns(input) {
  if (typeof input !== 'string') return false;
  
  const xssPatterns = [
    /<script/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /javascript:/i,
    /on\w+\s*=/i,  // event handlers
    /<img[^>]+src/i,
    /data:text\/html/i,
    /<svg/i,
    /<link/i,
    /<meta/i
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Sanitize an object by stripping HTML from all string properties.
 * Recursively handles nested objects and arrays.
 * 
 * @param {Object} obj - Object with user input
 * @param {Array<string>} fieldsToSanitize - Specific fields to sanitize (optional, sanitizes all strings if not provided)
 * @returns {Object} - Object with sanitized strings
 */
function sanitizeObject(obj, fieldsToSanitize = null) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    
    const value = obj[key];
    
    // Check if we should sanitize this field
    const shouldSanitize = !fieldsToSanitize || fieldsToSanitize.includes(key);
    
    if (typeof value === 'string' && shouldSanitize) {
      sanitized[key] = stripHtml(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, fieldsToSanitize);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Validate string length.
 * 
 * @param {string} input - Input string
 * @param {number} maxLength - Maximum allowed length
 * @param {number} minLength - Minimum required length (default: 0)
 * @returns {boolean} - True if length is valid
 */
function isValidLength(input, maxLength, minLength = 0) {
  if (typeof input !== 'string') return false;
  const len = input.trim().length;
  return len >= minLength && len <= maxLength;
}

/**
 * Truncate string to maximum length.
 * 
 * @param {string} input - Input string
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add if truncated (default: '...')
 * @returns {string} - Truncated string
 */
function truncate(input, maxLength, suffix = '...') {
  if (typeof input !== 'string') return '';
  if (input.length <= maxLength) return input;
  
  return input.substring(0, maxLength - suffix.length) + suffix;
}

module.exports = {
  stripHtml,
  stripHtmlPreserveBreaks,
  sanitizeEmail,
  sanitizeUrl,
  hasXssPatterns,
  sanitizeObject,
  isValidLength,
  truncate
};
