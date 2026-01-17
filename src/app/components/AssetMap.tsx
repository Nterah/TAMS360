import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { MapPin, Eye } from 'lucide-react';
import { Button } from './ui/button';
import { createRoot } from 'react-dom/client';

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
  gps_lat?: number;  // Database field name
  gps_lng?: number;  // Database field name
  gps_latitude?: number;  // Legacy field name (for backwards compatibility)
  gps_longitude?: number;  // Legacy field name (for backwards compatibility)
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

export function AssetMap({ 
  assets, 
  onViewAsset,
  center = [-26.2041, 28.0473], // Johannesburg, South Africa
  zoom = 12 
}: AssetMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markerClusterRef = useRef<L.MarkerClusterGroup | null>(null);

  // Filter assets with valid GPS coordinates
  const assetsWithGPS = assets.filter(
    asset => {
      const lat = asset.gps_lat || asset.gps_latitude || asset.latitude;
      const lng = asset.gps_lng || asset.gps_longitude || asset.longitude;
      return lat && lng;
    }
  );

  console.log('AssetMap Debug:', {
    totalAssets: assets.length,
    assetsWithGPS: assetsWithGPS.length,
    sampleAsset: assets[0],
    sampleAssetKeys: assets[0] ? Object.keys(assets[0]) : [],
    sampleGPSValues: assets[0] ? {
      gps_lat: assets[0].gps_lat,
      gps_lng: assets[0].gps_lng,
      gps_latitude: assets[0].gps_latitude,
      gps_longitude: assets[0].gps_longitude,
      latitude: assets[0].latitude,
      longitude: assets[0].longitude,
    } : null
  });

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Create map
    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: true,
    });

    mapRef.current = map;

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Create marker cluster group
    const markerCluster = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster) => {
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
      },
    });

    markerClusterRef.current = markerCluster;
    map.addLayer(markerCluster);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers when assets change
  useEffect(() => {
    if (!mapRef.current || !markerClusterRef.current) return;

    const markerCluster = markerClusterRef.current;
    
    // Clear existing markers
    markerCluster.clearLayers();

    // Add new markers
    assetsWithGPS.forEach((asset) => {
      const ciBadge = getCIBadge(asset.latest_ci);
      const lat = asset.gps_lat || asset.gps_latitude || asset.latitude;
      const lng = asset.gps_lng || asset.gps_longitude || asset.longitude;

      if (!lat || !lng) return; // Safety check

      const marker = L.marker([lat, lng], {
        icon: createCustomIcon(asset.asset_type, asset.latest_ci),
      });

      // Create popup content as a DOM element
      const popupContent = document.createElement('div');
      popupContent.className = 'min-w-[250px] p-2';
      popupContent.innerHTML = `
        <div class="space-y-2">
          <div class="flex items-start justify-between gap-2">
            <div>
              <h3 class="font-semibold text-base text-[#010D13]">
                ${asset.asset_ref}
              </h3>
              <p class="text-sm text-[#455B5E]">
                ${asset.asset_type}
              </p>
            </div>
            <span
              class="px-2 py-1 rounded text-xs font-medium"
              style="
                background-color: ${ciBadge.bgColor};
                color: ${ciBadge.color};
              "
            >
              ${ciBadge.label}
            </span>
          </div>

          ${asset.location_name ? `
            <div class="flex items-start gap-1 text-sm">
              <svg class="w-4 h-4 text-[#455B5E] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <span class="text-[#455B5E]">${asset.location_name}</span>
            </div>
          ` : ''}

          ${asset.asset_name ? `
            <p class="text-sm text-[#455B5E]">
              ${asset.asset_name}
            </p>
          ` : ''}

          <div class="grid grid-cols-2 gap-2 text-xs pt-2 border-t">
            <div>
              <span class="text-[#455B5E]">Status:</span>
              <span class="ml-1 font-medium text-[#010D13]">
                ${asset.status || 'Active'}
              </span>
            </div>
            ${asset.install_date ? `
              <div>
                <span class="text-[#455B5E]">Installed:</span>
                <span class="ml-1 font-medium text-[#010D13]">
                  ${new Date(asset.install_date).toLocaleDateString()}
                </span>
              </div>
            ` : ''}
          </div>

          ${asset.urgency ? `
            <div class="text-xs">
              <span class="text-[#455B5E]">Urgency:</span>
              <span class="ml-1 font-medium text-[#010D13]">
                ${asset.urgency}
              </span>
            </div>
          ` : ''}
        </div>
      `;

      // Add button if onViewAsset is provided
      if (onViewAsset) {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'mt-2';
        popupContent.querySelector('.space-y-2')?.appendChild(buttonContainer);

        const root = createRoot(buttonContainer);
        root.render(
          <Button
            onClick={() => onViewAsset(asset)}
            className="w-full bg-[#39AEDF] hover:bg-[#2A9ECF] text-white"
            size="sm"
          >
            <Eye className="w-4 h-4 mr-1" />
            View Details
          </Button>
        );
      }

      marker.bindPopup(popupContent);
      markerCluster.addLayer(marker);
    });

    // Fit bounds if we have markers
    if (assetsWithGPS.length > 0) {
      const bounds = L.latLngBounds(
        assetsWithGPS.map(asset => [asset.gps_lat || asset.gps_latitude || asset.latitude!, asset.gps_lng || asset.gps_longitude || asset.longitude!])
      );
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [assets, onViewAsset]);

  return (
    <div className="w-full h-full relative">
      <div 
        ref={containerRef} 
        className="w-full h-full rounded-lg"
        style={{ minHeight: '500px' }}
      />

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
        <div className="absolute inset-0 flex items-center justify-center z-[1000] bg-white/90 rounded-lg">
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