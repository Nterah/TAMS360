# TAMS360 Tenant Migration - Deployment Guide

**Date**: January 19, 2026  
**Risk Level**: 🟢 LOW (Non-destructive, additive changes)  
**Downtime Required**: NO

---

## ✅ What Was Implemented

This update fixes critical tenant isolation issues and photo upload pipeline while maintaining **zero regression**.

### Changes Summary:

**Backend (Supabase Edge Function)**:
1. ✅ Photo upload now uses RPC `tams360_upsert_asset_photo` instead of direct INSERT
2. ✅ Added `/admin/unassigned-assets` endpoint (admin only)
3. ✅ Added `/admin/claim-assets` endpoint (admin only)
4. ✅ No more `.from("assets").update({ main_photo_url })` - uses photo_type = 'main' instead

**Frontend**:
1. ✅ New admin page: `/admin/unassigned-assets` for claiming legacy assets
2. ✅ Empty state in Assets page shows "Check Unassigned Assets" button for admins
3. ✅ Photo upload displays re-upload status ("uploaded" vs "re-uploaded")

**Database**:
1. ⚠️ **REQUIRES SQL EXECUTION** - See `/TAMS360_TENANT_MIGRATION_SQL.md`
2. 3 new RPC functions must be created before deployment

---

## 📋 Pre-Deployment Checklist

- [ ] 1. Backup current database
- [ ] 2. Count current unassigned assets for reference
- [ ] 3. Test SQL scripts in staging environment (if available)
- [ ] 4. Verify Supabase project is not paused
- [ ] 5. Confirm admin user credentials are available

---

## 🚀 Deployment Steps

### Step 1: Run SQL Scripts (CRITICAL - Do this FIRST)

1. Open Supabase SQL Editor: `https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]/sql/new`
2. Copy SQL from `/TAMS360_TENANT_MIGRATION_SQL.md`
3. Run each SQL block in this order:
   - ✅ `tams360_upsert_asset_photo` RPC
   - ✅ `tams360_get_unassigned_assets` RPC
   - ✅ `tams360_claim_assets` RPC
4. Verify all 3 functions created successfully:
   ```sql
   SELECT routine_name, routine_type
   FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND routine_name LIKE 'tams360_%'
   ORDER BY routine_name;
   ```
   Should return 3 rows.

5. Check current unassigned asset count:
   ```sql
   SELECT COUNT(*) as unassigned_count
   FROM tams360.assets
   WHERE (metadata->>'tenant_id') IS NULL;
   ```
   **Save this number** for later verification.

---

### Step 2: Deploy Backend (Edge Function)

**Option A - Using Supabase CLI**:
```bash
# From your project root
supabase functions deploy make-server-c894a9ff

# Verify deployment
supabase functions list
```

**Option B - Manual Deploy**:
1. Go to Supabase Dashboard → Edge Functions
2. Select `make-server-c894a9ff`
3. Deploy new version
4. Wait for deployment to complete (usually 30-60 seconds)

**Verification**:
```bash
# Test unassigned assets endpoint (replace with your values)
curl -X GET "https://[PROJECT_ID].supabase.co/functions/v1/make-server-c894a9ff/admin/unassigned-assets" \
  -H "Authorization: Bearer [ADMIN_ACCESS_TOKEN]"

# Should return: { "assets": [...], "count": X }
```

---

### Step 3: Deploy Frontend

**Vercel Deployment**:
```bash
# From your project root
git add .
git commit -m "feat: Add tenant migration and photo upload RPC"
git push origin main

# Vercel will auto-deploy
# Monitor at: https://vercel.com/your-team/tams360
```

**Manual Verification After Deploy**:
1. Visit `https://app.tams360.co.za`
2. Login as admin user
3. Navigate to `/admin/unassigned-assets`
4. Should see list of unassigned assets (if any exist)

---

### Step 4: Claim Unassigned Assets (Admin Only)

