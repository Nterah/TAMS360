/**
 * Photo Upload Preflight & Missing Asset Management
 * 
 * Purpose: Validate asset refs before upload to avoid 33 failed attempts
 * Features: Normalization, variant matching, admin asset creation
 */

import { Hono } from "npm:hono@4.6.14";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import * as kv from "./kv_store.tsx";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Normalize asset ref for fuzzy matching
 * Handles: spacing, underscores, hyphens
 */
export function normalizeAssetRef(ref: string): string {
  return ref
    .trim()
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .replace(/\s*-\s*/g, '-') // Remove spaces around hyphens
    .replace(/\s*_\s*/g, '_'); // Remove spaces around underscores
}

/**
 * Generate lookup variants for asset ref matching
 */
export function getAssetRefVariants(ref: string): string[] {
  const normalized = normalizeAssetRef(ref);
  const variants = new Set([
    ref, // original
    normalized, // normalized
    normalized.replace(/_/g, '-'), // underscores to hyphens
    normalized.replace(/-/g, '_'), // hyphens to underscores
  ]);
  return Array.from(variants);
}

export function registerPreflightRoutes(app: Hono) {
  // Preflight check for asset refs before upload
  app.post("/make-server-c894a9ff/photos/preflight-assets", async (c) => {
    try {
      const authHeader = c.req.header("Authorization");
      if (!authHeader) {
        return c.json({ error: "Missing authorization header" }, 401);
      }

      const accessToken = authHeader.replace("Bearer ", "");
      
      // Verify user and get tenant_id
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(accessToken);
      if (authError || !user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Get user's tenant_id
      let tenantId: string | null = null;
      const kvUser = await kv.get(`user:${user.id}`);
      if (kvUser && kvUser.tenantId) {
        tenantId = kvUser.tenantId;
      } else {
        const { data: userData } = await supabase
          .from("tams360_user_profiles_v")
          .select("tenant_id")
          .eq("id", user.id)
          .single();
        
        if (userData?.tenant_id) {
          tenantId = userData.tenant_id;
        } else {
          const { data: userTableData } = await supabase
            .from("users")
            .select("tenant_id")
            .eq("auth_id", user.id)
            .single();
          
          if (userTableData?.tenant_id) {
            tenantId = userTableData.tenant_id;
          }
        }
      }

      if (!tenantId) {
        return c.json({ error: "User not found or no tenant assigned" }, 404);
      }

      // Parse request body
      const body = await c.req.json();
      const { assetRefs } = body as { assetRefs: string[] };

      if (!assetRefs || !Array.isArray(assetRefs)) {
        return c.json({ error: "Missing or invalid assetRefs array" }, 400);
      }

      console.log(`🔍 Preflight check for ${assetRefs.length} assets (tenant: ${tenantId})`);

      const results = [];
      let foundCount = 0;
      let normalizedCount = 0;
      let missingCount = 0;

      for (const inputRef of assetRefs) {
        // Try exact match first
        let { data: asset } = await supabase
          .from("assets")
          .select("asset_id, asset_ref, reference_number")
          .eq("asset_ref", inputRef)
          .eq("tenant_id", tenantId)
          .maybeSingle();

        if (asset) {
          results.push({
            inputRef,
            status: "FOUND",
            matchedRef: asset.asset_ref,
            assetId: asset.asset_id,
          });
          foundCount++;
          continue;
        }

        // Try reference_number
        const refNumResult = await supabase
          .from("assets")
          .select("asset_id, asset_ref, reference_number")
          .eq("reference_number", inputRef)
          .eq("tenant_id", tenantId)
          .maybeSingle();

        if (refNumResult.data) {
          results.push({
            inputRef,
            status: "FOUND",
            matchedRef: refNumResult.data.reference_number,
            assetId: refNumResult.data.asset_id,
          });
          foundCount++;
          continue;
        }

        // Try normalized variants
        const variants = getAssetRefVariants(inputRef);
        let foundViaVariant = false;

        for (const variant of variants) {
          if (variant === inputRef) continue; // Already tried exact match

          const variantResult = await supabase
            .from("assets")
            .select("asset_id, asset_ref, reference_number")
            .or(`asset_ref.eq.${variant},reference_number.eq.${variant}`)
            .eq("tenant_id", tenantId)
            .maybeSingle();

          if (variantResult.data) {
            results.push({
              inputRef,
              status: "FOUND_NORMALIZED",
              matchedRef: variantResult.data.asset_ref || variantResult.data.reference_number,
              assetId: variantResult.data.asset_id,
            });
            normalizedCount++;
            foundViaVariant = true;
            break;
          }
        }

        if (!foundViaVariant) {
          results.push({
            inputRef,
            status: "MISSING",
            matchedRef: null,
            assetId: null,
          });
          missingCount++;
        }
      }

      console.log(`✅ Preflight complete: ${foundCount} found, ${normalizedCount} normalized, ${missingCount} missing`);

      return c.json({
        results,
        summary: {
          total: assetRefs.length,
          found: foundCount,
          normalized: normalizedCount,
          missing: missingCount,
        },
      });
    } catch (error: any) {
      console.error("❌ Preflight error:", error);
      return c.json({ error: "Preflight check failed", details: error.message }, 500);
    }
  });

  // Create missing assets (admin-only)
  app.post("/make-server-c894a9ff/photos/create-missing-assets", async (c) => {
    try {
      const authHeader = c.req.header("Authorization");
      if (!authHeader) {
        return c.json({ error: "Missing authorization header" }, 401);
      }

      const accessToken = authHeader.replace("Bearer ", "");
      
      // Verify user and get tenant_id
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(accessToken);
      if (authError || !user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Get user's tenant_id and check admin privileges
      let tenantId: string | null = null;
      let isAdmin = false;

      const kvUser = await kv.get(`user:${user.id}`);
      if (kvUser && kvUser.tenantId) {
        tenantId = kvUser.tenantId;
        isAdmin = kvUser.role === 'admin' || kvUser.role === 'superadmin';
      } else {
        const { data: userData } = await supabase
          .from("tams360_user_profiles_v")
          .select("tenant_id, role")
          .eq("id", user.id)
          .single();
        
        if (userData?.tenant_id) {
          tenantId = userData.tenant_id;
          isAdmin = userData.role === 'admin' || userData.role === 'superadmin';
        }
      }

      if (!tenantId) {
        return c.json({ error: "User not found or no tenant assigned" }, 404);
      }

      if (!isAdmin) {
        return c.json({ error: "Admin privileges required" }, 403);
      }

      // Parse request body
      const body = await c.req.json();
      const { assetRefs } = body as { assetRefs: string[] };

      if (!assetRefs || !Array.isArray(assetRefs)) {
        return c.json({ error: "Missing or invalid assetRefs array" }, 400);
      }

      console.log(`🆕 Creating ${assetRefs.length} missing assets (tenant: ${tenantId})`);

      const results = [];
      let createdCount = 0;
      let skippedCount = 0;
      let failedCount = 0;

      for (const assetRef of assetRefs) {
        // Check if already exists
        const { data: existing } = await supabase
          .from("assets")
          .select("asset_id")
          .or(`asset_ref.eq.${assetRef},reference_number.eq.${assetRef}`)
          .eq("tenant_id", tenantId)
          .maybeSingle();

        if (existing) {
          results.push({
            assetRef,
            status: "SKIPPED",
            reason: "Already exists",
          });
          skippedCount++;
          continue;
        }

        // Create new asset
        const assetId = crypto.randomUUID();
        const { error: createError } = await supabase
          .from("assets")
          .insert({
            asset_id: assetId,
            tenant_id: tenantId,
            asset_ref: assetRef,
            reference_number: assetRef,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (createError) {
          console.error(`❌ Failed to create asset ${assetRef}:`, createError);
          results.push({
            assetRef,
            status: "FAILED",
            reason: createError.message,
          });
          failedCount++;
        } else {
          results.push({
            assetRef,
            status: "CREATED",
            assetId,
          });
          createdCount++;
        }
      }

      console.log(`✅ Create complete: ${createdCount} created, ${skippedCount} skipped, ${failedCount} failed`);

      return c.json({
        results,
        summary: {
          total: assetRefs.length,
          created: createdCount,
          skipped: skippedCount,
          failed: failedCount,
        },
      });
    } catch (error: any) {
      console.error("❌ Create missing assets error:", error);
      return c.json({ error: "Failed to create assets", details: error.message }, 500);
    }
  });
}
