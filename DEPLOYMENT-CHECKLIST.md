# 🚀 TAMS360 Deployment Checklist

## 📦 Step 1: Prepare for GitHub Upload

### Files to Include (Download from Figma Make):

```
✅ REQUIRED FILES:
├── /src (entire folder)
├── /public (entire folder)
├── /supabase (entire folder)
├── /utils (entire folder)
├── package.json
├── vite.config.ts
├── postcss.config.mjs
├── index.html
├── .gitignore
└── README.md

❌ DO NOT UPLOAD:
├── node_modules/ (NEVER!)
├── dist/ (build output)
├── .env files (keep secrets local)
└── Most .md documentation files (optional)
```

### How to Download from Figma Make:
1. Click on root folder `/`
2. Right-click on each folder/file
3. Select "Download"
4. Save to a local folder on your computer

---

## 🌐 Step 2: Create GitHub Repository

1. **Go to:** https://github.com/new
2. **Repository name:** `tams360-app` (or your choice)
3. **Description:** "TAMS360 - Comprehensive Road & Traffic Asset Management Suite"
4. **Settings:**
   - [ ] Public or Private (your choice)
   - [ ] **DON'T** initialize with README
   - [ ] **DON'T** add .gitignore
   - [ ] **DON'T** add license
5. **Click:** "Create repository"

---

## 📤 Step 3: Upload to GitHub

### Option A: Web Interface (Easiest!)

1. **In your new GitHub repo**, click **"uploading an existing file"**
2. **Drag and drop** all your project files/folders
3. **Commit message:** `Initial commit - TAMS360 v1.0.0`
4. **Click:** "Commit changes"
5. ✅ **Done!**

### Option B: Git CLI (If you prefer terminal)

```bash
cd /path/to/your/tams360/project

git init
git add .
git commit -m "Initial commit - TAMS360 v1.0.0"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/tams360-app.git
git push -u origin main
```

---

## 🚀 Step 4: Deploy to Vercel (Recommended)

### Why Vercel?
- ✅ **Auto-deploys** from GitHub on every commit
- ✅ Free tier (generous limits)
- ✅ Perfect for Vite/React apps
- ✅ Environment variables support
- ✅ HTTPS automatically
- ✅ Preview deployments

### Setup Steps:

1. **Go to:** https://vercel.com
2. **Sign up** using your GitHub account
3. **Click:** "Add New..." → "Project"
4. **Import** your `tams360-app` repository
5. **Configure Build Settings:**
   ```
   Framework Preset: Vite
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

6. **Add Environment Variables:**
   Click "Environment Variables" and add:
   
   ```
   Name: VITE_SUPABASE_URL
   Value: https://fuvzhbuvwpnysluojqni.supabase.co
   
   Name: VITE_SUPABASE_ANON_KEY
   Value: [your-anon-key-from-supabase]
   
   Name: VITE_SUPABASE_SERVICE_ROLE_KEY
   Value: [your-service-role-key]
   ```
   
   ⚠️ **Where to find these keys:**
   - Supabase Dashboard → Settings → API
   - Copy Project URL (for VITE_SUPABASE_URL)
   - Copy `anon` `public` key
   - Copy `service_role` `secret` key

7. **Click:** "Deploy"

8. **Wait** for build to complete (~2-3 minutes)

9. **Get your live URL:** `https://tams360-app.vercel.app`

10. ✅ **Done!** Your app is live!

---

## 🔐 Step 5: Configure Supabase for Production

### Update Allowed URLs:

1. **Go to Supabase Dashboard:**
   https://supabase.com/dashboard/project/fuvzhbuvwpnysluojqni

2. **Settings → API → URL Configuration**

3. **Add your Vercel URL to allowed origins:**
   ```
   https://tams360-app.vercel.app
   https://tams360-app-*.vercel.app  (for preview deployments)
   ```

4. **Authentication → URL Configuration:**
   - Site URL: `https://tams360-app.vercel.app`
   - Redirect URLs: `https://tams360-app.vercel.app/**`

5. **Save changes**

---

## ✅ Step 6: Test Your Deployment

### Test Checklist:

1. **Open your live URL**
   - [ ] App loads correctly
   - [ ] No console errors
   - [ ] Styling looks correct

2. **Test Authentication**
   - [ ] Login works
   - [ ] Registration works
   - [ ] Session persists on refresh

3. **Test Data Loading**
   - [ ] Dashboard loads
   - [ ] Assets page shows data
   - [ ] Inspections page works
   - [ ] Map displays correctly

