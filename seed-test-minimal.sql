-- TAMS360 Minimal Seed Test (3 Asset Types Only)
-- Test this first, then run the full seed file

BEGIN;

-- ============================================================================
-- LOOKUP TABLES
-- ============================================================================

-- Asset Types
INSERT INTO tams360.asset_types (name, abbreviation, display_order, is_active)
VALUES
  ('Signage','SGN',1,TRUE),
  ('Guardrail','GRD',2,TRUE),
  ('Traffic Signal','TRS',3,TRUE)
ON CONFLICT (name) DO UPDATE
SET abbreviation = EXCLUDED.abbreviation,
    display_order = EXCLUDED.display_order,
    is_active = TRUE;

-- Conditions
INSERT INTO tams360.condition_lookup (name, score, description, color_hex)
VALUES
  ('Excellent', 4, 'Like new condition', '#10B981'),
  ('Good', 3, 'Minor wear, fully functional', '#3B82F6'),
  ('Fair', 2, 'Noticeable wear, needs attention', '#F59E0B'),
  ('Poor', 1, 'Significant deterioration', '#DC2626')
ON CONFLICT (name) DO UPDATE
SET score = EXCLUDED.score,
    description = EXCLUDED.description,
    color_hex = EXCLUDED.color_hex;

-- Asset Status
INSERT INTO tams360.asset_status (name, description, color_hex, display_order, is_active)
VALUES
  ('Active', 'Asset is operational and in use', '#10B981', 1, TRUE),
  ('Damaged', 'Asset has damage but is still in place', '#F59E0B', 2, TRUE)
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description,
    color_hex = EXCLUDED.color_hex,
    display_order = EXCLUDED.display_order,
    is_active = TRUE;

-- Urgency Lookup
INSERT INTO tams360.urgency_lookup (level, label, description, color_hex, response_time_days)
VALUES
  (1, 'Immediate', 'Critical safety issue requiring immediate attention', '#DC2626', 1),
  (2, 'High', 'Significant issue requiring prompt action', '#F59E0B', 7)
ON CONFLICT (level) DO UPDATE
SET label = EXCLUDED.label,
    description = EXCLUDED.description,
    color_hex = EXCLUDED.color_hex,
    response_time_days = EXCLUDED.response_time_days;

-- Inspection Types
INSERT INTO tams360.inspection_types (name, description, is_scheduled, frequency_days)
VALUES
  ('Routine', 'Scheduled routine inspection', TRUE, 90),
  ('Incident', 'Inspection following incident report', FALSE, NULL)
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description,
    is_scheduled = EXCLUDED.is_scheduled,
    frequency_days = EXCLUDED.frequency_days;

-- ============================================================================
-- COMPONENT TEMPLATE - SIGNAGE (Test)
-- ============================================================================

DO $$
DECLARE
  v_asset_type_id UUID;
  v_template_id UUID;
BEGIN
  -- Get asset type ID
  SELECT asset_type_id INTO v_asset_type_id 
  FROM tams360.asset_types WHERE name = 'Signage';
  
  -- Check if template exists
  SELECT template_id INTO v_template_id 
  FROM tams360.asset_component_templates 
  WHERE asset_type_id = v_asset_type_id AND name = 'Signage - Default Inspection Template'
  LIMIT 1;
  
  -- If not exists, insert
  IF v_template_id IS NULL THEN
    INSERT INTO tams360.asset_component_templates (asset_type_id, name, description, version, is_active)
    VALUES (v_asset_type_id, 'Signage - Default Inspection Template', 'Seeded from JRA Combined Data', 1, TRUE)
    RETURNING template_id INTO v_template_id;
  END IF;
  
  -- Insert only 2 template items for testing
  INSERT INTO tams360.asset_component_template_items 
    (template_id, component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
  SELECT v_template_id, component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active
  FROM (VALUES
    (1, 'Foundation', 'Look for evidence of scour or erosion around foundation.', 
     '[{"code":"0","label":"No defects"},{"code":"1","label":"Minor defects"},{"code":"2","label":"Moderate defects"},{"code":"3","label":"Severe defects"}]'::jsonb,
     '[{"code":"1","label":"< 10%"},{"code":"2","label":"10-30%"},{"code":"3","label":"30-70%"},{"code":"4","label":"> 70%"}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (2, 'Post', 'Look for corrosion on Post',
     '[{"code":"0","label":"No corrosion"},{"code":"1","label":"Minor corrosion"},{"code":"2","label":"Moderate corrosion"},{"code":"3","label":"Severe corrosion"}]'::jsonb,
     '[{"code":"1","label":"< 10%"},{"code":"2","label":"10-30%"},{"code":"3","label":"30-70%"},{"code":"4","label":"> 70%"}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE)
  ) AS t(component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
  WHERE NOT EXISTS (
    SELECT 1 FROM tams360.asset_component_template_items 
    WHERE template_id = v_template_id AND component_order = t.component_order
  );
  
  RAISE NOTICE 'Created Signage template with ID: %', v_template_id;
END $$;

COMMIT;

-- Verify
SELECT 
  (SELECT COUNT(*) FROM tams360.asset_types) as asset_types,
  (SELECT COUNT(*) FROM tams360.condition_lookup) as conditions,
  (SELECT COUNT(*) FROM tams360.asset_component_templates) as templates,
  (SELECT COUNT(*) FROM tams360.asset_component_template_items) as template_items;
