-- ============================================================================
-- TAMS360 Database Setup Script
-- Run this script in your Supabase SQL Editor
-- ============================================================================

-- Create tams360 schema
CREATE SCHEMA IF NOT EXISTS tams360;

-- ============================================================================
-- 1. CORE TABLES
-- ============================================================================

-- Tenants table (multi-tenancy support)
CREATE TABLE IF NOT EXISTS tams360.tenants (
  tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  domain VARCHAR(200),
  owner_id UUID,
  tier VARCHAR(50) DEFAULT 'trial',
  status VARCHAR(50) DEFAULT 'active',
  trial_ends_at TIMESTAMP,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User profiles table
CREATE TABLE IF NOT EXISTS tams360.user_profiles (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tams360.tenants(tenant_id),
  email VARCHAR(255) NOT NULL,
  name VARCHAR(200),
  role VARCHAR(50) DEFAULT 'viewer',
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  approved_by UUID
);

-- Asset types lookup
CREATE TABLE IF NOT EXISTS tams360.asset_types (
  asset_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tams360.tenants(tenant_id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Assets table
CREATE TABLE IF NOT EXISTS tams360.assets (
  asset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tams360.tenants(tenant_id),
  asset_ref VARCHAR(50) NOT NULL,
  asset_type_id UUID REFERENCES tams360.asset_types(asset_type_id),
  asset_name VARCHAR(200),
  road_number VARCHAR(20),
  road_name VARCHAR(200),
  km_marker DECIMAL(10,3),
  region VARCHAR(100),
  ward VARCHAR(100),
  depot VARCHAR(100),
  owner VARCHAR(200),
  responsible_party VARCHAR(200),
  gps_lat DECIMAL(10,8),
  gps_lng DECIMAL(11,8),
  install_date DATE,
  replacement_value DECIMAL(15,2),
  useful_life_years INTEGER DEFAULT 20,
  status VARCHAR(50) DEFAULT 'Active',
  condition VARCHAR(50),
  notes TEXT,
  general_photo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  UNIQUE(tenant_id, asset_ref)
);

-- Inspections table
CREATE TABLE IF NOT EXISTS tams360.inspections (
  inspection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tams360.tenants(tenant_id),
  asset_id UUID REFERENCES tams360.assets(asset_id),
  inspection_date TIMESTAMP NOT NULL,
  inspector_user_id UUID,
  inspector_name VARCHAR(200),
  inspection_type VARCHAR(100),
  finding_summary TEXT,
  details TEXT,
  calculated_ci DECIMAL(5,2),
  calculated_urgency VARCHAR(50),
  recommended_action TEXT,
  gps_lat DECIMAL(10,8),
  gps_lng DECIMAL(11,8),
  weather_conditions VARCHAR(100),
  photos JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Maintenance records table
CREATE TABLE IF NOT EXISTS tams360.maintenance_records (
  maintenance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tams360.tenants(tenant_id),
  asset_id UUID REFERENCES tams360.assets(asset_id),
  maintenance_type VARCHAR(100),
  scheduled_date DATE,
  completed_date DATE,
  contractor VARCHAR(200),
  cost DECIMAL(15,2),
  description TEXT,
  status VARCHAR(50) DEFAULT 'Scheduled',
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_assets_tenant ON tams360.assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON tams360.assets(asset_type_id);
CREATE INDEX IF NOT EXISTS idx_assets_location ON tams360.assets(gps_lat, gps_lng);
CREATE INDEX IF NOT EXISTS idx_assets_ref ON tams360.assets(asset_ref);
CREATE INDEX IF NOT EXISTS idx_inspections_tenant ON tams360.inspections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inspections_asset ON tams360.inspections(asset_id);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON tams360.inspections(inspection_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_tenant ON tams360.maintenance_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_asset ON tams360.maintenance_records(asset_id);

-- ============================================================================
-- 3. CREATE PUBLIC VIEWS (for PostgREST/Supabase JS Client)
-- ============================================================================

-- Tenants view
CREATE OR REPLACE VIEW public.tams360_tenants_v AS
SELECT 
  tenant_id,
  name,
  domain,
  owner_id,
  tier,
  status,
  trial_ends_at,
  settings,
  created_at,
  updated_at
FROM tams360.tenants;

-- User profiles view
CREATE OR REPLACE VIEW public.tams360_user_profiles_v AS
SELECT 
  id,
  tenant_id,
  email,
  name,
  role,
  status,
  created_at,
  updated_at,
  approved_at,
  approved_by
FROM tams360.user_profiles;

-- Asset types view
CREATE OR REPLACE VIEW public.tams360_asset_types_v AS
SELECT 
  asset_type_id,
  tenant_id,
  name,
  description,
  icon,
  created_at
FROM tams360.asset_types;

-- Assets view with latest inspection data
CREATE OR REPLACE VIEW public.tams360_assets_v AS
SELECT 
  a.asset_id,
  a.tenant_id,
  a.asset_ref,
  a.asset_type_id,
  at.name as asset_type_name,
  a.asset_name,
  a.road_number,
  a.road_name,
  a.km_marker,
  a.region,
  a.ward,
  a.depot,
  a.owner as owner_name,
  a.responsible_party as responsible_party_name,
  a.gps_lat,
  a.gps_lng,
  a.install_date,
  a.replacement_value,
  a.useful_life_years,
  a.status as status_name,
  a.condition as latest_condition,
  a.notes,
  a.general_photo_url,
  a.created_at,
  a.updated_at,
  a.created_by,
  a.updated_by,
  -- Latest inspection data
  (SELECT i.calculated_ci 
   FROM tams360.inspections i 
   WHERE i.asset_id = a.asset_id 
   ORDER BY i.inspection_date DESC 
   LIMIT 1) as latest_ci,
  (SELECT i.calculated_urgency 
   FROM tams360.inspections i 
   WHERE i.asset_id = a.asset_id 
   ORDER BY i.inspection_date DESC 
   LIMIT 1) as latest_urgency,
  (SELECT i.inspection_date 
   FROM tams360.inspections i 
   WHERE i.asset_id = a.asset_id 
   ORDER BY i.inspection_date DESC 
   LIMIT 1) as last_inspection_date
FROM tams360.assets a
LEFT JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id;

-- Inspections view
CREATE OR REPLACE VIEW public.tams360_inspections_v AS
SELECT 
  i.inspection_id,
  i.tenant_id,
  i.asset_id,
  i.inspection_date,
  i.inspector_user_id,
  i.inspector_name,
  i.inspection_type,
  i.finding_summary,
  i.details,
  i.calculated_ci,
  i.calculated_urgency,
  i.recommended_action,
  i.gps_lat,
  i.gps_lng,
  i.weather_conditions,
  i.photos,
  i.created_at,
  i.updated_at,
  a.asset_ref,
  a.asset_name,
  at.name as asset_type_name
FROM tams360.inspections i
LEFT JOIN tams360.assets a ON i.asset_id = a.asset_id
LEFT JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id;

-- Maintenance records view
CREATE OR REPLACE VIEW public.tams360_maintenance_v AS
SELECT 
  m.maintenance_id,
  m.tenant_id,
  m.asset_id,
  m.maintenance_type,
  m.scheduled_date,
  m.completed_date,
  m.contractor,
  m.cost,
  m.description,
  m.status,
  m.created_by,
  m.created_at,
  m.updated_at,
  a.asset_ref,
  a.asset_name,
  at.name as asset_type_name
FROM tams360.maintenance_records m
LEFT JOIN tams360.assets a ON m.asset_id = a.asset_id
LEFT JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id;

-- ============================================================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE tams360.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tams360.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tams360.asset_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE tams360.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tams360.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE tams360.maintenance_records ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. CREATE RLS POLICIES (Service Role bypasses these)
-- ============================================================================

-- Note: Since we're using the service role key in the backend,
-- these policies are more for documentation and future frontend direct access

-- Tenants policies
DROP POLICY IF EXISTS "Users can view their own tenant" ON tams360.tenants;
CREATE POLICY "Users can view their own tenant" ON tams360.tenants
  FOR SELECT USING (true);

-- User profiles policies
DROP POLICY IF EXISTS "Users can view profiles in their tenant" ON tams360.user_profiles;
CREATE POLICY "Users can view profiles in their tenant" ON tams360.user_profiles
  FOR SELECT USING (true);

-- Assets policies
DROP POLICY IF EXISTS "Users can view assets in their tenant" ON tams360.assets;
CREATE POLICY "Users can view assets in their tenant" ON tams360.assets
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert assets in their tenant" ON tams360.assets;
CREATE POLICY "Users can insert assets in their tenant" ON tams360.assets
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update assets in their tenant" ON tams360.assets;
CREATE POLICY "Users can update assets in their tenant" ON tams360.assets
  FOR UPDATE USING (true);

-- Inspections policies
DROP POLICY IF EXISTS "Users can view inspections in their tenant" ON tams360.inspections;
CREATE POLICY "Users can view inspections in their tenant" ON tams360.inspections
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert inspections in their tenant" ON tams360.inspections;
CREATE POLICY "Users can insert inspections in their tenant" ON tams360.inspections
  FOR INSERT WITH CHECK (true);

-- Maintenance policies
DROP POLICY IF EXISTS "Users can view maintenance in their tenant" ON tams360.maintenance_records;
CREATE POLICY "Users can view maintenance in their tenant" ON tams360.maintenance_records
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert maintenance in their tenant" ON tams360.maintenance_records;
CREATE POLICY "Users can insert maintenance in their tenant" ON tams360.maintenance_records
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA tams360 TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA tams360 TO postgres, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA tams360 TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA tams360 TO authenticated;

-- Grant permissions on views
GRANT SELECT ON public.tams360_tenants_v TO anon, authenticated, service_role;
GRANT SELECT ON public.tams360_user_profiles_v TO anon, authenticated, service_role;
GRANT SELECT ON public.tams360_asset_types_v TO anon, authenticated, service_role;
GRANT SELECT ON public.tams360_assets_v TO anon, authenticated, service_role;
GRANT SELECT ON public.tams360_inspections_v TO anon, authenticated, service_role;
GRANT SELECT ON public.tams360_maintenance_v TO anon, authenticated, service_role;

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================

-- Verify the setup
SELECT 'Schema created successfully!' as status;
SELECT tablename FROM pg_tables WHERE schemaname = 'tams360';
SELECT viewname FROM pg_views WHERE schemaname = 'public' AND viewname LIKE 'tams360_%';
