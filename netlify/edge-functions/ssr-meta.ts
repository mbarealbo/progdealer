// Netlify Edge Function: injects per-page <head> metadata (title, description,
// canonical, Open Graph, Twitter Card, JSON-LD) and a minimal semantic body into
// the static SPA shell for indexable routes. Non-JS crawlers (WhatsApp, LinkedIn,
// Facebook, X, Telegram, Slack, …) get correct, per-URL previews; Google gets the
// SEO signals and the internal links in the raw HTML while the React app hydrates.
//
// Routes: the home, events (/event/<slug>-<id>; a bare /event/<id> or a stale
// slug gets a 301 to the current URL), the hubs (/artist, /festival, /city,
// /country, /genre) and their indexes (/festivals, /artists, /cities).
//
// Auto-discovered by Netlify (netlify/edge-functions/). No netlify.toml entry needed.

import type { Context, Config } from '@netlify/edge-functions';
import {
  eventHeadHtml, eventBodyHtml, siteHeadHtml, siteBodyHtml, type SeoEvent,
} from '../../src/lib/seo.ts';
import {
  buildCatalog, fetchCatalogRows, parseEventParam, eventPath, hubsOf, canonicalEvent, type Catalog, type HubKind,
} from '../../src/lib/catalog.ts';
import {
  hubMeta, hubBodyHtml, indexMeta, indexBodyHtml, pageHeadHtml, eventRelated, browseLinks, upcomingEvents,
  type IndexKind,
} from '../../src/lib/seoHubs.ts';

const HOME_LIST_LIMIT = 30;

const SEO_BLOCK = /<!--seo-start-->[\s\S]*?<!--seo-end-->/;
const BODY_SLOT = '<!--ssr-body-->';

// App/private routes that must never be indexed. We inject `noindex` here (rather
// than only Disallow-ing in robots.txt) because Google must be able to CRAWL a page
// to see the noindex and drop it; a robots.txt block would leave it stuck in the index.
const NOINDEX_ROUTES = new Set(['/login', '/userarea', '/adminarea', '/reset-password', '/goodbye']);

const HUB_ROUTE = /^\/(artist|festival|city|country|genre)\/([^/]+)$/;
const INDEX_ROUTES = new Set<IndexKind>(['festivals', 'artists', 'cities']);

// Public values (the anon key already ships in the client bundle); env overrides.
const SUPABASE_URL = Netlify.env.get('VITE_SUPABASE_URL') || 'https://mlnmpfohtsiyjxnjwtkk.supabase.co';
const SELECT = 'id,nome_evento,data_ora,venue,città,sottogenere,descrizione,artisti,orario,link,immagine,lat,lng';

function anonKey(): string {
  return Netlify.env.get('VITE_SUPABASE_ANON_KEY') || '';
}

