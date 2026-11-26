// The catalog as hub pages: artists, festivals, cities, countries and genres,
// each with a stable slug, built from the event rows.
//
// Shared by the Netlify edge functions (Deno: SSR and sitemap) and the React
// app, so the server and the browser build the same pages with the same
// rules. Keep it free of DOM, Node and Deno globals; `fetch` is fine.
import { getEventCountry, hasNoCity } from '../utils/geo.ts';
import { splitTitle } from '../utils/eventText.ts';
import { FESTIVALS, type FestivalDef } from '../data/festivals.ts';

export interface CatalogEvent {
  id: string;
  nome_evento: string;
  data_ora: string;
  venue: string;
  città: string;
  sottogenere?: string | null;
  artisti?: string[] | null;
  immagine?: string | null;
  lat?: number | null;
  lng?: number | null;
  updated_at?: string | null;
  /** Where the listing came from (a domain), used to drop a source's self-tagging. */
  fonte?: string | null;
}

export type HubKind = 'artist' | 'festival' | 'city' | 'country' | 'genre';

export interface Hub {
  kind: HubKind;
  slug: string;
  name: string;
  /** Every event of the hub, oldest first. */
  events: CatalogEvent[];
  /** Today and later, soonest first. */
  upcoming: CatalogEvent[];
  /** Before today, most recent first. */
  past: CatalogEvent[];
  /** Latest updated_at among its events (sitemap lastmod). */
  lastmod?: string;
  /** City hubs: the country, and its hub slug. */
  country?: string;
  /** Festival hubs: the curated definition. */
  festival?: FestivalDef;
}

export interface Catalog {
  today: string;
  events: CatalogEvent[];
  artists: Map<string, Hub>;
  festivals: Map<string, Hub>;
  cities: Map<string, Hub>;
  countries: Map<string, Hub>;
  genres: Map<string, Hub>;
}

// ---------- Text helpers ----------

const SPECIAL: Record<string, string> = { ø: 'o', æ: 'ae', œ: 'oe', ß: 'ss', ł: 'l', đ: 'd', þ: 'th', ð: 'd', ı: 'i' };

/** Lowercase ASCII words joined by hyphens: "Emerson, Lake & Palmer" -> "emerson-lake-and-palmer". */
export function slugify(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/[øæœßłđþðı]/g, (c) => SPECIAL[c] || c)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Words only, for comparing names: "Emerson, Lake & Palmer" -> "emerson lake and palmer". */
const norm = (s: string) => slugify(s).replace(/-/g, ' ');

/** Slug for names with no Latin letters (Japanese band names, for one): a short stable hash. */
function hashSlug(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function safeSlug(s: string, prefix: string): string {
  return slugify(s) || `${prefix}-${hashSlug(s)}`;
}

/** "BUILTH WELLS" -> "Builth Wells"; mixed case is left alone. */
function fixCaps(s: string): string {
  if (s !== s.toUpperCase() || !/[A-Z]{4,}/.test(s)) return s;
  return s.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase());
}

export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Day of the show as announced (data_ora is local wall-clock time stored as UTC). */
export function eventDay(e: CatalogEvent): string {
  return (e.data_ora || '').slice(0, 10);
}

// ---------- Artists ----------

const NOT_AN_ARTIST = /^(tba|tbc|tbd|supports?|(very )?special guests?|guests?|various( artists)?|(multiple|many|several) (artists|bands|acts)|(and |plus )?(many )?more( tba| to be announced)?|plus guests|line-?up (tba|to be announced)|headliner|others)$/i;

/** The lineup without placeholders like "TBA" or "Special guests". */
export function cleanArtists(list?: string[] | null): string[] {
  return (list || []).map((a) => (a || '').trim()).filter((a) => a && !NOT_AN_ARTIST.test(a));
}

export function artistSlug(name: string): string {
  return safeSlug(name, 'artist');
}

// "BEAT: Performing the music of King Crimson", "A Tribute to Jethro Tull",
// "The Great Progressive Rock Show": the bands whose music is played are not on stage.
const TRIBUTE = /\b(tribute|music of|rock show)\b/i;

/**
 * On a tribute show, drop the honoured bands: the ones named after "music of"
 * or "tribute to", and, when the name mentions none of the listed artists, the
 * whole list (it is the repertoire, not the lineup).
 */
function tributeFilter(eventName: string, list: string[]): string[] {
  const m = (eventName || '').match(TRIBUTE);
  if (!m || !list.length) return list;
  const name = ` ${norm(eventName)} `;
  const tail = ` ${norm(eventName.slice((m.index || 0) + m[0].length))} `;
  const mentioned = (a: string, text: string) => Boolean(norm(a)) && text.includes(` ${norm(a)} `);
  if (!list.some((a) => mentioned(a, name))) return [];
  return list.filter((a) => !mentioned(a, tail));
}

