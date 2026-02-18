/**
 * Canonical Location Database for PNG & Pacific Islands
 * 
 * Normalizes free-text locations to canonical names.
 * Auto-infers province/country from city names.
 */

const LOCATIONS = [
  // Papua New Guinea - Major Cities
  { name: 'Port Moresby', province: 'National Capital District', country: 'Papua New Guinea', code: 'PG', aliases: ['POM', 'NCD', 'Moresby', 'Port Moresby, NCD', 'Port Moresby, Papua New Guinea', 'National Capital District, Papua New Guinea', 'NCD, PNG', 'Port Moresby NCD'] },
  { name: 'Lae', province: 'Morobe', country: 'Papua New Guinea', code: 'PG', aliases: ['Lae, Morobe', 'Lae, Papua New Guinea', 'Morobe Province', 'Lae City', 'Lae Morobe'] },
  { name: 'Mount Hagen', province: 'Western Highlands', country: 'Papua New Guinea', code: 'PG', aliases: ['Mt Hagen', 'Hagen', 'Western Highlands', 'Mt. Hagen', 'Mount Hagen, Western Highlands'] },
  { name: 'Goroka', province: 'Eastern Highlands', country: 'Papua New Guinea', code: 'PG', aliases: ['Eastern Highlands', 'Goroka, Eastern Highlands'] },
  { name: 'Kokopo', province: 'East New Britain', country: 'Papua New Guinea', code: 'PG', aliases: ['East New Britain', 'ENB', 'Kokopo, East New Britain'] },
  { name: 'Madang', province: 'Madang', country: 'Papua New Guinea', code: 'PG', aliases: ['Madang Province', 'Madang, Papua New Guinea'] },
  { name: 'Wewak', province: 'East Sepik', country: 'Papua New Guinea', code: 'PG', aliases: ['East Sepik', 'Wewak, East Sepik'] },
  { name: 'Kimbe', province: 'West New Britain', country: 'Papua New Guinea', code: 'PG', aliases: ['West New Britain', 'WNB', 'Kimbe, West New Britain'] },
  { name: 'Tabubil', province: 'Western', country: 'Papua New Guinea', code: 'PG', aliases: ['Western Province', 'Ok Tedi'] },
  { name: 'Alotau', province: 'Milne Bay', country: 'Papua New Guinea', code: 'PG', aliases: ['Milne Bay', 'Alotau, Milne Bay'] },
  { name: 'Rabaul', province: 'East New Britain', country: 'Papua New Guinea', code: 'PG', aliases: ['Rabaul, East New Britain'] },
  { name: 'Buka', province: 'Bougainville', country: 'Papua New Guinea', code: 'PG', aliases: ['Bougainville', 'ABG', 'Autonomous Region of Bougainville'] },
  { name: 'Lihir', province: 'New Ireland', country: 'Papua New Guinea', code: 'PG', aliases: ['New Ireland', 'Lihir Island', 'Lihir Gold Mine'] },
  { name: 'Wabag', province: 'Enga', country: 'Papua New Guinea', code: 'PG', aliases: ['Enga Province', 'Enga'] },
  { name: 'Mendi', province: 'Southern Highlands', country: 'Papua New Guinea', code: 'PG', aliases: ['Southern Highlands', 'SHP'] },
  { name: 'Daru', province: 'Western', country: 'Papua New Guinea', code: 'PG', aliases: ['Western Province', 'Daru, Western'] },
  { name: 'Kavieng', province: 'New Ireland', country: 'Papua New Guinea', code: 'PG', aliases: ['New Ireland Province'] },
  { name: 'Vanimo', province: 'Sandaun', country: 'Papua New Guinea', code: 'PG', aliases: ['Sandaun Province', 'West Sepik'] },
  { name: 'Kundiawa', province: 'Chimbu', country: 'Papua New Guinea', code: 'PG', aliases: ['Chimbu Province', 'Simbu'] },
  { name: 'Popondetta', province: 'Northern', country: 'Papua New Guinea', code: 'PG', aliases: ['Northern Province', 'Oro Province'] },
  { name: 'Kerema', province: 'Gulf', country: 'Papua New Guinea', code: 'PG', aliases: ['Gulf Province'] },
  
  // PNG - Special
  { name: 'Highlands Region', province: null, country: 'Papua New Guinea', code: 'PG', aliases: ['PNG Highlands', 'Highlands'] },
  { name: 'Multiple Locations', province: null, country: 'Papua New Guinea', code: 'PG', aliases: ['Various Locations', 'Nationwide', 'PNG Wide', 'All PNG', 'Throughout PNG'] },
  
  // Fiji
  { name: 'Suva', province: null, country: 'Fiji', code: 'FJ', aliases: ['Suva, Fiji'] },
  { name: 'Nadi', province: null, country: 'Fiji', code: 'FJ', aliases: ['Nadi, Fiji'] },
  { name: 'Lautoka', province: null, country: 'Fiji', code: 'FJ', aliases: ['Lautoka, Fiji'] },
  
  // Solomon Islands
  { name: 'Honiara', province: null, country: 'Solomon Islands', code: 'SB', aliases: ['Honiara, Solomon Islands'] },
  
  // Vanuatu
  { name: 'Port Vila', province: null, country: 'Vanuatu', code: 'VU', aliases: ['Port Vila, Vanuatu'] },
  
  // Samoa
  { name: 'Apia', province: null, country: 'Samoa', code: 'WS', aliases: ['Apia, Samoa'] },
  
  // Tonga
  { name: "Nuku'alofa", province: null, country: 'Tonga', code: 'TO', aliases: ["Nuku'alofa, Tonga", 'Nukualofa'] },
  
  // Remote/International
  { name: 'Remote', province: null, country: null, code: null, aliases: ['Work from Home', 'WFH', 'Remote Work', 'Anywhere', 'Work From Anywhere'] },
  { name: 'Australia', province: null, country: 'Australia', code: 'AU', aliases: ['Sydney', 'Melbourne', 'Brisbane', 'Perth'] },
  { name: 'International', province: null, country: null, code: null, aliases: ['Overseas', 'Abroad', 'Global'] },
];

