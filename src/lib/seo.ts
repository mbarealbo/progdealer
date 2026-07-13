// Shared, dependency-free SEO/GEO builders. Used by BOTH the Netlify Edge Function
// (netlify/edge-functions/ssr-meta.ts, Deno) and the client hook
// (src/hooks/useDocumentMeta.ts) so server-injected and client-updated metadata
// stay identical. Keep this file free of DOM/Node/Deno globals.
import { getEventCountry } from '../utils/geo.ts';

export const SITE_URL = 'https://progdealer.com';
export const SITE_NAME = 'ProgDealer';
export const CONTACT_EMAIL = 'hello@progdealer.com';
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
  lat?: number | null;
  lng?: number | null;
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

/** Country name for the event, or '' when unknown. */
function countryOf(e: SeoEvent): string {
  const c = getEventCountry(e.città);
  return c && c !== 'Other' ? c : '';
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
  const country = countryOf(e);
  const place = [e.venue, e.città, country].filter(Boolean).join(', ');
  const parts = [
    `${e.nome_evento} — live at ${place}${date ? ' on ' + date : ''}.`,
    who ? `Lineup: ${who}.` : '',
    e.sottogenere ? `${e.sottogenere} show.` : '',
    'Full details on ProgDealer.',
  ].filter(Boolean);
  return clip(parts.join(' '), 160);
}

// ---------- JSON-LD (plain objects) ----------

/** schema.org MusicEvent — enriched with geo coordinates and country for AI/answer engines. */
export function eventJsonLd(e: SeoEvent, origin: string = SITE_URL): Record<string, unknown> {
  const country = countryOf(e);
  const address: Record<string, unknown> = { '@type': 'PostalAddress', addressLocality: e.città };
  if (country) address.addressCountry = country;
  const location: Record<string, unknown> = { '@type': 'Place', name: e.venue, address };
  if (typeof e.lat === 'number' && typeof e.lng === 'number') {
    location.geo = { '@type': 'GeoCoordinates', latitude: e.lat, longitude: e.lng };
  }

  const jsonld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'MusicEvent',
    name: e.nome_evento,
    startDate: e.data_ora,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url: eventCanonical(e, origin),
    image: [eventOgImage(e, origin)],
    inLanguage: 'en',
    location,
    organizer: { '@type': 'Organization', name: SITE_NAME, url: origin + '/' },
  };
  if (e.sottogenere) jsonld.genre = e.sottogenere;
  if (e.descrizione && e.descrizione.trim()) jsonld.description = clip(e.descrizione, 300);
  else jsonld.description = eventDescription(e);
  if (e.artisti && e.artisti.length) {
    jsonld.performer = e.artisti.map((a) => ({ '@type': 'MusicGroup', name: a }));
  }
  if (e.link) {
    jsonld.offers = { '@type': 'Offer', url: e.link, availability: 'https://schema.org/InStock' };
  }
  return jsonld;
}

export function eventBreadcrumbLd(e: SeoEvent, origin: string = SITE_URL): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: SITE_NAME, item: origin + '/' },
      { '@type': 'ListItem', position: 2, name: e.nome_evento, item: eventCanonical(e, origin) },
    ],
  };
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

export function organizationJsonLd(origin: string = SITE_URL): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: origin + '/',
    logo: origin + '/icon-512.png',
    image: origin + '/og-default.png',
    description: DEFAULT_DESCRIPTION,
    email: CONTACT_EMAIL,
  };
}

export function upcomingItemListLd(events: SeoEvent[], origin: string = SITE_URL): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Upcoming progressive & alternative music shows',
    numberOfItems: events.length,
    itemListElement: events.map((e, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: eventCanonical(e, origin),
      name: e.nome_evento,
    })),
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
    jsonLdScript(eventBreadcrumbLd(e, origin)),
  ].join('\n    ');
}

