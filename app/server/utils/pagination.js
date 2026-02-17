/**
 * Pagination Utilities
 * 
 * Standardized pagination for all list endpoints.
 */

/**
 * Parse and validate pagination params from query string.
 * Clamps values to safe ranges.
 * 
 * @param {object} query - Express req.query
 * @param {object} [defaults] - Default values
 * @param {number} [defaults.page=1] - Default page
 * @param {number} [defaults.limit=20] - Default per-page
 * @param {number} [defaults.maxLimit=100] - Maximum allowed per-page
 * @returns {{ page: number, limit: number, offset: number }}
 */
function parsePagination(query, defaults = {}) {
  const { page: defaultPage = 1, limit: defaultLimit = 20, maxLimit = 100 } = defaults;

  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  // Clamp to safe values
  if (!Number.isFinite(page) || page < 1) page = defaultPage;
  if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Add pagination headers to response.
 * @param {object} res - Express response object
 * @param {number} total - Total number of items
 * @param {number} page - Current page (1-indexed)
 * @param {number} limit - Items per page
 * @param {string} [baseUrl] - Base URL for Link header (optional)
 */
function addPaginationHeaders(res, total, page, limit, baseUrl) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Standard pagination headers
  res.setHeader('X-Total-Count', total);
  res.setHeader('X-Page', page);
  res.setHeader('X-Per-Page', limit);
  res.setHeader('X-Total-Pages', totalPages);

  // Link header for pagination (RFC 5988)
  if (baseUrl) {
    const links = [];

    if (page < totalPages) {
      links.push(`<${baseUrl}?page=${page + 1}&limit=${limit}>; rel="next"`);
      links.push(`<${baseUrl}?page=${totalPages}&limit=${limit}>; rel="last"`);
    }

    if (page > 1) {
      links.push(`<${baseUrl}?page=${page - 1}&limit=${limit}>; rel="prev"`);
      links.push(`<${baseUrl}?page=1&limit=${limit}>; rel="first"`);
    }

    if (links.length > 0) {
      res.setHeader('Link', links.join(', '));
    }
  }
}

/**
 * Build a complete paginated response object.
 * Combines headers + JSON body in consistent format.
 * 
 * @param {object} res - Express response
 * @param {object} opts
 * @param {Array} opts.data - Page items
 * @param {number} opts.total - Total count
 * @param {number} opts.page - Current page
 * @param {number} opts.limit - Per page
 * @param {string} [opts.baseUrl] - For Link headers
 */
function sendPaginated(res, { data, total, page, limit, baseUrl }) {
  addPaginationHeaders(res, total, page, limit, baseUrl);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  res.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
}

module.exports = { parsePagination, addPaginationHeaders, sendPaginated };
