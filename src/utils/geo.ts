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
  Portugal: '🇵🇹', 'United States': '🇺🇸', Canada: '🇨🇦', Japan: '🇯🇵', Australia: '🇦🇺',
  Brazil: '🇧🇷', Mexico: '🇲🇽', Other: '🌍',
};

export function getEventCountry(city: string): string {
  const c = (city || '').toLowerCase();
  for (const [country, cities] of Object.entries(COUNTRY_CITIES)) {
    if (cities.some((name) => c.includes(name))) return country;
  }
  return 'Other';
}

export function countryFlag(country: string): string {
  return FLAGS[country] || '🌍';
}
