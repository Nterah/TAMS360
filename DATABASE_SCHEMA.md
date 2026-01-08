# TAMS360 Database Schema Documentation

## Overview

This document outlines the complete database schema for TAMS360 based on the Excel workbook structure. The schema is normalized and designed to support the mobile and web UI requirements.

---

## 📊 Core Transaction Tables

### 1. **assets** (from "Inventory" Excel tab)
**Purpose:** Master list of all road infrastructure assets

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| asset_id | UUID | PRIMARY KEY | System-generated unique identifier |
| asset_ref | VARCHAR(50) | UNIQUE, NOT NULL | Asset reference number from Excel |
| asset_type_id | UUID | FK → asset_types | Type of asset |
| road_number | VARCHAR(20) | | Road identifier |
| road_name | VARCHAR(200) | | Road name |
| km_marker | DECIMAL(10,3) | | Chainage/kilometer marker |
| region | VARCHAR(100) | | Geographic region |
| depot | VARCHAR(100) | | Maintenance depot |
| gps_lat | DECIMAL(10,8) | | GPS latitude |
| gps_lng | DECIMAL(11,8) | | GPS longitude |
| install_date | DATE | | Installation date |
| status_id | UUID | FK → asset_status | Current status |
| condition_id | UUID | FK → condition_lookup | Current condition |
| notes | TEXT | | Additional notes |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update time |
| created_by | UUID | FK → users | User who created |
| updated_by | UUID | FK → users | User who last updated |

**Relationships:**
- One asset → Many inspections
- One asset → Many photos
- One asset → Many maintenance records

**Indexes:**
```sql
CREATE INDEX idx_assets_type ON assets(asset_type_id);
CREATE INDEX idx_assets_status ON assets(status_id);
CREATE INDEX idx_assets_location ON assets(gps_lat, gps_lng);
CREATE INDEX idx_assets_ref ON assets(asset_ref);
```

---

### 2. **inspections** (from "Combined Inspection Log" Excel tab)
**Purpose:** Inspection events linked to assets

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| inspection_id | UUID | PRIMARY KEY | Unique inspection ID |
| asset_id | UUID | FK → assets, NOT NULL | Associated asset |
| inspection_date | TIMESTAMP | NOT NULL | Date/time of inspection |
| inspector_user_id | UUID | FK → users | Inspector (user account) |
| inspector_name | VARCHAR(200) | | Inspector name (fallback) |
| inspection_type_id | UUID | FK → inspection_types | Type of inspection |
| finding_summary | TEXT | | Summary of findings |
| details | TEXT | | Detailed notes |
| further_inspection_required | BOOLEAN | DEFAULT FALSE | Flag for follow-up |
| urgency_id | UUID | FK → urgency_lookup | Urgency level |
| recommended_action | TEXT | | Recommended next steps |
| gps_lat | DECIMAL(10,8) | | GPS latitude at inspection |
| gps_lng | DECIMAL(11,8) | | GPS longitude at inspection |
| weather_conditions | VARCHAR(100) | | Weather during inspection |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update time |

**Relationships:**
- One inspection → Many inspection_photos
- One inspection → One asset

**Indexes:**
```sql
CREATE INDEX idx_inspections_asset ON inspections(asset_id);
CREATE INDEX idx_inspections_date ON inspections(inspection_date);
CREATE INDEX idx_inspections_urgency ON inspections(urgency_id);
CREATE INDEX idx_inspections_inspector ON inspections(inspector_user_id);
```

---

### 3. **inspection_photos** (from "Inspection Photos" Excel tab)
**Purpose:** Photo records linked to inspections and assets

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| photo_id | UUID | PRIMARY KEY | Unique photo ID |
| inspection_id | UUID | FK → inspections | Associated inspection |
| asset_id | UUID | FK → assets | Associated asset (for gallery) |
| photo_url | VARCHAR(500) | NOT NULL | Storage URL or file path |
| thumbnail_url | VARCHAR(500) | | Thumbnail version |
| caption | TEXT | | Photo description |
| photo_date | TIMESTAMP | DEFAULT NOW() | When photo was taken |
| uploaded_by | UUID | FK → users | User who uploaded |
| file_size_bytes | INTEGER | | File size |
| mime_type | VARCHAR(100) | | Image MIME type |
| width | INTEGER | | Image width in pixels |
| height | INTEGER | | Image height in pixels |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |

**Relationships:**
- Many photos → One inspection
- Many photos → One asset

**Indexes:**
```sql
CREATE INDEX idx_photos_inspection ON inspection_photos(inspection_id);
CREATE INDEX idx_photos_asset ON inspection_photos(asset_id);
CREATE INDEX idx_photos_date ON inspection_photos(photo_date);
```

