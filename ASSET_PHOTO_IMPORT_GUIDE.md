# TAMS360 Asset Photo Import Guide

## Overview
This guide provides step-by-step instructions for importing asset photos into the TAMS360 database. Photos are organized by asset reference ID in folders, with specific naming conventions for general asset photos and component-level photos.

---

## Photo Naming Convention

### General Asset Photo
- **Filename**: `0.jpg` (or `.png`, `.jpeg`)
- **Purpose**: Main/general photo of the asset
- **Location**: Root of asset folder

### Component Photos
Components are numbered 1-6, and each component can have multiple photos:

#### Component 1 Photos
- `1.jpg` - Main photo of component 1
- `1.1.jpg` - Additional angle 1 of component 1
- `1.2.jpg` - Additional angle 2 of component 1
- `1.3.jpg` - Additional angle 3 of component 1

#### Component 2 Photos
- `2.jpg` - Main photo of component 2
- `2.1.jpg` - Additional angle 1 of component 2
- `2.2.jpg` - Additional angle 2 of component 2
- `2.3.jpg` - Additional angle 3 of component 2

...and so on for components 3, 4, 5, and 6.

### Example Folder Structure
```
/AssetPhotos/
├── AST26000123/           # Asset Reference ID
│   ├── 0.jpg              # General asset photo
│   ├── 1.jpg              # Component 1 main photo
│   ├── 1.1.jpg            # Component 1 detail 1
│   ├── 1.2.jpg            # Component 1 detail 2
│   ├── 2.jpg              # Component 2 main photo
│   ├── 2.1.jpg            # Component 2 detail 1
│   └── 3.jpg              # Component 3 main photo
├── AST26000124/           # Another asset
│   ├── 0.jpg
│   ├── 1.jpg
│   └── 1.1.jpg
└── AST26000125/
    └── 0.jpg
```

---

## Import Process

### Prerequisites
1. **Access Rights**: Admin or Supervisor role required
2. **Database Access**: Direct access to Supabase Storage
3. **Asset Data**: Assets must exist in the database before importing photos
4. **Photo Format**: JPEG or PNG format recommended, max 5MB per photo

### Option 1: Manual Database Import (Recommended for Bulk Import)

#### Step 1: Prepare Photos
1. Organize all photos into folders named by Asset Reference ID
2. Verify naming follows the convention (0, 1, 1.1, 1.2, 2, 2.1, etc.)
3. Compress large photos if needed (recommended max: 2MB per photo for web performance)

#### Step 2: Upload to Supabase Storage

**Using Supabase Dashboard:**
1. Log into Supabase Dashboard: https://supabase.com
2. Navigate to your project
3. Go to **Storage** → **Buckets**
4. Ensure the `asset-photos` bucket exists (created automatically by the system)
5. For each asset folder:
   - Create a folder with the asset reference ID
   - Upload all photos to that folder
   - Photos will be stored as: `asset-photos/{asset_ref_id}/{photo_name}.jpg`

**Using Supabase CLI (for large batches):**
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Upload a folder
supabase storage cp AssetPhotos/AST26000123/ supabase://asset-photos/AST26000123/ --recursive
```

#### Step 3: Update Database with Photo URLs

Create a SQL script to update the asset photos in the database:

```sql
-- Update general asset photo (0.jpg)
UPDATE tams360.assets
SET general_photo_url = 'https://<project-id>.supabase.co/storage/v1/object/public/asset-photos/' || asset_ref || '/0.jpg'
WHERE EXISTS (
  SELECT 1 FROM storage.objects 
  WHERE bucket_id = 'asset-photos' 
  AND name = asset_ref || '/0.jpg'
);

-- For inspections with component photos, you'll need to update inspection_component_scores
-- This is more complex and should be done carefully based on your inspection data

-- Example for updating component photos in inspection records:
UPDATE tams360.inspection_component_scores ics
SET photo_url = 'https://<project-id>.supabase.co/storage/v1/object/public/asset-photos/' 
                || a.asset_ref || '/' || ics.component_number || '.jpg'
FROM tams360.inspections i
JOIN tams360.assets a ON i.asset_id = a.id
WHERE ics.inspection_id = i.id
AND EXISTS (
  SELECT 1 FROM storage.objects 
  WHERE bucket_id = 'asset-photos' 
  AND name = a.asset_ref || '/' || ics.component_number || '.jpg'
);
```

**Important**: Replace `<project-id>` with your actual Supabase project ID.

### Option 2: API Upload Script (Python Example)

Create a Python script to automate the upload process:

```python
import os
import glob
from supabase import create_client, Client

