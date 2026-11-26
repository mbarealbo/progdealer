// Netlify Edge Function: the data behind the embeddable widget (public/widget.js).
// GET /api/widget/<artist|festival|city|country|genre>/<slug> returns the hub's
// next shows as JSON, readable from any site (CORS *). Public catalog data only.

import type { Config } from '@netlify/edge-functions';
import { SITE_URL } from '../../src/lib/seo.ts';
import { catalogLoader } from '../../src/lib/catalogCache.ts';
import { widgetData } from '../../src/lib/seoHubs.ts';
import type { HubKind } from '../../src/lib/catalog.ts';

const SUPABASE_URL = Netlify.env.get('VITE_SUPABASE_URL') || 'https://mlnmpfohtsiyjxnjwtkk.supabase.co';
const getCatalog = catalogLoader(SUPABASE_URL, Netlify.env.get('VITE_SUPABASE_ANON_KEY') || '');

const ROUTE = /^\/api\/widget\/(artist|festival|city|country|genre)\/([^/]+?)(?:\.json)?\/?$/;

function json(body: unknown, status: number): Response {
  const ok = status === 200;
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'x-content-type-options': 'nosniff',
      'cache-control': ok ? 'public, max-age=600' : 'public, max-age=60',
      'netlify-cdn-cache-control': ok ? 'public, s-maxage=1800, stale-while-revalidate=86400' : 'public, s-maxage=60',
    },
  });
}

export default async function handler(request: Request): Promise<Response> {
  const m = new URL(request.url).pathname.match(ROUTE);
  if (!m) return json({ error: 'not_found' }, 404);
  const catalog = await getCatalog();
  if (!catalog) return json({ error: 'unavailable' }, 503);
  let slug = m[2];
  try { slug = decodeURIComponent(slug); } catch { /* keep it raw */ }
  const data = widgetData(catalog, m[1] as HubKind, slug, SITE_URL);
  return data ? json(data, 200) : json({ error: 'not_found' }, 404);
}

export const config: Config = {
  path: '/api/widget/*',
  cache: 'manual',
};
