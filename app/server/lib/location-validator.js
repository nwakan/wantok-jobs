/**
 * Location Validator — Multi-signal automatic location detection & validation
 * 
 * Signals (in order of reliability):
 * 1. Phone number prefix (WhatsApp) — instant, most reliable
 * 2. IP geolocation — free API, works for web users
 * 3. WhatsApp shared location (lat/lng) — if user shares
 * 4. Browser geolocation (lat/lng) — if user permits
 * 5. Self-reported — fallback, lowest trust
 */

const logger = require('../utils/logger');

// Pacific country phone prefixes
const PHONE_PREFIXES = {
  '675': { country: 'Papua New Guinea', code: 'PG', flag: '🇵🇬' },
  '679': { country: 'Fiji', code: 'FJ', flag: '🇫🇯' },
  '677': { country: 'Solomon Islands', code: 'SB', flag: '🇸🇧' },
  '678': { country: 'Vanuatu', code: 'VU', flag: '🇻🇺' },
  '685': { country: 'Samoa', code: 'WS', flag: '🇼🇸' },
  '676': { country: 'Tonga', code: 'TO', flag: '🇹🇴' },
  '688': { country: 'Tuvalu', code: 'TV', flag: '🇹🇻' },
  '680': { country: 'Palau', code: 'PW', flag: '🇵🇼' },
  '686': { country: 'Kiribati', code: 'KI', flag: '🇰🇮' },
  '674': { country: 'Nauru', code: 'NR', flag: '🇳🇷' },
  '692': { country: 'Marshall Islands', code: 'MH', flag: '🇲🇭' },
  '691': { country: 'Federated States of Micronesia', code: 'FM', flag: '🇫🇲' },
  '682': { country: 'Cook Islands', code: 'CK', flag: '🇨🇰' },
  '683': { country: 'Niue', code: 'NU', flag: '🇳🇺' },
  '687': { country: 'New Caledonia', code: 'NC', flag: '🇳🇨' },
  '681': { country: 'Wallis and Futuna', code: 'WF', flag: '🇼🇫' },
  '690': { country: 'Tokelau', code: 'TK', flag: '🇹🇰' },
};

// PNG mobile carrier prefixes (after country code 675)
const PNG_CARRIERS = {
  '70': 'Digicel',
  '71': 'Digicel',
  '72': 'Digicel',
  '73': 'Digicel',
  '74': 'Digicel',
  '75': 'Digicel',
  '76': 'bmobile',
  '77': 'bmobile',
  '78': 'Telikom',
  '79': 'Telikom',
  '80': 'Digicel',
  '81': 'Digicel',
  '82': 'Digicel',
  '83': 'bmobile',
  '84': 'bmobile',
  '85': 'Telikom',
};

// PNG city bounding boxes (rough lat/lng ranges)
const PNG_CITIES = [
  { name: 'Port Moresby', province: 'NCD', lat: [-9.50, -9.40], lng: [147.10, 147.22] },
  { name: 'Lae', province: 'Morobe', lat: [-6.78, -6.70], lng: [146.95, 147.05] },
  { name: 'Mt Hagen', province: 'Western Highlands', lat: [-5.88, -5.82], lng: [144.20, 144.28] },
  { name: 'Kokopo', province: 'East New Britain', lat: [-4.38, -4.30], lng: [152.25, 152.35] },
  { name: 'Madang', province: 'Madang', lat: [-5.24, -5.18], lng: [145.77, 145.83] },
  { name: 'Goroka', province: 'Eastern Highlands', lat: [-6.10, -6.04], lng: [145.36, 145.42] },
  { name: 'Wewak', province: 'East Sepik', lat: [-3.92, -3.86], lng: [143.83, 143.90] },
  { name: 'Kimbe', province: 'West New Britain', lat: [-5.58, -5.52], lng: [150.12, 150.18] },
  { name: 'Alotau', province: 'Milne Bay', lat: [-10.33, -10.28], lng: [150.43, 150.50] },
  { name: 'Rabaul', province: 'East New Britain', lat: [-4.22, -4.17], lng: [152.15, 152.22] },
  { name: 'Kavieng', province: 'New Ireland', lat: [-2.60, -2.55], lng: [150.78, 150.83] },
  { name: 'Mendi', province: 'Southern Highlands', lat: [-6.18, -6.12], lng: [143.63, 143.70] },
  { name: 'Popondetta', province: 'Northern (Oro)', lat: [-8.78, -8.72], lng: [148.22, 148.28] },
];

