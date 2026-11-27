// Copy, metadata, JSON-LD and the server-rendered body of the hub pages
// (/artist, /festival, /city, /country, /genre) and of their indexes
// (/festivals, /artists, /cities).
//
// Shared by the edge SSR (netlify/edge-functions/ssr-meta.ts) and the React
// pages, so both say the same thing. Pure: no DOM, Node or Deno globals.
import {
  type Catalog, type CatalogEvent, type Hub, type HubKind,
  hubPath, hubsOf, isIndexable, yearRange, topHubs, topValues, eventPath, eventDay,
  cityNameOf, countryNameOf, cleanArtists, artistSlug, festivalOf, hubsForEvent, slugify, venueName, placeLabel,
} from './catalog.ts';
import {
  type LinkItem, type EventRelated, type BrowseLinks,
  SITE_URL, SITE_NAME, escapeHtml, jsonLdScript, ogTwitter, breadcrumbLd, linkListHtml, SSR_STYLE,
  fmtShortDate, venuePlace,
} from './seo.ts';
import { MEDIA } from '../data/media.ts';

export type IndexKind = 'festivals' | 'artists' | 'cities';

export interface PageMeta {
  title: string;
  description: string;
  /** Absolute URL. */
  canonical: string;
  image: string;
  /** "noindex, follow" for thin hubs; undefined means indexable. */
  robots?: string;
  jsonLd: Record<string, unknown>[];
}

export interface PageCopy {
  eyebrow: string;
  h1: string;
  intro: string;
  /** Breadcrumb levels between the home and this page (this page last). */
  trail: LinkItem[];
}

export interface Section {
  id: string;
  title: string;
  events?: CatalogEvent[];
  links?: LinkItem[];
  /** Shown under the list, e.g. "and 120 more on the map". */
  more?: LinkItem;
}

const DEFAULT_IMAGE = '/og-default.png';
// Google cuts titles at about 600px, roughly 60 characters.
const TITLE_MAX = 60;
const DESC_MAX = 160;

