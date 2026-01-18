-- ============================================================================
-- ASSET PHOTOS TABLE SETUP (MINIMAL - NO RLS)
-- ============================================================================
-- This version creates the table WITHOUT Row Level Security
-- We'll handle permissions in the application code instead

-- Step 1: Create the asset_photos table
DROP TABLE IF EXISTS public.asset_photos CASCADE;

CREATE TABLE public.asset_photos (
    photo_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    
    -- Photo storage
    photo_url TEXT NOT NULL,
    
    -- Photo classification
    photo_number TEXT NOT NULL,
    photo_type TEXT NOT NULL CHECK (photo_type IN ('main', 'location', 'component', 'sub-component')),
    component_number INTEGER,
    sub_number INTEGER,
    
    -- Metadata
    file_size BIGINT,
    file_type TEXT,
    caption TEXT,
    
    -- Timestamps
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by UUID,
    
    -- Unique constraint
    CONSTRAINT unique_asset_photo UNIQUE(asset_id, photo_number, tenant_id)
);

-- Step 2: Create indexes
CREATE INDEX idx_asset_photos_asset_id ON public.asset_photos(asset_id);
CREATE INDEX idx_asset_photos_tenant_id ON public.asset_photos(tenant_id);
CREATE INDEX idx_asset_photos_photo_type ON public.asset_photos(photo_type);
CREATE INDEX idx_asset_photos_uploaded_at ON public.asset_photos(uploaded_at DESC);

-- Step 3: Grant permissions (allow authenticated users to access)
GRANT ALL ON public.asset_photos TO authenticated;
GRANT ALL ON public.asset_photos TO service_role;

-- Step 4: Add main_photo_url column to assets (if possible)
DO $$ 
BEGIN
    -- Try to find and update the assets table/view
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assets') THEN
        -- Try to add column (will fail silently if it's a view)
        BEGIN
            EXECUTE 'ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS main_photo_url TEXT';
            RAISE NOTICE '✅ Added main_photo_url column to assets table';
        EXCEPTION 
            WHEN OTHERS THEN
                RAISE NOTICE 'ℹ️ Could not add main_photo_url to assets (might be a view)';
        END;
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show table structure
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'asset_photos' 
ORDER BY ordinal_position;

-- Show indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'asset_photos';

-- Check permissions
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'asset_photos';

-- Count rows (should be 0)
SELECT COUNT(*) as total_rows FROM public.asset_photos;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '✅ SUCCESS! asset_photos table created';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Table created: asset_photos';
    RAISE NOTICE '✅ Indexes created: 4 indexes';
    RAISE NOTICE '✅ Permissions granted: authenticated + service_role';
    RAISE NOTICE 'ℹ️ RLS disabled: Tenant isolation handled in app code';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Ready to import photos!';
    RAISE NOTICE '';
END $$;
