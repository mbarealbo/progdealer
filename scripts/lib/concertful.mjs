// ---------------------------------------------------------------------------
// Deterministic parser for Concertful artist pages (concertful.com/tour/<slug>/)
// from their Firecrawl *markdown* render. One page lists all of an artist's
// upcoming dates, unpaginated, for 1 credit:
//
//   ## Upcoming concerts (38)
//   | MonNov 162026 | [Soen](https://concertful.com/event/991230)Zeche·<br> Bochum, <br> Germany | > |
//
// Concertful's area pages, by contrast, list every genre by date, 50 rows a
// page: page one is today only, so they gave about 4 prog events each.
//
// Returns raw events in the shape the LLM extractor yields.
// ---------------------------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function parseConcertful(md, pageUrl) {
  const events = [];
  // Only the "Upcoming concerts" table: past shows and similar artists follow.
  const upcoming = String(md || '').split(/^## /m).find((s) => /^Upcoming concerts/i.test(s)) || '';
  for (const line of upcoming.split('\n')) {
    // "MonNov 162026": weekday, month, two-digit day, year run together.
    const d = line.match(/^\|\s*[A-Z][a-z]{2}([A-Z][a-z]{2})\s*(\d{2})(\d{4})\s*\|([^|]*)\|/);
    if (!d || !MONTHS.includes(d[1])) continue;
    const c = d[4].match(/\[([^\]]+)\]\(([^)\s]+)\)(.*)$/);
    if (!c) continue;
    const [venue, ...where] = c[3].split('·');
    const city = where.join(' ').split(/<br>|,/).map((p) => p.trim()).filter(Boolean).join(', ');
    const name = c[1].trim();
    events.push({
      name,
      startDate: `${d[3]}-${String(MONTHS.indexOf(d[1]) + 1).padStart(2, '0')}-${d[2]}`,
      venue: venue.trim(),
      city,
      country: '',
      artists: name.split(/\s+with\s+/i).map((a) => a.trim()).filter(Boolean),
      url: c[2] || pageUrl,
    });
  }
  return events;
}
