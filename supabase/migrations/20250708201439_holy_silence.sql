/*
  # Fix RLS policies for event visibility

  This migration ensures that:
  1. Public users can only see approved events
  2. Authenticated users can see all events (for admin panel)
  3. The policies work correctly with the frontend queries
*/

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Allow public read access to approved events" ON eventi_prog;
DROP POLICY IF EXISTS "Allow authenticated users to read all events" ON eventi_prog;
DROP POLICY IF EXISTS "Allow public read access" ON eventi_prog;

-- Create a single policy for public access to approved events
CREATE POLICY "Public can read approved events"
  ON eventi_prog
  FOR SELECT
  TO public
  USING (status = 'approved' OR status IS NULL);

-- Create policy for authenticated users to read all events
CREATE POLICY "Authenticated can read all events"
  ON eventi_prog
  FOR SELECT
  TO authenticated
  USING (true);

-- Ensure all existing events without status are marked as approved
UPDATE eventi_prog 
SET status = 'approved' 
WHERE status IS NULL;

-- Add index for better performance if it doesn't exist
CREATE INDEX IF NOT EXISTS eventi_prog_status_idx ON eventi_prog (status);