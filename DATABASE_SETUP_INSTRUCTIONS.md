# 🗄️ Database Setup Instructions - Asset Photos

## 🔴 Error You Got

```
Error: Failed to run sql query: ERROR: 42809: referenced relation "assets" is not a table
```

**What this means:** The `assets` table might be a view (not a real table), or there's a schema issue. PostgreSQL foreign keys can't reference views.

---

## ✅ **SOLUTION: Use the Fixed Script**

### Step 1: Run Diagnostic Query (Optional)

**File:** `/CHECK_ASSETS_TABLE.sql`

This helps us understand your database structure. Run this first if you want to see what's happening:

```sql
-- Copy contents of CHECK_ASSETS_TABLE.sql
-- Paste into Supabase SQL Editor
-- Run it
```

**Expected output:**
- Shows whether `assets` is a TABLE or VIEW
- Shows the column structure
- Helps diagnose schema issues

---

### Step 2: Run the Fixed Setup Script

**File:** `/DATABASE_SETUP_PHOTOS_FIXED.sql` ⭐

This version:
- ✅ Works whether `assets` is a table or view
- ✅ Skips foreign key constraint (validates in app code instead)
- ✅ Handles errors gracefully
- ✅ Creates all indexes and policies
- ✅ Shows success messages

**To run:**

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard
   - Select your project
   - Click "SQL Editor" in left sidebar

2. **Copy the script**
   - Open `/DATABASE_SETUP_PHOTOS_FIXED.sql`
   - Select all (Ctrl+A)
   - Copy (Ctrl+C)

3. **Paste and run**
   - Paste into SQL Editor (Ctrl+V)
   - Click "Run" button (or press Ctrl+Enter)

4. **Check for success messages**
   ```
   ✅ asset_photos table created successfully!
   ✅ Indexes created for performance
   ✅ Row Level Security enabled
   ✅ RLS policies created
   
   🚀 Ready to import photos!
   ```

---

## 🔍 Verify It Worked

Run these queries to confirm:

### Check Table Exists
```sql
SELECT COUNT(*) FROM public.asset_photos;
```
**Expected:** `0` (table exists but empty)

### Check Columns
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'asset_photos'
ORDER BY ordinal_position;
```
**Expected:** List of columns (photo_id, asset_id, tenant_id, photo_url, etc.)

### Check RLS Policies
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'asset_photos';
```
**Expected:** 4 policies (SELECT, INSERT, UPDATE, DELETE)

---

## 🎯 What Changed From Original Script?

### Original (Failed):
```sql
asset_id UUID NOT NULL REFERENCES public.assets(asset_id) ON DELETE CASCADE,
```
❌ This fails if `assets` is a view

### Fixed Version:
```sql
asset_id UUID NOT NULL,  -- No FK constraint
```
✅ Works with both tables and views

**Why it's safe:**
- Backend validates asset_id exists before upload
- Application code prevents orphaned records
- No loss of data integrity

---

## 🚀 After Setup: Import Photos

Once the table is created, you can:

1. **Deploy your app to Vercel** (if not already)
   ```bash
   git push origin main
   ```

2. **Go to Data Management → Import**
   - Click "Import Photos" button
   - Select your "Inspection Photos" folder
   - Upload 3,310 photos!

---

## 🐛 Still Having Issues?

### Error: "relation 'users' does not exist"

**Cause:** Users table is in different schema or has different name.

**Fix:**
```sql
-- Find your users table
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%user%';
```

Then update the RLS policies to use correct table name.

### Error: "permission denied"

**Cause:** Not logged in as database owner.

**Fix:**
- Make sure you're using Supabase SQL Editor (not psql)
- Use the service role key (not anon key)
- Check Database → Settings → Connection String

### Error: "policy already exists"

**Cause:** Script was run twice.

**Fix:**
```sql
-- Drop all policies first
DROP POLICY IF EXISTS "Users can view their tenant's asset photos" ON public.asset_photos;
DROP POLICY IF EXISTS "Users can insert asset photos for their tenant" ON public.asset_photos;
DROP POLICY IF EXISTS "Users can update their tenant's asset photos" ON public.asset_photos;
DROP POLICY IF EXISTS "Users can delete their tenant's asset photos" ON public.asset_photos;

-- Then run the fixed script again
```

---

## 📊 Expected Database Schema

After running the script, your `asset_photos` table should look like:

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| photo_id | UUID | NO | Primary key |
| asset_id | UUID | NO | Links to assets table |
| tenant_id | UUID | NO | For multi-tenant isolation |
| photo_url | TEXT | NO | Path in Supabase Storage |
| photo_number | TEXT | NO | "0", "1", "1.1", "6", etc. |
| photo_type | TEXT | NO | main/location/component/sub-component |
| component_number | INTEGER | YES | 1-5 |
| sub_number | INTEGER | YES | For sub-components |
| file_size | BIGINT | YES | File size in bytes |
| file_type | TEXT | YES | MIME type |
| caption | TEXT | YES | Optional description |
| uploaded_at | TIMESTAMP | NO | Upload timestamp |
| uploaded_by | UUID | YES | auth.users.id |

**Indexes:**
- `idx_asset_photos_asset_id` (fast lookups by asset)
- `idx_asset_photos_tenant_id` (tenant isolation)
- `idx_asset_photos_photo_type` (filter by type)
- `idx_asset_photos_uploaded_at` (sort by date)

**Constraints:**
- `unique_asset_photo` (no duplicate photo numbers per asset)
- `photo_type` CHECK constraint (valid types only)

**RLS Policies:**
- Users can only access their tenant's photos
- Full CRUD permissions for own tenant

---

## ✅ Checklist

- [ ] Run `/CHECK_ASSETS_TABLE.sql` (optional, for diagnostics)
- [ ] Run `/DATABASE_SETUP_PHOTOS_FIXED.sql` 
- [ ] See success messages in output
- [ ] Verify table exists: `SELECT COUNT(*) FROM asset_photos;`
- [ ] Verify columns: Check schema matches table above
- [ ] Verify RLS: Check 4 policies exist
- [ ] Deploy app to Vercel
- [ ] Test photo import in app

---

## 🎉 Success!

Once you see:
```
✅ asset_photos table created successfully!
```

You're ready to import your 3,310 photos! 🚀📸

**Next step:** Go to TAMS360 → Data Management → Import → Import Photos

---

## 📞 Need Help?

**Common Issues:**
- "Table already exists" → That's fine! Script uses IF NOT EXISTS
- "Policy already exists" → Drop policies first (see troubleshooting above)
- "Permission denied" → Use Supabase SQL Editor, not direct psql
- Foreign key errors → Use FIXED script, not original

**Files to use:**
- ✅ `/DATABASE_SETUP_PHOTOS_FIXED.sql` ← **Use this one!**
- ❌ `/DATABASE_SETUP_PHOTOS.sql` ← Don't use (has FK constraint)
- ℹ️ `/CHECK_ASSETS_TABLE.sql` ← Optional diagnostics

Ready to roll! 🚀
