// Shared offline geocoder (Open-Meteo geocoding API, keyless, no cost).
// Used by:
//   • scripts/geocode-cities.mjs — builds src/data/cityCoords.json
//   • scripts/scrape-events.mjs  — attaches city-level lat/lng to scraped events
// City-level precision; venue-level precision comes from the Google Places picker.

// Country-name → ISO code, to read the country hint out of a `città` string.
export const CC_ALIAS = {
  uk: 'GB', 'united kingdom': 'GB', 'great britain': 'GB', england: 'GB', scotland: 'GB', wales: 'GB', 'northern ireland': 'GB',
  ireland: 'IE',
  netherlands: 'NL', 'the netherlands': 'NL', holland: 'NL',
  france: 'FR', germany: 'DE', deutschland: 'DE',
  italy: 'IT', italia: 'IT',
  spain: 'ES', 'españa': 'ES', portugal: 'PT',
  belgium: 'BE', luxembourg: 'LU', switzerland: 'CH', austria: 'AT',
  poland: 'PL', 'czech republic': 'CZ', czechia: 'CZ', slovakia: 'SK', hungary: 'HU',
  sweden: 'SE', norway: 'NO', denmark: 'DK', finland: 'FI', iceland: 'IS',
  estonia: 'EE', latvia: 'LV', lithuania: 'LT',
  greece: 'GR', turkey: 'TR', 'türkiye': 'TR', turkiye: 'TR',
  bulgaria: 'BG', romania: 'RO', croatia: 'HR', slovenia: 'SI', serbia: 'RS',
  usa: 'US', 'u.s.a.': 'US', 'united states': 'US', 'united states of america': 'US',
  canada: 'CA', mexico: 'MX', brazil: 'BR', argentina: 'AR',
  japan: 'JP', australia: 'AU', 'new zealand': 'NZ',
};

// Hand-picked coordinates for names Open-Meteo resolves wrong or not at all
// (ambiguous exonyms / missing entries). Keyed by the lowercased `città`.
export const OVERRIDES = {
  'pompeii, italy': { lat: 40.7497, lng: 14.4869, country: 'Italy', cc: 'IT' },   // Pompei, Campania — Open-Meteo only has Pompeii, Michigan
  'roma, italy':    { lat: 41.8931, lng: 12.4828, country: 'Italy', cc: 'IT' },   // Rome — "Roma" returns Romania/Texas
  'genova':         { lat: 44.4056, lng: 8.9463,  country: 'Italy', cc: 'IT' },   // Genoa — "Genova" returns Guatemala
  'brest':          { lat: 48.3904, lng: -4.4861, country: 'France', cc: 'FR' },  // Brest, Brittany — bare name resolves to Belarus
  'kempten':        { lat: 47.7267, lng: 10.3139, country: 'Germany', cc: 'DE' }, // Kempten (Allgäu) — bare name resolves to a Zürich suburb
  'padova':         { lat: 45.4064, lng: 11.8768, country: 'Italy', cc: 'IT' },   // Padua — Open-Meteo's top hit is a wrong small place
  'bourne, uk':     { lat: 52.7667, lng: -0.3833, country: 'United Kingdom', cc: 'GB' }, // Bourne, Lincolnshire — not Bournemouth
  'dessel, belgium':{ lat: 51.2385, lng: 5.1145,  country: 'Belgium', cc: 'BE' }, // Dessel, Antwerp — Open-Meteo result order is unstable
};

// Resolve a `città` string ("City" or "City, Country") to { lat, lng, country, cc }
// or null when there's no confident match. Never returns a wrong-country result.
export async function geocode(cityRaw) {
  if (!cityRaw) return null;
  const key = cityRaw.toLowerCase();
  if (OVERRIDES[key]) return OVERRIDES[key];

  const [cityPart, hintPart] = cityRaw.split(',').map((s) => s.trim());
  const name = cityPart || cityRaw;
  const rawHint = hintPart ? hintPart.toLowerCase() : null;
  const hint = rawHint ? (CC_ALIAS[rawHint] || (rawHint.length === 2 ? rawHint.toUpperCase() : null)) : null;

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=10&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const results = json.results || [];
  if (!results.length) return null;

  let pick;
  if (hint) {
    // The città names a country → accept ONLY a same-country match; never fall
    // back to a different country (that's how "Pompeii, Italy" landed in Michigan).
    pick = results.find((r) => r.country_code === hint);
    if (!pick) return null;
  } else {
    // No country hint → Open-Meteo's top (relevance-ranked) hit; the handful it
    // gets wrong are pinned in OVERRIDES above.
    pick = results[0];
  }
  return {
    lat: Number(pick.latitude.toFixed(4)),
    lng: Number(pick.longitude.toFixed(4)),
    country: pick.country || null,
    cc: pick.country_code || null,
  };
}
