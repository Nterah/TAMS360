# TAMS360 - Traffic Asset Management System 360°
## Complete System Documentation

**Version:** 1.0.0  
**Last Updated:** December 29, 2024  
**Status:** Production Ready

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Features & Capabilities](#features--capabilities)
5. [User Roles & Permissions](#user-roles--permissions)
6. [Mobile Usage Guide](#mobile-usage-guide)
7. [Module Documentation](#module-documentation)
8. [Database Schema](#database-schema)
9. [API Reference](#api-reference)
10. [Calculations & Analytics](#calculations--analytics)
11. [Workflows & Processes](#workflows--processes)
12. [Security & Access Control](#security--access-control)
13. [Troubleshooting](#troubleshooting)
14. [Deployment & Configuration](#deployment--configuration)

---

## Executive Summary

### What is TAMS360?

**TAMS360 (Traffic Asset Management System 360°)** is a comprehensive cloud-based platform designed for government agencies, highway authorities, and infrastructure management organizations to track, inspect, and maintain road assets throughout their lifecycle.

### Core Value Proposition

- **Complete Asset Visibility**: 360° view of all road infrastructure from installation to decommissioning
- **Proactive Maintenance**: Urgency-based work order system prevents failures and optimizes budgets
- **Mobile-First Design**: Field teams capture data directly at asset locations using smartphones
- **Data-Driven Decisions**: Real-time analytics and condition tracking inform resource allocation
- **Cost Optimization**: Track maintenance costs against budgets and asset lifespans
- **Compliance Ready**: Systematic inspection schedules ensure regulatory compliance

### Key Statistics

| Metric | Capability |
|--------|-----------|
| **Asset Types** | 9 predefined categories (extensible) |
| **Inspection Types** | 5 types (Routine, Incident, Verification, Compliance, Safety Audit) |
| **Urgency Levels** | 4 levels with defined response times (1-90 days) |
| **User Roles** | 4 roles with granular permissions |
| **GIS Capabilities** | Full mapping, navigation, layer control, external overlays |
| **Mobile Support** | 100% responsive, works on any device |
| **Data Export** | Multiple formats (planned: Excel, PDF, CSV) |

---

## System Architecture

### Overview

TAMS360 follows a modern three-tier cloud architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  React 18 Single Page Application (SPA)                 │   │
│  │  • Dashboard • Assets • Map • Inspections               │   │
│  │  • Maintenance • Admin Console                           │   │
│  │  • Responsive UI (Tailwind CSS v4)                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            ↕ HTTPS/REST                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Supabase Edge Functions (Deno Runtime)                 │   │
│  │  • Hono.js Web Server                                    │   │
│  │  • Authentication & Authorization                        │   │
│  │  • Business Logic & Validation                           │   │
│  │  • API Endpoints (RESTful)                               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            ↕ SQL/RPC                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  PostgreSQL Database (Supabase)                         │   │
│  │  • Schema: tams360 (all tables)                          │   │
│  │  • Schema: public (views for compatibility)              │   │
│  │  • Row Level Security (RLS)                              │   │
│  │  • ACID Transactions                                     │   │
│  │  • Automatic Backups                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Supabase Storage (Planned for photos)                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Supabase Auth (User Management)                        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

**Example: User Creates New Asset**

```
1. USER ACTION
   └─→ Fills form in Assets module (frontend)
   
2. CLIENT VALIDATION
   └─→ React validates required fields
   
3. API REQUEST
   └─→ POST /assets with JWT token in Authorization header
   
4. SERVER AUTHENTICATION
   └─→ Edge Function verifies JWT with Supabase Auth
   
5. AUTHORIZATION CHECK
   └─→ Confirms user has role: admin, supervisor, or field_user
   
6. DATA VALIDATION
   └─→ Server validates business rules (unique ref, valid GPS, etc.)
   
7. DATABASE WRITE
   └─→ INSERT into tams360.assets via KV store
   
8. AUDIT LOGGING
   └─→ CREATE audit record with user ID, timestamp, action
   
9. RESPONSE
   └─→ Return created asset object to client
   
10. UI UPDATE
    └─→ Add asset to list, show success toast, clear form
```

---

## Technology Stack

### Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.x | UI framework for component-based architecture |
| **TypeScript** | 5.x | Type-safe JavaScript for reduced bugs |
| **Tailwind CSS** | 4.0 | Utility-first CSS framework |
| **React Router** | 6.x | Client-side routing |
| **Recharts** | 2.x | Data visualization and charts |
| **Radix UI** | Latest | Accessible headless UI primitives |
| **Lucide React** | Latest | Icon library (600+ icons) |
| **Sonner** | Latest | Toast notifications |
| **Vite** | 5.x | Build tool and dev server |

### Backend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **Supabase** | Latest | Backend-as-a-Service platform |
| **PostgreSQL** | 15+ | Relational database |
| **Deno** | Latest | JavaScript/TypeScript runtime for Edge Functions |
| **Hono.js** | 4.x | Lightweight web framework |
| **Supabase Auth** | Latest | Authentication and user management |
| **Supabase Storage** | Latest | File storage (photos, attachments) |

### Development Tools

- **Figma Make**: Visual development environment
- **Git**: Version control
- **ESLint**: Code linting
- **Prettier**: Code formatting (optional)

---

## Features & Capabilities

### 1. 🎯 Dashboard & Analytics

#### Overview
The Dashboard provides real-time insights into the entire asset management system with interactive visualizations and key performance indicators.

#### Key Performance Indicators (KPIs)

**1. Total Assets**
- **Calculation**: `COUNT(*)` from `tams360.assets`
- **Display**: Large number with icon
- **Update**: Real-time on page load
- **Purpose**: Overall inventory size

**2. Active Assets**
- **Calculation**: `COUNT(*) WHERE status = 'Active'`
- **Display**: Number with percentage of total
- **Update**: Real-time
- **Purpose**: Track operational assets

**3. Pending Inspections**
- **Calculation**: Count of assets where:
  - Last inspection > 90 days ago (for routine)
  - OR scheduled inspection date is today or past
  - OR asset marked "further_inspection_required"
- **Display**: Number with urgent badge if > 10
- **Update**: Real-time
- **Purpose**: Inspection compliance tracking

**4. Pending Maintenance**
- **Calculation**: `COUNT(*) FROM maintenance_records WHERE status IN ('Scheduled', 'In Progress')`
- **Display**: Number with color coding by urgency
- **Update**: Real-time
- **Purpose**: Work order backlog monitoring

#### Analytics Charts

**Chart 1: Assets by Type (Bar Chart)**
- **Data Source**: `tams360.assets` grouped by `asset_type_id`
- **X-Axis**: Asset type names
- **Y-Axis**: Count of assets
- **Color**: Primary brand color (#39AEDF)
- **Calculation**:
  ```sql
  SELECT at.name, COUNT(a.asset_id) as count
  FROM tams360.assets a
  JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id
  GROUP BY at.name
  ORDER BY count DESC
  ```
- **Interactive**: Hover shows exact count
- **Purpose**: Understand asset portfolio composition

**Chart 2: Condition Distribution (Pie Chart)**
- **Data Source**: `tams360.assets` grouped by `condition_id`
- **Segments**: Excellent, Good, Fair, Poor
- **Colors**: 
  - Excellent: Green (#10B981)
  - Good: Blue (#3B82F6)
  - Fair: Yellow (#F59E0B)
  - Poor: Red (#DC2626)
- **Calculation**:
  ```sql
  SELECT c.name, COUNT(a.asset_id) as count,
         ROUND((COUNT(a.asset_id) * 100.0 / SUM(COUNT(a.asset_id)) OVER ()), 1) as percentage
  FROM tams360.assets a
  JOIN tams360.condition_lookup c ON a.condition_id = c.condition_id
  GROUP BY c.name
  ```
- **Display**: Percentage labels on segments
- **Purpose**: Overall fleet health assessment

**Chart 3: Monthly Inspection Trend (Line Chart)**
- **Data Source**: `tams360.inspections` grouped by month
- **X-Axis**: Months (last 12 months)
- **Y-Axis**: Number of inspections
- **Line Color**: Primary (#39AEDF)
- **Calculation**:
  ```sql
  SELECT 
    DATE_TRUNC('month', inspection_date) as month,
    COUNT(*) as count
  FROM tams360.inspections
  WHERE inspection_date >= NOW() - INTERVAL '12 months'
  GROUP BY month
  ORDER BY month ASC
  ```
- **Interactive**: Hover shows month and count
- **Purpose**: Track inspection activity and compliance

**Chart 4: Maintenance Status (Stacked Bar Chart)**
- **Data Source**: `tams360.maintenance_records` grouped by status
- **Categories**: Scheduled, In Progress, Completed, Cancelled
- **Colors**: Status-specific
- **Calculation**:
  ```sql
  SELECT status, COUNT(*) as count
  FROM tams360.maintenance_records
  GROUP BY status
  ```
- **Purpose**: Work order pipeline visibility

#### Recent Activity Feed
- **Data Source**: Latest 10 records from assets, inspections, maintenance
- **Display**: Chronological list with icons
- **Includes**:
  - Asset additions (last 24 hours)
  - Inspections completed (last 7 days)
  - Maintenance completions (last 7 days)
- **Purpose**: Quick visibility into recent changes

---

### 2. 🏗️ Asset Management

#### Asset Data Model

Each asset record contains:

**Identification**
- **Reference Number**: Unique identifier (e.g., "SGN-001", "GRD-045")
  - Format: TYPE-XXX (3-digit sequential)
  - Validation: Must be unique across all assets
  - Auto-generated option available
- **Asset Name**: Descriptive name (e.g., "Speed Limit Sign 60km/h")
- **Asset Type**: Selected from 9 predefined types

**Location Information**
- **Road Number**: Highway/road identifier (e.g., "N1", "A104")
- **Road Name**: Full road name (e.g., "Main Highway", "Eastern Bypass")
- **Kilometer Marker**: Precise location on road (decimal format: XX.XXX)
  - Validation: Must be >= 0
  - Used for sorting and navigation
- **GPS Coordinates**:
  - Latitude: Decimal degrees (-90 to 90)
  - Longitude: Decimal degrees (-180 to 180)
  - Precision: 6 decimal places (~0.1m accuracy)
  - Captured via: Manual entry, device GPS, or map selection
- **Region**: Geographic region (links to regions table)
- **Depot**: Assigned maintenance depot (links to depots table)

**Asset Status & Condition**
- **Installation Date**: When asset was installed (date picker)
- **Installer Name**: Company or person who installed it
- **Current Status**: One of:
  - Active: Operational and in use
  - Damaged: Has damage but still in place
  - Missing: Asset is missing or stolen
  - Repaired: Recently repaired
  - Replaced: Has been replaced
  - Decommissioned: Removed from service
- **Condition**: Assessment score (1-4):
  - 4 = Excellent: Like new condition
  - 3 = Good: Minor wear, fully functional
  - 2 = Fair: Noticeable wear, needs attention
  - 1 = Poor: Significant deterioration
- **Expected Lifespan**: Years (used for replacement planning)

**Additional Information**
- **Notes**: Free-text field for comments
- **Metadata**: JSONB field for custom attributes
- **Created By**: User who added the asset
- **Created At**: Timestamp of creation
- **Updated By**: Last user to modify
- **Updated At**: Last modification timestamp

#### Asset Operations

**Create Asset**
1. Click "Add New Asset" button
2. Fill required fields (marked with *)
3. Optional: Click "Get GPS Location" to auto-fill coordinates
4. Optional: Add notes
5. Click "Create Asset"
6. System generates unique ID
7. Record saved to database
8. Success notification shown
9. Asset appears in list

**Search & Filter Assets**
- **Search**: Text search across reference number, name, type, road name
  - Case-insensitive
  - Partial matching supported
  - Real-time results
- **Filter by Type**: Dropdown with 9 asset types + "All Types"
- **Filter by Status**: Active, Damaged, Missing, etc.
- **Filter by Condition**: Excellent, Good, Fair, Poor
- **Combined Filters**: All filters work together (AND logic)

**View Asset Details**
- Click "View" icon on asset row
- Modal/page shows:
  - All asset information
  - Related inspections (chronological)
  - Maintenance history
  - Photos (from inspections)
  - Location on mini-map
- Action buttons:
  - Edit Asset
  - Schedule Inspection
  - Create Maintenance Work Order
  - View on Map

**Update Asset**
1. Click "Edit" icon on asset row
2. Form pre-filled with current values
3. Modify any fields
4. Click "Update Asset"
5. Server validates changes
6. Database updated with new values
7. `updated_at` timestamp refreshed
8. `updated_by` set to current user
9. Success notification shown

**Delete Asset** (Admin only)
1. Click "Delete" icon on asset row
2. Confirmation dialog appears
3. User confirms deletion
4. System checks for dependencies:
   - If asset has inspections: Warn user
   - If asset has maintenance records: Warn user
   - Option to cascade delete or soft delete
5. Asset removed from database (or marked deleted)
6. Success notification shown

#### Asset Types Configuration

Pre-configured 9 types:

| Type | Abbreviation | Icon | Description |
|------|--------------|------|-------------|
| **Signage** | SGN | 🚏 | Road signs (speed limits, warnings, directions) |
| **Guardrail** | GRD | 🛡️ | Safety guardrails and barriers |
| **Traffic Signal** | TRS | 🚦 | Traffic lights and electronic signs |
| **Gantry** | GNT | 🌉 | Overhead structures |
| **Fence** | FEN | 🔒 | Perimeter fencing |
| **Safety Barrier** | SFB | 🚧 | Concrete and plastic barriers |
| **Guidepost** | GDP | 📍 | Delineator posts and markers |
| **Road Marking** | RDM | 🎨 | Painted lines and markings |
| **Raised Road Marker** | RRM | ⚫ | Reflective road studs |

Admins can add new types via database or future admin UI.

---

### 3. 🔍 Inspection Management

#### Inspection Types & Scheduling

**1. Routine Inspection**
- **Frequency**: Every 90 days
- **Scheduled**: Yes (automatic)
- **Purpose**: Regular condition assessment
- **Triggered by**: 
  - 90 days since last inspection
  - System-generated schedule
- **Priority**: Medium (unless asset in poor condition)

**2. Incident Inspection**
- **Frequency**: Ad-hoc
- **Scheduled**: No
- **Purpose**: Investigate reported issues (accidents, complaints, observations)
- **Triggered by**: 
  - Incident reports
  - Public complaints
  - Emergency calls
- **Priority**: High to Immediate (based on incident severity)

**3. Verification Inspection**
- **Frequency**: Ad-hoc
- **Scheduled**: No
- **Purpose**: Confirm maintenance work completed satisfactorily
- **Triggered by**: Maintenance work order completion
- **Priority**: Medium
- **Required**: Before closing work order

**4. Compliance Inspection**
- **Frequency**: Annually (365 days)
- **Scheduled**: Yes
- **Purpose**: Regulatory compliance checks
- **Triggered by**: Regulatory requirements
- **Priority**: Medium (becomes high 30 days before due)
- **Documentation**: Required for audit trail

**5. Safety Audit**
- **Frequency**: Bi-annually (180 days)
- **Scheduled**: Yes
- **Purpose**: Comprehensive safety assessment
- **Triggered by**: Safety policy requirements
- **Priority**: High
- **Scope**: More detailed than routine inspection

#### Inspection Data Capture

**Required Fields**
- Asset Reference (search/select from existing assets)
- Inspection Date & Time
- Inspector Name (auto-filled from logged-in user)
- Inspection Type (dropdown)
- Finding Summary (brief text)

**Optional but Recommended**
- Detailed Observations (long text)
- Urgency Level (1-4)
- Recommended Action (what should be done)
- Further Inspection Required (checkbox)
- Weather Conditions (text)
- GPS Coordinates (can differ from asset if inspected from different location)

**Photo Attachments**
- Multiple photos per inspection
- Upload from device camera or gallery
- Automatic thumbnail generation (planned)
- Caption for each photo
- EXIF data preserved (GPS, timestamp)
- Storage in Supabase Storage (planned)

#### Urgency Levels & Response Times

| Level | Label | Description | Response Time | Action |
|-------|-------|-------------|---------------|--------|
| **1** | 🔴 Immediate | Critical safety issue requiring immediate attention | 1 day | Create emergency work order, notify supervisor |
| **2** | 🟠 High | Significant issue requiring prompt action | 7 days | Create high-priority work order |
| **3** | 🟡 Medium | Moderate issue to be addressed soon | 30 days | Schedule maintenance |
| **4** | 🟢 Low | Minor issue for routine maintenance | 90 days | Add to maintenance backlog |

#### Inspection Workflow

```
1. SCHEDULE/TRIGGER
   ├─→ System generates routine inspection schedule
   ├─→ Incident reported (manual creation)
   └─→ Maintenance completion (verification needed)

2. ASSIGNMENT
   ├─→ Auto-assigned to depot field users
   └─→ Manual assignment by supervisor

3. FIELD INSPECTION
   ├─→ Inspector navigates to asset location
   ├─→ Conducts physical inspection
   ├─→ Takes photos of condition/damage
   └─→ Records findings in mobile app

4. DATA ENTRY
   ├─→ Fill inspection form
   ├─→ Select urgency level
   ├─→ Recommend actions
   └─→ Submit inspection

5. REVIEW (if required)
   ├─→ Supervisor reviews findings
   ├─→ Approves or requests re-inspection
   └─→ May escalate urgency

6. MAINTENANCE DECISION
   ├─→ If urgent (1-2): Create work order immediately
   ├─→ If medium (3): Schedule in next maintenance cycle
   └─→ If low (4): Add to backlog

7. DOCUMENTATION
   ├─→ Inspection saved to database
   ├─→ Linked to asset record
   ├─→ Photos uploaded and linked
   └─→ Audit trail created
```

---

### 4. 🛠️ Maintenance Management

#### Work Order System

**Work Order Structure**
- **Work Order Number**: Auto-generated unique ID (WO-YYYYMMDD-XXX)
- **Asset Reference**: Link to specific asset
- **Inspection Reference**: Optional link to triggering inspection
- **Maintenance Type**: Categories:
  - Repair: Fix existing asset
  - Replace: Full replacement
  - Preventive: Scheduled maintenance
  - Emergency: Urgent response
  - Upgrade: Improvements
  - Cleaning: Routine cleaning
- **Description**: Detailed work description
- **Scheduled Date**: When work should be done
- **Completed Date**: When work was actually completed
- **Status**: Current state of work order
- **Assigned To**: Field user or contractor
- **Estimated Cost**: Budget allocation
- **Actual Cost**: Real cost incurred
- **Urgency**: Inherited from inspection or manually set
- **Contractor Name**: External contractor if applicable
- **Notes**: Additional information

#### Maintenance Status Workflow

```
                    ┌──────────────┐
                    │  SCHEDULED   │ (Work order created)
                    └──────┬───────┘
                           │
                ┌──────────┴──────────┐
                │                     │
                ↓                     ↓
        ┌───────────────┐     ┌─────────────┐
        │ IN PROGRESS   │     │  CANCELLED  │ (Work not needed)
        └───────┬───────┘     └─────────────┘
                │
                ↓
        ┌───────────────┐
        │  COMPLETED    │ (Work finished)
        └───────┬───────┘
                │
                ↓
        ┌───────────────┐
        │  VERIFIED     │ (Post-inspection done)
        └─────────────��─┘
```

**Status Transitions**
- **Scheduled → In Progress**: Field user starts work
- **Scheduled → Cancelled**: Work no longer needed
- **In Progress → Completed**: Field user finishes work
- **Completed → Verified**: Supervisor/inspector confirms quality
- **Completed → Scheduled**: Rework needed (creates new WO)

#### Cost Tracking & Budgeting

**Cost Calculations**

**1. Estimated Cost**
- Based on urgency level (from costing table):
  ```sql
  SELECT urgency_1_cost, urgency_2_cost, urgency_3_cost, urgency_4_cost
  FROM tams360.costing_table
  WHERE asset_type_id = [asset's type]
  ```
- Applied when creating work order
- Used for budget planning

**2. Actual Cost**
- Recorded upon work completion
- Includes:
  - Labor costs
  - Material costs
  - Equipment rental
  - Contractor fees
- Tracked for budget variance analysis

**3. Cost Variance**
- **Formula**: `Actual Cost - Estimated Cost`
- **Percentage**: `((Actual - Estimated) / Estimated) * 100`
- **Alert**: Flag if variance > 20%

**4. Total Maintenance Cost per Asset**
- **Calculation**:
  ```sql
  SELECT SUM(actual_cost) as total_cost
  FROM tams360.maintenance_records
  WHERE asset_id = [asset's ID] AND status = 'Completed'
  ```
- **Purpose**: Lifecycle cost tracking
- **Decision Support**: Replace vs Repair analysis

**5. Cost per Asset Type**
- **Calculation**:
  ```sql
  SELECT at.name, SUM(m.actual_cost) as total_cost, COUNT(*) as work_orders,
         AVG(m.actual_cost) as avg_cost
  FROM tams360.maintenance_records m
  JOIN tams360.assets a ON m.asset_id = a.asset_id
  JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id
  WHERE m.status = 'Completed'
  GROUP BY at.name
  ```
- **Purpose**: Budget allocation by asset category

**6. Monthly Budget Tracking**
- **Calculation**:
  ```sql
  SELECT DATE_TRUNC('month', completed_date) as month,
         SUM(actual_cost) as total_spent
  FROM tams360.maintenance_records
  WHERE status = 'Completed' AND completed_date >= '2024-01-01'
  GROUP BY month
  ORDER BY month
  ```
- **Display**: Line chart showing spend trend
- **Alert**: Notify if monthly budget exceeded

#### Costing Table

Pre-defined cost estimates per asset type:

| Asset Type | Urgency 1 | Urgency 2 | Urgency 3 | Urgency 4 | Replacement | Annual Maint. |
|-----------|-----------|-----------|-----------|-----------|-------------|---------------|
| Signage | $500 | $300 | $200 | $100 | $1,500 | $150 |
| Guardrail | $2,000 | $1,500 | $1,000 | $500 | $5,000 | $400 |
| Traffic Signal | $5,000 | $3,000 | $2,000 | $1,000 | $25,000 | $2,000 |
| Gantry | $10,000 | $7,000 | $5,000 | $2,000 | $100,000 | $5,000 |
| ... | ... | ... | ... | ... | ... | ... |

*Note: These are default estimates. Admins can update via costing_table.*

---

### 5. 🗺️ GIS Map Interface

#### Map Features

**Interactive Map Display**
- **Base Layer**: OpenStreetMap (planned: Leaflet integration)
- **Asset Markers**: Color-coded by condition
  - 🟢 Green: Excellent condition
  - 🔵 Blue: Good condition
  - 🟡 Yellow: Fair condition
  - 🔴 Red: Poor condition
- **Marker Clustering**: Assets group together when zoomed out
- **Click Interaction**: Click marker to see asset details popup
- **Zoom Controls**: +/- buttons and mouse wheel
- **Pan**: Click and drag to move map
- **Current Location**: Blue dot shows user's GPS position

#### Layer Control System

**Asset Layer Visibility**
- **Individual Control**: Toggle each asset type on/off
  - Checkbox for each of 9 asset types
  - Real-time update on map
  - Count badge shows number of each type
- **Bulk Controls**:
  - "Show All" button: Enable all 9 layers
  - "Hide All" button: Disable all 9 layers
- **Filtered Display**: Only visible layers appear in:
  - Map markers
  - Asset count
  - Asset list below map

**Layer Visibility Logic**
```javascript
// Asset is displayed if:
1. Layer for its type is enabled (checkbox checked)
   AND
2. Asset passes filter criteria (type, condition, status)
   AND
3. Asset passes search query (if search term entered)
```

#### External Overlay Layers (Admin Feature)

**Purpose**: Add reference data from external GIS sources

**Supported Formats**:
1. **GeoJSON**: Vector features (polygons, lines, points)
   - Example: District boundaries, road networks
2. **KML**: Google Earth format
   - Example: Exported from GIS systems
3. **WMS** (Web Map Service): Raster tiles
   - Example: Satellite imagery, topographic maps

**Adding an Overlay Layer** (Admin/Supervisor only):
1. Navigate to Map page
2. Click "Overlays" tab in control panel
3. Click "+ Add" button
4. Fill in overlay details:
   - **Layer Name**: Display name (e.g., "Municipal Boundaries")
   - **Data Type**: Select GeoJSON, KML, or WMS
   - **Data URL**: External URL to data file
     - Must be publicly accessible
     - CORS-enabled for browser access
   - **Display Color**: Pick color for features (#HEX format)
   - **Description**: Optional notes about data source
5. Click "Add Layer"
6. Layer saved to database
7. Layer appears in overlays list

**Managing Overlay Layers**:
- **Toggle Visibility**: Click eye icon to show/hide
- **Delete Layer**: Click trash icon (admin only)
- **Active Indicator**: Top-left corner shows count of active overlays
- **Permission**: Regular users can toggle but not add/delete

**Use Cases for Overlays**:
- Municipal/district boundaries
- Road network from transport authority
- Construction zones
- Traffic management zones
- Environmental protected areas
- Utility infrastructure (water, power)
- Flood zones
- Land use zoning
- Property boundaries

#### Navigation Features

**Navigate to Asset**:
1. Select asset on map or from list
2. Click "Navigate Here" button
3. System checks if GPS coordinates exist
4. Opens Google Maps in new tab with:
   - **If user location known**: Directions from current position to asset
     - URL: `https://www.google.com/maps/dir/?api=1&origin=LAT,LNG&destination=LAT,LNG`
   - **If user location unknown**: Just shows asset location
     - URL: `https://www.google.com/maps/search/?api=1&query=LAT,LNG`
5. User can use Google Maps navigation on their device

**Get My Location**:
1. Click "My Location" button (top-right)
2. Browser requests location permission
3. User grants permission
4. GPS coordinates captured
5. Blue dot appears on map at user position
6. Success toast shows coordinates
7. Stored for navigation functionality

**Center on Asset**:
1. Select asset from list
2. Click "Center on Map" button
3. Map pans and zooms to asset location
4. Success notification shown

#### Search & Filter on Map

**Search Functionality**:
- Text input searches across:
  - Asset reference number
  - Asset name
  - Asset type
  - Road name
- Real-time filtering as you type
- Case-insensitive
- Results update on map and in asset list

**Filter Controls** (3 tabs):

**Tab 1: Filters**
- Search bar
- Asset Type dropdown
- Condition dropdown
- Status dropdown
- All filters combine with AND logic

**Tab 2: Layers**
- Individual checkboxes for 9 asset types
- Show All / Hide All buttons
- Asset count badges
- Condition legend

**Tab 3: Overlays**
- List of external overlay layers
- Eye icon to toggle visibility
- Add button (admin only)
- Delete button (admin only)

#### Map Statistics

**Bottom-Left Overlay**:
- **Assets on Map**: Count of visible assets
- **of X total**: Total assets in database
- **Updates**: Real-time as filters/layers change

**Example**:
```
Assets on Map
     47
of 156 total
```

Indicates 47 assets are currently visible (after filters/layers applied) out of 156 total assets in system.

---

### 6. 👤 User Management & Admin Console

#### User Registration Flow

**New User Registration**:
1. User clicks "Register" on login page
2. Fills registration form:
   - Full Name
   - Email (used as username)
   - Organization
   - Password (minimum 8 characters)
3. Clicks "Create Account"
4. System checks if this is first user:
   - **If YES**: Auto-approved as Admin
   - **If NO**: Status set to "Pending"
5. Account created in Supabase Auth
6. User profile saved to KV store
7. Confirmation message shown
8. **First User**: Can login immediately
9. **Subsequent Users**: Must wait for admin approval

**Admin Approval Process**:
1. Admin logs in
2. Navigates to Admin Console
3. Sees notification: "X pending registrations"
4. Clicks "User Management"
5. Pending users highlighted in list
6. Admin clicks on pending user
7. Reviews:
   - Name
   - Email
   - Organization
   - Registration date
8. Decides to approve or reject
9. If approving:
   - Selects role (field_user, supervisor, or admin)
   - Optionally assigns tier (basic, premium, enterprise)
   - Clicks "Approve"
10. User status changes to "Approved"
11. User receives email notification (planned)
12. User can now log in

**Rejection**:
- Admin can reject registration
- User account remains in "Pending" or moved to "Rejected"
- User cannot login
- Rejection reason recorded (planned)

#### Role-Based Access Control

**Four User Roles**:

**1. Admin (Highest Privileges)**
- **Access Level**: Full system access
- **Can Do**:
  - All dashboard and module access
  - Create/edit/delete assets
  - Conduct inspections
  - Schedule and complete maintenance
  - Manage users (approve, assign roles, suspend)
  - Access admin console
  - Add/delete overlay layers on map
  - View and export all reports
  - Access audit logs
  - Configure system settings
- **Cannot Do**: N/A (full access)
- **Use Case**: System administrators, IT managers
- **Count**: Typically 1-3 per organization

**2. Supervisor**
- **Access Level**: Management oversight
- **Can Do**:
  - View all dashboards and analytics
  - Create/edit assets (cannot delete)
  - Conduct and approve inspections
  - Schedule maintenance work orders
  - Complete maintenance work
  - Add/delete overlay layers on map
  - Oversee assigned depot/region
  - View reports for their region
  - Export data
- **Cannot Do**:
  - Manage users
  - Access admin console
  - Delete assets
  - Change system settings
- **Use Case**: Regional managers, depot supervisors
- **Count**: Multiple per region/depot

**3. Field User**
- **Access Level**: Operational tasks
- **Can Do**:
  - View dashboards (their region/depot)
  - Create new assets
  - Edit assets they created
  - Conduct inspections
  - Update maintenance status (for assigned work)
  - Use mobile app for field work
  - Take and upload photos
  - View map and navigate to assets
  - Export limited reports
- **Cannot Do**:
  - Delete assets
  - Approve inspections
  - Schedule maintenance
  - Manage users
  - Access admin console
  - Add/delete overlay layers
- **Use Case**: Field inspectors, maintenance crews
- **Count**: Majority of users

**4. Viewer**
- **Access Level**: Read-only
- **Can Do**:
  - View dashboards
  - View asset information
  - View inspections
  - View maintenance records
  - View map
  - Export reports
- **Cannot Do**:
  - Create or modify any data
  - Conduct inspections
  - Perform maintenance
  - Access admin functions
- **Use Case**: Management, stakeholders, auditors
- **Count**: Variable based on organization

**Permission Matrix**:

| Module/Action | Admin | Supervisor | Field User | Viewer |
|---------------|-------|------------|------------|--------|
| **Dashboard** |||||
| View KPIs | ✅ | ✅ | ✅ | ✅ |
| View Charts | ✅ | ✅ | ✅ | ✅ |
| View All Data | ✅ | ✅ | ❌ (Region only) | ✅ |
| **Assets** |||||
| View Assets | ✅ | ✅ | ✅ | ✅ |
| Create Asset | ✅ | ✅ | ✅ | ❌ |
| Edit Asset | ✅ | ✅ | ✅ (Own only) | ❌ |
| Delete Asset | ✅ | ❌ | ❌ | ❌ |
| **Inspections** |||||
| View Inspections | ✅ | ✅ | ✅ | ✅ |
| Conduct Inspection | ✅ | ✅ | ✅ | ❌ |
| Approve Inspection | ✅ | ✅ | ❌ | ❌ |
| Upload Photos | ✅ | ✅ | ✅ | ❌ |
| **Maintenance** |||||
| View Work Orders | ✅ | ✅ | ✅ (Assigned) | ✅ |
| Create Work Order | ✅ | ✅ | ❌ | ❌ |
| Update Status | ✅ | ✅ | ✅ (Assigned) | ❌ |
| Assign Work Order | ✅ | ✅ | ❌ | ❌ |
| Complete Work Order | ✅ | ✅ | ✅ (Assigned) | ❌ |
| **Map** |||||
| View Map | ✅ | ✅ | ✅ | ✅ |
| Navigate to Asset | ✅ | ✅ | ✅ | ✅ |
| Toggle Layers | ✅ | ✅ | ✅ | ✅ |
| Add Overlay Layer | ✅ | ✅ | ❌ | ❌ |
| Delete Overlay Layer | ✅ | ✅ | ❌ | ❌ |
| **Admin Console** |||||
| Access Console | ✅ | ❌ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ | ❌ |
| Approve Registrations | ✅ | ❌ | ❌ | ❌ |
| View Audit Logs | ✅ | ❌ | ❌ | ❌ |
| System Settings | ✅ | ❌ | ❌ | ❌ |
| **Reports** |||||
| View Reports | ✅ | ✅ | ✅ (Limited) | ✅ |
| Export to Excel | ✅ | ✅ | ✅ | ❌ |
| Export to PDF | ✅ | ✅ | ❌ | ❌ |

#### User Tier System (Optional)

Organizations can implement tiered access:

**Basic Tier**
- Standard access for role
- 100 assets limit
- 1 depot/region assignment
- Standard support

**Premium Tier**
- Enhanced access
- 1,000 assets limit
- Multiple depot/region assignments
- Priority support
- Advanced reports

**Enterprise Tier**
- Unlimited access
- Unlimited assets
- Custom reporting
- API access (planned)
- Dedicated support

---

## Mobile Usage Guide

### 📱 Accessing TAMS360 on Mobile Devices

TAMS360 is a **Progressive Web App (PWA)** that works seamlessly on mobile devices without requiring download from app stores.

#### Installation Methods

**Method 1: Mobile Browser**
1. Open Chrome (Android) or Safari (iOS)
2. Navigate to TAMS360 URL
3. Log in with credentials
4. Use directly in browser

**Method 2: Add to Home Screen (Recommended)**

**Android (Chrome)**:
1. Open TAMS360 in Chrome
2. Tap menu (⋮) → "Add to Home screen"
3. Name it "TAMS360"
4. Tap "Add"
5. Icon appears on home screen
6. Launch like a native app

**iOS (Safari)**:
1. Open TAMS360 in Safari
2. Tap Share button (⬆️)
3. Scroll down → "Add to Home Screen"
4. Name it "TAMS360"
5. Tap "Add"
6. Icon appears on home screen
7. Launch for full-screen experience

#### Mobile Features

**GPS Location Capture**:
1. Navigate to Add Asset or Inspection form
2. Click "Get GPS Location" button
3. **First Time**: Browser asks for permission
4. Tap "Allow" to grant location access
5. Coordinates auto-filled in form (6 decimal precision)
6. Success message shows coordinates

**Note**: For geolocation to work:
- Location services must be enabled on device
- Browser must have location permission
- Works best outdoors with clear GPS signal
- May use WiFi triangulation indoors

**Photo Capture** (Planned):
1. Open inspection form
2. Tap "Add Photo" button
3. Choose:
   - "Take Photo" → Opens camera
   - "Choose Existing" → Opens gallery
4. Capture/select photo
5. Photo uploads to cloud
6. Thumbnail shown in form

**Offline Mode** (Planned for Future):
- Cache recently viewed assets
- Queue new inspections when offline
- Auto-sync when connection restored
- Download maps for offline use

#### Mobile Workflows

**Field Workflow 1: Add New Asset**
```
1. Navigate to asset location
2. Open TAMS360 on mobile
3. Tap "Assets" menu item
4. Tap "Add New Asset" button
5. Fill required fields:
   - Reference number
   - Asset type
   - Name
6. Tap "Get GPS Location"
   → Coordinates captured automatically
7. Take photos (planned)
8. Add notes
9. Tap "Create Asset"
10. Success! Asset added to system
```

**Field Workflow 2: Conduct Inspection**
```
1. Open TAMS360
2. Navigate to asset (via map or search)
3. Tap asset to view details
4. Tap "New Inspection"
5. Fill inspection form:
   - Date/time (auto-filled)
   - Inspection type
   - Findings
   - Condition
   - Urgency level
6. Take photos of issues
7. Capture GPS location
8. Add recommended actions
9. Submit inspection
10. System creates maintenance work order if urgent
```

**Field Workflow 3: Update Maintenance**
```
1. Open "Maintenance" module
2. View "My Work Orders"
3. Tap assigned work order
4. Review details
5. Tap "Start Work"
   → Status: Scheduled → In Progress
6. Complete work
7. Tap "Mark as Complete"
8. Enter actual cost
9. Add completion notes
10. Take before/after photos
11. Submit
12. Status: In Progress → Completed
```

#### Mobile Best Practices

**Battery Conservation**:
- Use app in short bursts
- Close browser when done
- Enable battery saver mode for long field days
- Reduce screen brightness

**Data Usage**:
- Connect to WiFi before syncing large photo batches
- Disable auto-photo upload on cellular if limited data
- Download maps for offline use (when available)

**Screen Orientation**:
- **Portrait**: Better for forms and lists
- **Landscape**: Better for maps and charts

**Performance Tips**:
- Close other apps to free memory
- Clear browser cache monthly
- Keep browser updated
- Restart device if app becomes slow

---

## Database Schema

### Schema Organization

TAMS360 uses a **two-schema architecture**:

**Primary Schema: `tams360`**
- Contains all actual tables
- Isolated from other applications
- All data stored here
- Row Level Security (RLS) enabled

**Public Schema: `public`**
- Contains views pointing to `tams360` tables
- Provides backward compatibility
- API queries use public views
- INSTEAD OF triggers enable full CRUD

**Benefits**:
- Multi-tenant capability
- Database organization
- Easy to add more apps
- Clear separation of concerns

### Core Tables

#### 1. `tams360.kv_store_c894a9ff`

**Purpose**: Key-value store for application data and user authentication

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `key` | TEXT | PRIMARY KEY | Unique identifier (e.g., "user:email", "asset:id") |
| `value` | JSONB | NOT NULL | JSON payload with actual data |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | When record was created |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last modification time |

**Indexes**:
- `idx_tams360_kv_store_key_prefix` on `key` (text_pattern_ops) for prefix searches

**Sample Data**:
```json
{
  "key": "user:admin@example.com",
  "value": {
    "email": "admin@example.com",
    "name": "Admin User",
    "organization": "Road Authority",
    "role": "admin",
    "status": "approved",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

**Key Patterns**:
- `user:{userId}` - User profiles
- `user:{email}` - User lookup by email
- `registration:{email}` - Pending registrations
- `asset:{assetId}` - Asset records
- `inspection:{inspectionId}` - Inspection records
- `maintenance:{maintenanceId}` - Maintenance work orders
- `overlay:{overlayId}` - Map overlay layers
- `audit:{timestamp}` - Audit trail events

---

#### 2. `tams360.assets`

**Purpose**: Main asset registry

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `asset_id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique asset identifier |
| `asset_ref` | VARCHAR(50) | UNIQUE, NOT NULL | User-visible reference (e.g., "SGN-001") |
| `asset_type_id` | UUID | FOREIGN KEY → asset_types | Type of asset |
| `road_number` | VARCHAR(20) | | Road/highway identifier |
| `road_name` | VARCHAR(200) | | Full road name |
| `km_marker` | DECIMAL(10,3) | | Kilometer location on road |
| `region` | VARCHAR(100) | | Geographic region |
| `depot` | VARCHAR(100) | | Assigned maintenance depot |
| `gps_lat` | DECIMAL(10,8) | | Latitude (-90 to 90) |
| `gps_lng` | DECIMAL(11,8) | | Longitude (-180 to 180) |
| `install_date` | DATE | | Installation date |
| `status_id` | UUID | FOREIGN KEY → asset_status | Current status |
| `condition_id` | UUID | FOREIGN KEY → condition_lookup | Condition assessment |
| `notes` | TEXT | | Additional comments |
| `metadata` | JSONB | | Flexible custom attributes |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation time |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update time |
| `created_by` | UUID | | User who created record |
| `updated_by` | UUID | | User who last updated |

**Indexes**:
- `idx_tams360_assets_type` on `asset_type_id`
- `idx_tams360_assets_status` on `status_id`
- `idx_tams360_assets_location` on `(gps_lat, gps_lng)`
- `idx_tams360_assets_ref` on `asset_ref`

**Relationships**:
- **One-to-Many**: One asset has many inspections
- **One-to-Many**: One asset has many maintenance records
- **Many-to-One**: Many assets belong to one asset type
- **Many-to-One**: Many assets have one status
- **Many-to-One**: Many assets have one condition

**Sample Metadata JSONB**:
```json
{
  "installer": "SafeRoads Ltd",
  "manufacturer": "SignTech Inc",
  "model": "ST-500",
  "serial_number": "SN12345",
  "warranty_expiry": "2025-12-31",
  "expected_lifespan_years": 10,
  "custom_field_1": "value1"
}
```

---

#### 3. `tams360.inspections`

**Purpose**: Inspection records for assets

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `inspection_id` | UUID | PRIMARY KEY | Unique inspection ID |
| `asset_id` | UUID | FK → assets, NOT NULL | Asset being inspected |
| `inspection_date` | TIMESTAMPTZ | NOT NULL | When inspection occurred |
| `inspector_user_id` | UUID | | User who conducted inspection |
| `inspector_name` | VARCHAR(200) | | Inspector's name |
| `inspection_type_id` | UUID | FK → inspection_types | Type of inspection |
| `finding_summary` | TEXT | | Brief summary of findings |
| `details` | TEXT | | Detailed observations |
| `further_inspection_required` | BOOLEAN | DEFAULT FALSE | Flag for follow-up |
| `urgency_id` | UUID | FK → urgency_lookup | Priority level |
| `recommended_action` | TEXT | | What should be done |
| `gps_lat` | DECIMAL(10,8) | | Latitude at inspection location |
| `gps_lng` | DECIMAL(11,8) | | Longitude at inspection location |
| `weather_conditions` | VARCHAR(100) | | Weather during inspection |
| `metadata` | JSONB | | Additional inspection data |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update |

**Indexes**:
- `idx_tams360_inspections_asset` on `asset_id`
- `idx_tams360_inspections_date` on `inspection_date`
- `idx_tams360_inspections_urgency` on `urgency_id`

**Relationships**:
- **Many-to-One**: Many inspections for one asset
- **One-to-Many**: One inspection has many photos
- **One-to-One** (optional): One inspection triggers one maintenance work order

**Sample Metadata**:
```json
{
  "temperature_celsius": 25,
  "visibility": "clear",
  "traffic_volume": "high",
  "safety_equipment_used": ["safety_vest", "hard_hat"],
  "inspection_duration_minutes": 15
}
```

---

#### 4. `tams360.inspection_photos`

**Purpose**: Photo attachments for inspections

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `photo_id` | UUID | PRIMARY KEY | Unique photo ID |
| `inspection_id` | UUID | FK → inspections | Related inspection |
| `asset_id` | UUID | FK → assets | Related asset |
| `photo_url` | VARCHAR(500) | NOT NULL | Cloud storage URL |
| `thumbnail_url` | VARCHAR(500) | | Thumbnail URL |
| `caption` | TEXT | | Photo description |
| `photo_date` | TIMESTAMPTZ | DEFAULT NOW() | When photo was taken |
| `uploaded_by` | UUID | | User who uploaded |
| `file_size_bytes` | INTEGER | | File size |
| `mime_type` | VARCHAR(100) | | Image format (image/jpeg, etc.) |
| `width` | INTEGER | | Image width in pixels |
| `height` | INTEGER | | Image height in pixels |
| `metadata` | JSONB | | EXIF data, GPS, etc. |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Upload timestamp |

**Indexes**:
- `idx_tams360_photos_inspection` on `inspection_id`
- `idx_tams360_photos_asset` on `asset_id`

**Sample Metadata (EXIF)**:
```json
{
  "camera_make": "Apple",
  "camera_model": "iPhone 14 Pro",
  "gps_lat": -1.286389,
  "gps_lng": 36.817223,
  "gps_altitude": 1650,
  "orientation": "portrait",
  "flash": false,
  "focal_length": "6.86mm"
}
```

---

#### 5. `tams360.maintenance_records`

**Purpose**: Maintenance work orders and history

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `maintenance_id` | UUID | PRIMARY KEY | Unique work order ID |
| `asset_id` | UUID | FK → assets, NOT NULL | Asset being maintained |
| `inspection_id` | UUID | FK → inspections | Triggering inspection (optional) |
| `work_order_number` | VARCHAR(50) | UNIQUE | User-visible WO number |
| `maintenance_type` | VARCHAR(100) | | Type of work (Repair, Replace, etc.) |
| `description` | TEXT | | Work description |
| `scheduled_date` | DATE | | When work should be done |
| `completed_date` | DATE | | When work was actually done |
| `status` | VARCHAR(50) | | Current status |
| `assigned_to` | UUID | | User or team assigned |
| `estimated_cost` | DECIMAL(12,2) | | Budget estimate |
| `actual_cost` | DECIMAL(12,2) | | Real cost incurred |
| `urgency_id` | UUID | FK → urgency_lookup | Priority level |
| `contractor_name` | VARCHAR(200) | | External contractor |
| `notes` | TEXT | | Additional information |
| `metadata` | JSONB | | Custom work order data |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Work order creation |
| `created_by` | UUID | | User who created WO |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update |

**Indexes**:
- `idx_tams360_maintenance_asset` on `asset_id`
- `idx_tams360_maintenance_status` on `status`

**Status Values**:
- `Scheduled`: Work planned
- `In Progress`: Work underway
- `Completed`: Work finished
- `Verified`: Post-inspection passed
- `Cancelled`: Work not needed

**Sample Metadata**:
```json
{
  "materials_used": ["paint", "bolts", "sealant"],
  "equipment_used": ["crane", "pressure_washer"],
  "labor_hours": 8,
  "crew_size": 3,
  "traffic_control_required": true,
  "road_closure_start": "2024-03-15T06:00:00Z",
  "road_closure_end": "2024-03-15T18:00:00Z"
}
```

---

#### 6. `tams360.user_profiles`

**Purpose**: User account information

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, FK → auth.users | Supabase Auth user ID |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | User email (username) |
| `name` | VARCHAR(200) | NOT NULL | Full name |
| `organization` | VARCHAR(200) | | Organization name |
| `role` | VARCHAR(50) | NOT NULL | admin/supervisor/field_user/viewer |
| `tier` | VARCHAR(50) | DEFAULT 'basic' | Subscription tier |
| `status` | VARCHAR(50) | NOT NULL | pending/approved/suspended |
| `depot_id` | UUID | FK → depots | Assigned depot |
| `region_id` | UUID | FK → regions | Assigned region |
| `phone` | VARCHAR(20) | | Contact phone |
| `avatar_url` | VARCHAR(500) | | Profile picture URL |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Account creation |
| `approved_at` | TIMESTAMPTZ | | When admin approved |
| `approved_by` | UUID | FK → auth.users | Admin who approved |
| `last_login_at` | TIMESTAMPTZ | | Last login timestamp |
| `metadata` | JSONB | | Additional user data |

**Indexes**:
- `idx_tams360_user_profiles_role` on `role`
- `idx_tams360_user_profiles_status` on `status`
- `idx_tams360_user_profiles_email` on `email`

**Role Check Constraint**:
```sql
CHECK (role IN ('admin', 'supervisor', 'field_user', 'viewer'))
```

**Status Check Constraint**:
```sql
CHECK (status IN ('pending', 'approved', 'suspended'))
```

---

### Lookup Tables

#### `tams360.asset_types`

**Purpose**: Asset type categories

| Column | Type | Description |
|--------|------|-------------|
| `asset_type_id` | UUID | Primary key |
| `name` | VARCHAR(100) | Type name (e.g., "Signage") |
| `abbreviation` | VARCHAR(10) | Short code (e.g., "SGN") |
| `description` | TEXT | Detailed description |
| `icon_name` | VARCHAR(50) | Icon identifier |
| `is_active` | BOOLEAN | Enable/disable type |
| `display_order` | INTEGER | Sort order in dropdowns |
| `created_at` | TIMESTAMPTZ | Creation time |

**Pre-loaded Data**:
```sql
INSERT INTO tams360.asset_types (name, abbreviation, display_order) VALUES
('Signage', 'SGN', 1),
('Guardrail', 'GRD', 2),
('Traffic Signal', 'TRS', 3),
('Gantry', 'GNT', 4),
('Fence', 'FEN', 5),
('Safety Barrier', 'SFB', 6),
('Guidepost', 'GDP', 7),
('Road Marking', 'RDM', 8),
('Raised Road Marker', 'RRM', 9);
```

---

#### `tams360.asset_status`

**Purpose**: Asset status options

| Column | Type | Description |
|--------|------|-------------|
| `status_id` | UUID | Primary key |
| `name` | VARCHAR(50) | Status name |
| `description` | TEXT | What this status means |
| `is_active` | BOOLEAN | Enable/disable status |
| `color_hex` | VARCHAR(7) | Display color (#RRGGBB) |
| `display_order` | INTEGER | Sort order |
| `created_at` | TIMESTAMPTZ | Creation time |

**Pre-loaded Data**:
```sql
INSERT INTO tams360.asset_status (name, description, color_hex, display_order) VALUES
('Active', 'Asset is operational and in use', '#10B981', 1),
('Damaged', 'Asset has damage but is still in place', '#F59E0B', 2),
('Missing', 'Asset is missing or stolen', '#DC2626', 3),
('Repaired', 'Asset has been repaired', '#3B82F6', 4),
('Replaced', 'Asset has been replaced', '#8B5CF6', 5),
('Decommissioned', 'Asset removed from service', '#6B7280', 6);
```

---

#### `tams360.condition_lookup`

**Purpose**: Condition assessment scale

| Column | Type | Description |
|--------|------|-------------|
| `condition_id` | UUID | Primary key |
| `name` | VARCHAR(50) | Condition name |
| `score` | INTEGER | Numeric score (1-4) |
| `description` | TEXT | What this condition means |
| `color_hex` | VARCHAR(7) | Display color |
| `created_at` | TIMESTAMPTZ | Creation time |

**Pre-loaded Data**:
```sql
INSERT INTO tams360.condition_lookup (name, score, description, color_hex) VALUES
('Excellent', 4, 'Like new condition', '#10B981'),
('Good', 3, 'Minor wear, fully functional', '#3B82F6'),
('Fair', 2, 'Noticeable wear, needs attention', '#F59E0B'),
('Poor', 1, 'Significant deterioration', '#DC2626');
```

**Condition Score Usage**:
- Used in analytics to calculate average fleet condition
- Prioritizes maintenance (poor condition = higher priority)
- Trends over time show fleet degradation

---

#### `tams360.urgency_lookup`

**Purpose**: Priority levels with response times

| Column | Type | Description |
|--------|------|-------------|
| `urgency_id` | UUID | Primary key |
| `level` | INTEGER | Urgency level (1-4) |
| `label` | VARCHAR(50) | Display name |
| `description` | TEXT | When to use this level |
| `color_hex` | VARCHAR(7) | Display color |
| `response_time_days` | INTEGER | Target response time |
| `created_at` | TIMESTAMPTZ | Creation time |

**Pre-loaded Data**:
```sql
INSERT INTO tams360.urgency_lookup (level, label, description, color_hex, response_time_days) VALUES
(1, 'Immediate', 'Critical safety issue requiring immediate attention', '#DC2626', 1),
(2, 'High', 'Significant issue requiring prompt action', '#F59E0B', 7),
(3, 'Medium', 'Moderate issue to be addressed soon', '#3B82F6', 30),
(4, 'Low', 'Minor issue for routine maintenance', '#10B981', 90);
```

**Response Time Calculations**:
- Used to calculate work order due dates
- Alerts triggered when response time exceeded
- Performance metric: % of work orders completed within response time

---

#### `tams360.inspection_types`

**Purpose**: Types of inspections

| Column | Type | Description |
|--------|------|-------------|
| `inspection_type_id` | UUID | Primary key |
| `name` | VARCHAR(100) | Type name |
| `description` | TEXT | Purpose of this inspection type |
| `is_scheduled` | BOOLEAN | Is this a scheduled inspection? |
| `frequency_days` | INTEGER | How often (if scheduled) |
| `created_at` | TIMESTAMPTZ | Creation time |

**Pre-loaded Data**:
```sql
INSERT INTO tams360.inspection_types (name, description, is_scheduled, frequency_days) VALUES
('Routine', 'Scheduled routine inspection', TRUE, 90),
('Incident', 'Inspection following incident report', FALSE, NULL),
('Verification', 'Post-maintenance verification', FALSE, NULL),
('Compliance', 'Regulatory compliance inspection', TRUE, 365),
('Safety Audit', 'Comprehensive safety audit', TRUE, 180);
```

---

#### `tams360.regions`

**Purpose**: Geographic regions

| Column | Type | Description |
|--------|------|-------------|
| `region_id` | UUID | Primary key |
| `name` | VARCHAR(100) | Region name |
| `code` | VARCHAR(20) | Short code |
| `description` | TEXT | Region description |
| `boundary_geojson` | JSONB | GeoJSON polygon boundary |
| `created_at` | TIMESTAMPTZ | Creation time |

**Example**:
```sql
INSERT INTO tams360.regions (name, code, description) VALUES
('Northern Region', 'NR', 'All roads north of the capital'),
('Southern Region', 'SR', 'All roads south of the capital'),
('Eastern Region', 'ER', 'Coastal highways'),
('Western Region', 'WR', 'Mountain highways');
```

---

#### `tams360.depots`

**Purpose**: Maintenance depots

| Column | Type | Description |
|--------|------|-------------|
| `depot_id` | UUID | Primary key |
| `name` | VARCHAR(100) | Depot name |
| `code` | VARCHAR(20) | Short code |
| `region_id` | UUID | FK → regions |
| `address` | TEXT | Physical address |
| `gps_lat` | DECIMAL(10,8) | Latitude |
| `gps_lng` | DECIMAL(11,8) | Longitude |
| `contact_phone` | VARCHAR(20) | Contact number |
| `manager_user_id` | UUID | FK → user_profiles |
| `created_at` | TIMESTAMPTZ | Creation time |

---

#### `tams360.costing_table`

**Purpose**: Cost estimates by asset type and urgency

| Column | Type | Description |
|--------|------|-------------|
| `costing_id` | UUID | Primary key |
| `asset_type_id` | UUID | FK → asset_types |
| `estimated_lifespan_years` | INTEGER | Expected lifespan |
| `proposed_useful_life_years` | INTEGER | Depreciation period |
| `urgency_1_cost` | DECIMAL(12,2) | Immediate repair cost |
| `urgency_2_cost` | DECIMAL(12,2) | High priority cost |
| `urgency_3_cost` | DECIMAL(12,2) | Medium priority cost |
| `urgency_4_cost` | DECIMAL(12,2) | Low priority cost |
| `replacement_cost` | DECIMAL(12,2) | Full replacement cost |
| `annual_maintenance_cost` | DECIMAL(12,2) | Yearly maintenance budget |
| `currency` | VARCHAR(3) | Currency code (USD, EUR, etc.) |
| `effective_date` | DATE | When these costs take effect |
| `notes` | TEXT | Cost assumptions |
| `created_at` | TIMESTAMPTZ | Creation time |

**Usage**: 
- Auto-populate estimated cost when creating maintenance work order
- Budget planning by asset type
- Replace vs. repair decision support

---

### Row Level Security (RLS)

**All tables have RLS enabled**:

```sql
ALTER TABLE tams360.kv_store_c894a9ff ENABLE ROW LEVEL SECURITY;
ALTER TABLE tams360.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tams360.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE tams360.inspection_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tams360.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE tams360.user_profiles ENABLE ROW LEVEL SECURITY;
```

**Sample Policies**:

**Public Read (Assets)**:
```sql
CREATE POLICY "Public read assets" ON tams360.assets
  FOR SELECT USING (true);
```

**Authenticated Insert**:
```sql
CREATE POLICY "Auth insert assets" ON tams360.assets
  FOR INSERT TO authenticated WITH CHECK (true);
```

**Admin Full Access**:
```sql
CREATE POLICY "Admins full access" ON tams360.assets
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM tams360.user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

## Calculations & Analytics

### Dashboard KPI Calculations

**1. Total Assets Count**
```sql
SELECT COUNT(*) as total_assets
FROM tams360.assets;
```

**2. Active Assets Count**
```sql
SELECT COUNT(*) as active_assets
FROM tams360.assets a
JOIN tams360.asset_status s ON a.status_id = s.status_id
WHERE s.name = 'Active';
```

**3. Active Assets Percentage**
```sql
SELECT 
  COUNT(CASE WHEN s.name = 'Active' THEN 1 END) as active,
  COUNT(*) as total,
  ROUND((COUNT(CASE WHEN s.name = 'Active' THEN 1 END) * 100.0 / COUNT(*)), 1) as percentage
FROM tams360.assets a
JOIN tams360.asset_status s ON a.status_id = s.status_id;
```

**4. Pending Inspections**
```sql
-- Assets needing routine inspection (>90 days since last)
SELECT COUNT(DISTINCT a.asset_id) as pending_inspections
FROM tams360.assets a
LEFT JOIN LATERAL (
  SELECT inspection_date
  FROM tams360.inspections i
  WHERE i.asset_id = a.asset_id
  ORDER BY inspection_date DESC
  LIMIT 1
) last_inspection ON true
WHERE 
  last_inspection.inspection_date IS NULL 
  OR last_inspection.inspection_date < NOW() - INTERVAL '90 days';
```

**5. Pending Maintenance Count**
```sql
SELECT COUNT(*) as pending_maintenance
FROM tams360.maintenance_records
WHERE status IN ('Scheduled', 'In Progress');
```

**6. Overdue Maintenance Count**
```sql
SELECT COUNT(*) as overdue_maintenance
FROM tams360.maintenance_records m
JOIN tams360.urgency_lookup u ON m.urgency_id = u.urgency_id
WHERE 
  m.status = 'Scheduled' 
  AND m.scheduled_date + (u.response_time_days || ' days')::INTERVAL < NOW();
```

### Asset Analytics

**7. Assets by Type Distribution**
```sql
SELECT 
  at.name as asset_type,
  COUNT(a.asset_id) as count,
  ROUND((COUNT(a.asset_id) * 100.0 / SUM(COUNT(a.asset_id)) OVER ()), 1) as percentage
FROM tams360.assets a
JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id
GROUP BY at.name, at.display_order
ORDER BY at.display_order;
```

**8. Condition Distribution**
```sql
SELECT 
  c.name as condition,
  c.score,
  COUNT(a.asset_id) as count,
  ROUND((COUNT(a.asset_id) * 100.0 / SUM(COUNT(a.asset_id)) OVER ()), 1) as percentage
FROM tams360.assets a
JOIN tams360.condition_lookup c ON a.condition_id = c.condition_id
GROUP BY c.name, c.score
ORDER BY c.score DESC;
```

**9. Average Condition Score**
```sql
SELECT 
  AVG(c.score) as avg_condition_score,
  -- Interpretation:
  -- 4.0-3.5: Excellent fleet health
  -- 3.4-3.0: Good fleet health
  -- 2.9-2.0: Fair fleet health (maintenance needed)
  -- 1.9-1.0: Poor fleet health (urgent action required)
  CASE 
    WHEN AVG(c.score) >= 3.5 THEN 'Excellent'
    WHEN AVG(c.score) >= 3.0 THEN 'Good'
    WHEN AVG(c.score) >= 2.0 THEN 'Fair'
    ELSE 'Poor'
  END as fleet_health
FROM tams360.assets a
JOIN tams360.condition_lookup c ON a.condition_id = c.condition_id;
```

**10. Assets by Region**
```sql
SELECT 
  region,
  COUNT(*) as asset_count,
  COUNT(CASE WHEN s.name = 'Active' THEN 1 END) as active_count,
  COUNT(CASE WHEN c.score <= 2 THEN 1 END) as poor_condition_count
FROM tams360.assets a
JOIN tams360.asset_status s ON a.status_id = s.status_id
JOIN tams360.condition_lookup c ON a.condition_id = c.condition_id
GROUP BY region
ORDER BY asset_count DESC;
```

### Inspection Analytics

**11. Inspection Completion Rate**
```sql
-- Percentage of assets inspected in last 90 days
SELECT 
  COUNT(DISTINCT CASE 
    WHEN i.inspection_date >= NOW() - INTERVAL '90 days' 
    THEN a.asset_id 
  END) as inspected_recently,
  COUNT(DISTINCT a.asset_id) as total_assets,
  ROUND((COUNT(DISTINCT CASE 
    WHEN i.inspection_date >= NOW() - INTERVAL '90 days' 
    THEN a.asset_id 
  END) * 100.0 / COUNT(DISTINCT a.asset_id)), 1) as completion_rate
FROM tams360.assets a
LEFT JOIN tams360.inspections i ON a.asset_id = i.asset_id;
```

**12. Monthly Inspection Trend (Last 12 Months)**
```sql
SELECT 
  TO_CHAR(DATE_TRUNC('month', inspection_date), 'YYYY-MM') as month,
  DATE_TRUNC('month', inspection_date) as month_date,
  COUNT(*) as inspection_count,
  COUNT(DISTINCT asset_id) as unique_assets_inspected
FROM tams360.inspections
WHERE inspection_date >= NOW() - INTERVAL '12 months'
GROUP BY month, month_date
ORDER BY month_date;
```

**13. Inspections by Urgency**
```sql
SELECT 
  u.label as urgency_level,
  u.level,
  COUNT(*) as inspection_count,
  ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER ()), 1) as percentage
FROM tams360.inspections i
JOIN tams360.urgency_lookup u ON i.urgency_id = u.urgency_id
WHERE i.inspection_date >= NOW() - INTERVAL '30 days'
GROUP BY u.label, u.level
ORDER BY u.level;
```

**14. Inspections Requiring Follow-up**
```sql
SELECT COUNT(*) as follow_up_required
FROM tams360.inspections
WHERE further_inspection_required = TRUE
  AND inspection_date >= NOW() - INTERVAL '30 days';
```

### Maintenance Analytics

**15. Maintenance Status Distribution**
```sql
SELECT 
  status,
  COUNT(*) as count,
  ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER ()), 1) as percentage
FROM tams360.maintenance_records
GROUP BY status
ORDER BY count DESC;
```

**16. Average Maintenance Response Time**
```sql
-- Time from creation to completion
SELECT 
  u.label as urgency_level,
  AVG(EXTRACT(DAY FROM (completed_date - m.created_at::DATE))) as avg_response_days,
  u.response_time_days as target_days,
  CASE 
    WHEN AVG(EXTRACT(DAY FROM (completed_date - m.created_at::DATE))) <= u.response_time_days 
    THEN 'On Time'
    ELSE 'Overdue'
  END as performance
FROM tams360.maintenance_records m
JOIN tams360.urgency_lookup u ON m.urgency_id = u.urgency_id
WHERE m.status = 'Completed'
  AND m.completed_date IS NOT NULL
GROUP BY u.label, u.response_time_days, u.level
ORDER BY u.level;
```

**17. On-Time Completion Rate**
```sql
SELECT 
  COUNT(*) as total_completed,
  COUNT(CASE 
    WHEN EXTRACT(DAY FROM (completed_date - m.created_at::DATE)) <= u.response_time_days 
    THEN 1 
  END) as on_time,
  ROUND((COUNT(CASE 
    WHEN EXTRACT(DAY FROM (completed_date - m.created_at::DATE)) <= u.response_time_days 
    THEN 1 
  END) * 100.0 / COUNT(*)), 1) as on_time_percentage
FROM tams360.maintenance_records m
JOIN tams360.urgency_lookup u ON m.urgency_id = u.urgency_id
WHERE m.status = 'Completed' AND m.completed_date IS NOT NULL;
```

**18. Total Maintenance Cost (Period)**
```sql
SELECT 
  SUM(actual_cost) as total_cost,
  AVG(actual_cost) as avg_cost,
  MIN(actual_cost) as min_cost,
  MAX(actual_cost) as max_cost,
  COUNT(*) as work_order_count
FROM tams360.maintenance_records
WHERE status = 'Completed'
  AND completed_date >= '2024-01-01'
  AND completed_date < '2025-01-01';
```

**19. Cost Variance Analysis**
```sql
SELECT 
  SUM(estimated_cost) as total_estimated,
  SUM(actual_cost) as total_actual,
  SUM(actual_cost - estimated_cost) as total_variance,
  ROUND(((SUM(actual_cost) - SUM(estimated_cost)) / SUM(estimated_cost) * 100), 1) as variance_percentage
FROM tams360.maintenance_records
WHERE status = 'Completed' AND actual_cost IS NOT NULL;
```

**20. Maintenance Cost by Asset Type**
```sql
SELECT 
  at.name as asset_type,
  COUNT(m.maintenance_id) as work_orders,
  SUM(m.actual_cost) as total_cost,
  AVG(m.actual_cost) as avg_cost_per_wo,
  SUM(m.actual_cost) / NULLIF(COUNT(DISTINCT a.asset_id), 0) as avg_cost_per_asset
FROM tams360.maintenance_records m
JOIN tams360.assets a ON m.asset_id = a.asset_id
JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id
WHERE m.status = 'Completed'
GROUP BY at.name
ORDER BY total_cost DESC;
```

**21. Monthly Cost Trend**
```sql
SELECT 
  TO_CHAR(DATE_TRUNC('month', completed_date), 'YYYY-MM') as month,
  SUM(actual_cost) as total_cost,
  COUNT(*) as work_orders,
  AVG(actual_cost) as avg_cost
FROM tams360.maintenance_records
WHERE status = 'Completed'
  AND completed_date >= NOW() - INTERVAL '12 months'
GROUP BY month, DATE_TRUNC('month', completed_date)
ORDER BY DATE_TRUNC('month', completed_date);
```

### Asset Lifecycle Analytics

**22. Asset Age Distribution**
```sql
SELECT 
  CASE 
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, install_date)) < 1 THEN '< 1 year'
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, install_date)) < 3 THEN '1-3 years'
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, install_date)) < 5 THEN '3-5 years'
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, install_date)) < 10 THEN '5-10 years'
    ELSE '> 10 years'
  END as age_group,
  COUNT(*) as asset_count
FROM tams360.assets
WHERE install_date IS NOT NULL
GROUP BY age_group
ORDER BY 
  CASE age_group
    WHEN '< 1 year' THEN 1
    WHEN '1-3 years' THEN 2
    WHEN '3-5 years' THEN 3
    WHEN '5-10 years' THEN 4
    WHEN '> 10 years' THEN 5
  END;
```

**23. Assets Approaching End of Life**
```sql
-- Assets with age >= 80% of expected lifespan
SELECT 
  a.asset_ref,
  a.name,
  at.name as type,
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.install_date)) as current_age,
  c.expected_lifespan_years,
  ROUND((EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.install_date)) / c.expected_lifespan_years * 100), 0) as lifespan_used_pct
FROM tams360.assets a
JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id
JOIN tams360.costing_table c ON a.asset_type_id = c.asset_type_id
WHERE a.install_date IS NOT NULL
  AND c.expected_lifespan_years IS NOT NULL
  AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.install_date)) >= (c.expected_lifespan_years * 0.8)
ORDER BY lifespan_used_pct DESC;
```

**24. Replacement Planning (Next 12 Months)**
```sql
SELECT 
  at.name as asset_type,
  COUNT(*) as assets_due_replacement,
  SUM(c.replacement_cost) as total_replacement_cost
FROM tams360.assets a
JOIN tams360.asset_types at ON a.asset_type_id = at.asset_type_id
JOIN tams360.costing_table c ON a.asset_type_id = c.asset_type_id
WHERE a.install_date IS NOT NULL
  AND c.expected_lifespan_years IS NOT NULL
  AND a.install_date + (c.expected_lifespan_years || ' years')::INTERVAL <= CURRENT_DATE + INTERVAL '12 months'
GROUP BY at.name
ORDER BY total_replacement_cost DESC;
```

### User & Activity Analytics

**25. User Activity Summary**
```sql
SELECT 
  u.name as user_name,
  u.role,
  COUNT(DISTINCT a.asset_id) as assets_created,
  COUNT(DISTINCT i.inspection_id) as inspections_conducted,
  COUNT(DISTINCT m.maintenance_id) as work_orders_created
FROM tams360.user_profiles u
LEFT JOIN tams360.assets a ON u.id = a.created_by
LEFT JOIN tams360.inspections i ON u.id = i.inspector_user_id
LEFT JOIN tams360.maintenance_records m ON u.id = m.created_by
WHERE u.status = 'approved'
GROUP BY u.name, u.role
ORDER BY (COUNT(DISTINCT a.asset_id) + COUNT(DISTINCT i.inspection_id) + COUNT(DISTINCT m.maintenance_id)) DESC;
```

**26. Field User Productivity**
```sql
-- Inspections per field user in last 30 days
SELECT 
  u.name as field_user,
  COUNT(*) as inspections_completed,
  COUNT(DISTINCT DATE(i.inspection_date)) as active_days,
  ROUND(COUNT(*) / NULLIF(COUNT(DISTINCT DATE(i.inspection_date)), 0), 1) as inspections_per_day
FROM tams360.inspections i
JOIN tams360.user_profiles u ON i.inspector_user_id = u.id
WHERE u.role = 'field_user'
  AND i.inspection_date >= NOW() - INTERVAL '30 days'
GROUP BY u.name
ORDER BY inspections_completed DESC;
```

---

## API Reference

### Base URL

```
https://[PROJECT_ID].supabase.co/functions/v1/make-server-c894a9ff
```

Replace `[PROJECT_ID]` with your Supabase project ID.

### Authentication

**All requests** (except registration) require Authorization header:

```
Authorization: Bearer <access_token>
```

**For public endpoints**:
```
Authorization: Bearer <public_anon_key>
```

---

### Authentication Endpoints

#### POST `/auth/signup`

Register new user account.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "name": "John Doe",
  "organization": "Road Authority"
}
```

**Response** (201 Created):
```json
{
  "message": "User registered successfully. Awaiting admin approval.",
  "user": {
    "email": "user@example.com",
    "name": "John Doe",
    "organization": "Road Authority",
    "role": "field_user",
    "status": "pending",
    "createdAt": "2024-12-29T10:00:00Z"
  }
}
```

**First User Response**:
```json
{
  "message": "User registered as admin (first user).",
  "user": {
    "email": "admin@example.com",
    "name": "Admin User",
    "organization": "Road Authority",
    "role": "admin",
    "status": "approved",
    "createdAt": "2024-12-29T10:00:00Z"
  }
}
```

**Error Responses**:
- `400`: Missing required fields
- `409`: Email already registered
- `500`: Server error

---

#### POST `/auth/login`

Authenticate and get access token.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response** (200 OK):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "email": "user@example.com",
    "name": "John Doe",
    "role": "field_user",
    "status": "approved",
    "organization": "Road Authority"
  }
}
```

**Error Responses**:
- `401`: Invalid credentials
- `403`: User not approved yet
- `403`: User suspended
- `500`: Server error

---

#### GET `/auth/session`

Check current session validity.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response** (200 OK):
```json
{
  "user": {
    "email": "user@example.com",
    "name": "John Doe",
    "role": "field_user",
    "status": "approved"
  }
}
```

**Error Responses**:
- `401`: Invalid or expired token
- `500`: Server error

---

### Asset Endpoints

#### GET `/assets`

List all assets (with optional filtering).

**Query Parameters**:
- `type` (optional): Filter by asset type
- `status` (optional): Filter by status
- `condition` (optional): Filter by condition
- `search` (optional): Search term
- `limit` (optional): Results per page (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Example**:
```
GET /assets?type=Signage&condition=poor&limit=20
```

**Response** (200 OK):
```json
{
  "assets": [
    {
      "id": "asset-1234567890",
      "referenceNumber": "SGN-001",
      "name": "Speed Limit Sign 60km/h",
      "type": "Signage",
      "roadNumber": "N1",
      "roadName": "Main Highway",
      "kilometer": 45.2,
      "latitude": -1.286389,
      "longitude": 36.817223,
      "region": "Northern Region",
      "depot": "North Depot",
      "installDate": "2023-06-15",
      "condition": "Good",
      "status": "Active",
      "notes": "Recently repainted",
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-12-01T14:30:00Z"
    }
  ],
  "total": 156,
  "limit": 20,
  "offset": 0
}
```

---

#### POST `/assets`

Create new asset.

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "referenceNumber": "GRD-045",
  "name": "Steel Guardrail Section A",
  "type": "Guardrail",
  "roadNumber": "A104",
  "roadName": "Eastern Bypass",
  "kilometer": 12.5,
  "latitude": -1.23456,
  "longitude": 36.78901,
  "region": "Eastern Region",
  "depot": "East Depot",
  "installDate": "2024-01-15",
  "condition": "Excellent",
  "status": "Active",
  "notes": "New installation"
}
```

