/**
 * Offline Cache Utility for TAMS360
 * Uses IndexedDB via localForage for caching assets, inspections, and component data
 */

import localforage from 'localforage';

// Initialize localForage instances for different data types
const assetsCache = localforage.createInstance({
  name: 'tams360',
  storeName: 'assets_cache'
});

const inspectionsCache = localforage.createInstance({
  name: 'tams360',
  storeName: 'inspections_cache'
});

const inspectionDetailsCache = localforage.createInstance({
  name: 'tams360',
  storeName: 'inspection_details_cache'
});

const metadataCache = localforage.createInstance({
  name: 'tams360',
  storeName: 'metadata_cache'
});

export interface CacheMetadata {
  lastSync: string;
  version: number;
  recordCount: number;
}

/**
 * Assets Cache
 */
export const AssetsCacheService = {
  async getAll(): Promise<any[]> {
    try {
      const cached = await assetsCache.getItem<any[]>('assets_list');
      return cached || [];
    } catch (error) {
      console.error('Error reading assets from cache:', error);
      return [];
    }
  },

  async setAll(assets: any[]): Promise<void> {
    try {
      await assetsCache.setItem('assets_list', assets);
      await metadataCache.setItem('assets_metadata', {
        lastSync: new Date().toISOString(),
        version: 1,
        recordCount: assets.length,
      } as CacheMetadata);
    } catch (error) {
      console.error('Error caching assets:', error);
    }
  },

  async getMetadata(): Promise<CacheMetadata | null> {
    try {
      return await metadataCache.getItem<CacheMetadata>('assets_metadata');
    } catch (error) {
      console.error('Error reading assets metadata:', error);
      return null;
    }
  },

  async clear(): Promise<void> {
    await assetsCache.clear();
  }
};

/**
 * Inspections List Cache
 */
export const InspectionsCacheService = {
  async getAll(): Promise<any[]> {
    try {
      const cached = await inspectionsCache.getItem<any[]>('inspections_list');
      return cached || [];
    } catch (error) {
      console.error('Error reading inspections from cache:', error);
      return [];
    }
  },

  async setAll(inspections: any[]): Promise<void> {
    try {
      await inspectionsCache.setItem('inspections_list', inspections);
      await metadataCache.setItem('inspections_metadata', {
        lastSync: new Date().toISOString(),
        version: 1,
        recordCount: inspections.length,
      } as CacheMetadata);
    } catch (error) {
      console.error('Error caching inspections:', error);
    }
  },

  async getMetadata(): Promise<CacheMetadata | null> {
    try {
      return await metadataCache.getItem<CacheMetadata>('inspections_metadata');
    } catch (error) {
      console.error('Error reading inspections metadata:', error);
      return null;
    }
  },

  async clear(): Promise<void> {
    await inspectionsCache.clear();
  }
};

/**
 * Inspection Details Cache (individual inspection records with components)
 * Caches the last N inspections opened for offline viewing
 */
export const InspectionDetailsCacheService = {
  async get(inspectionId: string): Promise<any | null> {
    try {
      return await inspectionDetailsCache.getItem<any>(`inspection_${inspectionId}`);
    } catch (error) {
      console.error(`Error reading inspection ${inspectionId} from cache:`, error);
      return null;
    }
  },

  async set(inspectionId: string, inspection: any): Promise<void> {
    try {
      await inspectionDetailsCache.setItem(`inspection_${inspectionId}`, inspection);
      
      // Track which inspections are cached
      const cachedIds = await this.getCachedIds();
      if (!cachedIds.includes(inspectionId)) {
        cachedIds.push(inspectionId);
        // Keep only last 20 inspections to avoid storage bloat
        if (cachedIds.length > 20) {
          const oldestId = cachedIds.shift();
          if (oldestId) {
            await inspectionDetailsCache.removeItem(`inspection_${oldestId}`);
          }
        }
        await metadataCache.setItem('cached_inspection_ids', cachedIds);
      }
    } catch (error) {
      console.error(`Error caching inspection ${inspectionId}:`, error);
    }
  },

  async getCachedIds(): Promise<string[]> {
    try {
      const ids = await metadataCache.getItem<string[]>('cached_inspection_ids');
      return ids || [];
    } catch (error) {
      console.error('Error reading cached inspection IDs:', error);
      return [];
    }
  },

  async clear(): Promise<void> {
    await inspectionDetailsCache.clear();
    await metadataCache.removeItem('cached_inspection_ids');
  }
};

/**
 * Check if we're currently offline
 */
export function isOffline(): boolean {
  return !navigator.onLine;
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  await AssetsCacheService.clear();
  await InspectionsCacheService.clear();
  await InspectionDetailsCacheService.clear();
  await metadataCache.clear();
}
