/**
 * Singleton Supabase client for TAMS360 frontend
 * 
 * IMPORTANT: This is the ONLY place where createClient() should be called in the frontend.
 * All other files must import this singleton to prevent "Multiple GoTrueClient instances" warning.
 * 
 * Usage:
 *   import { supabase } from '@/lib/supabaseClient';
 *   const { data, error } = await supabase.auth.getSession();
 */

import { createClient } from "@supabase/supabase-js";
import { publicAnonKey, projectId } from "/utils/supabase/info";

// Create ONE Supabase client instance (singleton)
export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

// Export API URL for convenience
export const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;
