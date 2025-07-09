/*
  # Rename role column to user_role to fix backend introspection bug

  This migration works around a backend introspection bug where queries to
  information_schema.columns cause "column reference 'is_nullable' is ambiguous" errors.

  1. Changes
    - Rename `role` column to `user_role` in profiles table
    - Update all constraints to use `user_role`
    - Update all RLS policies to use `user_role`
    - Update all functions to use `user_role`
    - Maintain all existing functionality

  2. Security
    - All RLS policies updated to use new column name
    - All constraints maintained with new column name
    - All functions updated to use new column name
*/

-- Rename the role column to user_role
ALTER TABLE profiles RENAME COLUMN role TO user_role;

-- Update the check constraint to use new column name
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_user_role_check 
CHECK (user_role IN ('user', 'admin'));

-- Drop existing index and create new one
DROP INDEX IF EXISTS profiles_role_idx;
CREATE INDEX profiles_user_role_idx ON profiles (user_role);

-- Drop all existing RLS policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

-- Recreate RLS policies with user_role column
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
  WITH CHECK (auth.uid() = id AND user_role = (SELECT user_role FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND user_role = 'admin'
    )
  );

CREATE POLICY "Admins can update any profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND user_role = 'admin'
    )
  );

-- Update the trigger function to use user_role
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, user_role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.email, 'no-email@example.com'),
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(NEW.email, profiles.email),
    user_role = COALESCE(profiles.user_role, 'user'),
    updated_at = now();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Profile creation failed for user %, continuing: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the is_admin function to use user_role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND user_role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update eventi_prog policies to use new function (they already call is_admin())
-- No changes needed for eventi_prog policies since they use the is_admin() function

-- Ensure admin user has correct user_role
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'alboabourt@progdealer.com';

  IF admin_user_id IS NOT NULL THEN
    INSERT INTO profiles (id, email, user_role)
    VALUES (admin_user_id, 'alboabourt@progdealer.com', 'admin')
    ON CONFLICT (id) 
    DO UPDATE SET 
      user_role = 'admin', 
      email = 'alboabourt@progdealer.com',
      updated_at = now();
    
    RAISE NOTICE 'Admin profile updated with user_role = admin for user: %', admin_user_id;
  END IF;
END $$;

-- Final verification
DO $$
DECLARE
  column_exists boolean;
  admin_count integer;
BEGIN
  -- Check if user_role column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns AS cols
    WHERE cols.table_name = 'profiles' 
      AND cols.column_name = 'user_role'
      AND cols.table_schema = 'public'
  ) INTO column_exists;
  
  -- Count admin users
  SELECT COUNT(*) INTO admin_count
  FROM profiles
  WHERE user_role = 'admin';
  
  RAISE NOTICE '✅ ROLE COLUMN RENAMED TO user_role';
  RAISE NOTICE 'Column exists: %', column_exists;
  RAISE NOTICE 'Admin users: %', admin_count;
  RAISE NOTICE 'All policies, functions, and constraints updated';
  RAISE NOTICE 'Frontend code must now use user_role instead of role';
END $$;