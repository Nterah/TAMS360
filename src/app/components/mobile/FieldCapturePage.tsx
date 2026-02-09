import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../App";
import { useTenant } from "../../contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { 
  Camera, 
  MapPin, 
  Save, 
  X, 
  CheckCircle2, 
  Navigation2,
  Image as ImageIcon,
  Loader2,
  ChevronLeft,
  Wifi,
  WifiOff,
  Map
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export default function FieldCapturePage() {
  const { user, accessToken } = useContext(AuthContext);
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [assetTypes, setAssetTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingAssetTypes, setLoadingAssetTypes] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    assetType: "",
    description: "",
    latitude: "",
    longitude: "",
    condition: "Good",
    notes: "",
    region: "",
    depot: "",
    ward: "",
    owner: "",
    responsibleParty: "",
    roadName: "",
  });

  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);

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

  // Fetch asset types from database
  useEffect(() => {
    fetchAssetTypes();
  }, []);

  const fetchAssetTypes = async () => {
    try {
      const response = await fetch(`${API_URL}/asset-types`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const typeNames = data.assetTypes?.map((type: any) => ({ id: type.id, name: type.asset_type_name })) || [];
        setAssetTypes(typeNames);
      } else {
        // Fallback to hardcoded types if API fails
        setAssetTypes([
          { id: "1", name: "Road Sign" },
          { id: "2", name: "Guardrail" },
          { id: "3", name: "Safety Barrier" },
          { id: "4", name: "Traffic Signal" },
          { id: "5", name: "Gantry" },
          { id: "6", name: "Fence" },
          { id: "7", name: "Guidepost" },
          { id: "8", name: "Road Marking" },
          { id: "9", name: "Raised Road Marker" }
        ]);
      }
    } catch (error) {
      console.error("Error fetching asset types:", error);
      // Fallback to hardcoded types
      setAssetTypes([
        { id: "1", name: "Road Sign" },
        { id: "2", name: "Guardrail" },
        { id: "3", name: "Safety Barrier" },
        { id: "4", name: "Traffic Signal" },
        { id: "5", name: "Gantry" },
        { id: "6", name: "Fence" },
        { id: "7", name: "Guidepost" },
        { id: "8", name: "Road Marking" },
        { id: "9", name: "Raised Road Marker" }
      ]);
    } finally {
      setLoadingAssetTypes(false);
    }
  };

  // Get current GPS location
  const getCurrentLocation = () => {
    // Completely suppress geolocation errors
    try {
      if (!navigator.geolocation) {
        return;
      }

      setGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6),
          });
          setLocationAccuracy(position.coords.accuracy);
          setGettingLocation(false);
          toast.success("Location captured");
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

  // Auto-capture location on mount (optional)
  useEffect(() => {
    // Silently attempt location - completely suppress all errors
    try {
      if (navigator.geolocation) {
        getCurrentLocation();
      }
    } catch (error) {
      // Suppress completely
    }
  }, []);

  // Handle photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPhotos = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos([...photos, ...newPhotos]);
  };

  // Remove photo
  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    URL.revokeObjectURL(newPhotos[index].preview);
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };

  // Handle save (online or offline)
  const handleSave = async () => {
    // Validation
    if (!formData.assetType) {
      toast.error("Please select asset type");
      return;
    }
    if (!formData.description) {
      toast.error("Please enter description");
      return;
    }
    // GPS is optional - warn if missing but allow save
    if (!formData.latitude || !formData.longitude) {
      toast.warning("GPS location not captured. Asset will be saved without coordinates.");
    }

    setSaving(true);

    try {
      const assetData = {
        ...formData,
        photos: photos.map((p) => p.file.name),
        capturedAt: new Date().toISOString(),
        capturedBy: user?.id,
        offline: !isOnline,
      };

      if (isOnline) {
        // Save online
        await saveOnline(assetData);
      } else {
        // Save offline
        saveOffline(assetData);
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save asset");
      setSaving(false);
    }
  };

  // Save to server
  const saveOnline = async (assetData: any) => {
    const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

    // First, upload photos if any
    let photoUrls: string[] = [];
    if (photos.length > 0) {
      // Upload photos to storage
      for (const photo of photos) {
        const formData = new FormData();
        formData.append("file", photo.file);
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
      }
    }

    // Create asset
    const response = await fetch(`${API_URL}/assets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        asset_type: assetData.assetType,
        description: assetData.description,
        latitude: parseFloat(assetData.latitude),
        longitude: parseFloat(assetData.longitude),
        condition: assetData.condition,
        notes: assetData.notes,
        photo_urls: photoUrls,
        status: "Active",
        region: assetData.region || null,
        depot: assetData.depot || null,
        ward: assetData.ward || null,
        owner: assetData.owner || null,
        responsible_party: assetData.responsibleParty || null,
        road_name: assetData.roadName || null,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to save asset");
    }

    toast.success("Asset saved successfully!");
    setSaving(false);
    navigate("/mobile/capture-hub");
  };

  // Save to local storage
  const saveOffline = (assetData: any) => {
    const offlineAssets = JSON.parse(localStorage.getItem("offline_assets") || "[]");
    offlineAssets.push({
      ...assetData,
      id: `offline_${Date.now()}`,
      photos: photos.map((p) => ({ name: p.file.name, data: p.preview })),
    });
    localStorage.setItem("offline_assets", JSON.stringify(offlineAssets));

    toast.success("Asset saved offline. Will sync when online.");
    setSaving(false);
    navigate("/mobile/capture-hub");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/mobile/capture-hub")}
              className="h-9 w-9 p-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">Capture Asset</h1>
              <p className="text-xs text-muted-foreground">Field Collection</p>
            </div>
          </div>
          <Badge variant={isOnline ? "default" : "secondary"} className="gap-1.5">
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? "Online" : "Offline"}
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 pb-24 space-y-4">
        {/* GPS Location Card */}
        <Card className="border-2 border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              GPS Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Latitude</Label>
                <Input
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="0.000000"
                  className="h-9 text-sm"
                  readOnly
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Longitude</Label>
                <Input
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="0.000000"
                  className="h-9 text-sm"
                  readOnly
                />
              </div>
            </div>
            {locationAccuracy && (
              <p className="text-xs text-muted-foreground">
                Accuracy: ±{locationAccuracy.toFixed(0)}m
              </p>
            )}
            <Button
              onClick={getCurrentLocation}
              disabled={gettingLocation}
              variant="outline"
              size="sm"
              className="w-full"
            >
              {gettingLocation ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Getting Location...
                </>
              ) : (
                <>
                  <Navigation2 className="w-4 h-4 mr-2" />
                  Update Location
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Asset Details Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Asset Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Asset Type *</Label>
              <Select value={formData.assetType} onValueChange={(value) => setFormData({ ...formData, assetType: value })}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {assetTypes.map((type) => (
                    <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Description *</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="E.g., Stop sign at Main St intersection"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Condition</Label>
              <Select value={formData.condition} onValueChange={(value) => setFormData({ ...formData, condition: value })}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Excellent">Excellent</SelectItem>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Fair">Fair</SelectItem>
                  <SelectItem value="Poor">Poor</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional observations..."
                rows={3}
                className="text-sm resize-none"
              />
            </div>

            {/* Additional Asset Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Region</Label>
                <Input
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  placeholder="Region"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Depot</Label>
                <Input
                  value={formData.depot}
                  onChange={(e) => setFormData({ ...formData, depot: e.target.value })}
                  placeholder="Depot"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Ward</Label>
                <Input
                  value={formData.ward}
                  onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                  placeholder="Ward"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Owner</Label>
                <Input
                  value={formData.owner}
                  onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                  placeholder="Owner"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Responsible Party</Label>
              <Input
                value={formData.responsibleParty}
                onChange={(e) => setFormData({ ...formData, responsibleParty: e.target.value })}
                placeholder="Responsible party"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Road Name</Label>
              <Input
                value={formData.roadName}
                onChange={(e) => setFormData({ ...formData, roadName: e.target.value })}
                placeholder="Road name"
                className="h-9 text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Photo Capture Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Photos ({photos.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Photo Grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square">
                    <img
                      src={photo.preview}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg border-2"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                      onClick={() => removePhoto(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Camera Button */}
            <label className="block">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <Button variant="outline" className="w-full" asChild>
                <span>
                  <Camera className="w-4 h-4 mr-2" />
                  Take Photo
                </span>
              </Button>
            </label>

            {/* Gallery Upload */}
            <label className="block">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <Button variant="outline" className="w-full" asChild>
                <span>
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Choose from Gallery
                </span>
              </Button>
            </label>
          </CardContent>
        </Card>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t p-4 shadow-lg">
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/mobile/capture-hub")}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Asset
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-center text-muted-foreground mt-2">
          {isOnline ? "Will save to server" : "Will save offline and sync later"}
        </p>
      </div>
    </div>
  );
}