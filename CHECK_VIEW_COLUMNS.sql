-- ============================================================================
-- CHECK ACTUAL COLUMN NAMES IN YOUR VIEWS
-- ============================================================================
-- This will show us what columns your views have vs what the backend expects
-- ============================================================================

-- ============================================================================
-- PART 1: What columns does tams360_user_profiles_v have?
-- ============================================================================

SELECT 
    '=== tams360_user_profiles_v ===' as view_name,
    column_name,
    data_type,
    CASE 
        WHEN column_name IN ('id', 'tenant_id', 'role', 'email', 'name', 'status') 
        THEN '✅ REQUIRED'
        ELSE '⚪ Optional'
    END as importance
FROM information_schema.columns
WHERE table_name = 'tams360_user_profiles_v'
  AND table_schema = 'public'
ORDER BY 
    CASE WHEN column_name IN ('id', 'tenant_id', 'role', 'email', 'name', 'status') THEN 0 ELSE 1 END,
    ordinal_position;


-- ============================================================================
-- PART 2: What columns does tams360_assets_v have?
-- ============================================================================

SELECT 
    '=== tams360_assets_v ===' as view_name,
    column_name,
    data_type,
    CASE 
        WHEN column_name IN ('asset_id', 'tenant_id', 'gps_lat', 'gps_lng') 
        THEN '✅ REQUIRED'
        ELSE '⚪ Optional'
    END as importance
FROM information_schema.columns
WHERE table_name = 'tams360_assets_v'
  AND table_schema = 'public'
ORDER BY 
    CASE WHEN column_name IN ('asset_id', 'tenant_id', 'gps_lat', 'gps_lng') THEN 0 ELSE 1 END,
    ordinal_position;


-- ============================================================================
-- PART 3: Check for organization-related columns specifically
-- ============================================================================

SELECT 
    'User Profiles Organization Column:' as check_type,
    COALESCE(
        string_agg(column_name, ', '),
        '❌ NO ORG COLUMN FOUND'
    ) as result
FROM information_schema.columns
WHERE table_name = 'tams360_user_profiles_v'
  AND table_schema = 'public'
  AND (
    column_name ILIKE '%tenant%' OR
    column_name ILIKE '%org%' OR
    column_name ILIKE '%organization%' OR
    column_name ILIKE '%company%'
  )

UNION ALL

SELECT 
    'Assets Organization Column:',
    COALESCE(
        string_agg(column_name, ', '),
        '❌ NO ORG COLUMN FOUND'
    )
FROM information_schema.columns
WHERE table_name = 'tams360_assets_v'
  AND table_schema = 'public'
  AND (
    column_name ILIKE '%tenant%' OR
    column_name ILIKE '%org%' OR
    column_name ILIKE '%organization%' OR
    column_name ILIKE '%company%'
  );


-- ============================================================================
-- PART 4: Check for GPS columns specifically
-- ============================================================================

SELECT 
    'GPS Columns in Assets View:' as check_type,
    COALESCE(
        string_agg(column_name, ', '),
        '❌ NO GPS COLUMNS FOUND'
    ) as result
FROM information_schema.columns
WHERE table_name = 'tams360_assets_v'
  AND table_schema = 'public'
  AND (
    column_name ILIKE '%lat%' OR
    column_name ILIKE '%lng%' OR
    column_name ILIKE '%lon%' OR
    column_name ILIKE '%gps%' OR
    column_name ILIKE '%coord%'
  );


-- ============================================================================
-- PART 5: Show one sample row from each view
-- ============================================================================

-- Sample from user profiles (replace email)
SELECT '=== SAMPLE USER PROFILE ===' as info;
SELECT * FROM tams360_user_profiles_v 
WHERE email = 'your-email@example.com';  -- ⬅️ REPLACE with your email

-- Sample from assets
SELECT '=== SAMPLE ASSET ===' as info;
SELECT * FROM tams360_assets_v LIMIT 1;


-- ============================================================================
-- INTERPRETATION
-- ============================================================================

/*

WHAT TO LOOK FOR IN THE RESULTS:

PART 1 & 2: Column Lists
-------------------------
✅ Check if you see these EXACT column names:
   - tams360_user_profiles_v: id, tenant_id, role, email
   - tams360_assets_v: asset_id, tenant_id, gps_lat, gps_lng

❌ If you see different names like:
   - org_id instead of tenant_id
   - latitude/longitude instead of gps_lat/gps_lng
   - Then the views need column aliases!

PART 3: Organization Columns
-----------------------------
Should show: tenant_id
If shows: org_id, organization_id, or nothing
→ We need to add a column alias

PART 4: GPS Columns
-------------------
Should show: gps_lat, gps_lng
If shows: latitude, longitude, lat, lng, or nothing
→ We need to add column aliases

PART 5: Sample Data
-------------------
Look at the actual values to verify:
- User has an organization ID
- Asset has GPS coordinates
- The data looks correct

*/
