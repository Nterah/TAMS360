-- ============================================================================
-- Force PostgREST Schema Refresh
-- ============================================================================

-- Drop old view
DROP VIEW IF EXISTS public.tams360_user_profiles_v CASCADE;

-- Create view with explicit columns (same name but fresh)
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

-- Grant permissions
GRANT SELECT ON public.tams360_user_profiles_v TO anon, authenticated;

-- CRITICAL: Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Verify
SELECT id, email, name, tenant_id, role, status 
FROM public.tams360_user_profiles_v 
LIMIT 3;
