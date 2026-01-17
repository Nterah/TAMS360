-- ============================================================================
-- DATA DIAGNOSTICS - Check if your tenant has assets with GPS coordinates
-- ============================================================================

-- STEP 1: What's YOUR tenant_id?
-- ============================================================================

SELECT 
    id as user_id,
    email,
    tenant_id,
    organization,
    role
FROM tams360_user_profiles_v
WHERE email = 'your-email@example.com';  -- ⬅️ REPLACE with your actual email

-- 📋 COPY YOUR TENANT_ID from the result


-- STEP 2: How many assets does your tenant have?
-- ============================================================================

SELECT 
    tenant_id,
    COUNT(*) as total_assets,
    COUNT(CASE WHEN gps_lat IS NOT NULL AND gps_lng IS NOT NULL THEN 1 END) as assets_with_gps,
    COUNT(CASE WHEN gps_lat IS NULL OR gps_lng IS NULL THEN 1 END) as assets_without_gps
FROM tams360_assets_v
WHERE tenant_id = 'YOUR-TENANT-ID-HERE'  -- ⬅️ REPLACE with tenant_id from STEP 1
GROUP BY tenant_id;


-- STEP 3: Show me a few sample assets from your tenant
-- ============================================================================

SELECT 
    asset_id,
    asset_ref,
    asset_type_name,
    gps_lat,
    gps_lng,
    status_name,
    created_at
FROM tams360_assets_v
WHERE tenant_id = 'YOUR-TENANT-ID-HERE'  -- ⬅️ REPLACE with your tenant_id
ORDER BY created_at DESC
LIMIT 5;


-- STEP 4: Check if tenant_id is actually being saved with assets
-- ============================================================================

SELECT 
    CASE 
        WHEN tenant_id IS NULL THEN '❌ tenant_id is NULL'
        ELSE '✅ tenant_id is set'
    END as tenant_status,
    COUNT(*) as count
FROM tams360_assets_v
GROUP BY tenant_id IS NULL;


-- STEP 5: Show all tenants that have assets
-- ============================================================================

SELECT 
    a.tenant_id,
    t.name as organization_name,
    COUNT(a.asset_id) as asset_count,
    COUNT(CASE WHEN a.gps_lat IS NOT NULL AND a.gps_lng IS NOT NULL THEN 1 END) as mappable_assets
FROM tams360_assets_v a
LEFT JOIN tams360_tenants_v t ON a.tenant_id = t.tenant_id
GROUP BY a.tenant_id, t.name
ORDER BY asset_count DESC;


-- ============================================================================
-- INTERPRETATION
-- ============================================================================

/*

EXPECTED RESULTS:

STEP 1: Should show your user profile with a tenant_id
STEP 2: Should show how many assets your tenant has
STEP 3: Should show actual asset data with GPS coordinates
STEP 4: Should show "✅ tenant_id is set" 
STEP 5: Should list all organizations with their asset counts

POSSIBLE ISSUES:

Issue A: tenant_id is NULL in assets
→ Assets were created without tenant_id
→ Need to update assets to set tenant_id

Issue B: Your user has no tenant_id
→ User profile not properly configured
→ Need to assign user to organization

Issue C: Assets have wrong tenant_id
→ Assets belong to different organization
→ Data isolation is working (but assets are in wrong org)

Issue D: Assets have no GPS coordinates
→ gps_lat/gps_lng are NULL
→ Assets can't be mapped without coordinates

*/
