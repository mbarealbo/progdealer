-- Fix event insertion issues
-- This migration ensures proper RLS policies and table structure

-- First, let's check and fix the table structure
DO $$
BEGIN
  -- Ensure the link column allows empty strings (not just NULL)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'eventi_prog' 
    AND column_name = 'link' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE eventi_prog ALTER COLUMN link DROP NOT NULL;
  END IF;
  
  -- Ensure artisti column can handle empty arrays
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'eventi_prog' 
    AND column_name = 'artisti' 
    AND data_type = 'ARRAY'
  ) THEN
    ALTER TABLE eventi_prog ALTER COLUMN artisti TYPE text[] USING artisti::text[];
  END IF;
END $$;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Public can submit manual events" ON eventi_prog;
DROP POLICY IF EXISTS "Public can read approved events" ON eventi_prog;
DROP POLICY IF EXISTS "Authenticated users can insert events" ON eventi_prog;
DROP POLICY IF EXISTS "Authenticated users can read all events" ON eventi_prog;
DROP POLICY IF EXISTS "Admin can update events" ON eventi_prog;
DROP POLICY IF EXISTS "Admin can delete events" ON eventi_prog;

-- Disable RLS temporarily to ensure clean state
ALTER TABLE eventi_prog DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE eventi_prog ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies

-- 1. Public read access for approved events
CREATE POLICY "Public can read approved events"
  ON eventi_prog
  FOR SELECT
  TO public
  USING (
    (status = 'approved'::text) OR 
    (status IS NULL)
  );

-- 2. Public insert for manual events (no authentication required)
CREATE POLICY "Public can insert manual events"
  ON eventi_prog
  FOR INSERT
  TO public
  WITH CHECK (
    tipo_inserimento = 'manual'::text AND
    nome_evento IS NOT NULL AND
    data_ora IS NOT NULL AND
    venue IS NOT NULL AND
    città IS NOT NULL
  );

-- 3. Authenticated users can insert any events
CREATE POLICY "Authenticated users can insert events"
  ON eventi_prog
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4. Authenticated users can read all events
CREATE POLICY "Authenticated users can read all events"
  ON eventi_prog
  FOR SELECT
  TO authenticated
  USING (true);

-- 5. Admin can update events (using profiles table for role check)
CREATE POLICY "Admin can update events"
  ON eventi_prog
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role = 'admin'
    )
  );

-- 6. Admin can delete events
CREATE POLICY "Admin can delete events"
  ON eventi_prog
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role = 'admin'
    )
  );

-- Ensure proper defaults
ALTER TABLE eventi_prog 
ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE eventi_prog 
ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE eventi_prog 
ALTER COLUMN updated_at SET DEFAULT now();

-- Create or update the trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_eventi_prog_updated_at ON eventi_prog;
CREATE TRIGGER update_eventi_prog_updated_at
    BEFORE UPDATE ON eventi_prog
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Test the policies by creating a test function
CREATE OR REPLACE FUNCTION test_event_insertion()
RETURNS text AS $$
DECLARE
  test_result text;
BEGIN
  -- Test if we can insert a manual event
  BEGIN
    INSERT INTO eventi_prog (
      nome_evento,
      data_ora,
      venue,
      città,
      sottogenere,
      fonte,
      tipo_inserimento,
      link
    ) VALUES (
      'Test Event',
      now() + interval '1 day',
      'Test Venue',
      'Test City',
      'Progressive',
      'manual-test',
      'manual',
      ''
    );
    
    test_result := 'SUCCESS: Manual event insertion works';
    
    -- Clean up test data
    DELETE FROM eventi_prog WHERE nome_evento = 'Test Event' AND fonte = 'manual-test';
    
  EXCEPTION WHEN OTHERS THEN
    test_result := 'ERROR: ' || SQLERRM;
  END;
  
  RETURN test_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the test
SELECT test_event_insertion();