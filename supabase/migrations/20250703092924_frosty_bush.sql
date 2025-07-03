/*
  # Create eventi_prog table for ProgDealer

  1. New Tables
    - `eventi_prog`
      - `id` (uuid, primary key)
      - `nome_evento` (text) - Event name
      - `data_ora` (timestamptz) - Event date and time
      - `luogo` (text) - Location/city
      - `venue` (text) - Venue name
      - `genere` (text) - Music genre
      - `link_biglietti` (text) - Ticket link URL
      - `fonte` (text) - Source of the event (scraped/user-submitted)
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

  2. Security
    - Enable RLS on `eventi_prog` table
    - Add policy for public read access
    - Add policy for authenticated users to insert/update/delete
*/

CREATE TABLE IF NOT EXISTS eventi_prog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_evento text NOT NULL,
  data_ora timestamptz NOT NULL,
  luogo text NOT NULL,
  venue text NOT NULL,
  genere text NOT NULL,
  link_biglietti text DEFAULT '',
  fonte text NOT NULL DEFAULT 'user-submitted',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE eventi_prog ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access"
  ON eventi_prog
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Allow authenticated users to insert"
  ON eventi_prog
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update
CREATE POLICY "Allow authenticated users to update"
  ON eventi_prog
  FOR UPDATE
  TO authenticated
  USING (true);

-- Allow authenticated users to delete
CREATE POLICY "Allow authenticated users to delete"
  ON eventi_prog
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS eventi_prog_data_ora_idx ON eventi_prog (data_ora);
CREATE INDEX IF NOT EXISTS eventi_prog_luogo_idx ON eventi_prog (luogo);
CREATE INDEX IF NOT EXISTS eventi_prog_genere_idx ON eventi_prog (genere);