function clip(s: string, max: number): string {
  const t = (s || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
}

/** `${main}: ${extra} | ProgDealer`, dropping parts from the right until it fits. */
function fitTitle(main: string, extra = ''): string {
  const candidates = [
    extra ? `${main}: ${extra} | ${SITE_NAME}` : '',
    extra ? `${main}: ${extra}` : '',
    `${main} | ${SITE_NAME}`,
  ].filter(Boolean);
  for (const c of candidates) if (c.length <= TITLE_MAX) return c;
  return clip(main, TITLE_MAX);
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "London, Manchester, Glasgow and Bristol" */
function andList(items: string[]): string {
  if (items.length <= 1) return items[0] || '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** "London, Leeds and more" when the list is cut, "London and Leeds" when it is whole. */
function listMore(items: string[], total: number): string {
  return total > items.length ? `${items.join(', ')} and more` : andList(items);
}

const THE = new Set(['United Kingdom', 'United States', 'Netherlands', 'Czech Republic', 'United Arab Emirates', 'Philippines', 'Dominican Republic']);
/** "the United Kingdom", "Germany" */
export function theCountry(name: string): string {
  return THE.has(name) ? `the ${name}` : name;
}

/** "21-23 Aug 2026", "30 Jun to 2 Jul 2027", "4 Nov 2027". */
export function dateSpan(events: CatalogEvent[]): string {
  if (!events.length) return '';
  const a = new Date(events[0].data_ora);
  const b = new Date(events[events.length - 1].data_ora);
  const sameDay = eventDay(events[0]) === eventDay(events[events.length - 1]);
  if (sameDay) return fmtShortDate(events[0].data_ora);
  const m = (d: Date) => d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });
  if (a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth()) {
    return `${a.getUTCDate()}-${b.getUTCDate()} ${m(b)} ${b.getUTCFullYear()}`;
  }
  return `${fmtShortDate(events[0].data_ora)} to ${fmtShortDate(events[events.length - 1].data_ora)}`;
}

// ---------- Links ----------

export function eventLink(e: CatalogEvent): LinkItem {
  const where = venuePlace(e);
  return { name: e.nome_evento, path: eventPath(e), note: [fmtShortDate(e.data_ora), where].filter(Boolean).join(' · ') };
}

export function hubLink(h: Hub, note?: string): LinkItem {
  const n = h.upcoming.length;
  return { name: h.name, path: hubPath(h.kind, h.slug), note: note ?? (n ? plural(n, 'upcoming show') : undefined) };
}

const INDEX_OF: Record<HubKind, LinkItem | null> = {
  artist: { name: 'Artists', path: '/artists' },
  festival: { name: 'Festivals', path: '/festivals' },
  city: null,
  country: { name: 'Countries', path: '/cities' },
  genre: null,
};

// ---------- Festival editions ----------

export interface Edition { year: string; events: CatalogEvent[]; upcoming: boolean }

const EDITION_GAP_DAYS = 7;
const dayMs = (e: CatalogEvent) => Date.parse(eventDay(e) + 'T00:00:00Z');

/**
 * The next edition, or the latest one when none is announced yet: the run of
 * dates around it with no gap longer than a week, so a stray listing months
 * away is not folded into the same edition.
 */
export function festivalEdition(h: Hub): Edition | null {
  const upcoming = h.upcoming.length > 0;
  const anchor = upcoming ? h.upcoming[0] : h.past[0];
  if (!anchor) return null;
  const all = h.events;
  let i = all.indexOf(anchor);
  let j = i;
  while (i > 0 && dayMs(all[i]) - dayMs(all[i - 1]) <= EDITION_GAP_DAYS * 86400000) i--;
  while (j < all.length - 1 && dayMs(all[j + 1]) - dayMs(all[j]) <= EDITION_GAP_DAYS * 86400000) j++;
  const events = all.slice(i, j + 1);
  return { year: eventDay(events[0]).slice(0, 4), events, upcoming };
}

/** Bands on a festival bill, the festival's own name left out. */
function festivalLineup(h: Hub, events: CatalogEvent[]): string[] {
  const own = slugify(h.name);
  const seen = new Map<string, string>();
  for (const e of events) {
    for (const a of cleanArtists(e.artisti)) {
      const s = artistSlug(a);
      if (s && !own.includes(s) && !s.includes(own) && !seen.has(s)) seen.set(s, a);
    }
  }
  return [...seen.values()];
}

function festivalPlace(h: Hub, events: CatalogEvent[]): string {
  return topValues(events, (e) => (cityNameOf(e) ? placeLabel(e) : null), 1)[0]
    || [h.festival?.city, h.festival?.country].filter(Boolean).join(', ');
}

// ---------- Copy ----------

export function hubCopy(c: Catalog, h: Hub): PageCopy {
  const n = h.upcoming.length;
  const yr = yearRange(h.upcoming);
  const index = INDEX_OF[h.kind];
  const self: LinkItem = { name: h.name, path: hubPath(h.kind, h.slug) };

  switch (h.kind) {
    case 'artist': {
      const cities = topValues(h.upcoming, (e) => cityNameOf(e), 4);
      const nCities = topValues(h.upcoming, (e) => cityNameOf(e), 999).length;
      const genre = topValues(h.events, (e) => (e.sottogenere || '').trim() || null, 1)[0];
      const intro = n
        ? `${plural(n, `upcoming ${h.name} show`)}${yr ? ` in ${yr}` : ''}${cities.length ? `, in ${listMore(cities, nCities)}` : ''}. Dates, venues and ticket links, collected from promoters and venues and refreshed every 15 days.`
        : `No upcoming ${h.name} shows in the catalog right now. ${plural(h.past.length, 'past show')} below, with the venues they played.`;
      return { eyebrow: genre ? `${genre} · Artist` : 'Artist', h1: n ? `${h.name} tour dates` : `${h.name} concerts`, intro, trail: [index!, self] };
    }
    case 'festival': {
      const ed = festivalEdition(h);
      const place = ed ? festivalPlace(h, ed.events) : '';
      const lineup = ed ? festivalLineup(h, ed.events) : [];
      const blurb = h.festival?.blurb || '';
      const when = ed ? `The ${ed.year} edition${ed.upcoming ? ' runs' : ' ran'} ${dateSpan(ed.events).includes(' to ') ? 'from ' : 'on '}${dateSpan(ed.events)}${place ? ` in ${place}` : ''}` : '';
      const who = lineup.length ? `, with ${listMore(lineup.slice(0, 6), lineup.length)}` : '';
      return {
        eyebrow: `Festival${place ? ` · ${place}` : ''}`,
        h1: ed ? `${h.name} ${ed.year}` : h.name,
        intro: [blurb, when ? `${when}${who}.` : ''].filter(Boolean).join(' '),
        trail: [index!, self],
      };
    }
    case 'city': {
      const country = h.country || '';
      const countryHub = country ? c.countries.get(slugify(country)) : undefined;
      const artists = topValues(h.upcoming, (e) => cleanArtists(e.artisti)[0] || null, 4);
      const venues = topValues(h.upcoming, (e) => venueName(e) || null, 3);
      const intro = n
        ? `${plural(n, 'upcoming prog show')} in ${h.name}${yr ? ` in ${yr}` : ''}${artists.length ? `, from ${andList(artists)}` : ''}.${venues.length ? ` Gigs and festivals at ${andList(venues)}.` : ''}`
        : `No upcoming prog shows in ${h.name} in the catalog right now. Past shows are listed below.`;
      const trail = [countryHub ? { name: countryHub.name, path: hubPath('country', countryHub.slug) } : null, self].filter(Boolean) as LinkItem[];
      return { eyebrow: country ? `City · ${country}` : 'City', h1: `Prog concerts in ${h.name}`, intro, trail };
    }
    case 'country': {
      const cities = topValues(h.upcoming, (e) => cityNameOf(e), 5);
      const nCities = topValues(h.upcoming, (e) => cityNameOf(e), 999).length;
      const intro = n
        ? `${plural(n, 'upcoming prog show')} in ${theCountry(h.name)}${yr ? ` in ${yr}` : ''}, across ${plural(nCities, 'city', 'cities')}${cities.length ? `: ${listMore(cities, nCities)}` : ''}.`
        : `No upcoming prog shows in ${theCountry(h.name)} in the catalog right now.`;
      return { eyebrow: 'Country', h1: `Prog concerts in ${theCountry(h.name)}`, intro, trail: [index!, self] };
    }
    case 'genre': {
      const artists = topValues(h.upcoming, (e) => cleanArtists(e.artisti)[0] || null, 5);
      const intro = n
        ? `${plural(n, `upcoming ${h.name} show`)} worldwide${yr ? ` in ${yr}` : ''}${artists.length ? `, from ${andList(artists)}` : ''}.`
        : `No upcoming ${h.name} shows in the catalog right now.`;
      return { eyebrow: 'Subgenre', h1: `${h.name} concerts`, intro, trail: [self] };
    }
  }
}

// ---------- Sections ----------

const MAX_EVENTS = 200;
const MAX_PAST = 30;

function eventsSection(id: string, title: string, events: CatalogEvent[], max: number, more?: LinkItem): Section | null {
  if (!events.length) return null;
  const extra = events.length - max;
  return {
    id, title, events: events.slice(0, max),
    more: extra > 0 ? (more ? { ...more, note: `${extra} more` } : undefined) : undefined,
  };
}

function linksSection(id: string, title: string, links: LinkItem[]): Section | null {
  return links.length ? { id, title, links } : null;
}

const byUpcoming = (a: Hub, b: Hub) => b.upcoming.length - a.upcoming.length || a.name.localeCompare(b.name);

/** Hubs of a kind that these events belong to, with how many of the events each one has. */
function hubsCounted(c: Catalog, kind: HubKind, events: CatalogEvent[], exclude?: string): { hub: Hub; n: number }[] {
  const seen = new Map<string, { hub: Hub; n: number }>();
  for (const e of events) {
    const r = hubsForEvent(c, e);
    const list = kind === 'artist' ? r.artists : [kind === 'festival' ? r.festival : kind === 'city' ? r.city : kind === 'country' ? r.country : r.genre];
    for (const h of list) {
      if (!h || h.slug === exclude || !isIndexable(h)) continue;
      const cur = seen.get(h.slug);
      if (cur) cur.n++; else seen.set(h.slug, { hub: h, n: 1 });
    }
  }
  return [...seen.values()].sort((a, b) => b.n - a.n || byUpcoming(a.hub, b.hub));
}

function hubsFrom(c: Catalog, kind: HubKind, events: CatalogEvent[], exclude?: string): Hub[] {
  return hubsCounted(c, kind, events, exclude).map((x) => x.hub).sort(byUpcoming);
}

/** Links whose count is the number of shows among `events` (not the hub's total). */
function countedLinks(c: Catalog, kind: HubKind, events: CatalogEvent[], limit: number, exclude?: string): LinkItem[] {
  return hubsCounted(c, kind, events, exclude).slice(0, limit).map(({ hub, n }) => hubLink(hub, plural(n, 'show')));
}

/**
 * Artists close to this one in the catalog: the ones it shares a bill with
 * count most, then the ones on the same festivals, then the busiest of its
 * genre. Only artists with upcoming shows, so every link leads to dates.
 */
function relatedArtists(c: Catalog, h: Hub, limit = 12): Hub[] {
  const score = new Map<string, number>();
  const bump = (events: CatalogEvent[], n: number) => {
    for (const e of events) for (const a of hubsForEvent(c, e).artists) {
      if (a.slug !== h.slug) score.set(a.slug, (score.get(a.slug) || 0) + n);
    }
  };
  bump(h.events, 10);
  for (const f of hubsFrom(c, 'festival', h.events)) bump(f.events, 3);
  const genre = hubsFrom(c, 'genre', h.events)[0];
  if (genre) bump(genre.upcoming, 0.01);
  return [...score.entries()]
    .map(([slug, n]) => ({ hub: c.artists.get(slug), n }))
    .filter((x): x is { hub: Hub; n: number } => Boolean(x.hub && isIndexable(x.hub)))
    .sort((a, b) => b.n - a.n || byUpcoming(a.hub, b.hub))
    .slice(0, limit)
    .map((x) => x.hub);
}

export function hubSections(c: Catalog, h: Hub): Section[] {
  const out: (Section | null)[] = [];
  switch (h.kind) {
    case 'artist': {
      out.push(eventsSection('upcoming', `Upcoming ${h.name} dates`, h.upcoming, MAX_EVENTS));
      out.push(linksSection('festivals', `${h.name} at festivals`, hubsFrom(c, 'festival', h.upcoming).map(festivalIndexLink)));
      out.push(linksSection('cities', `Where ${h.name} plays`, countedLinks(c, 'city', h.upcoming, 24)));
      out.push(linksSection('related', 'Related artists on tour', relatedArtists(c, h).map((x) => hubLink(x))));
      out.push(eventsSection('past', 'Past shows', h.past, MAX_PAST));
      out.push(linksSection('genre', 'More like this', hubsFrom(c, 'genre', h.events).slice(0, 3).map((g) => hubLink(g))));
      break;
    }
    case 'festival': {
      const ed = festivalEdition(h);
      if (ed) {
        out.push(eventsSection('edition', `${h.name} ${ed.year}: schedule`, ed.events, MAX_EVENTS));
        const lineup = festivalLineup(h, ed.events)
          .map((a) => c.artists.get(artistSlug(a)))
          .filter((x): x is Hub => Boolean(x))
          .map((x) => hubLink(x, x.upcoming.length ? `${plural(x.upcoming.length, 'date')} on tour` : undefined));
        out.push(linksSection('lineup', `${h.name} ${ed.year} lineup`, lineup));
        out.push(eventsSection('past', 'Earlier editions', h.past.filter((e) => !ed.events.includes(e)), MAX_PAST));
      }
      out.push(linksSection('more', 'More prog festivals', topHubs(c, 'festival', 12).filter((f) => f.slug !== h.slug).map(festivalIndexLink)));
      break;
    }
    case 'city': {
      out.push(eventsSection('upcoming', `Upcoming prog shows in ${h.name}`, h.upcoming, MAX_EVENTS));
      out.push(linksSection('artists', `Bands playing ${h.name}`, countedLinks(c, 'artist', h.upcoming, 40)));
      out.push(linksSection('festivals', `Festivals in ${h.name}`, hubsFrom(c, 'festival', h.events).map(festivalIndexLink)));
      const siblings = [...c.cities.values()].filter((x) => x.country === h.country && x.slug !== h.slug && isIndexable(x)).sort(byUpcoming).slice(0, 16);
      out.push(linksSection('nearby', h.country ? `More cities in ${theCountry(h.country)}` : 'More cities', siblings.map((x) => hubLink(x))));
      out.push(eventsSection('past', 'Past shows', h.past, MAX_PAST));
      break;
    }
    case 'country': {
      const cities = [...c.cities.values()].filter((x) => x.country === h.name && x.upcoming.length).sort(byUpcoming);
      out.push(linksSection('cities', `Cities in ${theCountry(h.name)}`, cities.map((x) => hubLink(x))));
      out.push(linksSection('festivals', `Prog festivals in ${theCountry(h.name)}`, hubsFrom(c, 'festival', h.events).map(festivalIndexLink)));
      out.push(eventsSection('upcoming', `Upcoming shows in ${theCountry(h.name)}`, h.upcoming, MAX_EVENTS,
        { name: `All shows in ${theCountry(h.name)} on the map`, path: `/?country=${encodeURIComponent(h.name)}#shows` }));
      out.push(linksSection('artists', 'Bands on tour here', countedLinks(c, 'artist', h.upcoming, 40)));
      out.push(linksSection('media', 'Prog news and reviews',
        MEDIA.filter((m) => m.countries.includes(h.slug)).map((m) => ({ name: m.name, path: m.url, note: m.blurb }))));
      break;
    }
    case 'genre': {
      out.push(eventsSection('upcoming', `Upcoming ${h.name} shows`, h.upcoming, MAX_EVENTS,
        { name: `All ${h.name} shows on the map`, path: `/?genre=${encodeURIComponent(h.name)}#shows` }));
      out.push(linksSection('artists', `${h.name} artists on tour`, countedLinks(c, 'artist', h.upcoming, 40)));
      out.push(linksSection('genres', 'Other subgenres', topHubs(c, 'genre').filter((g) => g.slug !== h.slug).map((g) => hubLink(g))));
      break;
    }
  }
  return out.filter((s): s is Section => Boolean(s));
}

function festivalIndexLink(f: Hub): LinkItem {
  const ed = festivalEdition(f);
  if (!ed) return hubLink(f);
  const place = festivalPlace(f, ed.events);
  return { name: `${f.name} ${ed.year}`, path: hubPath('festival', f.slug), note: [dateSpan(ed.events), place].filter(Boolean).join(' · ') };
}

// ---------- Metadata ----------

function miniEventLd(e: CatalogEvent, origin: string): Record<string, unknown> {
  const address: Record<string, unknown> = { '@type': 'PostalAddress', addressLocality: cityNameOf(e) || e.città };
  const country = countryNameOf(e);
  if (country) address.addressCountry = country;
  return {
    '@type': 'MusicEvent',
    name: e.nome_evento,
    startDate: e.data_ora,
    url: origin + eventPath(e),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: { '@type': 'Place', name: venueName(e) || cityNameOf(e) || e.città, address },
  };
}

function itemListLd(name: string, events: CatalogEvent[], origin: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: events.length,
    itemListElement: events.map((e, i) => ({ '@type': 'ListItem', position: i + 1, url: origin + eventPath(e), name: e.nome_evento })),
  };
}

