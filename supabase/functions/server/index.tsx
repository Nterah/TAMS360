import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as calculations from "./calculations.tsx";
import { v4 as uuidv4 } from "npm:uuid@9";
import * as emailService from "./emailService.ts";
import * as userMgmt from "./userManagementRoutes.tsx";
import * as auditLogger from "./auditLogger.tsx";
import { quickSetup } from "./quickSetup.tsx";

/**
 * TAMS360 Backend Server
 * 
 * CRITICAL POSTGREST/SUPABASE REQUIREMENT:
 * ========================================
 * NEVER use schema-qualified table names (e.g., "tams360.table_name") in .from() queries!
 * PostgREST cannot detect foreign key relationships when schema prefix is used.
 * 
 * ❌ WRONG: .from("tams360.asset_component_templates")
 * ✅ CORRECT: .from("asset_component_templates")
 * 
 * All database tables are in the 'public' schema (Supabase default).
 * All .from() queries access the public schema by default (no need to specify schema).
 * 
 * Main tables:
 * - assets
 * - asset_types
 * - inspections
 * - inspection_component_scores
 * - maintenance_records
 * - asset_component_templates
 * - asset_component_template_items
 * - asset_inventory_log
 * - users
 * 
 * Dashboard views:
 * - dashboard_ci_distribution
 * - dashboard_urgency_summary
 * - dashboard_asset_type_summary
 */

const app = new Hono();

// Supabase admin client (for database operations)
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
);

// Supabase client for auth validation (uses anon key)
const supabaseAuth = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_ANON_KEY") || "",
);

// Retry helper for network failures with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const errorMessage = error?.message || String(error);
      
      // Check if it's a DNS/network error
      if (errorMessage.includes("dns error") || 
          errorMessage.includes("name resolution") ||
          errorMessage.includes("ENOTFOUND") ||
          errorMessage.includes("network")) {
        
        const delay = baseDelay * Math.pow(2, i); // Exponential backoff
        console.log(`🔄 Network error on attempt ${i + 1}/${maxRetries}. Retrying in ${delay}ms...`);
        console.log(`Error: ${errorMessage.substring(0, 200)}`);
        
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      // If not a network error, or max retries reached, throw immediately
      throw error;
    }
  }
  throw lastError;
}

// Helper function to check if a string is a valid UUID
function isValidUuid(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Enable logger
app.use("*", logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-c894a9ff/health", (c) => {
  return c.json({ status: "ok" });
});

// Database diagnostics endpoint
app.get("/make-server-c894a9ff/diagnostics", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    console.log("Running database diagnostics...");
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      user: userData.user.email,
      checks: {}
    };

    // Check if user profile exists
    try {
      const { data: userProfile, error: profileError } = await supabase
        .from('tams360_user_profiles_v')
        .select('id, tenant_id, email, name, role, status')
        .eq('id', userData.user.id)
        .single();

      diagnostics.checks.userProfile = {
        exists: !!userProfile,
        error: profileError?.message || null,
        data: userProfile
      };

      if (userProfile?.tenant_id) {
        // Check tenant
        const { data: tenant, error: tenantError } = await supabase
          .from('tams360_tenants_v')
          .select('*')
          .eq('tenant_id', userProfile.tenant_id)
          .single();

        diagnostics.checks.tenant = {
          exists: !!tenant,
          error: tenantError?.message || null,
          data: tenant
        };

        // Check assets view
        const { data: assets, error: assetsError, count } = await supabase
          .from('tams360_assets_v')
          .select('*', { count: 'exact', head: false })
          .eq('tenant_id', userProfile.tenant_id)
          .limit(5);

        diagnostics.checks.assets = {
          viewExists: !assetsError || assetsError?.code !== 'PGRST200',
          error: assetsError?.message || null,
          count: count,
          sample: assets
        };

        // Try to check the underlying assets table
        const { data: rawAssets, error: rawAssetsError } = await supabase
          .from('assets')
          .select('asset_id, asset_ref, asset_type_id, tenant_id, gps_lat, gps_lng')
          .eq('tenant_id', userProfile.tenant_id)
          .limit(5);

        diagnostics.checks.assetsTable = {
          tableExists: !rawAssetsError || rawAssetsError?.code !== 'PGRST200',
          error: rawAssetsError?.message || null,
          sample: rawAssets
        };

        // Check for any assets at all (no tenant filter)
        const { count: totalAssets, error: totalError } = await supabase
          .from('assets')
          .select('asset_id', { count: 'exact', head: true });

        diagnostics.checks.allAssets = {
          totalCount: totalAssets,
          error: totalError?.message || null
        };
      }
    } catch (error: any) {
      diagnostics.checks.error = error.message;
    }

    return c.json(diagnostics);
  } catch (error: any) {
    console.error("Diagnostics error:", error);
    return c.json({ error: "Failed to run diagnostics", details: error.message }, 500);
  }
});

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

// Helper endpoint to check user tenant status and provide migration path
app.get("/make-server-c894a9ff/auth/check-tenant", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    console.log(`Checking tenant for user: ${userData.user.id} (${userData.user.email})`);

    // Get user profile from Postgres database
    const { data: userProfile, error: profileError } = await supabase
      .from('tams360_user_profiles_v')
      .select('id, tenant_id, email, name, role, status')
      .eq('id', userData.user.id)
      .single();
    
    // Check if user exists in database
    if (profileError || !userProfile) {
      console.log(`User profile not found in database: ${userData.user.id}`);
      return c.json({
        hasTenant: false,
        hasProfile: false,
        userId: userData.user.id,
        email: userData.user.email,
        suggestion: "create_tenant_or_accept_invite"
      });
    }

    // Check if user has tenant_id
    if (!userProfile.tenant_id) {
      console.log(`User exists but has no tenant_id: ${userData.user.id}`);
      return c.json({
        hasTenant: false,
        hasProfile: true,
        userId: userData.user.id,
        email: userData.user.email,
        profile: userProfile,
        suggestion: "assign_to_tenant"
      });
    }

    // Verify tenant exists in database
    const { data: tenant, error: tenantError } = await supabase
      .from('tams360_tenants_v')
      .select('tenant_id, name, domain, tier, status')
      .eq('tenant_id', userProfile.tenant_id)
      .single();
    
    console.log(`User ${userData.user.id} has tenant: ${userProfile.tenant_id}, tenant exists: ${!!tenant}`);
    
    return c.json({
      hasTenant: true,
      hasProfile: true,
      tenantId: userProfile.tenant_id,
      tenantExists: !!tenant,
      profile: userProfile,
      tenant: tenant || null
    });
  } catch (error) {
    console.error("Error checking tenant status:", error);
    return c.json({ error: "Failed to check tenant status" }, 500);
  }
});

// Migrate existing user to new tenant (for users created before tenant system)
app.post("/make-server-c894a9ff/auth/migrate-to-tenant", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    const body = await c.req.json();
    const { tenantName, tenantDomain } = body;

    if (!tenantName) {
      return c.json({ error: "Organization name is required" }, 400);
    }

    // Generate tenant ID as proper UUID
    const tenantId = uuidv4();

    // Check if tenant name already exists
    const allTenants = await kv.getByPrefix("tenant:");
    const existingTenant = allTenants.find(
      (t: any) => t.name && t.name.toLowerCase() === tenantName.toLowerCase()
    );
    if (existingTenant) {
      return c.json({ error: "An organization with this name already exists" }, 400);
    }

    // Calculate trial end date (30 days from now)
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 30);

    // Create tenant record
    await kv.set(`tenant:${tenantId}`, {
      id: tenantId,
      name: tenantName,
      domain: tenantDomain || null,
      ownerId: userData.user.id,
      tier: "trial",
      status: "active",
      trialEndsAt: trialEndDate.toISOString(),
      createdAt: new Date().toISOString(),
      settings: {
        allowDomainSignup: false,
        requireInvitation: true,
        assetNumberFormat: "TAMS-{YEAR}-{SEQ}",
      },
    });

    // Get or create user profile
    let userProfile = await kv.get(`user:${userData.user.id}`);
    
    if (!userProfile) {
      // Create new profile if it doesn't exist
      userProfile = {
        id: userData.user.id,
        email: userData.user.email,
        name: userData.user.user_metadata?.name || userData.user.email?.split('@')[0] || 'User',
        role: "admin",
        tier: "trial",
        status: "approved",
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        approvedBy: "system",
      };
    }

    // Update user profile with tenant
    await kv.set(`user:${userData.user.id}`, {
      ...userProfile,
      tenantId,
      role: "admin", // Make them admin of new org
      updatedAt: new Date().toISOString(),
    });

    return c.json({
      success: true,
      message: "Successfully created organization and migrated your account!",
      tenantId,
      userId: userData.user.id,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return c.json({ error: "Failed to migrate to tenant" }, 500);
  }
});

// Tenant signup (creates new organization with first admin user)
app.post("/make-server-c894a9ff/auth/tenant-signup", async (c) => {
  try {
    const body = await c.req.json();
    const { tenantName, tenantDomain, adminName, adminEmail, adminPassword } = body;

    if (!tenantName || !adminName || !adminEmail || !adminPassword) {
      return c.json({ error: "All fields are required" }, 400);
    }

    // Generate tenant ID as proper UUID
    const tenantId = uuidv4();

    // Check if tenant name already exists
    const allTenants = await kv.getByPrefix("tenant:");
    const existingTenant = allTenants.find(
      (t: any) => t.name.toLowerCase() === tenantName.toLowerCase()
    );
    if (existingTenant) {
      return c.json({ error: "An organization with this name already exists" }, 400);
    }

    // Create first admin user with Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      user_metadata: { name: adminName, tenantId },
      email_confirm: true,
    });

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    // Calculate trial end date (30 days from now)
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 30);

    // Create tenant record
    await kv.set(`tenant:${tenantId}`, {
      id: tenantId,
      name: tenantName,
      domain: tenantDomain || null,
      ownerId: data.user.id,
      tier: "trial",
      status: "active",
      trialEndsAt: trialEndDate.toISOString(),
      createdAt: new Date().toISOString(),
      settings: {
        allowDomainSignup: false,
        requireInvitation: true,
        assetNumberFormat: "TAMS-{YEAR}-{SEQ}",
      },
    });

    // Store admin user profile
    await kv.set(`user:${data.user.id}`, {
      id: data.user.id,
      tenantId,
      email: adminEmail,
      name: adminName,
      role: "admin",
      tier: "trial",
      status: "approved",
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      approvedBy: "system",
    });

    return c.json({
      success: true,
      message: "Organization created successfully! You can now log in.",
      tenantId,
      userId: data.user.id,
    });
  } catch (error) {
    console.error("Tenant signup error:", error);
    return c.json({ error: "Tenant registration failed" }, 500);
  }
});

// Migrate tenant from old format to UUID format
app.post("/make-server-c894a9ff/auth/migrate-tenant-to-uuid", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile
    const userProfile = await kv.get(`user:${userData.user.id}`);
    if (!userProfile || !userProfile.tenantId) {
      return c.json({ error: "No organization found to migrate" }, 400);
    }

    const oldTenantId = userProfile.tenantId;

    // If already UUID, no migration needed
    if (isValidUuid(oldTenantId)) {
      return c.json({ 
        success: true, 
        message: "Organization is already in the correct format",
        alreadyMigrated: true,
        tenantId: oldTenantId 
      });
    }

    console.log(`🔄 Starting migration for tenant: ${oldTenantId} -> UUID format`);

    // Get old tenant data
    const oldTenant = await kv.get(`tenant:${oldTenantId}`);
    if (!oldTenant) {
      return c.json({ error: "Organization data not found" }, 404);
    }

    // Generate new UUID for tenant
    const newTenantId = uuidv4();
    console.log(`✅ Generated new tenant UUID: ${newTenantId}`);

    // Create new tenant record with UUID
    await kv.set(`tenant:${newTenantId}`, {
      ...oldTenant,
      id: newTenantId,
      migratedFrom: oldTenantId,
      migratedAt: new Date().toISOString(),
    });
    console.log(`✅ Created new tenant record: tenant:${newTenantId}`);

    // Get all users for this tenant
    const allUsers = await kv.getByPrefix("user:");
    const tenantUsers = allUsers.filter((u: any) => u.tenantId === oldTenantId);
    console.log(`📋 Found ${tenantUsers.length} users to migrate`);

    // Update all user profiles with new tenant ID
    for (const user of tenantUsers) {
      await kv.set(`user:${user.id}`, {
        ...user,
        tenantId: newTenantId,
        migratedAt: new Date().toISOString(),
      });
      console.log(`✅ Migrated user: ${user.email}`);
    }

    // Update database records (assets, inspections, maintenance)
    // Since we use UUID in the database, we need to update all records
    try {
      // Update assets
      const { data: assets, error: assetsError } = await supabase
        .from("assets")
        .select("id")
        .eq("tenant_id", oldTenantId);

      if (!assetsError && assets && assets.length > 0) {
        const { error: updateError } = await supabase
          .from("assets")
          .update({ tenant_id: newTenantId })
          .eq("tenant_id", oldTenantId);

        if (updateError) {
          console.error("Error updating assets:", updateError);
        } else {
          console.log(`✅ Updated ${assets.length} assets`);
        }
      }

      // Update inspections
      const { data: inspections, error: inspectionsError } = await supabase
        .from("inspections")
        .select("id")
        .eq("tenant_id", oldTenantId);

      if (!inspectionsError && inspections && inspections.length > 0) {
        const { error: updateError } = await supabase
          .from("inspections")
          .update({ tenant_id: newTenantId })
          .eq("tenant_id", oldTenantId);

        if (updateError) {
          console.error("Error updating inspections:", updateError);
        } else {
          console.log(`✅ Updated ${inspections.length} inspections`);
        }
      }

      // Note: maintenance_records use asset relationships, so they follow assets automatically
      console.log(`✅ Database records updated (maintenance records follow asset relationships)`);

    } catch (dbError) {
      console.error("Database migration error:", dbError);
      // Continue with migration even if database update fails
      // The old tenant ID might not exist in database if it was only in KV
    }

    // Delete old tenant record
    await kv.del(`tenant:${oldTenantId}`);
    console.log(`🗑️ Deleted old tenant record: tenant:${oldTenantId}`);

    console.log(`✅ Migration completed successfully for tenant: ${oldTenantId} -> ${newTenantId}`);

    return c.json({
      success: true,
      message: "Organization successfully migrated to new format!",
      oldTenantId,
      newTenantId,
      usersMigrated: tenantUsers.length,
    });
  } catch (error) {
    console.error("❌ Tenant migration error:", error);
    return c.json({ 
      error: "Migration failed. Please contact support.", 
      details: String(error) 
    }, 500);
  }
});

// Validate invitation code (public endpoint)
app.get("/make-server-c894a9ff/auth/validate-invite/:code", async (c) => {
  try {
    const inviteCode = c.req.param("code");
    
    if (!inviteCode) {
      return c.json({ error: "Invitation code is required" }, 400);
    }

    console.log(`🔍 [VALIDATE-INVITE] Validating code: ${inviteCode}`);

    // Get invitation from KV store
    const invite = await kv.get(`invite:${inviteCode}`);
    
    if (!invite) {
      console.error("❌ [VALIDATE-INVITE] Invalid invitation code");
      return c.json({ error: "Invalid invitation code" }, 404);
    }

    // Check if invite is expired
    const now = new Date();
    const expiresAt = new Date(invite.expiresAt);
    if (now > expiresAt) {
      console.log("❌ [VALIDATE-INVITE] Invitation expired");
      return c.json({ error: "This invitation has expired" }, 400);
    }

    // Check if already accepted
    if (invite.status === "accepted") {
      console.log("❌ [VALIDATE-INVITE] Invitation already used");
      return c.json({ error: "This invitation has already been used" }, 400);
    }

    // Get organization name for display
    let organizationName = "TAMS360";
    if (invite.tenantId) {
      const { data: tenant } = await supabase
        .from('tams360_tenants_v')
        .select('name')
        .eq('tenant_id', invite.tenantId)
        .single();
      
      if (tenant) {
        organizationName = tenant.name;
      }
    }

    console.log(`✅ [VALIDATE-INVITE] Valid invitation for ${organizationName}`);

    return c.json({
      valid: true,
      invite: {
        code: invite.code,
        email: invite.email,
        role: invite.role,
        organizationName,
        expiresAt: invite.expires_at,
      },
    });
  } catch (error) {
    console.error("❌ [VALIDATE-INVITE] Error:", error);
    return c.json({ error: "Failed to validate invitation" }, 500);
  }
});

// User signup (invitation-only)
app.post("/make-server-c894a9ff/auth/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name, inviteCode } = body;

    // Validate invite code (required)
    if (!inviteCode) {
      return c.json({ 
        error: "Registration requires an invitation code. Please contact your administrator." 
      }, 403);
    }

    // Get invitation from KV store
    const inviteData = await kv.get(`invite:${inviteCode}`);

    if (!inviteData) {
      console.error("❌ [SIGNUP] Invalid invitation code:", inviteCode);
      return c.json({ error: "Invalid or expired invitation code" }, 400);
    }

    // Check invitation status
    if (inviteData.status !== "pending") {
      return c.json({ error: "This invitation has already been used" }, 400);
    }

    // Check if invitation is for specific email
    if (inviteData.email && inviteData.email !== email) {
      return c.json({ error: "This invitation is for a different email address" }, 400);
    }

    // Check expiration
    const now = new Date();
    const expiresAt = new Date(inviteData.expiresAt);
    if (now > expiresAt) {
      return c.json({ error: "This invitation has expired" }, 400);
    }

    console.log(`📧 [SIGNUP] Processing signup for ${email} with invitation ${inviteCode}`);

    // Get tenant info for organization name
    const { data: tenantData, error: tenantError } = await supabase
      .from('tams360_tenants_v')
      .select('name')
      .eq('tenant_id', inviteData.tenantId)
      .single();

    const organizationName = tenantData?.name || 'TAMS360';

    // Create user with Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true,
    });

    if (error) {
      console.error("❌ [SIGNUP] Auth user creation failed:", error);
      return c.json({ error: error.message }, 400);
    }

    console.log(`✅ [SIGNUP] Auth user created: ${data.user.id}`);

    // Create user profile in database (THIS WAS MISSING!)
    const { error: profileError } = await supabase
      .from('tams360_user_profiles_v')
      .insert({
        id: data.user.id,
        tenant_id: inviteData.tenantId,
        email,
        name,
        role: inviteData.role || "field_user",
        status: "approved", // Pre-approved via invitation
        organization: organizationName,
        created_at: new Date().toISOString(),
      });

    if (profileError) {
      console.error("❌ [SIGNUP] Failed to create user profile:", profileError);
      
      // Clean up: delete the auth user since profile creation failed
      await supabase.auth.admin.deleteUser(data.user.id);
      
      return c.json({ 
        error: `Failed to create user profile: ${profileError.message}` 
      }, 500);
    }

    console.log(`✅ [SIGNUP] User profile created for ${email} in tenant ${inviteData.tenantId}`);

    // Mark invitation as accepted in KV store
    try {
      inviteData.status = "accepted";
      inviteData.acceptedAt = new Date().toISOString();
      inviteData.acceptedBy = data.user.id;
      await kv.set(`invite:${inviteCode}`, inviteData);
      console.log(`✅ [SIGNUP] Invitation marked as accepted`);
    } catch (updateError) {
      console.error("⚠️ [SIGNUP] Failed to update invitation status:", updateError);
      // Don't fail the signup if we can't update the invitation
    }

    console.log(`🎉 [SIGNUP] Complete! User ${email} successfully registered`);

    return c.json({
      success: true,
      message: "Account created successfully! You can now log in.",
      isFirstUser: false,
    });
  } catch (error) {
    console.error("❌ [SIGNUP] Signup error:", error);
    return c.json({ error: "Signup failed" }, 500);
  }
});

// User login
app.post("/make-server-c894a9ff/auth/login", async (c) => {
  try {
    const { email, password } = await c.req.json();

    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return c.json({ error: error.message }, 401);
    }

    console.log(`🔐 Login attempt for user: ${data.user.id} (${email})`);

    // Query the TAMS360 public view for user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('tams360_user_profiles_v')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !userProfile) {
      console.error(`❌ [TAMS360] User profile not found in tams360_user_profiles_v for ${email}:`, profileError);
      
      // Sign out the user since they have no profile
      await supabaseAuth.auth.signOut();
      
      return c.json({ 
        error: "User profile not found. Please contact your administrator." 
      }, 403);
    }

    // Check status if it exists (approved or active are both valid)
    if (userProfile.status && userProfile.status !== "approved" && userProfile.status !== "active") {
      return c.json(
        {
          error: "Account pending approval",
          status: userProfile.status || "pending",
        },
        403,
      );
    }

    console.log(`✅ Login successful for ${email}, role: ${userProfile.role}, tenant: ${userProfile.tenant_id}`);

    return c.json({
      success: true,
      accessToken: data.session.access_token,
      user: {
        id: userProfile.id,
        tenantId: userProfile.tenant_id,
        email: userProfile.email,
        name: userProfile.name || userProfile.email,
        organization: userProfile.organization || '',
        role: userProfile.role,
        tier: userProfile.tier || 'basic',
        status: userProfile.status || 'approved',
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    return c.json({ error: "Login failed" }, 500);
  }
});

// Get current user session
app.get("/make-server-c894a9ff/auth/session", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data, error } = await supabaseAuth.auth.getUser(accessToken);

    if (error || !data.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Try multiple table/view names to find the user profile
    const possibleSources = [
      'tams360_user_profiles_v',
      'user_profiles_v',
      'tams360.user_profiles',
      'user_profiles',
      'profiles'
    ];
    
    let userProfile = null;

    for (const source of possibleSources) {
      const result = await supabase
        .from(source)
        .select('id, tenant_id, email, name, role, status, organization, tier')
        .eq('id', data.user.id)
        .single();

      if (!result.error && result.data) {
        userProfile = result.data;
        break;
      }
    }

    // Fallback to KV store if not found in database
    if (!userProfile) {
      const kvUser = await kv.get(`user:${data.user.id}`);
      
      if (kvUser) {
        userProfile = {
          id: kvUser.id,
          tenant_id: kvUser.tenantId,
          email: kvUser.email,
          name: kvUser.name,
          role: kvUser.role,
          status: kvUser.status || 'approved',
          organization: kvUser.organization,
          tier: kvUser.tier || 'basic',
        };
      }
    }

    if (!userProfile) {
      console.error('Profile error: User profile not found in database or KV store');
      return c.json({ error: 'User profile not found' }, 404);
    }

    return c.json({ 
      user: {
        id: userProfile.id,
        tenantId: userProfile.tenant_id,
        email: userProfile.email,
        name: userProfile.name || userProfile.email,
        role: userProfile.role,
        status: userProfile.status,
      }
    });
  } catch (error) {
    return c.json({ error: "Session check failed" }, 500);
  }
});

// Get tenant settings for current user's tenant
app.get("/make-server-c894a9ff/tenant/settings", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data, error } = await supabaseAuth.auth.getUser(accessToken);

    if (error || !data.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile to find tenant_id
    const { data: userProfile } = await supabase
      .from('tams360_user_profiles_v')
      .select('tenant_id')
      .eq('id', data.user.id)
      .single();

    if (!userProfile?.tenant_id) {
      return c.json({ error: 'Tenant not found' }, 404);
    }

    // Get tenant name
    const { data: tenant } = await supabase
      .from('tams360_tenants_v')
      .select('name')
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    // Get tenant settings
    const { data: tenantSettings } = await supabase
      .from('tams360_tenant_settings_v')
      .select('settings')
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    const settings = tenantSettings?.settings || {};

    return c.json({
      tenantId: userProfile.tenant_id,
      tenantName: tenant?.name || 'Unknown Organization',
      settings: {
        organization_name: settings.organization_name || tenant?.name || 'Unknown Organization',
        address: settings.address || '',
        phone: settings.phone || '',
        website: settings.website || '',
        logo_url: settings.logo_url || null,
        primary_color: settings.primary_color || null,
        secondary_color: settings.secondary_color || null,
      }
    });
  } catch (error) {
    console.error("Error fetching tenant settings:", error);
    return c.json({ error: "Failed to fetch tenant settings" }, 500);
  }
});

// ============================================================================
// ADMIN ROUTES - User Management
// ============================================================================

// Middleware to check admin role
async function requireAdmin(c: any, next: any) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) {
    console.error("❌ requireAdmin: No Authorization header");
    return c.json({ error: "Unauthorized" }, 401);
  }

  const accessToken = authHeader.split(" ")[1];
  console.log("🔍 requireAdmin: Validating token for admin access...");
  
  const { data, error } = await supabaseAuth.auth.getUser(accessToken);

  if (error || !data.user) {
    console.error("❌ requireAdmin: Auth validation failed:", {
      error: error?.message,
      code: error?.code,
      status: error?.status,
    });
    return c.json({ 
      error: "Invalid session", 
      code: error?.status || 401,
      message: error?.message || "Authentication failed" 
    }, 401);
  }

  console.log("✅ Auth validated for user:", data.user.id);

  // Get user profile from Postgres view
  const { data: userProfile, error: profileError } = await supabase
    .from('tams360_user_profiles_v')
    .select('id, tenant_id, email, name, role, status')
    .eq('id', data.user.id)
    .single();

  if (profileError || !userProfile || userProfile.role !== "admin") {
    console.error("❌ requireAdmin: User is not an admin:", {
      profileError: profileError?.message,
      userRole: userProfile?.role,
    });
    return c.json({ error: "Admin access required" }, 403);
  }

  console.log("✅ Admin access granted for:", userProfile.email);

  c.set("userId", data.user.id);
  c.set("userProfile", {
    id: userProfile.id,
    tenantId: userProfile.tenant_id,
    email: userProfile.email,
    name: userProfile.name,
    role: userProfile.role,
    status: userProfile.status,
  });
  await next();
}

// Get pending registrations
app.get(
  "/make-server-c894a9ff/admin/registrations/pending",
  requireAdmin,
  async (c) => {
    try {
      const pending = await kv.getByPrefix("registration:");
      return c.json({ registrations: pending });
    } catch (error) {
      console.error("Error fetching pending registrations:", error);
      return c.json({ error: "Failed to fetch registrations" }, 500);
    }
  },
);

// Approve user registration
app.post(
  "/make-server-c894a9ff/admin/users/:userId/approve",
  requireAdmin,
  async (c) => {
    try {
      const userId = c.req.param("userId");
      const { role, tier } = await c.req.json();
      const adminId = c.get("userId");

      const userProfile = await kv.get(`user:${userId}`);

      if (!userProfile) {
        return c.json({ error: "User not found" }, 404);
      }

      // Update user profile
      const updatedProfile = {
        ...userProfile,
        status: "approved",
        role: role || userProfile.role,
        tier: tier || userProfile.tier,
        approvedAt: new Date().toISOString(),
        approvedBy: adminId,
      };

      await kv.set(`user:${userId}`, updatedProfile);

      // Remove from pending registrations
      await kv.del(`registration:${userId}`);

      // Log audit trail
      await kv.set(`audit:${Date.now()}`, {
        action: "user_approved",
        adminId,
        userId,
        timestamp: new Date().toISOString(),
        details: { role, tier },
      });

      return c.json({ success: true, user: updatedProfile });
    } catch (error) {
      console.error("Error approving user:", error);
      return c.json({ error: "Failed to approve user" }, 500);
    }
  },
);

