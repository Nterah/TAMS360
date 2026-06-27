/**
 * Centralized API Utility for TAMS360
 * Handles authentication, token expiration, and error handling
 */

import { toast } from "sonner";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { supabase } from "../../lib/supabaseClient";

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

interface ApiOptions extends RequestInit {
  useAuth?: boolean; // Whether to include auth token (default: true)
  skipErrorToast?: boolean; // Whether to skip showing error toast (default: false)
}

/**
 * Get a fresh access token from the Supabase session.
 * Falls back to the stored localStorage token only as a last resort.
 * Returns null if no valid session exists.
 */
async function getAccessToken(): Promise<string | null> {
  // Always prefer the live Supabase session (handles auto-refresh internally)
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token ?? null;

  if (token) {
    // Keep the localStorage copy in sync for legacy code paths
    localStorage.setItem("tams360_token", token);
    return token;
  }

  // Fall back to the stored token (handles cases where the session hasn't loaded yet)
  return localStorage.getItem("tams360_token");
}

function redirectToLogin(delay = 100) {
  localStorage.removeItem("tams360_token");
  localStorage.removeItem("tams360_user");
  setTimeout(() => {
    window.location.href = "/login";
  }, delay);
}

/**
 * Makes an authenticated API request.
 * Automatically refreshes an expired JWT once before giving up.
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const {
    useAuth = true,
    skipErrorToast = false,
    ...fetchOptions
  } = options;

  // Prepare headers
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...fetchOptions.headers,
  };

  if (useAuth) {
    const token = await getAccessToken();
    if (!token) {
      console.warn("⚠️ No authentication token found. Redirecting to login...");
      redirectToLogin();
      throw new Error("No authentication token");
    }
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    headers["Authorization"] = `Bearer ${publicAnonKey}`;
  }

  try {
    let response = await fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    // On 401, attempt a token refresh and retry once before bailing out
    if (response.status === 401 && useAuth) {
      console.warn("⚠️ Got 401 – attempting token refresh...");
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

      if (!refreshError && refreshData?.session?.access_token) {
        const refreshedToken = refreshData.session.access_token;
        localStorage.setItem("tams360_token", refreshedToken);

        response = await fetch(`${API_URL}${endpoint}`, {
          ...fetchOptions,
          headers: {
            ...headers,
            Authorization: `Bearer ${refreshedToken}`,
          },
        });
      }
    }

    // Handle authentication errors after retry
    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({}));
      console.log("🔒 Session expired after refresh attempt, logging out...");
      toast.error("Your session has expired. Please log in again.");
      redirectToLogin(1000);
      throw new Error("Session expired");
    }

    // Handle other HTTP errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));

      if (!skipErrorToast) {
        toast.error(errorData.error || errorData.message || "Request failed");
      }

      throw new Error(errorData.error || errorData.message || "Request failed");
    }

    // Parse and return JSON response
    return await response.json();
  } catch (error: any) {
    if (error.message !== "Session expired") {
      console.error("API request failed:", error);

      if (!skipErrorToast && !error.message?.includes("Failed to fetch")) {
        toast.error(error.message || "Network error");
      }
    }

    throw error;
  }
}

/**
 * Convenience methods for different HTTP methods
 */
export const api = {
  get: <T = any>(endpoint: string, options?: ApiOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "GET" }),

  post: <T = any>(endpoint: string, data?: any, options?: ApiOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T = any>(endpoint: string, data?: any, options?: ApiOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: ApiOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "DELETE" }),
};