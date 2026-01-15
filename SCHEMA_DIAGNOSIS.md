# 🔍 DIAGNOSIS: Schema Mismatch Issue

## Root Cause Analysis

The error `"Could not find the 'tenant_id' column of 'maintenance_records' in the schema cache"` is occurring because:

1. ✅ The migration successfully added `tenant_id` to `tams360.maintenance_records` table
2. ❌ The server code is querying `maintenance_records` (public schema) instead of `tams360.maintenance_records`
3. ❌ PostgREST is looking in the wrong schema

## The Real Problem

The `maintenance_records` table exists in the **`tams360` schema**, but:
- The server code queries it as `"maintenance_records"` (defaults to `public` schema)
- The migration ran on `tams360.maintenance_records`
- PostgREST can't find the table/column because it's looking in the wrong schema

## Solution: Create Public Schema Alias or Fix Table Location

### Option A: Create a View in Public Schema (Recommended - Quick Fix)

Run this in Supabase SQL Editor:

```sql
-- Create a view in public schema that points to tams360.maintenance_records
CREATE OR REPLACE VIEW public.maintenance_records AS
SELECT * FROM tams360.maintenance_records;

-- Make it writable
CREATE OR REPLACE RULE maintenance_records_insert AS
  ON INSERT TO public.maintenance_records
  DO INSTEAD
  INSERT INTO tams360.maintenance_records VALUES (NEW.*);

CREATE OR REPLACE RULE maintenance_records_update AS
  ON UPDATE TO public.maintenance_records
  DO INSTEAD
  UPDATE tams360.maintenance_records
  SET
    maintenance_id = NEW.maintenance_id,
    asset_id = NEW.asset_id,
    tenant_id = NEW.tenant_id,
    maintenance_type = NEW.maintenance_type,
    scheduled_date = NEW.scheduled_date,
    completed_date = NEW.completed_date,
    status = NEW.status,
    description = NEW.description,
    notes = NEW.notes,
    estimated_cost = NEW.estimated_cost,
    actual_cost = NEW.actual_cost,
    created_by = NEW.created_by,
    created_at = NEW.created_at,
    updated_at = NEW.updated_at
  WHERE maintenance_id = OLD.maintenance_id;

CREATE OR REPLACE RULE maintenance_records_delete AS
  ON DELETE TO public.maintenance_records
  DO INSTEAD
  DELETE FROM tams360.maintenance_records
  WHERE maintenance_id = OLD.maintenance_id;

-- Reload schema
NOTIFY pgrst, 'reload schema';
```

### Option B: Check Which Schema Has the Table

Run this to see where the table actually exists:

```sql
-- Find all maintenance_records tables
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE tablename = 'maintenance_records';

-- Check columns in tams360 schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'tams360' 
  AND table_name = 'maintenance_records'
ORDER BY ordinal_position;

-- Check columns in public schema (if it exists there)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'maintenance_records'
ORDER BY ordinal_position;
```

### Option C: Add tenant_id to PUBLIC schema table

If the table exists in BOTH schemas, run this:

```sql
-- Add to PUBLIC schema (if table exists there)
ALTER TABLE public.maintenance_records 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tams360.tenants(tenant_id);

-- Backfill
UPDATE public.maintenance_records m
SET tenant_id = a.tenant_id
FROM tams360.assets a
WHERE m.asset_id = a.asset_id
  AND m.tenant_id IS NULL;

-- Make NOT NULL
ALTER TABLE public.maintenance_records 
ALTER COLUMN tenant_id SET NOT NULL;

-- Reload schema
NOTIFY pgrst, 'reload schema';
```

---

## Next Step

**Run Option B first** to diagnose which schema(s) have the table, then we'll know which fix to apply.
