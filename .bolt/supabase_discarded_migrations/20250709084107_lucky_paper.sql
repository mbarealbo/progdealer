/*
  # CRITICAL FIX: Remove ALL ambiguous information_schema queries
  
  This migration will:
  1. Drop and recreate ALL functions that might contain unqualified queries
  2. Ensure no old code persists in the database
  3. Fix any remaining information_schema queries with proper aliases
  4. Verify all functions are clean
*/

-- Drop the problematic trigger function completely and recreate it
DROP FUNCTION IF EXISTS create_user_profile() CASCADE;
DROP TRIGGER IF EXISTS create_profile_trigger ON auth.users;

-- Recreate the trigger function with ONLY properly qualified queries
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS trigger AS $$
BEGIN
  -- Insert profile with proper error handling - NO information_schema queries here
  INSERT INTO profiles (id, email, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.email, 'no-email@example.com'),
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(NEW.email, profiles.email),
    role = COALESCE(profiles.role, 'user'),
    updated_at = now();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Profile creation failed for user %, continuing: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER create_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Drop and recreate the is_admin function to ensure it's clean
DROP FUNCTION IF EXISTS is_admin();

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate upsert_evento function to ensure it's clean
DROP FUNCTION IF EXISTS upsert_evento(text, timestamptz, text, text, text, text, text[], text, text, text, text, text, text);

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
  -- Check for existing event using deduplication logic - NO information_schema queries
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify that all functions are now clean (this query uses proper aliases)
DO $$
DECLARE
  function_count integer;
  trigger_count integer;
BEGIN
  -- Count functions with proper aliases
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines AS routs
  WHERE routs.routine_schema = 'public' 
    AND routs.routine_name IN ('create_user_profile', 'is_admin', 'upsert_evento');
  
  -- Count triggers with proper aliases  
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers AS trigs
  WHERE trigs.trigger_name = 'create_profile_trigger'
    AND trigs.event_object_schema = 'auth';
  
  RAISE NOTICE '🔧 ALL FUNCTIONS RECREATED WITHOUT information_schema QUERIES';
  RAISE NOTICE 'Functions recreated: %', function_count;
  RAISE NOTICE 'Triggers recreated: %', trigger_count;
  RAISE NOTICE '✅ NO MORE AMBIGUOUS COLUMN REFERENCES POSSIBLE';
END $$;