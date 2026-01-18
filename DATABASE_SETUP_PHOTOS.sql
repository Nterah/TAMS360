-- ============================================================================
-- ASSET PHOTOS TABLE SETUP
-- ============================================================================
-- This table stores metadata for inspection photos linked to assets
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.asset_photos (
    photo_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES public.assets(asset_id) ON DELETE CASCADE,
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
    
    -- Indexes for performance
    CONSTRAINT unique_asset_photo UNIQUE(asset_id, photo_number, tenant_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_asset_photos_asset_id ON public.asset_photos(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_photos_tenant_id ON public.asset_photos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_photos_photo_type ON public.asset_photos(photo_type);
CREATE INDEX IF NOT EXISTS idx_asset_photos_uploaded_at ON public.asset_photos(uploaded_at DESC);

-- Add main_photo_url column to assets table (if not exists)
ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS main_photo_url TEXT;

-- Enable Row Level Security (RLS)
ALTER TABLE public.asset_photos ENABLE ROW LEVEL SECURITY;

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
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'asset_photos' 
ORDER BY ordinal_position;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'asset_photos';

-- ============================================================================
-- SAMPLE QUERY: Get all photos for an asset with signed URLs
-- ============================================================================
/*
-- This query would be run in the backend (with Supabase client)
-- It shows how to fetch photos and generate signed URLs

SELECT 
    photo_id,
    asset_id,
    photo_number,
    photo_type,
    component_number,
    sub_number,
    photo_url,
    uploaded_at,
    file_size,
    file_type
FROM asset_photos
WHERE asset_id = 'your-asset-id-here'
AND tenant_id = 'your-tenant-id-here'
ORDER BY 
    CASE photo_type
        WHEN 'main' THEN 1
        WHEN 'location' THEN 2
        WHEN 'component' THEN 3
        WHEN 'sub-component' THEN 4
    END,
    component_number NULLS LAST,
    sub_number NULLS LAST;
*/
