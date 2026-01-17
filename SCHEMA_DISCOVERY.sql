-- ============================================================================
-- TAMS360 MAP DATA - SCHEMA DISCOVERY QUERIES
-- ============================================================================
-- Run these FIRST to discover the actual column names in your database
-- ============================================================================

-- ============================================================================
-- STEP 1: DISCOVER ASSETS TABLE SCHEMA
-- ============================================================================
-- This shows ALL columns in the assets table and their types

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'assets'
ORDER BY ordinal_position;

-- 📋 LOOK FOR:
-- - A column for tenant/organization (might be: tenant_id, org_id, organization_id, etc.)
-- - GPS columns (might be: gps_lat, latitude, lat, etc.)
-- - GPS columns (might be: gps_lng, longitude, lng, lon, etc.)


-- ============================================================================
-- STEP 2: CHECK IF VIEW EXISTS AND ITS COLUMNS
-- ============================================================================

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'tams360_assets_v'
ORDER BY ordinal_position;

-- If this returns no rows, the view doesn't exist!


-- ============================================================================
-- STEP 3: SHOW VIEW DEFINITION (if view exists)
-- ============================================================================

SELECT pg_get_viewdef('tams360_assets_v', true) as view_sql;

-- This shows the exact SQL that creates the view
-- You'll see which columns from the base table map to which view columns


-- ============================================================================
-- STEP 4: LIST ALL VIEWS IN DATABASE
-- ============================================================================

SELECT 
    schemaname,
    viewname,
    viewowner
FROM pg_views
WHERE schemaname = 'public'
  AND viewname LIKE '%asset%'
ORDER BY viewname;

-- Look for any views related to assets


-- ============================================================================
-- STEP 5: SAMPLE DATA FROM ASSETS TABLE (First 3 rows)
-- ============================================================================
-- This shows actual data to help identify column names

SELECT * FROM assets LIMIT 3;

-- 📋 LOOK AT THE COLUMN NAMES IN THE OUTPUT
-- Copy the exact column names you see


-- ============================================================================
-- STEP 6: CHECK USER PROFILES VIEW SCHEMA
-- ============================================================================

SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'tams360_user_profiles_v'
ORDER BY ordinal_position;


-- ============================================================================
-- STEP 7: FIND YOUR USER AND TENANT INFO
-- ============================================================================
-- Replace 'your-email@example.com' with your actual email

SELECT * 
FROM tams360_user_profiles_v
WHERE email = 'your-email@example.com';

-- 📋 LOOK FOR:
-- - tenant_id, org_id, or organization_id column
-- - Copy the value - this is YOUR organization identifier


-- ============================================================================
-- STEP 8: DISCOVER ACTUAL TENANT/ORG COLUMN IN ASSETS
-- ============================================================================
-- This checks which organization-related columns exist in assets table

SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'assets'
  AND (
    column_name ILIKE '%tenant%' OR
    column_name ILIKE '%org%' OR
    column_name ILIKE '%organization%' OR
    column_name ILIKE '%company%'
  );

-- Common possibilities:
-- - tenant_id
-- - org_id
-- - organization_id
-- - company_id


-- ============================================================================
-- STEP 9: DISCOVER GPS COLUMN NAMES
-- ============================================================================

SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'assets'
  AND (
    column_name ILIKE '%lat%' OR
    column_name ILIKE '%lng%' OR
    column_name ILIKE '%lon%' OR
    column_name ILIKE '%gps%' OR
    column_name ILIKE '%coord%'
  );

-- Common possibilities:
-- - gps_lat / gps_lng
-- - latitude / longitude  
-- - lat / lng
-- - lat / lon


-- ============================================================================
-- STEP 10: CHECK IF THERE'S AN ORG_ID IN YOUR SCHEMA
-- ============================================================================
-- Based on the schema you provided, it looks like you use 'org_id' not 'tenant_id'

SELECT COUNT(*) as asset_count
FROM assets
WHERE org_id IS NOT NULL;

-- If this works, your column is 'org_id' not 'tenant_id'!


-- ============================================================================
-- STEP 11: GET YOUR ORG_ID FROM USER PROFILE
-- ============================================================================
-- Replace 'your-email@example.com' with your actual email

SELECT 
    id as user_id,
    email,
    name,
    role,
    COALESCE(tenant_id, org_id, organization_id) as your_organization_id
FROM tams360_user_profiles_v
WHERE email = 'your-email@example.com';


-- ============================================================================
-- STEP 12: COUNT ASSETS BY YOUR ORG_ID (if org_id column exists)
-- ============================================================================
-- First, get your org_id from Step 11, then replace it here

SELECT COUNT(*) as total_assets
FROM assets  
WHERE org_id = 'YOUR_ORG_ID_HERE';  -- Replace with value from Step 11

-- If this works, use 'org_id' in all future queries instead of 'tenant_id'


-- ============================================================================
-- STEP 13: SHOW SAMPLE ASSETS WITH ALL COLUMNS
-- ============================================================================
-- Get column names and sample data

SELECT *
FROM assets
LIMIT 1;

-- Look at ALL the column names that are returned
-- Identify which column represents:
-- - Organization identifier (tenant_id, org_id, etc.)
-- - GPS latitude (gps_lat, latitude, etc.)
-- - GPS longitude (gps_lng, longitude, etc.)


-- ============================================================================
-- 📊 RESULTS INTERPRETATION GUIDE
-- ============================================================================
/*

After running these queries, you should know:

1. Does the 'assets' table exist? (Step 1)
   - YES: Continue to identify column names
   - NO: Check if there's a different table name for assets

2. Does the 'tams360_assets_v' view exist? (Step 2)
   - YES: The app should work, check view definition
   - NO: The view needs to be created - this is why the map doesn't work!

3. What's the organization column name? (Step 8, 10)
   - tenant_id
   - org_id  ← Most likely based on your schema!
   - organization_id
   - company_id

4. What are the GPS column names? (Step 9)
   - gps_lat / gps_lng
   - latitude / longitude
   - lat / lng

5. What's your organization identifier? (Step 7, 11)
   - Copy this value to use in queries

NEXT STEPS:

Once you know the column names, I'll create corrected queries that use:
- The correct organization column (probably 'org_id')
- The correct GPS columns
- Your actual organization identifier

*/


-- ============================================================================
-- QUICK TEST: Try both tenant_id and org_id
-- ============================================================================

-- Test 1: Try tenant_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'tenant_id'
    ) THEN
        RAISE NOTICE '✅ assets table HAS tenant_id column';
    ELSE
        RAISE NOTICE '❌ assets table DOES NOT have tenant_id column';
    END IF;
END $$;

-- Test 2: Try org_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'org_id'
    ) THEN
        RAISE NOTICE '✅ assets table HAS org_id column';
    ELSE
        RAISE NOTICE '❌ assets table DOES NOT have org_id column';
    END IF;
END $$;


-- ============================================================================
-- FINAL CHECK: What columns DO exist in assets?
-- ============================================================================

SELECT 
    string_agg(column_name, ', ' ORDER BY ordinal_position) as all_columns
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'assets';

-- This gives you a comma-separated list of ALL column names
