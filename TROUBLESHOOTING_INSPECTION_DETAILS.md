# Troubleshooting Guide - Inspection Details & Edit

## Common Issues and Solutions

---

## Issue 1: Component Names Show as "Component 1", "Component 2"

**Symptom:** Generic names instead of "Foundation", "Post", etc.

**Cause:** Component template not found or component_name field is null

**Fix:**
1. Check if template exists:
```sql
SELECT * FROM tams360.asset_component_templates
WHERE asset_type_id = (
  SELECT asset_type_id FROM tams360.assets WHERE asset_ref = 'YOUR-ASSET-REF'
) AND is_active = true;
```

2. If no template, initialize templates:
   - Go to Admin Console
   - Click "Initialize Default Templates"
   - Wait for success message
   - Refresh inspection page

3. If template exists but names still missing, check component scores:
```sql
SELECT component_name, degree_value, extent_value
FROM tams360.inspection_component_scores
WHERE inspection_id = 'YOUR-INSPECTION-ID';
```

4. If `component_name` is null, update manually or re-run import script

---

## Issue 2: "What to Inspect" Text Not Showing

**Symptom:** Missing guidance text for components

**Cause:** Template items don't have `what_to_inspect` populated

**Fix:**
```sql
-- Check template items
SELECT component_name, what_to_inspect
FROM tams360.asset_component_template_items
WHERE template_id = (
  SELECT template_id FROM tams360.asset_component_templates
  WHERE asset_type_id = 'YOUR-ASSET-TYPE-ID' AND is_active = true
);

-- Update if missing
UPDATE tams360.asset_component_template_items
SET what_to_inspect = 'Check concrete base for cracks, settlement, and structural integrity'
WHERE component_name = 'Foundation' AND template_id = 'YOUR-TEMPLATE-ID';
```

---

## Issue 3: Rubric Tooltips Are Empty

**Symptom:** Hovering over D/E/R info icons shows no text

**Cause:** Rubric JSON fields are null or malformed

**Fix:**
```sql
-- Check rubric structure
SELECT 
  component_name,
  degree_rubric,
  extent_rubric,
  relevancy_rubric
FROM tams360.asset_component_template_items
WHERE template_id = 'YOUR-TEMPLATE-ID';

-- Update rubric if missing (example for degree)
UPDATE tams360.asset_component_template_items
SET degree_rubric = '{
  "0": "No defect - asset in perfect condition",
  "1": "Slight defect - minor cosmetic issues only",
  "2": "Minor defect - some deterioration present",
  "3": "Moderate defect - significant issues requiring attention",
  "4": "Severe defect - major structural or safety concerns",
  "X": "Not applicable for this component type",
  "U": "Unable to inspect due to access or safety constraints"
}'::jsonb
WHERE component_name = 'Foundation' AND template_id = 'YOUR-TEMPLATE-ID';
```

**Standard Rubric Template:**
```json
{
  "degree_rubric": {
    "0": "No defect",
    "1": "Slight defect",
    "2": "Minor defect",
    "3": "Moderate defect",
    "4": "Severe defect",
    "X": "Not applicable",
    "U": "Unable to inspect"
  },
  "extent_rubric": {
    "1": "0-5% of component affected",
    "2": "5-25% of component affected",
    "3": "25-50% of component affected",
    "4": "50-75% of component affected",
    "5": "75-100% of component affected",
    "U": "Unable to assess extent"
  },
  "relevancy_rubric": {
    "1": "Low priority - cosmetic/aesthetic concern",
    "2": "Medium priority - functional degradation",
    "3": "High priority - safety or structural risk",
    "4": "Critical - immediate intervention required",
    "U": "Unable to determine relevancy"
  }
}
```

---

## Issue 4: Edit Inspection Fails with "Failed to update inspection"

**Symptom:** Error message when saving changes

**Possible Causes & Fixes:**

### A. Table Name Error
**Error in console:** `relation "inspections" does not exist`

**Fix:** Backend should use `tams360.inspections` (already fixed in our update)

### B. Field Name Mismatch
**Error in console:** `column "degree" does not exist`

