import { useState, useEffect, useContext, useRef, useMemo } from "react";
import { AuthContext } from "../../App";
import { useTenant } from "../../contexts/TenantContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { 
  MapPin, 
  Navigation2, 
  Crosshair,
  Loader2,
  ChevronRight,
  Layers,
  Filter,
  X,
  ChevronDown
} from "lucide-react";
import { api } from "@/app/utils/api";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";

// Asset type icon SVG paths
const ASSET_ICON_SHAPES = {
  "Road Sign": "M6,2 L10,2 L12,4 L12,8 L10,10 L10,14 L6,14 L6,10 L4,8 L4,4 Z",
  "Guardrail": "M2,5 L14,5 L14,7 L2,7 Z M2,9 L14,9 L14,11 L2,11 Z M4,3 L6,3 L6,13 L4,13 Z M10,3 L12,3 L12,13 L10,13 Z",
  "Traffic Signal": "M6,2 L10,2 L10,14 L6,14 Z M7,3.5 A1,1 0 1,1 9,3.5 A1,1 0 1,1 7,3.5 M7,8 A1,1 0 1,1 9,8 A1,1 0 1,1 7,8 M7,12.5 A1,1 0 1,1 9,12.5 A1,1 0 1,1 7,12.5",
  "Gantry": "M2,3 L4,3 L4,11 L2,11 Z M12,3 L14,3 L14,11 L12,11 Z M2,3 L14,3 L14,5 L2,5 Z",
  "Fence": "M2,2 L4,2 L4,14 L2,14 Z M6,2 L8,2 L8,14 L6,14 Z M10,2 L12,2 L12,14 L10,14 Z M2,6 L12,6 L12,7 L2,7 Z M2,10 L12,10 L12,11 L2,11 Z",
  "Safety Barriers": "M2,6 L14,6 L14,10 L2,10 Z",
  "Guidepost": "M7,2 L9,2 L9,14 L7,14 Z M5,3 L11,3 L11,6 L5,6 Z",
  "Road Markings": "M3,7 L13,7 L13,9 L3,9 Z M3,11 L13,11 L13,13 L3,13 Z",
  "Raised Road Markers": "M8,5 A3,3 0 1,1 8,11 A3,3 0 1,1 8,5",
};

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

interface Asset {
  id: string;
  asset_ref: string;
  asset_type_name: string;
  description: string;
  latitude: number;
  longitude: number;
  condition: string;
  status: string;
  latest_ci?: number;
  latest_urgency?: number;
  latest_condition?: string;
  status_name?: string;
  region_name?: string;
  ward_name?: string;
  depot_name?: string;
  owner_name?: string;
  road_name?: string;
}

// Get color based on color mode
const getMarkerColor = (asset: any, colorMode: string = "ci") => {
  switch (colorMode) {
    case "ci": {
      const ci = asset.latest_ci || 0;
      if (ci >= 80) return "#5DB32A"; // Excellent (green)
      if (ci >= 60) return "#39AEDF"; // Good (blue)
      if (ci >= 40) return "#F8D227"; // Fair (yellow)
      return "#FF4444"; // Poor (red)
    }
    case "urgency": {
      const urgency = asset.latest_urgency || 0;
      if (urgency >= 80) return "#FF4444"; // High urgency (red)
      if (urgency >= 50) return "#F8D227"; // Medium (yellow)
      if (urgency >= 20) return "#39AEDF"; // Low (blue)
      return "#5DB32A"; // Very low (green)
    }
    case "status": {
      const status = asset.status_name || asset.status || "";
      if (status.toLowerCase() === "active") return "#5DB32A";
      if (status.toLowerCase() === "damaged") return "#FF4444";
      if (status.toLowerCase() === "missing") return "#FF4444";
      if (status.toLowerCase() === "repaired") return "#39AEDF";
      return "#455B5E";
    }
    default:
      return "#39AEDF";
  }
};