export function hubMeta(c: Catalog, h: Hub, origin: string = SITE_URL): PageMeta {
  const copy = hubCopy(c, h);
  const canonical = origin + hubPath(h.kind, h.slug);
  const n = h.upcoming.length;
  const yr = yearRange(h.upcoming);
  const next = h.upcoming[0];
  const nextLine = next ? `Next: ${fmtShortDate(next.data_ora)} at ${venuePlace(next).split(', ').slice(0, 2).join(', ')}.` : '';
  const ld: Record<string, unknown>[] = [breadcrumbLd(copy.trail, origin)];
  let title = '';
  let description = '';

  switch (h.kind) {
    case 'artist': {
      const cities = topValues(h.upcoming, (e) => cityNameOf(e), 3);
      title = n ? fitTitle(`${h.name} tour dates${yr ? ` ${yr}` : ''}`, 'tickets and concerts') : fitTitle(`${h.name} concerts`, 'past shows');
      description = n
        ? `${h.name} tour dates${yr ? ` ${yr}` : ''}: ${plural(n, 'upcoming concert')}${cities.length ? ` in ${andList(cities)}` : ''}. ${nextLine} Venues and ticket links on ProgDealer.`
        : `${h.name} live: ${plural(h.past.length, 'past show')} in the ProgDealer catalog, with dates and venues. New dates appear here as soon as they are announced.`;
      const group: Record<string, unknown> = { '@context': 'https://schema.org', '@type': 'MusicGroup', name: h.name, url: canonical };
      const genre = topValues(h.events, (e) => (e.sottogenere || '').trim() || null, 1)[0];
      if (genre) group.genre = genre;
      if (n) group.event = h.upcoming.slice(0, 30).map((e) => miniEventLd(e, origin));
      ld.unshift(group);
      break;
    }
    case 'festival': {
      const ed = festivalEdition(h);
      const place = ed ? festivalPlace(h, ed.events) : '';
      const lineup = ed ? festivalLineup(h, ed.events) : [];
      title = fitTitle(ed ? `${h.name} ${ed.year}` : h.name, 'dates, lineup and tickets');
      description = ed
        ? `${h.name} ${ed.year}${place ? ` in ${place}` : ''}: ${dateSpan(ed.events)}.${lineup.length ? ` Lineup: ${lineup.slice(0, 5).join(', ')}${lineup.length > 5 ? ' and more' : ''}.` : ''} Dates, lineup and tickets on ProgDealer.`
        : `${h.name}: dates, lineup and tickets on ProgDealer.`;
      if (ed && ed.upcoming) {
        const first = ed.events[0];
        const last = ed.events[ed.events.length - 1];
        const fest: Record<string, unknown> = {
          '@context': 'https://schema.org',
          '@type': 'Festival',
          name: `${h.name} ${ed.year}`,
          url: canonical,
          startDate: first.data_ora,
          endDate: last.data_ora,
          eventStatus: 'https://schema.org/EventScheduled',
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          location: (miniEventLd(first, origin) as { location: unknown }).location,
          image: [origin + DEFAULT_IMAGE],
          description,
          subEvent: ed.events.map((e) => miniEventLd(e, origin)),
        };
        if (lineup.length) fest.performer = lineup.map((a) => ({ '@type': 'MusicGroup', name: a, url: origin + hubPath('artist', artistSlug(a)) }));
        if (h.festival?.website) fest.sameAs = h.festival.website;
        ld.unshift(fest);
      }
      break;
    }
    case 'city': {
      const artists = topValues(h.upcoming, (e) => cleanArtists(e.artisti)[0] || null, 3);
      title = fitTitle(`Prog concerts in ${h.name}${yr ? ` ${yr}` : ''}`, 'upcoming gigs');
      description = n
        ? `${plural(n, 'upcoming prog rock and prog metal gig')} in ${h.name}${artists.length ? `: ${andList(artists)}` : ''}. ${nextLine} Dates, venues and tickets on ProgDealer.`
        : `Prog concerts in ${h.name}: past shows and venues in the ProgDealer catalog.`;
      ld.unshift({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: copy.h1, url: canonical, description });
      if (n) ld.push(itemListLd(copy.h1, h.upcoming.slice(0, 30), origin));
      break;
    }
    case 'country': {
      const cities = topValues(h.upcoming, (e) => cityNameOf(e), 3);
      title = fitTitle(`Prog concerts in ${theCountry(h.name)}${yr ? ` ${yr}` : ''}`, 'tours and festivals');
      description = n
        ? `${plural(n, 'upcoming prog concert')} in ${theCountry(h.name)}${cities.length ? `, in ${listMore(cities, 99)}` : ''}: tours, festivals, venues and tickets on ProgDealer.`
        : `Prog concerts in ${theCountry(h.name)} in the ProgDealer catalog.`;
      ld.unshift({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: copy.h1, url: canonical, description });
      if (n) ld.push(itemListLd(copy.h1, h.upcoming.slice(0, 30), origin));
      break;
    }
    case 'genre': {
      title = fitTitle(`${h.name} concerts${yr ? ` ${yr}` : ''}`, 'upcoming shows worldwide');
      description = n
        ? `${plural(n, `upcoming ${h.name} show`)} worldwide. ${nextLine} Dates, venues and tickets on ProgDealer.`
        : `${h.name} concerts in the ProgDealer catalog.`;
      ld.unshift({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: copy.h1, url: canonical, description });
      if (n) ld.push(itemListLd(copy.h1, h.upcoming.slice(0, 30), origin));
      break;
    }
  }

  return {
    title,
    description: clip(description, DESC_MAX),
    canonical,
    image: origin + DEFAULT_IMAGE,
    robots: isIndexable(h) ? undefined : 'noindex, follow',
    jsonLd: ld,
  };
}