---

### 4. **maintenance_records**
**Purpose:** Track maintenance work orders and activities

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| maintenance_id | UUID | PRIMARY KEY | Unique maintenance ID |
| asset_id | UUID | FK → assets, NOT NULL | Associated asset |
| inspection_id | UUID | FK → inspections | Related inspection (optional) |
| work_order_number | VARCHAR(50) | UNIQUE | Work order reference |
| maintenance_type | VARCHAR(100) | | Type of maintenance |
| description | TEXT | | Work description |
| scheduled_date | DATE | | Scheduled start date |
| completed_date | DATE | | Actual completion date |
| status | VARCHAR(50) | | Status (Scheduled/In Progress/Completed/Cancelled) |
| assigned_to | UUID | FK → users | Assigned technician |
| estimated_cost | DECIMAL(12,2) | | Estimated cost |
| actual_cost | DECIMAL(12,2) | | Actual cost |
| urgency_id | UUID | FK → urgency_lookup | Priority level |
| contractor_name | VARCHAR(200) | | External contractor |
| notes | TEXT | | Additional notes |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |
| created_by | UUID | FK → users | User who created |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update time |

**Indexes:**
```sql
CREATE INDEX idx_maintenance_asset ON maintenance_records(asset_id);
CREATE INDEX idx_maintenance_status ON maintenance_records(status);
CREATE INDEX idx_maintenance_scheduled ON maintenance_records(scheduled_date);
```

---

## 🗂️ Lookup Tables (from "Lookup Tables" Excel tab)

### 5. **asset_types** (from "Assets / Abbreviation" block)
**Purpose:** Reference table for asset types

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| asset_type_id | UUID | PRIMARY KEY | Unique type ID |
| name | VARCHAR(100) | UNIQUE, NOT NULL | Full name (e.g., "Signage") |
| abbreviation | VARCHAR(10) | | Short code (e.g., "SGN") |
| description | TEXT | | Detailed description |
| icon_name | VARCHAR(50) | | Icon identifier for UI |
| is_active | BOOLEAN | DEFAULT TRUE | Active/inactive flag |
| display_order | INTEGER | | Sort order in UI |

**Sample Data:**
```sql
INSERT INTO asset_types (name, abbreviation) VALUES
('Signage', 'SGN'),
('Guardrail', 'GRD'),
('Traffic Signal', 'TRS'),
('Gantry', 'GNT'),
('Fence', 'FEN'),
('Safety Barrier', 'SFB'),
('Guidepost', 'GDP'),
('Road Marking', 'RDM'),
('Raised Road Marker', 'RRM');
```

---

### 6. **costing_table** (from "CostingTable" block)
**Purpose:** Cost estimates and lifecycle data by asset type and urgency

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| costing_id | UUID | PRIMARY KEY | Unique costing ID |
| asset_type_id | UUID | FK → asset_types, NOT NULL | Asset type |
| estimated_lifespan_years | INTEGER | | Expected lifespan |
| proposed_useful_life_years | INTEGER | | Useful service life |
| urgency_1_cost | DECIMAL(12,2) | | Immediate action cost |
| urgency_2_cost | DECIMAL(12,2) | | High priority cost |
| urgency_3_cost | DECIMAL(12,2) | | Medium priority cost |
| urgency_4_cost | DECIMAL(12,2) | | Low priority cost |
| replacement_cost | DECIMAL(12,2) | | Full replacement cost |
| annual_maintenance_cost | DECIMAL(12,2) | | Annual maintenance |
| currency | VARCHAR(3) | DEFAULT 'USD' | Currency code |
| effective_date | DATE | DEFAULT NOW() | When costs are effective |
| notes | TEXT | | Additional notes |

**Usage:** 
- Budget planning and forecasting
- Prioritization decisions based on urgency + cost
- Lifecycle costing analysis

**Indexes:**
```sql
CREATE INDEX idx_costing_asset_type ON costing_table(asset_type_id);
```

---

### 7. **urgency_lookup** (from "Urgency" block)
**Purpose:** Urgency/priority levels

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| urgency_id | UUID | PRIMARY KEY | Unique urgency ID |
| level | INTEGER | UNIQUE, NOT NULL | Numeric level (1-4) |
| label | VARCHAR(50) | NOT NULL | Display label |
| description | TEXT | | Detailed description |
| color_hex | VARCHAR(7) | | UI color code |
| response_time_days | INTEGER | | Expected response time |