# Configuration
SUPABASE_URL = "https://<project-id>.supabase.co"
SUPABASE_KEY = "<your-service-role-key>"
PHOTOS_DIR = "./AssetPhotos"
BUCKET_NAME = "asset-photos"

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def upload_asset_photos(asset_ref_folder):
    """Upload all photos for a single asset"""
    asset_ref = os.path.basename(asset_ref_folder)
    print(f"Processing {asset_ref}...")
    
    # Get all image files in the folder
    photos = glob.glob(os.path.join(asset_ref_folder, "*.jpg")) + \
             glob.glob(os.path.join(asset_ref_folder, "*.png")) + \
             glob.glob(os.path.join(asset_ref_folder, "*.jpeg"))
    
    for photo_path in photos:
        filename = os.path.basename(photo_path)
        storage_path = f"{asset_ref}/{filename}"
        
        # Read the file
        with open(photo_path, 'rb') as f:
            file_data = f.read()
        
        # Upload to Supabase Storage
        try:
            result = supabase.storage.from_(BUCKET_NAME).upload(
                path=storage_path,
                file=file_data,
                file_options={"content-type": "image/jpeg"}
            )
            print(f"  ✓ Uploaded {filename}")
        except Exception as e:
            print(f"  ✗ Failed to upload {filename}: {e}")
    
    # Update database with photo URLs
    update_asset_photos_in_db(asset_ref, photos)

def update_asset_photos_in_db(asset_ref, photo_paths):
    """Update database with photo URLs"""
    # Check if general photo exists
    has_general_photo = any('0.' in os.path.basename(p) for p in photo_paths)
    
    if has_general_photo:
        photo_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{asset_ref}/0.jpg"
        
        # Update via API
        try:
            # This assumes you have an API endpoint for updating assets
            # Adjust according to your actual API structure
            result = supabase.table('tams360_assets_v').update({
                'general_photo_url': photo_url
            }).eq('asset_ref', asset_ref).execute()
            print(f"  ✓ Updated database for {asset_ref}")
        except Exception as e:
            print(f"  ✗ Failed to update database: {e}")

def main():
    """Main function to process all asset folders"""
    # Get all subdirectories in the photos directory
    asset_folders = [f for f in glob.glob(os.path.join(PHOTOS_DIR, "*")) 
                    if os.path.isdir(f)]
    
    print(f"Found {len(asset_folders)} asset folders to process\n")
    
    for folder in asset_folders:
        upload_asset_photos(folder)
    
    print("\nUpload complete!")

if __name__ == "__main__":
    main()
```

**To use this script:**
1. Install Python dependencies: `pip install supabase-py`
2. Update `SUPABASE_URL`, `SUPABASE_KEY`, and `PHOTOS_DIR`
3. Run: `python upload_asset_photos.py`

### Option 3: Using the TAMS360 Web Interface

For individual assets or small batches:

1. Navigate to **Assets** page
2. Click on an asset to view details
3. In the asset detail page, use the photo upload section
4. Upload the general asset photo (0)
5. For component photos, create or edit an inspection, then upload component photos within the inspection form

---

## Database Schema Reference

### Assets Table
```sql
-- General asset photo
general_photo_url TEXT  -- URL to the main asset photo (0.jpg)
```

### Inspection Component Scores Table
```sql
-- Component-specific photos
photo_url TEXT  -- URL to component photo (1.jpg, 1.1.jpg, etc.)
component_number INT  -- Component number (1-6)
```

---

## Photo URL Format

Photos are stored in Supabase Storage with the following URL structure:

```
https://<project-id>.supabase.co/storage/v1/object/public/asset-photos/<asset_ref>/<photo_name>
```

**Examples:**
- General photo: `.../asset-photos/AST26000123/0.jpg`
- Component 1: `.../asset-photos/AST26000123/1.jpg`
- Component 1 detail 1: `.../asset-photos/AST26000123/1.1.jpg`

For **private** photos (if bucket is not public), use signed URLs:

```
https://<project-id>.supabase.co/storage/v1/object/sign/asset-photos/<asset_ref>/<photo_name>?token=<signed-token>
```

---

## Batch Import SQL Script Template

For database administrators with direct SQL access:

```sql
-- 1. Create a temporary table with asset ref and photo file availability
CREATE TEMP TABLE asset_photo_mapping (
    asset_ref TEXT,
    has_general_photo BOOLEAN DEFAULT FALSE,
    component_1_photo BOOLEAN DEFAULT FALSE,
    component_2_photo BOOLEAN DEFAULT FALSE
    -- Add more as needed
);

