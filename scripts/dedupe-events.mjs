#!/usr/bin/env node
// ---------------------------------------------------------------------------
// ProgDealer — one-off cleanup of duplicated events in `eventi_prog`.
//
// The scraper used to key duplicates on the LLM-extracted event *name*, which
// changes from run to run ("Haken" / "in a fever dream europe 2026" /
// "Haken - In A Fever Dream Europe 2026"), and it only read the first 1000
// existing rows (PostgREST max-rows) before deciding what was new. Both bugs
// are fixed in scrape-events.mjs; this script cleans up what they left behind.
//
// Clusters are built on when+where (same day + same city + same venue, or a
// same-link / same-name variant), one row survives per cluster and the others
// are deleted after their non-empty fields are merged into the survivor.
// The survivor is always the OLDEST row, so its /event/:id URL keeps working.
//
// Run:  node scripts/dedupe-events.mjs              # dry run, prints the plan
//       node scripts/dedupe-events.mjs --json       # the same plan as JSON
//       node scripts/dedupe-events.mjs --apply      # merge + delete for real
//       node scripts/dedupe-events.mjs --apply --yes  # skip the confirmation
//
// Env: SUPABASE_URL (or VITE_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY
// ---------------------------------------------------------------------------

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { bucketOf, dayOf, indexByBucket, norm, sameEvent, tokens } from './lib/dedupe.mjs';

if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || m[1].startsWith('#') || process.env[m[1]] !== undefined) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    process.env[m[1]] = val;
  }
}

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const ASSUME_YES = args.includes('--yes');
const AS_JSON = args.includes('--json'); // machine-readable plan, for review before applying
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !KEY) {
  console.error('✖ Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const rest = (path, init = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });

// --- Load (paginated — PostgREST caps a response at 1000 rows) ---------------
async function loadAll() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const res = await rest('eventi_prog?select=*&order=created_at.asc,id.asc', {
      headers: { Range: `${from}-${from + 999}`, 'Range-Unit': 'items' },
    });
    const batch = await res.json();
    if (!res.ok) throw new Error(batch.message || `HTTP ${res.status}`);
    rows.push(...batch);
    if (batch.length < 1000) break;
  }
  return rows;
}

// --- Clustering ---------------------------------------------------------------
function cluster(rows) {
  const parent = new Map(rows.map((r) => [r.id, r.id]));
  const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };
  const why = new Map();
  for (const list of indexByBucket(rows).values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const reason = sameEvent(list[i], list[j]);
        if (reason) { union(list[i].id, list[j].id); why.set(list[j].id, reason); }
      }
    }
  }
  const groups = new Map();
  for (const e of rows) {
    const root = find(e.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(e);
  }
  return { clusters: [...groups.values()].filter((g) => g.length > 1), why };
}

// --- Merge --------------------------------------------------------------------
const day = dayOf;
const isEmpty = (v) => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
const MERGE_FIELDS = ['descrizione', 'artisti', 'immagine', 'orario', 'lat', 'lng', 'country', 'event_id', 'sottogenere'];
const hasPath = (u) => { try { return new URL(u).pathname.replace(/\/+$/, '').length > 0; } catch { return false; } };

// Some rows are named after their own venue ("Sidney & Matilda" @ Sidney &
// Matilda) because the extractor found no title. Score a name by how much it
// says beyond the venue, ignoring filler the sources pad titles with.
function nameScore(e) {
  const venueTokens = tokens(e.venue);
  const informative = [...tokens(e.nome_evento)].filter((t) => !venueTokens.has(t));
  return informative.length + norm(e.nome_evento).length / 1000;
}

