-- Fix public schema views to expose all columns from their tams360 base tables.
-- The public.inspections view only exposes the original columns from tams360.inspections,
-- omitting all CI/DERU columns added later. Recreate it to expose all columns so that
-- supabase.from("inspections").update({ calculated_urgency, ... }) works correctly.

CREATE OR REPLACE VIEW public.inspections AS
SELECT
  inspection_id,
  asset_id,
  inspection_date,
  inspector_user_id,
  inspector_name,
  inspection_type_id,
  finding_summary,
  details,
  further_inspection_required,
  urgency_id,
  recommended_action,
  gps_lat,
  gps_lng,
  weather_conditions,
  metadata,
  created_at,
  updated_at,
  conditional_index,
  deru_value,
  calculated_urgency,
  total_remedial_cost,
  ci_band,
  calculation_metadata,
  tenant_id
FROM tams360.inspections;

-- Also expose all columns of inspection_component_scores (including tenant_id)
-- so inserts via supabase.from("inspection_component_scores") pass tenant_id through.
CREATE OR REPLACE VIEW public.inspection_component_scores AS
SELECT
  score_id,
  inspection_id,
  item_id,
  component_name,
  degree_value,
  extent_value,
  relevancy_value,
  component_score,
  quantity,
  quantity_unit,
  rate,
  component_cost,
  component_notes,
  photo_references,
  created_at,
  tenant_id
FROM tams360.inspection_component_scores;

-- item_id is not always known at inspection-edit time; make it optional.
ALTER TABLE tams360.inspection_component_scores ALTER COLUMN item_id DROP NOT NULL;

-- Grant standard Supabase roles access to the tams360 schema and all its tables.
-- Without this, service_role cannot INSERT/DELETE in tams360 tables (or through views
-- backed by them), causing "permission denied" errors on inspection save.
GRANT USAGE ON SCHEMA tams360 TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA tams360 TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA tams360 TO anon, authenticated, service_role;

-- Grant access to the public views that wrap tams360 tables.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspections TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_component_scores TO anon, authenticated, service_role;
