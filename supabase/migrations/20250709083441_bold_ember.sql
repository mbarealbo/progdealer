@@ .. @@
 DO $$
 BEGIN
   IF NOT EXISTS (
-    SELECT 1 FROM information_schema.columns
-    WHERE table_name = 'eventi_prog' AND column_name = 'status'
+    SELECT 1 FROM information_schema.columns AS cols
+    WHERE cols.table_name = 'eventi_prog' AND cols.column_name = 'status'
   ) THEN
     ALTER TABLE eventi_prog ADD COLUMN status text DEFAULT 'approved';
@@ .. @@
 DO $$
 BEGIN
   IF NOT EXISTS (
-    SELECT 1 FROM information_schema.table_constraints
-    WHERE table_name = 'eventi_prog' AND constraint_name = 'eventi_prog_status_check'
+    SELECT 1 FROM information_schema.table_constraints AS tc
+    WHERE tc.table_name = 'eventi_prog' AND tc.constraint_name = 'eventi_prog_status_check'
   ) THEN
     ALTER TABLE eventi_prog ADD CONSTRAINT eventi_prog_status_check 
     CHECK (status IN ('pending', 'approved', 'rejected'));