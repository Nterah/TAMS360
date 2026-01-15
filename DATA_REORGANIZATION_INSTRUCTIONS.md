# Data Reorganization Instructions

## Overview
This document provides instructions for reorganizing all existing data in TAMS360 to properly link it to the correct organizations (JRA and HN Consulting).

## What This Does

The Data Reorganization Utility will:

1. **Create/Update JRA Organization**
   - Organization: Johannesburg Roads Agency (JRA)
   - Address: 75 Helen Joseph St, Johannesburg, 2000
   - Phone: 011 298 5000
   - Website: www.jra.org.za
   - Admin Email: admin@jra.org.za
   - Password: Admin123!

2. **Link All Existing Data to JRA**
   - All existing assets
   - All existing inspections
   - All existing maintenance records

3. **Create/Update HN Consulting Organization**
   - Organization: HN Consulting Engineers (Pty) Ltd
   - Admin Email: admin@tams360.co.za
   - Password: Admin123!

4. **Create Test Data for HN Consulting**
   - Clones the first 3 assets from JRA as test data
   - Prefixes them with "HN-" and marks as "[TEST DATA]"

## How to Access

### Option 1: Direct URL
Navigate to: `https://app.tams360.co.za/admin/data-reorganization`

### Option 2: From Admin Console
1. Log in as an admin user
2. Navigate to Admin Console (`/admin`)
3. Click the yellow "Data Reorganization" button in the top right

## Steps to Execute

1. **Login as Admin**
   - Use any current admin account to access the utility

2. **Navigate to Data Reorganization**
   - Go to `/admin/data-reorganization`
   - You'll see the reorganization utility page

3. **Review the Information**
   - Check the organization details displayed
   - Review the warning about what will happen

4. **Click "Start Data Reorganization"**
   - Confirm the action when prompted
   - Wait for the process to complete (usually 10-30 seconds)

5. **Review Results**
   - The page will show success message with details:
     - JRA tenant ID
     - Number of assets, inspections, maintenance records linked
     - HN Consulting tenant ID
     - Test data creation status

6. **Log Out and Test**
   - Log out from your current session
   - Test logging in as JRA admin:
     - Email: admin@jra.org.za
     - Password: Admin123!
   - Verify all existing data is visible
   
7. **Test HN Consulting**
   - Log out from JRA
   - Log in as HN admin:
     - Email: admin@tams360.co.za
     - Password: Admin123!
   - Verify test data is visible

## Important Notes

- ✅ **Safe Operation**: This utility does not delete any data
- ✅ **Idempotent**: Can be run multiple times if needed
- ✅ **Creates Missing Users**: Will create admin@jra.org.za and admin@tams360.co.za if they don't exist
- ⚠️ **Requires Admin Access**: Only admin users can run this utility
- 💾 **Preserves Data**: All existing data is preserved and linked to JRA

## Troubleshooting

### Error: "Unauthorized"
- Make sure you're logged in as an admin user
- Try logging out and logging back in

### Error: "Failed to create user"
- The user might already exist - this is okay
- The utility will try to find and use the existing user

### Data Not Showing After Migration
- Make sure to log out completely
- Clear browser cache/cookies if needed
- Log in with the correct credentials

## Post-Migration Verification

After running the utility, verify:

1. ✅ Can log in as admin@jra.org.za
2. ✅ All existing assets are visible under JRA
3. ✅ All existing inspections are visible under JRA
4. ✅ Can log in as admin@tams360.co.za
5. ✅ Test data is visible under HN Consulting
6. ✅ Data is properly isolated between organizations

## Support

If you encounter any issues:
1. Check the browser console for error messages
2. Check the server logs in Supabase dashboard
3. Review the error details displayed on the page
4. The utility can be safely re-run if needed
