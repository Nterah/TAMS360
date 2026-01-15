-- ============================================================================
-- Add tenant_id to maintenance_records table
-- ============================================================================
-- This adds proper tenant isolation at the table level for maintenance records

-- Add tenant_id column to maintenance_records
ALTER TABLE tams360.maintenance_records 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tams360.tenants(tenant_id);

-- Update existing records to inherit tenant_id from their associated asset
UPDATE tams360.maintenance_records m
SET tenant_id = a.tenant_id
FROM tams360.assets a
WHERE m.asset_id = a.asset_id
  AND m.tenant_id IS NULL;

-- Make tenant_id NOT NULL after backfilling
ALTER TABLE tams360.maintenance_records 
ALTER COLUMN tenant_id SET NOT NULL;

-- Add index for tenant filtering (if it doesn't already exist)
CREATE INDEX IF NOT EXISTS idx_maintenance_tenant_status 
ON tams360.maintenance_records(tenant_id, status);

-- Add index for asset lookups
CREATE INDEX IF NOT EXISTS idx_maintenance_asset 
ON tams360.maintenance_records(asset_id, created_at DESC);

-- Verify the changes
SELECT 
  COUNT(*) as total_maintenance_records,
  COUNT(tenant_id) as records_with_tenant,
  COUNT(*) - COUNT(tenant_id) as records_without_tenant
FROM tams360.maintenance_records;

COMMENT ON COLUMN tams360.maintenance_records.tenant_id IS 'Tenant isolation - ensures maintenance records belong to specific organization';