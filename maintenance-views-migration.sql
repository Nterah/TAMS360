-- ============================================================================
-- TAMS360 Maintenance Records Public Views Migration
-- ============================================================================
-- Creates public views for maintenance_records table
-- Run this script in your Supabase SQL Editor
-- ============================================================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS public.tams360_maintenance_records_v CASCADE;
DROP VIEW IF EXISTS public.tams360_asset_inventory_log_v CASCADE;

-- ============================================================================
-- Maintenance Records View
-- ============================================================================
-- Public view for maintenance records with asset details
CREATE OR REPLACE VIEW public.tams360_maintenance_records_v AS
SELECT 
  mr.maintenance_id,
  mr.asset_id,
  mr.inspection_id,
  mr.work_order_number,
  mr.work_type,
  mr.description,
  mr.status,
  mr.priority,
  mr.scheduled_date,
  mr.completion_date,
  mr.assigned_to,
  mr.estimated_cost,
  mr.actual_cost,
  mr.notes,
  mr.created_at,
  mr.updated_at,
  mr.created_by,
  -- Asset details
  a.asset_ref,
  a.location,
  -- Asset type details
  at.name as asset_type_name,
  at.abbreviation as asset_type_abbreviation
FROM tams360.maintenance_records mr
LEFT JOIN tams360.assets a ON mr.asset_id = a.asset_id
LEFT JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id;

-- ============================================================================
-- Asset Inventory Log View
-- ============================================================================
-- Public view for asset inventory log with asset and user details
CREATE OR REPLACE VIEW public.tams360_asset_inventory_log_v AS
SELECT 
  ail.log_id,
  ail.asset_id,
  ail.action,
  ail.field_name,
  ail.old_value,
  ail.new_value,
  ail.changed_by,
  ail.changed_at,
  ail.notes,
  -- Asset details
  a.asset_ref,
  -- Asset type details
  at.name as asset_type_name,
  at.abbreviation as asset_type_abbreviation,
  -- User details
  u.name as changed_by_name,
  u.email as changed_by_email
FROM tams360.asset_inventory_log ail
LEFT JOIN tams360.assets a ON ail.asset_id = a.asset_id
LEFT JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id
LEFT JOIN tams360.users u ON ail.changed_by = u.user_id;

-- ============================================================================
-- Grant Permissions
-- ============================================================================
GRANT SELECT ON public.tams360_maintenance_records_v TO authenticated;
GRANT SELECT ON public.tams360_maintenance_records_v TO anon;
GRANT SELECT ON public.tams360_asset_inventory_log_v TO authenticated;
GRANT SELECT ON public.tams360_asset_inventory_log_v TO anon;

-- ============================================================================
-- Verify Views Created Successfully
-- ============================================================================
SELECT 'Maintenance Records View:' as check_name, COUNT(*) as row_count 
FROM public.tams360_maintenance_records_v
UNION ALL
SELECT 'Asset Inventory Log View:', COUNT(*) 
FROM public.tams360_asset_inventory_log_v;
