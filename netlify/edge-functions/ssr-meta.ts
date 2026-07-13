// Netlify Edge Function: injects per-page <head> metadata (title, description,
// canonical, Open Graph, Twitter Card, JSON-LD) and a minimal semantic body into
// the static SPA shell for indexable routes. Non-JS crawlers (WhatsApp, LinkedIn,
// Facebook, X, Telegram, Slack, …) get correct, per-URL previews; Google gets the
// SEO signals in the raw HTML while still hydrating the full React app.
//
// Auto-discovered by Netlify (netlify/edge-functions/). No netlify.toml entry needed.

import type { Context, Config } from '@netlify/edge-functions';
import {
  eventHeadHtml, eventBodyHtml, siteHeadHtml, siteBodyHtml, type SeoEvent,
} from '../../src/lib/seo.ts';

const SEO_BLOCK = /<!--seo-start-->[\s\S]*?<!--seo-end-->/;
const BODY_SLOT = '<!--ssr-body-->';

// App/private routes that must never be indexed. We inject `noindex` here (rather
// than only Disallow-ing in robots.txt) because Google must be able to CRAWL a page
// to see the noindex and drop it — a robots.txt block would leave it stuck in the index.
const NOINDEX_ROUTES = new Set(['/login', '/userarea', '/adminarea', '/reset-password', '/goodbye']);

// Public values (the anon key already ships in the client bundle); env overrides.
const SUPABASE_URL = Netlify.env.get('VITE_SUPABASE_URL') || 'https://mlnmpfohtsiyjxnjwtkk.supabase.co';
const SELECT = 'id,nome_evento,data_ora,venue,città,sottogenere,descrizione,artisti,orario,link,immagine';

async function fetchEvent(id: string): Promise<SeoEvent | null> {
  const key = Netlify.env.get('VITE_SUPABASE_ANON_KEY');
  if (!key) return null;
  // Only look up plausible UUIDs — cheap guard against junk paths.
  if (!/^[0-9a-fA-F-]{16,40}$/.test(id)) return null;
  const url = `${SUPABASE_URL}/rest/v1/eventi_prog`
    + `?id=eq.${encodeURIComponent(id)}&select=${encodeURIComponent(SELECT)}&limit=1`;
  try {
    const r = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!r.ok) return null;
    const rows = await r.json();
    return Array.isArray(rows) && rows.length ? (rows[0] as SeoEvent) : null;
  } catch {
    return null;
  }
}

function respond(html: string, base: Response, status: number): Response {
  const headers = new Headers(base.headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.delete('content-length');
  if (status === 200) {
    headers.set('cache-control', 'public, max-age=0, must-revalidate');
    headers.set('netlify-cdn-cache-control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  } else {
    headers.set('cache-control', 'no-store');
    headers.set('netlify-cdn-cache-control', 'no-store');
  }
  return new Response(html, { status, headers });
}

export default async function handler(request: Request, context: Context): Promise<Response> {
  const res = await context.next();
  if (!(res.headers.get('content-type') || '').includes('text/html')) return res;

  const url = new URL(request.url);
  const origin = url.origin;
  const path = url.pathname === '/' ? '/' : url.pathname.replace(/\/+$/, '');
  let html = await res.text();

  // Use function replacers: injected content is arbitrary event text, and a string
  // replacement would interpret `$&`, `$\``, `$$`, … as special patterns.
  const inject = (head: string, body: string) =>
    html.replace(SEO_BLOCK, () => head).replace(BODY_SLOT, () => body);

  // Private/app routes → keep them out of search results.
  if (NOINDEX_ROUTES.has(path)) {
    return respond(inject('<meta name="robots" content="noindex, nofollow" />', ''), res, 200);
  }

  // Home
  if (path === '/') {
    return respond(inject(siteHeadHtml(origin), siteBodyHtml()), res, 200);
  }

  // Event detail
  const m = url.pathname.match(/^\/event\/([^/]+)\/?$/);
  if (m) {
    const event = await fetchEvent(decodeURIComponent(m[1]));
    if (event) {
      return respond(inject(eventHeadHtml(event, origin), eventBodyHtml(event)), res, 200);
    }
    // Unknown / non-approved event → keep it out of the index and signal 404.
    return respond(inject('<title>Event not found | ProgDealer</title>\n    <meta name="robots" content="noindex" />', ''), res, 404);
  }

  return res;
}

export const config: Config = {
  path: ['/', '/event/*', '/login', '/userarea', '/adminarea', '/reset-password', '/goodbye'],
  cache: 'manual',
};
