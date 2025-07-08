/*
  # Add status column for event approval workflow

  1. Changes
    - Add `status` column to `eventi_prog` table with default 'approved'
    - Add check constraint to ensure valid status values
    - Update existing events to have 'approved' status
    - Update RLS policies to only show approved events to public

  2. Security
    - Public users can only see approved events
    - Authenticated users can see all events (for admin panel)
    - Manual submissions default to 'pending' status
*/

-- Add status column with default 'approved' for existing events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'eventi_prog' AND column_name = 'status'
  ) THEN
    ALTER TABLE eventi_prog ADD COLUMN status text DEFAULT 'approved';
  END IF;
END $$;

-- Add check constraint for valid status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'eventi_prog' AND constraint_name = 'eventi_prog_status_check'
  ) THEN
    ALTER TABLE eventi_prog ADD CONSTRAINT eventi_prog_status_check 
    CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Update existing events to have 'approved' status
UPDATE eventi_prog SET status = 'approved' WHERE status IS NULL;

-- Update RLS policy for public read access to only show approved events
DROP POLICY IF EXISTS "Allow public read access" ON eventi_prog;

CREATE POLICY "Allow public read access to approved events"
  ON eventi_prog
  FOR SELECT
  TO public
  USING (status = 'approved');

-- Create separate policy for authenticated users to see all events (for admin)
CREATE POLICY "Allow authenticated users to read all events"
  ON eventi_prog
  FOR SELECT
  TO authenticated
  USING (true);

-- Add index on status column for better performance
CREATE INDEX IF NOT EXISTS eventi_prog_status_idx ON eventi_prog (status);