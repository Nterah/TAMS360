# Quick Visual Test Checklist - TAMS360

Use this checklist to quickly verify all features from Options A-D.

---

## ✅ Option A: Executive Summary Tiles (8 KPIs)

**Location:** Dashboard Page (Top Section)

### Row 1 - Primary KPIs:
- [ ] **Tile 1: Total Assets** - Shows count, "Active and managed" message
- [ ] **Tile 2: Inspections This Month** - Shows count, total inspections message
- [ ] **Tile 3: Maintenance Tasks** - Shows combined scheduled + in progress
- [ ] **Tile 4: Immediate Urgency** - Shows critical count in RED

### Row 2 - Executive KPIs:
- [ ] **Tile 5: Assets Inspected** - Shows percentage (e.g., "75%"), count below (e.g., "150 of 200 assets")
- [ ] **Tile 6: Latest Avg CI** - Shows number 0-100, "Overall condition index" message
- [ ] **Tile 7: Total Remedial Cost** - Shows "R X.XM" in YELLOW/WARNING color
- [ ] **Tile 8: Maintenance Backlog** - Shows total, "X overdue, Y scheduled" message

### Row 3 - NEW Monitoring KPIs:
- [ ] **Tile 9: Overdue Inspections** ⭐ NEW
  - Shows count with calendar icon
  - Yellow color if overdue exist
  - Green checkmark if all up to date
  
- [ ] **Tile 10: Data Quality Alerts** ⭐ NEW
  - Shows count with file warning icon
  - Yellow color if issues exist
  - Message: "Missing GPS/photos/data"
  - Green checkmark if data quality good

---

## ✅ Option B: Enhanced Charts & Drilldowns

**Location:** Dashboard Page (Middle/Bottom Sections)

### Chart 1: CI Distribution
- [ ] Pie chart visible
- [ ] Shows segments with percentages
- [ ] Color coded: Green (Excellent), Blue (Good), Yellow (Fair), Red (Poor/Critical)
- [ ] Labels show percentage

### Chart 2: Urgency Distribution
- [ ] Bar chart visible
- [ ] Shows 4 bars: Immediate (Red), High (Yellow), Medium (Blue), Low (Green)
- [ ] Hover shows count

### Chart 3: CI Trend Over Time
- [ ] Line chart visible
- [ ] Shows last 12 months if data available
- [ ] Y-axis: 0-100
- [ ] Blue line with dots

### Chart 4: Breakdown by Region
- [ ] Horizontal bar chart
- [ ] Shows top 10 regions
- [ ] Different colors for each bar
- [ ] Hover shows "X assets"

### Chart 5: Breakdown by Asset Type
- [ ] Horizontal bar chart
- [ ] Shows asset types
- [ ] Different colors for each bar
- [ ] Hover shows "X assets"

