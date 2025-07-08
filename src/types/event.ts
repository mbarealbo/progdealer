export interface Event {
  id: string;
  nome_evento: string;
  data_ora: string;
  venue: string;
  città: string;
  country?: string;
  sottogenere: string;
  descrizione?: string;
  artisti?: string[] | null;
  orario?: string;
  link: string;
  immagine?: string;
  fonte: string;
  tipo_inserimento: 'scraped' | 'manual';
  event_id?: string;
  status?: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface EventFilters {
  country: string;
  city: string;
  subgenre: string;
  dateRange: { start: string; end: string };
  excludedSubgenres?: string[];
  searchQuery?: string;
}
export interface ImportEvent {
  nome_evento: string;
  data_ora: string;
  venue: string;
  città: string;
  country?: string;
  country?: string;
  sottogenere?: string;
  descrizione?: string;
  artisti?: string[] | null;
  orario?: string;
  link: string;
  immagine?: string;
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