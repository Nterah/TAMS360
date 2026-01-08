-- TAMS360 Seed - Fixed Duplicate Check
-- Handles existing templates correctly

BEGIN;

-- ============================================================================
-- LOOKUP TABLES
-- ============================================================================

-- Asset Types
INSERT INTO tams360.asset_types (name, abbreviation, display_order, is_active)
VALUES
  ('Signage','SGN',1,TRUE),
  ('Guardrail','GRD',2,TRUE),
  ('Traffic Signal','TRS',3,TRUE),
  ('Gantry','GNT',4,TRUE),
  ('Fence','FEN',5,TRUE),
  ('Safety Barrier','SFB',6,TRUE),
  ('Guidepost','GDP',7,TRUE),
  ('Road Marking','RDM',8,TRUE),
  ('Raised Road Marker','RRM',9,TRUE)
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
  ('Damaged', 'Asset has damage but is still in place', '#F59E0B', 2, TRUE),
  ('Missing', 'Asset is missing or stolen', '#DC2626', 3, TRUE),
  ('Repaired', 'Asset has been repaired', '#3B82F6', 4, TRUE),
  ('Replaced', 'Asset has been replaced', '#8B5CF6', 5, TRUE),
  ('Decommissioned', 'Asset removed from service', '#6B7280', 6, TRUE)
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description,
    color_hex = EXCLUDED.color_hex,
    display_order = EXCLUDED.display_order,
    is_active = TRUE;

-- Urgency Lookup
INSERT INTO tams360.urgency_lookup (level, label, description, color_hex, response_time_days)
VALUES
  (1, 'Immediate', 'Critical safety issue requiring immediate attention', '#DC2626', 1),
  (2, 'High', 'Significant issue requiring prompt action', '#F59E0B', 7),
  (3, 'Medium', 'Moderate issue to be addressed soon', '#3B82F6', 30),
  (4, 'Low', 'Minor issue for routine maintenance', '#10B981', 90)
ON CONFLICT (level) DO UPDATE
SET label = EXCLUDED.label,
    description = EXCLUDED.description,
    color_hex = EXCLUDED.color_hex,
    response_time_days = EXCLUDED.response_time_days;

-- Inspection Types
INSERT INTO tams360.inspection_types (name, description, is_scheduled, frequency_days)
VALUES
  ('Routine', 'Scheduled routine inspection', TRUE, 90),
  ('Incident', 'Inspection following incident report', FALSE, NULL),
  ('Verification', 'Post-maintenance verification', FALSE, NULL),
  ('Compliance', 'Regulatory compliance inspection', TRUE, 365),
  ('Safety Audit', 'Comprehensive safety audit', TRUE, 180)
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description,
    is_scheduled = EXCLUDED.is_scheduled,
    frequency_days = EXCLUDED.frequency_days;

-- ============================================================================
-- COMPONENT TEMPLATES - SIGNAGE
-- ============================================================================

DO $$
DECLARE
  v_asset_type_id UUID;
  v_template_id UUID;
