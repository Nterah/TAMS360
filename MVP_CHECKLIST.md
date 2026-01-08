# TAMS360 Mobile MVP Checklist

## Current Date: January 8, 2026

---

## 🎯 MVP Scope: Mobile-First Field Capture System

**Target Users:** Field workers capturing road assets on mobile devices  
**Core Use Cases:**
1. Capture new assets with GPS auto-location
2. Perform inspections on existing assets
3. View nearby assets on map
4. Work offline and sync when connected
5. Install as PWA for native app experience

---

## ✅ COMPLETED

### PWA (Progressive Web App) Setup
- [x] ✅ **manifest.json** - Already exists with proper config
- [x] ✅ **Service Worker** - Created `/public/sw.js` with offline caching
- [x] ✅ **SW Registration** - Added to `index.html`
- [x] ✅ **Install Prompt** - `PWAInstallPrompt.tsx` component exists
- [x] ✅ **PWA Prompt Integration** - Already included in `App.tsx`
- [x] ✅ **Meta Tags** - All PWA meta tags in `index.html`

### Backend Infrastructure
- [x] ✅ **Authentication** - Login, register, session validation
- [x] ✅ **Asset CRUD API** - Full asset management endpoints
- [x] ✅ **Inspection API** - Inspection creation and retrieval
- [x] ✅ **Map/GIS API** - Asset location endpoints with filtering
- [x] ✅ **Error Handling** - Retry logic and comprehensive error responses
- [x] ✅ **CORS Configuration** - Properly configured

### Core Features
- [x] ✅ **Asset Capture Form** - `EnhancedAssetForm.tsx` with GPS auto-detect
- [x] ✅ **Auto-numbering** - Smart asset reference generation
- [x] ✅ **GPS Location** - Auto-detect current location
- [x] ✅ **Inspection Creation** - Component-based inspections
- [x] ✅ **GIS Map** - Leaflet map with filtering and export
- [x] ✅ **Dashboard** - Analytics and KPIs
- [x] ✅ **Offline Context** - Offline detection and status

### Data Management
- [x] ✅ **Database Schema** - Complete schema with views
- [x] ✅ **Public Views** - Performance-optimized views
- [x] ✅ **Sample Data** - Seed data for testing (1718 assets)

---

## 🚧 IN PROGRESS / NEEDS COMPLETION

### PWA Icons (CRITICAL)
- [ ] ⚠️ **icon-192x192.png** - Need to generate
- [ ] ⚠️ **icon-512x512.png** - Need to generate
- [ ] ⚠️ **apple-touch-icon.png** - Need to generate
- [ ] ⚠️ **favicon.ico** - Need to generate

**Action Required:** 
- Use existing `/public/favicon.svg` to generate PNG icons
- Can use online tools or imagemagick
- Temporary: Use placeholder colored squares with "T360" text

### Mobile Optimization (HIGH PRIORITY)
- [ ] 🔧 **Mobile Dashboard** - Simplify for field users (remove heavy charts)
- [ ] 🔧 **Mobile Asset List** - Card-based layout instead of table
- [ ] 🔧 **Mobile Inspection List** - Touch-friendly cards
- [ ] 🔧 **Mobile Map** - Test touch controls, zoom, markers
- [ ] 🔧 **Form Optimization** - Large touch targets, mobile keyboard types
- [ ] 🔧 **Photo Capture** - Add camera integration for asset photos
- [ ] 🔧 **Responsive Tables** - Make all data tables mobile-friendly

### Role-Based Access (IMPORTANT)
- [ ] 🔧 **Route Protection** - Hide admin routes from field users
- [ ] 🔧 **Mobile Navigation** - Simplified nav for field_user role
- [ ] 🔧 **Feature Toggles** - Show/hide features based on role
- [ ] 🔧 **Mobile Capture Hub** - Created but needs routing integration

