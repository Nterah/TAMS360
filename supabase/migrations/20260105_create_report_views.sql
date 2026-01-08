-- ============================================================================
-- TAMS360 REPORTING VIEWS - Complete tenant-safe views for reports & dashboard
-- Created: 2026-01-05
-- Purpose: Provide pre-joined, tenant-safe views for all reporting needs
-- ============================================================================

-- DROP existing views if they exist (in correct dependency order)
DROP VIEW IF EXISTS public.tams360_inspector_performance_v CASCADE;
DROP VIEW IF EXISTS public.tams360_asset_type_summary_v CASCADE;
DROP VIEW IF EXISTS public.tams360_urgency_summary_v CASCADE;
DROP VIEW IF EXISTS public.tams360_ci_distribution_v CASCADE;
DROP VIEW IF EXISTS public.tams360_maintenance_app CASCADE;
DROP VIEW IF EXISTS public.tams360_inspection_components_app CASCADE;
DROP VIEW IF EXISTS public.tams360_inspections_app CASCADE;
DROP VIEW IF EXISTS public.tams360_assets_app CASCADE;

-- ============================================================================
-- 1) ASSETS APP VIEW - Complete asset information with latest inspection data
-- ============================================================================
CREATE OR REPLACE VIEW public.tams360_assets_app AS
SELECT 
    a.asset_id,
    a.reference_number AS asset_ref,
    a.asset_type_id,
    at.name AS asset_type_name,
    at.abbreviation AS asset_type_abbreviation,
    a.description,
    a.route_road AS road_number,
    a.road_name,
    a.chainage_km AS km_marker,
    a.section,
    a.side_of_road,
    a.gps_latitude AS gps_lat,
    a.gps_longitude AS gps_lng,
    a.status_id,
    ast.name AS status_name,
    a.region,
    a.depot,
    a.installation_date,
    a.purchase_price,
    a.procurement_date,
    a.replacement_value,
    a.current_value AS current_asset_value,
    a.depreciation_rate,
    a.useful_life_years,
    a.last_valuation_date,
    a.valuation_method,
    a.expected_life_years,
    a.installer_name,
    a.owner_entity,
    a.responsible_entity,
    a.notes,
    a.created_at,
    a.updated_at,
    a.tenant_id,
    -- Latest inspection data
    li.inspection_date AS last_inspection_date,
    li.conditional_index AS latest_ci,
    li.ci_band AS latest_ci_band,
    li.calculated_urgency AS latest_urgency,
    li.total_remedial_cost AS latest_remedial_cost,
    CASE 
        WHEN a.installation_date IS NOT NULL 
        THEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.installation_date))::integer
        ELSE NULL
    END AS age_years
FROM assets a
LEFT JOIN asset_types at ON a.asset_type_id = at.asset_type_id
LEFT JOIN asset_status ast ON a.status_id = ast.status_id
LEFT JOIN LATERAL (
    SELECT 
        inspection_date,
        conditional_index,
        ci_band,
        calculated_urgency,
        total_remedial_cost
    FROM inspections
    WHERE asset_id = a.asset_id
    ORDER BY inspection_date DESC
    LIMIT 1
) li ON true
WHERE a.deleted_at IS NULL;

-- Grant access
GRANT SELECT ON public.tams360_assets_app TO anon, authenticated, service_role;

-- Enable RLS
ALTER VIEW public.tams360_assets_app SET (security_invoker = on);

-- ============================================================================
-- 2) INSPECTIONS APP VIEW - Complete inspection data with asset info
-- ============================================================================
CREATE OR REPLACE VIEW public.tams360_inspections_app AS
SELECT 
    i.inspection_id,
    i.asset_id,
    a.reference_number AS asset_ref,
    a.asset_type_id,
    at.name AS asset_type_name,
    at.abbreviation AS asset_type_abbreviation,
    a.route_road,
    a.road_name,
    a.chainage_km,
    i.inspection_date,
    i.inspector_id,
    i.inspector_name,
    i.conditional_index AS ci_final,
    i.ci_health,
    i.ci_safety,
    i.ci_band,
    i.calculated_urgency,
    i.deru_value,
    i.total_remedial_cost,
    i.notes,
    i.status,
    i.created_at,
    i.updated_at,
    i.tenant_id,
    -- Count of photos
    (SELECT COUNT(*) FROM inspection_photos WHERE inspection_id = i.inspection_id) AS photo_count,
    -- Count of components
    (SELECT COUNT(*) FROM inspection_component_scores WHERE inspection_id = i.inspection_id) AS component_count
FROM inspections i
INNER JOIN assets a ON i.asset_id = a.asset_id
LEFT JOIN asset_types at ON a.asset_type_id = at.asset_type_id
WHERE i.deleted_at IS NULL AND a.deleted_at IS NULL;

-- Grant access
GRANT SELECT ON public.tams360_inspections_app TO anon, authenticated, service_role;

-- Enable RLS
ALTER VIEW public.tams360_inspections_app SET (security_invoker = on);

