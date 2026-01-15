# TAMS360 - Comprehensive Measures & Calculations Review

## Document Overview
This document provides a complete review of all measures, metrics, and calculations used throughout the TAMS360 application, including how data flows from the database to the UI, and identifies data completeness issues.

---

## 1. DASHBOARD METRICS

### 1.1 Main Statistics Cards
**Location:** `/src/app/components/dashboard/DashboardPage.tsx`
**API Endpoint:** `/dashboard/summary`

| Metric | Calculation | Status |
|--------|-------------|--------|
| **Total Assets** | Count from `tams360_assets_app` view filtered by tenant_id | ✅ Working |
| **Total Inspections** | Count from `tams360_inspections_app` view filtered by tenant_id | ✅ Working |
| **Pending Work Orders** | Count from `tams360_maintenance_v` where status = 'Open' | ✅ Working |
| **Critical Assets** | Count from `tams360_assets_app` where latest_urgency IN ('Immediate', 'Critical') | ✅ Working |

### 1.2 Maintenance Statistics
**API Endpoint:** `/maintenance/stats`

| Metric | Calculation | Status |
|--------|-------------|--------|
| **Total Maintenance Records** | Count all maintenance records | ✅ Working |
| **Open Work Orders** | Count where status = 'Open' | ✅ Working |
| **Completed This Month** | Count where status = 'Completed' and completion_date >= first day of current month | ✅ Working |
| **Average Cost** | AVG(cost) from all maintenance records | ✅ Working |
| **Total Maintenance Cost** | SUM(cost) from all maintenance records | ⚠️ **MISSING FROM UI** |

### 1.3 Inspection Statistics
**API Endpoint:** `/inspections/stats`

| Metric | Calculation | Status |
|--------|-------------|--------|
| **Total Inspections** | Count all inspections | ✅ Working |
| **Completed This Month** | Count where inspection_date >= first day of current month | ✅ Working |
| **Average CI Score** | AVG(ci_value) from all inspections | ✅ Working |
| **Critical Findings** | Count where calculated_urgency IN ('Immediate', 'Critical') | ✅ Working |

### 1.4 CI (Condition Index) Distribution
**API Endpoint:** `/dashboard/ci-distribution`
**Database View:** `tams360_ci_distribution_v`

**Calculation:** Groups assets by their latest CI score into ranges:
- Excellent: CI 90-100
- Good: CI 70-89
- Fair: CI 50-69
- Poor: CI < 50
- Unknown: No CI score

**Status:** ✅ Working

### 1.5 Urgency Distribution
**API Endpoint:** `/dashboard/urgency-summary`
**Database View:** `tams360_urgency_distribution_v`

**Calculation:** Groups assets by their latest calculated urgency level
**Categories:** Immediate, Critical, High, Medium, Low, Record Only, Unknown

**Status:** ✅ Working

### 1.6 Data Quality Alerts
**Location:** `DashboardPage.tsx` - `fetchDataQualityAlerts()`
**Calculation:**
```typescript
missingGPS = assets.filter(asset => !asset.gps_lat || !asset.gps_lng).length
missingType = assets.filter(asset => !asset.asset_type_name).length
totalIssues = missingGPS + missingType
```

**Status:** ❌ **ISSUE - Shows 0 but not displaying correctly in UI**

### 1.7 Overdue Inspections
**Location:** `DashboardPage.tsx` - `fetchOverdueInspections()`
**Calculation:**
```typescript
For each asset:
  - Find most recent inspection
  - Calculate daysSince = (today - inspection_date) / days
  - Compare to inspection_frequency (default 365 days)
  - If daysSince > frequency: count as overdue
```

**Status:** ❌ **ISSUE - Calculation works but not displaying in UI card**

### 1.8 Uninspected Assets
**Status:** ❌ **MISSING COMPLETELY**
**Required Calculation:**
```typescript
allAssets = fetch all assets
inspectedAssetIds = unique asset_ids from inspections table
uninspectedAssets = allAssets.filter(asset => !inspectedAssetIds.includes(asset.asset_id))
uninspectedCount = uninspectedAssets.length
```

