import type { OfflineAsset } from "./offlineSync";

type AssetLike = {
  id?: string;
  asset_id?: string;
  asset_ref?: string;
};

export function readPendingOfflineAssets(): OfflineAsset[] {
  try {
    const stored = localStorage.getItem("offline_assets");
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to read offline assets from localStorage:", error);
    return [];
  }
}

export function removePendingOfflineAsset(assetId: string) {
  const current = readPendingOfflineAssets();
  const remaining = current.filter((asset: any) => String(asset.id) !== String(assetId));
  localStorage.setItem("offline_assets", JSON.stringify(remaining));
}

export function normalisePendingOfflineAssets(offlineAssets: OfflineAsset[]) {
  return offlineAssets.map((asset, index) => ({
    id: asset.id,
    asset_id: asset.id,
    asset_ref: asset.assetReference || `OFFLINE-${index + 1}`,
    asset_type_name: asset.assetType || "Unknown",
    asset_type: asset.assetType || "Unknown",
    description: asset.description || asset.assetReference || "Pending offline asset",
    latitude: Number(asset.latitude || 0),
    longitude: Number(asset.longitude || 0),
    gps_lat: Number(asset.latitude || 0),
    gps_lng: Number(asset.longitude || 0),
    condition: asset.condition || "Good",
    status: asset.status || "Active",
    status_name: "Pending Sync",
    region: asset.region || null,
    depot: asset.depot || null,
    ward: asset.ward || null,
    road_number: asset.roadName || null,
    road_name: asset.roadSubsection
      ? `${asset.roadName || ""}${asset.roadSubsection}`
      : asset.roadName || null,
    road_subsection: asset.roadSubsection || null,
    road_side: asset.roadSide || null,
    owner_entity: asset.owner || null,
    maintenance_responsibility: asset.responsibleParty || null,
    notes: asset.notes || "",
    created_at: asset.capturedAt || new Date().toISOString(),
    install_date: null,
    replacement_value:
      asset.replacementValue === "" || asset.replacementValue === undefined || asset.replacementValue === null
        ? null
        : Number(asset.replacementValue),
    useful_life_years:
      asset.expectedLife === "" || asset.expectedLife === undefined || asset.expectedLife === null
        ? null
        : Number(asset.expectedLife),
    photo_urls: Array.isArray((asset as any).photos) ? (asset as any).photos : [],
    sync_status: "pending",
    is_offline_pending: true,
  }));
}

export function mergePendingOfflineAssets<T extends AssetLike>(serverAssets: T[]) {
  const pendingAssets = normalisePendingOfflineAssets(readPendingOfflineAssets());
  const existingRefs = new Set(
    serverAssets
      .map((asset) => String(asset.asset_ref || "").trim().toLowerCase())
      .filter(Boolean)
  );

  const pendingOnly = pendingAssets.filter(
    (asset) => !existingRefs.has(String(asset.asset_ref || "").trim().toLowerCase())
  );

  return {
    assets: [...pendingOnly, ...serverAssets],
    pendingCount: pendingOnly.length,
  };
}