function authHeaders(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

// The whole public catalog, kept in the isolate for a few minutes: every hub
// page and every event page's links are built from it. Responses are also
// cached by the CDN (see respond), so this runs a few times an hour at most.
const CATALOG_TTL_MS = 10 * 60 * 1000;
let cached: { at: number; catalog: Catalog } | null = null;
let inflight: Promise<Catalog | null> | null = null;

function getCatalog(): Promise<Catalog | null> {
  if (cached && Date.now() - cached.at < CATALOG_TTL_MS) return Promise.resolve(cached.catalog);
  const key = anonKey();
  if (!key) return Promise.resolve(null);
  if (!inflight) {
    inflight = (async () => {
      try {
        const catalog = buildCatalog(await fetchCatalogRows(SUPABASE_URL, key));
        cached = { at: Date.now(), catalog };
        return catalog;
      } catch {
        return cached?.catalog ?? null; // stale beats nothing
      } finally {
        inflight = null;
      }
    })();
  }
  return inflight;
}

async function fetchEvent(id: string): Promise<SeoEvent | null> {
  const key = anonKey();
  if (!key) return null;
  const url = `${SUPABASE_URL}/rest/v1/eventi_prog`
    + `?id=eq.${encodeURIComponent(id)}&select=${encodeURIComponent(SELECT)}&limit=1`;
  try {
    const r = await fetch(url, { headers: authHeaders(key) });
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

function redirect(location: string): Response {
  return new Response(null, {
    status: 301,
    headers: {
      location,
      'cache-control': 'public, max-age=3600',
      'netlify-cdn-cache-control': 'public, s-maxage=86400',
    },
  });
}

const NOT_FOUND_HEAD = (what: string) => `<title>${what} not found | ProgDealer</title>\n    <meta name="robots" content="noindex" />`;

export default async function handler(request: Request, context: Context): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname === '/' ? '/' : url.pathname.replace(/\/+$/, '');

  // Event URLs: look the event up first, so an old or stale URL can be
  // redirected without fetching the app shell.
  const ev = path.match(/^\/event\/([^/]+)$/);
  let event: SeoEvent | null = null;
  if (ev) {
    const id = parseEventParam(ev[1]);
    event = id ? await fetchEvent(id) : null;
    if (event) {
      // A show listed twice lives at the row the catalog keeps, with the merged lineup.
      const catalog = await getCatalog();
      const kept = catalog ? canonicalEvent(catalog, event.id) : undefined;
      if (kept && kept.id !== event.id) return redirect(eventPath(kept) + url.search);
      if (kept) event = { ...event, artisti: kept.artisti };
      const canonicalPath = eventPath(event);
      if (url.pathname !== canonicalPath) return redirect(canonicalPath + url.search);
    }
  }

  const res = await context.next();
  if (!(res.headers.get('content-type') || '').includes('text/html')) return res;
  const origin = url.origin;
  const html = await res.text();

  // Use function replacers: injected content is arbitrary event text, and a string
  // replacement would interpret `$&`, `$\``, `$$`, … as special patterns.
  const inject = (head: string, body: string) =>
    html.replace(SEO_BLOCK, () => head).replace(BODY_SLOT, () => body);

  // Private/app routes → keep them out of search results.
  if (NOINDEX_ROUTES.has(path)) {
    return respond(inject('<meta name="robots" content="noindex, nofollow" />', ''), res, 200);
  }

  if (path === '/') {
    const catalog = await getCatalog();
    const upcoming = catalog ? upcomingEvents(catalog, HOME_LIST_LIMIT) : [];
    return respond(inject(siteHeadHtml(origin, upcoming), siteBodyHtml(upcoming, catalog ? browseLinks(catalog) : undefined)), res, 200);
  }

  if (ev) {
    if (!event) return respond(inject(NOT_FOUND_HEAD('Event'), ''), res, 404);
    const catalog = await getCatalog();
    const related = catalog ? eventRelated(catalog, { ...event, venue: event.venue || '' }) : undefined;
    return respond(inject(eventHeadHtml(event, origin, related), eventBodyHtml(event, related)), res, 200);
  }

  const hub = path.match(HUB_ROUTE);
  if (hub) {
    const catalog = await getCatalog();
    const h = catalog ? hubsOf(catalog, hub[1] as HubKind).get(decodeURIComponent(hub[2]).toLowerCase()) : undefined;
    if (!catalog || !h) return respond(inject(NOT_FOUND_HEAD('Page'), ''), res, 404);
    return respond(inject(pageHeadHtml(hubMeta(catalog, h, origin)), hubBodyHtml(catalog, h)), res, 200);
  }

  const index = path.slice(1) as IndexKind;
  if (INDEX_ROUTES.has(index)) {
    const catalog = await getCatalog();
    if (catalog) return respond(inject(pageHeadHtml(indexMeta(catalog, index, origin)), indexBodyHtml(catalog, index)), res, 200);
  }

  // The body was read above: hand back a fresh response with the untouched shell.
  return new Response(html, { status: res.status, headers: res.headers });
}

export const config: Config = {
  path: [
    '/', '/event/*',
    '/artist/*', '/festival/*', '/city/*', '/country/*', '/genre/*',
    '/artists', '/festivals', '/cities',
    '/login', '/userarea', '/adminarea', '/reset-password', '/goodbye',
  ],
  cache: 'manual',
};
