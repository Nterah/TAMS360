-- ============================================================================
-- TAMS360 - Public Schema Views for API Access
-- Run this after DATABASE_SCHEMA_ENHANCEMENTS.sql
-- ============================================================================

-- ============================================================================
-- Component Templates (already created but let's ensure they exist)
-- ============================================================================

CREATE OR REPLACE VIEW public.asset_component_templates AS 
SELECT * FROM tams360.asset_component_templates;

CREATE OR REPLACE VIEW public.asset_component_template_items AS 
SELECT * FROM tams360.asset_component_template_items;

CREATE OR REPLACE VIEW public.inspection_component_scores AS 
SELECT * FROM tams360.inspection_component_scores;

-- ============================================================================
-- Analytics Materialized Views (expose to public)
-- ============================================================================

CREATE OR REPLACE VIEW public.mv_asset_replacement_frequency AS 
SELECT * FROM tams360.mv_asset_replacement_frequency;

CREATE OR REPLACE VIEW public.mv_maintenance_duration_analysis AS 
SELECT * FROM tams360.mv_maintenance_duration_analysis;

CREATE OR REPLACE VIEW public.mv_cost_variance_analysis AS 
SELECT * FROM tams360.mv_cost_variance_analysis;

-- ============================================================================
-- Grant Permissions to Public Views
-- ============================================================================

GRANT SELECT ON public.asset_component_templates TO anon, authenticated;
GRANT SELECT ON public.asset_component_template_items TO anon, authenticated;
GRANT SELECT ON public.inspection_component_scores TO anon, authenticated;

GRANT SELECT ON public.mv_asset_replacement_frequency TO anon, authenticated;
GRANT SELECT ON public.mv_maintenance_duration_analysis TO anon, authenticated;
GRANT SELECT ON public.mv_cost_variance_analysis TO anon, authenticated;

-- ============================================================================
-- Ensure tams360 tables are accessible (already should be, but confirming)
-- ============================================================================

GRANT SELECT ON tams360.asset_component_templates TO authenticated;
GRANT SELECT ON tams360.asset_component_template_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tams360.inspection_component_scores TO authenticated;

-- ============================================================================
-- Enhanced Inspections & Assets Views (with new columns)
-- ============================================================================

-- Enhanced inspections view with CI/DERU
CREATE OR REPLACE VIEW public.inspections_with_ci AS
SELECT 
    i.*,
    a.asset_ref,
    at.name as asset_type_name
FROM tams360.inspections i
LEFT JOIN tams360.assets a ON i.asset_id = a.asset_id
LEFT JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id;

GRANT SELECT ON public.inspections_with_ci TO anon, authenticated;

-- Enhanced assets view with ownership, valuation, and latest CI/DERU
CREATE OR REPLACE VIEW public.assets_enhanced AS
SELECT 
    a.*,
    at.name as asset_type_name
FROM tams360.assets a
LEFT JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id;

GRANT SELECT ON public.assets_enhanced TO anon, authenticated;

-- Maintenance records view (expose as "maintenance" for API compatibility)
CREATE OR REPLACE VIEW public.maintenance AS
SELECT * FROM tams360.maintenance_records;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance TO authenticated;
GRANT SELECT ON public.maintenance TO anon;

-- ============================================================================
-- Dashboard Summary Views
-- ============================================================================

-- CI Distribution Summary
CREATE OR REPLACE VIEW public.dashboard_ci_distribution AS
SELECT 
    CASE 
        WHEN latest_ci >= 80 THEN 'Excellent (80-100)'
        WHEN latest_ci >= 60 THEN 'Good (60-79)'
        WHEN latest_ci >= 40 THEN 'Fair (40-59)'
        WHEN latest_ci < 40 THEN 'Poor (0-39)'
        ELSE 'Not Inspected'
    END as ci_band,
    COUNT(*) as asset_count,
    AVG(latest_ci) as avg_ci,
    SUM(replacement_value) as total_replacement_value
FROM tams360.assets
GROUP BY ci_band;

GRANT SELECT ON public.dashboard_ci_distribution TO anon, authenticated;

-- Urgency Summary
CREATE OR REPLACE VIEW public.dashboard_urgency_summary AS
SELECT 
    calculated_urgency,
    COUNT(*) as inspection_count,
    SUM(total_remedial_cost) as total_cost,
    AVG(conditional_index) as avg_ci
FROM tams360.inspections
WHERE calculated_urgency IS NOT NULL
    AND inspection_date >= NOW() - INTERVAL '12 months'
GROUP BY calculated_urgency;

GRANT SELECT ON public.dashboard_urgency_summary TO anon, authenticated;

-- Asset Type Summary with CI
CREATE OR REPLACE VIEW public.dashboard_asset_type_summary AS
SELECT 
    at.name as asset_type,
    COUNT(a.asset_id) as total_assets,
    COUNT(CASE WHEN a.latest_ci IS NOT NULL THEN 1 END) as inspected_assets,
    AVG(a.latest_ci) as avg_ci,
    COUNT(CASE WHEN a.latest_ci < 40 THEN 1 END) as poor_condition,
    COUNT(CASE WHEN a.latest_ci >= 40 AND a.latest_ci < 60 THEN 1 END) as fair_condition,
    COUNT(CASE WHEN a.latest_ci >= 60 AND a.latest_ci < 80 THEN 1 END) as good_condition,
    COUNT(CASE WHEN a.latest_ci >= 80 THEN 1 END) as excellent_condition,
    SUM(a.replacement_value) as total_replacement_value
FROM tams360.assets a
JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id
GROUP BY at.name;

GRANT SELECT ON public.dashboard_asset_type_summary TO anon, authenticated;

-- Remedial Cost Exposure by Urgency
CREATE OR REPLACE VIEW public.dashboard_remedial_cost_exposure AS
SELECT 
    calculated_urgency,
    COUNT(*) as inspection_count,
    SUM(total_remedial_cost) as total_exposure,
    AVG(total_remedial_cost) as avg_cost_per_inspection,
    MIN(inspection_date) as oldest_inspection,
    MAX(inspection_date) as newest_inspection
FROM tams360.inspections
WHERE calculated_urgency IS NOT NULL
    AND total_remedial_cost > 0
GROUP BY calculated_urgency;

GRANT SELECT ON public.dashboard_remedial_cost_exposure TO anon, authenticated;

-- ============================================================================
-- Helper Functions for API
-- ============================================================================

-- Function to get component template by asset type name (easier for frontend)
CREATE OR REPLACE FUNCTION public.get_component_template_by_asset_type(p_asset_type_name VARCHAR)
RETURNS TABLE (
    template_id UUID,
    asset_type_id UUID,
    name VARCHAR,
    description TEXT,
    version INTEGER,
    is_active BOOLEAN,
    items JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.template_id,
        t.asset_type_id,
        t.name,
        t.description,
        t.version,
        t.is_active,
        jsonb_agg(
            jsonb_build_object(
                'item_id', i.item_id,
                'component_name', i.component_name,
                'component_order', i.component_order,
                'what_to_inspect', i.what_to_inspect,
                'degree_rubric', i.degree_rubric,
                'extent_rubric', i.extent_rubric,
                'relevancy_rubric', i.relevancy_rubric,
                'default_quantity', i.default_quantity,
                'quantity_unit', i.quantity_unit
            ) ORDER BY i.component_order
        ) as items
    FROM tams360.asset_component_templates t
    JOIN tams360.asset_types at ON t.asset_type_id = at.asset_type_id
    LEFT JOIN tams360.asset_component_template_items i ON t.template_id = i.template_id
    WHERE at.name = p_asset_type_name
        AND t.is_active = TRUE
    GROUP BY t.template_id, t.asset_type_id, t.name, t.description, t.version, t.is_active
    ORDER BY t.version DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.get_component_template_by_asset_type(VARCHAR) TO anon, authenticated;

-- ============================================================================
-- Verification Queries (run these to test)
-- ============================================================================

-- Check if component templates exist
-- SELECT * FROM public.asset_component_templates;

-- Check if signage template was created
-- SELECT * FROM public.get_component_template_by_asset_type('Signage');

-- Check analytics views
-- SELECT * FROM public.dashboard_ci_distribution;
-- SELECT * FROM public.dashboard_asset_type_summary;

-- ============================================================================
-- END OF PUBLIC VIEWS SETUP
-- ============================================================================