### Chart 6: Top 10 Worst Assets ⭐ WITH DRILLDOWN
- [ ] Table/list format visible
- [ ] Shows numbered ranking (#1-#10)
- [ ] Shows asset reference, type, location
- [ ] Shows CI score badge in RED
- [ ] **CLICK TEST**: Click any row → Should navigate to asset detail page
- [ ] Shows replacement value if available

### Chart 7: Top 10 Highest Remedial Cost ⭐ WITH DRILLDOWN
- [ ] Table/list format visible
- [ ] Shows numbered ranking (#1-#10)
- [ ] Shows asset reference, type, location
- [ ] Shows cost badge in YELLOW with "R Xk" format
- [ ] **CLICK TEST**: Click any row → Should navigate to asset detail page
- [ ] Shows CI if available

### Chart 8: Critical Alerts Panel
- [ ] Shows alert cards if issues exist
- [ ] Red/orange border styling
- [ ] Shows count badges
- [ ] Shows asset references if applicable
- [ ] OR shows green "No critical alerts" if system healthy

### Chart 9: Recent Activity
- [ ] Shows last 5 activities
- [ ] Color dots: Green (success), Red (critical), Yellow (warning)
- [ ] Shows time ago (e.g., "5 minutes ago")
- [ ] Shows activity type and details

### Chart 10: Asset Condition Overview
- [ ] Horizontal bar chart
- [ ] Shows CI distribution bands
- [ ] Color coded segments

---

## ❌ Option C: Reports Section

**Location:** Should be new page/section (NOT IMPLEMENTED)

### Missing Features:
- [ ] ❌ No Reports menu item in navigation
- [ ] ❌ No ReportsPage component
- [ ] ❌ No Asset Register Report
- [ ] ❌ No Inspection Summary Report
- [ ] ❌ No Asset Condition Report
- [ ] ❌ No Urgency/Risk Report
- [ ] ❌ No Remedial Works Report
- [ ] ❌ No Maintenance Backlog Report
- [ ] ❌ No Compliance/Audit Reports

**Status:** REQUIRES IMPLEMENTATION

---

## ✅ Option D: Inspector Guide Reference

**Location:** Admin Console > Component Templates > "Inspector Guide Reference" Tab

### Navigation Test:
1. [ ] Click "Admin" in main navigation
2. [ ] Click "Component Templates" in admin console
3. [ ] See two tabs: "Component Templates" and "Inspector Guide Reference"
4. [ ] Click "Inspector Guide Reference" tab

### Content Verification:
- [ ] **Header Section**: "Inspector Field Guide" title visible
- [ ] **Purpose Statement**: Explains D/E/R scoring system
- [ ] **Understanding D/E/R Scoring Section** visible
  
#### D (Defect) Section:
- [ ] Level 1: No defects
- [ ] Level 2: Minor defects
- [ ] Level 3: Moderate defects
- [ ] Level 4: Severe defects

#### E (Extent) Section:
- [ ] Level 1: <10% affected
- [ ] Level 2: 10-30% affected
- [ ] Level 3: 30-60% affected
- [ ] Level 4: >60% affected

#### R (Relevancy) Section:
- [ ] Level 1: Cosmetic
- [ ] Level 2: Functional impact
- [ ] Level 3: Safety concern
- [ ] Level 4: Critical safety

### Additional Sections:
- [ ] **CI Calculation Formula** visible: P = 0.5*(D/3) + 0.25*((E-1)/3) + 0.25*((R-1)/3), CI = 100*(1-P)
- [ ] **Urgency Calculation** section with decision tree
- [ ] **Inspection Workflow** with numbered steps
- [ ] **Photo Documentation** requirements
- [ ] **Safety Considerations** section
- [ ] **Best Practices** section
  - [ ] Be consistent
  - [ ] Document thoroughly
  - [ ] Capture evidence
  - [ ] Safety first

---

## 🎯 Critical Functionality Tests

### Test 1: Dashboard Loads Properly
- [ ] Navigate to Dashboard
- [ ] All KPI tiles load without errors
- [ ] All charts render properly
- [ ] No console errors
- [ ] Page is responsive on mobile

### Test 2: Currency Formatting
- [ ] All costs show "R" symbol
- [ ] Large amounts shown in thousands (k) or millions (M)
- [ ] Example: R 2.5M or R 150k

### Test 3: Drilldown Navigation
- [ ] Click on worst asset → Navigate to `/assets/[asset_id]`
- [ ] Click on high cost asset → Navigate to `/assets/[asset_id]`
- [ ] Browser URL changes correctly
- [ ] Asset detail page loads
- [ ] No "highest-cost" or invalid UUID errors

### Test 4: Color Coding
- [ ] Red/Destructive: Immediate urgency, critical issues
- [ ] Yellow/Warning: Overdue items, data quality issues, high costs
- [ ] Green/Success: Completed items, no issues
- [ ] Blue: Primary color for charts

### Test 5: Empty States
- [ ] If no data: Shows appropriate "No data" message
- [ ] If no critical alerts: Shows green checkmark with "No critical alerts"
- [ ] If no recent activity: Shows "No recent activity" message

---

## 📊 Data Accuracy Tests

### Verify KPI Calculations:
- [ ] **Assets Inspected %**: (inspected count / total assets) × 100
- [ ] **Maintenance Backlog**: overdue + scheduled counts
- [ ] **Overdue Inspections**: Inspections with date < today
- [ ] **Data Quality**: Sum of missing GPS + missing type + missing template

### Verify Chart Data:
- [ ] CI Distribution totals = 100%
- [ ] Urgency Distribution totals = total assets
- [ ] CI Trend shows correct monthly averages
- [ ] Top 10 lists show correct sorting (worst CI ascending, highest cost descending)

---

## ⚠️ Known Limitations

1. **Component Hotspots**: Not implemented (requires component-level aggregation)
2. **Reports Section**: Completely missing (requires new page + backend endpoints)
3. **CI Band Labels**: Uses descriptive names instead of explicit ranges
4. **Overdue Calculation**: Simple date comparison (doesn't account for frequency_days from inspection types)
5. **Data Quality**: Frontend calculation (no backend endpoint)

---

## ✅ Final Checklist

- [ ] All Option A tiles (8/8) visible and working
- [ ] All Option B charts (7/7) visible and working
- [ ] Drilldowns navigate to asset details
- [ ] Currency shows in ZAR format
- [ ] Option D Inspector Guide complete and accessible
- [ ] Option C Reports section NOT implemented (expected)
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Loading states work
- [ ] Empty states show proper messages

---

**Testing Date:** _____________

**Tester Name:** _____________

**Overall Result:** PASS ⭐ / FAIL ❌ / PARTIAL ⚠️

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

