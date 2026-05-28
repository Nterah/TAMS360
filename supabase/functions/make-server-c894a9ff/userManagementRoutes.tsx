// Enhanced User Management Routes for TAMS360
// These routes use Postgres views (tams360_user_profiles_v) for better data integrity

import type { Context } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import { v4 as uuidv4 } from "npm:uuid@9";
import * as emailService from "./emailService.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
);

const supabaseAuth = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_ANON_KEY") || "",
);

// Get all users for current tenant (from TAMS360 Postgres view)
export async function getUsersV2(c: Context) {
  try {
    const userProfile = c.get("userProfile");
    console.log("getUsersV2 - userProfile:", userProfile);
    
    if (!userProfile || !userProfile.tenantId) {
      console.error("No userProfile or tenantId found in context");
      return c.json({ error: "User profile not found" }, 400);
    }
    
    console.log("🔍 [TAMS360] Querying users for tenant:", userProfile.tenantId);
    
    // Query ONLY the TAMS360 public view
    const { data: users, error } = await supabase
      .from('tams360_user_profiles_v')
      .select('*')
      .eq('tenant_id', userProfile.tenantId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error(`❌ [TAMS360] Failed to query tams360_user_profiles_v:`, error);
      return c.json({ 
        error: "Failed to fetch users", 
        details: error.message,
        hint: "Check that tams360_user_profiles_v view exists and RLS policies allow access"
      }, 500);
    }

    console.log(`✅ [TAMS360] Returning ${users?.length || 0} users from tams360_user_profiles_v`);
    return c.json({ users: users || [], source: 'tams360_user_profiles_v' });
  } catch (error) {
    console.error("❌ [TAMS360] Error in users-v2 endpoint:", error);
    return c.json({ error: "Failed to fetch users", details: error.message }, 500);
  }
}

