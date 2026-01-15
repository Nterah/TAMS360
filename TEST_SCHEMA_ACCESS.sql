-- ============================================================================
-- Test Schema Access and View Creation
-- Run these queries one by one to diagnose the issue
-- ============================================================================

-- 1. Check if the table exists and what columns it has
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'tams360' 
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 2. Check if we can query the table directly
SELECT id, email, name, tenant_id, role, status 
FROM tams360.user_profiles 
LIMIT 3;

-- 3. Check what views exist in public schema
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name LIKE 'tams360%';

-- 4. Check if the view exists and what columns it has
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'tams360_user_profiles_v'
ORDER BY ordinal_position;

-- 5. Try to query the view if it exists
SELECT * FROM public.tams360_user_profiles_v LIMIT 1;

-- 6. Drop and recreate the view with explicit columns
DROP VIEW IF EXISTS public.tams360_user_profiles_v CASCADE;

CREATE VIEW public.tams360_user_profiles_v AS
SELECT 
  id,
  email,
  name,
  organization,
  role,
  tier,
  status,
  depot_id,
  region_id,
  phone,
  avatar_url,
  created_at,
  approved_at,
  approved_by,
  last_login_at,
  metadata,
  tenant_id
FROM tams360.user_profiles;

-- 7. Grant permissions
GRANT SELECT ON public.tams360_user_profiles_v TO anon, authenticated;

-- 8. Verify it works now
SELECT id, email, name, tenant_id, role, status 
FROM public.tams360_user_profiles_v 
LIMIT 3;
