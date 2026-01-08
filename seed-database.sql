-- TAMS360 Database Seed File
-- Seed: Lookup tables + inspection component templates + items
-- Source: JRA Combined Data Final (Rev 2).xlsm
-- Notes:
--   • Idempotent inserts (won't duplicate if re-run).
--   • This seeds lookup tables + per-asset-type inspection component rubrics (D/E/R).

BEGIN;

-- Ensure core asset types exist (upserts by name)
INSERT INTO tams360.asset_types (name, abbreviation, display_order, is_active)
VALUES
  ('Traffic Signal','TS',1,TRUE),
  ('Road Sign','RS',2,TRUE),
  ('Gantry Structures','GS',3,TRUE),
  ('Guardrail','GR',4,TRUE),
  ('Fence','FNC',5,TRUE),
  ('Safety Barriers','SB',6,TRUE),
  ('Road Markings','RM',7,TRUE),
  ('Guide Post','GP',8,TRUE),
  ('Raised Road Markers','RRM',9,TRUE),
  ('Other','O',10,TRUE)
ON CONFLICT (name) DO UPDATE
SET abbreviation = EXCLUDED.abbreviation,
    display_order = EXCLUDED.display_order,
    is_active = TRUE;


-- Conditions (upsert by name)
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

-- Asset Status (upsert by name)
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

-- Urgency Lookup (upsert by level)
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

-- Inspection Types (upsert by name)
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


-- Traffic Signal
WITH traffic_signal_at AS (
  SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Traffic Signal' LIMIT 1
),
traffic_signal_tpl AS (
  INSERT INTO tams360.asset_component_templates (asset_type_id, name, description, version, is_active)
  SELECT traffic_signal_at.asset_type_id, 'Traffic Signal - Default Inspection Template', 'Seeded from JRA Combined Data Final (Rev 2).xlsm, sheet ''Traffic Signal''.', 1, TRUE
  FROM traffic_signal_at
  WHERE NOT EXISTS (
    SELECT 1 FROM tams360.asset_component_templates t
    WHERE t.asset_type_id = traffic_signal_at.asset_type_id AND t.name = 'Traffic Signal - Default Inspection Template'
  )
  RETURNING template_id
),
traffic_signal_tplid AS (
  SELECT template_id FROM traffic_signal_tpl
  UNION ALL
  SELECT t.template_id
  FROM tams360.asset_component_templates t
  JOIN traffic_signal_at ON t.asset_type_id = traffic_signal_at.asset_type_id
  WHERE t.name = 'Traffic Signal - Default Inspection Template'
  ORDER BY t.version DESC, t.created_at DESC
  LIMIT 1
),
traffic_signal_items(component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric) AS (
  VALUES
    (1, 'Signal Head', 'Check for damage, missing lenses, fading, alignment and operation.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "No defects; fully operational."}, {"code": "1", "label": "Minor defects; operational."}, {"code": "2", "label": "Moderate defects; partially operational."}, {"code": "3", "label": "Severe defects; not operational."}]'::jsonb, '[{"code": "1", "label": "Defects affect < 10% of signal head."}, {"code": "2", "label": "Defects affect 10% - 30% of signal head."}, {"code": "3", "label": "Defects affect 30% - 70% of signal head."}, {"code": "4", "label": "Defects affect > 70% of signal head."}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb),
    (2, 'Pole', 'Check for corrosion, impact damage and stability.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "No signs of corrosion/damage."}, {"code": "1", "label": "Minor spots of corrosion/damage."}, {"code": "2", "label": "Moderate continuous corrosion/damage."}, {"code": "3", "label": "Severe continuous corrosion/damage."}]'::jsonb, '[{"code": "1", "label": "Defects affect < 10% of pole."}, {"code": "2", "label": "Defects affect 10% - 30% of pole."}, {"code": "3", "label": "Defects affect 30% - 70% of pole."}, {"code": "4", "label": "Defects affect > 70% of pole."}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb),
    (3, 'Controller Cabinet', 'Check cabinet condition, locks, corrosion, vandalism.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "No defects; secure and functional."}, {"code": "1", "label": "Minor defects; secure."}, {"code": "2", "label": "Moderate defects; security compromised."}, {"code": "3", "label": "Severe defects; not functional/secure."}]'::jsonb, '[{"code": "1", "label": "Defects affect < 10% of cabinet."}, {"code": "2", "label": "Defects affect 10% - 30% of cabinet."}, {"code": "3", "label": "Defects affect 30% - 70% of cabinet."}, {"code": "4", "label": "Defects affect > 70% of cabinet."}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb),
    (4, 'Wiring / Electrical', 'Check exposed wiring, connections, and evidence of faults.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "No issues identified."}, {"code": "1", "label": "Minor issues; safe."}, {"code": "2", "label": "Moderate issues; potential hazard."}, {"code": "3", "label": "Severe issues; hazard/failure."}]'::jsonb, '[{"code": "1", "label": "Issue affects < 10% of wiring/electrical."}, {"code": "2", "label": "Issue affects 10% - 30% of wiring/electrical."}, {"code": "3", "label": "Issue affects 30% - 70% of wiring/electrical."}, {"code": "4", "label": "Issue affects > 70% of wiring/electrical."}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb)
)
INSERT INTO tams360.asset_component_template_items
  (template_id, component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
SELECT
  (SELECT template_id FROM traffic_signal_tplid LIMIT 1),
  i.component_order,
  i.component_name,
  i.what_to_inspect,
  i.degree_rubric,
  i.extent_rubric,
  i.relevancy_rubric,
  TRUE
FROM traffic_signal_items i
LEFT JOIN tams360.asset_component_template_items existing
  ON existing.template_id = (SELECT template_id FROM traffic_signal_tplid LIMIT 1)
 AND existing.component_order = i.component_order
WHERE existing.item_id IS NULL;


-- Guardrail
WITH guardrail_at AS (
  SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Guardrail' LIMIT 1
),
guardrail_tpl AS (
  INSERT INTO tams360.asset_component_templates (asset_type_id, name, description, version, is_active)
  SELECT guardrail_at.asset_type_id, 'Guardrail - Default Inspection Template', 'Seeded from JRA Combined Data Final (Rev 2).xlsm, sheet ''Guardrail''.', 1, TRUE
  FROM guardrail_at
  WHERE NOT EXISTS (
    SELECT 1 FROM tams360.asset_component_templates t
    WHERE t.asset_type_id = guardrail_at.asset_type_id AND t.name = 'Guardrail - Default Inspection Template'
  )
  RETURNING template_id
),
guardrail_tplid AS (
  SELECT template_id FROM guardrail_tpl
  UNION ALL
  SELECT t.template_id
  FROM tams360.asset_component_templates t
  JOIN guardrail_at ON t.asset_type_id = guardrail_at.asset_type_id
  WHERE t.name = 'Guardrail - Default Inspection Template'
  ORDER BY t.version DESC, t.created_at DESC
  LIMIT 1
),
guardrail_items(component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric) AS (
  VALUES
    (1, 'Guardrail Beam', 'Inspect beam for deformation, corrosion, missing sections.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "No defects."}, {"code": "1", "label": "Minor defects."}, {"code": "2", "label": "Moderate defects."}, {"code": "3", "label": "Severe defects."}]'::jsonb, '[{"code": "1", "label": "Defects affect < 10% of beam."}, {"code": "2", "label": "Defects affect 10% - 30% of beam."}, {"code": "3", "label": "Defects affect 30% - 70% of beam."}, {"code": "4", "label": "Defects affect > 70% of beam."}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb),
    (2, 'Posts', 'Inspect posts for damage, looseness, corrosion.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "No defects."}, {"code": "1", "label": "Minor defects."}, {"code": "2", "label": "Moderate defects."}, {"code": "3", "label": "Severe defects."}]'::jsonb, '[{"code": "1", "label": "Defects affect < 10% of posts."}, {"code": "2", "label": "Defects affect 10% - 30% of posts."}, {"code": "3", "label": "Defects affect 30% - 70% of posts."}, {"code": "4", "label": "Defects affect > 70% of posts."}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb),
    (3, 'End Treatments', 'Inspect end terminals for damage, correct anchorage.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "No defects."}, {"code": "1", "label": "Minor defects."}, {"code": "2", "label": "Moderate defects."}, {"code": "3", "label": "Severe defects."}]'::jsonb, '[{"code": "1", "label": "Defects affect < 10% of end treatments."}, {"code": "2", "label": "Defects affect 10% - 30% of end treatments."}, {"code": "3", "label": "Defects affect 30% - 70% of end treatments."}, {"code": "4", "label": "Defects affect > 70% of end treatments."}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb),
    (4, 'Approach Clear Zone', 'Check if guardrail is required/positioned correctly in clear zone.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "No issue identified."}, {"code": "1", "label": "Minor issue."}, {"code": "2", "label": "Moderate issue."}, {"code": "3", "label": "Severe issue."}]'::jsonb, '[{"code": "1", "label": "Issue affects < 10% of clear zone."}, {"code": "2", "label": "Issue affects 10% - 30% of clear zone."}, {"code": "3", "label": "Issue affects 30% - 70% of clear zone."}, {"code": "4", "label": "Issue affects > 70% of clear zone."}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb)
)
INSERT INTO tams360.asset_component_template_items
  (template_id, component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
SELECT
  (SELECT template_id FROM guardrail_tplid LIMIT 1),
  i.component_order,
  i.component_name,
  i.what_to_inspect,
  i.degree_rubric,
  i.extent_rubric,
  i.relevancy_rubric,
  TRUE
FROM guardrail_items i
LEFT JOIN tams360.asset_component_template_items existing
  ON existing.template_id = (SELECT template_id FROM guardrail_tplid LIMIT 1)
 AND existing.component_order = i.component_order
WHERE existing.item_id IS NULL;


-- Safety Barrier
WITH safety_barrier_at AS (
  SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Safety Barriers' LIMIT 1
),
safety_barrier_tpl AS (
  INSERT INTO tams360.asset_component_templates (asset_type_id, name, description, version, is_active)
  SELECT safety_barrier_at.asset_type_id, 'Safety Barrier - Default Inspection Template', 'Seeded from JRA Combined Data Final (Rev 2).xlsm, sheet ''Safety Barriers''.', 1, TRUE
  FROM safety_barrier_at
  WHERE NOT EXISTS (
    SELECT 1 FROM tams360.asset_component_templates t
    WHERE t.asset_type_id = safety_barrier_at.asset_type_id AND t.name = 'Safety Barrier - Default Inspection Template'
  )
  RETURNING template_id
),
safety_barrier_tplid AS (
  SELECT template_id FROM safety_barrier_tpl
  UNION ALL
  SELECT t.template_id
  FROM tams360.asset_component_templates t
  JOIN safety_barrier_at ON t.asset_type_id = safety_barrier_at.asset_type_id
  WHERE t.name = 'Safety Barrier - Default Inspection Template'
  ORDER BY t.version DESC, t.created_at DESC
  LIMIT 1
),
safety_barrier_items(component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric) AS (
  VALUES
    (1, 'Barrier Element', 'Inspect barrier element for damage, deformation, missing parts.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "No defects."}, {"code": "1", "label": "Minor defects."}, {"code": "2", "label": "Moderate defects."}, {"code": "3", "label": "Severe defects."}]'::jsonb, '[{"code": "1", "label": "Defects affect < 10% of barrier."}, {"code": "2", "label": "Defects affect 10% - 30% of barrier."}, {"code": "3", "label": "Defects affect 30% - 70% of barrier."}, {"code": "4", "label": "Defects affect > 70% of barrier."}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb),
    (2, 'Posts / Fixings', 'Inspect posts and fixings for looseness, corrosion, damage.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "No defects."}, {"code": "1", "label": "Minor defects."}, {"code": "2", "label": "Moderate defects."}, {"code": "3", "label": "Severe defects."}]'::jsonb, '[{"code": "1", "label": "Defects affect < 10% of posts/fixings."}, {"code": "2", "label": "Defects affect 10% - 30% of posts/fixings."}, {"code": "3", "label": "Defects affect 30% - 70% of posts/fixings."}, {"code": "4", "label": "Defects affect > 70% of posts/fixings."}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb)
)
INSERT INTO tams360.asset_component_template_items
  (template_id, component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
SELECT
  (SELECT template_id FROM safety_barrier_tplid LIMIT 1),
  i.component_order,
  i.component_name,
  i.what_to_inspect,
  i.degree_rubric,
  i.extent_rubric,
  i.relevancy_rubric,
  TRUE
FROM safety_barrier_items i
LEFT JOIN tams360.asset_component_template_items existing
  ON existing.template_id = (SELECT template_id FROM safety_barrier_tplid LIMIT 1)
 AND existing.component_order = i.component_order
WHERE existing.item_id IS NULL;


-- Fence
WITH fence_at AS (
  SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Fence' LIMIT 1
),
fence_tpl AS (
  INSERT INTO tams360.asset_component_templates (asset_type_id, name, description, version, is_active)
  SELECT fence_at.asset_type_id, 'Fence - Default Inspection Template', 'Seeded from JRA Combined Data Final (Rev 2).xlsm, sheet ''Fence''.', 1, TRUE
  FROM fence_at
  WHERE NOT EXISTS (
    SELECT 1 FROM tams360.asset_component_templates t
    WHERE t.asset_type_id = fence_at.asset_type_id AND t.name = 'Fence - Default Inspection Template'
  )
  RETURNING template_id
),
fence_tplid AS (
  SELECT template_id FROM fence_tpl
  UNION ALL
  SELECT t.template_id
  FROM tams360.asset_component_templates t
  JOIN fence_at ON t.asset_type_id = fence_at.asset_type_id
  WHERE t.name = 'Fence - Default Inspection Template'
  ORDER BY t.version DESC, t.created_at DESC
  LIMIT 1
),
fence_items(component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric) AS (
  VALUES
    (1, 'Fence Posts', 'Inspect posts for leaning, damage, corrosion/rot.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "No defects."}, {"code": "1", "label": "Minor defects."}, {"code": "2", "label": "Moderate defects."}, {"code": "3", "label": "Severe defects."}]'::jsonb, '[{"code": "1", "label": "Defects affect < 10% of posts."}, {"code": "2", "label": "Defects affect 10% - 30% of posts."}, {"code": "3", "label": "Defects affect 30% - 70% of posts."}, {"code": "4", "label": "Defects affect > 70% of posts."}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb),
    (2, 'Fence Mesh / Rails', 'Inspect mesh/rails for breaks, corrosion, missing sections.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "No defects."}, {"code": "1", "label": "Minor defects."}, {"code": "2", "label": "Moderate defects."}, {"code": "3", "label": "Severe defects."}]'::jsonb, '[{"code": "1", "label": "Defects affect < 10% of fence."}, {"code": "2", "label": "Defects affect 10% - 30% of fence."}, {"code": "3", "label": "Defects affect 30% - 70% of fence."}, {"code": "4", "label": "Defects affect > 70% of fence."}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb),
    (3, 'Gates', 'Inspect gates for alignment, hinges, locks and operation.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "No defects; fully operational."}, {"code": "1", "label": "Minor defects; operational."}, {"code": "2", "label": "Moderate defects; difficult to operate."}, {"code": "3", "label": "Severe defects; not operational."}]'::jsonb, '[{"code": "1", "label": "Defects affect < 10% of gates."}, {"code": "2", "label": "Defects affect 10% - 30% of gates."}, {"code": "3", "label": "Defects affect 30% - 70% of gates."}, {"code": "4", "label": "Defects affect > 70% of gates."}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb)
)
INSERT INTO tams360.asset_component_template_items
  (template_id, component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
SELECT
  (SELECT template_id FROM fence_tplid LIMIT 1),
  i.component_order,
  i.component_name,
  i.what_to_inspect,
  i.degree_rubric,
  i.extent_rubric,
  i.relevancy_rubric,
  TRUE
FROM fence_items i
LEFT JOIN tams360.asset_component_template_items existing
  ON existing.template_id = (SELECT template_id FROM fence_tplid LIMIT 1)
 AND existing.component_order = i.component_order
WHERE existing.item_id IS NULL;


-- Road Marking
WITH road_marking_at AS (
  SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Road Markings' LIMIT 1
),
road_marking_tpl AS (
  INSERT INTO tams360.asset_component_templates (asset_type_id, name, description, version, is_active)
  SELECT road_marking_at.asset_type_id, 'Road Marking - Default Inspection Template', 'Seeded from JRA Combined Data Final (Rev 2).xlsm, sheet ''Road Markings''.', 1, TRUE
  FROM road_marking_at
  WHERE NOT EXISTS (
    SELECT 1 FROM tams360.asset_component_templates t
    WHERE t.asset_type_id = road_marking_at.asset_type_id AND t.name = 'Road Marking - Default Inspection Template'
  )
  RETURNING template_id
),
road_marking_tplid AS (
  SELECT template_id FROM road_marking_tpl
  UNION ALL
  SELECT t.template_id
  FROM tams360.asset_component_templates t
  JOIN road_marking_at ON t.asset_type_id = road_marking_at.asset_type_id
  WHERE t.name = 'Road Marking - Default Inspection Template'
  ORDER BY t.version DESC, t.created_at DESC
  LIMIT 1
),
road_marking_items(component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric) AS (
  VALUES
    (1, 'Line / Marking Visibility', 'Assess visibility/reflectivity and continuity of markings.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "Clearly visible, continuous."}, {"code": "1", "label": "Slight fading, still clear."}, {"code": "2", "label": "Moderate fading/patchy."}, {"code": "3", "label": "Severely faded/missing."}]'::jsonb, '[{"code": "1", "label": "Defects affect < 10% of markings."}, {"code": "2", "label": "Defects affect 10% - 30% of markings."}, {"code": "3", "label": "Defects affect 30% - 70% of markings."}, {"code": "4", "label": "Defects affect > 70% of markings."}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb),
    (2, 'Surface Condition', 'Check pavement surface affecting marking performance.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "No issues."}, {"code": "1", "label": "Minor issues."}, {"code": "2", "label": "Moderate issues."}, {"code": "3", "label": "Severe issues."}]'::jsonb, '[{"code": "1", "label": "Issue affects < 10% of surface."}, {"code": "2", "label": "Issue affects 10% - 30% of surface."}, {"code": "3", "label": "Issue affects 30% - 70% of surface."}, {"code": "4", "label": "Issue affects > 70% of surface."}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb)
)
INSERT INTO tams360.asset_component_template_items
  (template_id, component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
SELECT
  (SELECT template_id FROM road_marking_tplid LIMIT 1),
  i.component_order,
  i.component_name,
  i.what_to_inspect,
  i.degree_rubric,
  i.extent_rubric,
  i.relevancy_rubric,
  TRUE
FROM road_marking_items i
LEFT JOIN tams360.asset_component_template_items existing
  ON existing.template_id = (SELECT template_id FROM road_marking_tplid LIMIT 1)
 AND existing.component_order = i.component_order
WHERE existing.item_id IS NULL;


-- Gantry
WITH gantry_at AS (
  SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Gantry Structures' LIMIT 1
),
gantry_tpl AS (
  INSERT INTO tams360.asset_component_templates (asset_type_id, name, description, version, is_active)
  SELECT gantry_at.asset_type_id, 'Gantry - Default Inspection Template', 'Seeded from JRA Combined Data Final (Rev 2).xlsm, sheet ''Gantry Structures''.', 1, TRUE
  FROM gantry_at
  WHERE NOT EXISTS (
    SELECT 1 FROM tams360.asset_component_templates t
    WHERE t.asset_type_id = gantry_at.asset_type_id AND t.name = 'Gantry - Default Inspection Template'
  )
  RETURNING template_id
),
gantry_tplid AS (
  SELECT template_id FROM gantry_tpl
  UNION ALL
  SELECT t.template_id
  FROM tams360.asset_component_templates t
  JOIN gantry_at ON t.asset_type_id = gantry_at.asset_type_id
  WHERE t.name = 'Gantry - Default Inspection Template'
  ORDER BY t.version DESC, t.created_at DESC
  LIMIT 1
),
gantry_items(component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric) AS (
  VALUES
    (1, 'Foundation', 'Look for evidence of scour or erosion around foundation.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "No evidence of scour or erosion."}, {"code": "1", "label": "Minor spot scour around foundation."}, {"code": "2", "label": "Moderate continuous scour around foundation."}, {"code": "3", "label": "Severe continuous scour around foundation."}]'::jsonb, '[{"code": "1", "label": "None"}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb),
    (2, 'Post', 'Look for corrosion on Post', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "No visible signs of corrosion."}, {"code": "1", "label": "Minor spots of corrosion."}, {"code": "2", "label": "Moderate continuous corrosion."}, {"code": "3", "label": "Severe continuous corrosion."}]'::jsonb, '[{"code": "1", "label": "Corrosion affecting < 10% of Post."}, {"code": "2", "label": "Corrosion affecting 10% - 30% of Post."}, {"code": "3", "label": "Corrosion affecting 30% - 70% of Post."}, {"code": "4", "label": "Corrosion affecting > 70% of Post."}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb),
    (3, 'Bolts', 'Look for missing/loose bolts and corrosion.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "No signs of corrosion or damage."}, {"code": "1", "label": "Minor spots of corrosion."}, {"code": "2", "label": "Moderate continuous corrosion."}, {"code": "3", "label": "Severe continuous corrosion."}]'::jsonb, '[{"code": "1", "label": "Corrosion affecting < 10% of Bolts."}, {"code": "2", "label": "Corrosion affecting 10% - 30% of Bolts."}, {"code": "3", "label": "Corrosion affecting 30% - 70% of Bolts."}, {"code": "4", "label": "Corrosion affecting > 70% of Bolts."}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb),
    (4, 'Sign Panel', 'Look for corrosion, damage and legibility on sign panel.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "Sign Panel is in good condition and is fully legible."}, {"code": "1", "label": "Minor defects (corrosion/damage/graffiti) and is fully legible."}, {"code": "2", "label": "Moderate defects (corrosion/damage/graffiti) and is partially legible."}, {"code": "3", "label": "Severe defects (corrosion/damage/graffiti) and is not legible."}]'::jsonb, '[{"code": "1", "label": "Defects affect < 10% of sign panel."}, {"code": "2", "label": "Defects affect 10% - 30% of sign panel."}, {"code": "3", "label": "Defects affect 30% - 70% of sign panel."}, {"code": "4", "label": "Defects affect > 70% of sign panel."}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb),
    (5, 'Brackets', 'Look for corrosion or damage on brackets.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "No signs of corrosion or damage."}, {"code": "1", "label": "Minor spots of corrosion."}, {"code": "2", "label": "Moderate continuous corrosion."}, {"code": "3", "label": "Severe continuous corrosion."}]'::jsonb, '[{"code": "1", "label": "Defects affect < 10% of brackets."}, {"code": "2", "label": "Defects affect 10% - 30% of brackets."}, {"code": "3", "label": "Defects affect 30% - 70% of brackets."}, {"code": "4", "label": "Defects affect > 70% of brackets."}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb),
    (6, 'Approach Clear Zone', 'Record whether sign is in clear zone and/or has safety protection.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "No issue identified."}, {"code": "1", "label": "Minor issue."}, {"code": "2", "label": "Moderate issue."}, {"code": "3", "label": "Severe issue."}]'::jsonb, '[{"code": "1", "label": "Issue affects < 10% of clear zone."}, {"code": "2", "label": "Issue affects 10% - 30% of clear zone."}, {"code": "3", "label": "Issue affects 30% - 70% of clear zone."}, {"code": "4", "label": "Issue affects > 70% of clear zone."}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb)
)
INSERT INTO tams360.asset_component_template_items
  (template_id, component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
SELECT
  (SELECT template_id FROM gantry_tplid LIMIT 1),
  i.component_order,
  i.component_name,
  i.what_to_inspect,
  i.degree_rubric,
  i.extent_rubric,
  i.relevancy_rubric,
  TRUE
FROM gantry_items i
LEFT JOIN tams360.asset_component_template_items existing
  ON existing.template_id = (SELECT template_id FROM gantry_tplid LIMIT 1)
 AND existing.component_order = i.component_order
WHERE existing.item_id IS NULL;


-- Raised Road Marker
WITH raised_road_marker_at AS (
  SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Raised Road Markers' LIMIT 1
),
raised_road_marker_tpl AS (
  INSERT INTO tams360.asset_component_templates (asset_type_id, name, description, version, is_active)
  SELECT raised_road_marker_at.asset_type_id, 'Raised Road Marker - Default Inspection Template', 'Seeded from JRA Combined Data Final (Rev 2).xlsm, sheet ''Raised Road Markers''.', 1, TRUE
  FROM raised_road_marker_at
  WHERE NOT EXISTS (
    SELECT 1 FROM tams360.asset_component_templates t
    WHERE t.asset_type_id = raised_road_marker_at.asset_type_id AND t.name = 'Raised Road Marker - Default Inspection Template'
  )
  RETURNING template_id
),
raised_road_marker_tplid AS (
  SELECT template_id FROM raised_road_marker_tpl
  UNION ALL
  SELECT t.template_id
  FROM tams360.asset_component_templates t
  JOIN raised_road_marker_at ON t.asset_type_id = raised_road_marker_at.asset_type_id
  WHERE t.name = 'Raised Road Marker - Default Inspection Template'
  ORDER BY t.version DESC, t.created_at DESC
  LIMIT 1
),
raised_road_marker_items(component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric) AS (
  VALUES
    (1, 'Marker Presence', 'Check for missing markers and alignment.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "All present and correctly aligned."}, {"code": "1", "label": "Few missing/misaligned."}, {"code": "2", "label": "Moderate missing/misalignment."}, {"code": "3", "label": "Many missing/major misalignment."}]'::jsonb, '[{"code": "1", "label": "Defects affect < 10% of markers."}, {"code": "2", "label": "Defects affect 10% - 30% of markers."}, {"code": "3", "label": "Defects affect 30% - 70% of markers."}, {"code": "4", "label": "Defects affect > 70% of markers."}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb),
    (2, 'Reflectivity', 'Assess reflectivity/visibility at night.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "Fully reflective."}, {"code": "1", "label": "Slightly reduced reflectivity."}, {"code": "2", "label": "Moderately reduced reflectivity."}, {"code": "3", "label": "Not reflective."}]'::jsonb, '[{"code": "1", "label": "Defects affect < 10% of markers."}, {"code": "2", "label": "Defects affect 10% - 30% of markers."}, {"code": "3", "label": "Defects affect 30% - 70% of markers."}, {"code": "4", "label": "Defects affect > 70% of markers."}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb),
    (3, 'Fixing / Adhesion', 'Check if markers are firmly fixed to surface.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "Firmly fixed."}, {"code": "1", "label": "Minor looseness."}, {"code": "2", "label": "Moderate looseness."}, {"code": "3", "label": "Loose/detached."}]'::jsonb, '[{"code": "1", "label": "Defects affect < 10% of markers."}, {"code": "2", "label": "Defects affect 10% - 30% of markers."}, {"code": "3", "label": "Defects affect 30% - 70% of markers."}, {"code": "4", "label": "Defects affect > 70% of markers."}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb),
    (4, 'Surface Condition', 'Check pavement surface around markers.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "No issues."}, {"code": "1", "label": "Minor issues."}, {"code": "2", "label": "Moderate issues."}, {"code": "3", "label": "Severe issues."}]'::jsonb, '[{"code": "1", "label": "Issue affects < 10% of area."}, {"code": "2", "label": "Issue affects 10% - 30% of area."}, {"code": "3", "label": "Issue affects 30% - 70% of area."}, {"code": "4", "label": "Issue affects > 70% of area."}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb)
)
INSERT INTO tams360.asset_component_template_items
  (template_id, component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
SELECT
  (SELECT template_id FROM raised_road_marker_tplid LIMIT 1),
  i.component_order,
  i.component_name,
  i.what_to_inspect,
  i.degree_rubric,
  i.extent_rubric,
  i.relevancy_rubric,
  TRUE
FROM raised_road_marker_items i
LEFT JOIN tams360.asset_component_template_items existing
  ON existing.template_id = (SELECT template_id FROM raised_road_marker_tplid LIMIT 1)
 AND existing.component_order = i.component_order
WHERE existing.item_id IS NULL;


-- Road Sign
WITH road_sign_at AS (
  SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Road Sign' LIMIT 1
),
road_sign_tpl AS (
  INSERT INTO tams360.asset_component_templates (asset_type_id, name, description, version, is_active)
  SELECT road_sign_at.asset_type_id, 'Road Sign - Default Inspection Template', 'Default inspection template for Road Signs.', 1, TRUE
  FROM road_sign_at
  WHERE NOT EXISTS (
    SELECT 1 FROM tams360.asset_component_templates t
    WHERE t.asset_type_id = road_sign_at.asset_type_id AND t.name = 'Road Sign - Default Inspection Template'
  )
  RETURNING template_id
),
road_sign_tplid AS (
  SELECT template_id FROM road_sign_tpl
  UNION ALL
  SELECT t.template_id
  FROM tams360.asset_component_templates t
  JOIN road_sign_at ON t.asset_type_id = road_sign_at.asset_type_id
  WHERE t.name = 'Road Sign - Default Inspection Template'
  ORDER BY t.version DESC, t.created_at DESC
  LIMIT 1
),
road_sign_items(component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric) AS (
  VALUES
    (1, 'Sign Panel', 'Check for damage, fading, graffiti, and legibility.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "Sign is in good condition and fully legible."}, {"code": "1", "label": "Minor defects (fading/damage/graffiti), fully legible."}, {"code": "2", "label": "Moderate defects, partially legible."}, {"code": "3", "label": "Severe defects, not legible."}]'::jsonb, '[{"code": "1", "label": "Defects affect < 10% of sign panel."}, {"code": "2", "label": "Defects affect 10% - 30% of sign panel."}, {"code": "3", "label": "Defects affect 30% - 70% of sign panel."}, {"code": "4", "label": "Defects affect > 70% of sign panel."}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb),
    (2, 'Post', 'Check post for corrosion, damage, and stability.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "No signs of corrosion or damage."}, {"code": "1", "label": "Minor spots of corrosion/damage."}, {"code": "2", "label": "Moderate continuous corrosion/damage."}, {"code": "3", "label": "Severe continuous corrosion/damage."}]'::jsonb, '[{"code": "1", "label": "Defects affect < 10% of post."}, {"code": "2", "label": "Defects affect 10% - 30% of post."}, {"code": "3", "label": "Defects affect 30% - 70% of post."}, {"code": "4", "label": "Defects affect > 70% of post."}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb),
    (3, 'Fixings', 'Check bolts and fixings for looseness and corrosion.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "No signs of corrosion or looseness."}, {"code": "1", "label": "Minor corrosion/looseness."}, {"code": "2", "label": "Moderate corrosion/looseness."}, {"code": "3", "label": "Severe corrosion/looseness."}]'::jsonb, '[{"code": "1", "label": "Defects affect < 10% of fixings."}, {"code": "2", "label": "Defects affect 10% - 30% of fixings."}, {"code": "3", "label": "Defects affect 30% - 70% of fixings."}, {"code": "4", "label": "Defects affect > 70% of fixings."}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb),
    (4, 'Foundation', 'Check foundation for stability and erosion.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "No evidence of scour or erosion."}, {"code": "1", "label": "Minor spot scour."}, {"code": "2", "label": "Moderate continuous scour."}, {"code": "3", "label": "Severe continuous scour."}]'::jsonb, '[{"code": "1", "label": "None"}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb),
    (5, 'Reflectivity', 'Assess sign reflectivity and night visibility.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "Fully reflective."}, {"code": "1", "label": "Slightly reduced reflectivity."}, {"code": "2", "label": "Moderately reduced reflectivity."}, {"code": "3", "label": "Not reflective."}]'::jsonb, '[{"code": "1", "label": "Defects affect < 10% of sign."}, {"code": "2", "label": "Defects affect 10% - 30% of sign."}, {"code": "3", "label": "Defects affect 30% - 70% of sign."}, {"code": "4", "label": "Defects affect > 70% of sign."}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb),
    (6, 'Approach Clear Zone', 'Check if sign is in clear zone and has safety protection.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "No issue identified."}, {"code": "1", "label": "Minor issue."}, {"code": "2", "label": "Moderate issue."}, {"code": "3", "label": "Severe issue."}]'::jsonb, '[{"code": "1", "label": "Issue affects < 10% of clear zone."}, {"code": "2", "label": "Issue affects 10% - 30% of clear zone."}, {"code": "3", "label": "Issue affects 30% - 70% of clear zone."}, {"code": "4", "label": "Issue affects > 70% of clear zone."}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb)
)
INSERT INTO tams360.asset_component_template_items
  (template_id, component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
SELECT
  (SELECT template_id FROM road_sign_tplid LIMIT 1),
  i.component_order,
  i.component_name,
  i.what_to_inspect,
  i.degree_rubric,
  i.extent_rubric,
  i.relevancy_rubric,
  TRUE
FROM road_sign_items i
LEFT JOIN tams360.asset_component_template_items existing
  ON existing.template_id = (SELECT template_id FROM road_sign_tplid LIMIT 1)
 AND existing.component_order = i.component_order
WHERE existing.item_id IS NULL;


-- Guide Post
WITH guide_post_at AS (
  SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Guide Post' LIMIT 1
),
guide_post_tpl AS (
  INSERT INTO tams360.asset_component_templates (asset_type_id, name, description, version, is_active)
  SELECT guide_post_at.asset_type_id, 'Guide Post - Default Inspection Template', 'Default inspection template for Guide Posts.', 1, TRUE
  FROM guide_post_at
  WHERE NOT EXISTS (
    SELECT 1 FROM tams360.asset_component_templates t
    WHERE t.asset_type_id = guide_post_at.asset_type_id AND t.name = 'Guide Post - Default Inspection Template'
  )
  RETURNING template_id
),
guide_post_tplid AS (
  SELECT template_id FROM guide_post_tpl
  UNION ALL
  SELECT t.template_id
  FROM tams360.asset_component_templates t
  JOIN guide_post_at ON t.asset_type_id = guide_post_at.asset_type_id
  WHERE t.name = 'Guide Post - Default Inspection Template'
  ORDER BY t.version DESC, t.created_at DESC
  LIMIT 1
),
guide_post_items(component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric) AS (
  VALUES
    (1, 'Post', 'Check post for damage, corrosion, alignment, and stability.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "No signs of corrosion or damage."}, {"code": "1", "label": "Minor spots of corrosion/damage."}, {"code": "2", "label": "Moderate continuous corrosion/damage."}, {"code": "3", "label": "Severe continuous corrosion/damage."}]'::jsonb, '[{"code": "1", "label": "Defects affect < 10% of post."}, {"code": "2", "label": "Defects affect 10% - 30% of post."}, {"code": "3", "label": "Defects affect 30% - 70% of post."}, {"code": "4", "label": "Defects affect > 70% of post."}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb),
    (2, 'Reflector', 'Check reflector for damage, missing parts, and visibility.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "Fully reflective and in good condition."}, {"code": "1", "label": "Minor defects, still reflective."}, {"code": "2", "label": "Moderate defects, reduced reflectivity."}, {"code": "3", "label": "Severe defects, not reflective."}]'::jsonb, '[{"code": "1", "label": "Defects affect < 10% of reflector."}, {"code": "2", "label": "Defects affect 10% - 30% of reflector."}, {"code": "3", "label": "Defects affect 30% - 70% of reflector."}, {"code": "4", "label": "Defects affect > 70% of reflector."}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb),
    (3, 'Foundation', 'Check foundation for stability and erosion.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "No evidence of scour or erosion."}, {"code": "1", "label": "Minor spot scour."}, {"code": "2", "label": "Moderate continuous scour."}, {"code": "3", "label": "Severe continuous scour."}]'::jsonb, '[{"code": "1", "label": "None"}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb),
    (4, 'Approach Clear Zone', 'Check if guide post is in clear zone or requires safety protection.', '[{"code": "X", "label": "Not present"}, {"code": "U", "label": "Unable to inspect"}, {"code": "0", "label": "No issue identified."}, {"code": "1", "label": "Minor issue."}, {"code": "2", "label": "Moderate issue."}, {"code": "3", "label": "Severe issue."}]'::jsonb, '[{"code": "1", "label": "Issue affects < 10% of clear zone."}, {"code": "2", "label": "Issue affects 10% - 30% of clear zone."}, {"code": "3", "label": "Issue affects 30% - 70% of clear zone."}, {"code": "4", "label": "Issue affects > 70% of clear zone."}]'::jsonb, '[{"code": "1", "label": "Very low"}, {"code": "2", "label": "Low"}, {"code": "3", "label": "Medium"}, {"code": "4", "label": "High"}]'::jsonb)
)
INSERT INTO tams360.asset_component_template_items
  (template_id, component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
SELECT
  (SELECT template_id FROM guide_post_tplid LIMIT 1),
  i.component_order,
  i.component_name,
  i.what_to_inspect,
  i.degree_rubric,
  i.extent_rubric,
  i.relevancy_rubric,
  TRUE
FROM guide_post_items i
LEFT JOIN tams360.asset_component_template_items existing
  ON existing.template_id = (SELECT template_id FROM guide_post_tplid LIMIT 1)
 AND existing.component_order = i.component_order
WHERE existing.item_id IS NULL;


COMMIT;