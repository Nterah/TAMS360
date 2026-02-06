import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet.markercluster";

// Add MarkerCluster CSS imports
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";

interface SimpleMapProps {
  center: [number, number];
  zoom: number;
  assets: any[];
  userLocation: { lat: number; lng: number } | null;
  onAssetClick: (asset: any) => void;
  onNavigate: (asset: any) => void;
  colorMode?: "condition" | "ci" | "urgency" | "status" | "region" | "ward" | "depot" | "owner";
  mapLayer?: "street" | "satellite" | "hybrid";
  clusteringEnabled?: boolean;
  accessToken?: string; // Add accessToken for authenticated API calls
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
      
      // DEBUG: Log CI value for specific problematic assets
      const assetRef = asset.asset_ref || asset.referenceNumber || asset.id;
      if (assetRef && (assetRef.includes('GR-M1-NB-RHS-003') || assetRef.includes('RS-M1-NB-054') || assetRef.includes('GS-M1-NB-SB-001'))) {
        console.log(`[Marker Color] ${assetRef}: CI=${ci}, Color will be:`, {
          ci: ci,
          colorRange: ci >= 80 ? "80-100 (Green)" : ci >= 60 ? "60-79 (Blue)" : ci >= 40 ? "40-59 (Yellow)" : "0-39 (Red)",
          expectedColor: ci >= 80 ? "#5DB32A" : ci >= 60 ? "#39AEDF" : ci >= 40 ? "#F8D227" : "#FF4444"
        });
      }
      
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
    case "region": {
      // Generate consistent color based on region name
      const region = asset.region_name || asset.region || "";
      if (!region) return "#455B5E";
      const hash = region.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
      const colors = ["#5DB32A", "#39AEDF", "#F8D227", "#FF4444", "#010D13", "#455B5E", "#9B59B6", "#E67E22"];
      return colors[Math.abs(hash) % colors.length];
    }
    case "ward": {
      // Generate consistent color based on ward name
      const ward = asset.ward_name || asset.ward || "";
      if (!ward) return "#455B5E";
      const hash = ward.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
      const colors = ["#5DB32A", "#39AEDF", "#F8D227", "#FF4444", "#010D13", "#455B5E", "#9B59B6", "#E67E22"];
      return colors[Math.abs(hash) % colors.length];
    }
    case "depot": {
      // Generate consistent color based on depot name
      const depot = asset.depot_name || asset.depot || "";
      if (!depot) return "#455B5E";
      const hash = depot.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
      const colors = ["#5DB32A", "#39AEDF", "#F8D227", "#FF4444", "#010D13", "#455B5E", "#9B59B6", "#E67E22"];
      return colors[Math.abs(hash) % colors.length];
    }
    case "owner": {
      // Generate consistent color based on owner name
      const owner = asset.owner_name || asset.owner || "";
      if (!owner) return "#455B5E";
      const hash = owner.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
      const colors = ["#5DB32A", "#39AEDF", "#F8D227", "#FF4444", "#010D13", "#455B5E", "#9B59B6", "#E67E22"];
      return colors[Math.abs(hash) % colors.length];
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
  mapLayer = "street",
  clusteringEnabled = true,
  accessToken = publicAnonKey
}: SimpleMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerClusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [photoCache, setPhotoCache] = useState<Record<string, any>>({});
  const [showPhotos, setShowPhotos] = useState<Record<string, boolean>>({});

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  // Fetch photos for an asset
  const fetchAssetPhotos = async (assetId: string, accessToken: string) => {
    if (photoCache[assetId]) {
      return photoCache[assetId];
    }

    try {
      const response = await fetch(`${API_URL}/assets/${assetId}/photos`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const photos = data.photos || [];
        setPhotoCache(prev => ({ ...prev, [assetId]: photos }));
        return photos;
      }
    } catch (error) {
      console.error(`Error fetching photos for asset ${assetId}:`, error);
    }
    return [];
  };

  // Fetch latest inspection for an asset to get repair cost
  const fetchLatestInspection = async (assetId: string, accessToken: string) => {
    try {
      const response = await fetch(`${API_URL}/assets/${assetId}/inspections?limit=1`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const inspections = data.inspections || [];
        if (inspections.length > 0) {
          return inspections[0];
        }
      }
    } catch (error) {
      console.error(`Error fetching inspection for asset ${assetId}:`, error);
    }
    return null;
  };

  // Fetch latest maintenance for an asset to get last maintenance date
  const fetchLatestMaintenance = async (assetId: string, accessToken: string) => {
    try {
      const response = await fetch(`${API_URL}/assets/${assetId}/maintenance`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const maintenanceRecords = data.maintenance || [];
        // Find the most recent completed maintenance
        const completedRecords = maintenanceRecords.filter((m: any) => m.completed_date);
        if (completedRecords.length > 0) {
          // Records are already ordered by maintenance_id descending, so first completed is most recent
          return completedRecords[0];
        }
      }
    } catch (error) {
      console.error(`Error fetching maintenance for asset ${assetId}:`, error);
    }
    return null;
  };

