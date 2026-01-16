# TAMS360 Quick Reference Guide

## What Was Fixed/Added

### ✅ 1. Viewer Role Can Now Access Map & Inspections
**Status:** Complete - Live Now  
**Test:** Login as viewer, check sidebar navigation

### ✅ 2. "Show Assigned Assets Only" Setting Added
**Status:** UI Complete - Filtering Logic Needs Implementation  
**Location:** Admin Console → Tenant Settings → Data Access tab

### ✅ 3. Asset Photo Import Guide Created
**Status:** Complete Documentation  
**Location:** `/ASSET_PHOTO_IMPORT_GUIDE.md`

---

## Quick Access

### For Users

#### Viewer Role Access
```
Login as: viewer
Can access:
  ✓ Dashboard
  ✓ GIS Map (read-only)
  ✓ Inspections (read-only)
  ✓ Reports
Cannot access:
  ✗ Assets
  ✗ Maintenance
  ✗ Data Management
  ✗ Admin Console
```

#### Assigned Assets Setting
```
Location: Admin Console → Tenant Settings → Data Access
Toggle: "Show Assigned Assets Only"
Default: OFF (all users see all tenant assets)
When ON: Non-admin users only see assigned assets
Admin: Always sees all assets
```

---

## For Developers

### Files Modified
1. `/src/app/components/layout/AppLayout.tsx`
   - Added viewer to Inspections roles array

2. `/src/app/components/admin/TenantSettingsPage.tsx`
   - Added missing imports
   - Added `showAssignedAssetsOnly` setting
   - Added "Data Access" tab with Shield icon

3. `/supabase/functions/server/index.tsx`
   - Added `show_assigned_assets_only` to dbSettings mapping

### Files Created
1. `/ASSET_PHOTO_IMPORT_GUIDE.md` - Complete photo import guide
2. `/CHANGES_SUMMARY.md` - Detailed changes documentation
3. `/FILTERING_IMPLEMENTATION_SNIPPETS.md` - Code snippets for filtering
4. `/QUICK_REFERENCE.md` - This file

---

## Next Steps (Priority Order)

### 1. Database Schema (REQUIRED)
```sql
-- Add assigned_to column if not exists
ALTER TABLE tams360.assets 
ADD COLUMN IF NOT EXISTS assigned_to UUID 
REFERENCES tams360.user_profiles(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_assets_assigned_to 
ON tams360.assets(assigned_to);

-- Update view to include new column
-- (Add assigned_to to tams360_assets_v view)
```

### 2. Implement Filtering (Choose One Approach)

#### Option A: Frontend Filtering (Quick & Easy)
Copy snippets from `/FILTERING_IMPLEMENTATION_SNIPPETS.md`
Apply to these files:
- AssetsPage.tsx
- InspectionsPage.tsx
- MaintenancePage.tsx
- GISMapPage.tsx
- ReportsPage.tsx

**Pros:** Quick to implement, no backend changes  
**Cons:** Less secure, loads all data first

#### Option B: Backend Filtering (Recommended)
Update server endpoints in `/supabase/functions/server/index.tsx`
- GET /assets
- GET /inspections
- GET /maintenance

**Pros:** More secure, better performance, less data transfer  
**Cons:** More code changes required

### 3. Test Thoroughly
- [ ] Test viewer role access
- [ ] Test assigned assets filtering ON
- [ ] Test assigned assets filtering OFF
- [ ] Test admin sees all assets
- [ ] Test non-admin sees only assigned

### 4. Photo Import (When Ready)
Follow guide in `/ASSET_PHOTO_IMPORT_GUIDE.md`

---

## Testing Commands

### Quick Test Viewer Access
```typescript
// In browser console while logged in as viewer
console.log('Role:', JSON.parse(localStorage.getItem('tams360_user')).role);
// Should show: "viewer"

// Try accessing /inspections - should work
// Try accessing /assets - should redirect or show unauthorized
```

