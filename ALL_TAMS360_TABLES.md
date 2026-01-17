# TAMS360 Complete Database Schema

## Are These The Only Tables Used In My App?

**NO!** TAMS360 uses many more tables. Here's the complete list:

## ✅ Core Tables (Already Confirmed to Exist)

1. **`assets`** - Main asset records (signage, guardrails, etc.)
2. **`asset_types`** - Types of assets (Road Sign, Traffic Signal, etc.)
3. **`inspections`** - DERU inspection records
4. **`maintenance_records`** - Maintenance/repair history

## 📋 Additional Tables Used by TAMS360

### User & Tenant Management
5. **`users`** or **`auth.users`** - User authentication (Supabase Auth)
6. **`user_profiles`** - User profile data (base table for tams360_user_profiles_v)
7. **`tenants`** or **`organizations`** - Organization/tenant records
8. **`invitations`** - User invitation codes

### Asset Components & Templates
9. **`asset_component_templates`** - Templates for asset inspections
10. **`asset_component_template_items`** - Individual component definitions
11. **`inspection_component_scores`** - DERU scores for each component

### Reference Data
12. **`statuses`** - Asset status lookup (Active, Retired, etc.)
13. **`regions`** - Geographic regions
14. **`wards`** - Administrative wards
15. **`roads`** - Road/route information
16. **`asset_conditions`** - Condition ratings

### Inventory & Tracking
17. **`asset_inventory_log`** - Asset change history/audit trail

### Dashboard & Analytics (Views)
18. **`dashboard_ci_distribution`** - Condition Index distribution
19. **`dashboard_urgency_summary`** - Urgency level summary
20. **`dashboard_asset_type_summary`** - Asset type statistics

### KV Store (Backend)
21. **`kv_store_c894a9ff`** - Key-value storage for app settings

## 🔍 How to Check Which Tables You Actually Have

Run this query:

```sql
SELECT 
    table_name,
    table_type,
    CASE 
        WHEN table_name IN ('assets', 'inspections', 'maintenance_records', 'asset_types') 
        THEN '🔴 CRITICAL'
        WHEN table_name LIKE 'tams360%' OR table_name IN ('users', 'tenants', 'organizations')
        THEN '🟠 IMPORTANT'
        ELSE '🟢 Optional/Reference'
    END as priority
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND (
    table_name LIKE '%asset%' OR
    table_name LIKE '%inspection%' OR
    table_name LIKE '%maintenance%' OR
    table_name LIKE '%user%' OR
    table_name LIKE '%tenant%' OR
    table_name LIKE '%organization%' OR
    table_name LIKE '%region%' OR
    table_name LIKE '%ward%' OR
    table_name LIKE '%road%' OR
    table_name LIKE '%status%' OR
    table_name LIKE '%kv_%' OR
    table_name LIKE 'dashboard_%'
  )
ORDER BY priority, table_name;
```

## 🎯 Minimum Required Tables for Map to Work

For the **map specifically** to display assets, you need:

### Must Have:
1. ✅ `assets` (with GPS coordinates)
2. ✅ `asset_types` (to show asset type names)
3. ✅ User profile table (with tenant_id)
4. ✅ Tenant/organization table

### Should Have:
5. ⚠️ `statuses` (for asset status)
6. ⚠️ `inspections` (for latest condition/urgency)
7. ⚠️ `regions`, `wards`, `roads` (for location filtering)

### Nice to Have:
8. ⚪ `maintenance_records` (for maintenance history)
9. ⚪ `asset_component_templates` (for detailed inspections)
10. ⚪ Dashboard views (for analytics)

## 📊 Key Relationships

```
tenants/organizations
    ↓ (has many)
users/user_profiles
    ↓ (create)
assets
    ↓ (belong to)
asset_types
    ↓ (located in)
regions → wards → roads
    ↓ (have)
inspections
    ↓ (contain)
inspection_component_scores
    ↓ (trigger)
maintenance_records
```

## 🔍 Quick Check - Do You Have All Critical Tables?

```sql
-- Check for critical tables
SELECT 
    table_name,
    '✅' as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'assets',
    'asset_types', 
    'inspections',
    'maintenance_records',
    'statuses',
    'regions',
    'wards',
    'roads'
  )
ORDER BY table_name;
```

## 🎯 For Your Current Map Issue

The map specifically needs these views to work:

1. ✅ **`tams360_user_profiles_v`** - EXISTS (verified)
   - Must have: `id`, `tenant_id`, `email`, `role`

2. ✅ **`tams360_assets_v`** - EXISTS (verified)  
   - Must have: `asset_id`, `tenant_id`, `gps_lat`, `gps_lng`

3. ✅ **`tams360_tenants_v`** - EXISTS (verified)
   - Must have: `tenant_id`, `name`

Since all three views exist, the issue is **column names within the views**.

## Next Step

**Run `/CHECK_VIEW_COLUMNS.sql`** to see the exact column names in your views and identify the mismatch!