1. **Login as Admin**
2. Go to **Admin Console** → **Unassigned Assets** (or direct: `/admin/unassigned-assets`)
3. Review list of unassigned assets
4. ⚠️ **IMPORTANT**: Only select assets that belong to your organization!
5. Check checkboxes for assets to claim
6. Click **"Claim Selected Assets"**
7. Confirm in dialog
8. Wait for success message
9. Verify assets now appear in main `/assets` page

**Verification Query** (after claiming):
```sql
-- Check that claimed assets now have tenant_id
SELECT 
  COUNT(*) FILTER (WHERE (metadata->>'tenant_id') IS NULL) as still_unassigned,
  COUNT(*) FILTER (WHERE (metadata->>'tenant_id') IS NOT NULL) as now_assigned,
  COUNT(*) as total
FROM tams360.assets;
```

---

### Step 5: Test Photo Upload

1. Navigate to asset detail page
2. Upload a new photo
3. Verify success message shows "uploaded" or "re-uploaded"
4. Re-upload same photo (test upsert behavior)
5. Should succeed without duplicate errors
6. Check browser console for `Photo created/updated successfully` log

**Backend Verification**:
```sql
-- Check photo was saved correctly
SELECT photo_id, asset_id, photo_number, photo_type, uploaded_at
FROM public.asset_photos
WHERE uploaded_at > NOW() - INTERVAL '1 hour'
ORDER BY uploaded_at DESC
LIMIT 5;
```

---

## 🧪 Testing Checklist

### Backend Tests

- [ ] RPC functions exist in database
- [ ] `/admin/unassigned-assets` returns correct count
- [ ] `/admin/claim-assets` successfully assigns tenant_id
- [ ] Photo upload returns success with photo_id
- [ ] Re-uploading same photo updates instead of failing
- [ ] Non-admin users get 403 error on admin endpoints

### Frontend Tests

- [ ] Assets list shows data for tenant (after claiming)
- [ ] Empty state shows "Check Unassigned Assets" button for admins
- [ ] Unassigned Assets page loads correctly
- [ ] Claiming assets shows success toast
- [ ] Assets page refreshes after claiming
- [ ] Photo upload shows progress and success message
- [ ] Re-upload works without errors

### Regression Tests

- [ ] Existing assets still display correctly
- [ ] Inspections page still works
- [ ] Maintenance records still accessible
- [ ] Dashboard stats calculate correctly
- [ ] Map view shows assets correctly
- [ ] No cross-tenant data leaks (verify with 2 different tenants if possible)

---

## 🐛 Troubleshooting

### Issue: "RPC function not found"

**Symptoms**: Error 404 when calling photo upload or unassigned assets  
**Cause**: SQL scripts not run or failed silently  
**Fix**:
```sql
-- Check if functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE 'tams360_%';

-- If missing, re-run SQL from /TAMS360_TENANT_MIGRATION_SQL.md
```

---

### Issue: "Assets list is still empty after claiming"

**Symptoms**: Claimed assets, but `/assets` page still shows nothing  
**Cause**: Tenant filtering might be using wrong tenant_id  
**Fix**:
```sql
-- Verify tenant_id was set correctly
SELECT asset_ref, (metadata->>'tenant_id') as tenant_id
FROM tams360.assets
WHERE asset_ref IN ('ASSET-001', 'ASSET-002')  -- Replace with your asset refs
LIMIT 10;

-- Check what tenant_id the current user has
SELECT id, tenant_id FROM tams360_user_profiles_v WHERE id = '[USER_AUTH_ID]';
```

If mismatch, you claimed to wrong tenant. Contact DBA to fix manually.

---

### Issue: "Photo upload fails with 'Failed to save photo metadata'"

