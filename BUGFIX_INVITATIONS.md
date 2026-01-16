# Bug Fix: Invitations View Error

**Date:** January 16, 2026  
**Issue:** `relation "public.tams360_user_invitations_v" does not exist`  
**Status:** ✅ FIXED

---

## Problem

The backend code was trying to query a view `tams360_user_invitations_v` that doesn't exist in the database. This caused invitations to fail to load on the User Invitations page.

### Error Message:
```
Failed to fetch invitations: {
  "error": "Failed to fetch invitations"
}
Error fetching invitations: Error: Failed to fetch invitations
❌ [GET-INVITES] Database error: {
  code: "42P01",
  details: null,
  hint: null,
  message: 'relation "public.tams360_user_invitations_v" does not exist'
}
```

---

## Root Cause

The code was referencing a non-existent view. Based on your database architecture:
- ✅ Actual schema tables are in `tams360` schema
- ✅ Public views have `tams360_` prefix
- ❌ But invitations are stored directly in the `public.invitations` table (not a view)

---

## Fix Applied

Changed all references from `tams360_user_invitations_v` to `invitations` in `/supabase/functions/server/index.tsx`:

### 1. Validate Invitation (Line ~623)
**Before:**
```typescript
.from('tams360_user_invitations_v')
```
**After:**
```typescript
.from('invitations')
```

### 2. Signup - Get Invitation (Line ~694)
**Before:**
```typescript
.from('tams360_user_invitations_v')
```
**After:**
```typescript
.from('invitations')
```

### 3. Signup - Update Invitation Status (Line ~776)
**Before:**
```typescript
.from('tams360_user_invitations_v')
```
**After:**
```typescript
.from('invitations')
```

### 4. Create Invitation (Line ~1683)
**Before:**
```typescript
.from('tams360_user_invitations_v')
```
**After:**
```typescript
.from('invitations')
```

### 5. Get All Invitations (Line ~1750)
**Before:**
```typescript
.from('tams360_user_invitations_v')
```
**After:**
```typescript
.from('invitations')
```

---

## Files Modified

- `/supabase/functions/server/index.tsx` - 5 occurrences fixed

---

## Testing Checklist

Please verify:
- [ ] User Invitations page loads without errors
- [ ] Can create new invitations
- [ ] Can view list of invitations
- [ ] Invitation codes validate correctly
- [ ] Signup with invitation code works
- [ ] Admin Console shows pending invitations count

---

## Database Schema

For reference, the correct table structure is:

**Public Schema Tables:**
- `invitations` - User invitation codes (direct table, not a view)
- `tenants` - Organization data
- `users` - User accounts

**Public Schema Views (with tams360_ prefix):**
- `tams360_user_profiles_v` - User profiles view
- `tams360_tenants_v` - Tenants view
- `tams360_tenant_settings_v` - Tenant settings view
- `tams360_assets_v` - Assets view
- `tams360_inspections_v` - Inspections view
- `tams360_maintenance_v` - Maintenance records view

---

**Status:** ✅ Ready to test