// Pacific Islands bounding boxes (country level)
const PACIFIC_BOUNDS = {
  PG: { lat: [-11.7, -1.0], lng: [140.8, 157.0] },
  FJ: { lat: [-21.0, -12.5], lng: [176.0, -179.0] },  // crosses dateline
  SB: { lat: [-12.5, -5.0], lng: [155.5, 170.0] },
  VU: { lat: [-20.5, -13.0], lng: [166.0, 170.5] },
  WS: { lat: [-14.1, -13.4], lng: [-172.8, -171.4] },
  TO: { lat: [-21.5, -15.5], lng: [-176.2, -173.7] },
};

/**
 * Validate location from phone number
 * @param {string} phoneNumber — raw phone number (may include + or country code)
 * @returns {{ country, code, flag, carrier, confidence, method } | null}
 */
function validateFromPhone(phoneNumber) {
  if (!phoneNumber) return null;
  
  // Normalize: strip +, spaces, dashes
  const clean = phoneNumber.replace(/[\s\-\(\)\+]/g, '');
  
  // Try each prefix (longest first for specificity)
  const prefixes = Object.keys(PHONE_PREFIXES).sort((a, b) => b.length - a.length);
  
  for (const prefix of prefixes) {
    if (clean.startsWith(prefix)) {
      const result = { ...PHONE_PREFIXES[prefix], confidence: 0.95, method: 'phone_prefix' };
      
      // For PNG, try to identify carrier
      if (prefix === '675') {
        const afterPrefix = clean.substring(3, 5);
        if (PNG_CARRIERS[afterPrefix]) {
          result.carrier = PNG_CARRIERS[afterPrefix];
        }
      }
      
      return result;
    }
  }
  
  return null;
}

/**
 * Validate location from IP address using free API
 * @param {string} ip — client IP address
 * @returns {Promise<{ country, code, city, region, lat, lng, confidence, method } | null>}
 */
async function validateFromIP(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return null; // Skip private/local IPs
  }
  
  try {
    // Use ip-api.com (free, no key, 45 req/min)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city,lat,lon`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    
    if (!response.ok) return null;
    const data = await response.json();
    
    if (data.status !== 'success') return null;
    
    // Check if it's a Pacific Island country
    const isPacific = Object.values(PHONE_PREFIXES).some(p => p.code === data.countryCode);
    
    return {
      country: data.country,
      code: data.countryCode,
      city: data.city,
      region: data.regionName,
      lat: data.lat,
      lng: data.lon,
      isPacific,
      confidence: 0.80, // IP can be VPN/proxy
      method: 'ip_geolocation',
    };
  } catch (error) {
    logger.error('IP geolocation failed', { ip, error: error.message });
    return null;
  }
}

/**
 * Validate from GPS coordinates (WhatsApp location share or browser geolocation)
 * @param {number} lat 
 * @param {number} lng 
 * @returns {{ country, code, city, province, confidence, method } | null}
 */
function validateFromCoords(lat, lng) {
  if (lat == null || lng == null) return null;
  
  // Check PNG cities first (most specific)
  for (const city of PNG_CITIES) {
    if (lat >= city.lat[0] && lat <= city.lat[1] && lng >= city.lng[0] && lng <= city.lng[1]) {
      return {
        country: 'Papua New Guinea',
        code: 'PG',
        city: city.name,
        province: city.province,
        flag: '🇵🇬',
        confidence: 0.98,
        method: 'gps_coordinates',
      };
    }
  }
  
  // Check country-level bounds
  for (const [code, bounds] of Object.entries(PACIFIC_BOUNDS)) {
    if (lat >= bounds.lat[0] && lat <= bounds.lat[1]) {
      // Handle dateline crossing for Fiji
      let lngMatch = false;
      if (bounds.lng[0] > bounds.lng[1]) {
        lngMatch = lng >= bounds.lng[0] || lng <= bounds.lng[1];
      } else {
        lngMatch = lng >= bounds.lng[0] && lng <= bounds.lng[1];
      }
      
      if (lngMatch) {
        const prefix = Object.entries(PHONE_PREFIXES).find(([, v]) => v.code === code);
        return {
          country: prefix ? prefix[1].country : code,
          code,
          flag: prefix ? prefix[1].flag : '🌏',
          confidence: 0.95,
          method: 'gps_coordinates',
        };
      }
    }
  }
  
  // Not in Pacific region
  return {
    country: 'Unknown',
    code: null,
    isPacific: false,
    confidence: 0.90,
    method: 'gps_coordinates',
  };
}

