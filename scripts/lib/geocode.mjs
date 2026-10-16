// Shared offline geocoder (Open-Meteo geocoding API, keyless, no cost).
// Used by:
//   • scripts/geocode-cities.mjs: builds src/data/cityCoords.json
//   • scripts/scrape-events.mjs: attaches city-level lat/lng to scraped events
//   • scripts/backfill-coords.mjs: fills rows that have none
// City-level precision; venue-level precision comes from the Google Places picker.

// Country-name → ISO code, to read the country hint out of a `città` string.
export const CC_ALIAS = {
  uk: 'GB', 'united kingdom': 'GB', 'great britain': 'GB', england: 'GB', scotland: 'GB', wales: 'GB', 'northern ireland': 'GB',
  ireland: 'IE',
  netherlands: 'NL', 'the netherlands': 'NL', holland: 'NL',
  france: 'FR', germany: 'DE', deutschland: 'DE',
  italy: 'IT', italia: 'IT',
  spain: 'ES', 'españa': 'ES', portugal: 'PT',
  belgium: 'BE', luxembourg: 'LU', switzerland: 'CH', austria: 'AT', monaco: 'MC',
  poland: 'PL', 'czech republic': 'CZ', czechia: 'CZ', slovakia: 'SK', hungary: 'HU',
  sweden: 'SE', norway: 'NO', denmark: 'DK', finland: 'FI', iceland: 'IS',
  estonia: 'EE', latvia: 'LV', lithuania: 'LT',
  greece: 'GR', turkey: 'TR', 'türkiye': 'TR', turkiye: 'TR', cyprus: 'CY', malta: 'MT',
  bulgaria: 'BG', romania: 'RO', croatia: 'HR', slovenia: 'SI', serbia: 'RS', ukraine: 'UA',
  usa: 'US', 'u.s.a.': 'US', us: 'US', 'united states': 'US', 'united states of america': 'US',
  canada: 'CA', mexico: 'MX', brazil: 'BR', argentina: 'AR', chile: 'CL', colombia: 'CO', peru: 'PE', uruguay: 'UY',
  japan: 'JP', australia: 'AU', 'new zealand': 'NZ',
};

// US state codes, as in "Dallas, TX". Open-Meteo reports the state by name (admin1).
const US_STATES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut',
  DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};
// Canadian provinces, as in "Toronto, ON".
const CA_PROVINCES = {
  ON: 'Ontario', QC: 'Quebec', BC: 'British Columbia', AB: 'Alberta', MB: 'Manitoba', SK: 'Saskatchewan',
  NS: 'Nova Scotia', NB: 'New Brunswick', NL: 'Newfoundland and Labrador', PE: 'Prince Edward Island',
};

