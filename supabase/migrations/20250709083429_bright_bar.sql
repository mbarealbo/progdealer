@@ .. @@
 -- Add check constraint if it doesn't exist
 DO $$
 BEGIN
   IF NOT EXISTS (
-    SELECT 1 FROM information_schema.table_constraints
-    WHERE table_name = 'profiles' AND constraint_name = 'profiles_role_check'
+    SELECT 1 FROM information_schema.table_constraints AS tc
+    WHERE tc.table_name = 'profiles' AND tc.constraint_name = 'profiles_role_check'
   ) THEN
     ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
     CHECK (role IN ('user', 'admin'));
@@ .. @@
 DECLARE
   default_role text;
   is_nullable text;
 BEGIN
   -- Check role column properties
-  SELECT column_default, is_nullable INTO default_role, is_nullable
-  FROM information_schema.columns 
-  WHERE table_name = 'profiles' AND column_name = 'role';
+  SELECT cols.column_default, cols.is_nullable INTO default_role, is_nullable
+  FROM information_schema.columns AS cols
+  WHERE cols.table_name = 'profiles' AND cols.column_name = 'role';
   
   RAISE NOTICE '✅ REGISTRATION FIX COMPLETE';
   RAISE NOTICE 'Role column default: %', COALESCE(default_role, 'NONE');