// ---------- Index pages ----------

/** "2027" from September on (the season people plan for), else this year. */
function festivalSeason(now: Date): string {
  const y = now.getUTCFullYear();
  return String(now.getUTCMonth() >= 8 ? y + 1 : y);
}

export function indexCopy(c: Catalog, kind: IndexKind, now: Date = new Date()): PageCopy {
  switch (kind) {
    case 'festivals': {
      const n = topHubs(c, 'festival').filter((f) => f.upcoming.length).length;
      return {
        eyebrow: 'Festivals',
        h1: `Prog festivals ${festivalSeason(now)}`,
        intro: `Every prog rock, prog metal and post-rock festival in the catalog, with dates, lineups and ticket links. ${plural(n, 'festival')} with an upcoming edition, from ArcTanGent to Be Prog! My Friend.`,
        trail: [{ name: 'Festivals', path: '/festivals' }],
      };
    }
    case 'artists': {
      const n = topHubs(c, 'artist').length;
      return {
        eyebrow: 'Artists',
        h1: 'Prog artists on tour',
        intro: `${plural(n, 'band and artist', 'bands and artists')} with upcoming dates in the catalog, A to Z. Each page lists the whole tour, with venues and ticket links.`,
        trail: [{ name: 'Artists', path: '/artists' }],
      };
    }
    case 'cities': {
      const countries = topHubs(c, 'country').length;
      const cities = topHubs(c, 'city').length;
      return {
        eyebrow: 'Cities and countries',
        h1: 'Prog concerts by city',
        intro: `Upcoming prog shows in ${plural(countries, 'country', 'countries')} and ${plural(cities, 'city', 'cities')}. Pick a place to see every gig and festival there.`,
        trail: [{ name: 'Countries', path: '/cities' }],
      };
    }
  }
}

