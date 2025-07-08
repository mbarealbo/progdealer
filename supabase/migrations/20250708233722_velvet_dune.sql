/*
  # Emergency restoration of eventi_prog table

  1. Check if table exists and restore if missing
  2. Recreate table with full schema if needed
  3. Restore proper RLS policies for normal operation
  4. Add all necessary indexes and constraints

  This migration will:
  - Check if eventi_prog exists in public schema
  - Recreate it with complete structure if missing
  - Restore normal RLS policies (not emergency lockdown)
  - Ensure all functions and indexes are present
*/

-- First, check if the table exists and create it if missing
DO $$
BEGIN
  -- Check if eventi_prog table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'eventi_prog'
  ) THEN
    
    RAISE NOTICE 'Table eventi_prog does not exist. Creating it now...';
    
    -- Create the eventi_prog table with complete structure
    CREATE TABLE public.eventi_prog (
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
      status text DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
      country text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    -- Create unique constraint for deduplication
    CREATE UNIQUE INDEX eventi_prog_dedup_idx ON public.eventi_prog (nome_evento, data_ora, venue);

    -- Create unique constraint for event_id when present
    CREATE UNIQUE INDEX eventi_prog_event_id_idx ON public.eventi_prog (event_id) WHERE event_id IS NOT NULL;

    -- Create performance indexes
    CREATE INDEX eventi_prog_data_ora_idx ON public.eventi_prog (data_ora);
    CREATE INDEX eventi_prog_città_idx ON public.eventi_prog (città);
    CREATE INDEX eventi_prog_sottogenere_idx ON public.eventi_prog (sottogenere);
    CREATE INDEX eventi_prog_fonte_idx ON public.eventi_prog (fonte);
    CREATE INDEX eventi_prog_tipo_inserimento_idx ON public.eventi_prog (tipo_inserimento);
    CREATE INDEX eventi_prog_status_idx ON public.eventi_prog (status);
    CREATE INDEX eventi_prog_country_idx ON public.eventi_prog (country);

    RAISE NOTICE 'Table eventi_prog created successfully with all indexes';
    
  ELSE
    RAISE NOTICE 'Table eventi_prog already exists';
  END IF;
END $$;

-- Enable RLS on the table
ALTER TABLE public.eventi_prog ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first
DROP POLICY IF EXISTS "Emergency lockdown - admin only read" ON public.eventi_prog;
DROP POLICY IF EXISTS "Emergency lockdown - admin only insert" ON public.eventi_prog;
DROP POLICY IF EXISTS "Emergency lockdown - admin only update" ON public.eventi_prog;
DROP POLICY IF EXISTS "Emergency lockdown - admin only delete" ON public.eventi_prog;
DROP POLICY IF EXISTS "Public can read approved events" ON public.eventi_prog;
DROP POLICY IF EXISTS "Authenticated can read all events" ON public.eventi_prog;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON public.eventi_prog;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON public.eventi_prog;
DROP POLICY IF EXISTS "Allow authenticated users to delete" ON public.eventi_prog;
DROP POLICY IF EXISTS "Allow public event submissions" ON public.eventi_prog;

-- Create normal RLS policies (not emergency lockdown)
-- Public can read approved events
CREATE POLICY "Public can read approved events"
  ON public.eventi_prog
  FOR SELECT
  TO public
  USING (status = 'approved' OR status IS NULL);

-- Authenticated users can read all events (for admin panel)
CREATE POLICY "Authenticated can read all events"
  ON public.eventi_prog
  FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert events
CREATE POLICY "Allow authenticated users to insert"
  ON public.eventi_prog
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update events
CREATE POLICY "Allow authenticated users to update"
  ON public.eventi_prog
  FOR UPDATE
  TO authenticated
  USING (true);

-- Authenticated users can delete events
CREATE POLICY "Allow authenticated users to delete"
  ON public.eventi_prog
  FOR DELETE
  TO authenticated
  USING (true);

-- Allow public event submissions (manual entries)
CREATE POLICY "Allow public event submissions"
  ON public.eventi_prog
  FOR INSERT
  TO public
  WITH CHECK (tipo_inserimento = 'manual');

-- Recreate the upsert function if it doesn't exist
CREATE OR REPLACE FUNCTION public.upsert_evento(
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
  FROM public.eventi_prog
  WHERE nome_evento = p_nome_evento
    AND data_ora = p_data_ora
    AND venue = p_venue;

  IF existing_id IS NOT NULL THEN
    -- Update existing event
    UPDATE public.eventi_prog SET
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
    INSERT INTO public.eventi_prog (
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.eventi_prog TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_evento TO anon, authenticated;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'eventi_prog table restoration completed successfully';
  RAISE NOTICE 'Normal RLS policies restored (emergency lockdown removed)';
  RAISE NOTICE 'All indexes and functions recreated';
END $$;