**Response** (201 Created):
```json
{
  "message": "Asset created successfully",
  "asset": {
    "id": "asset-9876543210",
    "referenceNumber": "GRD-045",
    "name": "Steel Guardrail Section A",
    ...
    "createdAt": "2024-12-29T15:00:00Z",
    "createdBy": "user-id-123"
  }
}
```

**Error Responses**:
- `400`: Missing required fields
- `401`: Unauthorized
- `409`: Reference number already exists
- `500`: Server error

---

#### GET `/assets/:id`

Get single asset with related data.

**Response** (200 OK):
```json
{
  "asset": {
    "id": "asset-1234567890",
    "referenceNumber": "SGN-001",
    ...
  },
  "inspections": [
    {
      "id": "inspection-111",
      "inspectionDate": "2024-12-15T10:00:00Z",
      "findingSummary": "Minor rust detected",
      "urgency": "Low"
    }
  ],
  "maintenance": [
    {
      "id": "maintenance-222",
      "workOrderNumber": "WO-20241215-001",
      "status": "Completed",
      "completedDate": "2024-12-20"
    }
  ],
  "photos": [
    {
      "id": "photo-333",
      "photoUrl": "https://storage.../photo.jpg",
      "caption": "Rust on lower section"
    }
  ]
}
```

---

