-- ============================================================================
-- COPY AND PASTE THIS ENTIRE QUERY - RUN IT IN ONE GO
-- ============================================================================

-- Show columns in tams360_user_profiles_v
SELECT 
    'tams360_user_profiles_v' as view_name,
    column_name,
    data_type,
    CASE 
        WHEN column_name = 'tenant_id' THEN '✅ CORRECT - backend needs this exact name'
        WHEN column_name ILIKE '%tenant%' THEN '⚠️ CLOSE - but wrong name'
        WHEN column_name ILIKE '%org%' THEN '⚠️ WRONG NAME - needs to be tenant_id'
        WHEN column_name IN ('id', 'email', 'role', 'name', 'status') THEN '✅ Good'
        ELSE ''
    END as notes
FROM information_schema.columns
WHERE table_name = 'tams360_user_profiles_v'
  AND table_schema = 'public'
ORDER BY ordinal_position

UNION ALL

-- Show columns in tams360_assets_v
SELECT 
    'tams360_assets_v',
    column_name,
    data_type,
    CASE 
        WHEN column_name = 'tenant_id' THEN '✅ CORRECT - backend needs this'
        WHEN column_name ILIKE '%tenant%' THEN '⚠️ CLOSE - but wrong name'
        WHEN column_name ILIKE '%org%' THEN '⚠️ WRONG NAME - needs to be tenant_id'
        WHEN column_name = 'gps_lat' THEN '✅ CORRECT - backend needs this'
        WHEN column_name = 'gps_lng' THEN '✅ CORRECT - backend needs this'
        WHEN column_name ILIKE '%lat%' THEN '⚠️ WRONG NAME - needs to be gps_lat'
        WHEN column_name ILIKE '%lng%' OR column_name ILIKE '%lon%' THEN '⚠️ WRONG NAME - needs to be gps_lng'
        WHEN column_name IN ('asset_id', 'asset_ref', 'asset_type_id') THEN '✅ Good'
        ELSE ''
    END
FROM information_schema.columns
WHERE table_name = 'tams360_assets_v'
  AND table_schema = 'public'
ORDER BY 
    CASE WHEN column_name IN ('asset_id', 'tenant_id', 'gps_lat', 'gps_lng') THEN 0 ELSE 1 END,
    ordinal_position;