// Deny user registration
app.post(
  "/make-server-c894a9ff/admin/users/:userId/deny",
  requireAdmin,
  async (c) => {
    try {
      const userId = c.req.param("userId");
      const adminId = c.get("userId");

      await kv.del(`user:${userId}`);
      await kv.del(`registration:${userId}`);

      // Log audit trail
      await kv.set(`audit:${Date.now()}`, {
        action: "user_denied",
        adminId,
        userId,
        timestamp: new Date().toISOString(),
      });

      return c.json({ success: true });
    } catch (error) {
      return c.json({ error: "Failed to deny user" }, 500);
    }
  },
);

// Get all users
app.get("/make-server-c894a9ff/admin/users", requireAdmin, async (c) => {
  try {
    const users = await kv.getByPrefix("user:");
    return c.json({ users });
  } catch (error) {
    return c.json({ error: "Failed to fetch users" }, 500);
  }
});

// Update user role/tier
app.put(
  "/make-server-c894a9ff/admin/users/:userId",
  requireAdmin,
  async (c) => {
    try {
      const userId = c.req.param("userId");
      const { role, tier, status } = await c.req.json();
      const adminId = c.get("userId");

      const userProfile = await kv.get(`user:${userId}`);

      if (!userProfile) {
        return c.json({ error: "User not found" }, 404);
      }

      const updatedProfile = {
        ...userProfile,
        role: role !== undefined ? role : userProfile.role,
        tier: tier !== undefined ? tier : userProfile.tier,
        status: status !== undefined ? status : userProfile.status,
        updatedAt: new Date().toISOString(),
        updatedBy: adminId,
      };

      await kv.set(`user:${userId}`, updatedProfile);

      // Log audit trail
      await kv.set(`audit:${Date.now()}`, {
        action: "user_updated",
        adminId,
        userId,
        timestamp: new Date().toISOString(),
        changes: { role, tier, status },
      });

      return c.json({ success: true, user: updatedProfile });
    } catch (error) {
      return c.json({ error: "Failed to update user" }, 500);
    }
  },
);

// Get audit log (enhanced with filtering)
app.get("/make-server-c894a9ff/admin/audit", requireAdmin, async (c) => {
  try {
    const userProfile = c.get("userProfile");
    const url = new URL(c.req.url);
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const entityType = url.searchParams.get("entityType") || undefined;
    const entityId = url.searchParams.get("entityId") || undefined;
    const userId = url.searchParams.get("userId") || undefined;
    
    const logs = await auditLogger.getAuditLogs({
      tenantId: userProfile.tenantId,
      limit,
      entityType: entityType as any,
      entityId,
      userId,
    });
    
    return c.json({ logs, total: logs.length });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return c.json({ error: "Failed to fetch audit logs" }, 500);
  }
});

// Get audit history for a specific entity
app.get("/make-server-c894a9ff/admin/audit/:entityType/:entityId", requireAdmin, async (c) => {
  try {
    const userProfile = c.get("userProfile");
    const entityType = c.req.param("entityType");
    const entityId = c.req.param("entityId");
    
    const history = await auditLogger.getEntityHistory(
      userProfile.tenantId,
      entityType as auditLogger.EntityType,
      entityId
    );
    
    return c.json({ history, total: history.length });
  } catch (error) {
    console.error("Error fetching entity history:", error);
    return c.json({ error: "Failed to fetch entity history" }, 500);
  }
});

// ============================================================================
// TENANT SETTINGS ROUTES
// ============================================================================

// Get tenant info (tier, status, trial expiration)
app.get("/make-server-c894a9ff/admin/tenant-info", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseAuth.auth.getUser(token);
    
    if (!userData.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get user's profile to find tenant ID
    const userProfile = await kv.get(`user:${userData.user.id}`);
    if (!userProfile || !userProfile.tenantId) {
      return c.json({ error: "User has no tenant" }, 400);
    }

    // Get tenant info
    const tenant = await kv.get(`tenant:${userProfile.tenantId}`);
    if (!tenant) {
      return c.json({ error: "Tenant not found" }, 404);
    }

    return c.json({ 
      tenant: {
        name: tenant.name,
        tier: tenant.tier,
        status: tenant.status,
        trialEndsAt: tenant.trialEndsAt || null,
      }
    });
  } catch (error) {
    console.error("Error fetching tenant info:", error);
    return c.json({ error: "Failed to fetch tenant info" }, 500);
  }
});

// Get tenant settings
app.get("/make-server-c894a9ff/admin/tenant-settings", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data, error } = await supabaseAuth.auth.getUser(accessToken);

    if (error || !data.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile to find tenant_id
    const { data: userProfile } = await supabase
      .from('tams360_user_profiles_v')
      .select('tenant_id')
      .eq('id', data.user.id)
      .single();

    if (!userProfile?.tenant_id) {
      return c.json({ error: 'Tenant not found' }, 404);
    }

    // Get tenant settings from database
    const { data: tenantSettings, error: settingsError } = await supabase
      .from('tams360_tenant_settings_v')
      .select('settings')
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching tenant settings:', settingsError);
      return c.json({ error: 'Failed to fetch tenant settings' }, 500);
    }

    const settings = tenantSettings?.settings || {};
    return c.json({ settings });
  } catch (error) {
    console.error("Error fetching tenant settings:", error);
    return c.json({ error: "Failed to fetch tenant settings" }, 500);
  }
});

// Update tenant settings
app.put("/make-server-c894a9ff/admin/tenant-settings", requireAdmin, async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data, error } = await supabaseAuth.auth.getUser(accessToken);

    if (error || !data.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile to find tenant_id
    const { data: userProfile } = await supabase
      .from('tams360_user_profiles_v')
      .select('tenant_id')
      .eq('id', data.user.id)
      .single();

    if (!userProfile?.tenant_id) {
      return c.json({ error: 'Tenant not found' }, 404);
    }

    const settings = await c.req.json();
    
    // Convert camelCase to snake_case for database
    const dbSettings = {
      organization_name: settings.organizationName,
      organization_tagline: settings.organizationTagline,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      website: settings.website,
      logo_url: settings.logoUrl,
      license_expiry_date: settings.licenseExpiryDate,
      primary_color: settings.primaryColor,
      secondary_color: settings.secondaryColor,
      accent_color: settings.accentColor,
      asset_number_prefix: settings.assetNumberPrefix,
      asset_number_digits: settings.assetNumberDigits,
      inspection_number_prefix: settings.inspectionNumberPrefix,
      maintenance_number_prefix: settings.maintenanceNumberPrefix,
      date_format: settings.dateFormat,
      currency: settings.currency,
      measurement_units: settings.measurementUnits,
      time_zone: settings.timeZone,
      fiscal_year_start: settings.fiscalYearStart,
      auto_backup: settings.autoBackup,
      notifications_enabled: settings.notificationsEnabled,
      // Automation Rules
      enable_auto_maintenance: settings.enableAutoMaintenance,
      ci_threshold: settings.ciThreshold,
      urgency_threshold: settings.urgencyThreshold,
      auto_assign_field_user: settings.autoAssignFieldUser,
      auto_notify_on_critical: settings.autoNotifyOnCritical,
      // Data Access Control
      show_assigned_assets_only: settings.showAssignedAssetsOnly,
      // Email Notifications
      notification_emails: settings.notificationEmails,
      enable_daily_digest: settings.enableDailyDigest,
    };

    // Update or insert tenant settings in database
    const { data: existingSettings } = await supabase
      .from('tams360_tenant_settings_v')
      .select('*')
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    if (existingSettings) {
      // Update existing settings
      const { error: updateError } = await supabase
        .from('tams360_tenant_settings_v')
        .update({ settings: dbSettings })
        .eq('tenant_id', userProfile.tenant_id);

      if (updateError) {
        console.error('Error updating tenant settings:', updateError);
        return c.json({ error: 'Failed to update tenant settings' }, 500);
      }
    } else {
      // Insert new settings
      const { error: insertError } = await supabase
        .from('tams360_tenant_settings_v')
        .insert({
          tenant_id: userProfile.tenant_id,
          settings: dbSettings,
        });

      if (insertError) {
        console.error('Error inserting tenant settings:', insertError);
        return c.json({ error: 'Failed to insert tenant settings' }, 500);
      }
    }

    return c.json({ success: true, settings: dbSettings });
  } catch (error) {
    console.error("Error updating tenant settings:", error);
    return c.json({ error: "Failed to update tenant settings" }, 500);
  }
});

// Logo upload endpoint
app.post("/make-server-c894a9ff/admin/tenant-settings/logo", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data, error } = await supabaseAuth.auth.getUser(accessToken);

    if (error || !data.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile to find tenant_id
    const { data: userProfile } = await supabase
      .from('tams360_user_profiles_v')
      .select('tenant_id')
      .eq('id', data.user.id)
      .single();

    if (!userProfile?.tenant_id) {
      return c.json({ error: 'Tenant not found' }, 404);
    }

    const formData = await c.req.formData();
    const file = formData.get('logo');
    
    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Create bucket if it doesn't exist
    const bucketName = 'make-c894a9ff-logos';
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, { public: false });
    }

    // Upload file
    const fileName = `logo-${Date.now()}.${file.type.split('/')[1]}`;
    const arrayBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return c.json({ error: 'Failed to upload logo' }, 500);
    }

    // Get signed URL (1 year expiry)
    const { data: urlData } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 365 * 24 * 60 * 60);

    // Update tenant settings with logo URL in database
    const { data: existingSettings } = await supabase
      .from('tams360_tenant_settings_v')
      .select('settings')
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    const settings = existingSettings?.settings || {};
    settings.logo_url = urlData?.signedUrl;

    if (existingSettings) {
      await supabase
        .from('tams360_tenant_settings_v')
        .update({ settings })
        .eq('tenant_id', userProfile.tenant_id);
    } else {
      await supabase
        .from('tams360_tenant_settings_v')
        .insert({
          tenant_id: userProfile.tenant_id,
          settings,
        });
    }

    return c.json({ 
      success: true, 
      logo_url: urlData?.signedUrl 
    });
  } catch (error) {
    console.error('Logo upload error:', error);
    return c.json({ error: 'Failed to upload logo' }, 500);
  }
});

// Generic storage upload endpoint for photos
app.post("/make-server-c894a9ff/storage/upload", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile for tenant_id
    const { data: userProfile } = await supabase
      .from('tams360_user_profiles_v')
      .select('tenant_id')
      .eq('id', userData.user.id)
      .single();

    if (!userProfile || !userProfile.tenant_id) {
      return c.json({ error: "User not found" }, 404);
    }

    const formData = await c.req.formData();
    const file = formData.get('file');
    const bucketType = formData.get('bucket') || 'asset-photos';
    
    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Create bucket if it doesn't exist
    const bucketName = `make-c894a9ff-${bucketType}`;
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, { public: false });
    }

    // Upload file with tenant-scoped path
    const fileExt = file.name.split('.').pop();
    const fileName = `${userProfile.tenant_id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return c.json({ error: 'Failed to upload file' }, 500);
    }

    // Get signed URL (valid for 1 year)
    const { data: urlData } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 31536000);

    return c.json({ 
      success: true, 
      url: urlData?.signedUrl,
      path: fileName
    });
  } catch (error) {
    console.error('Storage upload error:', error);
    return c.json({ error: 'Failed to upload file' }, 500);
  }
});

// ============================================================================
// ADMIN ROUTES - User Invitations
// ============================================================================

// Create invitation
app.post("/make-server-c894a9ff/admin/invitations/create", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      console.error("❌ [CREATE-INVITE] Auth error:", authError);
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile from database
    const { data: userProfile, error: profileError } = await supabase
      .from('tams360_user_profiles_v')
      .select('tenant_id, role')
      .eq('id', userData.user.id)
      .single();
    
    console.log("👤 [CREATE-INVITE] User profile:", userProfile);
    
    if (profileError || !userProfile || userProfile.role !== "admin") {
      console.error("❌ [CREATE-INVITE] Not admin:", profileError);
      return c.json({ error: "Admin access required" }, 403);
    }
    
    if (!userProfile.tenant_id) {
      console.error("❌ [CREATE-INVITE] Missing tenant_id:", userProfile);
      return c.json({ error: "User profile incomplete - missing tenant" }, 400);
    }

    let body;
    try {
      body = await c.req.json();
    } catch (jsonError) {
      console.error("❌ [CREATE-INVITE] JSON parse error:", jsonError);
      return c.json({ error: "Invalid JSON in request body" }, 400);
    }
    
    const { email, role, expiryDays } = body;
    
    console.log("📨 [CREATE-INVITE] Creating invitation:", { email, role, expiryDays, tenantId: userProfile.tenant_id });

    // Generate unique invite code
    const inviteCode = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expiryDays || 7));

    // Store invitation in KV store
    const invitationData = {
      code: inviteCode,
      email: email || null,
      role: role || "field_user",
      status: "pending",
      tenantId: userProfile.tenant_id,
      invitedBy: userData.user.id,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    await kv.set(`invite:${inviteCode}`, invitationData);

    console.log("✅ [CREATE-INVITE] Invitation created:", inviteCode);

    return c.json({
      success: true,
      inviteCode,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("❌ [CREATE-INVITE] Error:", error);
    return c.json({ error: `Failed to create invitation: ${error.message}` }, 500);
  }
});

// Get all invitations for tenant
app.get("/make-server-c894a9ff/admin/invitations", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      console.error("❌ [GET-INVITES] Auth error:", authError);
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile from database
    const { data: userProfile, error: profileError } = await supabase
      .from('tams360_user_profiles_v')
      .select('tenant_id, role')
      .eq('id', userData.user.id)
      .single();
    
    console.log("👤 [GET-INVITES] User profile:", userProfile);
    
    if (profileError || !userProfile || userProfile.role !== "admin") {
      console.error("❌ [GET-INVITES] Not admin:", profileError);
      return c.json({ error: "Admin access required" }, 403);
    }
    
    if (!userProfile.tenant_id) {
      console.error("❌ [GET-INVITES] Missing tenant_id:", userProfile);
      return c.json({ error: "User profile incomplete - missing tenant" }, 400);
    }

    // Get invitations from KV store
    const allInvites = await kv.getByPrefix('invite:');
    
    // Filter by tenant
    const invitations = allInvites
      .filter((invite: any) => invite.tenantId === userProfile.tenant_id)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    console.log(`✅ [GET-INVITES] Found ${invitations.length} invitations for tenant`);

    return c.json({
      invitations: invitations || [],
    });
  } catch (error) {
    console.error("❌ [GET-INVITES] Error:", error);
    return c.json({ error: "Failed to fetch invitations" }, 500);
  }
});

// Delete invitation
app.delete("/make-server-c894a9ff/admin/invitations/:code", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Check if user is admin
    const userProfile = await kv.get(`user:${userData.user.id}`);
    if (!userProfile || userProfile.role !== "admin") {
      return c.json({ error: "Admin access required" }, 403);
    }

    const inviteCode = c.req.param("code");
    
    // Get the invitation to verify it belongs to the user's tenant
    const invitation = await kv.get(`invite:${inviteCode}`);
    
    if (!invitation) {
      return c.json({ error: "Invitation not found" }, 404);
    }
    
    if (invitation.tenantId !== userProfile.tenantId) {
      return c.json({ error: "Unauthorized to delete this invitation" }, 403);
    }

    // Delete the invitation
    await kv.del(`invite:${inviteCode}`);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting invitation:", error);
    return c.json({ error: "Failed to delete invitation" }, 500);
  }
});

// ============================================================================
// ENHANCED USER MANAGEMENT ROUTES (Using Postgres Views)
// ============================================================================

// Get all users for current tenant (from Postgres view)
app.get("/make-server-c894a9ff/admin/users-v2", requireAdmin, userMgmt.getUsersV2);

// Create user directly (without invitation)
app.post("/make-server-c894a9ff/admin/users-v2/create", requireAdmin, userMgmt.createUserDirect);

// Update user (role, status) - writes through Postgres view
app.put("/make-server-c894a9ff/admin/users-v2/:userId", requireAdmin, userMgmt.updateUserV2);

// Toggle user status (active/inactive)
app.post("/make-server-c894a9ff/admin/users-v2/:userId/toggle-status", requireAdmin, userMgmt.toggleUserStatus);

// Resend invitation email
app.post("/make-server-c894a9ff/admin/invitations/:code/resend", requireAdmin, userMgmt.resendInvitation);

// Delete user (soft delete)
app.delete("/make-server-c894a9ff/admin/users-v2/:userId", requireAdmin, userMgmt.deleteUser);

// Reset user password
app.post("/make-server-c894a9ff/admin/users-v2/:userId/reset-password", requireAdmin, userMgmt.resetUserPassword);

// TAMS360 Diagnostic endpoint
app.get("/make-server-c894a9ff/admin/diagnostic/tams360-check", requireAdmin, async (c) => {
  try {
    const userProfile = c.get("userProfile");
    console.log("🔍 [TAMS360 DIAGNOSTIC] Running database check...");
    
    const results: any = {
      timestamp: new Date().toISOString(),
      currentUser: {
        id: userProfile.id,
        email: userProfile.email,
        tenantId: userProfile.tenantId,
        role: userProfile.role,
      },
      checks: {},
      authUsers: [],
      viewUsers: [],
      recommendations: [],
    };

    // 1. Check Supabase Auth users
    const { data: authData } = await supabase.auth.admin.listUsers();
    results.authUsers = authData?.users?.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
    })) || [];
    results.checks.totalAuthUsers = results.authUsers.length;

    // 2. Check TAMS360 view
    const { data: viewUsers, error: viewError } = await supabase
      .from('tams360_user_profiles_v')
      .select('*');
    
    results.checks.viewAccessible = !viewError;
    results.checks.viewError = viewError?.message || null;
    results.viewUsers = viewUsers || [];
    results.checks.totalViewUsers = viewUsers?.length || 0;

    // 3. Check for orphaned auth users
    const orphanedUsers = results.authUsers.filter((authUser: any) => 
      !results.viewUsers.some((viewUser: any) => viewUser.id === authUser.id)
    );
    results.checks.orphanedAuthUsers = orphanedUsers.length;
    results.orphanedUsers = orphanedUsers;

    // 4. Check tenant-specific users
    const tenantUsers = results.viewUsers.filter((u: any) => u.tenant_id === userProfile.tenantId);
    results.checks.usersInYourTenant = tenantUsers.length;
    results.tenantUsers = tenantUsers;

    // 5. Recommendations
    if (orphanedUsers.length > 0) {
      results.recommendations.push({
        issue: `Found ${orphanedUsers.length} orphaned users`,
        action: "Create profiles in tams360.user_profiles",
        users: orphanedUsers.map((u: any) => u.email),
      });
    }

    console.log("✅ [TAMS360 DIAGNOSTIC] Check complete");
    return c.json(results);
  } catch (error) {
    console.error("❌ [TAMS360 DIAGNOSTIC] Error:", error);
    return c.json({ error: "Diagnostic failed", details: error.message }, 500);
  }
});

// Diagnostic endpoint - Check database tables
app.get("/make-server-c894a9ff/admin/diagnostic/tables", requireAdmin, async (c) => {
  try {
    console.log("🔍 Running database diagnostics...");
    
    const results = {
      tables: [],
      authUsers: 0,
      kvUsers: 0,
      recommendations: []
    };

    // Check various table names
    const tablesToCheck = [
      'user_profiles',
      'tams360_user_profiles',
      'tams360_user_profiles_v',
      'user_profiles_v',
      'profiles',
    ];

    for (const tableName of tablesToCheck) {
      try {
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: false })
          .limit(1);

        if (!error) {
          results.tables.push({
            name: tableName,
            exists: true,
            rowCount: count || 0,
            sampleData: data?.[0] || null
          });
          console.log(`✅ Table ${tableName} exists with ${count} rows`);
        } else {
          console.log(`❌ Table ${tableName} error:`, error.message);
        }
      } catch (e) {
        console.log(`❌ Table ${tableName} not accessible`);
      }
    }

    // Count auth users
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    results.authUsers = authUsers?.users?.length || 0;

    // Count KV users
    const kvUserKeys = await kv.getByPrefix('user:');
    results.kvUsers = kvUserKeys?.length || 0;

    // Add recommendations
    if (results.tables.length === 0) {
      results.recommendations.push("⚠️ NO USER TABLES FOUND! You need to create a user_profiles table.");
    } else {
      const workingTable = results.tables.find(t => t.exists);
      results.recommendations.push(`✅ Use table: ${workingTable?.name}`);
    }

    if (results.authUsers > 0 && results.tables.every(t => t.rowCount === 0)) {
      results.recommendations.push(`⚠️ ${results.authUsers} users in Auth but NONE in database tables - RUN SYNC!`);
    }

    if (results.kvUsers > 0) {
      results.recommendations.push(`ℹ️ ${results.kvUsers} users in KV store - these need to be synced to database`);
    }

    return c.json(results);
  } catch (error) {
    console.error("❌ Diagnostic error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Sync users from Auth + KV to database
app.post("/make-server-c894a9ff/admin/diagnostic/sync-users", requireAdmin, async (c) => {
  try {
    console.log("🔄 Starting user sync...");
    
    const { targetTable } = await c.req.json();
    
    if (!targetTable) {
      return c.json({ error: "targetTable is required" }, 400);
    }

    const results = {
      processed: 0,
      inserted: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    // Get all auth users
    const { data: authData } = await supabase.auth.admin.listUsers();
    const authUsers = authData?.users || [];

    console.log(`📊 Found ${authUsers.length} users in Supabase Auth`);

    for (const authUser of authUsers) {
      results.processed++;
      
      try {
        // Get user profile from KV store
        const kvProfile = await kv.get(`user:${authUser.id}`);
        
        if (!kvProfile) {
          console.log(`⚠️ No KV profile for ${authUser.email}, skipping...`);
          results.failed++;
          results.errors.push(`No profile data for ${authUser.email}`);
          continue;
        }

        // Check if user already exists in database
        const { data: existingUser } = await supabase
          .from(targetTable)
          .select('id')
          .eq('id', authUser.id)
          .single();

        const userProfile = {
          id: authUser.id,
          tenant_id: kvProfile.tenantId,
          email: authUser.email,
          name: kvProfile.name || authUser.user_metadata?.name || authUser.email,
          role: kvProfile.role,
          status: kvProfile.status || 'approved',
          tier: kvProfile.tier || 'basic',
          organization: kvProfile.organization || '',
          created_at: kvProfile.createdAt || authUser.created_at,
          updated_at: new Date().toISOString(),
        };

        if (existingUser) {
          // Update existing user
          const { error } = await supabase
            .from(targetTable)
            .update(userProfile)
            .eq('id', authUser.id);

          if (error) {
            console.error(`❌ Failed to update ${authUser.email}:`, error);
            results.failed++;
            results.errors.push(`Update failed for ${authUser.email}: ${error.message}`);
          } else {
            console.log(`✅ Updated ${authUser.email}`);
            results.updated++;
          }
        } else {
          // Insert new user
          const { error } = await supabase
            .from(targetTable)
            .insert(userProfile);

          if (error) {
            console.error(`❌ Failed to insert ${authUser.email}:`, error);
            results.failed++;
            results.errors.push(`Insert failed for ${authUser.email}: ${error.message}`);
          } else {
            console.log(`✅ Inserted ${authUser.email}`);
            results.inserted++;
          }
        }
      } catch (error) {
        console.error(`❌ Error processing ${authUser.email}:`, error);
        results.failed++;
        results.errors.push(`Error for ${authUser.email}: ${error.message}`);
      }
    }

    console.log(`✅ Sync complete: ${results.inserted} inserted, ${results.updated} updated, ${results.failed} failed`);

    return c.json(results);
  } catch (error) {
    console.error("❌ Sync error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// DATA ORGANIZATION & MIGRATION ROUTES
// ============================================================================

// Reorganize data: Link all existing data to JRA and create dummy data for HN Consulting
app.post("/make-server-c894a9ff/admin/reorganize-data", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Check if user is admin (we'll allow this for both target admins)
    const userProfile = await kv.get(`user:${userData.user.id}`);
    if (!userProfile || userProfile.role !== "admin") {
      return c.json({ error: "Admin access required" }, 403);
    }

    console.log("🚀 Starting data reorganization...");

    // Step 1: Create or update JRA organization
    const jraTenantId = uuidv4();
    const jraEmail = "admin@jra.org.za";
    const jraPassword = "Admin123!";

    console.log(`📋 Creating JRA tenant: ${jraTenantId}`);
    
    // Check if JRA user already exists
    let jraUser;
    try {
      const { data: existingUser } = await supabase.auth.admin.listUsers();
      jraUser = existingUser?.users?.find(u => u.email === jraEmail);
    } catch (e) {
      console.log("Could not check existing users, will try to create");
    }

    // Create JRA user if doesn't exist
    if (!jraUser) {
      console.log("Creating JRA admin user...");
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: jraEmail,
        password: jraPassword,
        user_metadata: { name: "JRA Administrator" },
        email_confirm: true,
      });

      if (createError && !createError.message.includes("already registered")) {
        console.error("Error creating JRA user:", createError);
        return c.json({ error: `Failed to create JRA user: ${createError.message}` }, 500);
      }
      jraUser = newUser?.user;
    }

    // Get JRA user ID (might be from existing or newly created)
    let jraUserId = jraUser?.id;
    
    // If still no user, try to get from KV by searching
    if (!jraUserId) {
      const allUsers = await kv.getByPrefix("user:");
      const existingJRAUser = allUsers.find((u: any) => u.email === jraEmail);
      if (existingJRAUser) {
        jraUserId = existingJRAUser.id;
        console.log(`Found existing JRA user in KV: ${jraUserId}`);
      }
    }

    // Create JRA tenant
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 365); // 1 year trial

    await kv.set(`tenant:${jraTenantId}`, {
      id: jraTenantId,
      name: "Johannesburg Roads Agency (JRA)",
      domain: "jra.org.za",
      address: "75 Helen Joseph St, Johannesburg, 2000",
      phone: "011 298 5000",
      website: "www.jra.org.za",
      ownerId: jraUserId,
      tier: "enterprise",
      status: "active",
      trialEndsAt: trialEndDate.toISOString(),
      createdAt: new Date().toISOString(),
      settings: {
        allowDomainSignup: false,
        requireInvitation: true,
        assetNumberFormat: "JRA-{YEAR}-{SEQ}",
      },
    });
    console.log(`✅ Created JRA tenant`);

    // Create/update JRA user profile
    if (jraUserId) {
      await kv.set(`user:${jraUserId}`, {
        id: jraUserId,
        tenantId: jraTenantId,
        email: jraEmail,
        name: "JRA Administrator",
        role: "admin",
        tier: "enterprise",
        status: "approved",
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        approvedBy: "system",
      });
      console.log(`✅ Created/updated JRA user profile`);
    }

    // Step 2: Get all existing assets and link to JRA
    const { data: existingAssets, error: assetsError } = await supabase
      .from("assets")
      .select("*");

    if (!assetsError && existingAssets && existingAssets.length > 0) {
      console.log(`📦 Found ${existingAssets.length} existing assets, linking to JRA...`);
      
      for (const asset of existingAssets) {
        await supabase
          .from("assets")
          .update({ tenant_id: jraTenantId })
          .eq("id", asset.id);
      }
      console.log(`✅ Linked ${existingAssets.length} assets to JRA`);
    } else {
      console.log("ℹ️ No existing assets found");
    }

    // Step 3: Get all existing inspections and link to JRA
    const { data: existingInspections, error: inspectionsError } = await supabase
      .from("inspections")
      .select("*");

    if (!inspectionsError && existingInspections && existingInspections.length > 0) {
      console.log(`📋 Found ${existingInspections.length} existing inspections, linking to JRA...`);
      
      for (const inspection of existingInspections) {
        await supabase
          .from("inspections")
          .update({ tenant_id: jraTenantId })
          .eq("id", inspection.id);
      }
      console.log(`✅ Linked ${existingInspections.length} inspections to JRA`);
    } else {
      console.log("ℹ️ No existing inspections found");
    }

    // Step 4: Get all existing maintenance records (they follow assets via relationships)
    const { data: existingMaintenance, error: maintenanceError } = await supabase
      .from("maintenance_records")
      .select("*");

    if (!maintenanceError && existingMaintenance) {
      console.log(`🔧 Found ${existingMaintenance.length} maintenance records (linked via assets)`);
    }

    // Step 5: Create or update HN Consulting organization
    const hnTenantId = uuidv4();
    const hnEmail = "admin@tams360.co.za";
    const hnPassword = "Admin123!";

    console.log(`📋 Creating HN Consulting tenant: ${hnTenantId}`);

    // Check if HN user already exists
    let hnUser;
    try {
      const { data: existingUser } = await supabase.auth.admin.listUsers();
      hnUser = existingUser?.users?.find(u => u.email === hnEmail);
    } catch (e) {
      console.log("Could not check existing users for HN");
    }

    // Create HN user if doesn't exist
    if (!hnUser) {
      console.log("Creating HN Consulting admin user...");
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: hnEmail,
        password: hnPassword,
        user_metadata: { name: "HN Administrator" },
        email_confirm: true,
      });

      if (createError && !createError.message.includes("already registered")) {
        console.error("Error creating HN user:", createError);
        // Continue anyway if user might exist
      }
      hnUser = newUser?.user;
    }

    // Get HN user ID
    let hnUserId = hnUser?.id;
    
    if (!hnUserId) {
      const allUsers = await kv.getByPrefix("user:");
      const existingHNUser = allUsers.find((u: any) => u.email === hnEmail);
      if (existingHNUser) {
        hnUserId = existingHNUser.id;
        console.log(`Found existing HN user in KV: ${hnUserId}`);
      }
    }

    // Create HN Consulting tenant
    await kv.set(`tenant:${hnTenantId}`, {
      id: hnTenantId,
      name: "HN Consulting Engineers (Pty) Ltd",
      domain: "tams360.co.za",
      ownerId: hnUserId,
      tier: "trial",
      status: "active",
      trialEndsAt: trialEndDate.toISOString(),
      createdAt: new Date().toISOString(),
      settings: {
        allowDomainSignup: false,
        requireInvitation: true,
        assetNumberFormat: "HN-{YEAR}-{SEQ}",
      },
    });
    console.log(`✅ Created HN Consulting tenant`);

    // Create/update HN user profile
    if (hnUserId) {
      await kv.set(`user:${hnUserId}`, {
        id: hnUserId,
        tenantId: hnTenantId,
        email: hnEmail,
        name: "HN Administrator",
        role: "admin",
        tier: "trial",
        status: "approved",
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        approvedBy: "system",
      });
      console.log(`✅ Created/updated HN user profile`);
    }

    // Step 6: Create dummy/test data for HN Consulting (clone from JRA data)
    if (existingAssets && existingAssets.length > 0) {
      console.log(`📦 Creating dummy data for HN Consulting (cloning from JRA)...`);
      
      // Clone first 3 assets as test data
      const assetsToClone = existingAssets.slice(0, Math.min(3, existingAssets.length));
      
      for (const asset of assetsToClone) {
        const newAsset = {
          ...asset,
          id: undefined, // Let database generate new ID
          tenant_id: hnTenantId,
          asset_number: asset.asset_number ? `HN-${asset.asset_number}` : `HN-TEST-${Date.now()}`,
          description: `[TEST DATA] ${asset.description || ''}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        const { data: clonedAsset, error: cloneError } = await supabase
          .from("assets")
          .insert(newAsset)
          .select()
          .single();
          
        if (!cloneError && clonedAsset) {
          console.log(`✅ Cloned asset: ${clonedAsset.asset_number}`);
        }
      }
    }

    console.log("✅ Data reorganization completed successfully!");

    return c.json({
      success: true,
      message: "Data successfully reorganized!",
      jra: {
        tenantId: jraTenantId,
        tenantName: "Johannesburg Roads Agency (JRA)",
        email: jraEmail,
        assetsCount: existingAssets?.length || 0,
        inspectionsCount: existingInspections?.length || 0,
        maintenanceCount: existingMaintenance?.length || 0,
      },
      hn: {
        tenantId: hnTenantId,
        tenantName: "HN Consulting Engineers (Pty) Ltd",
        email: hnEmail,
        testDataCreated: true,
      },
    });
  } catch (error) {
    console.error("❌ Data reorganization error:", error);
    return c.json({
      error: "Data reorganization failed",
      details: String(error),
    }, 500);
  }
});

