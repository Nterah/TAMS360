-- ============================================================================
-- TAMS360 - Create Public Views with Correct Naming Convention
-- Must be run to create tams360_* prefixed views in public schema
-- ============================================================================

-- ============================================================================
-- PRIMARY VIEW: public.tams360_inspections_v
-- Contains all inspection data with calculated fields and asset details
-- ============================================================================

CREATE OR REPLACE VIEW public.tams360_inspections_v AS
SELECT 
    i.inspection_id,
    i.asset_id,
    i.inspection_date,
    i.inspector_name,
    i.finding_summary,
    i.details,
    i.conditional_index,
    i.deru_value,
    i.calculated_urgency,
    i.total_remedial_cost,
    i.weather_conditions,
    i.created_at,
    i.updated_at,
    i.created_by,
    i.tenant_id,
    -- CI Band calculation
    CASE 
        WHEN i.conditional_index >= 80 THEN 'Excellent'
        WHEN i.conditional_index >= 60 THEN 'Good'
        WHEN i.conditional_index >= 40 THEN 'Fair'
        WHEN i.conditional_index < 40 THEN 'Poor'
        ELSE 'Not Calculated'
    END as ci_band,
    -- Calculation metadata (JSON format)
    jsonb_build_object(
        'ci_final', i.conditional_index,
        'ci_health', i.ci_health,
        'ci_safety', i.ci_safety,
        'urgency_raw', i.calculated_urgency,
        'total_cost_raw', i.total_remedial_cost,
        'timestamp_raw', i.inspection_date,
        'ci_safety_source', 'Component urgency mapping'
    ) as calculation_metadata,
    -- Asset reference fields (joined from assets table)
    a.asset_ref,
    at.name as asset_type_name,
    at.abbreviation as asset_type_abbreviation
FROM tams360.inspections i
LEFT JOIN tams360.assets a ON i.asset_id = a.asset_id
LEFT JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id;

GRANT SELECT ON public.tams360_inspections_v TO anon, authenticated;

-- ============================================================================
-- PRIMARY VIEW: public.tams360_assets_v
-- Contains all asset data with latest CI/DERU values
-- ============================================================================

CREATE OR REPLACE VIEW public.tams360_assets_v AS
SELECT 
    a.asset_id,
    a.asset_ref,
    a.description,
    a.status_id,
    a.gps_lat,
    a.gps_lng,
    a.road_name,
    a.road_number,
    a.km_marker,
    a.install_date,
    a.region,
    a.depot,
    a.notes,
    a.created_at,
    a.updated_at,
    a.created_by,
    a.tenant_id,
    -- Asset type information
    at.name as asset_type_name,
    at.abbreviation as asset_type_abbreviation,
    -- Ownership & Responsibility
    a.owned_by,
    a.responsible_party,
    a.ownership_status,
    -- Valuation fields
    a.purchase_price,
    a.useful_life_years,
    a.depreciation_rate,
    a.current_book_value,
    a.replacement_value,
    a.last_valuation_date,
    -- Latest CI/DERU from inspections
    a.latest_ci,
    a.latest_deru,
    a.latest_inspection_date,
    -- CI Band for latest inspection
    CASE 
        WHEN a.latest_ci >= 80 THEN 'Excellent'
        WHEN a.latest_ci >= 60 THEN 'Good'
        WHEN a.latest_ci >= 40 THEN 'Fair'
        WHEN a.latest_ci < 40 THEN 'Poor'
        ELSE 'Not Inspected'
    END as latest_ci_band,
    -- Status information
    s.name as status_name
FROM tams360.assets a
LEFT JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id
LEFT JOIN tams360.asset_status s ON a.status_id = s.status_id;

GRANT SELECT ON public.tams360_assets_v TO anon, authenticated;

-- ============================================================================
-- SUPPORTING VIEWS for Dashboard
-- ============================================================================

