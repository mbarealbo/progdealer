#!/usr/bin/env node
// ---------------------------------------------------------------------------
// ProgDealer — automated event refresh (Firecrawl → normalize → Supabase)
//
// Scrapes a curated list of progressive-music listing/festival/artist pages via
// the Firecrawl scrape API (schema-driven LLM extraction), normalizes the result
// to the `eventi_prog` shape and upserts it into Supabase (duplicates are
// recognised by day + city + venue — see lib/dedupe.mjs).
//
// Run:  node scripts/scrape-events.mjs [--dry-run] [--limit=N] [--only=name] [--status=pending|approved]
//
// --only=name scrapes just the sources whose name contains `name` (case
// insensitive, no web discovery): a cheap way to test one source.
//
// Env (required for a real run):
//   FIRECRAWL_API_KEY            Firecrawl API key (fc-...)
//   SUPABASE_URL                 Supabase project URL (falls back to VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY    Service-role key (bypasses RLS — server side only!)
// Optional:
//   SCRAPED_STATUS               'pending' (default, → moderation) | 'approved'
//
// --dry-run writes the normalized events to .firecrawl/last-run.json and never
// touches the database, so it is safe to run with only FIRECRAWL_API_KEY set.
// ---------------------------------------------------------------------------

import { writeFile, mkdir } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { geocode, hasNoCity } from './lib/geocode.mjs';
import { bucketOf, findDuplicate, indexByBucket } from './lib/dedupe.mjs';
import { parseGigpress } from './lib/gigpress.mjs';
import { parseTourTable } from './lib/tourtable.mjs';
import { parseConcertful } from './lib/concertful.mjs';
import { fetchSeated } from './lib/seated.mjs';
import { notOnPage, pageText } from './lib/onpage.mjs';

// Load .env for local runs (plain `node` doesn't read it like Vite does).
// Real environment variables / CI secrets always take precedence.
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || m[1].startsWith('#') || process.env[m[1]] !== undefined) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[m[1]] = val;
  }
}

