/**
 * Country flag emoji mapping for Pacific Islands region.
 * Usage: getCountryFlag('Papua New Guinea') → '🇵🇬'
 *        getCountryFlag('Remote') → '🌐'
 *        getLocationWithFlag('Port Moresby', 'Papua New Guinea') → '🇵🇬 Port Moresby'
 */

const COUNTRY_FLAGS = {
  'Papua New Guinea': '🇵🇬',
  'PNG': '🇵🇬',
  'Fiji': '🇫🇯',
  'Solomon Islands': '🇸🇧',
  'Vanuatu': '🇻🇺',
  'Samoa': '🇼🇸',
  'Tonga': '🇹🇴',
  'Tuvalu': '🇹🇻',
  'Palau': '🇵🇼',
  'Kiribati': '🇰🇮',
  'Nauru': '🇳🇷',
  'Marshall Islands': '🇲🇭',
  'Federated States of Micronesia': '🇫🇲',
  'Cook Islands': '🇨🇰',
  'Niue': '🇳🇺',
  'New Caledonia': '🇳🇨',
  'Timor-Leste': '🇹🇱',
  'Australia': '🇦🇺',
  'New Zealand': '🇳🇿',
  'Indonesia': '🇮🇩',
  'Philippines': '🇵🇭',
  'Singapore': '🇸🇬',
  'Malaysia': '🇲🇾',
  'United States': '🇺🇸',
  'United Kingdom': '🇬🇧',
  'China': '🇨🇳',
  'Japan': '🇯🇵',
  'India': '🇮🇳',
};

// Keywords that indicate remote/online work
const REMOTE_KEYWORDS = ['remote', 'online', 'work from home', 'wfh', 'anywhere', 'virtual', 'telecommute'];

/**
 * Get flag emoji for a country name.
 * Returns 🌐 for remote/online, 🌏 for unknown.
 */
export function getCountryFlag(country) {
  if (!country) return '🌏';
  const lower = country.toLowerCase().trim();
  if (REMOTE_KEYWORDS.some(kw => lower.includes(kw))) return '🌐';
  return COUNTRY_FLAGS[country] || COUNTRY_FLAGS[country.trim()] || '🌏';
}

/**
 * Detect flag from location string when country field is missing.
 * Checks if location contains a known country name.
 */
export function getFlagFromLocation(location) {
  if (!location) return null;
  const lower = location.toLowerCase().trim();
  if (REMOTE_KEYWORDS.some(kw => lower.includes(kw))) return '🌐';
  for (const [name, flag] of Object.entries(COUNTRY_FLAGS)) {
    if (lower.includes(name.toLowerCase())) return flag;
  }
  // PNG city detection — if location mentions known PNG cities, assume PNG
  const pngCities = ['port moresby', 'lae', 'goroka', 'madang', 'wewak', 'mount hagen', 'kokopo', 'rabaul', 'kimbe', 'alotau', 'popondetta', 'mendi', 'tabubil', 'lihir', 'porgera'];
  if (pngCities.some(city => lower.includes(city))) return '🇵🇬';
  return null;
}

/**
 * Get the best flag for a job or profile, checking country then location.
 */
export function getFlag(item) {
  if (!item) return '🌏';
  // Check job_type for remote
  if (item.job_type && item.job_type.toLowerCase().includes('remote')) return '🌐';
  // Check country field first
  if (item.country) return getCountryFlag(item.country);
  // Fall back to location detection
  if (item.location) return getFlagFromLocation(item.location) || '🇵🇬'; // Default PNG for legacy data
  return '🌏';
}

export { COUNTRY_FLAGS };
export default getCountryFlag;
