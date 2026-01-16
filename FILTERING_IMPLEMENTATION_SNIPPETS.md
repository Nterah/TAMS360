# Asset Filtering Implementation Snippets

## Overview
This document provides copy-paste code snippets to implement the "Show Assigned Assets Only" filtering across all relevant pages in TAMS360.

---

## 1. AssetsPage.tsx

**Location:** `/src/app/components/assets/AssetsPage.tsx`

**Find the `fetchAssets` function** (around line 150-200) and update it:

```typescript
const fetchAssets = async () => {
  setLoading(true);
  try {
    const response = await fetch(`${API_URL}/assets`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      let fetchedAssets = data.assets || [];
      
      // NEW: Apply assigned assets filter if enabled
      if (tenantSettings?.show_assigned_assets_only && user?.role !== 'admin') {
        fetchedAssets = fetchedAssets.filter(asset => 
          asset.assigned_to === user?.id
        );
      }
      
      setAssets(fetchedAssets);
      setTotalAssetCount(fetchedAssets.length);
    } else {
      toast.error("Failed to fetch assets");
    }
  } catch (error) {
    console.error("Error fetching assets:", error);
    toast.error("Error loading assets");
  } finally {
    setLoading(false);
  }
};
```

**Add imports at the top** if not already present:

```typescript
import { useTenant } from "../../contexts/TenantContext";

// Inside component:
const { settings: tenantSettings } = useTenant();
const { user } = useContext(AuthContext);
```

---

## 2. InspectionsPage.tsx

**Location:** `/src/app/components/inspections/InspectionsPage.tsx`

**Update the inspections fetch** to filter based on assigned assets:

```typescript
const fetchInspections = async () => {
  setLoading(true);
  try {
    const response = await fetch(`${API_URL}/inspections`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      let fetchedInspections = data.inspections || [];
      
      // NEW: Apply assigned assets filter if enabled
      if (tenantSettings?.show_assigned_assets_only && user?.role !== 'admin') {
        // Filter inspections to only show those for assigned assets
        const assignedAssetIds = new Set(
          assets.filter(a => a.assigned_to === user?.id).map(a => a.id)
        );
        
        fetchedInspections = fetchedInspections.filter(inspection => 
          assignedAssetIds.has(inspection.asset_id)
        );
      }
      
      setInspections(fetchedInspections);
    } else {
      toast.error("Failed to fetch inspections");
    }
  } catch (error) {
    console.error("Error fetching inspections:", error);
    toast.error("Error loading inspections");
  } finally {
    setLoading(false);
  }
};
```

**Note:** This assumes you already have assets loaded. If not, you may need to fetch them first or modify the backend to include filtering.

**Alternative: Backend Filtering** (more efficient):

Add a query parameter to the API call:

```typescript
const fetchInspections = async () => {
  setLoading(true);
  try {
    const url = new URL(`${API_URL}/inspections`);
    
    // NEW: Add assigned filter parameter
    if (tenantSettings?.show_assigned_assets_only && user?.role !== 'admin') {
      url.searchParams.append('assigned_only', 'true');
    }
    
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      setInspections(data.inspections || []);
    } else {
      toast.error("Failed to fetch inspections");
    }
  } catch (error) {
    console.error("Error fetching inspections:", error);
    toast.error("Error loading inspections");
  } finally {
    setLoading(false);
  }
};
```

Then update the backend endpoint (see Backend section below).

---

## 3. MaintenancePage.tsx

**Location:** `/src/app/components/maintenance/MaintenancePage.tsx`

Similar to inspections:

```typescript
const fetchMaintenanceTasks = async () => {
  setLoading(true);
  try {
    const url = new URL(`${API_URL}/maintenance`);
    
    // NEW: Add assigned filter parameter
    if (tenantSettings?.show_assigned_assets_only && user?.role !== 'admin') {
      url.searchParams.append('assigned_only', 'true');
    }
    
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      setMaintenanceTasks(data.tasks || []);
    } else {
      toast.error("Failed to fetch maintenance tasks");
    }
  } catch (error) {
    console.error("Error fetching maintenance:", error);
    toast.error("Error loading maintenance tasks");
  } finally {
    setLoading(false);
  }
};
```

---

## 4. GISMapPage.tsx

**Location:** `/src/app/components/map/GISMapPage.tsx`

**Update the assets fetch for the map:**

```typescript
const fetchMapAssets = async () => {
  setLoading(true);
  try {
    const response = await fetch(`${API_URL}/assets`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      let mapAssets = data.assets || [];
      
      // NEW: Apply assigned assets filter if enabled
      if (tenantSettings?.show_assigned_assets_only && user?.role !== 'admin') {
        mapAssets = mapAssets.filter(asset => 
          asset.assigned_to === user?.id
        );
      }
      
      // Filter to only assets with coordinates
      mapAssets = mapAssets.filter(asset => 
        asset.latitude && asset.longitude
      );
      
      setAssets(mapAssets);
    } else {
      toast.error("Failed to fetch assets");
    }
  } catch (error) {
    console.error("Error fetching assets:", error);
    toast.error("Error loading map data");
  } finally {
    setLoading(false);
  }
};
```

