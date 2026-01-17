# 🚨 CRITICAL: Understanding Your Database Issue

## What's Happening

You're getting errors about missing columns (`tenant_id`, `org_id`) which means **your database schema is different than what the application expects**.

## The Backend Expects This Structure:

```typescript
// File: /supabase/functions/server/index.tsx (line 2683)

// 1. Query user profile to get tenant_id
const { data: userProfile } = await supabase
  .from('tams360_user_profiles_v')  // ← Expects this VIEW
  .select('id, tenant_id, role')    // ← Expects 'tenant_id' column
  .eq('id', userData.user.id)
  .single();

// 2. Query assets filtered by tenant
const { data: assets } = await supabase
  .from('tams360_assets_v')         // ← Expects this VIEW
  .select('*')
  .eq('tenant_id', userProfile.tenant_id)  // ← Expects 'tenant_id' column
```

## What You Need:

### Required View 1: `tams360_user_profiles_v`
Must have these columns:
- `id` (user ID)
- `tenant_id` (organization ID) ← **MISSING or named differently**
- `role` (user role)
- `email` (user email)
- `name` (user name)
- `status` (user status)

### Required View 2: `tams360_assets_v`
Must have these columns:
- `asset_id`
- `tenant_id` (organization ID) ← **MISSING or named differently**
- `gps_lat` (latitude)
- `gps_lng` (longitude)
- All other asset fields

## 🎯 Your Next Step

**Run** `/START_ABSOLUTE_BASICS.sql`

This will show:
1. Do the required views exist?
2. If yes, what columns do they have?
3. If no, what tables DO exist?

## Possible Scenarios

### Scenario A: Views Don't Exist At All
**Solution:** Create both views from your base tables

### Scenario B: Views Exist But Use Different Column Names
**Example:** View has `organization_id` instead of `tenant_id`
**Solution:** Recreate view with column aliases

### Scenario C: Base Tables Use Different Names
**Example:** Your database has `organisations` instead of `organizations`
**Solution:** Create views that map to expected names

### Scenario D: This is a Different Database
**Possible:** The schema you showed me (company_settings, employee_ctc_rates, etc.) might be from a DIFFERENT application, not TAMS360
**Solution:** Connect to the correct TAMS360 database

## 🔍 How to Proceed

### Step 1: Run the Diagnostic
```sql
-- Copy and paste from /START_ABSOLUTE_BASICS.sql
-- Run each query one by one
```

### Step 2: Share Results
Tell me:
- ✅ or ❌ Do the views exist? (Query 1 & 2)
- What columns does `tams360_user_profiles_v` have? (Query 4)
- What tables with 'user' in the name exist? (Query 6)
- What tables with 'asset' in the name exist? (Query 7)

### Step 3: I'll Create the Fix
Once I know your actual schema, I'll create the exact SQL to:
- Create the missing views
- Map your column names to what the app expects
- Ensure the map data flows correctly

## 🤔 Important Questions

1. **Are you connected to the TAMS360 database?**
   - The schema you showed earlier (company_settings, employee_ctc_rates) looks like a different application
   - TAMS360 should have tables like: `assets`, `inspections`, `maintenance_records`

2. **Have the database views been created yet?**
   - The application relies on database VIEWS, not just tables
   - These views might not have been created during setup

3. **Is this a fresh TAMS360 installation?**
   - If yes, the database schema might need to be initialized
   - The views need to be created from the base tables

## 🚀 Quick Test

Run this to see if you have the right database:

```sql
-- Check for TAMS360-specific tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name IN ('assets', 'inspections', 'maintenance_records', 'asset_types')
ORDER BY table_name;
```

**If this returns 0 rows:** You might be in the wrong database!

**If this returns 4 rows:** Good! The tables exist, we just need to create the views.

## 📞 Next Steps

1. ✅ Run `/START_ABSOLUTE_BASICS.sql`
2. ✅ Send me the results
3. ✅ I'll create the exact views you need
4. ✅ Map will work!

## Why This Is Happening

The TAMS360 application was designed to use **database views** as an abstraction layer. This allows:
- ✅ Data isolation between tenants
- ✅ Consistent API regardless of underlying schema
- ✅ Easy schema evolution

But the views need to be **created in your database** first. If they're missing, the application can't function.