// Update user (role, status) - writes through Postgres view
export async function updateUserV2(c: Context) {
  try {
    const userId = c.req.param("userId");
    const { role, status } = await c.req.json();
    const adminProfile = c.get("userProfile");

    console.log("🔄 Updating user:", { userId, role, status, adminTenantId: adminProfile.tenantId });

    // Try multiple table/view names to find the user
    const possibleSources = [
      'tams360_user_profiles_v',
      'user_profiles_v',
      'tams360.user_profiles',
      'user_profiles',
      'profiles'
    ];
    
    let targetUser = null;
    let successfulSource = null;
    
    // First, find the user to verify tenant
    for (const source of possibleSources) {
      const result = await supabase
        .from(source)
        .select('id, tenant_id, email, name, role, status')
        .eq('id', userId)
        .single();
      
      if (!result.error && result.data) {
        targetUser = result.data;
        successfulSource = source;
        console.log(`✅ Found user in ${source}`);
        break;
      }
    }

    // Fallback to KV store if not found in database
    if (!targetUser) {
      console.log("⚠️ User not found in database, checking KV store");
      const kvUsers = await kv.getByPrefix("user:");
      targetUser = kvUsers.find((u: any) => u.id === userId);
      
      if (targetUser) {
        successfulSource = 'kv_store';
        // Normalize KV store format
        targetUser = {
          id: targetUser.id,
          tenant_id: targetUser.tenantId,
          email: targetUser.email,
          name: targetUser.name,
          role: targetUser.role,
          status: targetUser.status || 'approved',
        };
      }
    }

    if (!targetUser) {
      console.error("❌ User not found in any source");
      return c.json({ error: "User not found" }, 404);
    }

    // Verify user belongs to same tenant
    if (targetUser.tenant_id !== adminProfile.tenantId) {
      console.error("❌ Tenant mismatch:", { userTenant: targetUser.tenant_id, adminTenant: adminProfile.tenantId });
      return c.json({ error: "Cannot modify users from another organization" }, 403);
    }

    // Prepare updates
    const updates: any = { updated_at: new Date().toISOString() };
    if (role !== undefined) updates.role = role;
    if (status !== undefined) updates.status = status;

    let updatedUser = null;

    // Try to update in database first
    if (successfulSource !== 'kv_store') {
      const { data, error: updateError } = await supabase
        .from(successfulSource)
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (!updateError && data) {
        updatedUser = data;
        console.log(`✅ Updated user in ${successfulSource}`);
      } else {
        console.log(`⚠️ Failed to update in ${successfulSource}, falling back to KV store`);
      }
    }

    // Fallback to KV store update
    if (!updatedUser) {
      console.log("📝 Updating in KV store");
      const kvKey = `user:${userId}`;
      const existingUser = await kv.get(kvKey);
      
      if (!existingUser) {
        // Create new entry in KV store
        const newUser = {
          ...targetUser,
          role: role !== undefined ? role : targetUser.role,
          status: status !== undefined ? status : targetUser.status,
          tenantId: targetUser.tenant_id,
          updatedAt: new Date().toISOString(),
        };
        await kv.set(kvKey, newUser);
        updatedUser = {
          id: newUser.id,
          tenant_id: newUser.tenantId,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          status: newUser.status,
          updated_at: newUser.updatedAt,
        };
      } else {
        // Update existing KV entry
        const updated = {
          ...existingUser,
          role: role !== undefined ? role : existingUser.role,
          status: status !== undefined ? status : existingUser.status,
          updatedAt: new Date().toISOString(),
        };
        await kv.set(kvKey, updated);
        updatedUser = {
          id: updated.id,
          tenant_id: updated.tenantId,
          email: updated.email,
          name: updated.name,
          role: updated.role,
          status: updated.status,
          updated_at: updated.updatedAt,
        };
      }
      console.log("✅ Updated user in KV store");
    }

    // Log audit trail
    await kv.set(`audit:${Date.now()}_${uuidv4()}`, {
      action: "user_updated",
      adminId: adminProfile.id,
      userId,
      tenantId: adminProfile.tenantId,
      timestamp: new Date().toISOString(),
      changes: { role, status },
    });

    console.log("✅ User update complete");
    return c.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("❌ Error in update user endpoint:", error);
    return c.json({ error: "Failed to update user", details: error.message }, 500);
  }
}