---

## 5. ReportsPage.tsx

**Location:** `/src/app/components/reports/ReportsPage.tsx`

**Update data fetching for reports:**

```typescript
const fetchReportData = async () => {
  setLoading(true);
  try {
    const [assetsRes, inspectionsRes, maintenanceRes] = await Promise.all([
      fetch(`${API_URL}/assets`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch(`${API_URL}/inspections`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch(`${API_URL}/maintenance`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ]);

    if (assetsRes.ok && inspectionsRes.ok && maintenanceRes.ok) {
      const [assetsData, inspectionsData, maintenanceData] = await Promise.all([
        assetsRes.json(),
        inspectionsRes.json(),
        maintenanceRes.json(),
      ]);

      let fetchedAssets = assetsData.assets || [];
      
      // NEW: Apply assigned assets filter if enabled
      if (tenantSettings?.show_assigned_assets_only && user?.role !== 'admin') {
        fetchedAssets = fetchedAssets.filter(asset => 
          asset.assigned_to === user?.id
        );
        
        // Filter related data
        const assignedAssetIds = new Set(fetchedAssets.map(a => a.id));
        
        inspectionsData.inspections = inspectionsData.inspections.filter(i => 
          assignedAssetIds.has(i.asset_id)
        );
        
        maintenanceData.tasks = maintenanceData.tasks.filter(m => 
          assignedAssetIds.has(m.asset_id)
        );
      }
      
      setAssets(fetchedAssets);
      setInspections(inspectionsData.inspections || []);
      setMaintenanceTasks(maintenanceData.tasks || []);
    } else {
      toast.error("Failed to fetch report data");
    }
  } catch (error) {
    console.error("Error fetching report data:", error);
    toast.error("Error loading reports");
  } finally {
    setLoading(false);
  }
};
```

---

## Backend Implementation (Optional but Recommended)

### Server-Side Filtering (More Efficient)

**Location:** `/supabase/functions/server/index.tsx`

#### Update GET /assets endpoint:

```typescript
app.get("/make-server-c894a9ff/assets", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data, error } = await supabaseAuth.auth.getUser(accessToken);

    if (error || !data.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('tams360_user_profiles_v')
      .select('id, tenant_id, role')
      .eq('id', data.user.id)
      .single();

    if (!userProfile?.tenant_id) {
      return c.json({ error: 'Tenant not found' }, 404);
    }

    // Get tenant settings
    const { data: tenantSettingsData } = await supabase
      .from('tams360_tenant_settings_v')
      .select('settings')
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    const settings = tenantSettingsData?.settings || {};

    // Build query
    let query = supabase
      .from('tams360_assets_v')
      .select('*');

    // NEW: Apply assigned filter if enabled and user is not admin
    if (settings.show_assigned_assets_only && userProfile.role !== 'admin') {
      query = query.eq('assigned_to', userProfile.id);
    }

    const { data: assets, error: assetsError } = await query;

    if (assetsError) {
      console.error('Error fetching assets:', assetsError);
      return c.json({ error: 'Failed to fetch assets' }, 500);
    }

    return c.json({ assets: assets || [] });
  } catch (error) {
    console.error("Error in GET /assets:", error);
    return c.json({ error: "Failed to fetch assets" }, 500);
  }
});
```

#### Update GET /inspections endpoint:

```typescript
app.get("/make-server-c894a9ff/inspections", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data, error } = await supabaseAuth.auth.getUser(accessToken);

    if (error || !data.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('tams360_user_profiles_v')
      .select('id, tenant_id, role')
      .eq('id', data.user.id)
      .single();

    if (!userProfile?.tenant_id) {
      return c.json({ error: 'Tenant not found' }, 404);
    }

    // Get tenant settings
    const { data: tenantSettingsData } = await supabase
      .from('tams360_tenant_settings_v')
      .select('settings')
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    const settings = tenantSettingsData?.settings || {};

    // Build query with JOIN to assets
    let query = supabase
      .from('tams360_inspections_v')
      .select(`
        *,
        asset:tams360_assets_v!inner(
          id,
          asset_ref,
          asset_type,
          assigned_to
        )
      `);

    // NEW: Apply assigned filter if enabled and user is not admin
    if (settings.show_assigned_assets_only && userProfile.role !== 'admin') {
      query = query.eq('asset.assigned_to', userProfile.id);
    }

    const { data: inspections, error: inspectionsError } = await query;

    if (inspectionsError) {
      console.error('Error fetching inspections:', inspectionsError);
      return c.json({ error: 'Failed to fetch inspections' }, 500);
    }

    return c.json({ inspections: inspections || [] });
  } catch (error) {
    console.error("Error in GET /inspections:", error);
    return c.json({ error: "Failed to fetch inspections" }, 500);
  }
});
```

#### Update GET /maintenance endpoint:

