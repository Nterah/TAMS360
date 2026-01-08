-- ============================================================================
-- TAMS360 Dashboard Analytics Views Migration
-- ============================================================================
-- This migration creates the missing public views for dashboard analytics
-- Run this script in your Supabase SQL Editor
-- ============================================================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS public.tams360_ci_distribution_v CASCADE;
DROP VIEW IF EXISTS public.tams360_urgency_summary_v CASCADE;
DROP VIEW IF EXISTS public.tams360_asset_type_summary_v CASCADE;

-- ============================================================================
-- CI Distribution View
-- ============================================================================
-- Groups assets by CI bands and calculates aggregates
CREATE OR REPLACE VIEW public.tams360_ci_distribution_v AS
WITH ci_data AS (
  SELECT 
    CASE 
      WHEN i.conditional_index >= 80 THEN '80-100 (Excellent)'
      WHEN i.conditional_index >= 60 THEN '60-79 (Good)'
      WHEN i.conditional_index >= 40 THEN '40-59 (Fair)'
      WHEN i.conditional_index >= 20 THEN '20-39 (Poor)'
      ELSE '0-19 (Critical)'
    END as ci_band,
    a.asset_id,
    i.conditional_index,
    COALESCE(a.purchase_price, 0) as purchase_price
  FROM tams360.inspections i
  INNER JOIN tams360.assets a ON i.asset_id = a.asset_id
  WHERE i.conditional_index IS NOT NULL
    AND i.inspection_date = (
      SELECT MAX(i2.inspection_date)
      FROM tams360.inspections i2
      WHERE i2.asset_id = a.asset_id
    )
)
SELECT 
  ci_band,
  COUNT(DISTINCT asset_id) as asset_count,
  ROUND(AVG(conditional_index)::numeric, 2) as avg_ci,
  ROUND(SUM(purchase_price)::numeric, 2) as total_value
FROM ci_data
GROUP BY ci_band
ORDER BY 
  CASE ci_band
    WHEN '80-100 (Excellent)' THEN 1
    WHEN '60-79 (Good)' THEN 2
    WHEN '40-59 (Fair)' THEN 3
    WHEN '20-39 (Poor)' THEN 4
    ELSE 5
  END;

-- ============================================================================
-- Urgency Summary View
-- ============================================================================
-- Summarizes inspection counts by calculated urgency level
CREATE OR REPLACE VIEW public.tams360_urgency_summary_v AS
SELECT 
  i.calculated_urgency,
  COUNT(*) as inspection_count,
  COUNT(DISTINCT i.asset_id) as asset_count,
  ROUND(AVG(i.conditional_index)::numeric, 2) as avg_ci,
  ROUND(AVG(i.deru_value)::numeric, 4) as avg_deru,
  ROUND(SUM(i.total_remedial_cost)::numeric, 2) as total_remedial_cost
FROM tams360.inspections i
WHERE i.calculated_urgency IS NOT NULL
  AND i.inspection_date = (
    SELECT MAX(i2.inspection_date)
    FROM tams360.inspections i2
    WHERE i2.asset_id = i.asset_id
  )
GROUP BY i.calculated_urgency
ORDER BY i.calculated_urgency DESC;

-- ============================================================================
-- Asset Type Summary View
-- ============================================================================
-- Provides aggregated statistics by asset type
CREATE OR REPLACE VIEW public.tams360_asset_type_summary_v AS
SELECT 
  at.name as asset_type_name,
  at.abbreviation,
  COUNT(DISTINCT a.asset_id) as asset_count,
  COUNT(DISTINCT i.inspection_id) as inspection_count,
  ROUND(AVG(i.conditional_index)::numeric, 2) as avg_ci,
  ROUND(AVG(i.deru_value)::numeric, 4) as avg_deru,
  ROUND(SUM(COALESCE(a.purchase_price, 0))::numeric, 2) as total_value,
  ROUND(SUM(COALESCE(i.total_remedial_cost, 0))::numeric, 2) as total_remedial_cost
FROM tams360.asset_types at
LEFT JOIN tams360.assets a ON at.asset_type_id = a.asset_type_id
LEFT JOIN tams360.inspections i ON a.asset_id = i.asset_id
  AND i.inspection_date = (
    SELECT MAX(i2.inspection_date)
    FROM tams360.inspections i2
    WHERE i2.asset_id = a.asset_id
  )
WHERE at.is_active = true
GROUP BY at.asset_type_id, at.name, at.abbreviation
ORDER BY asset_count DESC;

-- ============================================================================
-- Grant Permissions
-- ============================================================================
-- Grant SELECT permission to authenticated users
GRANT SELECT ON public.tams360_ci_distribution_v TO authenticated;
GRANT SELECT ON public.tams360_urgency_summary_v TO authenticated;
GRANT SELECT ON public.tams360_asset_type_summary_v TO authenticated;

GRANT SELECT ON public.tams360_ci_distribution_v TO anon;
GRANT SELECT ON public.tams360_urgency_summary_v TO anon;
GRANT SELECT ON public.tams360_asset_type_summary_v TO anon;

-- ============================================================================
-- Verify Views Created Successfully
-- ============================================================================
SELECT 'CI Distribution View:' as check_name, COUNT(*) as row_count FROM public.tams360_ci_distribution_v
UNION ALL
SELECT 'Urgency Summary View:', COUNT(*) FROM public.tams360_urgency_summary_v
UNION ALL
SELECT 'Asset Type Summary View:', COUNT(*) FROM public.tams360_asset_type_summary_v;