// --- Sources -----------------------------------------------------------------
// Edit freely. Aggregator/listing pages refresh over time (best for a cron);
// festival & artist pages capture a single line-up. Dead/404 URLs are skipped
// gracefully, so a stale entry never breaks the run.
const SOURCES = [
  // The richest single source: TPA's UK gig guide lists the whole UK prog
  // long tail (~120 artists) and updates itself. The page is too big for the
  // LLM extractor (it returns zero events), so it gets a deterministic
  // GigPress parser over the markdown render — 1 credit instead of 5.
  { name: 'TPA — UK Gig Guide', url: 'https://theprogressiveaspect.net/uk-gig-guide-new/', parse: 'gigpress' },
  // Concertful artist pages: every upcoming date of one artist on one page,
  // read by a parser (lib/concertful.mjs, 1 credit). For prog acts whose own
  // site has no readable list (TesseracT, Soen, Periphery) or lists fewer
  // dates than Concertful does (Haken, The Pineapple Thief). Concertful's area
  // pages are gone: page one is today only and gave about 4 prog events each.
  ...[
    'tesseract', 'soen', 'haken', 'periphery', 'ne-obliviscaris', 'thank-you-scientist',
    'protest-the-hero', 'coheed-and-cambria', 'the-pineapple-thief', 'slift', 'sungazer', 'adrian-belew',
  ].map((slug) => ({ name: `Concertful: ${slug}`, url: `https://concertful.com/tour/${slug}/`, parse: 'concertful' })),
  { name: 'Progressive Rock Central',     url: 'https://progressiverockcentral.com/' },
  { name: 'Music Festival Wizard',        url: 'https://www.musicfestivalwizard.com/festivals/' },
  // Continental-Europe agendas (the TPA guide above is UK-only)
  { name: 'iO Pages — Concertagenda (NL/BE)', url: 'https://www.iopages.nl/agenda' },
  { name: 'Eclipsed — Konzerte (DE)',         url: 'https://www.eclipsed.de/de/konzerte' },
  // Europe festivals
  { name: 'Festival Crescendo',           url: 'https://www.festival-crescendo.com/' },
  { name: 'ProgPower Europe',             url: 'https://www.progpowereurope.com/' },
  { name: 'Midsummer Prog',               url: 'https://midsummerprog.com/' },
  // North America festivals
  { name: 'ProgPower USA',                url: 'https://www.progpowerusa.com/' },
  { name: 'ProgStock (US)',               url: 'https://www.progstock.com/' },
  { name: 'Cruise to the Edge',           url: 'https://cruisetotheedge.com/' },
  // Artist tour pages — major worldwide prog acts (official sites, agent-verified)
  // A long plain table (92 dates): the LLM extractor stops partway, the table
  // parser reads it all (lib/tourtable.mjs). `name` is the headliner.
  { name: 'Rush', url: 'https://www.rush.com/tour/fifty-something/', parse: 'table' },
  { name: 'Yes', url: 'https://yesworld.com/live/' },
  { name: 'Jethro Tull', url: 'https://jethrotull.com/tour-dates/' },
  { name: 'Steve Hackett', url: 'https://www.hackettsongs.com/tour.html' },
  { name: 'Gentle Giant', url: 'https://gentlegiantband.com/' },
  { name: 'Camel', url: 'https://camelproductions.com/tourhtml/tourdates.html' },
  { name: 'Gong', url: 'https://www.gongband.com/shows/' },
  { name: 'Caravan', url: 'https://officialcaravan.co.uk/gigs/' },
  { name: 'PFM', url: 'https://www.pfmworld.com/pfm/?page_id=61' },
  { name: 'Banco del Mutuo Soccorso', url: 'https://www.bancodelmutuosoccorso.it/date/' },
  { name: 'Le Orme', url: 'https://www.leormeofficial.com/concerti' },
  { name: 'Magma', url: 'https://www.magmamusic.org/en/tour/' },
  { name: 'Focus', url: 'https://focustheband.co.uk/live-dates' },
  { name: 'Kansas', url: 'https://www.kansasband.com/tour-dates/' },
  { name: 'Marillion', url: 'https://www.marillion.com/tour/' },
  { name: 'IQ', url: 'https://www.iq-hq.co.uk/index.php/iq-live' },
  { name: 'Pendragon', url: 'https://www.pendragon.mu/tour-dates-2026/' },
  { name: 'Arena', url: 'https://www.arenaband.co.uk/' },
  { name: 'Pallas', url: 'https://www.pallasofficial.com/' },
  { name: 'Steven Wilson', url: 'https://stevenwilsonhq.com/tour-dates/' },
  // Seated widgets: their JSON feed is read directly (lib/seated.mjs), free and
  // without the LLM. `seated` is the widget's data-artist-id.
  { name: 'Porcupine Tree', url: 'https://porcupinetree.com/tour-dates/', seated: 'c27258fa-5bef-44bb-9cdb-41c02a25120e' },
  { name: 'Dream Theater', url: 'https://dreamtheater.net/tour/', seated: '0be43148-933a-4b3c-a8e8-b17aa922bd00' },
  { name: 'Gazpacho', url: 'https://gazpachoworld.com/tour-dates/', seated: '1174bdde-24ab-4982-a248-8c9915018327' },
  { name: 'Ozric Tentacles', url: 'https://ozrics.com/live-shows/', seated: 'cf3d5355-945a-47ec-bcfe-388b826b0df8' },
  { name: 'The Pineapple Thief', url: 'https://www.pineapplethief.com/tour/' },
  { name: 'Big Big Train', url: 'https://www.bigbigtrain.com/live/' },
  { name: 'Anathema', url: 'https://www.anathemamusic.com/tour-dates/' },
  { name: 'Riverside', url: 'https://riversideband.pl/en/gigs' },
  { name: 'Leprous', url: 'https://leprous.net/tours/' },
  { name: 'Opeth', url: 'https://www.opeth.com/tour-dates' },
  { name: 'Haken', url: 'https://hakenmusic.com/tour/' },
  { name: 'Devin Townsend', url: 'https://hevydevy.com/tour-dates/' },
  { name: 'Between the Buried and Me', url: 'https://www.betweentheburiedandme.com/tour-dates/' },
  { name: "Caligula's Horse", url: 'https://www.caligulashorse.com/' },
  { name: 'Plini', url: 'https://www.plini.co/pages/tour-dates' },
  { name: 'Animals as Leaders', url: 'https://animalsasleaders.org/pages/tour' },
  { name: 'Polyphia', url: 'https://polyphia.com/pages/tour' },
  { name: 'The Dear Hunter', url: 'https://thedearhunter.com/tour/' },
  { name: "Spock's Beard", url: 'https://www.spocksbeard.com/tour/' },
  { name: 'Transatlantic', url: 'https://www.transatlanticweb.com/' },
  { name: 'Neal Morse', url: 'https://nealmorse.com/tour-dates/' },
  { name: 'Ayreon', url: 'https://www.arjenlucassen.com/live/' },
  { name: 'Fish', url: 'https://fishmusic.scot/' },
  { name: 'Mostly Autumn', url: 'https://www.mostly-autumn.com/tour-dates' },
  { name: 'Frost*', url: 'https://frost.life/frost-live' },
  { name: 'Motorpsycho', url: 'https://motorpsycho.no/gigs/' },
  { name: 'BEAT (Belew, Vai, Levin)', url: 'https://www.beat-tour.com/' },
  { name: "Claudio Simonetti's Goblin", url: 'https://www.goblinsimonetti.com/tour-dates' },
  { name: 'Karnivool', url: 'https://www.karnivool.com/' },
  { name: 'Tangerine Dream', url: 'https://www.tangerinedreammusic.com/en/concerts/index.asp' },
  { name: 'Airbag', url: 'https://www.airbagsound.com/' },
  { name: 'Sons of Apollo', url: 'https://sonsofapollo.com/' },
  { name: 'Nightwish', url: 'https://www.nightwish.com/tour/upcoming' },
  { name: 'Rosalie Cunningham', url: 'https://rosaliecunningham.com/tour-dates-2/' },
  { name: 'Anneke van Giersbergen', url: 'https://www.annekevangiersbergen.com/' },
  // Removed in November 2026, both gave only invented shows: The Flower Kings
  // (roinestolt.com/roinestolt-tour is the 2019 tour, with no years) and
  // Wobbler (the homepage lists no dates). See lib/onpage.mjs.
];

