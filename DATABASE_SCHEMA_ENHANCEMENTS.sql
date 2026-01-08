-- ============================================================================
-- TAMS360 ENHANCEMENTS - Component-Based Inspections & Management Indicators
-- Version: 1.1.0
-- Date: December 29, 2024
-- ============================================================================

-- These tables extend the existing tams360 schema without breaking current functionality

-- ============================================================================
-- ENHANCEMENT 1: Component Templates per Asset Type
-- ============================================================================

-- Main template definition (one per asset type)
CREATE TABLE IF NOT EXISTS tams360.asset_component_templates (
    template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_type_id UUID NOT NULL, -- FK to tams360.asset_types
    name VARCHAR(200) NOT NULL,
    description TEXT,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(asset_type_id, version)
);

CREATE INDEX idx_tams360_component_templates_type ON tams360.asset_component_templates(asset_type_id);

COMMENT ON TABLE tams360.asset_component_templates IS 'Inspection component templates per asset type (e.g., Signage has 6 components)';

-- Component items within each template (2-6 components per asset type)
CREATE TABLE IF NOT EXISTS tams360.asset_component_template_items (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES tams360.asset_component_templates(template_id) ON DELETE CASCADE,
    component_name VARCHAR(200) NOT NULL,
    component_order INTEGER NOT NULL,
    what_to_inspect TEXT, -- "Within 1 km / per asset" guidance
    
    -- D - DEGREE rubric definitions (JSONB for flexibility)
    degree_rubric JSONB NOT NULL,
    -- Example: {"1": "Minor damage", "2": "Moderate", "3": "Severe", "4": "Critical", "X": "Not present", "U": "Unable to inspect"}
    
    -- E - EXTENT rubric definitions
    extent_rubric JSONB NOT NULL,
    -- Example: {"1": "< 10%", "2": "10-30%", "3": "30-60%", "4": "> 60%"}
    
    -- R - RELEVANCY rubric definitions
    relevancy_rubric JSONB NOT NULL,
    -- Example: {"1": "Low importance", "2": "Medium", "3": "High", "4": "Critical"}
    
    default_quantity DECIMAL(10,2),
    quantity_unit VARCHAR(50), -- "m", "m²", "each", "km"
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(template_id, component_order)
);

CREATE INDEX idx_tams360_template_items_template ON tams360.asset_component_template_items(template_id);

COMMENT ON TABLE tams360.asset_component_template_items IS 'Individual inspection components (Foundation, Post, Face, etc.) with D/E/R rubrics';

-- ============================================================================
-- ENHANCEMENT 2: Inspection Component Scores (per inspection)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tams360.inspection_component_scores (
    score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL, -- FK to tams360.inspections
    item_id UUID NOT NULL REFERENCES tams360.asset_component_template_items(item_id),
    component_name VARCHAR(200) NOT NULL, -- Denormalized for reporting
    
    -- Selected scores
    degree_value VARCHAR(10), -- "1", "2", "3", "4", "X", "U"
    extent_value VARCHAR(10),
    relevancy_value VARCHAR(10),
    
    -- Calculated values
    component_score DECIMAL(10,3), -- D × E × R (or special logic for X/U)
    
    -- Optional overrides
    quantity DECIMAL(10,2),
    quantity_unit VARCHAR(50),
    rate DECIMAL(12,2), -- Cost rate based on CI band
    component_cost DECIMAL(12,2), -- quantity × rate
    
    -- Additional data
    component_notes TEXT,
    photo_references TEXT[], -- Array of photo IDs
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(inspection_id, item_id)
);

CREATE INDEX idx_tams360_component_scores_inspection ON tams360.inspection_component_scores(inspection_id);
CREATE INDEX idx_tams360_component_scores_item ON tams360.inspection_component_scores(item_id);

COMMENT ON TABLE tams360.inspection_component_scores IS 'D/E/R scores per component per inspection, with remedial costing';

-- ============================================================================
-- ENHANCEMENT 2: CI/DERU/Urgency Calculations (extend inspections)
-- ============================================================================

