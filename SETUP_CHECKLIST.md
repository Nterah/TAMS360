# TAMS360 Quick Setup Checklist

## ✅ Setup Steps (Do these in order)

### Step 1: Create Public Views
**Status:** ⬜ Not Started  
**Action Required:** Run SQL script in Supabase

1. Open your Supabase Dashboard
2. Go to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy and paste contents of `/CREATE_TAMS360_PUBLIC_VIEWS.sql`
5. Click **Run** button
6. Verify no errors appear

**Expected Output:**
```
Success. No rows returned
```

---

### Step 2: Verify Views Created
**Status:** ⬜ Not Started  
**Action Required:** Run verification queries

In Supabase SQL Editor, run:

```sql
-- Check inspections view
SELECT COUNT(*) as inspection_count 
FROM public.tams360_inspections_v;

-- Check assets view
SELECT COUNT(*) as asset_count 
FROM public.tams360_assets_v;

-- Check if columns are correct
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'tams360_inspections_v' 
  AND table_schema = 'public';
```

**Expected Output:**
- Should return counts (may be 0 if no data yet)
- Should list all expected columns

---

### Step 3: Verify RLS Policies
**Status:** ⬜ Not Started  
**Action Required:** Check Row Level Security

In Supabase Dashboard:
1. Go to **Authentication → Policies**
2. Check that views have SELECT policies enabled for authenticated users
3. Verify `tams360` schema tables have proper RLS

**Required Policies:**
- ✅ `public.tams360_inspections_v` - SELECT for authenticated
- ✅ `public.tams360_assets_v` - SELECT for authenticated
- ✅ `tams360.inspections` - SELECT with tenant filter
- ✅ `tams360.assets` - SELECT with tenant filter

---

### Step 4: Test Backend API
**Status:** ⬜ Not Started  
**Action Required:** Test API endpoints

Use browser console or Postman to test:

```javascript
// Get your access token from browser after login
const accessToken = 'your_token_here';
const projectId = 'your_project_id';

// Test dashboard stats
fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff/dashboard/stats`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
})
.then(r => r.json())
.then(data => console.log('Dashboard Stats:', data));

// Test inspections
fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff/inspections`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
})
.then(r => r.json())
.then(data => console.log('Inspections:', data));
```

**Expected Output:**
- Dashboard stats should return counts and averages
- Inspections should return array of inspection records

---

### Step 5: Test Frontend
**Status:** ⬜ Not Started  
**Action Required:** Load app and check UI

1. Open TAMS360 web app
2. Log in with valid credentials
3. Navigate to **Dashboard**
4. Verify you see:
   - ✅ Total Assets count
   - ✅ Total Inspections count
   - ✅ Critical Issues count
   - ✅ Average CI/DERU values
   - ✅ CI Distribution chart
   - ✅ Asset Type pie chart
5. Navigate to **Inspections**
6. Verify inspection list shows:
   - ✅ Asset reference
   - ✅ CI badge with value
   - ✅ Urgency badge
   - ✅ Inspector name and date
   - ✅ DERU value
   - ✅ Remedial cost

---

## 🔍 Troubleshooting

### Problem: "View does not exist" error
**Solution:**
- You haven't run Step 1 yet
- Run `CREATE_TAMS360_PUBLIC_VIEWS.sql` in Supabase SQL Editor

### Problem: "No data showing"
**Solution:**
- Check if you have data: `SELECT COUNT(*) FROM tams360.inspections;`
- If count is 0, you need to seed data or import assets
- Run one of the seed scripts in `/seed-*.sql` files

### Problem: "PGRST106" errors in console
**Solution:**
- This means backend is querying wrong schema
- Check that backend uses `public.tams360_*_v` not `tams360.*`
- Restart Edge Function if needed

### Problem: "Unauthorized" errors
**Solution:**
- Make sure you're logged in
- Check Access Token is valid (not expired)
- Verify RLS policies are enabled
- Check that your user has `tenant_id` set

