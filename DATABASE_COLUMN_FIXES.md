# 🔧 Database Column Name Fixes Applied

## Summary
Fixed all database column name mismatches causing errors in the TAMS360 application.

## Errors Fixed

### 1. ❌ Error: `column tams360_assets_app.created_at does not exist`
**Fix:** Changed `.order("created_at")` to `.order("asset_id")` for assets queries

**Files Changed:**
- `/supabase/functions/server/index.tsx` line ~1695

---

### 2. ❌ Error: `column tams360_inspections_app.ci_final does not exist`
**Fix:** Changed all references from `ci_final` to `ci` throughout the codebase

**Files Changed:**
- `/supabase/functions/server/index.tsx` (29 occurrences)

**Locations:**
- Line 3004: Dashboard critical alerts query
- Line 3031: Critical CI filtering
- Line 3095: Asset type summary query
- Line 3145-3146: CI calculations
- Line 3179: Inspector performance query
- Line 3208: Inspector CI totals
- Line 3243: CI trend query
- Line 3258: Monthly CI calculations
- Line 4539-4570: Inspection creation metadata
- Line 4684: Comment update
- Line 4723: Inspection stats query
- Line 4751-4755: Average CI calculations
- Line 4863: Comment update
- Line 4901-4930: Inspection update metadata
- Line 5067: CI distribution fallback query

---

### 3. ❌ Error: `column tams360_urgency_summary_v.tenant_id does not exist`
**Fix:** Replaced view queries with direct queries from `tams360_inspections_app` (which is tenant-filtered)

**Files Changed:**
- `/supabase/functions/server/index.tsx` lines 5224-5253, 5330-5335

**Changes:**
1. Removed `.from("tams360_urgency_summary_v")` queries with tenant_id filter
2. Replaced with direct `.from("tams360_inspections_app")` queries
3. Added proper urgency ordering by priority (Immediate > High > Medium > Low)
4. Changed `urgencySummary.inspection_count` to `criticalCount` from direct count query

---

### 4. ❌ Error: `column tams360_maintenance_app.created_at does not exist`
**Fix:** Changed `.order("created_at")` to `.order("maintenance_id")` for maintenance queries

**Files Changed:**
- `/supabase/functions/server/index.tsx` lines 2608, 4187

---

### 5. 🔧 Bonus Fix: Schema-Prefixed Table Names
**Issue:** Using `tams360.table_name` breaks PostgREST foreign key relationships

**Fix:** Removed schema prefixes from table names in `.from()` queries

**Files Changed:**
- `/supabase/functions/server/index.tsx`:
  - Line 4949: `tams360.inspection_component_scores` → `inspection_component_scores`
  - Line 4977: `tams360.inspection_component_scores` → `inspection_component_scores`
  - Line 5000: `tams360.inspection_component_scores` → `inspection_component_scores`
  - Line 5010: `tams360.inspections` → `inspections`

---

## Testing Checklist

✅ **Assets Page**: Should load without `created_at` error
✅ **Dashboard**: 
  - Critical alerts should display
  - Asset type summary should show CI values
  - Urgency summary should display properly
  - Inspection stats should calculate avgCI
✅ **Inspections Page**: Should load and display CI values
✅ **GIS Map**: Should display asset details with CI values
✅ **Maintenance Records**: Should load without `created_at` error

---

## Database Schema Notes

### Correct Column Names:
- **Assets**: `asset_id`, `asset_ref`, `asset_type_id`, etc. (NO `created_at`)
- **Inspections**: `inspection_id`, `ci` (NOT `ci_final`), `conditional_index`, `ci_safety`
- **Maintenance**: `maintenance_id`, `scheduled_date`, etc. (NO `created_at`)

### Views with Tenant Filtering:
- ✅ `tams360_assets_app` - Has `tenant_id`
- ✅ `tams360_inspections_app` - Has `tenant_id`
- ✅ `tams360_maintenance_app` - Has `tenant_id`
- ❌ `tams360_urgency_summary_v` - NO `tenant_id` (aggregate view)
- ❌ `tams360_ci_distribution_v` - NO `tenant_id` (aggregate view)

---

## Deployment Status

🚀 **Ready to Deploy**

All database queries now use correct column names and table references. The application should load without database errors.

---

**Date:** 2026-01-13
**Version:** 4/20
**Status:** ✅ FIXED - Ready for Testing
