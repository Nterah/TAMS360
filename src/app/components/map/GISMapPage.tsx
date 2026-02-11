import { useState, useContext, useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { AuthContext } from "../../App";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { Layers, Filter, MapPin, Navigation, Download, Eye, EyeOff, Trash2, Plus, Route, LocateFixed, Search, FileText, Image as ImageIcon, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { SimpleMap } from "./SimpleMap";

const ASSET_TYPES = [
  "Road Sign",
  "Guardrail",
  "Traffic Signal",
  "Gantry",
  "Fence",
  "Safety Barriers",
  "Guidepost",
  "Road Markings",
  "Raised Road Markers",
];

// Default center (Pretoria, South Africa)
const DEFAULT_CENTER: [number, number] = [-25.7479, 28.2293];
const DEFAULT_ZOOM = 13;

export default function GISMapPage() {
  const { user, accessToken } = useContext(AuthContext);
  const [assets, setAssets] = useState<any[]>([]);
  const [totalAssetCount, setTotalAssetCount] = useState<number>(0);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [selectedAssetPhotos, setSelectedAssetPhotos] = useState<any[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [controlsMinimized, setControlsMinimized] = useState(false);
  const [colorMode, setColorMode] = useState<"condition" | "ci" | "urgency" | "status" | "region" | "ward" | "depot" | "owner">("ci");
  const [mapLayer, setMapLayer] = useState<"street" | "satellite" | "hybrid">("street");
  const [clusteringEnabled, setClusteringEnabled] = useState(true);
  
  const [filters, setFilters] = useState({
    type: "all",
    region: "all",
    ward: "all",
    depot: "all",
    owner: "all",
    roadName: "all",
    status: "all",
  });

  // Layer visibility control - dynamically populated based on actual asset types
  const [assetLayerVisibility, setAssetLayerVisibility] = useState<Record<string, boolean>>({});

  // External overlay layers (admin managed)
  const [overlayLayers, setOverlayLayers] = useState<any[]>([]);
  const [overlayVisibility, setOverlayVisibility] = useState<Record<string, boolean>>({});
  const [isAddOverlayOpen, setIsAddOverlayOpen] = useState(false);
  const [newOverlay, setNewOverlay] = useState({
    name: "",
    description: "",
    type: "geojson", // geojson, kml, wms
    url: "",
    color: "#39AEDF",
  });

  // Navigation state
  const [navigationMode, setNavigationMode] = useState(false);
  const [routeToAsset, setRouteToAsset] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hasNetworkError, setHasNetworkError] = useState(false);

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  // Abort controller for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchAssets();
    fetchOverlayLayers();
    
    // Cleanup: abort any pending requests when component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        console.log("Aborted pending asset requests on unmount");
      }
    };
  }, []);

  // Dynamically initialize layer visibility when assets change
  useEffect(() => {
    if (assets.length > 0) {
      const assetTypes = [...new Set(assets.map(a => a.type || a.asset_type_name).filter(Boolean))];
      
      setAssetLayerVisibility(prev => {
        const updated = { ...prev };
        
        // Set all existing asset types to visible by default
        assetTypes.forEach(type => {
          if (updated[type] === undefined) {
            updated[type] = true; // New asset types are visible by default
          }
        });
        
        return updated;
      });
    }
  }, [assets]);

  // Fetch photos when an asset is selected
  useEffect(() => {
    if (selectedAsset) {
      fetchPhotosForSelectedAsset(selectedAsset.asset_id || selectedAsset.id);
    } else {
      setSelectedAssetPhotos([]);
    }
  }, [selectedAsset]);

  const fetchAssets = async () => {
    try {
      setHasNetworkError(false); // Reset error state on new fetch
      
      // Cancel any existing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create new abort controller for this fetch
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      
      console.log("Fetching assets from:", `${API_URL}/assets?pageSize=100`);
      
      // Fetch assets in smaller batches (100 per page) to avoid timeouts
      const response = await fetch(`${API_URL}/assets?pageSize=100`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
        signal: abortController.signal,
      });

      console.log("Assets API response status:", response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log("Assets API response data:", data);
        
        const rawAssets = data.assets || [];
        console.log(`Received ${rawAssets.length} assets from API`);
        
        // DEBUG: Log the first asset to see what fields are actually available
        if (rawAssets.length > 0) {
          console.log("Sample asset from database:", rawAssets[0]);
          console.log("Available location fields:", {
            gps_lat: rawAssets[0].gps_lat,
            gps_lng: rawAssets[0].gps_lng,
            latitude: rawAssets[0].latitude,
            longitude: rawAssets[0].longitude,
          });
        } else {
          console.warn("No assets returned from API!");
        }
        
        // Map snake_case to camelCase for consistency
        // IMPORTANT: Database uses gps_lat and gps_lng, not latitude/longitude
        const mappedAssets = rawAssets.map((asset: any) => ({
          ...asset,
          id: asset.asset_id || asset.id,
          name: asset.asset_name || asset.name,
          type: asset.asset_type_name || asset.asset_type || asset.type,
          referenceNumber: asset.asset_ref || asset.reference_number || asset.referenceNumber,
          roadName: asset.road_name || asset.roadName,
          roadNumber: asset.road_number || asset.roadNumber,
          kilometer: asset.km_marker || asset.kilometer || asset.km,
          condition: asset.latest_condition || asset.condition,
          status: asset.status_name || asset.status,
          // Map database fields gps_lat/gps_lng to latitude/longitude
          latitude: asset.gps_lat || asset.latitude,
          longitude: asset.gps_lng || asset.longitude,
          // PRESERVE database fields for CI, urgency, status, condition, and organizational fields
          latest_ci: asset.latest_ci,
          latest_urgency: asset.latest_urgency,
          latest_condition: asset.latest_condition,
          status_name: asset.status_name,
          region_name: asset.region_name,
          ward_name: asset.ward_name,
          depot_name: asset.depot_name,
          owner_name: asset.owner_name,
          responsible_party_name: asset.responsible_party_name,
          road_name: asset.road_name,
        }));
        
        setAssets(mappedAssets);
        setTotalAssetCount(data.total || 0);
        
        // Debug: Log how many assets have coordinates
        const withCoords = mappedAssets.filter((a: any) => a.latitude && a.longitude);
        console.log(`Assets with coordinates: ${withCoords.length} of ${mappedAssets.length}`);
        
        if (withCoords.length > 0) {
          console.log("Sample asset with coordinates:", withCoords[0]);
        } else {
          console.warn("WARNING: No assets have GPS coordinates!");
        }
        
        // If there are more pages, fetch them all for map display
        if (data.totalPages > 1) {
          const allAssets = [...mappedAssets];
          
          // Fetch remaining pages asynchronously without blocking
          toast.info(`Loading all ${data.total} assets...`);
          
          // Fetch all pages in parallel (with abort controller)
          const pagePromises: Promise<any>[] = [];
          for (let page = 2; page <= data.totalPages; page++) {
            pagePromises.push(
              fetch(`${API_URL}/assets?page=${page}&pageSize=100`, {
                headers: {
                  Authorization: `Bearer ${accessToken || publicAnonKey}`,
                },
                signal: abortController.signal,
              })
                .then(res => res.ok ? res.json() : null)
                .catch(err => {
                  // Ignore abort errors
                  if (err.name === 'AbortError') {
                    console.log(`Page ${page} request was aborted`);
                    return null;
                  }
                  throw err;
                })
            );
          }
          
          // Wait for all pages to complete
          Promise.all(pagePromises)
            .then(results => {
              const validResults = results.filter(r => r !== null);
              
              validResults.forEach(pageData => {
                const pageMappedAssets = (pageData.assets || []).map((asset: any) => ({
                  ...asset,
                  id: asset.asset_id || asset.id,
                  name: asset.asset_name || asset.name,
                  type: asset.asset_type_name || asset.asset_type || asset.type,
                  referenceNumber: asset.asset_ref || asset.reference_number || asset.referenceNumber,
                  roadName: asset.road_name || asset.roadName,
                  roadNumber: asset.road_number || asset.roadNumber,
                  kilometer: asset.km_marker || asset.kilometer || asset.km,
                  condition: asset.latest_condition || asset.condition,
                  status: asset.status_name || asset.status,
                  // Map database fields gps_lat/gps_lng to latitude/longitude
                  latitude: asset.gps_lat || asset.latitude,
                  longitude: asset.gps_lng || asset.longitude,
                  // PRESERVE database fields for CI, urgency, status, condition, and organizational fields
                  latest_ci: asset.latest_ci,
                  latest_urgency: asset.latest_urgency,
                  latest_condition: asset.latest_condition,
                  status_name: asset.status_name,
                  region_name: asset.region_name,
                  ward_name: asset.ward_name,
                  depot_name: asset.depot_name,
                  owner_name: asset.owner_name,
                  responsible_party_name: asset.responsible_party_name,
                  road_name: asset.road_name,
                }));
                allAssets.push(...pageMappedAssets);
              });
              
              setAssets(allAssets);
              setTotalAssetCount(allAssets.length);
              toast.success(`Loaded all ${allAssets.length} assets successfully`);
              
              // Debug: Log how many assets have coordinates after all pages
              const withCoordsAll = allAssets.filter((a: any) => a.latitude && a.longitude);
              console.log(`Total assets with coordinates (all pages): ${withCoordsAll.length} of ${allAssets.length}`);
            })
            .catch(err => {
              // Ignore abort errors
              if (err.name === 'AbortError') {
                console.log("Asset loading was aborted");
                return;
              }
              console.error("Error loading additional pages:", err);
              toast.error("Some assets failed to load");
              // Still use what we have
              setAssets(allAssets);
            });
        }

        // Center map on first asset with coordinates
        const firstAssetWithCoords = mappedAssets.find(
          (a: any) => a.latitude && a.longitude
        );
        if (firstAssetWithCoords) {
          setMapCenter([firstAssetWithCoords.latitude, firstAssetWithCoords.longitude]);
          console.log(`Map centered on asset at ${firstAssetWithCoords.latitude}, ${firstAssetWithCoords.longitude}`);
        } else {
          console.log("No assets with coordinates found to center map on");
        }
      } else {
        const errorText = await response.text();
        console.error("Failed to fetch assets:", response.status, response.statusText, errorText);
        
        // Parse error response to show helpful messages
        try {
          const errorData = JSON.parse(errorText);
          
          // Check if it's a network/DNS error from backend
          if (errorData.details?.includes("dns error") || 
              errorData.details?.includes("name resolution") ||
              errorData.error?.includes("connection failed")) {
            setHasNetworkError(true);
          }
          
          if (errorData.hint) {
            toast.error(errorData.error || "Database connection failed");
            toast.info(errorData.hint, { duration: 8000 });
          } else {
            toast.error(errorData.error || `Failed to load assets: ${response.statusText}`);
          }
        } catch {
          toast.error(`Failed to load assets: ${response.statusText}`);
        }
      }
    } catch (error: any) {
      // Ignore abort errors (these are intentional cancellations)
      if (error.name === 'AbortError') {
        console.log("Asset fetch was cancelled");
        return;
      }
      
      console.error("Error fetching assets:", error);
      
      // Check for network errors
      if (error.message?.includes("fetch") || error.message?.includes("network")) {
        setHasNetworkError(true);
        toast.error("Network error: Unable to connect to server");
        toast.info("Check your internet connection or try again later", { duration: 6000 });
      } else {
        toast.error("Error loading map data");
      }
    }
  };

  const fetchOverlayLayers = async () => {
    try {
      const response = await fetch(`${API_URL}/map/overlays`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const layers = data.overlays || [];
        setOverlayLayers(layers);
        
        // Initialize visibility state
        const visibility: Record<string, boolean> = {};
        layers.forEach((layer: any) => {
          visibility[layer.id] = layer.defaultVisible !== false;
        });
        setOverlayVisibility(visibility);
      }
    } catch (error) {
      console.error("Error fetching overlay layers:", error);
      // Silently fail - overlays are optional
      setOverlayLayers([]);
      setOverlayVisibility({});
    }
  };

  const fetchPhotosForSelectedAsset = async (assetId: string) => {
    // Validate assetId before fetching
    if (!assetId || assetId === 'undefined') {
      console.log('[Photos] No valid asset ID provided, skipping photo fetch');
      setSelectedAssetPhotos([]);
      setLoadingPhotos(false);
      return;
    }

    // Validate assetId is a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(assetId)) {
      console.log('[Photos] Invalid asset ID format, skipping photo fetch');
      setSelectedAssetPhotos([]);
      setLoadingPhotos(false);
      return;
    }

    setLoadingPhotos(true);
    try {
      const response = await fetch(`${API_URL}/assets/${assetId}/photos`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedAssetPhotos(data.photos || []);
      } else {
        console.error("Failed to fetch photos:", response.statusText);
        setSelectedAssetPhotos([]);
      }
    } catch (error) {
      console.error("Error fetching asset photos:", error);
      setSelectedAssetPhotos([]);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      toast.error("Geolocation requires a secure connection (HTTPS)");
      return;
    }

    toast.info("Requesting your location... Please allow when prompted.");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(location);
        setMapCenter([location.lat, location.lng]);
        setMapZoom(15);
        toast.success(`Location detected: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
      },
      (error) => {
        // Silently handle permissions policy errors
        if (error.code === error.PERMISSION_DENIED && 
            error.message.includes('permissions policy')) {
          return;
        }
        
        let errorMessage = "Unable to get your location";
        let helpText = "";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied";
            helpText = "Please check your browser settings:\n1. Click the 🔒 icon in the address bar\n2. Find 'Location'\n3. Select 'Allow'\n4. Refresh the page and try again";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable";
            helpText = "Please check:\n1. Location services are enabled on your device\n2. You have a GPS signal (try moving near a window)\n3. Your device has location hardware";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out";
            helpText = "Please try again. If outdoors, wait for GPS signal to strengthen.";
            break;
          default:
            errorMessage = `Location error: ${error.message || 'Unknown error'}`;
        }
        
        toast.error(errorMessage, {
          duration: 8000,
          description: helpText
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleAddOverlay = async () => {
    if (!newOverlay.name || !newOverlay.url) {
      toast.error("Please provide name and URL for the overlay");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/map/overlays`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ...newOverlay,
          createdBy: user?.email,
        }),
      });

      if (response.ok) {
        toast.success("Overlay layer added successfully");
        setIsAddOverlayOpen(false);
        fetchOverlayLayers();
        setNewOverlay({
          name: "",
          description: "",
          type: "geojson",
          url: "",
          color: "#39AEDF",
        });
      } else {
        toast.error("Failed to add overlay layer");
      }
    } catch (error) {
      toast.error("Error adding overlay layer");
    }
  };

  const handleDeleteOverlay = async (layerId: string) => {
    if (!confirm("Are you sure you want to delete this overlay layer?")) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/map/overlays/${layerId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        toast.success("Overlay layer deleted");
        fetchOverlayLayers();
      } else {
        toast.error("Failed to delete overlay");
      }
    } catch (error) {
      toast.error("Error deleting overlay");
    }
  };

  const toggleAssetLayer = (assetType: string) => {
    setAssetLayerVisibility({
      ...assetLayerVisibility,
      [assetType]: !assetLayerVisibility[assetType],
    });
  };

  const toggleAllAssetLayers = (visible: boolean) => {
    const newVisibility: Record<string, boolean> = {};
    ASSET_TYPES.forEach((type) => {
      newVisibility[type] = visible;
    });
    setAssetLayerVisibility(newVisibility);
  };

  const toggleOverlayLayer = (layerId: string) => {
    setOverlayVisibility({
      ...overlayVisibility,
      [layerId]: !overlayVisibility[layerId],
    });
  };

  const navigateToAsset = (asset: any) => {
    if (!asset.latitude || !asset.longitude) {
      toast.error("This asset doesn't have GPS coordinates");
      return;
    }

    setRouteToAsset(asset);
    setNavigationMode(true);

    // Open in external navigation app
    if (userLocation) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${asset.latitude},${asset.longitude}`;
      window.open(url, "_blank");
    } else {
      // Just show destination
      const url = `https://www.google.com/maps/search/?api=1&query=${asset.latitude},${asset.longitude}`;
      window.open(url, "_blank");
    }
  };

  const centerOnAsset = (asset: any) => {
    if (asset.latitude && asset.longitude) {
      setMapCenter([asset.latitude, asset.longitude]);
      setMapZoom(16);
      setSelectedAsset(asset);
      toast.success(`Centered on ${asset.name || asset.referenceNumber}`);
    } else {
      toast.error("This asset doesn't have GPS coordinates");
    }
  };

  const filteredAssets = useMemo(() => {
    const filtered = assets.filter((asset) => {
      // Only show assets with coordinates
      if (!asset.latitude || !asset.longitude) return false;

      // Apply filters
      if (filters.type !== "all" && asset.type !== filters.type) return false;
      if (filters.region !== "all" && asset.region_name !== filters.region) return false;
      if (filters.ward !== "all" && asset.ward_name !== filters.ward) return false;
      if (filters.depot !== "all" && asset.depot_name !== filters.depot) return false;
      if (filters.owner !== "all" && asset.owner_name !== filters.owner) return false;
      if (filters.roadName !== "all" && asset.road_name !== filters.roadName) return false;
      if (filters.status !== "all" && asset.status?.toLowerCase() !== filters.status) return false;
      
      // Apply search
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matches = 
          asset.name?.toLowerCase().includes(search) ||
          asset.referenceNumber?.toLowerCase().includes(search) ||
          asset.type?.toLowerCase().includes(search) ||
          asset.roadName?.toLowerCase().includes(search) ||
          asset.road_name?.toLowerCase().includes(search) ||
          asset.region_name?.toLowerCase().includes(search) ||
          asset.ward_name?.toLowerCase().includes(search);
        if (!matches) return false;
      }
      
      // Apply layer visibility (if layer visibility not set yet, show asset by default)
      if (assetLayerVisibility[asset.type] === false) return false;
      
      return true;
    });
    
    console.log(`[GISMapPage] Filtered assets: ${filtered.length} of ${assets.length} total`);
    console.log(`[GISMapPage] Layer visibility state:`, assetLayerVisibility);
    
    return filtered;
  }, [assets, filters, searchTerm, assetLayerVisibility]);

  // Get unique values for filter dropdowns
  const uniqueRegions = useMemo(() => {
    const regions = assets.map(a => a.region_name).filter(Boolean);
    return [...new Set(regions)].sort();
  }, [assets]);

  const uniqueWards = useMemo(() => {
    const wards = assets.map(a => a.ward_name).filter(Boolean);
    return [...new Set(wards)].sort();
  }, [assets]);

  const uniqueDepots = useMemo(() => {
    const depots = assets.map(a => a.depot_name).filter(Boolean);
    return [...new Set(depots)].sort();
  }, [assets]);

  const uniqueOwners = useMemo(() => {
    const owners = assets.map(a => a.owner_name).filter(Boolean);
    return [...new Set(owners)].sort();
  }, [assets]);

  const uniqueRoadNames = useMemo(() => {
    const roads = assets.map(a => a.road_name).filter(Boolean);
    return [...new Set(roads)].sort();
  }, [assets]);

  const visibleAssetCount = filteredAssets.length;

  // Debug: Count assets with/without coordinates
  const assetsWithCoords = useMemo(() => {
    return assets.filter(a => a.latitude && a.longitude).length;
  }, [assets]);

  const assetsWithoutCoords = useMemo(() => {
    return assets.filter(a => !a.latitude || !a.longitude).length;
  }, [assets]);

  const isAdmin = user?.role === "admin" || user?.role === "supervisor";

  // Reset all filters
  const resetAllFilters = () => {
    setFilters({
      type: "all",
      region: "all",
      ward: "all",
      depot: "all",
      owner: "all",
      roadName: "all",
      status: "all",
    });
    setSearchTerm("");
    toggleAllAssetLayers(true);
    toast.success("All filters reset");
  };

  // Export functions
  const exportAsCSV = () => {
    if (filteredAssets.length === 0) {
      toast.error("No assets to export");
      return;
    }

    const headers = [
      "Reference Number", "Asset Name", "Asset Type", "Region", "Ward", "Depot", "Owner", 
      "Road Name", "Road Number", "KM Marker", "Condition", "CI Score", "Urgency", "Status", 
      "Latitude", "Longitude", "Install Date", "Replacement Value", "Responsible Party"
    ];

    const rows = filteredAssets.map(asset => [
      asset.referenceNumber || "", asset.name || "", asset.type || "", asset.region_name || "",
      asset.ward_name || "", asset.depot_name || "", asset.owner_name || "",
      asset.road_name || "", asset.roadNumber || "", asset.kilometer || "", asset.condition || "",
      asset.latest_ci !== null ? asset.latest_ci : "", asset.latest_urgency || "",
      asset.status || "", asset.latitude || "", asset.longitude || "",
      asset.install_date ? new Date(asset.install_date).toLocaleDateString() : "",
      asset.replacement_value || "", asset.responsible_party_name || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `TAMS360_Assets_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredAssets.length} assets to CSV`);
  };

  const exportAsPDF = () => {
    const reportWindow = window.open("", "_blank");
    if (!reportWindow) {
      toast.error("Please allow popups to export PDF");
      return;
    }

    const html = `<!DOCTYPE html><html><head><title>TAMS360 Map Report</title><style>
      body{font-family:Arial,sans-serif;margin:20px;color:#010D13}h1{color:#010D13;border-bottom:3px solid #39AEDF;padding-bottom:10px}
      .summary{background:#f5f5f5;padding:15px;border-radius:5px;margin:20px 0}.summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:15px}
      .summary-item{text-align:center}.summary-value{font-size:24px;font-weight:bold;color:#39AEDF}.summary-label{font-size:12px;color:#666;margin-top:5px}
      table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:11px}
      th{background-color:#010D13;color:white}tr:nth-child(even){background-color:#f9f9f9}
      .excellent{color:#5DB32A;font-weight:bold}.good{color:#39AEDF;font-weight:bold}.fair{color:#F8D227;font-weight:bold}.poor{color:#FF4444;font-weight:bold}
      @media print{body{margin:0}button{display:none}}</style></head><body>
      <h1>🗺️ TAMS360 - GIS Asset Map Report</h1>
      <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
      <p><strong>User:</strong> ${user?.email || "Unknown"}</p>
      <div class="summary"><h2>Summary</h2><div class="summary-grid">
        <div class="summary-item"><div class="summary-value">${filteredAssets.length}</div><div class="summary-label">Visible Assets</div></div>
        <div class="summary-item"><div class="summary-value">${filteredAssets.filter(a => a.condition?.toLowerCase() === "excellent" || a.condition?.toLowerCase() === "good").length}</div><div class="summary-label">Good/Excellent</div></div>
        <div class="summary-item"><div class="summary-value">${filteredAssets.filter(a => a.condition?.toLowerCase() === "poor").length}</div><div class="summary-label">Poor Condition</div></div>
        <div class="summary-item"><div class="summary-value">${filteredAssets.filter(a => a.latest_urgency === "4" || a.latest_urgency === "Immediate").length}</div><div class="summary-label">Urgent Actions</div></div>
      </div></div>
      <h2>Asset Details</h2><table><thead><tr><th>Ref</th><th>Name</th><th>Type</th><th>Location</th><th>Condition</th><th>CI</th><th>Status</th><th>GPS</th></tr></thead><tbody>
      ${filteredAssets.map(asset => `<tr><td>${asset.referenceNumber || "N/A"}</td><td>${asset.name || "N/A"}</td><td>${asset.type || "N/A"}</td>
        <td>${asset.roadName || asset.roadNumber || "N/A"}${asset.kilometer ? ` KM${asset.kilometer}` : ""}</td>
        <td class="${asset.condition?.toLowerCase() || ""}">${asset.condition || "N/A"}</td><td>${asset.latest_ci !== null ? asset.latest_ci : "N/A"}</td>
        <td>${asset.status || "N/A"}</td><td>${asset.latitude && asset.longitude ? `${asset.latitude.toFixed(6)}, ${asset.longitude.toFixed(6)}` : "N/A"}</td></tr>`).join("")}
      </tbody></table>
      <div style="margin-top:20px;text-align:center">
        <button onclick="window.print()" style="background:#39AEDF;color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;font-size:14px">Print / Save as PDF</button>
        <button onclick="window.close()" style="background:#455B5E;color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;font-size:14px;margin-left:10px">Close</button>
      </div></body></html>`;

    reportWindow.document.write(html);
    reportWindow.document.close();
    toast.success("PDF report opened - use browser Print to save as PDF");
  };

  const exportAsImage = async () => {
    if (!mapContainerRef.current) {
      toast.error("Map container not found");
      return;
    }

    try {
      toast.info("Capturing map...");
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(mapContainerRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `TAMS360_Map_${new Date().toISOString().split('T')[0]}.png`;
          link.click();
          URL.revokeObjectURL(url);
          toast.success("Map image exported successfully!");
        }
      });
    } catch (error) {
      console.error("Error capturing map:", error);
      toast.error("Failed to capture map image");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">GIS Map</h1>
          <p className="text-muted-foreground">Interactive map of all road assets with navigation</p>
        </div>
        <div className="flex gap-2">
          {hasNetworkError && (
            <Button variant="destructive" onClick={fetchAssets}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Connection
            </Button>
          )}
          <Button variant="outline" onClick={resetAllFilters}>
            <Filter className="w-4 h-4 mr-2" />
            Reset Filters
          </Button>
          <Button variant="outline" onClick={getUserLocation}>
            <LocateFixed className="w-4 h-4 mr-2" />
            My Location
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Map
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[10000]">
              <DropdownMenuItem onClick={exportAsCSV}>
                <FileText className="w-4 h-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportAsPDF}>
                <FileText className="w-4 h-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportAsImage}>
                <ImageIcon className="w-4 h-4 mr-2" />
                Export as Image
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {/* Filters & Layers Sidebar */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Color Mode Selector - Available for all tabs */}
            <div>
              <Label className="text-sm mb-2 block">Color By</Label>
              <Select value={colorMode} onValueChange={(v: any) => setColorMode(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ci">Condition Index (CI)</SelectItem>
                  <SelectItem value="urgency">Urgency</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="region">Region</SelectItem>
                  <SelectItem value="ward">Ward</SelectItem>
                  <SelectItem value="depot">Depot</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Marker Clustering Toggle */}
            <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm cursor-pointer" htmlFor="clustering-toggle">
                  Group Nearby Assets
                </Label>
              </div>
              <Checkbox
                id="clustering-toggle"
                checked={clusteringEnabled}
                onCheckedChange={setClusteringEnabled}
              />
            </div>

            <Tabs defaultValue="filters" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="filters">Filters</TabsTrigger>
                <TabsTrigger value="layers">Layers</TabsTrigger>
                <TabsTrigger value="overlays">Overlays</TabsTrigger>
              </TabsList>

              {/* Filters Tab */}
              <TabsContent value="filters" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Search Assets</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Asset Type</Label>
                  <Select value={filters.type} onValueChange={(v) => setFilters({ ...filters, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {ASSET_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Region</Label>
                  <Select value={filters.region} onValueChange={(v) => setFilters({ ...filters, region: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Regions</SelectItem>
                      {uniqueRegions.map((region) => (
                        <SelectItem key={region} value={region}>{region}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Ward</Label>
                  <Select value={filters.ward} onValueChange={(v) => setFilters({ ...filters, ward: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Wards</SelectItem>
                      {uniqueWards.map((ward) => (
                        <SelectItem key={ward} value={ward}>{ward}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Depot</Label>
                  <Select value={filters.depot} onValueChange={(v) => setFilters({ ...filters, depot: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Depots</SelectItem>
                      {uniqueDepots.map((depot) => (
                        <SelectItem key={depot} value={depot}>{depot}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Owner</Label>
                  <Select value={filters.owner} onValueChange={(v) => setFilters({ ...filters, owner: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Owners</SelectItem>
                      {uniqueOwners.map((owner) => (
                        <SelectItem key={owner} value={owner}>{owner}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Road Name</Label>
                  <Select value={filters.roadName} onValueChange={(v) => setFilters({ ...filters, roadName: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roads</SelectItem>
                      {uniqueRoadNames.map((road) => (
                        <SelectItem key={road} value={road}>{road}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Status</Label>
                  <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="damaged">Damaged</SelectItem>
                      <SelectItem value="missing">Missing</SelectItem>
                      <SelectItem value="repaired">Repaired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* Asset Layers Tab */}
              <TabsContent value="layers" className="space-y-3 mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Asset Layers
                  </h4>
                </div>

                <div className="flex gap-2 mb-3">
                  <Button size="sm" variant="outline" onClick={() => toggleAllAssetLayers(true)} className="flex-1">
                    Show All
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleAllAssetLayers(false)} className="flex-1">
                    Hide All
                  </Button>
                </div>

                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {ASSET_TYPES.map((type) => {
                    const count = assets.filter((a) => a.type === type && a.latitude && a.longitude).length;
                    return (
                      <div key={type} className="flex items-center justify-between p-2 rounded hover:bg-accent">
                        <div className="flex items-center space-x-2 flex-1">
                          <Checkbox
                            id={`layer-${type}`}
                            checked={assetLayerVisibility[type]}
                            onCheckedChange={() => toggleAssetLayer(type)}
                          />
                          <label htmlFor={`layer-${type}`} className="text-sm cursor-pointer flex-1">
                            {type}
                          </label>
                        </div>
                        <Badge variant="secondary" className="ml-2">{count}</Badge>
                      </div>
                    );
                  })}
                </div>


              </TabsContent>

              {/* Overlay Layers Tab (Admin Only) */}
              <TabsContent value="overlays" className="space-y-3 mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">External Data</h4>
                  {isAdmin && (
                    <Dialog open={isAddOverlayOpen} onOpenChange={setIsAddOverlayOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Plus className="w-3 h-3 mr-1" />
                          Add
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Overlay Layer</DialogTitle>
                          <DialogDescription>
                            Add external GIS data for reference (GeoJSON, KML, WMS)
                          </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="overlay-name">Layer Name *</Label>
                            <Input
                              id="overlay-name"
                              value={newOverlay.name}
                              onChange={(e) => setNewOverlay({ ...newOverlay, name: e.target.value })}
                              placeholder="e.g., District Boundaries"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="overlay-type">Data Type *</Label>
                            <Select value={newOverlay.type} onValueChange={(v) => setNewOverlay({ ...newOverlay, type: v })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="geojson">GeoJSON</SelectItem>
                                <SelectItem value="kml">KML</SelectItem>
                                <SelectItem value="wms">WMS Service</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="overlay-url">Data URL *</Label>
                            <Input
                              id="overlay-url"
                              value={newOverlay.url}
                              onChange={(e) => setNewOverlay({ ...newOverlay, url: e.target.value })}
                              placeholder="https://example.com/data.geojson"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="overlay-color">Display Color</Label>
                            <div className="flex gap-2">
                              <Input
                                id="overlay-color"
                                type="color"
                                value={newOverlay.color}
                                onChange={(e) => setNewOverlay({ ...newOverlay, color: e.target.value })}
                                className="w-20"
                              />
                              <Input
                                value={newOverlay.color}
                                onChange={(e) => setNewOverlay({ ...newOverlay, color: e.target.value })}
                                placeholder="#39AEDF"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="overlay-desc">Description</Label>
                            <Textarea
                              id="overlay-desc"
                              value={newOverlay.description}
                              onChange={(e) => setNewOverlay({ ...newOverlay, description: e.target.value })}
                              rows={3}
                              placeholder="Optional description..."
                            />
                          </div>
                        </div>

                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsAddOverlayOpen(false)}>Cancel</Button>
                          <Button onClick={handleAddOverlay}>Add Layer</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>

                {overlayLayers.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    {isAdmin ? "No overlay layers yet. Add one to get started." : "No overlay layers available"}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {overlayLayers.map((layer) => (
                      <div key={layer.id} className="flex items-center justify-between p-2 rounded hover:bg-accent">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => toggleOverlayLayer(layer.id)}
                          >
                            {overlayVisibility[layer.id] ? (
                              <Eye className="w-3 h-3" />
                            ) : (
                              <EyeOff className="w-3 h-3" />
                            )}
                          </Button>
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: layer.color }}
                          ></div>
                          <span className="text-sm truncate">{layer.name}</span>
                        </div>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 ml-2"
                            onClick={() => handleDeleteOverlay(layer.id)}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {!isAdmin && overlayLayers.length > 0 && (
                  <p className="text-xs text-muted-foreground pt-2 border-t">
                    Only admins can add/remove overlay layers
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Map Area */}
        <div className="lg:col-span-3 space-y-4">
          {/* Map Container */}
          <Card>
            <CardContent className="p-0">
              <div className="relative" ref={mapContainerRef}>
                <div className="h-[600px] rounded-lg overflow-hidden">
                  <SimpleMap
                    center={mapCenter}
                    zoom={mapZoom}
                    assets={filteredAssets}
                    userLocation={userLocation}
                    onAssetClick={setSelectedAsset}
                    onNavigate={navigateToAsset}
                    colorMode={colorMode}
                    mapLayer={mapLayer}
                    clusteringEnabled={clusteringEnabled}
                    accessToken={accessToken || publicAnonKey}
                  />
                </div>

                {/* Map Layer Selector */}
                <div className="absolute top-4 right-4 bg-card border shadow-lg rounded-lg p-2 z-[1000]">
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={mapLayer === "street" ? "default" : "outline"}
                      onClick={() => setMapLayer("street")}
                      className="h-8 px-3 text-xs"
                    >
                      Street
                    </Button>
                    <Button
                      size="sm"
                      variant={mapLayer === "satellite" ? "default" : "outline"}
                      onClick={() => setMapLayer("satellite")}
                      className="h-8 px-3 text-xs"
                    >
                      Satellite
                    </Button>
                    <Button
                      size="sm"
                      variant={mapLayer === "hybrid" ? "default" : "outline"}
                      onClick={() => setMapLayer("hybrid")}
                      className="h-8 px-3 text-xs"
                    >
                      Hybrid
                    </Button>
                  </div>
                </div>

                {/* Color Legend */}
                <div className="absolute bottom-4 right-4 bg-card border shadow-lg rounded-lg p-3 z-[1000]">
                  <div className="text-xs font-semibold mb-2">
                    {colorMode === "condition" && "Condition"}
                    {colorMode === "ci" && "Condition Index (CI)"}
                    {colorMode === "urgency" && "Urgency Level"}
                    {colorMode === "status" && "Asset Status"}
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {colorMode === "condition" && (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: "#5DB32A" }}></div>
                          <span>Excellent</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: "#39AEDF" }}></div>
                          <span>Good</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: "#F8D227" }}></div>
                          <span>Fair</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: "#FF4444" }}></div>
                          <span>Poor</span>
                        </div>
                      </>
                    )}
                    {colorMode === "ci" && (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: "#5DB32A" }}></div>
                          <span>80-100 (Excellent)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: "#39AEDF" }}></div>
                          <span>60-79 (Good)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: "#F8D227" }}></div>
                          <span>40-59 (Fair)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: "#FF4444" }}></div>
                          <span>0-39 (Poor)</span>
                        </div>
                      </>
                    )}
                    {colorMode === "urgency" && (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: "#FF4444" }}></div>
                          <span>80+ (High)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: "#F8D227" }}></div>
                          <span>50-79 (Medium)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: "#39AEDF" }}></div>
                          <span>20-49 (Low)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: "#5DB32A" }}></div>
                          <span>0-19 (Very Low)</span>
                        </div>
                      </>
                    )}
                    {colorMode === "status" && (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: "#5DB32A" }}></div>
                          <span>Active</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: "#39AEDF" }}></div>
                          <span>Repaired</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: "#FF4444" }}></div>
                          <span>Damaged/Missing</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: "#455B5E" }}></div>
                          <span>Other</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Asset count overlay */}
                <div className="absolute bottom-4 left-4 bg-card border shadow-lg rounded-lg p-3 z-[1000]">
                  <div className="text-sm space-y-1">
                    <div className="font-semibold">Assets on Map</div>
                    <div className="text-2xl font-bold text-primary">{visibleAssetCount}</div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div>Total in DB: {totalAssetCount}</div>
                      <div>With GPS: {assetsWithCoords}</div>
                      {assetsWithoutCoords > 0 && (
                        <div className="text-orange-600">No GPS: {assetsWithoutCoords}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Overlay indicator */}
                {Object.values(overlayVisibility).some((v) => v) && (
                  <div className="absolute top-4 left-4 bg-card border shadow-lg rounded-lg p-2 z-[1000]">
                    <div className="text-xs font-medium flex items-center gap-2">
                      <Layers className="w-3 h-3" />
                      {Object.values(overlayVisibility).filter((v) => v).length} overlay(s) active
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Asset Details Panel */}
          {selectedAsset && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedAsset.name || selectedAsset.referenceNumber}</CardTitle>
                    <CardDescription>{selectedAsset.type}</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedAsset(null)}
                  >
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Reference</p>
                    <p className="font-medium">{selectedAsset.referenceNumber || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Condition</p>
                    <Badge
                      variant={
                        selectedAsset.condition === "Excellent" ? "default" :
                        selectedAsset.condition === "Good" ? "secondary" :
                        selectedAsset.condition === "Fair" ? "outline" : "destructive"
                      }
                    >
                      {selectedAsset.condition}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge>{selectedAsset.status}</Badge>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">
                      {selectedAsset.roadName || selectedAsset.roadNumber || "No road info"}
                      {selectedAsset.kilometer && ` (KM ${selectedAsset.kilometer})`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">GPS Coordinates</p>
                    <p className="font-medium text-xs">
                      {selectedAsset.latitude && selectedAsset.longitude
                        ? `${selectedAsset.latitude}, ${selectedAsset.longitude}`
                        : "Not available"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap mb-4">
                  <Button size="sm" onClick={() => centerOnAsset(selectedAsset)}>
                    <MapPin className="w-3 h-3 mr-1" />
                    Center on Map
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => navigateToAsset(selectedAsset)}
                    disabled={!selectedAsset.latitude || !selectedAsset.longitude}
                  >
                    <Route className="w-3 h-3 mr-1" />
                    Navigate Here
                  </Button>
                  <Button size="sm" variant="outline">View History</Button>
                  <Button size="sm" variant="outline">Schedule Inspection</Button>
                </div>

                {/* Photo Gallery */}
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Asset Photos
                  </h4>
                  {loadingPhotos ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Loading photos...</span>
                    </div>
                  ) : selectedAssetPhotos.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {selectedAssetPhotos.map((photo, index) => (
                        <div
                          key={`${photo.photo_id}-${index}`}
                          className="relative group cursor-pointer rounded-lg overflow-hidden border hover:border-primary transition-colors"
                          onClick={() => window.open(photo.signedUrl || photo.url, '_blank')}
                        >
                          <div className="aspect-square relative">
                            {photo.signedUrl || photo.url ? (
                              <img
                                src={photo.signedUrl || photo.url}
                                alt={photo.caption || `Photo ${photo.photo_number}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted">
                                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-white text-xs">
                            {photo.caption || `Photo ${photo.photo_number}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground bg-muted/30 rounded-lg">
                      <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No photos available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assets List (filtered) */}
          {filteredAssets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Visible Assets ({filteredAssets.length})</CardTitle>
                <CardDescription>Assets currently shown on the map</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {filteredAssets.slice(0, 20).map((asset) => (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between p-3 rounded border hover:bg-accent cursor-pointer"
                      onClick={() => centerOnAsset(asset)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{asset.name || asset.referenceNumber}</p>
                        <p className="text-sm text-muted-foreground">{asset.type}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Badge variant="outline">{asset.condition}</Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateToAsset(asset);
                          }}
                          disabled={!asset.latitude || !asset.longitude}
                        >
                          <Navigation className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {filteredAssets.length > 20 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      And {filteredAssets.length - 20} more...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}