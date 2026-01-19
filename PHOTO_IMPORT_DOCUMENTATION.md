# TAMS360 Photo Import System - Complete Technical Documentation

**Last Updated**: January 19, 2026  
**Status**: ⚠️ DEBUGGING IN PROGRESS  
**Current Issue**: Authentication failure on photo upload

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture & Technology Stack](#architecture--technology-stack)
3. [Complete Upload Flow (A to Z)](#complete-upload-flow-a-to-z)
4. [Database Schema Dependencies](#database-schema-dependencies)
5. [File Structure & Naming Conventions](#file-structure--naming-conventions)
6. [Authentication & Multi-Tenancy](#authentication--multi-tenancy)
7. [Error History & Resolutions](#error-history--resolutions)
8. [Current Status & Outstanding Issues](#current-status--outstanding-issues)
9. [Testing Checklist](#testing-checklist)

---

## System Overview

The TAMS360 Photo Import System allows field inspectors to bulk upload inspection photos from a local folder structure to the cloud. The system:

- ✅ Parses photos from hierarchical folder structure
- ✅ Compresses images in the browser before upload
- ✅ Creates assets automatically if they don't exist
- ✅ Stores photos in tenant-isolated Supabase Storage buckets
- ✅ Links photos to assets with metadata (photo type, component numbers)
- ✅ Provides real-time upload progress and detailed error reporting
- ✅ Supports retry mechanism for failed uploads

**Key Constraint**: Multi-tenant system with complete data isolation between organizations.

---

## Architecture & Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **UI Components**: Custom UI library (Tailwind CSS v4)
- **State Management**: React useState hooks
- **File Handling**: Browser File API with webkitRelativePath
- **Image Compression**: HTML5 Canvas API
- **HTTP Client**: Native fetch API
- **Authentication**: Supabase Auth client
- **Notifications**: Sonner toast library

**Location**: `/src/app/components/data/ImportPhotosPage.tsx`

### Backend
- **Runtime**: Deno (Supabase Edge Functions)
- **Framework**: Hono web server
- **Authentication**: Supabase Auth (service role)
- **Database**: PostgreSQL (via Supabase client)
- **Storage**: Supabase Storage (tenant-isolated buckets)

**Location**: `/supabase/functions/server/index.tsx`

### Infrastructure
- **Hosting**: Vercel (frontend) + Supabase (backend/database/storage)
- **Domain**: `app.tams360.co.za`
- **API Endpoint**: `https://[projectId].supabase.co/functions/v1/make-server-c894a9ff`

---

## Complete Upload Flow (A to Z)

### Phase 1: Folder Selection & Parsing

#### 1.1 User Action
- User clicks **"Select Folder"** button
- Browser opens folder picker dialog
- User selects the root "Inspection Photos" folder or a subfolder

#### 1.2 File Reading
```
Input: HTML5 File Input with webkitdirectory attribute
- Reads ALL files recursively from selected folder
- Browser provides webkitRelativePath for each file (e.g., "Inspection Photos/01 - Traffic Signs/TS-001/1.jpg")
```

#### 1.3 Photo Parsing Logic
For each file in the selected folder:

**Step 1**: Extract folder structure components
```
Path: "Inspection Photos/01 - Traffic Signs photos M2/HN-TEST-001/1.jpg"
↓
assetTypeFolder: "01 - Traffic Signs photos M2"
assetRef: "HN-TEST-001"
fileName: "1.jpg"
photoNumber: "1" (extension removed)
```

**Step 2**: Classify photo type based on photo number
| Photo Number | Type | Description |
|--------------|------|-------------|
| `0` | location | GPS/context photo of asset location |
| `6` | main | Primary asset photo (overview) |
| `1`, `2`, `3`, `4`, `5` | component | Individual component photos |
| `1.1`, `1.2`, `2.1`, etc. | sub-component | Detailed sub-component photos |

**Step 3**: Store parsed metadata
```typescript
{
  file: File,                    // Original browser File object
  assetRef: "HN-TEST-001",       // Asset reference number
  assetTypeFolder: "01 - ...",   // Folder name
  photoNumber: "1",              // Photo identifier
  photoType: "component",        // Classified type
  componentNumber: 1,            // Extracted from photoNumber
  subNumber: undefined,          // For sub-components only
  path: "full/path/to/file.jpg"  // Original webkitRelativePath
}
```

#### 1.4 Validation & Display
- **Validation**: Skips non-image files (checks MIME type for `image/jpeg|png|heic`)
- **Grouping**: Groups photos by assetRef
- **Statistics**: Calculates counts for:
  - Total photos
  - Unique assets
  - Photo type breakdown (main, component, location)
- **Preview**: Shows first 50 assets with thumbnail grid

---

### Phase 2: Upload Preparation

#### 2.1 Authentication Check
```typescript
// Get fresh access token from Supabase session
const { data: { session }, error: sessionError } = await supabase.auth.getSession();

if (!session?.access_token) {
  ERROR: "You must be logged in to upload photos"
  STOP
}

accessToken = session.access_token
```

**Why session token instead of localStorage?**
- localStorage token may expire during long upload sessions
- Session token is always fresh and validated by Supabase
- Prevents 401 Unauthorized errors mid-upload

#### 2.2 Upload Initialization
```typescript
uploading = true
uploadProgress = 0
uploadResults = []
```

---

### Phase 3: Individual Photo Upload (Sequential Loop)

**Important**: Photos are uploaded ONE AT A TIME to:
- Avoid overwhelming the backend
- Prevent browser memory issues with large batches
- Allow granular error tracking and retry logic
- Enable real-time progress updates

For each photo (index `i` from 0 to selectedFiles.length):

---

#### 3.1 Asset Reference Normalization

**Problem**: Folder names may use different numbering conventions than database

**Example**:
```
Folder name:    "HN-TEST-R01"  (R01 = short form)
Database name:  "HN-TEST-001"  (001 = padded form)
```

**Solution**: Normalize before lookup
```typescript
// Detect pattern: ends with -R## (e.g., -R01, -R1, -R001)
const rMatch = assetRef.match(/-R(\d+)$/i);

if (rMatch) {
  number = rMatch[1];              // "01"
  paddedNumber = number.padStart(3, '0');  // "001"
  normalizedAssetRef = assetRef.replace(/-R\d+$/i, `-${paddedNumber}`);
  // "HN-TEST-R01" → "HN-TEST-001"
}
```

---

#### 3.2 Image Compression (Client-Side)

**Purpose**: Reduce file size before upload to save bandwidth and storage costs

**Process**:
1. Read file as Data URL using FileReader
2. Load into HTML5 Image element
3. Calculate new dimensions (max 1920x1920px, maintain aspect ratio)
4. Draw resized image onto Canvas element
5. Export as JPEG with 80% quality
6. Return compressed Blob

**Typical Results**:
- Original: 4-8 MB per photo
- Compressed: 0.5-1.5 MB per photo
- Reduction: ~70-85%

**Fallback**: If compression fails, use original file

---

#### 3.3 Backend Call #1: Get Signed Upload URL

**Endpoint**: `POST /make-server-c894a9ff/photos/get-upload-url`

**Request Headers**:
```
Content-Type: application/json
Authorization: Bearer {accessToken}
```

**Request Body**:
```json
{
  "assetRef": "HN-TEST-001",     // Normalized asset reference
  "photoNumber": "1",             // Photo identifier
  "fileExt": "jpg",               // File extension
  "fileType": "image/jpeg"        // MIME type
}
```

**Backend Processing**:

**Step 1**: Verify Authentication
```typescript
const authHeader = c.req.header("Authorization");
const accessToken = authHeader.replace("Bearer ", "");
const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

if (authError || !user) {
  RETURN 401: "Unauthorized"
}
```

**Step 2**: Get User's Tenant ID (Multi-Tenant Isolation)
```typescript
// Try 3 sources in order:
// 1. KV Store: kv.get(`user:${user.id}`)
// 2. Database View: SELECT tenant_id FROM tams360_user_profiles_v WHERE id = user.id
// 3. Users Table: SELECT tenant_id FROM users WHERE auth_id = user.id

if (!tenantId) {
  RETURN 404: "User not found or no tenant assigned"
}
```

**Step 3**: Find or Create Asset
```typescript
// Lookup existing asset
SELECT asset_id 
FROM assets 
WHERE reference_number = assetRef 
  AND tenant_id = tenantId;

if (found) {
  assetId = existingAsset.asset_id
} else {
  // Create new asset
  INSERT INTO assets (
    reference_number,
    tenant_id,
    status_id,      // 1 = Active
    asset_type_id   // 1 = Default type
  ) VALUES (assetRef, tenantId, 1, 1)
  RETURNING asset_id;
  
  assetId = newAsset.asset_id
}
```

**Step 4**: Generate Storage Path
```typescript
const bucketName = `make-c894a9ff-tenant-${tenantId}`;
const filePath = `assets/${assetId}/photo_${photoNumber}_${Date.now()}.${fileExt}`;
```

**Step 5**: Create Signed Upload URL
```typescript
const { data, error } = await supabase.storage
  .from(bucketName)
  .createSignedUploadUrl(filePath);

const uploadUrl = data.signedUrl;
```

**Response** (200 OK):
```json
{
  "uploadUrl": "https://...signed-url...",
  "filePath": "assets/123/photo_1_1234567890.jpg",
  "assetId": 123,
  "tenantId": "tenant-uuid"
}
```

---

#### 3.4 Direct Upload to Supabase Storage

**Important**: This step BYPASSES the Edge Function entirely

**Request**:
```
PUT {uploadUrl}
Headers:
  Content-Type: image/jpeg
  x-upsert: true
Body: {compressedImageBlob}
```

**Why signed URLs?**
- Edge Functions have 50MB payload limit
- Photos can be 4-8MB (40+ photos would exceed limit)
- Direct upload is faster (no proxy through Edge Function)
- Supabase handles authentication via signed URL

**Storage Structure**:
```
Bucket: make-c894a9ff-tenant-{tenantId}
├── assets/
│   ├── 123/
│   │   ├── photo_0_1234567890.jpg   (location)
│   │   ├── photo_1_1234567891.jpg   (component 1)
│   │   ├── photo_1.1_1234567892.jpg (sub-component 1.1)
│   │   └── photo_6_1234567893.jpg   (main)
```

---

#### 3.5 Backend Call #2: Save Photo Metadata

**Endpoint**: `POST /make-server-c894a9ff/photos/save-metadata`

**Request Headers**:
```
Content-Type: application/json
Authorization: Bearer {accessToken}
```

**Request Body**:
```json
{
  "assetId": 123,
  "tenantId": "tenant-uuid",
  "filePath": "assets/123/photo_1_1234567890.jpg",
  "photoNumber": "1",
  "photoType": "component",
  "componentNumber": 1,
  "subNumber": null,
  "fileSize": 1048576,
  "fileType": "image/jpeg"
}
```

**Backend Processing**:

**Step 1**: Verify Authentication (same as 3.3)

**Step 2**: Insert Photo Record
```sql
INSERT INTO asset_photos (
  asset_id,
  tenant_id,
  file_path,
  photo_number,
  photo_type,
  component_number,
  sub_number,
  file_size,
  file_type,
  uploaded_at,
  uploaded_by
) VALUES (
  assetId,
  tenantId,
  filePath,
  photoNumber,
  photoType,
  componentNumber,
  subNumber,
  fileSize,
  fileType,
  NOW(),
  user.id
)
RETURNING photo_id;
```

**Step 3**: Generate Public Signed URL (for display)
```typescript
const { data } = await supabase.storage
  .from(bucketName)
  .createSignedUrl(filePath, 3600 * 24 * 365); // 1 year expiry

const publicUrl = data.signedUrl;
```

**Response** (200 OK):
```json
{
  "success": true,
  "photoId": 456,
  "url": "https://...signed-url-for-viewing...",
  "message": "Photo 1 uploaded for HN-TEST-001"
}
```

---

#### 3.6 Progress Update

**Frontend**:
```typescript
// Add to results array
results.push({
  assetRef: "HN-TEST-001",
  photoNumber: "1",
  success: true,
  url: "https://..."
});

// Update progress bar
const progress = Math.round(((i + 1) / totalPhotos) * 100);
setUploadProgress(progress);

// Update UI in real-time
setUploadResults([...results]);
```

**Console Logging**:
```
📤 Uploading 1/33: HN-TEST-001/1
🗜️ Compressing 1.jpg (4.20MB)
✅ Compressed to 0.95MB (77% reduction)
☁️ Uploading to storage...
✅ Success: HN-TEST-001/1
```

---

#### 3.7 Error Handling

**If any step fails**:
```typescript
catch (error) {
  console.error(`❌ Failed: ${assetRef}/${photoNumber}:`, error);
  
  results.push({
    assetRef,
    photoNumber,
    success: false,
    error: error.message
  });
  
  // Special case: Session expired
  if (error.message.includes("Session expired") || error.status === 401) {
    toast.error("Session expired. Please log in again.");
    STOP ALL UPLOADS;
    return;
  }
}
```

---

#### 3.8 Token Refresh (Every 20 Photos)

**Purpose**: Prevent token expiration during long upload sessions

```typescript
if (i % 20 === 0 && i > 0) {
  console.log("🔄 Refreshing access token...");
  const refreshedToken = localStorage.getItem("tams360_token");
  if (refreshedToken) {
    accessToken = refreshedToken;
  }
}
```

**Note**: This is a fallback. Primary auth uses fresh session token.

---

### Phase 4: Upload Completion

#### 4.1 Final Statistics
```typescript
const successful = results.filter(r => r.success).length;
const failed = results.filter(r => !r.success).length;

if (failed === 0) {
  toast.success(`✅ Successfully uploaded ${successful} photos!`);
} else {
  toast.warning(`Uploaded ${successful} photos, ${failed} failed`);
}
```

#### 4.2 Results Display

**Asset-Level Summary**:
- ✅ Complete Assets: All photos uploaded successfully
- ⚠️ Partial Assets: Some photos succeeded, some failed
- ❌ Failed Assets: All photos failed

**Detailed View**:
- Lists each asset with success/failure counts
- Shows error messages for failed photos only
- Collapses successful uploads to reduce clutter

#### 4.3 Retry Mechanism

**User can click "Retry Failed Photos"**:
```typescript
// Filter to only failed photos
const failedPhotos = uploadResults
  .filter(r => !r.success)
  .map(r => selectedFiles.find(
    f => f.assetRef === r.assetRef && f.photoNumber === r.photoNumber
  ));

// Reset state and restart upload with only failed photos
setSelectedFiles(failedPhotos);
setUploadResults([]);
uploadPhotos(); // Start Phase 2 again
```

---

## Database Schema Dependencies

### Required Tables

#### 1. `assets` Table
```sql
CREATE TABLE assets (
  asset_id SERIAL PRIMARY KEY,
  reference_number VARCHAR(100) NOT NULL,   -- e.g., "HN-TEST-001"
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  asset_type_id INTEGER REFERENCES asset_types(asset_type_id),
  status_id INTEGER REFERENCES statuses(status_id),
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(reference_number, tenant_id)  -- Prevent duplicates within tenant
);

CREATE INDEX idx_assets_ref_tenant ON assets(reference_number, tenant_id);
```

#### 2. `asset_photos` Table
```sql
CREATE TABLE asset_photos (
  photo_id SERIAL PRIMARY KEY,
  asset_id INTEGER NOT NULL REFERENCES assets(asset_id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  file_path VARCHAR(500) NOT NULL,          -- Storage path
  photo_number VARCHAR(10) NOT NULL,        -- "0", "1", "1.1", "6"
  photo_type VARCHAR(20),                    -- "main", "location", "component", "sub-component"
  component_number INTEGER,                  -- For component photos
  sub_number INTEGER,                        -- For sub-component photos
  file_size INTEGER,                         -- Bytes
  file_type VARCHAR(50),                     -- MIME type
  uploaded_at TIMESTAMP DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id),
  
  UNIQUE(asset_id, photo_number)  -- One photo per number per asset
);

CREATE INDEX idx_photos_asset ON asset_photos(asset_id);
CREATE INDEX idx_photos_tenant ON asset_photos(tenant_id);
```

#### 3. `users` / `tams360_user_profiles_v` (Multi-Tenancy)
```sql
-- Option 1: users table
CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  auth_id UUID UNIQUE REFERENCES auth.users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  email VARCHAR(255),
  role VARCHAR(50)
);

-- Option 2: Database view
CREATE VIEW tams360_user_profiles_v AS
SELECT 
  u.id,
  u.email,
  up.tenant_id,
  up.role
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.user_id;
```

#### 4. `statuses` Table (Lookup)
```sql
CREATE TABLE statuses (
  status_id SERIAL PRIMARY KEY,
  status_name VARCHAR(50) NOT NULL,  -- "Active", "Inactive", "Archived"
  status_type VARCHAR(50)             -- "asset", "user", etc.
);

-- Required record:
INSERT INTO statuses (status_id, status_name, status_type) 
VALUES (1, 'Active', 'asset');
```

#### 5. `asset_types` Table (Lookup)
```sql
CREATE TABLE asset_types (
  asset_type_id SERIAL PRIMARY KEY,
  type_name VARCHAR(100) NOT NULL,   -- "Traffic Sign", "Guardrail", etc.
  type_code VARCHAR(20)
);

-- Required record:
INSERT INTO asset_types (asset_type_id, type_name) 
VALUES (1, 'Unknown', 'UNK');
```

### Row-Level Security (RLS)

**Critical for Multi-Tenancy**:
```sql
-- Users can only see their tenant's assets
CREATE POLICY tenant_isolation_assets ON assets
  FOR ALL
  USING (tenant_id = auth.uid_tenant_id());

-- Users can only see their tenant's photos
CREATE POLICY tenant_isolation_photos ON asset_photos
  FOR ALL
  USING (tenant_id = auth.uid_tenant_id());
```

**Note**: `auth.uid_tenant_id()` is a custom function that extracts tenant_id from JWT claims or user table.

---

## File Structure & Naming Conventions

### Expected Folder Hierarchy

```
📁 Inspection Photos/                    ← Root folder (user selects this)
├── 📁 01 - Traffic Signs photos M2/     ← Asset type folder
│   ├── 📁 HN-TEST-001/                  ← Individual asset folder
│   │   ├── 🖼️ 0.jpg                     ← Location photo
│   │   ├── 🖼️ 1.jpg                     ← Component 1
│   │   ├── 🖼️ 1.1.jpg                   ← Sub-component 1.1
│   │   ├── 🖼️ 1.2.jpg                   ← Sub-component 1.2
│   │   ├── 🖼️ 2.jpg                     ← Component 2
│   │   ├── 🖼️ 3.jpg                     ← Component 3
│   │   └── 🖼️ 6.jpg                     ← Main asset photo
│   ├── 📁 HN-TEST-002/
│   └── 📁 HN-TEST-003/
├── 📁 02 - Traffic Signals M2 Photos/
│   ├── 📁 TS-001/
│   └── 📁 TS-002/
└── 📁 03 - Guardrails Photos/
    └── 📁 GR-001/
```

### Alternative Structures Supported

**Option 1**: Select asset type folder directly
```
📁 01 - Traffic Signs photos M2/         ← User selects this
├── 📁 HN-TEST-001/
└── 📁 HN-TEST-002/
```

**Option 2**: Select individual asset folder
```
📁 HN-TEST-001/                          ← User selects this
├── 🖼️ 0.jpg
├── 🖼️ 1.jpg
└── 🖼️ 6.jpg
```

### Photo Number Conventions

| Photo Number | Purpose | DERU Mapping |
|--------------|---------|--------------|
| `0` | Location/GPS context photo | N/A |
| `1` - `5` | Individual component photos | Degree, Extent assessment |
| `1.1`, `1.2`, etc. | Detailed sub-component views | Detailed defect evidence |
| `6` | Main asset overview photo | Overall condition |

### File Naming Rules

✅ **Valid**:
- `0.jpg`, `1.jpg`, `6.JPG`
- `1.1.jpg`, `2.3.JPEG`
- `3.png`, `4.heic`

❌ **Invalid**:
- `photo1.jpg` (must be number only)
- `1-front.jpg` (no text allowed)
- `1 copy.jpg` (no spaces)

### Asset Reference Variations

**Problem**: Field naming vs. Database naming
```
Field folder:   HN-TEST-R01, HN-TEST-R02, HN-TEST-R1
Database:       HN-TEST-001, HN-TEST-002, HN-TEST-001
```

**Solution**: Automatic normalization
```
-R01  → -001
-R1   → -001
-R001 → -001
```

---

## Authentication & Multi-Tenancy

### Authentication Flow

#### 1. User Login
```typescript
// User logs in via LoginPage
const response = await fetch(`${API_URL}/login`, {
  method: "POST",
  body: JSON.stringify({ email, password })
});

const { accessToken, user } = await response.json();

// Store in localStorage and state
localStorage.setItem("tams360_token", accessToken);
setAccessToken(accessToken);
setUser(user);
```

#### 2. Token Storage
**Two storage locations**:
- `localStorage.getItem("tams360_token")` - Persistent across sessions
- Supabase session - Fresh token from auth service

#### 3. Token Validation (Backend)
```typescript
const { data: { user }, error } = await supabase.auth.getUser(accessToken);

// Returns:
// user.id        - auth.users UUID
// user.email     - User's email
// user.app_metadata - Custom claims (tenant_id may be here)
```

### Multi-Tenant Data Isolation

#### Tenant ID Resolution (3-Tier Lookup)

**Tier 1: KV Store (Fastest)**
```typescript
const kvUser = await kv.get(`user:${user.id}`);
if (kvUser?.tenantId) {
  return kvUser.tenantId;
}
```

**Tier 2: Database View**
```sql
SELECT tenant_id 
FROM tams360_user_profiles_v 
WHERE id = ${user.id};
```

**Tier 3: Users Table**
```sql
SELECT tenant_id 
FROM users 
WHERE auth_id = ${user.id};
```

**If all 3 fail**:
```
RETURN 404: "User not found or no tenant assigned"
```

#### Tenant Isolation in Assets
```sql
-- Create asset
INSERT INTO assets (reference_number, tenant_id, ...)
VALUES ('HN-TEST-001', 'tenant-uuid-123', ...);

-- Lookup asset
SELECT asset_id 
FROM assets 
WHERE reference_number = 'HN-TEST-001' 
  AND tenant_id = 'tenant-uuid-123';  ← Critical filter
```

**Why tenant_id in WHERE clause?**
- Prevents users from accessing other tenants' assets
- Even if asset reference is identical (e.g., two companies both use "TS-001")
- Enforces data privacy and security

#### Storage Buckets (Tenant Isolation)
```
Tenant A: make-c894a9ff-tenant-{uuid-A}
Tenant B: make-c894a9ff-tenant-{uuid-B}
```

**Bucket Policies**:
- Only users with matching tenant_id can read/write
- RLS enforced at database level
- Signed URLs are tenant-scoped

---

## Error History & Resolutions

### Error 1: 500 Internal Server Error - Database Column Mismatch
**Date**: Initial development  
**Symptoms**: All 33 photos failing with 500 error  
**Error Message**: `column "asset_ref" does not exist`

**Root Cause**:
Backend code was using incorrect column names that didn't match the actual database schema:
- Used `asset_ref` instead of `reference_number`
- Used `description` column that doesn't exist in assets table

**Resolution**:
✅ **Fixed** - Updated backend queries to use correct column names:
```typescript
// BEFORE (wrong):
.select("asset_id")
.eq("asset_ref", assetRef)

// AFTER (correct):
.select("asset_id")
.eq("reference_number", assetRef)
```

**Files Modified**: `/supabase/functions/server/index.tsx` (lines 7276-7310)

---

### Error 2: 500 Internal Server Error - Invalid Status Value
**Date**: Initial development  
**Symptoms**: Asset creation failing with database constraint error  
**Error Message**: `invalid input syntax for type integer: "active"`

**Root Cause**:
- `status` field in assets table is a foreign key to statuses table (integer)
- Backend was inserting string `"active"` instead of integer `1`

**Database Schema**:
```sql
CREATE TABLE assets (
  status_id INTEGER REFERENCES statuses(status_id)  -- Expects integer!
);

CREATE TABLE statuses (
  status_id INTEGER PRIMARY KEY,  -- 1, 2, 3...
  status_name VARCHAR(50)         -- "Active", "Inactive", etc.
);
```

**Resolution**:
✅ **Fixed** - Changed status insertion:
```typescript
// BEFORE (wrong):
.insert({
  asset_ref: assetRef,
  status: "active",  // String!
  ...
})

// AFTER (correct):
.insert({
  reference_number: assetRef,
  status_id: 1,      // Integer FK
  ...
})
```

**Files Modified**: `/supabase/functions/server/index.tsx` (lines 7291-7310)

---

### Error 3: Poor Error Visibility
**Date**: Initial debugging  
**Symptoms**: Errors logged but not enough detail to diagnose root cause  

**Problem**:
```typescript
console.error("Asset creation failed:", error);
// Output: [Object object] - not helpful!
```

**Resolution**:
✅ **Fixed** - Enhanced error logging:
```typescript
console.error("Asset creation error:", JSON.stringify({
  error: createError,
  assetRef,
  tenantId,
  requestBody: body,
}));
```

**Also added**:
- Operation-specific error messages (asset lookup vs. creation vs. photo save)
- Request body logging for debugging
- Detailed JSON serialization of error objects

**Files Modified**: `/supabase/functions/server/index.tsx` (multiple error handlers)

---

### Error 4: Authentication Failure - "You must be logged in"
**Date**: Current (as of Jan 19, 2026)  
**Status**: ⚠️ **DEBUGGING IN PROGRESS**  
**Symptoms**: Frontend shows "You must be logged in to upload photos" toast immediately  

**Investigation**:

**Theory 1: Token Not in localStorage**
```typescript
const accessToken = localStorage.getItem("tams360_token");
if (!accessToken) {
  toast.error("You must be logged in...");
  return;  // ← Stops here
}
```
- ❓ Is token stored correctly after login?
- ❓ Is localStorage cleared by browser?

**Theory 2: Token Expired**
```typescript
// Login stores token
localStorage.setItem("tams360_token", data.accessToken);

// 1 hour later, token expires
// Upload tries to use expired token
const { data: { user }, error } = await supabase.auth.getUser(expiredToken);
// error: "Invalid token" → 401 Unauthorized
```

**Theory 3: Supabase Session Not Available**
```typescript
// Latest fix attempt:
const { data: { session }, error } = await supabase.auth.getSession();

// If session is null:
if (!session?.access_token) {
  toast.error("You must be logged in...");
}
```
- ❓ Is Supabase client initialized correctly?
- ❓ Does user have active session?
- ❓ Is session cookie set?

**Resolution Attempts**:

**Attempt 1**: Use fresh session token instead of localStorage
```typescript
// BEFORE:
let accessToken = localStorage.getItem("tams360_token");

// AFTER:
const { data: { session } } = await supabase.auth.getSession();
let accessToken = session.access_token;
```
**Status**: ⏳ Deployed, awaiting testing

**Next Debug Steps**:
1. Check browser console for actual error message
2. Check browser Network tab → Authorization header value
3. Check Supabase Edge Function logs for backend errors
4. Test `supabase.auth.getSession()` in browser console
5. Verify token exists: `localStorage.getItem("tams360_token")`

**Files Modified**: `/src/app/components/data/ImportPhotosPage.tsx` (lines 199-217)

---

### Error 5: Asset Reference Mismatch - 404 Not Found
**Date**: Testing phase  
**Symptoms**: Some photos fail with "Asset not found" even though folder exists  

**Root Cause**:
Field teams use naming convention `HN-TEST-R01`, `HN-TEST-R02` for folders, but database stores as `HN-TEST-001`, `HN-TEST-002` (zero-padded, no "R").

**Example**:
```
Folder name:    HN-TEST-R1
Database query: SELECT * FROM assets WHERE reference_number = 'HN-TEST-R1'
Result:         Not found! (database has 'HN-TEST-001')
```

**Resolution**:
✅ **Fixed** - Added normalization logic:
```typescript
const rMatch = assetRef.match(/-R(\d+)$/i);
if (rMatch) {
  const number = rMatch[1];
  const paddedNumber = number.padStart(3, '0');
  normalizedAssetRef = assetRef.replace(/-R\d+$/i, `-${paddedNumber}`);
}

// "HN-TEST-R1"  → "HN-TEST-001"
// "HN-TEST-R01" → "HN-TEST-001"
// "HN-TEST-R001" → "HN-TEST-001"
```

**Files Modified**: `/src/app/components/data/ImportPhotosPage.tsx` (lines 236-245)

---

### Error 6: Edge Function Payload Limit - 413 Entity Too Large
**Date**: Initial architecture  
**Symptoms**: Large batches of photos (33 photos × 4MB = 132MB) exceeding limits  

**Problem**:
- Supabase Edge Functions have 50MB request body limit
- Uploading photos via Edge Function proxy would fail

**Original Approach (would fail)**:
```
Browser → [Photo Blob 4MB] → Edge Function → Storage
                             ↑
                        50MB limit!
```

**Resolution**:
✅ **Fixed** - Use signed upload URLs (direct upload):
```
Browser → Edge Function (get signed URL) → Browser → Storage
          ↑ Small JSON request                ↑ Direct upload
```

**Flow**:
1. Frontend asks backend for signed upload URL (small JSON request)
2. Backend generates signed URL and returns it (no photo data transferred)
3. Frontend uploads photo DIRECTLY to Supabase Storage (bypasses Edge Function)
4. Frontend notifies backend to save metadata (small JSON request)

**Benefit**: No payload limits, faster uploads, less backend processing

---

### Error 7: Batch Upload Memory Issues
**Date**: Initial testing  
**Symptoms**: Browser freezing when uploading 100+ photos simultaneously  

**Problem**:
```typescript
// Upload ALL photos at once
const uploads = selectedFiles.map(photo => uploadPhoto(photo));
await Promise.all(uploads);
// 100 simultaneous uploads → Browser out of memory!
```

**Resolution**:
✅ **Fixed** - Sequential upload with progress tracking:
```typescript
for (let i = 0; i < selectedFiles.length; i++) {
  await uploadSinglePhoto(selectedFiles[i]);
  setUploadProgress((i + 1) / selectedFiles.length * 100);
}
```

**Benefits**:
- Lower memory usage (one photo in memory at a time)
- Better error handling (can retry individual failures)
- Real-time progress updates
- Prevents overwhelming backend

**Files Modified**: `/src/app/components/data/ImportPhotosPage.tsx` (upload loop)

---

### Error 8: Incorrect Photo Type Classification
**Date**: Testing with real data  
**Symptoms**: All photos classified as "component" instead of proper types  

**Root Cause**:
Initial logic didn't check for special photo numbers:
```typescript
// BEFORE (wrong):
const photoType = "component";  // Hardcoded!
```

**Resolution**:
✅ **Fixed** - Added classification logic:
```typescript
let photoType: "main" | "location" | "component" | "sub-component";

if (photoNumber === "6") {
  photoType = "main";
} else if (photoNumber === "0") {
  photoType = "location";
} else if (photoNumber.includes(".")) {
  photoType = "sub-component";
  const [comp, sub] = photoNumber.split(".");
  componentNumber = parseInt(comp);
  subNumber = parseInt(sub);
} else {
  photoType = "component";
  componentNumber = parseInt(photoNumber);
}
```

**Files Modified**: `/src/app/components/data/ImportPhotosPage.tsx` (parsePhotoMetadata function)

---

## Current Status & Outstanding Issues

### ✅ Working Features
- Folder structure parsing (supports 3 different folder depth levels)
- Photo type classification (main, location, component, sub-component)
- Asset reference normalization (R01 → 001)
- Client-side image compression (70-85% size reduction)
- Real-time upload progress tracking
- Asset auto-creation (if not in database)
- Tenant-isolated storage buckets
- Metadata storage with component tracking
- Detailed upload results with asset grouping
- Retry mechanism for failed uploads
- Preview with thumbnail grid

### ⚠️ Current Issues

**Issue #1: Authentication Error (CRITICAL - BLOCKS UPLOAD)**
- **Status**: Debugging in progress
- **Symptom**: "You must be logged in to upload photos" error
- **Impact**: Cannot upload any photos
- **Latest Fix**: Changed to use fresh Supabase session token (awaiting test)
- **Next Steps**: 
  1. Test after Vercel deployment
  2. Check browser console for errors
  3. Verify Supabase session exists
  4. Check Edge Function logs

### 🔍 Untested Scenarios
- Uploading 100+ photos (stress test)
- Very large photos (>10MB original size)
- Non-JPEG formats (PNG, HEIC)
- Duplicate photo numbers for same asset
- Network interruption during upload
- Concurrent uploads from multiple users in same tenant
- Photo deletion/replacement workflow

### 📋 Known Limitations
- **Sequential uploads**: Only one photo at a time (slower for large batches, but safer)
- **No resume capability**: If browser crashes, must restart all uploads
- **No duplicate detection**: Uploading same photo twice will create duplicate records
- **Limited asset validation**: Creates assets with minimal data (only reference_number)
- **No batch operations**: Cannot delete/edit multiple photos at once

### 🎯 Future Enhancements
1. **Parallel uploads**: Upload 5 photos concurrently (balance speed vs. reliability)
2. **Upload queue persistence**: Save queue to localStorage, resume after browser crash
3. **Duplicate detection**: Check if photo already exists before uploading
4. **Drag & drop**: Allow drag & drop folder/files instead of just folder picker
5. **Photo editing**: Crop, rotate, annotate photos before upload
6. **Batch delete**: Select and delete multiple photos
7. **Photo comparison**: Before/after views, defect progression tracking
8. **Offline mode**: Queue uploads when offline, sync when connection restored
9. **Advanced compression**: AI-powered compression, quality presets
10. **Upload speed**: WebSocket-based progress, chunk uploads for huge files

---

## Testing Checklist

### Pre-Upload Testing
- [ ] User is logged in (check localStorage for "tams360_token")
- [ ] User has tenant_id assigned (check in database)
- [ ] Storage buckets exist for tenant (check Supabase Storage)
- [ ] Database tables exist (assets, asset_photos, statuses, asset_types)
- [ ] Required lookup records exist (status_id=1, asset_type_id=1)

### Folder Structure Testing
- [ ] Root "Inspection Photos" folder
- [ ] Asset type subfolder
- [ ] Individual asset folder (direct select)
- [ ] Mixed valid/invalid files
- [ ] Non-image files (should be skipped)
- [ ] Empty folders (should show 0 photos)

### Photo Naming Testing
- [ ] Location photo (0.jpg)
- [ ] Main photo (6.jpg)
- [ ] Component photos (1.jpg, 2.jpg, 3.jpg)
- [ ] Sub-component photos (1.1.jpg, 1.2.jpg)
- [ ] Different extensions (JPG, JPEG, PNG, HEIC)
- [ ] Invalid names (photo1.jpg, 1-front.jpg) - should be skipped

### Asset Reference Testing
- [ ] Standard format (HN-TEST-001)
- [ ] R-notation (HN-TEST-R01, HN-TEST-R1)
- [ ] New assets (auto-creation)
- [ ] Existing assets (lookup)
- [ ] Duplicate asset folders

### Upload Testing
- [ ] Single photo upload
- [ ] Small batch (5-10 photos)
- [ ] Medium batch (30-50 photos)
- [ ] Large batch (100+ photos)
- [ ] Mixed success/failure scenarios

### Error Testing
- [ ] Invalid token (should show auth error)
- [ ] Expired token (should show session expired)
- [ ] Network disconnect during upload
- [ ] Invalid file format
- [ ] Storage quota exceeded
- [ ] Duplicate photo number for same asset

### Multi-Tenancy Testing
- [ ] User A uploads photos → only visible to Tenant A
- [ ] User B uploads photos → only visible to Tenant B
- [ ] Same asset reference in different tenants (should be isolated)
- [ ] Cross-tenant access blocked

### UI/UX Testing
- [ ] Progress bar updates in real-time
- [ ] Toast notifications appear for success/error
- [ ] Upload results show correct statistics
- [ ] Preview thumbnails load correctly
- [ ] Retry button works for failed uploads
- [ ] Page doesn't freeze during large uploads

### Database Verification (Post-Upload)
```sql
-- Check assets created
SELECT * FROM assets 
WHERE tenant_id = 'your-tenant-id' 
ORDER BY created_at DESC;

-- Check photos uploaded
SELECT ap.*, a.reference_number
FROM asset_photos ap
JOIN assets a ON ap.asset_id = a.asset_id
WHERE ap.tenant_id = 'your-tenant-id'
ORDER BY ap.uploaded_at DESC;

-- Check storage paths match
SELECT file_path FROM asset_photos 
WHERE asset_id = 123;
```

### Storage Verification (Post-Upload)
- [ ] Files exist in correct bucket (make-c894a9ff-tenant-{uuid})
- [ ] File paths match database records
- [ ] Signed URLs are accessible
- [ ] File sizes match expectations (compressed)
- [ ] Files can be downloaded via signed URLs

---

## Appendix: Key Code Locations

### Frontend
**Main Component**: `/src/app/components/data/ImportPhotosPage.tsx`
- Lines 1-70: Imports, types, compression function
- Lines 71-150: Photo parsing logic
- Lines 151-197: Folder selection handler
- Lines 199-350: Upload logic (main function)
- Lines 351-500: UI rendering

### Backend
**Server File**: `/supabase/functions/server/index.tsx`
- Lines 7211-7320: `/photos/get-upload-url` endpoint
- Lines 7321-7400: `/photos/save-metadata` endpoint

### Configuration
**Supabase Config**: `/utils/supabase/info.tsx`
- `projectId`: Supabase project identifier
- `publicAnonKey`: Public anonymous key for client auth

**Environment Variables** (Supabase Edge Function):
- `SUPABASE_URL`: https://{projectId}.supabase.co
- `SUPABASE_SERVICE_ROLE_KEY`: Backend admin key (SECRET!)
- `SUPABASE_ANON_KEY`: Public anonymous key

---

## Contact & Support

**System Owner**: TAMS360 Development Team  
**Deployment**: Vercel (app.tams360.co.za)  
**Database**: Supabase PostgreSQL  
**Last Updated**: January 19, 2026  

For questions or issues, refer to:
1. This documentation
2. Browser console logs (frontend errors)
3. Supabase Edge Function logs (backend errors)
4. Database query logs (Supabase SQL Editor)

---

**END OF DOCUMENTATION**
