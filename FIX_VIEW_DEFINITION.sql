-- ============================================================================
-- Fix: Update PUBLIC.maintenance_records VIEW to include tenant_id
-- ============================================================================
-- The public.maintenance_records is a VIEW pointing to tams360.maintenance_records
-- We need to recreate the view to include the new tenant_id column

-- Step 1: First, let's see the current view definition
SELECT pg_get_viewdef('public.maintenance_records', true) as current_view_definition;

-- Step 2: Drop and recreate the view with tenant_id included
DROP VIEW IF EXISTS public.maintenance_records CASCADE;

CREATE OR REPLACE VIEW public.maintenance_records AS
SELECT 
  maintenance_id,
  asset_id,
  tenant_id,              -- ✅ ADD THIS COLUMN
  inspection_id,
  work_order_number,
  maintenance_type,
  description,
  scheduled_date,
  completed_date,
  status,
  assigned_to,
  estimated_cost,
  actual_cost,
  urgency_id,
  contractor_name,
  notes,
  metadata,
  created_at,
  created_by,
  updated_at
FROM tams360.maintenance_records;

-- Step 3: Grant permissions (important for PostgREST access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_records TO anon;
GRANT ALL ON public.maintenance_records TO service_role;

-- Step 4: Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Step 5: Verify the view now includes tenant_id
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'maintenance_records'
ORDER BY ordinal_position;

-- Step 6: Verify tenant_id is populated
SELECT 
  COUNT(*) as total_maintenance_records,
  COUNT(tenant_id) as records_with_tenant,
  COUNT(*) - COUNT(tenant_id) as records_without_tenant
FROM public.maintenance_records;

SELECT 'SUCCESS: View recreated with tenant_id column' as status;
