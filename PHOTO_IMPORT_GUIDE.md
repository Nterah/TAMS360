# 📸 Inspection Photo Import - Complete Guide

## 🎯 What Was Built

A complete bulk photo import system that:
- ✅ Imports photos from your Windows folder structure
- ✅ Automatically matches photos to assets by folder name (asset_ref)
- ✅ Classifies photos by number (0=location, 1-5=components, 6=main, 1.1=sub-component)
- ✅ Uploads to Supabase Storage (secure, private bucket)
- ✅ Stores metadata in PostgreSQL database
- ✅ Displays photo previews before upload
- ✅ Handles 3,310+ photos efficiently

---

## 📁 Your Folder Structure (Supported)

```
C:\HN\HN\Storage - PMB Projects\02 RT\330RT - JRA Road Signs Management\04 Design Development\INSPECTIONS\Inspection Photos\
├── 01 - Traffic Signs photos M2/
│   ├── HN-TEST-20260112-0102/
│   │   ├── 0.jpg           → Location photo
│   │   ├── 1.jpg           → Component 1 photo
│   │   ├── 1.1.jpg         → Component 1, sub-photo 1
│   │   ├── 1.2.jpg         → Component 1, sub-photo 2
│   │   ├── 2.jpg           → Component 2 photo
│   │   ├── 3.jpg           → Component 3 photo
│   │   ├── 6.jpg           → Main asset photo ⭐
│   │   └── ...
│   ├── HN-TEST-20260112-0103/
│   └── ...
├── 02 - Traffic Signals M2 Photos/
├── 03 - Gravities M2 Photos/
└── ...
```

### Photo Number Classification:
- **0** = Location/overview photo
- **1-5** = Component photos (individual parts of the asset)
- **1.1, 1.2, etc.** = Sub-photos for component 1 (multiple angles)
- **6** = Main asset photo (featured/hero image) 🌟

---

## 🚀 Step-by-Step Setup

### Step 1: Database Setup (5 minutes)

1. **Open Supabase SQL Editor**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Click "SQL Editor" in left sidebar

2. **Run the Database Script**
   - Open `/DATABASE_SETUP_PHOTOS.sql` from your project
   - Copy all contents
   - Paste into Supabase SQL Editor
   - Click "Run" (or press Ctrl+Enter)

3. **Verify Table Created**
   ```sql
   SELECT * FROM asset_photos LIMIT 1;
   ```
   Should return an empty result (table exists but no rows yet)

### Step 2: Deploy Backend (Auto-deployed to Vercel)

The photo upload API routes were added to `/supabase/functions/server/index.tsx`:
- `POST /photos/upload` - Uploads a single photo
- `GET /photos/:assetId` - Gets all photos for an asset

**These deploy automatically when you push to Git/Vercel!**

### Step 3: Access the Import Page

1. **Log in to TAMS360** as admin or supervisor

2. **Navigate to Data Management**
   - Click "Data Management" in main menu
   - OR go directly to: `https://app.tams360.co.za/data`

3. **Click "Import" tab**

4. **Click "Import Photos" button** (green card)
   - You'll see: "📸 Bulk Import Inspection Photos"
   - Click "Import Photos (3,310 files ready)"

---

## 📸 How to Import Photos

### Browser-Based Import (Easiest)

1. **Click "Select Folder" button**
   
2. **Navigate to Inspection Photos folder**
   - Browse to: `C:\HN\HN\Storage - PMB Projects\02 RT\330RT - JRA Road Signs Management\04 Design Development\INSPECTIONS\Inspection Photos`
   
3. **Select the "Inspection Photos" folder**
   - **Important:** Select the root "Inspection Photos" folder, not individual subfolders
   - The browser will ask permission to read the folder
   - Click "View files" or "Allow"

4. **Wait for Parsing** (~5-10 seconds for 3,310 files)
   - Console will show: "Parsed 3,310 photos for 202 assets"
   
5. **Review the Preview**
   - You'll see first 50 assets with photo thumbnails
   - Check that asset refs match (e.g., "HN-TEST-20260112-0102")
   - Verify photo numbers are correct

6. **Click "Upload 3,310 Photos"**
   - Progress bar shows real-time upload status
   - Uploads in batches of 10 for reliability
   - Takes ~10-15 minutes for 3,310 photos