// Helper function to generate coordinates along a road
function generateRoadCoordinates(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  count: number
): Array<{ lat: number; lng: number }> {
  const coordinates = [];
  
  for (let i = 0; i < count; i++) {
    const ratio = i / (count - 1);
    
    // Linear interpolation with slight random variation for realism
    const lat = startLat + (endLat - startLat) * ratio + (Math.random() - 0.5) * 0.0005;
    const lng = startLng + (endLng - startLng) * ratio + (Math.random() - 0.5) * 0.0005;
    
    coordinates.push({
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6))
    });
  }
  
  return coordinates;
}

// Update HN tenant asset coordinates to Pietermaritzburg roads
app.post("/make-server-c894a9ff/admin/update-hn-coordinates", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !userData?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get user profile to check if admin
    const userProfile = await kv.get(`user:${userData.user.id}`);
    if (!userProfile || userProfile.role !== "admin") {
      return c.json({ error: "Admin access required" }, 403);
    }

    console.log("📍 Updating HN tenant asset coordinates to Pietermaritzburg roads...");

    // Find HN tenant
    const allTenants = await kv.getByPrefix("tenant:");
    const hnTenant = allTenants.find(t => t.name === "HN Consulting Engineers (Pty) Ltd");
    
    if (!hnTenant) {
      return c.json({ error: "HN tenant not found" }, 404);
    }

    // Get all HN assets from database
    const { data: hnAssets, error: assetsError } = await supabase
      .from("tams360_assets_v")
      .select("*")
      .eq("tenant_id", hnTenant.id);

    if (assetsError) {
      console.error("Error fetching HN assets:", assetsError);
      return c.json({ error: "Failed to fetch HN assets" }, 500);
    }

    if (!hnAssets || hnAssets.length === 0) {
      return c.json({ 
        success: false, 
        message: "No HN assets found to update" 
      });
    }

    console.log(`Found ${hnAssets.length} HN assets to update`);

    // Generate coordinates along Pietermaritzburg roads
    // R403: Runs east-west through Pietermaritzburg (approximately)
    // Starting: -29.6050, 30.3500 | Ending: -29.6100, 30.4200
    const r403Coords = generateRoadCoordinates(-29.6050, 30.3500, -29.6100, 30.4200, 70);

    // M70 (Richmond Road): Runs south from Pietermaritzburg
    // Starting: -29.6050, 30.3900 | Ending: -29.7000, 30.3850
    const m70Coords = generateRoadCoordinates(-29.6050, 30.3900, -29.7000, 30.3850, 70);

    // R33: Runs northeast from Pietermaritzburg
    // Starting: -29.6100, 30.3950 | Ending: -29.5200, 30.4800
    const r33Coords = generateRoadCoordinates(-29.6100, 30.3950, -29.5200, 30.4800, 60);

    // Combine all coordinates
    const allCoordinates = [
      ...r403Coords.map(coord => ({ ...coord, road: "R403" })),
      ...m70Coords.map(coord => ({ ...coord, road: "M70" })),
      ...r33Coords.map(coord => ({ ...coord, road: "R33" }))
    ];

    let updatedCount = 0;
    let failedCount = 0;

    // Update each asset with new coordinates
    for (let i = 0; i < hnAssets.length; i++) {
      const asset = hnAssets[i];
      const coordIndex = i % allCoordinates.length;
      const newCoord = allCoordinates[coordIndex];

      try {
        const { error: updateError } = await supabase
          .from("assets")
          .update({
            gps_lat: newCoord.lat,
            gps_lng: newCoord.lng,
            road_name: `HN Test Route`,
            road_number: newCoord.road
          })
          .eq("asset_id", asset.asset_id);

        if (updateError) {
          console.error(`Failed to update asset ${asset.asset_ref}:`, updateError);
          failedCount++;
        } else {
          updatedCount++;
        }
      } catch (error) {
        console.error(`Error updating asset ${asset.asset_ref}:`, error);
        failedCount++;
      }
    }

    console.log(`✅ Updated ${updatedCount} HN assets with Pietermaritzburg coordinates`);

    return c.json({
      success: true,
      message: `Successfully updated ${updatedCount} assets to Pietermaritzburg roads`,
      updated: updatedCount,
      failed: failedCount,
      total: hnAssets.length,
      roads: {
        R403: r403Coords.length,
        M70: m70Coords.length,
        R33: r33Coords.length
      }
    });

  } catch (error) {
    console.error("❌ Error updating HN coordinates:", error);
    return c.json({
      error: "Failed to update coordinates",
      details: String(error)
    }, 500);
  }
});

// ============================================================================
// ASSET ROUTES
// ============================================================================

// Create new asset
app.post("/make-server-c894a9ff/assets", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(
      accessToken,
    );

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile to retrieve tenantId
    const userProfile = await kv.get(`user:${userData.user.id}`);
    if (!userProfile || !userProfile.tenantId) {
      return c.json({ error: "User not associated with an organization" }, 403);
    }

    // Check if tenant ID is in UUID format (database requirement)
    if (!isValidUuid(userProfile.tenantId)) {
      console.error(`Invalid tenant ID format (not UUID): ${userProfile.tenantId}`);
      return c.json({ 
        error: "Organization data format is outdated. Cannot create assets with old tenant format.",
        details: "Tenant ID must be in UUID format for database operations.",
        action_required: "recreate_organization"
      }, 400);
    }

    const asset = await c.req.json();
    
    // Look up asset_type_id from asset type name
    const assetTypeName = asset.type || asset.asset_type_name;
    const { data: assetType, error: typeError } = await supabase
      .from("asset_types")
      .select("asset_type_id")
      .eq("name", assetTypeName)
      .maybeSingle();

    if (typeError || !assetType) {
      console.error("Error finding asset type:", typeError);
      return c.json({ error: `Invalid asset type: ${assetTypeName}` }, 400);
    }

    // Look up status_id from status name
    const statusName = asset.status || "Active";
    const { data: statusData, error: statusError } = await supabase
      .from("asset_status")
      .select("status_id")
      .eq("name", statusName)
      .maybeSingle();

    if (statusError || !statusData) {
      console.error("Error finding status:", statusError);
      return c.json({ error: `Invalid status: ${statusName}` }, 400);
    }
    
    // Map frontend field names to database field names (using actual schema)
    const assetData = {
      tenant_id: userProfile.tenantId,
      asset_ref: asset.referenceNumber || asset.asset_ref,
      asset_type_id: assetType.asset_type_id,
      description: asset.name || asset.description,
      region: asset.region,
      depot: asset.depot,
      road_number: asset.roadNumber || asset.road_number,
      road_name: asset.roadName || asset.road_name,
      km_marker: asset.kilometer ? parseFloat(asset.kilometer) : null,
      install_date: asset.installDate || asset.install_date || null,
      useful_life_years: asset.expectedLife ? parseInt(asset.expectedLife) : null,
      status_id: statusData.status_id,
      gps_lat: asset.latitude ? parseFloat(asset.latitude) : null,
      gps_lng: asset.longitude ? parseFloat(asset.longitude) : null,
      notes: asset.notes,
      owned_by: asset.owner,
      responsible_party: asset.responsibleParty || asset.responsible_party,
      replacement_value: asset.replacementValue ? parseFloat(asset.replacementValue) : null,
      purchase_price: asset.installationCost ? parseFloat(asset.installationCost) : null,
      created_by: userData.user.id,
    };

    // Try to insert into database first
    const { data: insertedAsset, error: insertError } = await supabase
      .from("assets")
      .insert(assetData)
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting asset into database:", insertError);
      // Fallback to KV store
      const assetId = `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const assetRecord = {
        id: assetId,
        tenantId: userProfile.tenantId,
        ...asset,
        createdBy: userData.user.id,
        assignedTo: userData.user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await kv.set(`asset:${assetId}`, assetRecord);
      
      // Log audit trail
      await kv.set(`audit:${Date.now()}`, {
        action: "asset_created",
        userId: userData.user.id,
        assetId,
        timestamp: new Date().toISOString(),
      });

      return c.json({ success: true, asset: assetRecord });
    }

    // Log inventory change in database (non-blocking - fire and forget)
    supabase
      .from('asset_inventory_log')
      .insert({
        asset_id: insertedAsset.asset_id,
        action: 'CREATE',
        changed_by: userData.user.id,
        changes_summary: `Asset created via web app`,
      })
      .then(({ error: logError }) => {
        if (logError) {
          console.error('Warning: Failed to log inventory change:', logError);
        }
      });

    // Return immediately without waiting for log
    return c.json({ success: true, asset: insertedAsset });
  } catch (error) {
    console.error("Error creating asset:", error);
    return c.json({ error: "Failed to create asset" }, 500);
  }
});

// Get all assets with pagination
app.get("/make-server-c894a9ff/assets", async (c) => {
  try {
    // Get user context for tenant filtering
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile from Postgres view to retrieve tenant_id and role
    const { data: userProfile, error: profileError } = await supabase
      .from('tams360_user_profiles_v')
      .select('id, tenant_id, role')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !userProfile || !userProfile.tenant_id) {
      return c.json({ error: "User not associated with an organization" }, 403);
    }

    const page = parseInt(c.req.query("page") || "1");
    // Cap pageSize at 100 to prevent timeouts
    const requestedPageSize = parseInt(c.req.query("pageSize") || "100");
    const pageSize = Math.min(requestedPageSize, 100);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    console.log(`GET /assets request - user:${userData.user.id}, tenant:${userProfile.tenant_id}, role:${userProfile.role}, page:${page}, pageSize:${pageSize}`);

    // Use public tenant-safe view (public.tams360_assets_v)
    // The view already includes latest_ci, latest_urgency from the database
    // Only get count on first page to avoid slow count queries on every request
    const includeCount = page === 1;
    
    // Wrap database query with retry logic for network resilience
    const { data: assets, error, count } = await retryWithBackoff(async () => {
      // Query from tams360_assets_v which has km_marker field
      let query = supabase
        .from("tams360_assets_v")
        .select("*", { count: includeCount ? 'exact' : undefined })
        .eq("tenant_id", userProfile.tenant_id);

      // NOTE: All users within a tenant can see all tenant assets
      // Field users need visibility to all assets for inspection and maintenance workflows
      // Tenant filtering provides sufficient data isolation
      
      // Removed restrictive field_user filtering - all users see all tenant assets
      // if (userProfile.role === "field_user") {
      //   query = query.eq("created_by", userData.user.id);
      // }

      const result = await query
        .order("asset_id", { ascending: false })
        .range(from, to);
      
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      return result;
    });

    if (error) {
      console.error("Error fetching assets from app view:", error);
      return c.json({ 
        error: "Database connection failed after retries. Please check your network connection or try again later.",
        details: error.message,
        hint: "If using Supabase free tier, your project may have been paused due to inactivity. Visit your Supabase dashboard to resume it.",
        code: error.code
      }, 500);
    }

    console.log(`Successfully fetched ${assets?.length || 0} assets from database`);

    // Calculate remaining life and current value for each asset (lightweight, no DB queries)
    const enrichedAssets = (assets || []).map((asset) => {
      // Calculate remaining life
      const installDate = asset.install_date ? new Date(asset.install_date) : null;
      const pastLife = installDate ? (Date.now() - installDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25) : 0;
      const usefulLife = asset.useful_life_years || asset.expected_life_years || 20;
      const remainingLife = Math.max(0, usefulLife - pastLife);

      // Calculate current value using straight-line depreciation
      const replacementValue = asset.replacement_value || 0;
      const currentValue = usefulLife > 0 
        ? replacementValue * (remainingLife / usefulLife)
        : replacementValue;

      return {
        ...asset,
        remaining_life_years: remainingLife,
        current_value: currentValue,
        past_life_years: pastLife,
      };
    });

    // Use provided count if available, otherwise estimate based on page size
    const totalCount = count ?? (assets && assets.length === pageSize ? (page * pageSize + 1) : (page - 1) * pageSize + assets.length);

    console.log(`Fetched ${enrichedAssets?.length || 0} assets (page ${page}) out of ~${totalCount} total`);
    
    // Try to send response, but catch client disconnection errors gracefully
    try {
      return c.json({ 
        assets: enrichedAssets || [], 
        total: totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize)
      });
    } catch (responseError: any) {
      // Client disconnected before response completed - this is normal
      if (responseError?.name === "Http" || responseError?.message?.includes("connection closed")) {
        console.log(`Client disconnected during assets response (page ${page}) - ignoring`);
        return new Response(null, { status: 499 }); // 499 Client Closed Request
      }
      throw responseError; // Re-throw if it's a different error
    }
  } catch (error: any) {
    // Handle connection closed errors gracefully
    if (error?.name === "Http" || error?.message?.includes("connection closed")) {
      console.log("Client disconnected during assets request - ignoring");
      return new Response(null, { status: 499 }); // 499 Client Closed Request
    }
    console.error("Error fetching assets:", error);
    return c.json({ error: "Failed to fetch assets" }, 500);
  }
});

// Get assets count only (lightweight)
app.get("/make-server-c894a9ff/assets/count", async (c) => {
  try {
    // Get user context for tenant filtering
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile from Postgres view to retrieve tenant_id
    const { data: userProfile, error: profileError } = await supabase
      .from('tams360_user_profiles_v')
      .select('id, tenant_id, role')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !userProfile || !userProfile.tenant_id) {
      return c.json({ error: "User not associated with an organization" }, 403);
    }

    let query = supabase
      .from("tams360_assets_v")
      .select("asset_id", { count: 'exact', head: true })
      .eq("tenant_id", userProfile.tenant_id);

    // All users within a tenant can see all tenant assets
    // Removed restrictive field_user filtering for consistency
    // if (userProfile.role === "field_user") {
    //   query = query.eq("created_by", userData.user.id);
    // }

    const { count, error } = await query;

    if (error) {
      console.error("Error counting assets:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ count: count || 0 });
  } catch (error) {
    console.error("Error counting assets:", error);
    return c.json({ error: "Failed to count assets" }, 500);
  }
});

// Import assets from CSV/Excel
app.post("/make-server-c894a9ff/assets/import", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      console.error("Import error: No Authorization header");
      return c.json({ error: "Unauthorized - No auth header" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    console.log("Import: Attempting auth with token (first 20 chars):", accessToken?.substring(0, 20));
    console.log("Import: Full token length:", accessToken?.length);
    console.log("Import: SUPABASE_URL:", Deno.env.get("SUPABASE_URL"));
    console.log("Import: SUPABASE_ANON_KEY (first 20):", Deno.env.get("SUPABASE_ANON_KEY")?.substring(0, 20));
    
    const { data: userData, error: authError} = await supabaseAuth.auth.getUser(
      accessToken,
    );

    if (authError || !userData.user) {
      console.error("Import auth error FULL:", JSON.stringify(authError, null, 2));
      console.error("Import auth error message:", authError?.message);
      console.error("Import auth error name:", authError?.name);
      console.error("Import auth error status:", authError?.status);
      return c.json({ 
        error: "Invalid session", 
        details: authError?.message || "No user",
        code: authError?.status || 401,
        message: authError?.message
      }, 401);
    }

    console.log("Import: User authenticated:", userData.user.email);

    const { assets } = await c.req.json();

    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      return c.json({ error: "No assets provided" }, 400);
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const asset of assets) {
      try {
        // Validate required fields
        if (!asset.asset_ref || !asset.asset_type_name) {
          skipped++;
          errors.push(`${asset.asset_ref || 'Unknown'}: Missing required fields`);
          continue;
        }

        // Get asset_type_id from asset_type_name
        const { data: assetType } = await supabase
          .from('asset_types')
          .select('asset_type_id')
          .eq('name', asset.asset_type_name)
          .single();

        if (!assetType) {
          skipped++;
          errors.push(`${asset.asset_ref}: Invalid asset type '${asset.asset_type_name}'`);
          continue;
        }

        // Get default status_id for 'Active'
        const { data: activeStatus } = await supabase
          .from('asset_status')
          .select('status_id')
          .eq('name', 'Active')
          .single();

        // Check if asset with this ref already exists
        const { data: existingAsset } = await supabase
          .from('assets')
          .select('asset_id')
          .eq('asset_ref', asset.asset_ref)
          .single();

        if (existingAsset) {
          skipped++;
          continue;
        }

        // Parse numeric values
        const latitude = asset.latitude ? parseFloat(asset.latitude) : null;
        const longitude = asset.longitude ? parseFloat(asset.longitude) : null;
        const chainage = asset.kilometer ? parseFloat(asset.kilometer) : null;
        const unitCost = asset.original_cost ? parseFloat(asset.original_cost) : null;
        const expectedLife = asset.expected_life ? parseInt(asset.expected_life) : null;

        // Create the asset record
        const assetRecord = {
          asset_ref: asset.asset_ref,
          asset_type_id: assetType.asset_type_id,
          description: asset.description || asset.asset_ref,
          status_id: activeStatus?.status_id,
          gps_lat: latitude,
          gps_lng: longitude,
          road_name: asset.road_name || null,
          road_number: asset.road_number || null,
          km_marker: chainage,
          install_date: asset.install_date || null,
          region: asset.region || null,
          depot: asset.installer || null,
          notes: asset.notes || null,
          created_by: userData.user.id,
          purchase_price: unitCost,
          useful_life_years: expectedLife,
        };

        // Insert into database
        const { data: insertedAsset, error: insertError } = await supabase
          .from('assets')
          .insert(assetRecord)
          .select()
          .single();

        if (insertError) {
          console.error(`Error inserting asset ${asset.asset_ref}:`, insertError);
          errors.push(`${asset.asset_ref}: ${insertError.message}`);
          skipped++;
          continue;
        }

        // Log inventory change
        await supabase
          .from('asset_inventory_log')
          .insert({
            asset_id: insertedAsset.asset_id,
            action: 'CREATE',
            changed_by: userData.user.id,
            changes_summary: `Asset imported from file`,
          });

        imported++;
      } catch (error) {
        console.error(`Error importing asset ${asset.asset_ref}:`, error);
        errors.push(`${asset.asset_ref}: ${error.message}`);
        skipped++;
      }
    }

    return c.json({
      success: true,
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error importing assets:", error);
    return c.json({ error: `Failed to import assets: ${error.message}` }, 500);
  }
});

// Get asset inventory log (all changes) - MUST come before /assets/:id route
app.get("/make-server-c894a9ff/assets/inventory-log", async (c) => {
  try {
    // Get user context for tenant filtering
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile from Postgres view to retrieve tenant_id
    const { data: userProfile, error: profileError } = await supabase
      .from('tams360_user_profiles_v')
      .select('id, tenant_id, role')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !userProfile || !userProfile.tenant_id) {
      return c.json({ error: "User not associated with an organization" }, 403);
    }

    const { data: logs, error } = await supabase
      .from("tams360_asset_inventory_log_v")
      .select("*")
      .eq("tenant_id", userProfile.tenant_id)
      .order("changed_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("Error fetching inventory log:", error);
      return c.json({ logs: [] });
    }

    // Format the logs - the view already has all the fields we need
    const formattedLogs = logs.map((log) => ({
      log_id: log.log_id,
      asset_id: log.asset_id,
      asset_ref: log.asset_ref,
      asset_type_name: log.asset_type_name,
      action: log.action,
      changed_by: log.changed_by,
      changed_by_name: log.changed_by_name,
      changed_at: log.changed_at,
      changes_summary: log.changes_summary,
      old_values: log.old_values,
      new_values: log.new_values,
    }));

    return c.json({ logs: formattedLogs });
  } catch (error) {
    console.error("Error fetching inventory log:", error);
    return c.json({ error: "Failed to fetch inventory log" }, 500);
  }
});

// Get asset by ID
app.get("/make-server-c894a9ff/assets/:id", async (c) => {
  try {
    // Get user context for tenant filtering
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile from Postgres view to retrieve tenant_id
    const { data: userProfile, error: profileError } = await supabase
      .from('tams360_user_profiles_v')
      .select('id, tenant_id, role')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !userProfile || !userProfile.tenant_id) {
      return c.json({ error: "User not associated with an organization" }, 403);
    }

    const assetId = c.req.param("id");
    
    // Validate UUID format (basic check to prevent SQL errors)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(assetId)) {
      return c.json({ error: "Invalid asset ID format" }, 400);
    }
    
    // Try to get from public view first with tenant filtering
    const { data: asset, error } = await supabase
      .from("tams360_assets_v")
      .select("*")
      .eq("asset_id", assetId)
      .eq("tenant_id", userProfile.tenant_id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching asset from view:", error);
      return c.json({ error: "Failed to fetch asset" }, 500);
    }

    if (!asset) {
      return c.json({ error: "Asset not found" }, 404);
    }

    return c.json({ asset });
  } catch (error) {
    console.error("Error fetching asset:", error);
    return c.json({ error: "Failed to fetch asset" }, 500);
  }
});

// Update asset
app.put("/make-server-c894a9ff/assets/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const assetId = c.req.param("id");
    const updates = await c.req.json();

    const existingAsset = await kv.get(`asset:${assetId}`);

    if (!existingAsset) {
      return c.json({ error: "Asset not found" }, 404);
    }

    const updatedAsset = {
      ...existingAsset,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`asset:${assetId}`, updatedAsset);

    return c.json({ success: true, asset: updatedAsset });
  } catch (error) {
    return c.json({ error: "Failed to update asset" }, 500);
  }
});

// Delete asset
app.delete("/make-server-c894a9ff/assets/:id", async (c) => {
  try {
    const assetId = c.req.param("id");

    await kv.del(`asset:${assetId}`);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to delete asset" }, 500);
  }
});

// UTILITY: Fix GPS coordinates (Admin only)
// This endpoint can be used to update GPS coordinates for assets
app.post("/make-server-c894a9ff/assets/:id/fix-gps", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !userData?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const assetId = c.req.param("id");
    const { latitude, longitude } = await c.req.json();

    if (!latitude || !longitude) {
      return c.json({ error: "Latitude and longitude are required" }, 400);
    }

    // Validate coordinates
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return c.json({ error: "Invalid coordinates" }, 400);
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return c.json({ error: "Coordinates out of valid range" }, 400);
    }

    // Update in database
    const { data: updatedAsset, error: updateError } = await supabase
      .from("assets")
      .update({
        gps_lat: lat,
        gps_lng: lng,
      })
      .eq("asset_id", assetId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating GPS coordinates:", updateError);
      return c.json({ error: updateError.message }, 500);
    }

    console.log(`GPS coordinates updated for asset ${assetId}: ${lat}, ${lng}`);
    return c.json({ success: true, asset: updatedAsset });
  } catch (error) {
    console.error("Error fixing GPS coordinates:", error);
    return c.json({ error: "Failed to update GPS coordinates" }, 500);
  }
});

// Seed database with default data
app.post("/make-server-c894a9ff/seed-data", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    let assetTypesCreated = 0;
    let conditionsCreated = 0;
    let statusesCreated = 0;
    let urgencyLevelsCreated = 0;
    let inspectionTypesCreated = 0;
    let componentTemplatesCreated = 0;
    let templateItemsCreated = 0;

    // Asset Types
    const assetTypes = [
      { name: "Signage", abbreviation: "SGN", display_order: 1 },
      { name: "Guardrail", abbreviation: "GRD", display_order: 2 },
      { name: "Traffic Signal", abbreviation: "TRS", display_order: 3 },
      { name: "Gantry", abbreviation: "GNT", display_order: 4 },
      { name: "Fence", abbreviation: "FEN", display_order: 5 },
      { name: "Safety Barrier", abbreviation: "SFB", display_order: 6 },
      { name: "Guidepost", abbreviation: "GDP", display_order: 7 },
      { name: "Road Marking", abbreviation: "RDM", display_order: 8 },
      { name: "Raised Road Marker", abbreviation: "RRM", display_order: 9 },
    ];

    const existingAssetTypes = await kv.getByPrefix("asset-type:");
    for (const assetType of assetTypes) {
      const exists = existingAssetTypes.some((at: any) => at.name === assetType.name);
      if (!exists) {
        await kv.set(`asset-type:${assetType.abbreviation}`, {
          ...assetType,
          is_active: true,
          created_at: new Date().toISOString(),
        });
        assetTypesCreated++;
      }
    }

    // Conditions
    const conditions = [
      { name: "Excellent", score: 4, description: "Like new condition", color_hex: "#10B981" },
      { name: "Good", score: 3, description: "Minor wear, fully functional", color_hex: "#3B82F6" },
      { name: "Fair", score: 2, description: "Noticeable wear, needs attention", color_hex: "#F59E0B" },
      { name: "Poor", score: 1, description: "Significant deterioration", color_hex: "#DC2626" },
    ];

    const existingConditions = await kv.getByPrefix("condition:");
    for (const condition of conditions) {
      const exists = existingConditions.some((c: any) => c.name === condition.name);
      if (!exists) {
        await kv.set(`condition:${condition.name.toLowerCase()}`, {
          ...condition,
          created_at: new Date().toISOString(),
        });
        conditionsCreated++;
      }
    }

    // Asset Status
    const statuses = [
      { name: "Active", description: "Asset is operational and in use", color_hex: "#10B981", display_order: 1 },
      { name: "Damaged", description: "Asset has damage but is still in place", color_hex: "#F59E0B", display_order: 2 },
      { name: "Missing", description: "Asset is missing or stolen", color_hex: "#DC2626", display_order: 3 },
      { name: "Repaired", description: "Asset has been repaired", color_hex: "#3B82F6", display_order: 4 },
      { name: "Replaced", description: "Asset has been replaced", color_hex: "#8B5CF6", display_order: 5 },
      { name: "Decommissioned", description: "Asset removed from service", color_hex: "#6B7280", display_order: 6 },
    ];

    const existingStatuses = await kv.getByPrefix("status:");
    for (const status of statuses) {
      const exists = existingStatuses.some((s: any) => s.name === status.name);
      if (!exists) {
        await kv.set(`status:${status.name.toLowerCase()}`, {
          ...status,
          is_active: true,
          created_at: new Date().toISOString(),
        });
        statusesCreated++;
      }
    }

    // Urgency Levels
    const urgencyLevels = [
      { level: 1, label: "Immediate", description: "Critical safety issue requiring immediate attention", color_hex: "#DC2626", response_time_days: 1 },
      { level: 2, label: "High", description: "Significant issue requiring prompt action", color_hex: "#F59E0B", response_time_days: 7 },
      { level: 3, label: "Medium", description: "Moderate issue to be addressed soon", color_hex: "#3B82F6", response_time_days: 30 },
      { level: 4, label: "Low", description: "Minor issue for routine maintenance", color_hex: "#10B981", response_time_days: 90 },
    ];

    const existingUrgencies = await kv.getByPrefix("urgency:");
    for (const urgency of urgencyLevels) {
      const exists = existingUrgencies.some((u: any) => u.level === urgency.level);
      if (!exists) {
        await kv.set(`urgency:level-${urgency.level}`, {
          ...urgency,
          created_at: new Date().toISOString(),
        });
        urgencyLevelsCreated++;
      }
    }

    // Inspection Types
    const inspectionTypes = [
      { name: "Routine", description: "Scheduled routine inspection", is_scheduled: true, frequency_days: 90 },
      { name: "Incident", description: "Inspection following incident report", is_scheduled: false, frequency_days: null },
      { name: "Verification", description: "Post-maintenance verification", is_scheduled: false, frequency_days: null },
      { name: "Compliance", description: "Regulatory compliance inspection", is_scheduled: true, frequency_days: 365 },
      { name: "Safety Audit", description: "Comprehensive safety audit", is_scheduled: true, frequency_days: 180 },
    ];

    const existingInspectionTypes = await kv.getByPrefix("inspection-type:");
    for (const inspType of inspectionTypes) {
      const exists = existingInspectionTypes.some((it: any) => it.name === inspType.name);
      if (!exists) {
        await kv.set(`inspection-type:${inspType.name.toLowerCase().replace(/ /g, '-')}`, {
          ...inspType,
          created_at: new Date().toISOString(),
        });
        inspectionTypesCreated++;
      }
    }

    // Component Templates (simplified - metadata only)
    const templateDefinitions = [
      { assetType: "Signage", abbreviation: "SGN", componentCount: 6 },
      { assetType: "Guidepost", abbreviation: "GDP", componentCount: 6 },
      { assetType: "Traffic Signal", abbreviation: "TRS", componentCount: 4 },
      { assetType: "Guardrail", abbreviation: "GRD", componentCount: 4 },
      { assetType: "Safety Barrier", abbreviation: "SFB", componentCount: 2 },
      { assetType: "Fence", abbreviation: "FEN", componentCount: 3 },
      { assetType: "Road Marking", abbreviation: "RDM", componentCount: 2 },
      { assetType: "Gantry", abbreviation: "GNT", componentCount: 6 },
      { assetType: "Raised Road Marker", abbreviation: "RRM", componentCount: 4 },
    ];

    const existingTemplates = await kv.getByPrefix("template:");
    for (const template of templateDefinitions) {
      const exists = existingTemplates.some((t: any) => t.asset_type_name === template.assetType);
      if (!exists) {
        const templateId = `template-${template.abbreviation}-${Date.now()}`;
        await kv.set(`template:${templateId}`, {
          template_id: templateId,
          asset_type_name: template.assetType,
          name: `${template.assetType} - Default Inspection Template`,
          description: `Seeded default inspection template for ${template.assetType}`,
          version: 1,
          is_active: true,
          component_count: template.componentCount,
          created_at: new Date().toISOString(),
        });
        componentTemplatesCreated++;
        templateItemsCreated += template.componentCount;
      }
    }

    return c.json({
      success: true,
      assetTypes: assetTypesCreated,
      conditions: conditionsCreated,
      statuses: statusesCreated,
      urgencyLevels: urgencyLevelsCreated,
      inspectionTypes: inspectionTypesCreated,
      componentTemplates: componentTemplatesCreated,
      templateItems: templateItemsCreated,
    });
  } catch (error) {
    console.error("Error seeding data:", error);
    return c.json({ error: "Failed to seed data" }, 500);
  }
});

// Quick Setup - Create sample assets with GPS coordinates
app.post("/make-server-c894a9ff/quick-setup", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile from Postgres view to retrieve tenant_id and role
    const { data: userProfile, error: profileError } = await supabase
      .from('tams360_user_profiles_v')
      .select('id, tenant_id, role')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !userProfile || !userProfile.tenant_id) {
      return c.json({ error: "User not associated with an organization" }, 403);
    }

    // Only admins can run quick setup
    if (userProfile.role !== "admin") {
      return c.json({ error: "Admin access required" }, 403);
    }

    console.log(`Running quick setup for user ${userData.user.id} in tenant ${userProfile.tenant_id}`);

    // Call the quickSetup function
    const result = await quickSetup(supabase, userData, userProfile);

    return c.json(result);
  } catch (error: any) {
    console.error("Error running quick setup:", error);
    return c.json({ 
      error: "Failed to run quick setup", 
      details: error.message 
    }, 500);
  }
});

// Bulk assign assets to region/depot
app.post("/make-server-c894a9ff/assets/bulk-assign", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(
      accessToken,
    );

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile to check role
    const userProfile = await kv.get(`user:${userData.user.id}`);
    if (!userProfile || !userProfile.tenantId) {
      return c.json({ error: "User not associated with an organization" }, 403);
    }

    // Only admins can bulk assign
    if (userProfile.role !== "admin") {
      return c.json({ error: "Admin access required" }, 403);
    }

    const { assetIds, region, depot } = await c.req.json();

    if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
      return c.json({ error: "No asset IDs provided" }, 400);
    }

    if (!region && !depot) {
      return c.json({ error: "Must provide region or depot to assign" }, 400);
    }

    // Build update object
    const updateData: any = {};
    if (region) updateData.region = region;
    if (depot) updateData.depot = depot;

    // Update all assets
    const { data: updatedAssets, error: updateError } = await supabase
      .from("assets")
      .update(updateData)
      .in("asset_id", assetIds)
      .eq("tenant_id", userProfile.tenantId)
      .select();

    if (updateError) {
      console.error("Error updating assets:", updateError);
      return c.json({ error: "Failed to update assets" }, 500);
    }

    console.log(`Bulk assigned ${updatedAssets?.length || 0} assets to region:${region}, depot:${depot}`);

    return c.json({
      success: true,
      updatedCount: updatedAssets?.length || 0,
    });
  } catch (error) {
    console.error("Error in bulk assign:", error);
    return c.json({ error: "Failed to bulk assign assets" }, 500);
  }
});

// ============================================================================
// INSPECTION ROUTES
// ============================================================================

// NOTE: Main inspections POST endpoint with component scores is defined later (line ~1653)
// NOTE: Main inspections GET endpoint is defined later in the file (line ~1773)

// Get inspections for an asset
app.get("/make-server-c894a9ff/assets/:id/inspections", async (c) => {
  try {
    // Get user context for tenant filtering
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile from Postgres view to retrieve tenant_id
    const { data: userProfile, error: profileError } = await supabase
      .from('tams360_user_profiles_v')
      .select('id, tenant_id, role')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !userProfile || !userProfile.tenant_id) {
      return c.json({ error: "User not associated with an organization" }, 403);
    }

    const assetId = c.req.param("id");
    
    // Use public view filtered by asset_id and tenant_id
    const { data: inspections, error } = await supabase
      .from("tams360_inspections_v")
      .select("*")
      .eq("asset_id", assetId)
      .eq("tenant_id", userProfile.tenant_id)
      .order("inspection_date", { ascending: false });

    if (error) {
      console.error("Error fetching asset inspections:", error);
      return c.json({ error: "Failed to fetch inspections" }, 500);
    }

    return c.json({ inspections: inspections || [] });
  } catch (error) {
    console.error("Error fetching asset inspections:", error);
    return c.json({ error: "Failed to fetch inspections" }, 500);
  }
});

// ============================================================================
// MAINTENANCE ROUTES
// ============================================================================

// Create maintenance record
app.post("/make-server-c894a9ff/maintenance", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(
      accessToken,
    );

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile from Postgres view to retrieve tenant_id
    const { data: userProfile, error: profileError } = await supabase
      .from('tams360_user_profiles_v')
      .select('id, tenant_id, role')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !userProfile || !userProfile.tenant_id) {
      return c.json({ error: "User not associated with an organization" }, 403);
    }

    const maintenance = await c.req.json();

    // SERVER-SIDE VALIDATION: Scheduled status requires future scheduled_date
    if (maintenance.status === "Scheduled") {
      if (!maintenance.scheduled_date) {
        return c.json({ error: "Scheduled maintenance requires a scheduled date" }, 400);
      }
      const scheduledDate = new Date(maintenance.scheduled_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (scheduledDate < today) {
        return c.json({ error: "Scheduled date cannot be in the past" }, 400);
      }
    }

    // SERVER-SIDE VALIDATION: Completed status requires completed_date
    if (maintenance.status === "Completed" && !maintenance.completed_date) {
      return c.json({ error: "Completed maintenance requires a completed date" }, 400);
    }

    // AUTO-UPDATE: If completed_date is provided, automatically set status to Completed
    let finalStatus = maintenance.status || "Scheduled";
    if (maintenance.completed_date && finalStatus !== "Completed") {
      finalStatus = "Completed";
      console.log("Auto-updated status to Completed because completed_date was provided");
    }

    // Try to insert into database first
    // Include tenant_id for proper data isolation
    // Let the database generate maintenance_id
    const { data: record, error } = await supabase
      .from("maintenance_records")
      .insert({
        asset_id: maintenance.asset_id,
        tenant_id: userProfile.tenant_id,
        maintenance_type: maintenance.maintenance_type,
        scheduled_date: maintenance.scheduled_date || null,
        completed_date: maintenance.completed_date || null,
        status: finalStatus,
        description: maintenance.description,
        notes: maintenance.notes,
        estimated_cost: maintenance.cost || null,
        actual_cost: maintenance.actual_cost || null,
        created_by: userData.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("❌ [Supabase] Error creating maintenance in DB:", JSON.stringify(error, null, 2));
      // Fallback to KV store
      const maintenanceId = `maintenance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const maintenanceRecord = {
        maintenance_id: maintenanceId,
        tenant_id: userProfile.tenant_id,
        ...maintenance,
        logged_by: userData.user.id,
        created_at: new Date().toISOString(),
      };
      await kv.set(`maintenance:${maintenanceId}`, maintenanceRecord);
      return c.json({ success: true, maintenance: maintenanceRecord });
    }

    return c.json({ success: true, maintenance: record });
  } catch (error) {
    console.error("Error creating maintenance record:", error);
    return c.json({ error: "Failed to create maintenance record" }, 500);
  }
});