// --- CLI / env ---------------------------------------------------------------
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = Number((args.find(a => a.startsWith('--limit=')) || '').split('=')[1]) || 0;
const ONLY = ((args.find(a => a.startsWith('--only=')) || '').split('=')[1] || '').toLowerCase();
const STATUS =
  (args.find(a => a.startsWith('--status=')) || '').split('=')[1] ||
  process.env.SCRAPED_STATUS ||
  'approved'; // scraped events come from curated sources → auto-approve (dedup guards dupes)

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!FIRECRAWL_API_KEY) fail('Missing FIRECRAWL_API_KEY');
if (!['pending', 'approved'].includes(STATUS)) fail(`Invalid --status "${STATUS}" (use pending|approved)`);
if (!DRY_RUN && (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)) {
  fail('A real run needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or pass --dry-run)');
}

function fail(msg) { console.error(`✖ ${msg}`); process.exit(1); }

// --- Firecrawl extraction ----------------------------------------------------
const EXTRACT_SCHEMA = {
  type: 'object',
  properties: {
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name:        { type: 'string', description: 'Event name or headliner + tour' },
          startDate:   { type: 'string', description: 'Strict ISO date YYYY-MM-DD' },
          time:        { type: 'string', description: '24h HH:MM if known, else empty' },
          venue:       { type: 'string' },
          city:        { type: 'string' },
          country:     { type: 'string', description: 'Country in full English (Italy, not ITA or IT)' },
          artists:     { type: 'array', items: { type: 'string' } },
          url:         { type: 'string', description: 'Event/ticket page URL if present' },
          description: { type: 'string', description: 'Short line-up / notes' },
        },
        required: ['name', 'startDate'],
      },
    },
  },
  required: ['events'],
};

