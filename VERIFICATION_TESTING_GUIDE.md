# TAMS360 System Verification & Testing Guide

**Version:** 1.0  
**Last Updated:** December 30, 2024  
**Status:** Post-Backend Fixes Verification

---

## 🎯 Purpose

This guide provides a systematic approach to verify that all TAMS360 features are working correctly after the recent backend schema fixes and database integration enhancements.

---

## ✅ Pre-Testing Checklist

Before starting verification:

- [ ] Database schema is deployed (`tams360` schema exists)
- [ ] All seed data has been loaded
- [ ] Backend server is running without errors
- [ ] Frontend application is accessible
- [ ] Browser console is open for error monitoring
- [ ] Network tab is ready for API monitoring

---

## 🔐 Phase 1: Authentication & User Management

### 1.1 User Registration
**Test Steps:**
1. Navigate to registration page
2. Fill in user details:
   - Name: Test User
   - Email: test@example.com
   - Password: Test123!
   - Organization: Test Org
3. Submit registration

**Expected Results:**
- [ ] First user is auto-approved as Admin
- [ ] Subsequent users are marked as "pending"
- [ ] Success message is displayed
- [ ] User is redirected appropriately

**API Endpoint:** `POST /auth/signup`

**Verification Queries:**
```sql
-- Check user was created
SELECT * FROM tams360.users WHERE email = 'test@example.com';

-- Verify role and status
SELECT id, name, email, role, status FROM tams360.users;
```

---

### 1.2 User Login
**Test Steps:**
1. Navigate to login page
2. Enter credentials
3. Click "Sign In"

**Expected Results:**
- [ ] Valid credentials → Dashboard
- [ ] Invalid credentials → Error message
- [ ] Pending user → Pending approval page
- [ ] Access token is stored
- [ ] User context is populated

**API Endpoint:** `POST /auth/signin`

**Debug Checks:**
- Console should show: "Signed in successfully"
- Access token should be visible in auth context
- No CORS errors in network tab

---

### 1.3 Admin User Approval
**Test Steps:**
1. Login as admin
2. Navigate to Admin Console
3. View pending users
4. Approve/deny a user

**Expected Results:**
- [ ] Pending users list populates
- [ ] Approve action changes status to "approved"
- [ ] Deny action changes status to "denied"
- [ ] Role can be updated

**API Endpoints:**
- `GET /admin/users/pending`
- `PUT /admin/users/:id/approve`
- `PUT /admin/users/:id/role`

---

## 📊 Phase 2: Dashboard & Analytics

### 2.1 Dashboard Statistics
**Test Steps:**
1. Navigate to Dashboard
2. Observe all stat cards loading

**Expected Results:**
- [ ] Total Assets count is correct
- [ ] Active Inspections count is displayed
- [ ] Maintenance Records count is shown
- [ ] Average CI is calculated
- [ ] All metrics load from database (not KV store)

**API Endpoint:** `GET /dashboard/stats`

**Verification:**
```sql
-- Manual count verification
SELECT COUNT(*) FROM tams360.assets;
SELECT COUNT(*) FROM tams360.inspections;
SELECT COUNT(*) FROM tams360.maintenance_records;
SELECT AVG(latest_ci) FROM tams360.assets WHERE latest_ci IS NOT NULL;
```

---

### 2.2 CI Distribution Chart
**Test Steps:**
1. View "Condition Distribution" chart on dashboard

**Expected Results:**
- [ ] Chart shows 4 categories: Excellent, Good, Fair, Poor
- [ ] Counts match database records
- [ ] Colors match brand guidelines
- [ ] Chart is interactive (hover shows values)

**API Endpoint:** `GET /dashboard/ci-distribution`

**Expected Response Format:**
```json
{
  "distribution": [
    { "category": "Excellent", "count": 15, "range": "81-100" },
    { "category": "Good", "count": 10, "range": "61-80" },
    { "category": "Fair", "count": 8, "range": "41-60" },
    { "category": "Poor", "count": 3, "range": "0-40" }
  ]
}
```

