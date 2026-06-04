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
  Map,
  RefreshCw
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

const ASSET_TYPE_ABBREVIATIONS: Record<string, string> = {
  "Signage": "SIG",
  "Road Sign": "RS",
  "Guardrail": "GR",
  "Traffic Signal": "TS",
  "Gantry": "GS",
  "Fence": "FNC",
  "Safety Barrier": "SB",
  "Safety Barriers": "SB",
  "Guidepost": "GP",
  "Road Marking": "RM",
  "Road Markings": "RM",
  "Raised Road Marker": "RRM",
  "Raised Road Markers": "RRM",
};

const FALLBACK_ASSET_TYPES = [
  { id: "road-sign", name: "Road Sign" },
  { id: "guardrail", name: "Guardrail" },
  { id: "safety-barrier", name: "Safety Barrier" },
  { id: "traffic-signal", name: "Traffic Signal" },
  { id: "gantry", name: "Gantry" },
  { id: "fence", name: "Fence" },
  { id: "guidepost", name: "Guidepost" },
  { id: "road-marking", name: "Road Marking" },
  { id: "raised-road-marker", name: "Raised Road Marker" },
];

const DIRECTIONS = ["NB", "SB", "EB", "WB"];
const ROAD_SIDES = ["LHS", "RHS"];
const CONDITIONS = ["Excellent", "Good", "Fair", "Poor", "Critical"];
const STATUSES = ["Active", "Inactive", "Needs Maintenance", "Scheduled for Replacement"];

function cleanText(value: any): string {
  return String(value ?? "").trim();
}

