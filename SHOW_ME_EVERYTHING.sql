-- ============================================================================
-- ULTIMATE SIMPLE DIAGNOSTIC - NO ASSUMPTIONS
-- ============================================================================
-- This makes NO assumptions about column names
-- Just shows you what you actually have
-- ============================================================================

-- ============================================================================
-- STEP 1: What columns exist in tams360_user_profiles_v?
-- ============================================================================

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tams360_user_profiles_v'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 📋 COPY THE LIST OF COLUMNS


-- ============================================================================
-- STEP 2: Show me YOUR user profile data (all columns)
-- ============================================================================

SELECT * 
FROM tams360_user_profiles_v
WHERE email = 'your-email@example.com';  -- ⬅️ REPLACE with your email

-- 📋 LOOK AT ALL THE VALUES
-- Find which column has your organization/tenant identifier


-- ============================================================================
-- STEP 3: What columns exist in assets table?
-- ============================================================================

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'assets'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 📋 COPY THE LIST OF COLUMNS
-- Look for any column that might be organization-related


-- ============================================================================
-- STEP 4: Show me one asset row (all columns and values)
-- ============================================================================

SELECT * FROM assets LIMIT 1;

-- 📋 LOOK AT ALL COLUMNS AND VALUES
-- This shows you the actual structure


-- ============================================================================
-- STEP 5: Does the assets table even exist?
-- ============================================================================

SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%asset%'
ORDER BY table_name;

-- This shows all tables with 'asset' in the name


-- ============================================================================
-- STEP 6: What views exist?
-- ============================================================================

SELECT 
    schemaname,
    viewname
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;

-- This shows ALL views in your database


-- ============================================================================
-- STEP 7: List ALL tables in your database
-- ============================================================================

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- This shows EVERYTHING


-- ============================================================================
-- 📋 SEND ME THESE RESULTS
-- ============================================================================

/*

After running these queries, please send me:

1. The output of STEP 1 (tams360_user_profiles_v columns)
2. The output of STEP 3 (assets columns)  
3. The output of STEP 5 (tables with 'asset' in name)
4. The output of STEP 7 (all tables)

Then I can tell you:
- What's the actual organization column name
- Whether the assets table exists
- What needs to be created/fixed

*/
