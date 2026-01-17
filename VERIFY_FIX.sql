-- ============================================================================
-- VERIFY THE FIX - Check Asset Type Names
-- ============================================================================

-- This query shows all unique asset types in your tenant
-- After the fix, ALL these types should show on the map!

SELECT 
    tenant_id,
    asset_type_name,
    COUNT(*) as asset_count,
    COUNT(CASE WHEN gps_lat IS NOT NULL AND gps_lng IS NOT NULL THEN 1 END) as mappable_count
FROM tams360_assets_v
WHERE tenant_id = '102e622e-8efb-46e5-863b-9bc4b3856ea8'  -- Your tenant_id
GROUP BY tenant_id, asset_type_name
ORDER BY asset_count DESC;

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================

/*

BEFORE THE FIX:
- If you had "Signage" → Would NOT show on map ❌
- Only hardcoded types would show

AFTER THE FIX:
- ALL asset types show on map ✅
- No matter what they're called!

Example output:
| tenant_id | asset_type_name | asset_count | mappable_count |
|-----------|-----------------|-------------|----------------|
| 102e...   | Signage         | 202         | 202            |

All 202 assets should now be visible! 🎉

*/
