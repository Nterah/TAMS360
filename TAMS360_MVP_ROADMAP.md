# TAMS360 MVP Development Roadmap

## Current Status Analysis

### ✅ What's Working
1. **Authentication & User Management**
   - Basic login/signup with Supabase Auth
   - First user auto-approved as admin
   - Subsequent users require admin approval
   - Role-based access (admin, supervisor, field_user, viewer)
   - Admin console with user approval workflow

2. **Core Asset Management**
   - Asset creation, viewing, editing, deletion
   - Asset types and categorization
   - Asset inventory logging
   - GIS coordinate capture
   - Photo/document uploads (planned)

3. **Inspection System**
   - Inspection creation and tracking
   - Component-based scoring (CI calculation)
   - Template system for inspection types
   - Inspection history per asset

4. **Dashboard & Reporting**
   - Executive dashboard with analytics
   - CI distribution charts
   - Asset type summaries
   - Urgency tracking

5. **Mobile Interface**
   - Mobile Capture Hub landing page
   - Quick action buttons for field capture
   - Responsive mobile layouts
   - Offline mode indicators

6. **Infrastructure**
   - Supabase backend with KV store
   - Hono API server
   - React frontend with Tailwind CSS
   - PWA capabilities

---

## 🚨 Critical Gaps Preventing MVP

### 1. **MULTI-TENANCY (BLOCKING ISSUE #1)**
**Problem:** All users currently share the same data pool. No tenant isolation exists.

**Current State:**
- All assets/inspections visible to all users
- No `tenantId` or `organizationId` in data models
- Single shared KV store namespace
- No data segregation by organization

**Impact:** 
- Cannot deploy to multiple clients
- Data privacy violation risk
- No organizational boundaries

**Required Changes:**
- Add `tenantId` to all data records (assets, inspections, maintenance, users)
- Create tenant registration/setup flow
- Filter all queries by current user's `tenantId`
- Add tenant settings management
- Implement tenant-scoped admin permissions

---

### 2. **USER INVITATION SYSTEM (BLOCKING ISSUE #2)**
**Problem:** Users can only self-register and wait for approval. No admin-initiated invitations.

**Current State:**
- Users sign up themselves with email/password
- Admin can only approve/deny existing registrations
- No ability to invite specific users
- No email verification or invite links
- No domain-based auto-approval

**Impact:**
- Admin cannot proactively onboard team members
- No control over who attempts to register
- Poor onboarding experience

**Required Changes:**
- Admin can send email invitations with invite codes
- Invite links with expiration dates
- Pre-approved invites (no waiting for approval)
- Role assignment during invitation
- Track invitation status (sent, accepted, expired)

---

### 3. **DOMAIN-CONTROLLED ACCESS (BLOCKING ISSUE #3)**
**Problem:** No domain verification or restrictions exist.

**Current State:**
- Any email address can register
- No domain whitelisting/blacklisting
- No automatic approval based on email domain
- Organization field is free text, not validated