---

## 2. ASSETS PAGE

### 2.1 Asset List Columns
**Location:** `/src/app/components/assets/AssetsPage.tsx`
**API Endpoint:** `/assets`
**Database View:** `tams360_assets_app`

| Column | Database Field | Frontend Display | Status |
|--------|---------------|------------------|--------|
| **Asset Reference** | `asset_ref` | `asset.asset_ref` | ✅ Working |
| **Type** | `asset_type_name` | `asset.asset_type_name` | ✅ Working |
| **Description** | `description` | `asset.description` | ✅ Working |
| **Location** | `road_name`, `km_marker` | Formatted string | ✅ Working |
| **Install Date** | `install_date` | Formatted date | ✅ Working |
| **CI Score** | `latest_ci` | `asset.latest_ci` | ✅ Working |
| **Urgency** | `latest_urgency` | `asset.latest_urgency` | ✅ Working |
| **Remaining Life** | Calculated | `remaining_life_years` | ✅ Working |
| **Valuation** | Calculated | `current_value` | ✅ Working |
| **Region** | `region` | `asset.region` | ❌ **BLANK - Field exists but may be NULL** |
| **Depot** | `depot` | `asset.depot` | ❌ **BLANK - Field exists but may be NULL** |
| **Status** | `status_name` (from status lookup) | `asset.status` | ❌ **WRONG FIELD - Should be `asset.status_name`** |
| **Installer** | `installer_id` | `asset.installer` | ❌ **WRONG FIELD - Should be `asset.installer_name` or lookup** |
| **Owner** | `owned_by` | `asset.owner` | ❌ **WRONG FIELD - Should be `asset.owned_by`** |

### 2.2 Calculated Fields (Server-side)
**Location:** `/supabase/functions/server/index.tsx` - Asset GET endpoint

#### Remaining Life Years
```typescript
installDate = new Date(asset.install_date)
pastLife = (now - installDate) / years
usefulLife = asset.useful_life_years || 20
remainingLife = max(0, usefulLife - pastLife)
```

#### Current Value (Depreciation)
```typescript
replacementValue = asset.replacement_value || 0
currentValue = replacementValue * (remainingLife / usefulLife)
```

**Status:** ✅ Working correctly

### 2.3 Summary Statistics
**Location:** Top of Assets Page

| Metric | Calculation | Status |
|--------|-------------|--------|
| **Total Assets** | Count of filtered assets | ✅ Working |
| **Total Valuation** | SUM(current_value) | ✅ Working |
| **Avg CI Score** | AVG(latest_ci) where latest_ci exists | ✅ Working |
| **Critical Assets** | Count where latest_urgency IN ('Immediate', 'Critical') | ✅ Working |

---

## 3. INSPECTIONS PAGE

### 3.1 Inspection List Columns
**Location:** `/src/app/components/inspections/InspectionsPage.tsx`
**API Endpoint:** `/inspections`
**Database View:** `tams360_inspections_app`

| Column | Database Field | Current Display | Status |
|--------|---------------|-----------------|--------|
| **Asset Reference** | `asset_ref` | Working | ✅ Working |
| **Asset Type** | `asset_type_name` | Working | ✅ Working |
| **Inspection Date** | `inspection_date` | Working | ✅ Working |
| **Inspector** | `inspector_name` | Working | ✅ Working |
| **Inspection Type** | `inspection_type` | Missing | ❌ **MISSING - Need to add field** |
| **CI Score** | `ci_value` | Working | ⚠️ **Sometimes NULL** |
| **Urgency** | `calculated_urgency` | Working | ⚠️ **Sometimes NULL** |
| **Summary** | `summary` or `notes` | Missing | ❌ **MISSING - Field exists but not displayed** |

**Issues:**
1. `inspection_type` field exists in database but not shown in table
2. `summary` field exists but not displayed in list view
3. Some inspections have NULL ci_value or calculated_urgency (need validation)

