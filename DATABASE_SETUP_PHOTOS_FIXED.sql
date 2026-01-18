-- ============================================================================
-- ASSET PHOTOS TABLE SETUP (FIXED VERSION)
-- ============================================================================
-- This table stores metadata for inspection photos linked to assets
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Create the asset_photos table WITHOUT foreign key constraint
-- (We'll add validation in application logic instead)
CREATE TABLE IF NOT EXISTS public.asset_photos (
    photo_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL,  -- Removed FK constraint to work with views
    tenant_id UUID NOT NULL,
    
    -- Photo storage
    photo_url TEXT NOT NULL, -- Path in Supabase Storage (not full URL)
    
    -- Photo classification
    photo_number TEXT NOT NULL, -- e.g., "0", "1", "1.1", "6"
    photo_type TEXT NOT NULL CHECK (photo_type IN ('main', 'location', 'component', 'sub-component')),
    component_number INTEGER, -- Component number (1-5)
    sub_number INTEGER, -- Sub-photo number for component (e.g., 1.1 → sub_number=1)
    
    -- Metadata
    file_size BIGINT, -- File size in bytes
    file_type TEXT, -- MIME type (image/jpeg, image/png, etc.)
    caption TEXT, -- Optional photo caption/description
    
    -- Timestamps
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by UUID, -- auth.users.id
    
    -- Unique constraint
    CONSTRAINT unique_asset_photo UNIQUE(asset_id, photo_number, tenant_id)
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_asset_photos_asset_id ON public.asset_photos(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_photos_tenant_id ON public.asset_photos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_photos_photo_type ON public.asset_photos(photo_type);
CREATE INDEX IF NOT EXISTS idx_asset_photos_uploaded_at ON public.asset_photos(uploaded_at DESC);

-- Step 3: Add main_photo_url column to assets (try both table and view)
-- This may fail if assets is a view, but that's okay
DO $$ 
BEGIN
    -- Try to add column to assets table
    ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS main_photo_url TEXT;
EXCEPTION 
    WHEN OTHERS THEN
        -- If it fails (e.g., assets is a view), just continue
        RAISE NOTICE 'Could not add main_photo_url to assets (might be a view): %', SQLERRM;
END $$;

-- Step 4: Enable Row Level Security (RLS)
ALTER TABLE public.asset_photos ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop existing policies if they exist (to avoid duplicates)
DROP POLICY IF EXISTS "Users can view their tenant's asset photos" ON public.asset_photos;
DROP POLICY IF EXISTS "Users can insert asset photos for their tenant" ON public.asset_photos;
DROP POLICY IF EXISTS "Users can update their tenant's asset photos" ON public.asset_photos;
DROP POLICY IF EXISTS "Users can delete their tenant's asset photos" ON public.asset_photos;

-- Step 6: Create RLS Policies

-- RLS Policy: Users can only see photos for their tenant
CREATE POLICY "Users can view their tenant's asset photos" 
ON public.asset_photos FOR SELECT 
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.users 
        WHERE auth_id = auth.uid()
    )
);

-- RLS Policy: Users can insert photos for their tenant
CREATE POLICY "Users can insert asset photos for their tenant" 
ON public.asset_photos FOR INSERT 
WITH CHECK (
    tenant_id IN (
        SELECT tenant_id FROM public.users 
        WHERE auth_id = auth.uid()
    )
);

-- RLS Policy: Users can update their tenant's photos
CREATE POLICY "Users can update their tenant's asset photos" 
ON public.asset_photos FOR UPDATE 
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.users 
        WHERE auth_id = auth.uid()
    )
);

-- RLS Policy: Users can delete their tenant's photos
CREATE POLICY "Users can delete their tenant's asset photos" 
ON public.asset_photos FOR DELETE 
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.users 
        WHERE auth_id = auth.uid()
    )
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if table was created
SELECT 
    table_name, 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'asset_photos' 
ORDER BY ordinal_position;

-- Check RLS is enabled
SELECT 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE tablename = 'asset_photos';

-- Check RLS policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd 
FROM pg_policies 
WHERE tablename = 'asset_photos';

-- Count existing photos (should be 0 initially)
SELECT COUNT(*) as total_photos FROM public.asset_photos;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '✅ asset_photos table created successfully!';
    RAISE NOTICE '✅ Indexes created for performance';
    RAISE NOTICE '✅ Row Level Security enabled';
    RAISE NOTICE '✅ RLS policies created';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Ready to import photos!';
END $$;
