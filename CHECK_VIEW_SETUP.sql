-- ============================================================================
-- Check: Verify view setup and create INSTEAD OF triggers if needed
-- ============================================================================

-- Step 1: Check if the view has any triggers
SELECT 
  tgname as trigger_name,
  tgtype,
  proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'maintenance_records'
  AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Step 2: Check the underlying table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'tams360'
  AND table_name = 'maintenance_records'
ORDER BY ordinal_position;

-- Step 3: Create INSTEAD OF INSERT trigger for the view
-- This allows inserting through the view

-- First, create the trigger function
CREATE OR REPLACE FUNCTION public.maintenance_records_insert()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create the INSTEAD OF INSERT trigger
DROP TRIGGER IF EXISTS maintenance_records_insert_trigger ON public.maintenance_records;
CREATE TRIGGER maintenance_records_insert_trigger
  INSTEAD OF INSERT ON public.maintenance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.maintenance_records_insert();

-- Step 4: Create INSTEAD OF UPDATE trigger
CREATE OR REPLACE FUNCTION public.maintenance_records_update()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS maintenance_records_update_trigger ON public.maintenance_records;
CREATE TRIGGER maintenance_records_update_trigger
  INSTEAD OF UPDATE ON public.maintenance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.maintenance_records_update();

-- Step 5: Create INSTEAD OF DELETE trigger
CREATE OR REPLACE FUNCTION public.maintenance_records_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM tams360.maintenance_records
  WHERE maintenance_id = OLD.maintenance_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS maintenance_records_delete_trigger ON public.maintenance_records;
CREATE TRIGGER maintenance_records_delete_trigger
  INSTEAD OF DELETE ON public.maintenance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.maintenance_records_delete();

-- Step 6: Force PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

SELECT 'SUCCESS: INSTEAD OF triggers created for maintenance_records view' as status;
