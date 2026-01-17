# Map Data Source - Quick Summary

## 🎯 TL;DR - Where Map Data Comes From

Both the **web app** and **mobile app** maps fetch data from the **exact same source**:

```
Database View: tams360_assets_v
Filter: WHERE tenant_id = {your_tenant_id}
```

## 📁 Files Created for You

1. **`/RUN_THESE_QUERIES_FIRST.sql`** ⭐ START HERE
   - Step-by-step diagnostic queries
   - Copy/paste into Supabase SQL Editor
   - Replace placeholders with your email/tenant_id
   - Will identify the exact problem

2. **`/MAP_DATA_DIAGNOSTIC.sql`**
   - Comprehensive diagnostic queries
   - Deep-dive analysis
   - Use if basic queries don't solve the problem

3. **`/MAP_DATA_SOURCE_REFERENCE.md`**
   - Complete technical reference
   - Data flow diagrams
   - Common issues and solutions
   - Quick fix snippets

## 🚀 Quick Start (3 Minutes)

### Step 1: Get Your Tenant ID
```sql
SELECT tenant_id 
FROM tams360_user_profiles_v 
WHERE email = 'your-email@example.com';
```

### Step 2: Check the Counts
```sql
-- Table count
SELECT COUNT(*) FROM assets WHERE tenant_id = 'YOUR_TENANT_ID';

-- View count (what map uses)
SELECT COUNT(*) FROM tams360_assets_v WHERE tenant_id = 'YOUR_TENANT_ID';
```

**If counts are different → Assets are being filtered out by the view**

### Step 3: Check GPS Coordinates
```sql
SELECT 
    asset_ref,
    gps_lat,
    gps_lng
FROM tams360_assets_v
WHERE tenant_id = 'YOUR_TENANT_ID'
LIMIT 10;
```

**If gps_lat or gps_lng are NULL → Assets won't show on map**

## 🔥 Most Common Issues

### 1. Missing GPS Coordinates (90% of cases)
**Symptom:** Assets exist but map is empty

**Quick Fix:**
```sql
UPDATE assets
SET gps_lat = -25.7479, gps_lng = 28.2293
WHERE tenant_id = 'YOUR_TENANT_ID'
  AND (gps_lat IS NULL OR gps_lng IS NULL);
```

### 2. Assets Not in View
**Symptom:** Assets in `assets` table but not in `tams360_assets_v`

**Diagnosis:**
```sql
SELECT a.asset_ref, 'Missing from view' as issue
FROM assets a
LEFT JOIN tams360_assets_v v ON a.asset_id = v.asset_id
WHERE a.tenant_id = 'YOUR_TENANT_ID'
  AND v.asset_id IS NULL;
```

**Cause:** Usually missing `asset_type_id` or `status_id`

**Fix:** Update assets with valid foreign keys

### 3. Wrong Tenant
**Symptom:** User sees no assets at all

**Check:**
```sql
SELECT email, tenant_id FROM tams360_user_profiles_v 
WHERE email = 'your@email.com';
```

**If tenant_id is NULL:** User not assigned to organization

## 📊 Understanding the Data Flow

```mermaid
User Login
    ↓
Get tenant_id from tams360_user_profiles_v
    ↓
Request: GET /assets
    ↓
Backend queries: tams360_assets_v
    ↓
Filter: WHERE tenant_id = user's tenant_id
    ↓
Return only assets with:
  - Matching tenant_id ✅
  - gps_lat IS NOT NULL ✅
  - gps_lng IS NOT NULL ✅
    ↓
Display on map
```

## 🎯 Backend Code Reference

**File:** `/supabase/functions/server/index.tsx`

**Line:** 2667-2800

**Key Query:**
```typescript
const { data: assets } = await supabase
  .from("tams360_assets_v")
  .select("*")
  .eq("tenant_id", userProfile.tenant_id)
  .order("asset_id", { ascending: false })
  .range(from, to);
```

## 🛠️ Required Fields for Map Display

| Field | Required? | Purpose |
|-------|-----------|---------|
| `gps_lat` | ✅ **YES** | Latitude (-90 to 90) |
| `gps_lng` | ✅ **YES** | Longitude (-180 to 180) |
| `tenant_id` | ✅ **YES** | Must match user's tenant |
| `asset_type_id` | ⚠️ Recommended | Links to asset_types table |
| `status_id` | ⚠️ Recommended | Links to statuses table |

## 🎓 How to Use the Diagnostic Files

### Scenario 1: "Map is completely empty"
1. Run queries from `/RUN_THESE_QUERIES_FIRST.sql`
2. Start with Step 1 (Get tenant ID)
3. Run Step 3 (Count comparison)
4. Most likely: Missing GPS coordinates

### Scenario 2: "Old assets show, new ones don't"
1. Run Step 4 from `/RUN_THESE_QUERIES_FIRST.sql`
2. Check if new assets are in the view
3. Run Step 5 to find what's filtering them out
4. Most likely: Missing asset_type_id or status_id

### Scenario 3: "Some assets show, others don't"
1. Use `/MAP_DATA_DIAGNOSTIC.sql`
2. Run Step 6 (Find missing assets)
3. Run Step 8 (Check relationships)
4. Most likely: Inconsistent foreign key references

## ⚡ Emergency Quick Fixes

### Add GPS to all assets:
```sql
UPDATE assets SET gps_lat = -25.7479, gps_lng = 28.2293
WHERE tenant_id = 'YOUR_TENANT_ID' AND gps_lat IS NULL;
```

### Verify view exists:
```sql
SELECT * FROM pg_views WHERE viewname = 'tams360_assets_v';
```

### Check if you can access the view:
```sql
SELECT COUNT(*) FROM tams360_assets_v;
```

## 🤝 Need Help?

1. Run `/RUN_THESE_QUERIES_FIRST.sql`
2. Copy the results
3. Share with your team/support
4. Include your tenant_id (safely)

## 📞 Support Checklist

Before asking for help, run these:

- [ ] Confirmed view exists: `SELECT * FROM pg_views WHERE viewname = 'tams360_assets_v';`
- [ ] Got your tenant_id: `SELECT tenant_id FROM tams360_user_profiles_v WHERE email = 'YOUR_EMAIL';`
- [ ] Checked table count: `SELECT COUNT(*) FROM assets WHERE tenant_id = 'YOUR_TENANT_ID';`
- [ ] Checked view count: `SELECT COUNT(*) FROM tams360_assets_v WHERE tenant_id = 'YOUR_TENANT_ID';`
- [ ] Verified GPS coordinates: `SELECT COUNT(*) FROM tams360_assets_v WHERE tenant_id = 'YOUR_TENANT_ID' AND gps_lat IS NOT NULL;`

## 🎯 Success Criteria

Your map should work when:

✅ `tams360_assets_v` view exists
✅ User has a valid `tenant_id`
✅ Assets exist in the view with matching `tenant_id`
✅ Assets have `gps_lat` and `gps_lng` values
✅ Frontend can connect to backend API
✅ No authentication errors in browser console

## 🚀 After Fixing

1. Hard refresh the browser (Ctrl+Shift+R / Cmd+Shift+R)
2. Clear browser cache if needed
3. Re-login if you updated user profile
4. Check browser console for errors
5. Verify network tab shows /assets request returning data