-- Extend existing inspections table with calculated indicators
ALTER TABLE tams360.inspections 
ADD COLUMN IF NOT EXISTS conditional_index DECIMAL(10,3),
ADD COLUMN IF NOT EXISTS deru_value DECIMAL(10,3),
ADD COLUMN IF NOT EXISTS calculated_urgency VARCHAR(50),
ADD COLUMN IF NOT EXISTS total_remedial_cost DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS ci_band VARCHAR(20), -- "Excellent", "Good", "Fair", "Poor"
ADD COLUMN IF NOT EXISTS calculation_metadata JSONB; -- Store breakdown for audit

COMMENT ON COLUMN tams360.inspections.conditional_index IS 'Conditional Index - multi-step calculation from D/E/R scores';
COMMENT ON COLUMN tams360.inspections.deru_value IS 'DERU value derived from component scores';
COMMENT ON COLUMN tams360.inspections.calculated_urgency IS 'Auto-calculated urgency level based on CI/DERU';
COMMENT ON COLUMN tams360.inspections.total_remedial_cost IS 'Sum of all component remedial costs';

-- ============================================================================
-- ENHANCEMENT 3: Asset Valuation & Depreciation
-- ============================================================================

-- Extend assets table with financial indicators
ALTER TABLE tams360.assets
ADD COLUMN IF NOT EXISTS procurement_date DATE,
ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS useful_life_years INTEGER,
ADD COLUMN IF NOT EXISTS depreciation_period_years INTEGER,
ADD COLUMN IF NOT EXISTS current_asset_value DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS replacement_value DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS salvage_value DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS last_valuation_date DATE,
ADD COLUMN IF NOT EXISTS valuation_method VARCHAR(100); -- "Straight-line", "Declining balance", "Market"

COMMENT ON COLUMN tams360.assets.purchase_price IS 'Original purchase/installation cost';
COMMENT ON COLUMN tams360.assets.useful_life_years IS 'Expected useful life for depreciation';
COMMENT ON COLUMN tams360.assets.current_asset_value IS 'Current book value (purchase - accumulated depreciation)';
COMMENT ON COLUMN tams360.assets.replacement_value IS 'Current replacement cost';

-- Latest CI/DERU from most recent inspection (for fast dashboard queries)
ALTER TABLE tams360.assets
ADD COLUMN IF NOT EXISTS latest_ci DECIMAL(10,3),
ADD COLUMN IF NOT EXISTS latest_deru DECIMAL(10,3),
ADD COLUMN IF NOT EXISTS latest_ci_band VARCHAR(20),
ADD COLUMN IF NOT EXISTS latest_inspection_date TIMESTAMPTZ;

COMMENT ON COLUMN tams360.assets.latest_ci IS 'Most recent Conditional Index (cached from latest inspection)';

-- ============================================================================
-- ENHANCEMENT 5: Ownership & Responsibility
-- ============================================================================

ALTER TABLE tams360.assets
ADD COLUMN IF NOT EXISTS owner_entity VARCHAR(100), -- "client", "third_party", "municipality", "unknown"
ADD COLUMN IF NOT EXISTS maintenance_responsibility VARCHAR(100), -- "client", "contractor", "municipality", "third_party"
ADD COLUMN IF NOT EXISTS ownership_confidence VARCHAR(50), -- "confirmed", "suspected", "disputed"
ADD COLUMN IF NOT EXISTS linked_nearby_asset_id UUID, -- Reference to related asset
ADD COLUMN IF NOT EXISTS ownership_notes TEXT;

CREATE INDEX idx_tams360_assets_owner ON tams360.assets(owner_entity);
CREATE INDEX idx_tams360_assets_responsibility ON tams360.assets(maintenance_responsibility);

COMMENT ON COLUMN tams360.assets.owner_entity IS 'Legal owner of the asset';
COMMENT ON COLUMN tams360.assets.maintenance_responsibility IS 'Entity responsible for maintenance';

-- ============================================================================
-- ENHANCEMENT 4: Historical Analytics Support Tables
-- ============================================================================

