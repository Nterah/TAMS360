-- ============================================================================
-- TAMS360 MAP DATA DIAGNOSTIC QUERIES
-- ============================================================================
-- This file helps you verify where map data comes from and diagnose why
-- new tenant assets might not be displaying on the map (web or mobile)
-- ============================================================================

-- 📍 DATA SOURCE CONFIRMATION
-- The map (both web and mobile) fetches data from:
-- Backend: /make-server-c894a9ff/assets endpoint (line 2667 in index.tsx)
-- Database View: public.tams360_assets_v
-- Filter: BY tenant_id (from user's profile)

-- ============================================================================
-- STEP 1: CHECK IF THE VIEW EXISTS
-- ============================================================================
SELECT 
    schemaname, 
    viewname, 
    viewowner,
    definition
FROM pg_views 
WHERE viewname = 'tams360_assets_v';

-- Expected: Should return 1 row showing the view definition
-- If no rows: The view doesn't exist (this is your problem!)


-- ============================================================================
-- STEP 2: CHECK YOUR TENANT ID
-- ============================================================================
-- Replace 'your-email@example.com' with your actual email
SELECT 
    id as user_id,
    tenant_id,
    email,
    name,
    role,
    status,
    organization
FROM tams360_user_profiles_v
WHERE email = 'your-email@example.com';

-- Copy the tenant_id from the result and use it in the queries below


-- ============================================================================
-- STEP 3: CHECK ASSETS IN THE BASE TABLE (replace YOUR_TENANT_ID)
-- ============================================================================
-- This shows ALL assets in the raw assets table for your tenant
SELECT 
    asset_id,
    asset_ref,
    asset_type_id,
    tenant_id,
    gps_lat,
    gps_lng,
    created_at,
    created_by,
    status_id
FROM assets
WHERE tenant_id = 'YOUR_TENANT_ID'  -- Replace with your actual tenant_id
ORDER BY created_at DESC
LIMIT 50;

-- Check:
-- ✅ Do you see your recently created assets?
-- ✅ Do they have gps_lat and gps_lng values? (REQUIRED for map display)
-- ✅ Is the tenant_id correct?


-- ============================================================================
-- STEP 4: CHECK ASSETS IN THE VIEW (replace YOUR_TENANT_ID)
-- ============================================================================
-- This is what the map actually uses
SELECT 
    asset_id,
    asset_ref,
    asset_type_name,
    tenant_id,
    gps_lat,
    gps_lng,
    latest_ci,
    latest_urgency,
    latest_condition,
    status_name,
    region_name,
    ward_name,
    road_name
FROM tams360_assets_v
WHERE tenant_id = 'YOUR_TENANT_ID'  -- Replace with your actual tenant_id
ORDER BY asset_id DESC
LIMIT 50;

-- Check:
-- ✅ Do you see the same assets as in the base table?
-- ❌ If assets are missing here, the VIEW has a problem (joins might be filtering them out)


-- ============================================================================
-- STEP 5: COMPARE COUNTS - BASE TABLE vs VIEW
-- ============================================================================
-- This shows if assets are being filtered out by the view

-- Count in base table
SELECT 
    'BASE TABLE' as source,
    COUNT(*) as total_assets,
    COUNT(CASE WHEN gps_lat IS NOT NULL AND gps_lng IS NOT NULL THEN 1 END) as assets_with_gps
FROM assets
WHERE tenant_id = 'YOUR_TENANT_ID'  -- Replace with your actual tenant_id

UNION ALL

-- Count in view
SELECT 
    'VIEW' as source,
    COUNT(*) as total_assets,
    COUNT(CASE WHEN gps_lat IS NOT NULL AND gps_lng IS NOT NULL THEN 1 END) as assets_with_gps
FROM tams360_assets_v
WHERE tenant_id = 'YOUR_TENANT_ID';  -- Replace with your actual tenant_id

-- If the counts are DIFFERENT, the view is filtering out some assets!


-- ============================================================================
-- STEP 6: FIND ASSETS THAT EXIST IN TABLE BUT NOT IN VIEW
-- ============================================================================
-- This identifies WHICH assets are being filtered out
SELECT 
    a.asset_id,
    a.asset_ref,
    a.asset_type_id,
    a.status_id,
    a.gps_lat,
    a.gps_lng,
    a.created_at,
    'MISSING FROM VIEW' as issue
FROM assets a
LEFT JOIN tams360_assets_v v ON a.asset_id = v.asset_id
WHERE a.tenant_id = 'YOUR_TENANT_ID'  -- Replace with your actual tenant_id
  AND v.asset_id IS NULL
ORDER BY a.created_at DESC;

-- If this returns rows, these assets exist in the table but are NOT in the view
-- Common reasons:
-- - Missing related data (asset_type_id doesn't exist in asset_types table)
-- - Missing status_id in statuses table
-- - View uses INNER JOINs instead of LEFT JOINs


-- ============================================================================
-- STEP 7: CHECK FOR GPS COORDINATES
-- ============================================================================
-- Assets MUST have GPS coordinates to show on the map
SELECT 
    'With GPS' as category,
    COUNT(*) as count
FROM tams360_assets_v
WHERE tenant_id = 'YOUR_TENANT_ID'  -- Replace with your actual tenant_id
  AND gps_lat IS NOT NULL 
  AND gps_lng IS NOT NULL

UNION ALL

SELECT 
    'Without GPS' as category,
    COUNT(*) as count
FROM tams360_assets_v
WHERE tenant_id = 'YOUR_TENANT_ID'  -- Replace with your actual tenant_id
  AND (gps_lat IS NULL OR gps_lng IS NULL);

-- If "Without GPS" count is high, add GPS coordinates to your assets


-- ============================================================================
-- STEP 8: CHECK ASSET RELATIONSHIPS (JOINS)
-- ============================================================================
-- Verify that all required related data exists

-- Check for orphaned assets (missing asset_type)
SELECT 
    a.asset_id,
    a.asset_ref,
    a.asset_type_id,
    'Missing asset_type' as issue
FROM assets a
LEFT JOIN asset_types at ON a.asset_type_id = at.asset_type_id
WHERE a.tenant_id = 'YOUR_TENANT_ID'  -- Replace with your actual tenant_id
  AND at.asset_type_id IS NULL;

-- Check for orphaned assets (missing status)
SELECT 
    a.asset_id,
    a.asset_ref,
    a.status_id,
    'Missing status' as issue
FROM assets a
LEFT JOIN statuses s ON a.status_id = s.status_id
WHERE a.tenant_id = 'YOUR_TENANT_ID'  -- Replace with your actual tenant_id
  AND a.status_id IS NOT NULL
  AND s.status_id IS NULL;


-- ============================================================================
-- STEP 9: VIEW DEFINITION INSPECTION
-- ============================================================================
-- Get the full SQL definition of the view to understand its joins
SELECT pg_get_viewdef('tams360_assets_v', true) as view_definition;

-- Look for:
-- ❌ INNER JOIN (filters out rows with missing related data)
-- ✅ LEFT JOIN (includes rows even if related data is missing)
-- ❌ WHERE clauses that might filter out your data


-- ============================================================================
-- STEP 10: CHECK RECENT ASSETS SPECIFICALLY
-- ============================================================================
-- Check assets created in the last 7 days
SELECT 
    a.asset_id,
    a.asset_ref,
    a.tenant_id,
    a.created_at,
    a.gps_lat,
    a.gps_lng,
    CASE 
        WHEN v.asset_id IS NOT NULL THEN '✅ In View'
        ELSE '❌ NOT in View'
    END as view_status,
    CASE 
        WHEN a.gps_lat IS NULL OR a.gps_lng IS NULL THEN '❌ No GPS'
        ELSE '✅ Has GPS'
    END as gps_status
FROM assets a
LEFT JOIN tams360_assets_v v ON a.asset_id = v.asset_id
WHERE a.tenant_id = 'YOUR_TENANT_ID'  -- Replace with your actual tenant_id
  AND a.created_at > NOW() - INTERVAL '7 days'
ORDER BY a.created_at DESC;


-- ============================================================================
-- DIAGNOSTIC SUMMARY
-- ============================================================================
-- Run this to get a complete health check
SELECT 
    'Total Assets (Table)' as metric,
    COUNT(*)::text as value
FROM assets
WHERE tenant_id = 'YOUR_TENANT_ID'

UNION ALL

SELECT 
    'Total Assets (View)',
    COUNT(*)::text
FROM tams360_assets_v
WHERE tenant_id = 'YOUR_TENANT_ID'

UNION ALL

SELECT 
    'Assets with GPS (View)',
    COUNT(*)::text
FROM tams360_assets_v
WHERE tenant_id = 'YOUR_TENANT_ID'
  AND gps_lat IS NOT NULL 
  AND gps_lng IS NOT NULL

UNION ALL

SELECT 
    'Assets created in last 7 days (Table)',
    COUNT(*)::text
FROM assets
WHERE tenant_id = 'YOUR_TENANT_ID'
  AND created_at > NOW() - INTERVAL '7 days'

UNION ALL

SELECT 
    'Assets created in last 7 days (View)',
    COUNT(*)::text
FROM tams360_assets_v
WHERE tenant_id = 'YOUR_TENANT_ID'
  AND created_at > NOW() - INTERVAL '7 days';


-- ============================================================================
-- COMMON ISSUES & SOLUTIONS
-- ============================================================================
/*

ISSUE 1: Assets exist in table but NOT in view
CAUSE: View uses INNER JOIN which filters out assets with missing related data
SOLUTION: Check STEP 8 for missing relationships, or modify view to use LEFT JOIN

ISSUE 2: Assets have no GPS coordinates
CAUSE: gps_lat and gps_lng are NULL
SOLUTION: Update assets with GPS coordinates:
  UPDATE assets 
  SET gps_lat = -25.7479, gps_lng = 28.2293 
  WHERE asset_id = 'your-asset-id';

ISSUE 3: Wrong tenant_id
CAUSE: Assets were created with wrong tenant_id
SOLUTION: Update assets to correct tenant:
  UPDATE assets 
  SET tenant_id = 'correct-tenant-id' 
  WHERE asset_id = 'your-asset-id';

ISSUE 4: View doesn't exist
CAUSE: Database migration not run or view was dropped
SOLUTION: Recreate the view (ask for the view creation SQL)

ISSUE 5: User has no tenant_id
CAUSE: User profile missing tenant_id
SOLUTION: Update user profile:
  UPDATE tams360_user_profiles_v 
  SET tenant_id = 'your-tenant-id' 
  WHERE email = 'your-email@example.com';

*/

-- ============================================================================
-- QUICK FIX: ADD GPS TO ALL ASSETS WITHOUT COORDINATES
-- ============================================================================
-- This gives them a default location (Pretoria, South Africa)
-- ONLY run this if you want to add default GPS to assets for testing
/*
UPDATE assets
SET 
    gps_lat = -25.7479,
    gps_lng = 28.2293
WHERE tenant_id = 'YOUR_TENANT_ID'
  AND (gps_lat IS NULL OR gps_lng IS NULL);
*/