4. **Test PWA Features**
   - [ ] Install prompt appears (desktop)
   - [ ] "Add to Home Screen" works (mobile)
   - [ ] Offline mode activates
   - [ ] Service worker registers

5. **Test Mobile Responsiveness**
   - [ ] Mobile menu works
   - [ ] Forms are usable on mobile
   - [ ] Tables scroll horizontally
   - [ ] Buttons are tap-friendly

---

## 🔄 Step 7: Future Updates Workflow

### When you make changes in Figma Make:

**Simple 3-Step Process:**

1. **Download changed files** from Figma Make

2. **Update GitHub:**
   - **Web:** Navigate to file → Edit → Paste new code → Commit
   - **CLI:** Replace files → `git add .` → `git commit -m "Update: ..."` → `git push`

3. **Wait for auto-deploy:**
   - Vercel detects GitHub push
   - Builds automatically
   - Deploys in ~2 minutes
   - Check deployment status in Vercel dashboard

### Example Update:

```bash
# You added a new export feature in Figma Make

1. Download: InspectionsPage.tsx and reportGenerators.ts
2. Upload to GitHub with message:
   "feat: Add PDF export for inspection reports"
3. Vercel auto-deploys
4. Feature live in 2 minutes!
```

---

## 📊 Alternative: Deploy to Netlify

### If you prefer Netlify over Vercel:

1. **Go to:** https://netlify.com
2. **Sign up** with GitHub
3. **"Add new site"** → **"Import an existing project"**
4. **Connect to GitHub** and select `tams360-app`
5. **Build settings:**
   ```
   Base directory: (leave empty)
   Build command: npm run build
   Publish directory: dist
   ```
6. **Environment variables:** Same as Vercel above
7. **Deploy site**
8. **Result:** `https://tams360-app.netlify.app`

---

## 🎯 Recommended Setup Summary

**For Best Results:**
```
Development:  Figma Make (fast iteration)
       ↓
Version Control: GitHub (code backup, collaboration)
       ↓
Deployment: Vercel (auto-deploy, hosting)
       ↓
Backend: Supabase (database, auth, storage)
       ↓
Users: Production app (https://tams360-app.vercel.app)
```

---

## 🆘 Troubleshooting Common Issues

### Issue: "Build Failed" on Vercel

**Fix:**
1. Check Vercel build logs
2. Verify `package.json` has all dependencies
3. Check for TypeScript errors
4. Ensure environment variables are set

### Issue: "Supabase Connection Failed"

**Fix:**
1. Verify environment variables in Vercel
2. Check Supabase allowed URLs
3. Confirm Supabase project is not paused
4. Check API keys are correct

### Issue: "PWA Not Installing"

**Fix:**
1. Ensure HTTPS is enabled (Vercel does this automatically)
2. Check `/public/manifest.json` is accessible
3. Verify service worker registers
4. Check browser console for SW errors

### Issue: "Assets/Styles Not Loading"

**Fix:**
1. Check `vite.config.ts` base path
2. Ensure all imports use correct paths
3. Verify build output in `/dist` folder
4. Check browser network tab for 404 errors

---

## 📱 Post-Deployment: Share Your App

### Desktop Users:
```
1. Visit: https://tams360-app.vercel.app
2. Click install icon (⊕) in address bar
3. App opens in standalone window
```

### Mobile Users:
```
Android:
1. Open in Chrome
2. Menu → "Add to Home screen"
3. Icon appears on home screen

iOS:
1. Open in Safari
2. Share → "Add to Home Screen"
3. Icon appears on home screen
```

---

## ✅ Final Checklist

Before going live to users:

- [ ] GitHub repository created and populated
- [ ] Vercel deployment successful
- [ ] Environment variables configured
- [ ] Supabase URLs whitelisted
- [ ] Authentication tested
- [ ] Data loading verified
- [ ] PWA installation works
- [ ] Mobile responsiveness confirmed
- [ ] Offline mode functional
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Custom domain configured (optional)

---

## 🎊 You're Ready!

**Your TAMS360 app is now:**
- ✅ Backed up on GitHub
- ✅ Auto-deployed on every update
- ✅ Accessible worldwide via HTTPS
- ✅ Installable as a PWA
- ✅ Production-ready!

**Share your app:** `https://tams360-app.vercel.app`

**Need help?** Open an issue on GitHub or check Vercel docs: https://vercel.com/docs

---

**Last Updated:** January 8, 2026  
**Status:** ✅ Ready for deployment
