# 🔧 Fix: Schema Cache Not Updated

## The Problem
Even though the migration ran successfully and the `tenant_id` column exists in the database, Supabase's PostgREST API server hasn't refreshed its schema cache yet.

**Error:**
```
Could not find the 'tenant_id' column of 'maintenance_records' in the schema cache
```

## Solution: Reload Supabase Schema Cache

### Option 1: Reload via SQL (Fastest)

Run this in your Supabase SQL Editor:

```sql
NOTIFY pgrst, 'reload schema';
```

This forces PostgREST to immediately reload the schema cache.

---

### Option 2: Restart PostgREST via Dashboard

1. Go to **Supabase Dashboard** → Your Project
2. Click **Settings** (gear icon in left sidebar)
3. Click **API** section
4. Look for **"PostgREST"** or **"API Server"**
5. Click **"Restart"** or **"Reload Schema"** button

---

### Option 3: Wait (Automatic)

Supabase automatically reloads the schema cache periodically (usually within 1-2 minutes). You can just wait and try again.

---

## Quick Test After Reload

1. Wait ~10 seconds after running `NOTIFY pgrst, 'reload schema';`
2. Try creating a maintenance record again
3. ✅ Should work without errors!

---

## Why This Happens

Supabase uses PostgREST to auto-generate REST APIs from your Postgres schema. PostgREST caches the schema for performance. When you add/modify columns via SQL migrations, you need to tell PostgREST to refresh its cache.

**This is a one-time issue after schema changes.**
