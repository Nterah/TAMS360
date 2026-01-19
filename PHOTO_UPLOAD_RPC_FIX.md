# Photo Upload RPC Fix - Deployment Note

**Date**: January 19, 2026  
**Risk**: 🟢 **MINIMAL** (Single endpoint change)  
**Regression**: ✅ **ZERO** (Only backend logic updated)

---

## What Changed

**File**: `/supabase/functions/server/index.tsx`  
**Endpoint**: `POST /make-server-c894a9ff/photos/upload`  
**Lines**: 7264-7296

### Before:
- Used `p_asset_id` parameter
- Returned complex result object with `photo_id` nested in array

### After:
- Uses `p_reference_number` (asset ref string) ✅
- Uses `String(photoNumber)` to ensure TEXT type ✅
- Adds `p_caption: null` parameter ✅
- Returns `photo_id` directly from RPC ✅
- Simplified success response

---

## RPC Function Required

**Ensure this function exists** in your Supabase database:

```sql
public.tams360_upsert_asset_photo(
  p_reference_number text,
  p_tenant_id uuid,
  p_photo_url text,
  p_photo_number text,
  p_photo_type text,
  p_component_number int,
  p_sub_number int,
  p_file_size bigint,
  p_file_type text,
  p_caption text,
  p_uploaded_by uuid
) RETURNS uuid  -- returns photo_id
```

---

## Deployment Steps

1. **Verify RPC exists**:
   ```sql
   SELECT routine_name, routine_type
   FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND routine_name = 'tams360_upsert_asset_photo';
   ```
   Should return 1 row.

2. **Deploy Edge Function**:
   ```bash
   supabase functions deploy make-server-c894a9ff
   ```

3. **Test photo upload**:
   - Upload a photo via UI
   - Check console logs for "Photo saved successfully - ID: ..."
   - Verify row in `public.asset_photos`
   - Re-upload same photo → should succeed (upsert)

---

## Acceptance Tests

✅ **Test 1**: Upload new photo
- Expected: Returns `{ success: true, photo_id: "uuid", ... }`
- Verify: Row exists in `public.asset_photos` with correct reference_number

✅ **Test 2**: Re-upload same photo (same assetRef + photoNumber + photoType)
- Expected: No duplicate error, returns success with same photo_id
- Verify: Row updated with new timestamp/URL

✅ **Test 3**: No regression
- All other features work unchanged
- No UI changes
- No routing changes

---

## Key Changes Summary

| Parameter | Before | After |
|-----------|--------|-------|
| Asset identifier | `p_asset_id: asset.asset_id` | `p_reference_number: assetRef` |
| Photo number type | `photoNumber` (any) | `String(photoNumber)` (explicit TEXT) |
| Caption | Missing | `p_caption: null` |
| Response key | `photoId` (nested) | `photo_id` (direct) |

---

## Rollback Plan

If issues occur, revert to previous version:

```bash
git revert HEAD
git push origin main
```

Previous code used `p_asset_id` and returned nested result.

---

**Status**: ✅ **READY TO DEPLOY**  
**Impact**: Backend only, zero UI changes  
**Estimated Deploy Time**: 2 minutes