export function indexSections(c: Catalog, kind: IndexKind): Section[] {
  switch (kind) {
    case 'festivals': {
      const all = topHubs(c, 'festival');
      const upcoming = all.filter((f) => f.upcoming.length).sort((a, b) => a.upcoming[0].data_ora.localeCompare(b.upcoming[0].data_ora));
      const past = all.filter((f) => !f.upcoming.length).sort((a, b) => a.name.localeCompare(b.name));
      return [
        linksSection('upcoming', 'Upcoming editions', upcoming.map(festivalIndexLink)),
        linksSection('past', 'Next edition not announced yet', past.map(festivalIndexLink)),
      ].filter((s): s is Section => Boolean(s));
    }
    case 'artists': {
      const all = topHubs(c, 'artist').sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
      const groups = new Map<string, Hub[]>();
      for (const a of all) {
        const ch = slugify(a.name).charAt(0).toUpperCase();
        const key = /[A-Z]/.test(ch) ? ch : '#';
        groups.set(key, [...(groups.get(key) || []), a]);
      }
      return [...groups.entries()]
        .sort(([a], [b]) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)))
        .map(([letter, list]) => ({
          id: `letter-${letter === '#' ? 'other' : letter.toLowerCase()}`,
          title: letter,
          links: list.map((a) => hubLink(a, `${plural(a.upcoming.length, 'date')}, next ${fmtShortDate(a.upcoming[0].data_ora)}`)),
        }));
    }
    case 'cities': {
      const countries = topHubs(c, 'country');
      return countries.map((co) => ({
        id: `country-${co.slug}`,
        title: co.name,
        links: [
          hubLink(co, `all ${plural(co.upcoming.length, 'show')}`),
          ...[...c.cities.values()].filter((x) => x.country === co.name && isIndexable(x)).sort(byUpcoming).map((x) => hubLink(x)),
        ],
      }));
    }
  }
}