// Deactivate/Reactivate user
export async function toggleUserStatus(c: Context) {
  try {
    const userId = c.req.param("userId");
    const adminProfile = c.get("userProfile");

    console.log("🔄 Toggling status for user:", {
      userId,
      adminProfile: {
        id: adminProfile.id,
        tenantId: adminProfile.tenantId,
        role: adminProfile.role
      }
    });

    // Try multiple table/view names to find the user
    const possibleSources = [
      'tams360_user_profiles_v',
      'user_profiles_v',
      'tams360.user_profiles',
      'user_profiles',
      'profiles'
    ];
    
    let userToUpdate = null;
    let successfulSource = null;
    
    // First, find the user
    for (const source of possibleSources) {
      const result = await supabase
        .from(source)
        .select('id, tenant_id, email, name, role, status')
        .eq('id', userId)
        .single();
      
      if (!result.error && result.data) {
        userToUpdate = result.data;
        successfulSource = source;
        console.log(`✅ Found user in ${source}`);
        break;
      }
    }

    // If view query failed, try KV store as fallback
    let useKvStore = false;

    if (!userToUpdate) {
      console.log("⚠️ Database query failed, checking KV store...");
      
      try {
        const kvUser = await kv.get(`user:${userId}`);
        
        if (kvUser) {
          console.log("✅ Found user in KV store:", kvUser);
          userToUpdate = {
            id: kvUser.id,
            tenant_id: kvUser.tenantId,
            email: kvUser.email,
            name: kvUser.name,
            status: kvUser.status || 'approved',
            role: kvUser.role
          };
          useKvStore = true;
          successfulSource = 'kv_store';
        } else {
          console.error("❌ User not found in database or KV store:", { userId });
          return c.json({ error: "User not found", details: "User does not exist in database or KV store" }, 404);
        }
      } catch (kvError) {
        console.error("❌ Error checking KV store:", kvError);
        return c.json({ error: "User not found" }, 404);
      }
    }

    console.log("✅ Current user status:", userToUpdate.status);

    if (userToUpdate.tenant_id !== adminProfile.tenantId) {
      console.error("❌ Tenant mismatch:", { userTenant: userToUpdate.tenant_id, adminTenant: adminProfile.tenantId });
      return c.json({ error: "Cannot modify users from another organization" }, 403);
    }

    // Toggle status - Valid values: pending, approved, suspended
    const newStatus = userToUpdate.status === 'approved' ? 'suspended' : 'approved';

    console.log("🔄 Updating status to:", newStatus, "using:", successfulSource);

    if (useKvStore) {
      // Update via KV store
      const kvUser = await kv.get(`user:${userId}`);
      kvUser.status = newStatus;
      kvUser.updatedAt = new Date().toISOString();
      await kv.set(`user:${userId}`, kvUser);
      console.log("✅ Status toggled successfully in KV store");
    } else {
      // Try to update via database
      const { data: updateResult, error: updateError } = await supabase
        .from(successfulSource)
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select();

      if (updateError) {
        console.log("⚠️ Database update failed, falling back to KV store");
        
        // Fallback to KV store
        const kvUser = await kv.get(`user:${userId}`) || {
          id: userToUpdate.id,
          tenantId: userToUpdate.tenant_id,
          email: userToUpdate.email,
          name: userToUpdate.name,
          role: userToUpdate.role,
          status: userToUpdate.status,
        };
        
        kvUser.status = newStatus;
        kvUser.updatedAt = new Date().toISOString();
        await kv.set(`user:${userId}`, kvUser);
        console.log("✅ Status toggled successfully in KV store (fallback)");
      } else {
        console.log("✅ Status toggled successfully in database:", updateResult);
      }
    }

    // Log audit trail
    await kv.set(`audit:${Date.now()}_${uuidv4()}`, {
      action: "user_status_changed",
      adminId: adminProfile.id,
      userId,
      tenantId: adminProfile.tenantId,
      timestamp: new Date().toISOString(),
      changes: { oldStatus: userToUpdate.status, newStatus },
      dataSource: successfulSource
    });

    return c.json({ success: true, newStatus });
  } catch (error) {
    console.error("❌ Error toggling user status:", error);
    return c.json({ error: "Failed to toggle user status", details: error.message }, 500);
  }
}

// Resend invitation email
export async function resendInvitation(c: Context) {
  try {
    const inviteCode = c.req.param("code");
    const adminProfile = c.get("userProfile");

    // Get invitation
    const invitation = await kv.get(`invite:${inviteCode}`);
    if (!invitation) {
      return c.json({ error: "Invitation not found" }, 404);
    }

    if (invitation.tenantId !== adminProfile.tenantId) {
      return c.json({ error: "Cannot resend invitation from another organization" }, 403);
    }

    if (invitation.status !== "pending") {
      return c.json({ error: "Can only resend pending invitations" }, 400);
    }

    // Only send email if invitation has an email address
    if (invitation.email) {
      // Get tenant info
      const { data: tenant } = await supabase
        .from('tams360_tenants_v')
        .select('name')
        .eq('tenant_id', adminProfile.tenantId)
        .single();

      // Send email
      try {
        const signupUrl = `https://app.tams360.co.za/signup?invite=${inviteCode}`;
        await emailService.sendInvitationEmail({
          to: invitation.email,
          inviteCode,
          role: invitation.role,
          organizationName: tenant?.name || 'TAMS360',
          signupUrl,
        });
      } catch (emailError) {
        console.error("Email send error:", emailError);
        // Don't fail the request if email fails
      }
    }

    return c.json({ 
      success: true, 
      message: invitation.email 
        ? 'Invitation email resent successfully' 
        : 'Invitation refreshed (no email to send)' 
    });
  } catch (error) {
    console.error("Error resending invitation:", error);
    return c.json({ error: "Failed to resend invitation" }, 500);
  }
}