-- Materialized view for replacement frequency analysis
CREATE MATERIALIZED VIEW IF NOT EXISTS tams360.mv_asset_replacement_frequency AS
SELECT 
    a.asset_id,
    a.asset_ref,
    at.name as asset_type,
    COUNT(m.maintenance_id) as replacement_count,
    MIN(m.completed_date) as first_replacement,
    MAX(m.completed_date) as last_replacement,
    (MAX(m.completed_date) - MIN(m.completed_date)) / NULLIF(COUNT(m.maintenance_id) - 1, 0) as avg_days_between_replacements,
    SUM(m.actual_cost) as total_replacement_cost
FROM tams360.assets a
JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id
LEFT JOIN tams360.maintenance_records m ON a.asset_id = m.asset_id 
    AND m.maintenance_type = 'Replace' 
    AND m.status = 'Completed'
GROUP BY a.asset_id, a.asset_ref, at.name
HAVING COUNT(m.maintenance_id) > 0;

CREATE UNIQUE INDEX ON tams360.mv_asset_replacement_frequency(asset_id);

COMMENT ON MATERIALIZED VIEW tams360.mv_asset_replacement_frequency IS 'Tracks frequently replaced assets for management decisions';

-- Maintenance duration tracking (scheduled to completed)
CREATE MATERIALIZED VIEW IF NOT EXISTS tams360.mv_maintenance_duration_analysis AS
SELECT 
    m.maintenance_id,
    m.asset_id,
    a.asset_ref,
    at.name as asset_type,
    m.scheduled_date,
    m.completed_date,
    u.response_time_days as target_days,
    (m.completed_date - m.scheduled_date) as actual_days,
    (m.completed_date - m.scheduled_date) - u.response_time_days as variance_days,
    CASE 
        WHEN (m.completed_date - m.scheduled_date) <= u.response_time_days THEN 'On Time'
        WHEN (m.completed_date - m.scheduled_date) <= u.response_time_days * 1.2 THEN 'Slightly Late'
        ELSE 'Overdue'
    END as performance_category,
    m.actual_cost
FROM tams360.maintenance_records m
JOIN tams360.assets a ON m.asset_id = a.asset_id
JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id
JOIN tams360.urgency_lookup u ON m.urgency_id = u.urgency_id
WHERE m.status = 'Completed' 
    AND m.completed_date IS NOT NULL 
    AND m.scheduled_date IS NOT NULL;

CREATE UNIQUE INDEX ON tams360.mv_maintenance_duration_analysis(maintenance_id);

COMMENT ON MATERIALIZED VIEW tams360.mv_maintenance_duration_analysis IS 'Tracks repairs that take too long vs target response times';

-- Cost variance tracking
CREATE MATERIALIZED VIEW IF NOT EXISTS tams360.mv_cost_variance_analysis AS
SELECT 
    at.name as asset_type,
    DATE_TRUNC('month', m.completed_date) as month,
    COUNT(*) as work_order_count,
    SUM(m.estimated_cost) as total_estimated,
    SUM(m.actual_cost) as total_actual,
    AVG(m.actual_cost - m.estimated_cost) as avg_variance,
    STDDEV(m.actual_cost - m.estimated_cost) as variance_stddev,
    MIN(m.actual_cost - m.estimated_cost) as min_variance,
    MAX(m.actual_cost - m.estimated_cost) as max_variance,
    COUNT(CASE WHEN ABS(m.actual_cost - m.estimated_cost) > m.estimated_cost * 0.5 THEN 1 END) as high_variance_count
FROM tams360.maintenance_records m
JOIN tams360.assets a ON m.asset_id = a.asset_id
JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id
WHERE m.status = 'Completed'
    AND m.actual_cost IS NOT NULL
    AND m.estimated_cost IS NOT NULL
    AND m.completed_date >= NOW() - INTERVAL '24 months'
GROUP BY at.name, DATE_TRUNC('month', m.completed_date);

CREATE INDEX ON tams360.mv_cost_variance_analysis(asset_type, month);

COMMENT ON MATERIALIZED VIEW tams360.mv_cost_variance_analysis IS 'Identifies unpredictable costs and variance patterns';

-- ============================================================================
-- CI/DERU Calculation Functions
-- ============================================================================

