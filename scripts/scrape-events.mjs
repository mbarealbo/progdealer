#!/usr/bin/env node
// ---------------------------------------------------------------------------
// ProgDealer — automated event refresh (Firecrawl → normalize → Supabase)
//
// Scrapes a curated list of progressive-music listing/festival/artist pages via
// the Firecrawl scrape API (schema-driven LLM extraction), normalizes the result
// to the `eventi_prog` shape and upserts it into Supabase (dedup on
// nome_evento + data_ora + venue — same key as the app's upsert_evento RPC).
//
// Run:  node scripts/scrape-events.mjs [--dry-run] [--limit=N] [--status=pending|approved]
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
  { name: 'Concertful — Europe',          url: 'https://concertful.com/area/europe/' },
  { name: 'Concertful — North America',   url: 'https://concertful.com/area/united-states/' },
  { name: 'The Progressive Aspect',       url: 'https://www.theprogressiveaspect.net/' },
  { name: 'Progressive Rock Central',     url: 'https://progressiverockcentral.com/' },
  { name: 'Music Festival Wizard',        url: 'https://www.musicfestivalwizard.com/festivals/' },
  { name: 'Festival Crescendo',           url: 'https://www.festival-crescendo.com/' },
  { name: 'ProgPower Europe',             url: 'https://www.progpowereurope.com/' },
  { name: 'Midsummer Prog',               url: 'https://midsummerprog.com/' },
  { name: 'Steve Hackett — official',     url: 'https://www.hackettsongs.com/' },
  { name: 'Marillion — tour',             url: 'https://www.marillion.com/tour/' },
];

// --- CLI / env ---------------------------------------------------------------
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = Number((args.find(a => a.startsWith('--limit=')) || '').split('=')[1]) || 0;
const STATUS =
  (args.find(a => a.startsWith('--status=')) || '').split('=')[1] ||
  process.env.SCRAPED_STATUS ||
  'pending';

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
          country:     { type: 'string' },
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
  'hip-hop, EDM, country and any non-progressive act. Only events dated today or later. ' +
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
      formats: ['json'],
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
  return body?.data?.json?.events || [];
}

// --- Normalization -----------------------------------------------------------
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^(\d{1,2}):(\d{2})$/;
// Placeholder tokens the extractor emits when a field is unknown.
const PLACEHOLDER = /^(tba|tbd|tbc|n\/?a|na|unknown|to be (announced|confirmed|determined))$/i;
const startOfToday = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00');

const clean = (s) => {
  const v = String(s || '').trim();
  return !v || PLACEHOLDER.test(v) ? '' : v;
};

function normalize(raw, source) {
  const name = (raw.name || '').trim();
  if (!name) return { skip: 'no name' };

  let date = (raw.startDate || '').trim();
  if (!ISO_DATE.test(date)) {
    const parsed = new Date(date);
    if (isNaN(parsed)) return { skip: `bad date "${raw.startDate}"` };
    date = parsed.toISOString().slice(0, 10);
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
      url: link,
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
  for (const [subgenre, list] of Object.entries(keywords)) {
    if (list.some(k => text.includes(k))) return subgenre;
  }
  return 'Progressive';
}

// --- Supabase upsert (service role; same dedup key as upsert_evento) ---------
async function upsertAll(events) {
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let inserted = 0, updated = 0, errors = 0;
  for (const ev of events) {
    try {
      const { data: existing, error: selErr } = await sb
        .from('eventi_prog')
        .select('id')
        .eq('nome_evento', ev.nome_evento)
        .eq('data_ora', ev.data_ora)
        .eq('venue', ev.venue)
        .maybeSingle();
      if (selErr) throw selErr;

      if (existing) {
        // Refresh details but never override the moderation status of an existing row.
        const { error } = await sb
          .from('eventi_prog')
          .update({ ...ev, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
        updated++;
      } else {
        const { error } = await sb.from('eventi_prog').insert({ ...ev, status: STATUS });
        if (error) throw error;
        inserted++;
      }
    } catch (err) {
      errors++;
      console.error(`  ✖ upsert "${ev.nome_evento}": ${err.message || err}`);
    }
  }
  return { inserted, updated, errors };
}

// --- Main --------------------------------------------------------------------
async function main() {
  const sources = LIMIT > 0 ? SOURCES.slice(0, LIMIT) : SOURCES;
  console.log(
    `▶ ProgDealer event refresh — ${sources.length} sources · ` +
    `${DRY_RUN ? 'DRY RUN' : `writing (status=${STATUS})`}\n`,
  );

  const collected = [];
  const skipStats = {};
  for (const source of sources) {
    process.stdout.write(`• ${source.name} … `);
    try {
      const raw = await firecrawlExtract(source.url);
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

  // De-dup within this run on the same key the DB uses.
  const seen = new Set();
  const events = [];
  for (const e of collected) {
    const key = `${e.nome_evento}||${e.data_ora}||${e.venue}`;
    if (seen.has(key)) continue;
    seen.add(key);
    events.push(e);
  }

  console.log(`\n${events.length} unique upcoming prog events after normalization.`);
  if (Object.keys(skipStats).length) {
    console.log('Skipped:', Object.entries(skipStats).map(([k, v]) => `${k}×${v}`).join(', '));
  }

  if (DRY_RUN) {
    const out = '.firecrawl/last-run.json';
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, JSON.stringify(events, null, 2));
    console.log(`\n✓ Dry run — wrote ${events.length} events to ${out} (no DB write).`);
    return;
  }

  if (!events.length) { console.log('\nNothing to write.'); return; }
  const { inserted, updated, errors } = await upsertAll(events);
  console.log(`\n✓ Done — inserted ${inserted}, updated ${updated}, errors ${errors} (new rows status=${STATUS}).`);
  if (errors) process.exitCode = 1;
}

main().catch(err => { console.error('\n✖ Fatal:', err); process.exit(1); });