function uniqueSorted(values: any[]): string[] {
  return Array.from(new Set(values.map(cleanText).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
  );
}

function normaliseAssetType(row: any): { id: string; name: string } | null {
  const name = cleanText(
    row?.asset_type_name ?? row?.name ?? row?.asset_type ?? row?.type ?? row?.label
  );
  if (!name) return null;
  return {
    id: cleanText(row?.asset_type_id ?? row?.id ?? row?.value ?? name),
    name,
  };
}


export default function FieldCapturePage() {
  const { user, accessToken } = useContext(AuthContext);
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [assetTypes, setAssetTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [lookupAssets, setLookupAssets] = useState<any[]>([]);
  const [lookupOptions, setLookupOptions] = useState({
    regions: [] as string[],
    depots: [] as string[],
    wards: [] as string[],
    owners: [] as string[],
    responsibleParties: [] as string[],
    roadNames: [] as string[],
    installers: [] as string[],
  });
  const [tenantName, setTenantName] = useState("");
  const [loadingAssetTypes, setLoadingAssetTypes] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    assetReference: "",
    assetType: "",
    roadName: "",
    roadSubsection: "",
    direction: "",
    roadSide: "",
    sequentialNumber: "",
    description: "",
    latitude: "",
    longitude: "",
    condition: "Good",
    status: "Active",
    notes: "",
    region: "",
    depot: "",
    ward: "",
    owner: "",
    responsibleParty: "",
    assetName: "",
    installer: "",
    installDate: "",
    kilometer: "",
    expectedLife: "",
    replacementValue: "",
    installationCost: "",
    geometryType: "Point",
    endLatitude: "",
    endLongitude: "",
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

  // Fetch mobile capture lookups from the same live API used by the Assets page.
  useEffect(() => {
    fetchCaptureLookups();
  }, [accessToken]);

  const authHeaders = {
    Authorization: `Bearer ${accessToken || publicAnonKey}`,
  };

  const fetchJson = async (url: string) => {
    const response = await fetch(url, { headers: authHeaders });
    if (!response.ok) return null;
    return response.json();
  };

  const fetchCaptureLookups = async () => {
    setLoadingAssetTypes(true);

    try {
      const [assetTypeData, assetData, tenantInfo, wardConfig] = await Promise.all([
        fetchJson(`${API_URL}/asset-types`),
        fetchJson(`${API_URL}/assets?pageSize=5000`),
        fetchJson(`${API_URL}/admin/tenant-info`),
        fetchJson(`${API_URL}/admin/tenant-config/wards`),
      ]);

      const rawTypes =
        assetTypeData?.assetTypes ||
        assetTypeData?.asset_types ||
        assetTypeData?.types ||
        assetTypeData?.data ||
        [];

      const cleanTypes = rawTypes
        .map(normaliseAssetType)
        .filter(Boolean) as Array<{ id: string; name: string }>;

      const assets = assetData?.assets || assetData?.data || [];
      setLookupAssets(assets);

      const assetTypesFromAssets = assets
        .map((asset: any) => normaliseAssetType(asset))
        .filter(Boolean) as Array<{ id: string; name: string }>;

      const combinedTypes = [...cleanTypes, ...assetTypesFromAssets, ...FALLBACK_ASSET_TYPES];
      const typeMap = new Map<string, { id: string; name: string }>();
      combinedTypes.forEach((type) => {
        if (type?.name) typeMap.set(type.name.toLowerCase(), type);
      });
      setAssetTypes(Array.from(typeMap.values()).sort((a, b) => a.name.localeCompare(b.name)));

      const tenant =
        cleanText(tenantInfo?.tenant?.name) ||
        cleanText(tenantInfo?.tenant_name) ||
        cleanText(tenantInfo?.name) ||
        cleanText(tenantInfo?.organization_name);

      if (tenant) {
        setTenantName(tenant);
        setFormData((prev) => ({
          ...prev,
          owner: prev.owner || tenant,
          responsibleParty: prev.responsibleParty || tenant,
        }));
      }

      const wardRows = wardConfig?.rows || [];

      setLookupOptions({
        regions: uniqueSorted([
          ...assets.map((a: any) => a.region),
          ...assets.map((a: any) => a.metadata?.region),
          ...wardRows.map((w: any) => w.region),
        ]),
        depots: uniqueSorted([
          ...assets.map((a: any) => a.depot),
          ...assets.map((a: any) => a.metadata?.depot),
        ]),
        wards: uniqueSorted([
          ...assets.map((a: any) => a.wards),
          ...assets.map((a: any) => a.ward),
          ...assets.map((a: any) => a.metadata?.wards),
          ...wardRows.map((w: any) => w.ward),
        ]),
        owners: uniqueSorted([
          tenant,
          ...assets.map((a: any) => a.owner_entity),
          ...assets.map((a: any) => a.owner),
          ...assets.map((a: any) => a.metadata?.owner),
        ]),
        responsibleParties: uniqueSorted([
          tenant,
          ...assets.map((a: any) => a.maintenance_responsibility),
          ...assets.map((a: any) => a.responsible_party),
          ...assets.map((a: any) => a.metadata?.responsible_party),
        ]),
        roadNames: uniqueSorted([
          ...assets.map((a: any) => a.road_name),
          ...assets.map((a: any) => a.roadName),
          ...assets.map((a: any) => a.road_number),
          ...assets.map((a: any) => a.metadata?.road_name),
        ]),
        installers: uniqueSorted([
          ...assets.map((a: any) => a.installer_name),
          ...assets.map((a: any) => a.installer),
          ...assets.map((a: any) => a.metadata?.installer_name),
        ]),
      });
    } catch (error) {
      console.error("Error fetching mobile capture lookups:", error);
      setAssetTypes(FALLBACK_ASSET_TYPES);
      toast.warning("Using fallback lookup values. Some dropdowns may be incomplete.");
    } finally {
      setLoadingAssetTypes(false);
    }
  };

  const buildAssetPrefix = () => {
    if (!formData.assetType || !formData.roadName || !formData.direction) return "";
    const typeAbbr = ASSET_TYPE_ABBREVIATIONS[formData.assetType] ||
      formData.assetType.replace(/[^A-Z0-9]/gi, "").slice(0, 3).toUpperCase();
    const fullRoadName = `${formData.roadName}${formData.roadSubsection || ""}`;
    return formData.roadSide
      ? `${typeAbbr}-${fullRoadName}-${formData.direction}-${formData.roadSide}-`
      : `${typeAbbr}-${fullRoadName}-${formData.direction}-`;
  };

  const generateNextSequenceFromLoadedAssets = () => {
    const prefix = buildAssetPrefix();
    if (!prefix) return;

    const existingNumbers = lookupAssets
      .map((asset: any) => cleanText(asset.asset_ref || asset.referenceNumber || asset.code))
      .filter((ref) => ref.startsWith(prefix))
      .map((ref) => {
        const match = ref.match(/-(\d{3})$/);
        return match ? Number(match[1]) : 0;
      })
      .filter((num) => Number.isFinite(num));

    const nextNumber = existingNumbers.length ? Math.max(...existingNumbers) + 1 : 1;
    setFormData((prev) => ({
      ...prev,
      sequentialNumber: String(nextNumber).padStart(3, "0"),
    }));
  };

  useEffect(() => {
    if (!formData.assetType || !formData.roadName || !formData.direction) {
      setFormData((prev) => ({ ...prev, assetReference: "" }));
      return;
    }

    const timer = window.setTimeout(() => {
      if (!formData.sequentialNumber) {
        generateNextSequenceFromLoadedAssets();
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [formData.assetType, formData.roadName, formData.roadSubsection, formData.direction, formData.roadSide, lookupAssets.length]);

  useEffect(() => {
    const prefix = buildAssetPrefix();
    const ref = prefix && formData.sequentialNumber
      ? `${prefix}${formData.sequentialNumber.padStart(3, "0")}`
      : "";

    setFormData((prev) => (prev.assetReference === ref ? prev : { ...prev, assetReference: ref }));
  }, [formData.assetType, formData.roadName, formData.roadSubsection, formData.direction, formData.roadSide, formData.sequentialNumber]);

  const updateField = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const SearchableInput = ({
    id,
    label,
    value,
    options,
    placeholder,
    required = false,
  }: {
    id: string;
    label: string;
    value: string;
    options: string[];
    placeholder?: string;
    required?: boolean;
  }) => (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Input
        value={value}
        onChange={(e) => updateField(id, e.target.value)}
        placeholder={placeholder}
        list={`${id}-options`}
        className="h-9 text-sm"
      />
      <datalist id={`${id}-options`}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </div>
  );

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
    if (!formData.roadName || !formData.direction) {
      toast.error("Please enter Road Name and Direction so the asset number can be generated");
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
        referenceNumber: assetData.assetReference,
        asset_ref: assetData.assetReference,
        asset_type: assetData.assetType,
        type: assetData.assetType,
        name: assetData.assetName || assetData.description,
        description: assetData.description,
        latitude: assetData.latitude ? parseFloat(assetData.latitude) : null,
        longitude: assetData.longitude ? parseFloat(assetData.longitude) : null,
        start_latitude: assetData.latitude ? parseFloat(assetData.latitude) : null,
        start_longitude: assetData.longitude ? parseFloat(assetData.longitude) : null,
        end_latitude: assetData.endLatitude ? parseFloat(assetData.endLatitude) : null,
        end_longitude: assetData.endLongitude ? parseFloat(assetData.endLongitude) : null,
        condition: assetData.condition,
        status: assetData.status || "Active",
        notes: assetData.notes,
        photo_urls: photoUrls,
        region: assetData.region || null,
        depot: assetData.depot || null,
        ward: assetData.ward || null,
        owner: assetData.owner || tenantName || null,
        owner_entity: assetData.owner || tenantName || null,
        responsible_party: assetData.responsibleParty || tenantName || null,
        maintenance_responsibility: assetData.responsibleParty || tenantName || null,
        road_name: assetData.roadName || null,
        road_subsection: assetData.roadSubsection || null,
        direction: assetData.direction || null,
        road_side: assetData.roadSide || null,
        km_marker: assetData.kilometer ? parseFloat(assetData.kilometer) : null,
        install_date: assetData.installDate || null,
        installer_name: assetData.installer || null,
        useful_life_years: assetData.expectedLife ? Number(assetData.expectedLife) : null,
        replacement_value: assetData.replacementValue ? Number(assetData.replacementValue) : null,
        purchase_price: assetData.installationCost ? Number(assetData.installationCost) : null,
        geometry_type: assetData.geometryType,
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
            <div className="space-y-3 p-3 rounded-lg border bg-primary/5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold">Auto Asset Number</p>
                  <p className="text-[11px] text-muted-foreground">Auto-updates from type, road and direction.</p>
                </div>
                <Badge variant={formData.assetReference ? "default" : "secondary"} className="font-mono">
                  {formData.assetReference || "Not generated"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Asset Type <span className="text-destructive">*</span></Label>
                  <Input
                    value={formData.assetType}
                    onChange={(e) => updateField("assetType", e.target.value)}
                    placeholder={loadingAssetTypes ? "Loading types..." : "Search or select type"}
                    list="asset-type-options"
                    className="h-9 text-sm"
                  />
                  <datalist id="asset-type-options">
                    {assetTypes.map((type) => (
                      <option key={type.id || type.name} value={type.name} />
                    ))}
                  </datalist>
                </div>

                <SearchableInput
                  id="roadName"
                  label="Road Name"
                  value={formData.roadName}
                  options={lookupOptions.roadNames}
                  placeholder="e.g., M1, M2-EB"
                  required
                />

                <div className="space-y-1.5">
                  <Label className="text-xs">Direction <span className="text-destructive">*</span></Label>
                  <Select value={formData.direction} onValueChange={(value) => updateField("direction", value)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select direction" />
                    </SelectTrigger>
                    <SelectContent>
                      {DIRECTIONS.map((dir) => (
                        <SelectItem key={dir} value={dir}>{dir}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Road Side</Label>
                  <Select value={formData.roadSide || "none"} onValueChange={(value) => updateField("roadSide", value === "none" ? "" : value)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {ROAD_SIDES.map((side) => (
                        <SelectItem key={side} value={side}>{side}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Road Subsection</Label>
                  <Input
                    value={formData.roadSubsection}
                    onChange={(e) => updateField("roadSubsection", e.target.value)}
                    placeholder="e.g., _OffRamp"
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Sequential Number</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.sequentialNumber}
                      onChange={(e) => updateField("sequentialNumber", e.target.value.replace(/\D/g, "").slice(0, 3).padStart(3, "0"))}
                      placeholder="001"
                      className="h-9 text-sm"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={generateNextSequenceFromLoadedAssets}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Description *</Label>
              <Input
                value={formData.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="E.g., Road sign at km 2.06 of M1-SB"
                className="h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Condition</Label>
                <Select value={formData.condition} onValueChange={(value) => updateField("condition", value)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((cond) => <SelectItem key={cond} value={cond}>{cond}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={formData.status} onValueChange={(value) => updateField("status", value)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((stat) => <SelectItem key={stat} value={stat}>{stat}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SearchableInput id="region" label="Region" value={formData.region} options={lookupOptions.regions} placeholder="Region" />
              <SearchableInput id="depot" label="Depot" value={formData.depot} options={lookupOptions.depots} placeholder="Depot" />
              <SearchableInput id="ward" label="Ward" value={formData.ward} options={lookupOptions.wards} placeholder="Ward" />
              <SearchableInput id="owner" label="Owner" value={formData.owner} options={lookupOptions.owners} placeholder={tenantName || "Owner"} />
              <SearchableInput id="responsibleParty" label="Responsible Party" value={formData.responsibleParty} options={lookupOptions.responsibleParties} placeholder={tenantName || "Responsible party"} />
              <SearchableInput id="installer" label="Installer" value={formData.installer} options={lookupOptions.installers} placeholder="Installer" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Asset Name</Label>
                <Input value={formData.assetName} onChange={(e) => updateField("assetName", e.target.value)} placeholder="Descriptive name" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Kilometer Marker</Label>
                <Input value={formData.kilometer} onChange={(e) => updateField("kilometer", e.target.value)} placeholder="e.g., 4.565" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Install Date</Label>
                <Input type="date" value={formData.installDate} onChange={(e) => updateField("installDate", e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Expected Life (years)</Label>
                <Input type="number" value={formData.expectedLife} onChange={(e) => updateField("expectedLife", e.target.value)} placeholder="e.g., 12" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Replacement Value (R)</Label>
                <Input type="number" value={formData.replacementValue} onChange={(e) => updateField("replacementValue", e.target.value)} placeholder="e.g., 50000" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Installation Cost (R)</Label>
                <Input type="number" value={formData.installationCost} onChange={(e) => updateField("installationCost", e.target.value)} placeholder="e.g., 45000" className="h-9 text-sm" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Additional observations..."
                rows={3}
                className="text-sm resize-none"
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