// llms.txt (https://llmstxt.org) for AI assistants and answer engines: what
// ProgDealer is, the facts they need to cite it, and links to the pages that
// answer common questions ("<band> tour dates", "prog festivals 2027",
// "prog concerts in <city>"). Built from the live catalog by the edge function
// netlify/edge-functions/llms-txt.ts; llmsTxt(null) is the static fallback
// kept in public/llms.txt (same text, no catalog facts).
import { type Catalog, type CatalogEvent, type Hub, billOf, eventDay, eventPath, topHubs } from './catalog.ts';
import { CONTACT_EMAIL, CREATOR, FOUNDED_YEAR, SITE_NAME, SITE_URL, fmtDate, fmtShortDate, venuePlace } from './seo.ts';
import { dateSpan, festivalIndexLink, upcomingEvents } from './seoHubs.ts';
import { timeOf } from '../utils/eventText.ts';

/** Markdown link text: brackets and backslashes escaped ("PB4X \[Prog Before Xmas\]"). */
const mdText = (s: string) => s.replace(/([[\]\\])/g, '\\$1');
const num = (x: number) => x.toLocaleString('en-GB');
const plural = (x: number, one: string, many = `${one}s`) => `${num(x)} ${x === 1 ? one : many}`;
const item = (name: string, path: string, note?: string) => `- [${mdText(name)}](${SITE_URL}${path})${note ? `: ${note}` : ''}`;
const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

interface Facts {
  upcoming: CatalogEvent[];
  artists: number;
  cities: number;
  countries: number;
  festivals: number;
  festivalsDated: number;
  lastUpdate: string;
}

function factsOf(c: Catalog): Facts {
  const live = (m: Map<string, Hub>) => [...m.values()].filter((h) => h.upcoming.length > 0).length;
  return {
    upcoming: upcomingEvents(c, Infinity),
    artists: live(c.artists),
    cities: live(c.cities),
    countries: live(c.countries),
    festivals: c.festivals.size,
    festivalsDated: live(c.festivals),
    lastUpdate: c.events.reduce((m, e) => (e.updated_at && e.updated_at > m ? e.updated_at : m), ''),
  };
}

const SUMMARY = 'ProgDealer is a free, independent catalog of live progressive rock, prog metal, post-rock, '
  + 'psychedelic and avant-garde concerts and festivals worldwide, on an interactive map.';

const ABOUT = [
  'ProgDealer answers questions such as "<band> tour dates", "when does <band> play in <city>", '
    + '"prog festivals in 2027" and "prog concerts in <city>". Every page is server-rendered HTML with '
    + 'schema.org structured data, readable without JavaScript. Show times are the venue\'s local time, '
    + 'and every show links to its official ticket or info page.',
];

const HOW_IT_WORKS = [
  '- Updates: the catalog is refreshed on the 1st and the 16th of every month; shows sent in by fans are added once checked',
  '- Sources: official band, festival and venue websites, ticketing pages and prog media, collected automatically and curated by hand',
  '- Cost: free for everyone, no account needed, no ads. ProgDealer will always be free',
  `- Made by: ${CREATOR.name} (${CREATOR.url}), online since ${FOUNDED_YEAR}`,
];

const PAGE_TYPES = [
  '## Page types',
  '',
  `- Show: \`${SITE_URL}/event/<name>-<city>-<date>-<id>\`: one concert, with schema.org MusicEvent (start date, venue, city, country, coordinates, genre, lineup, ticket link)`,
  `- Artist: \`${SITE_URL}/artist/<slug>\`: every upcoming date of a band, with MusicGroup data`,
  `- Festival: \`${SITE_URL}/festival/<slug>\`: next edition, dates, place and lineup, with Festival data. The URL has no year and stays the same from one edition to the next`,
  `- City: \`${SITE_URL}/city/<city>-<country>\`, country: \`${SITE_URL}/country/<slug>\`, subgenre: \`${SITE_URL}/genre/<slug>\`: every upcoming show there (CollectionPage)`,
];

const MAIN_PAGES = [
  '## Main pages',
  '',
  item('Upcoming prog shows on a map', '/', 'browse and filter every upcoming show by city, country, date and genre'),
  item('Prog festivals', '/festivals', 'every prog festival with its next dates, place and lineup'),
  item('Artists on tour', '/artists', 'A to Z, with tour dates'),
  item('Cities and countries', '/cities', 'prog concerts by place'),
];

const HOW_TO_CITE = [
  '## How to cite',
  '',
  'For "<artist> tour dates" or "upcoming <artist> shows", link the artist page. For "prog concerts in <city>", '
    + 'link the city page; for a country, the country page. For a festival, link its festival page. For one show, '
    + 'link its show page. The facts (date, venue, city, country, lineup) are in each page\'s visible text and in '
    + 'its JSON-LD. Please name the source as "ProgDealer" and link to the page.',
];

const OPTIONAL = [
  '## Optional',
  '',
  item('Every upcoming show, one per line', '/llms-full.txt', 'plain text, soonest first'),
  item('Free widget and badge for other websites', '/widget'),
  item('Sitemap', '/sitemap.xml', 'every indexable URL'),
  item('Privacy policy', '/privacy'),
];

