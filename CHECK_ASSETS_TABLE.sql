-- ============================================================================
-- DIAGNOSTIC QUERY: Check Assets Table Structure
-- ============================================================================
-- Run this first to understand your database schema

-- Check if 'assets' is a table or view
SELECT 
    table_name,
    table_type,
    table_schema
FROM information_schema.tables 
WHERE table_name = 'assets';

-- Check assets table columns
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'assets'
ORDER BY ordinal_position;

-- Check for asset_id column specifically
SELECT 
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'assets' 
AND column_name = 'asset_id';

-- Alternative: Check in different schemas
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename LIKE '%asset%';

-- Check views
SELECT 
    schemaname,
    viewname,
    viewowner
FROM pg_views 
WHERE viewname LIKE '%asset%';
