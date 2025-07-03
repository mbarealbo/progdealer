/*
  # Allow public event submissions

  1. Security Changes
    - Add policy to allow public (unauthenticated) users to insert events
    - This enables the "Segnala un evento" form to work without authentication
    - Maintains existing policies for other operations

  2. Notes
    - Only INSERT operations are allowed for public users
    - All other operations (SELECT, UPDATE, DELETE) maintain existing restrictions
    - The fonte field will automatically be set to 'user' for user submissions
*/

-- Allow public users to insert events (for event submission form)
CREATE POLICY "Allow public event submissions"
  ON eventi_prog
  FOR INSERT
  TO public
  WITH CHECK (true);