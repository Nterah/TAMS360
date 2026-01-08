import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../App";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import { LocateFixed, RefreshCw, Info, MapPin } from "lucide-react";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";

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

const DIRECTIONS = ["NB", "SB", "EB", "WB"]; // North, South, East, West Bound
const ROAD_SIDES = ["LHS", "RHS"]; // Left Hand Side, Right Hand Side

const ASSET_TYPES = Object.keys(ASSET_TYPE_ABBREVIATIONS);
const CONDITIONS = ["Excellent", "Good", "Fair", "Poor"];
const STATUSES = ["Active", "Inactive", "Needs Maintenance", "Scheduled for Replacement"];

interface EnhancedAssetFormProps {
  onSubmit: (assetData: any) => void;
  onCancel: () => void;
}

export default function EnhancedAssetForm({ onSubmit, onCancel }: EnhancedAssetFormProps) {
  const { accessToken } = useContext(AuthContext);
  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  // Auto-numbering fields
  const [assetType, setAssetType] = useState("");
  const [roadName, setRoadName] = useState("");
  const [roadSubsection, setRoadSubsection] = useState(""); // e.g., "_OffRamp"
  const [direction, setDirection] = useState("");
  const [roadSide, setRoadSide] = useState(""); // Optional
  const [sequentialNumber, setSequentialNumber] = useState("");
  const [generatedAssetRef, setGeneratedAssetRef] = useState("");

  // Location detection
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [detectingLocation, setDetectingLocation] = useState(false);

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

  // Auto-detect location on component mount
  useEffect(() => {
    detectLocation();
  }, []);

  // Generate asset reference whenever relevant fields change
  useEffect(() => {
    generateAssetReference();
  }, [assetType, roadName, roadSubsection, direction, roadSide, sequentialNumber]);

  // Don't auto-fetch sequential number - only fetch when user clicks refresh button
  // This prevents backend timeout errors on component mount

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setDetectingLocation(true);
    toast.info("Detecting your location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        toast.success(`Location detected: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
        setDetectingLocation(false);
      },
      (error) => {
        let errorMessage = "Unable to detect location";
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = "Location permission denied. Please enable location access in your browser settings.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = "Location information unavailable. Please check your GPS settings.";
        } else if (error.code === error.TIMEOUT) {
          errorMessage = "Location request timed out. Please try again.";
        }
        toast.error(errorMessage);
        setDetectingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const fetchNextSequentialNumber = async () => {
    try {
      // Build the prefix: {TYPE}-{ROAD}{SUBSECTION}-{DIRECTION}[-{SIDE}]-
      const typeAbbr = ASSET_TYPE_ABBREVIATIONS[assetType] || "";
      const fullRoadName = roadName + roadSubsection;
      const prefix = roadSide
        ? `${typeAbbr}-${fullRoadName}-${direction}-${roadSide}-`
        : `${typeAbbr}-${fullRoadName}-${direction}-`;

      // Show loading toast
      toast.loading("Fetching next available number...", { id: "fetch-seq" });

      // Query backend for existing assets with this prefix (with timeout)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(
        `${API_URL}/assets?pageSize=1000`,
        {
          headers: {
            Authorization: `Bearer ${accessToken || publicAnonKey}`,
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const matchingAssets = (data.assets || []).filter((asset: any) =>
          asset.asset_ref?.startsWith(prefix)
        );

        // Extract existing numbers
        const existingNumbers = matchingAssets
          .map((asset: any) => {
            const ref = asset.asset_ref || "";
            const match = ref.match(/-(\d{3})$/);
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter((num: number) => !isNaN(num));

        // Get next number
        const nextNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
        setSequentialNumber(String(nextNum).padStart(3, "0"));
        toast.success(`Next available number: ${String(nextNum).padStart(3, "0")}`, { id: "fetch-seq" });
      } else {
        // Default to 001 if fetch fails
        console.warn("Failed to fetch assets for sequential numbering, defaulting to 001");
        setSequentialNumber("001");
        toast.warning("Couldn't fetch existing assets. Defaulting to 001. Please verify manually.", { id: "fetch-seq" });
      }
    } catch (error: any) {
      console.error("Error fetching sequential number:", error);
      // Default to 001 on any error
      setSequentialNumber("001");
      
      if (error.name === 'AbortError') {
        toast.warning("Request timed out. Defaulting to 001. Please verify manually.", { id: "fetch-seq" });
      } else {
        toast.warning("Couldn't fetch existing assets. Defaulting to 001. Please verify manually.", { id: "fetch-seq" });
      }
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

  const handleSubmit = () => {
    // Validate required fields
    if (!assetType || !roadName || !direction || !sequentialNumber) {
      toast.error("Please fill in all required fields for asset numbering");
      return;
    }

    if (!generatedAssetRef) {
      toast.error("Asset reference number is not generated");
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
      kilometer,
      installDate,
      condition,
      status,
      expectedLife,
      notes,
      latitude,
      longitude,
      owner,
      responsibleParty,
      replacementValue,
      installationCost,
    };

    onSubmit(assetData);
  };

  return (
    <div className="space-y-6">
      {/* Auto-Generated Asset Number Section */}
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
              <Input
                id="sequential-number"
                value={sequentialNumber}
                onChange={(e) => setSequentialNumber(e.target.value.padStart(3, "0"))}
                placeholder="001"
                maxLength={3}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={fetchNextSequentialNumber}
                disabled={!assetType || !roadName || !direction}
                title="Fetch next available number"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Click <RefreshCw className="w-3 h-3 inline" /> to fetch next available number or enter manually
            </p>
          </div>
        </div>
      </div>

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
              onChange={(e) => setLatitude(e.target.value)}
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
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="28.0473"
            />
          </div>
        </div>
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
          Create Asset
        </Button>
      </div>
    </div>
  );
}