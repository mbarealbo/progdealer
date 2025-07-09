/*
  # Create user profiles table with role-based access control

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, not null)
      - `role` (text, default 'user', check constraint)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `profiles` table
    - Users can read their own profile
    - Only admins can read all profiles
    - Automatic profile creation trigger for new users

  3. Functions
    - Trigger function to create profile on user signup
    - Function to check if user is admin
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles table
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile (but not role)
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile
DROP TRIGGER IF EXISTS create_profile_trigger ON auth.users;
CREATE TRIGGER create_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Create function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update eventi_prog policies to use role-based access
-- Drop existing admin-specific policies
DROP POLICY IF EXISTS "Authenticated can read all events" ON eventi_prog;
DROP POLICY IF EXISTS "Authenticated can insert events" ON eventi_prog;
DROP POLICY IF EXISTS "Authenticated can update events" ON eventi_prog;
DROP POLICY IF EXISTS "Authenticated can delete events" ON eventi_prog;

-- Create new role-based policies for eventi_prog
-- Admins can read all events
CREATE POLICY "Admins can read all events"
  ON eventi_prog
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Admins can insert events
CREATE POLICY "Admins can insert events"
  ON eventi_prog
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Admins can update events
CREATE POLICY "Admins can update events"
  ON eventi_prog
  FOR UPDATE
  TO authenticated
  USING (is_admin());

-- Admins can delete events
CREATE POLICY "Admins can delete events"
  ON eventi_prog
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles (role);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles (email);

-- Create admin user profile for existing admin
-- This will create a profile for the admin user if they exist
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Find the admin user by email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'alboabourt@progdealer.com';

  -- If admin user exists, create/update their profile
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO profiles (id, email, role)
    VALUES (admin_user_id, 'alboabourt@progdealer.com', 'admin')
    ON CONFLICT (id) 
    DO UPDATE SET role = 'admin', updated_at = now();
    
    RAISE NOTICE 'Admin profile created/updated for user: %', admin_user_id;
  ELSE
    RAISE NOTICE 'Admin user not found. Profile will be created when user signs up.';
  END IF;
END $$;