**Your Requirements:**
- Tenant creation at organization level
- Domain-controlled access per tenant OR
- Guest access with admin approval
- **Preferred:** All users must be invited by admin (domain doesn't matter)

**Required Changes:**
- Tenant domain configuration (optional whitelist)
- Invitation-only registration (disable self-signup)
- Admin-controlled user provisioning
- Guest user workflow with approval gates

---

### 4. **MOBILE DATA CAPTURE WORKFLOW**
**Problem:** Mobile interface exists but not optimized for field use.

**Current State:**
- Mobile Capture Hub shows buttons
- Asset/inspection forms work but not mobile-first
- Camera integration incomplete
- GPS auto-capture not implemented
- Photo compression missing
- Offline queue not functional

**Impact:**
- Field users struggle with data entry
- Photos too large for mobile upload
- No true offline capability
- GPS coordinates not auto-populated

**Required Changes:**
- Simplified mobile-first capture forms
- One-tap photo capture with compression
- Auto GPS detection and prefill
- Large touch targets for field use
- Barcode/QR scanning for asset IDs
- Progressive disclosure (show only essential fields)

---

### 5. **OFFLINE DATA SYNC**
**Problem:** Offline mode displayed but not functional.

**Current State:**
- OfflineContext exists but incomplete
- localStorage used for pending items
- No automatic sync when online
- No conflict resolution
- Sync status indicators present but not connected

**Impact:**
- Field users lose data if no connection
- Cannot work in rural areas without signal
- Data entry blocked by network issues

**Required Changes:**
- Implement proper offline queue with IndexedDB
- Background sync when connection restored
- Conflict resolution strategy
- Retry failed uploads
- Visual feedback for sync status

---

### 6. **ROLE-BASED DATA PERMISSIONS**
**Problem:** Roles exist but not enforced at data level.

**Current State:**
- UI navigation filtered by role
- Backend routes check authentication
- No field-level permissions
- No ownership model (who created what)
- Viewers can't distinguish read-only

**Impact:**
- Field users might edit others' work
- No audit trail of who changed what
- Supervisors can't review team captures

**Required Changes:**
- Enforce read/write permissions on backend
- Track created_by and updated_by fields
- Supervisor review workflow
- Field users see only their own captures (optional)
- Admins see everything within tenant

---

## 📋 Recommended MVP Roadmap

### Phase 1: Multi-Tenancy Foundation (PRIORITY 1)
**Goal:** Enable multiple organizations to use the system independently.

**Tasks:**
1. Add tenant registration flow (admin creates new tenant)
2. Add `tenantId` field to all data models:
   - users
   - assets
   - inspections
   - maintenance_records
   - asset_types (can be tenant-specific or global)
   - component_templates (can be tenant-specific or global)
3. Update all backend queries to filter by `tenantId`
4. Create tenant management admin page
5. Add tenant branding (logo, colors) - already partially exists
6. Test data isolation between tenants

**Success Criteria:**
- Two test tenants can coexist without seeing each other's data
- Admin can create and manage tenant accounts
- Users are scoped to their tenant

---

### Phase 2: Invitation-Only User Management (PRIORITY 2)
**Goal:** Admins control who joins their tenant.

**Tasks:**
1. Build user invitation UI in admin console
2. Generate secure invite tokens with expiration
3. Create invite acceptance page (replaces signup)
4. Email invite links (or display for manual sharing)
5. Pre-approve invited users (skip approval queue)
6. Track invitation status and usage
7. **DISABLE public signup** (optional based on your preference)

**Success Criteria:**
- Admin can invite users via email
- Invited users can register with invite code
- No uninvited users can register
- Role assigned during invitation

**Implementation Options:**
- **Option A (Your Preference):** Invitation-only, no domain restrictions
- **Option B:** Invitation OR domain whitelist (hybrid)
- **Option C:** Domain auto-approval for verified tenants

---

### Phase 3: Mobile-First Capture Optimization (PRIORITY 3)
**Goal:** Field users capture data quickly and easily on phones.

**Tasks:**
1. Redesign asset capture form for mobile:
   - Large touch targets
   - Minimal required fields
   - Photo-first workflow
   - GPS auto-detection
2. Implement native camera integration:
   - Direct camera access (not file picker)
   - Image compression before upload
   - Multiple photo support
3. Add barcode/QR scanner for asset ID lookup
4. Create inspection quick-capture mode
5. GPS coordinate auto-fill with accuracy indicator
6. Improve form validation and error messages
7. Add voice-to-text for notes (optional)

**Success Criteria:**
- Field user can capture asset in under 60 seconds
- Photos under 500KB each
- GPS coordinates auto-populated
- Works smoothly on 4G connections

---

### Phase 4: Offline Sync Implementation (PRIORITY 4)
**Goal:** Field users work without internet, sync when available.

**Tasks:**
1. Replace localStorage with IndexedDB for offline queue
2. Implement service worker for background sync
3. Queue create/update/delete operations
4. Auto-sync when connection detected
5. Show pending item count in UI
6. Manual "Sync Now" button
7. Handle sync conflicts (last-write-wins or manual resolution)
8. Retry failed uploads with exponential backoff

**Success Criteria:**
- Assets/inspections saved offline are synced automatically
- No data loss during network outages
- Clear visual feedback on sync status
- Successful sync after 24 hours offline

---

### Phase 5: Permission Enforcement & Audit Trail (PRIORITY 5)
**Goal:** Proper data access control and change tracking.

**Tasks:**
1. Add `created_by` and `updated_by` to all records
2. Implement backend permission checks:
   - Field users: create own assets, edit own records
   - Supervisors: view/edit team records
   - Admins: full access within tenant
3. Add audit log for critical changes
4. Display "created by" on asset/inspection details
5. Filter views based on role (optional: field users see only their own)
6. Add supervisor review/approval workflow (optional)

**Success Criteria:**
- Users cannot access data outside their tenant
- Field users cannot edit others' captures
- All changes logged with user ID and timestamp
- Audit trail visible to admins

---

### Phase 6: Polish & MVP Launch
**Goal:** Production-ready deployment.

**Tasks:**
1. Performance optimization (query speed, image loading)
2. Error handling and user-friendly messages
3. Data validation on backend
4. Security audit (XSS, CSRF, SQL injection via KV)
5. Mobile browser testing (Safari iOS, Chrome Android)
6. User acceptance testing with real field users
7. Documentation (user guide, admin guide)
8. Deployment checklist
9. Backup/restore procedures

**Success Criteria:**
- App loads in under 3 seconds on 4G
- No critical bugs in 1 week of testing
- Field users successfully capture 50+ assets
- Admins can manage users and view reports

---

## 🏗️ Technical Architecture Changes

### Multi-Tenancy Data Model
```typescript
// Updated User model
interface User {
  id: string;
  tenantId: string;  // NEW: Links to tenant
  email: string;
  name: string;
  role: "admin" | "supervisor" | "field_user" | "viewer";
  status: "approved" | "pending" | "denied";
  createdAt: string;
  invitedBy?: string;  // NEW: Track who invited
}

// New Tenant model
interface Tenant {
  id: string;
  name: string;  // "City of Cape Town"
  domain?: string;  // "capetown.gov.za" (optional)
  logoUrl?: string;
  primaryColor?: string;
  settings: {
    allowDomainSignup: boolean;
    requireInvitation: boolean;
    assetNumberFormat: string;
  };
  createdAt: string;
  ownerId: string;  // First admin user
}

// Updated Asset model
interface Asset {
  id: string;
  tenantId: string;  // NEW: Scope to tenant
  createdBy: string;  // NEW: User ID
  updatedBy?: string;  // NEW: Last editor
  // ... existing fields
}
```

### Invitation Flow
```
1. Admin clicks "Invite User"
2. Enter email, select role
3. System generates invite token
4. Email sent (or copy link manually)
5. User clicks link → lands on invite acceptance page
6. User enters name, password
7. Account created with pre-approved status
8. User immediately logged in
```

### Backend Query Pattern
```typescript
// Before (NO TENANT FILTERING)
const assets = await kv.getByPrefix("asset:");

// After (TENANT FILTERED)
const allAssets = await kv.getByPrefix("asset:");
const assets = allAssets.filter(a => a.tenantId === userTenantId);
```

---

## 🎯 MVP Success Metrics

### User Management
- ✅ Admin can create tenant account
- ✅ Admin can invite unlimited users
- ✅ Invited users onboard in under 2 minutes
- ✅ No uninvited users can access system
- ✅ Users scoped to their tenant only

### Mobile Data Capture
- ✅ Field user captures asset in under 60 seconds
- ✅ Photo upload works on slow networks
- ✅ GPS coordinates auto-populate
- ✅ Offline capture queues successfully
- ✅ 95% sync success rate

### Data Integrity
- ✅ Zero data leaks between tenants
- ✅ All changes tracked with user ID
- ✅ No data loss during offline operation
- ✅ Sync conflicts resolved correctly

### Performance
- ✅ Dashboard loads in under 3 seconds
- ✅ Asset list filters in under 1 second
- ✅ Map displays 1000+ assets smoothly
- ✅ Mobile app works on 3G networks

---

## 🚀 Proposed Implementation Order

### Week 1-2: Multi-Tenancy
- Add tenant model and registration
- Update all data models with `tenantId`
- Filter all queries by tenant
- Test data isolation

### Week 3: User Invitations
- Build invitation system
- Email/link generation
- Invite acceptance flow
- Disable public signup (optional)

### Week 4: Mobile Optimization
- Redesign capture forms
- Camera integration
- GPS auto-detection
- Photo compression

### Week 5: Offline Sync
- IndexedDB implementation
- Background sync worker
- Conflict resolution
- Retry logic

### Week 6: Permissions & Polish
- Role enforcement
- Audit trail
- Error handling
- Testing & bug fixes

---

## ⚠️ Critical Decisions Needed

### 1. User Registration Model
**Option A (Recommended):** Invitation-only
- Admins invite all users
- No public signup
- Domain doesn't matter
- **PRO:** Maximum control, best security
- **CON:** Admin overhead for every user

**Option B:** Domain + Invitation Hybrid
- Verified domain users auto-approved
- Others require invitation
- **PRO:** Easier for large organizations
- **CON:** Domain verification complexity

**Option C:** Open signup with approval
- Anyone can register
- Admin approves each request
- **PRO:** Easiest for users
- **CON:** Spam risk, admin overhead

**Your stated preference:** Option A (invitation-only)

---

### 2. Tenant Creation Model
**Option A:** Super-admin creates tenants
- You (TAMS360) create each tenant manually
- Provide first admin login credentials
- **PRO:** Full control, vetting clients
- **CON:** Manual process, bottleneck

**Option B:** Self-service tenant registration
- Organizations sign up themselves
- First user becomes tenant admin
- **PRO:** Scalable, no manual work
- **CON:** Less control, potential abuse

**Recommendation:** Option A for MVP, Option B for scale

---

### 3. Asset Visibility Model
**Option A:** Field users see only their captures
- **PRO:** Clean, focused view
- **CON:** Can't reference teammates' work

**Option B:** Field users see all tenant assets
- **PRO:** Collaborative, prevents duplicates
- **CON:** Cluttered for large datasets

**Option C:** Hybrid (toggle or supervisor-controlled)
- **PRO:** Flexible
- **CON:** Complex UI

**Recommendation:** Option B with good filtering

---

## 📝 Next Steps

1. **Review this document** and confirm priorities
2. **Decide on critical options** (invitation model, tenant creation, etc.)
3. **Approve implementation phases** or suggest changes
4. **Begin Phase 1 implementation** (multi-tenancy foundation)

---

## 📌 Notes

- All changes preserve existing data (migration-friendly)
- KV store remains primary data layer (no Postgres schema changes needed)
- Backend API routes already structured well for these additions
- Frontend components mostly need filtering logic, not rebuilding
- Estimated MVP timeline: **6 weeks** for all phases

---

**Generated:** 2026-01-11  
**Status:** Awaiting approval to proceed  
**Version:** 1.0