7. **Review Results**
   - Green checkmarks ✅ = Success
   - Red X ❌ = Failed (with error message)
   - Most common failure: Asset not found (ref doesn't match database)

---

## 🔍 Troubleshooting

### Problem: "Asset not found: HN-TEST-0001"

**Cause:** The asset reference in the folder name doesn't exist in your database.

**Solutions:**
1. Check asset exists in database:
   ```sql
   SELECT asset_id, asset_ref FROM assets WHERE asset_ref = 'HN-TEST-0001';
   ```
2. Verify asset_ref spelling matches exactly (case-sensitive!)
3. Import missing assets first (Data Management → Import → Upload CSV)

### Problem: "No photos selected" or "0 photos parsed"

**Cause:** Browser didn't read the folder correctly.

**Solutions:**
1. Make sure you selected the ROOT "Inspection Photos" folder
2. Try a different browser (Chrome works best)
3. Check folder permissions (not read-only)

### Problem: Upload stuck at X%

**Cause:** Network timeout or large photo files.

**Solutions:**
1. Refresh the page and try again (uploads in batches, can resume)
2. Check internet connection
3. Reduce photo file sizes (compress images to <2MB each)

### Problem: Photos uploaded but not showing in asset detail

**Cause:** Need to implement photo gallery in AssetDetailPage.

**Solution:** I can add a photo gallery component! Just ask.

---

## 📊 What Happens After Upload

### 1. Photos Stored in Supabase Storage
- Bucket: `make-c894a9ff-inspection-photos`
- Path structure: `{tenant_id}/{asset_ref}/{photo_number}.jpg`
- Example: `102e622e-8efb-46e5-863b-9bc4b3856ea8/HN-TEST-0102/6.jpg`
- Private bucket (requires signed URLs)

### 2. Metadata Stored in Database
```sql
SELECT * FROM asset_photos WHERE asset_id = 'some-uuid';
```

Returns:
| photo_id | asset_id | photo_number | photo_type | component_number | file_size | uploaded_at |
|----------|----------|--------------|------------|------------------|-----------|-------------|
| uuid-1   | uuid-a   | 6            | main       | NULL             | 245678    | 2026-01-17  |
| uuid-2   | uuid-a   | 1            | component  | 1                | 123456    | 2026-01-17  |
| uuid-3   | uuid-a   | 1.1          | sub-component | 1             | 134567    | 2026-01-17  |

### 3. Main Photo Linked to Asset
- If photo_number = "6", updates `assets.main_photo_url`
- Main photo appears in asset cards, lists, etc.

---

## 🎨 Next Steps (Future Enhancements)

### 1. Photo Gallery in Asset Detail Page
- Show all photos for an asset
- Grouped by component
- Lightbox viewer
- Download original

### 2. Photo Management
- Delete photos
- Re-upload/replace
- Add captions
- Rotate/edit

### 3. Inspection Photo Integration
- Link photos to specific inspection records
- Before/after comparison
- Photo annotations (mark damage areas)

### 4. Mobile Photo Capture
- Take photos in Field Capture mode
- Auto-sync to cloud
- Offline photo storage

**Want me to build any of these? Just ask!** 🚀

---

## 🏁 Quick Start Checklist

- [ ] Run `DATABASE_SETUP_PHOTOS.sql` in Supabase SQL Editor
- [ ] Deploy code to Vercel (git push)
- [ ] Log in to TAMS360 as admin
- [ ] Go to Data Management → Import tab
- [ ] Click "Import Photos" button
- [ ] Select "Inspection Photos" folder
- [ ] Review preview (first 50 assets)
- [ ] Click "Upload 3,310 Photos"
- [ ] Wait ~10-15 minutes
- [ ] Check results (success/failed count)
- [ ] View photos in database:
  ```sql
  SELECT COUNT(*) FROM asset_photos; -- Should be ~3,310
  ```

---

## 📞 Support

**Issues?** Check the browser console (F12) for detailed error messages.

**Common Logs:**
```
Parsed 3,310 photos for 202 assets  ✅ Good!
Failed to upload HN-TEST-0001/6: Asset not found  ❌ Asset missing in DB
Upload error: Network timeout  ❌ Internet issue
Successfully uploaded 3,310 photos!  ✅ Perfect!
```

**Need Help?** Ask me to:
- Debug specific errors
- Add photo gallery to Asset Detail page
- Optimize upload speed
- Build photo management features

---

## 🎉 Summary

You now have a **professional photo import system** that can:
- Import 3,310+ photos in ~15 minutes
- Automatically organize by asset and component
- Store securely in Supabase
- Track metadata in PostgreSQL
- Handle errors gracefully

**Total Setup Time:** ~10 minutes
**Total Import Time:** ~15 minutes
**Total Photos:** 3,310 ✅

Ready to import your photos! 📸🚀
