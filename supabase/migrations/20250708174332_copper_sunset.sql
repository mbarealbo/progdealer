-- Insert admin user into auth.users table
-- Note: In production, this should be done through Supabase Auth API
-- This is a development setup for the admin user structure

-- Create a function to safely create admin user if not exists
CREATE OR REPLACE FUNCTION create_admin_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Check if admin user already exists
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'alboabourt@progdealer.com';

  -- If user doesn't exist, we'll need to create it through the application
  -- This migration sets up the structure, but the actual user creation
  -- should be done through Supabase Auth API or dashboard

  -- Log that admin setup is ready (no specific user details)
  RAISE NOTICE 'Admin user structure ready. Create admin user through Supabase dashboard or Auth API with secure credentials.';
END;
$$;

-- Execute the function
SELECT create_admin_user();

-- Clean up the function
DROP FUNCTION create_admin_user();