#### PUT `/assets/:id`

Update existing asset.

**Request Body** (partial update supported):
```json
{
  "condition": "Fair",
  "notes": "Showing signs of rust, scheduled for maintenance"
}
```

**Response** (200 OK):
```json
{
  "message": "Asset updated successfully",
  "asset": {
    "id": "asset-1234567890",
    ...
    "condition": "Fair",
    "updatedAt": "2024-12-29T16:00:00Z",
    "updatedBy": "user-id-456"
  }
}
```

---

#### DELETE `/assets/:id`

Delete asset (admin only).

**Response** (200 OK):
```json
{
  "message": "Asset deleted successfully"
}
```

**Error Responses**:
- `403`: Admin access required
- `404`: Asset not found
- `409`: Cannot delete asset with related records
- `500`: Server error

---

### Inspection Endpoints

#### POST `/inspections`

Create new inspection.

**Request Body**:
```json
{
  "assetId": "asset-1234567890",
  "inspectionDate": "2024-12-29T14:30:00Z",
  "inspectionType": "Routine",
  "findingSummary": "Minor corrosion detected on lower section",
  "details": "Surface rust observed on bottom 30cm of guardrail...",
  "urgency": "Medium",
  "furtherInspectionRequired": false,
  "recommendedAction": "Clean and repaint affected area",
  "weatherConditions": "Clear, sunny, 25°C",
  "latitude": -1.23456,
  "longitude": 36.78901
}
```

