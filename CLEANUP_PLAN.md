# TAMS360 Safe Cleanup Plan

**Date:** January 16, 2026  
**Status:** READY FOR REVIEW - DO NOT EXECUTE WITHOUT APPROVAL

## 🎯 Objective
Remove development/setup tools and unused database entities without breaking production functionality.

---

## ✅ PHASE 1: Frontend Cleanup (SAFEST - Start Here)

### Files to DELETE:
1. `/src/app/components/admin/QuickSetupPage.tsx` - Development setup tool
2. `/src/app/components/utils/DatabaseSetupBanner.tsx` - Dev-only banner

### Files to EDIT:

#### `/src/app/App.tsx`
- **Remove import:** `import { QuickSetupPage } from "./components/admin/QuickSetupPage";`
- **Remove route:** `<Route path="/admin/quick-setup" element={<QuickSetupPage />} />`

#### `/src/app/components/admin/AdminConsolePage.tsx`
- **Remove:** The "Quick Setup" button/link (lines ~168-172)

#### `/src/app/components/dashboard/DashboardPage.tsx`
- **Remove import:** `import { DatabaseSetupBanner } from "../utils/DatabaseSetupBanner";`
- **Remove component:** `<DatabaseSetupBanner />` (line ~789)

#### `/src/app/components/map/GISMapPage.tsx`
- **Remove import:** `import { DatabaseSetupBanner } from "../utils/DatabaseSetupBanner";`
- **Remove component:** `<DatabaseSetupBanner />` (line ~751)

**Impact:** ✅ SAFE - Only removes UI elements, no data loss

---

## ✅ PHASE 2: Backend Cleanup (SAFE - Server-side only)

### Files to DELETE:
1. `/supabase/functions/server/quickSetup.tsx` - Sample data generator

### Files to EDIT:

#### `/supabase/functions/server/index.tsx`
- **Remove import:** `import { quickSetup } from "./quickSetup.tsx";` (line 11)
- **Remove endpoint:** Entire `/quick-setup` POST route (lines ~3272-3312)

**Impact:** ✅ SAFE - Removes unused endpoint, no production features affected

---

## ⚠️ PHASE 3: Database Cleanup (REQUIRES MANUAL SQL)

### What to Keep (ACTIVELY USED):
✅ **Core Tables/Views (DO NOT REMOVE):**
- `tams360_assets_v` - Asset list view
- `tams360_inspections_v` - Inspections view
- `tams360_maintenance_v` - Maintenance records view
- `tams360_ci_distribution_v` - Dashboard stats
- `tams360_urgency_summary_v` - Dashboard stats
- `tams360_asset_type_summary_v` - Dashboard stats
- `tenants` - Organization management
- `users` - User management
- `invitations` - User invitation system
- `asset_types` - Asset type lookup
- `tenant_settings` - Tenant configuration
- `audit_log` - Activity tracking
- `asset_component_templates` - Component templates
- `asset_component_template_items` - Template items
- `inspection_component_scores` - Component scoring
- `asset_inventory_log` - Inventory tracking

### Tables to POTENTIALLY Remove (Need Manual Verification):

**Instructions:**
1. Connect to Supabase SQL Editor
2. Run this query to check for empty/unused tables:

```sql
-- Check row counts for all tams360 tables
SELECT 
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname IN ('public', 'tams360')
ORDER BY schemaname, n_live_tup DESC;
```

3. For any table with 0 rows that's NOT in the "Keep" list above, check if it's referenced in code:
   - Search codebase for table name
   - If not found in any `.tsx` files, it's safe to drop

4. To drop unused tables (EXAMPLE - verify first):
```sql
-- BACKUP FIRST! Then run for each confirmed unused table:
-- DROP TABLE IF EXISTS tams360.unused_table_name CASCADE;
```

**Impact:** ⚠️ MEDIUM RISK - Only proceed with tables confirmed as unused

---

## 📋 Execution Checklist

### Pre-Execution:
- [ ] Backup Supabase database (download SQL dump)
- [ ] Create git commit with current state
- [ ] Note current deployment URL and test it works
- [ ] Save list of all current tables for rollback

### Phase 1 Execution:
- [ ] Delete `QuickSetupPage.tsx`
- [ ] Delete `DatabaseSetupBanner.tsx`
- [ ] Edit `App.tsx` (remove import + route)
- [ ] Edit `AdminConsolePage.tsx` (remove button)
- [ ] Edit `DashboardPage.tsx` (remove banner)
- [ ] Edit `GISMapPage.tsx` (remove banner)
- [ ] Test app locally - verify no errors
- [ ] Test navigation to all pages
- [ ] Test Dashboard and Map pages specifically

### Phase 2 Execution:
- [ ] Delete `quickSetup.tsx`
- [ ] Edit `index.tsx` (remove import + endpoint)
- [ ] Test app locally
- [ ] Verify backend starts without errors
- [ ] Check browser console for 404s

### Phase 3 Execution (Optional):
- [ ] Run table analysis query in Supabase
- [ ] Identify empty tables
- [ ] Verify not referenced in code
- [ ] Take final backup before dropping
- [ ] Drop tables one at a time
- [ ] Test app after each drop

---

## 🔄 Rollback Plan

### If Phase 1 Breaks:
```bash
git checkout HEAD -- src/app/App.tsx
git checkout HEAD -- src/app/components/admin/AdminConsolePage.tsx
git checkout HEAD -- src/app/components/dashboard/DashboardPage.tsx
git checkout HEAD -- src/app/components/map/GISMapPage.tsx
git checkout HEAD -- src/app/components/admin/QuickSetupPage.tsx
git checkout HEAD -- src/app/components/utils/DatabaseSetupBanner.tsx
```

### If Phase 2 Breaks:
```bash
git checkout HEAD -- supabase/functions/server/index.tsx
git checkout HEAD -- supabase/functions/server/quickSetup.tsx
```

### If Phase 3 Breaks:
- Restore Supabase database from SQL dump
- Restore via Supabase Dashboard > Database > Backups

---

## 📊 Expected Results

### After Phase 1 & 2:
- ✅ No "Database Setup" banners on Dashboard/Map
- ✅ No "Quick Setup" option in Admin Console
- ✅ All production features work normally
- ✅ Asset list, map, inspections, maintenance all functional
- ✅ User management, tenant settings unchanged
- ✅ Smaller codebase, easier to maintain

### Code Reduction:
- ~240 lines removed from QuickSetupPage.tsx
- ~110 lines removed from DatabaseSetupBanner.tsx
- ~100 lines removed from quickSetup.tsx backend
- ~10 lines removed from various imports/routes
- **Total: ~460 lines of development code removed**

---

## ⚠️ IMPORTANT NOTES

1. **DO NOT touch DiagnosticPage** - It's useful for production troubleshooting
2. **DO NOT modify any view definitions** - These are actively used
3. **DO NOT touch kv_store.tsx** - Protected system file
4. **Phase 3 is OPTIONAL** - Only proceed if you're certain about empty tables
5. **Test thoroughly after each phase** before moving to next

---

## 🚀 Ready to Proceed?

**Recommendation:** Execute Phase 1 first, test thoroughly, then Phase 2, then optionally Phase 3.

Would you like me to:
1. ✅ Proceed with Phase 1 (Frontend cleanup) - SAFEST
2. ⏸️ Show you exactly what will be changed first
3. 📊 Generate a database table usage report first
