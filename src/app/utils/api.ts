/**
 * Centralized API Utility for TAMS360
 * Handles authentication, token expiration, and error handling
 */

import { toast } from "sonner";
import { projectId, publicAnonKey } from "/utils/supabase/info";

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

interface ApiOptions extends RequestInit {
  useAuth?: boolean; // Whether to include auth token (default: true)
  skipErrorToast?: boolean; // Whether to skip showing error toast (default: false)
}

/**
 * Makes an authenticated API request
 * Automatically handles token expiration and logout
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

  // Add authentication token if needed
  if (useAuth) {
    const token = localStorage.getItem("tams360_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    } else {
      headers["Authorization"] = `Bearer ${publicAnonKey}`;
    }
  } else {
    headers["Authorization"] = `Bearer ${publicAnonKey}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    // Handle authentication errors
    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({}));
      
      // Check if it's a token expiration error
      if (
        errorData.error === "Invalid JWT" ||
        errorData.error === "Invalid session" ||
        errorData.message === "Invalid JWT" ||
        errorData.message === "Invalid session"
      ) {
        console.log("🔒 Session expired, logging out...");
        
        // Clear stored credentials
        localStorage.removeItem("tams360_token");
        localStorage.removeItem("tams360_user");
        
        // Show toast
        toast.error("Your session has expired. Please log in again.");
        
        // Redirect to login
        setTimeout(() => {
          window.location.href = "/login";
        }, 1000);
        
        throw new Error("Session expired");
      }
      
      // Other 401 errors
      if (!skipErrorToast) {
        toast.error(errorData.error || "Unauthorized");
      }
      throw new Error(errorData.error || "Unauthorized");
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
    // Network errors or other issues
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