```typescript
app.get("/make-server-c894a9ff/maintenance", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data, error } = await supabaseAuth.auth.getUser(accessToken);

    if (error || !data.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('tams360_user_profiles_v')
      .select('id, tenant_id, role')
      .eq('id', data.user.id)
      .single();

    if (!userProfile?.tenant_id) {
      return c.json({ error: 'Tenant not found' }, 404);
    }

    // Get tenant settings
    const { data: tenantSettingsData } = await supabase
      .from('tams360_tenant_settings_v')
      .select('settings')
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    const settings = tenantSettingsData?.settings || {};

    // Build query with JOIN to assets
    let query = supabase
      .from('tams360_maintenance_v')
      .select(`
        *,
        asset:tams360_assets_v!inner(
          id,
          asset_ref,
          asset_type,
          assigned_to
        )
      `);

    // NEW: Apply assigned filter if enabled and user is not admin
    if (settings.show_assigned_assets_only && userProfile.role !== 'admin') {
      query = query.eq('asset.assigned_to', userProfile.id);
    }

    const { data: tasks, error: tasksError } = await query;

    if (tasksError) {
      console.error('Error fetching maintenance tasks:', tasksError);
      return c.json({ error: 'Failed to fetch maintenance tasks' }, 500);
    }

    return c.json({ tasks: tasks || [] });
  } catch (error) {
    console.error("Error in GET /maintenance:", error);
    return c.json({ error: "Failed to fetch maintenance tasks" }, 500);
  }
});
```

---

## Common Utility Hook (Recommended)

Create a reusable hook for consistent filtering:

**Create new file:** `/src/app/hooks/useAssignedFilter.tsx`

```typescript
import { useContext } from 'react';
import { AuthContext } from '../App';
import { useTenant } from '../contexts/TenantContext';

export function useAssignedFilter() {
  const { user } = useContext(AuthContext);
  const { settings } = useTenant();

  const shouldFilterByAssigned = () => {
    return settings?.show_assigned_assets_only && user?.role !== 'admin';
  };

  const filterAssets = <T extends { assigned_to?: string }>(assets: T[]): T[] => {
    if (!shouldFilterByAssigned()) return assets;
    return assets.filter(asset => asset.assigned_to === user?.id);
  };

  const filterByAssetId = <T extends { asset_id: string }>(
    items: T[], 
    assignedAssets: { id: string }[]
  ): T[] => {
    if (!shouldFilterByAssigned()) return items;
    const assignedAssetIds = new Set(assignedAssets.map(a => a.id));
    return items.filter(item => assignedAssetIds.has(item.asset_id));
  };

  return {
    shouldFilterByAssigned: shouldFilterByAssigned(),
    filterAssets,
    filterByAssetId,
  };
}
```

**Usage in any component:**

```typescript
import { useAssignedFilter } from '../../hooks/useAssignedFilter';

function AssetsPage() {
  const { filterAssets } = useAssignedFilter();
  
  const fetchAssets = async () => {
    // ... fetch logic ...
    let assets = data.assets;
    
    // Apply filter
    assets = filterAssets(assets);
    
    setAssets(assets);
  };
}
```

---

## Testing the Implementation

### Test Case 1: Setting Disabled (Default)
1. Ensure "Show Assigned Assets Only" is OFF in Tenant Settings
2. Login as non-admin user
3. Navigate to Assets page
4. **Expected:** See all assets in the tenant

### Test Case 2: Setting Enabled - Non-Admin User
1. Enable "Show Assigned Assets Only" in Tenant Settings
2. Login as non-admin user (e.g., supervisor or field_user)
3. Navigate to Assets page
4. **Expected:** Only see assets where `assigned_to = current_user.id`
5. Navigate to Inspections
6. **Expected:** Only see inspections for assigned assets
7. Navigate to GIS Map
8. **Expected:** Only see markers for assigned assets

### Test Case 3: Setting Enabled - Admin User
1. Keep "Show Assigned Assets Only" ON
2. Login as admin user
3. Navigate to all pages
4. **Expected:** Admin sees ALL assets regardless of assignment

### Test Case 4: No Assigned Assets
1. Enable setting
2. Login as user with no assigned assets
3. **Expected:** Empty state displayed (no assets shown)

---

## Rollback Instructions

If you need to disable this feature:

1. **In Tenant Settings:** Toggle "Show Assigned Assets Only" to OFF
2. **Remove Code:** Comment out or remove the filtering logic added above
3. **Database:** No changes needed - the `assigned_to` column can remain

---

## Performance Considerations

1. **Frontend Filtering:** Simple but may load unnecessary data
   - Use for small datasets (<1000 records)
   
2. **Backend Filtering:** More efficient, recommended for production
   - Reduces data transfer
   - Faster page loads
   - Better security

3. **Caching:** Consider caching tenant settings to avoid repeated fetches

---

## Security Note

The backend filtering approach is more secure because:
- Data never leaves the server if user shouldn't see it
- Frontend code can be inspected and bypassed
- Database-level filtering is the most secure

**Recommendation:** Implement backend filtering for production use.

---

*Last Updated: January 16, 2026*
