# 🔧 MAINTENANCE RECORDS FIX

## Error Fixed
```
Error fetching maintenance records from DB: {
  code: "42703",
  details: null,
  hint: null,
  message: "column assets_1.tenant_id does not exist"
}
```

## Root Cause
The query was trying to join `maintenance_records` table with `assets` table using a JOIN with an inner relationship. PostgREST was creating an alias `assets_1` but couldn't find `tenant_id` in that relationship.

**Bad Query:**
```javascript
const { data: records, error } = await supabase
  .from("maintenance_records")  // ❌ Base table, no tenant filtering
  .select(`
    *,
    assets!inner(tenant_id)     // ❌ Creates assets_1 alias, fails
  `)
  .eq("assets.tenant_id", userProfile.tenantId);
```

## Solution
Use the tenant-filtered view `tams360_maintenance_app` which already has all the necessary joins and tenant filtering built-in.

**Good Query:**
```javascript
const { data: records, error } = await supabase
  .from("tams360_maintenance_app")  // ✅ View with tenant filtering
  .select("*")
  .eq("tenant_id", userProfile.tenantId);
```

## Changes Made

### File: `/supabase/functions/server/index.tsx`

**Line ~4177-4187:** Changed query from base table to view
```diff
- // Query maintenance records from database
- // Note: maintenance_records table does not have tenant_id column
- // We'll filter by tenant through the asset relationship using a JOIN
  const { data: records, error } = await supabase
-   .from("maintenance_records")
-   .select(`
-     *,
-     assets!inner(tenant_id)
-   `)
-   .eq("assets.tenant_id", userProfile.tenantId)
+   .from("tams360_maintenance_app")
+   .select("*")
+   .eq("tenant_id", userProfile.tenantId)
    .order("maintenance_id", { ascending: false });
```

**Line ~4192-4236:** Simplified data transformation
- Removed extra query to `tams360_assets_app` (redundant)
- The view already includes asset details from the join
- Simplified record transformation to map field names

## Why This Works

### tams360_maintenance_app View Benefits:
1. ✅ **Has tenant_id column** - Direct filtering without joins
2. ✅ **Already includes asset details** - No need for second query
3. ✅ **Proper row-level security** - Built into the view
4. ✅ **Better performance** - Single query instead of two

## Testing Checklist

✅ **Maintenance Records List** - Should load without error
✅ **Asset Details** - Should display asset_ref, asset_type_name
✅ **Tenant Filtering** - Only shows maintenance for current tenant
✅ **No Console Errors** - No "assets_1.tenant_id does not exist"

---

**Version:** 6/20
**Date:** 2026-01-13
**Status:** ✅ FIXED - READY TO DEPLOY