---

### 2.3 Urgency Summary
**Test Steps:**
1. View "Urgency Summary" section

**Expected Results:**
- [ ] Shows breakdown: Immediate, High, Medium, Low
- [ ] Counts are accurate
- [ ] Includes maintenance urgency levels
- [ ] Visual indicators (badges) are correct

**API Endpoint:** `GET /dashboard/urgency-summary`

**Database View:** `tams360.dashboard_urgency_summary`

---

### 2.4 Asset Type Summary
**Test Steps:**
1. View "Assets by Type" chart

**Expected Results:**
- [ ] All asset types are listed
- [ ] Counts match database
- [ ] Chart displays correctly (bar/pie chart)

**API Endpoint:** `GET /dashboard/asset-type-summary`

**Database View:** `tams360.dashboard_asset_type_summary`

---

## 🏗️ Phase 3: Asset Management

### 3.1 View Assets List
**Test Steps:**
1. Navigate to Assets page
2. View assets table

**Expected Results:**
- [ ] All assets load from database
- [ ] Pagination works (if implemented)
- [ ] Filtering by type works
- [ ] Search functionality works
- [ ] Asset details are complete (type, location, CI, status)

**API Endpoint:** `GET /assets`

**Verification:**
```sql
SELECT 
  a.asset_id,
  a.asset_name,
  at.type_name,
  a.latest_ci,
  a.urgency_level,
  a.status
FROM tams360.assets a
LEFT JOIN tams360.asset_types at ON a.asset_type_id = at.id
ORDER BY a.created_at DESC;
```

---

### 3.2 Create New Asset
**Test Steps:**
1. Click "Add Asset"
2. Fill in asset details:
   - Asset Name: Test Guardrail
   - Asset Type: Guardrail
   - Location: Highway 101, MP 45
   - GPS: 34.0522, -118.2437
   - Installation Date: 2024-01-01
   - Owner: State DOT
3. Submit form

**Expected Results:**
- [ ] Asset is created in database
- [ ] Success notification appears
- [ ] Asset appears in assets list
- [ ] All fields are saved correctly

**API Endpoint:** `POST /assets`

**Verification:**
```sql
SELECT * FROM tams360.assets 
WHERE asset_name = 'Test Guardrail'
ORDER BY created_at DESC LIMIT 1;
```

---

### 3.3 View Asset Details
**Test Steps:**
1. Click on an asset from the list
2. View asset detail page

**Expected Results:**
- [ ] All asset metadata is displayed
- [ ] Recent inspections are listed
- [ ] Maintenance history is shown
- [ ] Location/GPS is visible
- [ ] Photos are displayed (if available)

**API Endpoints:**
- `GET /assets/:id`
- `GET /assets/:id/inspections`
- `GET /assets/:id/maintenance`

---

### 3.4 Update Asset
**Test Steps:**
1. Edit an asset
2. Change status or other fields
3. Save changes

**Expected Results:**
- [ ] Changes are saved to database
- [ ] Updated_at timestamp is updated
- [ ] Changes reflect immediately in UI

**API Endpoint:** `PUT /assets/:id`

---

### 3.5 Asset Inventory Log
**Test Steps:**
1. Navigate to Asset Inventory Log page
2. View comprehensive asset list

**Expected Results:**
- [ ] All assets with complete details
- [ ] CI values are displayed
- [ ] DERU dates are calculated
- [ ] Ownership information is shown
- [ ] Financial data is present

**API Endpoint:** `GET /assets/inventory-log`

**Database View:** `tams360.asset_inventory_complete`

---

## 🔍 Phase 4: Inspection System

### 4.1 View Inspections List
**Test Steps:**
1. Navigate to Inspections page
2. View all inspections

**Expected Results:**
- [ ] Inspections load from database
- [ ] Asset details are included (via join)
- [ ] Component scores are visible
- [ ] Overall CI is calculated
- [ ] Urgency levels are shown

