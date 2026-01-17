# 🔍 Debug: Why Map Shows No Assets

## What We Know ✅

1. ✅ Database has 202 assets with GPS coordinates
2. ✅ Schema is perfect (`tenant_id`, `gps_lat`, `gps_lng`)
3. ✅ Backend queries the correct view (`tams360_assets_v`)
4. ✅ Frontend maps `gps_lat` → `latitude`, `gps_lng` → `longitude`

## 🎯 The Issue

Since everything is correct, there are only 3 possible issues:

### Issue #1: API Call Failing
- Frontend is making API call
- Backend is returning error
- Frontend shows no data

### Issue #2: Authentication Problem
- Access token is expired/invalid
- Backend rejects request
- No assets returned

### Issue #3: Frontend Console Errors
- JavaScript errors preventing map render
- Assets loaded but not displayed

## 🚀 How to Debug (RIGHT NOW)

### Step 1: Open Browser Console
1. Open your TAMS360 web app
2. Press **F12** (or Right Click → Inspect → Console)
3. Go to the **GIS Map** page
4. Look for these messages:

**✅ GOOD - You should see:**
```
GET /assets request - user:xxx, tenant:102e622e-8efb-46e5-863b-9bc4b3856ea8, role:admin, page:1, pageSize:100
Assets with coordinates: 202 of 202
Sample asset with coordinates: {asset_id: "...", gps_lat: -29.6, gps_lng: 30.4, latitude: -29.6, longitude: 30.4}
SimpleMap: Updating markers. Received 202 assets
```

**❌ BAD - If you see:**
```
ERROR: Unauthorized
ERROR: Failed to fetch assets
WARNING: No assets have GPS coordinates!
SimpleMap: Updating markers. Received 0 assets
```

### Step 2: Check Network Tab
1. In DevTools, click **Network** tab
2. Reload the GIS Map page
3. Look for request to `/make-server-c894a9ff/assets`
4. Click on it
5. Check:
   - **Status:** Should be `200 OK`
   - **Response:** Should have `data` array with 202 items
   - **Preview:** Click to see the JSON

**✅ GOOD Response:**
```json
{
  "data": [
    {
      "asset_id": "...",
      "gps_lat": -29.6,
      "gps_lng": 30.4,
      "asset_type_name": "Road Sign",
      ...
    }
  ],
  "total": 202
}
```

**❌ BAD Response:**
```json
{
  "error": "User not associated with an organization"
}
```

### Step 3: Send Me the Results

Copy and paste:
1. Any **console errors** (red text)
2. The **API response** from Network tab
3. Any **warnings** (yellow text)

## 🎯 Most Likely Causes

### Cause A: Access Token Expired AGAIN
- JWT token expired
- Backend rejecting requests
- **Fix:** Refresh the page, login again

### Cause B: Frontend Filter Issue
- Assets loaded but filtered out
- Check if any filters are active (Region, Asset Type, etc.)
- **Fix:** Clear all filters

### Cause C: Map Bounds Issue
- Assets loaded but map zoomed to wrong location
- Map showing empty ocean or different country
- **Fix:** Click "Fit to Assets" button or zoom out

### Cause D: Console JavaScript Error
- Error preventing map initialization
- Map component crashed
- **Fix:** Check console for red errors

## 🔧 Quick Tests to Run NOW

### Test 1: Check Console Log Count
Open console and run:
```javascript
console.log("Total assets loaded:", window.__TAMS360_DEBUG_ASSETS?.length);
```

### Test 2: Check if SimpleMap Received Data
Look for this log message:
```
SimpleMap: Updating markers. Received X assets
```

If X = 0, the problem is in GISMapPage
If X = 202, the problem is in SimpleMap rendering

### Test 3: Check Map Center
The map should center on:
```
Latitude: -29.59 (South Africa)
Longitude: 30.39 (South Africa)
```

If the map is showing a different location (like Atlantic Ocean at 0,0 or Europe), that's the issue!

## 📋 Send Me This Info

1. **Console screenshot** (F12 → Console)
2. **Network request for /assets** (F12 → Network → Click request → Response tab)
3. **Any red errors** in console
4. **Map center coordinates** (shown in console when map loads)

Then I'll know EXACTLY what's wrong! 🚀
