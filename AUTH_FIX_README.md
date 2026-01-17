# Authentication Fix - Session Expiration Handling

## Problem
The app was showing an "Invalid JWT" error and displaying no data. This occurred because the authentication token (JWT) had expired, but the app wasn't properly handling the expiration and logging users out automatically.

## Solution Implemented

### 1. Created Centralized API Utility (`/src/app/utils/api.ts`)
- Wraps all API calls with automatic error handling
- Detects JWT expiration errors (401 "Invalid JWT" or "Invalid session")
- Automatically logs out user when token expires
- Shows a toast notification: "Your session has expired. Please log in again."
- Redirects to login page after 1 second

### 2. Updated MobileMaintenancePage
- Refactored to use the new API utility
- Now automatically handles authentication errors
- Cleaner code with better error handling

## How to Test

1. **Clear your current session:**
   ```
   - Open browser DevTools (F12)
   - Go to Application > Local Storage
   - Delete the keys: `tams360_token` and `tams360_user`
   ```

2. **Login again:**
   - Navigate to `/login`
   - Enter your credentials
   - Login successfully

3. **Verify data loads:**
   - Navigate to `/mobile/maintenance` (or any other page)
   - Data should now load correctly

4. **Test automatic logout (optional):**
   - To simulate an expired token, you can manually corrupt the stored token:
     ```
     - Open DevTools > Application > Local Storage
     - Edit `tams360_token` value to something invalid like "invalid_token"
     - Try to access any protected page
     - You should see a toast "Your session has expired..." and be redirected to login
     ```

## Next Steps - Recommended Improvements

### Apply API Utility Throughout the App
Currently, only `MobileMaintenancePage` uses the new API utility. You should update all other components that make API calls to use it as well. This includes:

- `/src/app/components/maintenance/MaintenancePage.tsx`
- `/src/app/components/maintenance/MaintenanceDetailPage.tsx`
- `/src/app/components/assets/AssetsPage.tsx`
- `/src/app/components/inspections/InspectionsPage.tsx`
- `/src/app/components/dashboard/DashboardPage.tsx`
- And all other components making API calls

### Example Migration:
**Before:**
```typescript
const response = await fetch(`${API_URL}/maintenance/${id}`, {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

if (response.ok) {
  const data = await response.json();
  // handle data
} else {
  toast.error("Failed to fetch");
}
```

**After:**
```typescript
try {
  const data = await api.get(`/maintenance/${id}`);
  // handle data
  // Errors are automatically handled (toast + logout if needed)
} catch (error) {
  // Error already logged, just handle cleanup if needed
}
```

## Token Refresh Strategy (Future Enhancement)

Currently, when a token expires, the user is logged out. A better approach would be to implement automatic token refresh:

1. Before token expires, refresh it in the background
2. Only log out if refresh fails
3. This provides a seamless experience for active users

This would require:
- Backend endpoint for token refresh
- Frontend logic to detect near-expiration and refresh proactively
- Update the API utility to handle refresh

## Files Modified
- `/src/app/utils/api.ts` - NEW: Centralized API utility
- `/src/app/components/mobile/MobileMaintenancePage.tsx` - Updated to use API utility

## Files to Update Next
All components that make API calls should be migrated to use the new `api` utility from `/src/app/utils/api.ts`.