// Delete user (soft delete by setting status to deleted)
export async function deleteUser(c: Context) {
  try {
    const userId = c.req.param("userId");
    const adminProfile = c.get("userProfile");

    // Verify user belongs to same tenant
    const { data: targetUser, error: fetchError } = await supabase
      .from('tams360_user_profiles_v')
      .select('tenant_id, email')
      .eq('id', userId)
      .single();

    if (fetchError || !targetUser) {
      return c.json({ error: "User not found" }, 404);
    }

    if (targetUser.tenant_id !== adminProfile.tenantId) {
      return c.json({ error: "Cannot delete users from another organization" }, 403);
    }

    // Prevent self-deletion
    if (userId === adminProfile.id) {
      return c.json({ error: "Cannot delete your own account" }, 400);
    }

    // Soft delete by setting status to deleted
    const { error: updateError } = await supabase
      .from('tams360_user_profiles_v')
      .update({ 
        status: 'deleted', 
        updated_at: new Date().toISOString() 
      })
      .eq('id', userId);

    if (updateError) {
      console.error("Error deleting user:", updateError);
      return c.json({ error: "Failed to delete user" }, 500);
    }

    // Log audit trail
    await kv.set(`audit:${Date.now()}_${uuidv4()}`, {
      action: "user_deleted",
      adminId: adminProfile.id,
      userId,
      userEmail: targetUser.email,
      tenantId: adminProfile.tenantId,
      timestamp: new Date().toISOString(),
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return c.json({ error: "Failed to delete user" }, 500);
  }
}

// Create user directly (without invitation link)
export async function createUserDirect(c: Context) {
  try {
    const adminProfile = c.get("userProfile");
    const { email, name, password, role } = await c.req.json();

    // Validate required fields
    if (!email || !name || !password || !role) {
      return c.json({ error: "Email, name, password, and role are required" }, 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({ error: "Invalid email format" }, 400);
    }

    // Validate password strength
    if (password.length < 6) {
      return c.json({ error: "Password must be at least 6 characters" }, 400);
    }

    // Validate role
    const validRoles = ['admin', 'supervisor', 'field_user', 'viewer'];
    if (!validRoles.includes(role)) {
      return c.json({ error: "Invalid role. Must be one of: admin, supervisor, field_user, viewer" }, 400);
    }

    console.log(`📝 Creating user directly: ${email} with role ${role} for tenant ${adminProfile.tenantId}`);

    // Check if user already exists
    const { data: existingAuthUser } = await supabase.auth.admin.listUsers();
    const userExists = existingAuthUser?.users?.some(u => u.email === email);
    
    if (userExists) {
      return c.json({ error: "A user with this email already exists" }, 409);
    }

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true, // Auto-confirm email since admin is creating
    });

    if (authError) {
      console.error("❌ Auth error creating user:", authError);
      return c.json({ error: `Failed to create user: ${authError.message}` }, 500);
    }

    if (!authData.user) {
      return c.json({ error: "Failed to create user authentication" }, 500);
    }

    console.log(`✅ Auth user created with ID: ${authData.user.id}`);

    // Create user profile via TAMS360 public view (which will trigger INSTEAD OF insert to actual table)
    const userProfile: any = {
      id: authData.user.id,
      tenant_id: adminProfile.tenantId,  // CRITICAL: Link user to the admin's tenant
      email,
      name,
      role,
      status: 'approved',  // Valid values: pending, approved, suspended
      tier: 'basic',
      organization: adminProfile.organization || '',
      created_at: new Date().toISOString(),
    };

    console.log(`📝 Inserting user profile into tams360_user_profiles_v:`, { 
      userId: authData.user.id, 
      tenantId: adminProfile.tenantId,
      email,
      role 
    });
    
    // Insert through the public view (INSTEAD OF trigger will write to tams360.user_profiles)
    const { data: insertedUser, error: insertError } = await supabase
      .from('tams360_user_profiles_v')
      .insert(userProfile)
      .select()
      .single();

    if (insertError) {
      console.error(`❌ Failed to insert into tams360_user_profiles_v:`, insertError);
      
      // Clean up auth user if profile creation failed
      await supabase.auth.admin.deleteUser(authData.user.id);
      
      return c.json({ 
        error: `Failed to create user profile: ${insertError.message}. Check database triggers and RLS policies.` 
      }, 500);
    }

    console.log(`✅ Successfully created user profile in TAMS360 schema via view`);

    // Log the action
    await kv.set(`audit:${Date.now()}`, {
      action: 'USER_CREATED_DIRECT',
      performedBy: adminProfile.id,
      performedByEmail: adminProfile.email,
      targetUserId: authData.user.id,
      targetUserEmail: email,
      role,
      timestamp: new Date().toISOString(),
    });

    return c.json({ 
      success: true, 
      user: insertedUser,
      dataSource: 'user_profiles',
      message: "User created successfully"
    });
  } catch (error) {
    console.error("❌ Error creating user directly:", error);
    return c.json({ error: `Failed to create user: ${error.message}` }, 500);
  }
}

// Reset user password
export async function resetUserPassword(c: Context) {
  try {
    const userId = c.req.param("userId");
    const { newPassword } = await c.req.json();
    const adminProfile = c.get("userProfile");

    console.log(`🔐 Admin ${adminProfile.email} attempting to reset password for user ${userId}`);

    // Validate password
    if (!newPassword || newPassword.length < 6) {
      return c.json({ error: "Password must be at least 6 characters" }, 400);
    }

    // Try multiple table/view names to find the user
    const possibleSources = [
      'tams360_user_profiles_v',
      'user_profiles_v',
      'tams360.user_profiles',
      'user_profiles',
      'profiles'
    ];
    
    let targetUser = null;

    for (const source of possibleSources) {
      const result = await supabase
        .from(source)
        .select('id, tenant_id, email, name')
        .eq('id', userId)
        .single();
      
      if (!result.error && result.data) {
        targetUser = result.data;
        break;
      }
    }

    // Fallback to KV store
    if (!targetUser) {
      const kvUser = await kv.get(`user:${userId}`);
      if (kvUser) {
        targetUser = {
          id: kvUser.id,
          tenant_id: kvUser.tenantId,
          email: kvUser.email,
          name: kvUser.name,
        };
      }
    }

    if (!targetUser) {
      return c.json({ error: "User not found" }, 404);
    }

    // Verify user belongs to same tenant
    if (targetUser.tenant_id !== adminProfile.tenantId) {
      return c.json({ error: "Cannot reset password for users from another organization" }, 403);
    }

    // Update password using Supabase Auth Admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error("❌ Error resetting password:", updateError);
      return c.json({ error: `Failed to reset password: ${updateError.message}` }, 500);
    }

    // Log audit trail
    await kv.set(`audit:${Date.now()}_${uuidv4()}`, {
      action: "password_reset",
      adminId: adminProfile.id,
      userId,
      userEmail: targetUser.email,
      tenantId: adminProfile.tenantId,
      timestamp: new Date().toISOString(),
    });

    console.log(`✅ Password reset successfully for user ${targetUser.email} by admin ${adminProfile.email}`);

    return c.json({ 
      success: true,
      message: "Password reset successfully"
    });
  } catch (error) {
    console.error("❌ Error resetting user password:", error);
    return c.json({ error: `Failed to reset password: ${error.message}` }, 500);
  }
}