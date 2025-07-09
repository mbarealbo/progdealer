
+-- Check if table exists before operations
+DO $$
+BEGIN
+  IF EXISTS (
+    SELECT 1 FROM information_schema.tables AS tabs
+    WHERE tabs.table_schema = 'public' AND tabs.table_name = 'eventi_prog'
+  ) THEN
+    DROP TABLE eventi_prog CASCADE;
+    RAISE NOTICE 'Dropped existing eventi_prog table';
+  END IF;
+END $$;
 
 -- Create new table with updated structure