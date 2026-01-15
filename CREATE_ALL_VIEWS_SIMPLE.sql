-- ============================================================================
-- TAMS360 PUBLIC VIEWS CREATION SCRIPT (SIMPLIFIED)
-- This creates views that expose the exact column names from the tables
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- DROP ALL EXISTING VIEWS FIRST
DROP VIEW IF EXISTS public.tams360_user_profiles_v CASCADE;
DROP VIEW IF EXISTS public.tams360_tenants_v CASCADE;
DROP VIEW IF EXISTS public.tams360_tenant_settings_v CASCADE;
DROP VIEW IF EXISTS public.tams360_assets_v CASCADE;
DROP VIEW IF EXISTS public.tams360_inspections_v CASCADE;
DROP VIEW IF EXISTS public.tams360_maintenance_v CASCADE;
DROP VIEW IF EXISTS public.tams360_asset_types_v CASCADE;
DROP VIEW IF EXISTS public.tams360_asset_status_v CASCADE;
DROP VIEW IF EXISTS public.tams360_condition_lookup_v CASCADE;
DROP VIEW IF EXISTS public.tams360_urgency_lookup_v CASCADE;
DROP VIEW IF EXISTS public.tams360_inspection_types_v CASCADE;
DROP VIEW IF EXISTS public.tams360_regions_v CASCADE;
DROP VIEW IF EXISTS public.tams360_depots_v CASCADE;
DROP VIEW IF EXISTS public.tams360_inspection_photos_v CASCADE;
DROP VIEW IF EXISTS public.tams360_asset_component_templates_v CASCADE;
DROP VIEW IF EXISTS public.tams360_asset_component_template_items_v CASCADE;
DROP VIEW IF EXISTS public.tams360_inspection_component_scores_v CASCADE;
DROP VIEW IF EXISTS public.tams360_costing_table_v CASCADE;
DROP VIEW IF EXISTS public.tams360_ci_distribution_v CASCADE;
DROP VIEW IF EXISTS public.tams360_urgency_summary_v CASCADE;
DROP VIEW IF EXISTS public.tams360_asset_type_summary_v CASCADE;
DROP VIEW IF EXISTS public.tams360_assets_app CASCADE;
DROP VIEW IF EXISTS public.tams360_inspections_app CASCADE;
DROP VIEW IF EXISTS public.tams360_maintenance_app CASCADE;
DROP VIEW IF EXISTS public.tams360_asset_inventory_log_v CASCADE;

-- ============================================================================
-- CREATE SIMPLE PASS-THROUGH VIEWS
-- These expose the exact columns from the underlying tables
-- ============================================================================

-- 1. User Profiles View - expose exact columns
CREATE OR REPLACE VIEW public.tams360_user_profiles_v AS
SELECT * FROM tams360.user_profiles;

-- 2. Tenants View
CREATE OR REPLACE VIEW public.tams360_tenants_v AS
SELECT * FROM tams360.tenants;

-- 3. Tenant Settings View
CREATE OR REPLACE VIEW public.tams360_tenant_settings_v AS
SELECT * FROM tams360.tenant_settings;

-- 4. Asset Types View
CREATE OR REPLACE VIEW public.tams360_asset_types_v AS
SELECT * FROM tams360.asset_types;

-- 5. Asset Status View
CREATE OR REPLACE VIEW public.tams360_asset_status_v AS
SELECT * FROM tams360.asset_status;

-- 6. Condition Lookup View
CREATE OR REPLACE VIEW public.tams360_condition_lookup_v AS
SELECT * FROM tams360.condition_lookup;

-- 7. Urgency Lookup View
CREATE OR REPLACE VIEW public.tams360_urgency_lookup_v AS
SELECT * FROM tams360.urgency_lookup;

-- 8. Inspection Types View
CREATE OR REPLACE VIEW public.tams360_inspection_types_v AS
SELECT * FROM tams360.inspection_types;

-- 9. Regions View
CREATE OR REPLACE VIEW public.tams360_regions_v AS
SELECT * FROM tams360.regions;

-- 10. Depots View
CREATE OR REPLACE VIEW public.tams360_depots_v AS
SELECT * FROM tams360.depots;

-- 11. Inspection Photos View
CREATE OR REPLACE VIEW public.tams360_inspection_photos_v AS
SELECT * FROM tams360.inspection_photos;

-- 12. Component Templates View
CREATE OR REPLACE VIEW public.tams360_asset_component_templates_v AS
SELECT * FROM tams360.asset_component_templates;

-- 13. Component Template Items View
CREATE OR REPLACE VIEW public.tams360_asset_component_template_items_v AS
SELECT * FROM tams360.asset_component_template_items;

-- 14. Inspection Component Scores View
CREATE OR REPLACE VIEW public.tams360_inspection_component_scores_v AS
SELECT * FROM tams360.inspection_component_scores;

