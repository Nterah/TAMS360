import type { OfflineAsset } from "./offlineSync";

export const ASSETS_CHANGED_EVENT = "tams360:assets-changed";
const RECENT_VISIBLE_ASSETS_KEY = "recent_visible_assets";
const MAX_RECENT_VISIBLE_ASSETS = 50;

type AssetLike = {
  id?: string;
  asset_id?: string;
  asset_ref?: string;
};

type RecentVisibleAsset = AssetLike & Record<string, any>;

function normaliseIdentity(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function collectAssetIdentifiers(asset: AssetLike): string[] {
  const identifiers = [
    normaliseIdentity(asset.asset_id),
    normaliseIdentity(asset.id),
    normaliseIdentity(asset.asset_ref),
  ].filter(Boolean);

  return Array.from(new Set(identifiers));
}

function readRecentVisibleAssets(): RecentVisibleAsset[] {
  try {
    const stored = localStorage.getItem(RECENT_VISIBLE_ASSETS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to read recent visible assets from localStorage:", error);
    return [];
  }
}

function writeRecentVisibleAssets(assets: RecentVisibleAsset[]) {
  localStorage.setItem(
    RECENT_VISIBLE_ASSETS_KEY,
    JSON.stringify(assets.slice(0, MAX_RECENT_VISIBLE_ASSETS))
  );
}

export function notifyAssetsChanged() {
  window.dispatchEvent(new CustomEvent(ASSETS_CHANGED_EVENT));
}

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

export function writePendingOfflineAssets(offlineAssets: OfflineAsset[]) {
  localStorage.setItem("offline_assets", JSON.stringify(offlineAssets));
  notifyAssetsChanged();
}

export function addPendingOfflineAsset(asset: OfflineAsset) {
  const current = readPendingOfflineAssets();
  writePendingOfflineAssets([...current, asset]);
}

export function removePendingOfflineAsset(assetId: string) {
  const current = readPendingOfflineAssets();
  const remaining = current.filter((asset: any) => String(asset.id) !== String(assetId));
  writePendingOfflineAssets(remaining);
}

export function storeRecentVisibleAsset(asset: RecentVisibleAsset) {
  const identifiers = new Set(collectAssetIdentifiers(asset));
  if (identifiers.size === 0) return;

  const current = readRecentVisibleAssets();
  const remaining = current.filter((currentAsset) =>
    collectAssetIdentifiers(currentAsset).every((identifier) => !identifiers.has(identifier))
  );

  writeRecentVisibleAssets([asset, ...remaining]);
  notifyAssetsChanged();
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
  const recentVisibleAssets = readRecentVisibleAssets();
  const existingIdentifiers = new Set(
    serverAssets.flatMap((asset) => collectAssetIdentifiers(asset))
  );
  const seenPendingIdentifiers = new Set<string>();

  const pendingOnly = pendingAssets.filter((asset) => {
    const identifiers = collectAssetIdentifiers(asset);
    if (
      identifiers.some((identifier) => existingIdentifiers.has(identifier) || seenPendingIdentifiers.has(identifier))
    ) {
      return false;
    }

    identifiers.forEach((identifier) => seenPendingIdentifiers.add(identifier));
    return true;
  });

  const seenRecentIdentifiers = new Set(existingIdentifiers);
  pendingOnly.forEach((asset) => {
    collectAssetIdentifiers(asset).forEach((identifier) => seenRecentIdentifiers.add(identifier));
  });

  const recentOnly = recentVisibleAssets.filter((asset) => {
    const identifiers = collectAssetIdentifiers(asset);
    if (identifiers.some((identifier) => seenRecentIdentifiers.has(identifier))) {
      return false;
    }

    identifiers.forEach((identifier) => seenRecentIdentifiers.add(identifier));
    return true;
  });

  return {
    assets: [...pendingOnly, ...recentOnly, ...serverAssets],
    pendingCount: pendingOnly.length + recentOnly.length,
  };
}
