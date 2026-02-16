/**
 * SQL LIKE Query Sanitization Utilities
 * 
 * Prevents SQL injection via LIKE patterns by escaping special characters.
 * 
 * Usage:
 *   const searchTerm = `%${sanitizeLike(userInput)}%`;
 *   db.prepare('SELECT * FROM jobs WHERE title LIKE ?').all(searchTerm);
 */

/**
 * Sanitize user input for use in LIKE queries.
 * Escapes: % (wildcard), _ (single char wildcard), \ (escape char)
 * 
 * @param {string} input - User input to sanitize
 * @returns {string} - Sanitized string safe for LIKE queries
 */
function sanitizeLike(input) {
  if (typeof input !== 'string') return '';
  
  // Escape special LIKE characters: %, _, \
  // Replace each with escaped version: \%, \_, \\
  return input.replace(/[%_\\]/g, '\\$&');
}

/**
 * Create a LIKE pattern for partial matching (contains).
 * Wraps sanitized input with % wildcards.
 * 
 * @param {string} input - User input
 * @returns {string} - Safe LIKE pattern: %sanitized_input%
 */
function containsPattern(input) {
  return `%${sanitizeLike(input)}%`;
}

/**
 * Create a LIKE pattern for prefix matching (starts with).
 * 
 * @param {string} input - User input
 * @returns {string} - Safe LIKE pattern: sanitized_input%
 */
function startsWithPattern(input) {
  return `${sanitizeLike(input)}%`;
}

/**
 * Create a LIKE pattern for suffix matching (ends with).
 * 
 * @param {string} input - User input
 * @returns {string} - Safe LIKE pattern: %sanitized_input
 */
function endsWithPattern(input) {
  return `%${sanitizeLike(input)}`;
}

/**
 * Batch sanitize multiple inputs for LIKE queries.
 * 
 * @param {Array<string>} inputs - Array of user inputs
 * @returns {Array<string>} - Array of sanitized strings
 */
function sanitizeLikeBatch(inputs) {
  if (!Array.isArray(inputs)) return [];
  return inputs.map(sanitizeLike);
}

/**
 * Test if input contains SQL injection patterns (basic detection).
 * Use for logging/monitoring suspicious queries.
 * 
 * @param {string} input - User input to test
 * @returns {boolean} - True if suspicious patterns detected
 */
function hasSuspiciousPatterns(input) {
  if (typeof input !== 'string') return false;
  
  // Common SQL injection patterns
  const patterns = [
    /('|--|;|\/\*|\*\/)/i,  // SQL comment chars
    /(\bOR\b|\bAND\b|\bUNION\b|\bSELECT\b|\bDROP\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b)/i,  // SQL keywords
    /(xp_|sp_)/i,  // SQL Server stored procedures
    /(\bEXEC\b|\bEXECUTE\b)/i  // Execute commands
  ];
  
  return patterns.some(pattern => pattern.test(input));
}

module.exports = {
  sanitizeLike,
  containsPattern,
  startsWithPattern,
  endsWithPattern,
  sanitizeLikeBatch,
  hasSuspiciousPatterns
};
