// ---------------------------------------------------------------------------
// Deterministic parser for GigPress listing pages (theprogressiveaspect.net's
// UK gig guide) from their Firecrawl *markdown* render.
//
// The page is ~1.4MB — far past what the schema-driven LLM extraction can
// digest (it silently returns zero events) — but GigPress markup is machine-
// generated and regular, so a plain parse gets every gig for 1 credit
// (markdown scrape) instead of 5 (LLM extraction) with nothing lost:
//
//   #### [CUNNINGHAM, Rosalie](https://...)
//   | Date | City / Town | Venue & Website Link | ... |
//   | 05/11/26 (Thu) | BRADFORD | [Nightrain](https://nightrain.co.uk/) | ...
//     ...Add to Google Calendar](...&dates=20261105/20261105&...) |
//
// Returns raw events in the same shape the LLM extractor yields, so the rest
// of the pipeline (normalize → dedup → geocode) is shared.
// ---------------------------------------------------------------------------

const titleCase = (s) =>
  s.toLowerCase().replace(/(^|[\s\-'’(.])[a-z]/g, (m) => m.toUpperCase());

// "CUNNINGHAM, Rosalie" → "Rosalie Cunningham";
// "ANDERSON, Jon \[& the Band Geeks\]" → "Jon Anderson & The Band Geeks";
// "BIG BIG TRAIN" stays "Big Big Train".
export function artistName(raw) {
  let s = String(raw || '').replace(/\\([[\]])/g, '$1').trim();
  const m = s.match(/^([^,]+),\s*([^[]+?)\s*(\[.+?\]?)?$/);
  if (m) s = [m[2], m[1], (m[3] || '').replace(/[[\]]/g, '')].filter(Boolean).join(' ');
  return titleCase(s).replace(/\s+/g, ' ').trim();
}

export function parseGigpress(md, pageUrl) {
  const events = [];
  for (const sec of String(md || '').split(/^#### \[/m).slice(1)) {
    const nameEnd = sec.indexOf('](');
    if (nameEnd < 0) continue;
    const artist = artistName(sec.slice(0, nameEnd));
    if (!artist) continue;
    for (const line of sec.split('\n')) {
      // Gig rows are table lines that open with a DD/MM/YY date.
      const dm = line.match(/^\|\s*(\d{2})\/(\d{2})\/(\d{2})\s*(?:\([^)]*\))?\s*\|/);
      if (!dm) continue;
      // Prefer the unambiguous YYYYMMDD in the "Add to Google Calendar" link.
      const gcal = line.match(/dates=(\d{4})(\d{2})(\d{2})/);
      const startDate = gcal ? `${gcal[1]}-${gcal[2]}-${gcal[3]}` : `20${dm[3]}-${dm[2]}-${dm[1]}`;
      const cells = line.split('|').map((c) => c.trim());
      // cells: [ '', date, city, venue, address, support, add… ]
      const city = titleCase((cells[2] || '').replace(/[[\]]|\(.*?\)/g, '').trim());
      const vm = (cells[3] || '').match(/\[([^\]]+)\]\(([^)]+)\)/);
      const venue = vm ? vm[1].trim() : (cells[3] || '').replace(/[[\]]/g, '').trim();
      if (!city && !venue) continue;
      events.push({
        name: artist,
        startDate,
        venue,
        city,
        country: 'UK',
        artists: [artist],
        url: vm ? vm[2] : pageUrl,
      });
    }
  }
  return events;
}
