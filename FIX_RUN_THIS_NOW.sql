-- ============================================================================
-- Fix: Add tenant_id to PUBLIC.maintenance_records (the actual table)
-- ============================================================================
-- The previous migration added tenant_id to tams360.maintenance_records,
-- but the actual table is in the PUBLIC schema (Supabase default).
-- This migration adds tenant_id to the correct table.

-- Step 1: Add tenant_id column to PUBLIC.maintenance_records
ALTER TABLE public.maintenance_records 
ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Step 2: Add foreign key constraint to tenants table
-- First check if tenants table is in tams360 or public schema
-- Assuming tenants is in tams360 schema based on background info
ALTER TABLE public.maintenance_records 
DROP CONSTRAINT IF EXISTS maintenance_records_tenant_id_fkey;

ALTER TABLE public.maintenance_records 
ADD CONSTRAINT maintenance_records_tenant_id_fkey 
FOREIGN KEY (tenant_id) REFERENCES tams360.tenants(tenant_id);

-- Step 3: Backfill tenant_id from associated assets
-- Assets should be in the same schema structure
UPDATE public.maintenance_records m
SET tenant_id = a.tenant_id
FROM public.assets a
WHERE m.asset_id = a.asset_id
  AND m.tenant_id IS NULL;

-- Step 4: Make tenant_id NOT NULL (after backfilling)
ALTER TABLE public.maintenance_records 
ALTER COLUMN tenant_id SET NOT NULL;

-- Step 5: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_tenant_status 
ON public.maintenance_records(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_maintenance_asset 
ON public.maintenance_records(asset_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_maintenance_tenant_date 
ON public.maintenance_records(tenant_id, scheduled_date DESC);

-- Step 6: Add helpful comment
COMMENT ON COLUMN public.maintenance_records.tenant_id IS 
'Tenant isolation - ensures maintenance records belong to specific organization';

-- Step 7: Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Step 8: Verify the changes
SELECT 
  COUNT(*) as total_maintenance_records,
  COUNT(tenant_id) as records_with_tenant,
  COUNT(*) - COUNT(tenant_id) as records_without_tenant
FROM public.maintenance_records;

SELECT 'SUCCESS: tenant_id column added to public.maintenance_records' as status;
