-- ============================================================================
-- COMPLETE VIEW SETUP WITH POSTGREST CACHE REFRESH
-- Run this entire script at once
-- ============================================================================

-- 1. Drop all existing views
DROP VIEW IF EXISTS public.tams360_user_profiles_v CASCADE;
DROP VIEW IF EXISTS public.tams360_tenants_v CASCADE;
DROP VIEW IF EXISTS public.tams360_tenant_settings_v CASCADE;

-- 2. Create user profiles view with explicit columns
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

-- 3. Create tenants view
CREATE VIEW public.tams360_tenants_v AS
SELECT 
  tenant_id,
  name,
  is_active,
  created_at
FROM tams360.tenants;

-- 4. Create tenant settings view
CREATE VIEW public.tams360_tenant_settings_v AS
SELECT 
  tenant_id,
  unique_id_config,
  ref_config,
  updated_at,
  settings
FROM tams360.tenant_settings;

-- 5. Grant all permissions
GRANT SELECT ON public.tams360_user_profiles_v TO anon, authenticated;
GRANT SELECT ON public.tams360_tenants_v TO anon, authenticated;
GRANT SELECT ON public.tams360_tenant_settings_v TO anon, authenticated;

-- 6. Force PostgREST to reload schema (CRITICAL!)
NOTIFY pgrst, 'reload schema';

-- Wait a moment, then notify again
SELECT pg_sleep(1);
NOTIFY pgrst, 'reload schema';

-- 7. Verification queries
SELECT 'User Profiles View Columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'tams360_user_profiles_v'
ORDER BY ordinal_position;

SELECT 'User Profiles Sample Data:' as info;
SELECT id, email, name, tenant_id, role, status 
FROM public.tams360_user_profiles_v 
LIMIT 3;

SELECT 'Tenants Sample Data:' as info;
SELECT tenant_id, name, is_active 
FROM public.tams360_tenants_v 
LIMIT 3;
