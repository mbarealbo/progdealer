// Small text helpers shared by the event cards and the event page.
//
// `data_ora` holds the show's local wall-clock time stored without a timezone
// (the scraper writes "2026-11-07T20:00:00", Postgres keeps it as UTC). So we
// format it in UTC: that prints the time as announced by the venue, and keeps
// the date from shifting for viewers in other timezones. 00:00 means "time not
// announced" (the scraper's default when a listing has no start time).

/** "Banco del Mutuo Soccorso - Storie Invisibili Tour" -> main + sub. */
export function splitTitle(name: string): { main: string; sub: string } {
  const m = (name || '').match(/^(.+?)\s+[-\u2013\u2014]\s+(.+)$/);
  if (m) return { main: m[1].trim(), sub: m[2].trim() };
  return { main: (name || '').trim(), sub: '' };
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
