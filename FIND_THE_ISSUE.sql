-- ============================================================================
-- ULTIMATE DIAGNOSTIC - Run this to find the exact issue
-- ============================================================================

-- This single query will tell us everything we need to know
-- Just replace YOUR_EMAIL_HERE with your actual email address

WITH user_info AS (
    SELECT 
        id as user_id,
        email,
        tenant_id,
        organization,
        role
    FROM tams360_user_profiles_v
    WHERE email = 'YOUR_EMAIL_HERE'  -- ⬅️ REPLACE THIS
),
tenant_assets AS (
    SELECT 
        tenant_id,
        COUNT(*) as total_assets,
        COUNT(CASE WHEN gps_lat IS NOT NULL AND gps_lng IS NOT NULL THEN 1 END) as assets_with_gps,
        MIN(gps_lat) as min_lat,
        MAX(gps_lat) as max_lat,
        MIN(gps_lng) as min_lng,
        MAX(gps_lng) as max_lng
    FROM tams360_assets_v
    WHERE tenant_id = (SELECT tenant_id FROM user_info)
    GROUP BY tenant_id
)
SELECT 
    '=== YOUR USER INFO ===' as section,
    u.email,
    u.organization,
    u.role,
    u.tenant_id::text as your_tenant_id,
    CASE 
        WHEN u.tenant_id IS NULL THEN '❌ NO TENANT - User not assigned to organization'
        ELSE '✅ User has tenant_id'
    END as user_status
FROM user_info u

UNION ALL

SELECT 
    '=== YOUR TENANT ASSETS ===',
    COALESCE(ta.total_assets::text, '0') as total_assets,
    COALESCE(ta.assets_with_gps::text, '0') as assets_with_gps,
    '',
    '',
    CASE 
        WHEN ta.total_assets IS NULL OR ta.total_assets = 0 THEN '❌ NO ASSETS - Tenant has no assets in database'
        WHEN ta.assets_with_gps = 0 THEN '❌ NO GPS - Assets exist but have no coordinates'
        ELSE '✅ Ready to map - Assets have GPS coordinates'
    END
FROM tenant_assets ta

UNION ALL

SELECT 
    '=== GPS BOUNDS ===',
    CONCAT('Lat: ', ROUND(ta.min_lat::numeric, 6), ' to ', ROUND(ta.max_lat::numeric, 6)),
    CONCAT('Lng: ', ROUND(ta.min_lng::numeric, 6), ' to ', ROUND(ta.max_lng::numeric, 6)),
    '',
    '',
    'Geographic area of your assets'
FROM tenant_assets ta
WHERE ta.total_assets > 0;


-- ============================================================================
-- HOW TO USE
-- ============================================================================

/*

1. Replace YOUR_EMAIL_HERE with your actual email (keep the quotes)
2. Run the query
3. Send me the results

THE RESULTS WILL SHOW:

✅ GOOD SCENARIO:
  - User has tenant_id: ✅
  - Assets with GPS: 5 (or whatever number)
  - Status: ✅ Ready to map

❌ BAD SCENARIO 1 - No Tenant:
  - User has tenant_id: ❌ NO TENANT
  - Fix: Assign user to organization

❌ BAD SCENARIO 2 - No Assets:
  - User has tenant_id: ✅
  - Assets: ❌ NO ASSETS
  - Fix: Create assets for this tenant

❌ BAD SCENARIO 3 - No GPS:
  - User has tenant_id: ✅
  - Assets: 5
  - Assets with GPS: ❌ NO GPS
  - Fix: Add GPS coordinates to assets

*/
