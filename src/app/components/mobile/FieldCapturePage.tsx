import { useState, useEffect, useContext, useMemo } from "react";
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
  Navigation2,
  Image as ImageIcon,
  Loader2,
  ChevronLeft,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCacheEntry, setCacheEntry } from "../../utils/dataCache";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import {
  addPendingOfflineAsset,
  storeRecentVisibleAsset,
} from "../../utils/offlineAssets";
import {
  buildGpsOverrideMessage,
  captureBestGpsFix,
  classifyGpsAccuracy,
  shouldRequireGpsSaveOverride,
} from "../../utils/gpsCapture";
import { resolveAssetCoordinates } from "../../utils/assetDisplay";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet default marker icon if this page is bundled with map components.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

type Option = { id: string; name: string };

type CaptureFormData = {
  assetReference: string;
  assetType: string;
  roadName: string;
  roadSubsection: string;
  direction: string;
  roadSide: string;
  sequentialNumber: string;
  description: string;
  latitude: string;
  longitude: string;
  condition: string;
  status: string;
  notes: string;
  region: string;
  depot: string;
  ward: string;
  owner: string;
  responsibleParty: string;
  assetName: string;
  installer: string;
  installDate: string;
  kilometer: string;
  orientationPosition: string;
  expectedLife: string;
  replacementValue: string;
  installationCost: string;
  geometryType: string;
  endLatitude: string;
  endLongitude: string;
  additionalFields: Record<string, string>;
};

const FALLBACK_TENANT_NAME = "Johannesburg Roads Agency (JRA)";

const ASSET_TYPE_ABBREVIATIONS: Record<string, string> = {
  Signage: "SIG",
  "Road Sign": "RS",
  Guardrail: "GR",
  "Traffic Signal": "TS",
  Gantry: "GS",
  Fence: "FNC",
  "Safety Barrier": "SB",
  "Safety Barriers": "SB",
  Guidepost: "GP",
  "Road Marking": "RM",
  "Road Markings": "RM",
  "Raised Road Marker": "RRM",
  "Raised Road Markers": "RRM",
};

const FALLBACK_ASSET_TYPES: Option[] = [
  { id: "signage", name: "Signage" },
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

const DIRECTIONS = ["NB", "SB", "EB", "WB", "North", "South", "East", "West", "Both", "Unknown"];
const ROAD_SIDES = ["LHS", "RHS", "Median", "Both", "None"];
const CONDITIONS = ["Excellent", "Good", "Fair", "Poor", "Critical"];
const STATUSES = ["Active", "Inactive", "Needs Maintenance", "Scheduled for Replacement"];

const ADDITIONAL_ASSET_FIELDS: Record<string, string[]> = {
  Signage: [
    "mounting_type",
    "number_of_posts_supports",
    "width_m",
    "length_m",
    "height_m",
    "orientation_position",
  ],
  "Road Sign": [
    "mounting_type",
    "number_of_posts_supports",
    "width_m",
    "length_m",
    "height_m",
    "orientation_position",
  ],
  Guardrail: [
    "end_road_km",
    "end_latitude",
    "end_longitude",
    "number_of_posts_supports",
    "width_m",
    "length_m",
    "orientation_position",
  ],
  "Safety Barrier": [
    "end_road_km",
    "end_latitude",
    "end_longitude",
    "mounting_type",
    "number_of_beams",
    "length_m",
    "height_m",
    "orientation_position",
  ],
  "Safety Barriers": [
    "end_road_km",
    "end_latitude",
    "end_longitude",
    "mounting_type",
    "number_of_beams",
    "length_m",
    "height_m",
    "orientation_position",
  ],
  "Traffic Signal": [],
  Guidepost: [
    "mounting_type",
    "number_of_posts_supports",
    "width_m",
    "length_m",
    "height_m",
    "orientation_position",
  ],
  "Guide Post": [
    "mounting_type",
    "number_of_posts_supports",
    "width_m",
    "length_m",
    "height_m",
    "orientation_position",
  ],
  Gantry: [
    "number_of_posts_supports",
    "number_of_beams",
    "length_m",
    "height_m",
    "orientation_position",
  ],
  "Road Marking": [
    "end_road_km",
    "end_latitude",
    "end_longitude",
    "width_m",
    "length_m",
  ],
  "Road Markings": [
    "end_road_km",
    "end_latitude",
    "end_longitude",
    "width_m",
    "length_m",
  ],
  "Raised Road Marker": [
    "end_road_km",
    "end_latitude",
    "end_longitude",
    "mounting_type",
    "length_m",
  ],
  "Raised Road Markers": [
    "end_road_km",
    "end_latitude",
    "end_longitude",
    "mounting_type",
    "length_m",
  ],
  Fence: [
    "end_road_km",
    "end_latitude",
    "end_longitude",
    "mounting_type",
    "length_m",
    "height_m",
    "orientation_position",
  ],
  Fencing: [
    "end_road_km",
    "end_latitude",
    "end_longitude",
    "mounting_type",
    "length_m",
    "height_m",
    "orientation_position",
  ],
};

const ADDITIONAL_FIELD_LABELS: Record<string, string> = {
  mounting_type: "Mounting Type",
  number_of_posts_supports: "No. of Posts / Supports",
  number_of_beams: "No. of Beams",
  width_m: "Width (m)",
  length_m: "Length (m)",
  height_m: "Height (m)",
  orientation_position: "Orientation / Position",
  end_road_km: "End Road KM",
  end_latitude: "End Latitude",
  end_longitude: "End Longitude",
};

function cleanText(value: any): string {
  return String(value ?? "").trim();
}

function slugForReference(value: string): string {
  return cleanText(value)
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_\-]/g, "")
    .replace(/_+/g, "_");
}

