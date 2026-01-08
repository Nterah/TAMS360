# TAMS360 Quick Start Guide

**Welcome to TAMS360!** This guide will help you get started quickly with the Traffic Asset Management System.

---

## 🚀 Getting Started in 5 Minutes

### Step 1: Create Your First Account
1. Open TAMS360 in your browser
2. Click **"Register"**
3. Fill in your details:
   - **Name**: Your full name
   - **Email**: Your work email
   - **Password**: At least 6 characters
   - **Organization**: Your company/agency name (optional)
4. Click **"Register"**

**Important:** The first person to register is automatically approved as an **Admin**! All subsequent users require admin approval.

### Step 2: Login
1. Click **"Go to Login"** or navigate to the login page
2. Enter your email and password
3. Click **"Sign In"**

**First Admin Credentials (if you're the first user):**
- You can login immediately with the credentials you just created
- You now have full admin access to the system

### Step 3: Explore the Dashboard
After logging in, you'll see the **Dashboard** with:
- **Total Assets**: Count of all assets in the system
- **Active Inspections**: Recent inspection activity
- **Maintenance Records**: Work orders and maintenance history
- **Charts & Graphs**: Visual analytics of your asset portfolio

---

## 📋 Essential Features

### 1. Assets Management
**Navigate to:** Assets → View Assets

**Create a New Asset:**
1. Click **"Add Asset"** button
2. Fill in required fields:
   - **Asset Name**: Descriptive name (e.g., "Guardrail MP 45.3")
   - **Asset Type**: Select from dropdown (Signage, Guardrail, etc.)
   - **Location**: Physical location description
   - **GPS Coordinates**: Latitude, Longitude
   - **Installation Date**: When was it installed
   - **Owner**: Who owns/maintains this asset
3. Click **"Create Asset"**

**View Asset Details:**
- Click on any asset in the list to see full details
- View inspection history
- See maintenance records
- Check condition index (CI) and urgency level

---

### 2. Component-Based Inspections
**Navigate to:** Inspections → New Inspection

**How to Conduct an Inspection:**

1. **Select Asset**: Choose the asset to inspect from the dropdown

2. **Component-by-Component Assessment**:
   For each component of the asset, rate:
   
   **Degree (D)** - Severity of defect:
   - `0` = No defect
   - `1` = Slight defect
   - `2` = Moderate defect
   - `3` = Severe defect
   - `U` = Unable to inspect
   - `X` = Record only (no defect)

   **Extent (E)** - How widespread:
   - `1` = 0-25% of component affected
   - `2` = 26-50% affected
   - `3` = 51-75% affected
   - `4` = 76-100% affected
   - `U` = Unable to assess

   **Relevancy (R)** - Importance to function:
   - `1` = Low impact on function
   - `2` = Moderate impact
   - `3` = Significant impact
   - `4` = Critical to function
   - `U` = Unable to assess

3. **Automatic Calculations**:
   - **CI (Condition Index)**: Calculated automatically (0-100)
     - 81-100 = Excellent
     - 61-80 = Good
     - 41-60 = Fair
     - 0-40 = Poor
   
   - **Urgency**: Determined by decision tree:
     - `0` = Immediate (repair within 1-7 days)
     - `1` = High (repair within 8-30 days)
     - `2` = Medium (repair within 31-60 days)
     - `3` = Low (repair within 61-90 days)
     - `R` = Record only
     - `U` = Unable to determine

4. **Remedial Work**:
   - Describe needed repairs
   - Enter quantity, unit, rate
   - Cost is auto-calculated

5. **Submit**: Click "Submit Inspection"
   - The asset's condition index is automatically updated
   - Urgency level is set based on worst component
   - Inspection is saved to history

---

### 3. Maintenance Management
**Navigate to:** Maintenance → View Maintenance

**Create a Work Order:**
1. Click **"New Maintenance"**
2. Fill in details:
   - **Asset**: Select asset needing work
   - **Work Description**: What needs to be done
   - **Scheduled Date**: When is work planned
   - **Estimated Cost**: Budget estimate
   - **Priority**: Immediate, High, Medium, Low
   - **Contractor**: Who will do the work
3. Click **"Create Maintenance Record"**

**Track Progress:**
- Update status: Scheduled → In Progress → Completed
- Record actual completion date
- Enter actual cost incurred
- Add notes and observations

---

### 4. Asset Inventory Log
**Navigate to:** Assets → Inventory Log

**What you'll see:**
- Complete asset inventory with all details
- Condition Index (CI) for each asset
- DERU Date (Date Expected Requiring Upgrade)
- Current value and depreciation
- Ownership and responsibility
- Maintenance history summary

**Use this for:**
- Annual reporting
- Budget planning
- Asset lifecycle management
- Compliance audits

---

## 👥 Admin Functions

**Navigate to:** Admin Console (Admin users only)

### User Approval Workflow
1. View **"Pending Approvals"** tab
2. Review new user registrations:
   - Check name, email, organization
   - Assign appropriate role:
     - **Viewer**: Read-only access
     - **Field User**: Create/edit assets and inspections
     - **Supervisor**: All field user rights + reports
     - **Admin**: Full system access + user management
3. Click **"Approve"** or **"Deny"**

### System Health Check
1. Click **"System Health"** button in Admin Console
2. View comprehensive system status:
   - ✅ **Pass**: Component is working correctly
   - ⚠️ **Warning**: Non-critical issue detected
   - ❌ **Fail**: Critical problem requires attention
3. Review troubleshooting guide for failed checks
4. Click **"Run Health Check"** to retest

---

## 📊 Understanding Key Metrics

### Condition Index (CI)
**Range:** 0-100 (higher is better)

| CI Range | Category | Meaning |
|----------|----------|---------|
| 81-100 | Excellent | Asset in very good condition, minimal maintenance needed |
| 61-80 | Good | Asset functioning well, routine maintenance sufficient |
| 41-60 | Fair | Asset showing wear, increased maintenance required |
| 0-40 | Poor | Asset deteriorating, urgent intervention needed |

**Formula:**
```
Penalty (P) = 0.5 × (D/3) + 0.25 × ((E-1)/3) + 0.25 × ((R-1)/3)
CI = ROUND(100 × (1 - P), 0)
```

Where D, E, R are the Degree, Extent, and Relevancy scores.

### Urgency Levels

| Code | Priority | Response Time | Meaning |
|------|----------|---------------|---------|
| 0 | Immediate | 1-7 days | Safety hazard, immediate repair required |
| 1 | High | 8-30 days | Significant defect, repair soon |
| 2 | Medium | 31-60 days | Moderate defect, schedule repair |
| 3 | Low | 61-90 days | Minor defect, plan for future |
| R | Record | N/A | No defect, documented only |
| U | Unable | N/A | Could not assess, follow-up needed |

### DERU Date
**Date Expected Requiring Upgrade**

Calculated as: Installation Date + Expected Useful Life

Example:
- Installed: January 1, 2020
- Useful Life: 15 years
- DERU Date: January 1, 2035

This helps with:
- Long-term budget planning
- Replacement scheduling
- Lifecycle cost analysis

---

## 🗺️ GIS Mapping (Coming Soon)

The GIS Map page is currently a placeholder ready for integration with:
- **Leaflet** (open-source)
- **Mapbox** (commercial)
- **ArcGIS** (enterprise GIS)

**Features when integrated:**
- Interactive map with asset markers
- GPS-based asset location
- Filtering by asset type, condition
- Route planning for inspections
- Offline map caching

---

## 💾 Data Management

### Seed Data
**Navigate to:** Data Management → Seed Data

**Purpose:** Populate the system with reference data
- Asset types (9 types: Signage, Guardrail, etc.)
- Lookup tables (conditions, urgency levels)
- Component templates (for inspections)

**When to use:**
- First-time system setup
- After database reset
- To restore default configurations

**Warning:** Seeding may overwrite existing data. Use with caution.

### Template Library
**Navigate to:** Data Management → Template Library

**Purpose:** View component definitions for each asset type

**What you'll find:**
- All components that should be inspected for each asset type
- Default quantities and units
- Component descriptions
- Inspection criteria

**Example for Guardrail:**
- Guardrail Panel
- Posts
- Rail Elements
- Terminals
- Hardware
- Foundation
- Anchors

---

## 🎯 Common Workflows

### Workflow 1: New Asset Lifecycle
1. **Create Asset** (Assets → Add Asset)
2. **Conduct Initial Inspection** (Inspections → New Inspection)
3. **Review CI and Urgency** (Dashboard or Asset Details)
4. **Create Maintenance if Needed** (Maintenance → New Maintenance)
5. **Track Work Progress** (Update maintenance status)
6. **Re-inspect After Maintenance** (New inspection to verify)

### Workflow 2: Routine Inspection Schedule
1. **View Asset Inventory** (Assets → Inventory Log)
2. **Identify assets due for inspection** (by last inspection date)
3. **Plan inspection route** (GIS Map - when integrated)
4. **Conduct inspections** (Mobile device in field)
5. **Review results on Dashboard** (Back at office)
6. **Generate maintenance work orders** (for assets with CI < 60)

### Workflow 3: Budget Planning
1. **Export Asset Inventory** (Inventory Log)
2. **Review DERU dates** (assets nearing end of life)
3. **Check maintenance costs** (Maintenance → View all)
4. **Analyze CI trends** (Dashboard → CI Distribution)
5. **Prioritize by urgency** (Dashboard → Urgency Summary)
6. **Allocate budget** (immediate vs. planned work)

---

## 🔒 Security & Access Control

### Role Permissions

| Feature | Viewer | Field User | Supervisor | Admin |
|---------|--------|------------|------------|-------|
| View Dashboard | ✅ | ✅ | ✅ | ✅ |
| View Assets | ✅ | ✅ | ✅ | ✅ |
| Create/Edit Assets | ❌ | ✅ | ✅ | ✅ |
| Conduct Inspections | ❌ | ✅ | ✅ | ✅ |
| Create Maintenance | ❌ | ✅ | ✅ | ✅ |
| View Reports | ✅ | ✅ | ✅ | ✅ |
| Approve Users | ❌ | ❌ | ❌ | ✅ |
| System Settings | ❌ | ❌ | ❌ | ✅ |

### Best Practices
- **Change default passwords** immediately after first login
- **Assign roles based on job function** (principle of least privilege)
- **Review pending users promptly** to enable team productivity
- **Monitor audit logs** for suspicious activity
- **Regular backups** (handled automatically by Supabase)

---

## 📱 Mobile Usage

TAMS360 is fully responsive and works on:
- **Smartphones** (iOS, Android)
- **Tablets** (iPad, Android tablets)
- **Desktop** (Windows, Mac, Linux)

### Mobile Tips:
1. **Bookmark the app** on your home screen for quick access
2. **Use in landscape mode** for inspections (easier data entry)
3. **Take photos** (when photo upload is enabled)
4. **GPS auto-fill** (when location services enabled)
5. **Offline mode** (coming soon via PWA)

---

## ❓ Troubleshooting

### Problem: Can't login after registration
**Solution:** 
- If you're not the first user, your account requires admin approval
- Contact your admin or wait for approval
- Check the "Pending Approval" page for status

### Problem: Dashboard shows zero counts
**Solution:**
- No data has been created yet - create your first asset
- Database may not be seeded - go to Data Management → Seed Data
- Check System Health (Admin Console → System Health)

### Problem: Inspections not calculating CI
**Solution:**
- Ensure D, E, R values are entered (not blank)
- Avoid using "U" if you want a CI value
- D=0 or D=X will always give CI=100
- Check browser console for errors

### Problem: Can't see certain pages
**Solution:**
- Check your user role and permissions
- Some pages are admin-only (Admin Console, System Health)
- Logout and login again to refresh permissions

---

## 📚 Additional Resources

### Documentation Files
- **README.md** - Project overview and introduction
- **SETUP_INSTRUCTIONS.md** - Detailed setup guide
- **DATABASE_SCHEMA.md** - Database structure reference
- **VERIFICATION_TESTING_GUIDE.md** - Complete testing procedures
- **TAMS360_DOCUMENTATION.md** - Comprehensive system documentation

### Support
- **System Health Check**: Admin Console → System Health
- **Audit Logs**: Track all system activity
- **Browser Console**: Press F12 for developer tools
- **Network Tab**: Monitor API requests and responses

---

## 🎉 Tips for Success

### For Admins
✅ Run System Health Check after initial setup  
✅ Seed reference data before creating assets  
✅ Approve users promptly to avoid delays  
✅ Review audit logs weekly for oversight  
✅ Train users on CI calculation methodology  

### For Field Users
✅ Bookmark TAMS360 on your mobile device  
✅ Practice inspections on test assets first  
✅ Understand D-E-R scoring before field work  
✅ Take photos when possible (future feature)  
✅ Complete inspections same day for accuracy  

### For Supervisors
✅ Review dashboard weekly for trends  
✅ Prioritize work by urgency levels  
✅ Monitor CI trends over time  
✅ Plan inspections based on DERU dates  
✅ Track actual vs estimated maintenance costs  

---

## 🚀 Next Steps

Now that you're familiar with the basics:

1. **Create your first asset** → Assets → Add Asset
2. **Conduct a test inspection** → Inspections → New Inspection
3. **Review the dashboard** → See your data come to life
4. **Invite your team** → Have them register and approve them
5. **Explore advanced features** → Asset Inventory Log, System Health

**Welcome to better asset management with TAMS360!** 🎯

---

**Version:** 1.0  
**Last Updated:** December 30, 2024  
**For:** TAMS360 Users (All Roles)
