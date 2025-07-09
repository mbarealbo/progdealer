@@ .. @@
 DO $$
 BEGIN
   IF NOT EXISTS (
-    SELECT 1 FROM information_schema.columns
-    WHERE table_name = 'eventi_prog' AND column_name = 'country'
+    SELECT 1 FROM information_schema.columns AS cols
+    WHERE cols.table_name = 'eventi_prog' AND cols.column_name = 'country'
   ) THEN
     ALTER TABLE eventi_prog ADD COLUMN country text;
   END IF;