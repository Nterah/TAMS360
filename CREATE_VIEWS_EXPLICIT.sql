-- ============================================================================
-- EXPLICIT COLUMN LISTING FOR VIEWS
-- This ensures PostgREST can properly see all columns
-- ============================================================================

-- First, drop the existing view
DROP VIEW IF EXISTS public.tams360_user_profiles_v CASCADE;

-- Create view with explicit column listing
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

-- Verify the view structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'tams360_user_profiles_v'
ORDER BY ordinal_position;

-- Test query to verify data
SELECT id, email, name, tenant_id, role, status 
FROM public.tams360_user_profiles_v 
LIMIT 5;