**Fix:** Ensure component scores use correct field names:
- `degree_value` (not `degree`)
- `extent_value` (not `extent`)
- `relevancy_value` (not `relevancy`)
- `component_score` (not `conditional_index`)
- `quantity_unit` (not `unit`)
- `component_cost` (not `cost`)
- `component_notes` (not `comments`)
- `urgency_token` (not `urgency`)

### C. Missing Required Fields
**Error in console:** `null value in column "tenant_id" violates not-null constraint`

**Fix:** Add tenant_id in backend insert:
```typescript
const componentScores = inspection.component_scores.map((score: any) => ({
  inspection_id: inspectionId,
  tenant_id: userData.user.user_metadata.tenant_id, // ADD THIS
  component_name: score.component_name,
  // ... rest of fields
}));
```

### D. Foreign Key Violation
**Error in console:** `insert or update on table "inspection_component_scores" violates foreign key constraint`

**Fix:** Ensure inspection exists before inserting components:
```typescript
// Check inspection exists
const { data: existingInspection } = await supabase
  .from("tams360.inspections")
  .select("inspection_id")
  .eq("inspection_id", inspectionId)
  .single();

if (!existingInspection) {
  return c.json({ error: "Inspection not found" }, 404);
}
```

---

## Issue 5: Delete Inspection Fails

**Symptom:** "Failed to delete inspection" error

**Cause:** Foreign key constraint - component scores must be deleted first

**Fix:** Already implemented in our update:
```typescript
// Delete component scores FIRST
await supabase
  .from("tams360.inspection_component_scores")
  .delete()
  .eq("inspection_id", inspectionId);

// Then delete inspection
await supabase
  .from("tams360.inspections")
  .delete()
  .eq("inspection_id", inspectionId);
```

If still failing, check for other foreign keys:
```sql
-- Find all foreign keys pointing to inspections
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  a.attname AS column_name,
  confrelid::regclass AS foreign_table_name,
  af.attname AS foreign_column_name
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE confrelid = 'tams360.inspections'::regclass;
```

---

## Issue 6: Components Not Loading on Detail Page

**Symptom:** "No components to display" or empty component section

**Diagnostic Steps:**

1. Check if inspection has component scores:
```sql
SELECT COUNT(*) 
FROM tams360.inspection_component_scores
WHERE inspection_id = 'YOUR-INSPECTION-ID';
```

2. Check if view is accessible:
```sql
SELECT * FROM public.tams360_inspection_components_app
WHERE inspection_id = 'YOUR-INSPECTION-ID'
ORDER BY component_order;
```

3. Check backend response:
```bash
# Open browser console (F12)
# Go to Network tab
# Load inspection detail page
# Look for request to /inspections/:id
# Check response JSON
```

4. Verify component array in response:
```json
{
  "inspection": {
    "components": [  // Should be an array with items
      {
        "component_order": 1,
        "component_name": "Foundation",
        "degree_value": "2",
        // ... more fields
      }
    ]
  }
}
```

**If array is empty but DB has data:**
- Check backend mapping logic
- Verify `order by component_order` in query
- Check RLS policies on view

---

## Issue 7: CI Values Out of Range (Not 0-100)

**Symptom:** CI showing as 150 or negative numbers

**Cause:** Calculation error or incorrect data type

**Fix:**

1. Check stored values:
```sql
SELECT 
  inspection_id,
  conditional_index,
  calculation_metadata
FROM tams360.inspections
WHERE conditional_index > 100 OR conditional_index < 0;
```

2. Recalculate if needed:
```sql
-- Example: Clamp CI to 0-100 range
UPDATE tams360.inspections
SET conditional_index = GREATEST(0, LEAST(100, conditional_index))
WHERE conditional_index > 100 OR conditional_index < 0;
```

3. Check component CIs:
```sql
SELECT 
  inspection_id,
  component_name,
  component_score
FROM tams360.inspection_component_scores
WHERE component_score > 100 OR component_score < 0;
```

4. Verify calculation logic in backend (should clamp to 0-100)

---

## Issue 8: Urgency Calculation Seems Wrong

**Symptom:** Expected "High" but showing "Medium"

**Debug Steps:**

