# TAMS360 - Live Data Update Status

## Date: December 31, 2025

## Overview
This document tracks the progress of updating TAMS360 to display real data from the database views instead of hardcoded data, and implementing PWA offline-first features.

---

## ✅ COMPLETED

### 1. PWA Offline Infrastructure
- **Created `/src/app/components/offline/OfflineContext.tsx`**
  - Offline state management using React Context
  - Tracks online/offline status
  - Manages pending sync queue
  - LocalStorage persistence for pending changes
  - Auto-sync when reconnecting

- **Created `/src/app/components/offline/OfflineBanner.tsx`**
  - Displays at top of page when offline
  - Shows count of pending changes
  - Informative messaging

- **Created `/src/app/components/offline/SyncStatusBadge.tsx`**
  - Compact sync status indicator in header/sidebar
  - Popover shows detailed sync information
  - Manual sync trigger
  - Shows pending items list
  - Last sync timestamp

- **Updated `/src/app/App.tsx`**
  - Wrapped application with `<OfflineProvider>`
  - Enables offline functionality app-wide

- **Updated `/src/app/components/layout/AppLayout.tsx`**
  - Added `<OfflineBanner />` component
  - Added `<SyncStatusBadge />` to desktop sidebar and mobile header
  - Provides persistent offline status visibility

### 2. Assets Page Updates
- **Updated `/src/app/components/assets/AssetsPage.tsx`**
  - Now displays data from `tams360_assets_v` view
  - Shows correct fields:
    - `asset_ref` (Asset Reference)
    - `asset_type_name` and `asset_type_abbreviation`
    - `description`
    - `road_name` and `road_number`
    - `gps_lat` and `gps_lng`
    - `latest_ci` (Latest Condition Index)
    - `latest_ci_band` (Condition band: Excellent/Good/Fair/Poor)
    - `status_name`
  - Enhanced search to filter by multiple fields
  - Added CI badge with color coding
  - Displays GPS coordinates when available

---

## 🚧 IN PROGRESS / TODO

### 3. Inspections Page Updates
- **Update `/src/app/components/inspections/InspectionsPage.tsx`**
  - ✅ Already fetching from `tams360_inspections_v`
  - ✅ Shows basic inspection data
  - ⏳ Need to enhance to show ALL required fields per spec:
    - `inspection_id`
    - `asset_id` and `asset_ref`
    - `inspection_date`
    - `inspector_name`
    - `inspection_type_id`
    - `finding_summary`
    - `details`
    - `further_inspection_required`
    - `urgency_id`
    - `recommended_action`
    - `gps_lat`, `gps_lng`
    - `weather_conditions`
    - `metadata`
    - `created_at`, `updated_at`
    - **Calculated fields:**
      - `conditional_index` (CI Final)
      - `deru_value`
      - `calculated_urgency`
      - `total_remedial_cost`
      - `ci_band`
      - `calculation_metadata` (JSON with ci_health, ci_safety)

- **Create Inspection Detail Page**
  - New route: `/inspections/:id`
  - Display all inspection fields
  - Component Scores section showing:
    - Component 1-6 scores
    - Degree, Extent, Relevancy values
    - Component notes
    - Photos (if available)
  - Computed metrics clearly labeled:
    - CI Final (with CI Health and CI Safety breakdown)
    - DERU value
    - Calculated urgency
    - Total remedial cost
    - CI Band

### 4. Asset Detail Page
- **Create new `/src/app/components/assets/AssetDetailPage.tsx`**
  - New route: `/assets/:id`
  - Display complete asset information:
    - Basic info (ref, type, description)
    - Location (road, GPS, region, depot)
    - Status and condition
    - **Ownership & Responsibility:**
      - `owned_by`
      - `responsible_party`
      - `ownership_status`
    - **Valuation:**
      - `purchase_price`
      - `useful_life_years`
      - `depreciation_rate`
      - `current_book_value`
      - `replacement_value`
      - `last_valuation_date`
    - **Latest Inspection Data:**
      - `latest_ci`
      - `latest_deru`
      - `latest_inspection_date`
      - `latest_ci_band`
  - Inspection history table
  - Maintenance history table

