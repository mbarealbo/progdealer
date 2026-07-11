-- Venue/city-level coordinates for events, so the map and "Near you" can place
-- markers from stored lat/lng instead of re-deriving them from the città string.
--
-- Populated by:
--   • the scraper  (scripts/scrape-events.mjs) — city-level, from the offline geocoder
--   • the Add Event form — venue-level, captured from the Google Places picker
--
-- Existing rows stay NULL until backfilled; the app falls back to resolveCoords(città).
--
-- Apply in Supabase → SQL Editor (or `supabase db push`).

alter table public.eventi_prog
  add column if not exists lat double precision,
  add column if not exists lng double precision;

comment on column public.eventi_prog.lat is 'Latitude (WGS84). NULL → fall back to city-level coords from città.';
comment on column public.eventi_prog.lng is 'Longitude (WGS84). NULL → fall back to city-level coords from città.';
