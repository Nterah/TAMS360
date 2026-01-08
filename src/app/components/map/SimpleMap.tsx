import { useEffect, useRef, useState } from "react";
import L from "leaflet";

interface SimpleMapProps {
  center: [number, number];
  zoom: number;
  assets: any[];
  userLocation: { lat: number; lng: number } | null;
  onAssetClick: (asset: any) => void;
  onNavigate: (asset: any) => void;
  colorMode?: "condition" | "ci" | "urgency" | "status";
  mapLayer?: "street" | "satellite" | "hybrid";
}

// Asset type icon SVG paths (simple shapes for different asset types)
const ASSET_ICON_SHAPES = {
  "Road Sign": "M6,2 L10,2 L12,4 L12,8 L10,10 L10,14 L6,14 L6,10 L4,8 L4,4 Z", // Sign board with post
  "Guardrail": "M2,5 L14,5 L14,7 L2,7 Z M2,9 L14,9 L14,11 L2,11 Z M4,3 L6,3 L6,13 L4,13 Z M10,3 L12,3 L12,13 L10,13 Z", // Horizontal rails with posts (filled)
  "Traffic Signal": "M6,2 L10,2 L10,14 L6,14 Z M7,3.5 A1,1 0 1,1 9,3.5 A1,1 0 1,1 7,3.5 M7,8 A1,1 0 1,1 9,8 A1,1 0 1,1 7,8 M7,12.5 A1,1 0 1,1 9,12.5 A1,1 0 1,1 7,12.5", // Traffic light
  "Gantry": "M2,3 L4,3 L4,11 L2,11 Z M12,3 L14,3 L14,11 L12,11 Z M2,3 L14,3 L14,5 L2,5 Z", // Overhead structure
  "Fence": "M2,2 L4,2 L4,14 L2,14 Z M6,2 L8,2 L8,14 L6,14 Z M10,2 L12,2 L12,14 L10,14 Z M2,6 L12,6 L12,7 L2,7 Z M2,10 L12,10 L12,11 L2,11 Z", // Fence pattern (filled)
  "Safety Barriers": "M2,6 L14,6 L14,10 L2,10 Z", // Solid barrier
  "Guidepost": "M7,2 L9,2 L9,14 L7,14 Z M5,3 L11,3 L11,6 L5,6 Z", // Post with reflector
  "Road Markings": "M3,7 L13,7 L13,9 L3,9 Z M3,11 L13,11 L13,13 L3,13 Z", // Road lines (filled)
  "Raised Road Markers": "M8,5 A3,3 0 1,1 8,11 A3,3 0 1,1 8,5", // Circle (cat's eye)
};

// Get color based on color mode
const getMarkerColor = (asset: any, colorMode: string = "condition") => {
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
      if (status.toLowerCase() === "active") return "#5DB32A"; // Green
      if (status.toLowerCase() === "damaged") return "#FF4444"; // Red
      if (status.toLowerCase() === "missing") return "#FF4444"; // Red
      if (status.toLowerCase() === "repaired") return "#39AEDF"; // Blue
      return "#455B5E"; // Default grey
    }
    case "condition":
    default: {
      const condition = asset.latest_condition || asset.condition || "";
      if (condition.toLowerCase() === "excellent") return "#5DB32A";
      if (condition.toLowerCase() === "good") return "#39AEDF";
      if (condition.toLowerCase() === "fair") return "#F8D227";
      if (condition.toLowerCase() === "poor") return "#FF4444";
      return "#455B5E"; // Default grey
    }
  }
};

