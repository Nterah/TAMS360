-- ============================================================================
-- DIAGNOSTIC: Find Your Database Tables
-- ============================================================================
-- Run this to discover what tables you actually have in your database

-- 1. Find all tables in public schema
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Find tables related to users
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
AND (
    table_name LIKE '%user%'
    OR table_name LIKE '%auth%'
    OR table_name LIKE '%account%'
)
ORDER BY table_name;

-- 3. Find tables related to assets
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name LIKE '%asset%'
ORDER BY table_name;

-- 4. Show all schemas (in case tables are in different schema)
SELECT 
    schema_name
FROM information_schema.schemata
ORDER BY schema_name;

-- 5. Find tables in ALL schemas
SELECT 
    table_schema,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
ORDER BY table_schema, table_name;

-- 6. Check auth.users table (Supabase default)
SELECT 
    table_name,
    table_type,
    table_schema
FROM information_schema.tables 
WHERE table_name = 'users'
ORDER BY table_schema;

-- 7. Show columns of potential user tables
DO $$ 
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE 'User-related tables and their columns:';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    
    FOR r IN 
        SELECT DISTINCT table_schema, table_name
        FROM information_schema.tables 
        WHERE table_name LIKE '%user%'
        AND table_schema NOT IN ('information_schema', 'pg_catalog')
    LOOP
        RAISE NOTICE '';
        RAISE NOTICE 'Table: %.%', r.table_schema, r.table_name;
        RAISE NOTICE 'Columns:';
        
        -- Show first 5 columns
        PERFORM column_name
        FROM information_schema.columns
        WHERE table_schema = r.table_schema
        AND table_name = r.table_name
        LIMIT 5;
    END LOOP;
END $$;
