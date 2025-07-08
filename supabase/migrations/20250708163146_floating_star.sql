/*
  # Update eventi_prog table structure for ProgDealer v2

  1. Schema Changes
    - Drop existing table and recreate with new structure
    - `nome_evento` (text, required) - Event name
    - `data_ora` (timestamptz, required) - Event date and time
    - `venue` (text, required) - Venue name
    - `città` (text, required) - City name (renamed from luogo)
    - `sottogenere` (text, required) - Progressive subgenre classification
    - `descrizione` (text, optional) - Event description
    - `artisti` (text[], optional) - Array of artists
    - `orario` (text, optional) - Time information
    - `link` (text, required) - Event link (renamed from link_biglietti)
    - `immagine` (text, optional) - Event image URL
    - `fonte` (text, required) - Data source (e.g. "concertful.com")
    - `tipo_inserimento` (text, required) - "scraped" or "manual"
    - `event_id` (text, optional) - Unique ID from source
    - `id` (uuid, primary key)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  2. Deduplication
    - Unique constraint on (nome_evento, data_ora, venue) combination
    - Optional unique constraint on event_id when present

  3. Security
    - Enable RLS
    - Public read access
    - Authenticated users can insert/update/delete
    - Public users can insert (for manual submissions)
*/

-- Drop existing table and policies
DROP TABLE IF EXISTS eventi_prog CASCADE;

-- Create new table with updated structure
CREATE TABLE eventi_prog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_evento text NOT NULL,
  data_ora timestamptz NOT NULL,
  venue text NOT NULL,
  città text NOT NULL,
  sottogenere text NOT NULL DEFAULT 'Progressive',
  descrizione text,
  artisti text[],
  orario text,
  link text NOT NULL,
  immagine text,
  fonte text NOT NULL,
  tipo_inserimento text NOT NULL CHECK (tipo_inserimento IN ('scraped', 'manual')),
  event_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create unique constraint for deduplication
CREATE UNIQUE INDEX eventi_prog_dedup_idx ON eventi_prog (nome_evento, data_ora, venue);

-- Create unique constraint for event_id when present
CREATE UNIQUE INDEX eventi_prog_event_id_idx ON eventi_prog (event_id) WHERE event_id IS NOT NULL;

-- Create performance indexes
CREATE INDEX eventi_prog_data_ora_idx ON eventi_prog (data_ora);
CREATE INDEX eventi_prog_città_idx ON eventi_prog (città);
CREATE INDEX eventi_prog_sottogenere_idx ON eventi_prog (sottogenere);
CREATE INDEX eventi_prog_fonte_idx ON eventi_prog (fonte);
CREATE INDEX eventi_prog_tipo_inserimento_idx ON eventi_prog (tipo_inserimento);

-- Enable RLS
ALTER TABLE eventi_prog ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access"
  ON eventi_prog
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users full access
CREATE POLICY "Allow authenticated users to insert"
  ON eventi_prog
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update"
  ON eventi_prog
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete"
  ON eventi_prog
  FOR DELETE
  TO authenticated
  USING (true);

-- Allow public event submissions (manual entries)
CREATE POLICY "Allow public event submissions"
  ON eventi_prog
  FOR INSERT
  TO public
  WITH CHECK (tipo_inserimento = 'manual');

-- Create function for upsert with deduplication
CREATE OR REPLACE FUNCTION upsert_evento(
  p_nome_evento text,
  p_data_ora timestamptz,
  p_venue text,
  p_città text,
  p_sottogenere text DEFAULT 'Progressive',
  p_descrizione text DEFAULT NULL,
  p_artisti text[] DEFAULT NULL,
  p_orario text DEFAULT NULL,
  p_link text DEFAULT '',
  p_immagine text DEFAULT NULL,
  p_fonte text DEFAULT 'unknown',
  p_tipo_inserimento text DEFAULT 'manual',
  p_event_id text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  existing_id uuid;
  result_id uuid;
BEGIN
  -- Check for existing event using deduplication logic
  SELECT id INTO existing_id
  FROM eventi_prog
  WHERE nome_evento = p_nome_evento
    AND data_ora = p_data_ora
    AND venue = p_venue;

  IF existing_id IS NOT NULL THEN
    -- Update existing event
    UPDATE eventi_prog SET
      città = p_città,
      sottogenere = p_sottogenere,
      descrizione = COALESCE(p_descrizione, descrizione),
      artisti = COALESCE(p_artisti, artisti),
      orario = COALESCE(p_orario, orario),
      link = COALESCE(NULLIF(p_link, ''), link),
      immagine = COALESCE(p_immagine, immagine),
      fonte = p_fonte,
      tipo_inserimento = p_tipo_inserimento,
      event_id = COALESCE(p_event_id, event_id),
      updated_at = now()
    WHERE id = existing_id;
    
    result_id := existing_id;
  ELSE
    -- Insert new event
    INSERT INTO eventi_prog (
      nome_evento, data_ora, venue, città, sottogenere,
      descrizione, artisti, orario, link, immagine,
      fonte, tipo_inserimento, event_id
    ) VALUES (
      p_nome_evento, p_data_ora, p_venue, p_città, p_sottogenere,
      p_descrizione, p_artisti, p_orario, p_link, p_immagine,
      p_fonte, p_tipo_inserimento, p_event_id
    ) RETURNING id INTO result_id;
  END IF;

  RETURN result_id;
END;
$$ LANGUAGE plpgsql;