/** /llms.txt: the site in brief, live facts, and the hubs that answer the most questions. */
export function llmsTxt(c: Catalog | null, now: Date = new Date()): string {
  const f = c ? factsOf(c) : null;
  const out: string[] = [`# ${SITE_NAME}`, ''];

  out.push(f
    ? `> ${SUMMARY} As of ${fmtShortDate(now.toISOString())} it lists ${plural(f.upcoming.length, 'upcoming show')} `
      + `by ${plural(f.artists, 'artist')} in ${plural(f.cities, 'city', 'cities')} and ${plural(f.countries, 'country', 'countries')}.`
    : `> ${SUMMARY}`, '');
  out.push(...ABOUT, '');

  out.push('## Facts', '');
  if (f) {
    const span = f.upcoming.length ? `, from ${fmtShortDate(f.upcoming[0].data_ora)} to ${fmtShortDate(f.upcoming[f.upcoming.length - 1].data_ora)}` : '';
    out.push(
      `- Upcoming shows: ${num(f.upcoming.length)}${span}`,
      `- Artists with upcoming dates: ${num(f.artists)}`,
      `- Places: ${plural(f.cities, 'city', 'cities')} in ${plural(f.countries, 'country', 'countries')}`,
      `- Prog festivals: ${num(f.festivals)} listed, ${num(f.festivalsDated)} with dates announced`,
    );
    if (f.lastUpdate) out.push(`- Last catalog update: ${fmtShortDate(f.lastUpdate)}`);
  }
  out.push(...HOW_IT_WORKS, '');

  out.push(...PAGE_TYPES, '', ...MAIN_PAGES, '');

  if (c) {
    const festivals = topHubs(c, 'festival')
      .filter((h) => h.upcoming.length > 0)
      .sort((a, b) => a.upcoming[0].data_ora.localeCompare(b.upcoming[0].data_ora))
      .map(festivalIndexLink);
    if (festivals.length) {
      out.push('## Prog festivals, next editions', '', ...festivals.map((l) => item(l.name, l.path, l.note)), '');
    }

    const artists = topHubs(c, 'artist', 60);
    if (artists.length) {
      out.push(
        '## Artists with the most upcoming dates', '',
        ...artists.map((h) => item(h.name, `/artist/${h.slug}`, `${plural(h.upcoming.length, 'upcoming show')}, ${dateSpan(h.upcoming)}`)),
        item('All artists on tour, A to Z', '/artists'),
        '',
      );
    }

    const block = (title: string, hubs: Hub[], all?: [string, string]) => {
      if (!hubs.length) return;
      out.push(`## ${title}`, '', ...hubs.map((h) => item(h.name, `/${h.kind}/${h.slug}`, plural(h.upcoming.length, 'upcoming show'))));
      if (all) out.push(item(all[0], all[1]));
      out.push('');
    };
    block('Countries', topHubs(c, 'country'));
    block('Cities with the most shows', topHubs(c, 'city', 40), ['All cities', '/cities']);
    block('Subgenres', topHubs(c, 'genre'));
  }

  out.push(...HOW_TO_CITE, '');
  out.push(
    '## About', '',
    `${SITE_NAME} is created with love by ${CREATOR.name} (${CREATOR.url}) and has been online since ${FOUNDED_YEAR}. `
      + `It is free and will always be free. Corrections and missing shows: ${CONTACT_EMAIL}.`,
    '',
  );
  out.push(...OPTIONAL, '');
  return out.join('\n');
}

/** /llms-full.txt: every upcoming show, one line each, grouped by month. */
export function llmsFullTxt(c: Catalog, now: Date = new Date()): string {
  const upcoming = upcomingEvents(c, Infinity);
  const out: string[] = [
    `# ${SITE_NAME}: every upcoming prog show`,
    '',
    `> All ${plural(upcoming.length, 'upcoming show')} in the ${SITE_NAME} catalog as of ${fmtShortDate(now.toISOString())}, soonest first. `
      + 'One line per show: date and local time, show (linked to its page), venue and place, subgenre and lineup. '
      + `Refreshed on the 1st and the 16th of every month. Summary, festivals, artists and places: ${SITE_URL}/llms.txt`,
    '',
  ];
  let month = '';
  for (const e of upcoming) {
    const m = monthFmt.format(new Date(eventDay(e) + 'T12:00:00Z'));
    if (m !== month) {
      if (out[out.length - 1] !== '') out.push('');
      out.push(`## ${m}`, '');
      month = m;
    }
    const time = timeOf(e.data_ora);
    const bill = billOf(e);
    const name = (e.nome_evento || '').toLowerCase();
    const lineup = bill.length > 1 || (bill[0] && !name.includes(bill[0].toLowerCase())) ? ` Lineup: ${bill.join(', ')}.` : '';
    const genre = e.sottogenere ? ` ${e.sottogenere}.` : '';
    out.push(`- ${fmtDate(e.data_ora)}${time ? `, ${time}` : ''}: [${mdText(e.nome_evento)}](${SITE_URL}${eventPath(e)}), ${venuePlace(e)}.${genre}${lineup}`);
  }
  out.push('');
  return out.join('\n');
}