### Quick Test Assigned Filter
```typescript
// In browser console
fetch('https://YOUR_PROJECT.supabase.co/functions/v1/make-server-c894a9ff/admin/tenant-settings', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('tams360_token')}` }
})
.then(r => r.json())
.then(d => console.log('show_assigned_assets_only:', d.settings.show_assigned_assets_only));
```

---

## Common Issues & Solutions

### Issue: Viewer can't see Inspections
**Solution:** Already fixed. Clear cache and reload.

### Issue: Setting saves but doesn't filter
**Solution:** Filtering logic not implemented yet. Follow `/FILTERING_IMPLEMENTATION_SNIPPETS.md`

### Issue: Photos won't upload
**Solution:** Check:
1. Supabase Storage bucket 'asset-photos' exists
2. Bucket permissions are correct
3. File size under 5MB
4. Follow guide in `/ASSET_PHOTO_IMPORT_GUIDE.md`

### Issue: Admin can't see setting
**Solution:** 
1. Ensure you're actually an admin: `role === 'admin'`
2. Navigate to: `/admin` → Tenant Settings → Data Access tab

---

## Important Notes

### Viewer Role
- ✅ Read-only access to maps and inspections
- ✅ Cannot create, edit, or delete
- ✅ Can view and generate reports

### Assigned Assets Filter
- ⚠️ UI is ready, filtering needs implementation
- ⚠️ Database column `assigned_to` must exist
- ⚠️ Use Bulk Asset Assignment page to assign assets to users

### Photo Import
- 📁 Naming: 0.jpg (general), 1.jpg (component 1), 1.1.jpg (detail)
- 📁 Folders: Organize by Asset Reference ID
- 📁 Storage: Supabase Storage bucket `asset-photos`

---

## Code Snippets Quick Copy

### Check if filtering should be applied
```typescript
import { useTenant } from "../../contexts/TenantContext";
import { AuthContext } from "../../App";

const { settings } = useTenant();
const { user } = useContext(AuthContext);

const shouldFilter = settings?.show_assigned_assets_only && user?.role !== 'admin';
```

### Apply filter to assets
```typescript
if (shouldFilter) {
  assets = assets.filter(asset => asset.assigned_to === user?.id);
}
```

### Apply filter to related records (inspections, maintenance)
```typescript
if (shouldFilter) {
  const assignedAssetIds = new Set(
    assets.filter(a => a.assigned_to === user?.id).map(a => a.id)
  );
  
  inspections = inspections.filter(i => assignedAssetIds.has(i.asset_id));
  maintenance = maintenance.filter(m => assignedAssetIds.has(m.asset_id));
}
```

---

## Documentation Files

| File | Purpose |
|------|---------|
| `CHANGES_SUMMARY.md` | Detailed changes, context, testing checklist |
| `ASSET_PHOTO_IMPORT_GUIDE.md` | Complete photo import guide with scripts |
| `FILTERING_IMPLEMENTATION_SNIPPETS.md` | Copy-paste code for filtering |
| `QUICK_REFERENCE.md` | This file - quick lookup |

---

## Support

### Questions About:
- **Viewer Access**: Test immediately, should work now
- **Assigned Filter**: See `FILTERING_IMPLEMENTATION_SNIPPETS.md`
- **Photo Import**: See `ASSET_PHOTO_IMPORT_GUIDE.md`
- **Everything Else**: See `CHANGES_SUMMARY.md`

### Need Help?
1. Check relevant documentation file
2. Review code comments in modified files
3. Check browser console for errors
4. Check server logs for backend issues

---

## Deployment Checklist

Before deploying to production:

- [ ] Test viewer role access thoroughly
- [ ] Test assigned filter with multiple users
- [ ] Verify admin always sees all assets
- [ ] Run database migration for `assigned_to` column
- [ ] Update database views to include `assigned_to`
- [ ] Test photo import workflow
- [ ] Update user documentation
- [ ] Train users on new features
- [ ] Monitor for issues after deployment

---

*Quick Reference v1.0 - January 16, 2026*
