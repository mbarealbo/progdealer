
   -- Check if eventi_prog table exists
   IF NOT EXISTS (
-    SELECT 1 FROM information_schema.tables 
-    WHERE table_schema = 'public' 
-    AND table_name = 'eventi_prog'
+    SELECT 1 FROM information_schema.tables AS tabs
+    WHERE tabs.table_schema = 'public' 
+    AND tabs.table_name = 'eventi_prog'
   ) THEN
     
     RAISE NOTICE 'Table eventi_prog does not exist. Creating it now...';

   -- Recreate the upsert function if it doesn't exist
   IF NOT EXISTS (
-    SELECT 1 FROM information_schema.routines 
-    WHERE routine_schema = 'public' AND routine_name = 'upsert_evento'
+    SELECT 1 FROM information_schema.routines AS routs
+    WHERE routs.routine_schema = 'public' AND routs.routine_name = 'upsert_evento'
   ) THEN
     -- Recreate the upsert function if it doesn't exist