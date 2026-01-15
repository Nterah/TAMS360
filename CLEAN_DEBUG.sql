-- ============================================================================
-- CLEAN DIAGNOSTIC QUERY - Run this in a fresh SQL editor window
-- ============================================================================

-- Check the most recent maintenance records in base table
SELECT 
  m.maintenance_id,
  m.tenant_id,
  m.asset_id,
  m.status,
  m.scheduled_date,
  m.description,
  m.created_at
FROM tams360.maintenance_records m
ORDER BY m.created_at DESC
LIMIT 5;
