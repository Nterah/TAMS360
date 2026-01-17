# TAMS360 Map Data Source Reference

## 🗺️ Where Map Data Comes From

### Both Web App and Mobile App use the SAME data source:

```
Frontend (Web/Mobile)
    ↓ HTTP GET Request
Backend API: /make-server-c894a9ff/assets
    ↓ SQL Query
Database View: public.tams360_assets_v
    ↓ Filters by
User's tenant_id (from tams360_user_profiles_v)
```

## 📊 Exact Data Flow

### 1. User Login
- User logs in with email/password
- Backend queries: `tams360_user_profiles_v` WHERE `id = user.id`
- Retrieves: `tenant_id`, `role`

### 2. Map Data Request
```javascript
// Frontend makes request
GET /make-server-c894a9ff/assets?pageSize=500

// Backend (index.tsx line 2667-2800)
1. Validates auth token
2. Gets user's tenant_id from tams360_user_profiles_v
3. Queries: tams360_assets_v WHERE tenant_id = user's tenant_id
4. Returns assets with GPS coordinates
```

### 3. Database Query (Exact SQL)
```sql
SELECT *
FROM tams360_assets_v
WHERE tenant_id = '{user_tenant_id}'
ORDER BY asset_id DESC
LIMIT 100;
```

## 🔍 Critical Fields Required for Map Display

Assets MUST have these fields to appear on map:

| Field | Required | Purpose |
|-------|----------|---------|
| `gps_lat` | ✅ YES | Latitude coordinate |
| `gps_lng` | ✅ YES | Longitude coordinate |
| `tenant_id` | ✅ YES | Must match user's tenant |
| `asset_type_id` | ⚠️ Recommended | Used in view JOIN |
| `status_id` | ⚠️ Recommended | Used in view JOIN |

## 🚨 Why Assets Might Not Display

### Problem 1: Not in View
**Symptom:** Assets exist in `assets` table but not in `tams360_assets_v`

**Diagnosis:**
```sql
-- Count in table
SELECT COUNT(*) FROM assets WHERE tenant_id = 'YOUR_TENANT_ID';

-- Count in view
SELECT COUNT(*) FROM tams360_assets_v WHERE tenant_id = 'YOUR_TENANT_ID';
```

**If counts differ:** View is filtering them out

**Common Causes:**
- Missing `asset_type_id` (if view uses INNER JOIN)
- Missing `status_id` (if view uses INNER JOIN)
- Invalid foreign key references

**Solution:**
```sql
-- Find missing assets
SELECT a.asset_id, a.asset_ref, 'Missing from view' as issue
FROM assets a
LEFT JOIN tams360_assets_v v ON a.asset_id = v.asset_id
WHERE a.tenant_id = 'YOUR_TENANT_ID'
  AND v.asset_id IS NULL;
```

### Problem 2: Missing GPS Coordinates
**Symptom:** Assets in view but not on map

**Diagnosis:**
```sql
SELECT 
    asset_id,
    asset_ref,
    gps_lat,
    gps_lng
FROM tams360_assets_v
WHERE tenant_id = 'YOUR_TENANT_ID'
  AND (gps_lat IS NULL OR gps_lng IS NULL);
```

**Solution:**
```sql
-- Add GPS coordinates
UPDATE assets
SET gps_lat = -25.7479, gps_lng = 28.2293
WHERE asset_id = 'YOUR_ASSET_ID';
```

### Problem 3: Wrong Tenant ID
**Symptom:** Assets created but user can't see them

**Diagnosis:**
```sql
-- Check user's tenant
SELECT tenant_id, email FROM tams360_user_profiles_v 
WHERE email = 'your@email.com';

-- Check asset's tenant
SELECT tenant_id, asset_ref FROM assets 
WHERE asset_id = 'YOUR_ASSET_ID';
```

**If different:** Asset is in wrong tenant

**Solution:**
```sql
UPDATE assets
SET tenant_id = 'CORRECT_TENANT_ID'
WHERE asset_id = 'YOUR_ASSET_ID';
```

### Problem 4: User Has No Tenant
**Symptom:** Error: "User not associated with an organization"

**Diagnosis:**
```sql
SELECT id, email, tenant_id FROM tams360_user_profiles_v
WHERE email = 'your@email.com';
```

**If tenant_id is NULL:** User not assigned to tenant

**Solution:**
```sql
UPDATE tams360_user_profiles_v
SET tenant_id = 'YOUR_TENANT_ID'
WHERE email = 'your@email.com';
```

## 📋 Quick Diagnostic Checklist

Run these in order:

### Step 1: Get Your Tenant ID
```sql
SELECT tenant_id FROM tams360_user_profiles_v 
WHERE email = 'YOUR_EMAIL';
```
→ Copy this tenant_id for next steps

### Step 2: Check Assets in Table
```sql
SELECT COUNT(*), 
       COUNT(CASE WHEN gps_lat IS NOT NULL AND gps_lng IS NOT NULL THEN 1 END) as with_gps
FROM assets 
WHERE tenant_id = 'YOUR_TENANT_ID';
```

### Step 3: Check Assets in View
```sql
SELECT COUNT(*), 
       COUNT(CASE WHEN gps_lat IS NOT NULL AND gps_lng IS NOT NULL THEN 1 END) as with_gps
FROM tams360_assets_v 
WHERE tenant_id = 'YOUR_TENANT_ID';
```

### Step 4: Compare
- If counts are same: ✅ View is working
- If view count is lower: ❌ View is filtering assets out
- If "with_gps" is 0: ❌ No GPS coordinates

## 🛠️ Common Fixes

### Add GPS to All Assets (Default Location)
```sql
UPDATE assets
SET gps_lat = -25.7479, gps_lng = 28.2293
WHERE tenant_id = 'YOUR_TENANT_ID'
  AND (gps_lat IS NULL OR gps_lng IS NULL);
```

### Verify View Exists
```sql
SELECT viewname FROM pg_views WHERE viewname = 'tams360_assets_v';
```

### Check View Definition
```sql
SELECT pg_get_viewdef('tams360_assets_v', true);
```

## 🔗 Related Files

- **Backend API:** `/supabase/functions/server/index.tsx` (line 2667)
- **Web Map:** `/src/app/components/map/GISMapPage.tsx`
- **Mobile Map:** `/src/app/components/mobile/MobileMapPage.tsx`
- **API Utility:** `/src/app/utils/api.ts`

## 📞 Support

If assets still don't display after running diagnostics:

1. Run the full diagnostic SQL file: `/MAP_DATA_DIAGNOSTIC.sql`
2. Copy the results
3. Check the view definition for INNER vs LEFT JOINs
4. Verify foreign key relationships
5. Check if the view needs to be recreated

## 🎯 Key Takeaway

**Both web and mobile maps fetch from the exact same source:**
```
tams360_assets_v (filtered by user's tenant_id)
```

If assets don't show on the map, they're either:
1. Not in the view (missing related data)
2. Missing GPS coordinates (gps_lat/gps_lng = NULL)
3. In a different tenant_id than the logged-in user
