-- TAMS360 Database Seed File (FIXED)
-- Simplified version without complex CTEs
-- Idempotent inserts (won't duplicate if re-run)

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
  v_asset_type_id INTEGER;
  v_template_id INTEGER;
BEGIN
  -- Get asset type ID
  SELECT asset_type_id INTO v_asset_type_id 
  FROM tams360.asset_types WHERE name = 'Signage';
  
  -- Insert or get template
  INSERT INTO tams360.asset_component_templates (asset_type_id, name, description, version, is_active)
  VALUES (v_asset_type_id, 'Signage - Default Inspection Template', 'Seeded from JRA Combined Data', 1, TRUE)
  ON CONFLICT (asset_type_id, name) DO UPDATE SET is_active = TRUE
  RETURNING template_id INTO v_template_id;
  
  -- If no ID returned (conflict), get existing
  IF v_template_id IS NULL THEN
    SELECT template_id INTO v_template_id 
    FROM tams360.asset_component_templates 
    WHERE asset_type_id = v_asset_type_id AND name = 'Signage - Default Inspection Template'
    ORDER BY version DESC LIMIT 1;
  END IF;
  
  -- Insert template items
  INSERT INTO tams360.asset_component_template_items 
    (template_id, component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
  VALUES
    (v_template_id, 1, 'Foundation', 'Look for evidence of scour or erosion around foundation.', 
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No evidence of scour or erosion."},{"code":"1","label":"Minor spot scour around foundation."},{"code":"2","label":"Moderate continuous scour around foundation."},{"code":"3","label":"Severe continuous scour around foundation."}]'::jsonb,
     '[{"code":"1","label":"None"}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (v_template_id, 2, 'Post', 'Look for corrosion on Post',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No visible signs of corrosion."},{"code":"1","label":"Minor spots of corrosion."},{"code":"2","label":"Moderate continuous corrosion."},{"code":"3","label":"Severe continuous corrosion."}]'::jsonb,
     '[{"code":"1","label":"Corrosion affecting < 10% of Post."},{"code":"2","label":"Corrosion affecting 10% - 30% of Post."},{"code":"3","label":"Corrosion affecting 30% - 70% of Post."},{"code":"4","label":"Corrosion affecting > 70% of Post."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (v_template_id, 3, 'Bolts', 'Look for missing/loose bolts and corrosion.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No signs of corrosion or damage."},{"code":"1","label":"Minor spots of corrosion."},{"code":"2","label":"Moderate continuous corrosion."},{"code":"3","label":"Severe continuous corrosion."}]'::jsonb,
     '[{"code":"1","label":"Corrosion affecting < 10% of Bolts."},{"code":"2","label":"Corrosion affecting 10% - 30% of Bolts."},{"code":"3","label":"Corrosion affecting 30% - 70% of Bolts."},{"code":"4","label":"Corrosion affecting > 70% of Bolts."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (v_template_id, 4, 'Sign Panel', 'Look for corrosion, damage and legibility on sign panel.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"Sign Panel is in good condition and is fully legible."},{"code":"1","label":"Minor defects and is fully legible."},{"code":"2","label":"Moderate defects and is partially legible."},{"code":"3","label":"Severe defects and is not legible."}]'::jsonb,
     '[{"code":"1","label":"Defects affect < 10% of sign panel."},{"code":"2","label":"Defects affect 10% - 30% of sign panel."},{"code":"3","label":"Defects affect 30% - 70% of sign panel."},{"code":"4","label":"Defects affect > 70% of sign panel."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (v_template_id, 5, 'Brackets', 'Look for corrosion or damage on brackets.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No signs of corrosion or damage."},{"code":"1","label":"Minor spots of corrosion."},{"code":"2","label":"Moderate continuous corrosion."},{"code":"3","label":"Severe continuous corrosion."}]'::jsonb,
     '[{"code":"1","label":"Defects affect < 10% of brackets."},{"code":"2","label":"Defects affect 10% - 30% of brackets."},{"code":"3","label":"Defects affect 30% - 70% of brackets."},{"code":"4","label":"Defects affect > 70% of brackets."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (v_template_id, 6, 'Approach Clear Zone', 'Record whether sign is in clear zone and/or has safety protection.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No issue identified."},{"code":"1","label":"Minor issue."},{"code":"2","label":"Moderate issue."},{"code":"3","label":"Severe issue."}]'::jsonb,
     '[{"code":"1","label":"Issue affects < 10% of clear zone."},{"code":"2","label":"Issue affects 10% - 30% of clear zone."},{"code":"3","label":"Issue affects 30% - 70% of clear zone."},{"code":"4","label":"Issue affects > 70% of clear zone."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE)
  ON CONFLICT (template_id, component_order) DO NOTHING;
END $$;

-- ============================================================================
-- COMPONENT TEMPLATES - GUIDEPOST
-- ============================================================================

DO $$
DECLARE
  v_asset_type_id INTEGER;
  v_template_id INTEGER;
BEGIN
  SELECT asset_type_id INTO v_asset_type_id FROM tams360.asset_types WHERE name = 'Guidepost';
  
  INSERT INTO tams360.asset_component_templates (asset_type_id, name, description, version, is_active)
  VALUES (v_asset_type_id, 'Guidepost - Default Inspection Template', 'Seeded from JRA Combined Data', 1, TRUE)
  ON CONFLICT (asset_type_id, name) DO UPDATE SET is_active = TRUE
  RETURNING template_id INTO v_template_id;
  
  IF v_template_id IS NULL THEN
    SELECT template_id INTO v_template_id FROM tams360.asset_component_templates 
    WHERE asset_type_id = v_asset_type_id AND name = 'Guidepost - Default Inspection Template'
    ORDER BY version DESC LIMIT 1;
  END IF;
  
  INSERT INTO tams360.asset_component_template_items 
    (template_id, component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
  VALUES
    (v_template_id, 1, 'Foundation', 'Look for evidence of scour or erosion around foundation.', 
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No evidence of scour or erosion."},{"code":"1","label":"Minor spot scour around foundation."},{"code":"2","label":"Moderate continuous scour around foundation."},{"code":"3","label":"Severe continuous scour around foundation."}]'::jsonb,
     '[{"code":"1","label":"None"}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (v_template_id, 2, 'Post', 'Look for corrosion on Post',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No visible signs of corrosion."},{"code":"1","label":"Minor spots of corrosion."},{"code":"2","label":"Moderate continuous corrosion."},{"code":"3","label":"Severe continuous corrosion."}]'::jsonb,
     '[{"code":"1","label":"Corrosion affecting < 10% of Post."},{"code":"2","label":"Corrosion affecting 10% - 30% of Post."},{"code":"3","label":"Corrosion affecting 30% - 70% of Post."},{"code":"4","label":"Corrosion affecting > 70% of Post."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (v_template_id, 3, 'Bolts', 'Look for missing/loose bolts and corrosion.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No signs of corrosion or damage."},{"code":"1","label":"Minor spots of corrosion."},{"code":"2","label":"Moderate continuous corrosion."},{"code":"3","label":"Severe continuous corrosion."}]'::jsonb,
     '[{"code":"1","label":"Corrosion affecting < 10% of Bolts."},{"code":"2","label":"Corrosion affecting 10% - 30% of Bolts."},{"code":"3","label":"Corrosion affecting 30% - 70% of Bolts."},{"code":"4","label":"Corrosion affecting > 70% of Bolts."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (v_template_id, 4, 'Sign Panel', 'Look for corrosion, damage and legibility on sign panel.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"Sign Panel is in good condition and is fully legible."},{"code":"1","label":"Minor defects and is fully legible."},{"code":"2","label":"Moderate defects and is partially legible."},{"code":"3","label":"Severe defects and is not legible."}]'::jsonb,
     '[{"code":"1","label":"Defects affect < 10% of sign panel."},{"code":"2","label":"Defects affect 10% - 30% of sign panel."},{"code":"3","label":"Defects affect 30% - 70% of sign panel."},{"code":"4","label":"Defects affect > 70% of sign panel."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (v_template_id, 5, 'Brackets', 'Look for corrosion or damage on brackets.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No signs of corrosion or damage."},{"code":"1","label":"Minor spots of corrosion."},{"code":"2","label":"Moderate continuous corrosion."},{"code":"3","label":"Severe continuous corrosion."}]'::jsonb,
     '[{"code":"1","label":"Defects affect < 10% of brackets."},{"code":"2","label":"Defects affect 10% - 30% of brackets."},{"code":"3","label":"Defects affect 30% - 70% of brackets."},{"code":"4","label":"Defects affect > 70% of brackets."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (v_template_id, 6, 'Approach Clear Zone', 'Record whether sign is in clear zone and/or has safety protection.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No issue identified."},{"code":"1","label":"Minor issue."},{"code":"2","label":"Moderate issue."},{"code":"3","label":"Severe issue."}]'::jsonb,
     '[{"code":"1","label":"Issue affects < 10% of clear zone."},{"code":"2","label":"Issue affects 10% - 30% of clear zone."},{"code":"3","label":"Issue affects 30% - 70% of clear zone."},{"code":"4","label":"Issue affects > 70% of clear zone."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE)
  ON CONFLICT (template_id, component_order) DO NOTHING;
END $$;

-- ============================================================================
-- COMPONENT TEMPLATES - TRAFFIC SIGNAL
-- ============================================================================

DO $$
DECLARE
  v_asset_type_id INTEGER;
  v_template_id INTEGER;
BEGIN
  SELECT asset_type_id INTO v_asset_type_id FROM tams360.asset_types WHERE name = 'Traffic Signal';
  
  INSERT INTO tams360.asset_component_templates (asset_type_id, name, description, version, is_active)
  VALUES (v_asset_type_id, 'Traffic Signal - Default Inspection Template', 'Seeded from JRA Combined Data', 1, TRUE)
  ON CONFLICT (asset_type_id, name) DO UPDATE SET is_active = TRUE
  RETURNING template_id INTO v_template_id;
  
  IF v_template_id IS NULL THEN
    SELECT template_id INTO v_template_id FROM tams360.asset_component_templates 
    WHERE asset_type_id = v_asset_type_id AND name = 'Traffic Signal - Default Inspection Template'
    ORDER BY version DESC LIMIT 1;
  END IF;
  
  INSERT INTO tams360.asset_component_template_items 
    (template_id, component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
  VALUES
    (v_template_id, 1, 'Signal Head', 'Check for damage, missing lenses, fading, alignment and operation.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No defects; fully operational."},{"code":"1","label":"Minor defects; operational."},{"code":"2","label":"Moderate defects; partially operational."},{"code":"3","label":"Severe defects; not operational."}]'::jsonb,
     '[{"code":"1","label":"Defects affect < 10% of signal head."},{"code":"2","label":"Defects affect 10% - 30% of signal head."},{"code":"3","label":"Defects affect 30% - 70% of signal head."},{"code":"4","label":"Defects affect > 70% of signal head."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (v_template_id, 2, 'Pole', 'Check for corrosion, impact damage and stability.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No signs of corrosion/damage."},{"code":"1","label":"Minor spots of corrosion/damage."},{"code":"2","label":"Moderate continuous corrosion/damage."},{"code":"3","label":"Severe continuous corrosion/damage."}]'::jsonb,
     '[{"code":"1","label":"Defects affect < 10% of pole."},{"code":"2","label":"Defects affect 10% - 30% of pole."},{"code":"3","label":"Defects affect 30% - 70% of pole."},{"code":"4","label":"Defects affect > 70% of pole."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (v_template_id, 3, 'Controller Cabinet', 'Check cabinet condition, locks, corrosion, vandalism.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No defects; secure and functional."},{"code":"1","label":"Minor defects; secure."},{"code":"2","label":"Moderate defects; security compromised."},{"code":"3","label":"Severe defects; not functional/secure."}]'::jsonb,
     '[{"code":"1","label":"Defects affect < 10% of cabinet."},{"code":"2","label":"Defects affect 10% - 30% of cabinet."},{"code":"3","label":"Defects affect 30% - 70% of cabinet."},{"code":"4","label":"Defects affect > 70% of cabinet."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (v_template_id, 4, 'Wiring / Electrical', 'Check exposed wiring, connections, and evidence of faults.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No issues identified."},{"code":"1","label":"Minor issues; safe."},{"code":"2","label":"Moderate issues; potential hazard."},{"code":"3","label":"Severe issues; hazard/failure."}]'::jsonb,
     '[{"code":"1","label":"Issue affects < 10% of wiring/electrical."},{"code":"2","label":"Issue affects 10% - 30% of wiring/electrical."},{"code":"3","label":"Issue affects 30% - 70% of wiring/electrical."},{"code":"4","label":"Issue affects > 70% of wiring/electrical."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE)
  ON CONFLICT (template_id, component_order) DO NOTHING;
END $$;

-- ============================================================================
-- COMPONENT TEMPLATES - GUARDRAIL
-- ============================================================================

DO $$
DECLARE
  v_asset_type_id INTEGER;
  v_template_id INTEGER;
BEGIN
  SELECT asset_type_id INTO v_asset_type_id FROM tams360.asset_types WHERE name = 'Guardrail';
  
  INSERT INTO tams360.asset_component_templates (asset_type_id, name, description, version, is_active)
  VALUES (v_asset_type_id, 'Guardrail - Default Inspection Template', 'Seeded from JRA Combined Data', 1, TRUE)
  ON CONFLICT (asset_type_id, name) DO UPDATE SET is_active = TRUE
  RETURNING template_id INTO v_template_id;
  
  IF v_template_id IS NULL THEN
    SELECT template_id INTO v_template_id FROM tams360.asset_component_templates 
    WHERE asset_type_id = v_asset_type_id AND name = 'Guardrail - Default Inspection Template'
    ORDER BY version DESC LIMIT 1;
  END IF;
  
  INSERT INTO tams360.asset_component_template_items 
    (template_id, component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
  VALUES
    (v_template_id, 1, 'Guardrail Beam', 'Inspect beam for deformation, corrosion, missing sections.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No defects."},{"code":"1","label":"Minor defects."},{"code":"2","label":"Moderate defects."},{"code":"3","label":"Severe defects."}]'::jsonb,
     '[{"code":"1","label":"Defects affect < 10% of beam."},{"code":"2","label":"Defects affect 10% - 30% of beam."},{"code":"3","label":"Defects affect 30% - 70% of beam."},{"code":"4","label":"Defects affect > 70% of beam."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (v_template_id, 2, 'Posts', 'Inspect posts for damage, looseness, corrosion.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No defects."},{"code":"1","label":"Minor defects."},{"code":"2","label":"Moderate defects."},{"code":"3","label":"Severe defects."}]'::jsonb,
     '[{"code":"1","label":"Defects affect < 10% of posts."},{"code":"2","label":"Defects affect 10% - 30% of posts."},{"code":"3","label":"Defects affect 30% - 70% of posts."},{"code":"4","label":"Defects affect > 70% of posts."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (v_template_id, 3, 'End Treatments', 'Inspect end terminals for damage, correct anchorage.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No defects."},{"code":"1","label":"Minor defects."},{"code":"2","label":"Moderate defects."},{"code":"3","label":"Severe defects."}]'::jsonb,
     '[{"code":"1","label":"Defects affect < 10% of end treatments."},{"code":"2","label":"Defects affect 10% - 30% of end treatments."},{"code":"3","label":"Defects affect 30% - 70% of end treatments."},{"code":"4","label":"Defects affect > 70% of end treatments."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (v_template_id, 4, 'Approach Clear Zone', 'Check if guardrail is required/positioned correctly in clear zone.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No issue identified."},{"code":"1","label":"Minor issue."},{"code":"2","label":"Moderate issue."},{"code":"3","label":"Severe issue."}]'::jsonb,
     '[{"code":"1","label":"Issue affects < 10% of clear zone."},{"code":"2","label":"Issue affects 10% - 30% of clear zone."},{"code":"3","label":"Issue affects 30% - 70% of clear zone."},{"code":"4","label":"Issue affects > 70% of clear zone."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE)
  ON CONFLICT (template_id, component_order) DO NOTHING;
END $$;

-- ============================================================================
-- COMPONENT TEMPLATES - SAFETY BARRIER
-- ============================================================================

DO $$
DECLARE
  v_asset_type_id INTEGER;
  v_template_id INTEGER;
BEGIN
  SELECT asset_type_id INTO v_asset_type_id FROM tams360.asset_types WHERE name = 'Safety Barrier';
  
  INSERT INTO tams360.asset_component_templates (asset_type_id, name, description, version, is_active)
  VALUES (v_asset_type_id, 'Safety Barrier - Default Inspection Template', 'Seeded from JRA Combined Data', 1, TRUE)
  ON CONFLICT (asset_type_id, name) DO UPDATE SET is_active = TRUE
  RETURNING template_id INTO v_template_id;
  
  IF v_template_id IS NULL THEN
    SELECT template_id INTO v_template_id FROM tams360.asset_component_templates 
    WHERE asset_type_id = v_asset_type_id AND name = 'Safety Barrier - Default Inspection Template'
    ORDER BY version DESC LIMIT 1;
  END IF;
  
  INSERT INTO tams360.asset_component_template_items 
    (template_id, component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
  VALUES
    (v_template_id, 1, 'Barrier Element', 'Inspect barrier element for damage, deformation, missing parts.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No defects."},{"code":"1","label":"Minor defects."},{"code":"2","label":"Moderate defects."},{"code":"3","label":"Severe defects."}]'::jsonb,
     '[{"code":"1","label":"Defects affect < 10% of barrier."},{"code":"2","label":"Defects affect 10% - 30% of barrier."},{"code":"3","label":"Defects affect 30% - 70% of barrier."},{"code":"4","label":"Defects affect > 70% of barrier."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (v_template_id, 2, 'Posts / Fixings', 'Inspect posts and fixings for looseness, corrosion, damage.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No defects."},{"code":"1","label":"Minor defects."},{"code":"2","label":"Moderate defects."},{"code":"3","label":"Severe defects."}]'::jsonb,
     '[{"code":"1","label":"Defects affect < 10% of posts/fixings."},{"code":"2","label":"Defects affect 10% - 30% of posts/fixings."},{"code":"3","label":"Defects affect 30% - 70% of posts/fixings."},{"code":"4","label":"Defects affect > 70% of posts/fixings."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE)
  ON CONFLICT (template_id, component_order) DO NOTHING;
END $$;

-- ============================================================================
-- COMPONENT TEMPLATES - FENCE
-- ============================================================================

DO $$
DECLARE
  v_asset_type_id INTEGER;
  v_template_id INTEGER;
BEGIN
  SELECT asset_type_id INTO v_asset_type_id FROM tams360.asset_types WHERE name = 'Fence';
  
  INSERT INTO tams360.asset_component_templates (asset_type_id, name, description, version, is_active)
  VALUES (v_asset_type_id, 'Fence - Default Inspection Template', 'Seeded from JRA Combined Data', 1, TRUE)
  ON CONFLICT (asset_type_id, name) DO UPDATE SET is_active = TRUE
  RETURNING template_id INTO v_template_id;
  
  IF v_template_id IS NULL THEN
    SELECT template_id INTO v_template_id FROM tams360.asset_component_templates 
    WHERE asset_type_id = v_asset_type_id AND name = 'Fence - Default Inspection Template'
    ORDER BY version DESC LIMIT 1;
  END IF;
  
  INSERT INTO tams360.asset_component_template_items 
    (template_id, component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
  VALUES
    (v_template_id, 1, 'Fence Posts', 'Inspect posts for leaning, damage, corrosion/rot.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No defects."},{"code":"1","label":"Minor defects."},{"code":"2","label":"Moderate defects."},{"code":"3","label":"Severe defects."}]'::jsonb,
     '[{"code":"1","label":"Defects affect < 10% of posts."},{"code":"2","label":"Defects affect 10% - 30% of posts."},{"code":"3","label":"Defects affect 30% - 70% of posts."},{"code":"4","label":"Defects affect > 70% of posts."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (v_template_id, 2, 'Fence Mesh / Rails', 'Inspect mesh/rails for breaks, corrosion, missing sections.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No defects."},{"code":"1","label":"Minor defects."},{"code":"2","label":"Moderate defects."},{"code":"3","label":"Severe defects."}]'::jsonb,
     '[{"code":"1","label":"Defects affect < 10% of fence."},{"code":"2","label":"Defects affect 10% - 30% of fence."},{"code":"3","label":"Defects affect 30% - 70% of fence."},{"code":"4","label":"Defects affect > 70% of fence."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (v_template_id, 3, 'Gates', 'Inspect gates for alignment, hinges, locks and operation.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No defects; fully operational."},{"code":"1","label":"Minor defects; operational."},{"code":"2","label":"Moderate defects; difficult to operate."},{"code":"3","label":"Severe defects; not operational."}]'::jsonb,
     '[{"code":"1","label":"Defects affect < 10% of gates."},{"code":"2","label":"Defects affect 10% - 30% of gates."},{"code":"3","label":"Defects affect 30% - 70% of gates."},{"code":"4","label":"Defects affect > 70% of gates."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE)
  ON CONFLICT (template_id, component_order) DO NOTHING;
END $$;

-- ============================================================================
-- COMPONENT TEMPLATES - ROAD MARKING
-- ============================================================================

DO $$
DECLARE
  v_asset_type_id INTEGER;
  v_template_id INTEGER;
BEGIN
  SELECT asset_type_id INTO v_asset_type_id FROM tams360.asset_types WHERE name = 'Road Marking';
  
  INSERT INTO tams360.asset_component_templates (asset_type_id, name, description, version, is_active)
  VALUES (v_asset_type_id, 'Road Marking - Default Inspection Template', 'Seeded from JRA Combined Data', 1, TRUE)
  ON CONFLICT (asset_type_id, name) DO UPDATE SET is_active = TRUE
  RETURNING template_id INTO v_template_id;
  
  IF v_template_id IS NULL THEN
    SELECT template_id INTO v_template_id FROM tams360.asset_component_templates 
    WHERE asset_type_id = v_asset_type_id AND name = 'Road Marking - Default Inspection Template'
    ORDER BY version DESC LIMIT 1;
  END IF;
  
  INSERT INTO tams360.asset_component_template_items 
    (template_id, component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
  VALUES
    (v_template_id, 1, 'Line / Marking Visibility', 'Assess visibility/reflectivity and continuity of markings.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"Clearly visible, continuous."},{"code":"1","label":"Slight fading, still clear."},{"code":"2","label":"Moderate fading/patchy."},{"code":"3","label":"Severely faded/missing."}]'::jsonb,
     '[{"code":"1","label":"Defects affect < 10% of markings."},{"code":"2","label":"Defects affect 10% - 30% of markings."},{"code":"3","label":"Defects affect 30% - 70% of markings."},{"code":"4","label":"Defects affect > 70% of markings."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (v_template_id, 2, 'Surface Condition', 'Check pavement surface affecting marking performance.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No issues."},{"code":"1","label":"Minor issues."},{"code":"2","label":"Moderate issues."},{"code":"3","label":"Severe issues."}]'::jsonb,
     '[{"code":"1","label":"Issue affects < 10% of surface."},{"code":"2","label":"Issue affects 10% - 30% of surface."},{"code":"3","label":"Issue affects 30% - 70% of surface."},{"code":"4","label":"Issue affects > 70% of surface."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE)
  ON CONFLICT (template_id, component_order) DO NOTHING;
END $$;

-- ============================================================================
-- COMPONENT TEMPLATES - GANTRY
-- ============================================================================

DO $$
DECLARE
  v_asset_type_id INTEGER;
  v_template_id INTEGER;
BEGIN
  SELECT asset_type_id INTO v_asset_type_id FROM tams360.asset_types WHERE name = 'Gantry';
  
  INSERT INTO tams360.asset_component_templates (asset_type_id, name, description, version, is_active)
  VALUES (v_asset_type_id, 'Gantry - Default Inspection Template', 'Seeded from JRA Combined Data', 1, TRUE)
  ON CONFLICT (asset_type_id, name) DO UPDATE SET is_active = TRUE
  RETURNING template_id INTO v_template_id;
  
  IF v_template_id IS NULL THEN
    SELECT template_id INTO v_template_id FROM tams360.asset_component_templates 
    WHERE asset_type_id = v_asset_type_id AND name = 'Gantry - Default Inspection Template'
    ORDER BY version DESC LIMIT 1;
  END IF;
  
  INSERT INTO tams360.asset_component_template_items 
    (template_id, component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
  VALUES
    (v_template_id, 1, 'Foundation', 'Look for evidence of scour or erosion around foundation.', 
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No evidence of scour or erosion."},{"code":"1","label":"Minor spot scour around foundation."},{"code":"2","label":"Moderate continuous scour around foundation."},{"code":"3","label":"Severe continuous scour around foundation."}]'::jsonb,
     '[{"code":"1","label":"None"}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (v_template_id, 2, 'Post', 'Look for corrosion on Post',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No visible signs of corrosion."},{"code":"1","label":"Minor spots of corrosion."},{"code":"2","label":"Moderate continuous corrosion."},{"code":"3","label":"Severe continuous corrosion."}]'::jsonb,
     '[{"code":"1","label":"Corrosion affecting < 10% of Post."},{"code":"2","label":"Corrosion affecting 10% - 30% of Post."},{"code":"3","label":"Corrosion affecting 30% - 70% of Post."},{"code":"4","label":"Corrosion affecting > 70% of Post."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (v_template_id, 3, 'Bolts', 'Look for missing/loose bolts and corrosion.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No signs of corrosion or damage."},{"code":"1","label":"Minor spots of corrosion."},{"code":"2","label":"Moderate continuous corrosion."},{"code":"3","label":"Severe continuous corrosion."}]'::jsonb,
     '[{"code":"1","label":"Corrosion affecting < 10% of Bolts."},{"code":"2","label":"Corrosion affecting 10% - 30% of Bolts."},{"code":"3","label":"Corrosion affecting 30% - 70% of Bolts."},{"code":"4","label":"Corrosion affecting > 70% of Bolts."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (v_template_id, 4, 'Sign Panel', 'Look for corrosion, damage and legibility on sign panel.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"Sign Panel is in good condition and is fully legible."},{"code":"1","label":"Minor defects and is fully legible."},{"code":"2","label":"Moderate defects and is partially legible."},{"code":"3","label":"Severe defects and is not legible."}]'::jsonb,
     '[{"code":"1","label":"Defects affect < 10% of sign panel."},{"code":"2","label":"Defects affect 10% - 30% of sign panel."},{"code":"3","label":"Defects affect 30% - 70% of sign panel."},{"code":"4","label":"Defects affect > 70% of sign panel."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (v_template_id, 5, 'Brackets', 'Look for corrosion or damage on brackets.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No signs of corrosion or damage."},{"code":"1","label":"Minor spots of corrosion."},{"code":"2","label":"Moderate continuous corrosion."},{"code":"3","label":"Severe continuous corrosion."}]'::jsonb,
     '[{"code":"1","label":"Defects affect < 10% of brackets."},{"code":"2","label":"Defects affect 10% - 30% of brackets."},{"code":"3","label":"Defects affect 30% - 70% of brackets."},{"code":"4","label":"Defects affect > 70% of brackets."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (v_template_id, 6, 'Approach Clear Zone', 'Record whether sign is in clear zone and/or has safety protection.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No issue identified."},{"code":"1","label":"Minor issue."},{"code":"2","label":"Moderate issue."},{"code":"3","label":"Severe issue."}]'::jsonb,
     '[{"code":"1","label":"Issue affects < 10% of clear zone."},{"code":"2","label":"Issue affects 10% - 30% of clear zone."},{"code":"3","label":"Issue affects 30% - 70% of clear zone."},{"code":"4","label":"Issue affects > 70% of clear zone."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE)
  ON CONFLICT (template_id, component_order) DO NOTHING;
END $$;

-- ============================================================================
-- COMPONENT TEMPLATES - RAISED ROAD MARKER
-- ============================================================================

DO $$
DECLARE
  v_asset_type_id INTEGER;
  v_template_id INTEGER;
BEGIN
  SELECT asset_type_id INTO v_asset_type_id FROM tams360.asset_types WHERE name = 'Raised Road Marker';
  
  INSERT INTO tams360.asset_component_templates (asset_type_id, name, description, version, is_active)
  VALUES (v_asset_type_id, 'Raised Road Marker - Default Inspection Template', 'Seeded from JRA Combined Data', 1, TRUE)
  ON CONFLICT (asset_type_id, name) DO UPDATE SET is_active = TRUE
  RETURNING template_id INTO v_template_id;
  
  IF v_template_id IS NULL THEN
    SELECT template_id INTO v_template_id FROM tams360.asset_component_templates 
    WHERE asset_type_id = v_asset_type_id AND name = 'Raised Road Marker - Default Inspection Template'
    ORDER BY version DESC LIMIT 1;
  END IF;
  
  INSERT INTO tams360.asset_component_template_items 
    (template_id, component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
  VALUES
    (v_template_id, 1, 'Marker Presence', 'Check for missing markers and alignment.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"All present and correctly aligned."},{"code":"1","label":"Few missing/misaligned."},{"code":"2","label":"Moderate missing/misalignment."},{"code":"3","label":"Many missing/major misalignment."}]'::jsonb,
     '[{"code":"1","label":"Defects affect < 10% of markers."},{"code":"2","label":"Defects affect 10% - 30% of markers."},{"code":"3","label":"Defects affect 30% - 70% of markers."},{"code":"4","label":"Defects affect > 70% of markers."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (v_template_id, 2, 'Reflectivity', 'Assess reflectivity/visibility at night.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"Fully reflective."},{"code":"1","label":"Slightly reduced reflectivity."},{"code":"2","label":"Moderately reduced reflectivity."},{"code":"3","label":"Not reflective."}]'::jsonb,
     '[{"code":"1","label":"Defects affect < 10% of markers."},{"code":"2","label":"Defects affect 10% - 30% of markers."},{"code":"3","label":"Defects affect 30% - 70% of markers."},{"code":"4","label":"Defects affect > 70% of markers."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (v_template_id, 3, 'Fixing / Adhesion', 'Check if markers are firmly fixed to surface.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"Firmly fixed."},{"code":"1","label":"Minor looseness."},{"code":"2","label":"Moderate looseness."},{"code":"3","label":"Loose/detached."}]'::jsonb,
     '[{"code":"1","label":"Defects affect < 10% of markers."},{"code":"2","label":"Defects affect 10% - 30% of markers."},{"code":"3","label":"Defects affect 30% - 70% of markers."},{"code":"4","label":"Defects affect > 70% of markers."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (v_template_id, 4, 'Surface Condition', 'Check pavement surface around markers.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No issues."},{"code":"1","label":"Minor issues."},{"code":"2","label":"Moderate issues."},{"code":"3","label":"Severe issues."}]'::jsonb,
     '[{"code":"1","label":"Issue affects < 10% of area."},{"code":"2","label":"Issue affects 10% - 30% of area."},{"code":"3","label":"Issue affects 30% - 70% of area."},{"code":"4","label":"Issue affects > 70% of area."}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE)
  ON CONFLICT (template_id, component_order) DO NOTHING;
END $$;

COMMIT;

-- Verification queries (optional - run separately to check)
-- SELECT COUNT(*) as asset_types FROM tams360.asset_types;
-- SELECT COUNT(*) as conditions FROM tams360.condition_lookup;
-- SELECT COUNT(*) as templates FROM tams360.asset_component_templates;
-- SELECT COUNT(*) as template_items FROM tams360.asset_component_template_items;