**Response** (201 Created):
```json
{
  "message": "Inspection created successfully",
  "inspection": {
    "id": "inspection-9999",
    "assetId": "asset-1234567890",
    ...
    "createdAt": "2024-12-29T14:35:00Z"
  }
}
```

---

### Maintenance Endpoints

#### POST `/maintenance`

Create maintenance work order.

**Request Body**:
```json
{
  "assetId": "asset-1234567890",
  "inspectionId": "inspection-9999",
  "maintenanceType": "Repair",
  "description": "Clean rust and repaint guardrail section",
  "scheduledDate": "2024-12-30",
  "estimatedCost": 500.00,
  "urgency": "Medium",
  "assignedTo": "user-id-789",
  "notes": "Use anti-rust primer before painting"
}
```

**Response** (201 Created):
```json
{
  "message": "Work order created successfully",
  "workOrder": {
    "id": "maintenance-8888",
    "workOrderNumber": "WO-20241229-001",
    "status": "Scheduled",
    ...
    "createdAt": "2024-12-29T15:00:00Z"
  }
}
```

---

#### PUT `/maintenance/:id`

Update maintenance work order.

**Request Body**:
```json
{
  "status": "Completed",
  "completedDate": "2024-12-30",
  "actualCost": 475.00,
  "notes": "Work completed successfully. Used 2 liters of paint."
}
```

