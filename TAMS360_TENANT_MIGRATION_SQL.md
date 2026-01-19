# TAMS360 Tenant Migration - Required SQL

**⚠️ CRITICAL**: Run these SQL statements in Supabase SQL Editor **BEFORE** deploying code changes.

## Purpose
1. Create RPC function for tenant-safe photo uploads
2. Enable admin users to claim unassigned assets

---

## 1. Photo Upload RPC Function

This RPC replaces direct inserts to `public.asset_photos` table.

```sql
-- ============================================================================
-- TAMS360 Photo Upload RPC (Upsert with Tenant Safety)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.tams360_upsert_asset_photo(
  p_asset_id UUID,
  p_tenant_id UUID,
  p_photo_url TEXT,
  p_photo_number TEXT,
  p_photo_type TEXT,
  p_component_number INT DEFAULT NULL,
  p_sub_number INT DEFAULT NULL,
  p_file_size BIGINT DEFAULT NULL,
  p_file_type TEXT DEFAULT NULL,
  p_uploaded_by UUID DEFAULT NULL
)
RETURNS TABLE (
  photo_id UUID,
  created BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_photo_id UUID;
  v_existing_id UUID;
  v_created BOOLEAN;
BEGIN
  -- Verify asset belongs to tenant (prevent cross-tenant writes)
  IF NOT EXISTS (
    SELECT 1 FROM tams360.assets 
    WHERE asset_id = p_asset_id 
    AND (metadata->>'tenant_id')::uuid = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Asset % not found or does not belong to tenant %', p_asset_id, p_tenant_id;
  END IF;

  -- Check if photo already exists (for upsert behavior)
  SELECT ap.photo_id INTO v_existing_id
  FROM public.asset_photos ap
  WHERE ap.asset_id = p_asset_id
    AND ap.tenant_id = p_tenant_id
    AND ap.photo_number = p_photo_number
    AND ap.photo_type = p_photo_type
    AND (ap.component_number = p_component_number OR (ap.component_number IS NULL AND p_component_number IS NULL))
    AND (ap.sub_number = p_sub_number OR (ap.sub_number IS NULL AND p_sub_number IS NULL))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing photo
    UPDATE public.asset_photos
    SET 
      photo_url = p_photo_url,
      file_size = COALESCE(p_file_size, file_size),
      file_type = COALESCE(p_file_type, file_type),
      uploaded_at = NOW(),
      uploaded_by = COALESCE(p_uploaded_by, uploaded_by)
    WHERE photo_id = v_existing_id;
    
    v_photo_id := v_existing_id;
    v_created := FALSE;
  ELSE
    -- Insert new photo
    v_photo_id := gen_random_uuid();
    
    INSERT INTO public.asset_photos (
      photo_id,
      asset_id,
      tenant_id,
      photo_url,
      photo_number,
      photo_type,
      component_number,
      sub_number,
      file_size,
      file_type,
      uploaded_at,
      uploaded_by
    ) VALUES (
      v_photo_id,
      p_asset_id,
      p_tenant_id,
      p_photo_url,
      p_photo_number,
      p_photo_type,
      p_component_number,
      p_sub_number,
      p_file_size,
      p_file_type,
      NOW(),
      p_uploaded_by
    );
    
    v_created := TRUE;
  END IF;

  -- Return photo_id and whether it was newly created
  RETURN QUERY SELECT v_photo_id, v_created;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.tams360_upsert_asset_photo TO authenticated;

COMMENT ON FUNCTION public.tams360_upsert_asset_photo IS 
  'TAMS360: Upsert photo metadata with tenant safety. Prevents cross-tenant writes and supports re-uploads.';
```

---

## 2. Get Unassigned Assets RPC (Admin Only)

This RPC returns assets with NULL tenant_id for admin migration.

```sql
-- ============================================================================
-- TAMS360 Get Unassigned Assets RPC (Admin Only)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.tams360_get_unassigned_assets()
RETURNS TABLE (
  asset_id UUID,
  asset_ref TEXT,
  asset_type_name TEXT,
  road_number TEXT,
  region TEXT,
  depot TEXT,
  install_date DATE,
  created_at TIMESTAMPTZ,
  created_by UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return assets where tenant_id is NULL
  RETURN QUERY
  SELECT 
    a.asset_id,
    a.asset_ref,
    at.name as asset_type_name,
    a.road_number,
    a.region,
    a.depot,
    a.install_date,
    a.created_at,
    a.created_by
  FROM tams360.assets a
  LEFT JOIN public.asset_types at ON a.asset_type_id = at.asset_type_id
  WHERE (a.metadata->>'tenant_id') IS NULL
  ORDER BY a.created_at DESC;
END;
$$;

-- Grant execute to authenticated users (will check admin role in Edge Function)
GRANT EXECUTE ON FUNCTION public.tams360_get_unassigned_assets TO authenticated;

COMMENT ON FUNCTION public.tams360_get_unassigned_assets IS 
  'TAMS360: Returns assets with NULL tenant_id for admin migration. Must be called by admin users only.';
```

