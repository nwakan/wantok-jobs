/**
 * Tok Pisin Language Expander
 * 
 * Expands Tok Pisin job terms and PNG location aliases to English equivalents
 * Improves cross-language semantic matching for Papua New Guinea job search
 */

// Tok Pisin to English job term mappings
const TOK_PISIN_MAP = {
  'painim wok': 'find job search employment',
  'wok long haus sik': 'healthcare hospital medical nurse doctor',
  'skulim': 'education teaching training teacher',
  'wok moni': 'finance banking accounting',
  'enginiya': 'engineer engineering',
  'draiva': 'driver transport logistics driving',
  'haus kuk': 'kitchen cooking chef hospitality',
  'kamda': 'carpenter construction builder',
  'lo': 'law legal lawyer',
  'wok gaden': 'agriculture farming',
  'wok ain': 'mining mine miner',
  'komputa': 'computer IT technology',
  'sios': 'security guard',
  'nambawan': 'senior manager executive',
  'kuskus wok': 'cleaning cleaner',
  'wok solwara': 'fisheries marine fishing',
  'wok diwai': 'forestry timber logging',
  'helpim': 'support assistant helper',
  'bosim': 'manage supervisor lead',
  'salesman': 'sales marketing retail',
  'dokta': 'doctor medical physician',
  'nurs': 'nurse nursing healthcare',
  'tisa': 'teacher teaching education',
  'bilding': 'building construction',
  'stua': 'store retail shop',
  'ofis': 'office administration',
  'makim': 'mark marking grading',
  'raitim': 'write writing',
  'toktok': 'speak communication',
  'kaikai haus': 'restaurant food service',
  'karim': 'carry transport logistics',
  'wasim': 'wash cleaning',
  'kukim': 'cook cooking chef',
  'planim': 'plant agriculture farming',
  'katim': 'cut cutting',
  'mekim': 'make manufacture',
  'skelim': 'scale weighing measurement',
  'wok opis': 'office work administration',
  'wok gras': 'grass cutting gardening landscaping',
  'wok rot': 'road work construction',
  'wok sip': 'ship maritime marine',
  'wok plen': 'plane aviation airport',
  'wok haus': 'housework domestic',
  'wok sikul': 'school education teaching',
  'wok taun': 'town city urban work',
  'wok bus': 'bush rural remote',
  'gutpela wok': 'good job quality employment',
  'nupela wok': 'new job opportunity',
  'strongpela': 'strong skilled experienced',
  'save': 'know knowledge skill',
  'kisim': 'get receive',
  'givim': 'give provide',
  'askim': 'ask request',
};

// PNG Location aliases for better matching
const LOCATION_ALIASES = {
  'POM': 'Port Moresby NCD National Capital District',
  'LAE': 'Lae Morobe Province',
  'GOROKA': 'Goroka Eastern Highlands',
  'MADANG': 'Madang Madang Province',
  'MOUNT HAGEN': 'Mount Hagen Western Highlands',
  'HAGEN': 'Mount Hagen Western Highlands',
  'RABAUL': 'Rabaul East New Britain',
  'KOKOPO': 'Kokopo East New Britain',
  'WEWAK': 'Wewak East Sepik Province',
  'KIMBE': 'Kimbe West New Britain',
  'MENDI': 'Mendi Southern Highlands',
  'POPONDETTA': 'Popondetta Northern Province',
  'VANIMO': 'Vanimo Sandaun Province',
  'KAVIENG': 'Kavieng New Ireland',
  'ARAWA': 'Arawa Bougainville',
  'BUKA': 'Buka Bougainville',
  'KEREMA': 'Kerema Gulf Province',
  'DARU': 'Daru Western Province',
  'ALOTAU': 'Alotau Milne Bay',
  'KIUNGA': 'Kiunga Western Province',
  'TARI': 'Tari Hela Province',
  'KUNDIAWA': 'Kundiawa Chimbu Province',
  'LORENGAU': 'Lorengau Manus Province',
  'NCD': 'National Capital District Port Moresby',
  'CENTRAL': 'Central Province',
  'WESTERN': 'Western Province',
  'GULF': 'Gulf Province',
  'MILNE BAY': 'Milne Bay Province',
  'ORO': 'Oro Province Northern Province',
  'SOUTHERN HIGHLANDS': 'Southern Highlands Province',
  'ENGA': 'Enga Province',
  'WESTERN HIGHLANDS': 'Western Highlands Province',
  'SIMBU': 'Simbu Province Chimbu',
  'CHIMBU': 'Chimbu Province Simbu',
  'EASTERN HIGHLANDS': 'Eastern Highlands Province',
  'MOROBE': 'Morobe Province',
  'EAST SEPIK': 'East Sepik Province',
  'SANDAUN': 'Sandaun Province West Sepik',
  'WEST SEPIK': 'West Sepik Province Sandaun',
  'MANUS': 'Manus Province',
  'NEW IRELAND': 'New Ireland Province',
  'EAST NEW BRITAIN': 'East New Britain Province',
  'WEST NEW BRITAIN': 'West New Britain Province',
  'BOUGAINVILLE': 'Autonomous Region of Bougainville',
  'HELA': 'Hela Province',
  'JIWAKA': 'Jiwaka Province',
};

/**
 * Expand Tok Pisin terms in text
 * Detects Tok Pisin phrases and appends English equivalents
 * 
 * @param {string} text - Input text to expand
 * @returns {string} - Expanded text with English equivalents appended
 */
function expand(text) {
  if (!text || typeof text !== 'string') {
    return text || '';
  }
  
  const lowerText = text.toLowerCase();
  const expansions = [];
  
  // Check for Tok Pisin terms (multi-word first, then single words)
  const sortedTerms = Object.keys(TOK_PISIN_MAP).sort((a, b) => b.length - a.length);
  
  for (const term of sortedTerms) {
    if (lowerText.includes(term)) {
      expansions.push(TOK_PISIN_MAP[term]);
    }
  }
  
  // Check for location aliases
  for (const [alias, expansion] of Object.entries(LOCATION_ALIASES)) {
    // Use word boundaries to avoid partial matches
    const regex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(text)) {
      expansions.push(expansion);
    }
  }
  
  // Return original text with expansions appended
  if (expansions.length > 0) {
    const uniqueExpansions = [...new Set(expansions)];
    return `${text} ${uniqueExpansions.join(' ')}`;
  }
  
  return text;
}

/**
 * Detect if text contains Tok Pisin
 */
function containsTokPisin(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  const lowerText = text.toLowerCase();
  
  for (const term of Object.keys(TOK_PISIN_MAP)) {
    if (lowerText.includes(term)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get all Tok Pisin terms found in text
 */
function extractTokPisinTerms(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  const lowerText = text.toLowerCase();
  const found = [];
  
  const sortedTerms = Object.keys(TOK_PISIN_MAP).sort((a, b) => b.length - a.length);
  
  for (const term of sortedTerms) {
    if (lowerText.includes(term)) {
      found.push({ term, expansion: TOK_PISIN_MAP[term] });
    }
  }
  
  return found;
}

/**
 * Expand location aliases only
 */
function expandLocation(location) {
  if (!location || typeof location !== 'string') {
    return location || '';
  }
  
  const upperLocation = location.toUpperCase();
  
  for (const [alias, expansion] of Object.entries(LOCATION_ALIASES)) {
    if (upperLocation.includes(alias)) {
      return `${location} ${expansion}`;
    }
  }
  
  return location;
}

module.exports = {
  expand,
  expandLocation,
  containsTokPisin,
  extractTokPisinTerms,
  TOK_PISIN_MAP,
  LOCATION_ALIASES
};