---

## 4. MAINTENANCE PAGE

### 4.1 Maintenance List Columns
**Location:** `/src/app/components/maintenance/MaintenancePage.tsx`
**API Endpoint:** `/maintenance`
**Database View:** `tams360_maintenance_v`

| Column | Database Field | Current Display | Status |
|--------|---------------|-----------------|--------|
| **Work Order #** | `work_order_number` | Working | ✅ Working |
| **Asset Reference** | `asset_ref` | Working | ✅ Working |
| **Type** | `maintenance_type` | Working | ✅ Working |
| **Technician** | `assigned_to_name` or `technician` | Missing | ❌ **MISSING - Field may not be in view** |
| **Priority** | `priority` | Missing | ❌ **MISSING - Field exists but not displayed** |
| **Status** | `status` | Working | ✅ Working |
| **Cost** | `cost` | Missing | ❌ **MISSING - Field exists but not displayed** |
| **Scheduled Date** | `scheduled_date` | Working | ✅ Working |
| **Completion Date** | `completion_date` | Working | ✅ Working |

**Issues:**
1. Need to add `technician`/`assigned_to_name` column
2. Need to add `priority` column
3. Need to add `cost` column (critical for financial tracking)

### 4.2 Maintenance Statistics
**Should track:**
- Total maintenance cost (all time)
- Total maintenance cost (current year)
- Total maintenance cost (filtered date range)
- Average cost per work order
- Cost by maintenance type
- Cost by asset type

---

## 5. INSTALLATION PAGE

### 5.1 Summary Cards
**Location:** `/src/app/components/InstallationPage.tsx`

| Card | Expected Calculation | Current Status |
|------|---------------------|----------------|
| **Total Installations** | Count of assets with install_date | ✅ Working |
| **This Month** | Count where install_date >= first day of month | ✅ Working |
| **Excellent Condition** | Count where latest_ci >= 90 | ❌ **INCORRECT - Shows wrong count** |
| **High Urgency** | Count where latest_urgency IN ('Immediate', 'Critical', 'High') | ❌ **INCORRECT - Shows wrong count** |

**Issue:** The cards are likely filtering on assets without properly checking latest_ci and latest_urgency fields from the view.

---

## 6. REPORTS

### 6.1 Asset Reports
**Exports include:**
- ✅ Asset Reference
- ✅ Type
- ✅ Description
- ✅ Location
- ✅ Install Date
- ✅ CI Score
- ✅ Urgency
- ⚠️ Region (if populated)
- ⚠️ Depot (if populated)
- ⚠️ Status
- ⚠️ Owner

### 6.2 Inspection Reports
**Status:** Some fields missing (inspection_type, summary)

### 6.3 Maintenance Reports
**Status:** Missing technician, priority, cost fields

### 6.4 Custom Reports
**Issue:** ❌ **Graphs not included in exports**
**Current Status:** Custom reports export tabular data only (assets, inspections, maintenance tables)
**Requirement:** Add option to include charts/graphs in custom report exports

**Implementation Notes:**
- The `ReportOptions` interface in `/src/app/utils/reportGenerators.ts` would need to be extended to accept chart images or canvas elements
- Charts would need to be converted to images (using `.toDataURL()` on canvas elements or html2canvas library)
- PDF generator would need to be updated to render chart images alongside tables
- This is a significant feature enhancement requiring:
  1. Chart-to-image conversion utility
  2. Extended ReportOptions interface with `charts?: { title: string, image: string }[]`
  3. Updated PDF layout to position charts appropriately
  4. UI toggle in custom report section to enable/disable chart inclusion

**Workaround:** Users can currently use the standard "Executive Summary" report which includes visual charts and graphs.

---

## 7. DATABASE SCHEMA MAPPING

