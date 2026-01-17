-- ============================================================================
-- TAMS360 MAP TROUBLESHOOTING - RUN THESE QUERIES FIRST
-- ============================================================================
-- Copy these queries into your Supabase SQL Editor or database client
-- Replace placeholders with your actual values
-- ============================================================================

-- ============================================================================
-- STEP 1: GET YOUR TENANT ID
-- ============================================================================
-- Replace 'your-email@example.com' with YOUR actual email address

SELECT 
    id as user_id,
    tenant_id,
    email,
    name,
    role,
    organization,
    status
FROM tams360_user_profiles_v
WHERE email = 'your-email@example.com';  -- ⬅️ REPLACE THIS

-- 📋 WRITE DOWN YOUR tenant_id FROM THE RESULT
-- You'll need it for the next queries
-- Example: '123e4567-e89b-12d3-a456-426614174000'


-- ============================================================================
-- STEP 2: CHECK IF VIEW EXISTS
-- ============================================================================

SELECT 
    'View Exists: ' || CASE WHEN COUNT(*) > 0 THEN '✅ YES' ELSE '❌ NO' END as result
FROM pg_views 
WHERE viewname = 'tams360_assets_v';

-- Expected: "✅ YES"
-- If "❌ NO": The view doesn't exist - THIS IS YOUR PROBLEM!


-- ============================================================================
-- STEP 3: COUNT ASSETS - TABLE vs VIEW
-- ============================================================================
-- Replace 'YOUR_TENANT_ID' with the tenant_id from Step 1

-- Count in base table
SELECT 
    'BASE TABLE' as source,
    COUNT(*) as total_assets,
    COUNT(CASE WHEN gps_lat IS NOT NULL AND gps_lng IS NOT NULL THEN 1 END) as with_gps,
    COUNT(CASE WHEN gps_lat IS NULL OR gps_lng IS NULL THEN 1 END) as without_gps
FROM assets
WHERE tenant_id = 'YOUR_TENANT_ID'  -- ⬅️ REPLACE THIS

UNION ALL

-- Count in view
SELECT 
    'VIEW (what map uses)' as source,
    COUNT(*) as total_assets,
    COUNT(CASE WHEN gps_lat IS NOT NULL AND gps_lng IS NOT NULL THEN 1 END) as with_gps,
    COUNT(CASE WHEN gps_lat IS NULL OR gps_lng IS NULL THEN 1 END) as without_gps
FROM tams360_assets_v
WHERE tenant_id = 'YOUR_TENANT_ID';  -- ⬅️ REPLACE THIS

-- 📊 INTERPRET RESULTS:
-- ✅ If both counts are the same AND with_gps > 0: Assets should display on map
-- ❌ If VIEW count is less than TABLE count: Some assets are filtered out by the view
-- ❌ If with_gps = 0: No assets have GPS coordinates - they won't show on map


-- ============================================================================
-- STEP 4: SHOW RECENT ASSETS (Last 7 days)
-- ============================================================================
-- This shows if your new assets exist and have GPS

SELECT 
    a.asset_id,
    a.asset_ref,
    a.created_at,
    a.gps_lat,
    a.gps_lng,
    CASE 
        WHEN v.asset_id IS NOT NULL THEN '✅ In View (will show on map if has GPS)'
        ELSE '❌ NOT in View (will NOT show on map)'
    END as view_status,
    CASE 
        WHEN a.gps_lat IS NULL OR a.gps_lng IS NULL THEN '❌ No GPS - WONT SHOW ON MAP'
        ELSE '✅ Has GPS - should show on map'
    END as gps_status
FROM assets a
LEFT JOIN tams360_assets_v v ON a.asset_id = v.asset_id
WHERE a.tenant_id = 'YOUR_TENANT_ID'  -- ⬅️ REPLACE THIS
  AND a.created_at > NOW() - INTERVAL '7 days'
ORDER BY a.created_at DESC
LIMIT 20;

-- 📋 LOOK FOR YOUR NEW ASSETS:
-- ✅ If you see them with "✅ In View" and "✅ Has GPS": They SHOULD display on map
-- ❌ If "❌ NOT in View": Asset is being filtered out by the view
-- ❌ If "❌ No GPS": Asset needs GPS coordinates to display


-- ============================================================================
-- STEP 5: FIND ASSETS MISSING FROM VIEW
-- ============================================================================
-- This shows WHICH assets exist in table but NOT in view

SELECT 
    a.asset_id,
    a.asset_ref,
    a.asset_type_id,
    at.name as asset_type_name,
    a.status_id,
    s.name as status_name,
    a.gps_lat,
    a.gps_lng,
    CASE 
        WHEN a.asset_type_id IS NULL THEN '❌ Missing asset_type_id'
        WHEN at.asset_type_id IS NULL THEN '❌ Invalid asset_type_id (not in asset_types table)'
        ELSE '✅ asset_type OK'
    END as asset_type_check,
    CASE 
        WHEN a.status_id IS NULL THEN '⚠️ Missing status_id'
        WHEN s.status_id IS NULL THEN '❌ Invalid status_id (not in statuses table)'
        ELSE '✅ status OK'
    END as status_check,
    '❌ THIS ASSET IS NOT IN THE VIEW!' as issue
FROM assets a
LEFT JOIN tams360_assets_v v ON a.asset_id = v.asset_id
LEFT JOIN asset_types at ON a.asset_type_id = at.asset_type_id
LEFT JOIN statuses s ON a.status_id = s.status_id
WHERE a.tenant_id = 'YOUR_TENANT_ID'  -- ⬅️ REPLACE THIS
  AND v.asset_id IS NULL  -- Assets NOT in the view
