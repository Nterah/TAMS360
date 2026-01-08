# TAMS360 Quick Reference Card

## 🚀 Getting Started (3 Steps)

### 1. Run SQL Script
```bash
Open Supabase Dashboard → SQL Editor
Paste: CREATE_TAMS360_PUBLIC_VIEWS.sql
Click: RUN
```

### 2. Verify Views
```sql
SELECT * FROM public.tams360_inspections_v LIMIT 1;
SELECT * FROM public.tams360_assets_v LIMIT 1;
```

### 3. Test App
```bash
Login → Dashboard → Check counts display
```

---

## 📋 View Names (Copy/Paste Ready)

```
public.tams360_inspections_v
public.tams360_assets_v
public.tams360_urgency_summary_v
public.tams360_ci_distribution_v
public.tams360_asset_type_summary_v
```

---

## 🔑 Key Column Names

### Inspections
```typescript
inspection_id           // UUID primary key
asset_id                // UUID foreign key
asset_ref               // "SGN-001"
asset_type_name         // "Signage"
inspection_date         // timestamp
inspector_name          // varchar
conditional_index       // 0-100 (CI Final)
deru_value              // numeric
calculated_urgency      // "1", "2", "3", "4"
ci_band                 // "Excellent", "Good", "Fair", "Poor"
total_remedial_cost     // numeric
finding_summary         // text
```

### Assets
```typescript
asset_id                // UUID primary key
asset_ref               // "SGN-001"
asset_type_name         // "Signage"
asset_type_abbreviation // "SGN"
gps_lat                 // numeric
gps_lng                 // numeric
latest_ci               // most recent CI value
latest_deru             // most recent DERU
latest_ci_band          // "Excellent" etc
replacement_value       // numeric
owned_by                // varchar
```

---

## 🎯 API Endpoints

### Dashboard
```
GET /dashboard/stats
GET /dashboard/ci-distribution
GET /dashboard/urgency-summary
GET /dashboard/asset-type-summary
```

### Inspections
```
GET /inspections
GET /inspections/stats
GET /assets/:id/inspections
```

### Assets
```
GET /assets
GET /assets/:id
```

**All require:** `Authorization: Bearer {accessToken}`

---

## 🔍 Quick Debug Queries

### Check view exists
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'tams360_inspections_v';
```

### Count data
```sql
SELECT 
  (SELECT COUNT(*) FROM tams360_inspections_v) as inspections,
  (SELECT COUNT(*) FROM tams360_assets_v) as assets;
```

### Test CI distribution
```sql
SELECT ci_band, asset_count 
FROM tams360_ci_distribution_v;
```

### Test urgency summary
```sql
SELECT urgency_label, inspection_count 
FROM tams360_urgency_summary_v;
```

### Check your tenant
```sql
SELECT tenant_id 
FROM tams360.user_profiles 
WHERE id = auth.uid();
```

---

## ❌ Common Errors & Fixes

| Error | Fix |
|-------|-----|
| "relation does not exist" | Run CREATE_TAMS360_PUBLIC_VIEWS.sql |
| "PGRST106" | Backend querying wrong schema |
| No data showing | Check: `SELECT COUNT(*) FROM tams360.inspections` |
| "Unauthorized" | User not logged in or token expired |
| Blank dashboard | Verify RLS policies, check user has tenant_id |

---

## 🎨 UI Field Mapping

### Dashboard KPIs
```typescript
stats.totalAssets         → Total Assets card
stats.totalInspections    → Inspections card
stats.criticalIssues      → Critical Issues card
stats.avgCI               → Average CI value
stats.avgDERU             → Average DERU value
stats.totalRemedialCost   → Sum of all costs
```

### Inspection Card
```typescript
inspection.asset_ref              → Title
inspection.conditional_index      → CI badge
inspection.calculated_urgency     → Urgency badge
inspection.inspector_name         → Inspector info
inspection.inspection_date        → Date
inspection.deru_value             → DERU display
inspection.finding_summary        → Description
inspection.total_remedial_cost    → Cost display
```

---

## 🔐 Authentication Flow

```
1. User logs in
2. Gets access_token
3. Frontend: Authorization: Bearer {token}
4. Backend: validates token
5. Database: applies RLS filter
6. User sees only their tenant's data
```

---

## 📊 Dashboard Charts

### CI Distribution (Bar Chart)
```javascript
// Data from: tams360_ci_distribution_v
{
  name: "Excellent",  // ci_band
  value: 45           // asset_count
}
```

### Asset Types (Pie Chart)
```javascript
// Data from: tams360_asset_type_summary_v
{
  name: "Signage",    // asset_type_name
  value: 120          // asset_count
}
```

---

## 🧪 Testing Checklist

- [ ] Views created in database
- [ ] Can query views in SQL Editor
- [ ] Dashboard shows live counts
- [ ] Charts render with data
- [ ] Inspections list displays
- [ ] CI/DERU values show
- [ ] Urgency badges correct colors
- [ ] No console errors
- [ ] Data is tenant-filtered

---

## 📞 Support Files

- **Full Guide:** `/VIEW_INTEGRATION_GUIDE.md`
- **Setup Steps:** `/SETUP_CHECKLIST.md`
- **Summary:** `/LIVE_DATA_SUMMARY.md`
- **Architecture:** `/ARCHITECTURE_DIAGRAM.md`
- **SQL Script:** `/CREATE_TAMS360_PUBLIC_VIEWS.sql`

---

## ⚡ Quick Commands

### Check if views exist
```sql
\dv tams360_*
```

### Grant permissions
```sql
GRANT SELECT ON public.tams360_inspections_v TO authenticated;
GRANT SELECT ON public.tams360_assets_v TO authenticated;
```

### Test RLS
```sql
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-id-here';
SELECT * FROM tams360_inspections_v;
```

---

## 🎯 Success Indicators

✅ Dashboard loads without errors  
✅ Numbers are not all zeros  
✅ Charts show colored bars/segments  
✅ Inspections list has records  
✅ CI badges are color-coded  
✅ No "PGRST" errors in console  

---

## 💡 Pro Tips

1. **Always use view names** - Never query `tams360.*` directly
2. **Check auth token** - Most errors are authentication issues
3. **Verify RLS** - Data should be tenant-filtered automatically
4. **Use exact column names** - Frontend expects specific names
5. **Test in SQL Editor first** - Debug queries before testing UI

---

**Quick Start:** Run SQL → Verify → Test App ✅

**Status:** Ready for deployment  
**Version:** 1.0  
**Date:** Dec 31, 2025
