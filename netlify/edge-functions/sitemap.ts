// Netlify Edge Function: dynamic /sitemap.xml built from the live catalog of
// approved events (anonymous Supabase read). Always current: no rebuild needed.

import type { Config } from '@netlify/edge-functions';
import { SITE_URL } from '../../src/lib/seo.ts';

const SUPABASE_URL = Netlify.env.get('VITE_SUPABASE_URL') || 'https://mlnmpfohtsiyjxnjwtkk.supabase.co';

interface Row { id: string; updated_at?: string }

function url(loc: string, lastmod?: string, priority?: string): string {
  const lm = lastmod ? `<lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : '';
  const pr = priority ? `<priority>${priority}</priority>` : '';
  return `  <url><loc>${loc}</loc>${lm}${pr}</url>`;
}

export default async function handler(): Promise<Response> {
  const entries: string[] = [
    url(`${SITE_URL}/`, undefined, '1.0'),
    url(`${SITE_URL}/privacy`, undefined, '0.2'),
  ];

  const key = Netlify.env.get('VITE_SUPABASE_ANON_KEY');
  if (key) {
    try {
      // PostgREST silently cuts any response to max-rows (1000), whatever the
      // limit asked: page through. Newest dates first, so upcoming shows lead.
      // Until Nov 2026 a single `order=data_ora.asc&limit=5000` returned only
      // the 1000 oldest rows: with 2463 events, no upcoming show was listed.
      const PAGE = 1000;
      for (let offset = 0; offset < 50000; offset += PAGE) { // 50k: the sitemap URL limit
        const q = `${SUPABASE_URL}/rest/v1/eventi_prog`
          + `?select=id,updated_at&status=eq.approved&order=data_ora.desc,id.asc&limit=${PAGE}&offset=${offset}`;
        const r = await fetch(q, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
        if (!r.ok) break;
        const rows = (await r.json()) as Row[];
        for (const row of rows) entries.push(url(`${SITE_URL}/event/${row.id}`, row.updated_at, '0.7'));
        if (rows.length < PAGE) break;
      }
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