const EXTRACT_PROMPT =
  'Extract UPCOMING progressive-music concerts and festivals only: progressive rock, ' +
  'prog metal, art rock, symphonic prog, neo-prog, krautrock, canterbury scene, zeuhl, ' +
  'psychedelic/space rock, post-rock, avant-prog, fusion. Include events by artists such as ' +
  'King Crimson, Yes, Genesis, Marillion, Steve Hackett, Jethro Tull, Porcupine Tree, Opeth, ' +
  'Haken, Dream Theater, Gong, Magma, PFM, Banco, Ånglagård, Leprous, TesseracT, Riverside, ' +
  'Steven Wilson, Gentle Giant, Camel, Van der Graaf Generator. EXCLUDE mainstream pop, ' +
  'hip-hop, EDM, country and any non-progressive act. ' +
  // Without today's date the model guesses what "upcoming" means and which
  // year a bare "12 March" belongs to.
  `Today is ${new Date().toISOString().slice(0, 10)}: only events dated today or later. ` +
  'Take the year from the date itself or from the section heading above it. When the page ' +
  'gives no year for a date, leave that date out: old tour pages often have none. ' +
  'Only events written on this page: never add shows from your own knowledge, and return ' +
  'an empty list when the page lists no dates. ' +
  'List every upcoming date on the page, one event per show, even when a tour has many. ' +
  'Return startDate in strict ISO format YYYY-MM-DD and time as 24h HH:MM when known.';

async function firecrawlExtract(url) {
  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      // The markdown comes with the JSON at no extra cost: it is what the
      // events are checked against (lib/onpage.mjs).
      formats: ['json', 'markdown'],
      onlyMainContent: true,
      jsonOptions: { prompt: EXTRACT_PROMPT, schema: EXTRACT_SCHEMA },
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.success) {
    const detail = body?.error || `HTTP ${res.status}`;
    throw new Error(detail);
  }
  const status = body?.data?.metadata?.statusCode;
  if (status && status >= 400) throw new Error(`source returned HTTP ${status}`);
  const text = pageText(body?.data?.markdown);
  // An event the page does not back is kept with the reason, so normalize()
  // skips it and the run log counts it.
  return (body?.data?.json?.events || []).map((e) => {
    const why = notOnPage(e, text);
    return why ? { ...e, _notOnPage: why } : e;
  });
}

// Markdown-only scrape (1 credit) for sources with a deterministic parser.
async function firecrawlMarkdown(url) {
  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.success) throw new Error(body?.error || `HTTP ${res.status}`);
  const status = body?.data?.metadata?.statusCode;
  if (status && status >= 400) throw new Error(`source returned HTTP ${status}`);
  return body?.data?.markdown || '';
}

// --- Web discovery -----------------------------------------------------------
// Beyond the fixed SOURCES, find prog event pages across the whole web via
// Firecrawl search — so coverage isn't limited to a hand-picked list.
const YEAR = new Date().getFullYear();
const SEARCH_QUERIES = [
  `progressive rock tour dates ${YEAR}`,
  `progressive rock concert tour ${YEAR} tickets`,
  `prog metal festival ${YEAR} lineup USA Europe`,
  `progressive rock gigs ${YEAR} South America Australia Japan`,
  `neo-prog symphonic prog live ${YEAR}`,
  `psychedelic rock space rock tour ${YEAR}`,
  `art rock avant-prog fusion concert ${YEAR}`,
  `progressive rock festival ${YEAR + 1} lineup`,
  // Non-English queries — English-only search skews coverage to UK/US
  `concerti rock progressivo ${YEAR} italia`,
  `prog konzerte ${YEAR} deutschland tour`,
  `concert rock progressif ${YEAR} france`,
  `prog concerten ${YEAR} nederland belgië`,
  `conciertos rock progresivo ${YEAR} españa gira`,
];
// Skip social, aggregators-of-setlists and databases (the latter hallucinate dates).
const JUNK_HOST = /facebook|instagram|twitter|x\.com|youtube|youtu\.be|spotify|wikipedia|reddit|tiktok|pinterest|last\.fm|discogs|apple\.com|amazon|progarchives|rateyourmusic|allmusic|genius\.com|setlist\.fm|bandcamp|\.pdf($|\?)/i;
const MAX_DISCOVERED = 24;

