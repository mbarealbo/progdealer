// ---------------------------------------------------------------------------
// Bands whose tour page is a Seated widget (porcupinetree.com, ozrics.com...)
// load their dates from a public JSON feed. Reading the feed directly costs no
// Firecrawl credit and needs no LLM: it is the band's own list, as published.
// The tour id is the widget's `data-artist-id`.
//
// Returns raw events in the shape the LLM extractor yields.
// ---------------------------------------------------------------------------

export async function fetchSeated(tourId, artist) {
  const res = await fetch(`https://cdn.seated.com/api/tour/${tourId}?include=tour-events`);
  if (!res.ok) throw new Error(`Seated returned HTTP ${res.status}`);
  const body = await res.json();
  const name = body?.data?.attributes?.name || artist;
  return (body.included || [])
    .filter((i) => i.type === 'tour-events')
    .map(({ id, attributes: a }) => ({
      name,
      startDate: a['starts-at-date-local'] || '',
      venue: (a['venue-name'] || '').replace(/\s+/g, ' ').trim(),
      // "Bournemouth , UK" -> "Bournemouth, UK"
      city: (a['formatted-address'] || '').split(',').map((p) => p.trim()).filter(Boolean).join(', '),
      country: '',
      artists: [name],
      url: `https://link.seated.com/${id}`,
      description: a.details || '',
    }));
}
