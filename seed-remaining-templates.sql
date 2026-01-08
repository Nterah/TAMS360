-- TAMS360 Remaining Component Templates
-- Add templates for: Traffic Signal, Guardrail, Safety Barrier, Fence, Road Marking, Gantry, Raised Road Marker

BEGIN;

-- ============================================================================
-- TRAFFIC SIGNAL
-- ============================================================================

DO $$
DECLARE
  v_asset_type_id UUID;
  v_template_id UUID;
BEGIN
  SELECT asset_type_id INTO v_asset_type_id FROM tams360.asset_types WHERE name = 'Traffic Signal';
  
  SELECT template_id INTO v_template_id 
  FROM tams360.asset_component_templates 
  WHERE asset_type_id = v_asset_type_id AND version = 1;
  
  IF v_template_id IS NULL THEN
    INSERT INTO tams360.asset_component_templates (asset_type_id, name, description, version, is_active)
    VALUES (v_asset_type_id, 'Traffic Signal - Default Inspection Template', 'Traffic signal inspection components', 1, TRUE)
    RETURNING template_id INTO v_template_id;
  END IF;
  
  INSERT INTO tams360.asset_component_template_items 
    (template_id, component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
  SELECT v_template_id, * FROM (VALUES
    (1, 'Signal Head', 'Check for damage, missing lenses, fading, alignment and operation.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No defects; fully operational."},{"code":"1","label":"Minor defects; operational."},{"code":"2","label":"Moderate defects; partially operational."},{"code":"3","label":"Severe defects; not operational."}]'::jsonb,
     '[{"code":"1","label":"< 10% of signal head"},{"code":"2","label":"10-30% of signal head"},{"code":"3","label":"30-70% of signal head"},{"code":"4","label":"> 70% of signal head"}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (2, 'Pole', 'Check for corrosion, impact damage and stability.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No signs of corrosion/damage."},{"code":"1","label":"Minor spots of corrosion/damage."},{"code":"2","label":"Moderate continuous corrosion/damage."},{"code":"3","label":"Severe continuous corrosion/damage."}]'::jsonb,
     '[{"code":"1","label":"< 10% of pole"},{"code":"2","label":"10-30% of pole"},{"code":"3","label":"30-70% of pole"},{"code":"4","label":"> 70% of pole"}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (3, 'Controller Cabinet', 'Check cabinet condition, locks, corrosion, vandalism.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No defects; secure and functional."},{"code":"1","label":"Minor defects; secure."},{"code":"2","label":"Moderate defects; security compromised."},{"code":"3","label":"Severe defects; not functional/secure."}]'::jsonb,
     '[{"code":"1","label":"< 10% of cabinet"},{"code":"2","label":"10-30% of cabinet"},{"code":"3","label":"30-70% of cabinet"},{"code":"4","label":"> 70% of cabinet"}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (4, 'Wiring/Electrical', 'Check exposed wiring, connections, and evidence of faults.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No issues identified."},{"code":"1","label":"Minor issues; safe."},{"code":"2","label":"Moderate issues; potential hazard."},{"code":"3","label":"Severe issues; hazard/failure."}]'::jsonb,
     '[{"code":"1","label":"< 10% of wiring"},{"code":"2","label":"10-30% of wiring"},{"code":"3","label":"30-70% of wiring"},{"code":"4","label":"> 70% of wiring"}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE)
  ) AS t(component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
  WHERE NOT EXISTS (
    SELECT 1 FROM tams360.asset_component_template_items 
    WHERE template_id = v_template_id AND component_order = t.component_order
  );
END $$;

-- ============================================================================
-- GUARDRAIL
-- ============================================================================

DO $$
DECLARE
  v_asset_type_id UUID;
  v_template_id UUID;
BEGIN
  SELECT asset_type_id INTO v_asset_type_id FROM tams360.asset_types WHERE name = 'Guardrail';
  
  SELECT template_id INTO v_template_id 
  FROM tams360.asset_component_templates 
  WHERE asset_type_id = v_asset_type_id AND version = 1;
  
  IF v_template_id IS NULL THEN
    INSERT INTO tams360.asset_component_templates (asset_type_id, name, description, version, is_active)
    VALUES (v_asset_type_id, 'Guardrail - Default Inspection Template', 'Guardrail inspection components', 1, TRUE)
    RETURNING template_id INTO v_template_id;
  END IF;
  
  INSERT INTO tams360.asset_component_template_items 
    (template_id, component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
  SELECT v_template_id, * FROM (VALUES
    (1, 'Rail Element', 'Check for deformation, corrosion, damage to rail.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No damage or corrosion."},{"code":"1","label":"Minor spots of damage/corrosion."},{"code":"2","label":"Moderate continuous damage/corrosion."},{"code":"3","label":"Severe damage/corrosion."}]'::jsonb,
     '[{"code":"1","label":"< 10% of rail"},{"code":"2","label":"10-30% of rail"},{"code":"3","label":"30-70% of rail"},{"code":"4","label":"> 70% of rail"}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (2, 'Posts', 'Check posts for corrosion, damage, alignment.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No damage or corrosion."},{"code":"1","label":"Minor spots of damage/corrosion."},{"code":"2","label":"Moderate continuous damage/corrosion."},{"code":"3","label":"Severe damage/corrosion."}]'::jsonb,
     '[{"code":"1","label":"< 10% of posts"},{"code":"2","label":"10-30% of posts"},{"code":"3","label":"30-70% of posts"},{"code":"4","label":"> 70% of posts"}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (3, 'Connections/Bolts', 'Check connections, bolts for tightness and corrosion.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"All secure, no corrosion."},{"code":"1","label":"Minor looseness/corrosion."},{"code":"2","label":"Moderate looseness/corrosion."},{"code":"3","label":"Severe looseness/missing bolts."}]'::jsonb,
     '[{"code":"1","label":"< 10% of connections"},{"code":"2","label":"10-30% of connections"},{"code":"3","label":"30-70% of connections"},{"code":"4","label":"> 70% of connections"}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (4, 'Anchorage/Foundation', 'Check foundation stability and anchorage.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"Stable, no issues."},{"code":"1","label":"Minor movement/erosion."},{"code":"2","label":"Moderate instability."},{"code":"3","label":"Severe instability/failure."}]'::jsonb,
     '[{"code":"1","label":"< 10% of anchorage"},{"code":"2","label":"10-30% of anchorage"},{"code":"3","label":"30-70% of anchorage"},{"code":"4","label":"> 70% of anchorage"}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE)
  ) AS t(component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
  WHERE NOT EXISTS (
    SELECT 1 FROM tams360.asset_component_template_items 
    WHERE template_id = v_template_id AND component_order = t.component_order
  );
END $$;

-- ============================================================================
-- SAFETY BARRIER
-- ============================================================================

DO $$
DECLARE
  v_asset_type_id UUID;
  v_template_id UUID;
BEGIN
  SELECT asset_type_id INTO v_asset_type_id FROM tams360.asset_types WHERE name = 'Safety Barrier';
  
  SELECT template_id INTO v_template_id 
  FROM tams360.asset_component_templates 
  WHERE asset_type_id = v_asset_type_id AND version = 1;
  
  IF v_template_id IS NULL THEN
    INSERT INTO tams360.asset_component_templates (asset_type_id, name, description, version, is_active)
    VALUES (v_asset_type_id, 'Safety Barrier - Default Inspection Template', 'Safety barrier inspection components', 1, TRUE)
    RETURNING template_id INTO v_template_id;
  END IF;
  
  INSERT INTO tams360.asset_component_template_items 
    (template_id, component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
  SELECT v_template_id, * FROM (VALUES
    (1, 'Barrier Surface', 'Check for damage, deformation, impact marks.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No damage."},{"code":"1","label":"Minor surface damage."},{"code":"2","label":"Moderate deformation."},{"code":"3","label":"Severe damage/failure."}]'::jsonb,
     '[{"code":"1","label":"< 10% of barrier"},{"code":"2","label":"10-30% of barrier"},{"code":"3","label":"30-70% of barrier"},{"code":"4","label":"> 70% of barrier"}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (2, 'Anchorage', 'Check foundation and anchorage stability.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"Stable, no issues."},{"code":"1","label":"Minor movement."},{"code":"2","label":"Moderate instability."},{"code":"3","label":"Severe instability."}]'::jsonb,
     '[{"code":"1","label":"< 10% of anchorage"},{"code":"2","label":"10-30% of anchorage"},{"code":"3","label":"30-70% of anchorage"},{"code":"4","label":"> 70% of anchorage"}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (3, 'Joints/Connections', 'Check all connections and expansion joints.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"All secure."},{"code":"1","label":"Minor looseness."},{"code":"2","label":"Moderate looseness."},{"code":"3","label":"Severe looseness/separation."}]'::jsonb,
     '[{"code":"1","label":"< 10% of joints"},{"code":"2","label":"10-30% of joints"},{"code":"3","label":"30-70% of joints"},{"code":"4","label":"> 70% of joints"}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE)
  ) AS t(component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
  WHERE NOT EXISTS (
    SELECT 1 FROM tams360.asset_component_template_items 
    WHERE template_id = v_template_id AND component_order = t.component_order
  );
END $$;

-- ============================================================================
-- FENCE
-- ============================================================================

DO $$
DECLARE
  v_asset_type_id UUID;
  v_template_id UUID;
BEGIN
  SELECT asset_type_id INTO v_asset_type_id FROM tams360.asset_types WHERE name = 'Fence';
  
  SELECT template_id INTO v_template_id 
  FROM tams360.asset_component_templates 
  WHERE asset_type_id = v_asset_type_id AND version = 1;
  
  IF v_template_id IS NULL THEN
    INSERT INTO tams360.asset_component_templates (asset_type_id, name, description, version, is_active)
    VALUES (v_asset_type_id, 'Fence - Default Inspection Template', 'Fence inspection components', 1, TRUE)
    RETURNING template_id INTO v_template_id;
  END IF;
  
  INSERT INTO tams360.asset_component_template_items 
    (template_id, component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
  SELECT v_template_id, * FROM (VALUES
    (1, 'Mesh/Panels', 'Check for damage, holes, corrosion in mesh/panels.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No damage."},{"code":"1","label":"Minor damage/holes."},{"code":"2","label":"Moderate damage/corrosion."},{"code":"3","label":"Severe damage/missing sections."}]'::jsonb,
     '[{"code":"1","label":"< 10% of fence"},{"code":"2","label":"10-30% of fence"},{"code":"3","label":"30-70% of fence"},{"code":"4","label":"> 70% of fence"}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (2, 'Posts', 'Check posts for stability, alignment, corrosion.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"Stable, no corrosion."},{"code":"1","label":"Minor lean/corrosion."},{"code":"2","label":"Moderate instability/corrosion."},{"code":"3","label":"Severe instability/failure."}]'::jsonb,
     '[{"code":"1","label":"< 10% of posts"},{"code":"2","label":"10-30% of posts"},{"code":"3","label":"30-70% of posts"},{"code":"4","label":"> 70% of posts"}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (3, 'Gates/Hardware', 'Check gates, hinges, locks, and hardware.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"Fully functional."},{"code":"1","label":"Minor issues."},{"code":"2","label":"Moderate issues; reduced function."},{"code":"3","label":"Severe issues; non-functional."}]'::jsonb,
     '[{"code":"1","label":"< 10% of gates/hardware"},{"code":"2","label":"10-30% of gates/hardware"},{"code":"3","label":"30-70% of gates/hardware"},{"code":"4","label":"> 70% of gates/hardware"}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE)
  ) AS t(component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
  WHERE NOT EXISTS (
    SELECT 1 FROM tams360.asset_component_template_items 
    WHERE template_id = v_template_id AND component_order = t.component_order
  );
END $$;

-- ============================================================================
-- ROAD MARKING
-- ============================================================================

DO $$
DECLARE
  v_asset_type_id UUID;
  v_template_id UUID;
BEGIN
  SELECT asset_type_id INTO v_asset_type_id FROM tams360.asset_types WHERE name = 'Road Marking';
  
  SELECT template_id INTO v_template_id 
  FROM tams360.asset_component_templates 
  WHERE asset_type_id = v_asset_type_id AND version = 1;
  
  IF v_template_id IS NULL THEN
    INSERT INTO tams360.asset_component_templates (asset_type_id, name, description, version, is_active)
    VALUES (v_asset_type_id, 'Road Marking - Default Inspection Template', 'Road marking inspection components', 1, TRUE)
    RETURNING template_id INTO v_template_id;
  END IF;
  
  INSERT INTO tams360.asset_component_template_items 
    (template_id, component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
  SELECT v_template_id, * FROM (VALUES
    (1, 'Visibility', 'Check marking visibility and retroreflectivity.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"Fully visible day/night."},{"code":"1","label":"Slightly faded."},{"code":"2","label":"Moderately faded; marginal visibility."},{"code":"3","label":"Severely faded; not visible."}]'::jsonb,
     '[{"code":"1","label":"< 10% of marking"},{"code":"2","label":"10-30% of marking"},{"code":"3","label":"30-70% of marking"},{"code":"4","label":"> 70% of marking"}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (2, 'Material Condition', 'Check for wear, peeling, cracking.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No wear."},{"code":"1","label":"Minor wear."},{"code":"2","label":"Moderate wear/peeling."},{"code":"3","label":"Severe wear/missing material."}]'::jsonb,
     '[{"code":"1","label":"< 10% of marking"},{"code":"2","label":"10-30% of marking"},{"code":"3","label":"30-70% of marking"},{"code":"4","label":"> 70% of marking"}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE)
  ) AS t(component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
  WHERE NOT EXISTS (
    SELECT 1 FROM tams360.asset_component_template_items 
    WHERE template_id = v_template_id AND component_order = t.component_order
  );
END $$;

-- ============================================================================
-- GANTRY
-- ============================================================================

DO $$
DECLARE
  v_asset_type_id UUID;
  v_template_id UUID;
BEGIN
  SELECT asset_type_id INTO v_asset_type_id FROM tams360.asset_types WHERE name = 'Gantry';
  
  SELECT template_id INTO v_template_id 
  FROM tams360.asset_component_templates 
  WHERE asset_type_id = v_asset_type_id AND version = 1;
  
  IF v_template_id IS NULL THEN
    INSERT INTO tams360.asset_component_templates (asset_type_id, name, description, version, is_active)
    VALUES (v_asset_type_id, 'Gantry - Default Inspection Template', 'Gantry inspection components', 1, TRUE)
    RETURNING template_id INTO v_template_id;
  END IF;
  
  INSERT INTO tams360.asset_component_template_items 
    (template_id, component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
  SELECT v_template_id, * FROM (VALUES
    (1, 'Structural Members', 'Check beams, trusses for corrosion, damage, deformation.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No damage/corrosion."},{"code":"1","label":"Minor spots of corrosion."},{"code":"2","label":"Moderate corrosion/damage."},{"code":"3","label":"Severe corrosion/structural damage."}]'::jsonb,
     '[{"code":"1","label":"< 10% of structure"},{"code":"2","label":"10-30% of structure"},{"code":"3","label":"30-70% of structure"},{"code":"4","label":"> 70% of structure"}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (2, 'Columns/Supports', 'Check columns for stability, corrosion, damage.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"Stable, no corrosion."},{"code":"1","label":"Minor corrosion."},{"code":"2","label":"Moderate corrosion/instability."},{"code":"3","label":"Severe corrosion/structural failure risk."}]'::jsonb,
     '[{"code":"1","label":"< 10% of supports"},{"code":"2","label":"10-30% of supports"},{"code":"3","label":"30-70% of supports"},{"code":"4","label":"> 70% of supports"}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (3, 'Connections/Bolts', 'Check all bolted and welded connections.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"All secure."},{"code":"1","label":"Minor looseness/corrosion."},{"code":"2","label":"Moderate looseness/corrosion."},{"code":"3","label":"Severe looseness/missing bolts."}]'::jsonb,
     '[{"code":"1","label":"< 10% of connections"},{"code":"2","label":"10-30% of connections"},{"code":"3","label":"30-70% of connections"},{"code":"4","label":"> 70% of connections"}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (4, 'Foundation', 'Check foundation stability and settlement.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"Stable, no settlement."},{"code":"1","label":"Minor settlement/erosion."},{"code":"2","label":"Moderate settlement."},{"code":"3","label":"Severe settlement/failure risk."}]'::jsonb,
     '[{"code":"1","label":"< 10% of foundation"},{"code":"2","label":"10-30% of foundation"},{"code":"3","label":"30-70% of foundation"},{"code":"4","label":"> 70% of foundation"}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE)
  ) AS t(component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
  WHERE NOT EXISTS (
    SELECT 1 FROM tams360.asset_component_template_items 
    WHERE template_id = v_template_id AND component_order = t.component_order
  );
END $$;

-- ============================================================================
-- RAISED ROAD MARKER
-- ============================================================================

DO $$
DECLARE
  v_asset_type_id UUID;
  v_template_id UUID;
BEGIN
  SELECT asset_type_id INTO v_asset_type_id FROM tams360.asset_types WHERE name = 'Raised Road Marker';
  
  SELECT template_id INTO v_template_id 
  FROM tams360.asset_component_templates 
  WHERE asset_type_id = v_asset_type_id AND version = 1;
  
  IF v_template_id IS NULL THEN
    INSERT INTO tams360.asset_component_templates (asset_type_id, name, description, version, is_active)
    VALUES (v_asset_type_id, 'Raised Road Marker - Default Inspection Template', 'Raised road marker inspection components', 1, TRUE)
    RETURNING template_id INTO v_template_id;
  END IF;
  
  INSERT INTO tams360.asset_component_template_items 
    (template_id, component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
  SELECT v_template_id, * FROM (VALUES
    (1, 'Reflector', 'Check reflector visibility, damage, cleanliness.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"Fully reflective, clean."},{"code":"1","label":"Slightly dirty/scratched."},{"code":"2","label":"Moderately dirty/damaged; reduced reflectivity."},{"code":"3","label":"Severely damaged/non-reflective."}]'::jsonb,
     '[{"code":"1","label":"< 10% of reflector"},{"code":"2","label":"10-30% of reflector"},{"code":"3","label":"30-70% of reflector"},{"code":"4","label":"> 70% of reflector"}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE),
    (2, 'Body/Housing', 'Check marker body for damage, stability.',
     '[{"code":"X","label":"Not present"},{"code":"U","label":"Unable to inspect"},{"code":"0","label":"No damage, stable."},{"code":"1","label":"Minor damage."},{"code":"2","label":"Moderate damage/loose."},{"code":"3","label":"Severe damage/missing/detached."}]'::jsonb,
     '[{"code":"1","label":"< 10% of marker"},{"code":"2","label":"10-30% of marker"},{"code":"3","label":"30-70% of marker"},{"code":"4","label":"> 70% of marker"}]'::jsonb,
     '[{"code":"1","label":"Very low"},{"code":"2","label":"Low"},{"code":"3","label":"Medium"},{"code":"4","label":"High"}]'::jsonb, TRUE)
  ) AS t(component_order, component_name, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, is_active)
  WHERE NOT EXISTS (
    SELECT 1 FROM tams360.asset_component_template_items 
    WHERE template_id = v_template_id AND component_order = t.component_order
  );
END $$;

COMMIT;

-- Verify all templates
SELECT 
  at.name as asset_type,
  COUNT(DISTINCT act.template_id) as templates,
  COUNT(acti.item_id) as components
FROM tams360.asset_types at
LEFT JOIN tams360.asset_component_templates act ON at.asset_type_id = act.asset_type_id
LEFT JOIN tams360.asset_component_template_items acti ON act.template_id = acti.template_id
GROUP BY at.name, at.display_order
ORDER BY at.display_order;