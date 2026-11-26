// Shared, dependency-free SEO/GEO builders. Used by BOTH the Netlify Edge Function
// (netlify/edge-functions/ssr-meta.ts, Deno) and the client hook
// (src/hooks/useDocumentMeta.ts) so server-injected and client-updated metadata
// stay identical. Keep this file free of DOM/Node/Deno globals.
import { withUtm } from './outbound.ts';
import {
  eventPath, eventLabel, cityNameOf, countryNameOf, placeLabel, artistSlug, cleanArtists, hubPath, venueName,
} from './catalog.ts';

export const SITE_URL = 'https://progdealer.com';
export const SITE_NAME = 'ProgDealer';
export const CONTACT_EMAIL = 'hello@progdealer.com';
export const DEFAULT_DESCRIPTION =
  'Live progressive rock, metal and post-rock shows worldwide, on an interactive map and near you. Filter by city, country, date or genre.';

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

const longFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const shortFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** "Thu, 4 Nov 2027" */
export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : longFmt.format(d);
}

/** "4 Nov 2027" */
export function fmtShortDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : shortFmt.format(d);
}

/** Country name for the event, or '' when unknown. */
function countryOf(e: SeoEvent): string {
  return countryNameOf(e) || '';
}

export function eventCanonical(e: SeoEvent, origin: string = SITE_URL): string {
  return `${origin}${eventPath(e)}`;
}

export function eventOgImage(e: SeoEvent, origin: string = SITE_URL): string {
  return hasValidImage(e.immagine) ? (e.immagine as string) : `${origin}/og-default.png`;
}

// Google cuts titles at about 600px, roughly 60 characters.
const TITLE_MAX = 60;

/**
 * "Steve Hackett in Barcelona, 4 Nov 2027: tickets | ProgDealer". Headliner
 * first, as people search ("steve hackett barcelona"); the date always fits,
 * a long name is the part that gets clipped.
 */
export function eventTitle(e: SeoEvent): string {
  const where = cityNameOf(e) || countryOf(e);
  const date = fmtShortDate(e.data_ora);
  const tail = `${where ? ` in ${where}` : ''}${date ? `, ${date}` : ''}`;
  const base = clip(eventLabel(e), Math.max(20, TITLE_MAX - tail.length)) + tail;
  for (const suffix of [`: tickets | ${SITE_NAME}`, ` | ${SITE_NAME}`]) {
    if (base.length + suffix.length <= TITLE_MAX) return base + suffix;
  }
  return base;
}

/** Venue, city and country once each: "Paral·lel 62, Barcelona, Spain". */
export function venuePlace(e: Pick<SeoEvent, 'venue' | 'città'>): string {
  const venue = venueName(e);
  const city = cityNameOf(e);
  const sameAsCity = venue && city && venue.toLowerCase() === city.toLowerCase();
  return [sameAsCity ? '' : venue, placeLabel(e)].filter(Boolean).join(', ');
}

export function eventDescription(e: SeoEvent): string {
  const date = fmtDate(e.data_ora);
  const lead = `${eventLabel(e)} live at ${venuePlace(e)}${date ? ' on ' + date : ''}.`;
  // A stored description is often shared by every date of a tour or every day of
  // a festival, so it follows this show's own facts instead of replacing them:
  // each page keeps a description of its own. Placeholders ("Concert", "Live")
  // are too short to count, and get the synthesized line instead.
  const stored = (e.descrizione || '').replace(/\s+/g, ' ').trim();
  if (stored.length >= 30) return clip(`${lead} ${stored}`, 160);
  const who = cleanArtists(e.artisti).slice(0, 4).join(', ');
  const parts = [
    lead,
    who ? `Lineup: ${who}.` : '',
    e.sottogenere ? `${e.sottogenere} show.` : '',
    'Tickets and details on ProgDealer.',
  ].filter(Boolean);
  return clip(parts.join(' '), 160);
}

// ---------- JSON-LD (plain objects) ----------

