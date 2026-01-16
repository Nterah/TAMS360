# TAMS360 Changes Summary

## Date: January 16, 2026

---

## 1. Fixed Viewer Role Access

### Issue
The viewer role was being filtered out from viewing the Map and Inspection pages, even though these are read-only views that viewers should be able to access.

### Solution
**File: `/src/app/components/layout/AppLayout.tsx`**

Updated the navigation configuration to include "viewer" role for Inspections:

```typescript
const navigation = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard, roles: ["admin", "supervisor", "field_user", "viewer"] },
  { name: "GIS Map", path: "/map", icon: Map, roles: ["admin", "supervisor", "field_user", "viewer"] },
  { name: "Assets", path: "/assets", icon: Database, roles: ["admin", "supervisor", "field_user"] },
  { name: "Inspections", path: "/inspections", icon: ClipboardCheck, roles: ["admin", "supervisor", "field_user", "viewer"] }, // ✓ ADDED viewer
  { name: "Maintenance", path: "/maintenance", icon: Wrench, roles: ["admin", "supervisor", "field_user"] },
  { name: "Reports", path: "/reports", icon: FileBarChart, roles: ["admin", "supervisor", "viewer"] },
  { name: "Data Management", path: "/data", icon: FolderOpen, roles: ["admin", "supervisor", "field_user"] },
  { name: "Admin Console", path: "/admin", icon: Settings, roles: ["admin"] },
];
```

**Result:** Viewers can now access:
- ✅ Dashboard
- ✅ GIS Map (read-only)
- ✅ Inspections (read-only)
- ✅ Reports

---

## 2. Added "Show Assigned Assets Only" Setting

### Feature
New tenant-level setting to control whether users can only see assets assigned to them, or all assets within the tenant.

### Changes Made

#### A. Frontend - Tenant Settings Page
**File: `/src/app/components/admin/TenantSettingsPage.tsx`**

1. **Added Missing Imports:**
   ```typescript
   import { useState, useEffect, useContext } from "react";
   import { useNavigate } from "react-router-dom";
   import { AuthContext } from "../../App";
   import { useTenant } from "../../contexts/TenantContext";
   import { Shield } from "lucide-react";  // New icon for Data Access tab
   ```

2. **Added New Setting to State:**
   ```typescript
   const [settings, setSettings] = useState({
     // ... existing settings ...
     // Data Access Control
     showAssignedAssetsOnly: false,
     // ... rest of settings ...
   });
   ```

3. **Added Setting Load from TenantContext:**
   ```typescript
   useEffect(() => {
     if (tenantSettings) {
       setSettings({
         // ... existing settings ...
         showAssignedAssetsOnly: tenantSettings.show_assigned_assets_only ?? false,
         // ... rest ...
       });
     }
   }, [tenantSettings]);
   ```

4. **Added New "Data Access" Tab:**
   ```tsx
   <TabsTrigger value="data-access">
     <Shield className="w-4 h-4 mr-2" />
     Data Access
   </TabsTrigger>
   ```

5. **Added Tab Content:**
   ```tsx
   <TabsContent value="data-access" className="space-y-6">
     <Card>
       <CardHeader>
         <CardTitle>Data Access Control</CardTitle>
         <CardDescription>
           Configure data access and visibility settings
         </CardDescription>
       </CardHeader>
       <CardContent className="space-y-4">
         <div className="flex items-center justify-between p-4 border rounded-lg">
           <div className="space-y-1">
             <Label>Show Assigned Assets Only</Label>
             <p className="text-sm text-muted-foreground">
               Restrict asset visibility to assigned assets only
             </p>
           </div>
           <Switch
             checked={settings.showAssignedAssetsOnly}
             onCheckedChange={(checked) => setSettings({ ...settings, showAssignedAssetsOnly: checked })}
           />
         </div>
       </CardContent>
     </Card>
   </TabsContent>
   ```

#### B. Backend - Server Settings Handler
**File: `/supabase/functions/server/index.tsx`**

Updated the PUT endpoint for tenant settings to include the new field:

