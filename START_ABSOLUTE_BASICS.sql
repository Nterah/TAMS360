-- ============================================================================
-- ABSOLUTE BASICS - RUN THESE ONE BY ONE
-- ============================================================================

-- QUERY 1: Does tams360_user_profiles_v exist?
-- ============================================================================

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.views 
            WHERE table_name = 'tams360_user_profiles_v'
        )
        THEN '✅ VIEW EXISTS'
        ELSE '❌ VIEW DOES NOT EXIST'
    END as user_profiles_view;


-- QUERY 2: Does tams360_assets_v exist?
-- ============================================================================

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.views 
            WHERE table_name = 'tams360_assets_v'
        )
        THEN '✅ VIEW EXISTS'
        ELSE '❌ VIEW DOES NOT EXIST'
    END as assets_view;


-- QUERY 3: What views DO exist?
-- ============================================================================

SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;


-- QUERY 4: What are ALL the columns in tams360_user_profiles_v?
-- ============================================================================

SELECT column_name
FROM information_schema.columns
WHERE table_name = 'tams360_user_profiles_v'
ORDER BY ordinal_position;


-- QUERY 5: Show me one complete row from tams360_user_profiles_v
-- ============================================================================

SELECT * FROM tams360_user_profiles_v LIMIT 1;


-- QUERY 6: What tables have 'user' in the name?
-- ============================================================================

SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%user%'
ORDER BY table_name;


-- QUERY 7: What tables have 'asset' in the name?
-- ============================================================================

SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%asset%'
ORDER BY table_name;


-- ============================================================================
-- INSTRUCTIONS
-- ============================================================================

/*

1. Run QUERY 1 - Tell me if the user profiles view exists
2. Run QUERY 2 - Tell me if the assets view exists
3. Run QUERY 4 - Send me the list of columns
4. Run QUERY 5 - Look at the actual data (don't share sensitive info)
5. Run QUERY 6 and 7 - See what tables exist

Based on the results, I'll know:
- If the views exist at all
- What the actual column names are
- What tables your database has
- How to fix the map data issue

*/
