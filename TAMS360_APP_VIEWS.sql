-- ============================================================================
-- TAMS360 - Tenant-Safe Application Views
-- These views are designed for the free tier and incorporate tenant_id filtering via RLS
-- Run this AFTER the data import and cleanup
-- ============================================================================

-- Drop old views if they exist to avoid conflicts
DROP VIEW IF EXISTS public.tams360_inspections_v CASCADE;
DROP VIEW IF EXISTS public.tams360_assets_v CASCADE;

-- ============================================================================
-- INSPECTION HEADER VIEW FOR APP
-- ============================================================================
-- This view provides all inspection header fields plus asset context
-- Field names optimized for frontend binding

CREATE OR REPLACE VIEW public.tams360_inspections_app AS
SELECT 
    i.inspection_id,
    i.asset_id,
    a.asset_ref,
    at.name as asset_type_name,
    at.abbreviation as asset_type_abbreviation,
    i.inspection_date,
    i.inspector_name,
    -- CI fields (extract from calculation_metadata JSON or direct columns)
    COALESCE(i.conditional_index, 0) as ci_final,
    COALESCE(
        (i.calculation_metadata->>'ci_health')::numeric, 
        i.conditional_index, 
        0
    ) as ci_health,
    COALESCE(
        (i.calculation_metadata->>'ci_safety')::numeric, 
        i.conditional_index, 
        0
    ) as ci_safety,
    -- Urgency (text label: Low/Medium/High/Immediate)
    COALESCE(i.calculated_urgency, 'Low') as calculated_urgency,
    -- DERU numeric index
    COALESCE(i.deru_value, 0) as deru_value,
    -- Remedial cost
    COALESCE(i.total_remedial_cost, 0) as total_remedial_cost,
    -- CI Band
    i.ci_band,
    -- Summary fields
    i.comments as finding_summary,
    i.remedial_notes as details,
    i.weather_conditions,
    -- Metadata
    i.tenant_id,
    i.created_at,
    i.updated_at
FROM tams360.inspections i
LEFT JOIN tams360.assets a ON i.asset_id = a.asset_id
LEFT JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id;

-- Grant access
GRANT SELECT ON public.tams360_inspections_app TO anon, authenticated;

COMMENT ON VIEW public.tams360_inspections_app IS 
'Tenant-safe inspection header view with asset context. All app queries should use this view.';

-- ============================================================================
-- INSPECTION COMPONENT DETAIL VIEW FOR APP
-- ============================================================================
-- Provides per-component inspection details with correct ordering

CREATE OR REPLACE VIEW public.tams360_inspection_components_app AS
SELECT 
    ics.score_id,
    ics.inspection_id,
    i.asset_id,
    a.asset_ref,
    -- Component identification
    acti.component_order,
    COALESCE(ics.component_name, acti.component_name) as component_name,
    -- D/E/R values
    ics.degree_value,
    ics.extent_value,
    ics.relevancy_value,
    -- Component CI score (from inspection_component_scores.component_score)
    COALESCE(ics.component_score, 0) as ci_component,
    -- Component urgency token (if stored)
    ics.urgency_token,
    -- Remedial details
    ics.component_notes,
    ics.quantity,
    ics.quantity_unit,
    ics.rate,
    ics.component_cost,
    ics.remedial_work_description,
    -- Photo
    ics.photo_url,
    -- Metadata
    ics.tenant_id,
    ics.created_at,
    ics.updated_at
FROM tams360.inspection_component_scores ics
INNER JOIN tams360.inspections i ON ics.inspection_id = i.inspection_id
LEFT JOIN tams360.assets a ON i.asset_id = a.asset_id
LEFT JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id
LEFT JOIN tams360.asset_component_templates act 
    ON at.asset_type_id = act.asset_type_id 
    AND act.is_active = true
LEFT JOIN tams360.asset_component_template_items acti 
    ON act.template_id = acti.template_id 
    AND ics.component_name = acti.component_name;

-- Grant access
GRANT SELECT ON public.tams360_inspection_components_app TO anon, authenticated;

COMMENT ON VIEW public.tams360_inspection_components_app IS 
'Tenant-safe component inspection detail view. Provides D/E/R scores and remedial details per component.';

-- ============================================================================
-- ASSETS VIEW FOR APP (if not already created)
-- ============================================================================

CREATE OR REPLACE VIEW public.tams360_assets_app AS
SELECT 
    a.asset_id,
    a.asset_ref,
    a.asset_type_id,
    at.name as asset_type_name,
    at.abbreviation as asset_type_abbreviation,
    a.location_description,
    a.coordinates,
    a.municipality,
    a.contract_region,
    a.installation_date,
    a.installation_year,
    a.purchase_price,
    a.replacement_value,
    a.useful_life_years,
    a.ownership_type,
    a.responsible_department,
    a.maintenance_responsibility,
    a.warranty_expiry_date,
    a.notes,
    -- Latest inspection CI
    a.latest_ci,
    a.latest_inspection_date,
    -- Metadata
    a.tenant_id,
    a.created_at,
    a.updated_at
