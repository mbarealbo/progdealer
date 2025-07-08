/*
  # EMERGENCY LOCKDOWN - BLOCK ALL ACCESS TO eventi_prog

  This migration immediately blocks ALL access to the eventi_prog table
  to prevent further credit consumption and cost escalation.

  CRITICAL: This will break the frontend completely until lockdown is lifted.
*/

-- Ensure RLS is enabled
ALTER TABLE public.eventi_prog ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies immediately
DROP POLICY IF EXISTS "Public can read approved events" ON public.eventi_prog;
DROP POLICY IF EXISTS "Authenticated can read all events" ON public.eventi_prog;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON public.eventi_prog;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON public.eventi_prog;
DROP POLICY IF EXISTS "Allow authenticated users to delete" ON public.eventi_prog;
DROP POLICY IF EXISTS "Allow public event submissions" ON public.eventi_prog;
DROP POLICY IF EXISTS "Emergency lockdown - admin only read" ON public.eventi_prog;
DROP POLICY IF EXISTS "Emergency lockdown - admin only insert" ON public.eventi_prog;
DROP POLICY IF EXISTS "Emergency lockdown - admin only update" ON public.eventi_prog;
DROP POLICY IF EXISTS "Emergency lockdown - admin only delete" ON public.eventi_prog;

-- CREATE STRICT BLOCKING POLICY - BLOCKS EVERYTHING
CREATE POLICY "block_all" ON public.eventi_prog
FOR ALL
TO public, authenticated
USING (false);

-- Additional safety: Revoke all permissions from anon and authenticated roles
REVOKE ALL ON public.eventi_prog FROM anon;
REVOKE ALL ON public.eventi_prog FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.upsert_evento FROM anon;
REVOKE EXECUTE ON FUNCTION public.upsert_evento FROM authenticated;

-- Log emergency lockdown activation
DO $$
BEGIN
  RAISE NOTICE '🚨 EMERGENCY LOCKDOWN ACTIVATED 🚨';
  RAISE NOTICE 'ALL ACCESS TO eventi_prog TABLE BLOCKED';
  RAISE NOTICE 'Policy "block_all" applied with USING (false)';
  RAISE NOTICE 'All permissions revoked from anon and authenticated roles';
  RAISE NOTICE 'Frontend will be completely non-functional until lockdown is lifted';
END $$;