  // Create enhanced popup content with lazy-loaded photos
  const createEnhancedPopup = async (asset: any, marker: L.Marker) => {
    const assetId = asset.asset_id || asset.id;
    const popupId = `popup-${assetId}`;
    
    // Initial popup content (without photos)
    const createPopupHtml = (photos: any[] = [], inspection: any = null, photosVisible: boolean = false, maintenance: any = null) => {
      // Get CI and Urgency - prioritize asset record values (used for marker color) for consistency
      // Only fall back to inspection data if asset values are not available
      const ciDisplay = asset.latest_ci ?? 
                       inspection?.calculation_metadata?.ci_final ?? 
                       inspection?.ci_final ?? 
                       inspection?.conditional_index ?? 
                       "N/A";
      
      const worstUrgency = asset.latest_urgency ??
                           inspection?.calculation_metadata?.worst_urgency ?? 
                           inspection?.calculated_urgency ?? 
                           inspection?.urgency ?? 
                           "N/A";
      
      // Calculate repair cost estimate from latest inspection
      let estimatedRepairCost = "N/A";
      if (inspection) {
        const totalCost = inspection.calculation_metadata?.total_cost || 
                         inspection.total_remedial_cost || 
                         0;
        estimatedRepairCost = totalCost > 0 ? `R ${totalCost.toLocaleString()}` : "R 0";
      }

      // Get actual maintenance cost from completed maintenance records
      let actualMaintenanceCost = "N/A";
      if (maintenance && (maintenance.actual_cost || maintenance.estimated_cost)) {
        const cost = maintenance.actual_cost || maintenance.estimated_cost;
        actualMaintenanceCost = `R ${parseFloat(cost).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }

      // Get last maintenance date
      let lastMaintenanceDate = "N/A";
      if (maintenance && maintenance.completed_date) {
        const date = new Date(maintenance.completed_date);
        lastMaintenanceDate = date.toLocaleDateString('en-ZA', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
      }
      
      // Filter photos: main photo (0.jpg) and inspection photos (1.jpg, 1_1.jpg, etc.)
      const mainPhoto = photos.find(p => p.name === '0.jpg' || p.name === '0.jpeg' || p.name === '0.png');
      const inspectionPhotos = photos.filter(p => 
        /^[1-6](_\d+)?\./.test(p.name) // Match 1.jpg, 1_1.jpg, 2.jpg, etc.
      );
      
      const allDisplayPhotos = [mainPhoto, ...inspectionPhotos].filter(Boolean);
      
      return `
        <div id="${popupId}" style="padding: 8px; min-width: 240px; max-width: 320px;">
          <h3 style="font-weight: bold; margin-bottom: 8px; color: #010D13; font-size: 14px;">
            ${(asset.asset_name || asset.name || asset.referenceNumber || asset.asset_ref || '').replace(/'/g, '&#39;').replace(/"/g, '&quot;')}
          </h3>
          <div style="font-size: 13px;">
            <div style="display: flex; justify-between; margin-bottom: 4px;">
              <span style="color: #666;">Type:</span>
              <span style="font-weight: 500;">${(asset.type || '').replace(/'/g, '&#39;').replace(/"/g, '&quot;')}</span>
            </div>
            ${actualMaintenanceCost !== "N/A" ? `
              <div style="display: flex; justify-between; margin-bottom: 4px;">
                <span style="color: #666;">Maintenance Cost:</span>
                <span style="font-weight: 500; color: #5DB32A;">${actualMaintenanceCost}</span>
              </div>
            ` : ''}
            ${estimatedRepairCost !== "N/A" && estimatedRepairCost !== "R 0" ? `
              <div style="display: flex; justify-between; margin-bottom: 4px;">
                <span style="color: #666;">Est. Repair Cost:</span>
                <span style="font-weight: 500;">${estimatedRepairCost}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-between; margin-bottom: 4px;">
              <span style="color: #666;">CI:</span>
              <span style="font-weight: 500;">${ciDisplay}</span>
            </div>
            <div style="display: flex; justify-between; margin-bottom: 4px;">
              <span style="color: #666;">Urgency:</span>
              <span style="font-weight: 500;">${worstUrgency}</span>
            </div>
            <div style="display: flex; justify-between; margin-bottom: 4px;">
              <span style="color: #666;">Status:</span>
              <span style="font-weight: 500;">${(asset.status_name || asset.status || "N/A").replace(/'/g, '&#39;').replace(/"/g, '&quot;')}</span>
            </div>
            ${asset.road_name || asset.roadName ? `
              <div style="display: flex; justify-between; margin-bottom: 4px;">
                <span style="color: #666;">Road:</span>
                <span style="font-weight: 500;">${(asset.road_name || asset.roadName || '').replace(/'/g, '&#39;').replace(/"/g, '&quot;')}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-between; margin-bottom: 4px;">
              <span style="color: #666;">Last Maintenance:</span>
              <span style="font-weight: 500;">${lastMaintenanceDate}</span>
            </div>
          </div>
          
          ${allDisplayPhotos.length > 0 ? `
            <div style="margin-top: 8px;">
              <button 
                onclick="window.togglePhotos_${assetId.replace(/[^a-zA-Z0-9]/g, '_')}()"
                style="
                  width: 100%;
                  padding: 6px 12px;
                  background: #39AEDF;
                  color: white;
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 12px;
                  font-weight: 500;
                "
              >
                ${photosVisible ? 'Hide' : 'Show'} Photos (${allDisplayPhotos.length})
              </button>
            </div>
            
            ${photosVisible ? `
              <div style=\"
                margin-top: 8px;
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 4px;
                max-height: 200px;
                overflow-y: auto;
              \">
                ${allDisplayPhotos.map(photo => `
                  <img 
                    src=\"${photo.signedUrl}\" 
                    alt=\"${(photo.name || '').replace(/'/g, '&#39;').replace(/\"/g, '&quot;')}\"\
                    style=\"\
                      width: 100%;\
                      height: 80px;\
                      object-fit: cover;\
                      border-radius: 4px;\
                      border: 1px solid #ddd;\
                      cursor: pointer;\
                    \"\
                    onclick=\"event.stopPropagation(); window.open('${photo.signedUrl}', '_blank');\"\
                    title=\"Click to view full size - ${(photo.name || '').replace(/'/g, '&#39;').replace(/\"/g, '&quot;')}\"\
                  />\
                `).join('')}
              </div>
            ` : ''}
          ` : ''}
        </div>
      `;
    };

    // Set initial popup content
    const popup = L.popup({
      maxWidth: 320,
      minWidth: 240,
    }).setContent(createPopupHtml());
    
    marker.bindPopup(popup);

    // When popup opens, fetch photos, inspection, and maintenance data
    marker.on('popupopen', async () => {
      try {
        // Fetch photos, inspection, and maintenance in parallel
        const [photos, inspection, maintenance] = await Promise.all([
          fetchAssetPhotos(assetId, accessToken),
          fetchLatestInspection(assetId, accessToken),
          fetchLatestMaintenance(assetId, accessToken)
        ]);

        // Create toggle function for this asset
        (window as any)[`togglePhotos_${assetId.replace(/[^a-zA-Z0-9]/g, '_')}`] = () => {
          const currentState = showPhotos[assetId] || false;
          setShowPhotos(prev => ({ ...prev, [assetId]: !currentState }));
          popup.setContent(createPopupHtml(photos, inspection, !currentState, maintenance));
        };

        // Update popup with photos, inspection, and maintenance data
        popup.setContent(createPopupHtml(photos, inspection, showPhotos[assetId] || false, maintenance));
      } catch (error) {
        console.error('Error loading popup data:', error);
      }
    });

    return popup;
  };

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

    console.log(`SimpleMap: Updating markers. Received ${assets.length} assets (color mode: ${colorMode}, clustering: ${clusteringEnabled})`);

    // Clear existing marker cluster
    if (markerClusterRef.current) {
      mapRef.current.removeLayer(markerClusterRef.current);
      markerClusterRef.current = null;
    }

    // Add asset markers
    let addedCount = 0;
    const markers: L.Marker[] = [];
    
    assets.forEach(asset => {
      if (!asset.latitude || !asset.longitude) {
        return;
      }

      const marker = L.marker(
        [asset.latitude, asset.longitude],
        { icon: createAssetIcon(asset.type, asset, colorMode) }
      );

      // Use enhanced popup with photos and updated fields
      createEnhancedPopup(asset, marker);

      marker.on('click', () => onAssetClick(asset));
      markers.push(marker);
      addedCount++;
    });

    if (clusteringEnabled) {
      // Create marker cluster group with custom styling
      const markerCluster = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: function(cluster: any) {
          const childCount = cluster.getChildCount();
          let clusterClass = 'marker-cluster-small';
          let clusterColor = '#39AEDF';
          
          if (childCount > 100) {
            clusterClass = 'marker-cluster-large';
            clusterColor = '#010D13';
          } else if (childCount > 50) {
            clusterClass = 'marker-cluster-medium';
            clusterColor = '#455B5E';
          }

          return L.divIcon({
            html: `
              <div style="
                background-color: ${clusterColor};
                width: ${Math.min(40 + Math.log(childCount) * 5, 60)}px;
                height: ${Math.min(40 + Math.log(childCount) * 5, 60)}px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: ${Math.min(12 + Math.log(childCount), 18)}px;
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              ">
                ${childCount}
              </div>
            `,
            className: clusterClass,
            iconSize: L.point(40, 40),
          });
        },
      });

      markers.forEach(marker => markerCluster.addLayer(marker));
      mapRef.current.addLayer(markerCluster);
      markerClusterRef.current = markerCluster;
      console.log(`SimpleMap: Added ${addedCount} markers with clustering enabled`);
    } else {
      // Add markers directly without clustering
      const layerGroup = L.layerGroup(markers);
      layerGroup.addTo(mapRef.current);
      markerClusterRef.current = layerGroup as any;
      console.log(`SimpleMap: Added ${addedCount} markers without clustering`);
    }

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
      userMarkerRef.current = userMarker;
      console.log(`SimpleMap: Added user location marker`);
    }
  }, [assets, userLocation, onAssetClick, colorMode, clusteringEnabled, accessToken]);

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