/**
 * Combined multi-signal validation
 * Uses all available signals and returns the best result
 * 
 * @param {object} signals — { phoneNumber, ip, lat, lng, selfReported }
 * @returns {Promise<{ country, code, city, province, flag, confidence, method, signals: [] }>}
 */
async function validate(signals = {}) {
  const results = [];
  
  // Signal 1: Phone prefix (fastest, most reliable)
  if (signals.phoneNumber) {
    const phoneResult = validateFromPhone(signals.phoneNumber);
    if (phoneResult) results.push(phoneResult);
  }
  
  // Signal 2: GPS coordinates
  if (signals.lat != null && signals.lng != null) {
    const coordResult = validateFromCoords(signals.lat, signals.lng);
    if (coordResult) results.push(coordResult);
  }
  
  // Signal 3: IP geolocation (async, slower)
  if (signals.ip) {
    const ipResult = await validateFromIP(signals.ip);
    if (ipResult) results.push(ipResult);
  }
  
  // Signal 4: Self-reported (lowest confidence)
  if (signals.selfReported) {
    // Try to match self-reported location to known country
    const lower = signals.selfReported.toLowerCase();
    const match = Object.values(PHONE_PREFIXES).find(p => 
      lower.includes(p.country.toLowerCase()) || lower.includes(p.code.toLowerCase())
    );
    if (match) {
      results.push({ ...match, confidence: 0.50, method: 'self_reported' });
    }
    
    // Try to match to PNG city
    const cityMatch = PNG_CITIES.find(c => lower.includes(c.name.toLowerCase()));
    if (cityMatch) {
      results.push({
        country: 'Papua New Guinea', code: 'PG', flag: '🇵🇬',
        city: cityMatch.name, province: cityMatch.province,
        confidence: 0.60, method: 'self_reported',
      });
    }
  }
  
  if (results.length === 0) {
    return { country: null, code: null, confidence: 0, method: 'none', signals: [] };
  }
  
  // Pick highest confidence result
  results.sort((a, b) => b.confidence - a.confidence);
  const best = results[0];
  
  // Boost confidence if multiple signals agree
  const countries = results.map(r => r.code).filter(Boolean);
  const allAgree = countries.length > 1 && countries.every(c => c === countries[0]);
  if (allAgree) {
    best.confidence = Math.min(best.confidence + 0.05, 1.0);
    best.corroborated = true;
  }
  
  // Merge city/province from most specific signal
  const withCity = results.find(r => r.city);
  if (withCity && !best.city) {
    best.city = withCity.city;
    best.province = withCity.province;
  }
  
  best.signals = results.map(r => ({ method: r.method, country: r.country, confidence: r.confidence }));
  
  return best;
}

/**
 * Auto-fill employer profile location from validation result
 * @param {object} validation — result from validate()
 * @returns {{ country, location } | null}
 */
function toProfileLocation(validation) {
  if (!validation || !validation.country || validation.confidence < 0.5) return null;
  
  const result = { country: validation.country };
  
  if (validation.city && validation.province) {
    result.location = `${validation.city}, ${validation.province}`;
  } else if (validation.city) {
    result.location = validation.city;
  }
  
  return result;
}

/**
 * Express middleware to attach location data to request
 * Adds req.locationHint with IP-based location (non-blocking)
 */
function locationMiddleware(req, res, next) {
  // Don't block the request — fire and forget
  const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.connection?.remoteAddress;
  
  if (ip && !req.locationHint) {
    validateFromIP(ip).then(result => {
      req.locationHint = result;
    }).catch(() => {});
  }
  
  next();
}

module.exports = {
  validateFromPhone,
  validateFromIP,
  validateFromCoords,
  validate,
  toProfileLocation,
  locationMiddleware,
  PHONE_PREFIXES,
  PNG_CARRIERS,
  PNG_CITIES,
};