// Hand-picked coordinates for names Open-Meteo resolves wrong or not at all
// (ambiguous exonyms / missing entries). Keyed by the lowercased `città`.
export const OVERRIDES = {
  'pompeii, italy': { lat: 40.7497, lng: 14.4869, country: 'Italy', cc: 'IT' },   // Pompei, Campania: Open-Meteo only has Pompeii, Michigan
  'roma, italy':    { lat: 41.8931, lng: 12.4828, country: 'Italy', cc: 'IT' },   // Rome: "Roma" returns Romania/Texas
  'genova':         { lat: 44.4056, lng: 8.9463,  country: 'Italy', cc: 'IT' },   // Genoa: "Genova" returns Guatemala
  'brest':          { lat: 48.3904, lng: -4.4861, country: 'France', cc: 'FR' },  // Brest, Brittany: bare name resolves to Belarus
  'kempten':        { lat: 47.7267, lng: 10.3139, country: 'Germany', cc: 'DE' }, // Kempten (Allgäu): bare name resolves to a Zürich suburb
  'padova':         { lat: 45.4064, lng: 11.8768, country: 'Italy', cc: 'IT' },   // Padua: Open-Meteo's top hit is a wrong small place
  'bourne, uk':     { lat: 52.7667, lng: -0.3833, country: 'United Kingdom', cc: 'GB' }, // Bourne, Lincolnshire, not Bournemouth
  'dessel, belgium':{ lat: 51.2385, lng: 5.1145,  country: 'Belgium', cc: 'BE' }, // Dessel, Antwerp: Open-Meteo result order is unstable
  'warszawa':       { lat: 52.2297, lng: 21.0122, country: 'Poland', cc: 'PL' },  // Warsaw: Open-Meteo only knows a historic district in Ohio
  'monte carlo, monaco': { lat: 43.7396, lng: 7.4276, country: 'Monaco', cc: 'MC' }, // returned a town in Mexico
  'lisbonne, pt':   { lat: 38.7251, lng: -9.1498, country: 'Portugal', cc: 'PT' }, // French exonyms from French agendas
  'barcelone, es':  { lat: 41.3888, lng: 2.159,   country: 'Spain', cc: 'ES' },
  'luxembourg city, luxembourg': { lat: 49.6098, lng: 6.1327, country: 'Luxembourg', cc: 'LU' },
  'esch/alzette, luxembourg':    { lat: 49.4958, lng: 5.9806, country: 'Luxembourg', cc: 'LU' }, // Esch-sur-Alzette
  'folkstone, uk':  { lat: 51.0817, lng: 1.1673,  country: 'United Kingdom', cc: 'GB' }, // Folkestone, misspelt by the source
  'göteborg, sweden': { lat: 57.7072, lng: 11.9668, country: 'Sweden', cc: 'SE' }, // Gothenburg: the local name only finds a park
  'göteborg':       { lat: 57.7072, lng: 11.9668, country: 'Sweden', cc: 'SE' },
  'leamington spa, uk': { lat: 52.2852, lng: -1.52, country: 'United Kingdom', cc: 'GB' }, // listed as "Royal Leamington Spa"
  'saint louis, mo': { lat: 38.6273, lng: -90.1979, country: 'United States', cc: 'US' }, // listed as "St. Louis"
  'saint louis, mo, usa': { lat: 38.6273, lng: -90.1979, country: 'United States', cc: 'US' },
  'ciudad de méxico, mexico': { lat: 19.4285, lng: -99.1277, country: 'Mexico', cc: 'MX' }, // listed as "Mexico City"
  'dublin, uk':     { lat: 53.3331, lng: -6.2489, country: 'Ireland', cc: 'IE' }, // the source's "UK" is wrong; a Suffolk hamlet is also called Dublin
};

// "Unknown", "Various venues", "UK and Europe", "Miami - Cozumel - ...", a bare
// "UK": there is no single city to look up, and Open-Meteo would happily find
// a hamlet called "Unknown" in Bangladesh or "Uk" in Siberia.
const NO_CITY = /\b(unknown|various|tba|tbc|tbd|multiple|several|online|virtual|livestream)\b|&|\sand\s|\s-\s/i;
const CITY_STATES = new Set(['luxembourg', 'monaco', 'singapore', 'san marino', 'andorra']);
export function hasNoCity(cityRaw) {
  const first = (cityRaw || '').split(',')[0].trim().toLowerCase();
  if (!first || NO_CITY.test(cityRaw || '')) return true;
  if (CITY_STATES.has(first)) return false;
  return first === 'europe' || Boolean(CC_ALIAS[first]) || /^[a-z]{2}$/.test(first);
}

// The places a token after the comma can mean, most likely first, as tests on
// an Open-Meteo result. "TX" is Texas; "CA" is California or Canada; "DE" is
// Germany (our European sources) before Delaware.
function readings(token) {
  const t = token.toLowerCase();
  if (CC_ALIAS[t]) return [(r) => r.country_code === CC_ALIAS[t]];
  if (!/^[a-z]{2}$/i.test(token)) return [];
  const code = token.toUpperCase();
  const asState = US_STATES[code] && ((r) => r.country_code === 'US' && r.admin1 === US_STATES[code]);
  const asProvince = CA_PROVINCES[code] && ((r) => r.country_code === 'CA' && r.admin1 === CA_PROVINCES[code]);
  const asCountry = (r) => r.country_code === code;
  if (code === 'DE') return [asCountry, asState];
  return [asState, asCountry, asProvince].filter(Boolean);
}