1. Check D/E/R values:
```sql
SELECT 
  component_name,
  degree_value,
  extent_value,
  relevancy_value,
  urgency_token
FROM tams360.inspection_component_scores
WHERE inspection_id = 'YOUR-INSPECTION-ID';
```

2. Manually trace decision tree:
```
If any D/E/R = 'U' → U
If D = 'X' or '0' → R
If R = '4' → 4
If R = '3':
  If D ≥ 3 AND E ≥ 4 → 4
  If D ≥ 3 OR E ≥ 3 → 3
  Else → 2
...etc
```

3. Check worst urgency calculation:
```sql
-- Should return max numeric urgency
SELECT 
  inspection_id,
  MAX(CASE 
    WHEN urgency_token ~ '^[0-4]$' 
    THEN urgency_token::integer 
    ELSE NULL 
  END) as worst_numeric_urgency
FROM tams360.inspection_component_scores
WHERE inspection_id = 'YOUR-INSPECTION-ID'
GROUP BY inspection_id;
```

4. Verify stored calculated_urgency:
```sql
SELECT 
  inspection_id,
  calculated_urgency,
  calculation_metadata
FROM tams360.inspections
WHERE inspection_id = 'YOUR-INSPECTION-ID';
```

---

## Issue 9: Photos Not Showing

**Symptom:** Photo link missing even though photo_url has value

**Diagnostic:**
```sql
SELECT 
  component_name,
  photo_url
FROM tams360.inspection_component_scores
WHERE inspection_id = 'YOUR-INSPECTION-ID'
  AND photo_url IS NOT NULL;
```

**Possible Causes:**

1. **URL is invalid:** Check if URL is accessible
2. **Storage bucket is private:** Generate signed URL
3. **Frontend not rendering:** Check component code:

```typescript
{comp.photo_url && (
  <div className="flex items-center gap-2 p-3 bg-background rounded border">
    <ImageIcon className="w-4 h-4 text-muted-foreground" />
    <a 
      href={comp.photo_url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="text-sm text-primary hover:underline"
    >
      View Photo
    </a>
  </div>
)}
```

---

## Issue 10: Offline Sync Not Working

**Symptom:** Changes made offline don't sync when back online

**Debug Steps:**

1. Check IndexedDB has pending items:
```javascript
// In browser console
indexedDB.databases().then(console.log);
```

2. Check OfflineContext state:
```javascript
// Add console log in OfflineContext
console.log('Pending items:', pendingItems);
console.log('Is online:', isOnline);
```

3. Verify sync logic runs on reconnect:
```typescript
useEffect(() => {
  if (isOnline && pendingItems.length > 0 && !isSyncing) {
    syncNow();
  }
}, [isOnline]);
```

4. Check for network errors in console

---

## Useful Diagnostic Queries

### 1. Full Inspection with Components
```sql
SELECT 
  i.inspection_id,
  i.asset_id,
  a.asset_ref,
  at.name as asset_type,
  i.inspection_date,
  i.conditional_index as ci,
  i.calculated_urgency,
  json_agg(
    json_build_object(
      'component_name', ics.component_name,
      'degree', ics.degree_value,
      'extent', ics.extent_value,
      'relevancy', ics.relevancy_value,
      'ci', ics.component_score,
      'urgency', ics.urgency_token
    ) ORDER BY ics.created_at
  ) as components
FROM tams360.inspections i
JOIN tams360.assets a ON i.asset_id = a.asset_id
JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id
LEFT JOIN tams360.inspection_component_scores ics ON i.inspection_id = ics.inspection_id
WHERE i.inspection_id = 'YOUR-INSPECTION-ID'
GROUP BY i.inspection_id, a.asset_ref, at.name;
```

### 2. Template with Items
```sql
SELECT 
  at.name as asset_type,
  act.template_id,
  act.is_active,
  json_agg(
    json_build_object(
      'component_name', acti.component_name,
      'order', acti.component_order,
      'what_to_inspect', acti.what_to_inspect,
      'has_degree_rubric', (acti.degree_rubric IS NOT NULL),
      'has_extent_rubric', (acti.extent_rubric IS NOT NULL),
      'has_relevancy_rubric', (acti.relevancy_rubric IS NOT NULL)
    ) ORDER BY acti.component_order
  ) as template_items
FROM tams360.asset_types at
JOIN tams360.asset_component_templates act ON at.asset_type_id = act.asset_type_id
LEFT JOIN tams360.asset_component_template_items acti ON act.template_id = acti.template_id
WHERE at.name = 'YOUR-ASSET-TYPE'
  AND act.is_active = true
GROUP BY at.name, act.template_id, act.is_active;
```

