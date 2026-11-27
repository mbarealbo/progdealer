// Small text helpers shared by the event cards and the event page.
//
// `data_ora` holds the show's local wall-clock time stored without a timezone
// (the scraper writes "2026-11-07T20:00:00", Postgres keeps it as UTC). So we
// format it in UTC: that prints the time as announced by the venue, and keeps
// the date from shifting for viewers in other timezones. 00:00 means "time not
// announced" (the scraper's default when a listing has no start time).

/**
 * "Banco del Mutuo Soccorso: Storie Invisibili Tour" (or " - ") -> main + sub.
 * Catalog names use a colon where sources put a dash, see noDashes().
 */
export function splitTitle(name: string): { main: string; sub: string } {
  const s = (name || '').trim();
  let m = s.match(/^(.+?)(?:\s+[-\u2013\u2014]\s+|:\s+)(.+)$/);
  // "X Presents: Y" names the promoter, not the show.
  if (m && /\bpresents?$/i.test(m[1])) m = s.match(/^(.+?)\s+[-\u2013\u2014]\s+(.+)$/);
  if (m) return { main: m[1].trim(), sub: m[2].trim() };
  return { main: s, sub: '' };
}

/**
 * House style: no em or en dashes in catalog text. A dash inside a word or
 * a range ("2026\u20132027") becomes a hyphen. A dash between words becomes a
 * colon after a title's first part ("BEAT \u2014 Performing the music of King
 * Crimson" -> "BEAT: Performing\u2026"), a comma anywhere else, and goes away
 * after punctuation ("BIG! \u2013 Premio" -> "BIG! Premio") or at either end.
 * Mirrored in scripts/lib/text.mjs for the scraper: keep the two in step.
 */
export function noDashes(text: string, kind: 'title' | 'text' = 'text'): string {
  if (!text || !/[\u2013\u2014]/.test(text)) return text;
  const joined = text.replace(/(\S)[\u2013\u2014](?=\S)/g, '$1-');
  let colon = kind === 'title' && !joined.includes(':');
  return joined.replace(/\s*[\u2013\u2014]\s*/g, (dash, at: number, all: string) => {
    const before = all.slice(0, at).trimEnd();
    if (!before || !all.slice(at + dash.length).trim()) return '';
    if (/[!?.,:;]$/.test(before)) return ' ';
    if (colon) { colon = false; return ': '; }
    return ', ';
  }).trim();
}

const UTC = { timeZone: 'UTC' } as const;
const weekdayFmt = new Intl.DateTimeFormat('en-GB', { ...UTC, weekday: 'short' });
const dayMonthFmt = new Intl.DateTimeFormat('en-GB', { ...UTC, day: '2-digit', month: 'short' });
const timeFmt = new Intl.DateTimeFormat('en-GB', { ...UTC, hour: '2-digit', minute: '2-digit', hour12: false });
const fullFmt = new Intl.DateTimeFormat('en-GB', { ...UTC, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export function hasTime(iso: string): boolean {
  const d = new Date(iso);
  return d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0;
}

/** "Sat 07 Nov" */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${weekdayFmt.format(d)} ${dayMonthFmt.format(d)}`;
}

/** "Sat 07 Nov 2026 · 20:00" (time left out when not announced) */
export function longDate(iso: string): string {
  const d = new Date(iso);
  const base = `${shortDate(iso)} ${d.getUTCFullYear()}`;
  return hasTime(iso) ? `${base} · ${timeFmt.format(d)}` : base;
}

/** "Saturday 7 November 2026" */
export function fullDate(iso: string): string {
  return fullFmt.format(new Date(iso));
}

/** "20:00", or null when the time was not announced. */
export function timeOf(iso: string): string | null {
  return hasTime(iso) ? timeFmt.format(new Date(iso)) : null;
}

/** Day of the show as YYYY-MM-DD, as announced. */
export function showDay(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function localDay(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isTonight(iso: string): boolean {
  return showDay(iso) === localDay();
}

export function isThisWeek(iso: string): boolean {
  const day = showDay(iso);
  return day >= localDay() && day <= localDay(6);
}
