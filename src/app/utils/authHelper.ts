/**
 * Auth helper for TAMS360 - handles Supabase Auth session validation
 * 
 * IMPORTANT: TAMS360 uses Supabase Auth with custom backend JWT tokens
 * Tokens are stored in localStorage as "tams360_token" (which is a Supabase access_token)
 */

import { projectId, publicAnonKey } from "/utils/supabase/info";
import { supabase } from "../../lib/supabaseClient";


const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;
const TOKEN_KEY = "tams360_token";

export type SessionResult = 
  | { ok: true; access_token: string }
  | { ok: false; reason: "missing_session" | "refresh_failed"; error?: any };

/**
 * Get a valid session from localStorage token
 * 
 * This checks the localStorage token (Supabase access_token from login)
 * and validates it with the backend session endpoint.
 * 
 * @returns Session result with ok status and token if valid
 */
export async function getValidSession(): Promise<string | null> {
  // 1) Try your legacy localStorage token first (keeps backwards compatibility)
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    try {
      const response = await fetch(
        "https://fuvzhbuvwpnysluojqni.supabase.co/functions/v1/make-server-c894a9ff/auth/session",
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.ok) {
        const data = await response.json();
        if (data?.user) return token;
      }
    } catch (e) {
      console.warn("Legacy token validation failed:", e);
    }
    // If invalid, clear it and fall through to Supabase session
    localStorage.removeItem(TOKEN_KEY);
  }

  // 2) Fall back to Supabase Auth session (this is what your login is actually using)
  try {
    const { data } = await supabase.auth.getSession();
    const accessToken = data?.session?.access_token ?? null;

    // Optional: store it so older code paths still work
    if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);

    return accessToken;
  } catch (e) {
    console.warn("Supabase session check failed:", e);
    return null;
  }
}


/**
 * Wrapper for fetch requests to Supabase Edge Functions with automatic 401 retry
 * 
 * @param url - The Edge Function URL
 * @param options - Standard fetch options (headers will be merged with auth)
 * @returns Fetch response
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get valid session
  const sessionResult = await getValidSession();
  
  if (!sessionResult.ok) {
    throw new Error(`No valid session: ${sessionResult.reason}`);
  }

  // Merge authorization header
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${sessionResult.access_token}`,
  };

  // First attempt
  let response = await fetch(url, { ...options, headers });

  // If 401, the session is invalid - clear token
  if (response.status === 401) {
    console.warn("Got 401, session invalid - clearing token");
    localStorage.removeItem("tams360_token");
    localStorage.removeItem("tams360_user");
  }

  return response;
}