function planFor(group) {
  const sorted = [...group].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)) || a.id.localeCompare(b.id));
  const keep = sorted[0];
  const drop = sorted.slice(1);
  const patch = {};

  // Only rename the survivor when its own title carries no information beyond
  // the venue — renaming an already-good title just churns the listing.
  if (nameScore(keep) < 1) {
    const bestName = [...group].sort((a, b) => nameScore(b) - nameScore(a))[0];
    if (nameScore(bestName) >= 1 && bestName.nome_evento !== keep.nome_evento) patch.nome_evento = bestName.nome_evento;
  }

  // 20:00 is the scraper's fallback when no time was published — a real time wins.
  if (String(keep.data_ora).slice(11, 16) === '20:00') {
    const real = drop.find((e) => String(e.data_ora).slice(11, 16) !== '20:00' && day(e) === day(keep));
    if (real) patch.data_ora = real.data_ora;
  }
  // A deep ticket link beats a bare homepage.
  if (!hasPath(keep.link)) {
    const better = drop.find((e) => hasPath(e.link));
    if (better) patch.link = better.link;
  }
  for (const f of MERGE_FIELDS) {
    if (!isEmpty(keep[f])) continue;
    const donor = drop.find((e) => !isEmpty(e[f]));
    if (donor) patch[f] = donor[f];
  }
  if (keep.status === 'pending' && drop.some((e) => e.status === 'approved')) patch.status = 'approved';
  // A longer venue string is usually the complete one ("Scholey Park, Kirkby Lane").
  const longestVenue = [...group].map((e) => e.venue).filter(Boolean).sort((a, b) => b.length - a.length)[0];
  if (longestVenue && longestVenue !== keep.venue && norm(longestVenue).startsWith(norm(keep.venue))) patch.venue = longestVenue;

  return { keep, drop, patch };
}

// --- Main ---------------------------------------------------------------------
const rows = await loadAll();
const { clusters, why } = cluster(rows);
const plans = clusters.map(planFor);
const toDelete = plans.flatMap((p) => p.drop);

if (AS_JSON) {
  console.log(JSON.stringify(
    plans.map(({ keep, drop, patch }) => ({
      keep, patch, drop: drop.map((d) => ({ ...d, reason: why.get(d.id) || 'clustered' })),
    })),
    null, 2));
  process.exit(0);
}

console.log(`Loaded ${rows.length} events.`);
console.log(`Duplicate clusters: ${plans.length} — ${toDelete.length} rows to delete (${(toDelete.length / rows.length * 100).toFixed(1)}% of the table).\n`);

for (const { keep, drop, patch } of plans) {
  console.log(`• ${day(keep)} ${keep['città']} — "${keep.nome_evento}" @ ${keep.venue}`);
  console.log(`    keep   ${keep.id}  (${keep.fonte}, ${String(keep.created_at).slice(0, 10)})`);
  for (const d of drop) console.log(`    delete ${d.id}  (${d.fonte}) "${d.nome_evento}" @ ${d.venue} ${String(d.data_ora).slice(11, 16)} — ${why.get(d.id) || 'clustered'}`);
  if (Object.keys(patch).length) {
    console.log(`    patch  ${Object.entries(patch).map(([k, v]) => `${k}=${JSON.stringify(v)?.slice(0, 60)}`).join(', ')}`);
  }
}

if (!toDelete.length) { console.log('\nNothing to do.'); process.exit(0); }

if (!APPLY) {
  console.log('\nDry run — nothing was written. Re-run with --apply to merge and delete.');
  process.exit(0);
}

if (!ASSUME_YES) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`\nDelete ${toDelete.length} rows and patch ${plans.filter((p) => Object.keys(p.patch).length).length} survivors? [y/N] `);
  rl.close();
  if (!/^y(es)?$/i.test(answer.trim())) { console.log('Aborted.'); process.exit(0); }
}

mkdirSync('.firecrawl', { recursive: true });
const backup = `.firecrawl/dedupe-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
writeFileSync(backup, JSON.stringify({ deleted: toDelete, patches: plans.map(({ keep, patch }) => ({ id: keep.id, before: keep, patch })) }, null, 2));
console.log(`\nBackup of every deleted row written to ${backup}`);

let patched = 0, deleted = 0, errors = 0;
for (const { keep, patch } of plans) {
  if (!Object.keys(patch).length) continue;
  const res = await rest(`eventi_prog?id=eq.${keep.id}`, { method: 'PATCH', body: JSON.stringify(patch), headers: { Prefer: 'return=minimal' } });
  if (res.ok) patched++;
  else { errors++; console.error(`  ✖ patch ${keep.id}: ${(await res.json().catch(() => ({}))).message || res.status}`); }
}

for (let i = 0; i < toDelete.length; i += 50) {
  const ids = toDelete.slice(i, i + 50).map((e) => e.id);
  const res = await rest(`eventi_prog?id=in.(${ids.join(',')})`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  if (res.ok) deleted += ids.length;
  else { errors++; console.error(`  ✖ delete batch: ${(await res.json().catch(() => ({}))).message || res.status}`); }
}

console.log(`\n✓ Done — ${patched} survivors patched, ${deleted} duplicates deleted, ${errors} errors.`);
