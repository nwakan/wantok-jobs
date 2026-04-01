/**
 * Number Formatting Utilities for WantokJobs
 * Provides consistent formatting across all dashboards and pages
 * 
 * @module formatters
 * @author Agent Zero
 * @date 2026-04-01
 */

/**
 * Format whole numbers with thousand separators
 * @param {number|string} num - Number to format
 * @returns {string} Formatted number (e.g., 1332 → "1,332")
 */
export function formatNumber(num) {
  if (num === null || num === undefined || num === '') return '0';
  const parsed = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(parsed)) return '0';
  return parsed.toLocaleString('en-US');
}

/**
 * Format currency with proper symbol and thousand separators
 * @param {number|string} amount - Amount to format
 * @param {string} currency - Currency code ('PGK', 'USD', 'AUD', etc.)
 * @returns {string} Formatted currency (e.g., 15000 → "K15,000")
 */
export function formatCurrency(amount, currency = 'PGK') {
  if (amount === null || amount === undefined || amount === '') return currency === 'PGK' ? 'K0' : '$0';
  const parsed = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(parsed)) return currency === 'PGK' ? 'K0' : '$0';

  // Currency-specific formatting
  switch (currency.toUpperCase()) {
    case 'PGK':
      // Papua New Guinea Kina: K prefix, no decimals for whole numbers
      return `K${parsed.toLocaleString('en-US', {
        minimumFractionDigits: parsed % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2
      })}`;
    
    case 'USD':
      // US Dollar: $ prefix, 2 decimals
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(parsed);
    
    case 'AUD':
      // Australian Dollar: A$ prefix, 2 decimals
      return `A${new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD'
      }).format(parsed)}`;
    
    case 'NZD':
      // New Zealand Dollar: NZ$ prefix, 2 decimals
      return `NZ${new Intl.NumberFormat('en-NZ', {
        style: 'currency',
        currency: 'NZD'
      }).format(parsed)}`;
    
    default:
      // Generic: use currency code prefix
      return `${currency}${parsed.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;
  }
}

/**
 * Format percentage with 1 decimal place
 * @param {number|string} num - Number to format (0.755 or 75.5)
 * @param {boolean} isDecimal - True if input is 0-1 decimal, false if 0-100
 * @returns {string} Formatted percentage (e.g., 0.755 → "75.5%")
 */
export function formatPercent(num, isDecimal = false) {
  if (num === null || num === undefined || num === '') return '0%';
  const parsed = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(parsed)) return '0%';
  
  const percent = isDecimal ? parsed * 100 : parsed;
  return `${percent.toFixed(1)}%`;
}

/**
 * Format large numbers in compact notation
 * @param {number|string} num - Number to format
 * @returns {string} Compact number (e.g., 1500000 → "1.5M")
 */
export function formatCompact(num) {
  if (num === null || num === undefined || num === '') return '0';
  const parsed = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(parsed)) return '0';

  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1
  }).format(parsed);
}

/**
 * Format salary range
 * @param {number|string} min - Minimum salary
 * @param {number|string} max - Maximum salary
 * @param {string} currency - Currency code
 * @returns {string} Formatted range (e.g., "K15,000 - K25,000")
 */
export function formatSalaryRange(min, max, currency = 'PGK') {
  if (!min && !max) return 'Negotiable';
  if (!max) return `From ${formatCurrency(min, currency)}`;
  if (!min) return `Up to ${formatCurrency(max, currency)}`;
  return `${formatCurrency(min, currency)} - ${formatCurrency(max, currency)}`;
}

/**
 * Format credit balance
 * @param {number|string} credits - Number of credits
 * @returns {string} Formatted credits (e.g., 150 → "150 credits")
 */
export function formatCredits(credits) {
  const num = formatNumber(credits);
  return `${num} ${credits === 1 ? 'credit' : 'credits'}`;
}

/**
 * Format file size
 * @param {number} bytes - File size in bytes
 * @returns {string} Human-readable size (e.g., 1024 → "1 KB")
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format phone number for PNG
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone (e.g., "71234567" → "7123 4567")
 */
export function formatPhone(phone) {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  
  // PNG mobile format: 7XXX XXXX or 675 7XXX XXXX
  if (cleaned.length === 8 && cleaned.startsWith('7')) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith('675')) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 7)} ${cleaned.slice(7)}`;
  }
  
  return phone; // Return as-is if format doesn't match
}

/**
 * Format date relative to now
 * @param {string|Date} date - Date to format
 * @returns {string} Relative date (e.g., "2 hours ago")
 */
export function formatRelativeTime(date) {
  if (!date) return '';
  
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHour < 24) return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`;
  if (diffDay < 7) return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} ${Math.floor(diffDay / 7) === 1 ? 'week' : 'weeks'} ago`;
  if (diffDay < 365) return `${Math.floor(diffDay / 30)} ${Math.floor(diffDay / 30) === 1 ? 'month' : 'months'} ago`;
  return `${Math.floor(diffDay / 365)} ${Math.floor(diffDay / 365) === 1 ? 'year' : 'years'} ago`;
}

export default {
  formatNumber,
  formatCurrency,
  formatPercent,
  formatCompact,
  formatSalaryRange,
  formatCredits,
  formatFileSize,
  formatPhone,
  formatRelativeTime
};
