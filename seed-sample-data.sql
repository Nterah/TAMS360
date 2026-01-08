-- TAMS360 Sample Inventory & Inspection Data
-- Creates realistic assets and inspection logs for testing

BEGIN;

-- ============================================================================
-- SAMPLE ASSETS (Inventory)
-- ============================================================================

-- We'll create 20 sample assets across different types
INSERT INTO tams360.assets (
  asset_tag, asset_type_id, name, description, status_id,
  latitude, longitude, location_description,
  route, chainage_km, direction,
  installation_date, manufacturer, model, serial_number,
  unit_cost, quantity, owner, responsible_party,
  created_by, created_at
)
SELECT 
  asset_tag, asset_type_id, name, description, status_id,
  latitude, longitude, location_description,
  route, chainage_km, direction,
  installation_date, manufacturer, model, serial_number,
  unit_cost, quantity, owner, responsible_party,
  'seed-script', NOW()
FROM (VALUES
  -- Signage Assets (5)
  ('SGN-001', (SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Signage'), 
   'Speed Limit 50 Sign', 'Regulatory speed limit sign', 
   (SELECT status_id FROM tams360.asset_status WHERE name = 'Active'),
   -1.286389, 36.817223, 'Thika Road, Near Roysambu Flyover',
   'A2', 12.5, 'Northbound',
   '2020-03-15'::date, 'SafetyFirst Ltd', 'SL-50', 'SL50-2020-001',
   15000.00, 1, 'KeNHA', 'KeNHA Nairobi Region'),
   
  ('SGN-002', (SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Signage'),
   'Stop Sign', 'Regulatory stop sign at junction',
   (SELECT status_id FROM tams360.asset_status WHERE name = 'Active'),
   -1.291590, 36.821946, 'Thika Road, Kasarani Junction',
   'A2', 15.2, 'Both',
   '2019-11-20'::date, 'SafetyFirst Ltd', 'STOP-01', 'STOP-2019-045',
   12000.00, 1, 'KeNHA', 'KeNHA Nairobi Region'),
   
  ('SGN-003', (SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Signage'),
   'Direction Sign - Nairobi CBD', 'Directional sign to city center',
   (SELECT status_id FROM tams360.asset_status WHERE name = 'Damaged'),
   -1.280122, 36.814978, 'Thika Road, Garden City Exit',
   'A2', 10.8, 'Southbound',
   '2018-06-10'::date, 'RoadSigns Kenya', 'DIR-150', 'DIR-2018-122',
   25000.00, 1, 'KeNHA', 'KeNHA Nairobi Region'),
   
  ('SGN-004', (SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Signage'),
   'Pedestrian Crossing Sign', 'Warning sign for pedestrian crossing',
   (SELECT status_id FROM tams360.asset_status WHERE name = 'Active'),
   -1.295678, 36.825432, 'Thika Road, Near Mwiki',
   'A2', 16.7, 'Both',
   '2021-02-28'::date, 'SafetyFirst Ltd', 'PED-CROSS', 'PC-2021-033',
   18000.00, 1, 'KeNHA', 'KeNHA Nairobi Region'),
   
  ('SGN-005', (SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Signage'),
   'No Overtaking Sign', 'Regulatory no overtaking sign',
   (SELECT status_id FROM tams360.asset_status WHERE name = 'Active'),
   -1.287456, 36.818901, 'Thika Road, Tunnel Section',
   'A2', 13.1, 'Both',
   '2020-08-12'::date, 'SafetyFirst Ltd', 'NO-OT', 'NOT-2020-088',
   14000.00, 1, 'KeNHA', 'KeNHA Nairobi Region'),
   
  -- Guardrail Assets (4)
  ('GRD-001', (SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Guardrail'),
   'Guardrail Section A', 'W-Beam guardrail - 50m section',
   (SELECT status_id FROM tams360.asset_status WHERE name = 'Active'),
   -1.282345, 36.815678, 'Thika Road, Flyover Approach',
   'A2', 11.2, 'Northbound',
   '2019-05-20'::date, 'SafeGuard Systems', 'WB-350', 'WB-2019-012',
   450000.00, 50, 'KeNHA', 'KeNHA Nairobi Region'),
   
  ('GRD-002', (SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Guardrail'),
   'Guardrail Section B', 'W-Beam guardrail - 75m section',
   (SELECT status_id FROM tams360.asset_status WHERE name = 'Damaged'),
   -1.289123, 36.820456, 'Thika Road, Bridge Section',
   'A2', 14.0, 'Southbound',
   '2018-09-15'::date, 'SafeGuard Systems', 'WB-350', 'WB-2018-034',
   675000.00, 75, 'KeNHA', 'KeNHA Nairobi Region'),
   
  ('GRD-003', (SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Guardrail'),
   'Guardrail Section C', 'Cable guardrail - 100m section',
   (SELECT status_id FROM tams360.asset_status WHERE name = 'Active'),
   -1.293567, 36.823789, 'Thika Road, Median Section',
   'A2', 15.8, 'Both',
   '2020-11-10'::date, 'CableSafe Ltd', 'CB-500', 'CB-2020-067',
   850000.00, 100, 'KeNHA', 'KeNHA Nairobi Region'),
   
  ('GRD-004', (SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Guardrail'),
   'Guardrail Section D', 'W-Beam guardrail - 60m section',
   (SELECT status_id FROM tams360.asset_status WHERE name = 'Repaired'),
   -1.285789, 36.817234, 'Thika Road, Curve Section',
   'A2', 12.9, 'Northbound',
   '2019-03-22'::date, 'SafeGuard Systems', 'WB-350', 'WB-2019-008',
   540000.00, 60, 'KeNHA', 'KeNHA Nairobi Region'),
   
  -- Traffic Signals (3)
  ('TRS-001', (SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Traffic Signal'),
   'Traffic Light - Kasarani Junction', '4-way traffic signal with pedestrian crossing',
   (SELECT status_id FROM tams360.asset_status WHERE name = 'Active'),
   -1.291590, 36.821946, 'Thika Road x Kasarani Road',
   'A2', 15.2, 'N/A',
   '2019-07-01'::date, 'SignalTech Kenya', 'ST-400', 'ST-2019-023',
   1200000.00, 1, 'Nairobi County', 'Nairobi County Roads'),
   
  ('TRS-002', (SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Traffic Signal'),
   'Traffic Light - Roysambu', '3-way traffic signal',
   (SELECT status_id FROM tams360.asset_status WHERE name = 'Active'),
   -1.286389, 36.817223, 'Thika Road x Kamiti Road',
   'A2', 12.5, 'N/A',
   '2020-01-15'::date, 'SignalTech Kenya', 'ST-300', 'ST-2020-005',
   950000.00, 1, 'Nairobi County', 'Nairobi County Roads'),
   
  ('TRS-003', (SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Traffic Signal'),
   'Pedestrian Crossing Light', 'Pelican crossing signal',
   (SELECT status_id FROM tams360.asset_status WHERE name = 'Damaged'),
   -1.280122, 36.814978, 'Thika Road, Garden City',
   'A2', 10.8, 'N/A',
   '2018-12-10'::date, 'SignalTech Kenya', 'PX-200', 'PX-2018-091',
   450000.00, 1, 'Nairobi County', 'Nairobi County Roads'),
   
  -- Guideposts (3)
  ('GDP-001', (SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Guidepost'),
   'Reflective Guidepost - KM 12', 'Single reflective delineator',
   (SELECT status_id FROM tams360.asset_status WHERE name = 'Active'),
   -1.284567, 36.816789, 'Thika Road, Roadside',
   'A2', 12.0, 'Both',
   '2020-04-15'::date, 'RoadSafety Ltd', 'RP-100', 'RP-2020-234',
   3500.00, 1, 'KeNHA', 'KeNHA Nairobi Region'),
   
  ('GDP-002', (SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Guidepost'),
   'Reflective Guidepost - KM 14', 'Single reflective delineator',
   (SELECT status_id FROM tams360.asset_status WHERE name = 'Active'),
   -1.289890, 36.820123, 'Thika Road, Roadside',
   'A2', 14.0, 'Both',
   '2020-04-15'::date, 'RoadSafety Ltd', 'RP-100', 'RP-2020-235',
   3500.00, 1, 'KeNHA', 'KeNHA Nairobi Region'),
   
  ('GDP-003', (SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Guidepost'),
   'Reflective Guidepost - KM 16', 'Single reflective delineator',
   (SELECT status_id FROM tams360.asset_status WHERE name = 'Missing'),
   -1.294567, 36.824567, 'Thika Road, Roadside',
   'A2', 16.0, 'Both',
   '2020-04-15'::date, 'RoadSafety Ltd', 'RP-100', 'RP-2020-236',
   3500.00, 1, 'KeNHA', 'KeNHA Nairobi Region'),
   
  -- Gantry (2)
  ('GNT-001', (SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Gantry'),
   'Overhead Gantry - Roysambu', 'Sign support gantry structure',
   (SELECT status_id FROM tams360.asset_status WHERE name = 'Active'),
   -1.286389, 36.817223, 'Thika Road, Above All Lanes',
   'A2', 12.5, 'Both',
   '2017-09-20'::date, 'SteelWorks Kenya', 'GNT-1500', 'GNT-2017-003',
   2500000.00, 1, 'KeNHA', 'KeNHA Nairobi Region'),
   
  ('GNT-002', (SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Gantry'),
   'Overhead Gantry - Kasarani', 'Sign support gantry structure',
   (SELECT status_id FROM tams360.asset_status WHERE name = 'Active'),
   -1.291590, 36.821946, 'Thika Road, Above All Lanes',
   'A2', 15.2, 'Both',
   '2018-03-10'::date, 'SteelWorks Kenya', 'GNT-1500', 'GNT-2018-001',
   2500000.00, 1, 'KeNHA', 'KeNHA Nairobi Region'),
   
  -- Road Marking (2)
  ('RDM-001', (SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Road Marking'),
   'Center Line - KM 10-15', 'White dashed center line - 5km section',
   (SELECT status_id FROM tams360.asset_status WHERE name = 'Active'),
   -1.283456, 36.816123, 'Thika Road, Center Line',
   'A2', 12.5, 'Both',
   '2022-06-01'::date, 'LineMark Ltd', 'TH-150', 'LM-2022-045',
   350000.00, 5000, 'KeNHA', 'KeNHA Nairobi Region'),
   
  ('RDM-002', (SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Road Marking'),
   'Pedestrian Crossing - Kasarani', 'Zebra crossing markings',
   (SELECT status_id FROM tams360.asset_status WHERE name = 'Active'),
   -1.291590, 36.821946, 'Thika Road, Kasarani Junction',
   'A2', 15.2, 'Both',
   '2022-08-15'::date, 'LineMark Ltd', 'ZEB-200', 'LM-2022-089',
   85000.00, 1, 'Nairobi County', 'Nairobi County Roads'),
   
  -- Raised Road Markers (1)
  ('RRM-001', (SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Raised Road Marker'),
   'Cat Eyes - KM 10-15', 'Reflective road studs - 5km section',
   (SELECT status_id FROM tams360.asset_status WHERE name = 'Active'),
   -1.283456, 36.816123, 'Thika Road, Center Line',
   'A2', 12.5, 'Both',
   '2021-09-20'::date, 'ReflecTech Ltd', 'CE-360', 'RT-2021-156',
   750000.00, 250, 'KeNHA', 'KeNHA Nairobi Region')
) AS t(asset_tag, asset_type_id, name, description, status_id,
        latitude, longitude, location_description,
        route, chainage_km, direction,
        installation_date, manufacturer, model, serial_number,
        unit_cost, quantity, owner, responsible_party)
WHERE NOT EXISTS (
  SELECT 1 FROM tams360.assets WHERE asset_tag = t.asset_tag
);

-- ============================================================================
-- SAMPLE INSPECTIONS
-- ============================================================================

-- Create inspections for our sample assets
-- We'll create 2-3 inspections per asset with different dates

DO $$
DECLARE
  v_inspection_id UUID;
  v_asset_id UUID;
  v_template_id UUID;
BEGIN
  -- Inspection 1: SGN-001 (Recent, Good condition)
  SELECT asset_id INTO v_asset_id FROM tams360.assets WHERE asset_tag = 'SGN-001';
  SELECT template_id INTO v_template_id 
  FROM tams360.asset_component_templates 
  WHERE asset_type_id = (SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Signage')
  LIMIT 1;
  
  IF NOT EXISTS (SELECT 1 FROM tams360.inspections WHERE asset_id = v_asset_id AND inspection_date = '2024-12-15') THEN
    INSERT INTO tams360.inspections (
      asset_id, inspection_type_id, inspection_date, inspector_name, inspector_contact,
      weather_conditions, overall_condition_id, notes, created_by
    ) VALUES (
      v_asset_id,
      (SELECT inspection_type_id FROM tams360.inspection_types WHERE name = 'Routine'),
      '2024-12-15'::timestamp,
      'John Mwangi',
      '+254712345001',
      'Clear and dry',
      (SELECT condition_id FROM tams360.condition_lookup WHERE name = 'Good'),
      'Sign in good condition, minor dirt accumulation',
      'seed-script'
    ) RETURNING inspection_id INTO v_inspection_id;
    
    -- Add component inspection data
    INSERT INTO tams360.inspection_components (inspection_id, template_item_id, degree_code, extent_code, relevancy_code, notes)
    SELECT v_inspection_id, item_id, '0', '1', '3', 'No issues' 
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 1
    UNION ALL
    SELECT v_inspection_id, item_id, '1', '1', '3', 'Minor surface rust spots'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 2
    UNION ALL
    SELECT v_inspection_id, item_id, '0', '1', '2', 'All bolts secure'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 3
    UNION ALL
    SELECT v_inspection_id, item_id, '1', '1', '4', 'Fully legible, minor fading'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 4
    UNION ALL
    SELECT v_inspection_id, item_id, '0', '1', '2', 'No corrosion'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 5
    UNION ALL
    SELECT v_inspection_id, item_id, '0', '1', '3', 'Proper clearance'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 6;
  END IF;
  
  -- Inspection 2: SGN-003 (Damaged sign - worse condition)
  SELECT asset_id INTO v_asset_id FROM tams360.assets WHERE asset_tag = 'SGN-003';
  
  IF NOT EXISTS (SELECT 1 FROM tams360.inspections WHERE asset_id = v_asset_id AND inspection_date = '2024-12-10') THEN
    INSERT INTO tams360.inspections (
      asset_id, inspection_type_id, inspection_date, inspector_name, inspector_contact,
      weather_conditions, overall_condition_id, notes, created_by
    ) VALUES (
      v_asset_id,
      (SELECT inspection_type_id FROM tams360.inspection_types WHERE name = 'Routine'),
      '2024-12-10'::timestamp,
      'Jane Wanjiru',
      '+254712345002',
      'Overcast',
      (SELECT condition_id FROM tams360.condition_lookup WHERE name = 'Fair'),
      'Sign panel damaged, requires repair',
      'seed-script'
    ) RETURNING inspection_id INTO v_inspection_id;
    
    INSERT INTO tams360.inspection_components (inspection_id, template_item_id, degree_code, extent_code, relevancy_code, notes)
    SELECT v_inspection_id, item_id, '1', '1', '2', 'Minor erosion visible'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 1
    UNION ALL
    SELECT v_inspection_id, item_id, '2', '2', '3', 'Moderate corrosion on lower section'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 2
    UNION ALL
    SELECT v_inspection_id, item_id, '1', '2', '3', 'Some bolts loose'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 3
    UNION ALL
    SELECT v_inspection_id, item_id, '2', '3', '4', 'Significant fading and scratches, partially legible'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 4
    UNION ALL
    SELECT v_inspection_id, item_id, '1', '2', '3', 'Minor corrosion spots'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 5
    UNION ALL
    SELECT v_inspection_id, item_id, '0', '1', '3', 'Adequate clearance'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 6;
  END IF;
  
  -- Inspection 3: GRD-002 (Damaged guardrail)
  SELECT asset_id INTO v_asset_id FROM tams360.assets WHERE asset_tag = 'GRD-002';
  SELECT template_id INTO v_template_id 
  FROM tams360.asset_component_templates 
  WHERE asset_type_id = (SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Guardrail')
  LIMIT 1;
  
  IF NOT EXISTS (SELECT 1 FROM tams360.inspections WHERE asset_id = v_asset_id AND inspection_date = '2024-12-08') THEN
    INSERT INTO tams360.inspections (
      asset_id, inspection_type_id, inspection_date, inspector_name, inspector_contact,
      weather_conditions, overall_condition_id, notes, created_by
    ) VALUES (
      v_asset_id,
      (SELECT inspection_type_id FROM tams360.inspection_types WHERE name = 'Incident'),
      '2024-12-08'::timestamp,
      'Peter Omondi',
      '+254712345003',
      'Clear',
      (SELECT condition_id FROM tams360.condition_lookup WHERE name = 'Poor'),
      'Impact damage from vehicle collision, requires immediate repair',
      'seed-script'
    ) RETURNING inspection_id INTO v_inspection_id;
    
    INSERT INTO tams360.inspection_components (inspection_id, template_item_id, degree_code, extent_code, relevancy_code, notes)
    SELECT v_inspection_id, item_id, '3', '3', '4', 'Severe deformation from impact, 15m section affected'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 1
    UNION ALL
    SELECT v_inspection_id, item_id, '2', '2', '4', 'Two posts bent, foundation stable'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 2
    UNION ALL
    SELECT v_inspection_id, item_id, '2', '3', '3', 'Multiple bolts sheared off'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 3
    UNION ALL
    SELECT v_inspection_id, item_id, '1', '1', '3', 'Foundation stable, minor movement'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 4;
  END IF;
  
  -- Inspection 4: TRS-001 (Traffic signal - good condition)
  SELECT asset_id INTO v_asset_id FROM tams360.assets WHERE asset_tag = 'TRS-001';
  SELECT template_id INTO v_template_id 
  FROM tams360.asset_component_templates 
  WHERE asset_type_id = (SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Traffic Signal')
  LIMIT 1;
  
  IF NOT EXISTS (SELECT 1 FROM tams360.inspections WHERE asset_id = v_asset_id AND inspection_date = '2024-12-20') THEN
    INSERT INTO tams360.inspections (
      asset_id, inspection_type_id, inspection_date, inspector_name, inspector_contact,
      weather_conditions, overall_condition_id, notes, created_by
    ) VALUES (
      v_asset_id,
      (SELECT inspection_type_id FROM tams360.inspection_types WHERE name = 'Routine'),
      '2024-12-20'::timestamp,
      'Mary Njeri',
      '+254712345004',
      'Clear',
      (SELECT condition_id FROM tams360.condition_lookup WHERE name = 'Excellent'),
      'All systems operational, recent maintenance completed',
      'seed-script'
    ) RETURNING inspection_id INTO v_inspection_id;
    
    INSERT INTO tams360.inspection_components (inspection_id, template_item_id, degree_code, extent_code, relevancy_code, notes)
    SELECT v_inspection_id, item_id, '0', '1', '4', 'All lenses clean and operational'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 1
    UNION ALL
    SELECT v_inspection_id, item_id, '0', '1', '3', 'No corrosion, stable'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 2
    UNION ALL
    SELECT v_inspection_id, item_id, '0', '1', '4', 'Cabinet secure, locks functional'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 3
    UNION ALL
    SELECT v_inspection_id, item_id, '0', '1', '3', 'All connections secure'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 4;
  END IF;
  
  -- Inspection 5: TRS-003 (Damaged traffic signal)
  SELECT asset_id INTO v_asset_id FROM tams360.assets WHERE asset_tag = 'TRS-003';
  
  IF NOT EXISTS (SELECT 1 FROM tams360.inspections WHERE asset_id = v_asset_id AND inspection_date = '2024-12-18') THEN
    INSERT INTO tams360.inspections (
      asset_id, inspection_type_id, inspection_date, inspector_name, inspector_contact,
      weather_conditions, overall_condition_id, notes, created_by
    ) VALUES (
      v_asset_id,
      (SELECT inspection_type_id FROM tams360.inspection_types WHERE name = 'Incident'),
      '2024-12-18'::timestamp,
      'David Kamau',
      '+254712345005',
      'Rainy',
      (SELECT condition_id FROM tams360.condition_lookup WHERE name = 'Poor'),
      'Vandalized - cabinet broken into, requires immediate attention',
      'seed-script'
    ) RETURNING inspection_id INTO v_inspection_id;
    
    INSERT INTO tams360.inspection_components (inspection_id, template_item_id, degree_code, extent_code, relevancy_code, notes)
    SELECT v_inspection_id, item_id, '2', '2', '4', 'One lens damaged, others functional'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 1
    UNION ALL
    SELECT v_inspection_id, item_id, '1', '1', '3', 'Minor surface rust'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 2
    UNION ALL
    SELECT v_inspection_id, item_id, '3', '4', '4', 'Cabinet door forced open, lock broken, vandalism evident'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 3
    UNION ALL
    SELECT v_inspection_id, item_id, '2', '2', '4', 'Some wiring exposed due to vandalism, safety hazard'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 4;
  END IF;
  
  -- Inspection 6: GDP-003 (Missing guidepost)
  SELECT asset_id INTO v_asset_id FROM tams360.assets WHERE asset_tag = 'GDP-003';
  SELECT template_id INTO v_template_id 
  FROM tams360.asset_component_templates 
  WHERE asset_type_id = (SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Guidepost')
  LIMIT 1;
  
  IF NOT EXISTS (SELECT 1 FROM tams360.inspections WHERE asset_id = v_asset_id AND inspection_date = '2024-12-12') THEN
    INSERT INTO tams360.inspections (
      asset_id, inspection_type_id, inspection_date, inspector_name, inspector_contact,
      weather_conditions, overall_condition_id, notes, created_by
    ) VALUES (
      v_asset_id,
      (SELECT inspection_type_id FROM tams360.inspection_types WHERE name = 'Routine'),
      '2024-12-12'::timestamp,
      'Grace Akinyi',
      '+254712345006',
      'Clear',
      (SELECT condition_id FROM tams360.condition_lookup WHERE name = 'Poor'),
      'Guidepost missing - likely stolen or damaged in accident',
      'seed-script'
    ) RETURNING inspection_id INTO v_inspection_id;
    
    INSERT INTO tams360.inspection_components (inspection_id, template_item_id, degree_code, extent_code, relevancy_code, notes)
    SELECT v_inspection_id, item_id, 'X', '1', '4', 'Foundation broken off at ground level'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 1
    UNION ALL
    SELECT v_inspection_id, item_id, 'X', '1', '4', 'Post missing'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 2
    UNION ALL
    SELECT v_inspection_id, item_id, 'X', '1', '4', 'Bolts missing'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 3
    UNION ALL
    SELECT v_inspection_id, item_id, 'X', '1', '4', 'Sign panel missing'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 4
    UNION ALL
    SELECT v_inspection_id, item_id, 'X', '1', '4', 'Brackets missing'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 5
    UNION ALL
    SELECT v_inspection_id, item_id, 'X', '1', '4', 'Asset completely missing'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 6;
  END IF;

  -- Add a few more inspections for variety
  -- GRD-001 (Good guardrail)
  SELECT asset_id INTO v_asset_id FROM tams360.assets WHERE asset_tag = 'GRD-001';
  SELECT template_id INTO v_template_id 
  FROM tams360.asset_component_templates 
  WHERE asset_type_id = (SELECT asset_type_id FROM tams360.asset_types WHERE name = 'Guardrail')
  LIMIT 1;
  
  IF NOT EXISTS (SELECT 1 FROM tams360.inspections WHERE asset_id = v_asset_id AND inspection_date = '2024-12-22') THEN
    INSERT INTO tams360.inspections (
      asset_id, inspection_type_id, inspection_date, inspector_name, inspector_contact,
      weather_conditions, overall_condition_id, notes, created_by
    ) VALUES (
      v_asset_id,
      (SELECT inspection_type_id FROM tams360.inspection_types WHERE name = 'Routine'),
      '2024-12-22'::timestamp,
      'John Mwangi',
      '+254712345001',
      'Clear',
      (SELECT condition_id FROM tams360.condition_lookup WHERE name = 'Good'),
      'Guardrail in good condition overall',
      'seed-script'
    ) RETURNING inspection_id INTO v_inspection_id;
    
    INSERT INTO tams360.inspection_components (inspection_id, template_item_id, degree_code, extent_code, relevancy_code, notes)
    SELECT v_inspection_id, item_id, '1', '1', '3', 'Minor surface rust spots only'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 1
    UNION ALL
    SELECT v_inspection_id, item_id, '1', '1', '3', 'Posts stable, minor corrosion'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 2
    UNION ALL
    SELECT v_inspection_id, item_id, '0', '1', '2', 'All connections secure'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 3
    UNION ALL
    SELECT v_inspection_id, item_id, '0', '1', '2', 'Foundation stable'
    FROM tams360.asset_component_template_items WHERE template_id = v_template_id AND component_order = 4;
  END IF;
  
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

SELECT 
  'Assets Created' as metric,
  COUNT(*) as count
FROM tams360.assets
WHERE created_by = 'seed-script'
UNION ALL
SELECT 
  'Inspections Created',
  COUNT(*)
FROM tams360.inspections
WHERE created_by = 'seed-script'
UNION ALL
SELECT 
  'Inspection Components',
  COUNT(*)
FROM tams360.inspection_components ic
JOIN tams360.inspections i ON ic.inspection_id = i.inspection_id
WHERE i.created_by = 'seed-script';

-- Show asset summary by type
SELECT 
  at.name as asset_type,
  COUNT(a.asset_id) as total_assets,
  COUNT(DISTINCT i.inspection_id) as total_inspections
FROM tams360.asset_types at
LEFT JOIN tams360.assets a ON at.asset_type_id = a.asset_type_id AND a.created_by = 'seed-script'
LEFT JOIN tams360.inspections i ON a.asset_id = i.asset_id AND i.created_by = 'seed-script'
GROUP BY at.name
ORDER BY at.name;
