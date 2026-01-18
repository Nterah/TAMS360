# 🚀 DEPLOY NOW - Photo Import Feature

## Run These Commands in PowerShell:

```powershell
cd "C:\HN\OneDrive - HN\Nterah Digital\GitHub\TAMS360"

git add .

git commit -m "DEPLOY: Photo import system v2.1.0 + map visibility fix"

git push origin main
```

---

## ✅ What This Will Deploy:

### 1. Photo Import System
- `/src/app/components/data/ImportPhotosPage.tsx` - Full photo import UI
- Backend routes in `/supabase/functions/server/index.tsx`:
  - `POST /photos/upload` - Upload photos to Supabase Storage
  - Photo classification logic (0, 1, 1.1, 6, etc.)
  - Automatic asset matching

### 2. Map Visibility Fix
- Dynamic asset type discovery
- Shows all 202 assets on map

### 3. UI Updates
- Green "Import Photos" card on Data Management page
- Progress tracking
- Success/error reporting

---

## 📊 After Deployment:

### Check Vercel:
1. Go to https://vercel.com/dashboard
2. Should see new deployment building
3. Wait 2-3 minutes for "Ready" status

### Update Your PWA:
1. Close TAMS360 app completely
2. Wait 10 seconds
3. Reopen app

### Find Import Photos:
1. Go to **Data Management** page
2. Scroll down to **"Import Photos"** green card
3. Click **"Import Photos (3,310 files ready)"** button
4. Select your "Inspection Photos" folder
5. Upload!

---

## 🎯 Version Change:

Added this version marker to trigger deployment:
```javascript
// Version: 2.1.0 - Photo Import Feature Added
```

This small change will make git detect a file change and push to Vercel.

---

## 🚨 Important:

After you run `git push origin main`, you should see:
```
Enumerating objects: X, done.
Counting objects: 100% (X/X), done.
Writing objects: 100% (X/X), XXX bytes | XXX KiB/s, done.
To github.com:your-repo/TAMS360.git
   abc1234..def5678  main -> main
```

Then Vercel will auto-deploy! 🚀