export function indexMeta(c: Catalog, kind: IndexKind, origin: string = SITE_URL, now: Date = new Date()): PageMeta {
  const copy = indexCopy(c, kind, now);
  const canonical = origin + `/${kind}`;
  const ld: Record<string, unknown>[] = [breadcrumbLd(copy.trail, origin)];
  let title = '';
  let description = '';
  switch (kind) {
    case 'festivals': {
      const names = topHubs(c, 'festival').filter((f) => f.upcoming.length).slice(0, 4).map((f) => f.name);
      title = fitTitle(copy.h1, 'dates, lineups and tickets');
      description = `The complete list of prog rock and prog metal festivals for ${festivalSeason(now)}: ${listMore(names, 99)}, with dates, lineups and tickets.`;
      ld.unshift({
        '@context': 'https://schema.org', '@type': 'ItemList', name: copy.h1,
        itemListElement: topHubs(c, 'festival').filter((f) => f.upcoming.length).map((f, i) => ({ '@type': 'ListItem', position: i + 1, url: origin + hubPath('festival', f.slug), name: f.name })),
      });
      break;
    }
    case 'artists': {
      const top = topHubs(c, 'artist', 4).map((a) => a.name);
      title = fitTitle(`Prog bands on tour ${yearRange(c.events.filter((e) => eventDay(e) >= c.today))}`, 'tour dates A-Z');
      description = `Tour dates for every prog band in the catalog: ${listMore(top, 99)}. Venues and ticket links for each show.`;
      ld.unshift({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: copy.h1, url: canonical, description });
      break;
    }
    case 'cities': {
      const top = topHubs(c, 'city', 4).map((x) => x.name);
      title = fitTitle('Prog concerts by country and city');
      description = `Find prog rock and prog metal gigs near you: ${top.join(', ')} and every other city in the catalog, with dates, venues and tickets.`;
      ld.unshift({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: copy.h1, url: canonical, description });
      break;
    }
  }
  return { title, description: clip(description, DESC_MAX), canonical, image: origin + DEFAULT_IMAGE, jsonLd: ld };
}

// ---------- Event page links ----------