-- 15. Costing Table View
CREATE OR REPLACE VIEW public.tams360_costing_table_v AS
SELECT * FROM tams360.costing_table;

-- ============================================================================
-- ENRICHED VIEWS WITH JOINS
-- ============================================================================

-- 16. Assets View (with joined data)
CREATE OR REPLACE VIEW public.tams360_assets_v AS
SELECT 
  a.*,
  at.name as asset_type_name,
  at.abbreviation as asset_type_abbr,
  ast.name as status_name,
  c.name as condition_name
FROM tams360.assets a
LEFT JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id
LEFT JOIN tams360.asset_status ast ON a.status_id = ast.status_id
LEFT JOIN tams360.condition_lookup c ON a.condition_id = c.condition_id;

-- 17. Inspections View (with joined data)
CREATE OR REPLACE VIEW public.tams360_inspections_v AS
SELECT 
  i.*,
  a.asset_ref,
  at.name as asset_type_name,
  it.name as inspection_type_name,
  u.label as urgency_label,
  u.level as urgency_level
FROM tams360.inspections i
LEFT JOIN tams360.assets a ON i.asset_id = a.asset_id
LEFT JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id
LEFT JOIN tams360.inspection_types it ON i.inspection_type_id = it.inspection_type_id
LEFT JOIN tams360.urgency_lookup u ON i.urgency_id = u.urgency_id;

-- 18. Maintenance Records View (with joined data)
CREATE OR REPLACE VIEW public.tams360_maintenance_v AS
SELECT 
  m.*,
  a.asset_ref,
  u.label as urgency_label
FROM tams360.maintenance_records m
LEFT JOIN tams360.assets a ON m.asset_id = a.asset_id
LEFT JOIN tams360.urgency_lookup u ON m.urgency_id = u.urgency_id;

-- ============================================================================
-- AGGREGATED/CALCULATED VIEWS FOR DASHBOARD
-- ============================================================================

-- 19. CI Distribution View
CREATE OR REPLACE VIEW public.tams360_ci_distribution_v AS
SELECT 
  CASE 
    WHEN latest_ci >= 80 THEN 'Excellent'
    WHEN latest_ci >= 60 THEN 'Good'
    WHEN latest_ci >= 40 THEN 'Fair'
    WHEN latest_ci >= 20 THEN 'Poor'
    ELSE 'Critical'
  END as ci_band,
  COUNT(*) as asset_count,
  AVG(latest_ci) as avg_ci,
  MIN(latest_ci) as min_ci,
  MAX(latest_ci) as max_ci
FROM tams360.assets
WHERE latest_ci IS NOT NULL
GROUP BY ci_band;

-- 20. Urgency Summary View
CREATE OR REPLACE VIEW public.tams360_urgency_summary_v AS
SELECT 
  i.calculated_urgency,
  COUNT(*) as inspection_count,
  AVG(i.conditional_index) as avg_ci,
  AVG(i.total_remedial_cost) as avg_cost,
  SUM(i.total_remedial_cost) as total_cost
FROM tams360.inspections i
WHERE i.calculated_urgency IS NOT NULL
GROUP BY i.calculated_urgency;

-- 21. Asset Type Summary View
CREATE OR REPLACE VIEW public.tams360_asset_type_summary_v AS
SELECT 
  at.name as asset_type_name,
  at.abbreviation as asset_type_abbr,
  COUNT(a.asset_id) as asset_count,
  AVG(a.latest_ci) as avg_ci,
  COUNT(CASE WHEN a.latest_ci < 40 THEN 1 END) as critical_count,
  COUNT(i.inspection_id) as inspection_count
FROM tams360.asset_types at
LEFT JOIN tams360.assets a ON at.asset_type_id = a.asset_type_id
LEFT JOIN tams360.inspections i ON a.asset_id = i.asset_id
GROUP BY at.asset_type_id, at.name, at.abbreviation;

-- ============================================================================
-- APP VIEWS (simplified versions for mobile app)
-- ============================================================================

-- 22. Assets App View (simplified for mobile)
CREATE OR REPLACE VIEW public.tams360_assets_app AS
SELECT 
  a.asset_id,
  a.asset_ref,
  a.asset_type_id,
  at.name as asset_type_name,
  at.abbreviation as asset_type_abbr,
  a.road_number,
  a.road_name,
  a.gps_lat,
  a.gps_lng,
  a.status_id,
  ast.name as status_name,
  a.latest_ci,
  a.latest_ci_band,
  a.latest_inspection_date,
  a.tenant_id
FROM tams360.assets a
LEFT JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id
LEFT JOIN tams360.asset_status ast ON a.status_id = ast.status_id;

