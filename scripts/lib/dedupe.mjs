// ---------------------------------------------------------------------------
// Shared "is this the same concert?" logic.
//
// Used by scrape-events.mjs (to skip events already in the table) and by
// dedupe-events.mjs (to clean up the ones that got in before this existed).
// Keep them on the same predicate: anything the cleanup merges must be
// something the scraper refuses to insert again on the next run.
//
// The event *name* is never trusted on its own — it is LLM-extracted and
// changes between runs: the same Haken show came back as "Haken", as
// "in a fever dream europe 2026" and as "Haken - In A Fever Dream Europe 2026".
// What is stable is when and where: day + city + venue.
// ---------------------------------------------------------------------------

export const norm = (s) =>
  String(s ?? '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Words that carry no identity: articles, and the filler sources pad titles
// with ("Jethro Tull Tour" / "Jethro Tull Concert" / "Jethro Tull" are one gig).
const NOISE = new Set([
  'the', 'a', 'an', 'of', 'and', 'at', 'in', 'de', 'di', 'da', 'la', 'le', 'il', 'el', 'los', 'las',
  'tour', 'concert', 'concerts', 'live', 'show', 'gig', 'performance', 'event', 'tickets', 'presents',
  'feat', 'featuring', 'with', 'plus', 'support', 'uk', 'usa',
]);
const isYear = (t) => /^(19|20)\d{2}$/.test(t);

export function tokens(s) {
  const all = norm(s).split(' ').filter(Boolean);
  const kept = all.filter((t) => t.length > 1 && !NOISE.has(t) && !isYear(t));
  return new Set(kept.length ? kept : all); // never return an empty set for a non-empty string
}

// share of the smaller set contained in the larger one
export const overlap = (a, b) => (!a.size || !b.size ? 0 : [...a].filter((x) => b.has(x)).length / Math.min(a.size, b.size));
export const jaccard = (a, b) => (!a.size || !b.size ? 0 : [...a].filter((x) => b.has(x)).length / new Set([...a, ...b]).size);

export const dayOf = (e) => String(e.data_ora || '').slice(0, 10);
export const cityOf = (e) => norm(String(e['città'] || '').split(',')[0]);
export const bucketOf = (e) => dayOf(e); // only same-day events can be the same gig
const venueTokens = (e) => tokens(e.venue);
const UNKNOWN = new Set(['', 'tba', 'tbd', 'tbc', 'unknown', 'na']);
const isUnknownVenue = (e) => UNKNOWN.has(norm(e.venue));
const isUnknownCity = (e) => UNKNOWN.has(cityOf(e));

// Two events on the same day: same gig? Returns a short reason (truthy) or null.
export function sameEvent(a, b) {
  const nameA = tokens(a.nome_evento);
  const nameB = tokens(b.nome_evento);
  const nameOverlap = overlap(nameA, nameB);
  const nameJaccard = jaccard(nameA, nameB);
  const sameLink = Boolean(a.link) && a.link === b.link;
  // "Unknown" city rows come from listings that never named one — they must
  // still be comparable with the same gig scraped elsewhere with a city.
  const sameCity = cityOf(a) === cityOf(b) || isUnknownCity(a) || isUnknownCity(b);

  if (isUnknownVenue(a) || isUnknownVenue(b)) {
    // No venue to compare — fall back to the headliner ("Opeth" vs "Opeth Tour").
    return sameCity && nameOverlap >= 0.75 ? 'same day/city, venue unknown, same headliner' : null;
  }

  const venueOverlap = overlap(venueTokens(a), venueTokens(b));
  const sameVenue = venueOverlap === 1; // one venue string contains the other ("Center Stage" / "Center Stage Theater")

  // Same venue but the two sources disagree on the town it sits in
  // (Mt Ephraim Gardens is listed under both Faversham and Hernhill).
  if (sameVenue && !sameCity) return nameOverlap >= 0.6 ? 'same venue, city spelled differently' : null;
  if (!sameCity) return null;

  if (sameVenue && (nameOverlap >= 0.6 || nameJaccard >= 0.4)) return 'same venue + overlapping name';
  if (sameVenue && sameLink) return 'same venue + same link';
  if (venueOverlap >= 0.8 && nameOverlap >= 0.8) return 'venue and name overlap';
  if (sameLink && nameOverlap >= 0.6) return 'same link + overlapping name';
  // One title is fully contained in the other on the same day in the same city
  // ("Dingwalls" / "Arena - Dingwalls", where the venue was parsed as the city).
  if (nameOverlap === 1) return 'one title contains the other';
  return null;
}

// Same-day index, so a candidate only ever compares against the handful of
// events happening that day instead of the whole table.
export function indexByBucket(rows) {
  const index = new Map();
  for (const e of rows) {
    const k = bucketOf(e);
    if (!index.has(k)) index.set(k, []);
    index.get(k).push(e);
  }
  return index;
}

export function findDuplicate(candidate, index) {
  for (const existing of index.get(bucketOf(candidate)) || []) {
    if (sameEvent(candidate, existing)) return existing;
  }
  return null;
}
