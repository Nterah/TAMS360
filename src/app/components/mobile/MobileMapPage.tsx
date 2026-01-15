import { useState, useEffect, useContext, useRef } from "react";
import { AuthContext } from "../../App";
import { useTenant } from "../../contexts/TenantContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { 
  MapPin, 
  Navigation2, 
  Layers,
  Crosshair,
  ZoomIn,
  ZoomOut,
  Loader2,
  Package,
  ChevronRight
} from "lucide-react";
import { projectId } from "../../../../utils/supabase/info";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface Asset {
  id: string;
  asset_ref: string;
  asset_type_name: string;
  description: string;
  latitude: number;
  longitude: number;
  condition: string;
  status: string;
}

// Component to handle map centering
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  
  return null;
}

export default function MobileMapPage() {
  const { accessToken } = useContext(AuthContext);
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-25.7479, 28.2293]); // Pretoria default
  const [mapZoom, setMapZoom] = useState(13);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [trackingLocation, setTrackingLocation] = useState(false);
  const mapRef = useRef<any>(null);

  // Fetch assets
  useEffect(() => {
    fetchAssets();
  }, [accessToken, tenantId]);

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos: [number, number] = [
            position.coords.latitude,
            position.coords.longitude,
          ];
          setUserLocation(userPos);
          setMapCenter(userPos);
        },
        (error) => {
          console.error("Error getting location:", error);
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Handle asset selection from URL
  useEffect(() => {
    const assetId = searchParams.get("asset");
    if (assetId && assets.length > 0) {
      const asset = assets.find(a => a.id === assetId);
      if (asset) {
        setSelectedAsset(asset);
        setMapCenter([asset.latitude, asset.longitude]);
        setMapZoom(16);
      }
    }
  }, [searchParams, assets]);

  const fetchAssets = async () => {
    const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

    try {
      const response = await fetch(`${API_URL}/assets?limit=500`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAssets(data.assets || []);
      }
    } catch (error) {
      console.error("Failed to fetch assets:", error);
    } finally {
      setLoading(false);
    }
  };

  const centerOnUser = () => {
    if (!userLocation) {
      // Request location
      setTrackingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos: [number, number] = [
            position.coords.latitude,
            position.coords.longitude,
          ];
          setUserLocation(userPos);
          setMapCenter(userPos);
          setMapZoom(15);
          setTrackingLocation(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setTrackingLocation(false);
        },
        { enableHighAccuracy: true }
      );
    } else {
      setMapCenter(userLocation);
      setMapZoom(15);
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition?.toLowerCase()) {
      case "excellent":
      case "good":
        return "text-green-600";
      case "fair":
        return "text-yellow-600";
      case "poor":
        return "text-orange-600";
      case "critical":
        return "text-red-600";
      default:
        return "text-slate-600";
    }
  };

  // Create custom marker icon based on condition
  const createCustomIcon = (condition: string) => {
    const color = condition?.toLowerCase() === "critical" || condition?.toLowerCase() === "poor" 
      ? "#ef4444" 
      : condition?.toLowerCase() === "fair"
      ? "#eab308"
      : "#10b981";

    return L.divIcon({
      className: "custom-marker",
      html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  return (
    <div className="relative h-screen">
      {/* Map Container */}
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="h-full w-full"
        zoomControl={false}
        ref={mapRef}
      >
        <MapController center={mapCenter} zoom={mapZoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User location marker */}
        {userLocation && (
          <Marker position={userLocation}>
            <Popup>
              <div className="text-sm font-semibold">Your Location</div>
            </Popup>
          </Marker>
        )}

        {/* Asset markers */}
        {assets.map((asset) => (
          <Marker
            key={asset.id}
            position={[asset.latitude, asset.longitude]}
            icon={createCustomIcon(asset.condition)}
            eventHandlers={{
              click: () => {
                setSelectedAsset(asset);
              },
            }}
          >
            <Popup>
              <div className="min-w-[200px]">
                <div className="font-semibold text-sm mb-1">{asset.asset_ref}</div>
                <div className="text-xs mb-2">{asset.description}</div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">{asset.asset_type_name}</Badge>
                  <Badge className={`text-xs ${getConditionColor(asset.condition)}`}>
                    {asset.condition}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate(`/assets/${asset.id}`)}
                  className="w-full text-xs h-7"
                >
                  View Details
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Map Controls - Right Side */}
      <div className="absolute right-4 top-20 z-[1000] flex flex-col gap-2">
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

      {/* Asset Count Badge - Top */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
        <Badge variant="secondary" className="shadow-lg px-3 py-1.5 text-xs">
          <MapPin className="w-3 h-3 mr-1.5" />
          {assets.length} Assets
        </Badge>
      </div>

      {/* Selected Asset Card - Bottom */}
      {selectedAsset && (
        <div className="absolute bottom-20 left-0 right-0 z-[1000] p-4">
          <Card className="border-2 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs font-mono">
                      {selectedAsset.asset_ref}
                    </Badge>
                    <Badge className={`text-xs ${getConditionColor(selectedAsset.condition)}`}>
                      {selectedAsset.condition}
                    </Badge>
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
                  onClick={() => navigate(`/assets/${selectedAsset.id}`)}
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
                    // Open in Google Maps
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