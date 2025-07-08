import { createClient } from '@supabase/supabase-js';
import { Event, ImportEvent } from '../types/event';
import { shouldUsePlaceholder } from '../utils/imageUtils';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      eventi_prog: {
        Row: Event;
        Insert: Omit<Event, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Event, 'id' | 'created_at'>> & {
          updated_at?: string;
        };
      };
    };
    Functions: {
      upsert_evento: {
        Args: {
          p_nome_evento: string;
          p_data_ora: string;
          p_venue: string;
          p_città: string;
          p_sottogenere?: string;
          p_descrizione?: string;
          p_artisti?: string[];
          p_orario?: string;
          p_link?: string;
          p_immagine?: string;
          p_fonte?: string;
          p_tipo_inserimento?: string;
          p_event_id?: string;
        };
        Returns: string;
      };
    };
  };
};

// Utility function to import events with deduplication
export async function importEvents(events: ImportEvent[]) {
  const results = [];
  
  for (const event of events) {
    try {
      // Clean up image URL - set to null if it should use placeholder
      const cleanedImageUrl = shouldUsePlaceholder(event.immagine) ? null : event.immagine;
      
      const { data, error } = await supabase.rpc('upsert_evento', {
        p_nome_evento: event.nome_evento,
        p_data_ora: event.data_ora,
        p_venue: event.venue,
        p_città: event.città,
        p_sottogenere: event.sottogenere || 'Progressive',
        p_descrizione: event.descrizione,
        p_artisti: event.artisti,
        p_orario: event.orario,
        p_link: event.link,
        p_immagine: cleanedImageUrl,
        p_fonte: event.fonte,
        p_tipo_inserimento: event.tipo_inserimento,
        p_event_id: event.event_id
      });

      if (error) {
        console.error('Error importing event:', event.nome_evento, error);
        results.push({ success: false, event: event.nome_evento, error: error.message });
      } else {
        results.push({ success: true, event: event.nome_evento, id: data });
      }
    } catch (err) {
      console.error('Exception importing event:', event.nome_evento, err);
      results.push({ success: false, event: event.nome_evento, error: String(err) });
    }
  }
  
  return results;
}

// Utility function to classify subgenre based on keywords
export function classifySubgenre(eventName: string, description?: string, artists?: string[]): string {
  const text = [eventName, description, ...(artists || [])].join(' ').toLowerCase();
  
  const keywords = {
    'Prog Metal': ['metal', 'dream theater', 'tool', 'opeth', 'mastodon', 'gojira'],
    'Krautrock': ['neu!', 'kraftwerk', 'can', 'motorik', 'kraut', 'german'],
    'Canterbury Scene': ['soft machine', 'caravan', 'gong', 'canterbury'],
    'Zeuhl': ['magma', 'univers zero', 'zeuhl', 'kobaïan'],
    'Italian Prog': ['pfm', 'banco', 'area', 'italian'],
    'Neo-Prog': ['marillion', 'pendragon', 'iq', 'neo'],
    'Symphonic Prog': ['yes', 'genesis', 'king crimson', 'emerson', 'symphonic', 'orchestra'],
    'Space Rock': ['hawkwind', 'pink floyd', 'space', 'cosmic'],
    'Post-Rock': ['godspeed', 'explosions', 'mogwai', 'post-rock', 'instrumental'],
    'Math Rock': ['math', 'don caballero', 'battles', 'complex'],
    'Psychedelic Prog': ['psychedelic', 'psych', 'acid', 'tame impala'],
    'Progressive Electronic': ['electronic', 'synth', 'ambient', 'tangerine dream'],
    'Fusion': ['fusion', 'jazz', 'mahavishnu', 'weather report'],
    'Avant-Prog': ['avant', 'experimental', 'henry cow', 'art rock'],
    'RIO (Rock in Opposition)': ['rio', 'henry cow', 'art bears', 'opposition']
  };

  for (const [subgenre, keywordList] of Object.entries(keywords)) {
    if (keywordList.some(keyword => text.includes(keyword))) {
      return subgenre;
    }
  }

  return 'Progressive';
}