#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Backfill city-level lat/lng on existing eventi_prog rows that have none.
// Uses the service-role key (bypasses RLS) — LOCAL / server-side only.
//
// Run:  node scripts/backfill-coords.mjs [--dry-run] [--limit=N]
// Env:  SUPABASE_URL (or VITE_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY
// ---------------------------------------------------------------------------
import { readFileSync, existsSync } from 'node:fs';
import { geocode } from './lib/geocode.mjs';

// Load .env for local runs (real env still takes precedence).
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || m[1].startsWith('#') || process.env[m[1]] !== undefined) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = Number((process.argv.find((a) => a.startsWith('--limit=')) || '').split('=')[1]) || 0;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !KEY) { console.error('✖ Need SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { createClient } = await import('@supabase/supabase-js');
const sb = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

// Every row missing coordinates.
const { data, error } = await sb
  .from('eventi_prog')
  .select('id, città')
  .is('lat', null)
  .limit(5000);
if (error) { console.error('✖ fetch failed:', error.message); process.exit(1); }

let cities = [...new Set(data.map((r) => r['città']).filter(Boolean))];
if (LIMIT > 0) cities = cities.slice(0, LIMIT);
console.log(`${data.length} rows without coords across ${cities.length} distinct città · ${DRY_RUN ? 'DRY RUN' : 'writing'}\n`);

let cityHit = 0, rowsUpdated = 0, cityMiss = 0, errors = 0;
const missed = [];
for (const città of cities) {
  const c = await geocode(città).catch(() => null);
  if (!c) { cityMiss++; missed.push(città); await sleep(120); continue; }
  cityHit++;
  if (DRY_RUN) { await sleep(120); continue; }
  const { data: upd, error: e } = await sb
    .from('eventi_prog')
    .update({ lat: c.lat, lng: c.lng })
    .eq('città', città)
    .is('lat', null)
    .select('id');
  if (e) { errors++; console.error(`  ✖ ${città}: ${e.message}`); }
  else rowsUpdated += upd?.length || 0;
  await sleep(120);
}

console.log(`\n✓ città resolved ${cityHit}/${cities.length}` + (DRY_RUN ? '' : ` · rows updated ${rowsUpdated}`) + ` · errors ${errors}`);
if (missed.length) console.log(`Unresolved città (${missed.length}, stay on città fallback): ${missed.sort().join(', ')}`);