**Symptoms**: File uploads to storage, but metadata save fails  
**Cause**: RPC validation rejecting asset/tenant combination  
**Fix**:
```sql
-- Verify asset has tenant_id matching current user
SELECT 
  a.asset_ref,
  (a.metadata->>'tenant_id') as asset_tenant,
  u.tenant_id as user_tenant
FROM tams360.assets a, tams360_user_profiles_v u
WHERE a.asset_id = '[ASSET_ID]' 
AND u.id = '[USER_AUTH_ID]';

-- If mismatch, asset needs to be assigned to correct tenant
```

---

### Issue: "Permission denied on admin endpoints"

**Symptoms**: 403 error when accessing `/admin/unassigned-assets`  
**Cause**: User role is not 'admin'  
**Fix**:
```sql
-- Check user role
SELECT id, email, role FROM tams360_user_profiles_v WHERE id = '[USER_AUTH_ID]';

-- If not admin, escalate role (admin action only):
UPDATE users SET role = 'admin' WHERE auth_id = '[USER_AUTH_ID]';
```

---

## 📊 Success Metrics

**Before Deployment**:
- Assets list may be empty for tenants
- Photo uploads use direct INSERT (no upsert)
- Unassigned assets invisible to admins

**After Deployment**:
- ✅ Assets list shows all claimed assets
- ✅ Photo re-uploads work without errors
- ✅ Admins can see and claim unassigned assets
- ✅ Tenant isolation fully functional
- ✅ Zero data loss or corruption

---

## 🔄 Rollback Instructions

If critical issues occur:

### Step 1: Revert Code
```bash
# Find previous commit hash
git log --oneline -n 5

# Revert to previous version
git revert [COMMIT_HASH]
git push origin main

# Vercel will auto-deploy rollback
```

### Step 2: (Optional) Remove RPC Functions
```sql
-- Only if RPCs causing issues
DROP FUNCTION IF EXISTS public.tams360_upsert_asset_photo;
DROP FUNCTION IF EXISTS public.tams360_get_unassigned_assets;
DROP FUNCTION IF EXISTS public.tams360_claim_assets;
```

**Note**: Dropping RPCs will break photo uploads. Only do this if reverting to old code.

### Step 3: Verify Rollback
- Photo uploads should revert to old direct INSERT method
- Assets page should behave as before
- No new errors in console

---

## 📞 Support Contacts

**Database Issues**: Contact Supabase Support or DBA  
**Frontend Issues**: Check Vercel deployment logs  
**Backend Issues**: Check Supabase Edge Function logs  

**Monitoring**:
- Supabase Logs: `https://supabase.com/dashboard/project/[PROJECT_ID]/logs/edge-functions`
- Vercel Logs: `https://vercel.com/your-team/tams360/deployments`

---

## 📝 Post-Deployment Actions

1. **Monitor Error Rates** (first 24 hours):
   - Check Supabase logs for RPC errors
   - Monitor Vercel logs for frontend errors
   - Watch for user reports

2. **Communicate to Users**:
   - Notify admins about Unassigned Assets feature
   - Remind users photo re-uploads now supported
   - Share instructions for claiming legacy assets

3. **Document Known Issues**:
   - Update this guide with any new discoveries
   - Add to FAQ if needed

4. **Schedule Cleanup** (after 7 days):
   - Verify all important assets have been claimed
   - Consider archiving or deleting truly orphaned assets
   - Remove deprecated code paths (if any)

---

## ✅ Final Checklist

Before marking deployment complete:

- [ ] All 3 RPC functions created successfully
- [ ] Backend Edge Function deployed
- [ ] Frontend deployed to Vercel
- [ ] Admin user can access `/admin/unassigned-assets`
- [ ] Asset claiming works correctly
- [ ] Photo upload works with new RPC
- [ ] Photo re-upload (upsert) works
- [ ] Assets list shows data after claiming
- [ ] No regression in existing features
- [ ] Error monitoring active
- [ ] Team notified of changes

---

**Deployment Status**: ⚠️ READY FOR DEPLOYMENT  
**Next Action**: Run SQL scripts in Supabase SQL Editor  
**Estimated Time**: 15-30 minutes total

Good luck! 🚀