---

### Map Overlay Endpoints

#### GET `/map/overlays`

Get all overlay layers.

**Response** (200 OK):
```json
{
  "overlays": [
    {
      "id": "overlay-123",
      "name": "Municipal Boundaries",
      "description": "Official district boundaries",
      "type": "geojson",
      "url": "https://example.com/boundaries.geojson",
      "color": "#39AEDF",
      "defaultVisible": true,
      "createdBy": "admin@example.com",
      "createdAt": "2024-12-01T10:00:00Z"
    }
  ]
}
```

---

#### POST `/map/overlays`

Add overlay layer (admin/supervisor only).

**Request Body**:
```json
{
  "name": "Traffic Zones",
  "description": "Traffic management zones",
  "type": "geojson",
  "url": "https://example.com/zones.geojson",
  "color": "#F8D227",
  "defaultVisible": true
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "overlay": {
    "id": "overlay-456",
    ...
  }
}
```

---

#### DELETE `/map/overlays/:id`

Delete overlay layer (admin/supervisor only).

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Overlay deleted successfully"
}
```

---

### Admin Endpoints

#### GET `/admin/registrations/pending`

Get pending user registrations (admin only).

**Response** (200 OK):
```json
{
  "registrations": [
    {
      "email": "newuser@example.com",
      "name": "New User",
      "organization": "Contractor Co",
      "status": "pending",
      "createdAt": "2024-12-29T09:00:00Z"
    }
  ]
}
```

---

#### POST `/admin/registrations/approve`

Approve user registration (admin only).

**Request Body**:
```json
{
  "email": "newuser@example.com",
  "role": "field_user"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "User approved successfully",
  "user": {
    "email": "newuser@example.com",
    "role": "field_user",
    "status": "approved"
  }
}
```

---

## Security & Access Control

### Authentication Flow

```
1. USER REGISTRATION
   └─→ Email + Password → Supabase Auth
   └─→ Profile saved to KV store
   └─→ Status: "pending" (or "approved" if first user)

