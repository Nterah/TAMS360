# 🚨 URGENT: Run This Migration to Fix Maintenance Creation

## Problem
Creating maintenance records is failing with this error:
```
Could not find the 'tenant_id' column of 'maintenance_records' in the schema cache
```

## Root Cause
The `maintenance_records` table is missing the `tenant_id` column needed for multi-tenant data isolation.

## Solution - Run This SQL Migration NOW

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your TAMS360 project
3. Click on "SQL Editor" in the left sidebar

### Step 2: Copy and Run This SQL
Copy the ENTIRE script below and paste it into the SQL Editor, then click "Run":

```sql
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
```

### Step 3: Verify Success
After running the migration, you should see:
- ✅ "Success. No rows returned" (or a count summary)
- ✅ No error messages

### Step 4: Test
1. Go to your TAMS360 app
2. Navigate to Maintenance → Create New Maintenance
3. Fill in the form and submit
4. ✅ It should now work without errors!

## What This Migration Does
1. ✅ Adds `tenant_id` column to `maintenance_records` table
2. ✅ Backfills existing records with tenant_id from their assets
3. ✅ Sets NOT NULL constraint for data integrity
4. ✅ Creates indexes for fast queries
5. ✅ Adds documentation

## After Running Migration
- Creating maintenance records will work
- Viewing maintenance records will work
- Maintenance detail page will work
- All tenant data will be properly isolated

---

**This is a one-time migration. Run it ASAP to restore full functionality!** 🚀