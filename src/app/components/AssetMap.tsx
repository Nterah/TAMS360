import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { MapPin, Eye } from 'lucide-react';
import { Button } from './ui/button';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Asset interface matching the actual data structure
export interface Asset {
  asset_id?: string;
  id?: string;
  asset_ref: string;
  asset_type: string;
  asset_name?: string;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  gps_latitude?: number;
  gps_longitude?: number;
  install_date?: string;
  status?: string;
  latest_ci?: number;
  urgency?: string;
  remaining_useful_life?: number;
  valuation?: number;
  region?: string;
  depot?: string;
  description?: string;
}

// Asset type colors matching the brand
const ASSET_TYPE_COLORS: Record<string, string> = {
  'Signage': '#39AEDF', // Sky Blue
  'Traffic Signal': '#F8D227', // Yellow Accent
  'Guardrail': '#455B5E', // Slate Grey
  'Safety Barrier': '#5DB32A', // Green
  'Road Marking': '#010D13', // Deep Navy
  'Gantry': '#F8D227', // Yellow Accent
  'Fence': '#455B5E', // Slate Grey
  'Guidepost': '#5DB32A', // Green
  'Raised Road Marker': '#39AEDF', // Sky Blue
};

// Create custom marker icons for each asset type
const createCustomIcon = (assetType: string, ci?: number) => {
  const color = ASSET_TYPE_COLORS[assetType] || '#39AEDF';
  // Opacity based on CI score (if available)
  const opacity = ci !== undefined && ci !== null
    ? (ci < 40 ? '0.6' : '1')
    : '1';
  
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        opacity: ${opacity};
      "></div>
    `,
    className: 'custom-marker',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -6],
  });
};

// Helper function to get CI badge
const getCIBadge = (ci?: number) => {
  if (ci === undefined || ci === null) {
    return { label: 'Not Inspected', color: '#94A3B8', bgColor: '#94A3B820' };
  }
  if (ci >= 80) return { label: 'Excellent', color: '#5DB32A', bgColor: '#5DB32A20' };
  if (ci >= 60) return { label: 'Good', color: '#39AEDF', bgColor: '#39AEDF20' };
  if (ci >= 40) return { label: 'Fair', color: '#F8D227', bgColor: '#F8D22720' };
  return { label: 'Poor', color: '#EF4444', bgColor: '#EF444420' };
};

interface AssetMapProps {
  assets: Asset[];
  onViewAsset?: (asset: Asset) => void;
  center?: [number, number];
  zoom?: number;
}

// Component to fit map bounds to markers
function FitBounds({ assets }: { assets: Asset[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (assets.length > 0) {
      const validAssets = assets.filter(
        asset => asset.gps_latitude && asset.gps_longitude
      );
      
      if (validAssets.length > 0) {
        const bounds = L.latLngBounds(
          validAssets.map(asset => [asset.gps_latitude!, asset.gps_longitude!])
        );
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [assets, map]);
  
  return null;
}

export function AssetMap({ 
  assets, 
  onViewAsset,
  center = [-26.2041, 28.0473], // Johannesburg, South Africa
  zoom = 12 
}: AssetMapProps) {
  const [mapReady, setMapReady] = useState(false);

  // Filter assets with valid GPS coordinates
  const assetsWithGPS = assets.filter(
    asset => asset.gps_latitude && asset.gps_longitude
  );

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full h-full rounded-lg"
        style={{ minHeight: '500px' }}
        whenReady={() => setMapReady(true)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {mapReady && (
          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={50}
            spiderfyOnMaxZoom={true}
            showCoverageOnHover={false}
            iconCreateFunction={(cluster) => {
              const count = cluster.getChildCount();
              return L.divIcon({
                html: `
                  <div style="
                    background-color: #39AEDF;
                    color: white;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 14px;
                    border: 3px solid white;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                  ">
                    ${count}
                  </div>
                `,
                className: 'custom-cluster-icon',
                iconSize: [40, 40],
              });
            }}
          >
            {assetsWithGPS.map((asset) => {
              const ciBadge = getCIBadge(asset.latest_ci);
              return (
              <Marker
                key={asset.asset_id || asset.id}
                position={[asset.gps_latitude!, asset.gps_longitude!]}
                icon={createCustomIcon(asset.asset_type, asset.latest_ci)}
              >
                <Popup>
                  <div className="min-w-[250px] p-2">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-base text-[#010D13]">
                            {asset.asset_ref}
                          </h3>
                          <p className="text-sm text-[#455B5E]">
                            {asset.asset_type}
                          </p>
                        </div>
                        <span
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{
                            backgroundColor: ciBadge.bgColor,
                            color: ciBadge.color,
                          }}
                        >
                          {ciBadge.label}
                        </span>
                      </div>

                      {asset.location_name && (
                        <div className="flex items-start gap-1 text-sm">
                          <MapPin className="w-4 h-4 text-[#455B5E] mt-0.5 flex-shrink-0" />
                          <span className="text-[#455B5E]">{asset.location_name}</span>
                        </div>
                      )}

                      {asset.asset_name && (
                        <p className="text-sm text-[#455B5E]">
                          {asset.asset_name}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t">
                        <div>
                          <span className="text-[#455B5E]">Status:</span>
                          <span className="ml-1 font-medium text-[#010D13]">
                            {asset.status || 'Active'}
                          </span>
                        </div>
                        {asset.install_date && (
                          <div>
                            <span className="text-[#455B5E]">Installed:</span>
                            <span className="ml-1 font-medium text-[#010D13]">
                              {new Date(asset.install_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {asset.urgency && (
                        <div className="text-xs">
                          <span className="text-[#455B5E]">Urgency:</span>
                          <span className="ml-1 font-medium text-[#010D13]">
                            {asset.urgency}
                          </span>
                        </div>
                      )}

                      {onViewAsset && (
                        <Button
                          onClick={() => onViewAsset(asset)}
                          className="w-full mt-2 bg-[#39AEDF] hover:bg-[#2A9ECF] text-white"
                          size="sm"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
              );
            })}
          </MarkerClusterGroup>
        )}

        {mapReady && assetsWithGPS.length > 0 && (
          <FitBounds assets={assetsWithGPS} />
        )}
      </MapContainer>

      {/* Asset count indicator */}
      {assetsWithGPS.length > 0 && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg px-4 py-2 z-[1000] border border-gray-200">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#39AEDF]" />
            <span className="text-sm font-medium text-[#010D13]">
              {assetsWithGPS.length} {assetsWithGPS.length === 1 ? 'Asset' : 'Assets'} on Map
            </span>
          </div>
        </div>
      )}

      {/* No GPS data warning */}
      {assetsWithGPS.length === 0 && assets.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-[1000] bg-white/90">
          <div className="text-center p-6">
            <MapPin className="w-12 h-12 text-[#455B5E] mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-[#010D13] mb-2">
              No GPS Data Available
            </h3>
            <p className="text-sm text-[#455B5E] max-w-md">
              None of the selected assets have GPS coordinates. Add location data to assets to see them on the map.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}