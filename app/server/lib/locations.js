/**
 * Canonical Location Database for PNG & Pacific Islands
 * 
 * Normalizes free-text locations to canonical names.
 * Auto-infers province/country from city names.
 */

const LOCATIONS = [
  // Papua New Guinea - Major Cities
  { name: 'Port Moresby', province: 'National Capital District', country: 'Papua New Guinea', code: 'PG', aliases: ['POM', 'NCD', 'Moresby', 'Port Moresby, NCD', 'Port Moresby, Papua New Guinea', 'National Capital District, Papua New Guinea', 'NCD, PNG', 'Port Moresby NCD'] },
  { name: 'Lae', province: 'Morobe', country: 'Papua New Guinea', code: 'PG', aliases: ['Lae, Morobe', 'Lae, Papua New Guinea', 'Lae City', 'Lae Morobe', 'Lae, MO'] },
  { name: 'Mount Hagen', province: 'Western Highlands', country: 'Papua New Guinea', code: 'PG', aliases: ['Mt Hagen', 'Hagen', 'Western Highlands', 'Mt. Hagen', 'Mount Hagen, Western Highlands'] },
  { name: 'Goroka', province: 'Eastern Highlands', country: 'Papua New Guinea', code: 'PG', aliases: ['Goroka, Eastern Highlands', 'Goroka, EHP'] },
  { name: 'Kokopo', province: 'East New Britain', country: 'Papua New Guinea', code: 'PG', aliases: ['East New Britain', 'ENB', 'Kokopo, East New Britain', 'East New Britain , Papua New Guinea'] },
  { name: 'Madang', province: 'Madang', country: 'Papua New Guinea', code: 'PG', aliases: ['Madang, Papua New Guinea', 'Madang, Madang Province'] },
  { name: 'Wewak', province: 'East Sepik', country: 'Papua New Guinea', code: 'PG', aliases: ['Wewak, East Sepik'] },
  { name: 'Kimbe', province: 'West New Britain', country: 'Papua New Guinea', code: 'PG', aliases: ['Kimbe, West New Britain', 'Kimbe, WNB'] },
  { name: 'Tabubil', province: 'Western', country: 'Papua New Guinea', code: 'PG', aliases: ['Ok Tedi', 'Tabubil, Western'] },
  { name: 'Alotau', province: 'Milne Bay', country: 'Papua New Guinea', code: 'PG', aliases: ['Alotau, Milne Bay'] },
  { name: 'Rabaul', province: 'East New Britain', country: 'Papua New Guinea', code: 'PG', aliases: ['Rabaul, East New Britain'] },
  { name: 'Buka', province: 'Bougainville', country: 'Papua New Guinea', code: 'PG', aliases: ['ABG', 'Buka, Bougainville'] },
  { name: 'Lihir', province: 'New Ireland', country: 'Papua New Guinea', code: 'PG', aliases: ['Lihir Island', 'Lihir Gold Mine'] },
  { name: 'Wabag', province: 'Enga', country: 'Papua New Guinea', code: 'PG', aliases: ['Wabag, Enga'] },
  { name: 'Mendi', province: 'Southern Highlands', country: 'Papua New Guinea', code: 'PG', aliases: ['Mendi, SHP'] },
  { name: 'Daru', province: 'Western', country: 'Papua New Guinea', code: 'PG', aliases: ['Daru, Western'] },
  { name: 'Kavieng', province: 'New Ireland', country: 'Papua New Guinea', code: 'PG', aliases: ['Kavieng, New Ireland'] },
  { name: 'Vanimo', province: 'Sandaun', country: 'Papua New Guinea', code: 'PG', aliases: ['Vanimo, Sandaun'] },
  { name: 'Kundiawa', province: 'Chimbu', country: 'Papua New Guinea', code: 'PG', aliases: ['Simbu', 'Kundiawa, Chimbu'] },
  { name: 'Popondetta', province: 'Northern', country: 'Papua New Guinea', code: 'PG', aliases: ['Popondetta, Northern', 'Popondetta, Oro'] },
  { name: 'Kerema', province: 'Gulf', country: 'Papua New Guinea', code: 'PG', aliases: ['Kerema, Gulf'] },
  
  // Province-level entries (for jobs that only specify province)
  { name: 'Morobe', province: 'Morobe', country: 'Papua New Guinea', code: 'PG', aliases: ['Morobe Province', 'Morobe , Papua New Guinea'] },
  { name: 'Eastern Highlands', province: 'Eastern Highlands', country: 'Papua New Guinea', code: 'PG', aliases: ['Eastern Highlands Province', 'Eastern Highlands , Papua New Guinea', 'Eastern Highlands, Eastern Highlands , Papua New Guinea', 'EHP'] },
  { name: 'East Sepik', province: 'East Sepik', country: 'Papua New Guinea', code: 'PG', aliases: ['East Sepik Province', 'East Sepik , Papua New Guinea'] },
  { name: 'Western Highlands', province: 'Western Highlands', country: 'Papua New Guinea', code: 'PG', aliases: ['Western Highlands Province', 'Western Highlands , Papua New Guinea', 'WHP'] },
  { name: 'East New Britain', province: 'East New Britain', country: 'Papua New Guinea', code: 'PG', aliases: ['East New Britain Province', 'East New Britain , Papua New Guinea', 'ENB'] },
  { name: 'West New Britain', province: 'West New Britain', country: 'Papua New Guinea', code: 'PG', aliases: ['West New Britain Province', 'West New Britain , Papua New Guinea', 'WNB'] },
  { name: 'Milne Bay', province: 'Milne Bay', country: 'Papua New Guinea', code: 'PG', aliases: ['Milne Bay Province', 'Milne Bay , Papua New Guinea'] },
  { name: 'Western', province: 'Western', country: 'Papua New Guinea', code: 'PG', aliases: ['Western Province', 'Western (Fly) , Papua New Guinea', 'Fly River'] },
  { name: 'Gulf', province: 'Gulf', country: 'Papua New Guinea', code: 'PG', aliases: ['Gulf Province', 'Gulf , Papua New Guinea'] },
  { name: 'Enga', province: 'Enga', country: 'Papua New Guinea', code: 'PG', aliases: ['Enga Province', 'Enga , Papua New Guinea'] },
  { name: 'Southern Highlands', province: 'Southern Highlands', country: 'Papua New Guinea', code: 'PG', aliases: ['Southern Highlands Province', 'SHP', 'Southern Highlands , Papua New Guinea'] },
  { name: 'New Ireland', province: 'New Ireland', country: 'Papua New Guinea', code: 'PG', aliases: ['New Ireland Province', 'New Ireland , Papua New Guinea'] },
  { name: 'Sandaun', province: 'Sandaun', country: 'Papua New Guinea', code: 'PG', aliases: ['Sandaun Province', 'West Sepik', 'Sandaun , Papua New Guinea'] },
  { name: 'Northern', province: 'Northern', country: 'Papua New Guinea', code: 'PG', aliases: ['Northern Province', 'Oro Province', 'Northern , Papua New Guinea'] },
  { name: 'Bougainville', province: 'Bougainville', country: 'Papua New Guinea', code: 'PG', aliases: ['Autonomous Region of Bougainville', 'Bougainville Province'] },
  { name: 'Chimbu', province: 'Chimbu', country: 'Papua New Guinea', code: 'PG', aliases: ['Chimbu Province', 'Simbu Province', 'Simbu , Papua New Guinea'] },
  { name: 'Central', province: 'Central', country: 'Papua New Guinea', code: 'PG', aliases: ['Central Province', 'Central , Papua New Guinea'] },
  
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
  { name: 'Remote', province: null, country: null, code: null, aliases: ['Work from Home', 'WFH', 'Remote Work', 'Anywhere', 'Work From Anywhere', 'Remote — Open to PNG', 'Remote — Pacific Region'] },
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
  
  // Try removing common suffixes and extra whitespace around commas
  const stripped = cleaned
    .replace(/\s*,\s*/g, ', ')
    .replace(/,?\s*(Papua New Guinea|PNG|Fiji|Solomon Islands|Vanuatu|Samoa|Tonga)$/i, '')
    .replace(/,?\s*(Province|Region|District)$/i, '')
    .trim();
  
  const stripped_match = _index.get(stripped.toLowerCase());
  if (stripped_match) return { name: stripped_match.name, province: stripped_match.province, country: stripped_match.country, code: stripped_match.code };
  
  // Try first part before comma
  const firstPart = cleaned.split(',')[0].trim();
  const first_match = _index.get(firstPart.toLowerCase());
  if (first_match) return { name: first_match.name, province: first_match.province, country: first_match.country, code: first_match.code };
  
  // Province-only detection: if input is just "Province, Papua New Guinea", keep province as name
  const provinceNames = LOCATIONS.filter(l => l.province && l.code === 'PG').map(l => l.province);
  const isProvince = provinceNames.find(p => stripped.toLowerCase() === p.toLowerCase());
  if (isProvince) return { name: isProvince, province: isProvince, country: 'Papua New Guinea', code: 'PG' };
  
  // Special patterns
  if (/remote/i.test(cleaned)) return { name: 'Remote', province: null, country: null, code: null };
  if (/fiji/i.test(cleaned)) return { name: 'Fiji', province: null, country: 'Fiji', code: 'FJ' };
  if (/vanuatu/i.test(cleaned)) return { name: 'Vanuatu', province: null, country: 'Vanuatu', code: 'VU' };
  if (/solomon/i.test(cleaned)) return { name: 'Solomon Islands', province: null, country: 'Solomon Islands', code: 'SB' };
  if (/samoa/i.test(cleaned)) return { name: 'Samoa', province: null, country: 'Samoa', code: 'WS' };
  if (/tonga/i.test(cleaned)) return { name: 'Tonga', province: null, country: 'Tonga', code: 'TO' };
  if (/papua new guinea|png/i.test(cleaned)) return { name: 'Papua New Guinea', province: null, country: 'Papua New Guinea', code: 'PG' };
  
  // No match — return cleaned string with PNG default
  return { name: cleaned.replace(/\s*,\s*Papua New Guinea$/i, '').trim(), province: null, country: 'Papua New Guinea', code: 'PG' };
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