**Sample Data:**
```sql
INSERT INTO urgency_lookup (level, label, description, color_hex, response_time_days) VALUES
(1, 'Immediate', 'Critical safety issue requiring immediate attention', '#DC2626', 1),
(2, 'High', 'Significant issue requiring prompt action', '#F59E0B', 7),
(3, 'Medium', 'Moderate issue to be addressed soon', '#3B82F6', 30),
(4, 'Low', 'Minor issue for routine maintenance', '#10B981', 90);
```

---

### 8. **asset_status**
**Purpose:** Asset lifecycle status values

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| status_id | UUID | PRIMARY KEY | Unique status ID |
| name | VARCHAR(50) | UNIQUE, NOT NULL | Status name |
| description | TEXT | | Description |
| is_active | BOOLEAN | DEFAULT TRUE | Active status |
| color_hex | VARCHAR(7) | | UI color |
| display_order | INTEGER | | Sort order |

**Sample Data:**
```sql
INSERT INTO asset_status (name, description, color_hex) VALUES
('Active', 'Asset is operational and in use', '#10B981'),
('Damaged', 'Asset has damage but is still in place', '#F59E0B'),
('Missing', 'Asset is missing or stolen', '#DC2626'),
('Repaired', 'Asset has been repaired', '#3B82F6'),
('Replaced', 'Asset has been replaced', '#8B5CF6'),
('Decommissioned', 'Asset removed from service', '#6B7280');
```

---

### 9. **condition_lookup**
**Purpose:** Physical condition ratings

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| condition_id | UUID | PRIMARY KEY | Unique condition ID |
| name | VARCHAR(50) | UNIQUE, NOT NULL | Condition name |
| score | INTEGER | | Numeric score (1-4) |
| description | TEXT | | Description |
| color_hex | VARCHAR(7) | | UI color |

**Sample Data:**
```sql
INSERT INTO condition_lookup (name, score, description, color_hex) VALUES
('Excellent', 4, 'Like new condition', '#10B981'),
('Good', 3, 'Minor wear, fully functional', '#3B82F6'),
('Fair', 2, 'Noticeable wear, needs attention', '#F59E0B'),
('Poor', 1, 'Significant deterioration, urgent action needed', '#DC2626');
```

---

### 10. **inspection_types**
**Purpose:** Types of inspections conducted

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| inspection_type_id | UUID | PRIMARY KEY | Unique type ID |
| name | VARCHAR(100) | UNIQUE, NOT NULL | Type name |
| description | TEXT | | Description |
| is_scheduled | BOOLEAN | DEFAULT FALSE | Part of routine schedule |
| frequency_days | INTEGER | | Standard frequency |

**Sample Data:**
```sql
INSERT INTO inspection_types (name, description, is_scheduled, frequency_days) VALUES
('Routine', 'Scheduled routine inspection', TRUE, 90),
('Incident', 'Inspection following incident report', FALSE, NULL),
('Verification', 'Post-maintenance verification', FALSE, NULL),
('Compliance', 'Regulatory compliance inspection', TRUE, 365),
('Safety Audit', 'Comprehensive safety audit', TRUE, 180);
```

---

### 11. **regions**
**Purpose:** Geographic regions/districts

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| region_id | UUID | PRIMARY KEY | Unique region ID |
| name | VARCHAR(100) | UNIQUE, NOT NULL | Region name |
| code | VARCHAR(20) | UNIQUE | Short code |
| description | TEXT | | Description |
| boundary_geojson | JSONB | | Geographic boundary |

---

### 12. **depots**
**Purpose:** Maintenance depots/facilities

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| depot_id | UUID | PRIMARY KEY | Unique depot ID |
| name | VARCHAR(100) | NOT NULL | Depot name |
| code | VARCHAR(20) | UNIQUE | Short code |
| region_id | UUID | FK → regions | Parent region |
| address | TEXT | | Physical address |
| gps_lat | DECIMAL(10,8) | | GPS latitude |
| gps_lng | DECIMAL(11,8) | | GPS longitude |
| contact_phone | VARCHAR(20) | | Phone number |
| manager_user_id | UUID | FK → users | Depot manager |

---

## 👤 User Management Tables

### 13. **users**
**Purpose:** System users (managed by Supabase Auth + KV store)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Supabase Auth user ID |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Email address |
| name | VARCHAR(200) | NOT NULL | Full name |
| organization | VARCHAR(200) | | Organization name |
| role | VARCHAR(50) | NOT NULL | Role (admin/supervisor/field_user/viewer) |
| tier | VARCHAR(50) | | Subscription tier |
| status | VARCHAR(50) | NOT NULL | Status (pending/approved/suspended) |
| depot_id | UUID | FK → depots | Assigned depot |
| region_id | UUID | FK → regions | Assigned region |
| created_at | TIMESTAMP | DEFAULT NOW() | Account creation |
| approved_at | TIMESTAMP | | Approval timestamp |
| approved_by | UUID | FK → users | Admin who approved |
| last_login_at | TIMESTAMP | | Last login time |

