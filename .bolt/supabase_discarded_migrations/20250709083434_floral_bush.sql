@@ .. @@
   -- Check if profiles table exists, if not create it
   IF NOT EXISTS (
-    SELECT 1 FROM information_schema.tables 
-    WHERE table_schema = 'public' AND table_name = 'profiles'
+    SELECT 1 FROM information_schema.tables AS tabs
+    WHERE tabs.table_schema = 'public' AND tabs.table_name = 'profiles'
   ) THEN
     CREATE TABLE profiles (
@@ .. @@
   -- Check if role column exists and has correct properties
   IF EXISTS (
-    SELECT 1 FROM information_schema.columns
-    WHERE table_name = 'profiles' AND column_name = 'role'
+    SELECT 1 FROM information_schema.columns AS cols
+    WHERE cols.table_name = 'profiles' AND cols.column_name = 'role'
   ) THEN
     -- Update column to ensure it has proper default and NOT NULL constraint
@@ .. @@
     -- Ensure check constraint exists
     IF NOT EXISTS (
-      SELECT 1 FROM information_schema.table_constraints
-      WHERE table_name = 'profiles' AND constraint_name = 'profiles_role_check'
+      SELECT 1 FROM information_schema.table_constraints AS tc
+      WHERE tc.table_name = 'profiles' AND tc.constraint_name = 'profiles_role_check'
     ) THEN
       ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
       CHECK (role IN ('user', 'admin'));
@@ .. @@
   -- Check if function exists with qualified columns
   IF NOT EXISTS (
-    SELECT 1 FROM information_schema.routines 
-    WHERE routine_schema = 'public' 
-    AND routine_name = 'create_user_profile'
+    SELECT 1 FROM information_schema.routines AS routs
+    WHERE routs.routine_schema = 'public' 
+    AND routs.routine_name = 'create_user_profile'
   ) THEN
     -- Recreate the upsert function if it doesn't exist