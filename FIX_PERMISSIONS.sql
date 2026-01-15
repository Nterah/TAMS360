-- ============================================================================
-- Fix: Add SECURITY DEFINER to trigger functions for permission elevation
-- ============================================================================
-- The trigger functions need SECURITY DEFINER to access tams360 schema
-- This allows them to run with the privileges of the function owner (postgres)
-- instead of the calling user (authenticated/anon)

-- DROP existing triggers first
DROP TRIGGER IF EXISTS maintenance_records_insert_trigger ON public.maintenance_records;
DROP TRIGGER IF EXISTS maintenance_records_update_trigger ON public.maintenance_records;
DROP TRIGGER IF EXISTS maintenance_records_delete_trigger ON public.maintenance_records;

-- RECREATE INSERT TRIGGER FUNCTION with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.maintenance_records_insert()
RETURNS TRIGGER 
SECURITY DEFINER  -- ✅ This runs with owner's privileges
SET search_path = public, tams360  -- ✅ Security: lock down search path
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO tams360.maintenance_records (
    asset_id,
    tenant_id,
    inspection_id,
    work_order_number,
    maintenance_type,
    description,
    scheduled_date,
    completed_date,
    status,
    assigned_to,
    estimated_cost,
    actual_cost,
    urgency_id,
    contractor_name,
    notes,
    metadata,
    created_by
  ) VALUES (
    NEW.asset_id,
    NEW.tenant_id,
    NEW.inspection_id,
    NEW.work_order_number,
    NEW.maintenance_type,
    NEW.description,
    NEW.scheduled_date,
    NEW.completed_date,
    COALESCE(NEW.status, 'Scheduled'),
    NEW.assigned_to,
    NEW.estimated_cost,
    NEW.actual_cost,
    NEW.urgency_id,
    NEW.contractor_name,
    NEW.notes,
    NEW.metadata,
    NEW.created_by
  )
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$;

-- RECREATE UPDATE TRIGGER FUNCTION with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.maintenance_records_update()
RETURNS TRIGGER 
SECURITY DEFINER  -- ✅ This runs with owner's privileges
SET search_path = public, tams360  -- ✅ Security: lock down search path
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE tams360.maintenance_records
  SET
    asset_id = NEW.asset_id,
    tenant_id = NEW.tenant_id,
    inspection_id = NEW.inspection_id,
    work_order_number = NEW.work_order_number,
    maintenance_type = NEW.maintenance_type,
    description = NEW.description,
    scheduled_date = NEW.scheduled_date,
    completed_date = NEW.completed_date,
    status = NEW.status,
    assigned_to = NEW.assigned_to,
    estimated_cost = NEW.estimated_cost,
    actual_cost = NEW.actual_cost,
    urgency_id = NEW.urgency_id,
    contractor_name = NEW.contractor_name,
    notes = NEW.notes,
    metadata = NEW.metadata,
    updated_at = NOW()
  WHERE maintenance_id = OLD.maintenance_id;
  
  RETURN NEW;
END;
$$;

-- RECREATE DELETE TRIGGER FUNCTION with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.maintenance_records_delete()
RETURNS TRIGGER 
SECURITY DEFINER  -- ✅ This runs with owner's privileges
SET search_path = public, tams360  -- ✅ Security: lock down search path
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM tams360.maintenance_records
  WHERE maintenance_id = OLD.maintenance_id;
  
  RETURN OLD;
END;
$$;

-- RECREATE all triggers
CREATE TRIGGER maintenance_records_insert_trigger
  INSTEAD OF INSERT ON public.maintenance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.maintenance_records_insert();

CREATE TRIGGER maintenance_records_update_trigger
  INSTEAD OF UPDATE ON public.maintenance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.maintenance_records_update();

CREATE TRIGGER maintenance_records_delete_trigger
  INSTEAD OF DELETE ON public.maintenance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.maintenance_records_delete();

-- Grant EXECUTE permissions on the trigger functions
GRANT EXECUTE ON FUNCTION public.maintenance_records_insert() TO authenticated;
GRANT EXECUTE ON FUNCTION public.maintenance_records_update() TO authenticated;
GRANT EXECUTE ON FUNCTION public.maintenance_records_delete() TO authenticated;
GRANT EXECUTE ON FUNCTION public.maintenance_records_insert() TO anon;
GRANT EXECUTE ON FUNCTION public.maintenance_records_update() TO anon;
GRANT EXECUTE ON FUNCTION public.maintenance_records_delete() TO anon;

-- Force PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- Verify trigger functions are set up correctly
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  CASE 
    WHEN p.prosecdef THEN 'SECURITY DEFINER ✅'
    ELSE 'SECURITY INVOKER ❌'
  END as security_type
FROM pg_proc p
WHERE p.proname LIKE 'maintenance_records_%'
ORDER BY p.proname;

SELECT 'SUCCESS: Trigger functions now have SECURITY DEFINER' as status;
