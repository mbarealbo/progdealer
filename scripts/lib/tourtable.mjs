// ---------------------------------------------------------------------------
// Deterministic parser for tour pages that print their dates as a plain table
// (rush.com), from their Firecrawl *markdown* render.
//
// The LLM extraction stops partway through a long tour: on rush.com it
// returned 18 of 48 upcoming dates, none of them in 2027. A table is regular
// enough to read as it is, for 1 credit (markdown scrape) instead of 5:
//
//   | Date | Location | Venue | Comments |
//   | January 15, 2027 | [Buenos Aires, AR](https://...) | Movistar Arena | [Tickets](https://...) |
//
// Columns are found by their header (date; location or city; venue), so the
// same parser reads any page laid out this way. Returns raw events in the
// shape the LLM extractor yields, so normalize, dedup and geocode are shared.
// ---------------------------------------------------------------------------

import { CA_PROVINCES, US_STATES } from './geocode.mjs';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// "Uncasville, Connecticut" -> "Uncasville, CT, USA": the code is what the
// site's classifier reads, the country settles "DE" (Delaware, not Germany).
const REGIONS = new Map([
  ...Object.entries(US_STATES).map(([code, name]) => [name.toLowerCase(), `${code}, USA`]),
  ...Object.entries(CA_PROVINCES).map(([code, name]) => [name.toLowerCase(), `${code}, Canada`]),
]);

const text = (cell) => cell.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_\\]/g, '').trim();
const link = (cell) => (cell.match(/\]\((https?:\/\/[^)\s]+)\)/) || [])[1];

/** "January 15, 2027", "15 January 2027", "Jan 15 2027" -> "2027-01-15"; no year, no date. */
export function isoDate(raw) {
  const s = raw.toLowerCase().replace(/(\d)(st|nd|rd|th)\b/g, '$1').replace(/,/g, ' ');
  const m = s.match(/\b([a-z]{3})[a-z]*\.?\s+(\d{1,2})\s+(\d{4})\b/) || s.match(/\b(\d{1,2})\s+([a-z]{3})[a-z]*\.?\s+(\d{4})\b/);
  if (!m) return null;
  const [month, day] = /^\d/.test(m[1]) ? [m[2], m[1]] : [m[1], m[2]];
  const mo = MONTHS.indexOf(month);
  if (mo < 0) return null;
  return `${m[3]}-${String(mo + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/** "Washington D.C." -> "Washington, DC"; "Tampa, Florida" -> "Tampa, FL, USA"; the rest as written. */
export function place(raw) {
  if (/^washington,?\s*d\.?\s*c\.?$/i.test(raw)) return 'Washington, DC';
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  const region = parts.length > 1 && REGIONS.get(parts.at(-1).toLowerCase());
  return region ? [...parts.slice(0, -1), region].join(', ') : parts.join(', ');
}

export function parseTourTable(md, pageUrl, artist) {
  const events = [];
  let cols = null; // null: the next table line is a header; false: a table that isn't dates
  for (const line of String(md || '').split('\n')) {
    if (!line.trim().startsWith('|')) { cols = null; continue; }
    const cells = line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    if (cols === null) {
      const head = cells.map((c) => text(c).toLowerCase());
      const at = (re) => head.findIndex((h) => re.test(h));
      const date = at(/^date/), where = at(/location|city/), venue = at(/venue/);
      cols = date >= 0 && (where >= 0 || venue >= 0) ? { date, where, venue } : false;
      continue;
    }
    if (!cols || cells.every((c) => /^:?-*:?$/.test(c))) continue;
    const startDate = isoDate(text(cells[cols.date] || ''));
    if (!startDate) continue;
    const city = cols.where >= 0 ? place(text(cells[cols.where] || '')) : '';
    const venue = cols.venue >= 0 ? text(cells[cols.venue] || '') : '';
    // A ticket link if the row has one, else the show's own page.
    const url = cells.map((c) => (/ticket/i.test(c) ? link(c) : null)).find(Boolean) || link(cells[cols.where] || '') || pageUrl;
    events.push({ name: artist, startDate, venue, city, country: '', artists: [artist], url });
  }
  return events;
}