/** "www.marillion.com" or "https://marillion.com/tour" -> "marillion". */
function sourceSlug(fonte?: string | null): string {
  const host = (fonte || '').trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '');
  return slugify(host.split('.').slice(0, -1).join('.') || host);
}

/**
 * Who plays the show, for the artist pages. A band's own website lists its
 * members' side projects with the band's name attached (marillion.com files
 * Steve Hogarth's solo nights under "Marillion"), so a listed artist whose
 * name is the source's domain does not count, unless it headlines or the
 * event name mentions it. Support acts and festival bills count as listed.
 */
export function billOf(e: Pick<CatalogEvent, 'nome_evento' | 'artisti' | 'fonte'>): string[] {
  const list = tributeFilter(e.nome_evento, cleanArtists(e.artisti));
  const source = sourceSlug(e.fonte);
  if (list.length <= 1 || !source) return list;
  const name = ` ${norm(e.nome_evento)} `;
  return list.filter((a, i) => {
    if (i === 0 || artistSlug(a) !== source) return true;
    return name.includes(` ${norm(a)} `);
  });
}

// ---------- Venues, cities and countries ----------

/** Venue text without the markup some sources leave in it: "Sage\\(https://...)" -> "Sage". */
export function venueName(e: Pick<CatalogEvent, 'venue'>): string {
  return (e.venue || '')
    .replace(/\\?\(\s*https?:\/\/[^)]*\)/g, '')
    .replace(/\\/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Local spellings and duplicates -> one English name (lowercase keys).
const CITY_ALIAS: Record<string, string> = {
  'köln': 'Cologne', koln: 'Cologne', 'münchen': 'Munich', munchen: 'Munich', roma: 'Rome', milano: 'Milan',
  firenze: 'Florence', napoli: 'Naples', torino: 'Turin', genova: 'Genoa', venezia: 'Venice', padova: 'Padua',
  praha: 'Prague', wien: 'Vienna', lisboa: 'Lisbon', bruxelles: 'Brussels', antwerpen: 'Antwerp', gent: 'Ghent',
  'den haag': 'The Hague', 'göteborg': 'Gothenburg', 'københavn': 'Copenhagen', warszawa: 'Warsaw',
  'kraków': 'Krakow', 'montréal': 'Montreal', 'québec': 'Quebec', 'new york city': 'New York', nyc: 'New York',
  'zürich': 'Zurich', 'genève': 'Geneva', sevilla: 'Seville', 'malmo': 'Malmö', 'sao paulo': 'São Paulo',
};

/** The city an event is in, or null for tours, placeholders and bare countries. */
export function cityNameOf(e: Pick<CatalogEvent, 'città'>): string | null {
  if (hasNoCity(e.città)) return null;
  const first = (e.città || '').split(',')[0].trim();
  if (!first) return null;
  return CITY_ALIAS[first.toLowerCase()] || fixCaps(first);
}

/** Country of an event, or null when it can't be told. */
export function countryNameOf(e: Pick<CatalogEvent, 'città'>): string | null {
  const c = getEventCountry(e.città);
  return c && c !== 'Other' ? c : null;
}

/** "Barcelona, Spain": city and country once each, whatever the raw text looked like. */
export function placeLabel(e: Pick<CatalogEvent, 'città'>): string {
  const city = cityNameOf(e);
  const country = countryNameOf(e);
  if (city && country) return `${city}, ${country}`;
  return city || country || (e.città || '').trim();
}

export function citySlugOf(e: Pick<CatalogEvent, 'città'>): string | null {
  const city = cityNameOf(e);
  const country = countryNameOf(e);
  if (!city || !country) return null;
  return `${safeSlug(city, 'city')}-${slugify(country)}`;
}

export function countrySlug(country: string): string {
  return slugify(country);
}

// ---------- Genres ----------

export function genreSlug(genre: string): string {
  return slugify(genre.replace(/\(.*?\)/g, ''));
}

// ---------- Festivals ----------

export function festivalOf(e: Pick<CatalogEvent, 'nome_evento'>): FestivalDef | null {
  const name = e.nome_evento || '';
  for (const f of FESTIVALS) if (f.pattern.test(name)) return f;
  return null;
}

// ---------- Events ----------

/**
 * What the show is, in a few words: the headliner when the name starts with
 * it ("Steve Hackett - Best Of Genesis tour" -> "Steve Hackett"), else the
 * festival, else the name before any " - " subtitle.
 */
export function eventLabel(e: Pick<CatalogEvent, 'nome_evento' | 'artisti'>): string {
  const name = (e.nome_evento || '').replace(/\s*\(event\)\s*$/i, '').trim();
  const lead = cleanArtists(e.artisti)[0];
  if (lead && norm(name).startsWith(norm(lead))) return lead;
  const fest = festivalOf(e);
  if (fest) return fest.name;
  return splitTitle(name).main || name;
}

const UUID_AT_END = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

function clipSlug(slug: string, max: number): string {
  if (slug.length <= max) return slug;
  const cut = slug.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf('-'), 1)).replace(/-+$/, '');
}