// Create custom marker icon
const createAssetIcon = (assetType: string, asset: any, colorMode: string = "ci") => {
  const color = getMarkerColor(asset, colorMode);
  const iconShape = ASSET_ICON_SHAPES[assetType as keyof typeof ASSET_ICON_SHAPES] || ASSET_ICON_SHAPES["Road Markings"];

  return L.divIcon({
    className: "custom-asset-marker",
    html: `
      <div style="position: relative; width: 32px; height: 42px;">
        <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 26 16 26s16-14 16-26C32 7.2 24.8 0 16 0z" 
                fill="${color}" stroke="#fff" stroke-width="2"/>
          <g transform="translate(8, 4) scale(1)">
            <path d="${iconShape}" fill="#fff" stroke="#fff" stroke-width="0.5"/>
          </g>
        </svg>
      </div>
    `,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42]
  });
};

export default function MobileMapPage() {
  const { accessToken } = useContext(AuthContext);
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [trackingLocation, setTrackingLocation] = useState(false);
  
  // Map controls
  const [colorMode, setColorMode] = useState<"ci" | "urgency" | "status">("ci");
  const [mapLayer, setMapLayer] = useState<"street" | "satellite" | "hybrid">("street");
  const [clusteringEnabled, setClusteringEnabled] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    type: "all",
    region: "all",
    ward: "all",
    depot: "all",
    owner: "all",
    roadName: "all",
    status: "all",
  });

  // Layer visibility - dynamically populated based on actual asset types
  const [assetLayerVisibility, setAssetLayerVisibility] = useState<Record<string, boolean>>({});

  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerClusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-25.7479, 28.2293], // Pretoria default
      zoom: 13,
      zoomControl: true,
      maxZoom: 22,
    });

    // Add tile layer
    const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 22,
    });
    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update tile layer when mapLayer changes
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;

    tileLayerRef.current.remove();

    let tileLayer: L.TileLayer;
    
    switch (mapLayer) {
      case "satellite":
        tileLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
          attribution: '&copy; Google',
          maxZoom: 22,
        });
        break;
      case "hybrid":
        tileLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
          attribution: '&copy; Google',
          maxZoom: 22,
        });
        break;
      default:
        tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 22,
        });
    }

    tileLayer.addTo(mapRef.current);
    tileLayerRef.current = tileLayer;
  }, [mapLayer]);

  // Fetch assets
  useEffect(() => {
    fetchAssets();
  }, [accessToken, tenantId]);

  // Get user's location
  useEffect(() => {
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userPos: [number, number] = [
              position.coords.latitude,
              position.coords.longitude,
            ];
            setUserLocation(userPos);
            if (mapRef.current && assets.length === 0) {
              mapRef.current.setView(userPos, 13);
            }
          },
          () => {}, // Silent error
          { enableHighAccuracy: true }
        );
      }
    } catch (error) {
      // Suppress errors
    }
  }, []);

  // Dynamically initialize layer visibility when assets change
  useEffect(() => {
    if (assets.length > 0) {
      const assetTypes = [...new Set(assets.map(a => a.asset_type_name).filter(Boolean))];
      
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

  // Filtered assets - MOVED HERE BEFORE useEffects that use it
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (filters.type !== "all" && asset.asset_type_name !== filters.type) return false;
      if (filters.region !== "all" && asset.region_name !== filters.region) return false;
      if (filters.ward !== "all" && asset.ward_name !== filters.ward) return false;
      if (filters.depot !== "all" && asset.depot_name !== filters.depot) return false;
      if (filters.owner !== "all" && asset.owner_name !== filters.owner) return false;
      if (filters.roadName !== "all" && asset.road_name !== filters.roadName) return false;
      if (filters.status !== "all" && asset.status?.toLowerCase() !== filters.status) return false;
      // If layer visibility not set yet, show asset by default
      if (assetLayerVisibility[asset.asset_type_name] === false) return false;
      return true;
    });
  }, [assets, filters, assetLayerVisibility]);

  // Unique filter values
  const uniqueAssetTypes = useMemo(() => [...new Set(assets.map(a => a.asset_type_name).filter(Boolean))].sort(), [assets]);
  const uniqueRegions = useMemo(() => [...new Set(assets.map(a => a.region_name).filter(Boolean))].sort(), [assets]);
  const uniqueWards = useMemo(() => [...new Set(assets.map(a => a.ward_name).filter(Boolean))].sort(), [assets]);
  const uniqueDepots = useMemo(() => [...new Set(assets.map(a => a.depot_name).filter(Boolean))].sort(), [assets]);
  const uniqueOwners = useMemo(() => [...new Set(assets.map(a => a.owner_name).filter(Boolean))].sort(), [assets]);
  const uniqueRoadNames = useMemo(() => [...new Set(assets.map(a => a.road_name).filter(Boolean))].sort(), [assets]);

  // Legend items based on color mode
  const legendItems = useMemo(() => {
    switch (colorMode) {
      case "ci":
        return [
          { label: "Excellent (80-100)", color: "#5DB32A" },
          { label: "Good (60-79)", color: "#39AEDF" },
          { label: "Fair (40-59)", color: "#F8D227" },
          { label: "Poor (0-39)", color: "#FF4444" },
        ];
      case "urgency":
        return [
          { label: "Critical (80+)", color: "#FF4444" },
          { label: "High (50-79)", color: "#F8D227" },
          { label: "Medium (20-49)", color: "#39AEDF" },
          { label: "Low (0-19)", color: "#5DB32A" },
        ];
      case "status":
        return [
          { label: "Active", color: "#5DB32A" },
          { label: "Repaired", color: "#39AEDF" },
          { label: "Damaged/Missing", color: "#FF4444" },
          { label: "Other", color: "#455B5E" },
        ];
      default:
        return [];
    }
  }, [colorMode]);

  // Update user location marker
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    const userIcon = L.divIcon({
      className: "user-location-marker",
      html: `
        <div style="
          width: 20px;
          height: 20px;
          background: #39AEDF;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        "></div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    const marker = L.marker(userLocation, { icon: userIcon }).addTo(mapRef.current);
    marker.bindPopup('<div class="text-sm font-semibold">Your Location</div>');
    userMarkerRef.current = marker;

    return () => {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
    };
  }, [userLocation]);

  // Update markers when assets, colorMode, or clustering changes
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing cluster group
    if (markerClusterRef.current) {
      markerClusterRef.current.remove();
      markerClusterRef.current = null;
    }

    // Create marker cluster group if enabled
    if (clusteringEnabled) {
      markerClusterRef.current = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
      });
    }

    // Add markers
    filteredAssets.forEach(asset => {
      if (!mapRef.current) return;

      const icon = createAssetIcon(asset.asset_type_name, asset, colorMode);
      const marker = L.marker([asset.latitude, asset.longitude], { icon });
      
      const popupContent = `
        <div class="min-w-[200px] p-2">
          <div class="font-semibold text-sm mb-1">${asset.asset_ref}</div>
          <div class="text-xs mb-2">${asset.description}</div>
          <div class="flex flex-wrap gap-1 mb-2">
            <span class="inline-flex items-center rounded-md border px-2 py-0.5 text-xs">${asset.asset_type_name}</span>
            ${asset.latest_ci ? `<span class="inline-flex items-center rounded-md px-2 py-0.5 text-xs bg-blue-100 text-blue-800">CI: ${asset.latest_ci}</span>` : ''}
          </div>
        </div>
      `;
      
      marker.bindPopup(popupContent);
      marker.on('click', () => {
        setSelectedAsset(asset);
      });

      if (clusteringEnabled && markerClusterRef.current) {
        markerClusterRef.current.addLayer(marker);
      } else {
        marker.addTo(mapRef.current);
      }
    });

    // Add cluster group to map
    if (clusteringEnabled && markerClusterRef.current) {
      markerClusterRef.current.addTo(mapRef.current);
    }

    // Center on first asset if no user location
    if (filteredAssets.length > 0 && !userLocation) {
      const firstAsset = filteredAssets[0];
      mapRef.current.setView([firstAsset.latitude, firstAsset.longitude], 13);
    }

    return () => {
      if (markerClusterRef.current) {
        markerClusterRef.current.clearLayers();
      }
    };
  }, [filteredAssets, colorMode, clusteringEnabled]);

  const fetchAssets = async () => {
    try {
      const data = await api.get<{ assets: any[]; total: number }>("/assets?pageSize=500");
      
      const mappedAssets = (data.assets || []).map((asset: any) => ({
        ...asset,
        id: asset.asset_id || asset.id,
        latitude: asset.gps_lat || asset.latitude,
        longitude: asset.gps_lng || asset.longitude,
        latest_ci: asset.latest_ci,
        latest_urgency: asset.latest_urgency,
        latest_condition: asset.latest_condition,
        status_name: asset.status_name,
        region_name: asset.region_name,
        ward_name: asset.ward_name,
        depot_name: asset.depot_name,
        owner_name: asset.owner_name,
        road_name: asset.road_name,
      })).filter((asset: any) => asset.latitude && asset.longitude);
      
      setAssets(mappedAssets);
    } catch (error) {
      console.error("Failed to fetch assets:", error);
    } finally {
      setLoading(false);
    }
  };

  const centerOnUser = () => {
    if (!userLocation) {
      setTrackingLocation(true);
      try {
        if (!navigator.geolocation) {
          setTrackingLocation(false);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userPos: [number, number] = [
              position.coords.latitude,
              position.coords.longitude,
            ];
            setUserLocation(userPos);
            if (mapRef.current) {
              mapRef.current.setView(userPos, 15);
            }
            setTrackingLocation(false);
          },
          () => setTrackingLocation(false),
          { enableHighAccuracy: true }
        );
      } catch (error) {
        setTrackingLocation(false);
      }
    } else if (mapRef.current) {
      mapRef.current.setView(userLocation, 15);
    }
  };

  return (
    <div className="relative h-screen">
      {/* Map Container */}
      <div ref={mapContainerRef} className="h-full w-full" />

      {/* Top Controls */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex items-center justify-between gap-2">
        {/* Asset Count */}
        <Badge variant="secondary" className="shadow-lg px-3 py-1.5 text-xs">
          <MapPin className="w-3 h-3 mr-1.5" />
          {filteredAssets.length} Assets
        </Badge>

        {/* Color Mode Selector */}
        <Select value={colorMode} onValueChange={(v: any) => setColorMode(v)}>
          <SelectTrigger className="w-32 h-8 text-xs shadow-lg bg-white dark:bg-slate-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ci">CI</SelectItem>
            <SelectItem value="urgency">Urgency</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Map Type Selector - Top Right */}
      <div className="absolute top-16 right-4 z-[1000] bg-white dark:bg-slate-800 border shadow-lg rounded-lg p-1 flex gap-1">
        <Button
          size="sm"
          variant={mapLayer === "street" ? "default" : "ghost"}
          onClick={() => setMapLayer("street")}
          className="h-7 px-2 text-xs"
        >
          Street
        </Button>
        <Button
          size="sm"
          variant={mapLayer === "satellite" ? "default" : "ghost"}
          onClick={() => setMapLayer("satellite")}
          className="h-7 px-2 text-xs"
        >
          Satellite
        </Button>
        <Button
          size="sm"
          variant={mapLayer === "hybrid" ? "default" : "ghost"}
          onClick={() => setMapLayer("hybrid")}
          className="h-7 px-2 text-xs"
        >
          Hybrid
        </Button>
      </div>

      {/* Right Side Controls */}
      <div className="absolute right-4 top-32 z-[1000] flex flex-col gap-2">
        {/* Legend Toggle */}
        <Button
          variant="secondary"
          size="sm"
          className="h-10 w-10 p-0 shadow-lg"
          onClick={() => setLegendOpen(!legendOpen)}
        >
          <Layers className="w-5 h-5" />
        </Button>

        {/* Filter Toggle */}
        <Button
          variant="secondary"
          size="sm"
          className="h-10 w-10 p-0 shadow-lg"
          onClick={() => setFiltersOpen(!filtersOpen)}
        >
          <Filter className="w-5 h-5" />
        </Button>

        {/* Center on User */}
        <Button
          variant="secondary"
          size="sm"
          className="h-10 w-10 p-0 shadow-lg"
          onClick={centerOnUser}
          disabled={trackingLocation}
        >
          {trackingLocation ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Crosshair className="w-5 h-5" />
          )}
        </Button>
      </div>

      {/* Legend Panel */}
      {legendOpen && (
        <div className="absolute top-32 left-4 z-[1000] bg-white dark:bg-slate-800 border shadow-lg rounded-lg p-3 max-w-[200px]">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm">Legend</h4>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setLegendOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {legendItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs">{item.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Clustering</Label>
              <Checkbox
                checked={clusteringEnabled}
                onCheckedChange={setClusteringEnabled}
              />
            </div>
          </div>
        </div>
      )}

      {/* Filters Sheet */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>Filter assets on the map</SheetDescription>
          </SheetHeader>
          
          <div className="space-y-4 mt-6">
            {/* Asset Type */}
            <div>
              <Label className="text-sm mb-2 block">Asset Type</Label>
              <Select value={filters.type} onValueChange={(v) => setFilters({ ...filters, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueAssetTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Region */}
            {uniqueRegions.length > 0 && (
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
            )}

            {/* Ward */}
            {uniqueWards.length > 0 && (
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
            )}

            {/* Asset Layer Visibility */}
            <div className="pt-4 border-t">
              <Label className="text-sm mb-3 block">Visible Layers</Label>
              <div className="space-y-2">
                {uniqueAssetTypes.map((type) => (
                  <div key={type} className="flex items-center justify-between">
                    <Label className="text-sm">{type}</Label>
                    <Checkbox
                      checked={assetLayerVisibility[type]}
                      onCheckedChange={(checked) =>
                        setAssetLayerVisibility({ ...assetLayerVisibility, [type]: !!checked })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Reset Filters */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setFilters({
                  type: "all",
                  region: "all",
                  ward: "all",
                  depot: "all",
                  owner: "all",
                  roadName: "all",
                  status: "all",
                });
                setAssetLayerVisibility(
                  ASSET_TYPES.reduce((acc, type) => ({ ...acc, [type]: true }), {})
                );
              }}
            >
              Reset All Filters
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Selected Asset Card */}
      {selectedAsset && (
        <div className="absolute bottom-20 left-0 right-0 z-[1000] p-4">
          <Card className="border-2 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant="outline" className="text-xs font-mono">
                      {selectedAsset.asset_ref}
                    </Badge>
                    {selectedAsset.latest_ci && (
                      <Badge variant="secondary" className="text-xs">
                        CI: {selectedAsset.latest_ci}
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm mb-1">
                    {selectedAsset.description}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {selectedAsset.asset_type_name}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate(`/mobile/assets/${selectedAsset.id}`)}
                  className="gap-2"
                >
                  View
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs gap-1"
                  onClick={() => {
                    window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${selectedAsset.latitude},${selectedAsset.longitude}`,
                      "_blank"
                    );
                  }}
                >
                  <Navigation2 className="w-3.5 h-3.5" />
                  Navigate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedAsset(null)}
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 flex items-center justify-center z-[1001]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm text-slate-600 dark:text-slate-400">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
}