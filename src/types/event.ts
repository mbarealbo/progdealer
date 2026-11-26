export interface Event {
  id: string;
  nome_evento: string;
  data_ora: string;
  venue: string;
  città: string;
  sottogenere: string;
  descrizione?: string;
  artisti?: string[] | null;
  orario?: string;
  link: string;
  immagine?: string;
  lat?: number | null;
  lng?: number | null;
  fonte: string;
  tipo_inserimento: 'scraped' | 'manual';
  event_id?: string;
  status?: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

/**
 * What list views need of an event (cards, map, search, near you). The home
 * loads the whole upcoming catalog, so it selects only these columns: no
 * descriptions, ticket links or audit fields, which halve the payload.
 */
export type EventSummary = Pick<
  Event,
  'id' | 'nome_evento' | 'data_ora' | 'venue' | 'città' | 'sottogenere' | 'immagine' | 'artisti' | 'lat' | 'lng' | 'fonte'
>;
// Typed as string on purpose: supabase-js's select() type parser rejects the
// accented column name (città), though PostgREST accepts it. Callers type the
// rows with .overrideTypes<EventSummary[], { merge: false }>().
export const EVENT_SUMMARY_COLUMNS: string = 'id,nome_evento,data_ora,venue,città,sottogenere,immagine,artisti,lat,lng,fonte';

export interface EventFilters {
  città: string;
  sottogenere: string;
  searchQuery?: string;
  dataInizio: string;
  dataFine: string;
  excludedSubgenres: string[];
  countries: string[];
}

export interface ImportEvent {
  nome_evento: string;
  data_ora: string;
  venue: string;
  città: string;
  sottogenere?: string;
  descrizione?: string;
  artisti?: string[] | null;
  orario?: string;
  link: string;
  immagine?: string;
  lat?: number | null;
  lng?: number | null;
  fonte: string;
  tipo_inserimento: 'scraped' | 'manual';
  event_id?: string;
}

// Progressive subgenres for classification
export const PROG_SUBGENRES = [
  'Progressive Rock',
  'Prog Metal',
  'Symphonic Prog',
  'Canterbury Scene',
  'Krautrock',
  'Zeuhl',
  'Italian Prog',
  'Neo-Prog',
  'Avant-Prog',
  'Space Rock',
  'Psychedelic Prog',
  'Post-Rock',
  'Math Rock',
  'Progressive Electronic',
  'Fusion',
  'Progressive Folk',
  'RIO (Rock in Opposition)',
  'Eclectic Prog',
  'Crossover Prog',
  'Progressive'
] as const;

export type ProgSubgenre = typeof PROG_SUBGENRES[number];