export function eventRelated(c: Catalog, e: CatalogEvent): EventRelated {
  const r = hubsForEvent(c, e);
  const trail: LinkItem[] = [];
  if (r.country && isIndexable(r.country)) trail.push({ name: r.country.name, path: hubPath('country', r.country.slug) });
  if (r.city && isIndexable(r.city)) trail.push({ name: r.city.name, path: hubPath('city', r.city.slug) });

  // Other dates of the headliner; for a festival show, the rest of the bill.
  const fest = festivalOf(e);
  const lead = r.artists[0];
  let moreDates: CatalogEvent[] = [];
  let moreDatesTitle = '';
  if (fest && r.festival) {
    const ed = festivalEdition(r.festival);
    moreDates = (ed ? ed.events : r.festival.upcoming).filter((x) => x.id !== e.id);
    moreDatesTitle = `More at ${r.festival.name}`;
  }
  if (!moreDates.length && lead) {
    moreDates = lead.upcoming.filter((x) => x.id !== e.id);
    moreDatesTitle = `More ${lead.name} dates`;
  }
  moreDates = moreDates.slice(0, 12);

  // What else is on in town: the next shows in the same city, not already listed above.
  const listed = new Set([e.id, ...moreDates.map((x) => x.id)]);
  const nearby = (r.city?.upcoming || []).filter((x) => !listed.has(x.id)).slice(0, 6);
  const cityName = r.city?.name || cityNameOf(e) || '';

  const link = (h?: Hub) => (h ? { name: h.name, path: hubPath(h.kind, h.slug) } : undefined);
  return {
    trail,
    // Every listed artist with a page, not only the ones the show counts for.
    artists: cleanArtists(e.artisti)
      .map((a) => c.artists.get(artistSlug(a)))
      .filter((h): h is Hub => Boolean(h))
      .map((h) => ({ name: h.name, path: hubPath('artist', h.slug) })),
    festival: link(r.festival),
    city: r.city && isIndexable(r.city) ? link(r.city) : undefined,
    country: r.country && isIndexable(r.country) ? link(r.country) : undefined,
    genre: r.genre && isIndexable(r.genre) ? link(r.genre) : undefined,
    moreDates: moreDates.map(eventLink),
    moreDatesTitle,
    nearby: nearby.map((x) => ({ name: x.nome_evento, path: eventPath(x), note: [fmtShortDate(x.data_ora), venueName(x)].filter(Boolean).join(' · ') })),
    nearbyTitle: cityName ? `More prog in ${cityName}` : undefined,
  };
}

// ---------- Embeddable widget (public/widget.js, /api/widget/<kind>/<slug>) ----------

export interface WidgetEvent {
  /** "2027-11-04" */
  date: string;
  /** Main line: the place for an artist, the show for everything else. */
  title: string;
  sub: string;
  url: string;
}

export interface WidgetData {
  kind: HubKind;
  slug: string;
  name: string;
  /** "Marillion tour dates", "Prog concerts in London". */
  title: string;
  url: string;
  /** Upcoming shows on the hub, more than `events` may hold. */
  total: number;
  events: WidgetEvent[];
}

export const WIDGET_MAX_EVENTS = 10;

/** "Marillion tour dates", "Prog concerts in the UK": the widget's heading and its link text. */
export function widgetTitle(kind: HubKind, name: string): string {
  switch (kind) {
    case 'artist': return `${name} tour dates`;
    case 'festival': return name;
    case 'genre': return `${name} concerts`;
    case 'country': return `Prog concerts in ${theCountry(name)}`;
    case 'city': return `Prog concerts in ${name}`;
  }
}

/** The HTML a site pastes: the widget box (with a plain link, kept in the page) and the script. */
export function widgetSnippet(kind: HubKind, slug: string, name: string, limit = 5, dark = false): string {
  const attrs = ['class="progdealer-widget"', `data-${kind}="${escapeHtml(slug)}"`, `data-limit="${limit}"`, dark ? 'data-theme="dark"' : '']
    .filter(Boolean).join(' ');
  return `<div ${attrs}><a href="${SITE_URL}${hubPath(kind, slug)}">${escapeHtml(widgetTitle(kind, name))}</a> on ProgDealer</div>\n`
    + `<script async src="${SITE_URL}/widget.js"></script>`;
}

/** "Listed on ProgDealer" badge linking to the page. */
export function badgeSnippet(kind: HubKind, slug: string, name: string): string {
  const alt = escapeHtml(`${name} on ProgDealer`);
  return `<a href="${SITE_URL}${hubPath(kind, slug)}" title="${alt}"><img src="${SITE_URL}/badge.svg" alt="${alt}" width="188" height="48" /></a>`;
}

export const WIDGET_PAGE_COPY: PageCopy = {
  eyebrow: 'For your site',
  h1: 'Prog dates on your website',
  intro: 'A free widget with the next shows of a band, a festival, a city or a country, kept up to date from the ProgDealer catalog. '
    + 'Paste two lines of HTML: no account, no cookies, no ads.',
  trail: [{ name: 'Widget', path: '/widget' }],
};

export const WIDGET_FAQ: [string, string][] = [
  ['Is it free?', 'Yes. The widget and the badge are free for any site: bands, festivals, venues, blogs, radio shows and fan clubs.'],
  ['How fresh are the dates?', 'The catalog is refreshed twice a month, on the 1st and the 16th, and shows sent in by fans are added once checked. The widget always shows the current list, so there is nothing to maintain on your side.'],
  ['Where does it work?', 'On any page that accepts HTML: WordPress (Custom HTML block), Squarespace (Code block), Wix (Embed code), Webflow, Ghost or plain HTML.'],
  ['Does it track my visitors?', 'No cookies and no personal data. Links to ProgDealer carry your site name as utm_source, so we can see which sites send visitors.'],
  ['Why the link under the widget?', 'It credits ProgDealer and leads people to the full listings. Please keep it: it is what keeps the widget free.'],
];

