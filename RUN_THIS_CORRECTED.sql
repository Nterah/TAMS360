-- ============================================================================
-- TAMS360 MAP DIAGNOSTICS - CORRECTED FOR ORG_ID
-- ============================================================================
-- Based on your schema, it looks like you use 'org_id' instead of 'tenant_id'
-- Run these queries with org_id column name
-- ============================================================================

-- ============================================================================
-- STEP 1: GET YOUR ORG_ID
-- ============================================================================
-- Replace 'your-email@example.com' with YOUR actual email address

SELECT 
    id as user_id,
    COALESCE(tenant_id, org_id) as organization_id,
    email,
    name,
    role,
    organization,
    status
FROM tams360_user_profiles_v
WHERE email = 'your-email@example.com';  -- ⬅️ REPLACE THIS

-- 📋 COPY THE 'organization_id' VALUE
-- It should be a UUID like: '123e4567-e89b-12d3-a456-426614174000'


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
-- STEP 3: TRY TO COUNT ASSETS (Try both org_id and tenant_id)
-- ============================================================================
-- Replace 'YOUR_ORG_ID' with the organization_id from Step 1

-- Try with org_id (most likely based on your schema)
DO $$
DECLARE
    asset_count integer;
    your_org_id uuid := 'YOUR_ORG_ID';  -- ⬅️ REPLACE THIS
BEGIN
    -- Try org_id
    BEGIN
        SELECT COUNT(*) INTO asset_count
        FROM assets
        WHERE org_id = your_org_id;
        
        RAISE NOTICE '✅ SUCCESS with org_id: Found % assets', asset_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ FAILED with org_id: %', SQLERRM;
        
        -- Try tenant_id as fallback
        BEGIN
            SELECT COUNT(*) INTO asset_count
            FROM assets
            WHERE tenant_id = your_org_id;
            
            RAISE NOTICE '✅ SUCCESS with tenant_id: Found % assets', asset_count;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ FAILED with tenant_id: %', SQLERRM;
        END;
    END;
END $$;


-- ============================================================================
-- STEP 4A: COUNT ASSETS IN BASE TABLE (using org_id)
-- ============================================================================
-- Replace 'YOUR_ORG_ID' with your actual org_id from Step 1

SELECT 
    'BASE TABLE (assets)' as source,
    COUNT(*) as total_assets,
    COUNT(CASE WHEN gps_lat IS NOT NULL AND gps_lng IS NOT NULL THEN 1 END) as with_gps,
    COUNT(CASE WHEN gps_lat IS NULL OR gps_lng IS NULL THEN 1 END) as without_gps
FROM assets
WHERE org_id = 'YOUR_ORG_ID';  -- ⬅️ REPLACE THIS

-- If this fails, try:
-- WHERE tenant_id = 'YOUR_ORG_ID';


-- ============================================================================
-- STEP 4B: COUNT ASSETS IN VIEW (if view exists)
-- ============================================================================

SELECT 
    'VIEW (tams360_assets_v)' as source,
    COUNT(*) as total_assets,
    COUNT(CASE WHEN gps_lat IS NOT NULL AND gps_lng IS NOT NULL THEN 1 END) as with_gps,
    COUNT(CASE WHEN gps_lat IS NULL OR gps_lng IS NULL THEN 1 END) as without_gps
FROM tams360_assets_v
WHERE COALESCE(tenant_id, org_id) = 'YOUR_ORG_ID';  -- ⬅️ REPLACE THIS


-- ============================================================================
-- STEP 5: SHOW RECENT ASSETS (using org_id)
-- ============================================================================

SELECT 
    asset_id,
    asset_ref,
    created_at,
    gps_lat,
    gps_lng,
    org_id,
    CASE 
        WHEN gps_lat IS NULL OR gps_lng IS NULL THEN '❌ No GPS - WONT SHOW ON MAP'
        ELSE '✅ Has GPS - should show on map'
    END as gps_status
