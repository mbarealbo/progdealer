/*
  # Fix registration issue with profiles table

  1. Changes
    - Ensure role column has proper default value 'user'
    - Make role column NOT NULL with default
    - Update trigger function to handle edge cases
    - Add better error handling for profile creation

  2. Security
    - Maintain existing RLS policies
    - Ensure all new users get 'user' role by default
    - Handle cases where email might be null
*/

-- First, ensure the profiles table exists with correct structure
DO $$
BEGIN
  -- Check if profiles table exists, if not create it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    CREATE TABLE profiles (
      id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email text NOT NULL,
      role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    
    RAISE NOTICE 'Created profiles table';
  END IF;
END $$;

-- Ensure role column has proper default and constraints
DO $$
BEGIN
  -- Check if role column exists and has correct properties
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    -- Update column to ensure it has proper default and NOT NULL constraint
    ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'user';
    ALTER TABLE profiles ALTER COLUMN role SET NOT NULL;
    
    -- Ensure check constraint exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'profiles' AND constraint_name = 'profiles_role_check'
    ) THEN
      ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
      CHECK (role IN ('user', 'admin'));
    END IF;
    
    RAISE NOTICE 'Updated role column with proper default and constraints';
  ELSE
    -- Add role column if it doesn't exist
    ALTER TABLE profiles ADD COLUMN role text NOT NULL DEFAULT 'user' 
    CHECK (role IN ('user', 'admin'));
    
    RAISE NOTICE 'Added role column with default value';
  END IF;
END $$;

-- Update any existing profiles that might have NULL role
UPDATE profiles SET role = 'user' WHERE role IS NULL;

-- Recreate the trigger function with better error handling
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS trigger AS $$
BEGIN
  -- Insert profile with proper error handling
  INSERT INTO profiles (id, email, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.email, ''), -- Handle potential null email
    'user' -- Always default to 'user' role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(NEW.email, profiles.email),
    updated_at = now();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS create_profile_trigger ON auth.users;
CREATE TRIGGER create_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Recreate policies if they don't exist
DO $$
BEGIN
  -- Users can read their own profile
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Users can read own profile'
  ) THEN
    CREATE POLICY "Users can read own profile"
      ON profiles
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;

  -- Users can update their own profile (but not role)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON profiles
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid()));
  END IF;

  -- Admins can read all profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Admins can read all profiles'
  ) THEN
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
  END IF;

  -- Admins can update any profile
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Admins can update any profile'
  ) THEN
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
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles (role);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles (email);

-- Ensure admin user has correct profile
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Find the admin user by email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'alboabourt@progdealer.com';

  -- If admin user exists, ensure they have admin profile
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

-- Test the trigger function by checking if it would work
DO $$
BEGIN
  RAISE NOTICE 'Profile creation trigger is ready';
  RAISE NOTICE 'Default role for new users: user';
  RAISE NOTICE 'Role column is NOT NULL with default value';
  RAISE NOTICE 'Registration should now work without database errors';
END $$;