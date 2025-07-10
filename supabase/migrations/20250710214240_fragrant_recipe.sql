/*
  # Fix User Event Policies and Insertion

  1. Security Updates
    - Fix RLS policies for user event management
    - Ensure users can insert events with their own user_id
    - Allow users to read their own events properly
    
  2. Policy Updates
    - Update insert policy to allow user_id assignment
    - Fix select policy for user area
    - Maintain admin access to all events
*/

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Public can insert manual events" ON eventi_prog;
DROP POLICY IF EXISTS "Users can insert their own events" ON eventi_prog;
DROP POLICY IF EXISTS "Users can read their own events" ON eventi_prog;
DROP POLICY IF EXISTS "Users can update their own events" ON eventi_prog;
DROP POLICY IF EXISTS "Users can delete their own events" ON eventi_prog;

-- Allow authenticated users to insert events with their own user_id
CREATE POLICY "Authenticated users can insert events"
ON eventi_prog
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  nome_evento IS NOT NULL AND
  data_ora IS NOT NULL AND
  venue IS NOT NULL AND
  città IS NOT NULL
);

-- Allow users to read their own events
CREATE POLICY "Users can read own events"
ON eventi_prog
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow users to update their own events
CREATE POLICY "Users can update own events"
ON eventi_prog
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow users to delete their own events
CREATE POLICY "Users can delete own events"
ON eventi_prog
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Keep admin policies (admins can do everything)
-- These should already exist from previous migration

-- Test the policies with a simple function
CREATE OR REPLACE FUNCTION test_user_event_insertion()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  test_user_id uuid;
  test_event_id uuid;
  result text;
BEGIN
  -- Get a test user (first authenticated user)
  SELECT id INTO test_user_id 
  FROM auth.users 
  WHERE email_confirmed_at IS NOT NULL 
  LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RETURN 'No authenticated users found for testing';
  END IF;
  
  -- Try to insert a test event
  INSERT INTO eventi_prog (
    nome_evento,
    data_ora,
    venue,
    città,
    sottogenere,
    fonte,
    tipo_inserimento,
    user_id,
    status
  ) VALUES (
    'Test Event for User Policies',
    NOW() + INTERVAL '1 day',
    'Test Venue',
    'Test City',
    'Progressive',
    'test',
    'manual',
    test_user_id,
    'pending'
  ) RETURNING id INTO test_event_id;
  
  -- Check if we can read it back
  IF EXISTS (
    SELECT 1 FROM eventi_prog 
    WHERE id = test_event_id AND user_id = test_user_id
  ) THEN
    result := 'SUCCESS: Event inserted and readable for user ' || test_user_id;
    
    -- Clean up test event
    DELETE FROM eventi_prog WHERE id = test_event_id;
  ELSE
    result := 'FAILED: Event not readable after insertion';
  END IF;
  
  RETURN result;
END;
$$;