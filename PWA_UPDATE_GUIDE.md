# 🔄 TAMS360 PWA Update Guide

## 📱 How Progressive Web App (PWA) Updates Work

Your TAMS360 app is a **Progressive Web App (PWA)** installed on desktop and mobile devices. When you deploy updates to Vercel, users need to refresh their app to get the latest version.

---

## 🚀 Deploying Updates to Vercel

### Method 1: Git Push (Recommended)

```bash
# In your project directory:
git add .
git commit -m "Fixed map asset visibility bug + added photo import"
git push origin main  # or 'master' depending on your branch
```

**Vercel auto-deploys** from your Git repository (GitHub/GitLab/Bitbucket).

### Method 2: Vercel CLI

```bash
# Install Vercel CLI (one time):
npm install -g vercel

# Deploy:
vercel --prod
```

### Verification

1. Check Vercel dashboard: https://vercel.com/dashboard
2. Look for "Deployment Status: Ready" ✅
3. Visit https://app.tams360.co.za in a browser (not the PWA)
4. Test the fix (GIS Map should show 202 assets)

---

## 📱 Updating PWA on User Devices

### Desktop (Windows/Mac/Linux)

#### Auto-Update (Recommended):
1. **Close the TAMS360 app completely**
   - Click the X button
   - Or press Alt+F4 (Windows) / Cmd+Q (Mac)
2. **Wait 5-10 seconds**
3. **Reopen the app** from desktop icon or Start Menu
4. The service worker will check for updates and reload automatically

#### Force Refresh (If Auto-Update Doesn't Work):
1. **Open the TAMS360 PWA**
2. Press **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (Mac)
3. This clears cache and forces reload

#### Nuclear Option (Last Resort):
1. **Uninstall the PWA:**
   - Windows: Settings → Apps → TAMS360 → Uninstall
   - Mac: Drag app from Applications to Trash
   - Linux: Remove from app menu
2. **Reinstall:**
   - Visit https://app.tams360.co.za in browser
   - Click install icon in address bar
   - Click "Install"

---

### Mobile (Android)

#### Auto-Update (Recommended):
1. **Close the TAMS360 app**
   - Swipe away from recent apps
2. **Wait 10 seconds**
3. **Reopen the app** from home screen
4. Service worker auto-updates

#### Clear Cache (If Auto-Update Doesn't Work):
1. **Settings → Apps → TAMS360**
2. **Storage → Clear Cache** (NOT "Clear Data")
3. **Reopen the app**

#### Reinstall (Last Resort):
1. **Long-press** the TAMS360 icon
2. **App info → Uninstall**
3. **Visit** https://app.tams360.co.za in Chrome
4. **Menu → Add to Home Screen**

---

### Mobile (iOS/iPhone/iPad)

#### Auto-Update:
1. **Close the TAMS360 app** (swipe up)
2. **Wait 10 seconds**
3. **Reopen the app**

#### Force Refresh (If Needed):
**Unfortunately, iOS doesn't allow clearing cache for PWAs** 😔

**Only Option: Reinstall**
1. **Long-press** TAMS360 icon → **Remove from Home Screen**
2. **Open Safari** (must be Safari, not Chrome)
3. **Visit** https://app.tams360.co.za
4. **Share button → Add to Home Screen**

---

## 🔍 How to Verify Update Success

### Check Console for New Version

1. **Open the PWA**
2. **Press F12** (desktop) or use browser DevTools
3. **Go to Console tab**
4. **Look for these messages:**
   ```
   [GISMapPage] Filtered assets: 202 of 202 total  ✅ Updated!
   [GISMapPage] Layer visibility state: {Signage: true}  ✅ Updated!
   ```

5. **Old version shows:**
   ```
   SimpleMap: Updating markers. Received 0 assets  ❌ Old version
   ```

### Check Map Page

1. **Go to GIS Map** page
2. **Count the markers** on the map
3. **Should show 202 markers** in South Africa ✅
4. **Old version shows 0 markers** ❌

### Check Import Photos Feature

1. **Go to Data Management → Import tab**
2. **Should see green "Import Photos" card** ✅
3. **Old version doesn't have this** ❌

---

## ⚡ Service Worker Update Strategy

TAMS360 uses a **"Network First, Cache Fallback"** strategy:

1. **User opens app** → Service worker checks network
2. **Network available?** → Fetch latest version from Vercel
3. **Network down?** → Load cached version (old)
4. **New version detected?** → Download in background
5. **Next app restart** → Use new version