2. ADMIN APPROVAL (if not first user)
   └─→ Admin reviews registration
   └─→ Assigns role (admin/supervisor/field_user/viewer)
   └─→ Status: "pending" → "approved"

3. USER LOGIN
   └─→ Email + Password → Supabase Auth
   └─→ Supabase returns JWT access token
   └─→ Token includes user ID and email
   └─→ Client stores token in memory

4. API REQUESTS
   └─→ Client sends token in Authorization header
   └─→ Server verifies token with Supabase Auth
   └─→ Server loads user profile from KV store
   └─→ Server checks role/permissions
   └─→ Server processes request or returns 403 Forbidden
```

### Row Level Security (RLS)

All tables have RLS enabled. Policies:

**Public Read** (Assets, Inspections, Maintenance):
- Anyone can view (even unauthenticated)
- Supports public reporting and transparency

**Authenticated Write**:
- Must be logged in to create/update
- User ID automatically recorded

**Admin Delete**:
- Only admins can delete records
- Prevents accidental data loss

**Example Policy**:
```sql
-- Public can read all assets
CREATE POLICY "Public read assets" ON tams360.assets
  FOR SELECT USING (true);

-- Authenticated users can insert
CREATE POLICY "Auth insert assets" ON tams360.assets
  FOR INSERT TO authenticated WITH CHECK (true);

