-- ============================================================================
-- Debug: Check maintenance records and view
-- ============================================================================

-- Step 1: Check if the view exists
SELECT 
  schemaname,
  viewname,
  viewowner
FROM pg_views
WHERE viewname = 'tams360_maintenance_v';

-- Step 2: See the view definition
SELECT pg_get_viewdef('tams360_maintenance_v', true) as view_definition;

-- Step 3: Check recent maintenance records in the base table
SELECT 
  maintenance_id,
  asset_id,
  tenant_id,
  status,
  scheduled_date,
  created_at,
  created_by
FROM tams360.maintenance_records
ORDER BY created_at DESC
LIMIT 5;

-- Step 4: Check recent maintenance records through the view
SELECT 
  maintenance_id,
  asset_id,
  tenant_id,
  status,
  scheduled_date,
  created_at
FROM tams360_maintenance_v
ORDER BY created_at DESC
LIMIT 5;

-- Step 5: Count by status
SELECT 
  status,
  COUNT(*) as count,
  COUNT(CASE WHEN scheduled_date IS NOT NULL THEN 1 END) as with_scheduled_date,
  COUNT(CASE WHEN scheduled_date > NOW() THEN 1 END) as future_scheduled
FROM tams360_maintenance_v
GROUP BY status;

-- Step 6: Check the most recent record details
SELECT 
  m.maintenance_id,
  m.tenant_id,
  m.asset_id,
  m.status,
  m.scheduled_date,
  m.description,
  m.created_at,
  a.asset_ref,
  a.asset_type_name
FROM tams360.maintenance_records m
LEFT JOIN tams360.assets a ON m.asset_id = a.asset_id
ORDER BY m.created_at DESC
LIMIT 1;
