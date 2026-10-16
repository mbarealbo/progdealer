// City -> country -> continent, read from the free-text `città` field
// ("City", "City, Country", "City, ST", "City, ST, Country", "City, NL").
// Pure and import-free: the Netlify edge functions (Deno) use it too, through
// src/lib/seo.ts. Event-level helpers that also use coordinates live in coords.ts.

// Bare city names (no country after the comma) we recognise, matched on the
// whole first part of `città`.
const COUNTRY_CITIES: Record<string, string[]> = {
  'United Kingdom': ['london', 'manchester', 'birmingham', 'liverpool', 'bristol', 'leeds', 'glasgow', 'edinburgh', 'sheffield', 'cardiff', 'bilston', 'wolverhampton', 'nottingham', 'newcastle', 'belfast'],
  France: ['paris', 'lyon', 'marseille', 'toulouse', 'nice', 'nantes', 'strasbourg', 'montpellier', 'bordeaux', 'lille', 'orleans', 'orléans', 'villeurbanne', 'dijon', 'toulon', 'tours', 'narbonne', 'aix-en-provence', 'rennes', 'grenoble'],
  Germany: ['berlin', 'munich', 'münchen', 'hamburg', 'cologne', 'köln', 'frankfurt', 'stuttgart', 'düsseldorf', 'dortmund', 'essen', 'leipzig', 'magdeburg', 'oberhausen', 'bochum', 'hannover'],
  Italy: ['rome', 'roma', 'milan', 'milano', 'naples', 'napoli', 'turin', 'torino', 'palermo', 'genoa', 'genova', 'bologna', 'florence', 'firenze', 'bari', 'catania', 'padua', 'padova', 'verona', 'venice', 'venezia'],
  Spain: ['madrid', 'barcelona', 'valencia', 'seville', 'sevilla', 'zaragoza', 'málaga', 'malaga', 'murcia', 'palma', 'bilbao', 'alicante'],
  Netherlands: ['amsterdam', 'rotterdam', 'the hague', 'den haag', 'utrecht', 'eindhoven', 'tilburg', 'groningen', 'almere', 'breda', 'nijmegen', 'baarlo', 'zoetermeer', 'maastricht', 'uden', 'hoofddorp', 'sittard', 'amstelveen', 'apeldoorn', 'helmond', 'leeuwarden', 'enschede', 'haarlem', 'zwolle', 'leiden'],
  Belgium: ['brussels', 'bruxelles', 'antwerp', 'antwerpen', 'ghent', 'gent', 'charleroi', 'liège', 'bruges', 'namur', 'leuven', 'mons', 'aalst', 'verviers', 'deurne'],
  Switzerland: ['zurich', 'zürich', 'geneva', 'genève', 'basel', 'bern', 'lausanne', 'winterthur', 'lucerne', 'lugano'],
  Austria: ['vienna', 'wien', 'graz', 'linz', 'salzburg', 'innsbruck', 'klagenfurt', 'villach', 'wels'],
  'Czech Republic': ['prague', 'praha', 'brno', 'ostrava', 'plzen', 'liberec', 'olomouc', 'pardubice'],
  Poland: ['warsaw', 'warszawa', 'krakow', 'kraków', 'lodz', 'łódź', 'wroclaw', 'wrocław', 'poznan', 'poznań', 'gdansk', 'gdańsk', 'szczecin', 'katowice', 'zabrze'],
  Sweden: ['stockholm', 'gothenburg', 'göteborg', 'malmö', 'malmo', 'uppsala', 'västerås', 'örebro', 'linköping'],
  Denmark: ['copenhagen', 'københavn', 'aarhus', 'odense', 'aalborg', 'esbjerg', 'roskilde'],
  Norway: ['oslo', 'bergen', 'trondheim', 'stavanger', 'drammen', 'kristiansand', 'tromsø'],
  Finland: ['helsinki', 'espoo', 'tampere', 'vantaa', 'oulu', 'turku', 'jyväskylä', 'lahti'],
  Ireland: ['dublin', 'cork', 'limerick', 'galway', 'waterford', 'drogheda', 'dundalk'],
  Portugal: ['lisbon', 'lisboa', 'porto', 'braga', 'funchal', 'coimbra', 'setúbal', 'almada'],
  'United States': ['new york', 'new york city', 'los angeles', 'chicago', 'san francisco', 'seattle', 'austin', 'boston', 'atlanta', 'miami', 'philadelphia', 'denver'],
  Canada: ['toronto', 'montreal', 'montréal', 'vancouver', 'ottawa', 'calgary', 'quebec', 'québec'],
  Japan: ['tokyo', 'osaka', 'kyoto', 'nagoya', 'yokohama', 'fukuoka', 'sapporo'],
  Australia: ['sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 'canberra'],
  Brazil: ['são paulo', 'sao paulo', 'rio de janeiro', 'brasília', 'salvador', 'belo horizonte', 'curitiba'],
  Mexico: ['mexico city', 'ciudad de méxico', 'guadalajara', 'monterrey', 'puebla'],
};

// Country -> continent, for the location filter.
const CONTINENTS: Record<string, string> = {};
const add = (continent: string, countries: string[]) => { for (const c of countries) CONTINENTS[c] = continent; };
add('Europe', [
  'United Kingdom', 'Ireland', 'France', 'Germany', 'Italy', 'Spain', 'Portugal', 'Netherlands', 'Belgium',
  'Luxembourg', 'Switzerland', 'Austria', 'Liechtenstein', 'Monaco', 'Andorra', 'San Marino', 'Malta',
  'Czech Republic', 'Slovakia', 'Poland', 'Hungary', 'Slovenia', 'Croatia', 'Serbia', 'Bosnia and Herzegovina',
  'Montenegro', 'North Macedonia', 'Albania', 'Greece', 'Cyprus', 'Bulgaria', 'Romania', 'Moldova', 'Ukraine',
  'Belarus', 'Russia', 'Turkey', 'Estonia', 'Latvia', 'Lithuania', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Iceland',
]);
add('North America', ['United States', 'Canada', 'Mexico', 'Guatemala', 'Costa Rica', 'Panama', 'Cuba', 'Dominican Republic', 'Puerto Rico']);
add('South America', ['Brazil', 'Argentina', 'Chile', 'Colombia', 'Peru', 'Uruguay', 'Paraguay', 'Bolivia', 'Ecuador', 'Venezuela']);
add('Asia', ['Japan', 'China', 'South Korea', 'Taiwan', 'Hong Kong', 'Singapore', 'India', 'Indonesia', 'Philippines', 'Thailand', 'Vietnam', 'Malaysia', 'Israel', 'United Arab Emirates', 'Lebanon']);
add('Oceania', ['Australia', 'New Zealand']);
add('Africa', ['South Africa', 'Egypt', 'Morocco', 'Tunisia', 'Kenya', 'Nigeria']);

// Lowercased country names and nicknames -> canonical country.
const COUNTRY_ALIAS: Record<string, string> = Object.fromEntries(Object.keys(CONTINENTS).map((c) => [c.toLowerCase(), c]));
Object.assign(COUNTRY_ALIAS, {
  uk: 'United Kingdom', 'u.k.': 'United Kingdom', england: 'United Kingdom', scotland: 'United Kingdom',
  wales: 'United Kingdom', 'northern ireland': 'United Kingdom', 'great britain': 'United Kingdom',
  usa: 'United States', 'u.s.a.': 'United States', us: 'United States', 'united states of america': 'United States', america: 'United States',
  'the netherlands': 'Netherlands', holland: 'Netherlands', deutschland: 'Germany', italia: 'Italy',
  'españa': 'Spain', catalonia: 'Spain', aus: 'Australia', jp: 'Japan', czechia: 'Czech Republic',
  'türkiye': 'Turkey', turkiye: 'Turkey', korea: 'South Korea', uae: 'United Arab Emirates',
});

// Two-letter codes after the comma. US states win ("Anaheim, CA" is California),
// except DE, which in our sources is always Germany ("Oberhausen, DE").
const US_STATES = new Set('AL AK AZ AR CA CO CT DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA PR RI SC SD TN TX UT VT VA WA WV WI WY'.split(' '));
const CA_PROVINCES = new Set('ON QC BC AB MB NS NB'.split(' '));
const ISO: Record<string, string> = {
  GB: 'United Kingdom', IE: 'Ireland', FR: 'France', DE: 'Germany', IT: 'Italy', ES: 'Spain', PT: 'Portugal',
  NL: 'Netherlands', BE: 'Belgium', LU: 'Luxembourg', CH: 'Switzerland', AT: 'Austria', MC: 'Monaco',
  CZ: 'Czech Republic', SK: 'Slovakia', PL: 'Poland', HU: 'Hungary', SI: 'Slovenia', HR: 'Croatia', RS: 'Serbia',
  GR: 'Greece', CY: 'Cyprus', BG: 'Bulgaria', RO: 'Romania', UA: 'Ukraine', TR: 'Turkey',
  EE: 'Estonia', LV: 'Latvia', LT: 'Lithuania', SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland', IS: 'Iceland',
  MX: 'Mexico', BR: 'Brazil', CL: 'Chile', UY: 'Uruguay', JP: 'Japan', AU: 'Australia', NZ: 'New Zealand',
};

function cityListCountry(city: string): string | null {
  for (const [country, cities] of Object.entries(COUNTRY_CITIES)) if (cities.includes(city)) return country;
  return null;
}

// `cityCountry` settles the codes that mean two places: "Toronto, CA" is
// Canada (a city we know), "Anaheim, CA" is California.
function countryFromToken(raw: string, allowCode: boolean, cityCountry: string | null): string | null {
  const t = raw.toLowerCase();
  if (COUNTRY_ALIAS[t]) return COUNTRY_ALIAS[t];
  if (allowCode && raw.length === 2) {
    const code = raw.toUpperCase();
    const asCountry = code === 'CA' ? 'Canada' : ISO[code];
    if (asCountry && asCountry === cityCountry) return asCountry;
    if (code === 'DE') return 'Germany';
    if (US_STATES.has(code)) return 'United States';
    if (CA_PROVINCES.has(code)) return 'Canada';
    if (asCountry) return asCountry;
  }
  return null;
}

/** Country of an event from its `città` text, or 'Other' when it can't be told. */
export function getEventCountry(città: string): string {
  const parts = (città || '').split(',').map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return 'Other';
  const cityCountry = cityListCountry(parts[0].toLowerCase());
  // Read from the end: the country (or state code) comes last, maybe after a state.
  for (let i = parts.length - 1; i >= Math.max(0, parts.length - 2); i--) {
    const c = countryFromToken(parts[i], i > 0, cityCountry);
    if (c) return c;
  }
  return cityCountry || 'Other';
}

/** A country name as other sources spell it ("Czechia", "The Netherlands") -> ours. */
export function normalizeCountry(name: string): string {
  return COUNTRY_ALIAS[name.toLowerCase()] || 'Other';
}

export function getContinent(country: string): string {
  return CONTINENTS[country] || 'Other';
}

export const CONTINENT_LIST = ['Europe', 'North America', 'South America', 'Asia', 'Oceania', 'Africa'];

/** True for the Americas, which sit west of the mid-Atlantic. */
export const inAmericas = (continent: string) => continent === 'North America' || continent === 'South America';

/** Rough continent for a point, used only when the text names no known country. */
export function continentAt(lat: number, lng: number): string {
  if (lng < -30) return lat > 12.5 || (lat > 7 && lng < -77) ? 'North America' : 'South America';
  if (lat < -10 && lng > 110) return 'Oceania';
  if (lat >= 35 && lng < 45) return 'Europe';
  if (lat < 37 && lng < 52 && !(lng > 34 && lat > 29)) return 'Africa';
  return 'Asia';
}

// "Unknown", "Various venues", "UK and Europe", "Miami - Cozumel - ...": no single city.
const NO_CITY = /\b(unknown|various|tba|tbc|tbd|multiple|several|online|virtual|livestream)\b|&|\sand\s|\s-\s/i;
const CITY_STATES = new Set(['luxembourg', 'monaco', 'singapore', 'hong kong', 'san marino', 'andorra']);

/** True when `città` names no specific city (a placeholder, a tour, a bare country). */
export function hasNoCity(città: string | null | undefined): boolean {
  const first = (città || '').split(',')[0].trim().toLowerCase();
  if (!first || NO_CITY.test(città || '')) return true;
  if (CITY_STATES.has(first)) return false;
  return first === 'europe' || Boolean(COUNTRY_ALIAS[first]) || (first.length === 2 && Boolean(ISO[first.toUpperCase()]));
}
