# TAMS360 Database Implementation Guide

## ⚠️ Important: Current Limitations

**The Figma Make environment has specific constraints that affect database implementation:**

1. **Cannot create SQL tables directly** - Migration files and DDL statements cannot be executed in this environment
2. **Using KV Store instead** - The current implementation uses Supabase's key-value store (`kv_store_c894a9ff` table)
3. **Schema provided for reference** - The detailed schema in `DATABASE_SCHEMA.md` is for when you move to production

## 🏗️ Current Architecture

### What's Implemented Now:

The system currently uses a **key-value store pattern** to simulate the relational database:

```javascript
// Assets stored as:
kv.set('asset:asset-123', { ...assetData })

// Inspections stored as:
kv.set('inspection:inspection-456', { ...inspectionData })

// Users stored as:
kv.set('user:user-id', { ...userData })
```

**Advantages:**
- ✅ Works immediately without database setup
- ✅ Good for prototyping and MVP
- ✅ Simple CRUD operations
- ✅ No schema migrations needed

**Limitations:**
- ❌ No complex queries (JOINs, GROUP BY, etc.)
- ❌ No referential integrity
- ❌ Limited search capabilities
- ❌ Less efficient for large datasets
- ❌ No transactions

---

## 🚀 Migration Path to Full Database

When you're ready to move to production with a proper PostgreSQL database, follow these steps:

### Step 1: Create Tables in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create tables using the schema from `DATABASE_SCHEMA.md`

**Example: Create assets table**
```sql
CREATE TABLE IF NOT EXISTS assets (
  asset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_ref VARCHAR(50) UNIQUE NOT NULL,
  asset_type_id UUID REFERENCES asset_types(asset_type_id),
  road_number VARCHAR(20),
  road_name VARCHAR(200),
  km_marker DECIMAL(10,3),
  region VARCHAR(100),
  depot VARCHAR(100),
  gps_lat DECIMAL(10,8),
  gps_lng DECIMAL(11,8),
  install_date DATE,
  status_id UUID REFERENCES asset_status(status_id),
  condition_id UUID REFERENCES condition_lookup(condition_id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

-- Create indexes
CREATE INDEX idx_assets_type ON assets(asset_type_id);
CREATE INDEX idx_assets_status ON assets(status_id);
CREATE INDEX idx_assets_location ON assets(gps_lat, gps_lng);
CREATE INDEX idx_assets_ref ON assets(asset_ref);
```

### Step 2: Create Lookup Tables

```sql
-- Asset Types
CREATE TABLE IF NOT EXISTS asset_types (
  asset_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  abbreviation VARCHAR(10),
  description TEXT,
  icon_name VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER
);

-- Insert sample data
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

-- Asset Status
CREATE TABLE IF NOT EXISTS asset_status (
  status_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  color_hex VARCHAR(7),
  display_order INTEGER
);

INSERT INTO asset_status (name, description, color_hex) VALUES
('Active', 'Asset is operational', '#10B981'),
('Damaged', 'Asset has damage', '#F59E0B'),
('Missing', 'Asset is missing', '#DC2626'),
('Repaired', 'Asset has been repaired', '#3B82F6');

-- Condition Lookup
CREATE TABLE IF NOT EXISTS condition_lookup (
  condition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  score INTEGER,
  description TEXT,
  color_hex VARCHAR(7)
);

INSERT INTO condition_lookup (name, score, description, color_hex) VALUES
('Excellent', 4, 'Like new', '#10B981'),
('Good', 3, 'Minor wear', '#3B82F6'),
('Fair', 2, 'Needs attention', '#F59E0B'),
('Poor', 1, 'Urgent action needed', '#DC2626');

-- Urgency Lookup
CREATE TABLE IF NOT EXISTS urgency_lookup (
  urgency_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level INTEGER UNIQUE NOT NULL,
  label VARCHAR(50) NOT NULL,
  description TEXT,
  color_hex VARCHAR(7),
  response_time_days INTEGER
);

INSERT INTO urgency_lookup (level, label, description, color_hex, response_time_days) VALUES
(1, 'Immediate', 'Critical safety issue', '#DC2626', 1),
(2, 'High', 'Significant issue', '#F59E0B', 7),
(3, 'Medium', 'Moderate issue', '#3B82F6', 30),
(4, 'Low', 'Minor issue', '#10B981', 90);
```

### Step 3: Update Backend Code

Replace KV store calls with SQL queries in `/supabase/functions/server/index.tsx`:

**Before (KV):**
```typescript
// Get all assets
const assets = await kv.getByPrefix("asset:");
```

**After (SQL):**
```typescript
// Get all assets
const { data: assets, error } = await supabase
  .from('assets')
  .select(`
    *,
    asset_types(name, abbreviation),
    asset_status(name, color_hex),
    condition_lookup(name, score)
  `)
  .order('created_at', { ascending: false });
```

### Step 4: Set Up Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all assets
CREATE POLICY "Users can view assets"
  ON assets FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Field users and above can create assets
CREATE POLICY "Field users can create assets"
  ON assets FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Users can update their own assets or admins can update all
CREATE POLICY "Users can update assets"
  ON assets FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### Step 5: Migrate Existing Data

Create a migration script to move data from KV store to SQL tables:

