-- ============================================================================
-- PART 1: Show columns in tams360_user_profiles_v
-- ============================================================================

SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'tams360_user_profiles_v'
  AND table_schema = 'public'
ORDER BY ordinal_position;


-- ============================================================================
-- PART 2: Show columns in tams360_assets_v
-- ============================================================================

SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'tams360_assets_v'
  AND table_schema = 'public'
ORDER BY ordinal_position;


-- ============================================================================
-- INSTRUCTIONS
-- ============================================================================
-- 1. Run PART 1 - Copy the list of column names
-- 2. Run PART 2 - Copy the list of column names
-- 3. Send both lists to me
--
-- I'm looking for whether you have:
--   - tenant_id (or something similar like org_id, organization_id)
--   - gps_lat and gps_lng (or latitude, longitude, lat, lng)
-- ============================================================================
