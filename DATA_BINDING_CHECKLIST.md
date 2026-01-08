# TAMS360 Data Binding Checklist
## Correct View & Column Mapping for Frontend

---

## ✅ CRITICAL RULES

1. **NEVER query raw tables directly** (`tams360.inspections`, `tams360.assets`, etc.)
2. **ALWAYS use public views** (`tams360_inspections_app`, `tams360_inspection_components_app`, `tams360_assets_app`)
3. **CI values are ALWAYS 0-100** (no normalization needed in frontend)
4. **Urgency is text labels** ("Low", "Medium", "High", "Immediate") not numeric codes
5. **Extract ci_health & ci_safety** from view fields (already extracted from JSON metadata)

---

## 📊 INSPECTION LIST PAGE

### API Endpoint
```
GET /inspections
```

### View Used
```sql
public.tams360_inspections_app
```

### Field Mapping

| UI Element | Database Field | Type | Range/Values | Notes |
|-----------|---------------|------|--------------|-------|
| Asset Reference | `asset_ref` | string | - | e.g., "GS-M1-NB-007" |
| Asset Type | `asset_type_name` | string | - | e.g., "Gantry" |
| Inspection Date | `inspection_date` | date | - | Format: YYYY-MM-DD |
| Inspector | `inspector_name` | string | - | |
| CI Final | `ci_final` | number | 0-100 | Higher = Better |
| CI Health | `ci_health` | number | 0-100 | Avg component condition |
| CI Safety | `ci_safety` | number | 0-100 | Urgency-based |
| Urgency | `calculated_urgency` | string | Low/Medium/High/Immediate | Text label |
| DERU | `deru_value` | number | 0+ | Numeric index |
| Remedial Cost | `total_remedial_cost` | number | 0+ | Currency |

### Statistics Cards

| Stat | Calculation | Field Used |
|------|-------------|-----------|
| Total Inspections | `COUNT(*)` | - |
| This Month | Filter by `inspection_date` >= start of month | `inspection_date` |
| Immediate Urgency | `COUNT(*)` WHERE `calculated_urgency = 'Immediate'` | `calculated_urgency` |
| Avg CI Final | `AVG(ci_final)` | `ci_final` |

### Badge Logic

**CI Badge (0-100 scale):**
- ≥ 80: "Excellent" (green)
- 60-79: "Good" (blue)
- 40-59: "Fair" (yellow)
- < 40: "Poor" (red)

**Urgency Badge:**
- "Immediate": Red background
- "High": Orange background
- "Medium": Yellow background
- "Low": Blue background

---

## 🔍 INSPECTION DETAIL PAGE

### API Endpoint
```
GET /inspections/:id
```

### Views Used
1. `public.tams360_inspections_app` (header)
2. `public.tams360_inspection_components_app` (components)

### Header Field Mapping

| UI Element | Database Field | Type | Display Format |
|-----------|---------------|------|----------------|
| Asset Ref | `asset_ref` | string | As-is |
| Inspection Date | `inspection_date` | date | `toLocaleDateString()` |
| Inspector | `inspector_name` | string | As-is |
| **CI Final** | `ci_final` | number | Round to integer |
| **CI Health** | `ci_health` | number | Round to integer |
| **CI Safety** | `ci_safety` | number | Round to integer |
| **DERU Index** | `deru_value` | number | `.toFixed(2)` |
| Urgency | `calculated_urgency` | string | Badge with text |
| Remedial Cost | `total_remedial_cost` | number | Currency format |

### Component Table Mapping

| Column | Database Field | Source View |
|--------|---------------|-------------|
| # | `component_order` | `tams360_inspection_components_app` |
| Component | `component_name` | `tams360_inspection_components_app` |
| Degree (D) | `degree_value` | `tams360_inspection_components_app` |
| Extent (E) | `extent_value` | `tams360_inspection_components_app` |
| Relevancy (R) | `relevancy_value` | `tams360_inspection_components_app` |
| CI | `ci_component` | `tams360_inspection_components_app` |
| Urgency | `urgency_token` | `tams360_inspection_components_app` |
| Quantity | `quantity` | `tams360_inspection_components_app` |
| Unit | `quantity_unit` | `tams360_inspection_components_app` |
| Rate | `rate` | `tams360_inspection_components_app` |
| Cost | `component_cost` | `tams360_inspection_components_app` |
| Notes | `component_notes` | `tams360_inspection_components_app` |

### Urgency Descriptions

```javascript
const urgencyDescriptions = {
  "Immediate": "Requires immediate action for safety",
  "High": "High priority - address promptly",
  "Medium": "Medium priority - schedule maintenance",
  "Low": "Low priority - monitor condition"
};
```

---

## 📈 DASHBOARD PAGE

### API Endpoints
```
GET /dashboard/stats
GET /dashboard/ci-distribution
GET /dashboard/urgency-summary
```

### Statistics Card Mapping

| Stat | Source | Field |
|------|--------|-------|
| Total Assets | Count from `tams360_assets_app` | `asset_id` |
| Total Inspections | Count from `tams360_inspections_app` | `inspection_id` |
| Critical Issues | Filter `calculated_urgency = 'Immediate'` | `calculated_urgency` |
| Avg CI | `AVG(ci_final)` | `ci_final` |
| Avg DERU | `AVG(deru_value)` | `deru_value` |
| Total Remedial Cost | `SUM(total_remedial_cost)` | `total_remedial_cost` |

### CI Distribution Chart

**Data Source:** `public.tams360_ci_distribution_v`