// NOTE: Main maintenance GET endpoint is defined later in the file (line ~1418)

// Get maintenance records for an asset
app.get("/make-server-c894a9ff/assets/:id/maintenance", async (c) => {
  try {
    // Get user context for tenant filtering
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile from Postgres view to retrieve tenant_id
    const { data: userProfile, error: profileError } = await supabase
      .from('tams360_user_profiles_v')
      .select('id, tenant_id, role')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !userProfile || !userProfile.tenant_id) {
      return c.json({ error: "User not associated with an organization" }, 403);
    }

    const assetId = c.req.param("id");
    
    // Verify the asset belongs to the user's tenant
    const { data: asset } = await supabase
      .from("tams360_assets_v")
      .select("tenant_id")
      .eq("asset_id", assetId)
      .single();
    
    if (!asset || asset.tenant_id !== userProfile.tenant_id) {
      return c.json({ error: "Unauthorized access to this asset" }, 403);
    }
    
    const { data: records, error } = await supabase
      .from("tams360_maintenance_v")
      .select("*")
      .eq("asset_id", assetId)
      .order("maintenance_id", { ascending: false });

    if (error) {
      console.error("Error fetching maintenance for asset:", error);
      return c.json({ error: "Failed to fetch maintenance records" }, 500);
    }

    return c.json({ maintenance: records });
  } catch (error) {
    return c.json({ error: "Failed to fetch maintenance records" }, 500);
  }
});

// Get maintenance statistics
app.get("/make-server-c894a9ff/maintenance/stats", async (c) => {
  try {
    // Get user context for tenant filtering
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile from Postgres view to retrieve tenant_id
    const { data: userProfile, error: profileError } = await supabase
      .from('tams360_user_profiles_v')
      .select('id, tenant_id, role')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !userProfile || !userProfile.tenant_id) {
      return c.json({ error: "User not associated with an organization" }, 403);
    }

    // Query maintenance records filtered by tenant_id
    const { data: records, error } = await supabase
      .from("tams360_maintenance_v")
      .select("maintenance_id, status, scheduled_date, completed_date, estimated_cost, actual_cost")
      .eq("tenant_id", userProfile.tenant_id);

    if (error) {
      console.error("Error fetching maintenance stats:", error);
      return c.json({ 
        stats: { scheduled: 0, inProgress: 0, completed: 0, overdue: 0, cancelled: 0, totalCost: 0 }
      });
    }

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    // Count records by status and calculate overdue
    let scheduled = 0;
    let inProgress = 0;
    let completed = 0;
    let overdue = 0;
    let cancelled = 0;
    let totalCost = 0;
    
    records.forEach((r) => {
      // Sum total cost (use actual_cost if available, otherwise estimated_cost)
      const cost = r.actual_cost || r.estimated_cost || 0;
      if (cost > 0) {
        totalCost += Number(cost);
      }
      
      // Count by status
      if (r.status === "Cancelled" || r.status === "cancelled") {
        cancelled++;
      } else if (r.status === "In Progress") {
        inProgress++;
      } else if (r.status === "Completed") {
        // Only count completed this month
        if (r.completed_date) {
          const completedDate = new Date(r.completed_date);
          if (completedDate >= thisMonth) {
            completed++;
          }
        } else {
          // If no completed_date but status is Completed, count it
          completed++;
        }
      } else if (r.status === "Scheduled" && r.scheduled_date) {
        // Count overdue (scheduled but past due date and not completed)
        const schedDate = new Date(r.scheduled_date);
        if (schedDate < now) {
          overdue++;
        } else if (schedDate <= thirtyDaysFromNow) {
          // Only count as scheduled if within next 30 days
          scheduled++;
        }
      } else if (r.status === "Overdue") {
        overdue++;
      }
    });
    
    const stats = { scheduled, inProgress, completed, overdue, cancelled, totalCost };

    return c.json({ stats });
  } catch (error) {
    console.error("Error calculating maintenance stats:", error);
    return c.json({ error: "Failed to calculate stats" }, 500);
  }
});

// Get maintenance count only (lightweight)
app.get("/make-server-c894a9ff/maintenance/count", async (c) => {
  try {
    // Get user context for tenant filtering
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ count: 0 }, 200);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ count: 0 }, 200);
    }

    // Get user profile from Postgres view to retrieve tenant_id
    const { data: userProfile, error: profileError } = await supabase
      .from('tams360_user_profiles_v')
      .select('id, tenant_id, role')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !userProfile || !userProfile.tenant_id) {
      return c.json({ count: 0 }, 200);
    }

    // Query maintenance records count filtered by tenant_id
    const { count, error } = await supabase
      .from("tams360_maintenance_v")
      .select("maintenance_id", { count: 'exact', head: true })
      .eq("tenant_id", userProfile.tenant_id);

    if (error) {
      console.error("Error fetching maintenance count:", error);
      return c.json({ count: 0 }, 200);
    }

    return c.json({ count: count || 0 });
  } catch (error) {
    console.error("Error fetching maintenance count:", error);
    return c.json({ count: 0 }, 200);
  }
});

// Get single maintenance record
app.get("/make-server-c894a9ff/maintenance/:id", async (c) => {
  try {
    // Get user context for tenant filtering
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile from Postgres view to retrieve tenant_id
    const { data: userProfile, error: profileError } = await supabase
      .from('tams360_user_profiles_v')
      .select('id, tenant_id, role')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !userProfile || !userProfile.tenant_id) {
      return c.json({ error: "User not associated with an organization" }, 403);
    }

    const maintenanceId = c.req.param("id");
    
    // Add detailed logging
    console.log(`🔍 GET /maintenance/:id - Requested ID: "${maintenanceId}", type: ${typeof maintenanceId}`);
    
    if (!maintenanceId || maintenanceId === 'undefined' || maintenanceId === 'null') {
      console.error(`❌ Invalid maintenance ID received: "${maintenanceId}"`);
      return c.json({ error: "Invalid maintenance ID" }, 400);
    }

    // Get the maintenance record first
    const { data: record, error } = await supabase
      .from("tams360_maintenance_v")
      .select("*")
      .eq("maintenance_id", maintenanceId)
      .single();
    
    if (error || !record) {
      console.error("Error fetching maintenance record:", error);
      return c.json({ error: "Maintenance record not found" }, 404);
    }
    
    // Verify the asset belongs to the user's tenant
    const { data: asset } = await supabase
      .from("tams360_assets_v")
      .select("tenant_id")
      .eq("asset_id", record.asset_id)
      .single();
    
    if (!asset || asset.tenant_id !== userProfile.tenant_id) {
      return c.json({ error: "Unauthorized access to this maintenance record" }, 403);
    }

    if (error) {
      console.error("Error fetching maintenance record:", error);
      return c.json({ error: "Maintenance record not found" }, 404);
    }

    return c.json({ maintenance: record });
  } catch (error) {
    console.error("Error fetching maintenance record:", error);
    return c.json({ error: "Failed to fetch maintenance record" }, 500);
  }
});

