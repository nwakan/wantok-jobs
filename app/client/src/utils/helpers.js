// Time ago helper
export function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks ago`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} months ago`;
  return `${Math.floor(seconds / 31536000)} years ago`;
}

// Check if job is new (posted within last 48 hours)
export function isNewJob(dateString) {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();
  const hours = Math.floor((now - date) / (1000 * 60 * 60));
  return hours <= 48;
}

// Check if job is hot (posted within last 24 hours)
export function isHotJob(dateString) {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();
  const hours = Math.floor((now - date) / (1000 * 60 * 60));
  return hours <= 24;
}

// Detect if text contains HTML tags
export function containsHTML(text) {
  if (!text) return false;
  return /<[^>]+>/.test(text);
}

// Sanitize HTML (basic - removes script tags)
export function sanitizeHTML(html) {
  if (!html) return '';
  return html.replace(/<script[^>]*>.*?<\/script>/gi, '');
}

// Copy to clipboard
export function copyToClipboard(text) {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  } else {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return Promise.resolve();
  }
}

// Format salary range
export function formatSalary(min, max, currency = 'PGK') {
  if (!min || !max) return null;
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `${formatter.format(min)} - ${formatter.format(max)}`;
}

// Truncate text
export function truncate(text, maxLength = 150) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

// Extract plain text from HTML
export function stripHTML(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}
