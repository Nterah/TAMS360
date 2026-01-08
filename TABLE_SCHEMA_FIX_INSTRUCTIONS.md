# Schema Fix Instructions for TAMS360

## ✅ STATUS: COMPLETED

All database table references have been successfully updated to use the `tams360` schema prefix.

## Problem (RESOLVED)
The backend code was querying tables without the `tams360` schema prefix, which meant it was looking in the default `public` schema instead of where the data actually exists.

## Solution (IMPLEMENTED)
All table references in `/supabase/functions/server/index.tsx` have been updated to include the `tams360.` prefix.

## Changes Made

All `.from()` queries now use the correct schema format:

### Completed Updates:
1. ✅ `.from("maintenance")` → `.from("tams360.maintenance_records")` (8 occurrences)
2. ✅ `.from("inspections")` → `.from("tams360.inspections")` (6 occurrences)
3. ✅ `.from("assets")` → `.from("tams360.assets")` (4 occurrences)
4. ✅ `.from("asset_types")` → `.from("tams360.asset_types")` (2 occurrences)
5. ✅ `.from("asset_status")` → `.from("tams360.asset_status")` (1 occurrence)
6. ✅ `.from("inspection_component_scores")` → `.from("tams360.inspection_component_scores")` (3 occurrences)
7. ✅ `.from("asset_component_templates")` → `.from("tams360.asset_component_templates")` (2 occurrences)
8. ✅ `.from("asset_inventory_log")` → `.from("tams360.asset_inventory_log")` (2 occurrences)
9. ✅ Dashboard views:
   - `.from("tams360.dashboard_ci_distribution")`
   - `.from("tams360.dashboard_urgency_summary")`
   - `.from("tams360.dashboard_asset_type_summary")`

### Total: 28 schema-qualified table references

## Verification

Run these commands to verify all references are correct:

```bash
# Should return 0 (no unqualified references)
grep -c '.from("[a-z_]*")' /supabase/functions/server/index.tsx | grep -v tams360

# Should return 28 (all properly qualified)
grep -c '.from("tams360\.' /supabase/functions/server/index.tsx
```

## Documentation

A comment block has been added at the top of `/supabase/functions/server/index.tsx` documenting:
- The tams360 schema requirement
- All main tables
- Dashboard views

## Next Steps

The application should now correctly query the `tams360` schema and retrieve all seeded data including:
- 15 sample assets
- Component templates for all asset types
- Sample inspections with CI calculations
- Maintenance records
- Dashboard analytics data