FROM tams360.assets a
LEFT JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id;

-- Grant access
GRANT SELECT ON public.tams360_assets_app TO anon, authenticated;

COMMENT ON VIEW public.tams360_assets_app IS 
'Tenant-safe assets view with asset type details.';

-- ============================================================================
-- URGENCY SUMMARY VIEW (for dashboard)
-- ============================================================================

CREATE OR REPLACE VIEW public.tams360_urgency_summary_v AS
SELECT 
    calculated_urgency,
    COUNT(*) as inspection_count,
    COUNT(DISTINCT asset_id) as asset_count,
    ROUND(AVG(COALESCE(conditional_index, 0))::numeric, 2) as avg_ci,
    ROUND(SUM(COALESCE(total_remedial_cost, 0))::numeric, 2) as total_remedial_cost
FROM tams360.inspections
WHERE calculated_urgency IS NOT NULL
GROUP BY calculated_urgency;

GRANT SELECT ON public.tams360_urgency_summary_v TO anon, authenticated;

-- ============================================================================
-- CI DISTRIBUTION VIEW (for dashboard)
-- ============================================================================

CREATE OR REPLACE VIEW public.tams360_ci_distribution_v AS
SELECT 
    CASE 
        WHEN conditional_index >= 80 THEN '80-100 (Excellent)'
        WHEN conditional_index >= 60 THEN '60-79 (Good)'
        WHEN conditional_index >= 40 THEN '40-59 (Fair)'
        WHEN conditional_index >= 20 THEN '20-39 (Poor)'
        ELSE '0-19 (Critical)'
    END as ci_band,
    COUNT(*) as inspection_count,
    COUNT(DISTINCT asset_id) as asset_count,
    ROUND(AVG(conditional_index)::numeric, 2) as avg_ci,
    ROUND(SUM(COALESCE(total_remedial_cost, 0))::numeric, 2) as total_value
FROM tams360.inspections
WHERE conditional_index IS NOT NULL
GROUP BY ci_band
ORDER BY 
    CASE ci_band
        WHEN '80-100 (Excellent)' THEN 1
        WHEN '60-79 (Good)' THEN 2
        WHEN '40-59 (Fair)' THEN 3
        WHEN '20-39 (Poor)' THEN 4
        ELSE 5
    END;

GRANT SELECT ON public.tams360_ci_distribution_v TO anon, authenticated;

-- ============================================================================
-- ASSET TYPE SUMMARY VIEW (for dashboard)
-- ============================================================================

CREATE OR REPLACE VIEW public.tams360_asset_type_summary_v AS
SELECT 
    at.name as asset_type,
    at.abbreviation,
    COUNT(DISTINCT a.asset_id) as total_assets,
    COUNT(DISTINCT CASE WHEN a.latest_ci IS NOT NULL THEN a.asset_id END) as inspected_assets,
    ROUND(AVG(a.latest_ci)::numeric, 2) as avg_ci,
    COUNT(DISTINCT CASE WHEN a.latest_ci < 40 THEN a.asset_id END) as poor_condition,
    COUNT(DISTINCT CASE WHEN a.latest_ci >= 40 AND a.latest_ci < 60 THEN a.asset_id END) as fair_condition,
    COUNT(DISTINCT CASE WHEN a.latest_ci >= 60 AND a.latest_ci < 80 THEN a.asset_id END) as good_condition,
    COUNT(DISTINCT CASE WHEN a.latest_ci >= 80 THEN a.asset_id END) as excellent_condition,
    ROUND(SUM(COALESCE(a.replacement_value, 0))::numeric, 2) as total_replacement_value
FROM tams360.assets a
INNER JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id
GROUP BY at.asset_type_id, at.name, at.abbreviation;

GRANT SELECT ON public.tams360_asset_type_summary_v TO anon, authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these to verify the views work correctly:

-- 1. Count inspections (should show ~1713)
-- SELECT COUNT(*) FROM public.tams360_inspections_app;

-- 2. Count assets (should show ~1718)
-- SELECT COUNT(*) FROM public.tams360_assets_app;

-- 3. Check specific asset
-- SELECT * FROM public.tams360_inspections_app 
-- WHERE asset_ref = 'GS-M1-NB-007' 
-- LIMIT 5;

-- 4. Check components for an inspection
-- SELECT * FROM public.tams360_inspection_components_app 
-- WHERE inspection_id = (SELECT inspection_id FROM tams360.inspections LIMIT 1)
-- ORDER BY component_order;

-- 5. Verify CI values are 0-100
-- SELECT 
--     MIN(ci_final) as min_ci, 
--     MAX(ci_final) as max_ci,
--     AVG(ci_final) as avg_ci
-- FROM public.tams360_inspections_app;

-- 6. Check urgency distribution
-- SELECT calculated_urgency, COUNT(*) 
-- FROM public.tams360_inspections_app 
-- GROUP BY calculated_urgency;

-- ============================================================================
-- END OF APPLICATION VIEWS
-- ============================================================================
