import { useState, useEffect, useContext } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../../App";
import { useTenant } from "../../contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import ComponentInspectionForm from "../inspections/ComponentInspectionForm";
import { 
  ArrowLeft, 
  Save, 
  Camera, 
  Upload, 
  X, 
  Image as ImageIcon, 
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Navigation2,
  WifiOff,
  Wifi
} from "lucide-react";
import { projectId } from "../../../../utils/supabase/info";
import { toast } from "sonner";
import { getCacheEntry, setCacheEntry } from "../../utils/dataCache";
import { fetchWithSessionAuth } from "../../utils/authSession";
import {
  buildGpsOverrideMessage,
  captureBestGpsFix,
  classifyGpsAccuracy,
  shouldRequireGpsSaveOverride,
} from "../../utils/gpsCapture";

export default function MobileNewInspectionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const assetFromUrl = searchParams.get("asset");
  const { user } = useContext(AuthContext);
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [assets, setAssets] = useState<any[]>([]);
  const [componentTemplate, setComponentTemplate] = useState<any>(null);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [repairThreshold, setRepairThreshold] = useState(50);

  const [assetSearch, setAssetSearch] = useState("");

  const [formData, setFormData] = useState({
    asset_id: "",
    inspection_date: new Date().toISOString().split("T")[0],
    inspector_name: user?.name || "",
    weather_conditions: "",
    overall_comments: "",
    component_scores: [],
    aggregates: {},
    latitude: null as number | null,
    longitude: null as number | null,
  });

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;
  const gpsAccuracyStatus = classifyGpsAccuracy(locationAccuracy);




  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    fetchAssets();
    fetchRepairThreshold();
    // Silently attempt location - completely suppress all errors
    try {
      if (navigator.geolocation) {
        getCurrentLocation();
      }
    } catch (error) {
      // Suppress completely
    }
  }, []);


  const fetchRepairThreshold = async () => {
    try {
      const response = await fetchWithSessionAuth(`${API_URL}/tenant/settings`);
      if (response.ok) {
        const data = await response.json();
        const threshold =
          data?.settings?.remedial_threshold ??
          data?.settings?.repair_threshold ??
          data?.tenant?.remedial_threshold ??
          data?.remedial_threshold;
        if (threshold !== undefined && threshold !== null && !Number.isNaN(Number(threshold))) {
          setRepairThreshold(Number(threshold));
        }
      }
    } catch (error) {
      // Keep default from tenant settings currently known as 50.
    }
  };

  const getCurrentLocation = async () => {
    try {
      if (!navigator.geolocation) {
        toast.error("Geolocation is not supported by your device");
        return;
      }

      setGettingLocation(true);
      toast.info("Waiting for an accurate GPS fix...", { id: "mobile-inspection-gps" });

      const fix = await captureBestGpsFix({
        targetAccuracyMeters: 50,
        sampleWindowMs: 25000,
        onProgress: (candidate) => setLocationAccuracy(candidate.accuracy),
      });

      setFormData((prev) => ({
        ...prev,
        latitude: fix.latitude,
        longitude: fix.longitude,
      }));
      setLocationAccuracy(fix.accuracy);

      const roundedAccuracy = Math.round(fix.accuracy);
      const accuracyStatus = classifyGpsAccuracy(fix.accuracy);

      if (accuracyStatus === "precise") {
        toast.success(`Location captured (±${roundedAccuracy}m accuracy)`, {
          id: "mobile-inspection-gps",
        });
      } else if (accuracyStatus === "acceptable") {
        toast.warning(`Location captured with acceptable accuracy (±${roundedAccuracy}m).`, {
          id: "mobile-inspection-gps",
          duration: 6000,
        });
      } else if (accuracyStatus === "review") {
        toast.warning(
          `Location captured, but GPS accuracy is low (±${roundedAccuracy}m). Confirm before saving.`,
          { id: "mobile-inspection-gps", duration: 7000 }
        );
      } else {
        toast.error(
          `GPS fix is very poor (±${roundedAccuracy}m). Retry before saving if possible.`,
          { id: "mobile-inspection-gps", duration: 8000 }
        );
      }
    } catch (error: any) {
      toast.error(error?.message || "Unable to capture your location", {
        id: "mobile-inspection-gps",
      });
    } finally {
      setGettingLocation(false);
    }
  };

  const applySelectedAsset = (asset: any) => {
    if (!asset) return;

    const selectedId = asset.asset_id || asset.id;

    setSelectedAsset(asset);

    setFormData((prev: any) => ({
      ...prev,
      asset_id: selectedId,
      asset_ref: asset.asset_ref || asset.asset_number || asset.reference_number,
      asset_type: asset.asset_type_name || asset.asset_type || asset.type_name,
    }));

    const typeName = asset.asset_type_name || asset.asset_type || asset.type_name;
    if (typeName) {
      fetchComponentTemplate(typeName);
    }
  };

  const fetchAssets = async () => {
    try {
      const assetParam = searchParams.get("asset");
      const normaliseAsset = (asset: any) => ({
        ...asset,
        id: asset.id || asset.asset_id,
        asset_id: asset.asset_id || asset.id,
        asset_ref: asset.asset_ref || asset.asset_number || asset.reference_number || "",
        asset_type_name: asset.asset_type_name || asset.asset_type || asset.type_name || asset.type || "",
        description: asset.description || asset.metadata?.description || "",
        latitude: asset.latitude ?? asset.gps_lat ?? null,
        longitude: asset.longitude ?? asset.gps_lng ?? null,
      });
      const extractAssetList = (result: any) =>
        Array.isArray(result) ? result :
        Array.isArray(result?.assets) ? result.assets :
        Array.isArray(result?.data) ? result.data :
        Array.isArray(result?.rows) ? result.rows :
        Array.isArray(result?.items) ? result.items :
        [];

      // === FAST PATH 1: fetch specific asset directly — no waiting for full list ===
      if (assetParam) {
        // Check pending_inspection_asset in localStorage first
        try {
          const stored = localStorage.getItem("pending_inspection_asset");
          if (stored) {
            const pendingAsset = JSON.parse(stored);
            const pendingId = pendingAsset.asset_id || pendingAsset.id;
            if (String(pendingId) === String(assetParam)) {
              applySelectedAsset({ ...pendingAsset, asset_id: pendingId, id: pendingId });
            }
          }
        } catch { /* ignore */ }

        // Check cache first
        const cached = getCacheEntry<{ assets: any[]; total: number }>("assets_list_v2");
        if (cached?.assets) {
          const cachedAssets = cached.assets.map(normaliseAsset);
          setAssets(cachedAssets);
          const match = cachedAssets.find((a: any) =>
            String(a.asset_id || a.id) === String(assetParam)
          );
          if (match) {
            applySelectedAsset(match);
            // Still refresh list in background but asset is already selected
            _refreshAssetListInBackground(normaliseAsset, extractAssetList);
            return;
          }
        }

        // Fetch the single asset immediately — much faster than full list
        fetchWithSessionAuth(`${API_URL}/assets/${assetParam}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (!d) return;
            const a = d.asset || d.data || d;
            applySelectedAsset(normaliseAsset(a));
          })
          .catch(() => {});
      } else {
        // No asset param — serve cache immediately
        const cached = getCacheEntry<{ assets: any[]; total: number }>("assets_list_v2");
        if (cached?.assets) {
          setAssets(cached.assets.map(normaliseAsset));
        }
      }

      // === BACKGROUND: load full list so dropdown is populated ===
      await _refreshAssetListInBackground(normaliseAsset, extractAssetList);
    } catch (error) {
      console.error("Error fetching assets:", error);
    }
  };

  const _refreshAssetListInBackground = async (
    normaliseAsset: (a: any) => any,
    extractAssetList: (r: any) => any[]
  ) => {
    try {
      const response = await fetchWithSessionAuth(`${API_URL}/assets?pageSize=500`);
      if (!response.ok) return;

      const result = await response.json();
      const firstPage = extractAssetList(result).map(normaliseAsset);
      setAssets(firstPage);

      const totalPages = Math.max(Number(result?.totalPages ?? result?.total_pages ?? 1) || 1, 1);
      if (totalPages > 1) {
        const pages = Array.from({ length: Math.min(totalPages, 10) - 1 }, (_, i) => i + 2);
        const rest = await Promise.all(
          pages.map((p) =>
            fetchWithSessionAuth(`${API_URL}/assets?page=${p}&pageSize=500`).then((r) => (r.ok ? r.json() : null))
          )
        );
        const all = [...firstPage, ...rest.flatMap((d) => extractAssetList(d).map(normaliseAsset))];
        setAssets(all);
        setCacheEntry("assets_list_v2", { assets: all, total: Number(result?.total) || all.length });
      } else {
        setCacheEntry("assets_list_v2", { assets: firstPage, total: Number(result?.total) || firstPage.length });
      }
    } catch { /* ignore background errors */ }
  };



  const fetchComponentTemplate = async (assetTypeName: string) => {
    try {
      const authenticatedResponse = await fetchWithSessionAuth(
        `${API_URL}/component-templates/${encodeURIComponent(assetTypeName)}`,
      );

      if (authenticatedResponse.ok) {
        const data = await authenticatedResponse.json();
        
        // Check if template is null (missing template)
        if (!data.template) {
          toast.error(
            data.error || "No Inspection Template found for this Asset Type. Please contact an administrator.",
            { duration: 8000 }
          );
          setComponentTemplate(null);
          return;
        }
        
        setComponentTemplate(data.template);
      } else if (authenticatedResponse.status === 404) {
        // Template not found
        const data = await authenticatedResponse.json();
        toast.error(
          data.error || "No Inspection Template found for this Asset Type.",
          { duration: 8000 }
        );
        setComponentTemplate(null);
      } else {
        // Other errors
        toast.error("Failed to load inspection template. Please try again.");
        setComponentTemplate(null);
      }
    } catch (error) {
      console.error("Error fetching component template:", error);
      toast.error("Failed to load inspection template. Please try again.");
      setComponentTemplate(null);
    }
  };

  const handleAssetChange = (assetId: string) => {
    const asset = assets.find((a) => String(a.asset_id || a.id) === String(assetId));
    setSelectedAsset(asset);
    setFormData((prev) => ({ ...prev, asset_id: assetId }));

    const typeName = asset?.asset_type_name || asset?.asset_type || asset?.type_name;
    if (typeName) {
      fetchComponentTemplate(typeName);
    }
    
    // Check GPS discrepancy if we have both current and asset coordinates
    if (formData.latitude && formData.longitude && asset?.latitude && asset?.longitude) {
      const distance = calculateDistance(
        formData.latitude,
        formData.longitude,
        asset.latitude,
        asset.longitude
      );
      
      if (distance > 50) {
        toast.warning(
          `GPS discrepancy detected: You are ${Math.round(distance)}m away from the asset's recorded location.`,
          { duration: 6000 }
        );
      }
    }
  };
  
  // Helper: Calculate distance between two GPS coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const handleComponentScoresChange = (scores: any[], aggregates: any) => {
    setFormData({ ...formData, component_scores: scores, aggregates });
  };

  const saveInspectionOffline = (payload: Record<string, unknown>) => {
    const offlineInspections = JSON.parse(
      localStorage.getItem("offline_inspections") || "[]"
    );
    offlineInspections.push({
      ...payload,
      id: `offline_${Date.now()}`,
      offline: true,
      created_at: new Date().toISOString(),
    });
    localStorage.setItem("offline_inspections", JSON.stringify(offlineInspections));
  };

  const handleSubmit = async () => {
    if (!formData.asset_id) {
      toast.error("Please select an asset");
      return;
    }
    
    if (photos.length === 0) {
      toast.error("Please capture or upload the main inspection photo before saving.");
      return;
    }

    // Check template exists
    if (!componentTemplate || !componentTemplate.items || componentTemplate.items.length === 0) {
      toast.error("Cannot save inspection - no template loaded. Please select a different asset or contact an administrator.");
      return;
    }

    if (
      formData.latitude !== null &&
      formData.longitude !== null &&
      shouldRequireGpsSaveOverride(locationAccuracy) &&
      !confirm(buildGpsOverrideMessage(locationAccuracy!))
    ) {
      return;
    }

    const payload = {
      asset_id: formData.asset_id,
      inspection_date: formData.inspection_date,
      inspector_name: formData.inspector_name,
      weather_condition: formData.weather_condition,
      condition: formData.condition,

      // Use aggregated worst-component D/E/R from ComponentInspectionForm
      degree: (formData.aggregates as any)?.overall_degree || null,
      extent: (formData.aggregates as any)?.overall_extent || null,
      relevancy: (formData.aggregates as any)?.overall_relevancy || null,

      remedial_notes: formData.remedial_notes || "",
      comments: formData.comments || "",

      component_scores: formData.component_scores || [],
      latitude: formData.latitude || null,
      longitude: formData.longitude || null,
      photo_urls: formData.photo_urls || [],
    };

    setLoading(true);

    try {

      if (isOnline) {
        const response = await fetchWithSessionAuth(`${API_URL}/inspections`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          toast.success("Inspection saved successfully");

          const selectedAssetId =
            selectedAsset?.asset_id ||
            selectedAsset?.id ||
            formData.asset_id ||
            assetFromUrl;

          if (selectedAssetId) {
            navigate(`/mobile/assets/${selectedAssetId}`);
          } else {
            navigate("/mobile/inspections");
          }



        } else {
          let error: any = {};
          try {
            error = await response.json();
          } catch {
            error = { error: `HTTP ${response.status}`, details: response.statusText };
          }

          console.error("Inspection save failed status:", response.status);
          console.error("Inspection save failed error JSON:", JSON.stringify(error, null, 2));
          console.error("Inspection save failed payload JSON:", JSON.stringify(payload, null, 2));

          toast.error(
            error?.details ||
            error?.message ||
            error?.error ||
            `Inspection save failed with HTTP ${response.status}`
          );
        }
      } else {
        // Save offline
        saveInspectionOffline(payload);
        toast.success("Inspection saved offline. Will sync when online.");
        navigate("/mobile/inspections");
      }
    } catch (error: any) {
      console.error("Error saving inspection:", error);

      const message = error?.message || "Failed to save inspection";
      if (isOnline && (message === "AUTH_EXPIRED" || message === "AUTH_REQUIRED")) {
        saveInspectionOffline(payload);
        toast.warning("Session expired while saving. Inspection was saved offline. Please sign in again to sync it.");
        navigate("/mobile/inspections");
        return;
      }

      if (isOnline && (message.includes("Failed to fetch") || message.includes("NetworkError") || message.includes("aborted"))) {
        saveInspectionOffline(payload);
        toast.warning("Connection dropped while saving. Inspection was saved offline.");
        navigate("/mobile/inspections");
        return;
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newPhotos: File[] = [];
      const newPreviews: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith("image/")) {
          newPhotos.push(file);
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              newPreviews.push(event.target.result as string);
              setPhotoPreviews([...photoPreviews, event.target.result as string]);
            }
          };
          reader.readAsDataURL(file);
        }
      }

      setPhotos([...photos, ...newPhotos]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    const newPreviews = photoPreviews.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    setPhotoPreviews(newPreviews);
  };


  const filteredAssetOptions = assets
    .filter((asset: any) => {
      const q = assetSearch.toLowerCase().trim();
      if (!q) return true;

      const searchableText = [
        asset.asset_ref,
        asset.asset_number,
        asset.reference_number,
        asset.asset_type_name,
        asset.asset_type,
        asset.description,
        asset.metadata?.description,
        asset.road_number,
        asset.road_name,
        asset.region,
        asset.depot,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(q);
    })
    .slice(0, 100);



  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-40">
      {/* Fixed Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-slate-800 border-b shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/mobile/inspections")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">New Inspection</h1>
              <p className="text-xs text-slate-500">Component-based Assessment</p>
            </div>
          </div>
          <Badge variant={isOnline ? "default" : "secondary"} className="gap-1">
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? "Online" : "Offline"}
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inspection Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

          <div className="space-y-2">
            <Label className="text-sm">Asset *</Label>

            {/* Show selected asset badge when pre-populated */}
            {selectedAsset && (
              <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                <span className="text-sm font-medium text-green-800 truncate">
                  {selectedAsset.asset_ref || selectedAsset.asset_number || selectedAsset.reference_number || "Asset selected"}
                  {(selectedAsset.asset_type_name || selectedAsset.asset_type) && (
                    <span className="text-green-600 font-normal"> · {selectedAsset.asset_type_name || selectedAsset.asset_type}</span>
                  )}
                </span>
                <button
                  type="button"
                  className="ml-auto text-green-600 hover:text-red-500"
                  onClick={() => {
                    setSelectedAsset(null);
                    setFormData((prev: any) => ({ ...prev, asset_id: "", asset_ref: "", asset_type: "" }));
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {!selectedAsset && (
              <>
                <Input
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  placeholder="Type asset ref, road, asset type, or description..."
                  className="h-11 mb-2"
                />

                <Select
                  value={formData.asset_id || ""}
                  onValueChange={handleAssetChange}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select asset to inspect" />
                  </SelectTrigger>

                  <SelectContent>
                    {filteredAssetOptions.map((asset: any) => {
                      const assetId = String(asset.asset_id || asset.id || "");
                      const assetRef =
                        asset.asset_ref ||
                        asset.reference_number ||
                        asset.asset_number ||
                        asset.code ||
                        "Unnamed asset";

                      const assetType =
                        asset.asset_type_name ||
                        asset.asset_type ||
                        asset.type_name ||
                        "";

                      return (
                        <SelectItem key={assetId} value={assetId}>
                          {assetType ? `${assetRef} - ${assetType}` : assetRef}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Inspection Date</Label>
                <Input
                  type="date"
                  value={formData.inspection_date}
                  onChange={(e) => setFormData({ ...formData, inspection_date: e.target.value })}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Weather</Label>
                <Select
                  value={formData.weather_conditions}
                  onValueChange={(value) => setFormData({ ...formData, weather_conditions: value })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Clear">Clear</SelectItem>
                    <SelectItem value="Cloudy">Cloudy</SelectItem>
                    <SelectItem value="Rainy">Rainy</SelectItem>
                    <SelectItem value="Windy">Windy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Inspector Name</Label>
              <Input
                value={formData.inspector_name}
                onChange={(e) => setFormData({ ...formData, inspector_name: e.target.value })}
                placeholder="Name of inspector"
                className="h-11"
              />
            </div>

            {/* GPS Location */}
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                GPS Location
                {locationAccuracy && (
                  <Badge variant="outline" className="text-xs">
                    ±{Math.round(locationAccuracy)}m
                  </Badge>
                )}
              </Label>
              <div className="flex gap-2">
                <Input
                  value={
                    formData.latitude && formData.longitude
                      ? `${formData.latitude.toFixed(6)}, ${formData.longitude.toFixed(6)}`
                      : "Not captured"
                  }
                  readOnly
                  className="h-11 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={getCurrentLocation}
                  disabled={gettingLocation}
                  className="h-11"
                >
                  {gettingLocation ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Navigation2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {locationAccuracy === null
                  ? "Capture GPS and aim for ±30m or better when possible."
                  : gpsAccuracyStatus === "precise"
                    ? "GPS is within the preferred range."
                    : gpsAccuracyStatus === "acceptable"
                      ? "Coordinates are usable, but waiting a little longer may improve the fix."
                      : gpsAccuracyStatus === "review"
                        ? "Saving will require confirming this lower-precision GPS fix."
                        : "This fix is unreliable. Retry the capture before saving if possible."}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Overall Comments</Label>
              <Textarea
                value={formData.overall_comments}
                onChange={(e) => setFormData({ ...formData, overall_comments: e.target.value })}
                placeholder="General observations about the inspection..."
                rows={3}
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Component Inspection Form */}
        {selectedAsset && componentTemplate ? (
          <ComponentInspectionForm
            assetType={selectedAsset.asset_type_name || selectedAsset.asset_type || selectedAsset.type_name}
            components={componentTemplate.items || []}
            repairThreshold={repairThreshold}
            onScoresChange={handleComponentScoresChange}
          />
        ) : selectedAsset && !componentTemplate ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-6">
              <div className="flex items-start gap-3 text-red-800">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">No Inspection Template Found</h3>
                  <p className="text-xs mt-1">
                    No template exists for "{selectedAsset.asset_type_name}". 
                    Contact administrator.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select an asset above to begin</p>
              <p className="text-xs mt-1">Component-based inspection</p>
            </CardContent>
          </Card>
        )}

        {/* Photo Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Inspection Photos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {/* Camera Capture */}
              <label htmlFor="camera-capture">
                <input
                  type="file"
                  id="camera-capture"
                  className="hidden"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11"
                  onClick={() => document.getElementById("camera-capture")?.click()}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Camera
                </Button>
              </label>

              {/* File Upload */}
              <label htmlFor="photo-upload">
                <input
                  type="file"
                  id="photo-upload"
                  className="hidden"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11"
                  onClick={() => document.getElementById("photo-upload")?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Gallery
                </Button>
              </label>
            </div>

            {/* Photo Gallery */}
            {photoPreviews.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {photoPreviews.map((preview, index) => (
                  <div key={index} className="relative group aspect-square">
                    <img
                      src={preview}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg border-2 border-border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemovePhoto(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center text-slate-400">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No photos yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fixed Bottom Action Bar - kept above mobile bottom navigation */}
      <div className="fixed left-0 right-0 bottom-16 sm:bottom-0 p-3 bg-white dark:bg-slate-800 border-t shadow-lg z-50">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !formData.asset_id}
          className="w-full h-12 text-base bg-[#37aee2] hover:bg-[#2a9dcc] text-white"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Saving Inspection...
            </>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Save Inspection
            </>
          )}
        </Button>
      </div>
    </div>
  );
}