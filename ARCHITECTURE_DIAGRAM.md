# TAMS360 Data Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          TAMS360 Web Application                         │
│                         (React + Tailwind CSS)                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP Requests
                                    │ Authorization: Bearer {token}
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Supabase Edge Function                           │
│                      (Hono Web Server - Deno)                           │
│                   /make-server-c894a9ff/* routes                        │
├─────────────────────────────────────────────────────────────────────────┤
│  Authentication Layer:                                                   │
│  • Validates Bearer token with Supabase Auth                            │
│  • Gets user_id from token                                              │
│  • Passes authenticated context to database                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ SQL Queries
                                    │ auth.uid() → user_id
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Public Schema Views                             │
│                       (RLS Applied Automatically)                        │
├─────────────────────────────────────────────────────────────────────────┤
│  • public.tams360_inspections_v                                         │
│  • public.tams360_assets_v                                              │
│  • public.tams360_urgency_summary_v                                     │
│  • public.tams360_ci_distribution_v                                     │
│  • public.tams360_asset_type_summary_v                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  RLS Filter Applied:                                                     │
│  WHERE tenant_id = (                                                     │
│    SELECT tenant_id FROM tams360.user_profiles                          │
│    WHERE id = auth.uid()                                                │
│  )                                                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Reads from
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         TAMS360 Schema Tables                            │
│                      (PostgreSQL - Private Schema)                       │
├─────────────────────────────────────────────────────────────────────────┤
│  Base Tables:                                                            │
│  • tams360.assets                                                        │
│  • tams360.asset_types                                                   │
│  • tams360.inspections                                                   │
│  • tams360.inspection_component_scores                                   │
│  • tams360.maintenance_records                                           │
│  • tams360.asset_component_templates                                     │
│  • tams360.user_profiles                                                 │
│                                                                           │
│  Stored Data:                                                            │
│  • Asset inventory                                                       │
│  • Inspection records with CI/DERU calculations                         │
│  • Component-level scores                                               │
│  • Maintenance history                                                   │
│  • Ownership & valuation                                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Dashboard Stats

```
┌────────────┐
│ Dashboard  │  User opens dashboard
│   Page     │
└─────┬──────┘
      │
      │ 1. fetchDashboardStats()
      │    Authorization: Bearer {accessToken}
      ▼
┌────────────────────────────────────┐
│ GET /dashboard/stats               │
│ • Validates auth token             │
│ • Gets user's tenant_id            │
└─────┬──────────────────────────────┘
      │
      │ 2. Query public views
      │    (RLS auto-filters by tenant)
      ▼
┌────────────────────────────────────┐
│ SELECT COUNT(*) FROM               │
│   tams360_assets_v                 │
│                                    │
│ SELECT COUNT(*) FROM               │
│   tams360_inspections_v            │
│                                    │
│ SELECT * FROM                      │
│   tams360_urgency_summary_v        │
│   WHERE calculated_urgency = '4'   │
└─────┬──────────────────────────────┘
      │
      │ 3. Views join and filter data
      │    from base tables
      ▼
┌────────────────────────────────────┐
│ tams360.assets                     │
│ tams360.inspections                │
│ tams360.asset_types                │
│ (WHERE tenant_id = user's tenant)  │
└─────┬──────────────────────────────┘
      │
      │ 4. Return JSON response
      ▼
┌────────────────────────────────────┐
│ {                                  │
│   stats: {                         │
│     totalAssets: 247,              │
│     totalInspections: 1523,        │
│     criticalIssues: 12,            │
│     avgCI: 68.3,                   │
│     avgDERU: 42.1,                 │
│     totalRemedialCost: 458900      │
│   }                                │
│ }                                  │
└─────┬──────────────────────────────┘
      │
      │ 5. Update state & render UI
      ▼
┌────────────────────────────────────┐
│ Dashboard displays:                │
│ • Total Assets: 247                │
│ • Inspections: 1523                │
│ • Critical: 12                     │
│ • Avg CI: 68.3                     │
└────────────────────────────────────┘
```

---

## Data Flow: Inspections List

```
┌────────────┐
│Inspections │  User opens inspections page
│   Page     │
└─────┬──────┘
      │
      │ 1. fetchInspections()
      │    Authorization: Bearer {accessToken}
      ▼
┌────────────────────────────────────┐
│ GET /inspections                   │
│ • Validates auth token             │
│ • Identifies user's tenant         │
└─────┬──────────────────────────────┘
      │
      │ 2. Query inspection view
      ▼
┌────────────────────────────────────┐
│ SELECT * FROM                      │
│   tams360_inspections_v            │
│ ORDER BY inspection_date DESC      │
└─────┬──────────────────────────────┘
      │
      │ 3. View joins multiple tables
      │    and filters by tenant
      ▼
┌────────────────────────────────────┐
│ FROM tams360.inspections i         │
│ JOIN tams360.assets a              │
│   ON i.asset_id = a.asset_id       │
│ JOIN tams360.asset_types at        │
│   ON a.asset_type_id = at.id       │
│ WHERE i.tenant_id = (              │
│   SELECT tenant_id                 │
│   FROM user_profiles               │
│   WHERE id = auth.uid()            │
│ )                                  │
└─────┬──────────────────────────────┘
      │
      │ 4. Return array of inspections
      ▼
┌────────────────────────────────────┐
│ {                                  │
│   inspections: [                   │
│     {                              │
│       inspection_id: "uuid",       │
│       asset_ref: "SGN-001",        │
│       asset_type_name: "Signage",  │
│       conditional_index: 72,       │
│       deru_value: 38,              │
│       calculated_urgency: "2",     │
│       ci_band: "Good",             │
│       total_remedial_cost: 1200,   │
│       ...                          │
│     }                              │
│   ]                                │
│ }                                  │
└─────┬──────────────────────────────┘
      │
      │ 5. Map and render cards
      ▼
┌────────────────────────────────────┐
│ For each inspection:               │
│ • Display asset ref                │
│ • Show CI badge (color-coded)      │
│ • Show urgency badge               │
│ • Display DERU value               │
│ • Show remedial cost               │
└────────────────────────────────────┘
```

---

## Security: Tenant Isolation

```
┌──────────────────────────────────────────────────────────────┐
│                     Authentication Flow                       │
└──────────────────────────────────────────────────────────────┘

User Login
    │
    │ email + password
    ▼
Supabase Auth
    │
    │ Creates session
    │ Generates access_token
    │ Token contains: user_id, email, metadata
    ▼
Frontend stores token
    │
    │ Every API call includes:
    │ Authorization: Bearer {access_token}
    ▼
Backend validates token
    │
    │ Supabase verifies signature
    │ Extracts user_id from token
    │ Sets auth.uid() = user_id
    ▼
Database RLS applies
    │
    │ For every query:
    │ 1. Get user's tenant_id from user_profiles
    │ 2. Filter WHERE tenant_id = user's tenant
    │ 3. User only sees their org's data
    ▼
Data returned to user

┌──────────────────────────────────────────────────────────────┐
│                      Tenant Filtering                         │
└──────────────────────────────────────────────────────────────┘

Organization A (tenant_id = 'org-a')
    ├── User 1 → sees only org-a data
    └── User 2 → sees only org-a data

Organization B (tenant_id = 'org-b')
    ├── User 3 → sees only org-b data
    └── User 4 → sees only org-b data

RLS Policy ensures:
• User 1 cannot see org-b data
• User 3 cannot see org-a data
• Automatic filtering at database level
• No way to bypass (even if frontend tries)
```

---

## View Structure: tams360_inspections_v

```
┌────────────────────────────────────────────────────────────────┐
│              public.tams360_inspections_v                      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Columns from tams360.inspections:                            │
│  • inspection_id            (primary key)                     │
│  • asset_id                 (foreign key)                     │
│  • inspection_date          (timestamp)                       │
│  • inspector_name           (varchar)                         │
│  • finding_summary          (text)                            │
│  • details                  (text)                            │
│  • conditional_index        (numeric) ← CI Final              │
│  • ci_health                (numeric)                         │
│  • ci_safety                (numeric)                         │
│  • deru_value               (numeric)                         │
│  • calculated_urgency       (varchar) ← "1", "2", "3", "4"   │
│  • total_remedial_cost      (numeric)                         │
│  • weather_conditions       (varchar)                         │
│  • tenant_id                (uuid) ← Used by RLS             │
│                                                                │
│  Calculated columns:                                           │
│  • ci_band                  (text) ← Derived from CI value    │
│      CASE                                                      │
│        WHEN ci >= 80 THEN 'Excellent'                         │
│        WHEN ci >= 60 THEN 'Good'                              │
│        WHEN ci >= 40 THEN 'Fair'                              │
│        ELSE 'Poor'                                            │
│                                                                │
│  • calculation_metadata     (jsonb) ← Full calc details       │
│      {                                                         │
│        "ci_final": 72,                                        │
│        "ci_health": 75,                                       │
│        "ci_safety": 72,                                       │
│        "urgency_raw": "2",                                    │
│        "total_cost_raw": 1200,                                │
│        "timestamp_raw": "2024-01-15"                          │
│      }                                                         │
│                                                                │
│  Joined columns from tams360.assets:                          │
│  • asset_ref                (varchar) ← "SGN-001"            │
│                                                                │
│  Joined columns from tams360.asset_types:                     │
│  • asset_type_name          (varchar) ← "Signage"            │
│  • asset_type_abbreviation  (varchar) ← "SGN"                │
│                                                                │
└────────────────────────────────────────────────────────────────┘

SQL:
CREATE VIEW public.tams360_inspections_v AS
SELECT 
    i.*,
    a.asset_ref,
    at.name as asset_type_name,
    at.abbreviation as asset_type_abbreviation,
    CASE 
        WHEN i.conditional_index >= 80 THEN 'Excellent'
        WHEN i.conditional_index >= 60 THEN 'Good'
        WHEN i.conditional_index >= 40 THEN 'Fair'
        ELSE 'Poor'
    END as ci_band,
    jsonb_build_object(...) as calculation_metadata
FROM tams360.inspections i
LEFT JOIN tams360.assets a ON i.asset_id = a.asset_id
LEFT JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id;
```

---

## View Structure: tams360_assets_v

```
┌────────────────────────────────────────────────────────────────┐
│                public.tams360_assets_v                         │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Core asset data from tams360.assets:                         │
│  • asset_id                 (uuid, primary key)               │
│  • asset_ref                (varchar) ← "SGN-001"            │
│  • description              (text)                            │
│  • status_id                (uuid)                            │
│  • gps_lat                  (numeric)                         │
│  • gps_lng                  (numeric)                         │
│  • road_name                (varchar)                         │
│  • road_number              (varchar)                         │
│  • km_marker                (numeric)                         │
│  • install_date             (date)                            │
│  • region                   (varchar)                         │
│  • depot                    (varchar)                         │
│  • tenant_id                (uuid) ← Used by RLS             │
│                                                                │
│  Ownership & Responsibility:                                   │
│  • owned_by                 (varchar)                         │
│  • responsible_party        (varchar)                         │
│  • ownership_status         (varchar)                         │
│                                                                │
│  Valuation & Depreciation:                                     │
│  • purchase_price           (numeric)                         │
│  • useful_life_years        (integer)                         │
│  • depreciation_rate        (numeric)                         │
│  • current_book_value       (numeric)                         │
│  • replacement_value        (numeric)                         │
│  • last_valuation_date      (date)                            │
│                                                                │
│  Latest Inspection Data:                                       │
│  • latest_ci                (numeric) ← From last inspection  │
│  • latest_deru              (numeric)                         │
│  • latest_inspection_date   (timestamp)                       │
│                                                                │
│  Calculated CI Band:                                           │
│  • latest_ci_band           (text)                            │
│      CASE                                                      │
│        WHEN latest_ci >= 80 THEN 'Excellent'                 │
│        WHEN latest_ci >= 60 THEN 'Good'                      │
│        WHEN latest_ci >= 40 THEN 'Fair'                      │
│        WHEN latest_ci < 40 THEN 'Poor'                       │
│        ELSE 'Not Inspected'                                  │
│                                                                │
│  Joined columns:                                               │
│  • asset_type_name          (varchar) ← From asset_types     │
│  • asset_type_abbreviation  (varchar)                         │
│  • status_name              (varchar) ← From asset_status    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## API Response Examples

### Dashboard Stats Response
```json
{
  "stats": {
    "totalAssets": 247,
    "totalInspections": 1523,
    "criticalIssues": 12,
    "avgCI": 68.3,
    "avgDERU": 42.1,
    "totalRemedialCost": 458900
  }
}
```

### Inspections List Response
```json
{
  "inspections": [
    {
      "inspection_id": "550e8400-e29b-41d4-a716-446655440000",
      "asset_id": "660e8400-e29b-41d4-a716-446655440001",
      "asset_ref": "SGN-001",
      "asset_type_name": "Signage",
      "asset_type_abbreviation": "SGN",
      "inspection_date": "2024-12-15T08:30:00Z",
      "inspector_name": "John Smith",
      "finding_summary": "Minor rust on post, face in good condition",
      "conditional_index": 72,
      "ci_health": 75,
      "ci_safety": 72,
      "deru_value": 38,
      "calculated_urgency": "2",
      "ci_band": "Good",
      "total_remedial_cost": 1200,
      "calculation_metadata": {
        "ci_final": 72,
        "ci_health": 75,
        "ci_safety": 72,
        "urgency_raw": "2",
        "total_cost_raw": 1200
      }
    }
  ]
}
```

### CI Distribution Response
```json
{
  "distribution": [
    { "name": "Excellent", "value": 45, "avgCi": 87.2 },
    { "name": "Good", "value": 98, "avgCi": 68.5 },
    { "name": "Fair", "value": 67, "avgCi": 52.1 },
    { "name": "Poor", "value": 23, "avgCi": 28.7 },
    { "name": "Not Inspected", "value": 14, "avgCi": null }
  ]
}
```

---

## Summary

- ✅ All data flows through public views (not direct table access)
- ✅ Authentication required for all requests
- ✅ RLS automatically filters by tenant_id
- ✅ Views include calculated fields (CI band, metadata)
- ✅ Views join related tables (assets, types, status)
- ✅ Frontend gets clean, structured JSON responses
- ✅ Multi-tenant isolation enforced at database level

**The architecture is secure, scalable, and properly separated.**
