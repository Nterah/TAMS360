import { useState, useEffect, useRef } from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import { LocateFixed, RefreshCw, Info, MapPin, Camera, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import {
  buildGpsOverrideMessage,
  captureBestGpsFix,
  classifyGpsAccuracy,
  shouldRequireGpsSaveOverride,
} from "../../utils/gpsCapture";
import { fetchWithSessionAuth } from "../../utils/authSession";
import { API_URL } from "../../../lib/supabaseClient";

const ASSET_TYPE_ABBREVIATIONS: Record<string, string> = {
  "Signage": "SIG",
  "Guardrail": "GR",
  "Traffic Signal": "TS",
  "Gantry": "GAN",
  "Fence": "FNC",
  "Safety Barrier": "SB",
  "Guidepost": "GP",
  "Road Marking": "RM",
  "Raised Road Marker": "RRM",
};

// Asset types that are linear features and need an end-point GPS coordinate
const LINEAR_ASSET_TYPES = new Set([
  "Guardrail",
  "Safety Barrier",
  "Safety Barriers",
  "Road Marking",
  "Road Markings",
  "Raised Road Marker",
  "Raised Road Markers",
  "Fence",
  "Fencing",
]);

const DIRECTIONS = ["NB", "SB", "EB", "WB"]; // North, South, East, West Bound
const ROAD_SIDES = ["LHS", "RHS"]; // Left Hand Side, Right Hand Side

const ASSET_TYPES = Object.keys(ASSET_TYPE_ABBREVIATIONS);
const CONDITIONS = ["Excellent", "Good", "Fair", "Poor"];
const STATUSES = ["Active", "Inactive", "Needs Maintenance", "Scheduled for Replacement"];

const ADDITIONAL_ASSET_FIELDS: Record<string, string[]> = {
  Signage: ["mounting_type", "number_of_posts_supports", "width_m", "length_m", "height_m", "orientation_position"],
  "Traffic Signal": [],
  Gantry: ["number_of_posts_supports", "number_of_beams", "length_m", "height_m", "orientation_position"],
  Guardrail: ["number_of_posts_supports", "width_m", "length_m", "orientation_position"],
  Fence: ["mounting_type", "length_m", "height_m", "orientation_position"],
  "Safety Barrier": ["mounting_type", "number_of_beams", "length_m", "height_m", "orientation_position"],
  Guidepost: ["mounting_type", "number_of_posts_supports", "width_m", "length_m", "height_m", "orientation_position"],
  "Road Marking": ["width_m", "length_m"],
  "Raised Road Marker": ["mounting_type", "length_m"],
};

const ADDITIONAL_FIELD_LABELS: Record<string, string> = {
  mounting_type: "Mounting Type",
  number_of_posts_supports: "No. of Posts / Supports",
  number_of_beams: "No. of Beams",
  width_m: "Width (m)",
  length_m: "Length (m)",
  height_m: "Height (m)",
  orientation_position: "Orientation / Position",
};

interface EnhancedAssetFormProps {
  onSubmit: (assetData: any) => void;
  onCancel: () => void;
  existingAssets?: any[];
  mode?: "create" | "edit";
  initialValues?: any;
}

export default function EnhancedAssetForm({ onSubmit, onCancel, existingAssets = [], mode = "create", initialValues }: EnhancedAssetFormProps) {

  // Auto-numbering fields
  const [assetType, setAssetType] = useState("");
  const [roadName, setRoadName] = useState("");
  const [roadSubsection, setRoadSubsection] = useState(""); // e.g., "_OffRamp"
  const [direction, setDirection] = useState("");
  const [roadSide, setRoadSide] = useState(""); // Optional
  const [sequentialNumber, setSequentialNumber] = useState("");
  const [generatedAssetRef, setGeneratedAssetRef] = useState("");
  const [seqDebug, setSeqDebug] = useState("");

  // Location detection
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [endLatitude, setEndLatitude] = useState("");
  const [endLongitude, setEndLongitude] = useState("");
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const gpsAccuracyStatus = classifyGpsAccuracy(locationAccuracy);
  const isLinearAsset = LINEAR_ASSET_TYPES.has(assetType);

  // Tracks whether the user manually typed a sequential number (suppresses auto-fetch)
  const seqNumManuallyEdited = useRef(false);
  const [fetchingSeqNum, setFetchingSeqNum] = useState(false);

  // Other asset fields
  const [assetName, setAssetName] = useState("");
  const [installer, setInstaller] = useState("");
  const [region, setRegion] = useState("");
  const [depot, setDepot] = useState("");
  const [kilometer, setKilometer] = useState("");
  const [installDate, setInstallDate] = useState("");
  const [condition, setCondition] = useState("Good");
  const [status, setStatus] = useState("Active");
  const [expectedLife, setExpectedLife] = useState("");
  const [notes, setNotes] = useState("");
  const [owner, setOwner] = useState("");
  const [responsibleParty, setResponsibleParty] = useState("");
  const [replacementValue, setReplacementValue] = useState("");
  const [installationCost, setInstallationCost] = useState("");

  // Additional asset details (type-specific metadata fields)
  const [additionalFields, setAdditionalFields] = useState<Record<string, string>>({});
  const selectedAdditionalFields = ADDITIONAL_ASSET_FIELDS[assetType] ?? [];

  // Photo upload (laptop/tablet)
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  // Auto-detect location on component mount (create mode only)
  useEffect(() => {
    if (mode === "edit") return;
    try {
      if (navigator.geolocation) detectLocation();
    } catch {
      // Keep form usable even when geolocation is blocked.
    }
  }, []);

  // Pre-populate fields from initialValues when in edit mode
  useEffect(() => {
    if (mode !== "edit" || !initialValues) return;
    setAssetType(initialValues.asset_type_name || initialValues.type || "");
    setAssetName(initialValues.asset_name || initialValues.description || initialValues.name || "");
    setInstaller(initialValues.installer_name || initialValues.installer || "");
    setRegion(initialValues.region || initialValues.region_name || "");
    setDepot(initialValues.depot || initialValues.depot_name || "");
    setRoadName(initialValues.road_name || initialValues.road_number || initialValues.roadName || "");
    setKilometer(String(initialValues.km_marker ?? initialValues.kilometer ?? ""));
    setInstallDate(
      initialValues.install_date
        ? initialValues.install_date.substring(0, 10)
        : initialValues.installDate?.substring(0, 10) ?? ""
    );
    // condition_name from view lookup, fallback to raw condition text
    setCondition(initialValues.condition_name || initialValues.latest_condition || initialValues.condition || "Good");
    // status_name from view lookup
    setStatus(initialValues.status_name || initialValues.status || "Active");
    setExpectedLife(String(initialValues.useful_life_years ?? initialValues.expectedLife ?? ""));
    setNotes(initialValues.notes || "");
    // owner_entity from enhanced view, fallback to older column names
    setOwner(initialValues.owner_entity || initialValues.owned_by || initialValues.owner_name || initialValues.owner || "");
    // maintenance_responsibility from enhanced view, fallback to older column names
    setResponsibleParty(
      initialValues.maintenance_responsibility || initialValues.responsible_party || initialValues.responsibleParty || ""
    );
    setReplacementValue(String(initialValues.replacement_value ?? initialValues.replacementValue ?? ""));
    setInstallationCost(String(initialValues.purchase_price ?? initialValues.installationCost ?? ""));
    setLatitude(String(initialValues.gps_lat ?? initialValues.latitude ?? ""));
    setLongitude(String(initialValues.gps_lng ?? initialValues.longitude ?? ""));
    setEndLatitude(String(initialValues.end_latitude ?? initialValues.endLatitude ?? ""));
    setEndLongitude(String(initialValues.end_longitude ?? initialValues.endLongitude ?? ""));
    setGeneratedAssetRef(initialValues.asset_ref || initialValues.referenceNumber || "");

    // Pre-populate additional metadata fields
    const meta = initialValues.metadata || {};
    const additionalFieldNames = ["mounting_type", "number_of_posts_supports", "number_of_beams", "width_m", "length_m", "height_m", "orientation_position"];
    const preloaded: Record<string, string> = {};
    additionalFieldNames.forEach((key) => {
      const val = meta[key] ?? initialValues[key];
      if (val !== undefined && val !== null) preloaded[key] = String(val);
    });
    setAdditionalFields(preloaded);
  }, [mode, initialValues]);

  // Generate asset reference whenever relevant fields change (create mode only)
  useEffect(() => {
    if (mode === "edit") return;
    generateAssetReference();
  }, [assetType, roadName, roadSubsection, direction, roadSide, sequentialNumber]);

  // Reset manual-edit flag whenever prefix fields change so auto-compute re-runs.
  useEffect(() => {
    seqNumManuallyEdited.current = false;
  }, [assetType, roadName, roadSubsection, direction, roadSide]);

  // Auto-compute sequential number when prefix fields are complete.
  // Strategy: build the exact same prefix generateAssetReference() would use,
  // then scan every asset_ref for refs that start with it and find max+1.
  // No field-matching needed — the prefix IS the type+road+direction.
  useEffect(() => {
    if (mode === "edit") return;
    if (!assetType || !roadName || !direction) return;
    if (seqNumManuallyEdited.current) return;

    const typeAbbr = ASSET_TYPE_ABBREVIATIONS[assetType] || "";
    const fullRoad = roadName + (roadSubsection || "");
    const side = roadSide && roadSide !== "none" ? roadSide : "";
    // Same template as generateAssetReference — lowercased for comparison.
    const prefix = (side
      ? `${typeAbbr}-${fullRoad}-${direction}-${side}-`
      : `${typeAbbr}-${fullRoad}-${direction}-`
    ).toLowerCase();

    const computeNext = (assets: any[]): number => {
      const nums = assets
        .map((a: any) => {
          const ref = (a.asset_ref || "").toLowerCase();
          if (!ref.startsWith(prefix)) return 0;
          const suffix = ref.slice(prefix.length);
          return /^\d+$/.test(suffix) ? parseInt(suffix, 10) : 0;
        })
        .filter((n: number) => n > 0);
      return nums.length > 0 ? Math.max(...nums) + 1 : 1;
    };

    // Immediate result from already-loaded prop (no network wait).
    if (existingAssets.length > 0) {
      setSequentialNumber(String(computeNext(existingAssets)).padStart(3, "0"));
    }

    // Refresh with fresh data from the API.
    let active = true;
    setFetchingSeqNum(true);
    fetchWithSessionAuth(`${API_URL}/assets?pageSize=1000`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => {
        if (!active || seqNumManuallyEdited.current) return;
        const assets: any[] = data.assets || data.data || [];
        const n = computeNext(assets);
        const hits = assets.filter((a: any) => (a.asset_ref || "").toLowerCase().startsWith(prefix));
        setSeqDebug(`prefix="${prefix}" | ${hits.length}/${assets.length} matched | next=${n} | refs: ${hits.slice(0, 3).map((a: any) => a.asset_ref).join(", ")}`);
        setSequentialNumber(String(n).padStart(3, "0"));
      })
      .catch((err) => {
        setSeqDebug(`FETCH ERROR: ${err?.message || err}`);
        if (active && !seqNumManuallyEdited.current) {
          setSequentialNumber((prev) => prev || "001");
        }
      })
      .finally(() => { if (active) setFetchingSeqNum(false); });

    return () => { active = false; setFetchingSeqNum(false); };
  }, [assetType, roadName, roadSubsection, direction, roadSide, existingAssets, mode]);

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setDetectingLocation(true);
    toast.info("Waiting for an accurate GPS fix...", { id: "enhanced-asset-gps" });

    try {
      const fix = await captureBestGpsFix({
        onProgress: (candidate) => setLocationAccuracy(candidate.accuracy),
      });

      setLatitude(fix.latitude.toFixed(6));
      setLongitude(fix.longitude.toFixed(6));
      setLocationAccuracy(fix.accuracy);

      const roundedAccuracy = Math.round(fix.accuracy);
      const accuracyStatus = classifyGpsAccuracy(fix.accuracy);

      if (accuracyStatus === "precise") {
        toast.success(`Location detected (±${roundedAccuracy}m)`, { id: "enhanced-asset-gps" });
      } else if (accuracyStatus === "acceptable") {
        toast.warning(`Location detected with acceptable accuracy (±${roundedAccuracy}m).`, {
          id: "enhanced-asset-gps",
          duration: 6000,
        });
      } else if (accuracyStatus === "review") {
        toast.warning(
          `Location detected, but GPS accuracy is low (±${roundedAccuracy}m). Confirm before saving.`,
          { id: "enhanced-asset-gps", duration: 7000 }
        );
      } else {
        toast.error(
          `GPS fix is very poor (±${roundedAccuracy}m). Retry or manually verify before saving.`,
          { id: "enhanced-asset-gps", duration: 8000 }
        );
      }
    } catch (error: any) {
      toast.error(error?.message || "Unable to detect location", {
        id: "enhanced-asset-gps",
      });
    } finally {
      setDetectingLocation(false);
    }
  };


  const generateAssetReference = () => {
    if (!assetType || !roadName || !direction || !sequentialNumber) {
      setGeneratedAssetRef("");
      return;
    }

    const typeAbbr = ASSET_TYPE_ABBREVIATIONS[assetType] || "";
    const fullRoadName = roadName + roadSubsection;

    // Format: {TYPE}-{ROAD}-{DIRECTION}[-{SIDE}]-{SEQ}
    const ref = roadSide
      ? `${typeAbbr}-${fullRoadName}-${direction}-${roadSide}-${sequentialNumber}`
      : `${typeAbbr}-${fullRoadName}-${direction}-${sequentialNumber}`;

    setGeneratedAssetRef(ref);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    imageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotoPreviews((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
    setPhotoFiles((prev) => [...prev, ...imageFiles]);
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (mode === "create") {
      // Validate required fields
      if (!assetType || !roadName || !direction || !sequentialNumber) {
        toast.error("Please fill in all required fields for asset numbering");
        return;
      }
      if (!generatedAssetRef) {
        toast.error("Asset reference number is not generated");
        return;
      }
    }

    if (
      latitude &&
      longitude &&
      shouldRequireGpsSaveOverride(locationAccuracy) &&
      !confirm(buildGpsOverrideMessage(locationAccuracy!))
    ) {
      return;
    }

    const assetData = {
      referenceNumber: generatedAssetRef,
      type: assetType,
      name: assetName,
      installer,
      region,
      depot,
      roadNumber: roadName,
      roadName: `${roadName}${roadSubsection}`,
      direction,
      road_side: roadSide || null,
      kilometer,
      installDate,
      condition,
      status,
      expectedLife,
      notes,
      latitude,
      longitude,
      endLatitude: isLinearAsset ? endLatitude : "",
      endLongitude: isLinearAsset ? endLongitude : "",
      owner,
      responsibleParty,
      replacementValue,
      installationCost,
      photos: photoFiles,
      // Additional type-specific metadata fields
      mounting_type: additionalFields.mounting_type,
      number_of_posts_supports: additionalFields.number_of_posts_supports,
      number_of_beams: additionalFields.number_of_beams,
      width_m: additionalFields.width_m,
      length_m: additionalFields.length_m,
      height_m: additionalFields.height_m,
      orientation_position: additionalFields.orientation_position,
    };

    onSubmit(assetData);
  };

  return (
    <div className="space-y-6">
      {/* Asset Reference — editable in create mode, read-only in edit mode */}
      {mode === "edit" ? (
        <div className="flex items-center justify-between p-4 border rounded-lg bg-primary/5">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Asset Reference</p>
            <p className="text-lg font-mono font-bold mt-1">{generatedAssetRef}</p>
            <p className="text-xs text-muted-foreground mt-1">Asset reference cannot be changed after creation</p>
          </div>
          <Badge variant="default" className="text-base font-mono">{generatedAssetRef}</Badge>
        </div>
      ) : (
        /* Auto-Generated Asset Number Section */
        <div className="space-y-4 p-4 border rounded-lg bg-primary/5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Auto-Generated Asset Number</h3>
            <Badge variant="default" className="text-base font-mono">
              {generatedAssetRef || "Not Generated"}
            </Badge>
          </div>

          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription className="text-xs">
              Fill in the fields below to automatically generate the asset reference number.
              <br />
              <strong>Format:</strong> {"{TYPE}"}-{"{ROAD}"}-{"{DIRECTION}"}[-{"{SIDE}"}]-{"{SEQ}"}
              <br />
              <strong>Example:</strong> FNC-M1-SB-003 or GR-M1-NB_OffRamp-LHS-012
            </AlertDescription>
          </Alert>

        <div className="grid grid-cols-2 gap-4">
          {/* Asset Type */}
          <div className="space-y-2">
            <Label htmlFor="asset-type">
              Asset Type <span className="text-destructive">*</span>
            </Label>
            <Select value={assetType} onValueChange={setAssetType}>
              <SelectTrigger id="asset-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {ASSET_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type} ({ASSET_TYPE_ABBREVIATIONS[type]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Road Name */}
          <div className="space-y-2">
            <Label htmlFor="road-name">
              Road Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="road-name"
              placeholder="e.g., M1, N2, R104"
              value={roadName}
              onChange={(e) => setRoadName(e.target.value.trim())}
            />
          </div>

          {/* Road Subsection (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="road-subsection">
              Road Subsection <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Input
              id="road-subsection"
              placeholder="e.g., _OffRamp, _OnRamp"
              value={roadSubsection}
              onChange={(e) => setRoadSubsection(e.target.value.trim())}
            />
            <p className="text-xs text-muted-foreground">Use underscore for sub-sections</p>
          </div>

          {/* Direction */}
          <div className="space-y-2">
            <Label htmlFor="direction">
              Direction <span className="text-destructive">*</span>
            </Label>
            <Select value={direction} onValueChange={setDirection}>
              <SelectTrigger id="direction">
                <SelectValue placeholder="Select direction" />
              </SelectTrigger>
              <SelectContent>
                {DIRECTIONS.map((dir) => (
                  <SelectItem key={dir} value={dir}>
                    {dir === "NB" && "North Bound (NB)"}
                    {dir === "SB" && "South Bound (SB)"}
                    {dir === "EB" && "East Bound (EB)"}
                    {dir === "WB" && "West Bound (WB)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Road Side (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="road-side">
              Road Side <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Select value={roadSide || "none"} onValueChange={(value) => setRoadSide(value === "none" ? "" : value)}>
              <SelectTrigger id="road-side">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {ROAD_SIDES.map((side) => (
                  <SelectItem key={side} value={side}>
                    {side === "LHS" && "Left Hand Side (LHS)"}
                    {side === "RHS" && "Right Hand Side (RHS)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sequential Number (Auto-filled) */}
          <div className="space-y-2">
            <Label htmlFor="sequential-number">
              Sequential Number <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="sequential-number"
                  value={sequentialNumber}
                  onChange={(e) => {
                    seqNumManuallyEdited.current = true;
                    setSequentialNumber(e.target.value.padStart(3, "0"));
                  }}
                  placeholder={fetchingSeqNum ? "Fetching..." : "001"}
                  maxLength={3}
                  disabled={fetchingSeqNum}
                />
                {fetchingSeqNum && (
                  <RefreshCw className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  seqNumManuallyEdited.current = false;
                  // Toggle direction briefly to force the auto-compute effect to re-run.
                  const d = direction;
                  setDirection("");
                  requestAnimationFrame(() => setDirection(d));
                }}
                disabled={fetchingSeqNum || !assetType || !roadName || !direction}
                title="Re-fetch next available number"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Auto-generated when type, road and direction are filled. Click <RefreshCw className="w-3 h-3 inline" /> to refresh.
            </p>
            {seqDebug && (
              <p className="text-xs font-mono text-orange-500 break-all">[debug] {seqDebug}</p>
            )}
          </div>
        </div>
      </div>
      )} {/* end create-mode auto-numbering section */}

      {/* Edit-mode only: Asset Type and Road Name fields */}
      {mode === "edit" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-asset-type">Asset Type</Label>
            <Select value={assetType} onValueChange={setAssetType}>
              <SelectTrigger id="edit-asset-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {ASSET_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type} ({ASSET_TYPE_ABBREVIATIONS[type]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-road-name">Road Name</Label>
            <Input
              id="edit-road-name"
              value={roadName}
              onChange={(e) => setRoadName(e.target.value.trim())}
              placeholder="e.g., M1, N2, R104"
            />
          </div>
        </div>
      )}

      {/* GPS Location Section */}
      <div className="space-y-4 p-4 border rounded-lg bg-[#39AEDF]/5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            GPS Location
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={detectLocation}
            disabled={detectingLocation}
          >
            <LocateFixed className="w-4 h-4 mr-2" />
            {detectingLocation ? "Detecting..." : "Detect Location"}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              type="number"
              step="any"
              value={latitude}
              onChange={(e) => {
                setLocationAccuracy(null);
                setLatitude(e.target.value);
              }}
              placeholder="-26.2041"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              type="number"
              step="any"
              value={longitude}
              onChange={(e) => {
                setLocationAccuracy(null);
                setLongitude(e.target.value);
              }}
              placeholder="28.0473"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {locationAccuracy !== null ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <Badge
                  variant="outline"
                  className={
                    gpsAccuracyStatus === "precise"
                      ? "w-fit border-green-500 text-green-700"
                      : gpsAccuracyStatus === "acceptable"
                        ? "w-fit border-amber-500 text-amber-700"
                        : "w-fit border-red-500 text-red-700"
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
                <p className="text-xs text-muted-foreground">Accuracy: ±{Math.round(locationAccuracy)}m</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {gpsAccuracyStatus === "precise"
                  ? "GPS is within the preferred range."
                  : gpsAccuracyStatus === "acceptable"
                    ? "Coordinates are usable, but waiting a little longer may improve the fix."
                    : gpsAccuracyStatus === "review"
                      ? "Saving will require confirming this lower-precision GPS fix."
                      : "This fix is unreliable. Retry detection or manually verify the coordinates."}
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Capture GPS and aim for ±30m or better when possible.</p>
          )}
        </div>

        {isLinearAsset && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground font-medium">
              End Point — required for linear assets (e.g. guardrail end, road marking end)
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="end-latitude">End Latitude</Label>
                <Input
                  id="end-latitude"
                  type="number"
                  step="any"
                  value={endLatitude}
                  onChange={(e) => setEndLatitude(e.target.value)}
                  placeholder="-26.2041"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-longitude">End Longitude</Label>
                <Input
                  id="end-longitude"
                  type="number"
                  step="any"
                  value={endLongitude}
                  onChange={(e) => setEndLongitude(e.target.value)}
                  placeholder="28.0473"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* General Information */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="asset-name">Asset Name</Label>
          <Input
            id="asset-name"
            value={assetName}
            onChange={(e) => setAssetName(e.target.value)}
            placeholder="Descriptive name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="installer">Installer</Label>
          <Input
            id="installer"
            value={installer}
            onChange={(e) => setInstaller(e.target.value)}
            placeholder="Installation company"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="region">Region</Label>
          <Input
            id="region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="e.g., Gauteng, Western Cape"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="depot">Depot</Label>
          <Input
            id="depot"
            value={depot}
            onChange={(e) => setDepot(e.target.value)}
            placeholder="Maintenance depot"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="kilometer">Kilometer Marker</Label>
          <Input
            id="kilometer"
            type="number"
            value={kilometer}
            onChange={(e) => setKilometer(e.target.value)}
            placeholder="e.g., 42.5"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="install-date">Install Date</Label>
          <Input
            id="install-date"
            type="date"
            value={installDate}
            onChange={(e) => setInstallDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expected-life">Expected Life (years)</Label>
          <Input
            id="expected-life"
            type="number"
            value={expectedLife}
            onChange={(e) => setExpectedLife(e.target.value)}
            placeholder="e.g., 15"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="condition">Condition</Label>
          <Select value={condition} onValueChange={setCondition}>
            <SelectTrigger id="condition">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONDITIONS.map((cond) => (
                <SelectItem key={cond} value={cond}>
                  {cond}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 col-span-2">
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((stat) => (
                <SelectItem key={stat} value={stat}>
                  {stat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ownership & Responsibility */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold border-b pb-2">Ownership & Responsibility</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="owner">Owner</Label>
            <Input
              id="owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="e.g., National Roads Agency"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="responsible-party">Responsible Party</Label>
            <Input
              id="responsible-party"
              value={responsibleParty}
              onChange={(e) => setResponsibleParty(e.target.value)}
              placeholder="e.g., Regional Maintenance Team"
            />
          </div>
        </div>
      </div>

      {/* Financial Information */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold border-b pb-2">Financial Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="replacement-value">Replacement Value (R)</Label>
            <Input
              id="replacement-value"
              type="number"
              value={replacementValue}
              onChange={(e) => setReplacementValue(e.target.value)}
              placeholder="e.g., 50000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="installation-cost">Installation Cost (R)</Label>
            <Input
              id="installation-cost"
              type="number"
              value={installationCost}
              onChange={(e) => setInstallationCost(e.target.value)}
              placeholder="e.g., 45000"
            />
          </div>
        </div>
      </div>

      {/* Photos */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold border-b pb-2 flex items-center gap-2">
          <ImageIcon className="w-4 h-4" /> Photos (Optional)
        </h3>
        <div className="flex gap-2">
          <label className="flex-1">
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoSelect}
            />
            <Button type="button" variant="outline" className="w-full" asChild>
              <span><Camera className="w-4 h-4 mr-2" />Upload Photos</span>
            </Button>
          </label>
        </div>
        {photoPreviews.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photoPreviews.map((src, idx) => (
              <div key={idx} className="relative group rounded overflow-hidden border aspect-square">
                <img src={src} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">Photos will be uploaded when the asset is saved.</p>
      </div>

      {/* Additional Asset Details */}
      {selectedAdditionalFields.length > 0 && (
        <div className="space-y-4 p-4 border border-blue-200 rounded-lg bg-blue-50/40">
          <div>
            <h3 className="text-sm font-semibold">Additional Asset Details</h3>
            <p className="text-xs text-muted-foreground">Extra fields for {assetType}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {selectedAdditionalFields.map((fieldName) => (
              <div key={fieldName} className="space-y-2">
                <Label htmlFor={`add-${fieldName}`}>{ADDITIONAL_FIELD_LABELS[fieldName] || fieldName}</Label>
                <Input
                  id={`add-${fieldName}`}
                  value={additionalFields[fieldName] || ""}
                  onChange={(e) => setAdditionalFields((prev) => ({ ...prev, [fieldName]: e.target.value }))}
                  placeholder={ADDITIONAL_FIELD_LABELS[fieldName] || fieldName}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Additional notes or observations..."
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit}>
          {mode === "edit" ? "Save Changes" : "Create Asset"}
        </Button>
      </div>
    </div>
  );
}