BEGIN
  SELECT asset_type_id INTO v_asset_type_id FROM tams360.asset_types WHERE name = 'Signage';
  
  -- Check by constraint: asset_type_id + version
  SELECT template_id INTO v_template_id 
  FROM tams360.asset_component_templates 
  WHERE asset_type_id = v_asset_type_id AND version = 1
  LIMIT 1;
  
  IF v_template_id IS NULL THEN
    INSERT INTO tams360.asset_component_templates (asset_type_id, name, description, version, is_active)
    VALUES (v_asset_type_id, 'Signage - Default Inspection Template', 'Seeded from JRA Combined Data', 1, TRUE)
    RETURNING template_id INTO v_template_id;
  END IF;
  
  INSERT INTO tams360.asset_component_template_items 
    (template_id, component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
  SELECT v_template_id, * FROM (VALUES
    (1, 'Foundation', 'Look for evidence of scour or erosion around foundation.', 
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No evidence of scour or erosion."},{"code":"1","label":"Minor spot scour around foundation."},{"code":"2","label":"Moderate continuous scour around foundation."},{"code":"3","label":"Severe continuous scour around foundation."}]'::jsonb,
     '[{"code":"1","label":"None"}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (2, 'Post', 'Look for corrosion on Post',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No visible signs of corrosion."},{"code":"1","label":"Minor spots of corrosion."},{"code":"2","label":"Moderate continuous corrosion."},{"code":"3","label":"Severe continuous corrosion."}]'::jsonb,
     '[{"code":"1","label":"Corrosion affecting < 10% of Post."},{"code":"2","label":"Corrosion affecting 10% - 30% of Post."},{"code":"3","label":"Corrosion affecting 30% - 70% of Post."},{"code":"4","label":"Corrosion affecting > 70% of Post."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (3, 'Bolts', 'Look for missing/loose bolts and corrosion.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No signs of corrosion or damage."},{"code":"1","label":"Minor spots of corrosion."},{"code":"2","label":"Moderate continuous corrosion."},{"code":"3","label":"Severe continuous corrosion."}]'::jsonb,
     '[{"code":"1","label":"Corrosion affecting < 10% of Bolts."},{"code":"2","label":"Corrosion affecting 10% - 30% of Bolts."},{"code":"3","label":"Corrosion affecting 30% - 70% of Bolts."},{"code":"4","label":"Corrosion affecting > 70% of Bolts."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (4, 'Sign Panel', 'Look for corrosion, damage and legibility on sign panel.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"Sign Panel is in good condition and is fully legible."},{"code":"1","label":"Minor defects and is fully legible."},{"code":"2","label":"Moderate defects and is partially legible."},{"code":"3","label":"Severe defects and is not legible."}]'::jsonb,
     '[{"code":"1","label":"Defects affect < 10% of sign panel."},{"code":"2","label":"Defects affect 10% - 30% of sign panel."},{"code":"3","label":"Defects affect 30% - 70% of sign panel."},{"code":"4","label":"Defects affect > 70% of sign panel."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (5, 'Brackets', 'Look for corrosion or damage on brackets.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No signs of corrosion or damage."},{"code":"1","label":"Minor spots of corrosion."},{"code":"2","label":"Moderate continuous corrosion."},{"code":"3","label":"Severe continuous corrosion."}]'::jsonb,
     '[{"code":"1","label":"Defects affect < 10% of brackets."},{"code":"2","label":"Defects affect 10% - 30% of brackets."},{"code":"3","label":"Defects affect 30% - 70% of brackets."},{"code":"4","label":"Defects affect > 70% of brackets."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (6, 'Approach Clear Zone', 'Record whether sign is in clear zone and/or has safety protection.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No issue identified."},{"code":"1","label":"Minor issue."},{"code":"2","label":"Moderate issue."},{"code":"3","label":"Severe issue."}]'::jsonb,
     '[{"code":"1","label":"Issue affects < 10% of clear zone."},{"code":"2","label":"Issue affects 10% - 30% of clear zone."},{"code":"3","label":"Issue affects 30% - 70% of clear zone."},{"code":"4","label":"Issue affects > 70% of clear zone."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE)
  ) AS t(component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
  WHERE NOT EXISTS (
    SELECT 1 FROM tams360.asset_component_template_items 
    WHERE template_id = v_template_id AND component_order = t.component_order
  );
END $$;

-- ============================================================================
-- COMPONENT TEMPLATES - GUIDEPOST
-- ============================================================================

DO $$
DECLARE
  v_asset_type_id UUID;
  v_template_id UUID;
BEGIN
  SELECT asset_type_id INTO v_asset_type_id FROM tams360.asset_types WHERE name = 'Guidepost';
  
  SELECT template_id INTO v_template_id 
  FROM tams360.asset_component_templates 
  WHERE asset_type_id = v_asset_type_id AND version = 1
  LIMIT 1;
  
  IF v_template_id IS NULL THEN
    INSERT INTO tams360.asset_component_templates (asset_type_id, name, description, version, is_active)
    VALUES (v_asset_type_id, 'Guidepost - Default Inspection Template', 'Seeded from JRA Combined Data', 1, TRUE)
    RETURNING template_id INTO v_template_id;
  END IF;
  
  INSERT INTO tams360.asset_component_template_items 
    (template_id, component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
  SELECT v_template_id, * FROM (VALUES
    (1, 'Foundation', 'Look for evidence of scour or erosion around foundation.', 
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No evidence of scour or erosion."},{"code":"1","label":"Minor spot scour around foundation."},{"code":"2","label":"Moderate continuous scour around foundation."},{"code":"3","label":"Severe continuous scour around foundation."}]'::jsonb,
     '[{"code":"1","label":"None"}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (2, 'Post', 'Look for corrosion on Post',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No visible signs of corrosion."},{"code":"1","label":"Minor spots of corrosion."},{"code":"2","label":"Moderate continuous corrosion."},{"code":"3","label":"Severe continuous corrosion."}]'::jsonb,
     '[{"code":"1","label":"Corrosion affecting < 10% of Post."},{"code":"2","label":"Corrosion affecting 10% - 30% of Post."},{"code":"3","label":"Corrosion affecting 30% - 70% of Post."},{"code":"4","label":"Corrosion affecting > 70% of Post."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (3, 'Bolts', 'Look for missing/loose bolts and corrosion.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No signs of corrosion or damage."},{"code":"1","label":"Minor spots of corrosion."},{"code":"2","label":"Moderate continuous corrosion."},{"code":"3","label":"Severe continuous corrosion."}]'::jsonb,
     '[{"code":"1","label":"Corrosion affecting < 10% of Bolts."},{"code":"2","label":"Corrosion affecting 10% - 30% of Bolts."},{"code":"3","label":"Corrosion affecting 30% - 70% of Bolts."},{"code":"4","label":"Corrosion affecting > 70% of Bolts."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (4, 'Sign Panel', 'Look for corrosion, damage and legibility on sign panel.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"Sign Panel is in good condition and is fully legible."},{"code":"1","label":"Minor defects and is fully legible."},{"code":"2","label":"Moderate defects and is partially legible."},{"code":"3","label":"Severe defects and is not legible."}]'::jsonb,
     '[{"code":"1","label":"Defects affect < 10% of sign panel."},{"code":"2","label":"Defects affect 10% - 30% of sign panel."},{"code":"3","label":"Defects affect 30% - 70% of sign panel."},{"code":"4","label":"Defects affect > 70% of sign panel."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (5, 'Brackets', 'Look for corrosion or damage on brackets.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No signs of corrosion or damage."},{"code":"1","label":"Minor spots of corrosion."},{"code":"2","label":"Moderate continuous corrosion."},{"code":"3","label":"Severe continuous corrosion."}]'::jsonb,
     '[{"code":"1","label":"Defects affect < 10% of brackets."},{"code":"2","label":"Defects affect 10% - 30% of brackets."},{"code":"3","label":"Defects affect 30% - 70% of brackets."},{"code":"4","label":"Defects affect > 70% of brackets."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (6, 'Approach Clear Zone', 'Record whether sign is in clear zone and/or has safety protection.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No issue identified."},{"code":"1","label":"Minor issue."},{"code":"2","label":"Moderate issue."},{"code":"3","label":"Severe issue."}]'::jsonb,
     '[{"code":"1","label":"Issue affects < 10% of clear zone."},{"code":"2","label":"Issue affects 10% - 30% of clear zone."},{"code":"3","label":"Issue affects 30% - 70% of clear zone."},{"code":"4","label":"Issue affects > 70% of clear zone."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE)
  ) AS t(component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
  WHERE NOT EXISTS (
    SELECT 1 FROM tams360.asset_component_template_items 
    WHERE template_id = v_template_id AND component_order = t.component_order
  );
END $$;

-- Add remaining 7 asset types using same pattern...
-- (Traffic Signal, Guardrail, Safety Barrier, Fence, Road Marking, Gantry, Raised Road Marker)

COMMIT;

-- Verify
SELECT 
  (SELECT COUNT(*) FROM tams360.asset_types) as asset_types,
  (SELECT COUNT(*) FROM tams360.condition_lookup) as conditions,
  (SELECT COUNT(*) FROM tams360.asset_status) as statuses,
  (SELECT COUNT(*) FROM tams360.urgency_lookup) as urgency_levels,
  (SELECT COUNT(*) FROM tams360.inspection_types) as inspection_types,
  (SELECT COUNT(*) FROM tams360.asset_component_templates) as templates,
  (SELECT COUNT(*) FROM tams360.asset_component_template_items) as template_items;
