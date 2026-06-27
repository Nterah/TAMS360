import { projectId } from '../../../utils/supabase/info';
import { supabase } from '../../lib/supabaseClient';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

/**
 * Authenticated fetch wrapper that handles token management and redirects.
 * Uses the live Supabase session (with auto-refresh) rather than the stale
 * localStorage copy to avoid "Invalid JWT" errors on mobile / long sessions.
 */
export async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  // Prefer the live Supabase session token (handles auto-refresh)
  const { data: sessionData } = await supabase.auth.getSession();
  let token = sessionData?.session?.access_token ?? localStorage.getItem('tams360_token');

  if (!token) {
    console.error('No auth token found');
    window.location.href = '/login';
    throw new Error('AUTH_REQUIRED');
  }

  // Keep localStorage in sync
  localStorage.setItem('tams360_token', token);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  let response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

  // On 401, try a token refresh and retry once
  if (response.status === 401) {
    console.warn('Got 401 – attempting token refresh...');
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

    if (!refreshError && refreshData?.session?.access_token) {
      token = refreshData.session.access_token;
      localStorage.setItem('tams360_token', token);

      response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${token}` },
      });
    }
  }

  if (response.status === 401) {
    console.error('Authentication failed after refresh – clearing session');
    localStorage.removeItem('tams360_token');
    localStorage.removeItem('tams360_user');
    window.location.href = '/login';
    throw new Error('AUTH_REQUIRED');
  }

  return response;
}

/**
 * Get the current authentication token
 */
export function getAuthToken(): string | null {
  return localStorage.getItem('tams360_token');
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

/**
 * Get the current user from localStorage
 */
export function getCurrentUser() {
  const userJson = localStorage.getItem('tams360_user');
  if (!userJson) return null;
  
  try {
    return JSON.parse(userJson);
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
}