async function firecrawlSearch(query, limit = 6) {
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.success) return [];
    return (body.data || []).map((r) => r.url).filter(Boolean);
  } catch { return []; }
}

async function discoverSources(knownHosts) {
  const found = new Map(); // host -> url: one page per host, and never a host we already scrape
  for (const q of SEARCH_QUERIES) {
    for (const url of await firecrawlSearch(q)) {
      const clean = url.split('#')[0];
      const host = hostOf(clean);
      if (JUNK_HOST.test(clean) || knownHosts.has(host) || found.has(host)) continue;
      found.set(host, clean);
    }
  }
  return [...found.values()].slice(0, MAX_DISCOVERED).map((url) => ({ name: `web:${hostOf(url)}`, url }));
}

// --- Normalization -----------------------------------------------------------
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^(\d{1,2}):(\d{2})$/;
// Placeholder tokens the extractor emits when a field is unknown.
const PLACEHOLDER = /^(tba|tbd|tbc|n\/?a|na|unknown|to be (announced|confirmed|determined))$/i;
// A whole tour in one row: "Multiple Locations", "Various Venues UK".
const VAGUE_VENUE = /\b(multiple|various|several)\b/i;
const startOfToday = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00');

const clean = (s) => {
  const v = String(s || '').trim();
  return !v || PLACEHOLDER.test(v) ? '' : v;
};

function normalize(raw, source) {
  const name = (raw.name || '').trim();
  if (!name) return { skip: 'no name' };
  if (raw._notOnPage) return { skip: raw._notOnPage };

  let date = (raw.startDate || '').trim();
  if (!ISO_DATE.test(date)) {
    const parsed = new Date(date);
    if (isNaN(parsed)) return { skip: `bad date "${raw.startDate}"` };
    date = parsed.toISOString().slice(0, 10);
  }

  // Reject calendar-impossible dates ("2027-02-29"): JS silently rolls them
  // over to the next day, but Postgres rejects them at insert time.
  {
    const [y, mo, d] = date.split('-').map(Number);
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
      return { skip: `bad date "${raw.startDate}"` };
    }
  }

  let time = (raw.time || '').trim();
  const m = time.match(HHMM);
  time = m ? `${m[1].padStart(2, '0')}:${m[2]}` : '20:00';

  const data_ora = `${date}T${time}:00`;
  const when = new Date(data_ora);
  if (isNaN(when)) return { skip: `unparseable ${data_ora}` };
  if (when < startOfToday) return { skip: 'past event' };
  if (when.getFullYear() > startOfToday.getFullYear() + 3) return { skip: 'too far in future' };

  const city = clean(raw.city);
  const country = clean(raw.country);
  const venueClean = clean(raw.venue);
  // Quality gate: drop location-less entries (usually vague announcements with a
  // placeholder first-of-month date) — keep anything with at least a city or venue.
  if (!city && !venueClean) return { skip: 'no location' };
  const città = [city, country].filter(Boolean).join(', ') || 'Unknown';
  const venue = venueClean || 'TBA';
  // A tour summary, not a show: a vague venue and no single city ("Various,
  // USA", "UK, UK"). It gets no pin and its date is just the tour's first night.
  if (VAGUE_VENUE.test(venue) && hasNoCity(città)) return { skip: 'tour summary' };
  const artisti = Array.isArray(raw.artists)
    ? raw.artists.map(a => String(a).trim()).filter(Boolean)
    : [];
  const descrizione = (raw.description || '').trim() || null;
  const link = (raw.url || '').trim() || source.url;

  return {
    event: {
      nome_evento: name,
      data_ora,
      venue,
      città,
      sottogenere: classifySubgenre(name, descrizione, artisti),
      descrizione,
      artisti: artisti.length ? artisti : null,
      link,
      immagine: null,
      fonte: hostOf(source.url),
      tipo_inserimento: 'scraped',
    },
  };
}

