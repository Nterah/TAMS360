import { useState, useEffect, useContext } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../../App";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import ComponentInspectionForm from "./ComponentInspectionForm";
import { ArrowLeft, Save, CheckCircle, Camera, Upload, X, Image as ImageIcon, MapPin, Navigation2, Loader2, AlertCircle } from "lucide-react";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { toast } from "sonner";
import { loadWithCache, invalidateCache, getCacheEntry, setCacheEntry } from "../../utils/dataCache";
import {
  buildGpsOverrideMessage,
  captureBestGpsFix,
  classifyGpsAccuracy,
  shouldRequireGpsSaveOverride,
} from "../../utils/gpsCapture";

export default function NewInspectionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const assetFromUrl = searchParams.get("assetId");
  const { user, accessToken } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<any[]>([]);
  const [componentTemplate, setComponentTemplate] = useState<any>(null);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);

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

  useEffect(() => {
    fetchAssets();
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (!assetFromUrl || assets.length === 0) return;

    const matchedAsset = assets.find(
      (asset) => String(asset.asset_id || asset.id) === String(assetFromUrl)
    );

    if (matchedAsset) {
      applySelectedAsset(matchedAsset);
    } else {
      fetchAssetById(assetFromUrl);
    }
  }, [assetFromUrl, assets]);

  const normaliseAsset = (asset: any) => ({
    ...asset,
    id: asset.id || asset.asset_id,
    asset_id: asset.asset_id || asset.id,
    asset_ref: asset.asset_ref || asset.asset_number || asset.reference_number || "",
    asset_type_name: asset.asset_type_name || asset.asset_type || asset.type_name || asset.type || "",
    description: asset.description || asset.metadata?.description || asset.name || "",
    latitude: asset.latitude ?? asset.gps_lat ?? null,
    longitude: asset.longitude ?? asset.gps_lng ?? null,
  });

  const applySelectedAsset = (asset: any) => {
    const normalisedAsset = normaliseAsset(asset);
    const selectedId = String(normalisedAsset.asset_id || normalisedAsset.id);

    setSelectedAsset(normalisedAsset);
    setFormData((prev) =>
      prev.asset_id === selectedId
        ? prev
        : { ...prev, asset_id: selectedId }
    );

    const typeName =
      normalisedAsset.asset_type_name ||
      normalisedAsset.asset_type ||
      normalisedAsset.type_name;

    if (typeName) {
      fetchComponentTemplate(typeName);
    }
  };

  const getCurrentLocation = async () => {
    if (navigator.geolocation) {
      setGettingLocation(true);
      toast.info("Waiting for an accurate GPS fix...", { id: "desktop-inspection-gps" });

      try {
        const fix = await captureBestGpsFix({
          onProgress: (candidate) => setLocationAccuracy(candidate.accuracy),
        });

        setCurrentLocation({ lat: fix.latitude, lng: fix.longitude });
        setFormData((prev) => ({
          ...prev,
          latitude: fix.latitude,
          longitude: fix.longitude,
        }));
        setLocationAccuracy(fix.accuracy);

        const roundedAccuracy = Math.round(fix.accuracy);
        const accuracyStatus = classifyGpsAccuracy(fix.accuracy);

        if (accuracyStatus === "precise") {
          toast.success(`Location captured (±${roundedAccuracy}m)`, {
            id: "desktop-inspection-gps",
          });
        } else if (accuracyStatus === "acceptable") {
          toast.warning(`Location captured with acceptable accuracy (±${roundedAccuracy}m).`, {
            id: "desktop-inspection-gps",
            duration: 6000,
          });
        } else if (accuracyStatus === "review") {
          toast.warning(
            `Location captured, but GPS accuracy is low (±${roundedAccuracy}m). Confirm before saving.`,
            { id: "desktop-inspection-gps", duration: 7000 }
          );
        } else {
          toast.error(
            `GPS fix is very poor (±${roundedAccuracy}m). Retry before saving if possible.`,
            { id: "desktop-inspection-gps", duration: 8000 }
          );
        }
      } catch (error: any) {
        console.error("Error getting location:", error);
        toast.error(error?.message || "Could not detect location. Please enable location services.", {
          id: "desktop-inspection-gps",
        });
      } finally {
        setGettingLocation(false);
      }
    } else {
      toast.error("Geolocation is not supported by your device");
    }
  };

  const fetchAssets = async () => {
    // 1. Serve cache instantly
    const cached = getCacheEntry<{ assets: any[]; total: number }>("assets_list_v2");
    if (cached?.assets) {
      setAssets(cached.assets.map(normaliseAsset));
      return; // dropdown is populated — remaining pages refresh in background below
    }

    // 2. No cache — fetch page 1 and show immediately
    try {
      const response = await fetch(`${API_URL}/assets?pageSize=500`, {
        headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      const extract = (d: any): any[] =>
        Array.isArray(d) ? d :
        Array.isArray(d?.assets) ? d.assets :
        Array.isArray(d?.data) ? d.data : [];

      const firstPage = extract(data).map(normaliseAsset);
      setAssets(firstPage); // show immediately

      // 3. Fetch remaining pages silently
      if (data.totalPages > 1) {
        const pages = Array.from({ length: Math.min(data.totalPages, 10) - 1 }, (_, i) => i + 2);
        const rest = await Promise.all(
          pages.map((p) =>
            fetch(`${API_URL}/assets?page=${p}&pageSize=500`, {
              headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
            }).then((r) => (r.ok ? r.json() : null))
          )
        );
        const all = [...firstPage, ...rest.flatMap((d) => extract(d).map(normaliseAsset))];
        setAssets(all);
        setCacheEntry("assets_list_v2", { assets: all, total: data.total || all.length });
      } else {
        setCacheEntry("assets_list_v2", { assets: firstPage, total: data.total || firstPage.length });
      }
    } catch (error) {
      console.error("Error fetching assets:", error);
    }
  };

  const fetchAssetById = async (assetId: string) => {
    try {
      const response = await fetch(`${API_URL}/assets/${assetId}`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      const asset = normaliseAsset(data.asset || data.data || data);

      setAssets((current) => {
        if (current.some((row) => String(row.asset_id || row.id) === String(asset.asset_id || asset.id))) {
          return current;
        }
        return [asset, ...current];
      });

      applySelectedAsset(asset);
    } catch (error) {
      console.error("Error fetching asset for preselection:", error);
    }
  };

  const fetchComponentTemplate = async (assetTypeName: string) => {
    try {
      const response = await fetch(
        `${API_URL}/component-templates/${encodeURIComponent(assetTypeName)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken || publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        
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
      } else if (response.status === 404) {
        // Template not found
        const data = await response.json();
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
    if (asset) {
      applySelectedAsset(asset);
    } else {
      setFormData((prev) => ({ ...prev, asset_id: assetId }));
    }
  };

  const handleComponentScoresChange = (scores: any[], aggregates: any) => {
    setFormData({ ...formData, component_scores: scores, aggregates });
  };

  const handleSubmit = async () => {
    if (!formData.asset_id) {
      toast.error("Please select an asset");
      return;
    }
    
    // Warn if no template, but still allow saving (inspector may just be recording photos/notes)
    if (!componentTemplate || !componentTemplate.items || componentTemplate.items.length === 0) {
      const proceed = confirm("No component template is configured for this asset type. The inspection will be saved without component scores. Continue?");
      if (!proceed) return;
    }

    if (
      formData.latitude !== null &&
      formData.longitude !== null &&
      shouldRequireGpsSaveOverride(locationAccuracy) &&
      !confirm(buildGpsOverrideMessage(locationAccuracy!))
    ) {
      return;
    }

    setLoading(true);

    try {
      const assetRef = selectedAsset?.asset_ref || "";
      const folderPath = assetRef || formData.asset_id;

      // Upload via edge function (always works). Returns the signed URL from the response.
      const uploadViaEdgeFunction = async (file: File, fileName: string): Promise<string | null> => {
        try {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("bucket", "tams360-inspection-photos");
          fd.append("folderPath", folderPath);
          const r = await fetch(`${API_URL}/storage/upload`, {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
            body: fd,
          });
          if (r.ok) {
            const responseData = await r.json();
            console.log('[Upload] Edge function response:', JSON.stringify(responseData));
            const { url, path, signedUrl, publicUrl } = responseData;

            // Convert signed URL → permanent public URL
            // Signed format: .../object/sign/{bucket}/{path}?token=...
            // Public format: .../object/public/{bucket}/{path}
            const rawUrl = publicUrl || url || signedUrl || "";
            let permanentUrl: string | null = null;
            if (rawUrl.includes("/object/sign/")) {
              const match = rawUrl.match(/\/object\/sign\/([^?]+)/);
              if (match) {
                permanentUrl = `https://${projectId}.supabase.co/storage/v1/object/public/${match[1]}`;
              }
            } else if (rawUrl.includes("/object/public/")) {
              permanentUrl = rawUrl.split("?")[0]; // strip any expiry token
            } else if (path) {
              // Derive bucket from signed URL path segment
              const bucketMatch = rawUrl.match(/\/sign\/([^/]+)\//);
              const bucket = bucketMatch?.[1];
              if (bucket) {
                permanentUrl = `https://${projectId}.supabase.co/storage/v1/object/public/${bucket}/${path}`;
              }
            }
            const returnedUrl = permanentUrl || rawUrl || path || null;
            console.log('[Upload] Using URL:', returnedUrl);
            return returnedUrl;
          } else {
            const errText = await r.text().catch(() => `HTTP ${r.status}`);
            toast.error(`Photo upload failed (${r.status}): ${errText.slice(0, 120)}`);
          }
        } catch (e: any) {
          toast.error(`Photo upload error: ${e?.message || "Unknown error"}`);
        }
        return null;
      };

      // Convert base64 data URI to File
      const dataUriToFile = async (dataUri: string, fileName: string): Promise<File | null> => {
        try {
          const res = await fetch(dataUri);
          const blob = await res.blob();
          return new File([blob], fileName, { type: blob.type });
        } catch { return null; }
      };

      // Upload component photos
      const componentScoresWithUrls = await Promise.all(
        formData.component_scores.map(async (score: any, idx: number) => {
          let photoUrl = score.photo_url || null;
          if (photoUrl && photoUrl.startsWith("data:")) {
            const ext = photoUrl.split(";")[0].split("/")[1] || "jpg";
            const file = await dataUriToFile(photoUrl, `comp_${idx + 1}.${ext}`);
            if (file) {
              const uploaded = await uploadViaEdgeFunction(file, `comp_${idx + 1}.${ext}`);
              photoUrl = uploaded || null; // null strips base64 from payload
            }
          }
          return {
            component_name: score.component_name,
            degree: score.degree,
            extent: score.extent,
            relevancy: score.relevancy,
            urgency: score.urgency,
            conditional_index: score.ci,
            quantity: score.quantity,
            unit: score.unit,
            remedial_work: score.remedial_work,
            rate: score.rate,
            cost: score.cost,
            comments: score.comments,
            photo_url: photoUrl,
          };
        })
      );

      // Upload top-level inspection photos
      const topPhotoUrls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const uploaded = await uploadViaEdgeFunction(photos[i], `inspection_${i + 1}_${photos[i].name}`);
        if (uploaded) topPhotoUrls.push(uploaded);
      }

      // Persist photo URLs to localStorage keyed by asset_id so AssetDetailPage
      // can display them even if the backend list endpoint omits the comments field
      if (topPhotoUrls.length > 0 && formData.asset_id) {
        try {
          const storageKey = `asset_photos_${formData.asset_id}`;
          const existing: string[] = JSON.parse(localStorage.getItem(storageKey) || "[]");
          const merged = Array.from(new Set([...existing, ...topPhotoUrls]));
          localStorage.setItem(storageKey, JSON.stringify(merged));
          console.log('[Photos] Saved to localStorage key', storageKey, merged);
        } catch { /* storage quota exceeded */ }
      }

      // Embed photo URLs in comments so they are guaranteed to be persisted and retrievable
      // Format: regular comments + \n\n::photos::["url1","url2"]
      const regularComments = [formData.aggregates.overall_remedial, formData.overall_comments]
        .filter((c) => c)
        .join("\n\n");
      console.log('[Photos] Top photo URLs to embed:', topPhotoUrls);
      const commentsWithPhotos = topPhotoUrls.length > 0
        ? `${regularComments}\n\n::photos::${JSON.stringify(topPhotoUrls)}`.trim()
        : regularComments;
      console.log('[Photos] Final comments value:', commentsWithPhotos);

      const payload = {
        asset_id: formData.asset_id,
        inspection_date: formData.inspection_date,
        inspector_name: formData.inspector_name,
        weather_conditions: formData.weather_conditions,
        conditional_index: formData.aggregates.ci_final,
        ci_health: formData.aggregates.ci_health,
        ci_safety: formData.aggregates.ci_safety,
        ci_final: formData.aggregates.ci_final,
        calculated_urgency: formData.aggregates.worst_urgency,
        degree: formData.aggregates.overall_degree,
        extent: formData.aggregates.overall_extent,
        relevancy: formData.aggregates.overall_relevancy,
        total_remedial_cost: formData.aggregates.total_cost || 0,
        remedial_notes: formData.aggregates.overall_remedial || "",
        comments: commentsWithPhotos,
        component_scores: componentScoresWithUrls,
        photo_urls: topPhotoUrls,
        latitude: formData.latitude,
        longitude: formData.longitude,
      };

      const response = await fetch(`${API_URL}/inspections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        const savedInspectionId =
          result?.inspection?.inspection_id || result?.inspection?.id;

        // Persist uploaded photo URLs keyed by the inspection ID so
        // InspectionDetailPage can display them immediately.
        if (topPhotoUrls.length > 0 && savedInspectionId) {
          try {
            const key = `inspection_photos_${savedInspectionId}`;
            const existing: string[] = JSON.parse(localStorage.getItem(key) || "[]");
            const merged = Array.from(new Set([...existing, ...topPhotoUrls]));
            localStorage.setItem(key, JSON.stringify(merged));
          } catch { /* storage quota exceeded */ }
        }

        toast.success("Inspection saved successfully!");
        navigate("/inspections");
      } else {
        const error = await response.json();
        toast.error(`Error saving inspection: ${error.error}`);
      }
    } catch (error) {
      console.error("Error saving inspection:", error);
      toast.error("Failed to save inspection");
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/inspections")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">New Asset Inspection</h1>
          <p className="text-muted-foreground">Perform component-based inspection with D/E/R scoring</p>
        </div>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Inspection
            </>
          )}
        </Button>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Inspection Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Asset *</Label>
              <Select value={formData.asset_id} onValueChange={handleAssetChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select asset to inspect" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((asset) => (
                    <SelectItem key={asset.asset_id} value={asset.asset_id}>
                      {asset.asset_ref} - {asset.asset_type_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Inspection Date *</Label>
              <Input
                type="date"
                value={formData.inspection_date}
                onChange={(e) => setFormData({ ...formData, inspection_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Inspector Name</Label>
              <Input
                value={formData.inspector_name}
                onChange={(e) => setFormData({ ...formData, inspector_name: e.target.value })}
                placeholder="Name of inspector"
              />
            </div>
            <div className="space-y-2">
              <Label>Weather Conditions</Label>
              <Select
                value={formData.weather_conditions}
                onValueChange={(value) => setFormData({ ...formData, weather_conditions: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select weather" />
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
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              GPS Location
              {locationAccuracy !== null && (
                <Badge variant="outline" className="text-xs">
                  ±{Math.round(locationAccuracy)}m
                </Badge>
              )}
            </Label>
            <div className="flex gap-2">
              <Input
                value={
                  currentLocation
                    ? `${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`
                    : "Not captured"
                }
                readOnly
              />
              <Button type="button" variant="outline" onClick={getCurrentLocation} disabled={gettingLocation}>
                {gettingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation2 className="w-4 h-4" />}
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
            <Label>Overall Comments</Label>
            <Textarea
              value={formData.overall_comments}
              onChange={(e) => setFormData({ ...formData, overall_comments: e.target.value })}
              placeholder="General observations about the inspection..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Component Inspection Form */}
      {selectedAsset && componentTemplate ? (
        <ComponentInspectionForm
          assetType={selectedAsset.asset_type_name}
          components={componentTemplate.items || []}
          repairThreshold={60}
          onScoresChange={handleComponentScoresChange}
        />
      ) : selectedAsset && !componentTemplate ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-6">
            <div className="flex items-center gap-3 text-red-800">
              <AlertCircle className="h-6 w-6 flex-shrink-0" />
              <div>
                <h3 className="font-semibold">No Inspection Template Found</h3>
                <p className="text-sm mt-1">
                  No inspection template exists for asset type "{selectedAsset.asset_type_name}". 
                  Please contact an administrator to configure the template for this asset type.
                </p>
                {user?.role === "admin" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => navigate("/admin/component-templates")}
                  >
                    Open Inspection Templates Settings
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Select an asset above to begin component-based inspection</p>
          </CardContent>
        </Card>
      )}

      {/* Photo Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Inspection Photos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Camera Capture (Mobile) */}
            <label htmlFor="camera-capture" className="flex-1">
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
                className="w-full"
                onClick={() => document.getElementById("camera-capture")?.click()}
              >
                <Camera className="w-4 h-4 mr-2" />
                Take Photo
              </Button>
            </label>

            {/* File Upload */}
            <label htmlFor="photo-upload" className="flex-1">
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
                className="w-full"
                onClick={() => document.getElementById("photo-upload")?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Photos
              </Button>
            </label>
          </div>

          {/* Photo Gallery */}
          {photoPreviews.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
              {photoPreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview}
                    alt={`Inspection photo ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border-2 border-border hover:border-primary transition-colors"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemovePhoto(index)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                  <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                    Photo {index + 1}
                  </div>
                </div>
              ))}
            </div>
          )}

          {photoPreviews.length === 0 && (
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No photos uploaded yet</p>
              <p className="text-xs mt-1">Use the buttons above to capture or upload inspection photos</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