-- 23. Inspections App View (simplified for mobile)
CREATE OR REPLACE VIEW public.tams360_inspections_app AS
SELECT 
  i.inspection_id,
  i.asset_id,
  a.asset_ref,
  at.name as asset_type_name,
  i.inspection_date,
  i.inspector_name,
  i.conditional_index,
  i.calculated_urgency,
  i.total_remedial_cost,
  i.ci_band,
  i.tenant_id
FROM tams360.inspections i
LEFT JOIN tams360.assets a ON i.asset_id = a.asset_id
LEFT JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id;

-- 24. Maintenance App View (simplified for mobile)
CREATE OR REPLACE VIEW public.tams360_maintenance_app AS
SELECT 
  m.maintenance_id,
  m.asset_id,
  a.asset_ref,
  m.work_order_number,
  m.maintenance_type,
  m.status,
  m.scheduled_date,
  m.completed_date,
  m.estimated_cost,
  m.tenant_id
FROM tams360.maintenance_records m
LEFT JOIN tams360.assets a ON m.asset_id = a.asset_id;

-- 25. Asset Inventory Log View (placeholder - needs actual audit table)
-- If you have an audit/log table, replace this with actual implementation
CREATE OR REPLACE VIEW public.tams360_asset_inventory_log_v AS
SELECT 
  asset_id,
  asset_ref,
  created_at as changed_at,
  'created' as change_type,
  created_by as changed_by,
  NULL::jsonb as changes
FROM tams360.assets
LIMIT 0; -- Empty view for now

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.tams360_user_profiles_v TO anon, authenticated;
GRANT SELECT ON public.tams360_tenants_v TO anon, authenticated;
GRANT SELECT ON public.tams360_tenant_settings_v TO anon, authenticated;
GRANT SELECT ON public.tams360_assets_v TO anon, authenticated;
GRANT SELECT ON public.tams360_inspections_v TO anon, authenticated;
GRANT SELECT ON public.tams360_maintenance_v TO anon, authenticated;
GRANT SELECT ON public.tams360_asset_types_v TO anon, authenticated;
GRANT SELECT ON public.tams360_asset_status_v TO anon, authenticated;
GRANT SELECT ON public.tams360_condition_lookup_v TO anon, authenticated;
GRANT SELECT ON public.tams360_urgency_lookup_v TO anon, authenticated;
GRANT SELECT ON public.tams360_inspection_types_v TO anon, authenticated;
GRANT SELECT ON public.tams360_regions_v TO anon, authenticated;
GRANT SELECT ON public.tams360_depots_v TO anon, authenticated;
GRANT SELECT ON public.tams360_inspection_photos_v TO anon, authenticated;
GRANT SELECT ON public.tams360_asset_component_templates_v TO anon, authenticated;
GRANT SELECT ON public.tams360_asset_component_template_items_v TO anon, authenticated;
GRANT SELECT ON public.tams360_inspection_component_scores_v TO anon, authenticated;
GRANT SELECT ON public.tams360_costing_table_v TO anon, authenticated;
GRANT SELECT ON public.tams360_ci_distribution_v TO anon, authenticated;
GRANT SELECT ON public.tams360_urgency_summary_v TO anon, authenticated;
GRANT SELECT ON public.tams360_asset_type_summary_v TO anon, authenticated;
GRANT SELECT ON public.tams360_assets_app TO anon, authenticated;
GRANT SELECT ON public.tams360_inspections_app TO anon, authenticated;
GRANT SELECT ON public.tams360_maintenance_app TO anon, authenticated;
GRANT SELECT ON public.tams360_asset_inventory_log_v TO anon, authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'User Profiles View' as view_name, COUNT(*) as row_count FROM public.tams360_user_profiles_v
UNION ALL
SELECT 'Tenants View', COUNT(*) FROM public.tams360_tenants_v
UNION ALL
SELECT 'Tenant Settings View', COUNT(*) FROM public.tams360_tenant_settings_v
UNION ALL
SELECT 'Assets View', COUNT(*) FROM public.tams360_assets_v
UNION ALL
SELECT 'Inspections View', COUNT(*) FROM public.tams360_inspections_v
UNION ALL
SELECT 'Maintenance View', COUNT(*) FROM public.tams360_maintenance_v
UNION ALL
SELECT 'Asset Types View', COUNT(*) FROM public.tams360_asset_types_v
UNION ALL
SELECT 'CI Distribution View', COUNT(*) FROM public.tams360_ci_distribution_v
UNION ALL
SELECT 'Urgency Summary View', COUNT(*) FROM public.tams360_urgency_summary_v
UNION ALL
SELECT 'Asset Type Summary View', COUNT(*) FROM public.tams360_asset_type_summary_v
UNION ALL
SELECT 'Assets App View', COUNT(*) FROM public.tams360_assets_app
UNION ALL
SELECT 'Inspections App View', COUNT(*) FROM public.tams360_inspections_app
UNION ALL
SELECT 'Maintenance App View', COUNT(*) FROM public.tams360_maintenance_app;
