# TAMS360 Public Views Integration Guide

## Overview

The TAMS360 web app has been updated to read live data from properly named public views (`tams360_*` prefix) that expose data from the `tams360` schema in a Supabase-compatible format.

## Changes Summary

### 1. Created Public Views (CREATE_TAMS360_PUBLIC_VIEWS.sql)

The following public views were created to expose data with the correct naming convention:

#### Primary Views
- **`public.tams360_inspections_v`** - Complete inspection data with calculated CI/DERU fields
  - Includes: `inspection_id`, `asset_id`, `inspection_date`, `inspector_name`, `finding_summary`, `details`
  - Calculated fields: `conditional_index`, `deru_value`, `calculated_urgency`, `total_remedial_cost`, `ci_band`
  - Asset references: `asset_ref`, `asset_type_name`, `asset_type_abbreviation`
  - Metadata: `calculation_metadata` (JSON with CI Health, CI Safety, urgency details)

- **`public.tams360_assets_v`** - Complete asset inventory with latest CI/DERU
  - Includes: `asset_id`, `asset_ref`, `description`, GPS coordinates, road info
  - Asset type: `asset_type_name`, `asset_type_abbreviation`
  - Ownership: `owned_by`, `responsible_party`, `ownership_status`
  - Valuation: `purchase_price`, `useful_life_years`, `current_book_value`, `replacement_value`
  - Latest inspection data: `latest_ci`, `latest_deru`, `latest_inspection_date`, `latest_ci_band`

#### Dashboard Views
- **`public.tams360_asset_type_summary_v`** - Asset counts by type with CI averages
- **`public.tams360_urgency_summary_v`** - Inspection distribution by urgency level
- **`public.tams360_ci_distribution_v`** - Asset distribution by CI bands
- **`public.tams360_maintenance_v`** - Maintenance records with asset references

### 2. Backend API Updates (supabase/functions/server/index.tsx)

Updated all dashboard and data endpoints to query from public views:

#### Dashboard Endpoints
- **GET `/dashboard/stats`** - Now queries `tams360_assets_v` and `tams360_inspections_v`
  - Returns: `totalAssets`, `totalInspections`, `criticalIssues`, `avgCI`, `avgDERU`, `totalRemedialCost`
  
- **GET `/dashboard/ci-distribution`** - Queries `tams360_ci_distribution_v`
  - Returns formatted data for CI band charts
  
- **GET `/dashboard/urgency-summary`** - Queries `tams360_urgency_summary_v`
  - Returns urgency breakdown with counts and costs
  
- **GET `/dashboard/asset-type-summary`** - Queries `tams360_asset_type_summary_v`
  - Returns asset distribution by type

#### Inspection Endpoints
- **GET `/inspections`** - Queries `tams360_inspections_v`
  - Returns all inspections with asset details already joined
  
- **GET `/inspections/stats`** - Uses `tams360_inspections_v` for calculations
  - Returns: `total`, `thisMonth`, `criticalUrgency`, `avgCI`
  
- **GET `/assets/:id/inspections`** - Filtered query on `tams360_inspections_v`

#### Asset Endpoints
- **GET `/assets`** - Queries `tams360_assets_v`
  - Returns all assets with full details
  
- **GET `/assets/:id`** - Single asset from `tams360_assets_v`

### 3. Frontend Updates

#### DashboardPage.tsx
- Added authentication check before fetching data (only fetches when `accessToken` is available)
- Dashboard now displays:
  - Total Assets (from view count)
  - Total Inspections (from view count)
  - Average CI and DERU (calculated from inspection data)
  - Total Remedial Cost (sum of all inspection costs)
  - CI Distribution chart
  - Urgency breakdown
  - Asset type distribution

#### InspectionsPage.tsx
- Updated to use correct field names from `tams360_inspections_v`:
  - `conditional_index` (instead of `ci_final`)
  - `deru_value`
  - `finding_summary`
  - `total_remedial_cost`
  - `calculated_urgency`
- Displays CI and DERU values prominently with proper badges

## Authentication & Tenant Filtering

### How RLS Works
All queries are automatically filtered by tenant based on Row Level Security (RLS) policies:

```sql
-- RLS filters data by:
tenant_id = (SELECT tenant_id FROM tams360.user_profiles WHERE id = auth.uid())
```

This means:
- Users only see data for their tenant
- No need to manually add tenant filters in queries
- Authentication is required for all data access
- The frontend must pass `Authorization: Bearer <accessToken>` header

### Frontend Authentication Flow
1. User logs in → receives `accessToken`
2. App stores `accessToken` in AuthContext
3. All API calls include header: `Authorization: Bearer ${accessToken}`
4. Backend validates token with Supabase Auth
5. RLS policies filter data by user's tenant_id

## Data Flow

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌──────────────┐
│  Frontend   │────▶│  Backend API     │────▶│  Public Views   │────▶│ tams360.*    │
│  (React)    │     │  (Edge Function) │     │  (tams360_*_v)  │     │  (Tables)    │
└─────────────┘     └──────────────────┘     └─────────────────┘     └──────────────┘
     │                      │                         │                      │
     │  Auth Token          │  Validates Auth         │  RLS Filter          │
     └──────────────────────┴─────────────────────────┴──────────────────────┘