### Offline Functionality (CRITICAL)
- [ ] ⚠️ **Offline Asset Creation** - Queue assets for sync
- [ ] ⚠️ **Offline Inspection Creation** - Queue inspections for sync
- [ ] ⚠️ **Background Sync** - Auto-sync when connection restored
- [ ] ⚠️ **Conflict Resolution** - Handle sync conflicts
- [ ] ⚠️ **Sync Status UI** - Show pending/synced items
- [ ] ⚠️ **Offline Map Tiles** - Cache map tiles for offline use

### Testing & Validation
- [ ] 🔧 **Mobile Browser Testing** - Test on actual mobile devices
- [ ] 🔧 **PWA Installation** - Verify install works on iOS/Android
- [ ] 🔧 **Offline Mode** - Test full offline workflow
- [ ] 🔧 **GPS Accuracy** - Validate location capture
- [ ] 🔧 **Form Validation** - Test all required fields
- [ ] 🔧 **Error Scenarios** - Test network failures, timeout handling

---

## 📋 MISSING FEATURES FOR FULL MVP

### Must Have
1. **Photo Upload**
   - Camera integration for mobile
   - Photo preview before submit
   - Image compression for mobile data
   - Store photos in Supabase Storage

2. **Quick Capture Flow**
   - Simplified asset form for mobile
   - Photo-first workflow
   - Minimal required fields
   - One-tap location capture

3. **Sync Management**
   - Visual sync queue
   - Manual sync trigger
   - Sync success/failure feedback
   - Show what's pending upload

4. **Mobile Navigation**
   - Bottom tab bar for mobile
   - Quick action FAB (Floating Action Button)
   - Swipe gestures
   - Back button handling

5. **Location Services**
   - Location permission prompt
   - GPS accuracy indicator
   - Compass/heading capture
   - Address reverse geocoding (nice-to-have)

### Nice to Have (Post-MVP)
- QR code scanning for asset lookup
- Voice notes/dictation
- Batch operations
- Photo gallery view
- Signature capture for inspections
- Push notifications
- Dark mode toggle
- Multi-language support

---

## 🛠️ IMMEDIATE NEXT STEPS (Priority Order)

### Step 1: Generate PWA Icons (15 minutes)
```bash
# Create icons from existing favicon.svg
# Use online tool: https://www.pwabuilder.com/imageGenerator
# Or create simple colored squares with "TAMS360" text
```

### Step 2: Test PWA Installation (30 minutes)
1. Deploy current version
2. Test on mobile device (iOS Safari, Chrome Android)
3. Verify install prompt appears
4. Confirm app installs to home screen
5. Test offline mode

### Step 3: Implement Mobile Capture Hub (1 hour)
1. Add route to App.tsx: `/capture`
2. Make it default landing for field_user role
3. Connect to existing asset/inspection forms
4. Add quick action buttons

### Step 4: Simplify Mobile Forms (2 hours)
1. Create MobileAssetForm.tsx (streamlined version)
2. Photo capture integration
3. Reduce required fields to minimum
4. Large touch-friendly inputs

### Step 5: Offline Queue Management (3 hours)
1. Enhance OfflineContext with queue management
2. Store offline assets/inspections in IndexedDB
3. Auto-sync when online
4. Show sync status in UI

### Step 6: Mobile Testing (2 hours)
1. Test on real iOS device
2. Test on real Android device
3. Test offline workflow end-to-end
4. Fix responsive layout issues

---

## 📱 MOBILE-SPECIFIC REQUIREMENTS

### Performance
- [ ] Page load < 3 seconds on 3G
- [ ] Form submission < 2 seconds
- [ ] Map loads with progressive enhancement
- [ ] Images lazy-loaded
- [ ] Bundle size optimized

### UX
- [ ] Touch targets minimum 44x44px
- [ ] No horizontal scrolling
- [ ] Forms use native mobile keyboards
- [ ] Clear loading states
- [ ] Toast notifications for feedback
- [ ] Pull-to-refresh on lists

### PWA
- [ ] Works offline
- [ ] Installable on home screen
- [ ] Splash screen shows
- [ ] No browser chrome in standalone
- [ ] Status bar themed

---