export function widgetPageMeta(origin: string = SITE_URL): PageMeta {
  return {
    title: 'Free prog concerts widget for your website | ProgDealer',
    description: 'Show the next prog rock and prog metal dates of a band, festival, city or country on your site. Free, always up to date, two lines of HTML.',
    canonical: `${origin}/widget`,
    image: origin + DEFAULT_IMAGE,
    jsonLd: [
      breadcrumbLd(WIDGET_PAGE_COPY.trail, origin),
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: WIDGET_FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
      },
    ],
  };
}

export function widgetPageBodyHtml(): string {
  const example = `<h2>Example</h2><pre>${escapeHtml(widgetSnippet('festival', 'arctangent', 'ArcTanGent'))}</pre>`;
  const faq = '<h2>Good to know</h2><dl>' + WIDGET_FAQ.map(([q, a]) => `<dt>${escapeHtml(q)}</dt><dd>${escapeHtml(a)}</dd>`).join('') + '</dl>';
  return pageBodyHtml(WIDGET_PAGE_COPY, [], example + faq);
}

export function widgetData(c: Catalog, kind: HubKind, slug: string, origin: string = SITE_URL): WidgetData | null {
  const h = hubsOf(c, kind).get(slug.toLowerCase());
  if (!h) return null;
  const title = widgetTitle(kind, h.name);
  const events = h.upcoming.slice(0, WIDGET_MAX_EVENTS).map((e): WidgetEvent => {
    // No venue line when the venue only repeats the city.
    const venue = venuePlace(e) === placeLabel(e) ? '' : venueName(e);
    if (kind === 'artist') return { date: eventDay(e), title: placeLabel(e) || venue, sub: venue, url: origin + eventPath(e) };
    if (kind === 'city') return { date: eventDay(e), title: e.nome_evento, sub: venue, url: origin + eventPath(e) };
    if (kind === 'country') return { date: eventDay(e), title: e.nome_evento, sub: [venue, cityNameOf(e)].filter(Boolean).join(', '), url: origin + eventPath(e) };
    return { date: eventDay(e), title: e.nome_evento, sub: venuePlace(e), url: origin + eventPath(e) };
  });
  return { kind, slug: h.slug, name: h.name, title, url: origin + hubPath(kind, h.slug), total: h.upcoming.length, events };
}

// ---------- Home ----------

export function browseLinks(c: Catalog): BrowseLinks {
  return {
    festivals: topHubs(c, 'festival').filter((f) => f.upcoming.length).sort((a, b) => a.upcoming[0].data_ora.localeCompare(b.upcoming[0].data_ora)).slice(0, 10).map(festivalIndexLink),
    artists: topHubs(c, 'artist', 24).map((a) => hubLink(a)),
    cities: topHubs(c, 'city', 16).map((x) => hubLink(x)),
    countries: topHubs(c, 'country', 16).map((x) => hubLink(x)),
    genres: topHubs(c, 'genre').map((g) => hubLink(g)),
  };
}

// ---------- HTML for the edge SSR ----------

export function pageHeadHtml(m: PageMeta): string {
  const parts = [
    `<title>${escapeHtml(m.title)}</title>`,
    `<meta name="description" content="${escapeHtml(m.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(m.canonical)}" />`,
  ];
  if (m.robots) parts.push(`<meta name="robots" content="${escapeHtml(m.robots)}" />`);
  parts.push(ogTwitter(m.title, m.description, m.canonical, m.image));
  for (const obj of m.jsonLd) parts.push(jsonLdScript(obj));
  return parts.join('\n    ');
}

function sectionHtml(s: Section): string {
  const list = s.events ? linkListHtml(s.events.map(eventLink)) : linkListHtml(s.links || []);
  const more = s.more ? `<p><a href="${escapeHtml(s.more.path)}">${escapeHtml(s.more.name)}</a>${s.more.note ? ` (${escapeHtml(s.more.note)})` : ''}</p>` : '';
  return `<section id="${escapeHtml(s.id)}"><h2>${escapeHtml(s.title)}</h2>${list}${more}</section>`;
}

export function pageBodyHtml(copy: PageCopy, sections: Section[], extra = ''): string {
  const crumbs = [{ name: SITE_NAME, path: '/' }, ...copy.trail];
  return [
    `<article style="${SSR_STYLE}">`,
    `<nav aria-label="Breadcrumb"><p>${crumbs.map((l) => `<a href="${escapeHtml(l.path)}">${escapeHtml(l.name)}</a>`).join(' › ')}</p></nav>`,
    `<p>${escapeHtml(copy.eyebrow)}</p>`,
    `<h1>${escapeHtml(copy.h1)}</h1>`,
    `<p>${escapeHtml(copy.intro)}</p>`,
    extra,
    ...sections.map(sectionHtml),
    `</article>`,
  ].join('');
}

export function hubBodyHtml(c: Catalog, h: Hub): string {
  const site = h.festival?.website
    ? `<p><a href="${escapeHtml(h.festival.website)}" rel="noopener">Official ${escapeHtml(h.name)} website</a></p>`
    : '';
  return pageBodyHtml(hubCopy(c, h), hubSections(c, h), site);
}

export function indexBodyHtml(c: Catalog, kind: IndexKind, now: Date = new Date()): string {
  return pageBodyHtml(indexCopy(c, kind, now), indexSections(c, kind));
}

/** Upcoming shows for the home's SSR body (soonest first). */
export function upcomingEvents(c: Catalog, limit: number): CatalogEvent[] {
  return c.events.filter((e) => eventDay(e) >= c.today).slice(0, limit);
}
