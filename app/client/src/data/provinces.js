// Papua New Guinea provinces with common variations and abbreviations
export const PNG_PROVINCES = [
  { name: "Central Province", abbr: "CPL", variations: ["Central", "CPL"] },
  { name: "Chimbu (Simbu)", abbr: "SIM", variations: ["Chimbu", "Simbu", "SIM", "CHI"] },
  { name: "Eastern Highlands", abbr: "EHP", variations: ["Eastern Highlands", "EHP", "E. Highlands"] },
  { name: "East New Britain", abbr: "ENB", variations: ["East New Britain", "ENB", "E.N. Britain"] },
  { name: "East Sepik", abbr: "ESP", variations: ["East Sepik", "ESP", "E. Sepik"] },
  { name: "Enga", abbr: "EPV", variations: ["Enga", "EPV"] },
  { name: "Gulf", abbr: "GPL", variations: ["Gulf", "GPL"] },
  { name: "Hela", abbr: "HEL", variations: ["Hela", "HEL"] },
  { name: "Jiwaka", abbr: "JWK", variations: ["Jiwaka", "JWK"] },
  { name: "Madang", abbr: "MPL", variations: ["Madang", "MPL"] },
  { name: "Manus", abbr: "MRL", variations: ["Manus", "MRL"] },
  { name: "Milne Bay", abbr: "MBA", variations: ["Milne Bay", "MBA"] },
  { name: "Morobe", abbr: "MPR", variations: ["Morobe", "MPR"] },
  { name: "National Capital District", abbr: "NCD", variations: ["National Capital District", "NCD", "Port Moresby", "POM"] },
  { name: "New Ireland", abbr: "NIK", variations: ["New Ireland", "NIK"] },
  { name: "Northern (Oro)", abbr: "NPP", variations: ["Northern", "Oro", "NPP", "ORO"] },
  { name: "Southern Highlands", abbr: "SHP", variations: ["Southern Highlands", "SHP", "S. Highlands"] },
  { name: "West New Britain", abbr: "WNB", variations: ["West New Britain", "WNB", "W.N. Britain"] },
  { name: "West Sepik (Sandaun)", abbr: "SAN", variations: ["West Sepik", "Sandaun", "SAN", "WSP"] },
  { name: "Western (Fly)", abbr: "WPD", variations: ["Western", "Fly", "WPD"] },
  { name: "Western Highlands", abbr: "WHP", variations: ["Western Highlands", "WHP", "W. Highlands"] },
  { name: "Autonomous Region of Bougainville", abbr: "NSB", variations: ["Bougainville", "ARB", "AROB", "NSB"] }
];

// Helper function to normalize location to province
export function matchProvinceFromLocation(location) {
  if (!location) return null;
  
  const locationLower = location.toLowerCase();
  
  for (const province of PNG_PROVINCES) {
    // Check exact name match
    if (locationLower === province.name.toLowerCase()) {
      return province;
    }
    
    // Check abbreviation
    if (locationLower === province.abbr.toLowerCase()) {
      return province;
    }
    
    // Check variations
    for (const variation of province.variations) {
      if (locationLower.includes(variation.toLowerCase())) {
        return province;
      }
    }
  }
  
  return null;
}

// PNG public holidays 2026 (for job posting/expiry logic)
export const PNG_PUBLIC_HOLIDAYS_2026 = [
  { date: "2026-01-01", name: "New Year's Day" },
  { date: "2026-04-10", name: "Good Friday" },
  { date: "2026-04-11", name: "Easter Saturday" },
  { date: "2026-04-13", name: "Easter Monday" },
  { date: "2026-06-13", name: "Queen's Birthday" },
  { date: "2026-07-23", name: "National Remembrance Day" },
  { date: "2026-09-16", name: "Independence Day" },
  { date: "2026-12-25", name: "Christmas Day" },
  { date: "2026-12-26", name: "Boxing Day" }
];

// Check if date is a PNG public holiday
export function isPNGPublicHoliday(date) {
  const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;
  return PNG_PUBLIC_HOLIDAYS_2026.some(h => h.date === dateStr);
}

// Get next business day (excluding weekends and public holidays)
export function getNextPNGBusinessDay(date = new Date()) {
  let nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  
  while (nextDay.getDay() === 0 || nextDay.getDay() === 6 || isPNGPublicHoliday(nextDay)) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  return nextDay;
}