/** "steve-hackett-barcelona-2027-11-04": readable part of the event URL. */
export function eventSlug(e: Pick<CatalogEvent, 'nome_evento' | 'artisti' | 'città' | 'data_ora'>): string {
  const label = clipSlug(slugify(eventLabel(e)), 60);
  const city = clipSlug(slugify(cityNameOf(e) || ''), 30);
  return [label, city, eventDay(e as CatalogEvent)].filter(Boolean).join('-');
}

/** "/event/steve-hackett-barcelona-2027-11-04-<uuid>". The id at the end is what the page looks up. */
export function eventPath(e: Pick<CatalogEvent, 'id' | 'nome_evento' | 'artisti' | 'città' | 'data_ora'>): string {
  const slug = eventSlug(e);
  return `/event/${slug ? `${slug}-` : ''}${e.id}`;
}

/** The event id inside an /event/<param> URL, old (bare id) or new (slug + id). */
export function parseEventParam(param: string): string | null {
  const p = decodeURIComponent(param || '').trim();
  const m = p.match(UUID_AT_END);
  if (m) return m[1].toLowerCase();
  return /^[0-9a-fA-F-]{16,40}$/.test(p) ? p : null;
}

// ---------- Hubs ----------

export function hubPath(kind: HubKind, slug: string): string {
  return `/${kind}/${slug}`;
}

/** A hub earns a place in the index (and the sitemap) only with enough upcoming shows. */
const MIN_UPCOMING: Record<HubKind, number> = { artist: 1, festival: 1, city: 2, country: 1, genre: 3 };

export function isIndexable(h: Hub): boolean {
  if (h.kind === 'festival') return h.events.length > 0; // editions recur: past ones still answer "<festival> 2027"
  return h.upcoming.length >= MIN_UPCOMING[h.kind];
}

/** "2026-2027", "2027", or '' with no upcoming shows. */
export function yearRange(events: CatalogEvent[]): string {
  if (!events.length) return '';
  const years = events.map((e) => eventDay(e).slice(0, 4)).filter(Boolean).sort();
  const a = years[0];
  const b = years[years.length - 1];
  return a === b ? a : `${a}-${b}`;
}

/** The most frequent spelling, preferring one that is not all capitals. */
function bestName(counts: Map<string, number>): string {
  let best = '';
  let bestScore = -1;
  for (const [name, n] of counts) {
    const score = n * 2 + (name !== name.toUpperCase() ? 1 : 0);
    if (score > bestScore) { best = name; bestScore = score; }
  }
  return best;
}

interface Acc { names: Map<string, number>; events: CatalogEvent[]; country?: string; festival?: FestivalDef }

function addTo(map: Map<string, Acc>, slug: string, name: string, e: CatalogEvent, extra?: Partial<Acc>) {
  let acc = map.get(slug);
  if (!acc) { acc = { names: new Map(), events: [], ...extra }; map.set(slug, acc); }
  acc.names.set(name, (acc.names.get(name) || 0) + 1);
  if (acc.events[acc.events.length - 1] !== e) acc.events.push(e);
}

function finish(kind: HubKind, map: Map<string, Acc>, today: string): Map<string, Hub> {
  const out = new Map<string, Hub>();
  for (const [slug, acc] of map) {
    const events = acc.events.slice().sort((a, b) => a.data_ora.localeCompare(b.data_ora) || a.id.localeCompare(b.id));
    const upcoming = events.filter((e) => eventDay(e) >= today);
    const past = events.filter((e) => eventDay(e) < today).reverse();
    let lastmod: string | undefined;
    for (const e of events) if (e.updated_at && (!lastmod || e.updated_at > lastmod)) lastmod = e.updated_at;
    out.set(slug, {
      kind, slug, events, upcoming, past, lastmod,
      name: acc.festival ? acc.festival.name : bestName(acc.names),
      country: acc.country,
      festival: acc.festival,
    });
  }
  return out;
}

