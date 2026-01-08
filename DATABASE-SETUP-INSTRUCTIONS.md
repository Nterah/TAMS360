# TAMS360 Database Setup Instructions

## Overview
This document provides step-by-step instructions for setting up the TAMS360 database views in Supabase to enable full functionality of the dashboard analytics features.

## Current Status
✅ **Frontend**: Fully implemented with component-based inspections, CI calculations, and analytics dashboards  
✅ **Backend API**: All routes implemented with fallback logic  
⚠️ **Database Views**: Need to be created using the migration script  

## Required Setup Steps

### Step 1: Access Supabase SQL Editor
1. Log into your Supabase project dashboard
2. Navigate to the **SQL Editor** in the left sidebar
3. Click **+ New Query** to create a new SQL query

### Step 2: Run the Migration Script
1. Open the file `/database-views-migration.sql` in this project
2. Copy the entire contents of the file
3. Paste it into the Supabase SQL Editor
4. Click **RUN** to execute the script

### Step 3: Verify Views Were Created
After running the migration, you should see output similar to:
```
CI Distribution View: X rows
Urgency Summary View: Y rows  
Asset Type Summary View: Z rows
```

If you see errors, check that:
- The `tams360` schema exists and contains the required tables
- You have sufficient permissions to create views in the public schema
- The tables `assets`, `inspections`, and `asset_types` exist in the `tams360` schema

### Step 4: Test the Application
1. Refresh your TAMS360 web application
2. Navigate to the Dashboard page
3. Verify that the analytics charts are now populated with data:
   - CI Distribution Chart
   - Urgency Summary
   - Asset Type Breakdown

## What the Migration Creates

### 1. `tams360_ci_distribution_v`
Groups assets by Condition Index (CI) bands and calculates:
- Asset count per band
- Average CI per band
- Total asset value per band

CI Bands:
- 80-100: Excellent
- 60-79: Good
- 40-59: Fair
- 20-39: Poor
- 0-19: Critical

### 2. `tams360_urgency_summary_v`
Summarizes inspections by calculated urgency level (1-4):
- Inspection count per urgency level
- Asset count per urgency level
- Average CI and DERU values
- Total remedial costs

### 3. `tams360_asset_type_summary_v`
Provides aggregated statistics by asset type:
- Total asset count
- Total inspection count
- Average CI and DERU
- Total asset value
- Total remedial costs

## Fallback Behavior

If the views haven't been created yet, the backend API will:
1. Log a warning message to the console
2. Calculate approximate values from the base views (`tams360_assets_v`, `tams360_inspections_v`)
3. Return simplified data to the frontend

**Note**: The fallback calculations may be slower and less accurate than using the dedicated views.

## Permissions

The migration script automatically grants the necessary permissions:
- `authenticated` role: SELECT access to all three views
- `anon` role: SELECT access to all three views

These permissions allow:
- Logged-in users to view dashboard analytics
- Public API access if needed in the future

## Troubleshooting

### Error: "relation 'tams360.assets' does not exist"
**Solution**: Ensure you've run the main TAMS360 schema creation script first. The tables must exist before creating views.

### Error: "permission denied for schema public"
**Solution**: You may need to run the script as a superuser. In Supabase, use the SQL Editor which has elevated privileges.

### Error: "column does not exist"
**Solution**: Verify that all columns referenced in the views exist in your tables. The migration assumes the schema from the latest TAMS360 version.

### Views show 0 rows
**Solution**: This is normal if you haven't added any data yet. Use the seed data endpoint or manually add assets and inspections through the UI.

## Next Steps

After setting up the views:
1. ✅ Import some test data using the Data Management page
2. ✅ Create a few inspections for your assets
3. ✅ Run the seed data endpoint to populate asset types and templates
4. ✅ Verify that dashboard charts update in real-time

## Support

If you encounter issues not covered here:
1. Check the browser console for detailed error messages
2. Check the Edge Function logs in Supabase
3. Verify your Supabase project has the `tams360` schema
4. Ensure Row Level Security (RLS) policies are properly configured
