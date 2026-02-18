#!/usr/bin/env node
/**
 * Extract and populate official email domains and phone numbers for employer profiles
 * Run: node server/extract-employer-domains.js
 */

const db = require('./database');
const logger = require('./utils/logger');

// Generic email domains that shouldn't be used
const GENERIC_DOMAINS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'aol.com',
  'icloud.com', 'mail.com', 'protonmail.com', 'yandex.com', 'zoho.com'
];

/**
 * Extract domain from URL
 */
function extractDomain(url) {
  if (!url) return null;
  
  try {
    // Add protocol if missing
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    const parsed = new URL(fullUrl);
    let domain = parsed.hostname.toLowerCase();
    
    // Strip www. prefix
    domain = domain.replace(/^www\./, '');
    
    // Skip if it's a generic domain or social media
    if (GENERIC_DOMAINS.includes(domain)) return null;
    if (domain.includes('facebook.com') || domain.includes('linkedin.com') || 
        domain.includes('twitter.com') || domain.includes('instagram.com')) {
      return null;
    }
    
    return domain;
  } catch (error) {
    logger.debug('Failed to parse URL', { url, error: error.message });
    return null;
  }
}

/**
 * Extract Facebook profile from social links or text
 */
function extractFacebook(text) {
  if (!text) return null;
  
  const patterns = [
    /facebook\.com\/([a-zA-Z0-9._-]+)/i,
    /fb\.com\/([a-zA-Z0-9._-]+)/i,
    /fb\.me\/([a-zA-Z0-9._-]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return `https://facebook.com/${match[1]}`;
    }
  }
  
  return null;
}

/**
 * Extract LinkedIn profile
 */
function extractLinkedIn(text) {
  if (!text) return null;
  
  const pattern = /linkedin\.com\/(company|in)\/([a-zA-Z0-9._-]+)/i;
  const match = text.match(pattern);
  
  if (match && match[2]) {
    return `https://linkedin.com/${match[1]}/${match[2]}`;
  }
  
  return null;
}

/**
 * Extract Twitter/X profile
 */
function extractTwitter(text) {
  if (!text) return null;
  
  const patterns = [
    /twitter\.com\/([a-zA-Z0-9_]+)/i,
    /x\.com\/([a-zA-Z0-9_]+)/i,
    /@([a-zA-Z0-9_]+)/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].length > 2) {
      return `https://twitter.com/${match[1]}`;
    }
  }
  
  return null;
}

/**
 * Normalize phone number
 */
function normalizePhone(phone) {
  if (!phone) return null;
  
  // Remove all non-digit characters except +
  let normalized = phone.replace(/[^\d+]/g, '');
  
  // If it starts with 675 and no country code, add +675
  if (/^675\d{7}$/.test(normalized)) {
    normalized = '+' + normalized;
  }
  
  // Must have at least 7 digits to be valid
  if (normalized.replace(/\D/g, '').length < 7) {
    return null;
  }
  
  return normalized;
}

async function extractDomains() {
  try {
    logger.info('Starting domain extraction for employer profiles...');
    
    // Get all employer profiles with websites
    const profiles = db.prepare(`
      SELECT 
        id, 
        company_name, 
        website, 
        phone, 
        social_links,
        description,
        official_email_domain,
        official_phone,
        social_facebook,
        social_linkedin,
        social_twitter
      FROM profiles_employer
      WHERE website IS NOT NULL OR phone IS NOT NULL OR social_links IS NOT NULL
    `).all();
    
    logger.info(`Processing ${profiles.length} employer profiles...`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const profile of profiles) {
      const updates = {};
      let hasUpdates = false;
      
      // Extract domain from website
      if (profile.website && !profile.official_email_domain) {
        const domain = extractDomain(profile.website);
        if (domain) {
          updates.official_email_domain = domain;
          hasUpdates = true;
          logger.debug('Extracted domain', { 
            profileId: profile.id, 
            company: profile.company_name, 
            domain 
          });
        }
      }
      
      // Normalize phone number
      if (profile.phone && !profile.official_phone) {
        const normalizedPhone = normalizePhone(profile.phone);
        if (normalizedPhone) {
          updates.official_phone = normalizedPhone;
          hasUpdates = true;
          logger.debug('Normalized phone', { 
            profileId: profile.id, 
            company: profile.company_name, 
            phone: normalizedPhone 
          });
        }
      }
      
      // Extract social media from social_links JSON or description
      const socialText = [profile.social_links, profile.description, profile.website].filter(Boolean).join(' ');
      
      if (!profile.social_facebook) {
        const facebook = extractFacebook(socialText);
        if (facebook) {
          updates.social_facebook = facebook;
          hasUpdates = true;
        }
      }
      
      if (!profile.social_linkedin) {
        const linkedin = extractLinkedIn(socialText);
        if (linkedin) {
          updates.social_linkedin = linkedin;
          hasUpdates = true;
        }
      }
      
      if (!profile.social_twitter) {
        const twitter = extractTwitter(socialText);
        if (twitter) {
          updates.social_twitter = twitter;
          hasUpdates = true;
        }
      }
      
      // Update profile if we have changes
      if (hasUpdates) {
        const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(updates), profile.id];
        
        db.prepare(`
          UPDATE profiles_employer 
          SET ${setClause}
          WHERE id = ?
        `).run(...values);
        
        updated++;
        
        if (updated % 10 === 0) {
          logger.info(`Processed ${updated} profiles...`);
        }
      } else {
        skipped++;
      }
    }
    
    logger.info('✅ Domain extraction completed', {
      total: profiles.length,
      updated,
      skipped,
      updateRate: `${((updated / profiles.length) * 100).toFixed(1)}%`
    });
    
    // Show some stats
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN official_email_domain IS NOT NULL THEN 1 ELSE 0 END) as has_domain,
        SUM(CASE WHEN official_phone IS NOT NULL THEN 1 ELSE 0 END) as has_phone,
        SUM(CASE WHEN social_facebook IS NOT NULL THEN 1 ELSE 0 END) as has_facebook,
        SUM(CASE WHEN social_linkedin IS NOT NULL THEN 1 ELSE 0 END) as has_linkedin,
        SUM(CASE WHEN social_twitter IS NOT NULL THEN 1 ELSE 0 END) as has_twitter
      FROM profiles_employer
    `).get();
    
    logger.info('Employer profiles stats', {
      total: stats.total,
      withDomain: `${stats.has_domain} (${((stats.has_domain / stats.total) * 100).toFixed(1)}%)`,
      withPhone: `${stats.has_phone} (${((stats.has_phone / stats.total) * 100).toFixed(1)}%)`,
      withFacebook: `${stats.has_facebook} (${((stats.has_facebook / stats.total) * 100).toFixed(1)}%)`,
      withLinkedIn: `${stats.has_linkedin} (${((stats.has_linkedin / stats.total) * 100).toFixed(1)}%)`,
      withTwitter: `${stats.has_twitter} (${((stats.has_twitter / stats.total) * 100).toFixed(1)}%)`
    });
    
    return true;
  } catch (error) {
    logger.error('Domain extraction failed', { error: error.message, stack: error.stack });
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  extractDomains().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { extractDomain, extractDomains };