function padSequence(value: string): string {
  const numeric = cleanText(value).replace(/[^0-9]/g, "");
  if (!numeric) return "";
  return numeric.padStart(3, "0");
}

function directionCode(value: string): string {
  const v = cleanText(value).toLowerCase();
  if (!v) return "";
  if (["north", "n", "nb", "northbound"].includes(v)) return "NB";
  if (["south", "s", "sb", "southbound"].includes(v)) return "SB";
  if (["east", "e", "eb", "eastbound"].includes(v)) return "EB";
  if (["west", "w", "wb", "westbound"].includes(v)) return "WB";
  if (v === "both") return "BOTH";
  return slugForReference(value).toUpperCase();
}

function uniqueSorted(values: any[]): string[] {
  return Array.from(new Set(values.map(cleanText).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
  );
}

function normaliseAssetType(row: any): Option | null {
  const name = cleanText(row?.asset_type_name ?? row?.name ?? row?.asset_type ?? row?.type ?? row?.label);
  if (!name) return null;
  return {
    id: cleanText(row?.asset_type_id ?? row?.id ?? row?.value ?? name),
    name,
  };
}

function buildAssetReference(formData: CaptureFormData): string {
  const typeCode = ASSET_TYPE_ABBREVIATIONS[formData.assetType] || slugForReference(formData.assetType).slice(0, 4).toUpperCase();
  const road = slugForReference([formData.roadName, formData.roadSubsection].filter(Boolean).join("_"));
  const dir = directionCode(formData.direction || formData.orientationPosition);
  const side = cleanText(formData.roadSide) && formData.roadSide !== "None" ? slugForReference(formData.roadSide).toUpperCase() : "";
  const seq = padSequence(formData.sequentialNumber);

  if (!typeCode || !road || !dir || !seq) return "";
  return [typeCode, road, dir, side, seq].filter(Boolean).join("-");
}

function buildDescription(formData: CaptureFormData): string {
  const parts: string[] = [];
  if (formData.assetType) parts.push(formData.assetType);
  if (formData.kilometer) parts.push(`@ km ${formData.kilometer}`);
  if (formData.roadName) parts.push(`of ${formData.roadName}${formData.roadSubsection ? ` ${formData.roadSubsection}` : ""}`);
  const facing = cleanText(formData.orientationPosition || formData.direction);
  if (facing) parts.push(`facing ${facing}`);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function DataListInput({
  label,
  value,
  onChange,
  options,
  placeholder,
  listId,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  listId: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}{required ? " *" : ""}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        list={listId}
        className="h-9 text-sm"
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </div>
  );
}



export default function FieldCapturePage() {
  const { user, accessToken } = useContext(AuthContext);
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [assetTypes, setAssetTypes] = useState<Option[]>([]);
  const [lookupOptions, setLookupOptions] = useState({
    regions: [] as string[],
    depots: [] as string[],
    wards: [] as string[],
    owners: [] as string[],
    responsibleParties: [] as string[],
    roadNames: [] as string[],
    installers: [] as string[],
  });
  const [tenantName, setTenantName] = useState(FALLBACK_TENANT_NAME);
  const [loadingAssetTypes, setLoadingAssetTypes] = useState(true);
  const [descriptionTouched, setDescriptionTouched] = useState(false);
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  const [formData, setFormData] = useState<CaptureFormData>({
  assetReference: "",
  assetType: "",
  roadName: "",
  roadSubsection: "",
  direction: "",
  roadSide: "None",
  sequentialNumber: "001",
  description: "",
  latitude: "",
  longitude: "",
  condition: "Good",
  status: "Active",
  notes: "",
  region: "",
  depot: "",
  ward: "",
  owner: "Johannesburg Roads Agency (JRA)",
  responsibleParty: "Johannesburg Roads Agency (JRA)",
  assetName: "",
  installer: "",
  installDate: "",
  kilometer: "",
  orientationPosition: "",
  expectedLife: "",
  replacementValue: "",
  installationCost: "",
  geometryType: "Point",
  endLatitude: "",
  endLongitude: "",
  additionalFields: {},
});

  const assetTypeNames = useMemo(() => assetTypes.map((type) => type.name), [assetTypes]);
  const gpsAccuracyStatus = classifyGpsAccuracy(locationAccuracy);

  const updateField = (field: keyof CaptureFormData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };


  const selectedAdditionalFields =
    ADDITIONAL_ASSET_FIELDS[formData.assetType] || [];

  const updateAdditionalField = (fieldName: string, value: string) => {
    setFormData((current) => ({
      ...current,
      additionalFields: {
        ...(current.additionalFields || {}),
        [fieldName]: value,
      },
    }));
  };

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
    fetchCaptureLookups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    if (!tenantName) return;
    setFormData((current) => ({
      ...current,
      owner: current.owner || tenantName,
      responsibleParty: current.responsibleParty || tenantName,
    }));
  }, [tenantName]);

  useEffect(() => {
    const generatedReference = buildAssetReference(formData);
    const generatedDescription = buildDescription(formData);

    setFormData((current) => {
      const next: CaptureFormData = { ...current };
      const currentReference = buildAssetReference(current);
      if (current.assetReference !== currentReference) {
        next.assetReference = currentReference;
      }
      if (!descriptionTouched && generatedDescription && current.description !== generatedDescription) {
        next.description = generatedDescription;
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.assetType,
    formData.roadName,
    formData.roadSubsection,
    formData.direction,
    formData.roadSide,
    formData.sequentialNumber,
    formData.kilometer,
    formData.orientationPosition,
    descriptionTouched,
  ]);

  useEffect(() => {
    try {
      if (navigator.geolocation) getCurrentLocation();
    } catch {
      // Keep field capture usable even when geolocation is blocked.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const assetReference = buildAssetReference(formData);
    const description = buildDescription(formData);

    setFormData((prev) => ({
      ...prev,
      assetReference,
      description: prev.description || description,
    }));
  }, [
    formData.assetType,
    formData.roadName,
    formData.roadSubsection,
    formData.direction,
    formData.roadSide,
    formData.sequentialNumber,
    formData.kilometer,
    formData.orientationPosition,
  ]);

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

    // Apply cached lookups immediately so UI is instant
    const cachedLookups = getCacheEntry<any>("field_capture_lookups");
    if (cachedLookups) {
      setAssetTypes(cachedLookups.assetTypes || FALLBACK_ASSET_TYPES);
      setTenantName(cachedLookups.tenantName || FALLBACK_TENANT_NAME);
      setLookupOptions(cachedLookups.lookupOptions || {});
      setLoadingAssetTypes(false);
    }

    try {
      // Fetch asset-types, first asset page, tenant info and ward config in parallel
      const [assetTypeData, assetFirstPage, tenantInfo, wardConfig] = await Promise.all([
        fetchJson(`${API_URL}/asset-types`),
        fetchJson(`${API_URL}/assets?pageSize=500`),
        fetchJson(`${API_URL}/admin/tenant-info`),
        fetchJson(`${API_URL}/admin/tenant-config/wards`),
      ]);

      let assets = assetFirstPage?.assets || assetFirstPage?.data || [];

      // Fetch remaining asset pages in parallel to populate lookup dropdowns
      if (assetFirstPage?.totalPages > 1) {
        const remainingPages = Array.from(
          { length: Math.min(assetFirstPage.totalPages, 4) - 1 },
          (_, i) => i + 2
        );
        const pageResults = await Promise.all(
          remainingPages.map((page) => fetchJson(`${API_URL}/assets?page=${page}&pageSize=500`))
        );
        assets = [...assets, ...pageResults.flatMap((d) => d?.assets || d?.data || [])];
      }

      const rawTypes = assetTypeData?.assetTypes || assetTypeData?.asset_types || assetTypeData?.types || assetTypeData?.data || [];
      const cleanTypes = rawTypes.map(normaliseAssetType).filter(Boolean) as Option[];
      const assetTypesFromAssets = assets.map((asset: any) => normaliseAssetType(asset)).filter(Boolean) as Option[];
      const typeMap = new Map<string, Option>();
      [...cleanTypes, ...assetTypesFromAssets, ...FALLBACK_ASSET_TYPES].forEach((type) => {
        if (type?.name) typeMap.set(type.name.toLowerCase(), type);
      });
      const finalAssetTypes = Array.from(typeMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      setAssetTypes(finalAssetTypes);

      const tenant = cleanText(tenantInfo?.tenant?.name) || cleanText(tenantInfo?.name) || cleanText(tenantInfo?.tenant_name) || FALLBACK_TENANT_NAME;
      setTenantName(tenant);

      const wardRows = wardConfig?.rows || wardConfig?.data || [];
      const finalLookupOptions = {
        regions: uniqueSorted([...assets.map((a: any) => a.region), ...wardRows.map((w: any) => w.region)]),
        depots: uniqueSorted(assets.map((a: any) => a.depot)),
        wards: uniqueSorted([...assets.map((a: any) => a.ward ?? a.wards), ...wardRows.map((w: any) => w.ward)]),
        owners: uniqueSorted([tenant, FALLBACK_TENANT_NAME, ...assets.map((a: any) => a.owner_entity ?? a.owner)]),
        responsibleParties: uniqueSorted([tenant, FALLBACK_TENANT_NAME, ...assets.map((a: any) => a.maintenance_responsibility ?? a.responsible_party)]),
        roadNames: uniqueSorted(assets.map((a: any) => a.road_name ?? a.roadName)),
        installers: uniqueSorted(assets.map((a: any) => a.installer_name ?? a.installer)),
      };
      setLookupOptions(finalLookupOptions);

      // Cache results for 10 minutes
      setCacheEntry("field_capture_lookups", {
        assetTypes: finalAssetTypes,
        tenantName: tenant,
        lookupOptions: finalLookupOptions,
      }, 10 * 60 * 1000);
    } catch (error) {
      console.error("Error fetching capture lookups:", error);
      setAssetTypes(FALLBACK_ASSET_TYPES);
    } finally {
      setLoadingAssetTypes(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      if (!navigator.geolocation) return;
      setGettingLocation(true);
      toast.info("Waiting for an accurate GPS fix...", { id: "field-capture-gps" });

      const fix = await captureBestGpsFix({
        onProgress: (candidate) => setLocationAccuracy(candidate.accuracy),
      });

      setLocationAccuracy(fix.accuracy);
      setFormData((current) => ({
        ...current,
        latitude: fix.latitude.toFixed(6),
        longitude: fix.longitude.toFixed(6),
      }));

      const roundedAccuracy = Math.round(fix.accuracy);
      const accuracyStatus = classifyGpsAccuracy(fix.accuracy);

      if (accuracyStatus === "precise") {
        toast.success(`Location captured (±${roundedAccuracy}m)`, { id: "field-capture-gps" });
      } else if (accuracyStatus === "acceptable") {
        toast.warning(`Location captured with acceptable accuracy (±${roundedAccuracy}m).`, {
          id: "field-capture-gps",
          duration: 6000,
        });
      } else if (accuracyStatus === "review") {
        toast.warning(
          `Location captured, but GPS accuracy is low (±${roundedAccuracy}m). Confirm before saving.`,
          { id: "field-capture-gps", duration: 7000 }
        );
      } else {
        toast.error(
          `GPS fix is very poor (±${roundedAccuracy}m). Retry or manually verify before saving.`,
          { id: "field-capture-gps", duration: 8000 }
        );
      }
    } catch (error: any) {
      toast.error(error?.message || "Unable to capture your location", {
        id: "field-capture-gps",
      });
    } finally {
      setGettingLocation(false);
    }
  };

  const regenerateReference = () => {
    const ref = buildAssetReference(formData);
    if (!ref) {
      toast.error("Select asset type, road name, direction/orientation, and sequence first");
      return;
    }
    updateField("assetReference", ref);
    toast.success("Asset reference generated");
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPhotos = files.map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setPhotos((current) => [...current, ...newPhotos]);
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos((current) => {
      const next = [...current];
      URL.revokeObjectURL(next[index].preview);
      next.splice(index, 1);
      return next;
    });
  };

  const handleSave = async () => {
    const finalReference = formData.assetReference || buildAssetReference(formData);
    const finalDescription = formData.description || buildDescription(formData);

    if (!formData.assetType) {
      toast.error("Please select asset type");
      return;
    }
    if (!formData.roadName || !formData.direction) {
      toast.error("Please enter Road Name and Direction so the asset reference can be generated");
      return;
    }

    if (!finalReference) {
      toast.error("Asset reference could not be generated");
      return;
    }

    if (!finalDescription) {
      toast.error("Please enter or generate description");
      return;
    }

    const resolvedCoordinates = resolveAssetCoordinates(
      {
        latitude: formData.latitude,
        longitude: formData.longitude,
      },
      { rejectNullIsland: true }
    );

    if (!resolvedCoordinates) {
      toast.error("A valid GPS location is required. On the Android simulator, set a mock location before saving.");
      return;
    }

    if (
      formData.latitude &&
      formData.longitude &&
      shouldRequireGpsSaveOverride(locationAccuracy) &&
      !confirm(buildGpsOverrideMessage(locationAccuracy!))
    ) {
      return;
    }

    const assetData = {
      ...formData,
      assetReference: finalReference,
      description: finalDescription,
      latitude: resolvedCoordinates.lat.toFixed(6),
      longitude: resolvedCoordinates.lng.toFixed(6),
      photos: photos.map((p) => p.file.name),
      capturedAt: new Date().toISOString(),
      capturedBy: user?.id,
      tenantId,
      offline: !isOnline,
    };

    setSaving(true);
    try {
      if (isOnline) await saveOnline(assetData);
      else saveOffline(assetData);
    } catch (error: any) {
      console.error("Save error:", error);

      const message = error?.message || "Failed to save asset";
      if (isOnline && (message.includes("Failed to fetch") || message.includes("NetworkError") || message.includes("aborted"))) {
        toast.warning("Connection dropped while saving. Saving offline instead.");
        saveOffline(assetData);
        return;
      }

      toast.error(message);
      setSaving(false);
    }
  };

  const saveOnline = async (assetData: any) => {
    const photoUrls: string[] = [];
    for (const photo of photos) {
      const uploadFormData = new FormData();
      uploadFormData.append("file", photo.file);
      uploadFormData.append("bucket", "tams360-inspection-photos");
      uploadFormData.append("folderPath", assetData.assetReference);

      const uploadResponse = await fetch(`${API_URL}/storage/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
        body: uploadFormData,
      });

      if (uploadResponse.ok) {
        const { url, path } = await uploadResponse.json();
        photoUrls.push(path || url);
      }
    }

    const lat = assetData.latitude ? Number(assetData.latitude) : null;
    const lng = assetData.longitude ? Number(assetData.longitude) : null;
    const endLat = assetData.endLatitude ? Number(assetData.endLatitude) : null;
    const endLng = assetData.endLongitude ? Number(assetData.endLongitude) : null;

    const response = await fetch(`${API_URL}/assets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken || publicAnonKey}`,
      },
      body: JSON.stringify({
        referenceNumber: assetData.assetReference,
        asset_ref: assetData.assetReference,

        asset_type: assetData.assetType,
        type: assetData.assetType,
        asset_type_name: assetData.assetType,

        name: assetData.assetName || assetData.description,
        asset_name: assetData.assetName || null,
        description: assetData.description,

        latitude: assetData.latitude ? parseFloat(assetData.latitude) : null,
        longitude: assetData.longitude ? parseFloat(assetData.longitude) : null,
        gps_lat: assetData.latitude ? parseFloat(assetData.latitude) : null,
        gps_lng: assetData.longitude ? parseFloat(assetData.longitude) : null,

        condition: assetData.condition,
        status: assetData.status || "Active",
        notes: assetData.notes || null,

        additional_fields: assetData.additionalFields || {},
        mounting_type: assetData.additionalFields?.mounting_type || null,
        number_of_posts_supports: assetData.additionalFields?.number_of_posts_supports || null,
        number_of_beams: assetData.additionalFields?.number_of_beams || null,
        width_m: assetData.additionalFields?.width_m || null,
        length_m: assetData.additionalFields?.length_m || null,
        height_m: assetData.additionalFields?.height_m || null,
        orientation_position:
          assetData.additionalFields?.orientation_position ||
          assetData.orientationPosition ||
          null,
        end_road_km: assetData.additionalFields?.end_road_km || null,
        end_latitude: assetData.additionalFields?.end_latitude || assetData.endLatitude || null,
        end_longitude: assetData.additionalFields?.end_longitude || assetData.endLongitude || null,
        photo_urls: photoUrls,

        region: assetData.region || null,
        depot: assetData.depot || null,
        ward: assetData.ward || null,

        owner: assetData.owner || tenantName || "Johannesburg Roads Agency (JRA)",
        owner_entity: assetData.owner || tenantName || "Johannesburg Roads Agency (JRA)",

        responsible_party: assetData.responsibleParty || tenantName || "Johannesburg Roads Agency (JRA)",
        maintenance_responsibility: assetData.responsibleParty || tenantName || "Johannesburg Roads Agency (JRA)",

        road_number: assetData.roadName || null,
        road_name: assetData.roadSubsection
          ? `${assetData.roadName}${assetData.roadSubsection}`
          : assetData.roadName || null,

        road_subsection: assetData.roadSubsection || null,
        direction: assetData.direction || null,
        road_side: assetData.roadSide || null,
        orientation: assetData.orientationPosition || assetData.direction || null,

        km_marker: assetData.kilometer ? parseFloat(assetData.kilometer) : null,
        install_date: assetData.installDate || null,
        installer_name: assetData.installer || null,

        useful_life_years: assetData.expectedLife ? Number(assetData.expectedLife) : null,
        replacement_value: assetData.replacementValue ? Number(assetData.replacementValue) : null,
        purchase_price: assetData.installationCost ? Number(assetData.installationCost) : null,

        geometry_type: assetData.geometryType || "Point",
        source: "mobile_field_capture",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(errorText || "Failed to save asset");
    }

    const saved = await response.json();
    const savedAsset = saved?.asset || saved?.data || saved;

    toast.success(`Asset saved: ${assetData.assetReference}`);
    storeRecentVisibleAsset({
      ...assetData,
      ...savedAsset,
      asset_id: savedAsset?.asset_id || savedAsset?.id,
      id: savedAsset?.asset_id || savedAsset?.id || assetData.assetReference,
      asset_ref: savedAsset?.asset_ref || assetData.assetReference,
      asset_type: savedAsset?.asset_type || assetData.assetType,
      asset_type_name: savedAsset?.asset_type_name || assetData.assetType,
      gps_lat: savedAsset?.gps_lat ?? assetData.latitude,
      gps_lng: savedAsset?.gps_lng ?? assetData.longitude,
      latitude: savedAsset?.latitude ?? assetData.latitude,
      longitude: savedAsset?.longitude ?? assetData.longitude,
      road_name:
        savedAsset?.road_name ??
        (assetData.roadSubsection ? `${assetData.roadName}${assetData.roadSubsection}` : assetData.roadName),
      road_number: savedAsset?.road_number ?? assetData.roadName,
      owner_name: savedAsset?.owner_name ?? assetData.owner ?? null,
      depot_name: savedAsset?.depot_name ?? assetData.depot ?? null,
      region_name: savedAsset?.region_name ?? assetData.region ?? null,
      ward_name: savedAsset?.ward_name ?? assetData.ward ?? null,
      status_name: savedAsset?.status_name ?? assetData.status ?? "Active",
      latest_condition: savedAsset?.latest_condition ?? assetData.condition,
    });
    setSaving(false);

    if (savedAsset?.asset_id) {
      navigate(`/mobile/assets/${savedAsset.asset_id}`);
    } else if (savedAsset?.id) {
      navigate(`/mobile/assets/${savedAsset.id}`);
    } else {
      navigate("/mobile/assets");
    }
  };

  const saveOffline = (assetData: any) => {
    addPendingOfflineAsset({
      ...assetData,
      id: `offline_${Date.now()}`,
      photos: photos.map((p) => ({ name: p.file.name, data: p.preview })),
      sync_status: "pending",
    });
    toast.success("Asset saved offline. It will need to sync when online.");
    setSaving(false);
    navigate("/mobile/assets");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/mobile/capture-hub")} className="h-9 w-9 p-0">
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

      <div className="p-4 pb-28 space-y-4">

        <Card className="border-2 border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4" />GPS Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Latitude</Label><Input value={formData.latitude} onChange={(e) => { setLocationAccuracy(null); updateField("latitude", e.target.value); }} placeholder="0.000000" className="h-9 text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Longitude</Label><Input value={formData.longitude} onChange={(e) => { setLocationAccuracy(null); updateField("longitude", e.target.value); }} placeholder="0.000000" className="h-9 text-sm" /></div>
            </div>
            {locationAccuracy !== null ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    variant="outline"
                    className={
                      gpsAccuracyStatus === "precise"
                        ? "border-green-500 text-green-700"
                        : gpsAccuracyStatus === "acceptable"
                          ? "border-amber-500 text-amber-700"
                          : "border-red-500 text-red-700"
                    }
                  >
                    {gpsAccuracyStatus === "precise"
                      ? "Precise GPS"
                      : gpsAccuracyStatus === "acceptable"
                        ? "Acceptable GPS"
                        : gpsAccuracyStatus === "review"
                          ? "Confirm before save"
                          : "Retry GPS capture"}
                  </Badge>
                  <p className="text-xs text-muted-foreground">Accuracy: ±{locationAccuracy.toFixed(0)}m</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {gpsAccuracyStatus === "precise"
                    ? "GPS is within the preferred range."
                    : gpsAccuracyStatus === "acceptable"
                      ? "Coordinates are usable, but wait for a better fix if possible."
                      : gpsAccuracyStatus === "review"
                        ? "Location was captured, but saving requires confirming this lower-precision fix."
                        : "This fix is unreliable. Retry capture or manually verify the coordinates."}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Capture GPS and aim for ±30m or better when possible.</p>
            )}
            <Button onClick={getCurrentLocation} disabled={gettingLocation} variant="outline" size="sm" className="w-full">
              {gettingLocation ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Getting Location...</> : <><Navigation2 className="w-4 h-4 mr-2" />Update Location</>}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 border-primary bg-blue-50/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Auto-Generated Asset Reference</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={formData.assetReference}
              readOnly
              placeholder="Reference will generate automatically"
              className="h-9 text-sm font-mono"
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Road Name *</Label>
                <Input
                  value={formData.roadName}
                  onChange={(e) => setFormData({ ...formData, roadName: e.target.value })}
                  placeholder="e.g. M1, N8, DR80338"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Road Subsection</Label>
                <Input
                  value={formData.roadSubsection}
                  onChange={(e) => setFormData({ ...formData, roadSubsection: e.target.value })}
                  placeholder="e.g. _Loop, _OffRamp"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Direction *</Label>
                <Select
                  value={formData.direction}
                  onValueChange={(value) => setFormData({ ...formData, direction: value })}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select direction" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIRECTIONS.map((direction) => (
                      <SelectItem key={direction} value={direction}>
                        {direction}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Road Side</Label>
                <Select
                  value={formData.roadSide}
                  onValueChange={(value) => setFormData({ ...formData, roadSide: value })}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select side" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROAD_SIDES.map((side) => (
                      <SelectItem key={side} value={side}>
                        {side}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Sequential Number *</Label>
                <Input
                  value={formData.sequentialNumber}
                  onChange={(e) => setFormData({ ...formData, sequentialNumber: e.target.value })}
                  placeholder="001"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Orientation / Position</Label>
                <Input
                  value={formData.orientationPosition}
                  onChange={(e) => setFormData({ ...formData, orientationPosition: e.target.value })}
                  placeholder="e.g. NB, SB, LHS"
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Asset Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Asset Type *</Label>
              <Select value={formData.assetType} onValueChange={(value) => updateField("assetType", value)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={loadingAssetTypes ? "Loading types..." : "Select type"} /></SelectTrigger>
                <SelectContent>{assetTypeNames.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Description *</Label>
              <Input
                value={formData.description}
                onChange={(e) => { setDescriptionTouched(true); updateField("description", e.target.value); }}
                placeholder="Auto-generated from asset type, km, road and orientation"
                className="h-9 text-sm"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => { setDescriptionTouched(false); updateField("description", buildDescription(formData)); }} className="h-8">
                Generate Description
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DataListInput label="Kilometer Marker" value={formData.kilometer} onChange={(v) => updateField("kilometer", v)} options={[]} placeholder="e.g., 35.6" listId="km-options" />
              <DataListInput label="Asset Name" value={formData.assetName} onChange={(v) => updateField("assetName", v)} options={[]} placeholder="Descriptive name" listId="asset-name-options" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Condition</Label>
                <Select value={formData.condition} onValueChange={(value) => updateField("condition", value)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{CONDITIONS.map((condition) => <SelectItem key={condition} value={condition}>{condition}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={formData.status} onValueChange={(value) => updateField("status", value)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>


            {selectedAdditionalFields.length > 0 && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold">Additional Asset Details</h3>
                  <p className="text-xs text-muted-foreground">
                    Extra fields required for {formData.assetType}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {selectedAdditionalFields.map((fieldName) => (
                    <div key={fieldName} className="space-y-1.5">
                      <Label className="text-xs">
                        {ADDITIONAL_FIELD_LABELS[fieldName] || fieldName}
                      </Label>
                      <Input
                        value={formData.additionalFields?.[fieldName] || ""}
                        onChange={(event) =>
                          updateAdditionalField(fieldName, event.target.value)
                        }
                        placeholder={ADDITIONAL_FIELD_LABELS[fieldName] || fieldName}
                        className="h-9 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5"><Label className="text-xs">Notes</Label><Textarea value={formData.notes} onChange={(e) => updateField("notes", e.target.value)} placeholder="Additional observations..." rows={3} className="text-sm resize-none" /></div>

            <div className="grid grid-cols-2 gap-3">
              <DataListInput label="Region" value={formData.region} onChange={(v) => updateField("region", v)} options={lookupOptions.regions} placeholder="Region" listId="region-options" />
              <DataListInput label="Depot" value={formData.depot} onChange={(v) => updateField("depot", v)} options={lookupOptions.depots} placeholder="Depot" listId="depot-options" />
              <DataListInput label="Ward" value={formData.ward} onChange={(v) => updateField("ward", v)} options={lookupOptions.wards} placeholder="Ward" listId="ward-options" />
              <DataListInput label="Owner" value={formData.owner} onChange={(v) => updateField("owner", v)} options={lookupOptions.owners} placeholder="Owner" listId="owner-options" />
              <DataListInput label="Responsible Party" value={formData.responsibleParty} onChange={(v) => updateField("responsibleParty", v)} options={lookupOptions.responsibleParties} placeholder="Responsible party" listId="responsible-party-options" />
              <DataListInput label="Installer" value={formData.installer} onChange={(v) => updateField("installer", v)} options={lookupOptions.installers} placeholder="Installer" listId="installer-options" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Installation Date</Label><Input type="date" value={formData.installDate} onChange={(e) => updateField("installDate", e.target.value)} className="h-9 text-sm" /></div>
              <DataListInput label="Expected Life (years)" value={formData.expectedLife} onChange={(v) => updateField("expectedLife", v)} options={[]} placeholder="e.g., 15" listId="expected-life-options" />
              <DataListInput label="Replacement Value (R)" value={formData.replacementValue} onChange={(v) => updateField("replacementValue", v)} options={[]} placeholder="e.g., 50000" listId="replacement-value-options" />
              <DataListInput label="Installation Cost (R)" value={formData.installationCost} onChange={(v) => updateField("installationCost", v)} options={[]} placeholder="e.g., 45000" listId="installation-cost-options" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Camera className="w-4 h-4" />Photos ({photos.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square">
                    <img src={photo.preview} alt={`Photo ${index + 1}`} className="w-full h-full object-cover rounded-lg border-2" />
                    <Button variant="destructive" size="sm" className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full" onClick={() => removePhoto(index)}><X className="w-3 h-3" /></Button>
                  </div>
                ))}
              </div>
            )}
            <label className="block"><input type="file" accept="image/*" capture="environment" multiple onChange={handlePhotoSelect} className="hidden" /><Button variant="outline" className="w-full" asChild><span><Camera className="w-4 h-4 mr-2" />Take Photo</span></Button></label>
            <label className="block"><input type="file" accept="image/*" multiple onChange={handlePhotoSelect} className="hidden" /><Button variant="outline" className="w-full" asChild><span><ImageIcon className="w-4 h-4 mr-2" />Choose from Gallery</span></Button></label>
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t p-4 shadow-lg">
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate("/mobile/capture-hub")} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Asset</>}
          </Button>
        </div>
        <p className="text-xs text-center text-muted-foreground mt-2">{isOnline ? "Will save to server" : "Will save offline and sync later"}</p>
      </div>
    </div>
  );
}
