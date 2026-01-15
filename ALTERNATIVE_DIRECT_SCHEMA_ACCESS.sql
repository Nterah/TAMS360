-- ============================================================================
-- ALTERNATIVE: Grant direct access to tams360 schema (bypass views)
-- Only use this if the view approach continues to fail
-- ============================================================================

-- Grant schema usage
GRANT USAGE ON SCHEMA tams360 TO anon, authenticated;

-- Grant SELECT on all existing tables
GRANT SELECT ON ALL TABLES IN SCHEMA tams360 TO anon, authenticated;

-- Grant SELECT on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA tams360 
GRANT SELECT ON TABLES TO anon, authenticated;

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(1);
NOTIFY pgrst, 'reload schema';

-- Verify access
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'tams360'
ORDER BY tablename;

-- Test direct access
SELECT id, email, name, tenant_id, role, status 
FROM tams360.user_profiles 
LIMIT 3;