/** schema.org MusicEvent, enriched with geo coordinates and country for AI/answer engines. */
export function eventJsonLd(e: SeoEvent, origin: string = SITE_URL): Record<string, unknown> {
  const country = countryOf(e);
  const address: Record<string, unknown> = { '@type': 'PostalAddress', addressLocality: cityNameOf(e) || e.città };
  if (country) address.addressCountry = country;
  const location: Record<string, unknown> = { '@type': 'Place', name: venueName(e) || cityNameOf(e) || e.città, address };
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
  const lineup = cleanArtists(e.artisti);
  if (lineup.length) {
    jsonld.performer = lineup.map((a) => ({ '@type': 'MusicGroup', name: a, url: `${origin}${hubPath('artist', artistSlug(a))}` }));
  }
  if (e.link) {
    jsonld.offers = { '@type': 'Offer', url: e.link, availability: 'https://schema.org/InStock' };
  }
  return jsonld;
}

/** A link to another page of the site: a hub, an index or an event. */
export interface LinkItem { name: string; path: string; note?: string }

/** schema.org BreadcrumbList from ProgDealer down to the page itself. */
export function breadcrumbLd(trail: LinkItem[], origin: string = SITE_URL): Record<string, unknown> {
  const items = [{ name: SITE_NAME, path: '/' }, ...trail];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: origin + it.path })),
  };
}

