-- ========================================================================
-- SQL Script: Update HN Consulting Assets with Pietermaritzburg Coordinates
-- ========================================================================
-- This script updates all HN Consulting Engineers (Pty) Ltd assets with 
-- realistic GPS coordinates along roads in Pietermaritzburg:
--   - R403: East-west route through Pietermaritzburg
--   - M70 (Richmond Road): South from Pietermaritzburg
--   - R33: Northeast from Pietermaritzburg
-- ========================================================================

-- First, let's verify the HN tenant exists
-- Run this to check:
-- SELECT * FROM tams360.tenants WHERE name ILIKE '%HN%Consulting%';

-- Update HN assets with coordinates along R403, M70, and R33
-- This script distributes assets evenly across the three roads

WITH hn_tenant AS (
  -- Get HN Consulting tenant ID
  SELECT tenant_id 
  FROM tams360.tenants 
  WHERE name ILIKE '%HN%Consulting%Engineers%'
  LIMIT 1
),
hn_assets AS (
  -- Get all HN assets
  SELECT asset_id, ROW_NUMBER() OVER (ORDER BY asset_id) as row_num
  FROM tams360.assets
  WHERE tenant_id = (SELECT tenant_id FROM hn_tenant)
),
-- Generate R403 coordinates (70 points, east-west through Pietermaritzburg)
r403_coords AS (
  SELECT 
    ROW_NUMBER() OVER (ORDER BY n) as coord_num,
    'R403' as road_number,
    'HN Test Route' as road_name,
    -29.6050 + ((n - 1) / 69.0) * (-29.6100 - (-29.6050)) + (random() - 0.5) * 0.0005 as gps_lat,
    30.3500 + ((n - 1) / 69.0) * (30.4200 - 30.3500) + (random() - 0.5) * 0.0005 as gps_lng
  FROM generate_series(1, 70) as n
),
-- Generate M70 coordinates (70 points, south from Pietermaritzburg)
m70_coords AS (
  SELECT 
    ROW_NUMBER() OVER (ORDER BY n) + 70 as coord_num,
    'M70' as road_number,
    'HN Test Route' as road_name,
    -29.6050 + ((n - 1) / 69.0) * (-29.7000 - (-29.6050)) + (random() - 0.5) * 0.0005 as gps_lat,
    30.3900 + ((n - 1) / 69.0) * (30.3850 - 30.3900) + (random() - 0.5) * 0.0005 as gps_lng
  FROM generate_series(1, 70) as n
),
-- Generate R33 coordinates (60 points, northeast from Pietermaritzburg)
r33_coords AS (
  SELECT 
    ROW_NUMBER() OVER (ORDER BY n) + 140 as coord_num,
    'R33' as road_number,
    'HN Test Route' as road_name,
    -29.6100 + ((n - 1) / 59.0) * (-29.5200 - (-29.6100)) + (random() - 0.5) * 0.0005 as gps_lat,
    30.3950 + ((n - 1) / 59.0) * (30.4800 - 30.3950) + (random() - 0.5) * 0.0005 as gps_lng
  FROM generate_series(1, 60) as n
),
-- Combine all coordinates
all_coords AS (
  SELECT * FROM r403_coords
  UNION ALL
  SELECT * FROM m70_coords
  UNION ALL
  SELECT * FROM r33_coords
),
-- Match assets to coordinates (cycling through if more assets than coords)
asset_coords AS (
  SELECT 
    a.asset_id,
    c.gps_lat,
    c.gps_lng,
    c.road_number,
    c.road_name
  FROM hn_assets a
  CROSS JOIN LATERAL (
    SELECT * FROM all_coords
    WHERE coord_num = ((a.row_num - 1) % 200) + 1
  ) c
)
-- Update the assets with new coordinates
UPDATE tams360.assets a
SET 
  gps_lat = ac.gps_lat,
  gps_lng = ac.gps_lng,
  road_number = ac.road_number,
  road_name = ac.road_name,
  updated_at = NOW()
FROM asset_coords ac
WHERE a.asset_id = ac.asset_id;

-- Verify the update
SELECT 
  COUNT(*) as total_updated,
  road_number,
  MIN(gps_lat) as min_lat,
  MAX(gps_lat) as max_lat,
  MIN(gps_lng) as min_lng,
  MAX(gps_lng) as max_lng
FROM tams360.assets
WHERE tenant_id = (SELECT tenant_id FROM tams360.tenants WHERE name ILIKE '%HN%Consulting%Engineers%' LIMIT 1)
GROUP BY road_number
ORDER BY road_number;

-- ========================================================================
-- INSTRUCTIONS:
-- ========================================================================
-- 1. Connect to your Supabase database using the SQL Editor
-- 2. Copy and paste this entire script
-- 3. Execute the script
-- 4. Check the verification query results at the bottom
-- 5. Refresh your TAMS360 application to see the updated coordinates on the map
-- ========================================================================

-- ========================================================================
-- ROLLBACK (if needed):
-- ========================================================================
-- If you need to revert changes, you can set coordinates back to NULL:
-- 
-- UPDATE tams360.assets
-- SET gps_lat = NULL, gps_lng = NULL, road_number = NULL, road_name = NULL
-- WHERE tenant_id = (SELECT tenant_id FROM tams360.tenants WHERE name ILIKE '%HN%Consulting%Engineers%' LIMIT 1);
-- ========================================================================