```typescript
// Migration script
const migrateAssets = async () => {
  // Get all assets from KV store
  const kvAssets = await kv.getByPrefix("asset:");
  
  for (const asset of kvAssets) {
    // Map to SQL structure
    const { data, error } = await supabase
      .from('assets')
      .insert({
        asset_ref: asset.assetRef,
        asset_type_id: await lookupAssetType(asset.type),
        road_number: asset.roadNumber,
        road_name: asset.roadName,
        km_marker: asset.kmMarker,
        gps_lat: asset.latitude,
        gps_lng: asset.longitude,
        status_id: await lookupStatus(asset.status),
        condition_id: await lookupCondition(asset.condition),
        notes: asset.notes,
        created_at: asset.createdAt
      });
    
    if (error) {
      console.error('Migration error:', error);
    }
  }
};
```

---

## 📊 Excel Data Import Process

### Preparing Your Excel Data

1. **Review the Excel workbook structure** (as described in your requirements)
2. **Clean the data:**
   - Remove empty rows
   - Standardize values (e.g., asset types, statuses)
   - Ensure GPS coordinates are in decimal format
   - Check date formats

### Import Steps

#### 1. Import Lookup Tables First

```sql
-- Example: Import asset types from Lookup Tables tab
COPY asset_types (name, abbreviation)
FROM '/path/to/asset_types.csv'
DELIMITER ','
CSV HEADER;
```

#### 2. Import Costing Table

```sql
-- Import costing data
INSERT INTO costing_table (
  asset_type_id,
  estimated_lifespan_years,
  proposed_useful_life_years,
  urgency_1_cost,
  urgency_2_cost,
  urgency_3_cost,
  urgency_4_cost
)
SELECT 
  (SELECT asset_type_id FROM asset_types WHERE name = source.asset_type),
  source.estimated_lifespan,
  source.useful_life,
  source.urgency1_cost,
  source.urgency2_cost,
  source.urgency3_cost,
  source.urgency4_cost
FROM imported_costing_data source;
```

#### 3. Import Assets (Inventory Tab)

```sql
INSERT INTO assets (
  asset_ref,
  asset_type_id,
  road_number,
  road_name,
  km_marker,
  region,
  depot,
  gps_lat,
  gps_lng,
  install_date,
  status_id,
  condition_id,
  notes
)
SELECT 
  source.reference_number,
  (SELECT asset_type_id FROM asset_types WHERE name = source.asset_type),
  source.road_num,
  source.road_name,
  CAST(source.km_marker AS DECIMAL(10,3)),
  source.region,
  source.depot,
  CAST(source.latitude AS DECIMAL(10,8)),
  CAST(source.longitude AS DECIMAL(11,8)),
  TO_DATE(source.install_date, 'YYYY-MM-DD'),
  (SELECT status_id FROM asset_status WHERE name = source.status),
  (SELECT condition_id FROM condition_lookup WHERE name = source.condition),
  source.notes
FROM imported_inventory_data source;
```

#### 4. Import Inspections

```sql
INSERT INTO inspections (
  asset_id,
  inspection_date,
  inspector_name,
  inspection_type_id,
  finding_summary,
  details,
  urgency_id,
  recommended_action
)
SELECT 
  (SELECT asset_id FROM assets WHERE asset_ref = source.asset_ref),
  TO_TIMESTAMP(source.inspection_date, 'YYYY-MM-DD HH24:MI:SS'),
  source.inspector_name,
  (SELECT inspection_type_id FROM inspection_types WHERE name = source.inspection_type),
  source.findings,
  source.details,
  (SELECT urgency_id FROM urgency_lookup WHERE label = source.urgency),
  source.recommended_action
FROM imported_inspection_data source;
```

#### 5. Upload Photos to Supabase Storage

```typescript
// Upload photos and create records
const uploadPhotos = async () => {
  const bucket = 'tams360-photos';
  
  for (const photo of photoData) {
    // Upload file
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(`inspections/${photo.fileName}`, photo.file);
    
    if (!uploadError) {
      // Create database record
      await supabase.from('inspection_photos').insert({
        inspection_id: photo.inspectionId,
        asset_id: photo.assetId,
        photo_url: uploadData.path,
        caption: photo.caption,
        photo_date: photo.date
      });
    }
  }
};
```

---

## 🎯 Recommended Approach

### For Prototype/MVP (Current):
- ✅ Continue using KV store
- ✅ Test core functionality
- ✅ Validate UI/UX
- ✅ Get user feedback

### For Production:
1. **Create full PostgreSQL schema** using `DATABASE_SCHEMA.md`
2. **Import Excel data** using the scripts above
3. **Update backend** to use SQL queries
4. **Implement RLS policies** for security
5. **Add photo storage** using Supabase Storage
6. **Set up backups** and monitoring

---

## 📝 Key Files Reference

- `/DATABASE_SCHEMA.md` - Complete schema documentation
- `/supabase/functions/server/index.tsx` - Backend API (currently using KV)
- `/SETUP_INSTRUCTIONS.md` - User setup guide
- Excel workbook - Source data (not in codebase)

---

## 🆘 Need Help?

**Common Questions:**

**Q: Can I use this in production with KV store?**  
A: For small-scale (<1000 assets), yes. For larger deployments, migrate to PostgreSQL.

**Q: How do I export KV data before migrating?**  
A: Use the KV getByPrefix() function to retrieve all data, then export to JSON.

**Q: Can I add custom fields to assets?**  
A: With KV: Just add to the object. With SQL: Add columns or use JSONB metadata field.

**Q: How do I handle offline data sync?**  
A: Implement local IndexedDB storage + background sync when online.

---

_Implementation Guide Version: 1.0_  
_Last Updated: December 29, 2024_
