// PNG-specific helper functions

/**
 * Format salary with PNG Kina prefix
 * @param {number} amount - Salary amount
 * @param {string} currency - Currency code (default 'PGK')
 * @returns {string} Formatted salary string
 */
export function formatPNGSalary(amount, currency = 'PGK') {
  if (!amount) return '';
  
  // Always use K prefix for PNG Kina
  if (currency === 'PGK' || !currency) {
    return `K${amount.toLocaleString()}`;
  }
  
  // For other currencies, show code
  return `${currency} ${amount.toLocaleString()}`;
}

/**
 * Format salary range
 */
export function formatSalaryRange(min, max, currency = 'PGK', period = 'month') {
  if (!min || !max) return '';
  
  const minFormatted = formatPNGSalary(min, currency);
  const maxFormatted = formatPNGSalary(max, currency);
  
  const periodText = period === 'yearly' ? '/yia' : '/mun';
  
  return `${minFormatted} - ${maxFormatted}${periodText}`;
}

/**
 * Generate text-based company logo placeholder
 */
export function generateCompanyLogoPlaceholder(companyName) {
  if (!companyName) return null;
  
  // Get first 2 letters (or 1 if short)
  const words = companyName.trim().split(' ');
  let initials = '';
  
  if (words.length >= 2) {
    initials = words[0][0] + words[1][0];
  } else {
    initials = companyName.substring(0, 2);
  }
  
  initials = initials.toUpperCase();
  
  // Generate consistent color based on company name
  const colors = [
    'bg-blue-600',
    'bg-green-600',
    'bg-purple-600',
    'bg-pink-600',
    'bg-indigo-600',
    'bg-teal-600',
    'bg-orange-600',
    'bg-red-600'
  ];
  
  const hash = companyName.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  const colorClass = colors[Math.abs(hash) % colors.length];
  
  return {
    initials,
    colorClass
  };
}

/**
 * Check if company needs a logo placeholder
 */
export function needsLogoPlaceholder(job) {
  return !job.logo_url && 
         job.company_name && 
         job.company_name !== 'Various Employers' &&
         !job.company_name.includes('System account');
}

/**
 * Detect if user is on a slow connection
 */
export function isSlowConnection() {
  if ('connection' in navigator) {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      // 2G or slow 3G
      return conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g';
    }
  }
  return false;
}

/**
 * Get optimized image size for current connection
 */
export function getOptimizedImageSize() {
  if (isSlowConnection()) {
    return 'small'; // Return smaller images
  }
  return 'medium';
}

/**
 * Truncate text for mobile (PNG context - smaller screens, data-conscious)
 */
export function truncateForMobile(text, maxLength = 100) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Check if it's a good time to post a job (not a holiday/weekend)
 */
export function isGoodTimeToPost() {
  const now = new Date();
  const day = now.getDay();
  
  // Avoid weekends
  if (day === 0 || day === 6) {
    return {
      good: false,
      reason: 'Weekend - consider posting on Monday for better visibility'
    };
  }
  
  // Avoid very early morning or late evening PNG time
  const hour = now.getHours();
  if (hour < 7 || hour > 18) {
    return {
      good: false,
      reason: 'Post during business hours (7 AM - 6 PM) for better engagement'
    };
  }
  
  return { good: true };
}

/**
 * Format phone number for WhatsApp (PNG format)
 * Converts +675 7XXX XXXX to 6757XXXXXXX
 */
export function formatPhoneForWhatsApp(phone) {
  if (!phone) return '';
  
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '');
  
  // If starts with 0, replace with 675
  if (cleaned.startsWith('0')) {
    cleaned = '675' + cleaned.substring(1);
  }
  
  // If doesn't start with 675, add it
  if (!cleaned.startsWith('675')) {
    cleaned = '675' + cleaned;
  }
  
  return cleaned;
}

/**
 * Get WhatsApp share URL for a job
 */
export function getWhatsAppShareUrl(job, includeApply = false) {
  const baseUrl = window.location.origin;
  const jobUrl = `${baseUrl}/jobs/${job.id}`;
  
  let message = `*${job.title}*\n`;
  message += `${job.company_name}\n\n`;
  
  if (job.location) {
    message += `📍 ${job.location}\n`;
  }
  
  if (job.salary_min && job.salary_max) {
    message += `💰 K${job.salary_min.toLocaleString()} - K${job.salary_max.toLocaleString()}/month\n`;
  }
  
  if (job.job_type) {
    message += `💼 ${job.job_type}\n`;
  }
  
  message += `\n${jobUrl}`;
  
  if (includeApply) {
    message += '\n\n_Aplaim nau long WantokJobs!_';
  }
  
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/?text=${encodedMessage}`;
}

/**
 * Get a nice display name for a job source
 * @param {string} source - Raw source field like "headhunter:pngworkforce", "pngjobseek", etc.
 * @returns {{ label: string, short: string } | null}
 */
export function formatJobSource(source) {
  if (!source) return null;
  
  const sourceMap = {
    'headhunter:pngworkforce': { label: 'Imported from PNGWorkforce', short: 'via PNGWorkforce' },
    'headhunter:pngjobseek': { label: 'Imported from PNGJobSeek', short: 'via PNGJobSeek' },
    'deep-scrape:pngworkforce': { label: 'Imported from PNGWorkforce', short: 'via PNGWorkforce' },
    'pngworkforce': { label: 'Imported from PNGWorkforce', short: 'via PNGWorkforce' },
    'pngjobseek': { label: 'Imported from PNGJobSeek', short: 'via PNGJobSeek' },
    'headhunter': { label: 'Imported listing', short: 'Imported' },
    'reliefweb': { label: 'Imported from ReliefWeb', short: 'via ReliefWeb' },
    'seed': { label: 'Sample listing', short: 'Sample' },
    'seeded': { label: 'Sample listing', short: 'Sample' },
  };

  const lower = source.toLowerCase().trim();
  if (sourceMap[lower]) return sourceMap[lower];
  
  // Handle "headhunter:something" pattern
  if (lower.startsWith('headhunter:')) {
    const name = source.split(':')[1].trim();
    const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
    return { label: `Imported from ${capitalized}`, short: `via ${capitalized}` };
  }

  return null;
}

/**
 * Get display company name for a job, handling imported jobs
 * @param {object} job
 * @returns {string}
 */
export function getDisplayCompanyName(job) {
  if (!job) return '';
  const name = job.company_name || job.employer_name || '';
  if (name === 'Various Employers' || name === 'WantokJobs Imports') {
    const src = formatJobSource(job.source);
    return src ? src.short : 'Various Employers';
  }
  return name;
}