-- ============================================================================
-- 3) INSPECTION COMPONENTS APP VIEW - Component-level details with template info
-- ============================================================================
CREATE OR REPLACE VIEW public.tams360_inspection_components_app AS
SELECT 
    ics.score_id,
    ics.inspection_id,
    i.asset_id,
    a.reference_number AS asset_ref,
    at.name AS asset_type_name,
    i.inspection_date,
    ics.component_order,
    COALESCE(ti.component_name, 'Component ' || ics.component_order) AS component_name,
    ti.what_to_inspect,
    ti.how_to_rate,
    ics.degree_value,
    ics.extent_value,
    ics.relevancy_value,
    ics.u_comp,
    ics.component_score AS component_ci,
    ics.component_notes,
    ics.component_defects,
    ics.quantity,
    ics.quantity_unit,
    ics.rate,
    ics.component_cost,
    ics.created_at,
    i.tenant_id,
    -- Photo references for this component
    (
        SELECT json_agg(json_build_object(
            'photo_id', photo_id,
            'photo_url', photo_url,
            'caption', caption
        ))
        FROM inspection_photos
        WHERE inspection_id = ics.inspection_id
        AND component_reference = ics.component_order::text
    ) AS photo_references
FROM inspection_component_scores ics
INNER JOIN inspections i ON ics.inspection_id = i.inspection_id
INNER JOIN assets a ON i.asset_id = a.asset_id
LEFT JOIN asset_types at ON a.asset_type_id = at.asset_type_id
LEFT JOIN LATERAL (
    SELECT 
        ti.component_name,
        ti.what_to_inspect,
        ti.how_to_rate
    FROM asset_component_template_items ti
    INNER JOIN asset_component_templates t ON ti.template_id = t.template_id
    WHERE t.asset_type_id = a.asset_type_id
    AND ti.component_order = ics.component_order
    LIMIT 1
) ti ON true
WHERE i.deleted_at IS NULL AND a.deleted_at IS NULL;

-- Grant access
GRANT SELECT ON public.tams360_inspection_components_app TO anon, authenticated, service_role;

-- Enable RLS
ALTER VIEW public.tams360_inspection_components_app SET (security_invoker = on);

-- ============================================================================
-- 4) MAINTENANCE APP VIEW - Complete maintenance records with asset info
-- ============================================================================
CREATE OR REPLACE VIEW public.tams360_maintenance_app AS
SELECT 
    m.maintenance_id,
    m.work_order_number,
    m.asset_id,
    a.reference_number AS asset_ref,
    a.asset_type_id,
    at.name AS asset_type_name,
    at.abbreviation AS asset_type_abbreviation,
    a.route_road,
    a.road_name,
    a.chainage_km,
    m.maintenance_type,
    m.description,
    m.status,
    m.priority,
    m.urgency_id,
    CASE 
        WHEN m.urgency_id = 1 THEN 'Low'
        WHEN m.urgency_id = 2 THEN 'Medium'
        WHEN m.urgency_id = 3 THEN 'High'
        WHEN m.urgency_id = 4 THEN 'Immediate'
        ELSE 'Not Set'
    END AS priority_label,
    m.scheduled_date,
    m.completed_date,
    m.estimated_cost,
    m.actual_cost,
    COALESCE(m.actual_cost, 0) - COALESCE(m.estimated_cost, 0) AS cost_variance,
    m.contractor_name,
    m.notes,
    m.created_at,
    m.updated_at,
    m.tenant_id,
    -- Days calculations
    CASE 
        WHEN m.status = 'completed' AND m.completed_date IS NOT NULL AND m.created_at IS NOT NULL
        THEN EXTRACT(DAY FROM (m.completed_date::timestamp - m.created_at::timestamp))::integer
        WHEN m.status != 'completed' AND m.created_at IS NOT NULL
        THEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP - m.created_at::timestamp))::integer
        ELSE NULL
    END AS days_open,
    CASE 
        WHEN m.scheduled_date IS NOT NULL AND m.scheduled_date < CURRENT_DATE AND m.status != 'completed'
        THEN EXTRACT(DAY FROM (CURRENT_DATE - m.scheduled_date))::integer
        ELSE 0
    END AS days_overdue
FROM maintenance_records m
INNER JOIN assets a ON m.asset_id = a.asset_id
LEFT JOIN asset_types at ON a.asset_type_id = at.asset_type_id
WHERE m.deleted_at IS NULL AND a.deleted_at IS NULL;

-- Grant access
GRANT SELECT ON public.tams360_maintenance_app TO anon, authenticated, service_role;

-- Enable RLS
ALTER VIEW public.tams360_maintenance_app SET (security_invoker = on);

-- ============================================================================
-- 5) DASHBOARD VIEW: CI DISTRIBUTION
-- ============================================================================
CREATE OR REPLACE VIEW public.tams360_ci_distribution_v AS
SELECT 
    tenant_id,
    ci_band,
    COUNT(*) AS count,
    ROUND(AVG(conditional_index), 1) AS avg_ci,
    SUM(total_remedial_cost) AS total_remedial_cost
FROM inspections
WHERE deleted_at IS NULL
  AND ci_band IS NOT NULL
GROUP BY tenant_id, ci_band;