**API Endpoint:** `GET /inspections`

**Verification:**
```sql
SELECT 
  i.inspection_id,
  i.inspection_date,
  a.asset_name,
  i.overall_ci,
  i.urgency_level,
  i.inspector_name
FROM tams360.inspections i
LEFT JOIN tams360.assets a ON i.asset_id = a.asset_id
ORDER BY i.inspection_date DESC;
```

---

### 4.2 Create Component-Based Inspection
**Test Steps:**
1. Click "New Inspection"
2. Select an asset
3. View component inspection form
4. Fill in component scores:
   - Component: Guardrail Panel
   - Degree (D): 2
   - Extent (E): 3
   - Relevancy (R): 2
   - Urgency: Auto-calculated
   - CI: Auto-calculated
5. Add remedial work and costs
6. Submit inspection

**Expected Results:**
- [ ] Components load based on asset type
- [ ] CI is calculated in real-time
- [ ] Urgency is determined by decision tree
- [ ] Overall CI is aggregated from components
- [ ] Inspection is saved with all component scores
- [ ] Asset's latest_ci is updated

**API Endpoint:** `POST /inspections`

**Real-Time Calculation Verification:**
- D=2, E=3, R=2 should give:
  - P = 0.5*(2/3) + 0.25*((3-1)/3) + 0.25*((2-1)/3) = 0.528
  - CI = 100*(1-0.528) = 47 (rounded)
  - Urgency = 2 (Medium priority)

**Database Check:**
```sql
-- Check inspection was created
SELECT * FROM tams360.inspections 
WHERE inspector_name = 'current_user'
ORDER BY created_at DESC LIMIT 1;

-- Check component scores were saved
SELECT * FROM tams360.inspection_component_scores
WHERE inspection_id = (SELECT inspection_id FROM tams360.inspections ORDER BY created_at DESC LIMIT 1);

-- Verify asset was updated
SELECT latest_ci, latest_inspection_date, urgency_level
FROM tams360.assets
WHERE asset_id = 'tested_asset_id';
```

---

### 4.3 CI Calculation Edge Cases
**Test Scenarios:**

#### Scenario A: No Defect
- D=0, E=any, R=any → CI should be 100

#### Scenario B: Record Only
- D=X → CI should be 100

#### Scenario C: Unable to Inspect
- D=U or E=U or R=U → CI should be null (blank)

#### Scenario D: Maximum Penalty
- D=3, E=4, R=4 → CI should be 0

#### Scenario E: Minimum Penalty
- D=1, E=1, R=1 → CI should be 50

**Verification:**
Create test inspections with these values and verify calculations match expected CI values.

---

### 4.4 Urgency Decision Tree
**Test Decision Tree:**

| D | E | R | Expected Urgency |
|---|---|---|-----------------|
| 0 | - | - | R (Record only) |
| X | - | - | R (Record only) |
| U | - | - | U (Unable) |
| 3 | 4 | 4 | 0 (Immediate) |
| 3 | 3 | 3 | 1 (High) |
| 2 | 2 | 2 | 2 (Medium) |
| 1 | 1 | 1 | 3 (Low) |

---

### 4.5 Inspection Statistics
**Test Steps:**
1. View inspection stats on dashboard

**Expected Results:**
- [ ] Total inspections count
- [ ] Inspections by type breakdown
- [ ] Recent inspections timeline
- [ ] CI trends over time

**API Endpoint:** `GET /inspections/stats`

---

## 🔧 Phase 5: Maintenance Management

### 5.1 View Maintenance Records
**Test Steps:**
1. Navigate to Maintenance page
2. View all maintenance records

**Expected Results:**
- [ ] Maintenance records load from database
- [ ] Asset details are included
- [ ] Status is displayed (Scheduled, In Progress, Completed)
- [ ] Cost information is shown
- [ ] Dates are formatted correctly

**API Endpoint:** `GET /maintenance`