export function siteHeadHtml(origin: string = SITE_URL, upcoming: SeoEvent[] = []): string {
  const title = 'ProgDealer: Progressive and Alternative Rock Concerts and Festivals Database';
  const desc = DEFAULT_DESCRIPTION;
  const url = origin + '/';
  const img = `${origin}/og-default.png`;
  const parts = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(desc)}" />`,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    ogTwitter(title, desc, url, img),
    jsonLdScript(siteJsonLd(origin)),
    jsonLdScript(organizationJsonLd(origin)),
  ];
  if (upcoming.length) parts.push(jsonLdScript(upcomingItemListLd(upcoming, origin)));
  return parts.join('\n    ');
}

// ---------- Minimal, fact-rich body rendered into #root for no-JS crawlers ----------
// React replaces it on hydration; AI answer engines read the facts from it.

export function eventBodyHtml(e: SeoEvent): string {
  const date = fmtDate(e.data_ora);
  const country = countryOf(e);
  const time = e.orario || '';
  const genre = e.sottogenere || '';
  const lineup = e.artisti && e.artisti.length ? e.artisti.join(', ') : '';
  const place = [e.venue, e.città, country].filter(Boolean).join(', ');

  const summary =
    `${e.nome_evento} plays live at ${place}${date ? ` on ${date}` : ''}${time ? ` at ${time}` : ''}.`
    + (genre ? ` A ${genre} concert.` : '')
    + (lineup ? ` Lineup: ${lineup}.` : '');

  const rows: [string, string][] = [];
  if (date) rows.push(['Date', date]);
  if (time) rows.push(['Time', time]);
  if (e.venue) rows.push(['Venue', e.venue]);
  if (e.città) rows.push(['City', e.città]);
  if (country) rows.push(['Country', country]);
  if (genre) rows.push(['Genre', genre]);
  if (lineup) rows.push(['Lineup', lineup]);

  const out: string[] = [
    `<article style="max-width:760px;margin:0 auto;padding:24px;font-family:system-ui,sans-serif;line-height:1.5">`,
    `<p><a href="/">← ProgDealer</a></p>`,
  ];
  if (genre) out.push(`<p>${escapeHtml(genre)}</p>`);
  out.push(`<h1>${escapeHtml(e.nome_evento)}</h1>`);
  out.push(`<p>${escapeHtml(summary)}</p>`);
  out.push('<dl>' + rows.map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join('') + '</dl>');
  if (e.descrizione && e.descrizione.trim()) out.push(`<p>${escapeHtml(e.descrizione)}</p>`);
  if (e.link) out.push(`<p><a href="${escapeHtml(e.link)}" rel="nofollow noopener">Tickets &amp; info</a></p>`);
  out.push(`</article>`);
  return out.join('');
}

export function siteBodyHtml(upcoming: SeoEvent[] = []): string {
  const out: string[] = [
    `<section style="max-width:760px;margin:0 auto;padding:24px;font-family:system-ui,sans-serif;line-height:1.5">`,
    `<h1>Every prog show, on the map.</h1>`,
    `<p>${escapeHtml(DEFAULT_DESCRIPTION)}</p>`,
    `<p>ProgDealer is an independent, continuously updated catalog of live progressive, prog-metal, post-rock, psychedelic and avant-garde concerts &amp; festivals worldwide.</p>`,
  ];
  if (upcoming.length) {
    out.push(`<h2>Upcoming shows</h2>`, `<ul>`);
    for (const e of upcoming) {
      const country = countryOf(e);
      const where = [e.città, country].filter(Boolean).join(', ');
      const meta = [where, fmtDate(e.data_ora)].filter(Boolean).join(' · ');
      out.push(
        `<li><a href="/event/${escapeHtml(e.id)}">${escapeHtml(e.nome_evento)}</a>${meta ? ' — ' + escapeHtml(meta) : ''}</li>`,
      );
    }
    out.push(`</ul>`);
  }
  out.push(`</section>`);
  return out.join('');
}
