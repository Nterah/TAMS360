import { projectId } from '../../../utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

/**
 * Gets the stored auth token without validation
 * Returns the token or null if not found
 */
export function getStoredToken(): string | null {
  const storedToken = localStorage.getItem('tams360_token');
  
  if (!storedToken) {
    console.warn('No auth token found in localStorage');
    return null;
  }

  return storedToken;
}

/**
 * Makes an authenticated API request with automatic token handling
 */
export async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getStoredToken();
  
  if (!token) {
    throw new Error('AUTH_REQUIRED');
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  // If we get a 401, the token is invalid or expired
  if (response.status === 401) {
    console.warn('Received 401 - token is invalid or expired');
    clearAuth();
    throw new Error('AUTH_EXPIRED');
  }

  return response;
}

/**
 * Clears authentication data from localStorage
 */
export function clearAuth(): void {
  localStorage.removeItem('tams360_token');
  localStorage.removeItem('tams360_user');
}

/**
 * Checks if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!localStorage.getItem('tams360_token');
}

/**
 * Gets the current user from localStorage
 */
export function getCurrentUser(): any | null {
  const userJson = localStorage.getItem('tams360_user');
  if (!userJson) return null;
  
  try {
    return JSON.parse(userJson);
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
}