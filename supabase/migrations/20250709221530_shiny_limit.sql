/*
  # CRITICAL SECURITY FIX: Add user isolation to eventi_prog table

  1. Schema Changes
    - Add `user_id` column to `eventi_prog` table
    - Link to auth.users.id for proper user association
    - Add foreign key constraint for data integrity

  2. Security Updates
    - Update RLS policies to enforce user data isolation
    - Users can only see their own events in user area
    - Admin can still see all events
    - Public can still see approved events

  3. Function Updates
    - Update upsert_evento function to automatically set user_id
    - Ensure all new events are properly associated with users

  4. Data Migration
    - Existing events without user_id will be visible to admins only
    - New events will be properly isolated by user
*/

-- Add user_id column to eventi_prog table
ALTER TABLE eventi_prog ADD COLUMN user_id uuid;

-- Add foreign key constraint to ensure data integrity
ALTER TABLE eventi_prog 
ADD CONSTRAINT eventi_prog_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for better performance on user queries
CREATE INDEX eventi_prog_user_id_idx ON eventi_prog (user_id);

-- Drop existing RLS policies that don't enforce user isolation
DROP POLICY IF EXISTS "Authenticated users can read all events" ON eventi_prog;
DROP POLICY IF EXISTS "Authenticated users can insert events" ON eventi_prog;

-- Create new RLS policies with proper user isolation

-- 1. Users can only read their own events (for user area)
CREATE POLICY "Users can read their own events"
  ON eventi_prog
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 2. Admins can read all events (for admin panel)
CREATE POLICY "Admins can read all events"
  ON eventi_prog
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role = 'admin'
    )
  );

-- 3. Users can insert events (will be automatically associated with their user_id)
CREATE POLICY "Users can insert their own events"
  ON eventi_prog
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 4. Users can update their own events
CREATE POLICY "Users can update their own events"
  ON eventi_prog
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. Users can delete their own events
CREATE POLICY "Users can delete their own events"
  ON eventi_prog
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Update the upsert_evento function to automatically set user_id
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
  current_user_id uuid;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Check for existing event using deduplication logic
  SELECT id INTO existing_id
  FROM eventi_prog
  WHERE nome_evento = p_nome_evento
    AND data_ora = p_data_ora
    AND venue = p_venue;

  IF existing_id IS NOT NULL THEN
    -- Update existing event (only if user owns it or is admin)
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
    WHERE id = existing_id
      AND (user_id = current_user_id OR 
           EXISTS (SELECT 1 FROM profiles WHERE id = current_user_id AND user_role = 'admin'));
    
    result_id := existing_id;
  ELSE
    -- Insert new event with user_id automatically set
    INSERT INTO eventi_prog (
      nome_evento, data_ora, venue, città, sottogenere,
      descrizione, artisti, orario, link, immagine,
      fonte, tipo_inserimento, event_id, user_id,
      status
    ) VALUES (
      p_nome_evento, p_data_ora, p_venue, p_città, p_sottogenere,
      p_descrizione, p_artisti, p_orario, p_link, p_immagine,
      p_fonte, p_tipo_inserimento, p_event_id, current_user_id,
      CASE 
        WHEN p_tipo_inserimento = 'manual' THEN 'pending'
        ELSE 'approved'
      END
    ) RETURNING id INTO result_id;
  END IF;

  RETURN result_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if user can see all events (admin check)
CREATE OR REPLACE FUNCTION can_see_all_events()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND user_role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log the security fix
DO $$
BEGIN
  RAISE NOTICE '🔒 CRITICAL SECURITY FIX APPLIED';
  RAISE NOTICE 'Added user_id column to eventi_prog table';
  RAISE NOTICE 'Updated RLS policies to enforce user data isolation';
  RAISE NOTICE 'Users can now only see their own events in user area';
  RAISE NOTICE 'Admins can still see all events in admin panel';
  RAISE NOTICE 'All new events will be properly associated with users';
END $$;