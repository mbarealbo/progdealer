/*
  # Fix Event Insertion Policies

  1. Security Updates
    - Allow public users to insert manual events
    - Allow authenticated users to insert events
    - Ensure proper RLS policies for event operations
    
  2. Policy Changes
    - Public can insert manual events (tipo_inserimento = 'manual')
    - Authenticated users can insert any events
    - Admin can do everything
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public can submit manual events" ON eventi_prog;
DROP POLICY IF EXISTS "Public can read approved events" ON eventi_prog;
DROP POLICY IF EXISTS "Admin can insert events" ON eventi_prog;
DROP POLICY IF EXISTS "Admin can read all events" ON eventi_prog;
DROP POLICY IF EXISTS "Admin can update events" ON eventi_prog;
DROP POLICY IF EXISTS "Admin can delete events" ON eventi_prog;
DROP POLICY IF EXISTS "Users can insert events" ON eventi_prog;

-- Enable RLS
ALTER TABLE eventi_prog ENABLE ROW LEVEL SECURITY;

-- Public policies (for unauthenticated users)
CREATE POLICY "Public can read approved events"
  ON eventi_prog
  FOR SELECT
  TO public
  USING ((status = 'approved'::text) OR (status IS NULL));

CREATE POLICY "Public can submit manual events"
  ON eventi_prog
  FOR INSERT
  TO public
  WITH CHECK (tipo_inserimento = 'manual'::text);

-- Authenticated user policies
CREATE POLICY "Authenticated users can insert events"
  ON eventi_prog
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read all events"
  ON eventi_prog
  FOR SELECT
  TO authenticated
  USING (true);

-- Admin policies (hardcoded UUID for admin user)
CREATE POLICY "Admin can update events"
  ON eventi_prog
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = 'c150f3a4-617c-460b-9ec5-f99203e0fda3'::uuid)
  WITH CHECK (auth.uid() = 'c150f3a4-617c-460b-9ec5-f99203e0fda3'::uuid);

CREATE POLICY "Admin can delete events"
  ON eventi_prog
  FOR DELETE
  TO authenticated
  USING (auth.uid() = 'c150f3a4-617c-460b-9ec5-f99203e0fda3'::uuid);

-- Ensure the status column has proper default and constraints
ALTER TABLE eventi_prog 
ALTER COLUMN status SET DEFAULT 'pending';

-- Add constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'eventi_prog_status_check' 
    AND table_name = 'eventi_prog'
  ) THEN
    ALTER TABLE eventi_prog 
    ADD CONSTRAINT eventi_prog_status_check 
    CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]));
  END IF;
END $$;