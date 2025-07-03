export interface Event {
  id: string;
  nome_evento: string;
  data_ora: string;
  luogo: string;
  venue: string;
  genere: string;
  link_biglietti: string;
  fonte: string;
  created_at: string;
  updated_at: string;
}

export interface EventFilters {
  luogo: string;
  genere: string;
  dataInizio: string;
  dataFine: string;
  excludedGenres?: string[];
}