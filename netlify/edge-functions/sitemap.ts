// Netlify Edge Function: dynamic /sitemap.xml built from the live catalog of
// approved events (anonymous Supabase read). Always current: no rebuild needed.
// Lists the home, the index pages, every indexable hub (artist, festival, city,
// country, genre) and every event, upcoming shows first.

import type { Config } from '@netlify/edge-functions';
import { SITE_URL } from '../../src/lib/seo.ts';
import {
  buildCatalog, fetchCatalogRows, eventPath, eventDay, hubPath, isIndexable, type Hub,
} from '../../src/lib/catalog.ts';

const SUPABASE_URL = Netlify.env.get('VITE_SUPABASE_URL') || 'https://mlnmpfohtsiyjxnjwtkk.supabase.co';
const COLUMNS = 'id,nome_evento,data_ora,venue,città,sottogenere,artisti,updated_at,fonte';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function url(loc: string, lastmod?: string | null, priority?: string): string {
  const lm = lastmod ? `<lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : '';
  const pr = priority ? `<priority>${priority}</priority>` : '';
  return `  <url><loc>${esc(loc)}</loc>${lm}${pr}</url>`;
}

const HUB_PRIORITY: Record<Hub['kind'], string> = { artist: '0.8', festival: '0.8', city: '0.6', country: '0.6', genre: '0.5' };

export default async function handler(): Promise<Response> {
  const entries: string[] = [
    url(`${SITE_URL}/`, undefined, '1.0'),
    url(`${SITE_URL}/festivals`, undefined, '0.9'),
    url(`${SITE_URL}/artists`, undefined, '0.8'),
    url(`${SITE_URL}/cities`, undefined, '0.7'),
    url(`${SITE_URL}/privacy`, undefined, '0.2'),
  ];

  const key = Netlify.env.get('VITE_SUPABASE_ANON_KEY');
  if (key) {
    try {
      const c = buildCatalog(await fetchCatalogRows(SUPABASE_URL, key, COLUMNS));
      for (const hubs of [c.festivals, c.artists, c.countries, c.cities, c.genres]) {
        for (const h of hubs.values()) {
          if (isIndexable(h)) entries.push(url(SITE_URL + hubPath(h.kind, h.slug), h.lastmod, HUB_PRIORITY[h.kind]));
        }
      }
      const upcoming = c.events.filter((e) => eventDay(e) >= c.today);
      const past = c.events.filter((e) => eventDay(e) < c.today).reverse();
      for (const e of upcoming) entries.push(url(SITE_URL + eventPath(e), e.updated_at, '0.7'));
      for (const e of past) entries.push(url(SITE_URL + eventPath(e), e.updated_at, '0.3'));
    } catch {
      // Fall back to just the static URLs.
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
    + entries.join('\n')
    + `\n</urlset>\n`;

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=0, must-revalidate',
      'netlify-cdn-cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

export const config: Config = {
  path: '/sitemap.xml',
  cache: 'manual',
};
