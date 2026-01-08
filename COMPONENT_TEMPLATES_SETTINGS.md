# Component Templates Settings Implementation

## Summary

Successfully implemented a comprehensive Component Templates Settings page where administrators can view, manage, and configure inspection component templates for each asset type. The system now properly displays component names (e.g., "Foundation", "Holding Bolts / Base Plates", "Post / Vertical Member") instead of generic placeholders like "Component 1", "Component 2", etc.

## What Was Implemented

### 1. **Component Templates Settings Page** (`/admin/component-templates`)

A dedicated admin page that displays:
- All component templates organized by asset type (Signage, Guardrail, Traffic Signal, etc.)
- Component details including:
  - Component name (e.g., "Foundation (if applicable)")
  - What to inspect (inspection criteria)
  - Degree rubric (condition severity scoring)
  - Extent rubric (how widespread scoring)
  - Relevancy rubric (functional importance scoring)
  - Quantity unit (each, m, m², etc.)
- Expandable/collapsible cards for each asset type
- Edit functionality for component names and inspection criteria
- Inspector Guide reference tab with visual examples

### 2. **Backend API Routes**

Added three new routes to `/supabase/functions/server/index.tsx`:

#### a) **GET `/component-templates`** - Fetch All Templates
```typescript
GET /make-server-c894a9ff/component-templates
```
Returns all component templates with their items, properly joined with asset types to include asset type names.

#### b) **PUT `/component-templates/:templateId/items/:itemId`** - Update Component
```typescript
PUT /make-server-c894a9ff/component-templates/:templateId/items/:itemId
```
Allows updating:
- `component_name` - Display name of the component
- `what_to_inspect` - Inspection criteria description
- `quantity_unit` - Unit of measurement

### 3. **Navigation Integration**

- Added route in `/src/app/App.tsx`: `/admin/component-templates`
- Added "Component Templates" button in Admin Console header
- Only accessible to admin users

### 4. **Inspector Guide Reference**

Integrated the provided Inspector Guide images showing:
- Signage Condition Assessment table with D/E/R rubrics
- Component names as defined in industry standards:
  1. **Foundation (if applicable)** - Concrete base/footing condition
  2. **Holding Bolts / Base Plates (if applicable)** - Anchor bolts and mounting hardware
  3. **Post / Vertical Member (if applicable)** - Sign post structural integrity
  4. **Face / Panel (if applicable)** - Sign face condition and readability
  5. **Face Fasteners (if applicable)** - Bolts/clips securing the sign face
  6. **Nearby Vegetation (if applicable)** - Obstructions affecting visibility

## Component Names Are Now Correct

The component names are properly stored in the database via the seed data in `/DATABASE_SCHEMA_ENHANCEMENTS.sql`. These names are now displayed correctly in:

1. **Inspection Details Page** - Shows component names in each component card
2. **Edit Inspection Page** - Uses component names from template
3. **New Inspection Page** - Loads template with proper component names
4. **Component Templates Settings** - Displays and allows editing of component names

## Database Schema

Component templates are stored in two tables:

### `tams360.asset_component_templates`
- `template_id` - Unique template identifier
- `asset_type_id` - Links to asset type (Signage, Guardrail, etc.)
- `template_name` - Template name
- `description` - Template description
- `version` - Version number
- `is_active` - Whether template is currently active

### `tams360.asset_component_template_items`
- `item_id` - Unique item identifier
- `template_id` - Links to parent template
- `component_name` - **Component display name** (e.g., "Foundation")
- `component_order` - Display order (1-6 for Signage)
- `what_to_inspect` - Inspection criteria
- `degree_rubric` - JSON object with D scoring options
- `extent_rubric` - JSON object with E scoring options
- `relevancy_rubric` - JSON object with R scoring options
- `quantity_unit` - Unit of measurement (each, m, m², etc.)

## How It Works

### Inspection Flow with Component Names

1. **Creating New Inspection**
   - User selects an asset (e.g., a Signage asset)
   - System fetches component template for "Signage" asset type
   - Template includes 6 components with proper names
   - Component inspection form displays "Foundation", "Holding Bolts/Base Plates", etc.

2. **Saving Inspection**
   - Component scores are saved to `tams360.inspection_component_scores`
   - Each score includes `component_name` field (denormalized for reporting)
   - Component names are stored alongside D/E/R values