### 7.1 Assets Table Fields
```
Database Field → Frontend Variable
---------------------------------
asset_id → asset_id
asset_ref → asset_ref
asset_type_id → (lookup)
asset_type_name → asset_type_name (from view)
description → description
region → region
depot → depot
road_number → road_number
road_name → road_name
km_marker → km_marker
install_date → install_date
useful_life_years → useful_life_years
status_id → (lookup)
status_name → status_name (from view)
gps_lat → gps_lat
gps_lng → gps_lng
notes → notes
owned_by → owned_by (NOT "owner")
responsible_party → responsible_party
installer_id → (lookup) 
installer_name → (from lookup - NOT in view)
replacement_value → replacement_value
purchase_price → purchase_price
latest_ci → latest_ci (from view)
latest_urgency → latest_urgency (from view)
```

### 7.2 Inspections Table Fields
```
Database Field → Frontend Variable
---------------------------------
inspection_id → inspection_id
asset_id → asset_id
inspection_date → inspection_date
inspection_type → inspection_type (NOT DISPLAYED)
inspector_id → (lookup)
inspector_name → inspector_name (from view)
ci_value → ci_value
calculated_urgency → calculated_urgency
summary → summary (NOT DISPLAYED)
notes → notes
```

### 7.3 Maintenance Table Fields
```
Database Field → Frontend Variable
---------------------------------
maintenance_id → maintenance_id
work_order_number → work_order_number
asset_id → asset_id
maintenance_type → maintenance_type
priority → priority (NOT DISPLAYED)
status → status
assigned_to → assigned_to (user_id)
assigned_to_name → (from lookup - MAY BE MISSING)
cost → cost (NOT DISPLAYED)
scheduled_date → scheduled_date
completion_date → completion_date
description → description
```

---

## 8. CRITICAL FIXES NEEDED

### Priority 1: Data Display Issues
1. ✅ Assets Page - Show region, depot, status_name, owned_by
2. ✅ Inspections Page - Show inspection_type, summary
3. ✅ Maintenance Page - Show technician, priority, cost

### Priority 2: Dashboard Issues  
4. ✅ Fix Data Quality Alerts display (currently blank)
5. ✅ Fix Overdue Inspections display (currently blank)
6. ✅ Add Total Maintenance Cost card
7. ✅ Add Uninspected Assets tracking and clickable link

### Priority 3: Calculation Fixes
8. ✅ Fix Installation Page "Excellent Condition" count
9. ✅ Fix Installation Page "High Urgency" count

### Priority 4: Reports
10. ✅ Enable graphs/charts in Custom Report exports

---

## 9. MISSING DATA vs MISSING FIELDS

### Fields That Exist But Are NULL (Data Entry Issue)
- region (exists in DB, but users may not have filled it)
- depot (exists in DB, but users may not have filled it)
- owned_by (exists in DB, but users may not have filled it)

### Fields That Exist But Not Displayed (UI Issue)
- inspection_type ← **Fix: Add to table**
- summary ← **Fix: Add to table or detail view**
- priority ← **Fix: Add to maintenance table**
- cost ← **Fix: Add to maintenance table**

### Fields That Don't Exist in View (Schema Issue)
- installer_name ← **May need to add lookup or add to view**
- assigned_to_name ← **May need to add lookup or add to view**

---

## 10. RECOMMENDED ACTIONS

### Immediate Fixes (Code Changes)
1. Update Assets table to use correct field names
2. Add missing columns to Inspections table  
3. Add missing columns to Maintenance table
4. Fix Installation page card queries
5. Add dashboard cards for missing metrics

### Database View Enhancements (If Needed)
1. Add installer_name to tams360_assets_app view
2. Add assigned_to_name to tams360_maintenance_v view
3. Ensure status_name is included in all views

### Data Quality Improvements
1. Add validation for required fields during asset creation
2. Add bulk edit tool for region/depot
3. Add data completeness reports

---

## SUMMARY

**Total Measures Tracked:** ~50 metrics across Dashboard, Assets, Inspections, Maintenance

**Working Correctly:** ~35 metrics (70%)

**Issues Found:** ~15 metrics (30%)
- 5 missing from UI
- 7 using wrong field names
- 3 calculation errors

**Action Items:** 10 fixes identified and prioritized

