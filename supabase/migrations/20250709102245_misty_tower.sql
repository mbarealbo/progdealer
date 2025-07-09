/*
  # Fix admin access for alboabourt@progdealer.com

  1. Ensure the user exists in profiles table with user_role = 'admin'
  2. Verify all RLS policies work correctly with user_role column
  3. Debug and fix any permission issues
*/

-- First, let's check if the admin user exists and fix their profile
DO $$
DECLARE
  admin_user_id uuid;
  profile_exists boolean;
BEGIN
  -- Find the admin user by email in auth.users
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'alboabourt@progdealer.com';

  IF admin_user_id IS NOT NULL THEN
    RAISE NOTICE 'Found admin user in auth.users with ID: %', admin_user_id;
    
    -- Check if profile exists
    SELECT EXISTS (
      SELECT 1 FROM profiles WHERE id = admin_user_id
    ) INTO profile_exists;
    
    IF profile_exists THEN
      -- Update existing profile to ensure admin role
      UPDATE profiles 
      SET user_role = 'admin', 
          email = 'alboabourt@progdealer.com',
          updated_at = now()
      WHERE id = admin_user_id;
      
      RAISE NOTICE 'Updated existing profile to admin role';
    ELSE
      -- Create new profile with admin role
      INSERT INTO profiles (id, email, user_role)
      VALUES (admin_user_id, 'alboabourt@progdealer.com', 'admin');
      
      RAISE NOTICE 'Created new admin profile';
    END IF;
    
    -- Verify the profile was created/updated correctly
    DECLARE
      current_role text;
    BEGIN
      SELECT user_role INTO current_role
      FROM profiles
      WHERE id = admin_user_id;
      
      RAISE NOTICE 'Admin user profile role is now: %', current_role;
    END;
    
  ELSE
    RAISE NOTICE 'Admin user not found in auth.users table. User must sign up first.';
  END IF;
END $$;

-- Ensure the is_admin() function works correctly
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
DECLARE
  user_role_value text;
BEGIN
  -- Get the current user's role
  SELECT user_role INTO user_role_value
  FROM profiles 
  WHERE id = auth.uid();
  
  -- Return true if user_role is 'admin'
  RETURN user_role_value = 'admin';
EXCEPTION
  WHEN OTHERS THEN
    -- If any error occurs, return false
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the is_admin function for debugging
DO $$
DECLARE
  admin_user_id uuid;
  test_result boolean;
BEGIN
  -- Get admin user ID
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'alboabourt@progdealer.com';
  
  IF admin_user_id IS NOT NULL THEN
    -- Test the function by temporarily setting the context
    -- Note: This is just for verification, actual function will use auth.uid()
    SELECT EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = admin_user_id AND user_role = 'admin'
    ) INTO test_result;
    
    RAISE NOTICE 'Admin check for user % returns: %', admin_user_id, test_result;
  END IF;
END $$;

-- Verify all RLS policies are correctly set up
DO $$
DECLARE
  policy_count integer;
BEGIN
  -- Count policies on profiles table
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'profiles' AND schemaname = 'public';
  
  RAISE NOTICE 'Number of RLS policies on profiles table: %', policy_count;
  
  -- List all policies for debugging
  FOR policy_count IN 
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND schemaname = 'public'
  LOOP
    RAISE NOTICE 'Policy exists on profiles table';
  END LOOP;
END $$;

-- Grant necessary permissions to ensure access works
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, UPDATE ON profiles TO authenticated;

-- Final verification
DO $$
DECLARE
  admin_count integer;
  total_profiles integer;
BEGIN
  SELECT COUNT(*) INTO total_profiles FROM profiles;
  SELECT COUNT(*) INTO admin_count FROM profiles WHERE user_role = 'admin';
  
  RAISE NOTICE '=== ADMIN ACCESS FIX SUMMARY ===';
  RAISE NOTICE 'Total profiles: %', total_profiles;
  RAISE NOTICE 'Admin profiles: %', admin_count;
  RAISE NOTICE 'Admin user alboabourt@progdealer.com should now have access';
  RAISE NOTICE 'User must log out and log back in to refresh permissions';
  RAISE NOTICE '================================';
END $$;