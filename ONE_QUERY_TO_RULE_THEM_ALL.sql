-- ============================================================================
-- COPY THIS ENTIRE FILE AND RUN IT IN ONE GO
-- ============================================================================
-- This will show you everything in one result
-- ============================================================================

-- Check if key views exist
SELECT '=== VIEWS CHECK ===' as section, 
       'tams360_user_profiles_v' as view_name,
       CASE WHEN EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'tams360_user_profiles_v') 
            THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT '=== VIEWS CHECK ===', 
       'tams360_assets_v',
       CASE WHEN EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'tams360_assets_v') 
            THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT '=== VIEWS CHECK ===', 
       'tams360_tenants_v',
       CASE WHEN EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'tams360_tenants_v') 
            THEN '✅ EXISTS' ELSE '❌ MISSING' END

UNION ALL

-- Check if key tables exist
SELECT '=== TABLES CHECK ===',
       'assets',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assets') 
            THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT '=== TABLES CHECK ===',
       'inspections',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inspections') 
            THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT '=== TABLES CHECK ===',
       'maintenance_records',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maintenance_records') 
            THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT '=== TABLES CHECK ===',
       'asset_types',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'asset_types') 
            THEN '✅ EXISTS' ELSE '❌ MISSING' END

ORDER BY section, view_name;


-- ============================================================================
-- INTERPRETATION
-- ============================================================================

/*

EXPECTED RESULTS:

=== VIEWS CHECK ===
- tams360_user_profiles_v: ✅ EXISTS
- tams360_assets_v: ✅ EXISTS  
- tams360_tenants_v: ✅ EXISTS

=== TABLES CHECK ===
- assets: ✅ EXISTS
- inspections: ✅ EXISTS
- maintenance_records: ✅ EXISTS
- asset_types: ✅ EXISTS


IF YOU SEE:
-----------

SCENARIO 1: All views show ❌ MISSING
→ The views haven't been created yet
→ This is why your map doesn't work
→ Solution: Create the views from the base tables

SCENARIO 2: Views show ✅ EXISTS but you still get errors
→ The views exist but have wrong column names
→ Solution: Recreate views with correct column mappings

SCENARIO 3: Tables show ❌ MISSING
→ You might be in the wrong database
→ Or TAMS360 database hasn't been initialized
→ Check your Supabase connection

SCENARIO 4: Everything shows ✅ EXISTS
→ Tables and views exist
→ Issue is with column names or data
→ Need to check the view definitions


NEXT STEP:
----------

Based on what you see, tell me:
1. How many ❌ MISSING do you see?
2. Are the base tables (assets, inspections, etc.) present?
3. Are the views present?

Then I'll know exactly what to create!

*/
