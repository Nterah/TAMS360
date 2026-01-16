# Quick Fix Guide - No Assets Error

## Problem
You're seeing these errors:
- "No assets returned from API!"
- "WARNING: No assets have GPS coordinates!"

## Root Cause
The database schema hasn't been created in Supabase yet. The application is trying to query tables and views that don't exist.

## Solution - Follow These Steps

### Step 1: Create the Database Schema

1. **Open your Supabase Project Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your TAMS360 project

2. **Open the SQL Editor**
   - Click on "SQL Editor" in the left sidebar

3. **Run the Setup Script**
   - Open the `DATABASE_SETUP.sql` file in this project
   - Copy the entire contents
   - Paste into the Supabase SQL Editor
   - Click "RUN" to execute

This will create:
- The `tams360` schema
- All required tables (tenants, user_profiles, assets, inspections, maintenance_records, etc.)
- Public views with `tams360_` prefix
- Indexes for performance
- Row Level Security policies

### Step 2: Verify Your User Profile Exists

After running the schema, you need to ensure your user profile exists:

1. In Supabase SQL Editor, run this query:
```sql
-- Check if your user exists in auth
SELECT id, email FROM auth.users;

-- Insert your user profile (replace YOUR_USER_ID and YOUR_EMAIL)
INSERT INTO tams360.user_profiles (id, tenant_id, email, name, role, status)
VALUES (
  'YOUR_USER_ID_FROM_ABOVE',
  (SELECT tenant_id FROM tams360.tenants LIMIT 1), -- Uses first tenant
  'YOUR_EMAIL',
  'Admin User',
  'admin',
  'approved'
)
ON CONFLICT (id) DO NOTHING;
```

### Step 3: Create Sample Assets

Now you can create sample data in two ways:

#### Option A: Using the Diagnostics Page (Easiest)

1. Log in to your TAMS360 app
2. Go to **Admin Console** → **Database Diagnostics**
3. Click **"Run Diagnostics"** to see what's missing
4. The page will show you the exact status of your database

#### Option B: Using SQL (Manual)

Run this in Supabase SQL Editor to create sample assets:

```sql
-- Create asset types first
INSERT INTO tams360.asset_types (tenant_id, name, description)
SELECT 
  (SELECT tenant_id FROM tams360.tenants LIMIT 1),
  name,
  description
FROM (VALUES
  ('Road Sign', 'Traffic signs and signage'),
  ('Guardrail', 'Highway guardrails and barriers'),
  ('Traffic Signal', 'Traffic lights and signals'),
  ('Gantry', 'Highway gantries'),
  ('Safety Barriers', 'Safety barriers and fencing')
) AS t(name, description)
ON CONFLICT DO NOTHING;

-- Create sample assets with GPS coordinates (Pretoria, South Africa)
INSERT INTO tams360.assets (
  tenant_id,
  asset_ref,
  asset_type_id,
  asset_name,
  road_name,
  road_number,
  region,
  gps_lat,
  gps_lng,
  status,
  condition,
  install_date,
  replacement_value,
  useful_life_years,
  created_at
)
SELECT
  (SELECT tenant_id FROM tams360.tenants LIMIT 1),
  'ASSET-' || LPAD(ROW_NUMBER() OVER()::text, 4, '0'),
  (SELECT asset_type_id FROM tams360.asset_types WHERE name = asset_type LIMIT 1),
  asset_name,
  road,
  road,
  'Gauteng',
  lat,
  lng,
  'Active',
  'Good',
  CURRENT_DATE - (RANDOM() * 365)::int,
  (RANDOM() * 45000 + 5000)::numeric(15,2),
  15,
  NOW()
FROM (VALUES
  ('Road Sign', 'Speed Limit 80', 'N1', -25.7479, 28.2293),
  ('Road Sign', 'No Entry', 'N1', -25.7520, 28.2350),
  ('Guardrail', 'Highway Guardrail Section A', 'N1', -25.7600, 28.2400),
  ('Guardrail', 'Highway Guardrail Section B', 'N1', -25.7650, 28.2450),
  ('Traffic Signal', 'Church Street Intersection', 'M1', -25.7550, 28.2320),
  ('Traffic Signal', 'Pretorius Street Intersection', 'M2', -25.7480, 28.2400),
  ('Safety Barriers', 'Bridge Safety Barrier', 'N4', -25.7400, 28.2250)
) AS t(asset_type, asset_name, road, lat, lng)
ON CONFLICT (tenant_id, asset_ref) DO NOTHING;
```

### Step 4: Verify the Fix

1. Refresh your TAMS360 application
2. Go to the **Map** page or **Assets** page
3. You should now see the sample assets with their GPS locations

## Quick Reference: Common Issues

### Issue: "User not associated with an organization"
**Fix:** Run Step 2 above to create your user profile and link it to a tenant.

### Issue: Views not found (PGRST200 error)
**Fix:** Run the DATABASE_SETUP.sql script to create the public views.

### Issue: No tenant exists
**Fix:** Create a tenant first:
```sql
INSERT INTO tams360.tenants (name, domain, tier, status)
VALUES ('My Organization', 'myorg.com', 'trial', 'active')
RETURNING tenant_id;
```

## Verification Checklist

- [ ] Database schema created (tables in `tams360` schema)
- [ ] Public views created (`tams360_assets_v`, `tams360_tenants_v`, etc.)
- [ ] At least one tenant exists in `tams360.tenants`
- [ ] Your user profile exists in `tams360.user_profiles` with a `tenant_id`
- [ ] Sample assets created with `gps_lat` and `gps_lng` values
- [ ] Can see assets on the Map page
- [ ] Can see assets on the Assets page

## Need Help?

If you still see errors after following these steps:

1. Run the Diagnostics tool (Admin Console → Database Diagnostics)
2. Check the browser console for detailed error messages
3. Check the Supabase logs (Dashboard → Logs → Edge Functions)
4. Verify your Supabase environment variables are set correctly

## Success!

Once you complete these steps, you should see:
- ✅ Assets displaying on the map with their GPS markers
- ✅ Assets list populated in the Assets page
- ✅ No more "No assets returned from API!" errors
- ✅ Dashboard showing asset counts and statistics