-- Only admins can delete
CREATE POLICY "Admin delete assets" ON tams360.assets
  FOR DELETE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM tams360.user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### Password Requirements

- **Minimum Length**: 8 characters
- **Recommended**: Mix of letters, numbers, symbols
- **Hashing**: Supabase handles with bcrypt
- **Reset**: Password reset flow (planned)

### Session Management

- **Token Type**: JWT (JSON Web Token)
- **Expiry**: 1 hour (Supabase default)
- **Refresh**: Auto-refresh (Supabase handles)
- **Storage**: Memory only (not localStorage for security)

### Audit Trail

All significant actions logged:

**Logged Events**:
- User registration
- User approval/rejection
- Asset creation/update/deletion
- Inspection creation
- Maintenance work order creation/completion
- Overlay layer addition/deletion

**Audit Record**:
```json
{
  "action": "asset_created",
  "userId": "user-id-123",
  "assetId": "asset-9999",
  "timestamp": "2024-12-29T10:00:00Z",
  "changes": {
    "referenceNumber": "SGN-001",
    "type": "Signage"
  }
}
```

**Access Audit Logs**: Admin Console → Audit Trail (admin only)

---

## Troubleshooting

### Common Issues

#### 1. "Invalid login credentials"

**Possible Causes**:
- Wrong email or password
- User not registered yet
- Typo in email