// Delete maintenance record
app.delete("/make-server-c894a9ff/maintenance/:id", async (c) => {
  try {
    // Get user context for tenant filtering
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile from Postgres view to retrieve tenant_id
    const { data: userProfile, error: profileError } = await supabase
      .from('tams360_user_profiles_v')
      .select('id, tenant_id, role')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !userProfile || !userProfile.tenant_id) {
      return c.json({ error: "User not associated with an organization" }, 403);
    }

    const maintenanceId = c.req.param("id");

    // Get the maintenance record first to verify tenant ownership
    const { data: record, error: fetchError } = await supabase
      .from("tams360_maintenance_v")
      .select("*")
      .eq("maintenance_id", maintenanceId)
      .single();
    
    if (fetchError || !record) {
      console.error("Error fetching maintenance record:", fetchError);
      return c.json({ error: "Maintenance record not found" }, 404);
    }
    
    // Verify tenant ownership
    if (record.tenant_id !== userProfile.tenant_id) {
      return c.json({ error: "Unauthorized access to this maintenance record" }, 403);
    }

    // Delete the maintenance record
    const { error: deleteError } = await supabase
      .from("maintenance_records")
      .delete()
      .eq("maintenance_id", maintenanceId);

    if (deleteError) {
      console.error("Error deleting maintenance record:", deleteError);
      return c.json({ error: "Failed to delete maintenance record" }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting maintenance record:", error);
    return c.json({ error: "Failed to delete maintenance record" }, 500);
  }
});

// ============================================================================
// DASHBOARD & ANALYTICS ROUTES
// ============================================================================

// NOTE: Main dashboard stats endpoint is defined later in the file (line ~2039)
// This allows it to use the enhanced database queries with proper schema references

// ============================================================================
// MAP OVERLAY ROUTES
// ============================================================================

// Get all overlay layers
app.get("/make-server-c894a9ff/map/overlays", async (c) => {
  try {
    const overlays = await kv.getByPrefix("overlay:");
    return c.json({ overlays: overlays || [] });
  } catch (error) {
    console.error("Error fetching overlays:", error);
    return c.json({ overlays: [], error: "Failed to fetch overlays" }, 500);
  }
});

// Add overlay layer (admin/supervisor only)
app.post("/make-server-c894a9ff/map/overlays", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(
      accessToken,
    );

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    const userProfile = await kv.get(`user:${userData.user.id}`);
    
    // Only admins and supervisors can add overlays
    if (!userProfile || (userProfile.role !== "admin" && userProfile.role !== "supervisor")) {
      return c.json({ error: "Admin/Supervisor access required" }, 403);
    }

    const overlay = await c.req.json();
    const overlayId = `overlay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const overlayRecord = {
      id: overlayId,
      name: overlay.name,
      description: overlay.description || "",
      type: overlay.type || "geojson", // geojson, kml, wms
      url: overlay.url,
      color: overlay.color || "#39AEDF",
      defaultVisible: overlay.defaultVisible !== false,
      createdBy: userProfile.email,
      createdAt: new Date().toISOString(),
      metadata: overlay.metadata || {},
    };

    await kv.set(`overlay:${overlayId}`, overlayRecord);

    // Log audit trail
    await kv.set(`audit:${Date.now()}`, {
      action: "overlay_added",
      userId: userData.user.id,
      overlayId,
      overlayName: overlay.name,
      timestamp: new Date().toISOString(),
    });

    return c.json({ success: true, overlay: overlayRecord });
  } catch (error) {
    console.error("Error adding overlay:", error);
    return c.json({ error: "Failed to add overlay" }, 500);
  }
});

// Update overlay layer
app.put("/make-server-c894a9ff/map/overlays/:overlayId", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(
      accessToken,
    );

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    const userProfile = await kv.get(`user:${userData.user.id}`);
    
    if (!userProfile || (userProfile.role !== "admin" && userProfile.role !== "supervisor")) {
      return c.json({ error: "Admin/Supervisor access required" }, 403);
    }

    const overlayId = c.req.param("overlayId");
    const updates = await c.req.json();

    const existingOverlay = await kv.get(`overlay:${overlayId}`);
    
    if (!existingOverlay) {
      return c.json({ error: "Overlay not found" }, 404);
    }

    const updatedOverlay = {
      ...existingOverlay,
      ...updates,
      updatedBy: userProfile.email,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`overlay:${overlayId}`, updatedOverlay);

    return c.json({ success: true, overlay: updatedOverlay });
  } catch (error) {
    console.error("Error updating overlay:", error);
    return c.json({ error: "Failed to update overlay" }, 500);
  }
});

// Delete overlay layer
app.delete("/make-server-c894a9ff/map/overlays/:overlayId", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(
      accessToken,
    );

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    const userProfile = await kv.get(`user:${userData.user.id}`);
    
    if (!userProfile || (userProfile.role !== "admin" && userProfile.role !== "supervisor")) {
      return c.json({ error: "Admin/Supervisor access required" }, 403);
    }

    const overlayId = c.req.param("overlayId");
    const overlay = await kv.get(`overlay:${overlayId}`);
    
    if (!overlay) {
      return c.json({ error: "Overlay not found" }, 404);
    }

    await kv.del(`overlay:${overlayId}`);

    // Log audit trail
    await kv.set(`audit:${Date.now()}`, {
      action: "overlay_deleted",
      userId: userData.user.id,
      overlayId,
      overlayName: overlay.name,
      timestamp: new Date().toISOString(),
    });

    return c.json({ success: true, message: "Overlay deleted successfully" });
  } catch (error) {
    console.error("Error deleting overlay:", error);
    return c.json({ error: "Failed to delete overlay" }, 500);
  }
});

// ============================================================================
// DASHBOARD API ROUTES - Analytics and KPIs
// ============================================================================

// Get dashboard summary statistics
app.get("/make-server-c894a9ff/dashboard/summary", async (c) => {
  try {
    // Get user context for tenant filtering
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile from Postgres view to retrieve tenant_id
    const { data: userProfile, error: profileError } = await supabase
      .from('tams360_user_profiles_v')
      .select('id, tenant_id, role')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !userProfile || !userProfile.tenant_id) {
      return c.json({ error: "User not associated with an organization" }, 403);
    }

    const tenantId = userProfile.tenant_id;

    // Fetch all counts and stats in parallel with tenant filtering
    const [assetsCount, inspectionsCount, maintenanceCount, ciDistribution, urgencySummary, allAssets, uniqueInspectedAssets] = await Promise.all([
      supabase.from("tams360_assets_v").select("asset_id", { count: 'exact', head: true }).eq("tenant_id", tenantId),
      supabase.from("tams360_inspections_v").select("inspection_id", { count: 'exact', head: true }).eq("tenant_id", tenantId),
      supabase.from("tams360_maintenance_v").select("maintenance_id", { count: 'exact', head: true }).eq("tenant_id", tenantId),
      supabase.from("tams360_ci_distribution_v").select("*").eq("tenant_id", tenantId),
      supabase.from("tams360_urgency_summary_v").select("*").eq("tenant_id", tenantId),
      // Get all asset IDs
      supabase.from("tams360_assets_v").select("asset_id").eq("tenant_id", tenantId).limit(25000),
      // Get unique asset IDs that have been inspected
      supabase.from("tams360_inspections_v").select("asset_id").eq("tenant_id", tenantId).limit(25000),
    ]);

    const totalAssets = assetsCount.count || 0;
    const totalInspections = inspectionsCount.count || 0;
    const totalMaintenance = maintenanceCount.count || 0;

    // Calculate uninspected assets
    const allAssetIds = new Set((allAssets.data || []).map((a: any) => a.asset_id));
    const inspectedAssetIds = new Set((uniqueInspectedAssets.data || []).map((i: any) => i.asset_id));
    const uninspectedAssets = allAssetIds.size - inspectedAssetIds.size;

    // Calculate open work orders with tenant filtering
    const { count: openWorkOrders } = await supabase
      .from("tams360_maintenance_v")
      .select("maintenance_id", { count: 'exact', head: true })
      .eq("tenant_id", tenantId)
      .in("status", ["pending", "in_progress", "scheduled"]);

    // Calculate total remedial cost from urgency summary
    const totalRemedialCost = (urgencySummary.data || [])
      .reduce((sum: number, item: any) => sum + (Number(item.total_remedial_cost) || 0), 0);

    // Calculate total maintenance cost with limit and timeout protection
    const { data: maintenanceCosts } = await supabase
      .from("tams360_maintenance_v")
      .select("actual_cost, estimated_cost")
      .eq("tenant_id", tenantId)
      .limit(10000);
    
    const totalMaintenanceCost = (maintenanceCosts || [])
      .reduce((sum: number, item: any) => sum + (Number(item.actual_cost) || Number(item.estimated_cost) || 0), 0);

    // Count critical/immediate assets
    const criticalCount = (urgencySummary.data || [])
      .filter((item: any) => item.calculated_urgency === 'Immediate' || item.calculated_urgency === 'High')
      .reduce((sum: number, item: any) => sum + (item.count || 0), 0);

    return c.json({
      totalAssets,
      totalInspections,
      totalMaintenance,
      openWorkOrders: openWorkOrders || 0,
      totalRemedialCost,
      totalMaintenanceCost,
      criticalCount,
      uninspectedAssets,
      ciDistribution: ciDistribution.data || [],
      urgencySummary: urgencySummary.data || [],
    });
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    return c.json({ error: "Failed to fetch dashboard summary" }, 500);
  }
});

// Get CI distribution for charts (redirects to newer implementation below at line 3530)
// This endpoint is kept for backward compatibility

// NOTE: Urgency summary route moved to line 3881 to avoid duplicate route definition
// The implementation at line 3881 uses the proper database view and has better error handling

// Get critical alerts for dashboard
app.get("/make-server-c894a9ff/dashboard/critical-alerts", async (c) => {
  try {
    // Get user context for tenant filtering
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile from Postgres view to retrieve tenant_id
    const { data: userProfile, error: profileError } = await supabase
      .from('tams360_user_profiles_v')
      .select('id, tenant_id, role')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !userProfile || !userProfile.tenant_id) {
      return c.json({ error: "User not associated with an organization" }, 403);
    }

    // Query latest inspections to identify critical issues with reasonable limit
    const { data: inspections, error } = await supabase
      .from("tams360_inspections_v")
      .select("inspection_id, asset_id, asset_ref, asset_type_name, calculated_urgency, conditional_index, total_remedial_cost, tenant_id")
      .eq("tenant_id", userProfile.tenant_id)
      .limit(25000);

    if (error) {
      console.error("Error fetching inspections for critical alerts:", error);
      return c.json({ alerts: [] }, 200);
    }

    const alerts: any[] = [];

    // Find immediate urgency assets
    const immediateAssets = (inspections || []).filter((insp: any) => 
      insp.calculated_urgency === "Immediate" || insp.calculated_urgency === "4" || insp.calculated_urgency === 4
    );

    if (immediateAssets.length > 0) {
      alerts.push({
        title: "Immediate Urgency Assets",
        description: `${immediateAssets.length} assets require immediate attention`,
        count: immediateAssets.length,
        asset_ref: immediateAssets.slice(0, 3).map((a: any) => a.asset_ref).join(", "),
      });
    }

    // Find assets with CI < 30
    const criticalCI = (inspections || []).filter((insp: any) => 
      insp.conditional_index !== null && insp.conditional_index < 30
    );

    if (criticalCI.length > 0) {
      alerts.push({
        title: "Critical Condition Assets",
        description: `${criticalCI.length} assets with CI below 30`,
        count: criticalCI.length,
        detail: "Severe structural or functional deterioration detected",
      });
    }

    // Find high remedial costs
    const highCosts = (inspections || []).filter((insp: any) => 
      (insp.total_remedial_cost || 0) > 100000
    );

    if (highCosts.length > 0) {
      const totalCost = highCosts.reduce((sum: number, insp: any) => sum + (insp.total_remedial_cost || 0), 0);
      alerts.push({
        title: "High Remedial Costs",
        description: `R ${(totalCost / 1000000).toFixed(1)}M required for ${highCosts.length} assets`,
        count: highCosts.length,
        detail: "Significant budget allocation needed",
      });
    }

    return c.json({ alerts });
  } catch (error) {
    console.error("Error fetching critical alerts:", error);
    return c.json({ alerts: [] }, 200);
  }
});

// Get asset type summary
app.get("/make-server-c894a9ff/dashboard/asset-type-summary", async (c) => {
  try {
    // Get user context for tenant filtering
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile from Postgres view to retrieve tenant_id
    const { data: userProfile, error: profileError } = await supabase
      .from('tams360_user_profiles_v')
      .select('id, tenant_id, role')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !userProfile || !userProfile.tenant_id) {
      return c.json({ error: "User not associated with an organization" }, 403);
    }

    // Query inspections grouped by asset to get latest data per asset with reasonable limit
    const { data: inspections, error: inspError} = await supabase
      .from("tams360_inspections_v")
      .select("asset_id, asset_type_name, conditional_index, calculated_urgency, total_remedial_cost, inspection_date, tenant_id")
      .eq("tenant_id", userProfile.tenant_id)
      .order("inspection_date", { ascending: false })
      .limit(25000);

    if (inspError) {
      console.error("Error fetching inspections for asset type summary:", inspError);
      return c.json({ error: inspError.message }, 500);
    }

    // Get unique assets with their latest inspection
    const assetLatestMap = new Map();
    (inspections || []).forEach((insp: any) => {
      if (!assetLatestMap.has(insp.asset_id)) {
        assetLatestMap.set(insp.asset_id, insp);
      }
    });

    // Also get all assets (including those without inspections) with reasonable limit
    const { data: allAssets } = await supabase
      .from("tams360_assets_v")
      .select("asset_id, asset_type_name")
      .eq("tenant_id", userProfile.tenant_id)
      .limit(25000);

    // Group by asset type
    const typeMap = new Map();
    
    // First add all assets to get accurate counts
    (allAssets || []).forEach((asset: any) => {
      const typeName = asset.asset_type_name || "Unknown";
      if (!typeMap.has(typeName)) {
        typeMap.set(typeName, {
          asset_type_name: typeName,
          total_assets: 0,
          total_ci: 0,
          ci_count: 0,
          critical_count: 0,
          total_remedial_cost: 0,
        });
      }
      typeMap.get(typeName).total_assets += 1;
    });

    // Then add inspection data
    assetLatestMap.forEach((insp: any) => {
      const typeName = insp.asset_type_name || "Unknown";
      if (typeMap.has(typeName)) {
        const summary = typeMap.get(typeName);
        
        if (insp.conditional_index != null) {
          summary.total_ci += insp.conditional_index;
          summary.ci_count += 1;
        }
        
        if (insp.calculated_urgency === 'High' || insp.calculated_urgency === 'Immediate') {
          summary.critical_count += 1;
        }
        
        if (insp.total_remedial_cost != null) {
          summary.total_remedial_cost += Number(insp.total_remedial_cost);
        }
      }
    });

    // Calculate averages and format
    const summaryArray = Array.from(typeMap.values()).map((item: any) => ({
      ...item,
      avg_ci: item.ci_count > 0 ? Math.round(item.total_ci / item.ci_count) : null,
    })).sort((a, b) => b.total_assets - a.total_assets);

    return c.json({ summary: summaryArray });
  } catch (error) {
    console.error("Error fetching asset type summary:", error);
    return c.json({ error: "Failed to fetch asset type summary" }, 500);
  }
});

// Get inspector performance
app.get("/make-server-c894a9ff/dashboard/inspector-performance", async (c) => {
  try {
    // Get user context for tenant filtering
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile from Postgres view to retrieve tenant_id
    const { data: userProfile, error: profileError } = await supabase
      .from('tams360_user_profiles_v')
      .select('id, tenant_id, role')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !userProfile || !userProfile.tenant_id) {
      return c.json({ error: "User not associated with an organization" }, 403);
    }

    // Query inspections to build inspector performance with limit and tenant filtering
    const { data: inspections, error } = await supabase
      .from("tams360_inspections_v")
      .select("inspector_id, inspector_name, conditional_index, calculated_urgency, total_remedial_cost, inspection_date")
      .eq("tenant_id", userProfile.tenant_id)
      .limit(50000);

    if (error) {
      console.error("Error fetching inspections for inspector performance:", error);
      return c.json({ error: error.message }, 500);
    }

    // Group by inspector
    const inspectorMap = new Map();
    (inspections || []).forEach((inspection: any) => {
      const inspectorId = inspection.inspector_id || "unknown";
      const inspectorName = inspection.inspector_name || "Unknown";
      
      if (!inspectorMap.has(inspectorId)) {
        inspectorMap.set(inspectorId, {
          inspector_id: inspectorId,
          inspector_name: inspectorName,
          inspections_count: 0,
          total_ci: 0,
          high_urgency_found: 0,
          total_remedial_value: 0,
          first_inspection_date: inspection.inspection_date,
          last_inspection_date: inspection.inspection_date,
        });
      }
      
      const summary = inspectorMap.get(inspectorId);
      summary.inspections_count += 1;
      summary.total_ci += inspection.conditional_index || 0;
      
      if (inspection.calculated_urgency === 'High' || inspection.calculated_urgency === 'Immediate') {
        summary.high_urgency_found += 1;
      }
      
      summary.total_remedial_value += Number(inspection.total_remedial_cost) || 0;
      
      // Track date range
      if (inspection.inspection_date < summary.first_inspection_date) {
        summary.first_inspection_date = inspection.inspection_date;
      }
      if (inspection.inspection_date > summary.last_inspection_date) {
        summary.last_inspection_date = inspection.inspection_date;
      }
    });

    // Calculate averages and sort
    const performanceArray = Array.from(inspectorMap.values()).map((item: any) => ({
      ...item,
      avg_ci: item.inspections_count > 0 ? Math.round(item.total_ci / item.inspections_count * 10) / 10 : 0,
    })).sort((a, b) => b.inspections_count - a.inspections_count);

    return c.json({ performance: performanceArray });
  } catch (error) {
    console.error("Error fetching inspector performance:", error);
    return c.json({ error: "Failed to fetch inspector performance" }, 500);
  }
});

// Get CI trend over time
app.get("/make-server-c894a9ff/dashboard/ci-trend", async (c) => {
  try {
    // Get user context for tenant filtering
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile from Postgres view to retrieve tenant_id
    const { data: userProfile, error: profileError } = await supabase
      .from('tams360_user_profiles_v')
      .select('id, tenant_id, role')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !userProfile || !userProfile.tenant_id) {
      return c.json({ error: "User not associated with an organization" }, 403);
    }

    const { data, error } = await supabase
      .from("tams360_inspections_v")
      .select("inspection_date, conditional_index, asset_type_name")
      .eq("tenant_id", userProfile.tenant_id)
      .order("inspection_date", { ascending: true })
      .limit(50000);

    if (error) {
      console.error("Error fetching CI trend:", error);
      return c.json({ error: error.message }, 500);
    }

    // Group by month
    const monthlyData = (data || []).reduce((acc: any, item: any) => {
      const month = item.inspection_date?.substring(0, 7) || 'Unknown'; // YYYY-MM
      if (!acc[month]) {
        acc[month] = { month, totalCI: 0, count: 0 };
      }
      acc[month].totalCI += item.conditional_index || 0;
      acc[month].count += 1;
      return acc;
    }, {});

    const trend = Object.values(monthlyData).map((item: any) => ({
      month: item.month,
      avgCI: item.count > 0 ? Math.round(item.totalCI / item.count) : 0,
      count: item.count,
    }));

    return c.json({ trend });
  } catch (error) {
    console.error("Error fetching CI trend:", error);
    return c.json({ error: "Failed to fetch CI trend" }, 500);
  }
});

// Get cost trend over time
app.get("/make-server-c894a9ff/dashboard/cost-trend", async (c) => {
  try {
    // Get user context for tenant filtering
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile from Postgres view to retrieve tenant_id
    const { data: userProfile, error: profileError } = await supabase
      .from('tams360_user_profiles_v')
      .select('id, tenant_id, role')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !userProfile || !userProfile.tenant_id) {
      return c.json({ error: "User not associated with an organization" }, 403);
    }

    const { data, error } = await supabase
      .from("tams360_maintenance_v")
      .select("scheduled_date, completed_date, actual_cost, estimated_cost, status")
      .eq("tenant_id", userProfile.tenant_id)
      .order("scheduled_date", { ascending: true });

    if (error) {
      console.error("Error fetching cost trend:", error);
      return c.json({ error: error.message }, 500);
    }

    // Group by month
    const monthlyData = (data || []).reduce((acc: any, item: any) => {
      const month = (item.completed_date || item.scheduled_date)?.substring(0, 7) || 'Unknown';
      if (!acc[month]) {
        acc[month] = { month, totalCost: 0, count: 0 };
      }
      acc[month].totalCost += Number(item.actual_cost || item.estimated_cost || 0);
      acc[month].count += 1;
      return acc;
    }, {});

    const trend = Object.values(monthlyData).map((item: any) => ({
      month: item.month,
      totalCost: item.totalCost,
      count: item.count,
    }));

    return c.json({ trend });
  } catch (error) {
    console.error("Error fetching cost trend:", error);
    return c.json({ error: "Failed to fetch cost trend" }, 500);
  }
});

// ============================================================================
// COMPONENT TEMPLATE ROUTES (Enhancement 1)
// ============================================================================

// Debug: Get all asset types
app.get("/make-server-c894a9ff/asset-types", async (c) => {
  try {
    const { data: assetTypes, error } = await supabase
      .from("asset_types")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching asset types:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ assetTypes });
  } catch (error) {
    console.error("Error fetching asset types:", error);
    return c.json({ error: "Failed to fetch asset types" }, 500);
  }
});

// Get component template for an asset type
app.get("/make-server-c894a9ff/component-templates/:assetType", async (c) => {
  try {
    const assetTypeName = c.req.param("assetType");
    console.log(`[Template] Fetching template for asset type: ${assetTypeName}`);
    
    // First, look up the asset type ID from the name (case-insensitive)
    const { data: assetTypeData, error: typeError } = await supabase
      .from("asset_types")
      .select("asset_type_id, name")
      .ilike("name", assetTypeName)
      .single();

    if (typeError || !assetTypeData) {
      console.error(`[Template] Asset type not found: ${assetTypeName}`, typeError);
      return c.json({ template: null, error: `Asset type "${assetTypeName}" not found in database` }, 200);
    }

    const assetTypeId = assetTypeData.asset_type_id;
    console.log(`[Template] Asset type ID for ${assetTypeName}: ${assetTypeId}`);
    
    // Query Supabase database for template - FIXED: removed schema prefix for PostgREST compatibility
    // Use maybeSingle() instead of single() to avoid error when no template exists
    const { data: template, error } = await supabase
      .from("asset_component_templates")
      .select(`
        *,
        items:asset_component_template_items(*)
      `)
      .eq("asset_type_id", assetTypeId)
      .eq("is_active", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    // Sort items by component_order
    if (template?.items) {
      template.items.sort((a: any, b: any) => a.component_order - b.component_order);
    }

    // If there's a database error (not just "no results"), log it
    if (error) {
      console.error(`[Template] Database error fetching template for ${assetTypeName}:`, error);
      console.error(`[Template] Error code: ${error.code}, message: ${error.message}`);
      return c.json({ error: `Database error: ${error.message}` }, 500);
    }
    
    // If no template found, try to auto-initialize
    if (!template) {
      console.log(`[Template] No template found for ${assetTypeName} (asset_type_id: ${assetTypeId}), attempting auto-initialization...`);
      
      // First check if a template was created between the initial query and now (race condition)
      const { data: recheckTemplate, error: recheckError } = await supabase
        .from("asset_component_templates")
        .select(`
          *,
          items:asset_component_template_items(*)
        `)
        .eq("asset_type_id", assetTypeId)
        .eq("is_active", true)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (recheckTemplate) {
        console.log(`[Template] Template was created by another request, returning existing template`);
        if (recheckTemplate.items) {
          recheckTemplate.items.sort((a: any, b: any) => a.component_order - b.component_order);
        }
        return c.json({ template: recheckTemplate });
      }
      
      // Define default component templates
      const defaultTemplates: Record<string, Array<{ name: string; description: string }>> = {
        "Gantry": [
          { name: "Structural Support", description: "Gantry posts, beams, and foundations" },
          { name: "Sign Panels", description: "Sign face condition and visibility" },
          { name: "Lighting System", description: "LED panels, reflectivity, illumination" },
          { name: "Mounting Hardware", description: "Bolts, brackets, and fasteners" },
          { name: "Protective Coating", description: "Paint, galvanization, rust prevention" },
          { name: "Foundation", description: "Concrete base and anchoring system" },
        ],
        "Signage": [
          { name: "Foundation", description: "Cracks, erosion, movement, exposed base" },
          { name: "Holding Bolts / Base Plates", description: "Loose, missing, corroded bolts/plates" },
          { name: "Post / Vertical Member", description: "Leaning, bent, corroded, impact damaged posts" },
          { name: "Face / Panel", description: "Fading, damage, peeling, vandalism, unreadable message" },
          { name: "Face Fasteners", description: "Loose, missing, rusted brackets or fixings" },
          { name: "Nearby Vegetation", description: "Grass, bushes, trees blocking or partially obscuring sign" },
        ],
        "Traffic Sign": [
          { name: "Foundation", description: "Cracks, erosion, movement, exposed base" },
          { name: "Holding Bolts / Base Plates", description: "Loose, missing, corroded bolts/plates" },
          { name: "Post / Vertical Member", description: "Leaning, bent, corroded, impact damaged posts" },
          { name: "Face / Panel", description: "Fading, damage, peeling, vandalism, unreadable message" },
          { name: "Face Fasteners", description: "Loose, missing, rusted brackets or fixings" },
          { name: "Nearby Vegetation", description: "Grass, bushes, trees blocking or partially obscuring sign" },
        ],
        "Road Signage & Guide Post": [
          { name: "Foundation", description: "Cracks, erosion, movement, exposed base" },
          { name: "Holding Bolts / Base Plates", description: "Loose, missing, corroded bolts/plates" },
          { name: "Post / Vertical Member", description: "Leaning, bent, corroded, impact damaged posts" },
          { name: "Face / Panel", description: "Fading, damage, peeling, vandalism, unreadable message" },
          { name: "Face Fasteners", description: "Loose, missing, rusted brackets or fixings" },
          { name: "Nearby Vegetation", description: "Grass, bushes, trees blocking or partially obscuring sign" },
        ],
        "Guardrail": [
          { name: "Foundation", description: "Check for exposed footing, erosion, instability, cracking, or sinking foundations at post bases" },
          { name: "Holding Bolts & Base Plates", description: "Check for missing, loose, corroded anchor bolts, dislodged base plates" },
          { name: "Posts / Vertical Members", description: "Look for leaning, bent, missing, rusted, or broken posts" },
          { name: "Face / Rail Panel", description: "Check for dents, bends, impact damage, missing or dislocated panels/sections" },
          { name: "Face Fasteners", description: "Check for missing, loose or rusted bolts/clips joining guardrail segments" },
          { name: "Nearby Vegetation", description: "Check for grass, bush, trees blocking visibility or access to the guardrail" },
        ],
        "Traffic Signal": [
          { name: "Signal Operation (Cycle, Timing, Output)", description: "Check full cycle operation, timing, light output for all heads" },
          { name: "Signal Head Housing (Lenses, Hoods, Casings)", description: "Cracks, faded lenses, broken visors, exposed bulbs" },
          { name: "Pole / Mast Arm", description: "Rust, leaning, cracks, impact or structural damage" },
          { name: "Signal Alignment / Visibility", description: "Misaligned heads or visibility blocked by poles, trees, signs" },
          { name: "Electrical Cabinet / Controller Box", description: "Rust, damage, open doors, exposed wires, vandalism" },
        ],
        "Safety Barrier": [
          { name: "Foundation", description: "Check for repeated signs of exposed footings, if the base is cracked, loose, or showing signs of erosion or instability" },
          { name: "Face", description: "Look for widespread impact damage, cracks, broken edges, surface wear, or graffiti, or missing sections" },
          { name: "Face Fasteners", description: "Loose, missing or rusted bolts, rivets, and joints" },
          { name: "Nearby Vegetation", description: "Look for areas where bushes, trees, or grass are blocking the barrier or restricting view/access" },
          { name: "Steel Railings (Top element)", description: "Look for rust, dents, bending, breaks, disjointed sections or any missing parts" },
          { name: "Railing Fasteners / Joints", description: "Look for sections with multiple missing, loose, rusted or broken fasteners, bolts, clips, welds or connectors" },
        ],
        "Fencing": [
          { name: "Foundation", description: "Check for recurring signs of cracks, leaning posts, or unstable footing" },
          { name: "Posts / Vertical Members", description: "Check for multiple posts which are bent, leaning, broken, missing, or rusted" },
          { name: "Fence Face (wire mesh, palisade, panels)", description: "Check for broken holes, mesh/panels, sagging, or large gaps" },
          { name: "Face Fasteners (clips, brackets, ties)", description: "Check if there are connecting bolts, clips, or ties missing or loose in many places" },
          { name: "Nearby Vegetation", description: "Check if sections are blocked, damaged, or hidden by trees, shrubs, or grass" },
        ],
        "Road Marking": [
          { name: "Line / Marking Condition", description: "Check for fading, cracking, missing lines, or loss of retro-reflectivity. Evaluate all types: centreline, edge lines, stop lines, arrows, etc." },
          { name: "Nearby Vegetation", description: "Check for grass, shrubs, or tree shadows obscuring markings. Including growth from road shoulders and medians" },
        ],
        "Road Paint Markings": [
          { name: "Line / Marking Condition", description: "Check for fading, cracking, missing lines, or loss of retro-reflectivity. Evaluate all types: centreline, edge lines, stop lines, arrows, etc." },
          { name: "Nearby Vegetation", description: "Check for grass, shrubs, or tree shadows obscuring markings. Including growth from road shoulders and medians" },
        ],
        "Raised Road Markers": [
          { name: "Face (Marker condition)", description: "Inspect Raised Road Markers (RRM) for visibility, physical damage, detachment, fading, or missing reflectors. Includes both centreline and lane markings" },
          { name: "Nearby Vegetation", description: "Look for encroaching grass, debris, or shrubs that cover or obscure RRMs" },
        ],
      };

      const components = defaultTemplates[assetTypeName] || [
        { name: "Component 1", description: "Primary component" },
        { name: "Component 2", description: "Secondary component" },
        { name: "Component 3", description: "Tertiary component" },
      ];

      // Create the template - FIXED: removed schema prefix for PostgREST compatibility
      console.log(`[Template] Creating template for ${assetTypeName} with asset_type_id: ${assetTypeId}`);
      console.log(`[Template] Asset type data:`, JSON.stringify(assetTypeData, null, 2));
      
      if (!assetTypeId) {
        console.error(`[Template] asset_type_id is null or undefined! Cannot create template.`);
        return c.json({ template: null, error: `Invalid asset type ID for ${assetTypeName}` }, 200);
      }
      
      // Log the insert payload for debugging
      const insertPayload = {
        asset_type_id: assetTypeId,
        name: `${assetTypeName} Standard Template`,
        description: `Auto-generated component inspection template for ${assetTypeName}`,
        version: 1,
        is_active: true,
      };
      console.log(`[Template] Insert payload:`, JSON.stringify(insertPayload, null, 2));
      
      const { data: newTemplate, error: createError } = await supabase
        .from("asset_component_templates")
        .insert(insertPayload)
        .select()
        .single();

      if (createError) {
        console.error(`[Template] Error auto-creating template for ${assetTypeName}:`, JSON.stringify(createError, null, 2));
        console.error(`[Template] Error details - message:`, createError.message);
        console.error(`[Template] Error details - code:`, createError.code);
        console.error(`[Template] Error details - details:`, createError.details);
        console.error(`[Template] Error details - hint:`, createError.hint);
        const errorMsg = createError.message || createError.error_description || createError.msg || JSON.stringify(createError);
        return c.json({ template: null, error: `Failed to create template: ${errorMsg}` }, 200);
      }
      
      console.log(`[Template] Insert result - data:`, JSON.stringify(newTemplate, null, 2));
      
      if (!newTemplate) {
        console.error(`[Template] Template creation succeeded but returned null data for ${assetTypeName}`);
        return c.json({ template: null, error: `Template creation returned no data` }, 200);
      }

      console.log(`[Template] Successfully created template with ID: ${newTemplate.template_id}`);

      // Default rubrics
      const defaultDegreeRubric = { "1": "Minor", "2": "Moderate", "3": "Severe", "4": "Critical", "X": "Not present", "U": "Unable to inspect" };
      const defaultExtentRubric = { "1": "< 10%", "2": "10-30%", "3": "30-60%", "4": "> 60%" };
      const defaultRelevancyRubric = { "1": "Low", "2": "Medium", "3": "High", "4": "Critical" };

      // Create template items - Batch insert for better performance
      console.log(`[Template] Creating ${components.length} component items for template ${newTemplate.template_id}`);
      const itemsToInsert = components.map((component, i) => ({
        template_id: newTemplate.template_id,
        component_name: component.name,
        component_order: i + 1,
        what_to_inspect: component.description,
        degree_rubric: defaultDegreeRubric,
        extent_rubric: defaultExtentRubric,
        relevancy_rubric: defaultRelevancyRubric,
        quantity_unit: "EA",
        is_active: true,
      }));

      const { error: itemsError } = await supabase
        .from("asset_component_template_items")
        .insert(itemsToInsert);
      
      if (itemsError) {
        console.error(`[Template] Error creating component items:`, itemsError);
        // Clean up the template we just created
        await supabase.from("asset_component_templates").delete().eq("template_id", newTemplate.template_id);
        return c.json({ template: null, error: `Failed to create template items: ${itemsError.message}` }, 200);
      }

      console.log(`[Template] Auto-created template for ${assetTypeName} with ${components.length} components`);

      // Fetch the newly created template with items
      const { data: createdTemplate, error: fetchError } = await supabase
        .from("asset_component_templates")
        .select(`
          *,
          items:asset_component_template_items(*)
        `)
        .eq("template_id", newTemplate.template_id)
        .single();

      if (fetchError) {
        console.error("Error fetching newly created template:", fetchError);
        return c.json({ template: null }, 200);
      }

      // Sort items by component_order
      if (createdTemplate?.items) {
        createdTemplate.items.sort((a: any, b: any) => a.component_order - b.component_order);
      }

      return c.json({ template: createdTemplate });
    } // End of if (!template) block

    // If we reach here, template was found successfully in the initial query
    return c.json({ template });
  } catch (error) {
    console.error("Error fetching component template:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch template";
    return c.json({ error: errorMessage, template: null }, 500);
  }
});

// Initialize default component templates for all asset types
app.post("/make-server-c894a9ff/component-templates/initialize", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Define default component templates for each asset type
    const defaultTemplates = {
      "Gantry": [
        { name: "Structural Support", description: "Gantry posts, beams, and foundations" },
        { name: "Sign Panels", description: "Sign face condition and visibility" },
        { name: "Lighting System", description: "LED panels, reflectivity, illumination" },
        { name: "Mounting Hardware", description: "Bolts, brackets, and fasteners" },
        { name: "Protective Coating", description: "Paint, galvanization, rust prevention" },
        { name: "Foundation", description: "Concrete base and anchoring system" },
      ],
      "Signage": [
        { name: "Foundation", description: "Cracks, erosion, movement, exposed base" },
        { name: "Holding Bolts / Base Plates", description: "Loose, missing, corroded bolts/plates" },
        { name: "Post / Vertical Member", description: "Leaning, bent, corroded, impact damaged posts" },
        { name: "Face / Panel", description: "Fading, damage, peeling, vandalism, unreadable message" },
        { name: "Face Fasteners", description: "Loose, missing, rusted brackets or fixings" },
        { name: "Nearby Vegetation", description: "Grass, bushes, trees blocking or partially obscuring sign" },
      ],
      "Road Sign": [
        { name: "Foundation", description: "Cracks, erosion, movement, exposed base" },
        { name: "Holding Bolts / Base Plates", description: "Loose, missing, corroded bolts/plates" },
        { name: "Post / Vertical Member", description: "Leaning, bent, corroded, impact damaged posts" },
        { name: "Face / Panel", description: "Fading, damage, peeling, vandalism, unreadable message" },
        { name: "Face Fasteners", description: "Loose, missing, rusted brackets or fixings" },
        { name: "Nearby Vegetation", description: "Grass, bushes, trees blocking or partially obscuring sign" },
      ],
      "Traffic Sign": [
        { name: "Foundation", description: "Cracks, erosion, movement, exposed base" },
        { name: "Holding Bolts / Base Plates", description: "Loose, missing, corroded bolts/plates" },
        { name: "Post / Vertical Member", description: "Leaning, bent, corroded, impact damaged posts" },
        { name: "Face / Panel", description: "Fading, damage, peeling, vandalism, unreadable message" },
        { name: "Face Fasteners", description: "Loose, missing, rusted brackets or fixings" },
        { name: "Nearby Vegetation", description: "Grass, bushes, trees blocking or partially obscuring sign" },
      ],
      "Road Signage & Guide Post": [
        { name: "Foundation", description: "Cracks, erosion, movement, exposed base" },
        { name: "Holding Bolts / Base Plates", description: "Loose, missing, corroded bolts/plates" },
        { name: "Post / Vertical Member", description: "Leaning, bent, corroded, impact damaged posts" },
        { name: "Face / Panel", description: "Fading, damage, peeling, vandalism, unreadable message" },
        { name: "Face Fasteners", description: "Loose, missing, rusted brackets or fixings" },
        { name: "Nearby Vegetation", description: "Grass, bushes, trees blocking or partially obscuring sign" },
      ],
      "Guidepost": [
        { name: "Foundation", description: "Cracks, erosion, movement, exposed base" },
        { name: "Holding Bolts / Base Plates", description: "Loose, missing, corroded bolts/plates" },
        { name: "Post / Vertical Member", description: "Leaning, bent, corroded, impact damaged posts" },
        { name: "Reflective Strip / Panel", description: "Fading, damage, peeling, loss of reflectivity" },
        { name: "Face Fasteners", description: "Loose, missing, rusted brackets or fixings" },
        { name: "Nearby Vegetation", description: "Grass, bushes, trees blocking or partially obscuring guidepost" },
      ],
      "Guardrail": [
        { name: "Foundation", description: "Check for exposed footing, erosion, instability, cracking, or sinking foundations at post bases" },
        { name: "Holding Bolts & Base Plates", description: "Check for missing, loose, corroded anchor bolts, dislodged base plates" },
        { name: "Posts / Vertical Members", description: "Look for leaning, bent, missing, rusted, or broken posts" },
        { name: "Face / Rail Panel", description: "Check for dents, bends, impact damage, missing or dislocated panels/sections" },
        { name: "Face Fasteners", description: "Check for missing, loose or rusted bolts/clips joining guardrail segments" },
        { name: "Nearby Vegetation", description: "Check for grass, bush, trees blocking visibility or access to the guardrail" },
      ],
      "Traffic Signal": [
        { name: "Signal Operation (Cycle, Timing, Output)", description: "Check full cycle operation, timing, light output for all heads" },
        { name: "Signal Head Housing (Lenses, Hoods, Casings)", description: "Cracks, faded lenses, broken visors, exposed bulbs" },
        { name: "Pole / Mast Arm", description: "Rust, leaning, cracks, impact or structural damage" },
        { name: "Signal Alignment / Visibility", description: "Misaligned heads or visibility blocked by poles, trees, signs" },
        { name: "Electrical Cabinet / Controller Box", description: "Rust, damage, open doors, exposed wires, vandalism" },
      ],
      "Safety Barrier": [
        { name: "Foundation", description: "Check for repeated signs of exposed footings, if the base is cracked, loose, or showing signs of erosion or instability" },
        { name: "Face", description: "Look for widespread impact damage, cracks, broken edges, surface wear, or graffiti, or missing sections" },
        { name: "Face Fasteners", description: "Loose, missing or rusted bolts, rivets, and joints" },
        { name: "Nearby Vegetation", description: "Look for areas where bushes, trees, or grass are blocking the barrier or restricting view/access" },
        { name: "Steel Railings (Top element)", description: "Look for rust, dents, bending, breaks, disjointed sections or any missing parts" },
        { name: "Railing Fasteners / Joints", description: "Look for sections with multiple missing, loose, rusted or broken fasteners, bolts, clips, welds or connectors" },
      ],
      "Safety Barriers": [
        { name: "Foundation", description: "Check for repeated signs of exposed footings, if the base is cracked, loose, or showing signs of erosion or instability" },
        { name: "Face", description: "Look for widespread impact damage, cracks, broken edges, surface wear, or graffiti, or missing sections" },
        { name: "Face Fasteners", description: "Loose, missing or rusted bolts, rivets, and joints" },
        { name: "Nearby Vegetation", description: "Look for areas where bushes, trees, or grass are blocking the barrier or restricting view/access" },
        { name: "Steel Railings (Top element)", description: "Look for rust, dents, bending, breaks, disjointed sections or any missing parts" },
        { name: "Railing Fasteners / Joints", description: "Look for sections with multiple missing, loose, rusted or broken fasteners, bolts, clips, welds or connectors" },
      ],
      "Fencing": [
        { name: "Foundation", description: "Check for recurring signs of cracks, leaning posts, or unstable footing" },
        { name: "Posts / Vertical Members", description: "Check for multiple posts which are bent, leaning, broken, missing, or rusted" },
        { name: "Fence Face (wire mesh, palisade, panels)", description: "Check for broken holes, mesh/panels, sagging, or large gaps" },
        { name: "Face Fasteners (clips, brackets, ties)", description: "Check if there are connecting bolts, clips, or ties missing or loose in many places" },
        { name: "Nearby Vegetation", description: "Check if sections are blocked, damaged, or hidden by trees, shrubs, or grass" },
      ],
      "Fence": [
        { name: "Foundation", description: "Check for recurring signs of cracks, leaning posts, or unstable footing" },
        { name: "Posts / Vertical Members", description: "Check for multiple posts which are bent, leaning, broken, missing, or rusted" },
        { name: "Fence Face (wire mesh, palisade, panels)", description: "Check for broken holes, mesh/panels, sagging, or large gaps" },
        { name: "Face Fasteners (clips, brackets, ties)", description: "Check if there are connecting bolts, clips, or ties missing or loose in many places" },
        { name: "Nearby Vegetation", description: "Check if sections are blocked, damaged, or hidden by trees, shrubs, or grass" },
      ],
      "Road Marking": [
        { name: "Line / Marking Condition", description: "Check for fading, cracking, missing lines, or loss of retro-reflectivity. Evaluate all types: centreline, edge lines, stop lines, arrows, etc." },
        { name: "Nearby Vegetation", description: "Check for grass, shrubs, or tree shadows obscuring markings. Including growth from road shoulders and medians" },
      ],
      "Road Markings": [
        { name: "Line / Marking Condition", description: "Check for fading, cracking, missing lines, or loss of retro-reflectivity. Evaluate all types: centreline, edge lines, stop lines, arrows, etc." },
        { name: "Nearby Vegetation", description: "Check for grass, shrubs, or tree shadows obscuring markings. Including growth from road shoulders and medians" },
      ],
      "Road Paint Markings": [
        { name: "Line / Marking Condition", description: "Check for fading, cracking, missing lines, or loss of retro-reflectivity. Evaluate all types: centreline, edge lines, stop lines, arrows, etc." },
        { name: "Nearby Vegetation", description: "Check for grass, shrubs, or tree shadows obscuring markings. Including growth from road shoulders and medians" },
      ],
      "Raised Road Markers": [
        { name: "Face (Marker condition)", description: "Inspect Raised Road Markers (RRM) for visibility, physical damage, detachment, fading, or missing reflectors. Includes both centreline and lane markings" },
        { name: "Nearby Vegetation", description: "Look for encroaching grass, debris, or shrubs that cover or obscure RRMs" },
      ],
      "Raised Road Marker": [
        { name: "Face (Marker condition)", description: "Inspect Raised Road Markers (RRM) for visibility, physical damage, detachment, fading, or missing reflectors. Includes both centreline and lane markings" },
        { name: "Nearby Vegetation", description: "Look for encroaching grass, debris, or shrubs that cover or obscure RRMs" },
      ],
    };

    // Get all asset types
    const { data: assetTypes, error: typesError } = await supabase
      .from("asset_types")
      .select("asset_type_id, name");

    if (typesError) {
      console.error("Error fetching asset types:", typesError);
      return c.json({ error: "Failed to fetch asset types" }, 500);
    }

    const createdTemplates = [];
    const errors = [];

    for (const assetType of assetTypes || []) {
      // Check if template already exists
      const { data: existing } = await supabase
        .from("asset_component_templates")
        .select("template_id")
        .eq("asset_type_id", assetType.asset_type_id)
        .eq("is_active", true)
        .single();

      if (existing) {
        console.log(`Template already exists for ${assetType.name}`);
        continue;
      }

      // Get default components for this asset type
      const components = defaultTemplates[assetType.name] || [
        { name: "Component 1", description: "Primary component" },
        { name: "Component 2", description: "Secondary component" },
        { name: "Component 3", description: "Tertiary component" },
      ];

      // Create template - FIXED: removed schema prefix for PostgREST compatibility
      const { data: template, error: templateError } = await supabase
        .from("asset_component_templates")
        .insert({
          asset_type_id: assetType.asset_type_id,
          name: `${assetType.name} Standard Template`,
          description: `Default component inspection template for ${assetType.name}`,
          version: 1,
          is_active: true,
        })
        .select()
        .single();

      if (templateError) {
        console.error(`Error creating template for ${assetType.name}:`, templateError);
        errors.push({ assetType: assetType.name, error: templateError.message });
        continue;
      }

      // Default rubrics
      const defaultDegreeRubric = { "1": "Minor", "2": "Moderate", "3": "Severe", "4": "Critical", "X": "Not present", "U": "Unable to inspect" };
      const defaultExtentRubric = { "1": "< 10%", "2": "10-30%", "3": "30-60%", "4": "> 60%" };
      const defaultRelevancyRubric = { "1": "Low", "2": "Medium", "3": "High", "4": "Critical" };

      // Create template items - Batch insert for better performance
      const itemsToInsert = components.map((component, i) => ({
        template_id: template.template_id,
        component_name: component.name,
        component_order: i + 1,
        what_to_inspect: component.description,
        degree_rubric: defaultDegreeRubric,
        extent_rubric: defaultExtentRubric,
        relevancy_rubric: defaultRelevancyRubric,
        quantity_unit: "EA",
        is_active: true,
      }));

      const { error: itemsError } = await supabase
        .from("asset_component_template_items")
        .insert(itemsToInsert);

      if (itemsError) {
        console.error(`Error creating items for ${assetType.name}:`, itemsError);
        errors.push({ assetType: assetType.name, error: itemsError.message });
        // Clean up the template
        await supabase.from("asset_component_templates").delete().eq("template_id", template.template_id);
        continue;
      }

      createdTemplates.push({
        assetType: assetType.name,
        templateId: template.template_id,
        componentCount: components.length,
      });
    }

    return c.json({
      success: true,
      created: createdTemplates,
      errors: errors.length > 0 ? errors : undefined,
      message: `Initialized ${createdTemplates.length} component templates`,
    });
  } catch (error) {
    console.error("Error initializing templates:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to initialize templates";
    return c.json({ error: errorMessage, success: false }, 500);
  }
});

// Get all component templates (for settings page)
app.get("/make-server-c894a9ff/component-templates", async (c) => {
  try {
    console.log("[Component Templates] Fetching templates, items, and asset types...");
    
    // Fetch templates and items separately, then join manually
    const { data: templates, error: templatesError } = await supabase
      .from("asset_component_templates")
      .select("*")
      .order("asset_type_id");

    if (templatesError) {
      console.error("[Component Templates] Error fetching templates:", JSON.stringify(templatesError, null, 2));
      return c.json({ error: `Failed to fetch templates: ${templatesError.message}` }, 500);
    }
    console.log(`[Component Templates] Fetched ${templates?.length || 0} templates`);

    const { data: items, error: itemsError } = await supabase
      .from("asset_component_template_items")
      .select("*")
      .order("component_order");

    if (itemsError) {
      console.error("[Component Templates] Error fetching template items:", JSON.stringify(itemsError, null, 2));
      return c.json({ error: `Failed to fetch template items: ${itemsError.message}` }, 500);
    }
    console.log(`[Component Templates] Fetched ${items?.length || 0} template items`);

    // Fetch asset types to get names
    const { data: assetTypes, error: assetTypesError } = await supabase
      .from("asset_types")
      .select("asset_type_id, name");

    if (assetTypesError) {
      console.error("[Component Templates] Error fetching asset types:", JSON.stringify(assetTypesError, null, 2));
      return c.json({ error: `Failed to fetch asset types: ${assetTypesError.message}` }, 500);
    }
    console.log(`[Component Templates] Fetched ${assetTypes?.length || 0} asset types`);

    // Create lookup map for asset type names
    const assetTypeMap = new Map(
      (assetTypes || []).map((at: any) => [at.asset_type_id, at.name])
    );

    // Create lookup map for items by template_id
    const itemsMap = new Map<string, any[]>();
    (items || []).forEach((item: any) => {
      if (!itemsMap.has(item.template_id)) {
        itemsMap.set(item.template_id, []);
      }
      itemsMap.get(item.template_id)?.push(item);
    });

    // Transform templates with asset type names and items
    const transformedTemplates = (templates || []).map((t: any) => ({
      ...t,
      asset_type_name: assetTypeMap.get(t.asset_type_id) || "Unknown",
      items: (itemsMap.get(t.template_id) || []).sort((a: any, b: any) => a.component_order - b.component_order),
    }));

    console.log(`[Component Templates] Successfully transformed ${transformedTemplates.length} templates`);
    return c.json({ templates: transformedTemplates });
  } catch (error) {
    console.error("[Component Templates] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch templates";
    const errorStack = error instanceof Error ? error.stack : "";
    console.error("[Component Templates] Stack trace:", errorStack);
    return c.json({ error: `Unexpected error: ${errorMessage}` }, 500);
  }
});

// Update a component template item
app.put("/make-server-c894a9ff/component-templates/:templateId/items/:itemId", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const templateId = c.req.param("templateId");
    const itemId = c.req.param("itemId");
    const updates = await c.req.json();

    console.log(`[Template] Updating item ${itemId} in template ${templateId}`);

    // Only allow updating specific fields
    const allowedFields = {
      component_name: updates.component_name,
      what_to_inspect: updates.what_to_inspect,
      quantity_unit: updates.quantity_unit,
    };

    const { data: updatedItem, error } = await supabase
      .from("asset_component_template_items")
      .update(allowedFields)
      .eq("item_id", itemId)
      .eq("template_id", templateId)
      .select()
      .single();

    if (error) {
      console.error("Error updating template item:", error);
      return c.json({ error: error.message }, 500);
    }

    console.log(`[Template] Successfully updated item ${itemId}`);
    return c.json({ success: true, item: updatedItem });
  } catch (error) {
    console.error("Error updating template item:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update template item";
    return c.json({ error: errorMessage, success: false }, 500);
  }
});

// Add component item to template
app.post("/make-server-c894a9ff/component-templates/:templateId/items", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const templateId = c.req.param("templateId");
    const item = await c.req.json();
    
    console.log(`[Template] Adding component item to template ${templateId}:`, item);

    // Get the current max order for this template
    const { data: existingItems } = await supabase
      .from("asset_component_template_items")
      .select("component_order")
      .eq("template_id", templateId)
      .order("component_order", { ascending: false })
      .limit(1);

    const nextOrder = existingItems && existingItems.length > 0 
      ? (existingItems[0].component_order || 0) + 1 
      : 1;

    // Insert the new component item
    const { data, error } = await supabase
      .from("asset_component_template_items")
      .insert({
        template_id: templateId,
        component_name: item.component_name,
        what_to_inspect: item.what_to_inspect || '',
        quantity_unit: item.quantity_unit || '',
        component_order: item.component_order || nextOrder,
        degree_rubric: item.degree_rubric || {},
        extent_rubric: item.extent_rubric || {},
        relevancy_rubric: item.relevancy_rubric || {},
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding component item:", error);
      return c.json({ error: error.message }, 500);
    }

    console.log(`[Template] Successfully added component item:`, data);
    return c.json({ success: true, item: data });
  } catch (error) {
    console.error("Error adding component item:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to add component";
    return c.json({ error: errorMessage }, 500);
  }
});

// Delete a component template item
app.delete("/make-server-c894a9ff/component-templates/:templateId/items/:itemId", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const templateId = c.req.param("templateId");
    const itemId = c.req.param("itemId");

    console.log(`[Template] Deleting item ${itemId} from template ${templateId}`);

    // Delete the template item
    const { error } = await supabase
      .from("asset_component_template_items")
      .delete()
      .eq("item_id", itemId)
      .eq("template_id", templateId);

    if (error) {
      console.error("Error deleting template item:", error);
      return c.json({ error: error.message }, 500);
    }

    console.log(`[Template] Successfully deleted item ${itemId}`);
    return c.json({ success: true, message: "Component deleted successfully" });
  } catch (error) {
    console.error("Error deleting template item:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to delete template item";
    return c.json({ error: errorMessage, success: false }, 500);
  }
});

// ============================================================================
// INSPECTION COMPONENT SCORING ROUTES (Enhancement 2)
// ============================================================================

// Save component scores for an inspection
app.post("/make-server-c894a9ff/inspections/:inspectionId/component-scores", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const inspectionId = c.req.param("inspectionId");
    const { componentScores, assetType } = await c.req.json();

    // Perform CI/DERU calculations
    const calculation = calculations.performFullCICalculation(
      componentScores,
      assetType
    );

    // Store each component score in database
    for (const score of calculation.componentBreakdown) {
      const { error } = await supabase
        .from("inspection_component_scores")
        .upsert({
          inspection_id: inspectionId,
          component_name: score.componentName,
          degree_value: score.degreeValue,
          extent_value: score.extentValue,
          relevancy_value: score.relevancyValue,
          component_score: score.componentScore,
          quantity: score.quantity,
          quantity_unit: score.quantityUnit,
          rate: score.rate,
          component_cost: score.componentCost,
        });

      if (error) {
        console.error("Error saving component score:", error);
      }
    }

    // Update inspection with calculated values
    const { error: inspectionError } = await supabase
      .from("inspections")
      .update({
        conditional_index: calculation.conditionalIndex,
        ci_band: calculation.ciBand,
        deru_value: calculation.deruValue,
        calculated_urgency: calculation.calculatedUrgency,
        total_remedial_cost: calculation.totalRemedialCost,
        calculation_metadata: calculation.metadata,
      })
      .eq("inspection_id", inspectionId);

    if (inspectionError) {
      console.error("Error updating inspection:", inspectionError);
    }

    return c.json({ 
      success: true, 
      calculation 
    });
  } catch (error) {
    console.error("Error saving component scores:", error);
    return c.json({ error: "Failed to save component scores" }, 500);
  }
});

// Get component scores for an inspection
app.get("/make-server-c894a9ff/inspections/:inspectionId/component-scores", async (c) => {
  try {
    const inspectionId = c.req.param("inspectionId");

    const { data: scores, error } = await supabase
      .from("inspection_component_scores")
      .select("*")
      .eq("inspection_id", inspectionId)
      .order("component_name");

    if (error) {
      console.error("Error fetching component scores:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ scores: scores || [] });
  } catch (error) {
    console.error("Error fetching component scores:", error);
    return c.json({ error: "Failed to fetch component scores" }, 500);
  }
});

// Calculate live CI/DERU preview (no save)
app.post("/make-server-c894a9ff/calculations/preview", async (c) => {
  try {
    const { componentScores, assetType } = await c.req.json();

    const calculation = calculations.performFullCICalculation(
      componentScores,
      assetType
    );

    return c.json({ calculation });
  } catch (error) {
    console.error("Error calculating preview:", error);
    return c.json({ error: "Failed to calculate" }, 500);
  }
});

// ============================================================================
// ENHANCED MAINTENANCE ROUTES
// ============================================================================

// Update existing maintenance GET to include asset details
app.get("/make-server-c894a9ff/maintenance", async (c) => {
  try {
    // Get user context for tenant filtering
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile from Postgres view to retrieve tenant_id and role
    const { data: userProfile, error: profileError } = await supabase
      .from('tams360_user_profiles_v')
      .select('id, tenant_id, role')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !userProfile || !userProfile.tenant_id) {
      return c.json({ error: "User not associated with an organization" }, 403);
    }

    // Check for optional inspection_id filter
    const inspectionId = c.req.query("inspection_id");

    // Query maintenance records from tenant-filtered view
    // The view now includes tenant_id from the assets join
    let query = supabase
      .from("tams360_maintenance_v")
      .select("*")
      .eq("tenant_id", userProfile.tenant_id);
    
    // Apply inspection_id filter if provided
    if (inspectionId) {
      query = query.eq("inspection_id", inspectionId);
    }
    
    const { data: records, error } = await query
      .order("maintenance_id", { ascending: false});

    if (error) {
      console.error("Error fetching maintenance records from DB:", error);
      // Fallback to KV store
      const kvRecords = await kv.getByPrefix("maintenance:");
      return c.json({ records: kvRecords });
    }

    // The tams360_maintenance_v view already includes asset details from the join
    // Transform records to ensure consistent field names
    const transformedRecords = records.map((record: any) => ({
      ...record,
      asset_ref: record.asset_ref || "Unknown",
      asset_number: record.asset_ref || record.asset_number || "Unknown",
      asset_type_name: record.asset_type_name || "Unknown",
      asset_type: record.asset_type_name || record.asset_type || "Unknown",
      asset_type_id: record.asset_type_id || null,
      route_road: record.road_number || record.route_road || "",
      road_name: record.road_name || "",
      chainage_km: record.km_marker || record.chainage_km || "",
    }));

    console.log(`🔧 Returning ${transformedRecords.length} maintenance records`);
    return c.json({ records: transformedRecords });
  } catch (error) {
    console.error("Error fetching maintenance records:", error);
    return c.json({ error: "Failed to fetch maintenance records" }, 500);
  }
});

// DUPLICATE ROUTE - Should be removed or merged
// Update existing maintenance POST to use database
// app.post("/make-server-c894a9ff/maintenance", async (c) => {
//   try {
//     const authHeader = c.req.header("Authorization");
//     if (!authHeader) {
//       return c.json({ error: "Unauthorized" }, 401);
//     }

//     const accessToken = authHeader.split(" ")[1];
//     const { data: userData, error: authError } = await supabaseAuth.auth.getUser(
//       accessToken,
//     );

//     if (authError || !userData.user) {
//       return c.json({ error: "Invalid session" }, 401);
//     }

//     // Get user profile to retrieve tenantId
//     const userProfile = await kv.get(`user:${userData.user.id}`);
//     if (!userProfile || !userProfile.tenantId) {
//       return c.json({ error: "User not associated with an organization" }, 403);
//     }

//     const maintenance = await c.req.json();

//     // Try to insert into database first
//     const { data: record, error } = await supabase
//       .from("maintenance_records")
//       .insert({
//         tenant_id: userProfile.tenantId,
//         asset_id: maintenance.asset_id,
//         maintenance_type: maintenance.maintenance_type,
//         scheduled_date: maintenance.scheduled_date || null,
//         completed_date: maintenance.completed_date || null,
//         status: maintenance.status || "Scheduled",
//         description: maintenance.description,
//         notes: maintenance.notes,
//         estimated_cost: maintenance.cost || null,
//         actual_cost: maintenance.actual_cost || null,
//         created_by: userData.user.id,
//       })
//       .select()
//       .single();

//     if (error) {
//       console.error("Error creating maintenance in DB:", error);
//       // Fallback to KV store
//       const maintenanceId = `maintenance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
//       const maintenanceRecord = {
//         maintenance_id: maintenanceId,
//         tenant_id: userProfile.tenantId,
//         ...maintenance,
//         logged_by: userData.user.id,
//         created_at: new Date().toISOString(),
//       };
//       await kv.set(`maintenance:${maintenanceId}`, maintenanceRecord);
//       return c.json({ success: true, maintenance: maintenanceRecord });
//     }

//     return c.json({ success: true, maintenance: record });
//   } catch (error) {
//     console.error("Error creating maintenance record:", error);
//     return c.json({ error: "Failed to create maintenance record" }, 500);
//   }
// });

// ============================================================================
// ASSET INVENTORY LOG ROUTES
// ============================================================================

// NOTE: Inventory log route is defined earlier at line ~1966 to come before /assets/:id
// This duplicate route has been removed to avoid conflicts

// ============================================================================
// ENHANCED INSPECTION ROUTES
// ============================================================================

// Get component template by asset type name (legacy endpoint - redirects to new endpoint)
app.get("/make-server-c894a9ff/inspections/component-template", async (c) => {
  try {
    const assetTypeName = c.req.query("assetType");
    
    if (!assetTypeName) {
      return c.json({ error: "assetType query parameter required" }, 400);
    }

    // Redirect to the new endpoint logic
    console.log(`[Legacy Endpoint] Redirecting template request for ${assetTypeName} to new endpoint`);
    
    // First get asset type ID
    const { data: assetType, error: typeError } = await supabase
      .from("asset_types")
      .select("asset_type_id")
      .eq("name", assetTypeName)
      .single();

    if (typeError || !assetType) {
      console.log("Asset type not found:", assetTypeName);
      return c.json({ template: null }, 200);
    }

    // Get the template (this will trigger auto-creation if not found)
    const { data: template, error } = await supabase
      .from("asset_component_templates")
      .select(`
        *,
        items:asset_component_template_items(*)
      `)
      .eq("asset_type_id", assetType.asset_type_id)
      .eq("is_active", true)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error("Error fetching template:", error);
      
      // Auto-create template if not found
      console.log(`[Template] No template found for ${assetTypeName}, attempting auto-initialization...`);
      
      const defaultTemplates: Record<string, Array<{ name: string; description: string }>> = {
        "Gantry": [
          { name: "Structural Support", description: "Gantry posts, beams, and foundations" },
          { name: "Sign Panels", description: "Sign face condition and visibility" },
          { name: "Lighting System", description: "LED panels, reflectivity, illumination" },
          { name: "Mounting Hardware", description: "Bolts, brackets, and fasteners" },
          { name: "Protective Coating", description: "Paint, galvanization, rust prevention" },
          { name: "Foundation", description: "Concrete base and anchoring system" },
        ],
        "Traffic Sign": [
          { name: "Sign Face", description: "Reflectivity, text clarity, delamination" },
          { name: "Sign Post", description: "Post integrity, straightness, corrosion" },
          { name: "Mounting Hardware", description: "Bolts, clamps, and brackets" },
          { name: "Foundation", description: "Post base and concrete footing" },
          { name: "Reflective Coating", description: "Retroreflectivity measurements" },
        ],
        "Guardrail": [
          { name: "Rail Element", description: "W-beam or thrie-beam condition" },
          { name: "Posts", description: "Post integrity and alignment" },
          { name: "Terminal End", description: "End treatment and anchor system" },
          { name: "Blockouts/Spacers", description: "Connection hardware condition" },
          { name: "Anchoring", description: "Soil blockouts and foundation" },
          { name: "Drainage", description: "Water accumulation and rust" },
        ],
        "Traffic Signal": [
          { name: "Signal Head", description: "LED modules, lenses, visibility" },
          { name: "Controller Cabinet", description: "Equipment housing and electrical" },
          { name: "Pole/Mast Arm", description: "Structural support integrity" },
          { name: "Detection System", description: "Loop detectors, cameras, sensors" },
          { name: "Wiring/Conduit", description: "Electrical connections" },
          { name: "Power Supply", description: "UPS and electrical service" },
        ],
        "Safety Barrier": [
          { name: "Barrier Face", description: "Concrete surface condition" },
          { name: "Joints", description: "Joint condition and water intrusion" },
          { name: "Anchoring", description: "Foundation and stability" },
          { name: "Drainage", description: "Weep holes and water management" },
          { name: "Reflectors/Delineators", description: "Visibility markers" },
        ],
        "Road Marking": [
          { name: "Paint/Thermoplastic", description: "Material condition and adhesion" },
          { name: "Retroreflectivity", description: "Night visibility measurements" },
          { name: "Line Width/Thickness", description: "Dimensional compliance" },
          { name: "Surface Preparation", description: "Substrate condition" },
        ],
      };

      const components = defaultTemplates[assetTypeName] || [
        { name: "Component 1", description: "Primary component" },
        { name: "Component 2", description: "Secondary component" },
        { name: "Component 3", description: "Tertiary component" },
      ];

      // Create the template - FIXED: removed schema prefix for PostgREST compatibility
      const { data: newTemplate, error: createError } = await supabase
        .from("asset_component_templates")
        .insert({
          asset_type_id: assetType.asset_type_id,
          name: `${assetTypeName} Standard Template`,
          description: `Auto-generated component inspection template for ${assetTypeName}`,
          version: 1,
          is_active: true,
        })
        .select()
        .single();

      if (createError) {
        console.error(`Error auto-creating template for ${assetTypeName}:`, JSON.stringify(createError, null, 2));
        console.error(`Error details - message:`, createError.message);
        console.error(`Error details - code:`, createError.code);
        console.error(`Error details - details:`, createError.details);
        console.error(`Error details - hint:`, createError.hint);
        return c.json({ template: null }, 200);
      }

      // Default rubrics
      const defaultDegreeRubric = { "1": "Minor", "2": "Moderate", "3": "Severe", "4": "Critical", "X": "Not present", "U": "Unable to inspect" };
      const defaultExtentRubric = { "1": "< 10%", "2": "10-30%", "3": "30-60%", "4": "> 60%" };
      const defaultRelevancyRubric = { "1": "Low", "2": "Medium", "3": "High", "4": "Critical" };

      // Create template items - FIXED: removed schema prefix for PostgREST compatibility
      for (let i = 0; i < components.length; i++) {
        const component = components[i];
        await supabase
          .from("asset_component_template_items")
          .insert({
            template_id: newTemplate.template_id,
            component_name: component.name,
            component_order: i + 1,
            what_to_inspect: component.description,
            degree_rubric: defaultDegreeRubric,
            extent_rubric: defaultExtentRubric,
            relevancy_rubric: defaultRelevancyRubric,
            quantity_unit: "EA",
            is_active: true,
          });
      }

      console.log(`[Template] Auto-created template for ${assetTypeName} with ${components.length} components`);

      // Fetch the newly created template with items
      const { data: createdTemplate, error: fetchError } = await supabase
        .from("asset_component_templates")
        .select(`
          *,
          items:asset_component_template_items(*)
        `)
        .eq("template_id", newTemplate.template_id)
        .single();

      if (fetchError) {
        console.error("Error fetching newly created template:", fetchError);
        return c.json({ template: null }, 200);
      }

      // Sort items by component_order
      if (createdTemplate?.items) {
        createdTemplate.items.sort((a: any, b: any) => a.component_order - b.component_order);
      }

      return c.json({ template: createdTemplate });
    }

    // Sort items by component_order
    if (template?.items) {
      template.items.sort((a: any, b: any) => a.component_order - b.component_order);
    }

    return c.json({ template });
  } catch (error) {
    console.error("Error fetching component template:", error);
    return c.json({ error: "Failed to fetch template" }, 500);
  }
});

// Create inspection with component scores
app.post("/make-server-c894a9ff/inspections", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(
      accessToken,
    );

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile to retrieve tenantId
    const userProfile = await kv.get(`user:${userData.user.id}`);
    if (!userProfile || !userProfile.tenantId) {
      return c.json({ error: "User not associated with an organization" }, 403);
    }

    // Check if tenant ID is in UUID format (database requirement)
    if (!isValidUuid(userProfile.tenantId)) {
      console.error(`Invalid tenant ID format (not UUID): ${userProfile.tenantId}`);
      return c.json({ 
        error: "Organization data format is outdated. Cannot create inspections with old tenant format.",
        details: "Tenant ID must be in UUID format for database operations.",
        action_required: "recreate_organization"
      }, 400);
    }

    const inspection = await c.req.json();

    // Prepare calculation metadata
    const ci_value = inspection.ci || inspection.ci_final || inspection.conditional_index;
    const calculationMetadata = {
      ci_health: inspection.conditional_index,
      ci_safety: inspection.ci_safety,
      ci_final: ci_value,
      degree: inspection.degree,
      extent: inspection.extent,
      relevancy: inspection.relevancy,
      worst_urgency: inspection.calculated_urgency,
      component_count: inspection.component_scores?.length || 0,
    };

    // Determine CI band
    const ciBand = ci_value
      ? ci_value >= 75
        ? "Excellent"
        : ci_value >= 50
        ? "Good"
        : ci_value >= 25
        ? "Fair"
        : "Poor"
      : null;

    // Insert inspection record
    const { data: inspectionRecord, error: inspectionError } = await supabase
      .from("inspections")
      .insert({
        tenant_id: userProfile.tenantId,
        asset_id: inspection.asset_id,
        inspection_date: inspection.inspection_date,
        inspector_name: inspection.inspector_name,
        weather_conditions: inspection.weather_conditions,
        conditional_index: ci_value,
        deru_value: null, // Can be calculated later if needed
        calculated_urgency: inspection.calculated_urgency,
        total_remedial_cost: inspection.total_remedial_cost || 0,
        ci_band: ciBand,
        calculation_metadata: calculationMetadata,
        inspector_id: userData.user.id,
      })
      .select()
      .single();

    if (inspectionError) {
      console.error("Error creating inspection:", inspectionError);
      // Fallback to KV
      const inspectionId = `inspection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const record = {
        inspection_id: inspectionId,
        tenant_id: userProfile.tenantId,
        ...inspection,
        inspector_id: userData.user.id,
        created_at: new Date().toISOString(),
      };
      await kv.set(`inspection:${inspectionId}`, record);
      return c.json({ success: true, inspection: record });
    }

    // Insert component scores
    if (inspection.component_scores && inspection.component_scores.length > 0) {
      const componentScores = inspection.component_scores.map((score: any) => ({
        inspection_id: inspectionRecord.inspection_id,
        component_name: score.component_name,
        degree: score.degree,
        extent: score.extent,
        relevancy: score.relevancy,
        urgency: score.urgency,
        conditional_index: score.conditional_index,
        quantity: score.quantity,
        unit: score.unit,
        remedial_work: score.remedial_work,
        rate: score.rate,
        cost: score.cost,
        comments: score.comments,
        photo_url: score.photo_url,
      }));

      const { error: scoresError } = await supabase
        .from("inspection_component_scores")
        .insert(componentScores);

      if (scoresError) {
        console.error("Error inserting component scores:", scoresError);
      }
    }

    // ============================================================================
    // EMAIL NOTIFICATION: Send inspection alert if critical
    // ============================================================================
    try {
      const { data: tenantData } = await supabase
        .from("tenant_settings")
        .select("organization_name, notification_emails, auto_notify_on_critical")
        .eq("tenant_id", userProfile.tenantId)
        .single();
      
      const autoNotifyOnCritical = tenantData?.auto_notify_on_critical !== false;
      const notificationEmails = tenantData?.notification_emails || [];
      
      if (autoNotifyOnCritical && notificationEmails.length > 0) {
        const isCriticalInspection = 
          (ci_value && ci_value < 50) || 
          (inspection.calculated_urgency && ["Critical", "High"].includes(inspection.calculated_urgency));
        
        if (isCriticalInspection) {
          console.log(`[Email Notification] Sending critical inspection alerts (CI: ${ci_value}, Urgency: ${inspection.calculated_urgency})`);
          
          const { data: asset } = await supabase
            .from("tams360_assets_v")
            .select("asset_ref, asset_type_name")
            .eq("asset_id", inspection.asset_id)
            .single();
          
          for (const email of notificationEmails) {
            await emailService.sendInspectionAlert(email, {
              assetRef: asset?.asset_ref || "Unknown",
              assetType: asset?.asset_type_name || "Unknown",
              inspectionDate: new Date(inspection.inspection_date).toLocaleDateString('en-ZA'),
              ci: ci_value || 0,
              urgency: inspection.calculated_urgency || "Unknown",
              inspectorName: inspection.inspector_name || "Unknown",
              organizationName: tenantData?.organization_name || "TAMS360",
              dashboardUrl: "https://app.tams360.co.za",
            });
          }
          console.log(`[Email Notification] ✅ Sent ${notificationEmails.length} inspection alert emails`);
        }
      }
    } catch (emailError) {
      console.error("[Email Notification] Error sending inspection alert:", emailError);
    }

    // ============================================================================
    // WORKFLOW AUTOMATION: Auto-create maintenance based on CI score
    // ============================================================================
    try {
      // Check if automation is enabled for this tenant
      const { data: tenantSettings } = await supabase
        .from("tenant_settings")
        .select("automation_rules")
        .eq("tenant_id", userProfile.tenantId)
        .single();

      const automationRules = tenantSettings?.automation_rules || {};
      const enableAutoMaintenance = automationRules.enable_auto_maintenance !== false; // Enabled by default

      if (enableAutoMaintenance) {
        const ciThreshold = automationRules.ci_threshold || 50; // Default: CI < 50 triggers maintenance
        const urgencyThreshold = automationRules.urgency_threshold || "Medium"; // Default: Medium or higher

        console.log(`[Workflow Automation] Checking CI: ${ci_value} against threshold: ${ciThreshold}`);
        console.log(`[Workflow Automation] Checking Urgency: ${inspection.calculated_urgency} against threshold: ${urgencyThreshold}`);

        // Determine if maintenance should be auto-created
        const shouldCreateMaintenance = 
          (ci_value && ci_value < ciThreshold) ||
          (inspection.calculated_urgency && 
           ["Critical", "High", "Medium"].indexOf(inspection.calculated_urgency) >= 
           ["Critical", "High", "Medium"].indexOf(urgencyThreshold));

        if (shouldCreateMaintenance) {
          console.log(`[Workflow Automation] Triggering auto-maintenance creation for asset ${inspection.asset_id}`);

          // Determine maintenance priority based on CI and urgency
          let priority = "Medium";
          if (ci_value < 25 || inspection.calculated_urgency === "Critical") {
            priority = "Critical";
          } else if (ci_value < 40 || inspection.calculated_urgency === "High") {
            priority = "High";
          }

          // Determine maintenance type based on urgency
          let maintenanceType = "Preventive";
          if (inspection.calculated_urgency === "Critical" || inspection.calculated_urgency === "High") {
            maintenanceType = "Corrective";
          }

          // Calculate scheduled date (immediate for critical, 7 days for high, 30 days for medium)
          const now = new Date();
          let scheduledDate = new Date(now);
          if (priority === "Critical") {
            // Immediate
            scheduledDate = now;
          } else if (priority === "High") {
            scheduledDate.setDate(now.getDate() + 7);
          } else {
            scheduledDate.setDate(now.getDate() + 30);
          }

          // Create maintenance work order
          const { data: maintenanceRecord, error: maintenanceError } = await supabase
            .from("maintenance")
            .insert({
              tenant_id: userProfile.tenantId,
              asset_id: inspection.asset_id,
              inspection_id: inspectionRecord.inspection_id,
              maintenance_type: maintenanceType,
              description: `Auto-generated from inspection (CI: ${ci_value?.toFixed(1) || 'N/A'}, Urgency: ${inspection.calculated_urgency || 'N/A'})`,
              scheduled_date: scheduledDate.toISOString(),
              priority: priority,
              status: "Scheduled",
              estimated_cost: inspection.total_remedial_cost || 0,
              created_by: userData.user.id,
              auto_generated: true,
            })
            .select()
            .single();

          if (maintenanceError) {
            console.error("[Workflow Automation] Error creating maintenance:", maintenanceError);
          } else {
            console.log(`[Workflow Automation] ✅ Created maintenance work order: ${maintenanceRecord.maintenance_id}`);
            
            // Send email notification about the auto-created maintenance
            try {
              const { data: asset } = await supabase
                .from("tams360_assets_v")
                .select("asset_ref, asset_type_name")
                .eq("asset_id", inspection.asset_id)
                .single();
              
              const { data: tenantData } = await supabase
                .from("tenant_settings")
                .select("organization_name, notification_emails")
                .eq("tenant_id", userProfile.tenantId)
                .single();
              
              const notificationEmails = tenantData?.notification_emails || [];
              
              if (notificationEmails.length > 0) {
                for (const email of notificationEmails) {
                  await emailService.sendMaintenanceCreatedNotification(email, {
                    assetRef: asset?.asset_ref || "Unknown",
                    assetType: asset?.asset_type_name || "Unknown",
                    maintenanceType,
                    scheduledDate: scheduledDate.toISOString(),
                    priority,
                    status: "Scheduled",
                    organizationName: tenantData?.organization_name || "TAMS360",
                    dashboardUrl: "https://app.tams360.co.za",
                  });
                }
                console.log(`[Email Notification] ✅ Sent ${notificationEmails.length} maintenance creation notifications`);
              }
            } catch (emailError) {
              console.error("[Email Notification] Error sending maintenance notification:", emailError);
            }
          }
        } else {
          console.log(`[Workflow Automation] No maintenance needed (CI: ${ci_value}, Urgency: ${inspection.calculated_urgency})`);
        }
      }
    } catch (automationError) {
      // Don't fail the inspection creation if automation fails
      console.error("[Workflow Automation] Error in automation logic:", automationError);
    }

    return c.json({ success: true, inspection: inspectionRecord });
  } catch (error) {
    console.error("Error creating inspection:", error);
    return c.json({ error: "Failed to create inspection" }, 500);
  }
});

// Get inspections with pagination
app.get("/make-server-c894a9ff/inspections", async (c) => {
  try {
    // Get user context for tenant filtering
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile from Postgres view to retrieve tenant_id and role
    const { data: userProfile, error: profileError } = await supabase
      .from('tams360_user_profiles_v')
      .select('id, tenant_id, role')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !userProfile || !userProfile.tenant_id) {
      return c.json({ error: "User not associated with an organization" }, 403);
    }

    const page = parseInt(c.req.query("page") || "1");
    const pageSize = parseInt(c.req.query("pageSize") || "500");
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Use public app view (tams360_inspections_v) with tenant filtering
    const { data: inspections, error, count } = await supabase
      .from("tams360_inspections_v")
      .select("*", { count: 'exact' })
      .eq("tenant_id", userProfile.tenant_id)
      .order("inspection_date", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error fetching inspections from app view:", error);
      // Fallback
      const kvInspections = await kv.getByPrefix("inspection:");
      return c.json({ inspections: kvInspections, total: kvInspections.length });
    }

    console.log(`Fetched ${inspections?.length || 0} inspections (page ${page}) out of ${count || 0} total`);
    // The app view already has ci, ci_health, ci_safety as computed columns
    return c.json({ 
      inspections: inspections || [], 
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    });
  } catch (error) {
    console.error("Error fetching inspections:", error);
    return c.json({ error: "Failed to fetch inspections" }, 500);
  }
});

// Get inspections count only (lightweight)
app.get("/make-server-c894a9ff/inspections/count", async (c) => {
  try {
    // Get user context for tenant filtering
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile from Postgres view to retrieve tenant_id
    const { data: userProfile, error: profileError } = await supabase
      .from('tams360_user_profiles_v')
      .select('id, tenant_id, role')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !userProfile || !userProfile.tenant_id) {
      return c.json({ error: "User not associated with an organization" }, 403);
    }

    const { count, error } = await supabase
      .from("tams360_inspections_v")
      .select("inspection_id", { count: 'exact', head: true })
      .eq("tenant_id", userProfile.tenant_id);

    if (error) {
      console.error("Error counting inspections:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ count: count || 0 });
  } catch (error) {
    console.error("Error counting inspections:", error);
    return c.json({ error: "Failed to count inspections" }, 500);
  }
});

// Get inspection statistics
app.get("/make-server-c894a9ff/inspections/stats", async (c) => {
  try {
    // Get user context for tenant filtering
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile from Postgres view to retrieve tenant_id
    const { data: userProfile, error: profileError } = await supabase
      .from('tams360_user_profiles_v')
      .select('id, tenant_id, role')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !userProfile || !userProfile.tenant_id) {
      return c.json({ error: "User not associated with an organization" }, 403);
    }

    // Use public app view with reasonable limit and tenant filtering
    const { data: inspections, error } = await supabase
      .from("tams360_inspections_v")
      .select("inspection_id, inspection_date, conditional_index, calculated_urgency")
      .eq("tenant_id", userProfile.tenant_id)
      .limit(25000);

    if (error) {
      console.error("Error fetching inspection stats:", error);
      // Fallback
      const kvInspections = await kv.getByPrefix("inspection:");
      const stats = {
        total: kvInspections.length,
        thisMonth: 0,
        criticalUrgency: 0,
        avgCI: null,
      };
      return c.json({ stats });
    }

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      total: inspections.length,
      thisMonth: inspections.filter(
        (i: any) => new Date(i.inspection_date) >= thisMonthStart
      ).length,
      criticalUrgency: inspections.filter((i: any) => 
        i.calculated_urgency === "Immediate" || i.calculated_urgency === "4"
      ).length,
      avgCI:
        inspections.filter((i: any) => i.conditional_index !== null).length > 0
          ? inspections
              .filter((i: any) => i.conditional_index !== null)
              .reduce((sum: number, i: any) => sum + (i.conditional_index || 0), 0) /
            inspections.filter((i: any) => i.conditional_index !== null).length
          : null,
    };

    return c.json({ stats });
  } catch (error) {
    console.error("Error calculating inspection stats:", error);
    return c.json({ error: "Failed to calculate stats" }, 500);
  }
});

// Get single inspection by ID (Detail page)
app.get("/make-server-c894a9ff/inspections/:id", async (c) => {
  try {
    const inspectionId = c.req.param("id");

    // Fetch inspection header from public app view
    const { data: inspection, error } = await supabase
      .from("tams360_inspections_v")
      .select("*")
      .eq("inspection_id", inspectionId)
      .single();

    if (error) {
      console.error("Error fetching inspection:", error);
      // Fallback to KV
      const kvInspection = await kv.get(`inspection:${inspectionId}`);
      if (!kvInspection) {
        return c.json({ error: "Inspection not found" }, 404);
      }
      return c.json({ inspection: kvInspection });
    }

    // Fetch component details from public view (includes template data)
    const { data: components, error: compError } = await supabase
      .from("tams360_inspection_components_app")
      .select("*")
      .eq("inspection_id", inspectionId)
      .order("component_order", { ascending: true });

    if (compError) {
      console.warn("Error fetching components from app view:", compError);
    }

    // Fetch asset info to get asset type for template lookup
    const { data: asset, error: assetError } = await supabase
      .from("tams360_assets_v")
      .select("asset_type_name, asset_type_id")
      .eq("asset_id", inspection.asset_id)
      .single();

    // Fetch component template items for rubric info
    let templateItems: any[] = [];
    if (asset?.asset_type_id) {
      const { data: template, error: templateError } = await supabase
        .from("asset_component_templates")
        .select(`
          template_id,
          asset_component_template_items (
            component_name,
            component_order,
            what_to_inspect,
            degree_rubric,
            extent_rubric,
            relevancy_rubric
          )
        `)
        .eq("asset_type_id", asset.asset_type_id)
        .eq("is_active", true)
        .single();

      if (!templateError && template) {
        templateItems = template.asset_component_template_items || [];
      }
    }

    // Map fields for frontend compatibility with template enrichment
    const mappedComponents = (components || []).map((comp: any) => {
      // Find matching template item for this component
      const templateItem = templateItems.find(
        (item: any) => item.component_name === comp.component_name
      );

      return {
        component_order: comp.component_order,
        component_name: comp.component_name,
        what_to_inspect: templateItem?.what_to_inspect || '',
        degree_value: comp.degree_value,
        extent_value: comp.extent_value,
        relevancy_value: comp.relevancy_value,
        degree_rubric: templateItem?.degree_rubric || {},
        extent_rubric: templateItem?.extent_rubric || {},
        relevancy_rubric: templateItem?.relevancy_rubric || {},
        ci_component: comp.ci_component,
        urgency_token: comp.urgency_token,
        component_urgency: comp.component_urgency,
        quantity: comp.quantity,
        quantity_unit: comp.quantity_unit,
        rate: comp.rate,
        component_cost: comp.component_cost,
        component_notes: comp.component_notes,
        photo_url: comp.photo_url,
        remedial_work_description: comp.remedial_work_description,
      };
    });

    const mappedInspection = {
      ...inspection,
      // App view already has ci, ci_health, ci_safety as computed columns
      components: mappedComponents,
      asset_type_name: asset?.asset_type_name || inspection.asset_type_name
    };

    // Attach components to inspection object
    return c.json({ 
      inspection: mappedInspection
    });
  } catch (error) {
    console.error("Error fetching inspection:", error);
    return c.json({ error: "Failed to fetch inspection" }, 500);
  }
});

// Update inspection
app.put("/make-server-c894a9ff/inspections/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(
      accessToken,
    );

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    const inspectionId = c.req.param("id");
    const inspection = await c.req.json();

    // Prepare calculation metadata
    const calculationMetadata = {
      ci_health: inspection.conditional_index,
      ci_safety: inspection.ci_safety,
      ci_final: inspection.ci || inspection.ci_final || inspection.conditional_index,
      degree: inspection.degree,
      extent: inspection.extent,
      relevancy: inspection.relevancy,
      worst_urgency: inspection.calculated_urgency,
      component_count: inspection.component_scores?.length || 0,
    };

    // Determine CI band
    const ciValue = inspection.ci || inspection.ci_final || inspection.conditional_index;
    const ciBand = ciValue
      ? ciValue >= 75
        ? "Excellent"
        : ciValue >= 50
        ? "Good"
        : ciValue >= 25
        ? "Fair"
        : "Poor"
      : null;

    // Update inspection record
    const { data: inspectionRecord, error: inspectionError } = await supabase
      .from("inspections")
      .update({
        asset_id: inspection.asset_id,
        inspection_date: inspection.inspection_date,
        inspector_name: inspection.inspector_name,
        weather_conditions: inspection.weather_conditions,
        conditional_index: ciValue,
        calculated_urgency: inspection.calculated_urgency,
        total_remedial_cost: inspection.total_remedial_cost || 0,
        ci_band: ciBand,
        calculation_metadata: calculationMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("inspection_id", inspectionId)
      .select()
      .single();

    if (inspectionError) {
      console.error("Error updating inspection:", inspectionError);
      return c.json({ error: `Failed to update inspection: ${inspectionError.message}` }, 500);
    }

    // Delete existing component scores
    const { error: deleteError } = await supabase
      .from("inspection_component_scores")
      .delete()
      .eq("inspection_id", inspectionId);

    if (deleteError) {
      console.error("Error deleting old component scores:", deleteError);
    }

    // Insert updated component scores
    if (inspection.component_scores && inspection.component_scores.length > 0) {
      const componentScores = inspection.component_scores.map((score: any) => ({
        inspection_id: inspectionId,
        component_name: score.component_name,
        degree_value: score.degree_value || score.degree,
        extent_value: score.extent_value || score.extent,
        relevancy_value: score.relevancy_value || score.relevancy,
        urgency_token: score.urgency_token || score.urgency,
        component_score: score.component_score || score.conditional_index || score.ci,
        quantity: score.quantity,
        quantity_unit: score.quantity_unit || score.unit,
        remedial_work_description: score.remedial_work_description || score.remedial_work,
        rate: score.rate,
        component_cost: score.component_cost || score.cost,
        component_notes: score.component_notes || score.comments,
        photo_url: score.photo_url,
      }));

      const { error: scoresError } = await supabase
        .from("inspection_component_scores")
        .insert(componentScores);

      if (scoresError) {
        console.error("Error inserting updated component scores:", scoresError);
        return c.json({ error: `Failed to update component scores: ${scoresError.message}` }, 500);
      }
    }

    return c.json({ success: true, inspection: inspectionRecord });
  } catch (error) {
    console.error("Error updating inspection:", error);
    return c.json({ error: "Failed to update inspection" }, 500);
  }
});

// Delete inspection
app.delete("/make-server-c894a9ff/inspections/:id", async (c) => {
  try {
    const inspectionId = c.req.param("id");

    // Delete component scores first (foreign key constraint)
    const { error: componentError } = await supabase
      .from("inspection_component_scores")
      .delete()
      .eq("inspection_id", inspectionId);

    if (componentError) {
      console.error("Error deleting component scores:", componentError);
    }

    // Delete inspection
    const { error } = await supabase
      .from("inspections")
      .delete()
      .eq("inspection_id", inspectionId);

    if (error) {
      console.error("Error deleting inspection:", error);
      return c.json({ error: `Failed to delete inspection: ${error.message}` }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting inspection:", error);
    return c.json({ error: "Failed to delete inspection" }, 500);
  }
});

// ============================================================================
// DASHBOARD ANALYTICS ROUTES
// ============================================================================

// Get CI distribution
app.get("/make-server-c894a9ff/dashboard/ci-distribution", async (c) => {
  try {
    // Get user context for tenant filtering
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile from Postgres view to retrieve tenant_id
    const { data: userProfile, error: profileError } = await supabase
      .from('tams360_user_profiles_v')
      .select('id, tenant_id, role')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !userProfile || !userProfile.tenant_id) {
      return c.json({ error: "User not associated with an organization" }, 403);
    }

    // Calculate distribution directly from inspections app view (tenant-filtered)
    // The tams360_ci_distribution_v view doesn't have tenant_id, so we build it ourselves
    {
      // Calculate distribution from inspections app view with reasonable limit
      const { data: inspections, error: inspError } = await supabase
        .from("tams360_inspections_v")
        .select("ci_band, conditional_index")
        .eq("tenant_id", userProfile.tenant_id)
        .limit(25000);
      
      if (inspError) {
        console.error("Error fetching inspections for CI distribution:", inspError);
        return c.json({ distribution: [] });
      }

      // Group by CI band
      const bandCounts: { [key: string]: number } = {};
      (inspections || []).forEach((insp: any) => {
        const band = insp.ci_band || "Unknown";
        bandCounts[band] = (bandCounts[band] || 0) + 1;
      });

      const distribution = Object.entries(bandCounts).map(([name, count]) => ({
        ci_band: name,
        name: name,
        asset_count: count,
        value: count,
        count: count,
      }));
      
      console.log(`Returning ${distribution.length} CI distribution bands (tenant-filtered)`);
      return c.json({ distribution });
    }
  } catch (error) {
    console.error("Error fetching CI distribution:", error);
    return c.json({ distribution: [] });
  }
});

// Get CI distribution treemap data (grouped by asset type and CI band)
app.get("/make-server-c894a9ff/dashboard/ci-treemap", async (c) => {
  try {
    // Get user context for tenant filtering
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile from Postgres view to retrieve tenant_id
    const { data: userProfile, error: profileError } = await supabase
      .from('tams360_user_profiles_v')
      .select('id, tenant_id, role')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !userProfile || !userProfile.tenant_id) {
      return c.json({ error: "User not associated with an organization" }, 403);
    }

    // Fetch latest inspections with CI data - reduced limit for performance
    const { data: inspections, error } = await supabase
      .from("tams360_inspections_v")
      .select("asset_type_name, conditional_index, asset_id, inspection_date, tenant_id")
      .eq("tenant_id", userProfile.tenant_id)
      .not("conditional_index", "is", null)
      .order("inspection_date", { ascending: false })
      .limit(10000);

    if (error) {
      console.error("Error fetching inspections for treemap:", error);
      return c.json({ treemapData: [] });
    }

    console.log(`Fetched ${inspections?.length || 0} inspections for treemap`);

    // Helper function to calculate CI band from conditional index
    const getCIBand = (ci: number): string => {
      if (ci >= 85) return "Excellent";
      if (ci >= 70) return "Good";
      if (ci >= 55) return "Fair";
      if (ci >= 40) return "Poor";
      return "Critical";
    };

    // Get the latest inspection per asset
    const latestPerAsset = new Map<string, any>();
    (inspections || []).forEach((insp: any) => {
      if (!latestPerAsset.has(insp.asset_id)) {
        latestPerAsset.set(insp.asset_id, insp);
      }
    });

    console.log(`Processing ${latestPerAsset.size} unique assets`);

    // Group by asset_type and ci_band
    const grouped: { [key: string]: { [key: string]: number } } = {};
    
    latestPerAsset.forEach((insp: any) => {
      const assetType = insp.asset_type_name || "Unknown Type";
      const ci = Number(insp.conditional_index);
      const ciBand = isNaN(ci) ? "Unknown" : getCIBand(ci);
      
      if (!grouped[assetType]) {
        grouped[assetType] = {};
      }
      
      if (!grouped[assetType][ciBand]) {
        grouped[assetType][ciBand] = 0;
      }
      
      grouped[assetType][ciBand]++;
    });

    // Convert to treemap structure: parent nodes are asset types, children are CI bands
    const treemapData = Object.entries(grouped).map(([assetType, ciBands]) => {
      const children = Object.entries(ciBands).map(([ciBand, count]) => ({
        name: ciBand,
        size: count,
        ci_band: ciBand,
      }));

      return {
        name: assetType,
        children: children,
      };
    });

    console.log(`Returning treemap data with ${treemapData.length} asset types, ${latestPerAsset.size} total assets`);
    
    // Send response with explicit headers to prevent timeout
    return c.json({ treemapData }, 200, {
      'Cache-Control': 'public, max-age=300',
      'Content-Type': 'application/json',
    });
  } catch (error) {
    console.error("Error fetching CI treemap data:", error);
    return c.json({ treemapData: [] }, 500);
  }
});

// Get urgency summary
app.get("/make-server-c894a9ff/dashboard/urgency-summary", async (c) => {
  try {
    // Get user context for tenant filtering
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile from Postgres view to retrieve tenant_id
    const { data: userProfile, error: profileError } = await supabase
      .from('tams360_user_profiles_v')
      .select('id, tenant_id, role')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !userProfile || !userProfile.tenant_id) {
      return c.json({ error: "User not associated with an organization" }, 403);
    }

    // Use inspections app view directly (tenant-filtered) instead of urgency summary view
    const { data: inspections } = await supabase
      .from("tams360_inspections_v")
      .select("calculated_urgency, conditional_index")
      .eq("tenant_id", userProfile.tenant_id);
    
    const urgencyGroups = (inspections || []).reduce((acc: any, insp: any) => {
      const urgency = insp.calculated_urgency || "Low";
      if (!acc[urgency]) {
        acc[urgency] = { calculated_urgency: urgency, inspection_count: 0, asset_count: 0 };
      }
      acc[urgency].inspection_count++;
      return acc;
    }, {});
    
    const summary = Object.values(urgencyGroups).sort((a: any, b: any) => {
      const urgencyOrder: any = { "Immediate": 4, "High": 3, "Medium": 2, "Low": 1 };
      return (urgencyOrder[b.calculated_urgency] || 0) - (urgencyOrder[a.calculated_urgency] || 0);
    });

    return c.json({ summary });
  } catch (error) {
    console.error("Error fetching urgency summary:", error);
    return c.json({ summary: [] });
  }
});

// Get asset type summary
app.get("/make-server-c894a9ff/dashboard/asset-type-summary", async (c) => {
  try {
    // Get user context for tenant filtering
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile from Postgres view to retrieve tenant_id
    const { data: userProfile, error: profileError } = await supabase
      .from('tams360_user_profiles_v')
      .select('id, tenant_id, role')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !userProfile || !userProfile.tenant_id) {
      return c.json({ error: "User not associated with an organization" }, 403);
    }

    const { data: summary, error } = await supabase
      .from("tams360_asset_type_summary_v")
      .select("*")
      .eq("tenant_id", userProfile.tenant_id)
      .order("asset_count", { ascending: false });

    if (error) {
      console.error("Error fetching asset type summary:", error);
      console.log("View tams360_asset_type_summary_v may not exist. Run database-views-migration.sql to create it.");
      
      // Fallback: Group from assets view with tenant filtering
      const { data: assets } = await supabase
        .from("tams360_assets_v")
        .select("asset_type_name")
        .eq("tenant_id", userProfile.tenant_id);
      
      const typeGroups = (assets || []).reduce((acc: any, asset: any) => {
        const typeName = asset.asset_type_name || "Unknown";
        if (!acc[typeName]) {
          acc[typeName] = { asset_type_name: typeName, asset_count: 0 };
        }
        acc[typeName].asset_count++;
        return acc;
      }, {});
      
      const fallbackSummary = Object.values(typeGroups).sort((a: any, b: any) => 
        b.asset_count - a.asset_count
      );
      
      return c.json({ summary: fallbackSummary });
    }

    return c.json({ summary });
  } catch (error) {
    console.error("Error fetching asset type summary:", error);
    return c.json({ summary: [] });
  }
});

// Enhanced dashboard stats
app.get("/make-server-c894a9ff/dashboard/stats", async (c) => {
  try {
    // Get user context for tenant filtering
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    // Get user profile from Postgres view to retrieve tenant_id
    const { data: userProfile, error: profileError } = await supabase
      .from('tams360_user_profiles_v')
      .select('tenant_id')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !userProfile || !userProfile.tenant_id) {
      return c.json({ error: "User not associated with an organization" }, 403);
    }

    // Get counts from public views with tenant filtering
    const { count: assetCount, error: assetError } = await supabase
      .from("tams360_assets_v")
      .select("asset_id", { count: "exact", head: true })
      .eq("tenant_id", userProfile.tenant_id);

    const { count: inspectionCount, error: inspectionError } = await supabase
      .from("tams360_inspections_v")
      .select("inspection_id", { count: "exact", head: true })
      .eq("tenant_id", userProfile.tenant_id);

    // Get critical inspections (Immediate urgency) count directly from inspections
    const { count: criticalCount, error: urgencyError } = await supabase
      .from("tams360_inspections_v")
      .select("inspection_id", { count: "exact", head: true })
      .eq("calculated_urgency", "Immediate")
      .eq("tenant_id", userProfile.tenant_id);

    // Get average CI and DERU from view using existing field names
    const { data: inspectionAggregates } = await supabase
      .from("tams360_inspections_v")
      .select("conditional_index, deru_value, total_remedial_cost")
      .eq("tenant_id", userProfile.tenant_id);

    // Calculate averages using conditional_index
    const validCIs = (inspectionAggregates || []).filter((i: any) => i.conditional_index !== null);
    const validDERUs = (inspectionAggregates || []).filter((i: any) => i.deru_value !== null);
    const validCosts = (inspectionAggregates || []).filter((i: any) => i.total_remedial_cost !== null);

    const avgCI = validCIs.length > 0 
      ? validCIs.reduce((sum: number, i: any) => sum + i.conditional_index, 0) / validCIs.length 
      : null;

    const avgDERU = validDERUs.length > 0 
      ? validDERUs.reduce((sum: number, i: any) => sum + i.deru_value, 0) / validDERUs.length 
      : null;

    const totalRemedialCost = validCosts.length > 0 
      ? validCosts.reduce((sum: number, i: any) => sum + i.total_remedial_cost, 0) 
      : 0;

    // Get region breakdown - fetch all regions and group by region
    const { data: assetsWithRegions, error: regionError } = await supabase
      .from("tams360_assets_v")
      .select("region")
      .eq("tenant_id", userProfile.tenant_id);

    // Group by region and count
    const regionCounts: { [key: string]: number } = {};
    (assetsWithRegions || []).forEach((asset: any) => {
      // Normalize region: trim and normalize slash spacing
      let region = asset.region ? asset.region.trim() : "";
      if (region) {
        // Normalize slash spacing: "Region F / Region B" → "Region F/Region B"
        region = region.replace(/\s*\/\s*/g, "/");
      } else {
        region = "Unknown";
      }
      regionCounts[region] = (regionCounts[region] || 0) + 1;
    });

    const regionSummary = Object.entries(regionCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // If database queries fail, return error
    if (assetError || inspectionError) {
      console.error("Error fetching dashboard stats from DB:", { assetError, inspectionError });
      return c.json({ error: "Failed to fetch statistics from database" }, 500);
    }

    const stats = {
      totalAssets: assetCount || 0,
      totalInspections: inspectionCount || 0,
      criticalIssues: criticalCount || 0,
      avgCI: avgCI ? Math.round(avgCI * 10) / 10 : null,
      avgDERU: avgDERU ? Math.round(avgDERU * 10) / 10 : null,
      totalRemedialCost: Math.round(totalRemedialCost),
      regionSummary,
    };

    return c.json({ stats });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return c.json({ error: "Failed to fetch statistics" }, 500);
  }
});

// Wrap app with timeout protection to prevent hanging connections
const withTimeout = (handler: any) => {
  return async (request: Request) => {
    // Create a timeout promise (140 seconds - leave 10s buffer before 150s edge function limit)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout - exceeded 140 seconds')), 140000);
    });

    try {
      // Race between the actual handler and the timeout
      const response = await Promise.race([
        handler(request),
        timeoutPromise
      ]);
      
      return response;
    } catch (error: any) {
      console.error('Request handler error:', error?.message || error);
      
      // Return a proper error response instead of letting connection hang
      return new Response(
        JSON.stringify({ 
          error: 'Request failed', 
          message: error?.message || 'Unknown error',
          hint: 'This may be due to database connectivity issues or timeout'
        }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }
  };
};

// ============================================================================
// PHOTO UPLOAD ROUTES
// ============================================================================

// Upload inspection photo
app.post("/make-server-c894a9ff/photos/upload", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Missing authorization header" }, 401);
    }

    const accessToken = authHeader.replace("Bearer ", "");
    
    // Verify user and get tenant_id
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get user's tenant_id
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("auth_id", user.id)
      .single();

    if (userError || !userData?.tenant_id) {
      return c.json({ error: "User not found or no tenant assigned" }, 404);
    }

    const tenantId = userData.tenant_id;

    // Parse multipart form data
    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    const assetRef = formData.get("assetRef") as string;
    const photoNumber = formData.get("photoNumber") as string;
    const photoType = formData.get("photoType") as string;
    const componentNumber = formData.get("componentNumber") as string | null;
    const subNumber = formData.get("subNumber") as string | null;

    if (!file || !assetRef || !photoNumber || !photoType) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // Get asset_id from asset_ref
    const { data: asset, error: assetError } = await supabase
      .from("assets")
      .select("asset_id")
      .eq("asset_ref", assetRef)
      .eq("tenant_id", tenantId)
      .single();

    if (assetError || !asset) {
      return c.json({ 
        error: `Asset not found: ${assetRef}`,
        hint: "Make sure the asset exists in the database with this reference number"
      }, 404);
    }

    // Ensure inspection-photos bucket exists
    const bucketName = "make-c894a9ff-inspection-photos";
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, { public: false });
    }

    // Generate file path: tenant_id/asset_ref/photo_number.ext
    const fileExt = file.name.split(".").pop();
    const filePath = `${tenantId}/${assetRef}/${photoNumber}.${fileExt}`;

    // Upload file to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return c.json({ error: "Failed to upload file", details: uploadError.message }, 500);
    }

    // Get signed URL
    const { data: urlData } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 31536000);

    if (!urlData) {
      return c.json({ error: "Failed to generate signed URL" }, 500);
    }

    // Store photo metadata in database
    const photoMetadata = {
      photo_id: uuidv4(),
      asset_id: asset.asset_id,
      tenant_id: tenantId,
      photo_url: filePath,
      photo_number: photoNumber,
      photo_type: photoType,
      component_number: componentNumber ? parseInt(componentNumber) : null,
      sub_number: subNumber ? parseInt(subNumber) : null,
      file_size: file.size,
      file_type: file.type,
      uploaded_at: new Date().toISOString(),
      uploaded_by: user.id,
    };

    const { error: insertError } = await supabase
      .from("asset_photos")
      .insert(photoMetadata);

    if (insertError) {
      console.error("Database insert error:", insertError);
      return c.json({ error: "Failed to save photo metadata", details: insertError.message }, 500);
    }

    // If this is the main photo, update asset
    if (photoType === "main") {
      await supabase
        .from("assets")
        .update({ main_photo_url: filePath })
        .eq("asset_id", asset.asset_id);
    }

    return c.json({
      success: true,
      url: urlData.signedUrl,
      photoId: photoMetadata.photo_id,
      message: `Photo ${photoNumber} uploaded for ${assetRef}`,
    });

  } catch (error: any) {
    console.error("Photo upload error:", error);
    return c.json({ error: "Internal server error", details: error.message }, 500);
  }
});

// NEW: Generate signed upload URL for direct browser-to-storage uploads
app.post("/make-server-c894a9ff/photos/get-upload-url", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Missing authorization header" }, 401);
    }

    const accessToken = authHeader.replace("Bearer ", "");
    
    // Verify user and get tenant_id
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get user's tenant_id (CHECK BOTH KV STORE AND DATABASE!)
    let tenantId: string | null = null;

    // First, try KV store (where most users exist)
    const kvUser = await kv.get(`user:${user.id}`);
    if (kvUser && kvUser.tenantId) {
      tenantId = kvUser.tenantId;
      console.log(`✅ Found user in KV store: ${user.email}, tenant: ${tenantId}`);
    } else {
      // Fallback to database view (same as login route)
      const { data: userData, error: userError } = await supabase
        .from("tams360_user_profiles_v")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!userError && userData?.tenant_id) {
        tenantId = userData.tenant_id;
        console.log(`✅ Found user in database view: ${user.email}, tenant: ${tenantId}`);
      } else {
        // Final fallback to users table
        const { data: userTableData, error: userTableError } = await supabase
          .from("users")
          .select("tenant_id")
          .eq("auth_id", user.id)
          .single();

        if (!userTableError && userTableData?.tenant_id) {
          tenantId = userTableData.tenant_id;
          console.log(`✅ Found user in users table: ${user.email}, tenant: ${tenantId}`);
        }
      }
    }

    if (!tenantId) {
      console.error(`❌ User not found: ${user.email} (${user.id})`);
      console.error(`Checked: KV store, tams360_user_profiles_v, users table`);
      return c.json({ error: "User not found or no tenant assigned" }, 404);
    }

    // Parse request body
    const body = await c.req.json();
    const { assetRef, photoNumber, fileExt, fileType } = body;

    if (!assetRef || !photoNumber || !fileExt) {
      return c.json({ error: "Missing required fields: assetRef, photoNumber, fileExt" }, 400);
    }

    // Get asset_id from asset_ref, or create if it doesn't exist
    let asset;
    const { data: existingAsset, error: assetError } = await supabase
      .from("assets")
      .select("asset_id")
      .eq("asset_ref", assetRef)
      .eq("tenant_id", tenantId)
      .single();

    if (assetError || !existingAsset) {
      // Asset doesn't exist - create placeholder asset for photo import
      console.log(`📸 Auto-creating asset for photo import: ${assetRef}`);
      
      const { data: newAsset, error: createError } = await supabase
        .from("assets")
        .insert({
          asset_ref: assetRef,
          tenant_id: tenantId,
          asset_type_id: null,
          description: `Auto-created from photo import - ${assetRef}`,
          location_description: assetRef.split(/[-_]/)[0] || "Unknown",
          status: "active",
          latitude: null,
          longitude: null,
          created_at: new Date().toISOString(),
        })
        .select("asset_id")
        .single();

      if (createError || !newAsset) {
        console.error(`❌ Failed to create asset ${assetRef}:`, createError);
        return c.json({ 
          error: `Failed to create asset: ${assetRef}`,
          details: createError?.message
        }, 500);
      }

      asset = newAsset;
      console.log(`✅ Created asset ${assetRef} with ID: ${newAsset.asset_id}`);
    } else {
      asset = existingAsset;
    }

    // Ensure inspection-photos bucket exists
    const bucketName = "make-c894a9ff-inspection-photos";
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, { public: false });
    }

    // Generate file path: tenant_id/asset_ref/photo_number.ext
    const filePath = `${tenantId}/${assetRef}/${photoNumber}.${fileExt}`;

    // Generate signed upload URL (valid for 1 hour)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .createSignedUploadUrl(filePath);

    if (uploadError || !uploadData) {
      console.error("Failed to create signed upload URL:", uploadError);
      return c.json({ error: "Failed to generate upload URL", details: uploadError?.message }, 500);
    }

    return c.json({
      success: true,
      uploadUrl: uploadData.signedUrl,
      filePath: filePath,
      token: uploadData.token,
      assetId: asset.asset_id,
      tenantId: tenantId,
    });

  } catch (error: any) {
    console.error("Get upload URL error:", error);
    return c.json({ error: "Internal server error", details: error.message }, 500);
  }
});

// NEW: Save photo metadata after direct upload
app.post("/make-server-c894a9ff/photos/save-metadata", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Missing authorization header" }, 401);
    }

    const accessToken = authHeader.replace("Bearer ", "");
    
    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Parse request body
    const body = await c.req.json();
    const { 
      assetId, 
      tenantId, 
      filePath, 
      photoNumber, 
      photoType, 
      componentNumber, 
      subNumber,
      fileSize,
      fileType 
    } = body;

    if (!assetId || !tenantId || !filePath || !photoNumber || !photoType) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // Ensure inspection-photos bucket exists
    const bucketName = "make-c894a9ff-inspection-photos";

    // Get signed URL for viewing
    const { data: urlData } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 31536000);

    // Store photo metadata in database
    const photoMetadata = {
      photo_id: uuidv4(),
      asset_id: assetId,
      tenant_id: tenantId,
      photo_url: filePath,
      photo_number: photoNumber,
      photo_type: photoType,
      component_number: componentNumber ? parseInt(componentNumber) : null,
      sub_number: subNumber ? parseInt(subNumber) : null,
      file_size: fileSize || null,
      file_type: fileType || null,
      uploaded_at: new Date().toISOString(),
      uploaded_by: user.id,
    };

    const { error: insertError } = await supabase
      .from("asset_photos")
      .insert(photoMetadata);

    if (insertError) {
      console.error("Database insert error:", insertError);
      return c.json({ error: "Failed to save photo metadata", details: insertError.message }, 500);
    }

    // If this is the main photo, update asset
    if (photoType === "main") {
      await supabase
        .from("assets")
        .update({ main_photo_url: filePath })
        .eq("asset_id", assetId);
    }

    return c.json({
      success: true,
      url: urlData?.signedUrl,
      photoId: photoMetadata.photo_id,
      message: `Photo ${photoNumber} metadata saved`,
    });

  } catch (error: any) {
    console.error("Save metadata error:", error);
    return c.json({ error: "Internal server error", details: error.message }, 500);
  }
});

// Get photos for an asset
app.get("/make-server-c894a9ff/photos/:assetId", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Missing authorization header" }, 401);
    }

    const accessToken = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const assetId = c.req.param("assetId");

    const { data: photos, error } = await supabase
      .from("asset_photos")
      .select("*")
      .eq("asset_id", assetId)
      .order("photo_number", { ascending: true });

    if (error) {
      return c.json({ error: "Failed to fetch photos", details: error.message }, 500);
    }

    const bucketName = "make-c894a9ff-inspection-photos";
    const photosWithUrls = await Promise.all(
      photos.map(async (photo) => {
        const { data: urlData } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(photo.photo_url, 3600);

        return {
          ...photo,
          signedUrl: urlData?.signedUrl || null,
        };
      })
    );

    return c.json({ photos: photosWithUrls });

  } catch (error: any) {
    console.error("Fetch photos error:", error);
    return c.json({ error: "Internal server error", details: error.message }, 500);
  }
});

Deno.serve(withTimeout(app.fetch));