```javascript
{
  ci_band: "80-100 (Excellent)",
  inspection_count: number,
  asset_count: number,
  avg_ci: number,
  total_value: number
}
```

### Urgency Summary Chart

**Data Source:** `public.tams360_urgency_summary_v`

```javascript
{
  calculated_urgency: "Low" | "Medium" | "High" | "Immediate",
  inspection_count: number,
  asset_count: number,
  avg_ci: number,
  total_remedial_cost: number
}
```

---

## 🎯 ASSETS PAGE

### API Endpoint
```
GET /assets
```

### View Used
```sql
public.tams360_assets_app
```

### Field Mapping

| UI Element | Database Field | Type | Notes |
|-----------|---------------|------|-------|
| Asset Ref | `asset_ref` | string | Primary identifier |
| Asset Type | `asset_type_name` | string | Display name |
| Type Code | `asset_type_abbreviation` | string | Short code |
| Location | `location_description` | string | |
| Municipality | `municipality` | string | |
| Latest CI | `latest_ci` | number | 0-100 |
| Last Inspection | `latest_inspection_date` | date | |
| Purchase Price | `purchase_price` | number | Currency |
| Replacement Value | `replacement_value` | number | Currency |
| Installation Year | `installation_year` | number | YYYY |
| Ownership | `ownership_type` | string | |
| Responsible Dept | `responsible_department` | string | |

---

## 📊 CI / DERU CALCULATION REFERENCE

### CI Final Calculation
```
CI Final = MIN(CI Health, CI Safety)
```

### CI Health Calculation
```
CI Health = Average of all valid component CI scores (0-100)
```

### CI Safety Calculation
```
Map worst urgency to 0-100 scale:
- "4" / "Immediate" → 0
- "3" / "High" → 25
- "2" / "Medium" → 50
- "1" / "Low" → 75
- "0" / Minor → 100
```

### Component CI Calculation
```
P = 0.5 * (D/3) + 0.25 * ((E-1)/3) + 0.25 * ((R-1)/3)
CI = ROUND(100 * (1 - P), 0)
Range: 0-100
```

### DERU Index
```
DERU = (100 - CI Final) × urgency_multiplier
Higher DERU = More urgent intervention needed
```

---

## ⚠️ COMMON MISTAKES TO AVOID

### ❌ WRONG
```javascript
// Using old conditional_index field
const ci = inspection.conditional_index;

// Using numeric urgency codes with new data
if (urgency === "4") { ... }

// Querying raw tables
.from("tams360.inspections")

// Normalizing CI when already 0-100
const ci = Math.min(Math.max(inspection.ci_final, 0), 100);
```

### ✅ CORRECT
```javascript
// Use ci_final from app view
const ci = inspection.ci_final;

// Handle both numeric and text urgency
if (urgency === "Immediate" || urgency === "4") { ... }

// Use tenant-safe public views
.from("tams360_inspections_app")

// CI is already 0-100, use directly
const ci = inspection.ci_final;
```

---

## 🔄 MIGRATION CHECKLIST

- [x] Backend updated to use `tams360_inspections_app`
- [x] Backend updated to use `tams360_inspection_components_app`
- [x] Backend updated to use `tams360_assets_app`
- [x] InspectionsPage uses `ci_final` field
- [x] InspectionsPage handles text urgency labels
- [x] InspectionDetailPage uses `ci_final`, `ci_health`, `ci_safety`
- [x] InspectionDetailPage parses components array
- [x] Dashboard uses correct field names
- [ ] NewInspectionPage updated for new views
- [ ] EditInspectionPage updated for new views
- [ ] AssetsPage uses `tams360_assets_app`
- [ ] GIS Map uses correct views

---

## 🧪 VERIFICATION QUERIES

### Test CI Range
```sql
SELECT 
    MIN(ci_final) as min_ci, 
    MAX(ci_final) as max_ci,
    AVG(ci_final) as avg_ci,
    COUNT(*) as total
FROM public.tams360_inspections_app
WHERE ci_final IS NOT NULL;

-- Expected: min_ci >= 0, max_ci <= 100
```

### Test Urgency Distribution
```sql
SELECT 
    calculated_urgency, 
    COUNT(*) as count
FROM public.tams360_inspections_app
GROUP BY calculated_urgency
ORDER BY 
    CASE calculated_urgency
        WHEN 'Immediate' THEN 1
        WHEN 'High' THEN 2
        WHEN 'Medium' THEN 3
        WHEN 'Low' THEN 4
        ELSE 5
    END;

-- Expected: Text labels only (Low/Medium/High/Immediate)
```

### Test Component Data
```sql
SELECT 
    inspection_id,
    component_order,
    component_name,
    degree_value,
    extent_value,
    relevancy_value,
    ci_component,
    urgency_token
FROM public.tams360_inspection_components_app
WHERE inspection_id = '<some_inspection_id>'
ORDER BY component_order;

-- Expected: 1-6 components per inspection, ordered correctly
```

---

## 📞 FIELD REFERENCE SUMMARY

### Old Field Names (❌ DO NOT USE)
- `conditional_index` → Use `ci_final`
- Numeric urgency codes ("4", "3", "2", "1") → Use text labels
- `comp1_degree`, `comp2_degree`, etc. → Use `components` array

### New Field Names (✅ USE THESE)
- `ci_final` (0-100, higher = better)
- `ci_health` (0-100)
- `ci_safety` (0-100)
- `calculated_urgency` (Low/Medium/High/Immediate)
- `deru_value` (numeric index)
- `component_order` (1-6)
- `ci_component` (per-component CI)

---

**END OF DATA BINDING CHECKLIST**
