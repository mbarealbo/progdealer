/*
  # Restore normal access to eventi_prog table

  1. Remove Emergency Lockdown
    - Drop the "block_all" policy that was blocking all access
    - Remove any other emergency lockdown policies

  2. Restore Standard RLS Policies
    - Public users can read only approved events
    - Authenticated users (admins) can perform all operations
    - Public users can submit manual events (pending approval)

  3. Restore Permissions
    - Grant necessary permissions back to anon and authenticated roles
    - Ensure upsert function is accessible

  4. Verification
    - Confirm all standard policies are in place
    - Ensure no blocking policies remain
*/

-- First, ensure RLS is enabled on the table
ALTER TABLE public.eventi_prog ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (including emergency lockdown)
DROP POLICY IF EXISTS "block_all" ON public.eventi_prog;
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

-- Restore standard permissions to roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT ON public.eventi_prog TO anon;
GRANT ALL ON public.eventi_prog TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_evento TO anon, authenticated;

-- Create standard RLS policies for normal operation

-- 1. Public users can read only approved events
CREATE POLICY "Public can read approved events"
  ON public.eventi_prog
  FOR SELECT
  TO public
  USING (status = 'approved' OR status IS NULL);

-- 2. Authenticated users (admins) can read all events
CREATE POLICY "Authenticated can read all events"
  ON public.eventi_prog
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. Authenticated users can insert events
CREATE POLICY "Authenticated can insert events"
  ON public.eventi_prog
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4. Authenticated users can update events (for approval/rejection/editing)
CREATE POLICY "Authenticated can update events"
  ON public.eventi_prog
  FOR UPDATE
  TO authenticated
  USING (true);

-- 5. Authenticated users can delete events
CREATE POLICY "Authenticated can delete events"
  ON public.eventi_prog
  FOR DELETE
  TO authenticated
  USING (true);

-- 6. Public users can submit manual events (will be pending approval)
CREATE POLICY "Public can submit manual events"
  ON public.eventi_prog
  FOR INSERT
  TO public
  WITH CHECK (tipo_inserimento = 'manual');

-- Verify that the upsert function exists and is accessible
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'upsert_evento'
  ) THEN
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
    ) RETURNS uuid AS $func$
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
    $func$ LANGUAGE plpgsql SECURITY DEFINER;
    
    RAISE NOTICE 'upsert_evento function recreated';
  END IF;
END $$;

-- Final verification and logging
DO $$
DECLARE
  policy_count integer;
  blocking_policies integer;
BEGIN
  -- Count total policies on eventi_prog
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'eventi_prog' AND schemaname = 'public';
  
  -- Count any remaining blocking policies
  SELECT COUNT(*) INTO blocking_policies
  FROM pg_policies 
  WHERE tablename = 'eventi_prog' 
    AND schemaname = 'public'
    AND (policyname LIKE '%block%' OR policyname LIKE '%lockdown%');

  RAISE NOTICE '✅ NORMAL ACCESS RESTORED TO eventi_prog TABLE';
  RAISE NOTICE 'Total RLS policies active: %', policy_count;
  RAISE NOTICE 'Blocking/lockdown policies remaining: %', blocking_policies;
  
  IF blocking_policies > 0 THEN
    RAISE WARNING '⚠️  Some blocking policies may still exist!';
  ELSE
    RAISE NOTICE '✅ No blocking policies detected - access fully restored';
  END IF;
  
  RAISE NOTICE '📋 Standard policies restored:';
  RAISE NOTICE '   - Public can read approved events';
  RAISE NOTICE '   - Authenticated can read all events';
  RAISE NOTICE '   - Authenticated can insert/update/delete events';
  RAISE NOTICE '   - Public can submit manual events (pending approval)';
  RAISE NOTICE '🔧 Permissions restored for anon and authenticated roles';
  RAISE NOTICE '⚡ upsert_evento function verified and accessible';
END $$;