ORDER BY a.created_at DESC
LIMIT 20;

-- 📋 IF THIS RETURNS ROWS:
-- These assets exist but are NOT in the view
-- Common causes:
-- - Missing or invalid asset_type_id
-- - Missing or invalid status_id  
-- - View uses INNER JOIN (filters out assets with missing relationships)


-- ============================================================================
-- STEP 6: SAMPLE OF WORKING ASSETS (In view with GPS)
-- ============================================================================
-- This shows assets that SHOULD be visible on the map

SELECT 
    asset_id,
    asset_ref,
    asset_type_name,
    gps_lat,
    gps_lng,
    latest_ci,
    latest_urgency,
    status_name,
    region_name,
    created_at
FROM tams360_assets_v
WHERE tenant_id = 'YOUR_TENANT_ID'  -- ⬅️ REPLACE THIS
  AND gps_lat IS NOT NULL 
  AND gps_lng IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- 📋 THESE ASSETS SHOULD BE VISIBLE ON THE MAP
-- If you see old assets but not new ones, compare with Step 4 results


-- ============================================================================
-- ⚠️ QUICK FIXES (Only if needed)
-- ============================================================================

-- FIX 1: Add GPS coordinates to all assets without GPS
-- (Adds default location: Pretoria, South Africa)
/*
UPDATE assets
SET 
    gps_lat = -25.7479,
    gps_lng = 28.2293
WHERE tenant_id = 'YOUR_TENANT_ID'  -- ⬅️ REPLACE THIS
  AND (gps_lat IS NULL OR gps_lng IS NULL);

-- After running this, refresh your map and check
*/


-- FIX 2: Verify and update asset relationships
-- (If Step 5 showed missing asset_type or status)
/*
-- Check which asset types are available
SELECT asset_type_id, name FROM asset_types;

-- Update asset with valid asset_type_id
UPDATE assets
SET asset_type_id = 'VALID_ASSET_TYPE_ID'
WHERE asset_id = 'YOUR_ASSET_ID';

-- Check which statuses are available
SELECT status_id, name FROM statuses;

-- Update asset with valid status_id
UPDATE assets
SET status_id = 'VALID_STATUS_ID'
WHERE asset_id = 'YOUR_ASSET_ID';
*/


-- ============================================================================
-- 📊 FINAL DIAGNOSIS SUMMARY
-- ============================================================================

SELECT 
    'Your Tenant ID' as metric,
    (SELECT tenant_id::text FROM tams360_user_profiles_v WHERE email = 'your-email@example.com') as value
UNION ALL
SELECT 
    'View Exists?',
    CASE WHEN EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'tams360_assets_v') 
         THEN '✅ YES' ELSE '❌ NO - CREATE THE VIEW!' END
UNION ALL
SELECT 
    'Total Assets in Table',
    (SELECT COUNT(*)::text FROM assets WHERE tenant_id = (
        SELECT tenant_id FROM tams360_user_profiles_v WHERE email = 'your-email@example.com'
    ))
UNION ALL
SELECT 
    'Total Assets in View',
    (SELECT COUNT(*)::text FROM tams360_assets_v WHERE tenant_id = (
        SELECT tenant_id FROM tams360_user_profiles_v WHERE email = 'your-email@example.com'
    ))
UNION ALL
SELECT 
    'Assets with GPS (in view)',
    (SELECT COUNT(*)::text FROM tams360_assets_v 
     WHERE tenant_id = (SELECT tenant_id FROM tams360_user_profiles_v WHERE email = 'your-email@example.com')
       AND gps_lat IS NOT NULL AND gps_lng IS NOT NULL)
UNION ALL
SELECT 
    'Assets created last 7 days',
    (SELECT COUNT(*)::text FROM assets 
     WHERE tenant_id = (SELECT tenant_id FROM tams360_user_profiles_v WHERE email = 'your-email@example.com')
       AND created_at > NOW() - INTERVAL '7 days')
UNION ALL
SELECT 
    'Recent assets in view',
    (SELECT COUNT(*)::text FROM tams360_assets_v 
     WHERE tenant_id = (SELECT tenant_id FROM tams360_user_profiles_v WHERE email = 'your-email@example.com')
       AND created_at > NOW() - INTERVAL '7 days');

-- ⬆️ Don't forget to replace 'your-email@example.com' in the query above!


-- ============================================================================
-- 🎯 NEXT STEPS BASED ON RESULTS
-- ============================================================================
/*

SCENARIO 1: View doesn't exist
→ Contact database admin to create tams360_assets_v view

SCENARIO 2: Assets in table but NOT in view
→ Run Step 5 to identify the issue
→ Likely: missing or invalid asset_type_id or status_id
→ Fix: Update assets with valid foreign keys

SCENARIO 3: Assets in view but missing GPS
→ Run FIX 1 above to add GPS coordinates
→ Or manually update each asset with actual GPS location

SCENARIO 4: Everything looks good but map still empty
→ Check browser console for errors
→ Check network tab for /assets API call
→ Verify you're logged in with correct tenant
→ Try clearing browser cache and refreshing

SCENARIO 5: Old assets show but new ones don't
→ New assets likely missing GPS coordinates or failing view joins
→ Run Step 4 and Step 5 to identify specific issues with new assets

*/
