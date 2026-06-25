/**
 * TAMS360 Offline Sync Utility
 * Handles synchronization of offline-captured data to the server
 */

import { projectId } from "../../../utils/supabase/info";
import { fetchWithSessionAuth } from "./authSession";
import { storeRecentVisibleAsset, writePendingOfflineAssets } from "./offlineAssets";

export interface OfflineAsset {
  id: string;
  assetReference?: string;
  assetType: string;
  description: string;
  latitude: string;
  longitude: string;
  condition: string;
  notes: string;
  photos: { name: string; data: string }[];
  capturedAt: string;
  capturedBy: string;
  region?: string;
  depot?: string;
  ward?: string;
  roadName?: string;
  roadSubsection?: string;
  direction?: string;
  roadSide?: string;
  owner?: string;
  responsibleParty?: string;
  status?: string;
  replacementValue?: string | number;
  installationCost?: string | number;
  expectedLife?: string | number;
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
export async function syncOfflineAssets(accessToken?: string | null): Promise<SyncResult> {
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

  const successfulIds = new Set<string>();

  const toNullableNumber = (value: unknown) => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
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
          formData.append("bucket", "tams360-inspection-photos");
          formData.append("folderPath", asset.assetReference || asset.description || "offline-asset");

          const uploadResponse = await fetchWithSessionAuth(`${API_URL}/storage/upload`, {
            method: "POST",
            body: formData,
          }, {
            fallbackToken: accessToken ?? null,
          });

          if (uploadResponse.ok) {
            const { url, path } = await uploadResponse.json();
            photoUrls.push(path || url);
          }
        } catch (photoError) {
          console.warn("Failed to upload photo:", photoError);
        }
      }

      // Create asset on server
      const assetResponse = await fetchWithSessionAuth(`${API_URL}/assets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          asset_ref: asset.assetReference,
          referenceNumber: asset.assetReference,
          asset_type: asset.assetType,
          asset_type_name: asset.assetType,
          type: asset.assetType,
          description: asset.description,
          latitude: toNullableNumber(asset.latitude),
          longitude: toNullableNumber(asset.longitude),
          gps_lat: toNullableNumber(asset.latitude),
          gps_lng: toNullableNumber(asset.longitude),
          condition: asset.condition,
          notes: asset.notes,
          photo_urls: photoUrls,
          status: asset.status || "Active",
          region: asset.region || null,
          depot: asset.depot || null,
          ward: asset.ward || null,
          road_name: asset.roadSubsection ? `${asset.roadName || ""}${asset.roadSubsection}` : asset.roadName || null,
          road_number: asset.roadName || null,
          road_subsection: asset.roadSubsection || null,
          direction: asset.direction || null,
          road_side: asset.roadSide || null,
          owner: asset.owner || null,
          owner_entity: asset.owner || null,
          responsible_party: asset.responsibleParty || null,
          maintenance_responsibility: asset.responsibleParty || null,
          replacement_value: toNullableNumber(asset.replacementValue),
          purchase_price: toNullableNumber(asset.installationCost),
          useful_life_years: toNullableNumber(asset.expectedLife),
          capturedAt: asset.capturedAt,
          capturedBy: asset.capturedBy,
        }),
      }, {
        fallbackToken: accessToken ?? null,
      });

      if (assetResponse.ok) {
        const synced = await assetResponse.json().catch(() => ({}));
        const syncedAsset = synced?.asset || synced?.data || synced || {};
        storeRecentVisibleAsset({
          ...asset,
          ...syncedAsset,
          asset_ref: syncedAsset.asset_ref || asset.assetReference,
          asset_type: syncedAsset.asset_type || asset.assetType,
          asset_type_name: syncedAsset.asset_type_name || asset.assetType,
          gps_lat: syncedAsset.gps_lat ?? asset.latitude,
          gps_lng: syncedAsset.gps_lng ?? asset.longitude,
          latitude: syncedAsset.latitude ?? asset.latitude,
          longitude: syncedAsset.longitude ?? asset.longitude,
          road_name: syncedAsset.road_name || (asset.roadSubsection ? `${asset.roadName || ""}${asset.roadSubsection}` : asset.roadName || null),
          road_number: syncedAsset.road_number || asset.roadName || null,
          region_name: syncedAsset.region_name || asset.region || null,
          depot_name: syncedAsset.depot_name || asset.depot || null,
          ward_name: syncedAsset.ward_name || asset.ward || null,
          owner_name: syncedAsset.owner_name || asset.owner || null,
          status_name: syncedAsset.status_name || asset.status || "Active",
          latest_condition: syncedAsset.latest_condition || asset.condition,
        });
        result.synced++;
        successfulIds.add(asset.id);
      } else {
        const errorText = await assetResponse.text();
        result.failed++;
        result.errors.push(`Failed to sync asset ${asset.assetReference || asset.description}: ${errorText}`);
      }
    } catch (error) {
      result.failed++;
      result.errors.push(`Error syncing asset ${asset.assetReference || asset.description}: ${error}`);
    }
  }

  // Clear synced assets from local storage
  if (successfulIds.size > 0) {
    const remaining = offlineAssets.filter((asset) => !successfulIds.has(asset.id));
    writePendingOfflineAssets(remaining);
  }

  result.success = result.failed === 0;
  return result;
}

/**
 * Sync offline inspections to server
 */
export async function syncOfflineInspections(accessToken?: string | null): Promise<SyncResult> {
  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;
  const offlineInspections = JSON.parse(
    localStorage.getItem("offline_inspections") || "[]"
  );

  if (offlineInspections.length === 0) {
    return { success: true, synced: 0, failed: 0, errors: [] };
  }

  const result: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    errors: [],
  };

  const successfulIds = new Set<string>();

  for (const inspection of offlineInspections) {
    try {
      const response = await fetchWithSessionAuth(`${API_URL}/inspections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(inspection),
      }, {
        fallbackToken: accessToken ?? null,
      });

      if (response.ok) {
        result.synced++;
        successfulIds.add(inspection.id);
      } else {
        const errorText = await response.text();
        result.failed++;
        result.errors.push(`Failed to sync inspection ${inspection.inspection_id || inspection.id}: ${errorText}`);
      }
    } catch (error) {
      result.failed++;
      result.errors.push(`Error syncing inspection ${inspection.inspection_id || inspection.id}: ${error}`);
    }
  }

  if (successfulIds.size > 0) {
    const remaining = offlineInspections.filter((inspection: any) => !successfulIds.has(inspection.id));
    localStorage.setItem("offline_inspections", JSON.stringify(remaining));
  }

  result.success = result.failed === 0;
  return result;
}

/**
 * Sync all offline data
 */
export async function syncAllOfflineData(accessToken?: string | null): Promise<SyncResult> {
  const assetResult = await syncOfflineAssets(accessToken);
  const inspectionResult = await syncOfflineInspections(accessToken);

  return {
    success: assetResult.success && inspectionResult.success,
    synced: assetResult.synced + inspectionResult.synced,
    failed: assetResult.failed + inspectionResult.failed,
    errors: [...assetResult.errors, ...inspectionResult.errors],
  };
}
