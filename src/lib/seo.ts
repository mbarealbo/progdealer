// Shared, dependency-free SEO builders. Used by BOTH the Netlify Edge Function
// (netlify/edge-functions/ssr-meta.ts, Deno) and the client hook
// (src/hooks/useDocumentMeta.ts) so server-injected and client-updated metadata
// stay identical. Keep this file free of DOM/Node/Deno globals.

export const SITE_URL = 'https://progdealer.com';
export const SITE_NAME = 'ProgDealer';
export const DEFAULT_DESCRIPTION =
  'Live progressive rock, metal and post-rock shows worldwide — on an interactive map, near you. Filter by city, country, date or genre.';

const DEFAULT_CONCERTFUL_IMAGE = 'https://concertful.com/public/foto/large/default.jpg';

/** Minimal event shape needed to build metadata (structurally compatible with types/event Event). */
export interface SeoEvent {
  id: string;
  nome_evento: string;
  data_ora: string;
  venue: string;
  città: string;
  sottogenere?: string | null;
  descrizione?: string | null;
  artisti?: string[] | null;
  orario?: string | null;
  link?: string | null;
  immagine?: string | null;
}

export function escapeHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clip(s: string, max: number): string {
  const t = (s || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
}

function hasValidImage(url?: string | null): boolean {
  if (!url) return false;
  const u = url.trim();
  if (!u || u === DEFAULT_CONCERTFUL_IMAGE) return false;
  return /^https?:\/\//i.test(u);
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(d);
}

export function eventCanonical(e: SeoEvent, origin: string = SITE_URL): string {
  return `${origin}/event/${e.id}`;
}

export function eventOgImage(e: SeoEvent, origin: string = SITE_URL): string {
  return hasValidImage(e.immagine) ? (e.immagine as string) : `${origin}/og-default.png`;
}

export function eventTitle(e: SeoEvent): string {
  const place = [e.venue, e.città].filter(Boolean).join(', ');
  const bits = [e.nome_evento, place, fmtDate(e.data_ora)].filter(Boolean).join(' · ');
  return clip(`${bits} | ${SITE_NAME}`, 70);
}

export function eventDescription(e: SeoEvent): string {
  // Use the stored description only when it's substantive; scraped rows often carry
  // placeholders like "Concert"/"Live", for which a synthesized, fact-rich line ranks better.
  if (e.descrizione && e.descrizione.trim().length >= 30) return clip(e.descrizione, 160);
  const date = fmtDate(e.data_ora);
  const who = e.artisti && e.artisti.length ? e.artisti.slice(0, 4).join(', ') : '';
  const parts = [
    `${e.nome_evento} — live at ${e.venue}, ${e.città}${date ? ' on ' + date : ''}.`,
    who ? `Lineup: ${who}.` : '',
    e.sottogenere ? `${e.sottogenere} show.` : '',
    'Full details on ProgDealer.',
  ].filter(Boolean);
  return clip(parts.join(' '), 160);
}

/** schema.org MusicEvent JSON-LD as a plain object. */
export function eventJsonLd(e: SeoEvent, origin: string = SITE_URL): Record<string, unknown> {
  const jsonld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'MusicEvent',
    name: e.nome_evento,
    startDate: e.data_ora,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url: eventCanonical(e, origin),
    image: [eventOgImage(e, origin)],
    location: {
      '@type': 'Place',
      name: e.venue,
      address: { '@type': 'PostalAddress', addressLocality: e.città },
    },
  };
  if (e.descrizione && e.descrizione.trim()) jsonld.description = clip(e.descrizione, 300);
  if (e.artisti && e.artisti.length) {
    jsonld.performer = e.artisti.map((a) => ({ '@type': 'MusicGroup', name: a }));
  }
  if (e.link) {
    jsonld.offers = { '@type': 'Offer', url: e.link, availability: 'https://schema.org/InStock' };
  }
  return jsonld;
}

export function siteJsonLd(origin: string = SITE_URL): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: origin + '/',
    description: DEFAULT_DESCRIPTION,
  };
}

// ---------- HTML string builders (used server-side by the edge function) ----------

function jsonLdScript(obj: unknown): string {
  // Escape `<` to keep the JSON from prematurely closing the <script> element.
  return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
}

function ogTwitter(title: string, desc: string, url: string, img: string): string {
  return [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(desc)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:image" content="${escapeHtml(img)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(desc)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(img)}" />`,
  ].join('\n    ');
}

export function eventHeadHtml(e: SeoEvent, origin: string = SITE_URL): string {
  const title = eventTitle(e);
  const desc = eventDescription(e);
  const url = eventCanonical(e, origin);
  const img = eventOgImage(e, origin);
  return [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(desc)}" />`,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    ogTwitter(title, desc, url, img),
    jsonLdScript(eventJsonLd(e, origin)),
  ].join('\n    ');
}

export function siteHeadHtml(origin: string = SITE_URL): string {
  const title = 'ProgDealer: Progressive and Alternative Rock Concerts and Festivals Database';
  const desc = DEFAULT_DESCRIPTION;
  const url = origin + '/';
  const img = `${origin}/og-default.png`;
  return [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(desc)}" />`,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    ogTwitter(title, desc, url, img),
    jsonLdScript(siteJsonLd(origin)),
  ].join('\n    ');
}

/** Minimal semantic body rendered into #root for crawlers that do not run JS. React replaces it on hydration. */
export function eventBodyHtml(e: SeoEvent): string {
  const date = fmtDate(e.data_ora);
  const meta = [e.venue, e.città].filter(Boolean).join(', ')
    + (date ? ` · ${date}` : '')
    + (e.orario ? ` · ${e.orario}` : '');
  const out: string[] = [
    `<article style="max-width:760px;margin:0 auto;padding:24px;font-family:system-ui,sans-serif;line-height:1.5">`,
    `<p><a href="/">← ProgDealer</a></p>`,
  ];
  if (e.sottogenere) out.push(`<p>${escapeHtml(e.sottogenere)}</p>`);
  out.push(`<h1>${escapeHtml(e.nome_evento)}</h1>`);
  out.push(`<p>${escapeHtml(meta)}</p>`);
  if (e.artisti && e.artisti.length) out.push(`<p><strong>Lineup:</strong> ${escapeHtml(e.artisti.join(', '))}</p>`);
  if (e.descrizione && e.descrizione.trim()) out.push(`<p>${escapeHtml(e.descrizione)}</p>`);
  if (e.link) out.push(`<p><a href="${escapeHtml(e.link)}" rel="nofollow noopener">Tickets &amp; info</a></p>`);
  out.push(`</article>`);
  return out.join('');
}

export function siteBodyHtml(): string {
  return [
    `<section style="max-width:760px;margin:0 auto;padding:24px;font-family:system-ui,sans-serif;line-height:1.5">`,
    `<h1>Every prog show, on the map.</h1>`,
    `<p>${escapeHtml(DEFAULT_DESCRIPTION)}</p>`,
    `<p>Live progressive, prog-metal, post-rock and psych concerts &amp; festivals worldwide.</p>`,
    `</section>`,
  ].join('');
}
