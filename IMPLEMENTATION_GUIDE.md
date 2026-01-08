# TAMS360 Implementation Guide - Fixes & Enhancements

This guide addresses all reported issues and provides step-by-step implementation instructions.

## Issues to Fix

1. ✅ Maintenance record shows "Unknown" for asset
2. ✅ Completed maintenance not showing in summary
3. ✅ Reports download functionality (PDF/CSV/Excel with tenant branding)
4. ⚠️ Logo upload in tenant settings  
5. ✅ Add components to inspection templates

---

## 1. Maintenance Record Fixes

### Backend Fix (ALREADY DONE)
The `/supabase/functions/server/index.tsx` file has been updated to:
- Join with `assets` table to fetch asset details
- Include `completed_date` in stats calculation
- Properly count completed maintenance this month

### What This Fixes
- Asset numbers will now display correctly instead of "Unknown"
- Completed maintenance count will appear in the summary

---

## 2. Reports Download Implementation

### Step 1: Report Generators Created
File `/src/app/utils/reportGenerators.ts` has been created with:
- PDF generation with tenant branding
- Excel generation  
- CSV generation
- Tenant logo, colors, and organization name support

### Step 2: Update ReportsPage.tsx

You need to update `/src/app/components/reports/ReportsPage.tsx`:

**Add these imports at the top:**
```typescript
import { downloadReport } from '../utils/reportGenerators';
```

