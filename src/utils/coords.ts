import cityCoords from '../data/cityCoords.json';
import { getEventCountry, getContinent, normalizeCountry, continentAt, inAmericas, hasNoCity } from './geo';

export interface Coords {
  lat: number;
  lng: number;
  country: string | null;
  cc: string | null;
}

const TABLE = cityCoords as Record<string, Coords>;

type Placeable = { lat?: number | null; lng?: number | null; città?: string | null };

// A point is plausible for a country when both sit on the same side of the
// Atlantic: that catches bad geocodes like "Warszawa" landing in Ohio.
function plausible(c: { lng: number }, country: string): boolean {
  const continent = getContinent(country);
  return continent === 'Other' || inAmericas(continent) === c.lng < -30;
}

// City-level coordinates resolved offline (see scripts/geocode-cities.mjs).
// Venue-level precision arrives with Google Places in a later step.
export function resolveCoords(città: string | undefined | null): Coords | null {
  if (!città || hasNoCity(città)) return null;
  return TABLE[città.toLowerCase()] ?? null;
}

// Best coordinates for an event: its own stored lat/lng (venue-level, from the
// Places picker or the scraper) if present and plausible, otherwise the
// city-level fallback. Placeholders ("Unknown", "Various venues", a bare
// country) get no pin at all.
export function coordsForEvent(e: Placeable): Coords | null {
  if (hasNoCity(e.città)) return null;
  const country = getEventCountry(e.città ?? '');
  if (typeof e.lat === 'number' && typeof e.lng === 'number' && plausible({ lng: e.lng }, country)) {
    return { lat: e.lat, lng: e.lng, country: null, cc: null };
  }
  const table = resolveCoords(e.città ?? null);
  return table && plausible(table, country) ? table : null;
}

/** Country of an event: from its text, else from the offline city table. */
export function eventCountry(e: Placeable): string {
  const fromText = getEventCountry(e.città ?? '');
  if (fromText !== 'Other') return fromText;
  const table = resolveCoords(e.città ?? null);
  return table?.country ? normalizeCountry(table.country) : 'Other';
}

/** Continent of an event: from its country, else from where its pin sits. */
export function eventContinent(e: Placeable): string {
  const continent = getContinent(eventCountry(e));
  if (continent !== 'Other') return continent;
  const c = coordsForEvent(e);
  return c ? continentAt(c.lat, c.lng) : 'Other';
}

// Great-circle distance in km.
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