## 🎨 MISSING ASSETS

### Icons
- /public/icon-192x192.png ⚠️
- /public/icon-512x512.png ⚠️
- /public/apple-touch-icon.png ⚠️
- /public/favicon.ico ⚠️

### Screenshots (for PWA manifest)
- Mobile home screen
- Asset capture screen
- Map view
- Dashboard view

---

## 🔧 TECHNICAL DEBT

### Code Quality
- [ ] TypeScript strict mode
- [ ] Remove unused imports
- [ ] Consistent error handling
- [ ] Add loading skeletons
- [ ] Improve accessibility (ARIA labels)

### Performance
- [ ] Code splitting by route
- [ ] Lazy load heavy components
- [ ] Optimize bundle size
- [ ] Enable gzip compression
- [ ] Add service worker caching strategy

### Security
- [ ] Input sanitization
- [ ] XSS prevention
- [ ] CSRF tokens
- [ ] Rate limiting on API
- [ ] Content Security Policy

---

## 📊 METRICS TO TRACK (Post-MVP)

- PWA installation rate
- Offline usage percentage
- Average capture time per asset
- Sync success rate
- User retention rate
- Daily active field users
- Assets captured per user per day

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Deploy
- [ ] Build passes without errors
- [ ] No console errors in production
- [ ] Environment variables set
- [ ] Database migrations run
- [ ] Seed data loaded

### Post-Deploy
- [ ] PWA manifest accessible
- [ ] Service worker registers
- [ ] Install prompt appears
- [ ] Offline mode works
- [ ] GPS permissions work
- [ ] Forms submit successfully
- [ ] Map loads correctly

---

## 📝 KNOWN ISSUES

1. **Export dropdown z-index** - ✅ FIXED (z-[10000] applied)
2. **DNS/Network errors** - ⚠️ Supabase free tier may pause (retry logic added)
3. **Assets without GPS** - ~100 assets missing coordinates
4. **Mobile responsiveness** - Some pages not fully mobile-optimized

---

## 🎯 MVP DEFINITION OF DONE

A field user can:
1. ✅ Install TAMS360 as PWA on mobile device
2. ✅ Login with credentials
3. ⚠️ Capture new asset with GPS location and photo (photo pending)
4. ✅ Create inspection for existing asset
5. ✅ View nearby assets on map
6. ⚠️ Work completely offline (queue pending)
7. ⚠️ Auto-sync when connection restored (pending)
8. ✅ See basic dashboard stats

**Status: 75% Complete - Need icons, offline queue, photo capture**

---

## 📞 SUPPORT NEEDED

### From User/Client
- [ ] Actual mobile devices for testing (iOS + Android)
- [ ] Field user feedback on forms
- [ ] Approval to generate icons from branding
- [ ] Decision on required vs optional fields

### From Development
- [ ] Icon generation (5-10 min task)
- [ ] Mobile form optimization (2-3 hours)
- [ ] Offline queue implementation (3-4 hours)
- [ ] Photo upload integration (2-3 hours)

---

## 🎉 READY FOR BETA TESTING

After completing:
1. PWA icons generation
2. Offline queue management
3. Photo capture integration
4. Mobile responsiveness fixes

**Estimated time to beta: 8-10 hours of focused work**

---

## 📚 DOCUMENTATION NEEDED

- [ ] User guide for field workers
- [ ] PWA installation instructions (iOS/Android)
- [ ] Offline mode explanation
- [ ] Troubleshooting guide
- [ ] API documentation
- [ ] Database schema docs

---

## 🔐 SECURITY REVIEW

- [ ] Authentication tokens stored securely
- [ ] API endpoints require auth
- [ ] No sensitive data in localStorage
- [ ] HTTPS enforced
- [ ] Input validation on all forms
- [ ] SQL injection prevention
- [ ] XSS protection

---

**Last Updated:** January 8, 2026  
**Next Review:** After PWA icons + offline implementation  
**Owner:** Development Team  
**Stakeholders:** Field Users, Admin Users, Management