-- Grant access
GRANT SELECT ON public.tams360_ci_distribution_v TO anon, authenticated, service_role;

-- Enable RLS
ALTER VIEW public.tams360_ci_distribution_v SET (security_invoker = on);

-- ============================================================================
-- 6) DASHBOARD VIEW: URGENCY SUMMARY
-- ============================================================================
CREATE OR REPLACE VIEW public.tams360_urgency_summary_v AS
SELECT 
    tenant_id,
    calculated_urgency,
    COUNT(*) AS count,
    ROUND(AVG(conditional_index), 1) AS avg_ci,
    SUM(total_remedial_cost) AS total_remedial_cost
FROM inspections
WHERE deleted_at IS NULL
  AND calculated_urgency IS NOT NULL
GROUP BY tenant_id, calculated_urgency;

-- Grant access
GRANT SELECT ON public.tams360_urgency_summary_v TO anon, authenticated, service_role;

-- Enable RLS
ALTER VIEW public.tams360_urgency_summary_v SET (security_invoker = on);

-- ============================================================================
-- 7) DASHBOARD VIEW: ASSET TYPE SUMMARY
-- ============================================================================
CREATE OR REPLACE VIEW public.tams360_asset_type_summary_v AS
SELECT 
    a.tenant_id,
    a.asset_type_id,
    at.name AS asset_type_name,
    COUNT(DISTINCT a.asset_id) AS total_assets,
    ROUND(AVG(li.conditional_index), 1) AS avg_ci,
    COUNT(DISTINCT CASE WHEN li.calculated_urgency IN ('High', 'Immediate') THEN a.asset_id END) AS critical_count,
    SUM(COALESCE(li.total_remedial_cost, 0)) AS total_remedial_cost
FROM assets a
LEFT JOIN asset_types at ON a.asset_type_id = at.asset_type_id
LEFT JOIN LATERAL (
    SELECT conditional_index, calculated_urgency, total_remedial_cost
    FROM inspections
    WHERE asset_id = a.asset_id
    ORDER BY inspection_date DESC
    LIMIT 1
) li ON true
WHERE a.deleted_at IS NULL
GROUP BY a.tenant_id, a.asset_type_id, at.name;

-- Grant access
GRANT SELECT ON public.tams360_asset_type_summary_v TO anon, authenticated, service_role;

-- Enable RLS
ALTER VIEW public.tams360_asset_type_summary_v SET (security_invoker = on);

-- ============================================================================
-- 8) DASHBOARD VIEW: INSPECTOR PERFORMANCE
-- ============================================================================
CREATE OR REPLACE VIEW public.tams360_inspector_performance_v AS
SELECT 
    tenant_id,
    inspector_id,
    inspector_name,
    COUNT(*) AS inspections_count,
    ROUND(AVG(conditional_index), 1) AS avg_ci,
    COUNT(CASE WHEN calculated_urgency IN ('High', 'Immediate') THEN 1 END) AS high_urgency_found,
    SUM(total_remedial_cost) AS total_remedial_value,
    MIN(inspection_date) AS first_inspection_date,
    MAX(inspection_date) AS last_inspection_date
FROM inspections
WHERE deleted_at IS NULL
  AND inspector_name IS NOT NULL
GROUP BY tenant_id, inspector_id, inspector_name;

-- Grant access
GRANT SELECT ON public.tams360_inspector_performance_v TO anon, authenticated, service_role;

-- Enable RLS
ALTER VIEW public.tams360_inspector_performance_v SET (security_invoker = on);

-- ============================================================================
-- INDEXES for performance (optional but recommended)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_assets_tenant_type ON assets(tenant_id, asset_type_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inspections_tenant_date ON inspections(tenant_id, inspection_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inspections_asset ON inspections(asset_id, inspection_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_maintenance_tenant_status ON maintenance_records(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_maintenance_asset ON maintenance_records(asset_id, created_at DESC) WHERE deleted_at IS NULL;

-- ============================================================================
-- COMMENTS for documentation
-- ============================================================================
COMMENT ON VIEW public.tams360_assets_app IS 'Complete asset information with latest inspection data - tenant-safe via RLS';
COMMENT ON VIEW public.tams360_inspections_app IS 'Complete inspection data with asset details - tenant-safe via RLS';
COMMENT ON VIEW public.tams360_inspection_components_app IS 'Component-level inspection details with template names - tenant-safe via RLS';
COMMENT ON VIEW public.tams360_maintenance_app IS 'Complete maintenance records with asset details and calculations - tenant-safe via RLS';
COMMENT ON VIEW public.tams360_ci_distribution_v IS 'Dashboard: CI distribution by band - tenant-safe via RLS';
COMMENT ON VIEW public.tams360_urgency_summary_v IS 'Dashboard: Urgency distribution summary - tenant-safe via RLS';
COMMENT ON VIEW public.tams360_asset_type_summary_v IS 'Dashboard: Asset type health summary - tenant-safe via RLS';
COMMENT ON VIEW public.tams360_inspector_performance_v IS 'Dashboard: Inspector performance metrics - tenant-safe via RLS';