**Verification:**
```sql
SELECT 
  m.maintenance_id,
  a.asset_name,
  m.work_description,
  m.status,
  m.scheduled_date,
  m.completion_date,
  m.estimated_cost,
  m.actual_cost
FROM tams360.maintenance_records m
LEFT JOIN tams360.assets a ON m.asset_id = a.asset_id
ORDER BY m.scheduled_date DESC;
```

---

### 5.2 Create Maintenance Record
**Test Steps:**
1. Click "New Maintenance"
2. Fill in details:
   - Asset: Select from dropdown
   - Work Description: Replace damaged panels
   - Scheduled Date: Future date
   - Estimated Cost: $5,000
   - Priority: High
   - Contractor: ABC Contractors
3. Submit

**Expected Results:**
- [ ] Record is created
- [ ] Status defaults to "Scheduled"
- [ ] Asset is linked correctly
- [ ] All fields are saved

**API Endpoint:** `POST /maintenance`

**Verification:**
```sql
SELECT * FROM tams360.maintenance_records 
WHERE work_description LIKE '%Replace damaged panels%'
ORDER BY created_at DESC LIMIT 1;
```

---

### 5.3 Update Maintenance Status
**Test Steps:**
1. Edit a maintenance record
2. Update status to "In Progress"
3. Later, update to "Completed"
4. Enter actual cost and completion date

**Expected Results:**
- [ ] Status transitions correctly
- [ ] Completion date is saved
- [ ] Actual cost is recorded
- [ ] Asset condition may be updated (if CI improved)

**API Endpoint:** `PUT /maintenance/:id`

---

### 5.4 Maintenance Statistics
**Test Steps:**
1. View maintenance stats on dashboard or maintenance page

**Expected Results:**
- [ ] Total maintenance count
- [ ] Breakdown by status
- [ ] Cost summary (estimated vs actual)
- [ ] Upcoming scheduled work

**API Endpoint:** `GET /maintenance/stats`

---

## 📍 Phase 6: GIS Mapping (Placeholder Verification)

### 6.1 Map View
**Test Steps:**
1. Navigate to GIS Map page
2. View placeholder map

**Expected Results:**
- [ ] Map component loads
- [ ] Placeholder message is displayed
- [ ] Asset markers would display (when map integrated)
- [ ] Asset list is available

**Note:** This is currently a placeholder ready for Leaflet/Mapbox integration.

---

## 👥 Phase 7: Admin Console

### 7.1 User Management
**Test Steps:**
1. Login as admin
2. Navigate to Admin Console
3. View all users

**Expected Results:**
- [ ] All users are listed
- [ ] Roles are displayed
- [ ] Status is shown
- [ ] Pending users are highlighted

**API Endpoint:** `GET /admin/users`

---

### 7.2 Approve Pending Users
**Test Steps:**
1. View pending users section
2. Click approve on a pending user

**Expected Results:**
- [ ] User status changes to "approved"
- [ ] User can now login
- [ ] Change is reflected in database

**API Endpoint:** `PUT /admin/users/:id/approve`

---

### 7.3 Change User Roles
**Test Steps:**
1. Select a user
2. Change role (e.g., field_user → supervisor)

**Expected Results:**
- [ ] Role is updated in database
- [ ] User's permissions change on next login

**API Endpoint:** `PUT /admin/users/:id/role`

---

## 💾 Phase 8: Data Management

### 8.1 Seed Data Page
**Test Steps:**
1. Navigate to Data Management → Seed Data
2. View seeding options

**Expected Results:**
- [ ] Seed data interface is accessible
- [ ] Options to seed different data types
- [ ] Warnings about overwriting data

**API Endpoints:**
- `POST /data/seed-asset-types`
- `POST /data/seed-lookups`
- `POST /data/seed-templates`

---

### 8.2 Template Library
**Test Steps:**
1. Navigate to Template Library
2. View component templates

**Expected Results:**
- [ ] Templates grouped by asset type
- [ ] All 9 asset types have templates
- [ ] Component details are visible