**Replace the `handleExportReport` function:**
```typescript
const handleExportReport = async (reportType: string, format: string) => {
  try {
    setLoading(true);
    
    // Fetch tenant settings
    const tenantRes = await fetch(`${API_URL}/tenant-settings`, {
      headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
    });
    const tenantData = tenantRes.ok ? await tenantRes.json() : {};
    const tenant = tenantData.settings || {};

    // Fetch appropriate data based on report type
    let data: any[] = [];
    let columns: any[] = [];
    let title = reportType;
    let fileName = reportType.toLowerCase().replace(/ /g, '-');

    switch (reportType) {
      case 'Asset Inventory':
        const assetsRes = await fetch(`${API_URL}/assets`, {
          headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
        });
        const assetsData = await assetsRes.json();
        data = assetsData.assets || [];
        columns = [
          { header: 'Asset Number', key: 'asset_number' },
          { header: 'Asset Type', key: 'asset_type_name' },
          { header: 'Route/Road', key: 'route_road' },
          { header: 'Chainage', key: 'chainage_km' },
          { header: 'Condition Index', key: 'condition_index' },
          { header: 'Status', key: 'status' },
          { header: 'Replacement Value (ZAR)', key: 'replacement_value' },
        ];
        break;

      case 'Condition Summary':
        const ciRes = await fetch(`${API_URL}/assets`, {
          headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
        });
        const ciData = await ciRes.json();
        data = ciData.assets || [];
        columns = [
          { header: 'Asset Number', key: 'asset_number' },
          { header: 'Asset Type', key: 'asset_type_name' },
          { header: 'Condition Index (CI)', key: 'condition_index' },
          { header: 'Degree', key: 'degree_score' },
          { header: 'Extent', key: 'extent_score' },
          { header: 'Relevancy', key: 'relevancy_score' },
          { header: 'Urgency Category', key: 'urgency_category' },
        ];
        break;

      case 'Asset Valuation':
        const valRes = await fetch(`${API_URL}/assets`, {
          headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
        });
        const valData = await valRes.json();
        data = valData.assets || [];
        columns = [
          { header: 'Asset Number', key: 'asset_number' },
          { header: 'Asset Type', key: 'asset_type_name' },
          { header: 'Replacement Value (ZAR)', key: 'replacement_value' },
          { header: 'Current Value (ZAR)', key: 'current_value' },
          { header: 'Depreciation Rate (%)', key: 'depreciation_rate' },
          { header: 'Installation Date', key: 'installation_date' },
        ];
        break;

      case 'Assets by Location':
        const locRes = await fetch(`${API_URL}/assets`, {
          headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
        });
        const locData = await locRes.json();
        data = locData.assets || [];
        columns = [
          { header: 'Route/Road', key: 'route_road' },
          { header: 'Section', key: 'section' },
          { header: 'Chainage (km)', key: 'chainage_km' },
          { header: 'Asset Number', key: 'asset_number' },
          { header: 'Asset Type', key: 'asset_type_name' },
          { header: 'Side of Road', key: 'side_of_road' },
        ];
        break;

      case 'Inspection Summary':
        const inspRes = await fetch(`${API_URL}/inspections`, {
          headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
        });
        const inspData = await inspRes.json();
        data = inspData.inspections || [];
        columns = [
          { header: 'Asset Number', key: 'asset_number' },
          { header: 'Inspection Date', key: 'inspection_date' },
          { header: 'Inspector', key: 'inspector_name' },
          { header: 'Condition Index', key: 'condition_index' },
          { header: 'Status', key: 'status' },
        ];
        break;

      case 'Maintenance History':
        const maintRes = await fetch(`${API_URL}/maintenance`, {
          headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
        });
        const maintData = await maintRes.json();
        data = maintData.records || [];
        columns = [
          { header: 'Asset Number', key: 'asset_number' },
          { header: 'Maintenance Type', key: 'maintenance_type' },
          { header: 'Scheduled Date', key: 'scheduled_date' },
          { header: 'Completed Date', key: 'completed_date' },
          { header: 'Status', key: 'status' },
          { header: 'Cost (ZAR)', key: 'actual_cost' },
        ];
        break;

      default:
        toast.error('Unknown report type');
        return;
    }

    // Download report
    await downloadReport(format.toLowerCase() as 'pdf' | 'excel' | 'csv', {
      title,
      data,
      columns,
      tenant: {
        organizationName: tenant.organization_name,
        logoUrl: tenant.logo_url,
        primaryColor: tenant.primary_color,
        regionName: tenant.region_name,
        currency: 'ZAR',
      },
      fileName: `${fileName}-${new Date().toISOString().split('T')[0]}`,
      includeDate: true,
      includeFooter: true,
    });

    toast.success(`${reportType} exported as ${format} successfully!`);
  } catch (error) {
    console.error('Error exporting report:', error);
    toast.error(`Failed to export report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    setLoading(false);
  }
};
```

---

## 3. Export Data Tab Implementation

### Update ExportDataTab in DataManagementPage

Similar to reports, update the export functions in `/src/app/components/data/DataManagementPage.tsx`:

**Add import:**
```typescript
import { downloadReport } from '../utils/reportGenerators';
```

**Replace export functions:**
```typescript
const handleExportAssets = async (format: string) => {
  try {
    const response = await fetch(`${API_URL}/assets`, {
      headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
    });
    const data = await response.json();
    
    // Fetch tenant settings
    const tenantRes = await fetch(`${API_URL}/tenant-settings`, {
      headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
    });
    const tenantData = tenantRes.ok ? await tenantRes.json() : {};
    const tenant = tenantData.settings || {};

    await downloadReport(format.toLowerCase() as 'pdf' | 'excel' | 'csv', {
      title: 'Assets Export',
      data: data.assets || [],
      columns: [
        { header: 'Asset Number', key: 'asset_number' },
        { header: 'Asset Type', key: 'asset_type_name' },
        { header: 'Route/Road', key: 'route_road' },
        { header: 'Chainage', key: 'chainage_km' },
        { header: 'Condition Index', key: 'condition_index' },
        { header: 'Status', key: 'status' },
      ],
      tenant: {
        organizationName: tenant.organization_name,
        logoUrl: tenant.logo_url,
        primaryColor: tenant.primary_color,
      },
      fileName: `assets-export-${new Date().toISOString().split('T')[0]}`,
    });

    toast.success(`Assets exported as ${format}!`);
  } catch (error) {
    console.error('Export error:', error);
    toast.error('Failed to export assets');
  }
};

// Similar functions for Inspections and Maintenance
```

---

## 4. Logo Upload Implementation

### Backend: Add Logo Upload Endpoint

Add to `/supabase/functions/server/index.tsx`:

```typescript
// Logo upload endpoint
app.post("/make-server-c894a9ff/tenant-settings/logo", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const formData = await c.req.formData();
    const file = formData.get('logo');
    
    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Create bucket if it doesn't exist
    const bucketName = 'make-c894a9ff-logos';
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, { public: false });
    }

    // Upload file
    const fileName = `logo-${Date.now()}.${file.type.split('/')[1]}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return c.json({ error: 'Failed to upload logo' }, 500);
    }

    // Get signed URL
    const { data: urlData } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 365 * 24 * 60 * 60); // 1 year

    return c.json({ 
      success: true, 
      logo_url: urlData?.signedUrl 
    });
  } catch (error) {
    console.error('Logo upload error:', error);
    return c.json({ error: 'Failed to upload logo' }, 500);
  }
});
```

### Frontend: Update TenantSettingsPage

In `/src/app/components/admin/TenantSettingsPage.tsx`, add logo upload:

```typescript
const [logoFile, setLogoFile] = useState<File | null>(null);
const [uploading, setUploading] = useState(false);

const handleLogoUpload = async () => {
  if (!logoFile) return;
  
  try {
    setUploading(true);
    const formData = new FormData();
    formData.append('logo', logoFile);
    
    const response = await fetch(`${API_URL}/tenant-settings/logo`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken || publicAnonKey}`,
      },
      body: formData,
    });
    
    const data = await response.json();
    if (data.logo_url) {
      setSettings({ ...settings, logo_url: data.logo_url });
      toast.success('Logo uploaded successfully!');
      setLogoFile(null);
    }
  } catch (error) {
    console.error('Logo upload error:', error);
    toast.error('Failed to upload logo');
  } finally {
    setUploading(false);
  }
};

// In JSX:
<div className="space-y-2">
  <Label>Organization Logo</Label>
  <Input 
    type="file" 
    accept="image/*"
    onChange={(e) => e.target.files && setLogoFile(e.target.files[0])}
  />
  {logoFile && (
    <Button onClick={handleLogoUpload} disabled={uploading}>
      {uploading ? 'Uploading...' : 'Upload Logo'}
    </Button>
  )}
  {settings.logo_url && (
    <img src={settings.logo_url} alt="Logo" className="mt-2 h-20" />
  )}
</div>
```

---

## 5. Add Components to Inspection Templates

### Update ComponentTemplatesPage.tsx

Add functionality to add new components. Here's the key addition:

```typescript
const [showAddComponent, setShowAddComponent] = useState<string | null>(null);
const [newComponent, setNewComponent] = useState({
  component_name: '',
  what_to_inspect: '',
  quantity_unit: '',
});

const handleAddComponent = async (templateId: string) => {
  try {
    const response = await fetch(`${API_URL}/component-templates/${templateId}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken || publicAnonKey}`,
      },
      body: JSON.stringify({
        ...newComponent,
        component_order: (selectedTemplate?.items?.length || 0) + 1,
      }),
    });

    if (response.ok) {
      toast.success('Component added successfully!');
      fetchData();
      setShowAddComponent(null);
      setNewComponent({ component_name: '', what_to_inspect: '', quantity_unit: '' });
    }
  } catch (error) {
    console.error('Error adding component:', error);
    toast.error('Failed to add component');
  }
};

// In JSX, add an "Add Component" button for each template
```

### Backend: Add Component Item Endpoint

Add to `/supabase/functions/server/index.tsx`:

```typescript
// Add component item to template
app.post("/make-server-c894a9ff/component-templates/:id/items", async (c) => {
  try {
    const templateId = c.req.param("id");
    const item = await c.req.json();
    
    const { data, error } = await supabase
      .from('asset_component_template_items')
      .insert({
        template_id: templateId,
        component_name: item.component_name,
        what_to_inspect: item.what_to_inspect,
        quantity_unit: item.quantity_unit,
        component_order: item.component_order,
        degree_rubric: item.degree_rubric || {},
        extent_rubric: item.extent_rubric || {},
        relevancy_rubric: item.relevancy_rubric || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding component item:', error);
      return c.json({ error: 'Failed to add component' }, 500);
    }

    return c.json({ success: true, item: data });
  } catch (error) {
    console.error('Error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});
```

---

## 6. Fix Asset Component Descriptions

### Update Correct Descriptions

Only Gantry and Road Markings have correct descriptions. For other asset types, you need to manually update the component descriptions in the database or through the UI.

Use the **Inspection Templates** page to:
1. Click on each template
2. Edit component descriptions
3. Save changes

---

## Summary of Changes

### Files Created:
1. ✅ `/src/app/utils/reportGenerators.ts` - Report generation utility

### Files to Update:
1. `/src/app/components/reports/ReportsPage.tsx` - Add real download functionality
2. `/src/app/components/data/DataManagementPage.tsx` - Add export functionality  
3. `/src/app/components/admin/TenantSettingsPage.tsx` - Add logo upload
4. `/src/app/components/admin/ComponentTemplatesPage.tsx` - Add component addition
5. `/supabase/functions/server/index.tsx` - Add logo upload and component endpoints

### Backend Already Fixed:
- ✅ Maintenance records now include asset details
- ✅ Stats calculation includes completed_date

---

## Testing Checklist

- [ ] Test PDF export with tenant logo and branding
- [ ] Test Excel export
- [ ] Test CSV export  
- [ ] Test logo upload in tenant settings
- [ ] Test adding components to templates
- [ ] Verify maintenance records show correct asset numbers
- [ ] Verify completed maintenance count is accurate

---

## Next Steps

1. Update the files listed above with the provided code
2. Test each feature thoroughly
3. Adjust styling/formatting as needed
4. Ensure all currency displays use ZAR format

Let me know if you need help with any specific part!