**This means:**
- ✅ First user after deployment gets new version immediately
- ✅ Other users get update on next restart
- ✅ Works offline with cached version
- ⚠️ May take 1-2 app restarts to fully update

---

## 🎯 Best Practices for Smooth Updates

### For Admins/Developers:

1. **Deploy during low-usage hours** (e.g., 2 AM)
2. **Test in browser first** before telling users to update
3. **Send update notification** to users:
   ```
   "TAMS360 Update Available! 
    Please close and reopen the app to get the latest version.
    New features: Fixed map display, added photo import!"
   ```
4. **Have users verify** the update worked (check console)

### For Users:

1. **Close app completely** (don't just minimize)
2. **Wait 10 seconds** before reopening
3. **Check for changes** (new features, bug fixes)
4. **Clear cache if problems** (see instructions above)
5. **Reinstall as last resort** (rarely needed)

---

## 🐛 Troubleshooting Update Issues

### Problem: "Still seeing old version after restart"

**Solutions:**
1. Close app, wait 30 seconds, reopen
2. Force refresh (Ctrl+Shift+R)
3. Clear browser/app cache
4. Check internet connection
5. Reinstall PWA

### Problem: "App won't load after update"

**Solutions:**
1. Clear cache (Settings → Apps → TAMS360 → Clear Cache)
2. Check internet connection
3. Reinstall PWA
4. Check Vercel deployment status (might be failing)

### Problem: "Update works in browser but not PWA"

**Cause:** Service worker cached old version

**Solutions:**
1. Unregister service worker:
   - F12 → Application → Service Workers → Unregister
2. Clear site data:
   - F12 → Application → Storage → Clear site data
3. Reload page
4. Reinstall PWA

---

## 📊 Update Rollout Timeline

**Example: You deploy at 10:00 AM**

| Time | What Happens |
|------|-------------|
| 10:00 AM | Code deployed to Vercel ✅ |
| 10:01 AM | New users get new version immediately ✅ |
| 10:05 AM | Active users still on old version (cached) ⚠️ |
| 10:30 AM | User closes app → Service worker downloads update 🔄 |
| 10:31 AM | User reopens app → NEW VERSION LOADS ✅ |
| 11:00 AM | Most users updated (90%) ✅ |
| 12:00 PM | All active users updated (100%) ✅ |

**Key Takeaway:** Updates propagate within 1-2 hours for active users.

---

## 🎓 Technical Details (For Developers)

### Service Worker Configuration

File: `/public/sw.js` or auto-generated by Vite PWA plugin

**Cache Strategy:**
```javascript
// Network First (for API calls)
registerRoute(
  /\/api\//,
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 5 * 60 })
    ]
  })
);

// Cache First (for assets)
registerRoute(
  /\.(js|css|png|jpg|jpeg|svg)$/,
  new CacheFirst({
    cacheName: 'static-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 })
    ]
  })
);
```

### Force Update on Next Load

Add this to your `index.html` or `App.tsx`:

```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(registration => {
    registration.update(); // Check for updates immediately
  });
}
```

### Skip Waiting (Aggressive Update)

```javascript
// In service worker:
self.addEventListener('install', event => {
  self.skipWaiting(); // Activate immediately (not recommended)
});
```

**Warning:** This can interrupt active users! Use with caution.

---

## 📞 Support

**Need help with updates?** Check:
- Vercel deployment logs: https://vercel.com/dashboard
- Browser console (F12)
- Service worker status (F12 → Application → Service Workers)

**Common Issues:**
- ❌ "Deployment failed" → Check build logs in Vercel
- ❌ "404 Not Found" → DNS issue or wrong URL
- ❌ "Old version persists" → Clear cache + reinstall

---

## ✅ Quick Reference Card

| Device | Update Method | Time |
|--------|--------------|------|
| Windows Desktop | Close → Wait 10s → Reopen | 30s |
| Mac Desktop | Close → Wait 10s → Reopen | 30s |
| Android | Close → Wait 10s → Reopen | 30s |
| iPhone/iPad | Close → Wait 10s → Reopen | 30s |
| **Force Update** | Ctrl+Shift+R (Cmd+Shift+R on Mac) | Instant |
| **Nuclear Option** | Uninstall → Reinstall | 2 min |

---

## 🎉 Summary

- ✅ Deploy to Vercel (git push or vercel --prod)
- ✅ Users close and reopen app to update
- ✅ Takes 1-2 app restarts to fully update
- ✅ Force refresh if needed (Ctrl+Shift+R)
- ✅ Reinstall as last resort (rarely needed)

**Your users should have the map fix within 1-2 hours of deployment!** 🚀
