/**
 * Add pagination headers to response
 * @param {object} res - Express response object
 * @param {number} total - Total number of items
 * @param {number} page - Current page (1-indexed)
 * @param {number} limit - Items per page
 * @param {string} baseUrl - Base URL for Link header
 */
function addPaginationHeaders(res, total, page, limit, baseUrl) {
  const totalPages = Math.ceil(total / limit);
  
  // X-Total-Count header
  res.setHeader('X-Total-Count', total);
  res.setHeader('X-Page', page);
  res.setHeader('X-Per-Page', limit);
  res.setHeader('X-Total-Pages', totalPages);
  
  // Link header for pagination (RFC 5988)
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

module.exports = { addPaginationHeaders };
