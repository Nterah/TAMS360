import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../App";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { 
  ArrowLeft, 
  MapPin, 
  Calendar,
  Package,
  FileText,
  Image as ImageIcon,
  Loader2,
  Edit,
  ClipboardCheck,
  Navigation2,
  AlertCircle
} from "lucide-react";
import { projectId } from "../../../../utils/supabase/info";
import { resolveAssetCoordinates } from "../../utils/assetDisplay";

interface AssetPhoto {
  photo_id?: string;
  url?: string;
  signedUrl?: string;
  file_path?: string;
  file_name?: string;
  name?: string;
  caption?: string;
  source?: string;
  bucket_id?: string;
}

interface Asset {
  id: string;
  asset_ref: string;
  asset_type: string;
  asset_type_name: string;
  description: string;
  condition: string;
  installation_date: string;
  latitude: number;
  longitude: number;
  location: string;
  road_name?: string;
  chainage?: number;
  side?: string;
  photos?: string[];
  photo_objects?: AssetPhoto[];
  notes?: string;
  last_inspection_date?: string;
  ci_score?: number;
}

export default function MobileAssetDetailPage() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const { accessToken } = useContext(AuthContext);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [assetPhotos, setAssetPhotos] = useState<AssetPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const assetCoordinates = asset ? resolveAssetCoordinates(asset, { rejectNullIsland: true }) : null;

  useEffect(() => {
    fetchAssetDetails();
  }, [assetId]);

  const normalisePhotoList = (rawPhotos: any[] = [], rawObjects: any[] = []): AssetPhoto[] => {
    const combined: AssetPhoto[] = [];

    for (const photo of rawObjects || []) {
      const url = photo?.url || photo?.signedUrl;
      if (url) combined.push(photo);
    }

    for (const photo of rawPhotos || []) {
      if (typeof photo === "string" && photo) {
        combined.push({ url: photo, signedUrl: photo, caption: "Asset Photo" });
      } else if (photo?.url || photo?.signedUrl) {
        combined.push(photo);
      }
    }

    const seen = new Set<string>();
    return combined.filter((photo) => {
      const key = photo.url || photo.signedUrl || photo.file_path || photo.file_name || "";
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const fetchResolvedPhotos = async (apiUrl: string) => {
    // Load photos from localStorage first (set during asset creation)
    const localPhotos: AssetPhoto[] = [];
    if (assetId) {
      try {
        const stored: string[] = JSON.parse(localStorage.getItem(`asset_photos_${assetId}`) || "[]");
        stored.forEach((urlOrPath) => {
          const url = urlOrPath.startsWith("http")
            ? urlOrPath
            : `https://${projectId}.supabase.co/storage/v1/object/public/tams360-inspection-photos/${urlOrPath}`;
          localPhotos.push({ url, signedUrl: url, caption: "Asset Photo" });
        });
      } catch { /* ignore */ }
    }

    if (!assetId || !accessToken) {
      if (localPhotos.length > 0) {
        setAssetPhotos((prev) => normalisePhotoList([...prev, ...localPhotos], []));
      }
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/assets/${assetId}/photos`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        console.warn("Failed to fetch resolved asset photos", await response.text());
        // Still show locally-stored photos if API fails
        if (localPhotos.length > 0) {
          setAssetPhotos((prev) => normalisePhotoList([...prev, ...localPhotos], []));
        }
        return;
      }

      const data = await response.json();
      const apiPhotos = normalisePhotoList(data.photos || [], []);
      // Merge API photos with locally-stored ones (API signs URLs, local is the fallback)
      setAssetPhotos(normalisePhotoList([...apiPhotos, ...localPhotos], []));
    } catch (error) {
      console.error("Error fetching resolved photos:", error);
      if (localPhotos.length > 0) {
        setAssetPhotos((prev) => normalisePhotoList([...prev, ...localPhotos], []));
      }
    }
  };

  const fetchAssetDetails = async () => {
    const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

    try {
      const response = await fetch(`${API_URL}/assets/${assetId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const nextAsset = data.asset;
        setAsset(nextAsset);
        // Convert photo_urls paths to full public URLs so they display immediately
        const photoUrlsAsObjects = (nextAsset?.photo_urls || []).map((p: string) => {
          const url = p.startsWith("http")
            ? p
            : `https://${projectId}.supabase.co/storage/v1/object/public/tams360-inspection-photos/${p}`;
          return { url, signedUrl: url, caption: "Asset Photo" };
        });
        setAssetPhotos(normalisePhotoList(
          [...(nextAsset?.photos || []), ...photoUrlsAsObjects],
          nextAsset?.photo_objects || []
        ));
        await fetchResolvedPhotos(API_URL);
      } else {
        console.error("Failed to fetch asset details");
      }
    } catch (error) {
      console.error("Error fetching asset:", error);
    } finally {
      setLoading(false);
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition?.toLowerCase()) {
      case "excellent":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "good":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "fair":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "poor":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-ZA", { 
      month: "short", 
      day: "numeric", 
      year: "numeric" 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500">Asset not found</p>
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            className="mt-4"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const photoItems = assetPhotos.length > 0
    ? assetPhotos
    : normalisePhotoList(asset.photos || [], asset.photo_objects || []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Fixed Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-slate-800 border-b shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">{asset.asset_ref}</h1>
              <p className="text-xs text-slate-500">{asset.asset_type_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getConditionColor(asset.condition)}>
              {asset.condition}
            </Badge>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(`/mobile/assets/${assetId}/edit`)}
              title="Edit Asset"
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Photos */}
        {photoItems.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Photos ({photoItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {photoItems.map((photo, index) => {
                  const src = photo.url || photo.signedUrl || "";
                  return (
                    <div key={`${photo.file_path || src || index}`} className="space-y-1">
                      <img
                        src={src}
                        alt={photo.caption || `Asset photo ${index + 1}`}
                        className="w-full aspect-square object-cover rounded-lg border bg-slate-100"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                      {(photo.caption || photo.source) && (
                        <p className="text-[10px] text-slate-500 truncate">
                          {photo.caption || photo.source}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Basic Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Asset Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-500 mb-1">Asset Ref</p>
                <p className="text-sm font-medium font-mono">{(asset as any).asset_ref}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Type</p>
                <p className="text-sm font-medium">{(asset as any).asset_type_name || asset.asset_type}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Status</p>
                <p className="text-sm font-medium">{(asset as any).status_name || (asset as any).status || "Active"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Condition</p>
                <Badge className={getConditionColor((asset as any).condition_name || asset.condition)} variant="outline">
                  {(asset as any).condition_name || (asset as any).latest_condition || (asset as any).metadata?.condition || asset.condition || "N/A"}
                </Badge>
              </div>
              {asset.ci_score && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">CI Score</p>
                  <p className="text-sm font-bold text-primary">{asset.ci_score}</p>
                </div>
              )}
              {((asset as any).useful_life_years != null) && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Expected Life</p>
                  <p className="text-sm font-medium">{(asset as any).useful_life_years} yrs</p>
                </div>
              )}
            </div>

            {((asset as any).asset_name || (asset as any).metadata?.asset_name || asset.description) && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Name / Description</p>
                <p className="text-sm">{(asset as any).asset_name || (asset as any).metadata?.asset_name || asset.description}</p>
              </div>
            )}

            {((asset as any).install_date || asset.installation_date) && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Installation Date</p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <p className="text-sm">{formatDate((asset as any).install_date || asset.installation_date)}</p>
                </div>
              </div>
            )}

            {asset.last_inspection_date && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Last Inspection</p>
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-slate-400" />
                  <p className="text-sm">{formatDate(asset.last_inspection_date)}</p>
                </div>
              </div>
            )}

            {asset.notes && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Notes</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{asset.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {asset.location && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Address</p>
                <p className="text-sm">{asset.location}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {((asset as any).region) && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Region</p>
                  <p className="text-sm font-medium">{(asset as any).region}</p>
                </div>
              )}
              {((asset as any).depot) && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Depot</p>
                  <p className="text-sm font-medium">{(asset as any).depot}</p>
                </div>
              )}
              {(asset.road_name || (asset as any).road_number) && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Road</p>
                  <p className="text-sm font-medium">{asset.road_name || (asset as any).road_number}</p>
                </div>
              )}
              {((asset as any).km_marker != null || asset.chainage != null) && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">KM Marker</p>
                  <p className="text-sm font-medium">{(asset as any).km_marker ?? asset.chainage} km</p>
                </div>
              )}
              {asset.side && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Side</p>
                  <p className="text-sm font-medium">{asset.side}</p>
                </div>
              )}
            </div>

            {assetCoordinates && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Coordinates</p>
                <p className="text-xs font-mono text-slate-600 dark:text-slate-400">
                  {assetCoordinates.lat.toFixed(6)}, {assetCoordinates.lng.toFixed(6)}
                </p>
                {((asset as any).end_latitude && (asset as any).end_longitude) && (
                  <p className="text-xs font-mono text-slate-500 mt-1">
                    End: {Number((asset as any).end_latitude).toFixed(6)}, {Number((asset as any).end_longitude).toFixed(6)}
                  </p>
                )}
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/mobile/map?asset=${asset.id}`)}
                    className="gap-2 flex-1"
                  >
                    <MapPin className="w-4 h-4" />
                    View on Map
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      window.open(
                        `https://www.google.com/maps/dir/?api=1&destination=${assetCoordinates.lat},${assetCoordinates.lng}`,
                        "_blank"
                      );
                    }}
                    className="gap-2 flex-1"
                  >
                    <Navigation2 className="w-4 h-4" />
                    Navigate
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ownership & Financial */}
        {((asset as any).owner_entity || (asset as any).owned_by || (asset as any).owner ||
          (asset as any).maintenance_responsibility || (asset as any).responsible_party ||
          (asset as any).installer_name || (asset as any).installer ||
          (asset as any).replacement_value || (asset as any).purchase_price || (asset as any).installation_cost) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4" />
                Ownership & Financial
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {((asset as any).owner_entity || (asset as any).owned_by || (asset as any).owner) && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Owner</p>
                    <p className="text-sm font-medium">{(asset as any).owner_entity || (asset as any).owned_by || (asset as any).owner}</p>
                  </div>
                )}
                {((asset as any).maintenance_responsibility || (asset as any).responsible_party) && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Responsible Party</p>
                    <p className="text-sm font-medium">{(asset as any).maintenance_responsibility || (asset as any).responsible_party}</p>
                  </div>
                )}
                {((asset as any).installer_name || (asset as any).installer) && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Installer</p>
                    <p className="text-sm font-medium">{(asset as any).installer_name || (asset as any).installer}</p>
                  </div>
                )}
                {((asset as any).replacement_value) && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Replacement Value</p>
                    <p className="text-sm font-bold">R {Number((asset as any).replacement_value).toLocaleString()}</p>
                  </div>
                )}
                {((asset as any).purchase_price || (asset as any).installation_cost) && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Installation Cost</p>
                    <p className="text-sm font-medium">R {Number((asset as any).purchase_price || (asset as any).installation_cost).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Additional Asset Details */}
        {(asset as any).metadata && (() => {
          const metaFieldLabels: Record<string, string> = {
            mounting_type: "Mounting Type",
            number_of_posts_supports: "No. of Posts / Supports",
            number_of_beams: "No. of Beams",
            width_m: "Width (m)",
            length_m: "Length (m)",
            height_m: "Height (m)",
            orientation_position: "Orientation / Position",
          };
          const entries = Object.entries(metaFieldLabels).filter(
            ([k]) => (asset as any).metadata[k] != null && (asset as any).metadata[k] !== ""
          );
          if (entries.length === 0) return null;
          return (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Additional Asset Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {entries.map(([key, label]) => (
                    <div key={key}>
                      <p className="text-xs text-slate-500 mb-1">{label}</p>
                      <p className="text-sm font-medium">{String((asset as any).metadata[key])}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            className="flex-1 gap-2"
            onClick={() => {
              const assetId = (asset as any).asset_id || asset.id;
              // Store asset in localStorage so NewInspectionPage can pre-populate instantly
              try {
                localStorage.setItem("pending_inspection_asset", JSON.stringify({
                  ...asset,
                  asset_id: assetId,
                  id: assetId,
                }));
              } catch { /* ignore */ }
              navigate(`/mobile/inspections/new?asset=${assetId}`);
            }}
          >
            <ClipboardCheck className="w-4 h-4" />
            New Inspection
          </Button>
        </div>
      </div>
    </div>
  );
}
