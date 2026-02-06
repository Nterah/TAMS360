import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
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

export default function MobileNewInspectionPage() {
  const navigate = useNavigate();
  const { user, accessToken } = useContext(AuthContext);
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
    // Silently attempt location - completely suppress all errors
    try {
      if (navigator.geolocation) {
        getCurrentLocation();
      }
    } catch (error) {
      // Suppress completely
    }
  }, []);

  const getCurrentLocation = () => {
    // Completely suppress geolocation errors
    try {
      if (!navigator.geolocation) {
        return;
      }

      setGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setFormData((prev) => ({
            ...prev,
            latitude,
            longitude,
          }));
          setLocationAccuracy(accuracy);
          setGettingLocation(false);
          toast.success(`Location captured (±${Math.round(accuracy)}m accuracy)`);
        },
        (error) => {
          // Completely silent - no warnings, no errors
          setGettingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } catch (error) {
      // Suppress all geolocation errors completely
      setGettingLocation(false);
    }
  };

  const fetchAssets = async () => {
    try {
      const response = await fetch(`${API_URL}/assets`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAssets(data.assets || []);
      }
    } catch (error) {
      console.error("Error fetching assets:", error);
    }
  };

  const fetchComponentTemplate = async (assetTypeName: string) => {
    try {
      const response = await fetch(
        `${API_URL}/component-templates/${encodeURIComponent(assetTypeName)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
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
    const asset = assets.find((a) => a.asset_id === assetId);
    setSelectedAsset(asset);
    setFormData({ ...formData, asset_id: assetId });

    if (asset?.asset_type_name) {
      fetchComponentTemplate(asset.asset_type_name);
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
    
    // Check template exists
    if (!componentTemplate || !componentTemplate.items || componentTemplate.items.length === 0) {
      toast.error("Cannot save inspection - no template loaded. Please select a different asset or contact an administrator.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        asset_id: formData.asset_id,
        inspection_date: formData.inspection_date,
        inspector_name: formData.inspector_name,
        weather_conditions: formData.weather_conditions,
        // Overall fields from aggregates
        conditional_index: formData.aggregates.ci_health,
        ci_safety: formData.aggregates.ci_safety,
        ci_final: formData.aggregates.ci_final,
        calculated_urgency: formData.aggregates.worst_urgency,
        degree: formData.aggregates.overall_degree,
        extent: formData.aggregates.overall_extent,
        relevancy: formData.aggregates.overall_relevancy,
        total_remedial_cost: formData.aggregates.total_cost || 0,
        remedial_notes: formData.aggregates.overall_remedial || "",
        // Combined comments
        comments: [formData.aggregates.overall_remedial, formData.overall_comments]
          .filter((c) => c)
          .join("\n\n"),
        // Component scores
        component_scores: formData.component_scores.map((score: any) => ({
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
          photo_url: score.photo_url,
        })),
        latitude: formData.latitude || null,
        longitude: formData.longitude || null,
      };

      if (isOnline) {
        const response = await fetch(`${API_URL}/inspections`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          toast.success("Inspection saved successfully!");
          navigate("/mobile/inspections");
        } else {
          const error = await response.json();
          toast.error(`Error: ${error.error}`);
        }
      } else {
        // Save offline
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
        toast.success("Inspection saved offline. Will sync when online.");
        navigate("/mobile/inspections");
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
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
              <Select value={formData.asset_id} onValueChange={handleAssetChange}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select asset to inspect" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((asset) => (
                    <SelectItem key={asset.asset_id} value={asset.asset_id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{asset.asset_ref}</span>
                        <span className="text-xs text-slate-500">{asset.asset_type_name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            assetType={selectedAsset.asset_type_name}
            components={componentTemplate.items || []}
            repairThreshold={60}
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

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-800 border-t shadow-lg z-10">
        <Button 
          onClick={handleSubmit} 
          disabled={loading || !formData.asset_id}
          className="w-full h-12 text-base"
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