```

## Column Mapping Reference

### Inspections View (`tams360_inspections_v`)

| Frontend Variable | View Column Name | Description |
|------------------|------------------|-------------|
| `inspection_id` | `inspection_id` | Primary key |
| `asset_id` | `asset_id` | Foreign key to asset |
| `inspection_date` | `inspection_date` | Date of inspection |
| `inspector_name` | `inspector_name` | Who performed it |
| `finding_summary` | `finding_summary` | Summary text |
| `details` | `details` | Detailed notes |
| `conditional_index` | `conditional_index` | CI Final (0-100) |
| `deru_value` | `deru_value` | DERU score |
| `calculated_urgency` | `calculated_urgency` | "1", "2", "3", or "4" |
| `total_remedial_cost` | `total_remedial_cost` | Repair cost estimate |
| `ci_band` | `ci_band` | "Excellent", "Good", "Fair", "Poor" |
| `asset_ref` | `asset_ref` | Asset reference number |
| `asset_type_name` | `asset_type_name` | E.g., "Signage", "Guardrail" |
| `asset_type_abbreviation` | `asset_type_abbreviation` | E.g., "SGN", "GR" |
| `calculation_metadata` | `calculation_metadata` | JSON with calc details |

### Assets View (`tams360_assets_v`)

| Frontend Variable | View Column Name | Description |
|------------------|------------------|-------------|
| `asset_id` | `asset_id` | Primary key |
| `asset_ref` | `asset_ref` | Reference number |
| `description` | `description` | Asset description |
| `gps_lat` | `gps_lat` | Latitude |
| `gps_lng` | `gps_lng` | Longitude |
| `road_name` | `road_name` | Road name |
| `road_number` | `road_number` | Road number |
| `asset_type_name` | `asset_type_name` | Asset type |
| `asset_type_abbreviation` | `asset_type_abbreviation` | Type abbr. |
| `latest_ci` | `latest_ci` | Most recent CI |
| `latest_deru` | `latest_deru` | Most recent DERU |
| `latest_ci_band` | `latest_ci_band` | Band from latest CI |
| `owned_by` | `owned_by` | Owner organization |
| `responsible_party` | `responsible_party` | Responsible party |
| `replacement_value` | `replacement_value` | Current value |

## Next Steps

### 1. Run the SQL Script
You must run the SQL in `CREATE_TAMS360_PUBLIC_VIEWS.sql` in your Supabase SQL editor:

```bash
# In Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Copy contents of CREATE_TAMS360_PUBLIC_VIEWS.sql
# 3. Click "Run"
# 4. Verify views were created
```

### 2. Verify View Creation
Run these test queries in Supabase SQL Editor:

```sql
-- Test inspections view
SELECT * FROM public.tams360_inspections_v LIMIT 5;

-- Test assets view  
SELECT * FROM public.tams360_assets_v LIMIT 5;

-- Test dashboard views
SELECT * FROM public.tams360_urgency_summary_v;
SELECT * FROM public.tams360_ci_distribution_v;
```

### 3. Test the Frontend
1. Log in to the web app with an authenticated user
2. Navigate to Dashboard - should show live counts and charts
3. Go to Inspections page - should list recent inspections
4. Check that CI, DERU, and urgency values display correctly

### 4. Troubleshooting

#### Issue: "No data showing in dashboard"
**Solution:** 
- Verify views were created (check SQL editor)
- Check that you have data in `tams360.assets` and `tams360.inspections` tables
- Verify RLS policies allow your user to see data
- Check browser console for API errors

#### Issue: "PGRST106 schema not found"
**Solution:**
- This error means the backend is still trying to access `tams360` schema directly
- Views should be in `public` schema
- Backend should query `public.tams360_*_v` views

#### Issue: "Authentication required" errors
**Solution:**
- Make sure you're logged in
- Check that `accessToken` is being passed in API calls
- Verify token is valid (not expired)

## Important Notes

1. **Never query `tams360.*` tables directly from the frontend**
   - Always use the public views (`tams360_*_v`)
   - Backend handles authentication and RLS filtering

2. **Tenant isolation is automatic**
   - RLS policies enforce tenant boundaries
   - Users can only see their own tenant's data
   - No need to manually filter by tenant_id

3. **Views are read-only**
   - For INSERT/UPDATE operations, backend must write to base tables
   - Views are only for SELECT queries

4. **Column names must match exactly**
   - Frontend expects specific column names from views
   - Don't rename columns without updating frontend code

## Files Modified

### Created:
- `/CREATE_TAMS360_PUBLIC_VIEWS.sql` - SQL script to create all views

### Modified:
- `/supabase/functions/server/index.tsx` - Backend API updated to use views
- `/src/app/components/dashboard/DashboardPage.tsx` - Fixed auth and data fetching
- `/src/app/components/inspections/InspectionsPage.tsx` - Updated field names

## Support

If you encounter issues:
1. Check Supabase logs in Dashboard → Logs → Edge Functions
2. Check browser console for frontend errors
3. Verify views exist: `\dv tams360_*` in psql or check Supabase Table Editor
4. Ensure you've run the CREATE_TAMS360_PUBLIC_VIEWS.sql script