export function eventBreadcrumbLd(e: SeoEvent, origin: string = SITE_URL, trail: LinkItem[] = []): Record<string, unknown> {
  return breadcrumbLd([...trail, { name: eventLabel(e), path: eventPath(e) }], origin);
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

export function jsonLdScript(obj: unknown): string {
  // Escape `<` to keep the JSON from prematurely closing the <script> element.
  return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
}

export function ogTwitter(title: string, desc: string, url: string, img: string): string {
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

export function eventHeadHtml(e: SeoEvent, origin: string = SITE_URL, related?: EventRelated): string {
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
    jsonLdScript(eventBreadcrumbLd(e, origin, related?.trail)),
  ].join('\n    ');
}

export function siteHeadHtml(origin: string = SITE_URL, upcoming: SeoEvent[] = []): string {
  const title = 'ProgDealer: Prog Rock Concerts, Tours and Festivals Worldwide';
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

/** Pages an event links to, built from the catalog by the edge function (see seoHubs.ts). */
export interface EventRelated {
  /** Breadcrumb levels between the home and the event: country, city. */
  trail: LinkItem[];
  artists: LinkItem[];
  festival?: LinkItem;
  city?: LinkItem;
  country?: LinkItem;
  genre?: LinkItem;
  /** Other upcoming dates of the headliner (or festival). */
  moreDates: LinkItem[];
  moreDatesTitle?: string;
  /** Other upcoming shows in the same city. */
  nearby: LinkItem[];
  nearbyTitle?: string;
}

function linkHtml(l: LinkItem): string {
  return `<a href="${escapeHtml(l.path)}">${escapeHtml(l.name)}</a>`;
}

export function linkListHtml(items: LinkItem[]): string {
  return '<ul>' + items.map((l) => `<li>${linkHtml(l)}${l.note ? ' · ' + escapeHtml(l.note) : ''}</li>`).join('') + '</ul>';
}

export const SSR_STYLE = 'max-width:760px;margin:0 auto;padding:24px;font-family:system-ui,sans-serif;line-height:1.5';

export function eventBodyHtml(e: SeoEvent, related?: EventRelated): string {
  const date = fmtDate(e.data_ora);
  const country = countryOf(e);
  const time = e.orario || '';
  const genre = e.sottogenere || '';
  const lineup = cleanArtists(e.artisti);
  const city = cityNameOf(e);

  const summary =
    `${eventLabel(e)} plays live at ${venuePlace(e)}${date ? ` on ${date}` : ''}${time ? ` at ${time}` : ''}.`
    + (genre ? ` A ${genre} concert.` : '')
    + (lineup.length ? ` Lineup: ${lineup.join(', ')}.` : '');

  // Facts as text, with the hub pages they belong to as links.
  const val = (text: string, link?: LinkItem) => (link ? linkHtml({ ...link, name: text }) : escapeHtml(text));
  const rows: [string, string][] = [];
  if (date) rows.push(['Date', escapeHtml(date)]);
  if (time) rows.push(['Time', escapeHtml(time)]);
  if (venueName(e)) rows.push(['Venue', escapeHtml(venueName(e))]);
  if (city || e.città) rows.push(['City', val(city || e.città, related?.city)]);
  if (country) rows.push(['Country', val(country, related?.country)]);
  if (genre) rows.push(['Genre', val(genre, related?.genre)]);
  if (related?.festival) rows.push(['Festival', linkHtml(related.festival)]);
  if (lineup.length) {
    const byName = new Map((related?.artists || []).map((a) => [a.name.toLowerCase(), a]));
    rows.push(['Lineup', lineup.map((a) => val(a, byName.get(a.toLowerCase()))).join(', ')]);
  }

  const crumbs = [{ name: SITE_NAME, path: '/' }, ...(related?.trail || [])];
  const out: string[] = [
    `<article style="${SSR_STYLE}">`,
    `<nav aria-label="Breadcrumb"><p>${crumbs.map(linkHtml).join(' › ')}</p></nav>`,
  ];
  if (genre) out.push(`<p>${escapeHtml(genre)}</p>`);
  out.push(`<h1>${escapeHtml(e.nome_evento)}</h1>`);
  out.push(`<p>${escapeHtml(summary)}</p>`);
  out.push('<dl>' + rows.map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${v}</dd>`).join('') + '</dl>');
  if (e.descrizione && e.descrizione.trim()) out.push(`<p>${escapeHtml(e.descrizione)}</p>`);
  if (e.link) out.push(`<p><a href="${escapeHtml(withUtm(e.link))}" rel="nofollow noopener">Tickets &amp; info</a></p>`);
  if (related?.moreDates.length) {
    out.push(`<h2>${escapeHtml(related.moreDatesTitle || 'More dates')}</h2>`, linkListHtml(related.moreDates));
  }
  if (related?.nearby.length) {
    out.push(`<h2>${escapeHtml(related.nearbyTitle || 'More shows nearby')}</h2>`, linkListHtml(related.nearby));
    if (related.city) out.push(`<p>${linkHtml({ ...related.city, name: `All prog concerts in ${related.city.name}` })}</p>`);
  }
  out.push(`</article>`);
  return out.join('');
}

/** Home links into the hubs: festivals, artists, cities, countries, genres. */
export interface BrowseLinks { festivals: LinkItem[]; artists: LinkItem[]; cities: LinkItem[]; countries: LinkItem[]; genres: LinkItem[] }

export function siteBodyHtml(upcoming: SeoEvent[] = [], browse?: BrowseLinks): string {
  const out: string[] = [
    `<section style="${SSR_STYLE}">`,
    `<h1>Every prog show, on the map.</h1>`,
    `<p>${escapeHtml(DEFAULT_DESCRIPTION)}</p>`,
    `<p>ProgDealer is an independent, continuously updated catalog of live progressive, prog-metal, post-rock, psychedelic and avant-garde concerts &amp; festivals worldwide.</p>`,
  ];
  if (upcoming.length) {
    out.push(`<h2>Upcoming shows</h2>`, `<ul>`);
    for (const e of upcoming) {
      const meta = [placeLabel(e), fmtDate(e.data_ora)].filter(Boolean).join(' · ');
      out.push(
        `<li><a href="${escapeHtml(eventPath(e))}">${escapeHtml(e.nome_evento)}</a>${meta ? ' · ' + escapeHtml(meta) : ''}</li>`,
      );
    }
    out.push(`</ul>`);
  }
  if (browse) {
    const block = (title: string, items: LinkItem[], all?: LinkItem) => {
      if (!items.length) return;
      out.push(`<h2>${escapeHtml(title)}</h2>`, linkListHtml(items));
      if (all) out.push(`<p>${linkHtml(all)}</p>`);
    };
    block('Prog festivals', browse.festivals, { name: 'All prog festivals', path: '/festivals' });
    block('Artists on tour', browse.artists, { name: 'All artists', path: '/artists' });
    block('Prog concerts by city', browse.cities, { name: 'All cities and countries', path: '/cities' });
    block('By country', browse.countries);
    block('By subgenre', browse.genres);
  }
  out.push(`</section>`);
  return out.join('');
}