**Solutions**:
1. Check email spelling (case-sensitive)
2. Check password (case-sensitive)
3. Click "Register" if you don't have an account
4. Contact admin to verify account exists

---

#### 2. "User not approved"

**Cause**: Admin hasn't approved your registration yet

**Solution**:
1. Contact system administrator
2. Provide your registered email
3. Ask admin to approve in Admin Console → User Management
4. Wait for approval email (planned)

---

#### 3. "Geolocation not working"

**Possible Causes**:
- Location permission denied
- GPS disabled on device
- Poor GPS signal
- Using HTTPS required

**Solutions**:

**Desktop**:
1. Check browser location permission
2. Chrome: Click padlock icon → Site Settings → Location → Allow
3. Firefox: Click lock icon → Permissions → Location → Allow
4. Edge: Click lock icon → Permissions for this site → Location → Allow

**Mobile**:
1. Enable location services: Settings → Privacy → Location Services → On
2. Grant browser permission: Settings → Apps → Browser → Permissions → Location → Allow
3. Try outdoors for better GPS signal
4. Restart browser app

---

#### 4. "Photos not uploading" (Planned Feature)

**Possible Causes**:
- File too large (>10MB)
- Poor internet connection
- Browser storage full

**Solutions**:
1. Reduce photo quality/resolution
2. Check internet connection
3. Try uploading one at a time
4. Clear browser cache

---

#### 5. "Map not displaying assets"

**Possible Causes**:
- Assets don't have GPS coordinates
- All layers hidden
- Filters excluding all assets

**Solutions**:
1. Check if assets have latitude/longitude
2. Go to Layers tab → Click "Show All"
3. Clear search filter
4. Reset condition/status/type filters to "All"

---

#### 6. "Relation does not exist" database error

**Cause**: Database schema not set up correctly

**Solution**:
1. Run schema creation SQL (see documentation)
2. Verify `tams360` schema exists
3. Verify `public` views exist
4. Redeploy Edge Function
5. Clear browser cache
6. Contact administrator

---

#### 7. "Slow performance"

**Possible Causes**:
- Too many browser tabs
- Slow internet connection
- Large dataset
- Browser cache full

**Solutions**:
1. Close unused tabs
2. Clear browser cache: Settings → Privacy → Clear browsing data
3. Check internet speed
4. Try different browser
5. Restart browser/device

---

#### 8. "Cannot create work order"

**Possible Causes**:
- Insufficient permissions (viewer role)
- Asset doesn't exist
- Required fields missing

**Solutions**:
1. Check your role (must be supervisor or admin)
2. Verify asset exists in system
3. Fill all required fields (marked with *)
4. Check urgency level is selected
5. Contact supervisor for permission upgrade

---

### Error Codes

| Code | Meaning | Common Causes | Solution |
|------|---------|---------------|----------|
| 400 | Bad Request | Missing/invalid data in request | Check form fields, ensure all required fields filled |
| 401 | Unauthorized | Not logged in or token expired | Log in again |
| 403 | Forbidden | Insufficient permissions | Contact admin for role upgrade, or user not approved yet |
| 404 | Not Found | Resource doesn't exist | Verify ID/reference number, refresh page |
| 409 | Conflict | Duplicate entry | Use different reference number, item already exists |
| 500 | Server Error | Backend problem | Contact administrator, check server logs |

---

## Deployment & Configuration

### Supabase Setup

**1. Create Supabase Project**:
1. Go to https://supabase.com
2. Click "New Project"
3. Enter project name: "TAMS360"
4. Set database password (save securely)
5. Choose region (closest to users)
6. Wait for provisioning (~2 minutes)

**2. Run Database Schema**:
1. Open SQL Editor in Supabase dashboard
2. Copy complete schema SQL (see earlier in this doc)
3. Execute SQL
4. Verify tables created in `tams360` schema
5. Verify views created in `public` schema

**3. Deploy Edge Function**:
1. Install Supabase CLI: `npm install -g supabase`
2. Login: `supabase login`
3. Link project: `supabase link --project-ref [project-id]`
4. Deploy: `supabase functions deploy server`
5. Verify deployment in Functions tab

**4. Configure Environment**:
- Frontend needs:
  - `SUPABASE_URL`: From project settings
  - `SUPABASE_ANON_KEY`: From API settings (public)
- Backend has access to:
  - `SUPABASE_SERVICE_ROLE_KEY`: Automatically injected
  - `SUPABASE_URL`: Automatically injected

### Brand Colors

TAMS360 uses a professional infrastructure-tech color palette:

```css
/* Primary Brand Colors */
--color-deep-navy: #010D13;    /* Text, backgrounds */
--color-sky-blue: #39AEDF;      /* Primary actions, links */
--color-green: #5DB32A;         /* Success, positive states */
--color-yellow: #F8D227;        /* Warnings, highlights */
--color-slate-grey: #455B5E;    /* Secondary text, borders */

/* Status Colors */
--color-success: #10B981;       /* Excellent condition */
--color-primary: #3B82F6;       /* Good condition */
--color-warning: #F59E0B;       /* Fair condition */
--color-destructive: #DC2626;   /* Poor condition, errors */
```

### Typography

- **Font Family**: Inter (Google Fonts)
- **Font Weights**: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- **Base Size**: 16px
- **Scale**: Tailwind's default type scale

### Responsive Breakpoints

```css
sm: 640px   /* Small phones landscape */
md: 768px   /* Tablets portrait */
lg: 1024px  /* Tablets landscape, small desktops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large desktops */
```

### Browser Support

**Supported Browsers**:
- Chrome 90+ (recommended)
- Firefox 88+
- Safari 14+
- Edge 90+

**Mobile Browsers**:
- Chrome Mobile (Android)
- Safari Mobile (iOS)
- Samsung Internet

**Not Supported**:
- Internet Explorer (end of life)
- Opera Mini (limited JavaScript)

---

## Roadmap & Future Features

### Q1 2025

- [ ] **Photo Upload & Storage**: Supabase Storage integration for inspection photos
- [ ] **Offline Mode**: Service worker for offline data capture and sync
- [ ] **Bulk Import**: Excel/CSV import for existing asset data
- [ ] **Advanced Reporting**: PDF export, custom report builder
- [ ] **Email Notifications**: User approval emails, work order assignments

### Q2 2025

- [ ] **Native Mobile Apps**: iOS and Android apps with full offline support
- [ ] **Real Map Integration**: Leaflet/Mapbox for actual interactive maps
- [ ] **Route Optimization**: Suggest optimal inspection routes
- [ ] **Barcode/QR Scanning**: Quick asset lookup via scanning
- [ ] **Automated Scheduling**: AI-powered inspection scheduling

### Q3 2025

- [ ] **External System Integration**: APIs for accounting, GIS systems
- [ ] **AI Image Analysis**: Automatic damage detection from photos
- [ ] **Predictive Maintenance**: ML-based failure prediction
- [ ] **Advanced Analytics**: Trend analysis, forecasting
- [ ] **Custom Dashboards**: User-configurable widgets

### Q4 2025

- [ ] **Multi-language Support**: Internationalization (i18n)
- [ ] **Multi-tenancy**: Support multiple organizations
- [ ] **Public API**: RESTful API for third-party integrations
- [ ] **Mobile SDK**: Developer SDK for custom integrations
- [ ] **Compliance Reports**: Pre-built regulatory reports

---

## Support & Contact

**For Technical Support**:
- Check this documentation first
- Review troubleshooting section
- Check browser console for errors
- Contact system administrator

**For Feature Requests**:
- Submit via feedback form (planned)
- Email project manager
- Document use case and benefits

**For Training**:
- Review mobile usage guide
- Practice with test data
- Request hands-on training session
- Watch tutorial videos (planned)

**Documentation Updates**:
- This document is updated with each major release
- Check version number at top
- Suggest improvements to documentation team

---

## Appendix

### Glossary of Terms

| Term | Definition |
|------|------------|
| **Asset** | A physical road infrastructure item being managed |
| **Asset Reference** | Unique identifier for an asset (e.g., "SGN-001") |
| **Condition** | Assessment of physical state (Excellent/Good/Fair/Poor) |
| **Depot** | Maintenance facility or storage location |
| **Edge Function** | Serverless backend function running on Supabase |
| **GIS** | Geographic Information System (mapping) |
| **GPS** | Global Positioning System (latitude/longitude) |
| **Inspection** | Scheduled or ad-hoc assessment of asset condition |
| **JWT** | JSON Web Token (authentication token) |
| **KPI** | Key Performance Indicator (metric) |
| **KV Store** | Key-Value Store (database table) |
| **Maintenance** | Repair, replacement, or preventive work on assets |
| **Overlay Layer** | External GIS data displayed on map |
| **PWA** | Progressive Web App (works like native app) |
| **RLS** | Row Level Security (database access control) |
| **Urgency** | Priority level for maintenance (1-4) |
| **Work Order** | Formal request for maintenance work |

---

### Abbreviations

| Abbr | Full Term |
|------|-----------|
| API | Application Programming Interface |
| CRUD | Create, Read, Update, Delete |
| CSV | Comma-Separated Values |
| FK | Foreign Key |
| GeoJSON | Geographic JSON (data format) |
| HTTPS | HyperText Transfer Protocol Secure |
| KML | Keyhole Markup Language |
| PK | Primary Key |
| REST | Representational State Transfer |
| SQL | Structured Query Language |
| UI | User Interface |
| URL | Uniform Resource Locator |
| UUID | Universally Unique Identifier |
| WMS | Web Map Service |

---

### Quick Reference Commands

**Database Queries**:

```sql
-- Count total assets
SELECT COUNT(*) FROM tams360.assets;

-- Find assets needing inspection
SELECT * FROM tams360.assets a
LEFT JOIN LATERAL (
  SELECT inspection_date 
  FROM tams360.inspections i 
  WHERE i.asset_id = a.asset_id 
  ORDER BY inspection_date DESC LIMIT 1
) last ON true
WHERE last.inspection_date < NOW() - INTERVAL '90 days';

-- Get all pending work orders
SELECT * FROM tams360.maintenance_records 
WHERE status IN ('Scheduled', 'In Progress');

-- User registration count
SELECT COUNT(*) FROM tams360.user_profiles;

-- Total maintenance cost this year
SELECT SUM(actual_cost) 
FROM tams360.maintenance_records 
WHERE status = 'Completed' 
  AND EXTRACT(YEAR FROM completed_date) = EXTRACT(YEAR FROM CURRENT_DATE);
```

---

## License & Credits

**TAMS360** - Traffic Asset Management System 360°

**Version**: 1.0.0  
**Release Date**: December 29, 2024

**Built with**:
- React 18
- TypeScript
- Tailwind CSS v4
- Supabase
- Hono.js
- Recharts
- Radix UI
- Lucide Icons

**Design System**:
- Deep Navy (#010D13)
- Sky Blue (#39AEDF)
- Green (#5DB32A)
- Yellow Accent (#F8D227)
- Slate Grey (#455B5E)

**Typography**: Inter font family

**Developed by**: [Your Organization]

**For Support**: Contact your system administrator

---

**End of Documentation**

For the latest updates, check the version number at the top of this document.

*Last Updated: December 29, 2024*