FROM assets
WHERE org_id = 'YOUR_ORG_ID'  -- ⬅️ REPLACE THIS
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 20;


-- ============================================================================
-- STEP 6: SAMPLE OF ALL ASSETS (see what data exists)
-- ============================================================================

SELECT 
    asset_id,
    asset_ref,
    gps_lat,
    gps_lng,
    org_id,
    created_at
FROM assets
WHERE org_id = 'YOUR_ORG_ID'  -- ⬅️ REPLACE THIS
ORDER BY created_at DESC
LIMIT 10;


-- ============================================================================
-- STEP 7: CHECK ALL TABLES FOR YOUR ORG
-- ============================================================================
-- This shows how many records exist in each table for your organization

WITH table_counts AS (
    SELECT 'assets' as table_name, COUNT(*) as count 
    FROM assets WHERE org_id = 'YOUR_ORG_ID'
    
    UNION ALL
    
    SELECT 'company_settings', COUNT(*) 
    FROM company_settings WHERE org_id = 'YOUR_ORG_ID'
    
    UNION ALL
    
    SELECT 'employee_ctc_rates', COUNT(*) 
    FROM employee_ctc_rates WHERE org_id = 'YOUR_ORG_ID'
    
    UNION ALL
    
    SELECT 'vehicle_registrations', COUNT(*) 
    FROM vehicle_registrations WHERE org_id = 'YOUR_ORG_ID'
)
SELECT * FROM table_counts ORDER BY count DESC;

-- ⬆️ Don't forget to replace YOUR_ORG_ID in each subquery!


-- ============================================================================
-- QUICK FIX: Add GPS to assets without coordinates
-- ============================================================================
-- Only run this if you want to add default GPS coordinates
-- Default location: Pretoria, South Africa

/*
UPDATE assets
SET 
    gps_lat = -25.7479,
    gps_lng = 28.2293
WHERE org_id = 'YOUR_ORG_ID'  -- ⬅️ REPLACE THIS
  AND (gps_lat IS NULL OR gps_lng IS NULL);

-- After running, check how many were updated
*/


-- ============================================================================
-- ALTERNATIVE: If your columns are named differently
-- ============================================================================
-- Try this if standard column names don't work

-- Check what columns actually exist in assets table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'assets'
  AND table_schema = 'public'
ORDER BY ordinal_position;


-- ============================================================================
-- DIAGNOSTIC SUMMARY
-- ============================================================================

SELECT 
    'Your Email' as metric,
    'your-email@example.com'::text as value  -- ⬅️ REPLACE THIS
UNION ALL
SELECT 
    'Your Org ID',
    (SELECT COALESCE(tenant_id, org_id)::text 
     FROM tams360_user_profiles_v 
     WHERE email = 'your-email@example.com')  -- ⬅️ REPLACE THIS
UNION ALL
SELECT 
    'View Exists?',
    CASE WHEN EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'tams360_assets_v') 
         THEN '✅ YES' ELSE '❌ NO - CREATE THE VIEW!' END
UNION ALL
SELECT 
    'Assets table has org_id?',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'org_id'
    ) THEN '✅ YES' ELSE '❌ NO' END
UNION ALL
SELECT 
    'Assets table has tenant_id?',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'tenant_id'
    ) THEN '✅ YES' ELSE '❌ NO' END;


-- ============================================================================
-- 🎯 NEXT STEPS BASED ON RESULTS
-- ============================================================================
/*

SCENARIO 1: "Assets table has org_id? = YES"
→ Use org_id in all your queries
→ The map backend might need to be updated to use org_id instead of tenant_id

SCENARIO 2: "Assets table has tenant_id? = YES"  
→ Use tenant_id in all your queries
→ This is what the backend expects

SCENARIO 3: "View Exists? = NO"
→ The view needs to be created
→ This is why the map doesn't work!
→ The backend queries tams360_assets_v which doesn't exist

SCENARIO 4: Assets found but no GPS
→ Run the QUICK FIX above to add GPS coordinates
→ Or manually add real GPS locations to your assets

*/