```typescript
const dbSettings = {
  // ... existing settings ...
  // Automation Rules
  enable_auto_maintenance: settings.enableAutoMaintenance,
  ci_threshold: settings.ciThreshold,
  urgency_threshold: settings.urgencyThreshold,
  auto_assign_field_user: settings.autoAssignFieldUser,
  auto_notify_on_critical: settings.autoNotifyOnCritical,
  // Data Access Control (NEW)
  show_assigned_assets_only: settings.showAssignedAssetsOnly,
  // Email Notifications
  notification_emails: settings.notificationEmails,
  enable_daily_digest: settings.enableDailyDigest,
};
```

### How to Use
1. Navigate to **Admin Console** → **Tenant Settings**
2. Click on the **"Data Access"** tab
3. Toggle **"Show Assigned Assets Only"** 
4. Click **"Save Changes"**

**When Enabled:**
- Users (except admins) will only see assets assigned to them
- This applies across:
  - Assets Page
  - Inspections Page
  - Maintenance Page
  - GIS Map
  - Reports

**When Disabled (Default):**
- All users see all assets within their tenant (normal behavior)

### Implementation Notes for Filtering

The setting is now saved in the database. To implement the actual filtering logic, you'll need to:

1. **Check the setting in data fetch queries** (next step for you):
   ```typescript
   // Example in AssetsPage.tsx
   const { settings } = useTenant();
   const { user } = useContext(AuthContext);
   
   // When fetching assets:
   let query = supabase.from('tams360_assets_v').select('*');
   
   // If setting is enabled AND user is not admin
   if (settings?.show_assigned_assets_only && user?.role !== 'admin') {
     query = query.eq('assigned_to', user.id);
   }
   ```

2. **Apply to all relevant pages:**
   - `/src/app/components/assets/AssetsPage.tsx`
   - `/src/app/components/inspections/InspectionsPage.tsx`
   - `/src/app/components/maintenance/MaintenancePage.tsx`
   - `/src/app/components/map/GISMapPage.tsx`
   - `/src/app/components/reports/ReportsPage.tsx`

3. **Database Schema Requirement:**
   Ensure the `tams360.assets` table has an `assigned_to` column (or similar) that references `user_profiles.id`

---

## 3. Asset Photo Import Guide

### Created Comprehensive Documentation
**File: `/ASSET_PHOTO_IMPORT_GUIDE.md`**

A complete guide covering:

#### Photo Naming Convention
- **General Asset Photo**: `0.jpg` (or `.png`, `.jpeg`)
- **Component Photos**: 
  - `1.jpg` - Component 1 main photo
  - `1.1.jpg`, `1.2.jpg`, `1.3.jpg` - Component 1 details
  - `2.jpg`, `2.1.jpg`, etc. - Component 2 photos
  - Up to component 6

#### Folder Structure
```
/AssetPhotos/
├── AST26000123/           # Asset Reference ID folder
│   ├── 0.jpg              # General asset photo
│   ├── 1.jpg              # Component 1 main
│   ├── 1.1.jpg            # Component 1 detail 1
│   ├── 1.2.jpg            # Component 1 detail 2
│   ├── 2.jpg              # Component 2 main
│   └── 2.1.jpg            # Component 2 detail 1
├── AST26000124/
│   ├── 0.jpg
│   └── 1.jpg
└── AST26000125/
    └── 0.jpg
```

#### Three Import Methods Documented

1. **Manual Supabase Dashboard Upload**
   - Step-by-step instructions for using Supabase Storage UI
   - SQL scripts for updating database records

2. **Python Script**
   - Complete Python script using `supabase-py`
   - Automated upload and database update
   - Error handling and progress tracking

3. **Node.js Script**
   - Complete Node.js script using `@supabase/supabase-js`
   - Ready to use with minimal configuration
   - Includes batch processing

#### Additional Content
- Database schema reference
- Photo URL format documentation
- Best practices for photo quality and organization
- Validation SQL queries
- Troubleshooting section
- Complete working code examples

### Key Features of the Guide
- ✅ Clear naming conventions explained
- ✅ Multiple import methods (manual, Python, Node.js)
- ✅ Database update scripts included
- ✅ Validation queries provided
- ✅ Troubleshooting tips
- ✅ Production-ready code examples

