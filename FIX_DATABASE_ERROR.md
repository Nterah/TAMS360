# 🔧 Quick Fix: Database Error

## ❌ The Error You Got

```
ERROR: 42809: referenced relation "assets" is not a table
```

---

## ✅ Quick Fix (2 minutes)

### **Use the FIXED script instead:**

1. **Open Supabase SQL Editor:**
   - https://supabase.com/dashboard
   - Your project → SQL Editor

2. **Copy this file:**
   - `/DATABASE_SETUP_PHOTOS_FIXED.sql`

3. **Paste and Run:**
   - Ctrl+A (select all) → Ctrl+C (copy)
   - Paste into SQL Editor
   - Click "Run" (or Ctrl+Enter)

4. **Look for success message:**
   ```
   ✅ asset_photos table created successfully!
   ✅ Indexes created for performance
   ✅ Row Level Security enabled
   ✅ RLS policies created
   
   🚀 Ready to import photos!
   ```

5. **Verify it worked:**
   ```sql
   SELECT COUNT(*) FROM asset_photos;
   ```
   Should return `0` (empty table, ready for data)

---

## 🤔 What Was Wrong?

**Original script:**
```sql
asset_id UUID NOT NULL REFERENCES public.assets(asset_id) ...
```
This failed because `assets` is a VIEW, not a TABLE. PostgreSQL can't create foreign keys to views.

**Fixed script:**
```sql
asset_id UUID NOT NULL,  -- No foreign key
```
This works! The backend validates asset_id instead of the database.

---

## 🎯 Files to Use

| File | Use This? |
|------|-----------|
| `/DATABASE_SETUP_PHOTOS_FIXED.sql` | ✅ **YES - Use this!** |
| `/DATABASE_SETUP_PHOTOS.sql` | ❌ NO - Has the error |
| `/CHECK_ASSETS_TABLE.sql` | ℹ️ Optional (for diagnostics) |

---

## 🚀 After This: Import Photos!

1. Deploy app to Vercel (git push)
2. Go to: Data Management → Import tab
3. Click: "Import Photos" button
4. Select: "Inspection Photos" folder
5. Upload: 3,310 photos in ~15 minutes!

---

**That's it!** The fixed script will work regardless of whether your `assets` is a table or view. 🎉
