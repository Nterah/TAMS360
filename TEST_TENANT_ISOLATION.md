# TAMS360 Tenant Isolation Testing Guide

## Purpose
Verify that all users can ONLY see data belonging to their own tenant/organization.

## Test Setup

### Existing Test Tenants
Based on your user table:

1. **JRA Organization** (tenant_id: a7618c4c-9bfa-4c54-9113-4d11c7e4fe48)
   - User: admin@jra.org.za (admin role)
   
2. **HN Organization** (tenant_id: 102e622e-8efb-46e5-863b-9bc4b3856ea8)
   - User: admin@tams360.co.za (admin role)
   - User: admin@tams360.com (admin role)

## Test Procedures

### Test 1: Asset Visibility
1. Log in as `admin@jra.org.za`
2. Navigate to Assets page
3. **Expected**: See ONLY assets belonging to JRA (tenant_id: a7618c4c-9bfa-4c54-9113-4d11c7e4fe48)
4. Note the asset count
5. Log out

6. Log in as `admin@tams360.co.za`
7. Navigate to Assets page
8. **Expected**: See ONLY assets belonging to HN (tenant_id: 102e622e-8efb-46e5-863b-9bc4b3856ea8)
9. **Expected**: Asset count should be DIFFERENT from JRA's count
10. **Expected**: NO overlap in asset references

### Test 2: Dashboard Statistics
1. Log in as `admin@jra.org.za`
2. View Dashboard
3. Note:
   - Total Assets count
   - Total Inspections count
   - Critical alerts
   - CI Distribution chart
4. Log out

5. Log in as `admin@tams360.co.za`
6. View Dashboard
7. **Expected**: All statistics should be DIFFERENT and reflect only HN's data

### Test 3: Direct Asset Access (Security Test)
1. Log in as `admin@jra.org.za`
2. Open an asset detail page, note the asset_id in the URL
3. Log out

4. Log in as `admin@tams360.co.za`
5. Try to access the JRA asset by manually entering the asset_id in the URL
6. **Expected**: Should receive "Asset not found" error (403 or 404)
7. **Expected**: Should NOT be able to view JRA's asset details

### Test 4: Inspection Filtering
1. Log in as `admin@jra.org.za`
2. View Inspections page
3. **Expected**: See only inspections for JRA assets
4. Log out

5. Log in as `admin@tams360.co.za`
6. View Inspections page
7. **Expected**: See only inspections for HN assets

### Test 5: Map View Filtering
1. Log in as `admin@jra.org.za`
2. View Map page
3. **Expected**: See only JRA assets on the map
4. Log out

5. Log in as `admin@tams360.co.za`
6. View Map page
7. **Expected**: See only HN assets on the map

## SQL Verification Queries

Run these in Supabase SQL Editor to verify data distribution:

```sql
-- Check how many assets each tenant has
SELECT 
  t.name AS tenant_name,
  COUNT(a.asset_id) AS asset_count
FROM tams360.tenants t
LEFT JOIN tams360.assets a ON a.tenant_id = t.tenant_id
GROUP BY t.tenant_id, t.name
ORDER BY asset_count DESC;

-- Check inspections per tenant
SELECT 
  t.name AS tenant_name,
  COUNT(i.inspection_id) AS inspection_count
FROM tams360.tenants t
LEFT JOIN tams360.inspections i ON i.tenant_id = t.tenant_id
GROUP BY t.tenant_id, t.name
ORDER BY inspection_count DESC;

-- Verify NO cross-tenant data leakage
SELECT 
  a.asset_ref,
  a.tenant_id AS asset_tenant,
  i.tenant_id AS inspection_tenant,
  CASE 
    WHEN a.tenant_id = i.tenant_id THEN 'OK'
    ELSE 'DATA LEAK!'
  END AS status
FROM tams360.assets a
LEFT JOIN tams360.inspections i ON i.asset_id = a.asset_id
WHERE a.tenant_id != i.tenant_id;
-- Expected: 0 rows (or only NULL inspection_tenant for assets without inspections)
```

## Routes Now Protected with Tenant Filtering

✅ `/make-server-c894a9ff/assets` - List assets
✅ `/make-server-c894a9ff/assets/count` - Asset count
✅ `/make-server-c894a9ff/assets/:id` - Individual asset
✅ `/make-server-c894a9ff/assets/inventory-log` - Inventory changes
✅ `/make-server-c894a9ff/assets/:id/inspections` - Asset inspections
✅ `/make-server-c894a9ff/assets/:id/maintenance` - Asset maintenance
✅ `/make-server-c894a9ff/dashboard/critical-alerts` - Dashboard alerts
✅ `/make-server-c894a9ff/dashboard/asset-type-summary` - Asset type summary
✅ `/make-server-c894a9ff/dashboard/ci-distribution` - CI distribution
✅ `/make-server-c894a9ff/dashboard/urgency-summary` - Urgency summary

## Expected Results

- ✅ Each tenant sees ONLY their own data
- ✅ Asset counts differ between tenants
- ✅ Cross-tenant asset access is blocked
- ✅ Dashboard shows tenant-specific statistics
- ✅ Map shows only tenant's assets
- ✅ All queries include `.eq("tenant_id", userProfile.tenant_id)`

## Failure Scenarios to Watch For

- ❌ Seeing all 1920 assets regardless of login
- ❌ Dashboard showing combined statistics
- ❌ Able to access other tenant's assets via direct URL
- ❌ Map showing assets from all tenants
- ❌ Asset count same for all users

## Test Status: READY FOR TESTING

Please run through these tests and report any failures.
