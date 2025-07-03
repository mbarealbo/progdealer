import { createClient } from '@supabase/supabase-js';

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
        Row: {
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
        };
        Insert: {
          id?: string;
          nome_evento: string;
          data_ora: string;
          luogo: string;
          venue: string;
          genere: string;
          link_biglietti?: string;
          fonte?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome_evento?: string;
          data_ora?: string;
          luogo?: string;
          venue?: string;
          genere?: string;
          link_biglietti?: string;
          fonte?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};