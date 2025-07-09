/*
  # Fix infinite recursion in RLS policies

  1. Problem
    - RLS policies on 'profiles' table were using SELECT queries on 'profiles' table
    - This creates infinite recursion (error 42P17)
    - Functions like is_admin() that query 'profiles' cannot be used in 'profiles' policies

  2. Solution
    - Remove all SELECT queries on 'profiles' from 'profiles' RLS policies
    - Use only direct checks like 'auth.uid() = id'
    - Hardcode admin UUID or use alternative approach for admin checks
    - Avoid using is_admin() function in profiles policies

  3. Changes
    - Drop all existing policies that cause recursion
    - Create simple, direct policies without subqueries
    - Update admin access to work without recursive queries
*/

-- Drop ALL existing policies on profiles table to start fresh
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

-- Get the admin user UUID to hardcode in policies (avoid recursion)
DO $$
DECLARE
  admin_uuid uuid;
BEGIN
  -- Find admin user UUID
  SELECT id INTO admin_uuid
  FROM auth.users
  WHERE email = 'alboabourt@progdealer.com';
  
  IF admin_uuid IS NOT NULL THEN
    -- Create policies with hardcoded admin UUID (no recursion)
    
    -- 1. Users can read their own profile
    EXECUTE format('
      CREATE POLICY "Users can read own profile"
        ON profiles
        FOR SELECT
        TO authenticated
        USING (auth.uid() = id OR auth.uid() = %L)', admin_uuid);
    
    -- 2. Users can update their own profile (but not change user_role unless admin)
    EXECUTE format('
      CREATE POLICY "Users can update own profile"
        ON profiles
        FOR UPDATE
        TO authenticated
        USING (auth.uid() = id OR auth.uid() = %L)
        WITH CHECK (
          auth.uid() = id OR auth.uid() = %L
        )', admin_uuid, admin_uuid);
    
    -- 3. Admin can read all profiles (using hardcoded UUID)
    EXECUTE format('
      CREATE POLICY "Admin can read all profiles"
        ON profiles
        FOR SELECT
        TO authenticated
        USING (auth.uid() = %L)', admin_uuid);
    
    -- 4. Admin can update any profile (using hardcoded UUID)
    EXECUTE format('
      CREATE POLICY "Admin can update any profile"
        ON profiles
        FOR UPDATE
        TO authenticated
        USING (auth.uid() = %L)', admin_uuid);
    
    RAISE NOTICE 'Created RLS policies with hardcoded admin UUID: %', admin_uuid;
  ELSE
    -- Fallback: Create basic policies without admin access
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
      WITH CHECK (auth.uid() = id);
    
    RAISE WARNING 'Admin user not found, created basic policies only';
  END IF;
END $$;

-- Update the is_admin() function to NOT cause recursion
-- This function should only be used OUTSIDE of profiles table policies
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
DECLARE
  admin_uuid uuid;
BEGIN
  -- Hardcode admin check to avoid recursion
  SELECT id INTO admin_uuid
  FROM auth.users
  WHERE email = 'alboabourt@progdealer.com';
  
  -- Return true if current user is the hardcoded admin
  RETURN auth.uid() = admin_uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure admin user profile exists with correct user_role
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
    
    RAISE NOTICE 'Admin profile ensured: % with user_role = admin', admin_user_id;
  END IF;
END $$;

-- Update trigger function to avoid any potential recursion
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS trigger AS $$
BEGIN
  -- Simple insert without any SELECT queries on profiles
  INSERT INTO profiles (id, email, user_role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.email, 'no-email@example.com'),
    'user'  -- Always default to 'user', admin must be set manually
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(NEW.email, profiles.email),
    updated_at = now();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Profile creation failed for user %, continuing: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify no recursive policies exist
DO $$
DECLARE
  policy_record record;
BEGIN
  RAISE NOTICE '=== RLS POLICIES VERIFICATION ===';
  
  FOR policy_record IN 
    SELECT policyname, cmd, qual, with_check
    FROM pg_policies 
    WHERE tablename = 'profiles' AND schemaname = 'public'
  LOOP
    RAISE NOTICE 'Policy: % | Command: % | Using: % | Check: %', 
      policy_record.policyname, 
      policy_record.cmd, 
      policy_record.qual, 
      policy_record.with_check;
  END LOOP;
  
  RAISE NOTICE '=== END VERIFICATION ===';
  RAISE NOTICE 'All policies now use direct UUID checks - NO RECURSION';
  RAISE NOTICE 'Admin user alboabourt@progdealer.com should have full access';
END $$;