export function buildCatalog(rows: CatalogEvent[], now: Date = new Date()): Catalog {
  const today = todayUtc(now);
  const events = rows.slice().sort((a, b) => a.data_ora.localeCompare(b.data_ora) || a.id.localeCompare(b.id));
  const artists = new Map<string, Acc>();
  const festivals = new Map<string, Acc>();
  const cities = new Map<string, Acc>();
  const countries = new Map<string, Acc>();
  const genres = new Map<string, Acc>();

  for (const e of events) {
    for (const a of billOf(e)) addTo(artists, artistSlug(a), a, e);
    const fest = festivalOf(e);
    if (fest) addTo(festivals, fest.slug, fest.name, e, { festival: fest });
    const country = countryNameOf(e);
    if (country) addTo(countries, countrySlug(country), country, e);
    const city = cityNameOf(e);
    const citySlug = citySlugOf(e);
    if (city && citySlug && country) addTo(cities, citySlug, city, e, { country });
    const genre = (e.sottogenere || '').trim();
    if (genre && genreSlug(genre)) addTo(genres, genreSlug(genre), genre, e);
  }

  return {
    today,
    events,
    artists: finish('artist', artists, today),
    festivals: finish('festival', festivals, today),
    cities: finish('city', cities, today),
    countries: finish('country', countries, today),
    genres: finish('genre', genres, today),
  };
}

export function hubsOf(c: Catalog, kind: HubKind): Map<string, Hub> {
  switch (kind) {
    case 'artist': return c.artists;
    case 'festival': return c.festivals;
    case 'city': return c.cities;
    case 'country': return c.countries;
    case 'genre': return c.genres;
  }
}

/** Indexable hubs of a kind, most upcoming shows first. */
export function topHubs(c: Catalog, kind: HubKind, limit = Infinity): Hub[] {
  return [...hubsOf(c, kind).values()]
    .filter(isIndexable)
    .sort((a, b) => b.upcoming.length - a.upcoming.length || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/** Hubs an event links to: its artists, festival, city, country and genre. */
export function hubsForEvent(c: Catalog, e: CatalogEvent): { artists: Hub[]; festival?: Hub; city?: Hub; country?: Hub; genre?: Hub } {
  const pick = (m: Map<string, Hub>, slug: string | null) => (slug ? m.get(slug) : undefined);
  const country = countryNameOf(e);
  const genre = (e.sottogenere || '').trim();
  const fest = festivalOf(e);
  return {
    artists: billOf(e).map((a) => c.artists.get(artistSlug(a))).filter((h): h is Hub => Boolean(h)),
    festival: fest ? c.festivals.get(fest.slug) : undefined,
    city: pick(c.cities, citySlugOf(e)),
    country: pick(c.countries, country ? countrySlug(country) : null),
    genre: pick(c.genres, genre ? genreSlug(genre) : null),
  };
}

/** Distinct values of a field across events, most frequent first ("London, Manchester, Glasgow"). */
export function topValues(events: CatalogEvent[], pick: (e: CatalogEvent) => string | null, limit = 4): string[] {
  const m = new Map<string, number>();
  for (const e of events) { const v = pick(e); if (v) m.set(v, (m.get(v) || 0) + 1); }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([v]) => v);
}

// ---------- Loading ----------

export const CATALOG_COLUMNS = 'id,nome_evento,data_ora,venue,città,sottogenere,artisti,immagine,lat,lng,updated_at,fonte';

/**
 * Every public event, paged past PostgREST's 1000-row cap. Anonymous read:
 * the anon key already ships in the client bundle.
 */
export async function fetchCatalogRows(supabaseUrl: string, anonKey: string, columns: string = CATALOG_COLUMNS): Promise<CatalogEvent[]> {
  const PAGE = 1000;
  const MAX = 50000;
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
  const pageUrl = (offset: number) => `${supabaseUrl}/rest/v1/eventi_prog?select=${encodeURIComponent(columns)}`
    + `&or=(status.eq.approved,status.is.null)&order=data_ora.asc,id.asc&limit=${PAGE}&offset=${offset}`;
  const getPage = async (offset: number, extra: Record<string, string> = {}) => {
    const r = await fetch(pageUrl(offset), { headers: { ...headers, ...extra } });
    if (!r.ok) throw new Error(`catalog fetch failed: ${r.status}`);
    return r;
  };

  // The first page also returns the total (Content-Range: 0-999/2690), so the
  // other pages can be fetched in parallel instead of one after the other.
  const first = await getPage(0, { Prefer: 'count=exact' });
  const rows = (await first.json()) as CatalogEvent[];
  const total = Number((first.headers.get('content-range') || '').split('/')[1]);
  if (Number.isFinite(total)) {
    const offsets: number[] = [];
    for (let o = PAGE; o < Math.min(total, MAX); o += PAGE) offsets.push(o);
    const pages = await Promise.all(offsets.map(async (o) => (await (await getPage(o)).json()) as CatalogEvent[]));
    for (const p of pages) rows.push(...p);
    return rows;
  }
  // No total in the response: page through until a short page.
  for (let offset = PAGE; rows.length === offset && offset < MAX; offset += PAGE) {
    rows.push(...((await (await getPage(offset)).json()) as CatalogEvent[]));
  }
  return rows;
}