**API Endpoint:** `GET /data/templates`

**Database Check:**
```sql
SELECT 
  at.type_name,
  COUNT(act.id) as component_count
FROM tams360.asset_types at
LEFT JOIN tams360.asset_component_templates act ON at.id = act.asset_type_id
GROUP BY at.type_name
ORDER BY at.type_name;
```

---

## 🔍 Phase 9: Backend API Verification

### 9.1 Schema References
**Verification Steps:**
1. Check backend logs for query errors
2. Monitor network requests in browser dev tools

**All queries should use:**
```javascript
.schema("tams360").from("table_name")
```

**NOT:**
```javascript
.from("tams360.table_name") // ❌ INCORRECT
```

---

### 9.2 Foreign Key Joins
**Verification:**
Ensure all foreign key references use correct format:

**Correct:**
```javascript
.select(`
  *,
  asset:assets(asset_name, asset_type_id)
`)
```

**NOT:**
```javascript
.select(`
  *,
  asset:tams360.assets(...) // ❌ INCORRECT
`)
```

---

### 9.3 Duplicate Endpoint Check
**Removed Duplicates (Should NOT exist):**
- ❌ Duplicate `/dashboard/stats` at line ~1105
- ❌ Duplicate `/maintenance/stats` at line ~1027
- ❌ Duplicate `/maintenance` GET at line ~959
- ❌ Duplicate `/inspections` GET at line ~871

**Verification:**
Search backend code for these endpoints - should only appear once each.

---

## 📊 Phase 10: Database Views & Functions

### 10.1 Dashboard Views
**Test Queries:**

```sql
-- CI Distribution View
SELECT * FROM tams360.dashboard_ci_distribution;
-- OR
SELECT * FROM public.dashboard_ci_distribution;

-- Urgency Summary View
SELECT * FROM tams360.dashboard_urgency_summary;

-- Asset Type Summary View
SELECT * FROM tams360.dashboard_asset_type_summary;

-- Asset Inventory Complete View
SELECT * FROM tams360.asset_inventory_complete LIMIT 10;
```

**Expected Results:**
- [ ] All views return data (or empty if no data yet)
- [ ] No errors are thrown
- [ ] Joins are working correctly
- [ ] Calculations are accurate

---

### 10.2 CI Calculation Function
**Test Function:**

```sql
-- Test CI calculation for valid inputs
SELECT tams360.calculate_ci(2, 3, 2); -- Should return 47

-- Test edge cases
SELECT tams360.calculate_ci(0, 1, 1); -- Should return 100 (no defect)
SELECT tams360.calculate_ci(3, 4, 4); -- Should return 0 (maximum penalty)
SELECT tams360.calculate_ci(NULL, 2, 3); -- Should return NULL (invalid input)
```

---

### 10.3 DERU Calculation Function
**Test Function:**

```sql
-- Test DERU calculation (15 years from installation)
SELECT tams360.calculate_deru('2020-01-01'::date, 15); 
-- Should return 2035-01-01

-- Test with current date
SELECT tams360.calculate_deru(CURRENT_DATE, 20);
-- Should return date 20 years from now
```

---

### 10.4 Urgency Calculation Function
**Test Function:**

```sql
-- Test urgency decision tree
SELECT tams360.calculate_urgency(3, 4, 4); -- Should return '0' (Immediate)
SELECT tams360.calculate_urgency(3, 3, 3); -- Should return '1' (High)
SELECT tams360.calculate_urgency(2, 2, 2); -- Should return '2' (Medium)
SELECT tams360.calculate_urgency(1, 1, 1); -- Should return '3' (Low)
SELECT tams360.calculate_urgency(0, 1, 1); -- Should return 'R' (Record only)
```

---

## 🐛 Phase 11: Error Handling & Edge Cases

### 11.1 Empty State Handling
**Test Scenarios:**
1. View dashboard with no assets
2. View inspections with no records
3. View maintenance with no records