const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Open-Meteo's first hit (relevance order), unless a real town (1,000+ people,
// not dwarfed by the first hit) carries exactly the name asked for: "Venice" is
// Venice, not Dayton; "Waterloo, USA" is Waterloo, not Austin. A hamlet called
// "München" doesn't beat Munich.
function best(candidates, name) {
  const first = candidates[0];
  const exact = candidates.find((r) => norm(r.name) === norm(name));
  if (!exact || exact === first) return first || null;
  const pop = exact.population || 0;
  return pop >= 1000 && pop >= 0.02 * (first.population || 0) ? exact : first;
}

// Resolve a `città` string ("City", "City, Country", "City, ST", "City, ST, Country")
// to { lat, lng, country, cc } or null when there's no confident match.
// Never returns a result in a country (or US state) other than the one named.
export async function geocode(cityRaw) {
  if (!cityRaw) return null;
  const key = cityRaw.toLowerCase();
  if (OVERRIDES[key]) return OVERRIDES[key];
  if (hasNoCity(cityRaw)) return null;

  const parts = cityRaw.split(',').map((s) => s.trim()).filter(Boolean);
  // "Modica (RG)" → Modica; "A-Innsbruck", "CH-Pratteln" (old postal prefixes) → Innsbruck, Pratteln.
  const name = parts[0].replace(/\s*\([^)]*\)/g, '').replace(/^(?:A|B|CH|D|DK|E|F|I|L|N|NL|P|PL|S)-(?=\p{Lu})/u, '').trim();
  // A pinned city named with its country: "Warszawa, Poland".
  const pinned = OVERRIDES[name.toLowerCase()];
  if (pinned && parts.length > 1 && readings(parts[parts.length - 1]).some((test) => test({ country_code: pinned.cc }))) return pinned;

  const search = async (q) => {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=50&language=en&format=json`);
    if (!res.ok) return [];
    const json = await res.json();
    // Populated places only: no parks, passes, airfields or historic districts.
    return (json.results || []).filter((r) => (r.feature_code || '').startsWith('PPL'));
  };

  // The candidates for one spelling, kept to the country (and state) the città names.
  const resolve = async (q) => {
    let candidates = await search(q);
    if (!candidates.length || parts.length < 2) return candidates;
    // The città names a country or state → accept ONLY a match there; never fall
    // back elsewhere (that's how "Pompeii, Italy" landed in Michigan).
    // A region we can't read ("Magdeburg, Saxony-Anhalt") counts as no hint.
    const last = readings(parts[parts.length - 1]);
    if (!last.length) return candidates;
    candidates = last.map((test) => candidates.filter(test)).find((list) => list.length) || [];
    // "City, ST, Country": the state must match too, when we can read it.
    const mid = parts.length > 2 ? readings(parts[parts.length - 2]) : [];
    if (candidates.length && mid.length) candidates = mid.map((test) => candidates.filter(test)).find((list) => list.length) || [];
    return candidates;
  };

  // "St. Albans", "St Charles": Open-Meteo may know "St Albans" or "Saint Charles".
  const spellings = [name];
  if (/^st\.?\s/i.test(name)) spellings.push(name.replace(/^st\.?\s/i, 'St '), name.replace(/^st\.?\s/i, 'Saint '));
  let candidates = [];
  for (const q of [...new Set(spellings)]) {
    candidates = await resolve(q);
    if (candidates.length) break;
  }
  if (!candidates.length) return null;

  const pick = best(candidates, name);
  if (!pick) return null;
  return {
    lat: Number(pick.latitude.toFixed(4)),
    lng: Number(pick.longitude.toFixed(4)),
    country: pick.country || null,
    cc: pick.country_code || null,
  };
}
