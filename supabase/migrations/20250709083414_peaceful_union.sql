/*
  # Fix SQL column reference ambiguity

  This migration fixes the "column reference 'is_nullable' is ambiguous" error
  by properly qualifying all column references in the information_schema queries.
*/

-- Fix the ambiguous column reference by qualifying with table alias
DO $$
DECLARE
  default_role text;
  is_nullable text;
BEGIN
  -- Check role column properties with properly qualified columns
  SELECT cols.column_default, cols.is_nullable 
  INTO default_role, is_nullable
  FROM information_schema.columns AS cols
  WHERE cols.table_name = 'profiles' 
    AND cols.column_name = 'role'
    AND cols.table_schema = 'public';
  
  RAISE NOTICE '✅ COLUMN REFERENCE FIX APPLIED';
  RAISE NOTICE 'Role column default: %', COALESCE(default_role, 'NONE');
  RAISE NOTICE 'Role column nullable: %', is_nullable;
  
  -- Verify the profiles table structure is correct
  IF default_role IS NULL OR default_role NOT LIKE '%user%' THEN
    RAISE WARNING 'Role column may not have proper default value';
  END IF;
  
  IF is_nullable = 'YES' THEN
    RAISE WARNING 'Role column should be NOT NULL';
  END IF;
END $$;

-- Ensure all information_schema queries use proper table aliases
-- Update the trigger function verification query
DO $$
DECLARE
  trigger_exists boolean;
  function_exists boolean;
BEGIN
  -- Check if trigger exists with qualified columns
  SELECT EXISTS (
    SELECT 1 FROM information_schema.triggers AS trigs
    WHERE trigs.trigger_name = 'create_profile_trigger'
      AND trigs.event_object_table = 'users'
      AND trigs.event_object_schema = 'auth'
  ) INTO trigger_exists;
  
  -- Check if function exists with qualified columns
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines AS routs
    WHERE routs.routine_name = 'create_user_profile'
      AND routs.routine_schema = 'public'
  ) INTO function_exists;
  
  RAISE NOTICE 'Trigger exists: %', trigger_exists;
  RAISE NOTICE 'Function exists: %', function_exists;
  
  IF NOT trigger_exists OR NOT function_exists THEN
    RAISE WARNING 'Profile creation system may not be properly configured';
  END IF;
END $$;

-- Final verification with all qualified column references
DO $$
DECLARE
  profile_count integer;
  admin_count integer;
BEGIN
  -- Count profiles with qualified table reference
  SELECT COUNT(*) INTO profile_count
  FROM public.profiles AS p;
  
  -- Count admin users with qualified table reference
  SELECT COUNT(*) INTO admin_count
  FROM public.profiles AS p
  WHERE p.role = 'admin';
  
  RAISE NOTICE 'Total profiles: %', profile_count;
  RAISE NOTICE 'Admin profiles: %', admin_count;
  RAISE NOTICE '🔧 All SQL queries now use properly qualified column references';
  RAISE NOTICE '✅ Registration system should work without ambiguity errors';
END $$;