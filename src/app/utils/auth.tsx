import { projectId } from '../../../utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

/**
 * Authenticated fetch wrapper that handles token management and redirects
 * @param endpoint - API endpoint (e.g., '/admin/users-v2')
 * @param options - Fetch options
 * @returns Response promise
 */
export async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get token from localStorage
  const token = localStorage.getItem('tams360_token');

  // If no token, redirect to login
  if (!token) {
    console.error('No auth token found in localStorage');
    window.location.href = '/login';
    throw new Error('AUTH_REQUIRED');
  }

  // Prepare headers
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  // Make the request
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // If unauthorized, clear token and redirect to login
  if (response.status === 401) {
    console.error('Authentication failed - token invalid or expired');
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