-- 2. Populate the mapping (you'll need to generate this from your file system)
-- This is an example - you'll need to generate actual data
INSERT INTO asset_photo_mapping (asset_ref, has_general_photo, component_1_photo) VALUES
('AST26000123', TRUE, TRUE),
('AST26000124', TRUE, FALSE),
('AST26000125', TRUE, TRUE);

-- 3. Update assets with general photos
UPDATE tams360.assets a
SET general_photo_url = 'https://<project-id>.supabase.co/storage/v1/object/public/asset-photos/' || a.asset_ref || '/0.jpg'
FROM asset_photo_mapping pm
WHERE a.asset_ref = pm.asset_ref
AND pm.has_general_photo = TRUE;

-- 4. Update component photos in inspections
-- This is more complex - you'll need to map based on your actual inspection data
-- and which components have photos

-- Clean up
DROP TABLE asset_photo_mapping;
```

---

## Best Practices

1. **Photo Quality**
   - Resolution: 1920x1080 or 1280x720 recommended
   - File size: Keep under 2MB for web performance
   - Format: JPEG with 80-90% quality for good balance

2. **Naming Consistency**
   - Always use lowercase extensions (.jpg, .png)
   - Use the exact naming convention (0, 1, 1.1, etc.)
   - Ensure folder names match Asset Reference IDs exactly

3. **Organization**
   - Keep a backup of original photos
   - Document which assets have photos imported
   - Use consistent photo angles for similar assets

4. **Data Integrity**
   - Verify asset exists in database before uploading photos
   - Check photo URLs are accessible after import
   - Run validation queries to ensure all URLs are valid

5. **Performance**
   - Import during off-peak hours for large batches
   - Use batch operations where possible
   - Consider using a CDN for frequently accessed photos

---

## Validation Queries

### Check which assets have general photos:
```sql
SELECT 
    asset_ref,
    asset_type,
    general_photo_url IS NOT NULL as has_photo,
    general_photo_url
FROM tams360.assets
ORDER BY asset_ref;
```

### Check which assets are missing general photos:
```sql
SELECT 
    asset_ref,
    asset_type,
    location
FROM tams360.assets
WHERE general_photo_url IS NULL;
```

### Verify photo URLs are accessible:
```sql
-- This would need to be run with a script that actually checks HTTP status
SELECT 
    asset_ref,
    general_photo_url
FROM tams360.assets
WHERE general_photo_url IS NOT NULL;
```

---

## Troubleshooting

### Problem: Photos not displaying
**Solutions:**
1. Check bucket permissions (should be public or use signed URLs)
2. Verify URL format is correct
3. Check file exists in Supabase Storage
4. Verify CORS settings if accessing from web app

### Problem: Upload fails
**Solutions:**
1. Check file size (max 5MB typically)
2. Verify bucket exists
3. Check authentication/authorization
4. Ensure file format is supported

### Problem: Wrong photo displays
**Solutions:**
1. Verify naming convention is followed exactly
2. Check asset reference ID matches folder name
3. Clear browser cache
4. Verify database URL points to correct file

---

## Support

For additional assistance:
- Check Supabase Storage documentation: https://supabase.com/docs/guides/storage
- Contact system administrator
- Review TAMS360 technical documentation
- Check server logs for upload errors

---

## Appendix: Complete Node.js Import Script

```javascript
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const SUPABASE_URL = 'https://<project-id>.supabase.co';
const SUPABASE_SERVICE_KEY = '<your-service-role-key>';
const PHOTOS_BASE_DIR = './AssetPhotos';
const BUCKET_NAME = 'asset-photos';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function uploadAssetPhotos(assetRef, photosDir) {
  console.log(`\nProcessing ${assetRef}...`);
  
  try {
    const files = await fs.readdir(photosDir);
    const imageFiles = files.filter(f => /\.(jpg|jpeg|png)$/i.test(f));
    
    for (const filename of imageFiles) {
      const filePath = path.join(photosDir, filename);
      const fileBuffer = await fs.readFile(filePath);
      const storagePath = `${assetRef}/${filename}`;
      
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, fileBuffer, {
          contentType: 'image/jpeg',
          upsert: true
        });
      
      if (error) {
        console.error(`  ✗ Failed to upload ${filename}:`, error.message);
      } else {
        console.log(`  ✓ Uploaded ${filename}`);
      }
    }
    
    // Update database if general photo (0.jpg) exists
    if (imageFiles.some(f => f.startsWith('0.'))) {
      const photoUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${assetRef}/0.jpg`;
      
      const { error: dbError } = await supabase
        .from('tams360_assets_v')
        .update({ general_photo_url: photoUrl })
        .eq('asset_ref', assetRef);
      
      if (dbError) {
        console.error(`  ✗ Failed to update database:`, dbError.message);
      } else {
        console.log(`  ✓ Updated database record`);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Error processing ${assetRef}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('TAMS360 Asset Photo Import');
  console.log('==========================\n');
  
  try {
    const assetFolders = await fs.readdir(PHOTOS_BASE_DIR);
    const folders = [];
    
    for (const folder of assetFolders) {
      const folderPath = path.join(PHOTOS_BASE_DIR, folder);
      const stat = await fs.stat(folderPath);
      if (stat.isDirectory()) {
        folders.push({ name: folder, path: folderPath });
      }
    }
    
    console.log(`Found ${folders.length} asset folders to process\n`);
    
    let successCount = 0;
    for (const folder of folders) {
      const success = await uploadAssetPhotos(folder.name, folder.path);
      if (success) successCount++;
    }
    
    console.log(`\n==========================`);
    console.log(`Upload Complete!`);
    console.log(`Success: ${successCount}/${folders.length} assets`);
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main();
```

**To use:**
```bash
npm install @supabase/supabase-js
node upload_asset_photos.js
```

---

*Last Updated: January 2026*  
*Version: 1.0*  
*TAMS360 Documentation*