### 5. Dashboard Enhancements
- **Update `/src/app/components/dashboard/DashboardPage.tsx`**
  - ✅ Already fetching from dashboard views
  - ⏳ Add/enhance summary tiles:
    - Total Assets
    - Total Inspections (Total + last 30 days)
    - Assets with "Immediate" urgency
    - Average CI (ignore nulls)
    - Average DERU (ignore nulls)
    - Total remedial cost (sum)
    - % assets inspected last 30/90 days
    - **Data completeness score** (GPS + type + asset_ref)
  - ⏳ Add/enhance charts:
    - Urgency distribution (Low/Medium/High/Immediate)
    - ✅ CI band distribution (DONE - using horizontal bar chart)
    - CI trend over time (monthly)
    - DERU trend over time (monthly)
    - Top 10 worst assets (lowest CI / highest urgency)
    - Top 10 costliest assets (highest total_remedial_cost)
    - Assets by type (counts / % share)
    - Inspections per inspector (last 30 days)
  - ⏳ Add Data quality panel (admin-only):
    - Missing GPS/ref count
    - Duplicate detection
    - Missing component data

### 6. Settings Page for Tenant Numbering
- **Create `/src/app/components/settings/SettingsPage.tsx`**
  - New route: `/settings`
  - Add navigation link (admin only)
  - Placeholder section: "Tenant Numbering Rules"
  - UI shell for:
    - Unique ID format rules (type abbreviation + lat/long + duplicate suffix)
    - Asset Ref format rules (abbrev + road + increment)
  - Note: Make it clear this is tenant-specific and configurable
  - Implementation note: "Configuration coming soon"

### 7. Offline Sync Implementation
- **Backend sync endpoints** (in `/supabase/functions/server/index.tsx`)
  - Create sync queue processing endpoint
  - Handle conflict detection
  - Implement "last write wins" or field-level merge strategy

- **Frontend sync logic** (in `OfflineContext.tsx`)
  - Implement actual sync logic (currently stubbed)
  - Send pending items to backend
  - Handle sync errors and retries
  - Conflict resolution UI

- **Conflict Resolution Modal**
  - Create `/src/app/components/offline/ConflictResolutionDialog.tsx`
  - Show field-by-field differences
  - Options: "Keep Mine" vs "Keep Server"
  - Clear visual comparison UI

### 8. Cache Management (PWA)
- **Service Worker**
  - Create `/public/sw.js` or use Vite PWA plugin
  - Cache static assets
  - Cache API responses
  - Background sync registration

- **Manifest and PWA Configuration**
  - Create `/public/manifest.json`
  - Add icons for different resolutions
  - Configure Vite for PWA build

### 9. Component Scores Display
- **Enhance Inspection Detail Page**
  - Create reusable component for component scores
  - Display all 6 components with:
    - Component number and name
    - Degree value
    - Extent value (if applicable)
    - Relevancy value (if applicable)
    - Component score
    - Notes
    - Photos
  - Highlight missing extent/relevancy where degree requires them

---

## 📊 DATA FLOW VERIFICATION

### Backend (Already Correct)
- `/supabase/functions/server/index.tsx`
  - ✅ Assets endpoint uses `tams360_assets_v`
  - ✅ Inspections endpoint uses `tams360_inspections_v`
  - ✅ Dashboard endpoints use summary views:
    - `tams360_urgency_summary_v`
    - `tams360_ci_distribution_v`
    - `tams360_asset_type_summary_v`