function hostOf(u) {
  try { return new URL(u).host.replace(/^www\./, ''); } catch { return 'unknown'; }
}

// Ported verbatim from src/lib/supabase.ts so classification stays consistent.
function classifySubgenre(eventName, description, artists) {
  const text = [eventName, description, ...(artists || [])].join(' ').toLowerCase();
  const keywords = {
    'Prog Metal': ['metal', 'dream theater', 'tool', 'opeth', 'mastodon', 'gojira'],
    'Krautrock': ['neu!', 'kraftwerk', 'can', 'motorik', 'kraut', 'german'],
    'Canterbury Scene': ['soft machine', 'caravan', 'gong', 'canterbury'],
    'Zeuhl': ['magma', 'univers zero', 'zeuhl', 'kobaïan'],
    'Italian Prog': ['pfm', 'banco', 'area', 'italian'],
    'Neo-Prog': ['marillion', 'pendragon', 'iq', 'neo'],
    'Symphonic Prog': ['yes', 'genesis', 'king crimson', 'emerson', 'symphonic', 'orchestra'],
    'Space Rock': ['hawkwind', 'pink floyd', 'space', 'cosmic'],
    'Post-Rock': ['godspeed', 'explosions', 'mogwai', 'post-rock', 'instrumental'],
    'Math Rock': ['math', 'don caballero', 'battles', 'complex'],
    'Psychedelic Prog': ['psychedelic', 'psych', 'acid', 'tame impala'],
    'Progressive Electronic': ['electronic', 'synth', 'ambient', 'tangerine dream'],
    'Fusion': ['fusion', 'jazz', 'mahavishnu', 'weather report'],
    'Avant-Prog': ['avant', 'experimental', 'henry cow', 'art rock'],
    'RIO (Rock in Opposition)': ['rio', 'henry cow', 'art bears', 'opposition'],
  };
  // Match keywords as whole words/phrases (word boundaries) to avoid false
  // substring hits — e.g. "german" inside "Germany" or "can" inside "American".
  const matchesWord = (k) => {
    const esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(^|[^a-z0-9])' + esc + '([^a-z0-9]|$)').test(text);
  };
  for (const [subgenre, list] of Object.entries(keywords)) {
    if (list.some(matchesWord)) return subgenre;
  }
  return 'Progressive Rock';
}