**Expected Results:**
- [ ] Graceful empty states
- [ ] Helpful messages (e.g., "No assets yet. Create your first asset.")
- [ ] No console errors

---

### 11.2 Invalid Data Handling
**Test Scenarios:**
1. Submit form with missing required fields
2. Enter invalid GPS coordinates
3. Select past date for future maintenance

**Expected Results:**
- [ ] Validation errors are displayed
- [ ] User-friendly error messages
- [ ] Form doesn't submit with errors

---

### 11.3 API Error Handling
**Test Scenarios:**
1. Disconnect from network
2. Send invalid access token
3. Request non-existent resource

**Expected Results:**
- [ ] Error messages are logged to console
- [ ] User sees appropriate error notification
- [ ] Application doesn't crash

---

## 📈 Phase 12: Performance Verification

### 12.1 Load Times
**Measure:**
- Dashboard initial load: < 2 seconds
- Assets list load: < 1 second
- Inspection form load: < 500ms

**Tools:** Browser DevTools Network tab

---

### 12.2 Database Query Performance
**Check slow queries:**

```sql
-- Enable query timing
\timing on

-- Test complex queries
SELECT * FROM tams360.asset_inventory_complete;
SELECT * FROM tams360.dashboard_ci_distribution;

-- Should complete in < 100ms for small datasets
```

---

### 12.3 API Response Times
**Monitor in Network tab:**
- All API calls should respond < 500ms
- Database queries should be optimized
- No N+1 query issues

---

## ✅ Final Verification Checklist

### Critical Features
- [ ] User registration works
- [ ] Login/logout works
- [ ] Dashboard displays data from database
- [ ] Assets CRUD operations work
- [ ] Component inspections calculate CI correctly
- [ ] Maintenance records can be created
- [ ] Admin can approve users
- [ ] No schema reference errors in logs
- [ ] No duplicate endpoint errors

### Data Integrity
- [ ] Assets have correct latest_ci values
- [ ] Foreign keys are maintained
- [ ] Timestamps are updated correctly
- [ ] Component scores are saved properly
- [ ] Urgency levels are calculated accurately

### User Experience
- [ ] Navigation is intuitive
- [ ] Forms validate properly
- [ ] Success/error messages display
- [ ] Loading states are shown
- [ ] Responsive on mobile devices

### Security
- [ ] Unauthorized access is blocked
- [ ] Pending users can't access system
- [ ] Admin-only features are protected
- [ ] Access tokens are required for protected routes

---

## 🚨 Common Issues & Solutions

### Issue: Dashboard shows zero counts
**Solution:**
- Check if seed data was loaded
- Verify schema references: `.schema("tams360").from("table")`
- Check browser console for errors
- Verify database connection

### Issue: Inspections don't save component scores
**Solution:**
- Check `/inspections` POST endpoint
- Verify component scores array is sent
- Check for database constraint violations
- Ensure asset_type_id matches templates

### Issue: CI not calculating
**Solution:**
- Verify D, E, R inputs are valid
- Check `calculateComponentCI` function logic
- Ensure function is called on input change
- Check for null/undefined values

### Issue: "Schema not found" errors
**Solution:**
- Run schema creation script
- Verify `tams360` schema exists
- Check Supabase database logs
- Ensure migrations are applied

---

## 📞 Support & Next Steps

### If All Tests Pass ✅
Congratulations! Your TAMS360 system is fully operational. Consider:
1. Importing real asset data
2. Setting up real GIS map integration
3. Configuring Supabase Storage for photos
4. Enabling offline PWA features
5. Training users on the system

### If Issues Persist ⚠️
1. Review BACKEND_FIXES_SUMMARY.md
2. Check database schema exists
3. Verify seed data was loaded
4. Review browser console errors
5. Check backend server logs
6. Consult DATABASE_SCHEMA.md for reference

---

**Document Version:** 1.0  
**Maintained By:** TAMS360 Development Team  
**Last Review:** December 30, 2024
