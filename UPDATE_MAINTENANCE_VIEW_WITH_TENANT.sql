-- ============================================================================
-- Update tams360_maintenance_v to include tenant_id properly
-- ============================================================================
-- This fixes the "URL too long" error when filtering maintenance records by tenant
-- Run this in your Supabase SQL Editor

-- Drop the existing view
DROP VIEW IF EXISTS public.tams360_maintenance_v;

-- Recreate with correct schema
CREATE OR REPLACE VIEW public.tams360_maintenance_v AS
SELECT 
  m.maintenance_id,
  m.asset_id,
  a.asset_ref,
  m.inspection_id,
  m.work_order_number,
  m.maintenance_type,
  m.description,
  m.scheduled_date,
  m.completed_date,
  m.status,
  m.assigned_to,
  m.estimated_cost,
  m.actual_cost,
  m.urgency_id,
  u.label as urgency_label,
  m.contractor_name,
  m.notes,
  m.metadata,
  m.created_at,
  m.created_by,
  m.updated_at,
  m.tenant_id,
  at.name as asset_type_name,
  at.abbreviation as asset_type_abbreviation
FROM tams360.maintenance_records m
LEFT JOIN tams360.assets a ON m.asset_id = a.asset_id
LEFT JOIN tams360.urgency_lookup u ON m.urgency_id = u.urgency_id
LEFT JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id;

GRANT SELECT ON public.tams360_maintenance_v TO anon, authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to verify the view includes tenant_id:
-- SELECT * FROM tams360_maintenance_v LIMIT 1;
