-- ============================================================================
-- TAMS360 PUBLIC VIEWS CREATION SCRIPT
-- Run this in your Supabase SQL Editor to expose all tams360 schema tables
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

-- ============================================================================
-- CREATE ALL VIEWS
-- ============================================================================

-- 1. User Profiles View
CREATE OR REPLACE VIEW public.tams360_user_profiles_v AS
SELECT 
  id as user_id,
  email,
  name as profile_name,
  organization,
  role,
  tier,
  status,
  depot_id,
  region_id,
  phone,
  avatar_url,
  created_at,
  approved_at,
  approved_by,
  last_login_at,
  metadata,
  tenant_id
FROM tams360.user_profiles;

-- 2. Tenants View
CREATE OR REPLACE VIEW public.tams360_tenants_v AS
SELECT 
  tenant_id,
  name as tenant_name,
  is_active,
  created_at
FROM tams360.tenants;

-- 3. Tenant Settings View
CREATE OR REPLACE VIEW public.tams360_tenant_settings_v AS
SELECT 
  tenant_id,
  unique_id_config,
  ref_config,
  updated_at,
  settings
FROM tams360.tenant_settings;

-- 4. Assets View
CREATE OR REPLACE VIEW public.tams360_assets_v AS
SELECT 
  a.asset_id,
  a.asset_ref,
  a.asset_type_id,
  at.name as asset_type_name,
  at.abbreviation as asset_type_abbr,
  a.road_number,
  a.road_name,
  a.km_marker,
  a.region,
  a.depot,
  a.gps_lat,
  a.gps_lng,
  a.install_date,
  a.status_id,
  ast.name as status_name,
  a.condition_id,
  c.name as condition_name,
  a.notes,
  a.metadata,
  a.created_at,
  a.updated_at,
  a.created_by,
  a.updated_by,
  a.procurement_date,
  a.purchase_price,
  a.useful_life_years,
  a.depreciation_period_years,
  a.current_asset_value,
  a.replacement_value,
  a.salvage_value,
  a.last_valuation_date,
  a.valuation_method,
  a.latest_ci,
  a.latest_deru,
  a.latest_ci_band,
  a.latest_inspection_date,
  a.owner_entity,
  a.maintenance_responsibility,
  a.ownership_confidence,
  a.linked_nearby_asset_id,
  a.ownership_notes,
  a.tenant_id,
  a.location_id,
  a.description
FROM tams360.assets a
LEFT JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id
LEFT JOIN tams360.asset_status ast ON a.status_id = ast.status_id
LEFT JOIN tams360.condition_lookup c ON a.condition_id = c.condition_id;

-- 5. Inspections View
CREATE OR REPLACE VIEW public.tams360_inspections_v AS
SELECT 
  i.inspection_id,
  i.asset_id,
  a.asset_ref,
  a.asset_type_id,
  at.name as asset_type_name,
  i.inspection_date,
  i.inspector_user_id,
  i.inspector_name,
  i.inspection_type_id,
  it.name as inspection_type_name,
  i.finding_summary,
  i.details,
  i.further_inspection_required,
  i.urgency_id,
  u.label as urgency_label,
  u.level as urgency_level,
  i.recommended_action,
  i.gps_lat,
  i.gps_lng,
  i.weather_conditions,
  i.metadata,
  i.created_at,
  i.updated_at,
  i.conditional_index,
  i.deru_value,
  i.calculated_urgency,
  i.total_remedial_cost,
  i.ci_band,
  i.calculation_metadata,
  i.tenant_id
FROM tams360.inspections i
LEFT JOIN tams360.assets a ON i.asset_id = a.asset_id
LEFT JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id
LEFT JOIN tams360.inspection_types it ON i.inspection_type_id = it.inspection_type_id
LEFT JOIN tams360.urgency_lookup u ON i.urgency_id = u.urgency_id;

-- 6. Maintenance Records View
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
  m.tenant_id
FROM tams360.maintenance_records m
LEFT JOIN tams360.assets a ON m.asset_id = a.asset_id
LEFT JOIN tams360.urgency_lookup u ON m.urgency_id = u.urgency_id;

-- 7. Asset Types View
CREATE OR REPLACE VIEW public.tams360_asset_types_v AS
SELECT * FROM tams360.asset_types;

-- 8. Asset Status View
CREATE OR REPLACE VIEW public.tams360_asset_status_v AS
SELECT * FROM tams360.asset_status;

-- 9. Condition Lookup View
CREATE OR REPLACE VIEW public.tams360_condition_lookup_v AS
SELECT * FROM tams360.condition_lookup;

-- 10. Urgency Lookup View
CREATE OR REPLACE VIEW public.tams360_urgency_lookup_v AS
SELECT * FROM tams360.urgency_lookup;

-- 11. Inspection Types View
CREATE OR REPLACE VIEW public.tams360_inspection_types_v AS
SELECT * FROM tams360.inspection_types;

-- 12. Regions View
CREATE OR REPLACE VIEW public.tams360_regions_v AS
SELECT * FROM tams360.regions;

-- 13. Depots View
CREATE OR REPLACE VIEW public.tams360_depots_v AS
SELECT * FROM tams360.depots;

-- 14. Inspection Photos View
CREATE OR REPLACE VIEW public.tams360_inspection_photos_v AS
SELECT * FROM tams360.inspection_photos;

-- 15. Component Templates View
CREATE OR REPLACE VIEW public.tams360_asset_component_templates_v AS
SELECT * FROM tams360.asset_component_templates;

-- 16. Component Template Items View
CREATE OR REPLACE VIEW public.tams360_asset_component_template_items_v AS
SELECT * FROM tams360.asset_component_template_items;

-- 17. Inspection Component Scores View
CREATE OR REPLACE VIEW public.tams360_inspection_component_scores_v AS
SELECT * FROM tams360.inspection_component_scores;

-- 18. Costing Table View
CREATE OR REPLACE VIEW public.tams360_costing_table_v AS
SELECT * FROM tams360.costing_table;

-- ============================================================================
-- AGGREGATED/CALCULATED VIEWS FOR DASHBOARD
-- ============================================================================

-- 19. CI Distribution View
-- Groups assets by CI bands and calculates aggregates
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
-- Summarizes inspection counts by calculated urgency level
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
-- Provides aggregated statistics by asset type
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

-- ============================================================================
-- GRANT PERMISSIONS
-- Grant SELECT on all views to authenticated and anon users
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

-- ============================================================================
-- VERIFICATION
-- Run these queries to verify views were created successfully
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