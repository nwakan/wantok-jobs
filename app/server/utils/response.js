/**
 * Consistent API Response Helpers
 * 
 * All API responses follow: { success: boolean, data/error, message }
 * 
 * Usage:
 *   const { ok, fail, paginated } = require('../utils/response');
 *   return ok(res, data, 'Job created');
 *   return fail(res, 400, 'Title is required', 'VALIDATION_ERROR');
 *   return paginated(res, { data, total, page, limit });
 */

/**
 * Success response.
 * @param {object} res - Express response
 * @param {*} data - Response payload
 * @param {string} [message] - Optional human-readable message
 * @param {number} [status=200] - HTTP status code
 */
function ok(res, data = null, message = null, status = 200) {
  const body = { success: true };
  if (data !== null && data !== undefined) body.data = data;
  if (message) body.message = message;
  return res.status(status).json(body);
}

/**
 * Created response (201).
 */
function created(res, data = null, message = 'Created successfully') {
  return ok(res, data, message, 201);
}

/**
 * Error response.
 * @param {object} res - Express response
 * @param {number} status - HTTP status code
 * @param {string} message - Error message
 * @param {string} [code] - Machine-readable error code
 * @param {*} [details] - Optional error details (validation errors, etc.)
 */
function fail(res, status, message, code = null, details = null) {
  const body = { success: false, error: message };
  if (code) body.code = code;
  if (details) body.details = details;
  return res.status(status).json(body);
}

/**
 * Paginated response with headers.
 * @param {object} res - Express response
 * @param {object} opts
 * @param {Array} opts.data - Page items
 * @param {number} opts.total - Total count across all pages
 * @param {number} opts.page - Current page (1-indexed)
 * @param {number} opts.limit - Items per page
 * @param {string} [opts.message] - Optional message
 */
function paginated(res, { data, total, page, limit, message = null }) {
  const totalPages = Math.ceil(total / limit);

  // Standard pagination headers
  res.setHeader('X-Total-Count', total);
  res.setHeader('X-Page', page);
  res.setHeader('X-Per-Page', limit);
  res.setHeader('X-Total-Pages', totalPages);

  const body = {
    success: true,
    data,
    pagination: { page, limit, total, totalPages },
  };
  if (message) body.message = message;
  return res.json(body);
}

/**
 * No content response (204).
 */
function noContent(res) {
  return res.status(204).end();
}

module.exports = { ok, created, fail, paginated, noContent };
