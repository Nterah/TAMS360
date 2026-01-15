-- ============================================================================
-- Enable PostgREST to access tams360 schema directly
-- This is an alternative to creating views
-- ============================================================================

-- Option 1: Grant usage on tams360 schema to anon and authenticated
GRANT USAGE ON SCHEMA tams360 TO anon, authenticated;

-- Grant SELECT on all tables in tams360 schema
GRANT SELECT ON ALL TABLES IN SCHEMA tams360 TO anon, authenticated;

-- Grant SELECT on future tables (in case new ones are created)
ALTER DEFAULT PRIVILEGES IN SCHEMA tams360 
GRANT SELECT ON TABLES TO anon, authenticated;

-- Verify access
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'tams360';

-- Test query
SELECT id, email, name, tenant_id, role, status 
FROM tams360.user_profiles 
LIMIT 3;
