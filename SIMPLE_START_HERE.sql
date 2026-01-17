-- ============================================================================
-- SUPER SIMPLE DIAGNOSTIC - START HERE
-- ============================================================================
-- Just copy and paste these 5 queries, one at a time
-- ============================================================================

-- ============================================================================
-- QUERY 1: What columns does the assets table have?
-- ============================================================================

SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'assets' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 📋 LOOK FOR:
-- - tenant_id or org_id (organization identifier)
-- - gps_lat and gps_lng (GPS coordinates)


-- ============================================================================
-- QUERY 2: Does the view exist?
-- ============================================================================

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'tams360_assets_v')
        THEN '✅ VIEW EXISTS'
        ELSE '❌ VIEW DOES NOT EXIST - THIS IS THE PROBLEM!'
    END as result;


-- ============================================================================
-- QUERY 3: Show me one row from assets table
-- ============================================================================

SELECT * FROM assets LIMIT 1;

-- 📋 LOOK AT ALL THE COLUMN NAMES IN THE RESULT
-- Especially look for: org_id, tenant_id, gps_lat, gps_lng


-- ============================================================================
-- QUERY 4: What's my user info and organization ID?
-- ============================================================================

SELECT 
    email,
    COALESCE(tenant_id, org_id)::text as my_organization_id
FROM tams360_user_profiles_v
WHERE email = 'your-email@example.com';  -- ⬅️ REPLACE with your email

-- 📋 COPY the 'my_organization_id' value


-- ============================================================================
-- QUERY 5: How many assets do I have?
-- ============================================================================
-- First, try to see if the column is called 'org_id'

SELECT COUNT(*) as total_assets
FROM assets
WHERE org_id = 'PASTE_YOUR_ORG_ID_HERE';  -- ⬅️ PASTE from Query 4

-- If this gives an error "column org_id does not exist", try this instead:
-- SELECT COUNT(*) FROM assets WHERE tenant_id = 'PASTE_YOUR_ORG_ID_HERE';


-- ============================================================================
-- 📊 WHAT THE RESULTS MEAN
-- ============================================================================

/*

IF QUERY 2 says "VIEW DOES NOT EXIST":
→ This is your problem! The backend needs this view.
→ Solution: Create the view (see below)

IF QUERY 3 shows a column called 'org_id':
→ Your assets use org_id
→ Solution: Create view that maps org_id to tenant_id

IF QUERY 3 shows a column called 'tenant_id':
→ Your assets use tenant_id
→ Solution: Just create the view normally

IF QUERY 5 returns 0:
→ No assets for your organization
→ Check if assets were created with a different org_id

*/


-- ============================================================================
-- ✅ SOLUTION: Create the View
-- ============================================================================

-- OPTION A: If your assets table has 'org_id' column
-- (Use this if Query 3 showed 'org_id' but not 'tenant_id')

CREATE OR REPLACE VIEW tams360_assets_v AS
SELECT 
    *,
    org_id as tenant_id  -- Map org_id to tenant_id
FROM assets;


-- OPTION B: If your assets table has 'tenant_id' column  
-- (Use this if Query 3 showed 'tenant_id')

CREATE OR REPLACE VIEW tams360_assets_v AS
SELECT * FROM assets;


-- ============================================================================
-- ✅ TEST: Verify the view works
-- ============================================================================

-- After creating the view, run this:

SELECT COUNT(*) FROM tams360_assets_v;

-- Then try with your org ID:

SELECT * 
FROM tams360_assets_v 
WHERE tenant_id = 'PASTE_YOUR_ORG_ID_HERE'  -- From Query 4
LIMIT 5;

-- If this returns your assets, the map should work now!


-- ============================================================================
-- ✅ BONUS FIX: Add GPS if missing
-- ============================================================================

-- Check if your assets have GPS coordinates:

SELECT 
    COUNT(*) as total,
    COUNT(gps_lat) as has_lat,
    COUNT(gps_lng) as has_lng
FROM tams360_assets_v
WHERE tenant_id = 'PASTE_YOUR_ORG_ID_HERE';

-- If has_lat or has_lng is 0, add GPS coordinates:

UPDATE assets
SET gps_lat = -25.7479, gps_lng = 28.2293
WHERE (gps_lat IS NULL OR gps_lng IS NULL);

-- Then refresh your map!
