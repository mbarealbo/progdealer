// Prog festivals with their own hub page (/festival/<slug>). An event belongs
// to a festival when its name matches `pattern`. The URL has no year, so the
// page keeps its authority from one edition to the next.
//
// Only festivals whose bill is mostly prog, prog metal or post-rock belong
// here. A festival with no event in the catalog gets no page (see catalog.ts).

export interface FestivalDef {
  slug: string;
  name: string;
  pattern: RegExp;
  city: string;
  country: string;
  website?: string;
  /** One line for the hub page: what kind of festival it is. */
  blurb: string;
}

export const FESTIVALS: FestivalDef[] = [
  { slug: 'arctangent', name: 'ArcTanGent', pattern: /\barctangent\b/i, city: 'Cotswolds', country: 'United Kingdom', website: 'https://arctangent.co.uk', blurb: 'Math rock, post-rock and prog metal on a farm in the Cotswolds.' },
  { slug: 'radar-festival', name: 'RADAR Festival', pattern: /\bradar festival\b/i, city: 'Manchester', country: 'United Kingdom', website: 'https://radarfestival.co.uk', blurb: 'Progressive and alternative metal in Manchester.' },
  { slug: 'hrh-prog', name: 'HRH Prog', pattern: /\bhrh prog\b|\bcamp hrh\b/i, city: 'Great Yarmouth', country: 'United Kingdom', blurb: 'A long prog weekend at a holiday camp on the Norfolk coast.' },
  { slug: 'summers-end', name: "Summer's End Festival", pattern: /\bsummer[’']?s end\b/i, city: 'Chepstow', country: 'United Kingdom', website: 'https://www.summersend.co.uk', blurb: 'Classic and new prog in Chepstow every October.' },
  { slug: 'winters-end', name: "Winter's End Festival", pattern: /\bwinter[’']?s end\b/i, city: 'Chepstow', country: 'United Kingdom', website: 'https://www.winters-end.co.uk', blurb: "The spring sister of Summer's End, in Chepstow." },
  { slug: 'a-new-day-festival', name: 'A New Day Festival', pattern: /\ba new day festival\b/i, city: 'Faversham', country: 'United Kingdom', website: 'https://www.anewdayfestival.com', blurb: 'Classic rock and prog in a field in Kent.' },
  { slug: 'wha-s-like-us', name: "Wha's Like Us: Scottish Prog Festival", pattern: /\bscottish prog festival\b|\bwha[’']?s like us\b/i, city: 'Glasgow', country: 'United Kingdom', blurb: 'A festival of Scottish prog bands in Glasgow.' },
  { slug: 'steel-city-progfest', name: 'Steel City Progfest', pattern: /\bsteel city progfest\b/i, city: 'Sheffield', country: 'United Kingdom', blurb: 'Independent prog in Sheffield.' },
  { slug: 'hackney-prog-fest', name: 'Hackney Prog Fest', pattern: /\bhackney prog fest\b/i, city: 'London', country: 'United Kingdom', blurb: 'Underground prog in East London.' },
  { slug: 'prog-the-forest', name: 'Prog the Forest', pattern: /\bprog the forest\b/i, city: 'London', country: 'United Kingdom', blurb: 'A prog all-dayer in London.' },
  { slug: 'imaginarium-festival', name: 'Imaginarium Festival', pattern: /\bimaginarium festival\b/i, city: 'Reading', country: 'United Kingdom', blurb: 'Prog and art rock in Reading.' },
  { slug: 'eppyfest', name: 'Eppyfest', pattern: /\beppyfest\b/i, city: 'Cheltenham', country: 'United Kingdom', blurb: 'A friendly prog festival in Cheltenham.' },
  { slug: 'danfest', name: 'DanFest', pattern: /\bdanfest\b/i, city: 'Leicester', country: 'United Kingdom', blurb: 'A prog weekend in Leicester.' },
  { slug: 'marillion-weekend', name: 'Marillion Weekend', pattern: /\bmarillion (weekend|festival)\b/i, city: 'Port Zelande', country: 'Netherlands', website: 'https://www.marillionweekend.com', blurb: 'Marillion\'s own fan convention: three nights, three different sets, in Port Zelande and other cities.' },
  { slug: 'cruise-to-the-edge', name: 'Cruise to the Edge', pattern: /\bcruise to the edge\b/i, city: 'Miami', country: 'United States', website: 'https://cruisetotheedge.com', blurb: 'The prog rock cruise, sailing from Miami.' },
  { slug: 'progpower-usa', name: 'ProgPower USA', pattern: /\bprogpower usa\b/i, city: 'Atlanta', country: 'United States', website: 'https://progpowerusa.com', blurb: 'Progressive and power metal in Atlanta every September.' },
  { slug: 'progday', name: 'ProgDay', pattern: /\bprogday\b/i, city: 'Chapel Hill', country: 'United States', website: 'https://www.progday.net', blurb: 'The longest-running prog festival in the world, on a farm in North Carolina.' },
  { slug: 'progstock', name: 'ProgStock', pattern: /\bprogstock\b/i, city: 'Rutherford', country: 'United States', website: 'https://www.progstock.com', blurb: 'The prog festival of the American Northeast, in New Jersey.' },
  { slug: 'morsefest', name: 'Morsefest', pattern: /\bmorsefest\b/i, city: 'Brentwood', country: 'United Kingdom', blurb: 'Neal Morse and friends, with full-album sets.' },
  { slug: 'progstorm', name: 'ProgStorm Festival', pattern: /\bprogstorm\b/i, city: 'Montreal', country: 'Canada', website: 'https://www.progstorm.com', blurb: 'Prog rock and prog metal in Montreal.' },
  { slug: 'progpower-europe', name: 'ProgPower Europe', pattern: /\bprogpower europe\b/i, city: 'Baarlo', country: 'Netherlands', website: 'https://www.progpowereurope.com', blurb: 'Progressive metal in Baarlo, in a small and loyal crowd.' },
  { slug: 'midsummer-prog', name: 'Midsummer Prog Festival', pattern: /\bmidsummer prog\b/i, city: 'Maastricht', country: 'Netherlands', website: 'https://www.midsummerprog.com', blurb: 'Prog in Maastricht around midsummer.' },
  { slug: 'midwinter-prog', name: 'MidWinter Prog Festival', pattern: /\bmidwinter prog\b/i, city: 'Utrecht', country: 'Netherlands', blurb: 'A winter prog festival in Utrecht.' },
  { slug: 'euroblast', name: 'Euroblast Festival', pattern: /\beuroblast\b/i, city: 'Cologne', country: 'Germany', website: 'https://www.euroblast.net', blurb: 'Progressive metal, djent and post-rock in Cologne.' },
  { slug: 'night-of-the-prog', name: 'Night of the Prog', pattern: /\bnight of the prog\b/i, city: 'St. Goarshausen', country: 'Germany', website: 'https://www.nightoftheprogfestival.com', blurb: 'Prog at the Loreley open-air amphitheatre above the Rhine.' },
  { slug: 'empire-of-prog', name: 'Empire of Prog Festival', pattern: /\bempire of prog\b/i, city: 'Ramstein', country: 'Germany', website: 'https://empire-of-prog-festival.de', blurb: 'A prog festival in Ramstein.' },
  { slug: 'be-prog-my-friend', name: 'Be Prog! My Friend', pattern: /\bbe prog!? my friend\b/i, city: 'Barcelona', country: 'Spain', website: 'https://www.beprogmyfriend.com', blurb: 'Prog rock and prog metal in the Poble Espanyol of Barcelona.' },
  { slug: 'festival-crescendo', name: 'Festival Crescendo', pattern: /\bfestival crescendo\b|\bcrescendo festival\b/i, city: 'Saint-Palais-sur-Mer', country: 'France', website: 'https://www.festival-crescendo.com', blurb: 'A free prog festival on the Atlantic coast of France.' },
  { slug: 'ready-for-prog', name: 'Ready for Prog Festival', pattern: /\bready for prog\b/i, city: 'Toulouse', country: 'France', blurb: 'A prog festival in Toulouse.' },
  { slug: '2days-prog', name: '2Days Prog + 1', pattern: /\b2\s?days prog\b/i, city: 'Veruno', country: 'Italy', website: 'https://www.ver1musica.it', blurb: 'The Italian prog festival in Veruno, near Lake Maggiore.' },
  { slug: 'haugesund-prog-rock', name: 'Haugesund Prog & Rock Festival', pattern: /\bhaugesund prog\b/i, city: 'Haugesund', country: 'Norway', blurb: 'Prog and rock in Haugesund, on the Norwegian west coast.' },
  { slug: 'rosfest', name: 'RoSfest', pattern: /\brosfest\b/i, city: 'Sarasota', country: 'United States', website: 'https://rosfest.org', blurb: 'The Rites of Spring prog festival, last held in Sarasota, Florida.' },
];