### Problem: "Blank dashboard/no counts"
**Solution:**
```sql
-- Run this to check your user's tenant
SELECT tenant_id FROM tams360.user_profiles WHERE id = auth.uid();

-- Run this to check if tenant has data
SELECT 
  (SELECT COUNT(*) FROM tams360.assets) as asset_count,
  (SELECT COUNT(*) FROM tams360.inspections) as inspection_count;
```

---

## 📊 Data Validation Queries

Run these in Supabase SQL Editor to validate your setup:

```sql
-- 1. Check view permissions
SELECT 
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name LIKE 'tams360_%'
  AND grantee IN ('authenticated', 'anon');

-- 2. Test inspection view with calculated fields
SELECT 
  inspection_id,
  asset_ref,
  conditional_index,
  deru_value,
  calculated_urgency,
  ci_band,
  total_remedial_cost
FROM public.tams360_inspections_v
LIMIT 5;

-- 3. Test asset view with latest CI
SELECT 
  asset_ref,
  asset_type_name,
  latest_ci,
  latest_deru,
  latest_ci_band,
  replacement_value
FROM public.tams360_assets_v
LIMIT 5;

-- 4. Test dashboard aggregations
SELECT 
  ci_band,
  asset_count,
  avg_ci
FROM public.tams360_ci_distribution_v;

-- 5. Test urgency distribution
SELECT 
  urgency_label,
  inspection_count,
  total_cost
FROM public.tams360_urgency_summary_v;
```

---

## 📈 Expected Results

### Dashboard Should Show:
- **Total Assets:** Actual count from database
- **Inspections This Month:** Count of inspections from current month
- **Critical Issues:** Count of urgency level 4 inspections
- **Average CI:** Average of all `conditional_index` values
- **Average DERU:** Average of all `deru_value` values
- **Total Remedial Cost:** Sum of all inspection costs

### Inspections Page Should Show:
Each inspection card displays:
- Asset reference (e.g., "SGN-001")
- CI badge with color (green=excellent, blue=good, yellow=fair, red=poor)
- Urgency badge (Critical/High/Medium/Low)
- Inspector name
- Inspection date
- CI and DERU values
- Finding summary
- Remedial cost if > 0

### Assets Page Should Show:
Each asset row displays:
- Asset reference
- Asset type name and abbreviation
- Location (road name/number)
- Latest CI band badge
- GPS coordinates
- Installation date
- Status

---

## 🎯 Success Criteria

You'll know everything is working when:
- ✅ Dashboard loads without errors
- ✅ All KPI cards show actual numbers (not just 0)
- ✅ Charts render with real data
- ✅ Inspection list shows records with CI/DERU values
- ✅ Asset list shows records with latest CI bands
- ✅ No console errors about missing views
- ✅ No "PGRST106" errors
- ✅ Data is tenant-filtered (you only see your org's data)

---

## 📝 Quick Reference

### View Names:
- `public.tams360_inspections_v` - Main inspections view
- `public.tams360_assets_v` - Main assets view
- `public.tams360_urgency_summary_v` - Urgency distribution
- `public.tams360_ci_distribution_v` - CI band distribution
- `public.tams360_asset_type_summary_v` - Asset type counts

### Key Columns:
**Inspections:**
- `inspection_id`, `asset_id`, `inspection_date`
- `conditional_index` (CI Final)
- `deru_value` (DERU score)
- `calculated_urgency` ("1", "2", "3", "4")
- `ci_band` ("Excellent", "Good", "Fair", "Poor")
- `asset_ref`, `asset_type_name`

**Assets:**
- `asset_id`, `asset_ref`, `description`
- `latest_ci`, `latest_deru`, `latest_ci_band`
- `asset_type_name`, `asset_type_abbreviation`
- `gps_lat`, `gps_lng`
- `replacement_value`

---

## 🆘 Need Help?

1. Check `/VIEW_INTEGRATION_GUIDE.md` for detailed documentation
2. Review Supabase logs: Dashboard → Logs → Edge Functions
3. Check browser console for frontend errors
4. Verify all SQL scripts have been run
5. Make sure you're using an authenticated user session

---

**Last Updated:** 2025-12-31  
**Version:** 1.0
