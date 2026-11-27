// Netlify Edge Function: /llms.txt and /llms-full.txt for AI assistants and
// answer engines, built from the live catalog (src/lib/llmsTxt.ts) so the
// facts and links stay current with every catalog update. If the catalog
// can't be read, /llms.txt falls back to the static public/llms.txt.

import type { Config, Context } from '@netlify/edge-functions';
import { catalogLoader } from '../../src/lib/catalogCache.ts';
import { llmsFullTxt, llmsTxt } from '../../src/lib/llmsTxt.ts';

const SUPABASE_URL = Netlify.env.get('VITE_SUPABASE_URL') || 'https://mlnmpfohtsiyjxnjwtkk.supabase.co';
const getCatalog = catalogLoader(SUPABASE_URL, Netlify.env.get('VITE_SUPABASE_ANON_KEY') || '');

const HEADERS = {
  'content-type': 'text/plain; charset=utf-8',
  'x-content-type-options': 'nosniff',
  'access-control-allow-origin': '*',
  'cache-control': 'public, max-age=3600',
  'netlify-cdn-cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
};

export default async function handler(request: Request, context: Context): Promise<Response> {
  const full = new URL(request.url).pathname === '/llms-full.txt';
  const catalog = await getCatalog();
  if (!catalog) {
    if (!full) return context.next();
    return new Response('The catalog is unavailable right now. Summary: https://progdealer.com/llms.txt\n', {
      status: 503,
      headers: { ...HEADERS, 'cache-control': 'no-store', 'netlify-cdn-cache-control': 'no-store' },
    });
  }
  return new Response(full ? llmsFullTxt(catalog) : llmsTxt(catalog), { headers: HEADERS });
}

export const config: Config = {
  path: ['/llms.txt', '/llms-full.txt'],
  cache: 'manual',
};