-- Asset count by type
CREATE OR REPLACE VIEW public.tams360_asset_type_summary_v AS
SELECT 
    at.name as asset_type_name,
    at.abbreviation as asset_type_abbreviation,
    COUNT(a.asset_id) as asset_count,
    COUNT(CASE WHEN a.latest_ci IS NOT NULL THEN 1 END) as inspected_count,
    AVG(a.latest_ci) as avg_ci,
    SUM(a.replacement_value) as total_value
FROM tams360.asset_types at
LEFT JOIN tams360.assets a ON at.asset_type_id = a.asset_type_id
GROUP BY at.asset_type_id, at.name, at.abbreviation;

GRANT SELECT ON public.tams360_asset_type_summary_v TO anon, authenticated;

-- Urgency distribution
CREATE OR REPLACE VIEW public.tams360_urgency_summary_v AS
SELECT 
    calculated_urgency,
    CASE 
        WHEN calculated_urgency = '1' THEN 'Low'
        WHEN calculated_urgency = '2' THEN 'Medium'
        WHEN calculated_urgency = '3' THEN 'High'
        WHEN calculated_urgency = '4' THEN 'Immediate'
        ELSE 'Unknown'
    END as urgency_label,
    COUNT(*) as inspection_count,
    SUM(total_remedial_cost) as total_cost,
    AVG(conditional_index) as avg_ci,
    AVG(deru_value) as avg_deru
FROM tams360.inspections
WHERE calculated_urgency IS NOT NULL
GROUP BY calculated_urgency
ORDER BY calculated_urgency::INTEGER;

GRANT SELECT ON public.tams360_urgency_summary_v TO anon, authenticated;

-- CI Distribution
CREATE OR REPLACE VIEW public.tams360_ci_distribution_v AS
SELECT 
    CASE 
        WHEN latest_ci >= 80 THEN 'Excellent'
        WHEN latest_ci >= 60 THEN 'Good'
        WHEN latest_ci >= 40 THEN 'Fair'
        WHEN latest_ci < 40 THEN 'Poor'
        ELSE 'Not Inspected'
    END as ci_band,
    COUNT(*) as asset_count,
    AVG(latest_ci) as avg_ci,
    SUM(replacement_value) as total_value
FROM tams360.assets
GROUP BY ci_band
ORDER BY 
    CASE 
        WHEN ci_band = 'Excellent' THEN 1
        WHEN ci_band = 'Good' THEN 2
        WHEN ci_band = 'Fair' THEN 3
        WHEN ci_band = 'Poor' THEN 4
        ELSE 5
    END;

GRANT SELECT ON public.tams360_ci_distribution_v TO anon, authenticated;

-- Maintenance records view (if using database)
CREATE OR REPLACE VIEW public.tams360_maintenance_v AS
SELECT 
    m.*,
    a.asset_ref,
    at.name as asset_type_name,
    at.abbreviation as asset_type_abbreviation
FROM tams360.maintenance_records m
LEFT JOIN tams360.assets a ON m.asset_id = a.asset_id
LEFT JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id;

GRANT SELECT ON public.tams360_maintenance_v TO anon, authenticated;

-- ============================================================================
-- Component Templates (already exist but ensure they're accessible)
-- ============================================================================

GRANT SELECT ON tams360.asset_component_templates TO anon, authenticated;
GRANT SELECT ON tams360.asset_component_template_items TO anon, authenticated;
GRANT SELECT, INSERT ON tams360.inspection_component_scores TO authenticated;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Test inspections view
-- SELECT * FROM public.tams360_inspections_v LIMIT 5;

-- Test assets view
-- SELECT * FROM public.tams360_assets_v LIMIT 5;

-- Test dashboard views
-- SELECT * FROM public.tams360_urgency_summary_v;
-- SELECT * FROM public.tams360_ci_distribution_v;
-- SELECT * FROM public.tams360_asset_type_summary_v;

-- ============================================================================
-- END OF TAMS360 PUBLIC VIEWS
-- ============================================================================