---

## Database Schema Requirements

### For "Show Assigned Assets Only" Feature

You'll need to ensure the following columns exist:

```sql
-- In tams360.assets table
ALTER TABLE tams360.assets 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES tams360.user_profiles(id);

-- Optional: Create index for performance
CREATE INDEX IF NOT EXISTS idx_assets_assigned_to 
ON tams360.assets(assigned_to);

-- Update the public view to include assigned_to
CREATE OR REPLACE VIEW public.tams360_assets_v AS
SELECT 
  id,
  tenant_id,
  asset_ref,
  asset_type,
  -- ... all other columns ...
  assigned_to,  -- Make sure this is included
  -- ... rest of columns ...
FROM tams360.assets
WHERE tenant_id = current_setting('app.current_tenant_id', true)::UUID;

-- Grant appropriate permissions
GRANT SELECT ON public.tams360_assets_v TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tams360_assets_v TO authenticated;
```

### For Photo Storage

Ensure Supabase Storage bucket exists:

```sql
-- Create bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('asset-photos', 'asset-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Set bucket policies (example for public read)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'asset-photos' );

CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'asset-photos' );
```

---

## Testing Checklist

### 1. Viewer Role Access
- [ ] Login as viewer
- [ ] Verify Dashboard access
- [ ] Verify GIS Map access (read-only)
- [ ] Verify Inspections page access (read-only)
- [ ] Verify Reports access
- [ ] Confirm Assets page NOT accessible
- [ ] Confirm Maintenance page NOT accessible
- [ ] Confirm Data Management NOT accessible
- [ ] Confirm Admin Console NOT accessible

### 2. Assigned Assets Only Setting
- [ ] Login as admin
- [ ] Navigate to Admin Console → Tenant Settings → Data Access
- [ ] Toggle "Show Assigned Assets Only" ON
- [ ] Save settings
- [ ] Login as non-admin user
- [ ] Verify only assigned assets visible in Assets page
- [ ] Verify only assigned assets visible in GIS Map
- [ ] Verify only related inspections visible
- [ ] Login as admin again
- [ ] Verify admin still sees all assets
- [ ] Toggle setting OFF
- [ ] Verify all users see all assets again

### 3. Photo Import (when implemented)
- [ ] Prepare test photos following naming convention
- [ ] Upload to Supabase Storage
- [ ] Run database update script
- [ ] Verify photos display in asset detail pages
- [ ] Verify photos display in inspection forms
- [ ] Check photo URLs are accessible
- [ ] Test with multiple assets

---

## Next Steps (Recommended)

### 1. Implement Asset Filtering Logic
Add the filtering logic to all relevant pages:
- AssetsPage.tsx
- InspectionsPage.tsx
- MaintenancePage.tsx
- GISMapPage.tsx
- ReportsPage.tsx

### 2. Database Migration
Create and run migration to add `assigned_to` column if it doesn't exist.

### 3. Bulk Asset Assignment Tool
The existing `/admin/bulk-asset-assignment` page can be used to assign assets to users.

### 4. Photo Import Workflow
Decide which import method to use (Python, Node.js, or manual) and prepare your photos.

### 5. Testing
Test all changes thoroughly in development before deploying to production.

---

## Files Modified

1. `/src/app/components/layout/AppLayout.tsx` - Added viewer role to Inspections
2. `/src/app/components/admin/TenantSettingsPage.tsx` - Added Data Access tab and setting
3. `/supabase/functions/server/index.tsx` - Added setting to backend handler

## Files Created

1. `/ASSET_PHOTO_IMPORT_GUIDE.md` - Complete photo import documentation
2. `/CHANGES_SUMMARY.md` - This file

---

## Support & Documentation

- **Viewer Role Access**: Changes are live, test immediately
- **Assigned Assets Setting**: UI complete, filtering logic needs implementation
- **Photo Import**: Full guide available in `/ASSET_PHOTO_IMPORT_GUIDE.md`

For questions or issues, refer to:
- TAMS360 technical documentation
- Supabase documentation: https://supabase.com/docs
- This changes summary document

---

*Last Updated: January 16, 2026*
*Version: 1.0*