// --- Supabase upsert (service role) ------------------------------------------
// PostgREST caps every response at max-rows (1000 by default), so the existing
// events must be read page by page — a single .limit(10000) silently returned
// only the first 1000 rows, and everything past it was re-inserted on each run.
async function loadExisting(sb) {
  const PAGE = 1000;
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from('eventi_prog')
      .select('nome_evento, data_ora, venue, città, link')
      .order('data_ora', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

async function upsertAll(events) {
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Every existing event (any source, any status) — auto-approved scrapes must
  // never create a visible duplicate.
  let index;
  try {
    const existing = await loadExisting(sb);
    console.log(`  ${existing.length} events already in the database.`);
    index = indexByBucket(existing);
  } catch (err) {
    console.error('  ✖ could not load existing events:', err.message || err);
    return { inserted: 0, skipped: 0, errors: 1 };
  }

  let inserted = 0, skipped = 0, errors = 0;
  for (const ev of events) {
    if (findDuplicate(ev, index)) { skipped++; continue; } // already have this concert
    try {
      const { error } = await sb.from('eventi_prog').insert({ ...ev, status: STATUS });
      if (error) throw error;
      const bucket = bucketOf(ev);
      if (!index.has(bucket)) index.set(bucket, []);
      index.get(bucket).push(ev); // guard the rest of this run too
      inserted++;
    } catch (err) {
      // The DB's unique index caught a duplicate our fuzzy pass missed — the
      // concert is already in the table, so this is a skip, not a failure.
      if (err?.code === '23505' || /duplicate key/i.test(err?.message || '')) {
        skipped++;
        const bucket = bucketOf(ev);
        if (!index.has(bucket)) index.set(bucket, []);
        index.get(bucket).push(ev);
        continue;
      }
      errors++;
      console.error(`  ✖ insert "${ev.nome_evento}": ${err.message || err}`);
    }
  }
  return { inserted, skipped, errors };
}

// --- Main --------------------------------------------------------------------
// Raw events of one source: a parser where the page is regular, else the LLM.
async function readSource(source) {
  if (source.seated) return fetchSeated(source.seated, source.name);
  if (source.parse === 'gigpress') return parseGigpress(await firecrawlMarkdown(source.url), source.url);
  if (source.parse === 'table') return parseTourTable(await firecrawlMarkdown(source.url), source.url, source.name);
  if (source.parse === 'concertful') return parseConcertful(await firecrawlMarkdown(source.url), source.url);
  return firecrawlExtract(source.url);
}

async function main() {
  let sources = [...SOURCES];
  // Discover more prog event pages across the web (skip with --no-search, --limit or --only).
  if (!args.includes('--no-search') && !LIMIT && !ONLY) {
    process.stdout.write('🔎 web discovery (Firecrawl search)… ');
    const discovered = await discoverSources(new Set(SOURCES.map((s) => hostOf(s.url))));
    console.log(`+${discovered.length} sources`);
    sources = [...SOURCES, ...discovered];
  }
  if (LIMIT > 0) sources = sources.slice(0, LIMIT);
  if (ONLY) sources = sources.filter((s) => s.name.toLowerCase().includes(ONLY));

  console.log(
    `▶ ProgDealer event refresh — ${sources.length} sources · ` +
    `${DRY_RUN ? 'DRY RUN' : `writing (status=${STATUS})`}\n`,
  );

  const collected = [];
  const skipStats = {};
  for (const source of sources) {
    process.stdout.write(`• ${source.name} … `);
    try {
      const raw = await readSource(source);
      let kept = 0;
      for (const r of raw) {
        const { event, skip } = normalize(r, source);
        if (skip) { skipStats[skip.split('"')[0].trim()] = (skipStats[skip.split('"')[0].trim()] || 0) + 1; continue; }
        collected.push(event);
        kept++;
      }
      console.log(`${raw.length} found, ${kept} kept`);
    } catch (err) {
      console.log(`skipped (${err.message || err})`);
    }
  }

  // De-dup within this run with the same rule the DB pass uses — an exact
  // name+date+venue match would let two spellings of one gig through.
  const index = indexByBucket([]);
  const events = [];
  for (const e of collected) {
    if (findDuplicate(e, index)) continue;
    const bucket = bucketOf(e);
    if (!index.has(bucket)) index.set(bucket, []);
    index.get(bucket).push(e);
    events.push(e);
  }

  console.log(`\n${events.length} unique upcoming prog events after normalization.`);
  if (Object.keys(skipStats).length) {
    console.log('Skipped:', Object.entries(skipStats).map(([k, v]) => `${k}×${v}`).join(', '));
  }

  // Attach city-level coordinates (venue-level precision comes from the Places
  // picker on manual submissions). Cached per città to avoid duplicate lookups.
  const geoCache = new Map();
  let geoOk = 0;
  for (const ev of events) {
    if (!geoCache.has(ev.città)) geoCache.set(ev.città, await geocode(ev.città).catch(() => null));
    const c = geoCache.get(ev.città);
    ev.lat = c ? c.lat : null;
    ev.lng = c ? c.lng : null;
    if (c) geoOk++;
  }
  console.log(`Geocoded ${geoOk}/${events.length} events (city-level).`);

  if (DRY_RUN) {
    const out = '.firecrawl/last-run.json';
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, JSON.stringify(events, null, 2));
    console.log(`\n✓ Dry run — wrote ${events.length} events to ${out} (no DB write).`);
    return;
  }

  if (!events.length) { console.log('\nNothing to write.'); return; }
  const { inserted, skipped, errors } = await upsertAll(events);
  console.log(`\n✓ Done — inserted ${inserted}, skipped ${skipped} (duplicates), errors ${errors} (new rows status=${STATUS}).`);
  if (errors) process.exitCode = 1;
}

main().catch(err => { console.error('\n✖ Fatal:', err); process.exit(1); });