-- Function to calculate CI from component scores
CREATE OR REPLACE FUNCTION tams360.calculate_conditional_index(p_inspection_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    v_ci DECIMAL;
    v_total_score DECIMAL;
    v_component_count INTEGER;
    v_weighted_sum DECIMAL;
BEGIN
    -- Calculate weighted average of D×E×R scores
    -- Exclude X (not present) and U (unable to inspect)
    SELECT 
        SUM(component_score),
        COUNT(*),
        SUM(component_score * COALESCE(
            CASE relevancy_value 
                WHEN '4' THEN 2.0
                WHEN '3' THEN 1.5
                WHEN '2' THEN 1.0
                WHEN '1' THEN 0.5
                ELSE 1.0
            END, 1.0))
    INTO v_total_score, v_component_count, v_weighted_sum
    FROM tams360.inspection_component_scores
    WHERE inspection_id = p_inspection_id
        AND degree_value NOT IN ('X', 'U')
        AND degree_value IS NOT NULL;
    
    IF v_component_count = 0 THEN
        RETURN NULL;
    END IF;
    
    -- CI formula: weighted average normalized to 0-100 scale
    v_ci := (v_weighted_sum / (v_component_count * 64.0)) * 100.0; -- 64 = max (4×4×4)
    
    RETURN ROUND(v_ci, 2);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION tams360.calculate_conditional_index IS 'Calculates Conditional Index from D×E×R component scores';

-- Function to calculate DERU
CREATE OR REPLACE FUNCTION tams360.calculate_deru(p_inspection_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    v_deru DECIMAL;
    v_ci DECIMAL;
BEGIN
    -- Get CI first
    SELECT conditional_index INTO v_ci
    FROM tams360.inspections
    WHERE inspection_id = p_inspection_id;
    
    IF v_ci IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- DERU formula (example - adjust based on client specification)
    -- DERU = (100 - CI) × urgency_factor
    v_deru := (100.0 - v_ci) * 1.5;
    
    RETURN ROUND(v_deru, 2);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION tams360.calculate_deru IS 'Calculates DERU value from Conditional Index';

-- Function to determine CI band
CREATE OR REPLACE FUNCTION tams360.get_ci_band(p_ci DECIMAL)
RETURNS VARCHAR AS $$
BEGIN
    IF p_ci IS NULL THEN RETURN NULL; END IF;
    IF p_ci >= 80 THEN RETURN 'Excellent'; END IF;
    IF p_ci >= 60 THEN RETURN 'Good'; END IF;
    IF p_ci >= 40 THEN RETURN 'Fair'; END IF;
    RETURN 'Poor';
END;
$$ LANGUAGE plpgsql;

-- Function to calculate urgency from CI
CREATE OR REPLACE FUNCTION tams360.calculate_urgency_from_ci(p_ci DECIMAL)
RETURNS VARCHAR AS $$
BEGIN
    IF p_ci IS NULL THEN RETURN NULL; END IF;
    IF p_ci < 40 THEN RETURN 'Immediate'; END IF; -- Poor condition
    IF p_ci < 60 THEN RETURN 'High'; END IF; -- Fair condition
    IF p_ci < 80 THEN RETURN 'Medium'; END IF; -- Good condition
    RETURN 'Low'; -- Excellent condition
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate CI/DERU when component scores are saved
CREATE OR REPLACE FUNCTION tams360.trigger_calculate_inspection_indicators()
RETURNS TRIGGER AS $$
DECLARE
    v_ci DECIMAL;
    v_deru DECIMAL;
    v_band VARCHAR;
    v_urgency VARCHAR;
    v_total_cost DECIMAL;
BEGIN
    -- Recalculate CI
    v_ci := tams360.calculate_conditional_index(NEW.inspection_id);
    v_band := tams360.get_ci_band(v_ci);
    v_deru := tams360.calculate_deru(NEW.inspection_id);
    v_urgency := tams360.calculate_urgency_from_ci(v_ci);
    
    -- Calculate total remedial cost
    SELECT COALESCE(SUM(component_cost), 0) INTO v_total_cost
    FROM tams360.inspection_component_scores
    WHERE inspection_id = NEW.inspection_id;
    
    -- Update inspection
    UPDATE tams360.inspections
    SET 
        conditional_index = v_ci,
        ci_band = v_band,
        deru_value = v_deru,
        calculated_urgency = v_urgency,
        total_remedial_cost = v_total_cost,
        updated_at = NOW()
    WHERE inspection_id = NEW.inspection_id;
    
    -- Update asset's latest CI/DERU
    UPDATE tams360.assets a
    SET 
        latest_ci = v_ci,
        latest_deru = v_deru,
        latest_ci_band = v_band,
        latest_inspection_date = (SELECT inspection_date FROM tams360.inspections WHERE inspection_id = NEW.inspection_id)
    FROM tams360.inspections i
    WHERE a.asset_id = i.asset_id 
        AND i.inspection_id = NEW.inspection_id
        AND (a.latest_inspection_date IS NULL OR i.inspection_date > a.latest_inspection_date);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_inspection_indicators ON tams360.inspection_component_scores;
CREATE TRIGGER trg_calculate_inspection_indicators
AFTER INSERT OR UPDATE ON tams360.inspection_component_scores
FOR EACH ROW
EXECUTE FUNCTION tams360.trigger_calculate_inspection_indicators();

-- ============================================================================
-- Refresh Materialized Views (run periodically via scheduled job)
-- ============================================================================

CREATE OR REPLACE FUNCTION tams360.refresh_analytics_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY tams360.mv_asset_replacement_frequency;
    REFRESH MATERIALIZED VIEW CONCURRENTLY tams360.mv_maintenance_duration_analysis;
    REFRESH MATERIALIZED VIEW CONCURRENTLY tams360.mv_cost_variance_analysis;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION tams360.refresh_analytics_views IS 'Refresh all analytics materialized views - run daily';

-- ============================================================================
-- Public Views for API Access
-- ============================================================================

CREATE OR REPLACE VIEW public.asset_component_templates AS 
SELECT * FROM tams360.asset_component_templates;

CREATE OR REPLACE VIEW public.asset_component_template_items AS 
SELECT * FROM tams360.asset_component_template_items;

CREATE OR REPLACE VIEW public.inspection_component_scores AS 
SELECT * FROM tams360.inspection_component_scores;

-- ============================================================================
-- Sample Data: Signage Component Template (as per client example)
-- ============================================================================

-- Insert Signage template
INSERT INTO tams360.asset_component_templates (template_id, asset_type_id, name, description, version)
SELECT 
    gen_random_uuid(),
    asset_type_id,
    'Signage Condition Assessment',
    'Inspector Guide: Signage Condition Assessment (One Sign at a Time)',
    1
FROM tams360.asset_types
WHERE name = 'Signage'
ON CONFLICT (asset_type_id, version) DO NOTHING;

-- Insert Signage component items (6 components)
WITH signage_template AS (
    SELECT template_id 
    FROM tams360.asset_component_templates t
    JOIN tams360.asset_types at ON t.asset_type_id = at.asset_type_id
    WHERE at.name = 'Signage' AND t.version = 1
    LIMIT 1
)
INSERT INTO tams360.asset_component_template_items 
(template_id, component_name, component_order, what_to_inspect, degree_rubric, extent_rubric, relevancy_rubric, quantity_unit)
SELECT 
    template_id,
    component,
    ord,
    what_to_inspect,
    degree::jsonb,
    extent::jsonb,
    relevancy::jsonb,
    unit
FROM signage_template,
LATERAL (VALUES
    (1, 'Foundation', 'Concrete base/footing condition',
     '{"1": "Minor cracks", "2": "Moderate damage", "3": "Severe damage", "4": "Structural failure", "X": "Not present", "U": "Unable to inspect"}',
     '{"1": "< 10% affected", "2": "10-30% affected", "3": "30-60% affected", "4": "> 60% affected"}',
     '{"1": "Low importance", "2": "Medium importance", "3": "High importance", "4": "Critical to function"}',
     'each'),
    (2, 'Holding Bolts/Base Plates', 'Anchor bolts and base plate integrity',
     '{"1": "Minor rust/looseness", "2": "Moderate corrosion", "3": "Severe corrosion/missing", "4": "Structural compromise", "X": "Not present", "U": "Unable to inspect"}',
     '{"1": "< 10% affected", "2": "10-30% affected", "3": "30-60% affected", "4": "> 60% affected"}',
     '{"1": "Low importance", "2": "Medium importance", "3": "High importance", "4": "Critical to function"}',
     'each'),
    (3, 'Post/Vertical Member', 'Sign post structural condition',
     '{"1": "Minor surface rust", "2": "Moderate corrosion/dents", "3": "Severe damage/lean", "4": "Collapse risk", "X": "Not present", "U": "Unable to inspect"}',
     '{"1": "< 10% affected", "2": "10-30% affected", "3": "30-60% affected", "4": "> 60% affected"}',
     '{"1": "Low importance", "2": "Medium importance", "3": "High importance", "4": "Critical to function"}',
     'each'),
    (4, 'Face/Panel', 'Sign face retroreflectivity and condition',
     '{"1": "Minor fading/scratches", "2": "Moderate damage/graffiti", "3": "Severe deterioration", "4": "Illegible", "X": "Not present", "U": "Unable to inspect"}',
     '{"1": "< 10% affected", "2": "10-30% affected", "3": "30-60% affected", "4": "> 60% affected"}',
     '{"1": "Low importance", "2": "Medium importance", "3": "High importance", "4": "Critical to function"}',
     'm²'),
    (5, 'Face Fasteners', 'Bolts/clips securing sign face',
     '{"1": "Minor looseness", "2": "Moderate corrosion/missing", "3": "Severely compromised", "4": "Sign unsecured", "X": "Not present", "U": "Unable to inspect"}',
     '{"1": "< 10% affected", "2": "10-30% affected", "3": "30-60% affected", "4": "> 60% affected"}',
     '{"1": "Low importance", "2": "Medium importance", "3": "High importance", "4": "Critical to function"}',
     'each'),
    (6, 'Nearby Vegetation', 'Vegetation obscuring sign visibility',
     '{"1": "Minor encroachment", "2": "Moderate obstruction", "3": "Severe obstruction", "4": "Sign hidden", "X": "Not present", "U": "Unable to inspect"}',
     '{"1": "< 10% visible", "2": "10-30% obscured", "3": "30-60% obscured", "4": "> 60% obscured"}',
     '{"1": "Low priority", "2": "Medium priority", "3": "High priority", "4": "Immediate action"}',
     'm')
) AS components(ord, component, what_to_inspect, degree, extent, relevancy, unit)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Grant Permissions
-- ============================================================================

GRANT SELECT ON tams360.asset_component_templates TO authenticated;
GRANT SELECT ON tams360.asset_component_template_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON tams360.inspection_component_scores TO authenticated;

GRANT SELECT ON public.asset_component_templates TO anon, authenticated;
GRANT SELECT ON public.asset_component_template_items TO anon, authenticated;
GRANT SELECT ON public.inspection_component_scores TO anon, authenticated;

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_inspections_ci ON tams360.inspections(conditional_index);
CREATE INDEX IF NOT EXISTS idx_inspections_ci_band ON tams360.inspections(ci_band);
CREATE INDEX IF NOT EXISTS idx_assets_latest_ci ON tams360.assets(latest_ci);
CREATE INDEX IF NOT EXISTS idx_assets_latest_ci_band ON tams360.assets(latest_ci_band);

-- ============================================================================
-- END OF SCHEMA ENHANCEMENTS
-- ============================================================================

-- To apply these changes, run this SQL file in Supabase SQL Editor
-- Then enable RLS policies as needed for new tables

-- Example RLS for component scores:
ALTER TABLE tams360.inspection_component_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read component scores" ON tams360.inspection_component_scores
    FOR SELECT USING (true);

CREATE POLICY "Authenticated insert component scores" ON tams360.inspection_component_scores
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated update own component scores" ON tams360.inspection_component_scores
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);