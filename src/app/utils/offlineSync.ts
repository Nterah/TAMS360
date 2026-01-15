/**
 * TAMS360 Offline Sync Utility
 * Handles synchronization of offline-captured data to the server
 */

import { projectId } from "../../../utils/supabase/info";

export interface OfflineAsset {
  id: string;
  assetType: string;
  description: string;
  latitude: string;
  longitude: string;
  condition: string;
  notes: string;
  photos: { name: string; data: string }[];
  capturedAt: string;
  capturedBy: string;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

/**
 * Sync offline assets to server
 */
export async function syncOfflineAssets(accessToken: string): Promise<SyncResult> {
  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;
  const offlineAssets: OfflineAsset[] = JSON.parse(
    localStorage.getItem("offline_assets") || "[]"
  );

  if (offlineAssets.length === 0) {
    return { success: true, synced: 0, failed: 0, errors: [] };
  }

  const result: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    errors: [],
  };

  for (const asset of offlineAssets) {
    try {
      // Upload photos first
      const photoUrls: string[] = [];
      for (const photo of asset.photos) {
        try {
          // Convert base64 data URL to Blob
          const response = await fetch(photo.data);
          const blob = await response.blob();
          const file = new File([blob], photo.name, { type: blob.type });

          const formData = new FormData();
          formData.append("file", file);
          formData.append("bucket", "asset-photos");

          const uploadResponse = await fetch(`${API_URL}/storage/upload`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            body: formData,
          });

          if (uploadResponse.ok) {
            const { url } = await uploadResponse.json();
            photoUrls.push(url);
          }
        } catch (photoError) {
          console.warn("Failed to upload photo:", photoError);
        }
      }

      // Create asset on server
      const assetResponse = await fetch(`${API_URL}/assets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          asset_type: asset.assetType,
          description: asset.description,
          latitude: parseFloat(asset.latitude),
          longitude: parseFloat(asset.longitude),
          condition: asset.condition,
          notes: asset.notes,
          photo_urls: photoUrls,
          status: "Active",
        }),
      });

      if (assetResponse.ok) {
        result.synced++;
      } else {
        result.failed++;
        result.errors.push(`Failed to sync asset: ${asset.description}`);
      }
    } catch (error) {
      result.failed++;
      result.errors.push(`Error syncing asset: ${error}`);
    }
  }

  // Clear synced assets from local storage
  if (result.synced > 0) {
    const remaining = offlineAssets.slice(result.synced);
    localStorage.setItem("offline_assets", JSON.stringify(remaining));
  }

  result.success = result.failed === 0;
  return result;
}

/**
 * Sync offline inspections to server
 */
export async function syncOfflineInspections(accessToken: string): Promise<SyncResult> {
  // TODO: Implement inspection sync similar to assets
  const offlineInspections = JSON.parse(
    localStorage.getItem("offline_inspections") || "[]"
  );

  return {
    success: true,
    synced: 0,
    failed: 0,
    errors: [],
  };
}

/**
 * Sync all offline data
 */
export async function syncAllOfflineData(accessToken: string): Promise<SyncResult> {
  const assetResult = await syncOfflineAssets(accessToken);
  const inspectionResult = await syncOfflineInspections(accessToken);

  return {
    success: assetResult.success && inspectionResult.success,
    synced: assetResult.synced + inspectionResult.synced,
    failed: assetResult.failed + inspectionResult.failed,
    errors: [...assetResult.errors, ...inspectionResult.errors],
  };
}
