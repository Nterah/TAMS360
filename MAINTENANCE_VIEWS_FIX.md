# Maintenance & Inventory Log Views Fix

## Problem
The backend was trying to query the `tams360` schema directly using `.schema("tams360")`, but **Supabase's PostgREST API only allows queries to the `public` schema**.

### Errors Encountered:
```
Error: PGRST106
Message: "The schema must be one of the following: public, graphql_public"
```

This occurred when:
- Fetching maintenance records list
- Fetching single maintenance record by ID
- Fetching maintenance statistics
- Fetching asset inventory log

## Solution

### Step 1: Run SQL Migration
Execute the `/maintenance-views-migration.sql` script in your Supabase SQL Editor.

This creates **2 new public views**:

#### 1. `tams360_maintenance_records_v`
- Exposes maintenance records with joined asset and asset type details
- Includes all maintenance fields plus `asset_ref`, `location`, `asset_type_name`

#### 2. `tams360_asset_inventory_log_v`
- Exposes asset inventory changes with joined asset, asset type, and user details
- Includes all log fields plus `asset_ref`, `asset_type_name`, `changed_by_name`, etc.

### Step 2: Backend Updates (Already Applied)
Updated `/supabase/functions/server/index.tsx`:

**Changed FROM:**
```typescript
await supabase
  .schema("tams360")
  .from("maintenance_records")
  .select(`...complex joins...`)
```

**Changed TO:**
```typescript
await supabase
  .from("tams360_maintenance_records_v")
  .select("*")
```

**Routes Updated:**
- ✅ `GET /make-server-c894a9ff/maintenance` - List all maintenance records
- ✅ `GET /make-server-c894a9ff/maintenance/:id` - Get single record (removed duplicate)
- ✅ `GET /make-server-c894a9ff/maintenance/stats` - Get statistics
- ✅ `GET /make-server-c894a9ff/assets/inventory-log` - Get inventory change log

### Step 3: Code Cleanup
- **Removed duplicate endpoint**: There were TWO identical `/maintenance/:id` endpoints in the code
- **Simplified queries**: Views eliminate need for complex nested SELECT statements
- **Better performance**: Database views are optimized and indexed

## What You Need to Do

### 🔴 ACTION REQUIRED:
**Run this SQL script in Supabase SQL Editor:**

File: `/maintenance-views-migration.sql`

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Paste the contents of `/maintenance-views-migration.sql`
4. Click **Run**

### Expected Output:
```
| check_name                    | row_count |
| ----------------------------- | --------- |
| Maintenance Records View:     | X         |
| Asset Inventory Log View:     | X         |
```

## After Running Migration

The following will work without errors:
- ✅ Maintenance page loads records from database
- ✅ Viewing individual maintenance records
- ✅ Maintenance statistics on dashboard
- ✅ Asset Inventory Log page displays change history

## Technical Notes

### Why Views Instead of Direct Queries?

**Before (❌ Doesn't Work):**
```typescript
.schema("tams360")  // PostgREST can't access this schema
.from("maintenance_records")
```

**After (✅ Works):**
```typescript
.from("tams360_maintenance_records_v")  // Public view, PostgREST can access
```

### View Benefits:
1. **Access Control**: Public schema access without exposing tams360 schema
2. **Performance**: Pre-joined data, optimized queries
3. **Simplicity**: Complex joins done once in view definition
4. **Consistency**: All queries use same data structure
5. **Security**: Can control exactly what columns are exposed

## Files Modified

### Created:
- `/maintenance-views-migration.sql` - SQL script to create public views

### Updated:
- `/supabase/functions/server/index.tsx` - Updated 4 maintenance endpoints to use views
- `/MAINTENANCE_VIEWS_FIX.md` - This documentation

## Related Files

- `/database-views-migration.sql` - Dashboard analytics views (already run ✅)
- `/CREATE_TAMS360_PUBLIC_VIEWS.sql` - Original public views for assets/inspections (already run ✅)