---

## 📈 Entity Relationship Diagram (ERD)

```
┌─────────────────┐
│   asset_types   │
│  (Lookup)       │
└────────┬────────┘
         │
         │ 1:N
         │
┌────────▼────────┐        1:N      ┌─────────────────┐
│     assets      │◄─────────────────┤  inspections    │
│  (Master)       │                  │                 │
└────┬────────────┘                  └────────┬────────┘
     │                                        │
     │ 1:N                                    │ 1:N
     │                                        │
     │     ┌──────────────────────────────────┘
     │     │
┌────▼─────▼──────┐
│inspection_photos│
└─────────────────┘

┌──────────────────┐       N:1      ┌────────────────┐
│ maintenance_     │────────────────►│ urgency_lookup │
│   records        │                 │   (Lookup)     │
└──────────────────┘                 └────────────────┘

┌──────────────────┐       N:1      ┌────────────────┐
│  costing_table   │────────────────►│  asset_types   │
│                  │                 │                │
└──────────────────┘                 └────────────────┘
```

---

## 🔄 Data Migration from Excel

### Import Rules:

1. **Inventory Tab** → `assets` table
   - Map columns directly
   - Convert text values to FK references using lookup tables
   - Generate UUID for asset_id
   - Preserve original ref in asset_ref

2. **Combined Inspection Log** → `inspections` table
   - Link to assets via asset_ref
   - Convert inspector names to user_id where possible
   - Map urgency text to urgency_id

3. **Inspection Photos** → `inspection_photos` table
   - Link to inspections and assets
   - Upload images to Supabase Storage
   - Store URLs in photo_url field

4. **Lookup Tables Tab** → Multiple lookup tables
   - Parse each block separately
   - CostingTable → `costing_table`
   - Assets/Abbreviation → `asset_types`
   - Urgency → `urgency_lookup`

### Sample SQL for Import:

```sql
-- Example: Import assets from Excel
INSERT INTO assets (
  asset_ref, asset_type_id, road_number, road_name, 
  km_marker, region, depot, gps_lat, gps_lng, 
  install_date, status_id, condition_id, notes
)
SELECT 
  excel.ref_number,
  (SELECT asset_type_id FROM asset_types WHERE name = excel.asset_type),
  excel.road_num,
  excel.road_name,
  CAST(excel.km AS DECIMAL(10,3)),
  excel.region,
  excel.depot,
  CAST(excel.latitude AS DECIMAL(10,8)),
  CAST(excel.longitude AS DECIMAL(11,8)),
  TO_DATE(excel.install_date, 'YYYY-MM-DD'),
  (SELECT status_id FROM asset_status WHERE name = excel.status),
  (SELECT condition_id FROM condition_lookup WHERE name = excel.condition),
  excel.remarks
FROM excel_import excel;
```

---

## 🎯 Key Design Principles

1. **Normalization:** All repeated text values converted to foreign keys
2. **Traceability:** created_at, updated_at, created_by, updated_by fields
3. **Soft Deletes:** Use is_active flags instead of DELETE
4. **Audit Trail:** Maintain history of changes
5. **Performance:** Strategic indexes on FK and query columns
6. **Flexibility:** JSONB fields for extensible metadata
7. **Standards:** UUID primary keys, timestamp timezone, consistent naming

---

## 📝 Implementation Notes

**For Supabase Free Tier:**
- All tables must be in the `public` schema
- Row Level Security (RLS) policies required
- Storage bucket for photos: `tams360-photos` (private)
- Enable realtime for critical tables if needed

**Constraints:**
- Cannot create separate schemas in Figma Make environment
- Use KV store wrapper for key-value operations
- Actual SQL schema must be created manually in Supabase dashboard

---

## 🚀 Next Steps

1. **Create Tables:** Manually create all tables in Supabase SQL Editor
2. **Set up RLS:** Configure Row Level Security policies
3. **Create Storage Bucket:** `tams360-photos` for photo uploads
4. **Import Lookup Data:** Populate all lookup tables with sample data
5. **Import Excel Data:** Run migration scripts for existing data
6. **Update Backend:** Modify KV calls to SQL queries
7. **Test UI:** Verify all CRUD operations work correctly

---

_Schema Version: 1.0_  
_Last Updated: December 29, 2024_