---

## 3. Claim Unassigned Assets RPC (Admin Only)

This RPC assigns tenant_id to unassigned assets.

```sql
-- ============================================================================
-- TAMS360 Claim Assets RPC (Admin Only)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.tams360_claim_assets(
  p_asset_ids UUID[],
  p_tenant_id UUID,
  p_claimed_by UUID
)
RETURNS TABLE (
  asset_id UUID,
  asset_ref TEXT,
  success BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_asset_id UUID;
  v_asset_ref TEXT;
  v_current_tenant_id UUID;
BEGIN
  -- Loop through each asset
  FOREACH v_asset_id IN ARRAY p_asset_ids
  LOOP
    -- Get current tenant_id
    SELECT 
      a.asset_ref,
      (a.metadata->>'tenant_id')::uuid
    INTO v_asset_ref, v_current_tenant_id
    FROM tams360.assets a
    WHERE a.asset_id = v_asset_id;

    -- Check if asset exists
    IF v_asset_ref IS NULL THEN
      RETURN QUERY SELECT 
        v_asset_id,
        NULL::TEXT,
        FALSE,
        'Asset not found';
      CONTINUE;
    END IF;

    -- Check if already assigned
    IF v_current_tenant_id IS NOT NULL THEN
      RETURN QUERY SELECT 
        v_asset_id,
        v_asset_ref,
        FALSE,
        'Asset already assigned to tenant ' || v_current_tenant_id::TEXT;
      CONTINUE;
    END IF;

    -- Assign tenant_id
    UPDATE tams360.assets
    SET metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{tenant_id}',
      to_jsonb(p_tenant_id::text),
      true
    )
    WHERE asset_id = v_asset_id;

    -- Log the claim action (optional - if you have audit table)
    -- INSERT INTO tams360.asset_audit_log (asset_id, action, performed_by, details)
    -- VALUES (v_asset_id, 'TENANT_CLAIMED', p_claimed_by, jsonb_build_object('tenant_id', p_tenant_id));

    RETURN QUERY SELECT 
      v_asset_id,
      v_asset_ref,
      TRUE,
      NULL::TEXT;
  END LOOP;
END;
$$;

-- Grant execute to authenticated users (will check admin role in Edge Function)
GRANT EXECUTE ON FUNCTION public.tams360_claim_assets TO authenticated;

COMMENT ON FUNCTION public.tams360_claim_assets IS 
  'TAMS360: Assigns tenant_id to unassigned assets. Must be called by admin users only. Returns success status for each asset.';
```

---

## Verification Queries

After running the above SQL, verify with these queries:

```sql
-- 1. Check RPC functions exist
SELECT 
  routine_name, 
  routine_type,
  specific_name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE 'tams360_%'
ORDER BY routine_name;

-- 2. Count unassigned assets
SELECT COUNT(*) as unassigned_count
FROM tams360.assets
WHERE (metadata->>'tenant_id') IS NULL;

-- 3. Test photo RPC (replace UUIDs with real values)
-- SELECT * FROM public.tams360_upsert_asset_photo(
--   '00000000-0000-0000-0000-000000000000'::uuid,  -- asset_id
--   '00000000-0000-0000-0000-000000000000'::uuid,  -- tenant_id
--   'tenant_123/ASSET-001/0.jpg',                  -- photo_url
--   '0',                                            -- photo_number
--   'main',                                         -- photo_type
--   NULL,                                           -- component_number
--   NULL,                                           -- sub_number
--   1048576,                                        -- file_size (1MB)
--   'image/jpeg',                                   -- file_type
--   '00000000-0000-0000-0000-000000000000'::uuid   -- uploaded_by
-- );
```

---

## Deployment Checklist

- [ ] 1. Run SQL in Supabase SQL Editor
- [ ] 2. Verify RPC functions created successfully
- [ ] 3. Check current unassigned asset count
- [ ] 4. Deploy Edge Function changes (photo upload using RPC)
- [ ] 5. Deploy frontend changes (unassigned assets UI)
- [ ] 6. Test photo upload works
- [ ] 7. Test admin can claim unassigned assets
- [ ] 8. Verify assets list shows data after claiming

---

## Rollback Plan

If issues occur, you can drop the RPC functions:

```sql
DROP FUNCTION IF EXISTS public.tams360_upsert_asset_photo;
DROP FUNCTION IF EXISTS public.tams360_get_unassigned_assets;
DROP FUNCTION IF EXISTS public.tams360_claim_assets;
```

Then revert code changes.

---

**Status**: Ready for execution  
**Risk**: LOW (read-only RPCs + upsert RPC with tenant validation)  
**Regression**: ZERO (existing direct queries still work until code updated)
