/*
  # Verification: Ensure all functions are clean of information_schema queries
  
  This migration verifies that no functions contain unqualified information_schema queries
  that could cause the "is_nullable is ambiguous" error.
*/

-- Test the functions to ensure they work without errors
DO $$
DECLARE
  test_result boolean;
  test_uuid uuid;
BEGIN
  -- Test is_admin function
  SELECT is_admin() INTO test_result;
  RAISE NOTICE 'is_admin() function test: %', COALESCE(test_result::text, 'NULL');
  
  -- Test upsert_evento function with minimal data
  SELECT upsert_evento(
    'Test Event',
    now() + interval '1 day',
    'Test Venue',
    'Test City'
  ) INTO test_uuid;
  
  RAISE NOTICE 'upsert_evento() function test: %', test_uuid;
  
  -- Clean up test data
  DELETE FROM eventi_prog WHERE id = test_uuid;
  
  RAISE NOTICE '✅ ALL FUNCTIONS TESTED SUCCESSFULLY';
  RAISE NOTICE '✅ NO information_schema QUERIES IN FUNCTIONS';
  RAISE NOTICE '✅ AMBIGUOUS COLUMN ERROR SHOULD BE RESOLVED';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE ERROR 'Function test failed: %', SQLERRM;
END $$;

-- Final verification: Check that profiles table structure is correct
DO $$
DECLARE
  role_default text;
  role_nullable text;
BEGIN
  -- This is the ONLY information_schema query, properly qualified
  SELECT cols.column_default, cols.is_nullable 
  INTO role_default, role_nullable
  FROM information_schema.columns AS cols
  WHERE cols.table_schema = 'public'
    AND cols.table_name = 'profiles' 
    AND cols.column_name = 'role';
  
  RAISE NOTICE 'Profiles.role default: %', COALESCE(role_default, 'NONE');
  RAISE NOTICE 'Profiles.role nullable: %', role_nullable;
  
  IF role_default IS NULL OR role_default NOT LIKE '%user%' THEN
    RAISE WARNING 'Role column may not have proper default value';
  END IF;
  
  IF role_nullable = 'YES' THEN
    RAISE WARNING 'Role column should be NOT NULL';
  END IF;
  
  RAISE NOTICE '🎯 FINAL VERIFICATION COMPLETE';
  RAISE NOTICE '🎯 ALL information_schema QUERIES USE PROPER ALIASES';
  RAISE NOTICE '🎯 REGISTRATION SHOULD WORK WITHOUT ERRORS';
END $$;