### Database Views (Already Created)
- ✅ `public.tams360_assets_v` - Complete asset view
- ✅ `public.tams360_inspections_v` - Complete inspection view with CI/DERU
- ✅ `public.tams360_urgency_summary_v` - Urgency distribution
- ✅ `public.tams360_ci_distribution_v` - CI band distribution
- ✅ `public.tams360_asset_type_summary_v` - Asset type summary
- ✅ `public.tams360_maintenance_v` - Maintenance records

---

## 🎯 PRIORITY ORDER

1. **HIGH PRIORITY** (Core functionality)
   - ✅ Offline infrastructure (DONE)
   - ✅ Assets page real data (DONE)
   - ⏳ Inspections page enhancement
   - ⏳ Inspection detail page
   - ⏳ Asset detail page

2. **MEDIUM PRIORITY** (Enhanced UX)
   - ⏳ Dashboard enhancements
   - ⏳ Sync queue implementation
   - ⏳ Conflict resolution UI

3. **LOW PRIORITY** (Nice to have)
   - ⏳ Settings page placeholder
   - ⏳ Service worker and PWA manifest
   - ⏳ Advanced caching strategies

---

## 🔍 FIELD MAPPING REFERENCE

### Assets View Fields (tams360_assets_v)
```
asset_id                  → Primary key (UUID)
asset_ref                 → Human-readable reference
description               → Asset description
status_id                 → Status FK
status_name               → Status name (from join)
gps_lat, gps_lng         → GPS coordinates
road_name, road_number   → Road information
km_marker                 → Kilometer marker
install_date              → Installation date
region, depot             → Location details
notes                     → Additional notes
asset_type_name           → Asset type name
asset_type_abbreviation   → Short code (e.g., "SIG", "GR")
owned_by                  → Owner information
responsible_party         → Responsibility
ownership_status          → Ownership status
purchase_price            → Initial cost
useful_life_years         → Expected lifespan
depreciation_rate         → Depreciation %
current_book_value        → Current value
replacement_value         → Replacement cost
last_valuation_date       → Last valuation
latest_ci                 → Latest condition index
latest_deru               → Latest DERU value
latest_inspection_date    → Last inspection date
latest_ci_band            → CI band (Excellent/Good/Fair/Poor)
```

### Inspections View Fields (tams360_inspections_v)
```
inspection_id             → Primary key (UUID)
asset_id                  → Asset FK
asset_ref                 → Asset reference (from join)
asset_type_name           → Asset type (from join)
asset_type_abbreviation   → Type abbreviation
inspection_date           → Date of inspection
inspector_name            → Inspector name
finding_summary           → Summary of findings
details                   → Detailed findings
conditional_index         → CI Final (calculated)
deru_value                → DERU (calculated)
calculated_urgency        → Urgency (1-4, R, U)
total_remedial_cost       → Total cost to remediate
ci_band                   → CI band label
weather_conditions        → Weather during inspection
calculation_metadata      → JSON with ci_health, ci_safety, etc.
created_at, updated_at    → Timestamps
tenant_id                 → Tenant scope
```

---

## 🚀 NEXT STEPS

1. Update InspectionsPage to show all required fields
2. Create InspectionDetailPage component
3. Create AssetDetailPage component  
4. Enhance Dashboard with additional metrics
5. Implement sync queue processing
6. Create conflict resolution UI
7. Add Settings page placeholder

---

## 📝 NOTES

- All data is tenant-scoped via RLS and tenant_id
- Backend already uses correct views
- Frontend is being updated progressively
- Offline features are now active but sync logic needs implementation
- PWA manifest and service worker can be added later for full PWA support

---

## ✅ VERIFICATION CHECKLIST

- [x] Offline banner appears when offline
- [x] Sync status badge shows in header/sidebar
- [x] Assets page displays real data from database
- [x] Assets page shows CI bands correctly
- [ ] Inspections page shows all required fields
- [ ] Inspection detail page exists and works
- [ ] Asset detail page exists and works
- [ ] Dashboard shows enhanced metrics
- [ ] Sync queue processes pending items
- [ ] Conflict resolution works
- [ ] Settings page placeholder exists
