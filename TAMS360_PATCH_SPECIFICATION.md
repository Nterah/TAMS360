# TAMS360 PATCH/DELTA SPECIFICATION
**Version:** 2.0 PATCH  
**Status:** CRITICAL FIXES REQUIRED  
**Purpose:** Fix missing data, incomplete reports, and blank displays while keeping existing layout/styling

---

## 🚨 CRITICAL CONTEXT

**Previous claims:** Many fixes marked "✅ completed"  
**Current reality:** App still shows missing/blank data, incomplete reports, incorrect calculations  
**This spec:** Defines EXACTLY what must be fixed with PROOF requirements

**Rules:**
- ❌ NO redesigns - keep current layout, colors, typography
- ✅ ADD missing data displays only
- ✅ SHOW explicit states: Empty / Null / Not mapped / Error
- ✅ Every fix has acceptance checklist (with screenshots/data proof)

---

# A) REPORTS PATCH (13 PDFs + Preview)

## A1. TENANT HEADER - INCOMPLETE BRANDING

### 📸 Current State (V1)
```
[Logo] Organization Name
       Region Name
       Address
```

### 🎯 Required State (V2 PATCH)
```
[Logo] Organization Name
       Tagline (if configured)
       Region Name
       Address | Phone
       Email | Website
```

### 🔧 Patch Requirements

**Add to Header Component:**
1. **Tenant Email** - Display below/beside phone
2. **Tagline** - Display below organization name (italic, smaller font)
3. **Layout:** Keep existing spacing, extend vertically if needed

**Data Source:**
- `tenant.email`
- `tenant.tagline`
- `tenant.phone`
- `tenant.website`