// Create custom marker icon based on asset type and color mode
const createAssetIcon = (assetType: string, asset: any, colorMode: string = "condition") => {
  const color = getMarkerColor(asset, colorMode);
  const iconShape = ASSET_ICON_SHAPES[assetType as keyof typeof ASSET_ICON_SHAPES] || ASSET_ICON_SHAPES["Road Markings"];

  return L.divIcon({
    className: "custom-asset-marker",
    html: `
      <div style="position: relative; width: 32px; height: 42px;">
        <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
          <!-- Marker pin background -->
          <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 26 16 26s16-14 16-26C32 7.2 24.8 0 16 0z" 
                fill="${color}" stroke="#fff" stroke-width="2"/>
          
          <!-- Asset type icon (centered in marker) -->
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

export function SimpleMap({ 
  center, 
  zoom, 
  assets, 
  userLocation, 
  onAssetClick, 
  onNavigate,
  colorMode = "condition",
  mapLayer = "street"
}: SimpleMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      maxZoom: 22, // Maximum zoom for satellite imagery
      zoomControl: true,
    }).setView(center, zoom);
    
    // Add initial tile layer
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 22
    });
    
    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  // Update tile layer when mapLayer changes
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove old tile layer
    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    // Add new tile layer based on mapLayer prop
    let tileLayer: L.TileLayer;
    
    switch (mapLayer) {
      case "satellite":
        // Google Satellite imagery (no labels)
        tileLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
          attribution: '&copy; Google',
          maxZoom: 22,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        });
        break;
      case "hybrid":
        // Google Hybrid (satellite + labels)
        tileLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
          attribution: '&copy; Google',
          maxZoom: 22,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        });
        break;
      default:
        // OpenStreetMap
        tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19
        });
        break;
    }
    
    tileLayer.addTo(mapRef.current);
    tileLayerRef.current = tileLayer;
    
    console.log(`Map layer switched to: ${mapLayer}`);
  }, [mapLayer]);

  // Update center and zoom
  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.setView(center, zoom);
    }
  }, [center, zoom]);

  // Update markers when assets or colorMode changes
  useEffect(() => {
    if (!mapRef.current) return;

    console.log(`SimpleMap: Updating markers. Received ${assets.length} assets (color mode: ${colorMode})`);

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add asset markers
    let addedCount = 0;
    assets.forEach(asset => {
      if (!asset.latitude || !asset.longitude) {
        return;
      }

      const marker = L.marker(
        [asset.latitude, asset.longitude],
        { icon: createAssetIcon(asset.type, asset, colorMode) }
      );

      // Create popup content
      const ciDisplay = asset.latest_ci ? `CI: ${asset.latest_ci}` : "CI: N/A";
      const urgencyDisplay = asset.latest_urgency ? `Urgency: ${asset.latest_urgency}` : "Urgency: N/A";
      
      const popupContent = `
        <div style="padding: 8px; min-width: 200px;">
          <h3 style="font-weight: bold; margin-bottom: 8px; color: #010D13;">
            ${asset.asset_name || asset.name || asset.referenceNumber || asset.asset_ref}
          </h3>
          <div style="font-size: 13px;">
            <div style="display: flex; justify-between; margin-bottom: 4px;">
              <span style="color: #666;">Type:</span>
              <span style="font-weight: 500;">${asset.type}</span>
            </div>
            <div style="display: flex; justify-between; margin-bottom: 4px;">
              <span style="color: #666;">Condition:</span>
              <span style="font-weight: 500;">${asset.latest_condition || asset.condition || "N/A"}</span>
            </div>
            <div style="display: flex; justify-between; margin-bottom: 4px;">
              <span style="color: #666;">${ciDisplay}</span>
            </div>
            <div style="display: flex; justify-between; margin-bottom: 4px;">
              <span style="color: #666;">${urgencyDisplay}</span>
            </div>
            <div style="display: flex; justify-between; margin-bottom: 4px;">
              <span style="color: #666;">Status:</span>
              <span style="font-weight: 500;">${asset.status_name || asset.status || "N/A"}</span>
            </div>
            ${asset.road_name || asset.roadName ? `
              <div style="display: flex; justify-between;">
                <span style="color: #666;">Road:</span>
                <span style="font-weight: 500;">${asset.road_name || asset.roadName}</span>
              </div>
            ` : ''}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => onAssetClick(asset));
      marker.addTo(mapRef.current!);
      markersRef.current.push(marker);
      addedCount++;
    });

    console.log(`SimpleMap: Added ${addedCount} markers to the map`);

    // Add user location marker
    if (userLocation) {
      const userMarker = L.marker(
        [userLocation.lat, userLocation.lng],
        {
          icon: L.divIcon({
            className: "user-location-marker",
            html: `
              <div style="position: relative;">
                <div style="
                  width: 16px;
                  height: 16px;
                  background: #39AEDF;
                  border: 3px solid #fff;
                  border-radius: 50%;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                "></div>
                <div style="
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  width: 32px;
                  height: 32px;
                  background: rgba(57, 174, 223, 0.2);
                  border: 2px solid rgba(57, 174, 223, 0.4);
                  border-radius: 50%;
                  transform: translate(-50%, -50%);
                  animation: pulse 2s ease-in-out infinite;
                "></div>
              </div>
            `,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          })
        }
      );

      userMarker.bindPopup(`
        <div style="padding: 8px;">
          <p style="font-weight: bold; margin-bottom: 4px;">Your Location</p>
          <p style="font-size: 12px; color: #666;">
            ${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}
          </p>
        </div>
      `);

      userMarker.addTo(mapRef.current);
      markersRef.current.push(userMarker);
      console.log(`SimpleMap: Added user location marker`);
    }
  }, [assets, userLocation, onAssetClick, colorMode]);

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.5;
            transform: translate(-50%, -50%) scale(1.5);
          }
        }
      `}</style>
      <div 
        ref={mapContainerRef} 
        style={{ height: "100%", width: "100%" }}
        className="rounded-lg"
      />
    </>
  );
}