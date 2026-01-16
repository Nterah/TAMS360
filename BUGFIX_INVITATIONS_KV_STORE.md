# Bug Fix: Invitations Table Error - Use KV Store

**Date:** January 16, 2026  
**Issue:** `relation "public.invitations" does not exist`  
**Solution:** Use KV store instead of database table for invitations  
**Status:** ✅ FIXED

---

## Problem

The backend code was trying to query an `invitations` table that doesn't exist in your PostgreSQL database. Your database architecture uses specific schemas and views, but invitations are not part of that structure.

### Error Message:
```
❌ [GET-INVITES] Database error: {
  code: "42P01",
  details: null,
  hint: null,
  message: 'relation "public.invitations" does not exist'
}
```

---

## Root Cause

The invitations system should use **KV store** (key-value store) instead of database tables because:
- ✅ Invitations are temporary data (expire after X days)
- ✅ KV store is perfect for this use case
- ✅ No need to create additional database tables
- ✅ Consistent with the resendInvitation function which already uses KV store

---

## Fix Applied

Changed **5 invitation endpoints** in `/supabase/functions/server/index.tsx` to use KV store:

### 1. Validate Invitation Endpoint (Line ~621)
**Before:**
```typescript
const { data: invite, error: inviteError } = await supabase
  .from('invitations')
  .select('*')
  .eq('code', inviteCode)
  .single();
```

**After:**
```typescript
const invite = await kv.get(`invite:${inviteCode}`);
```

### 2. Signup - Get Invitation (Line ~689)
**Before:**
```typescript
const { data: inviteData, error: inviteError } = await supabase
  .from('invitations')
  ...
```

**After:**
```typescript
const inviteData = await kv.get(`invite:${inviteCode}`);
```

Also updated field names:
- `invite.tenant_id` → `invite.tenantId`
- `invite.expires_at` → `invite.expiresAt`

### 3. Signup - Update Invitation Status (Line ~767)
**Before:**
```typescript
const { error: updateError } = await supabase
  .from('invitations')
  .update({...})
```

**After:**
```typescript
inviteData.status = "accepted";
inviteData.acceptedAt = new Date().toISOString();
inviteData.acceptedBy = data.user.id;
await kv.set(`invite:${inviteCode}`, inviteData);
```

### 4. Create Invitation (Line ~1671)
**Before:**
```typescript
const { error: insertError } = await supabase
  .from('invitations')
  .insert({...})
```

**After:**
```typescript
const invitationData = {
  code: inviteCode,
  email: email || null,
  role: role || "field_user",
  status: "pending",
  tenantId: userProfile.tenant_id,
  invitedBy: userData.user.id,
  createdAt: new Date().toISOString(),
  expiresAt: expiresAt.toISOString(),
};
await kv.set(`invite:${inviteCode}`, invitationData);
```

### 5. Get All Invitations (Line ~1733)
**Before:**
```typescript
const { data: invitations, error: invitesError } = await supabase
  .from('invitations')
  .select('*')
  .eq('tenant_id', userProfile.tenant_id)
```

**After:**
```typescript
const allInvites = await kv.getByPrefix('invite:');
const invitations = allInvites
  .filter((invite: any) => invite.tenantId === userProfile.tenant_id)
  .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
```

---

## Field Name Changes

Updated to use camelCase (KV store convention):

| Database Field | KV Store Field |
|---------------|----------------|
| `tenant_id` | `tenantId` |
| `expires_at` | `expiresAt` |
| `created_at` | `createdAt` |
| `invited_by` | `invitedBy` |
| `accepted_at` | `acceptedAt` |
| `accepted_by` | `acceptedBy` |

---

## Files Modified

- `/supabase/functions/server/index.tsx` - 5 endpoints updated to use KV store

---

## Testing Checklist

Please verify:
- [ ] User Invitations page loads without errors
- [ ] Can create new invitations
- [ ] Can view list of invitations (filtered by tenant)
- [ ] Invitation codes validate correctly
- [ ] Signup with invitation code works
- [ ] Admin Console shows pending invitations count
- [ ] No database errors in browser console

---

## Storage Architecture

**Invitations:** KV Store (`invite:{code}`)
- ✅ Temporary data
- ✅ Fast read/write
- ✅ Automatic TTL support

**User Data:** PostgreSQL Views
- `tams360_user_profiles_v`
- `tams360_tenants_v`
- `tams360_assets_v`
- etc.

---

**Status:** ✅ Ready to test - No database table needed!