**Empty States:**
- If `tagline` is NULL → skip line (don't show empty space)
- If `email` is NULL → show "—"
- If `phone` is NULL → show "—"

### ✅ Acceptance Checklist

- [ ] **Proof 1:** PDF export shows tenant email when configured
- [ ] **Proof 2:** PDF export shows tagline when configured
- [ ] **Proof 3:** PDF with NULL tagline skips line (no empty space)
- [ ] **Proof 4:** All 13 report types use updated header
- [ ] **Screenshot:** Side-by-side before/after header comparison

---

## A2. REPORTS PATCH MATRIX - MISSING FIELDS

### 📊 REPORT 1: CI Trends Report

**File:** Current exports show incomplete data

| Field | Current State | Required Fix | Data Source |
|-------|---------------|--------------|-------------|
| **Condition Index** | Blank for many rows | Show CI value OR "—" if NULL | `inspection.ci_value` OR `inspection.conditional_index` |
| **Urgency Category** | Sometimes blank | Show urgency OR "—" if NULL | `inspection.calculated_urgency` |
| **Asset Description** | May be blank | Show `asset.description` OR "—" | `asset.description` |

**Backend Query Fix:**
```typescript
// Must join inspections with assets properly
SELECT 
  i.inspection_id,
  i.inspection_date,
  i.ci_value,
  i.conditional_index,
  i.calculated_urgency,
  a.asset_ref,
  a.description,
  a.asset_type_name
FROM tams360_inspections_app i
JOIN tams360_assets_app a ON i.asset_id = a.asset_id
WHERE i.tenant_id = ?
ORDER BY i.inspection_date DESC
```

#### ✅ Acceptance Checklist
- [ ] **Proof 1:** Export PDF → CI shows numeric value for ALL rows with inspections
- [ ] **Proof 2:** If CI is NULL, cell shows "—" (not blank)
- [ ] **Proof 3:** Urgency shows text value for ALL rows with inspections
- [ ] **Proof 4:** Description populated from `assets` table
- [ ] **Screenshot:** Full report showing 10+ rows with complete data
- [ ] **Data verification:** Run SQL query → count NULLs → verify PDF matches

---

### 📊 REPORT 2: Asset Valuation Report

| Field | Current State | Required Fix | Data Source |
|-------|---------------|--------------|-------------|
| **Description** | Blank for ALL rows | Populate from assets table | `asset.description` |
| **Replacement Value (ZAR)** | Blank for ALL rows | Show `replacement_value` formatted | `asset.replacement_value` |
| **Current Value** | May be missing | Calculate depreciated value | `calculated_current_value` |
| **Install Date** | May show "Invalid Date" | Format date OR show "—" | `asset.install_date` |

**Backend Query Fix:**
```typescript
SELECT 
  asset_ref,
  asset_type_name,
  description,
  replacement_value,
  current_value,
  install_date,
  useful_life_years,
  remaining_life_years
FROM tams360_assets_app
WHERE tenant_id = ?
  AND replacement_value IS NOT NULL
ORDER BY replacement_value DESC
```

**Value Formatting:**
- `replacement_value` → "R 150,000.00"
- `current_value` → "R 120,000.00"
- NULL values → "—"

#### ✅ Acceptance Checklist
- [ ] **Proof 1:** Description column populated for ALL rows
- [ ] **Proof 2:** Replacement Value shows formatted currency for ALL rows
- [ ] **Proof 3:** Current Value calculated and displayed
- [ ] **Proof 4:** Install Date formatted as "DD MMM YYYY" OR shows "—"
- [ ] **Proof 5:** No "Invalid Date" appears anywhere
- [ ] **Screenshot:** Full report showing 10+ rows with values

---

### 📊 REPORT 3: Inspection Summary Report

| Field | Current State | Required Fix | Data Source |
|-------|---------------|--------------|-------------|
| **Status** | Blank for ALL rows | Show inspection status | `inspection.status` (defaults to "Completed") |
| **CI** | Blank for many rows | Show CI value OR "—" | `inspection.ci_value` |
| **Urgency** | Sometimes blank | Show urgency OR "—" | `inspection.calculated_urgency` |
| **Inspector Name** | May be blank | Show inspector name | `inspection.inspector_name` |
| **Inspection Type** | Missing | Add column, show type | `inspection.inspection_type` |

**Backend Query Fix:**
```typescript
SELECT 
  i.inspection_id,
  i.inspection_date,
  i.inspection_type,
  i.inspector_name,
  COALESCE(i.status, 'Completed') as status,
  i.ci_value,
  i.calculated_urgency,
  i.finding_summary,
  a.asset_ref,
  a.asset_type_name
FROM tams360_inspections_app i
JOIN tams360_assets_app a ON i.asset_id = a.asset_id
WHERE i.tenant_id = ?
```

#### ✅ Acceptance Checklist
- [ ] **Proof 1:** Status column shows value for ALL rows (defaults "Completed")
- [ ] **Proof 2:** CI shows numeric value OR "—"
- [ ] **Proof 3:** Urgency shows text value OR "—"
- [ ] **Proof 4:** Inspector Name populated
- [ ] **Proof 5:** NEW: Inspection Type column added and populated
- [ ] **Screenshot:** Report showing Status + Type columns

---

### 📊 REPORT 4: Defect Analysis Report

| Field | Current State | Required Fix | Data Source |
|-------|---------------|--------------|-------------|
| **CI** | Blank for many rows | Show CI value OR "—" | `inspection.ci_value` |
| **Urgency** | Sometimes blank | Show urgency OR "—" | `inspection.calculated_urgency` |
| **Defect Count** | May be zero | Show count of components with issues | COUNT of component scores < threshold |
| **Remedial Cost** | May be blank | Show cost OR "—" | `inspection.total_remedial_cost` |

#### ✅ Acceptance Checklist
- [ ] **Proof 1:** CI populated for all inspections
- [ ] **Proof 2:** Urgency populated for all inspections
- [ ] **Proof 3:** Defect count calculated correctly
- [ ] **Proof 4:** Remedial cost formatted as currency
- [ ] **Screenshot:** Report with defect data

---

### 📊 REPORT 5: Maintenance Summary Report

| Field | Current State | Required Fix | Data Source |
|-------|---------------|--------------|-------------|
| **Actual Cost (ZAR)** | Blank for ALL rows | Show cost formatted OR "—" | `maintenance.cost` OR `maintenance.actual_cost` |
| **Contractor** | Blank for ALL rows | Show contractor name | `maintenance.contractor` OR `maintenance.assigned_to_name` |
| **Priority** | Blank for rows | Show priority level | `maintenance.priority` |
| **Status** | Should show | Verify displays | `maintenance.status` |

**Backend Query Fix:**
```typescript
SELECT 
  m.maintenance_id,
  m.work_order_number,
  m.maintenance_type,
  m.scheduled_date,
  m.completed_date,
  m.status,
  m.priority,
  m.cost,
  m.assigned_to_name as contractor,
  a.asset_ref,
  a.asset_type_name
FROM tams360_maintenance_v m
JOIN tams360_assets_app a ON m.asset_id = a.asset_id
WHERE m.tenant_id = ?
```

#### ✅ Acceptance Checklist
- [ ] **Proof 1:** Cost column shows formatted currency OR "—"
- [ ] **Proof 2:** Contractor column populated with technician name
- [ ] **Proof 3:** Priority column shows High/Medium/Low OR "—"
- [ ] **Proof 4:** All maintenance records exported
- [ ] **Screenshot:** Report with cost + contractor visible
- [ ] **Data proof:** SQL query showing cost values exist → PDF shows them

---

### 📊 REPORT 6: Asset Inventory Report

| Field | Current State | Required Fix | Data Source |
|-------|---------------|--------------|-------------|
| **Description** | Blank for ALL rows | Populate from assets | `asset.description` |
| **Chainage** | Blank for ALL rows | Show km_marker OR "—" | `asset.km_marker` |
| **Status** | Blank for ALL rows | Show status | `asset.status_name` |
| **CI** | Partially blank | Show latest_ci OR "—" | `asset.latest_ci` |
| **Region** | May be blank | Show region OR "—" | `asset.region` |
| **Depot** | May be blank | Show depot OR "—" | `asset.depot` |

**Backend Query Fix:**
```typescript
SELECT 
  asset_id,
  asset_ref,
  asset_type_name,
  description,
  road_number,
  road_name,
  km_marker as chainage,
  status_name as status,
  latest_ci,
  latest_urgency,
  region,
  depot,
  install_date
FROM tams360_assets_app
WHERE tenant_id = ?
ORDER BY asset_ref
```

#### ✅ Acceptance Checklist
- [ ] **Proof 1:** Description column populated for ALL assets
- [ ] **Proof 2:** Chainage shows km value OR "—"
- [ ] **Proof 3:** Status shows status name OR "—"
- [ ] **Proof 4:** CI shows value OR "—"
- [ ] **Proof 5:** Region and Depot columns present and populated
- [ ] **Screenshot:** Full inventory with all columns

---

### 📊 REPORT 7: Work Order Status Report

| Field | Current State | Required Fix | Data Source |
|-------|---------------|--------------|-------------|
| **Priority** | Blank for ALL rows | Show priority | `maintenance.priority` |
| **Contractor** | Blank for ALL rows | Show contractor | `maintenance.assigned_to_name` |
| **Status** | Should show | Verify displays | `maintenance.status` |
| **Scheduled Date** | May show "Invalid Date" | Format date OR "—" | `maintenance.scheduled_date` |
| **Cost** | May be blank | Show cost OR "—" | `maintenance.cost` |

#### ✅ Acceptance Checklist
- [ ] **Proof 1:** Priority column shows High/Medium/Low for all work orders
- [ ] **Proof 2:** Contractor column populated
- [ ] **Proof 3:** Dates formatted correctly, no "Invalid Date"
- [ ] **Proof 4:** Cost column shows values
- [ ] **Screenshot:** Work order report with priority + contractor

---

### 📊 REPORT 8: Condition Summary Report

| Field | Current State | Required Fix | Data Source |
|-------|---------------|--------------|-------------|
| **Description** | Blank for ALL rows | Populate from assets | `asset.description` |
| **Last Inspection** | Shows "Invalid Date" / blank | Format date OR "—" | Latest `inspection.inspection_date` for asset |
| **CI** | Partially blank | Show latest_ci OR "—" | `asset.latest_ci` |
| **Urgency** | May be blank | Show latest_urgency OR "—" | `asset.latest_urgency` |

**Backend Query Fix:**
```typescript
SELECT 
  a.asset_ref,
  a.asset_type_name,
  a.description,
  a.latest_ci,
  a.latest_urgency,
  a.status_name,
  MAX(i.inspection_date) as last_inspection_date
FROM tams360_assets_app a
LEFT JOIN tams360_inspections_app i ON a.asset_id = i.asset_id
WHERE a.tenant_id = ?
GROUP BY a.asset_id
ORDER BY a.latest_ci ASC NULLS LAST
```

#### ✅ Acceptance Checklist
- [ ] **Proof 1:** Description populated for ALL rows
- [ ] **Proof 2:** Last Inspection shows formatted date OR "—" (never "Invalid Date")
- [ ] **Proof 3:** CI shows value for inspected assets
- [ ] **Proof 4:** Urgency shows value for inspected assets
- [ ] **Screenshot:** Report with last inspection dates formatted

---

### 📊 REPORT 9: Inspector Performance Report

| Field | Current State | Required Fix | Data Source |
|-------|---------------|--------------|-------------|
| **Status** | Blank for ALL rows | Show inspection status | `inspection.status` (default "Completed") |
| **CI** | Blank for many rows | Show CI OR "—" | `inspection.ci_value` |
| **Inspection Type** | Missing | Add column | `inspection.inspection_type` |
| **Duration** | May be missing | Calculate if possible | `completed_date - inspection_date` |

#### ✅ Acceptance Checklist
- [ ] **Proof 1:** Status column populated (defaults "Completed")
- [ ] **Proof 2:** CI shows values for all inspections
- [ ] **Proof 3:** Inspection counts accurate per inspector
- [ ] **Screenshot:** Inspector performance with status + CI

---

### 📊 REPORT 10: Maintenance Strategy Report

| Field | Current State | Required Fix | Data Source |
|-------|---------------|--------------|-------------|
| **Cost (ZAR)** | Blank for ALL rows | Show estimated/actual cost | `maintenance.cost` |
| **Frequency** | May be blank | Show frequency if configured | `maintenance.frequency` OR calculated |
| **Priority** | May be blank | Show priority | `maintenance.priority` |

#### ✅ Acceptance Checklist
- [ ] **Proof 1:** Cost column shows values OR "—"
- [ ] **Proof 2:** Maintenance type populated for all rows
- [ ] **Screenshot:** Strategy report with costs

---

### 📊 REPORT 11: Custom Assets Report

| Field | Current State | Required Fix | Data Source |
|-------|---------------|--------------|-------------|
| **Description** | Blank for ALL rows | Populate | `asset.description` |
| **Chainage** | Blank for ALL rows | Show km_marker | `asset.km_marker` |
| **Status** | Blank for ALL rows | Show status | `asset.status_name` |
| **CI** | Partially blank | Show latest_ci | `asset.latest_ci` |

**This report uses same data as Asset Inventory (Report 6)**

#### ✅ Acceptance Checklist
- [ ] **Proof 1:** All fields populated same as Asset Inventory
- [ ] **Proof 2:** Custom filters apply correctly
- [ ] **Screenshot:** Custom report with complete data

---

### 📊 REPORT 12: Cost Analysis Report

| Field | Current State | Required Fix | Data Source |
|-------|---------------|--------------|-------------|
| **Actual Cost (ZAR)** | Blank for ALL rows | Show actual cost | `maintenance.cost` |
| **Estimated Cost** | Should show | Verify displays | `maintenance.estimated_cost` |
| **Cost Variance** | Present (but no actual cost??) | Fix: Shows variance only if both actual & estimated exist | `actual_cost - estimated_cost` |

**Critical Issue:** Cost Variance exists but Actual Cost doesn't = BROKEN LOGIC

**Backend Fix:**
```typescript
SELECT 
  m.maintenance_id,
  m.work_order_number,
  m.cost as actual_cost,
  m.estimated_cost,
  (m.cost - m.estimated_cost) as cost_variance,
  m.scheduled_date,
  m.completed_date,
  a.asset_ref,
  a.asset_type_name
FROM tams360_maintenance_v m
JOIN tams360_assets_app a ON m.asset_id = a.asset_id
WHERE m.tenant_id = ?
  AND m.cost IS NOT NULL
ORDER BY ABS(m.cost - m.estimated_cost) DESC
```

#### ✅ Acceptance Checklist
- [ ] **Proof 1:** Actual Cost column shows values for completed work
- [ ] **Proof 2:** Estimated Cost shows values
- [ ] **Proof 3:** Cost Variance calculated ONLY when both exist
- [ ] **Proof 4:** Variance color-coded (red = over budget, green = under budget)
- [ ] **Screenshot:** Cost analysis showing actual + estimated + variance
- [ ] **Logic test:** Export 10 rows → verify variance = actual - estimated

---

### 📊 REPORT 13: Assets by Location Report

| Field | Current State | Required Fix | Data Source |
|-------|---------------|--------------|-------------|
| **Section** | Blank for ALL rows | Show road section if available | `asset.road_section` OR calculated from km_marker |
| **Chainage** | Blank for ALL rows | Show km_marker | `asset.km_marker` |
| **Latitude** | Blank for ALL rows | Show GPS lat | `asset.gps_lat` |
| **Longitude** | Blank for ALL rows | Show GPS lng | `asset.gps_lng` |

**Backend Query Fix:**
```typescript
SELECT 
  asset_ref,
  asset_type_name,
  description,
  road_number,
  road_name,
  km_marker as chainage,
  road_section,
  gps_lat as latitude,
  gps_lng as longitude,
  region,
  depot
FROM tams360_assets_app
WHERE tenant_id = ?
  AND (gps_lat IS NOT NULL OR km_marker IS NOT NULL)
ORDER BY road_number, km_marker
```

#### ✅ Acceptance Checklist
- [ ] **Proof 1:** Chainage column shows km values
- [ ] **Proof 2:** Latitude column shows GPS coordinates OR "—"
- [ ] **Proof 3:** Longitude column shows GPS coordinates OR "—"
- [ ] **Proof 4:** Section column shows road section if available
- [ ] **Screenshot:** Location report with GPS coordinates
- [ ] **Map test:** Pick 3 assets → verify GPS coordinates on map

---

## A3. "INVALID DATE" ELIMINATION

### 🚨 Current Problem
Reports show "Invalid Date" for date fields instead of proper formatting or empty state.

### 🎯 Required Fix

**Date Formatting Function:**
```typescript
function formatReportDate(dateValue: any): string {
  if (!dateValue) return "—";
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return "—";
    }
    return date.toLocaleDateString('en-ZA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }); // "14 Jan 2025"
  } catch (error) {
    console.warn('[Report Date Format] Invalid date:', dateValue);
    return "—";
  }
}
```

**Apply to ALL date fields:**
- `install_date`
- `inspection_date`
- `scheduled_date`
- `completed_date`
- `created_at`
- `last_inspection_date`

**Empty State with Tooltip (Optional Enhancement):**
```
Display: "—" with small info icon (ℹ)
Tooltip: "Date not available"
```

### ✅ Acceptance Checklist
- [ ] **Proof 1:** Search all 13 PDFs for "Invalid Date" → 0 results
- [ ] **Proof 2:** NULL dates show "—"
- [ ] **Proof 3:** Valid dates format as "DD MMM YYYY"
- [ ] **Proof 4:** No JavaScript date errors in console
- [ ] **Screenshot:** Date columns in 5 different reports

---

## A4. CUSTOM REPORT GRAPHS - MISSING FEATURE

### 📸 Current State
Custom Reports page allows:
- Select report type (Assets / Inspections / Maintenance)
- Filter by type, region, date
- Export to PDF/CSV

**Missing:** No option to include charts/graphs

### 🎯 Required State (V2 PATCH)

**Add "Charts" Section to Custom Report Builder:**

```
┌─────────────────────────────────────────────┐
│ Custom Report Builder                       │
├─────────────────────────────────────────────┤
│ Report Type: [Assets ▼]                    │
│ Asset Type:  [All ▼]                       │
│ Region:      [All ▼]                       │
├─────────────────────────────────────────────┤
│ ☑ Include Charts in Export (PDF/Word)      │
├─────────────────────────────────────────────┤
│ Available Charts:                           │
│ ☐ CI Distribution (bar chart)              │
│ ☐ Urgency Distribution (pie chart)         │
│ ☐ Trend Over Time (line chart)             │
│ ☐ Assets by Type (bar chart)               │
│ ☐ Cost Analysis (bar chart)                │
├─────────────────────────────────────────────┤
│ [Preview Charts] [Generate Report]          │
└─────────────────────────────────────────────┘
```

**Preview Charts Modal:**
- Opens modal showing selected charts with current data
- User confirms charts look correct before export
- "Continue to Export" button

**Chart Rendering in PDF:**

1. **Convert charts to images:**
```typescript
import html2canvas from 'html2canvas';

async function captureChartAsImage(chartRef: HTMLElement): Promise<string> {
  const canvas = await html2canvas(chartRef, {
    backgroundColor: '#ffffff',
    scale: 2, // Higher quality
  });
  return canvas.toDataURL('image/png');
}
```

2. **Insert in PDF:**
```typescript
// After table, before footer
if (options.includeCharts && options.chartImages) {
  doc.addPage();
  doc.setFontSize(14);
  doc.text('Charts & Analytics', 15, 20);
  
  let yPos = 30;
  options.chartImages.forEach((chart, index) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.addImage(chart.image, 'PNG', 15, yPos, 180, 100);
    doc.setFontSize(10);
    doc.text(chart.title, 15, yPos + 105);
    yPos += 120;
  });
}
```

3. **Update ReportOptions interface:**
```typescript
export interface ReportOptions {
  title: string;
  data: any[];
  columns: { header: string; key: string; width?: number }[];
  tenant: TenantSettings;
  fileName: string;
  includeDate?: boolean;
  includeFooter?: boolean;
  includeCharts?: boolean; // NEW
  chartImages?: Array<{ // NEW
    title: string;
    image: string; // base64 data URL
  }>;
}
```

**Empty State Handling:**

If selected charts cannot render (insufficient data):
```
┌───────────────────────────────────┐
│  ⚠ Chart Preview Unavailable      │
│  Insufficient data for:           │
│  • CI Distribution (no CI scores) │
│  • Trend Over Time (< 2 dates)   │
│                                   │
│  [Continue without charts]        │
└───────────────────────────────────┘
```

### ✅ Acceptance Checklist
- [ ] **Proof 1:** Custom report UI shows "Include Charts" toggle
- [ ] **Proof 2:** Selecting charts opens preview modal with live data
- [ ] **Proof 3:** PDF export includes chart images after table
- [ ] **Proof 4:** Chart images are high resolution (2x scale)
- [ ] **Proof 5:** Empty state shown when data insufficient for chart
- [ ] **Proof 6:** Charts respect current filters (date range, type, region)
- [ ] **Screenshot:** Custom report UI with charts section
- [ ] **Screenshot:** PDF export showing charts
- [ ] **Video:** Full flow from chart selection to PDF download

---

# B) ASSETS PAGE - MISSING COLUMNS

## 📸 Current State

Assets table shows:
- Asset Reference ✓
- Type ✓
- Description ✓
- Location ✓
- Installed ✓
- CI Score ✓
- Urgency ✓
- Remaining Life ✓
- Valuation ✓

**Missing visible columns:**
- Region (exists but hidden/blank)
- Depot (exists but hidden/blank)
- Status (exists but shows wrong field)
- Installer (exists but shows wrong field)
- Owner (exists but shows wrong field)

## 🎯 Required State (V2 PATCH)

### Column Visibility Fix

**Update Column Customizer defaults:**
```typescript
const [columns, setColumns] = useState<ColumnConfig[]>([
  { id: "asset_ref", label: "Asset Reference", visible: true, required: true },
  { id: "asset_type", label: "Type", visible: true },
  { id: "description", label: "Description", visible: true },
  { id: "location", label: "Location", visible: true },
  { id: "install_date", label: "Installed", visible: true },
  { id: "ci_score", label: "CI Score", visible: true },
  { id: "urgency", label: "Urgency", visible: true },
  { id: "region", label: "Region", visible: true }, // ← MAKE VISIBLE
  { id: "depot", label: "Depot", visible: true }, // ← MAKE VISIBLE
  { id: "status", label: "Status", visible: true }, // ← MAKE VISIBLE
  { id: "installer", label: "Installer", visible: true }, // ← MAKE VISIBLE
  { id: "owner", label: "Owner", visible: true }, // ← MAKE VISIBLE
  { id: "remaining_life", label: "Remaining Life", visible: false },
  { id: "valuation", label: "Valuation", visible: false },
]);
```

### Empty State Display

**Where values are NULL, show "—" consistently:**
```tsx
{columns.find(c => c.id === "region")?.visible && (
  <TableCell>
    {asset.region || <span className="text-muted-foreground">—</span>}
  </TableCell>
)}
```

### Data Quality Filter

**Add "Show blanks only" filter:**

```
┌──────────────────────────────────────────┐
│ Filters                             [×]  │
├──────────────────────────────────────────┤
│ Asset Type:  [All ▼]                    │
│ Region:      [All ▼]                    │
│ Depot:       [All ▼]                    │
│                                          │
│ Data Quality Filters:                   │
│ ☐ Missing Region                        │
│ ☐ Missing Depot                         │
│ ☐ Missing Status                        │
│ ☐ Missing Installer                     │
│ ☐ Missing Owner                         │
│ ☐ Missing GPS Coordinates               │
│                                          │
│ [Clear Filters]  [Apply]                │
└──────────────────────────────────────────┘
```

**Filter logic:**
```typescript
const dataQualityFilters = {
  missingRegion: false,
  missingDepot: false,
  missingStatus: false,
  missingInstaller: false,
  missingOwner: false,
  missingGPS: false,
};

// Apply filters
const filteredAssets = assets.filter(asset => {
  if (dataQualityFilters.missingRegion && asset.region) return false;
  if (dataQualityFilters.missingDepot && asset.depot) return false;
  if (dataQualityFilters.missingStatus && asset.status_name) return false;
  if (dataQualityFilters.missingInstaller && asset.installer_name) return false;
  if (dataQualityFilters.missingOwner && asset.owned_by) return false;
  if (dataQualityFilters.missingGPS && (asset.gps_lat && asset.gps_lng)) return false;
  return true;
});
```

### Data Quality Pill (Row-level Indicator)

**Add pill indicator when critical fields missing:**

```tsx
<TableRow>
  <TableCell>
    {asset.asset_ref}
    {hasDataQualityIssues(asset) && (
      <Badge variant="destructive" className="ml-2 text-xs">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Incomplete
      </Badge>
    )}
  </TableCell>
  {/* ... other cells */}
</TableRow>
```

**Issue detection:**
```typescript
function hasDataQualityIssues(asset: any): boolean {
  const criticalFields = [
    'region',
    'depot',
    'status_name',
    'gps_lat',
    'gps_lng'
  ];
  
  return criticalFields.some(field => !asset[field]);
}
```

**Tooltip on hover:**
```
Missing fields:
• Region
• Depot
```

## ✅ Acceptance Checklist

- [ ] **Proof 1:** Assets table shows Region column by default
- [ ] **Proof 2:** Assets table shows Depot column by default
- [ ] **Proof 3:** Assets table shows Status column by default
- [ ] **Proof 4:** Assets table shows Installer column by default
- [ ] **Proof 5:** Assets table shows Owner column by default
- [ ] **Proof 6:** NULL values display as "—" (not blank cells)
- [ ] **Proof 7:** Filter "Missing Region" shows only assets with NULL region
- [ ] **Proof 8:** Data Quality pill appears on rows with missing critical fields
- [ ] **Proof 9:** Pill tooltip shows which fields are missing
- [ ] **Proof 10:** Column customizer allows hiding/showing these columns
- [ ] **Screenshot:** Table with all 5 columns visible
- [ ] **Screenshot:** Filter panel with data quality options
- [ ] **Screenshot:** Row with data quality pill
- [ ] **Video:** Filter by "Missing Region" → table updates

---

# C) INSPECTIONS PAGE - INCOMPLETE DATA

## 📸 Current State

Inspections table shows:
- Asset Reference ✓
- Asset Type ✓
- Inspection Date ✓
- Inspector ✓
- CI Score (sometimes) ⚠️
- Urgency (sometimes) ⚠️
- Remedial Cost ✓

**Missing:**
- Inspection Type column
- Summary/Notes (hidden by default)
- Score completeness indicator

## 🎯 Required State (V2 PATCH)

### Add Inspection Type Column

**Already exists in data, just need to make visible by default:**
```typescript
const [columns, setColumns] = useState<ColumnConfig[]>([
  { id: "asset_ref", label: "Asset Reference", visible: true, required: true },
  { id: "inspection_date", label: "Inspection Date", visible: true },
  { id: "inspector_name", label: "Inspector", visible: true },
  { id: "asset_type_name", label: "Asset Type", visible: true },
  { id: "inspection_type", label: "Inspection Type", visible: true }, // ← VISIBLE
  { id: "conditional_index", label: "CI Score", visible: true },
  { id: "calculated_urgency", label: "Urgency", visible: true },
  { id: "total_remedial_cost", label: "Remedial Cost", visible: true },
  { id: "finding_summary", label: "Summary", visible: true }, // ← VISIBLE
]);
```

### Score Completeness Indicator

**Add row-level indicator for scoring completeness:**

```tsx
<TableRow>
  <TableCell>
    {inspection.asset_ref}
    <ScoreCompletenessIndicator inspection={inspection} />
  </TableCell>
  {/* ... other cells */}
</TableRow>
```

**Component:**
```tsx
function ScoreCompletenessIndicator({ inspection }: { inspection: any }) {
  const hasCI = inspection.conditional_index !== null && inspection.conditional_index !== undefined;
  const hasUrgency = inspection.calculated_urgency !== null && inspection.calculated_urgency !== undefined;
  const hasSummary = inspection.finding_summary !== null && inspection.finding_summary !== undefined && inspection.finding_summary.trim() !== '';
  
  const missingFields = [];
  if (!hasCI) missingFields.push('CI');
  if (!hasUrgency) missingFields.push('Urgency');
  if (!hasSummary) missingFields.push('Summary');
  
  if (missingFields.length === 0) {
    return (
      <Badge variant="outline" className="ml-2 text-xs text-success">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Complete
      </Badge>
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="destructive" className="ml-2 text-xs">
            <AlertCircle className="w-3 h-3 mr-1" />
            Incomplete
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold mb-1">Missing scoring fields:</p>
          <ul className="text-xs">
            {missingFields.map(field => (
              <li key={field}>• {field}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

### Empty State Banner

**When inspections exist but scoring is incomplete:**

```tsx
{inspections.length > 0 && hasIncompleteScoringIssues(inspections) && (
  <Alert variant="warning" className="mb-4">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Incomplete Inspection Scoring</AlertTitle>
    <AlertDescription>
      {incompleteCount} of {inspections.length} inspections are missing scoring fields (CI, Urgency, or Summary).
      <Button variant="link" size="sm" onClick={() => filterIncompleteScoringOnly()}>
        Show incomplete only
      </Button>
    </AlertDescription>
  </Alert>
)}
```

**Detection logic:**
```typescript
function hasIncompleteScoringIssues(inspections: any[]): boolean {
  return inspections.some(insp => 
    !insp.conditional_index || 
    !insp.calculated_urgency || 
    !insp.finding_summary
  );
}

const incompleteCount = inspections.filter(insp => 
  !insp.conditional_index || 
  !insp.calculated_urgency || 
  !insp.finding_summary
).length;
```

### Filter for Incomplete Scoring

**Add filter option:**
```
┌──────────────────────────────────────────┐
│ Filters                             [×]  │
├──────────────────────────────────────────┤
│ Date From:   [____________]             │
│ Date To:     [____________]             │
│ Inspector:   [All ▼]                    │
│ Asset Type:  [All ▼]                    │
│                                          │
│ Data Completeness:                      │
│ ☐ Missing CI Score                      │
│ ☐ Missing Urgency                       │
│ ☐ Missing Summary                       │
│                                          │
│ [Clear Filters]  [Apply]                │
└──────────────────────────────────────────┘
```

## ✅ Acceptance Checklist

- [ ] **Proof 1:** Inspection Type column visible by default
- [ ] **Proof 2:** Summary column visible by default
- [ ] **Proof 3:** Score completeness indicator appears on each row
- [ ] **Proof 4:** Indicator shows green checkmark for complete inspections
- [ ] **Proof 5:** Indicator shows red warning for incomplete inspections
- [ ] **Proof 6:** Tooltip on incomplete badge lists missing fields
- [ ] **Proof 7:** Empty state banner appears when scoring incomplete
- [ ] **Proof 8:** Filter "Missing CI Score" shows only inspections without CI
- [ ] **Proof 9:** NULL CI displays as "—" not blank
- [ ] **Proof 10:** NULL Urgency displays as "—" not blank
- [ ] **Screenshot:** Table with Type and Summary columns
- [ ] **Screenshot:** Row with completeness indicator (both complete and incomplete)
- [ ] **Screenshot:** Empty state banner
- [ ] **Video:** Filter by "Missing CI" → table updates

---

# D) MAINTENANCE PAGE - MISSING FIELDS

## 📸 Current State

Maintenance table shows:
- Asset Reference ✓
- Maintenance Type ✓
- Scheduled Date ✓
- Status ✓

**Missing visible:**
- Technician / Assigned To
- Priority
- Cost

## 🎯 Required State (V2 PATCH)

### Column Visibility Fix

**Make these columns visible by default:**
```typescript
const [columns, setColumns] = useState<ColumnConfig[]>([
  { id: "asset_ref", label: "Asset Reference", visible: true, required: true },
  { id: "maintenance_type", label: "Type", visible: true },
  { id: "scheduled_date", label: "Scheduled Date", visible: true },
  { id: "status", label: "Status", visible: true },
  { id: "technician_name", label: "Technician", visible: true }, // ← VISIBLE
  { id: "priority", label: "Priority", visible: true }, // ← VISIBLE
  { id: "cost", label: "Cost", visible: true }, // ← VISIBLE
  { id: "description", label: "Description", visible: false },
]);
```

### Costs Summary Section

**Add summary section at top of page (before table):**

```tsx
<div className="grid gap-4 md:grid-cols-4 mb-6">
  <Card>
    <CardHeader>
      <CardTitle className="text-sm">Total Actual Cost</CardTitle>
      <CardDescription>Filtered period</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-[#5DB32A]">
        R {totalActualCost.toLocaleString()}
      </div>
      <p className="text-xs text-muted-foreground">
        {completedCount} completed work orders
      </p>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle className="text-sm">Total Estimated Cost</CardTitle>
      <CardDescription>Filtered period</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-[#39AEDF]">
        R {totalEstimatedCost.toLocaleString()}
      </div>
      <p className="text-xs text-muted-foreground">
        {scheduledCount} scheduled work orders
      </p>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle className="text-sm">Cost Variance</CardTitle>
      <CardDescription>Actual vs Estimated</CardDescription>
    </CardHeader>
    <CardContent>
      <div className={`text-2xl font-bold ${costVariance >= 0 ? 'text-destructive' : 'text-success'}`}>
        {costVariance >= 0 ? '+' : ''}R {Math.abs(costVariance).toLocaleString()}
      </div>
      <p className="text-xs text-muted-foreground">
        {costVariance >= 0 ? 'Over budget' : 'Under budget'}
      </p>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle className="text-sm">Average Cost per WO</CardTitle>
      <CardDescription>Completed work</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">
        R {avgCostPerWorkOrder.toLocaleString()}
      </div>
      <p className="text-xs text-muted-foreground">
        Based on {completedCount} work orders
      </p>
    </CardContent>
  </Card>
</div>
```

**Calculation logic:**
```typescript
const filteredMaintenanceRecords = maintenanceRecords; // Apply date filters

const totalActualCost = filteredMaintenanceRecords
  .filter(m => m.status === 'Completed' && m.cost)
  .reduce((sum, m) => sum + (m.cost || 0), 0);

const totalEstimatedCost = filteredMaintenanceRecords
  .filter(m => m.estimated_cost)
  .reduce((sum, m) => sum + (m.estimated_cost || 0), 0);

const costVariance = totalActualCost - totalEstimatedCost;

const completedCount = filteredMaintenanceRecords
  .filter(m => m.status === 'Completed' && m.cost).length;

const avgCostPerWorkOrder = completedCount > 0 
  ? totalActualCost / completedCount 
  : 0;
```

### Date Range Filter

**Add date range picker for cost filtering:**

```tsx
<div className="flex items-center gap-2 mb-4">
  <Label>Date Range:</Label>
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" size="sm">
        <Calendar className="mr-2 h-4 w-4" />
        {dateRange.from && dateRange.to 
          ? `${format(dateRange.from, "dd MMM yyyy")} - ${format(dateRange.to, "dd MMM yyyy")}`
          : "All time"
        }
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="start">
      <DateRangePicker
        selected={dateRange}
        onSelect={setDateRange}
      />
    </PopoverContent>
  </Popover>
  <Button variant="ghost" size="sm" onClick={() => setDateRange({ from: undefined, to: undefined })}>
    Clear
  </Button>
</div>
```

### Empty State for NULL Fields

**Display "—" for missing data:**
```tsx
{columns.find(c => c.id === "technician_name")?.visible && (
  <TableCell>
    {maintenance.technician_name || maintenance.assigned_to_name || (
      <span className="text-muted-foreground">—</span>
    )}
  </TableCell>
)}

{columns.find(c => c.id === "priority")?.visible && (
  <TableCell>
    {maintenance.priority ? (
      <Badge variant={
        maintenance.priority === 'High' ? 'destructive' :
        maintenance.priority === 'Medium' ? 'default' :
        'secondary'
      }>
        {maintenance.priority}
      </Badge>
    ) : (
      <span className="text-muted-foreground">—</span>
    )}
  </TableCell>
)}

{columns.find(c => c.id === "cost")?.visible && (
  <TableCell>
    {maintenance.cost 
      ? `R ${maintenance.cost.toLocaleString()}`
      : <span className="text-muted-foreground">—</span>
    }
  </TableCell>
)}
```

## ✅ Acceptance Checklist

- [ ] **Proof 1:** Technician column visible and populated
- [ ] **Proof 2:** Priority column visible with badges (High/Medium/Low)
- [ ] **Proof 3:** Cost column visible with formatted currency
- [ ] **Proof 4:** NULL values display as "—"
- [ ] **Proof 5:** Costs Summary section displays at top
- [ ] **Proof 6:** Total Actual Cost sums completed work orders
- [ ] **Proof 7:** Total Estimated Cost sums all estimates
- [ ] **Proof 8:** Cost Variance calculates correctly (color-coded)
- [ ] **Proof 9:** Average Cost calculates correctly
- [ ] **Proof 10:** Date range filter updates cost summary
- [ ] **Screenshot:** Table with Technician, Priority, Cost columns
- [ ] **Screenshot:** Costs Summary section (4 cards)
- [ ] **Screenshot:** Date range filter applied
- [ ] **Math proof:** Export 10 completed work orders → verify sum matches Total Actual Cost
- [ ] **Video:** Select date range → costs summary updates

---

# E) INSTALLATION PAGE - INCORRECT CARD COUNTS

## 📸 Current State

Installation summary cards show:
- Total Installations (correct ✓)
- This Month (correct ✓)
- Excellent Condition (INCORRECT ❌)
- High Urgency (INCORRECT ❌)

## 🎯 Required State (V2 PATCH)

### Fix Card Calculations

**Current code issue:**
```typescript
// WRONG - uses string comparison
const excellentConditionAssets = assets.filter(asset => {
  const ci = asset.latest_ci;
  return ci !== null && ci >= 80;
}).length;

// WRONG - uses old urgency values
const needsAttention = assets.filter(asset => {
  const urgency = asset.latest_urgency;
  return urgency === "4" || urgency === "Immediate" || urgency === "3" || urgency === "High";
}).length;
```

**Fixed code:**
```typescript
// CORRECT - proper type checking and comparison
const excellentConditionAssets = assets.filter(asset => {
  const ci = asset.latest_ci;
  // Ensure ci is a number and >= 80
  return ci !== null && ci !== undefined && Number(ci) >= 80;
}).length;

// CORRECT - matches actual urgency values from database
const needsAttention = assets.filter(asset => {
  const urgency = asset.latest_urgency;
  return urgency === "Immediate" || urgency === "Critical" || urgency === "High";
}).length;
```

### Add Card Logic Tooltip

**Add info icon with calculation explanation:**

```tsx
<Card>
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm">Excellent Condition</CardTitle>
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Info className="w-4 h-4 text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold mb-1">Calculation:</p>
          <p className="text-xs">Assets with CI ≥ 80</p>
          <p className="text-xs mt-1">Data source:</p>
          <code className="text-xs">asset.latest_ci</code>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </CardHeader>
  <CardContent>
    <div className="text-3xl font-bold text-success">
      {excellentConditionAssets}
    </div>
    <p className="text-xs text-muted-foreground flex items-center gap-1">
      <CheckCircle2 className="w-3 h-3" />
      CI Score ≥ 80
    </p>
  </CardContent>
</Card>
```

### Add Drilldown Modal

**Click card to see filtered list:**

```tsx
const [drilldownModal, setDrilldownModal] = useState<{
  open: boolean;
  title: string;
  assets: any[];
} | null>(null);

// Card click handler
<Card 
  className="cursor-pointer hover:shadow-lg transition-shadow"
  onClick={() => {
    const filtered = assets.filter(asset => {
      const ci = asset.latest_ci;
      return ci !== null && ci !== undefined && Number(ci) >= 80;
    });
    setDrilldownModal({
      open: true,
      title: 'Excellent Condition Assets (CI ≥ 80)',
      assets: filtered,
    });
  }}
>
  {/* ... card content */}
</Card>

// Modal
{drilldownModal?.open && (
  <Dialog open={drilldownModal.open} onOpenChange={(open) => setDrilldownModal(null)}>
    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{drilldownModal.title}</DialogTitle>
        <DialogDescription>
          {drilldownModal.assets.length} assets found
        </DialogDescription>
      </DialogHeader>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asset Ref</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>CI Score</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Install Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {drilldownModal.assets.map(asset => (
            <TableRow key={asset.asset_id}>
              <TableCell className="font-medium">{asset.asset_ref}</TableCell>
              <TableCell>{asset.asset_type_name}</TableCell>
              <TableCell>
                <Badge variant="default">{asset.latest_ci}</Badge>
              </TableCell>
              <TableCell>{asset.road_name || asset.road_number}</TableCell>
              <TableCell>
                {asset.install_date ? new Date(asset.install_date).toLocaleDateString() : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      <DialogFooter>
        <Button variant="outline" onClick={() => {
          // Export to CSV
          exportDrilldownToCSV(drilldownModal.assets, drilldownModal.title);
        }}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
        <Button onClick={() => setDrilldownModal(null)}>Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)}
```

### Verification Logging

**Add console logging to verify calculations:**

```typescript
console.log('[Installation Cards] Calculating metrics...');
console.log('[Installation Cards] Total assets:', assets.length);

const excellentConditionAssets = assets.filter(asset => {
  const ci = asset.latest_ci;
  const passes = ci !== null && ci !== undefined && Number(ci) >= 80;
  if (passes) {
    console.log('[Excellent Condition] Asset:', asset.asset_ref, 'CI:', ci);
  }
  return passes;
}).length;

console.log('[Installation Cards] Excellent condition count:', excellentConditionAssets);

const needsAttention = assets.filter(asset => {
  const urgency = asset.latest_urgency;
  const passes = urgency === "Immediate" || urgency === "Critical" || urgency === "High";
  if (passes) {
    console.log('[Needs Attention] Asset:', asset.asset_ref, 'Urgency:', urgency);
  }
  return passes;
}).length;

console.log('[Installation Cards] Needs attention count:', needsAttention);
```

## ✅ Acceptance Checklist

- [ ] **Proof 1:** "Excellent Condition" card shows correct count (CI ≥ 80)
- [ ] **Proof 2:** "Needs Attention" card shows correct count (Immediate/Critical/High urgency)
- [ ] **Proof 3:** Card tooltip shows calculation logic
- [ ] **Proof 4:** Clicking card opens drilldown modal with filtered assets
- [ ] **Proof 5:** Drilldown modal shows correct filtered list
- [ ] **Proof 6:** Export CSV from drilldown works
- [ ] **Proof 7:** Console logs show calculation steps
- [ ] **Manual verification:** Run SQL query → count assets with CI ≥ 80 → matches card count
- [ ] **Manual verification:** Run SQL query → count assets with High/Critical/Immediate → matches card count
- [ ] **Screenshot:** Cards with correct counts + tooltips
- [ ] **Screenshot:** Drilldown modal opened
- [ ] **Video:** Click card → modal opens → export CSV

---

# F) DASHBOARD - BLANK CARDS + MISSING CARDS

## 📸 Current State

Dashboard shows:
- Total Assets ✓
- Total Inspections ✓
- Pending Work Orders ✓
- Critical Assets ✓
- Data Quality Alerts (BLANK ❌)
- Overdue Inspections (BLANK ❌)

**Missing cards:**
- Total Maintenance Cost
- Uninspected Assets

## 🎯 Required State (V2 PATCH)

### F1. Fix Data Quality Alerts Card

**Current issue:** Card shows "0" but should show actual count

**Debug the issue:**
```typescript
const fetchDataQualityAlerts = async () => {
  try {
    const response = await fetch(`${API_URL}/assets?pageSize=2000`, {
      headers: {
        Authorization: `Bearer ${accessToken || publicAnonKey}`,
      },
    });

    if (!response.ok) {
      console.error('[Data Quality] API error:', response.status, response.statusText);
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    const assets = data.assets || [];
    
    console.log('[Data Quality] Total assets fetched:', assets.length);
    
    // Missing GPS
    const missingGPS = assets.filter((asset: any) => {
      const missing = !asset.gps_lat || !asset.gps_lng;
      if (missing) {
        console.log('[Data Quality] Missing GPS:', asset.asset_ref);
      }
      return missing;
    });
    
    console.log('[Data Quality] Assets missing GPS:', missingGPS.length);
    
    // Missing Type
    const missingType = assets.filter((asset: any) => {
      const missing = !asset.asset_type_name;
      if (missing) {
        console.log('[Data Quality] Missing Type:', asset.asset_ref);
      }
      return missing;
    });
    
    console.log('[Data Quality] Assets missing type:', missingType.length);
    
    // Missing Description
    const missingDescription = assets.filter((asset: any) => !asset.description);
    
    // Missing Status
    const missingStatus = assets.filter((asset: any) => !asset.status_name);
    
    const totalIssues = missingGPS.length + missingType.length + missingDescription.length + missingStatus.length;
    
    console.log('[Data Quality] Total issues:', totalIssues);
    console.log('[Data Quality] Breakdown:', {
      missingGPS: missingGPS.length,
      missingType: missingType.length,
      missingDescription: missingDescription.length,
      missingStatus: missingStatus.length,
    });

    setDataQualityAlerts({ 
      count: totalIssues,
      details: {
        missingGPS: missingGPS.length,
        missingType: missingType.length,
        missingDescription: missingDescription.length,
        missingStatus: missingStatus.length,
      }
    });
  } catch (error) {
    console.error('[Data Quality] Error:', error);
    setDataQualityAlerts({ count: 0, details: {}, error: error.message });
  }
};
```

**Display States:**

```tsx
<Card 
  className="cursor-pointer hover:shadow-lg transition-shadow"
  onClick={() => navigate('/assets', { state: { filterDataQuality: true } })}
>
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium">Data Quality Alerts</CardTitle>
    <FileWarning className="w-4 h-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    {/* LOADING STATE */}
    {!dataQualityAlerts && (
      <>
        <div className="text-2xl font-bold text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-xs text-muted-foreground">Loading...</p>
      </>
    )}
    
    {/* ERROR STATE */}
    {dataQualityAlerts?.error && (
      <>
        <div className="text-2xl font-bold text-destructive">
          <AlertCircle className="w-6 h-6" />
        </div>
        <p className="text-xs text-destructive">
          Error loading
          <Button variant="link" size="sm" onClick={(e) => {
            e.stopPropagation();
            fetchDataQualityAlerts();
          }}>
            Retry
          </Button>
        </p>
      </>
    )}
    
    {/* DATA EXISTS */}
    {dataQualityAlerts && !dataQualityAlerts.error && dataQualityAlerts.count > 0 && (
      <>
        <div className="text-2xl font-bold text-warning">
          {dataQualityAlerts.count}
        </div>
        <p className="text-xs text-muted-foreground">
          <AlertTriangle className="inline w-3 h-3 text-warning" /> 
          {dataQualityAlerts.details.missingGPS} GPS, 
          {dataQualityAlerts.details.missingType} Type, 
          {dataQualityAlerts.details.missingDescription} Desc,
          {dataQualityAlerts.details.missingStatus} Status
        </p>
      </>
    )}
    
    {/* ZERO STATE (Good) */}
    {dataQualityAlerts && !dataQualityAlerts.error && dataQualityAlerts.count === 0 && (
      <>
        <div className="text-2xl font-bold text-success">
          0
        </div>
        <p className="text-xs text-muted-foreground">
          <CheckCircle2 className="inline w-3 h-3 text-success" /> Data quality good
        </p>
      </>
    )}
  </CardContent>
</Card>
```

### F2. Fix Overdue Inspections Card

**Current issue:** Card shows "0" but should show actual count

**Debug the issue:**
```typescript
const fetchOverdueInspections = async () => {
  try {
    const response = await fetch(`${API_URL}/inspections`, {
      headers: {
        Authorization: `Bearer ${accessToken || publicAnonKey}`,
      },
    });

    if (!response.ok) {
      console.error('[Overdue Inspections] API error:', response.status);
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    const inspections = data.inspections || [];
    
    console.log('[Overdue Inspections] Total inspections:', inspections.length);
    
    const now = new Date();
    let overdueCount = 0;

    // Group by asset to find latest inspection per asset
    const assetInspections: { [key: string]: any } = {};
    
    inspections.forEach((insp: any) => {
      const assetId = insp.asset_id;
      const inspDate = new Date(insp.inspection_date || insp.created_at);
      
      if (!assetInspections[assetId] || inspDate > new Date(assetInspections[assetId].inspection_date)) {
        assetInspections[assetId] = insp;
      }
    });

    console.log('[Overdue Inspections] Unique assets with inspections:', Object.keys(assetInspections).length);

    // Check each asset's most recent inspection
    Object.entries(assetInspections).forEach(([assetId, insp]) => {
      const inspDate = new Date(insp.inspection_date || insp.created_at);
      const daysSince = Math.floor((now.getTime() - inspDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Default inspection frequency: 365 days (annual)
      const frequency = insp.inspection_frequency || 365;
      
      const isOverdue = daysSince > frequency;
      
      if (isOverdue) {
        console.log('[Overdue Inspections] Overdue asset:', insp.asset_ref, {
          lastInspection: inspDate.toISOString().split('T')[0],
          daysSince,
          frequency,
          daysOverdue: daysSince - frequency,
        });
        overdueCount++;
      }
    });

    console.log('[Overdue Inspections] Total overdue:', overdueCount);
    setOverdueInspections(overdueCount);
  } catch (error) {
    console.error('[Overdue Inspections] Error:', error);
    setOverdueInspections({ count: 0, error: error.message });
  }
};
```

**Display States (same pattern as Data Quality):**

```tsx
<Card 
  className="cursor-pointer hover:shadow-lg transition-shadow"
  onClick={() => navigate('/inspections', { state: { filterOverdue: true } })}
>
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium">Overdue Inspections</CardTitle>
    <Calendar className="w-4 h-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    {/* Loading, Error, Data, Zero states - same pattern */}
  </CardContent>
</Card>
```

### F3. Add Total Maintenance Cost Card

**NEW CARD - Add to dashboard:**

```tsx
<Card 
  className="cursor-pointer hover:shadow-lg transition-shadow"
  onClick={() => navigate('/maintenance')}
>
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium">Total Maintenance Cost</CardTitle>
    <CircleDollarSign className="w-4 h-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    {/* Loading state */}
    {!maintenanceStats && (
      <>
        <div className="text-2xl font-bold text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-xs text-muted-foreground">Loading...</p>
      </>
    )}
    
    {/* Data state */}
    {maintenanceStats && (
      <>
        <div className="text-2xl font-bold text-[#5DB32A]">
          R {maintenanceStats.totalCost 
            ? (maintenanceStats.totalCost / 1000).toFixed(1) + 'k' 
            : '0'}
        </div>
        <p className="text-xs text-muted-foreground">
          {maintenanceStats.totalCost > 0 ? (
            <>
              <Banknote className="inline w-3 h-3 text-[#5DB32A]" /> 
              {dashboardDateFilter ? 'Filtered period' : 'All time'}
            </>
          ) : (
            <>
              <Banknote className="inline w-3 h-3" /> No costs recorded
            </>
          )}
        </p>
      </>
    )}
  </CardContent>
</Card>
```

**Backend endpoint already updated - ensure returns totalCost:**
```typescript
// In /maintenance/stats endpoint
return c.json({ 
  stats: { 
    scheduled, 
    inProgress, 
    completed, 
    overdue, 
    cancelled, 
    totalCost // ← MUST BE INCLUDED
  } 
});
```

### F4. Add Uninspected Assets Card

**NEW CARD - Add to dashboard:**

```tsx
const [uninspectedModal, setUninspectedModal] = useState(false);

<Card 
  className="cursor-pointer hover:shadow-lg transition-shadow"
  onClick={() => setUninspectedModal(true)}
>
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium">Uninspected Assets</CardTitle>
    <AlertTriangle className="w-4 h-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    {/* Loading state */}
    {stats === null && (
      <>
        <div className="text-2xl font-bold text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-xs text-muted-foreground">Loading...</p>
      </>
    )}
    
    {/* Data state */}
    {stats !== null && (
      <>
        <div className="text-2xl font-bold text-warning">
          {stats.uninspectedAssets || 0}
        </div>
        <p className="text-xs text-muted-foreground">
          {(stats.uninspectedAssets || 0) > 0 ? (
            <>
              <Eye className="inline w-3 h-3 text-warning" /> Never inspected
            </>
          ) : (
            <>
              <CheckCircle2 className="inline w-3 h-3 text-success" /> All inspected
            </>
          )}
        </p>
      </>
    )}
  </CardContent>
</Card>

{/* Uninspected Assets Modal */}
<Dialog open={uninspectedModal} onOpenChange={setUninspectedModal}>
  <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Uninspected Assets</DialogTitle>
      <DialogDescription>
        {uninspectedAssetsList.length} assets have never been inspected
      </DialogDescription>
    </DialogHeader>
    
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Asset Number</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Route/Road</TableHead>
          <TableHead>Region</TableHead>
          <TableHead>Depot</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Install Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {uninspectedAssetsList.map(asset => (
          <TableRow key={asset.asset_id}>
            <TableCell className="font-medium">
              <Button 
                variant="link" 
                onClick={() => navigate(`/assets/${asset.asset_id}`)}
              >
                {asset.asset_ref}
              </Button>
            </TableCell>
            <TableCell>{asset.asset_type_name}</TableCell>
            <TableCell>{asset.road_name || asset.road_number || '—'}</TableCell>
            <TableCell>{asset.region || '—'}</TableCell>
            <TableCell>{asset.depot || '—'}</TableCell>
            <TableCell>
              {asset.status_name ? (
                <Badge variant="secondary">{asset.status_name}</Badge>
              ) : '—'}
            </TableCell>
            <TableCell>
              {asset.install_date 
                ? new Date(asset.install_date).toLocaleDateString()
                : '—'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    
    <DialogFooter>
      <Button variant="outline" onClick={() => exportUninspectedToCSV(uninspectedAssetsList)}>
        <Download className="w-4 h-4 mr-2" />
        Export CSV
      </Button>
      <Button variant="outline" onClick={() => exportUninspectedToPDF(uninspectedAssetsList)}>
        <Download className="w-4 h-4 mr-2" />
        Export PDF
      </Button>
      <Button onClick={() => setUninspectedModal(false)}>Close</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Fetch uninspected assets list:**
```typescript
const [uninspectedAssetsList, setUninspectedAssetsList] = useState<any[]>([]);

const fetchUninspectedAssetsList = async () => {
  try {
    // Fetch all assets
    const assetsRes = await fetch(`${API_URL}/assets?pageSize=10000`, {
      headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
    });
    const assetsData = await assetsRes.json();
    const allAssets = assetsData.assets || [];
    
    // Fetch all inspections
    const inspRes = await fetch(`${API_URL}/inspections`, {
      headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
    });
    const inspData = await inspRes.json();
    const inspections = inspData.inspections || [];
    
    // Get unique inspected asset IDs
    const inspectedAssetIds = new Set(
      inspections.map((insp: any) => insp.asset_id)
    );
    
    // Filter assets that haven't been inspected
    const uninspected = allAssets.filter(
      (asset: any) => !inspectedAssetIds.has(asset.asset_id)
    );
    
    console.log('[Uninspected Assets] Total assets:', allAssets.length);
    console.log('[Uninspected Assets] Inspected assets:', inspectedAssetIds.size);
    console.log('[Uninspected Assets] Uninspected assets:', uninspected.length);
    
    setUninspectedAssetsList(uninspected);
  } catch (error) {
    console.error('[Uninspected Assets] Error:', error);
    setUninspectedAssetsList([]);
  }
};

// Fetch when modal opens
useEffect(() => {
  if (uninspectedModal) {
    fetchUninspectedAssetsList();
  }
}, [uninspectedModal]);
```

**Export functions:**
```typescript
function exportUninspectedToCSV(assets: any[]) {
  const csvData = assets.map(asset => ({
    'Asset Number': asset.asset_ref,
    'Type': asset.asset_type_name,
    'Route/Road': asset.road_name || asset.road_number || '',
    'Region': asset.region || '',
    'Depot': asset.depot || '',
    'Status': asset.status_name || '',
    'Install Date': asset.install_date 
      ? new Date(asset.install_date).toLocaleDateString()
      : '',
  }));
  
  const csv = Papa.unparse(csvData);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `uninspected-assets-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportUninspectedToPDF(assets: any[]) {
  await downloadReport('pdf', {
    title: 'Uninspected Assets Report',
    data: assets.map(asset => ({
      asset_ref: asset.asset_ref,
      asset_type_name: asset.asset_type_name,
      route_road: asset.road_name || asset.road_number || '—',
      region: asset.region || '—',
      depot: asset.depot || '—',
      status: asset.status_name || '—',
      install_date: asset.install_date 
        ? new Date(asset.install_date).toLocaleDateString()
        : '—',
    })),
    columns: [
      { header: 'Asset Number', key: 'asset_ref' },
      { header: 'Type', key: 'asset_type_name' },
      { header: 'Route/Road', key: 'route_road' },
      { header: 'Region', key: 'region' },
      { header: 'Depot', key: 'depot' },
      { header: 'Status', key: 'status' },
      { header: 'Install Date', key: 'install_date' },
    ],
    tenant: {
      organizationName: tenant.organization_name,
      logoUrl: tenant.logo_url,
      primaryColor: tenant.primary_color,
      regionName: tenant.region_name,
      currency: 'ZAR',
    },
    fileName: `uninspected-assets-${new Date().toISOString().split('T')[0]}`,
    includeDate: true,
    includeFooter: true,
  });
}
```

## ✅ Acceptance Checklist

### F1. Data Quality Alerts
- [ ] **Proof 1:** Card shows loading state initially
- [ ] **Proof 2:** Card shows error state if API fails (with retry button)
- [ ] **Proof 3:** Card shows count > 0 when data quality issues exist
- [ ] **Proof 4:** Card shows "0" with green checkmark when no issues
- [ ] **Proof 5:** Card breakdown shows GPS/Type/Desc/Status counts
- [ ] **Proof 6:** Clicking card navigates to Assets page with quality filter
- [ ] **Proof 7:** Console logs show calculation breakdown
- [ ] **Screenshot:** Card in each state (loading, error, data, zero)

### F2. Overdue Inspections
- [ ] **Proof 1:** Card shows loading state initially
- [ ] **Proof 2:** Card shows error state if API fails (with retry button)
- [ ] **Proof 3:** Card shows count > 0 when overdue inspections exist
- [ ] **Proof 4:** Card shows "0" with green checkmark when all up to date
- [ ] **Proof 5:** Clicking card navigates to Inspections page with overdue filter
- [ ] **Proof 6:** Console logs show calculation for each overdue asset
- [ ] **Proof 7:** Calculation uses 365-day default frequency
- [ ] **Screenshot:** Card in each state

### F3. Total Maintenance Cost
- [ ] **Proof 1:** Card displays on dashboard
- [ ] **Proof 2:** Cost shows formatted currency (e.g., "R 150.5k")
- [ ] **Proof 3:** Card shows "All time" or "Filtered period" based on date filter
- [ ] **Proof 4:** Clicking card navigates to Maintenance page
- [ ] **Proof 5:** Cost updates when dashboard date filter applied
- [ ] **Proof 6:** Backend returns totalCost in /maintenance/stats response
- [ ] **Screenshot:** Card with cost data
- [ ] **Math proof:** SQL sum of maintenance.cost matches card display

### F4. Uninspected Assets
- [ ] **Proof 1:** Card displays on dashboard
- [ ] **Proof 2:** Card shows count of uninspected assets
- [ ] **Proof 3:** Clicking card opens modal with asset list
- [ ] **Proof 4:** Modal table shows all 7 columns (Asset Number, Type, Route, Region, Depot, Status, Install Date)
- [ ] **Proof 5:** Modal "Export CSV" button works
- [ ] **Proof 6:** Modal "Export PDF" button works
- [ ] **Proof 7:** Asset numbers in modal are clickable (navigate to detail)
- [ ] **Proof 8:** Calculation: All Assets - Inspected Assets = Uninspected Count
- [ ] **Screenshot:** Card with uninspected count
- [ ] **Screenshot:** Modal opened with asset list
- [ ] **Screenshot:** Exported CSV/PDF
- [ ] **Math proof:** SQL count matches card count

---

# COMPONENTS LIBRARY

## Component 1: TenantHeader

**Used in:** All 13 reports

**Props:**
```typescript
interface TenantHeaderProps {
  tenant: {
    organizationName: string;
    logoUrl?: string;
    tagline?: string;
    regionName?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
  };
}
```

**Render:**
```tsx
export function TenantHeader({ tenant }: TenantHeaderProps) {
  return (
    <div className="report-header">
      {tenant.logoUrl && (
        <img src={tenant.logoUrl} alt="Logo" className="report-logo" />
      )}
      <div>
        <h1 className="text-xl font-bold">{tenant.organizationName}</h1>
        {tenant.tagline && (
          <p className="text-sm italic text-muted-foreground">{tenant.tagline}</p>
        )}
        {tenant.regionName && (
          <p className="text-sm">{tenant.regionName}</p>
        )}
        <p className="text-sm">
          {tenant.address && <span>{tenant.address}</span>}
          {tenant.address && tenant.phone && <span> | </span>}
          {tenant.phone && <span>{tenant.phone}</span>}
        </p>
        <p className="text-sm">
          {tenant.email && <span>{tenant.email}</span>}
          {tenant.email && tenant.website && <span> | </span>}
          {tenant.website && <span>{tenant.website}</span>}
        </p>
      </div>
    </div>
  );
}
```

---

## Component 2: MissingDataBanner

**Used in:** All pages with data display issues

**Props:**
```typescript
interface MissingDataBannerProps {
  type: 'not-mapped' | 'empty' | 'error';
  message: string;
  details?: string;
  onRetry?: () => void;
}
```

**Render:**
```tsx
export function MissingDataBanner({ type, message, details, onRetry }: MissingDataBannerProps) {
  const variants = {
    'not-mapped': {
      icon: AlertCircle,
      variant: 'destructive' as const,
      title: 'Data Not Mapped',
    },
    'empty': {
      icon: Info,
      variant: 'default' as const,
      title: 'No Data Available',
    },
    'error': {
      icon: AlertTriangle,
      variant: 'destructive' as const,
      title: 'Error Loading Data',
    },
  };
  
  const config = variants[type];
  const Icon = config.icon;
  
  return (
    <Alert variant={config.variant}>
      <Icon className="h-4 w-4" />
      <AlertTitle>{config.title}</AlertTitle>
      <AlertDescription>
        {message}
        {details && <p className="text-xs mt-1">{details}</p>}
        {onRetry && (
          <Button variant="link" size="sm" onClick={onRetry} className="mt-2">
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
```

---

## Component 3: DrilldownModal

**Used in:** Dashboard cards, Installation cards

**Props:**
```typescript
interface DrilldownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  data: any[];
  columns: Array<{
    header: string;
    key: string;
    render?: (value: any, row: any) => React.ReactNode;
  }>;
  onExportCSV?: () => void;
  onExportPDF?: () => void;
}
```

**Render:**
```tsx
export function DrilldownModal({
  open,
  onOpenChange,
  title,
  description,
  data,
  columns,
  onExportCSV,
  onExportPDF,
}: DrilldownModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(col => (
                <TableHead key={col.key}>{col.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={index}>
                {columns.map(col => (
                  <TableCell key={col.key}>
                    {col.render 
                      ? col.render(row[col.key], row)
                      : row[col.key] || '—'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        <DialogFooter>
          {onExportCSV && (
            <Button variant="outline" onClick={onExportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          )}
          {onExportPDF && (
            <Button variant="outline" onClick={onExportPDF}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Component 4: DataQualityPill

**Used in:** Assets page, Inspections page rows

**Props:**
```typescript
interface DataQualityPillProps {
  missingFields: string[];
  variant?: 'default' | 'compact';
}
```

**Render:**
```tsx
export function DataQualityPill({ missingFields, variant = 'default' }: DataQualityPillProps) {
  if (missingFields.length === 0) {
    if (variant === 'compact') return null;
    
    return (
      <Badge variant="outline" className="ml-2 text-xs text-success">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Complete
      </Badge>
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="destructive" className="ml-2 text-xs">
            <AlertCircle className="w-3 h-3 mr-1" />
            {variant === 'compact' ? missingFields.length : 'Incomplete'}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold mb-1">Missing fields:</p>
          <ul className="text-xs">
            {missingFields.map(field => (
              <li key={field}>• {field}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

---

# TESTING & VALIDATION FRAMEWORK

## Test Suite 1: Reports Data Completeness

**Objective:** Verify all 13 reports show complete data (no blanks where data exists)

### Test Procedure:

1. **Setup Test Data:**
   - Create 10 test assets with ALL fields populated
   - Create 10 test inspections with ALL fields populated
   - Create 10 test maintenance records with ALL fields populated

2. **Export Each Report:**
   - Generate PDF for each of 13 reports
   - Save PDFs with timestamp

3. **Automated Validation:**
```typescript
function validateReportCompleteness(pdfText: string, requiredFields: string[]): {
  passed: boolean;
  missingFields: string[];
  blankCells: number;
} {
  const missingFields: string[] = [];
  let blankCells = 0;
  
  requiredFields.forEach(field => {
    if (!pdfText.includes(field)) {
      missingFields.push(field);
    }
  });
  
  // Count occurrences of "—" or blank cells
  const dashMatches = pdfText.match(/—/g);
  blankCells = dashMatches ? dashMatches.length : 0;
  
  return {
    passed: missingFields.length === 0 && blankCells === 0,
    missingFields,
    blankCells,
  };
}
```

4. **Manual Spot Check:**
   - Select 3 random rows from each report
   - Verify data matches database query results
   - Document any discrepancies

### Acceptance Criteria:
- [ ] All 13 reports export without errors
- [ ] Zero "Invalid Date" occurrences across all reports
- [ ] Zero blank cells where source data exists
- [ ] 100% of test assets/inspections/maintenance appear in reports
- [ ] Field mappings verified against database schema

---

## Test Suite 2: UI Display States

**Objective:** Verify all pages handle Loading, Empty, Error, and Data states

### Test Matrix:

| Page | Component | Loading | Empty | Error | Data | Notes |
|------|-----------|---------|-------|-------|------|-------|
| Dashboard | Data Quality Card | ✓ | ✓ | ✓ | ✓ | Must show distinct states |
| Dashboard | Overdue Inspections | ✓ | ✓ | ✓ | ✓ | Must show distinct states |
| Dashboard | Total Maintenance Cost | ✓ | ✓ | ✓ | ✓ | New card |
| Dashboard | Uninspected Assets | ✓ | ✓ | ✓ | ✓ | New card with modal |
| Assets | Main Table | ✓ | ✓ | ✓ | ✓ | Region/Depot/Status/Installer/Owner visible |
| Inspections | Main Table | ✓ | ✓ | ✓ | ✓ | Type/Summary visible, completeness indicator |
| Maintenance | Main Table | ✓ | ✓ | ✓ | ✓ | Technician/Priority/Cost visible |
| Maintenance | Costs Summary | ✓ | ✓ | ✓ | ✓ | New 4-card section |

### Test Procedure:

1. **Loading State:**
   - Open page while API is slow (throttle network)
   - Verify spinner/skeleton appears
   - Screenshot each loading state

2. **Empty State:**
   - Test with empty database (no assets/inspections/maintenance)
   - Verify empty state message appears
   - Verify no JavaScript errors

3. **Error State:**
   - Disconnect network / block API
   - Verify error message appears
   - Verify retry button works
   - Screenshot error state

4. **Data State:**
   - Load page with real data
   - Verify all columns display
   - Verify calculations correct
   - Screenshot data state

### Acceptance Criteria:
- [ ] All 4 states render correctly for each component
- [ ] No console errors in any state
- [ ] Error states include retry mechanisms
- [ ] Loading states don't block UI
- [ ] Empty states provide helpful guidance

---

## Test Suite 3: Calculation Accuracy

**Objective:** Verify all metrics and calculations are mathematically correct

### Test Cases:

**TC1: Excellent Condition Assets**
```sql
-- Expected count
SELECT COUNT(*) 
FROM tams360_assets_app 
WHERE latest_ci >= 80 
  AND tenant_id = ?;

-- Verify UI displays same count
```

**TC2: Needs Attention Assets**
```sql
-- Expected count
SELECT COUNT(*) 
FROM tams360_assets_app 
WHERE latest_urgency IN ('Immediate', 'Critical', 'High')
  AND tenant_id = ?;

-- Verify UI displays same count
```

**TC3: Total Maintenance Cost**
```sql
-- Expected sum
SELECT SUM(cost) 
FROM tams360_maintenance_v 
WHERE tenant_id = ?
  AND cost IS NOT NULL;

-- Verify UI displays same value
```

**TC4: Uninspected Assets**
```sql
-- Expected count
SELECT COUNT(*) 
FROM tams360_assets_app a
WHERE tenant_id = ?
  AND NOT EXISTS (
    SELECT 1 
    FROM tams360_inspections_app i 
    WHERE i.asset_id = a.asset_id
  );

-- Verify UI displays same count
```

**TC5: Overdue Inspections**
```sql
-- Expected count (complex - requires procedural logic)
-- Test manually with known overdue assets
```

**TC6: Data Quality Alerts**
```sql
-- Expected count
SELECT 
  COUNT(*) FILTER (WHERE gps_lat IS NULL OR gps_lng IS NULL) as missing_gps,
  COUNT(*) FILTER (WHERE asset_type_name IS NULL) as missing_type,
  COUNT(*) FILTER (WHERE description IS NULL) as missing_desc,
  COUNT(*) FILTER (WHERE status_name IS NULL) as missing_status
FROM tams360_assets_app
WHERE tenant_id = ?;

-- Verify UI breakdown matches
```

### Acceptance Criteria:
- [ ] All SQL query results match UI displays (±0 tolerance)
- [ ] Console logs show calculation steps
- [ ] Drilldown modals show correct filtered lists
- [ ] No rounding errors in currency formatting
- [ ] No off-by-one errors in counts

---

# DEPLOYMENT CHECKLIST

## Phase 1: Backend Fixes (Critical)

- [ ] Update `/maintenance/stats` endpoint to include `totalCost`
- [ ] Update `/dashboard/summary` endpoint to include `uninspectedAssets`
- [ ] Verify all report endpoints return complete data (no NULL for existing fields)
- [ ] Add proper error handling and logging to all endpoints
- [ ] Test all endpoints with Postman/curl
- [ ] Deploy backend changes
- [ ] Smoke test: Verify API responses

## Phase 2: Frontend Data Display Fixes

- [ ] Assets page: Make Region/Depot/Status/Installer/Owner visible by default
- [ ] Assets page: Fix field mappings (status_name, owned_by, installer_name)
- [ ] Inspections page: Make Type/Summary visible by default
- [ ] Inspections page: Add score completeness indicator
- [ ] Maintenance page: Make Technician/Priority/Cost visible by default
- [ ] Deploy frontend changes
- [ ] Smoke test: Verify columns visible

## Phase 3: Dashboard Enhancements

- [ ] Fix Data Quality Alerts display states
- [ ] Fix Overdue Inspections display states
- [ ] Add Total Maintenance Cost card
- [ ] Add Uninspected Assets card with modal
- [ ] Test all card click-through navigation
- [ ] Deploy dashboard changes
- [ ] Smoke test: Verify all 8 cards display correctly

## Phase 4: Reports Fixes

- [ ] Update all 13 report queries to fetch complete data
- [ ] Add Tenant Email and Tagline to header
- [ ] Fix date formatting (eliminate "Invalid Date")
- [ ] Test each report with real data
- [ ] Deploy report changes
- [ ] Smoke test: Generate all 13 reports, verify no blanks

## Phase 5: Advanced Features

- [ ] Add Custom Report charts functionality
- [ ] Add Data Quality filters to Assets page
- [ ] Add Maintenance Costs Summary section
- [ ] Add Installation card drilldown modals
- [ ] Deploy advanced features
- [ ] Full regression test

## Phase 6: Validation

- [ ] Run Test Suite 1 (Reports Data Completeness)
- [ ] Run Test Suite 2 (UI Display States)
- [ ] Run Test Suite 3 (Calculation Accuracy)
- [ ] User acceptance testing
- [ ] Document any remaining issues
- [ ] Create bug tickets for future work

---

# PROOF REQUIREMENTS

## For Development Team:

Every fix marked "✅ Complete" MUST include:

1. **Screenshot/Video Proof:**
   - Before state (showing the issue)
   - After state (showing the fix)
   - Both states side-by-side if possible

2. **Data Verification:**
   - SQL query showing expected result
   - UI screenshot showing matching result
   - Console log output (if applicable)

3. **Code Changes:**
   - Git diff or file comparison
   - Comments explaining the fix
   - Updated tests (if applicable)

4. **Acceptance Checklist:**
   - All checkboxes marked
   - Date completed
   - Tester name/initials

## Documentation Format:

```markdown
## Fix: [Component Name] - [Issue Description]

### Before
[Screenshot showing issue]
[Description of problem]

### After
[Screenshot showing fix]
[Description of solution]

### Verification
[SQL query and result]
[Console log output]
[Any additional proof]

### Code Changes
[Link to commit or diff]

### Acceptance Checklist
- [x] Proof 1: [Description]
- [x] Proof 2: [Description]
...

**Completed by:** [Name]
**Date:** [YYYY-MM-DD]
**Tested by:** [Name]
```

---

# SUMMARY

This PATCH specification defines EXACTLY what needs to be fixed to resolve all missing data and incomplete display issues in TAMS360, while keeping the existing layout and design.

**Total fixes required:** 100+
**Critical fixes:** 50+
**New features:** 5

**Key principles:**
1. No redesigns - only patches to existing pages
2. Explicit empty states (not blank cells)
3. All fixes require proof with acceptance checklists
4. Backend and frontend changes documented
5. Test suites provided for validation

**Expected outcome:**
- 13 reports with complete data (zero blanks where data exists)
- All UI pages showing correct fields and calculations
- Dashboard with 8 functional cards (4 new/fixed)
- Complete audit trail of all fixes with proof

This specification can be handed to developers with zero ambiguity about what needs to be fixed and how to prove it's done correctly.
