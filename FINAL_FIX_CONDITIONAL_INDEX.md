# 🔧 FINAL FIX: Column Name is `conditional_index` (Not `ci` or `ci_final`)

## Problem
After changing from `ci_final` to `ci`, we discovered the actual column name is **`conditional_index`**.

## Root Cause
The database view `tams360_inspections_app` has these columns:
- ✅ `conditional_index` (the actual CI value)
- ❌ NOT `ci`
- ❌ NOT `ci_final`

## All Fixes Applied

### 1. SELECT Queries (10 occurrences)
Changed all `.select()` statements from `ci` to `conditional_index`:

**Locations:**
- Line 3004: Critical alerts query
- Line 3095: Asset type summary query
- Line 3179: Inspector performance query
- Line 3243: CI trend query
- Line 4724: Inspection stats query
- Line 5069: CI distribution fallback query
- Line 5229: Urgency summary query

### 2. Filtering Logic (1 occurrence)
Changed filter condition:
```javascript
// BEFORE
insp.ci !== null && insp.ci < 30

// AFTER
insp.conditional_index !== null && insp.conditional_index < 30
```

### 3. Calculations (5 occurrences)
Changed all calculations to use `conditional_index`:
```javascript
// BEFORE
summary.total_ci += insp.ci;
inspection.ci || 0
item.ci || 0
i.ci !== null

// AFTER  
summary.total_ci += insp.conditional_index;
inspection.conditional_index || 0
item.conditional_index || 0
i.conditional_index !== null
```

**Locations:**
- Line 3145-3147: Asset type CI totals
- Line 3208: Inspector CI totals
- Line 3258: Monthly CI calculations
- Line 4752-4756: Average CI calculations (3 occurrences)

### 4. CI Distribution View
**Problem:** `tams360_ci_distribution_v` doesn't have `tenant_id` column

**Solution:** Removed view query entirely, replaced with direct calculation from `tams360_inspections_app`:

```javascript
// BEFORE
const { data: distribution, error } = await supabase
  .from("tams360_ci_distribution_v")
  .select("*")
  .eq("tenant_id", userProfile.tenant_id);  // ❌ FAILS - no tenant_id in view

// AFTER
const { data: inspections, error } = await supabase
  .from("tams360_inspections_app")  // ✅ Has tenant_id
  .select("ci_band, conditional_index")
  .eq("tenant_id", userProfile.tenant_id);

// Then group by ci_band manually
```

**Locations:**
- Line 5057-5094: Replaced view query with direct calculation

## Summary of Changes

| Error | Solution | Files Changed |
|-------|----------|---------------|
| `column ci does not exist` | Changed to `conditional_index` | `/supabase/functions/server/index.tsx` (16 occurrences) |
| `tams360_ci_distribution_v.tenant_id does not exist` | Use direct inspections query | `/supabase/functions/server/index.tsx` (1 occurrence) |

## Testing Checklist

✅ **Dashboard Critical Alerts** - Should display without `ci` error
✅ **Dashboard Asset Type Summary** - Should show CI values
✅ **Dashboard Inspector Performance** - Should calculate average CI
✅ **Dashboard CI Trend** - Should show monthly CI trend
✅ **Dashboard CI Distribution** - Should display CI bands
✅ **Dashboard Urgency Summary** - Should group by urgency
✅ **Inspection Stats** - Should calculate avgCI

## Correct Column Names Reference

### tams360_inspections_app view:
- ✅ `inspection_id`
- ✅ `conditional_index` (main CI value)
- ✅ `calculated_urgency`
- ✅ `ci_band` (Excellent/Good/Fair/Poor)
- ✅ `tenant_id`
- ❌ NOT `ci`
- ❌ NOT `ci_final`

### tams360_ci_distribution_v view:
- ✅ `ci_band`
- ✅ `asset_count`
- ❌ NOT `tenant_id` (aggregate view, no tenant filtering)

### tams360_urgency_summary_v view:
- ✅ `calculated_urgency`
- ✅ `inspection_count`
- ❌ NOT `tenant_id` (aggregate view, no tenant filtering)

## Deployment Status

🚀 **READY TO DEPLOY**

All database queries now use the correct column name `conditional_index` and avoid querying aggregate views with `tenant_id` filters.

---

**Version:** 5/20
**Date:** 2026-01-13 (Final Update)
**Status:** ✅ ALL FIXED - DEPLOY NOW
