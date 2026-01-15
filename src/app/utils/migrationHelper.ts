import { toast } from "sonner";

/**
 * Check if an error response indicates that organization migration is required
 */
export function requiresMigration(error: any): boolean {
  if (typeof error === 'object' && error !== null) {
    return error.action_required === 'recreate_organization' || 
           error.action_required === 'migrate_organization' ||
           (error.error && typeof error.error === 'string' && 
            error.error.toLowerCase().includes('organization data format is outdated'));
  }
  return false;
}

/**
 * Handle migration-required error by showing toast and redirecting to migration page
 */
export function handleMigrationRequired(navigate: (path: string) => void): void {
  toast.error("Organization migration required", {
    description: "Your organization needs to be updated to the latest format. Redirecting...",
    duration: 3000,
  });
  
  setTimeout(() => {
    navigate('/migrate-organization');
  }, 1000);
}

/**
 * Wrapper for API calls that handles migration errors automatically
 */
export async function apiCallWithMigrationCheck<T>(
  apiCall: () => Promise<Response>,
  navigate: (path: string) => void,
  customErrorHandler?: (error: any) => void
): Promise<T> {
  try {
    const response = await apiCall();
    const data = await response.json();
    
    if (!response.ok) {
      if (requiresMigration(data)) {
        handleMigrationRequired(navigate);
        throw new Error('Migration required');
      }
      
      if (customErrorHandler) {
        customErrorHandler(data);
      }
      
      throw new Error(data.error || 'Request failed');
    }
    
    return data as T;
  } catch (error: any) {
    // Re-throw the error for the caller to handle
    throw error;
  }
}