// Build lookup index
const _index = new Map();
LOCATIONS.forEach(loc => {
  _index.set(loc.name.toLowerCase(), loc);
  if (loc.province) _index.set(loc.province.toLowerCase(), loc);
  (loc.aliases || []).forEach(a => _index.set(a.toLowerCase(), loc));
});

/**
 * Normalize a location string to canonical form
 * @param {string} raw - Free-text location
 * @returns {{ name: string, province: string|null, country: string, code: string } | null}
 */
function normalize(raw) {
  if (!raw || typeof raw !== 'string') return null;
  
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  if (!cleaned) return null;
  
  // Exact match
  const exact = _index.get(cleaned.toLowerCase());
  if (exact) return { name: exact.name, province: exact.province, country: exact.country, code: exact.code };
  
  // Try removing common suffixes
  const stripped = cleaned
    .replace(/,?\s*(Papua New Guinea|PNG|Fiji|Solomon Islands|Vanuatu|Samoa|Tonga)$/i, '')
    .replace(/,?\s*(Province|Region|District)$/i, '')
    .trim();
  
  const stripped_match = _index.get(stripped.toLowerCase());
  if (stripped_match) return { name: stripped_match.name, province: stripped_match.province, country: stripped_match.country, code: stripped_match.code };
  
  // Try first part before comma
  const firstPart = cleaned.split(',')[0].trim();
  const first_match = _index.get(firstPart.toLowerCase());
  if (first_match) return { name: first_match.name, province: first_match.province, country: first_match.country, code: first_match.code };
  
  // No match — return raw with PNG default
  return { name: cleaned, province: null, country: 'Papua New Guinea', code: 'PG' };
}

/**
 * Get canonical display string
 */
function display(raw) {
  const loc = normalize(raw);
  if (!loc) return raw;
  if (loc.province) return `${loc.name}, ${loc.province}`;
  if (loc.country) return `${loc.name}, ${loc.country}`;
  return loc.name;
}

module.exports = { normalize, display, LOCATIONS };
