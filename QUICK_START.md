# ⚡ TAMS360 - Quick Start Guide

## 🎯 What Just Happened

1. **Fixed Map Bug** - 202 assets now visible (was showing 0)
2. **Built Photo Import** - Import 3,310 photos in 15 minutes

---

## 🚀 Deploy NOW (5 minutes)

### Step 1: Push to Git
```bash
git add .
git commit -m "Fixed map visibility + added photo import"
git push origin main
```

### Step 2: Verify Deployment
- Check Vercel: https://vercel.com/dashboard
- Wait for "Deployment Status: Ready" ✅
- Test in browser: https://app.tams360.co.za

### Step 3: Setup Database (2 minutes)
1. Open Supabase SQL Editor
2. Copy contents of `/DATABASE_SETUP_PHOTOS.sql`
3. Paste and Run (Ctrl+Enter)
4. Verify:
   ```sql
   SELECT * FROM asset_photos LIMIT 1;
   ```

### Step 4: Update PWA on Devices

**Desktop:**
- Close TAMS360 app
- Wait 10 seconds
- Reopen app

**Mobile:**
- Close app (swipe away)
- Wait 10 seconds
- Reopen app

**Force Refresh:**
- Ctrl+Shift+R (Windows)
- Cmd+Shift+R (Mac)

---

## ✅ Test Map Fix (30 seconds)

1. Open TAMS360
2. Go to **GIS Map** page
3. Press **F12** → Console tab
4. Look for:
   ```
   [GISMapPage] Filtered assets: 202 of 202 total ✅
   SimpleMap: Updating markers. Received 202 assets ✅
   ```
5. **See 202 markers** on map in South Africa ✅

**If you see 0 assets:** Force refresh (Ctrl+Shift+R)

---

## 📸 Import Photos (15 minutes)

1. **Go to:** Data Management → Import tab
2. **Click:** Green "Import Photos" button
3. **Select folder:** `C:\HN\HN\Storage - PMB Projects\02 RT\330RT - JRA Road Signs Management\04 Design Development\INSPECTIONS\Inspection Photos`
4. **Wait:** Parsing 3,310 files (~10 seconds)
5. **Review:** Preview shows first 50 assets
6. **Click:** "Upload 3,310 Photos"
7. **Wait:** ~15 minutes (progress bar shows status)
8. **Done!** Check results (success/failed count)

**Verify:**
```sql
SELECT COUNT(*) FROM asset_photos;  -- Should be ~3,310
```

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `/FIX_APPLIED.md` | Map bug fix details |
| `/PHOTO_IMPORT_GUIDE.md` | Complete photo import tutorial |
| `/PWA_UPDATE_GUIDE.md` | How to update PWA on devices |
| `/DATABASE_SETUP_PHOTOS.sql` | Database setup (run this first!) |
| `/IMPLEMENTATION_SUMMARY.md` | Full technical summary |

---

## 🐛 Quick Troubleshooting

### Map still shows 0 assets?
```
1. Force refresh: Ctrl+Shift+R
2. Check console: F12 → Console
3. Clear cache: F12 → Application → Clear site data
4. Reinstall PWA (last resort)
```

### Photo upload fails?
```
1. "Asset not found" → Import assets first (CSV)
2. "No photos selected" → Select ROOT folder, not subfolders
3. Upload stuck → Refresh and try again (uploads in batches)
```

### PWA won't update?
```
1. Close app COMPLETELY (not just minimize)
2. Wait 30 seconds
3. Reopen app
4. Still old? Clear cache + reinstall
```

---

## 🎉 That's It!

**Time to Complete:** ~20 minutes total
- 5 min deploy + database setup
- 15 min photo import

**Result:**
- ✅ 202 assets visible on map
- ✅ 3,310 photos imported and organized
- ✅ System future-proofed for any asset types

**Next Steps:**
- View photos in Asset Detail page (ask me to build gallery!)
- Add captions to photos
- Link photos to inspections
- Build mobile photo capture

**Need help?** Check the detailed guides or just ask! 🚀
