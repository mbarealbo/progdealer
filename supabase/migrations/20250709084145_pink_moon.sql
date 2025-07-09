@@ .. @@
 DO $$
 BEGIN
   -- Check if profiles table exists, if not create it
   IF NOT EXISTS (
-    SELECT 1 FROM information_schema.tables 
-    WHERE table_schema = 'public' AND table_name = 'profiles'
+    SELECT 1 FROM information_schema.tables AS tabs
+    WHERE tabs.table_schema = 'public' AND tabs.table_name = 'profiles'
   ) THEN
     CREATE TABLE profiles (
       id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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
   -- Users can read their own profile
   IF NOT EXISTS (
-    SELECT 1 FROM pg_policies 
-    WHERE tablename = 'profiles' AND policyname = 'Users can read own profile'
+    SELECT 1 FROM pg_policies AS pol
+    WHERE pol.tablename = 'profiles' AND pol.policyname = 'Users can read own profile'
   ) THEN
     CREATE POLICY "Users can read own profile"
@@ .. @@
   -- Users can update their own profile (but not role)
   IF NOT EXISTS (
-    SELECT 1 FROM pg_policies 
-    WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
+    SELECT 1 FROM pg_policies AS pol
+    WHERE pol.tablename = 'profiles' AND pol.policyname = 'Users can update own profile'
   ) THEN
     CREATE POLICY "Users can update own profile"
@@ .. @@
   -- Admins can read all profiles
   IF NOT EXISTS (
-    SELECT 1 FROM pg_policies 
-    WHERE tablename = 'profiles' AND policyname = 'Admins can read all profiles'
+    SELECT 1 FROM pg_policies AS pol
+    WHERE pol.tablename = 'profiles' AND pol.policyname = 'Admins can read all profiles'
   ) THEN
     CREATE POLICY "Admins can read all profiles"
@@ .. @@
   -- Admins can update any profile
   IF NOT EXISTS (
-    SELECT 1 FROM pg_policies 
-    WHERE tablename = 'profiles' AND policyname = 'Admins can update any profile'
+    SELECT 1 FROM pg_policies AS pol
+    WHERE pol.tablename = 'profiles' AND pol.policyname = 'Admins can update any profile'
   ) THEN
     CREATE POLICY "Admins can update any profile"