3. **Viewing Inspection**
   - System reads from `public.tams360_inspections_v` view
   - View joins inspection data with component scores
   - Component names are displayed from saved data

4. **Editing Inspection**
   - Loads existing component scores with names
   - Fetches template to get rubric information
   - Matches saved components with template items

### Customization Flow

1. **Admin Opens Component Templates Settings**
   - Navigates to `/admin/component-templates`
   - Views all templates organized by asset type

2. **Editing a Component**
   - Clicks Edit button on any component
   - Can modify:
     - Component name (e.g., change "Foundation" to "Foundation/Base")
     - What to inspect description
     - Quantity unit
   - Rubric editing requires database access (intentional security measure)

3. **Changes Take Effect**
   - New inspections use updated component names
   - Existing inspections retain their original component names (historical data integrity)

## Example Component Template (Signage)

```json
{
  "asset_type_name": "Signage",
  "template_name": "Signage Condition Assessment",
  "description": "Inspector Guide: Signage Condition Assessment (One Sign at a Time)",
  "version": 1,
  "is_active": true,
  "items": [
    {
      "component_order": 1,
      "component_name": "Foundation",
      "what_to_inspect": "Cracks, erosion, movement, exposed base.",
      "degree_rubric": {
        "X": "Not present",
        "U": "Unable to Inspect",
        "0": "Stable",
        "1": "Minor cracks",
        "2": "Partial base failure",
        "3": "Significant instability"
      },
      "extent_rubric": {
        "1": "Minor spot",
        "2": "Several cracks",
        "3": "Large section",
        "4": "Entire base compromised"
      },
      "relevancy_rubric": {
        "1": "Aesthetic",
        "2": "Slight instability",
        "3": "Risk of leaning/fail",
        "4": "Unsafe"
      },
      "quantity_unit": "each"
    },
    // ... 5 more components
  ]
}
```

## Benefits

1. **Clear Communication** - Inspectors see meaningful component names, not "Component 1"
2. **Standardization** - Uses industry-standard terminology from Inspector Guides
3. **Flexibility** - Admins can customize component names per organization needs
4. **Traceability** - Component names are stored with inspection data for reporting
5. **Scalability** - Easy to add new asset types with custom components
6. **Data Integrity** - Historical inspections maintain original component names

## Future Enhancements

Possible improvements for future iterations:

1. **Visual Rubric Editor** - GUI for editing D/E/R rubrics instead of JSON
2. **Template Versioning** - Allow creating new versions while preserving old ones
3. **Component Photos** - Attach reference photos to each component type
4. **Custom Component Addition** - Allow adding new components to templates
5. **Component Reordering** - Drag-and-drop to change component display order
6. **Template Cloning** - Copy templates from one asset type to another
7. **Import/Export** - Import component templates from Excel/CSV
8. **Multi-language Support** - Translate component names and rubrics

## Files Modified/Created

### New Files
- `/src/app/components/admin/ComponentTemplatesPage.tsx` - Main settings page

### Modified Files
- `/src/app/App.tsx` - Added route for component templates page
- `/src/app/components/admin/AdminConsolePage.tsx` - Added navigation button
- `/supabase/functions/server/index.tsx` - Added API routes for templates

### Existing Database Schema (Already in place)
- `/DATABASE_SCHEMA_ENHANCEMENTS.sql` - Component template tables and seed data

## Accessing the Feature

1. **Login as Admin User**
2. **Navigate to Admin Console** - `/admin`
3. **Click "Component Templates" button**
4. **View and edit component templates**

Or directly visit: `/admin/component-templates`

## Testing Checklist

- [x] Component names display correctly in inspection forms
- [x] Component names display correctly in inspection details
- [x] Component names display correctly in edit inspection
- [x] Settings page loads all templates
- [x] Settings page displays component details
- [x] D/E/R rubrics are visible in tooltips
- [x] Edit dialog opens and allows name changes
- [x] Save functionality updates component names
- [x] Inspector Guide reference tab displays images
- [x] Navigation from Admin Console works
- [x] Route protection (admin-only access)

## Notes

- Rubric editing is intentionally restricted to prevent accidental changes that could affect CI calculations
- Component names are denormalized in inspection_component_scores for reporting performance
- Templates support versioning but only active templates are used for new inspections
- The "(if applicable)" suffix in component names indicates optional components that may not exist on all assets
