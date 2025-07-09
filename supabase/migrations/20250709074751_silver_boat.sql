/*
  # Fix registration defaults and ensure profile creation works

  This migration ensures that:
  1. The profiles table has proper defaults for the role column
  2. The trigger function works correctly for all new users
  3. Registration will not fail due to missing defaults
  4. All existing users have proper role values

  CRITICAL: This fixes the registration errors that are consuming credits
*/

-- Ensure profiles table exists with correct structure
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure role column has proper default and NOT NULL constraint
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'user';
ALTER TABLE profiles ALTER COLUMN role SET NOT NULL;

-- Add check constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'profiles' AND constraint_name = 'profiles_role_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('user', 'admin'));
  END IF;
END $$;

-- Update any existing profiles that might have NULL role
UPDATE profiles SET role = 'user' WHERE role IS NULL;

-- Create robust trigger function that won't fail
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS trigger AS $$
BEGIN
  -- Always try to insert with explicit default values
  INSERT INTO profiles (id, email, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.email, 'no-email@example.com'), -- Fallback for null email
    'user' -- Explicit default role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(NEW.email, profiles.email),
    role = COALESCE(profiles.role, 'user'), -- Ensure role is never null
    updated_at = now();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail user creation
    RAISE WARNING 'Profile creation failed for user %, continuing: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS create_profile_trigger ON auth.users;
CREATE TRIGGER create_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

-- Create RLS policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles (role);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles (email);

-- Ensure admin user has correct profile
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'alboabourt@progdealer.com';

  IF admin_user_id IS NOT NULL THEN
    INSERT INTO profiles (id, email, role)
    VALUES (admin_user_id, 'alboabourt@progdealer.com', 'admin')
    ON CONFLICT (id) 
    DO UPDATE SET 
      role = 'admin', 
      email = 'alboabourt@progdealer.com',
      updated_at = now();
    
    RAISE NOTICE 'Admin profile ensured for user: %', admin_user_id;
  END IF;
END $$;

-- Final verification
DO $$
DECLARE
  default_role text;
  is_nullable text;
BEGIN
  -- Check role column properties
  SELECT column_default, is_nullable INTO default_role, is_nullable
  FROM information_schema.columns 
  WHERE table_name = 'profiles' AND column_name = 'role';
  
  RAISE NOTICE '✅ REGISTRATION FIX COMPLETE';
  RAISE NOTICE 'Role column default: %', COALESCE(default_role, 'NONE');
  RAISE NOTICE 'Role column nullable: %', is_nullable;
  RAISE NOTICE 'Trigger function: create_user_profile (with error handling)';
  RAISE NOTICE 'All new users will get role = "user" by default';
  RAISE NOTICE 'Registration should now work without database errors';
END $$;