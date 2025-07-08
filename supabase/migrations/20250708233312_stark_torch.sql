/*
  # EMERGENCY: Block all access to eventi_prog table
  
  This migration implements an emergency lockdown of the eventi_prog table
  to prevent unauthorized access and credit consumption.
  
  1. Security Changes
    - Drop all existing RLS policies
    - Create restrictive policies that block all access
    - Only allow access to authenticated admin users
  
  2. Emergency Measures
    - Block all public access immediately
    - Block all unauthenticated requests
    - Require explicit admin authentication for any access
*/

-- Drop all existing policies on eventi_prog table
DROP POLICY IF EXISTS "Public can read approved events" ON eventi_prog;
DROP POLICY IF EXISTS "Authenticated can read all events" ON eventi_prog;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON eventi_prog;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON eventi_prog;
DROP POLICY IF EXISTS "Allow authenticated users to delete" ON eventi_prog;
DROP POLICY IF EXISTS "Allow public event submissions" ON eventi_prog;

-- Create emergency lockdown policies
-- Only allow access to specific admin email (replace with your admin email)
CREATE POLICY "Emergency lockdown - admin only read"
  ON eventi_prog
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'alboabourt@progdealer.com'
  );

CREATE POLICY "Emergency lockdown - admin only insert"
  ON eventi_prog
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'email' = 'alboabourt@progdealer.com'
  );

CREATE POLICY "Emergency lockdown - admin only update"
  ON eventi_prog
  FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'alboabourt@progdealer.com'
  );

CREATE POLICY "Emergency lockdown - admin only delete"
  ON eventi_prog
  FOR DELETE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'alboabourt@progdealer.com'
  );

-- Block ALL public access (no public policies)
-- This ensures no unauthenticated requests can access the table

-- Log the emergency lockdown
DO $$
BEGIN
  RAISE NOTICE 'EMERGENCY LOCKDOWN ACTIVATED: All access to eventi_prog table restricted to admin only';
END $$;