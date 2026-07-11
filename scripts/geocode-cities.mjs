// One-off, keyless geocoder that builds src/data/cityCoords.json from the
// distinct `città` values in Supabase. Uses the free Open-Meteo geocoding API.
// Re-run any time to refresh. No API key, no cost. City-level precision — good
// enough for the map + "near you" MVP; venue-level precision comes with Google
// Places later.
//
// Usage: node scripts/geocode-cities.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { geocode } from './lib/geocode.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function readEnv(key) {
  const env = readFileSync(resolve(root, '.env'), 'utf8');
  const line = env.split('\n').find((l) => l.startsWith(key + '='));
  return line ? line.slice(key.length + 1).trim() : '';
}

const SUPABASE_URL = readEnv('VITE_SUPABASE_URL');
const ANON = readEnv('VITE_SUPABASE_ANON_KEY');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log('Fetching distinct cities from Supabase…');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/eventi_prog?select=citt%C3%A0`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
  });
  const rows = await res.json();
  const cities = [...new Set(rows.map((r) => r['città']).filter(Boolean))];
  console.log(`${cities.length} distinct cities to geocode.`);

  const out = {};
  const dropped = [];
  let ok = 0;
  for (let i = 0; i < cities.length; i++) {
    const city = cities[i];
    try {
      const coords = await geocode(city);
      if (coords) { out[city.toLowerCase()] = coords; ok++; }
      else dropped.push(city);
    } catch (e) {
      console.warn(`  ! ${city}: ${e.message}`);
      dropped.push(city);
    }
    if (i % 20 === 0) process.stdout.write(`\r  ${i + 1}/${cities.length}…`);
    await sleep(130); // be polite to the free API
  }
  process.stdout.write('\n');

  const dir = resolve(root, 'src/data');
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'cityCoords.json'), JSON.stringify(out, null, 0) + '\n');
  console.log(`Done. Resolved ${ok}/${cities.length} cities → src/data/cityCoords.json`);
  if (dropped.length) {
    console.log(`Dropped ${dropped.length} (no confident match — candidates for Google Places):`);
    console.log('  ' + dropped.sort().join(', '));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