### 3. CI Calculation Verification
```sql
WITH component_calcs AS (
  SELECT 
    inspection_id,
    component_name,
    degree_value::integer as d,
    extent_value::integer as e,
    relevancy_value::integer as r,
    component_score as stored_ci,
    ROUND(
      100 * (
        1 - (
          0.5 * (degree_value::integer / 3.0) +
          0.25 * ((extent_value::integer - 1) / 3.0) +
          0.25 * ((relevancy_value::integer - 1) / 3.0)
        )
      )
    ) as calculated_ci
  FROM tams360.inspection_component_scores
  WHERE inspection_id = 'YOUR-INSPECTION-ID'
    AND degree_value ~ '^[0-4]$'
    AND extent_value ~ '^[1-5]$'
    AND relevancy_value ~ '^[1-4]$'
)
SELECT 
  *,
  (stored_ci = calculated_ci) as ci_matches
FROM component_calcs;
```

---

## Performance Issues

### Slow Loading of Inspection Details

**If inspection detail page takes >2 seconds to load:**

1. Check view performance:
```sql
EXPLAIN ANALYZE
SELECT * FROM public.tams360_inspection_components_app
WHERE inspection_id = 'YOUR-INSPECTION-ID';
```

2. Add indexes if missing:
```sql
CREATE INDEX IF NOT EXISTS idx_comp_scores_inspection 
ON tams360.inspection_component_scores(inspection_id);

CREATE INDEX IF NOT EXISTS idx_inspections_asset 
ON tams360.inspections(asset_id);
```

3. Check template query performance:
```sql
EXPLAIN ANALYZE
SELECT * FROM tams360.asset_component_templates
WHERE asset_type_id = 'YOUR-ASSET-TYPE-ID' AND is_active = true;
```

---

## Browser Console Errors

### "NetworkError when attempting to fetch resource"
- Check API URL is correct
- Verify backend is running
- Check CORS headers in backend

### "Unexpected token < in JSON at position 0"
- Backend returning HTML error page instead of JSON
- Check backend route exists
- Check authentication headers

### "Cannot read property 'components' of undefined"
- Inspection data structure changed
- Check API response format
- Add null checks in frontend

---

## Need More Help?

1. **Check Console Logs:** Both browser console (F12) and server logs
2. **Use Network Tab:** See actual API requests and responses
3. **Query Database Directly:** Verify data exists and is correct
4. **Check Documentation:** See INSPECTION_DETAILS_FIX_SUMMARY.md
5. **Review Backend Code:** Look at `/supabase/functions/server/index.tsx`

---

## Quick Fixes Checklist

- [ ] Component templates initialized
- [ ] Rubrics populated in template items
- [ ] Views accessible (SELECT permission granted)
- [ ] Base tables writable (INSERT/UPDATE/DELETE permission)
- [ ] RLS policies allow tenant access
- [ ] Backend routes use correct table names (tams360.*)
- [ ] Backend routes use correct field names (_value, _unit, _score, etc.)
- [ ] Foreign keys handled correctly (delete components before inspection)
- [ ] Indexes exist on frequently queried columns
- [ ] Frontend maps API response correctly
- [ ] Tooltips have content to display
- [ ] Offline context provider wraps app
- [ ] Auth token passed in headers

---

## Still Having Issues?

Document the following and review code:

1. **Exact error message** (from console)
2. **API request URL** (from Network tab)
3. **API response** (full JSON from Network tab)
4. **Database query results** (run diagnostic queries above)
5. **Expected vs actual behavior** (what should happen, what actually happens)
6. **Steps to reproduce** (exact clicks/actions to trigger issue)

Then trace through code path:
- Frontend component → API call → Backend route → Database query → Response mapping → Frontend rendering
