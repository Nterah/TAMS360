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

// Get all users for current tenant (from Postgres view)
export async function getUsersV2(c: Context) {
  try {
    const userProfile = c.get("userProfile");
    console.log("getUsersV2 - userProfile:", userProfile);
    
    if (!userProfile || !userProfile.tenantId) {
      console.error("No userProfile or tenantId found in context");
      return c.json({ error: "User profile not found" }, 400);
    }
    
    // Try to get users from Postgres view first
    const { data: users, error } = await supabase
      .from('tams360_user_profiles_v')
      .select('id, tenant_id, email, name, role, status, created_at, updated_at')
      .eq('tenant_id', userProfile.tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.log("View not available, falling back to KV store:", error.message);
      
      // Fallback to KV store
      const allUsers = await kv.getByPrefix("user:");
      const tenantUsers = allUsers.filter((user: any) => user.tenantId === userProfile.tenantId);
      
      console.log(`Found ${tenantUsers.length} users in KV store for tenant ${userProfile.tenantId}`);
      
      // Map KV store format to expected format
      const mappedUsers = tenantUsers.map((user: any) => ({
        id: user.id,
        tenant_id: user.tenantId,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status || 'approved',
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      }));
      
      return c.json({ users: mappedUsers });
    }

    console.log(`Found ${users?.length || 0} users for tenant ${userProfile.tenantId}`);
    return c.json({ users: users || [] });
  } catch (error) {
    console.error("Error in users-v2 endpoint:", error);
    
    // Final fallback to KV store on any error
    try {
      const allUsers = await kv.getByPrefix("user:");
      const userProfile = c.get("userProfile");
      const tenantUsers = allUsers.filter((user: any) => user.tenantId === userProfile.tenantId);
      
      const mappedUsers = tenantUsers.map((user: any) => ({
        id: user.id,
        tenant_id: user.tenantId,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status || 'approved',
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      }));
      
      return c.json({ users: mappedUsers });
    } catch (kvError) {
      console.error("KV fallback also failed:", kvError);
      return c.json({ error: `Failed to fetch users: ${error.message}` }, 500);
    }
  }
}

// Update user (role, status) - writes through Postgres view
export async function updateUserV2(c: Context) {
  try {
    const userId = c.req.param("userId");
    const { role, status } = await c.req.json();
    const adminProfile = c.get("userProfile");

    // Verify user belongs to same tenant
    const { data: targetUser, error: fetchError } = await supabase
      .from('tams360_user_profiles_v')
      .select('tenant_id')
      .eq('id', userId)
      .single();

    if (fetchError || !targetUser) {
      return c.json({ error: "User not found" }, 404);
    }

    if (targetUser.tenant_id !== adminProfile.tenantId) {
      return c.json({ error: "Cannot modify users from another organization" }, 403);
    }

    // Update through view (will trigger INSTEAD OF trigger)
    const updates: any = { updated_at: new Date().toISOString() };
    if (role !== undefined) updates.role = role;
    if (status !== undefined) updates.status = status;

    const { data: updatedUser, error: updateError } = await supabase
      .from('tams360_user_profiles_v')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating user:", updateError);
      return c.json({ error: "Failed to update user" }, 500);
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

    return c.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Error in update user endpoint:", error);
    return c.json({ error: "Failed to update user" }, 500);
  }
}

// Deactivate/Reactivate user
export async function toggleUserStatus(c: Context) {
  try {
    const userId = c.req.param("userId");
    const adminProfile = c.get("userProfile");

    // Get current user status
    const { data: targetUser, error: fetchError } = await supabase
      .from('tams360_user_profiles_v')
      .select('tenant_id, status')
      .eq('id', userId)
      .single();

    if (fetchError || !targetUser) {
      return c.json({ error: "User not found" }, 404);
    }

    if (targetUser.tenant_id !== adminProfile.tenantId) {
      return c.json({ error: "Cannot modify users from another organization" }, 403);
    }

    // Toggle status
    const newStatus = targetUser.status === 'active' ? 'inactive' : 'active';

    const { error: updateError } = await supabase
      .from('tams360_user_profiles_v')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) {
      console.error("Error toggling user status:", updateError);
      return c.json({ error: "Failed to update user status" }, 500);
    }

    // Log audit trail
    await kv.set(`audit:${Date.now()}_${uuidv4()}`, {
      action: "user_status_changed",
      adminId: adminProfile.id,
      userId,
      tenantId: adminProfile.tenantId,
      timestamp: new Date().toISOString(),
      changes: { oldStatus: targetUser.status, newStatus },
    });

    return c.json({ success: true, newStatus });
  } catch (error) {
    console.error("Error toggling user status:", error);
    return c.json({ error: "Failed to toggle user status" }, 500);
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

    return c.json({ success: true });
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