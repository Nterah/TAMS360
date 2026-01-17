# 🚨 CRITICAL ISSUE IDENTIFIED

## The Problem

Your database schema uses **`org_id`** but the backend code expects **`tenant_id`**.

### Evidence:

From your schema:
```sql
CREATE TABLE public.company_settings (
  ...
  tenant_id uuid NOT NULL UNIQUE,  -- ✅ Has tenant_id
  org_id uuid NOT NULL,            -- ✅ Also has org_id
  ...
)
```

From the backend code (`/supabase/functions/server/index.tsx` line 2713):
```typescript
.eq("tenant_id", userProfile.tenant_id)  // ← Backend looks for tenant_id
```

## Two Possible Scenarios

### Scenario 1: Assets Table Uses `org_id` (Column Name Mismatch)

**The Problem:** The `assets` table has an `org_id` column but the backend queries for `tenant_id`.

**Solution:** You need to either:

**Option A:** Add `tenant_id` column to assets table (recommended):
```sql
-- Add tenant_id column if it doesn't exist
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- Copy org_id values to tenant_id
UPDATE assets 
SET tenant_id = org_id 
WHERE tenant_id IS NULL;

-- Make it required
ALTER TABLE assets 
ALTER COLUMN tenant_id SET NOT NULL;
```

**Option B:** Create the view to map org_id to tenant_id:
```sql
CREATE OR REPLACE VIEW tams360_assets_v AS
SELECT 
    asset_id,
    asset_ref,
    org_id as tenant_id,  -- ← Map org_id to tenant_id
    gps_lat,
    gps_lng,
    -- ... other columns
FROM assets;
```

### Scenario 2: The View Doesn't Exist (Most Likely)

**The Problem:** The backend queries `tams360_assets_v` view which doesn't exist in your database.

**How to Check:**
```sql
SELECT viewname FROM pg_views WHERE viewname = 'tams360_assets_v';
```

If this returns **no rows**, the view is missing!

## 🔍 Diagnostic Steps

### Step 1: Run Schema Discovery
```bash
# Open the file I just created
/SCHEMA_DISCOVERY.sql
```

Run ALL queries in that file to discover:
- Does `assets` table have `tenant_id` or `org_id`?
- Does the view `tams360_assets_v` exist?
- What are the actual GPS column names?

### Step 2: Identify Your Organization ID
```sql
SELECT 
    id,
    email,
    tenant_id,
    org_id
FROM tams360_user_profiles_v
WHERE email = 'your-email@example.com';
```

### Step 3: Try to Query Assets Directly
```sql
-- Try with tenant_id
SELECT COUNT(*) FROM assets WHERE tenant_id = 'YOUR_ID';

-- Try with org_id
SELECT COUNT(*) FROM assets WHERE org_id = 'YOUR_ID';
```

Whichever works, that's the column name in your assets table.

## 📋 Quick Decision Tree

```
Does tams360_assets_v view exist?
│
├─ NO → You need to CREATE THE VIEW (this is the main issue!)
│       Follow "Solution 1" below
│
└─ YES → Does it return your assets?
    │
    ├─ NO → View has wrong tenant/org filter
    │        Follow "Solution 2" below
    │
    └─ YES → Do assets have GPS coordinates?
        │
        ├─ NO → Add GPS coordinates
        │        Follow "Solution 3" below
        │
        └─ YES → Check backend/frontend connection
                 Follow "Solution 4" below
```

## ✅ Solutions

### Solution 1: Create the View (If It Doesn't Exist)

First, check your assets table structure:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'assets' 
ORDER BY ordinal_position;
```

Then create the view based on what column you have:

**If you have `tenant_id` in assets:**
```sql
CREATE OR REPLACE VIEW tams360_assets_v AS
SELECT 
    asset_id,
    asset_ref,
    tenant_id,
    gps_lat,
    gps_lng,
    created_at,
    updated_at,
    -- Add all other columns you need
    *
FROM assets;
```

**If you have `org_id` in assets:**
```sql
CREATE OR REPLACE VIEW tams360_assets_v AS
SELECT 
    asset_id,
    asset_ref,
    org_id as tenant_id,  -- ← Map org_id to tenant_id for the view
    gps_lat,
    gps_lng,
    created_at,
    updated_at,
    -- Add all other columns
    *
FROM assets;
```

### Solution 2: Fix View Filter

If the view exists but uses the wrong column:

```sql
-- Drop and recreate the view
DROP VIEW IF EXISTS tams360_assets_v;

CREATE OR REPLACE VIEW tams360_assets_v AS
SELECT 
    *,
    org_id as tenant_id  -- Ensure tenant_id is available
FROM assets;
```

### Solution 3: Add GPS Coordinates

```sql
-- Check assets without GPS
SELECT asset_id, asset_ref, gps_lat, gps_lng
FROM assets
WHERE gps_lat IS NULL OR gps_lng IS NULL;

-- Add default GPS (Pretoria, South Africa)
UPDATE assets
SET gps_lat = -25.7479, gps_lng = 28.2293
WHERE gps_lat IS NULL OR gps_lng IS NULL;
```

### Solution 4: Verify Backend Can Access View

```sql
-- Test the exact query the backend uses
SELECT *
FROM tams360_assets_v
WHERE tenant_id = 'YOUR_ORG_ID'  -- Use your org ID
LIMIT 5;
```

If this works, the backend should work too!

## 🎯 Most Likely Issue

Based on your schema showing `org_id` in all tables, I suspect:

1. ✅ Your database has `assets` table with `org_id` column
2. ❌ The `tams360_assets_v` view doesn't exist
3. ❌ The backend expects to query a view that maps `org_id` → `tenant_id`

## 🚀 Quick Fix (Try This First)

Run `/SCHEMA_DISCOVERY.sql` to confirm, then if the view is missing:

```sql
-- Create the view mapping org_id to tenant_id
CREATE OR REPLACE VIEW tams360_assets_v AS
SELECT 
    *,
    org_id as tenant_id
FROM assets;

-- Test it
SELECT COUNT(*) FROM tams360_assets_v;

-- Verify with your org
SELECT * FROM tams360_assets_v 
WHERE tenant_id = 'YOUR_ORG_ID' 
LIMIT 5;
```

## 📞 What to Send Me

After running `/SCHEMA_DISCOVERY.sql`, send me:

1. Result of Step 1 (assets table columns)
2. Result of Step 2 (view columns - if it exists)
3. Result of Step 8 (org/tenant column discovery)
4. Result of Step 9 (GPS column discovery)

Then I can give you the EXACT SQL to fix your issue!

## 🔗 Files to Use

1. **`/SCHEMA_DISCOVERY.sql`** - Run this FIRST
2. **`/RUN_THIS_CORRECTED.sql`** - Use this after you know your column names
3. This document - Follow the solutions based on what you discover
