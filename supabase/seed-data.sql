-- TAMS360 Database Seed Script
-- This script seeds lookup tables and inspection component templates
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/YOUR_PROJECT/sql

-- Note: This assumes the schema 'tams360' and tables already exist
-- If not, you need to create them first via migrations

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

COMMIT;

-- Note: Component templates and items are inserted in separate script due to complexity
-- See seed-component-templates.sql for inspection component templates