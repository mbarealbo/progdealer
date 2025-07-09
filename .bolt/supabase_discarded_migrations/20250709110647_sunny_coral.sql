/*
  # Fix admin access for alboabourt@progdealer.com
  
  1. Ensure admin user has correct user_role in profiles table
  2. Fix RLS policies on eventi_prog to work with hardcoded admin UUID
  3. Remove dependency on is_admin() function in RLS policies
  4. Grant proper permissions
*/

-- First, ensure the admin user exists and has admin role
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Find the admin user by email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'alboabourt@progdealer.com';

  IF admin_user_id IS NOT NULL THEN
    -- Ensure profile exists with admin role
    INSERT INTO profiles (id, email, user_role)
    VALUES (admin_user_id, 'alboabourt@progdealer.com', 'admin')
    ON CONFLICT (id) 
    DO UPDATE SET 
      user_role = 'admin', 
      email = 'alboabourt@progdealer.com',
      updated_at = now();
    
    RAISE NOTICE 'Admin user profile ensured: % with user_role = admin', admin_user_id;
    
    -- Now fix eventi_prog policies with hardcoded admin UUID
    -- Drop all existing policies on eventi_prog
    DROP POLICY IF EXISTS "Public can read approved events" ON eventi_prog;
    DROP POLICY IF EXISTS "Admins can read all events" ON eventi_prog;
    DROP POLICY IF EXISTS "Admins can insert events" ON eventi_prog;
    DROP POLICY IF EXISTS "Admins can update events" ON eventi_prog;
    DROP POLICY IF EXISTS "Admins can delete events" ON eventi_prog;
    DROP POLICY IF EXISTS "Public can submit manual events" ON eventi_prog;

    -- Create new policies with hardcoded admin UUID (no function calls)
    
    -- 1. Public can read approved events
    CREATE POLICY "Public can read approved events"
      ON eventi_prog
      FOR SELECT
      TO public
      USING (status = 'approved' OR status IS NULL);

    -- 2. Admin can read all events (hardcoded UUID)
    EXECUTE format('
      CREATE POLICY "Admin can read all events"
        ON eventi_prog
        FOR SELECT
        TO authenticated
        USING (auth.uid() = %L)', admin_user_id);

    -- 3. Admin can insert events (hardcoded UUID)
    EXECUTE format('
      CREATE POLICY "Admin can insert events"
        ON eventi_prog
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = %L)', admin_user_id);

    -- 4. Admin can update events (hardcoded UUID)
    EXECUTE format('
      CREATE POLICY "Admin can update events"
        ON eventi_prog
        FOR UPDATE
        TO authenticated
        USING (auth.uid() = %L)', admin_user_id);

    -- 5. Admin can delete events (hardcoded UUID)
    EXECUTE format('
      CREATE POLICY "Admin can delete events"
        ON eventi_prog
        FOR DELETE
        TO authenticated
        USING (auth.uid() = %L)', admin_user_id);

    -- 6. Public can submit manual events
    CREATE POLICY "Public can submit manual events"
      ON eventi_prog
      FOR INSERT
      TO public
      WITH CHECK (tipo_inserimento = 'manual');

    RAISE NOTICE 'Created eventi_prog policies with hardcoded admin UUID: %', admin_user_id;
    
  ELSE
    RAISE ERROR 'Admin user alboabourt@progdealer.com not found in auth.users!';
  END IF;
END $$;

-- Update is_admin function to use hardcoded UUID (for frontend use only, not RLS)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get hardcoded admin UUID
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'alboabourt@progdealer.com';
  
  -- Return true if current user is the admin
  RETURN auth.uid() = admin_user_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON eventi_prog TO authenticated;
GRANT ALL ON profiles TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_evento TO authenticated;

-- Final verification
DO $$
DECLARE
  admin_user_id uuid;
  admin_role text;
  policy_count integer;
BEGIN
  -- Get admin info
  SELECT u.id, p.user_role INTO admin_user_id, admin_role
  FROM auth.users u
  LEFT JOIN profiles p ON u.id = p.id
  WHERE u.email = 'alboabourt@progdealer.com';
  
  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'eventi_prog' AND schemaname = 'public';
  
  RAISE NOTICE '=== ADMIN ACCESS FIX COMPLETE ===';
  RAISE NOTICE 'Admin UUID: %', admin_user_id;
  RAISE NOTICE 'Admin role: %', admin_role;
  RAISE NOTICE 'Eventi_prog policies: %', policy_count;
  RAISE NOTICE 'Admin user alboabourt@progdealer.com should now have FULL admin access';
  RAISE NOTICE 'User must LOGOUT and LOGIN again to refresh permissions';
  RAISE NOTICE '================================';
END $$;