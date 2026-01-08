import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../App";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import ComponentInspectionForm from "./ComponentInspectionForm";
import { ArrowLeft, Save, CheckCircle, Camera, Upload, X, Image as ImageIcon } from "lucide-react";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { toast } from "sonner";

export default function NewInspectionPage() {
  const navigate = useNavigate();
  const { user, accessToken } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<any[]>([]);
  const [componentTemplate, setComponentTemplate] = useState<any>(null);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

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

  useEffect(() => {
    fetchAssets();
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      toast.info("Detecting your location...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
          setFormData((prev) => ({
            ...prev,
            latitude,
            longitude,
          }));
          toast.success(`Location detected: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.error("Could not detect location. Please enable location services.");
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      toast.error("Geolocation is not supported by your device");
    }
  };

  const fetchAssets = async () => {
    try {
      const response = await fetch(`${API_URL}/assets`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
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
            Authorization: `Bearer ${accessToken || publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setComponentTemplate(data.template);
      }
    } catch (error) {
      console.error("Error fetching component template:", error);
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
      alert("Please select an asset");
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
        alert("Inspection saved successfully!");
        navigate("/inspections");
      } else {
        const error = await response.json();
        alert(`Error saving inspection: ${error.error}`);
      }
    } catch (error) {
      console.error("Error saving inspection:", error);
      alert("Failed to save inspection");
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