// Lightweight city -> country resolution used until proper geocoding (Google Places)
// lands in the geo phase. Kept deliberately simple: substring match on common cities.

const COUNTRY_CITIES: Record<string, string[]> = {
  'United Kingdom': ['london', 'manchester', 'birmingham', 'liverpool', 'bristol', 'leeds', 'glasgow', 'edinburgh', 'sheffield', 'cardiff'],
  France: ['paris', 'lyon', 'marseille', 'toulouse', 'nice', 'nantes', 'strasbourg', 'montpellier', 'bordeaux', 'lille'],
  Germany: ['berlin', 'munich', 'münchen', 'hamburg', 'cologne', 'köln', 'frankfurt', 'stuttgart', 'düsseldorf', 'dortmund', 'essen', 'leipzig'],
  Italy: ['rome', 'roma', 'milan', 'milano', 'naples', 'napoli', 'turin', 'torino', 'palermo', 'genoa', 'genova', 'bologna', 'florence', 'firenze', 'bari', 'catania', 'padua', 'padova', 'verona'],
  Spain: ['madrid', 'barcelona', 'valencia', 'seville', 'sevilla', 'zaragoza', 'málaga', 'malaga', 'murcia', 'palma', 'bilbao', 'alicante'],
  Netherlands: ['amsterdam', 'rotterdam', 'the hague', 'den haag', 'utrecht', 'eindhoven', 'tilburg', 'groningen', 'almere', 'breda', 'nijmegen', 'baarlo'],
  Belgium: ['brussels', 'bruxelles', 'antwerp', 'antwerpen', 'ghent', 'gent', 'charleroi', 'liège', 'bruges', 'namur', 'leuven', 'mons', 'aalst'],
  Switzerland: ['zurich', 'zürich', 'geneva', 'genève', 'basel', 'bern', 'lausanne', 'winterthur', 'lucerne', 'lugano'],
  Austria: ['vienna', 'wien', 'graz', 'linz', 'salzburg', 'innsbruck', 'klagenfurt', 'villach', 'wels'],
  'Czech Republic': ['prague', 'praha', 'brno', 'ostrava', 'plzen', 'liberec', 'olomouc', 'pardubice'],
  Poland: ['warsaw', 'warszawa', 'krakow', 'kraków', 'lodz', 'wroclaw', 'poznan', 'gdansk', 'szczecin', 'katowice'],
  Sweden: ['stockholm', 'gothenburg', 'göteborg', 'malmö', 'malmo', 'uppsala', 'västerås', 'örebro', 'linköping'],
  Denmark: ['copenhagen', 'københavn', 'aarhus', 'odense', 'aalborg', 'esbjerg', 'roskilde'],
  Norway: ['oslo', 'bergen', 'trondheim', 'stavanger', 'drammen', 'kristiansand', 'tromsø'],
  Finland: ['helsinki', 'espoo', 'tampere', 'vantaa', 'oulu', 'turku', 'jyväskylä', 'lahti'],
  Ireland: ['dublin', 'cork', 'limerick', 'galway', 'waterford', 'drogheda', 'dundalk'],
  Portugal: ['lisbon', 'lisboa', 'porto', 'braga', 'funchal', 'coimbra', 'setúbal', 'almada'],
  'United States': ['new york', 'los angeles', 'chicago', 'san francisco', 'seattle', 'austin', 'boston', 'atlanta', 'miami', 'philadelphia', 'denver'],
  Canada: ['toronto', 'montreal', 'montréal', 'vancouver', 'ottawa', 'calgary', 'quebec'],
  Japan: ['tokyo', 'osaka', 'kyoto', 'nagoya', 'yokohama', 'fukuoka', 'sapporo'],
  Australia: ['sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 'canberra'],
  Brazil: ['são paulo', 'sao paulo', 'rio de janeiro', 'brasília', 'salvador', 'belo horizonte', 'curitiba'],
  Mexico: ['mexico city', 'ciudad de méxico', 'guadalajara', 'monterrey', 'puebla'],
};

const FLAGS: Record<string, string> = {
  'United Kingdom': '🇬🇧', France: '🇫🇷', Germany: '🇩🇪', Italy: '🇮🇹', Spain: '🇪🇸',
  Netherlands: '🇳🇱', Belgium: '🇧🇪', Switzerland: '🇨🇭', Austria: '🇦🇹', 'Czech Republic': '🇨🇿',
  Poland: '🇵🇱', Sweden: '🇸🇪', Denmark: '🇩🇰', Norway: '🇳🇴', Finland: '🇫🇮', Ireland: '🇮🇪',
  Portugal: '🇵🇹', Greece: '🇬🇷', Hungary: '🇭🇺', Romania: '🇷🇴', Bulgaria: '🇧🇬', Estonia: '🇪🇪',
  Slovenia: '🇸🇮', Croatia: '🇭🇷', Serbia: '🇷🇸', Turkey: '🇹🇷', Luxembourg: '🇱🇺', Iceland: '🇮🇸',
  'United States': '🇺🇸', Canada: '🇨🇦', Mexico: '🇲🇽', Japan: '🇯🇵', Australia: '🇦🇺',
  'New Zealand': '🇳🇿', Brazil: '🇧🇷', Argentina: '🇦🇷', Chile: '🇨🇱', Other: '🌍',
};

// Country → continent, for the location filter.
const CONTINENTS: Record<string, string> = {
  'United Kingdom': 'Europe', France: 'Europe', Germany: 'Europe', Italy: 'Europe', Spain: 'Europe',
  Netherlands: 'Europe', Belgium: 'Europe', Switzerland: 'Europe', Austria: 'Europe', 'Czech Republic': 'Europe',
  Poland: 'Europe', Sweden: 'Europe', Denmark: 'Europe', Norway: 'Europe', Finland: 'Europe', Ireland: 'Europe',
  Portugal: 'Europe', Greece: 'Europe', Hungary: 'Europe', Romania: 'Europe', Bulgaria: 'Europe', Estonia: 'Europe',
  Slovenia: 'Europe', Croatia: 'Europe', Serbia: 'Europe', Turkey: 'Europe', Luxembourg: 'Europe', Iceland: 'Europe',
  'United States': 'North America', Canada: 'North America', Mexico: 'North America',
  Brazil: 'South America', Argentina: 'South America', Chile: 'South America',
  Japan: 'Asia', Australia: 'Oceania', 'New Zealand': 'Oceania',
};

// Normalize the country token that may appear after the comma in a `città`.
const COUNTRY_ALIAS: Record<string, string> = {
  uk: 'United Kingdom', 'u.k.': 'United Kingdom', england: 'United Kingdom', scotland: 'United Kingdom',
  wales: 'United Kingdom', 'great britain': 'United Kingdom', 'united kingdom': 'United Kingdom',
  usa: 'United States', 'u.s.a.': 'United States', us: 'United States', 'united states': 'United States',
  'united states of america': 'United States', america: 'United States',
  'the netherlands': 'Netherlands', holland: 'Netherlands', netherlands: 'Netherlands',
  deutschland: 'Germany', germany: 'Germany', italia: 'Italy', italy: 'Italy',
  'españa': 'Spain', spain: 'Spain', catalonia: 'Spain', aus: 'Australia', australia: 'Australia',
  jp: 'Japan', japan: 'Japan', 'türkiye': 'Turkey', turkiye: 'Turkey', turkey: 'Turkey', czechia: 'Czech Republic',
};

export function getEventCountry(città: string): string {
  const parts = (città || '').split(',');
  if (parts.length > 1) {
    const raw = parts[parts.length - 1].trim().toLowerCase();
    if (COUNTRY_ALIAS[raw]) return COUNTRY_ALIAS[raw];
    const titled = raw.replace(/\b\w/g, (ch) => ch.toUpperCase());
    if (CONTINENTS[titled] || FLAGS[titled]) return titled;
  }
  const c = (città || '').toLowerCase();
  for (const [country, cities] of Object.entries(COUNTRY_CITIES)) {
    if (cities.some((name) => c.includes(name))) return country;
  }
  return 'Other';
}

export function getContinent(country: string): string {
  return CONTINENTS[country] || 'Other';
}

export const CONTINENT_LIST = ['Europe', 'North America', 'South America', 'Asia', 'Oceania'];

export function countryFlag(country: string): string {
  return FLAGS[country] || '🌍';
}
