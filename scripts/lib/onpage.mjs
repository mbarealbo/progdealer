// Guard against events the LLM extractor invents. Every event it returns must
// be backed by the page it read: the year of its date and its venue or city
// have to be written there.
//
// Why: in November 2026 the extractor turned a 2019 tour page with no years
// (The Flower Kings) into 17 shows in 2026-27, and a band homepage with no
// dates at all (Wobbler) into Marillion, Steve Hackett, Dream Theater,
// Porcupine Tree and Leprous shows. A Dutch magazine spotted them.

const fold = (s) => String(s || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/\s+/g, ' ').trim();

/** The page text without copyright lines: "© 2026" says nothing about a date. */
export function pageText(markdown) {
  return fold(String(markdown || '').split('\n').filter((l) => !/©|copyright/i.test(l)).join('\n'));
}

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * The year of the date, in any common spelling: 2026, '26, 12.03.26, 12/03/26.
 * Or no year but the weekday, which only fits one year in several: the
 * Bandsintown widget writes "Thu, NOV 26".
 */
function hasYear(text, date) {
  const m = String(date || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return false;
  const [, year, mo, d] = m;
  if (text.includes(year)) return true;
  const yy = year.slice(2);
  if (new RegExp(`(\\d[./-]${yy}|['’]${yy})(?!\\d)`).test(text)) return true;
  const wd = WEEKDAYS[new Date(Date.UTC(+year, +mo - 1, +d)).getUTCDay()];
  const mon = MONTHS[+mo - 1];
  const day = String(+d);
  return new RegExp(
    `\\b${wd}[a-z]*\\.?,?\\s+(${mon}[a-z]*\\.?\\s+0?${day}|0?${day}(st|nd|rd|th)?\\.?\\s+${mon})(?!\\d)`,
  ).test(text);
}

/** The venue, or the city before its first comma ("Deventer, Netherlands"). */
function hasPlace(text, raw) {
  const names = [raw.venue, String(raw.city || '').split(',')[0]]
    .map(fold).filter((n) => n.length >= 3 && !/^(tba|tbc|tbd)$/.test(n));
  return names.some((n) => text.includes(n));
}

/** Why the page does not back this event, or '' when it does. */
export function notOnPage(raw, text) {
  if (!hasYear(text, raw.startDate)) return 'year not on page';
  if (!hasPlace(text, raw)) return 'place not on page';
  return '';
}
