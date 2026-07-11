import cityCoords from '../data/cityCoords.json';

export interface Coords {
  lat: number;
  lng: number;
  country: string | null;
  cc: string | null;
}

const TABLE = cityCoords as Record<string, Coords>;

// City-level coordinates resolved offline (see scripts/geocode-cities.mjs).
// Venue-level precision arrives with Google Places in a later step.
export function resolveCoords(città: string | undefined | null): Coords | null {
  if (!città) return null;
  return TABLE[città.toLowerCase()] ?? null;
}

// Best coordinates for an event: its own stored lat/lng (venue-level, from the
// Places picker or the scraper) if present, otherwise the city-level fallback.
export function coordsForEvent(
  e: { lat?: number | null; lng?: number | null; città?: string | null }
): Coords | null {
  if (typeof e.lat === 'number' && typeof e.lng === 'number') {
    return { lat: e.lat, lng: e.lng, country: null, cc: null };
  }
  return resolveCoords(e.città ?? null);
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
