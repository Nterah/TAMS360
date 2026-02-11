import { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../App";
import { 
  Database, Activity, TrendingUp, AlertTriangle, ClipboardCheck, 
  Wrench, MapPin, Users, FileText, Filter, Calendar, Building2,
  Package, Layers, AlertCircle, ChevronRight, Eye, ImageIcon
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { AssetMap } from "../AssetMap";
import { toast } from "sonner";
import { BulkWorkOrderDialog } from "./BulkWorkOrderDialog";
import { AssetListDialog } from "./AssetListDialog";

// Existing color scheme - DO NOT CHANGE
const COLORS = ['#5DB32A', '#39AEDF', '#F8D227', '#d4183d', '#455B5E', '#9E9E9E', '#FF6B6B', '#4ECDC4'];

// Existing CI band logic - DO NOT CHANGE
const getCIColor = (ci: number) => {
  if (ci >= 80) return '#5DB32A';  // Excellent (Green)
  if (ci >= 60) return '#39AEDF';  // Good (Blue)
  if (ci >= 40) return '#F8D227';  // Fair (Yellow)
  return '#EF4444';                // Poor (Red) - 0-39
};

// Status color coding for work orders
const getStatusColor = (status: string) => {
  const normalizedStatus = (status || '').toLowerCase().trim();
  if (normalizedStatus === 'scheduled') return { bg: '#E0F2FE', text: '#0369A1', border: '#39AEDF' }; // Blue
  if (normalizedStatus === 'in_progress' || normalizedStatus === 'in progress') return { bg: '#FEF3C7', text: '#92400E', border: '#F8D227' }; // Yellow
  if (normalizedStatus === 'completed') return { bg: '#D1FAE5', text: '#065F46', border: '#5DB32A' }; // Green
  if (normalizedStatus === 'cancelled' || normalizedStatus === 'canceled') return { bg: '#F3F4F6', text: '#4B5563', border: '#94A3B8' }; // Grey
  return { bg: '#F3F4F6', text: '#4B5563', border: '#94A3B8' }; // Default grey
};

const getCIBand = (ci: number | null | undefined) => {
  if (ci === null || ci === undefined) return 'Not Inspected'; if (ci >= 80) return 'Excellent';
  if (ci >= 60) return 'Good';
  if (ci >= 40) return 'Fair';
  return 'Poor';
};

// Existing urgency logic - Updated to match DERU standards (R, 0, 1, 2, 3, 4)
const getUrgencyColor = (urgency: string | number) => {
  const urgencyStr = String(urgency).toUpperCase();
  if (urgencyStr === '4') return '#d4183d';      // Immediate action - Red
  if (urgencyStr === '3') return '#F8D227';      // Repair (short term) - Yellow
  if (urgencyStr === '2') return '#F8D227';      // Repair (long term) - Yellow
  if (urgencyStr === '1') return '#39AEDF';      // Routine maintenance - Blue
  if (urgencyStr === '0') return '#5DB32A';      // Monitor only - Green
  if (urgencyStr === 'R') return '#94A3B8';      // Record only - Grey
  return '#94A3B8';                              // Default - Grey
};

const getUrgencyLevel = (urgency: string | number) => {
  const urgencyStr = String(urgency).toUpperCase();
  if (urgencyStr === '4') return '4';
  if (urgencyStr === '3') return '3';
  if (urgencyStr === '2') return '2';
  if (urgencyStr === '1') return '1';
  if (urgencyStr === '0') return '0';
  if (urgencyStr === 'R') return 'R';
  return 'N/A';
};

const getUrgencyDescription = (urgency: string | number) => {
  const urgencyStr = String(urgency).toUpperCase();
  if (urgencyStr === '4') return 'Immediate action';
  if (urgencyStr === '3') return 'Repair (short term)';
  if (urgencyStr === '2') return 'Repair (long term)';
  if (urgencyStr === '1') return 'Routine maintenance';
  if (urgencyStr === '0') return 'Monitor only';
  if (urgencyStr === 'R') return 'Record only';
  return 'Not assessed';
};

// Helper function to extract urgency value from an asset
// Tries multiple possible field names and formats
const getAssetUrgency = (asset: any): string | null => {
  // Try urgency_score first (most likely field from database)
  if (asset.urgency_score !== null && asset.urgency_score !== undefined) {
    return String(asset.urgency_score).trim();
  }
  
  // Try parsing from latest_deru - can be either:
  // 1. A numeric DERU value (e.g., 135.93) - convert to urgency level
  // 2. A string format "D-E-R-U" - extract U directly
  if (asset.latest_deru !== null && asset.latest_deru !== undefined) {
    // Check if it's a string format "D-E-R-U"
    if (typeof asset.latest_deru === 'string' && asset.latest_deru.includes('-')) {
      const parts = asset.latest_deru.split('-');
      if (parts.length === 4 && parts[3]) {
        return parts[3].trim();
      }
    }
    
    // Otherwise, treat as numeric DERU value and convert to urgency
    const deruValue = parseFloat(asset.latest_deru);
    if (!isNaN(deruValue)) {
      // DERU to Urgency conversion based on DERU methodology:
      // > 120 = Urgency 4 (Immediate action)
      // 80-120 = Urgency 3 (Repair short term)
      // 40-80 = Urgency 2 (Repair long term)
      // 20-40 = Urgency 1 (Routine maintenance)
      // < 20 = Urgency 0 (Monitor only)
      if (deruValue > 120) return '4';
      if (deruValue >= 80) return '3';
      if (deruValue >= 40) return '2';
      if (deruValue >= 20) return '1';
      if (deruValue >= 0) return '0';
    }
  }
  
  // Try other possible field names
  if (asset.urgency !== null && asset.urgency !== undefined) {
    return String(asset.urgency).trim();
  }
  
  if (asset.latest_urgency !== null && asset.latest_urgency !== undefined) {
    return String(asset.latest_urgency).trim();
  }
  
  if (asset.calculated_urgency !== null && asset.calculated_urgency !== undefined) {
    return String(asset.calculated_urgency).trim();
  }
  
  return null;
};

// KPI Card Component
interface KPICardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  severity?: string;
  onClick?: () => void;
  leftBorderColor?: string;
}

function KPICard({ label, value, subtitle, trend, severity, onClick, leftBorderColor }: KPICardProps) {
  const borderColor = leftBorderColor || (severity === 'critical' ? '#d4183d' : 'transparent');
  
  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-shadow ${onClick ? 'hover:bg-gray-50' : ''}`}
      style={{ borderLeft: `4px solid ${borderColor}` }}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase text-gray-500 mb-2">{label}</p>
        <p className="text-2xl font-bold mb-1">{value.toLocaleString()}</p>
        {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        {trend && <p className="text-xs text-gray-500 mt-1">{trend}</p>}
      </CardContent>
    </Card>
  );
}

// Alert Card Component
interface AlertCardProps {
  icon: React.ReactNode;
  title: string;
  count: number;
  description: string;
  onClick?: () => void;
  bgColor?: string;
  borderColor?: string;
  actionButton?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
}

function AlertCard({ icon, title, count, description, onClick, bgColor = '#FEF3F2', borderColor = '#EF4444', actionButton }: AlertCardProps) {
  return (
    <Card 
      className="hover:shadow-md transition-shadow relative overflow-hidden"
      style={{ backgroundColor: bgColor }}
    >
      {/* Color-coded left border */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1.5" 
        style={{ backgroundColor: borderColor }}
      />
      <CardContent className="p-4 pl-5">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <p className="text-xs font-medium uppercase text-gray-700">{title}</p>
        </div>
        <p className="text-3xl font-bold mb-1">{count.toLocaleString()}</p>
        <p className="text-sm text-gray-600 mb-2">{description}</p>
        <div className="flex gap-2 items-center">
          {onClick && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              View all →
            </button>
          )}
          {actionButton && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={(e) => {
                e.stopPropagation();
                actionButton.onClick();
              }}
              className="ml-auto text-xs h-7"
            >
              {actionButton.icon}
              {actionButton.label}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  
  // Global Filters
  const [dateRange, setDateRange] = useState("all");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedDepot, setSelectedDepot] = useState("all");
  const [selectedAssetType, setSelectedAssetType] = useState("all");
  const [selectedCIBand, setSelectedCIBand] = useState("all");
  const [selectedUrgency, setSelectedUrgency] = useState("all");
  
  // Data State
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<any[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [depots, setDepots] = useState<string[]>([]);
  const [assetTypes, setAssetTypes] = useState<string[]>([]);
  
  // Bulk Work Order Dialog State
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkDialogAssets, setBulkDialogAssets] = useState<any[]>([]);
  const [bulkDialogDescription, setBulkDialogDescription] = useState("");
  
  // Asset List Dialog State (for viewing/managing assets)
  const [assetListDialogOpen, setAssetListDialogOpen] = useState(false);
  const [assetListDialogAssets, setAssetListDialogAssets] = useState<any[]>([]);
  const [assetListDialogTitle, setAssetListDialogTitle] = useState("");
  
  // Computed Stats
  const [dashboardData, setDashboardData] = useState<any>({
    overview: {},
    condition: {},
    maintenance: {},
    regional: {}
  });

  useEffect(() => {
    if (!auth.user || !auth.accessToken) {
      console.log("⚠️ No authenticated user, redirecting to login");
      toast.error("Please log in to access the dashboard");
      navigate("/login");
      return;
    }
    loadAllData();
  }, [auth.user, auth.accessToken]);

  // Separate effect for filters
  useEffect(() => {
    // Just trigger re-computation when filters change
    // No need to reload data
  }, [dateRange, selectedRegion, selectedDepot, selectedAssetType, selectedCIBand, selectedUrgency]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const token = auth.accessToken;
      if (!token) {
        console.error("❌ No access token found");
        toast.error("Please log in to view the dashboard");
        navigate("/login");
        setLoading(false);
        return;
      }

      console.log("📊 Loading dashboard data with token:", token.substring(0, 20) + "...");

      const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

      // Load ALL assets - request all with high page size
      const assetsRes = await fetch(`${API_URL}/assets?pageSize=5000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (assetsRes.status === 401) {
        console.error("❌ Unauthorized - token may be expired");
        toast.error("Your session has expired. Please log in again.");
        auth.logout();
        navigate("/login");
        setLoading(false);
        return;
      }
      
      if (assetsRes.ok) {
        const assetsData = await assetsRes.json();
        const assets = assetsData.assets || assetsData || [];
        
        if (!Array.isArray(assets)) {
          console.error("❌ Assets data is not an array:", assets);
          setAssets([]);
        } else {
          console.log(`✅ Loaded ${assets.length} assets`);
          // DEBUG: Log sample asset to see all available fields including urgency
          if (assets.length > 0) {
            console.log('📋 Sample asset data (all fields):', assets[0]);
            console.log('📋 Urgency-related fields:', {
              asset_ref: assets[0].asset_ref,
              urgency: assets[0].urgency,
              latest_urgency: assets[0].latest_urgency,
              calculated_urgency: assets[0].calculated_urgency,
              latest_deru: assets[0].latest_deru,
              asset_urgency: assets[0].asset_urgency,
              urgency_score: assets[0].urgency_score
            });
            // Log what getAssetUrgency returns
            console.log('📋 getAssetUrgency result:', getAssetUrgency(assets[0]));
            
            // Count urgency distribution in raw data
            const urgencyCounts: any = {};
            assets.forEach((a: any) => {
              const u = getAssetUrgency(a) || 'null';
              urgencyCounts[u] = (urgencyCounts[u] || 0) + 1;
            });
            console.log('📋 Urgency distribution in database:', urgencyCounts);
          }
          setAssets(assets);
          
          // Extract unique values for filters
          const uniqueRegions = [...new Set(assets.map((a: any) => a.region).filter(Boolean))];
          const uniqueDepots = [...new Set(assets.map((a: any) => a.depot).filter(Boolean))];
          const uniqueTypes = [...new Set(assets.map((a: any) => a.type || a.asset_type_name || a.asset_type).filter(Boolean))];
          
          setRegions(uniqueRegions as string[]);
          setDepots(uniqueDepots as string[]);
          setAssetTypes(uniqueTypes as string[]);
          
          console.log(`✅ Filters extracted: ${uniqueRegions.length} regions, ${uniqueDepots.length} depots, ${uniqueTypes.length} asset types`);
        }
      } else {
        console.error("❌ Failed to load assets:", assetsRes.status);
        toast.error(`Failed to load assets (${assetsRes.status})`);
        setAssets([]);
      }

      // Load inspections
      const inspectionsRes = await fetch(`${API_URL}/inspections`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (inspectionsRes.status === 401) {
        console.error("❌ Unauthorized - token may be expired");
        toast.error("Your session has expired. Please log in again.");
        auth.logout();
        navigate("/login");
        setLoading(false);
        return;
      }
      
      if (inspectionsRes.ok) {
        const inspectionsData = await inspectionsRes.json();
        const inspections = inspectionsData.inspections || inspectionsData || [];
        console.log(`✅ Loaded ${Array.isArray(inspections) ? inspections.length : 0} inspections`);
        
        // Extract component scores from inspections
        const allComponents: any[] = [];
        if (Array.isArray(inspections)) {
          inspections.forEach((inspection: any) => {
            if (inspection.component_scores && Array.isArray(inspection.component_scores)) {
              allComponents.push(...inspection.component_scores);
            }
          });
        }
        
        console.log(`✅ Extracted ${allComponents.length} component scores`);
        setComponents(allComponents);
      } else {
        console.error("❌ Failed to load inspections:", inspectionsRes.status);
        toast.error(`Failed to load inspections (${inspectionsRes.status})`);
        setComponents([]);
      }

      // Load maintenance records
      const maintenanceRes = await fetch(`${API_URL}/maintenance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (maintenanceRes.status === 401) {
        console.error("❌ Unauthorized - token may be expired");
        toast.error("Your session has expired. Please log in again.");
        auth.logout();
        navigate("/login");
        setLoading(false);
        return;
      }
      
      if (maintenanceRes.ok) {
        const maintenanceData = await maintenanceRes.json();
        const maintenance = maintenanceData.records || maintenanceData.maintenance || maintenanceData || [];
        console.log(`✅ Loaded ${Array.isArray(maintenance) ? maintenance.length : 0} maintenance records`);
        setMaintenanceRecords(Array.isArray(maintenance) ? maintenance : []);
      } else {
        console.error("❌ Failed to load maintenance:", maintenanceRes.status);
        toast.error(`Failed to load maintenance records (${maintenanceRes.status})`);
        setMaintenanceRecords([]);
      }

    } catch (error) {
      console.error("❌ Error loading dashboard data:", error);
      toast.error("Failed to load dashboard data. Please try again.");
      setAssets([]);
      setComponents([]);
      setMaintenanceRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters to assets
  const getFilteredAssets = () => {
    return assets.filter(asset => {
      // Region filter
      if (selectedRegion !== 'all' && asset.region !== selectedRegion) return false;
      
      // Depot filter
      if (selectedDepot !== 'all' && asset.depot !== selectedDepot) return false;
      
      // Asset Type filter
      if (selectedAssetType !== 'all') {
        const assetType = asset.type || asset.asset_type_name || asset.asset_type;
        if (assetType !== selectedAssetType) return false;
      }
      
      // CI Band filter
      if (selectedCIBand !== 'all') {
        const band = getCIBand(asset.latest_ci);
        if (band !== selectedCIBand) return false;
      }
      
      // Urgency filter - only filter if urgency value exists
      if (selectedUrgency !== 'all') {
        // Use urgency_score as the primary field, fallback to parsing latest_deru
        let urgency = getAssetUrgency(asset);
        
        // Only apply filter if asset has urgency data
        if (urgency && urgency !== selectedUrgency) return false;
        // If no urgency data, include the asset (don't filter it out)
        if (!urgency && selectedUrgency !== 'none') return false;
      }
      
      // Date range filter - filter by latest inspection date
      if (dateRange !== 'all') {
        const inspectionDate = asset.latest_inspection_date || asset.last_inspection;
        if (!inspectionDate) return false; // No inspection date, exclude from filtered results
        
        const inspDate = new Date(inspectionDate);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - inspDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (dateRange === 'last30' && daysDiff > 30) return false;
        if (dateRange === 'last90' && daysDiff > 90) return false;
        if (dateRange === 'ytd') {
          const yearStart = new Date(now.getFullYear(), 0, 1);
          if (inspDate < yearStart) return false;
        }
      }
      
      return true;
    });
  };

  const filteredAssets = getFilteredAssets();
  
  // Clear all filters function
  const clearAllFilters = () => {
    setDateRange('all');
    setSelectedRegion('all');
    setSelectedDepot('all');
    setSelectedAssetType('all');
    setSelectedCIBand('all');
    setSelectedUrgency('all');
  };

  // Helper functions to open bulk work order dialog with filtered assets
  const openBulkDialog = (assetList: any[], description: string) => {
    setBulkDialogAssets(assetList);
    setBulkDialogDescription(description);
    setBulkDialogOpen(true);
  };

  const openBulkDialogCriticalCI = () => {
    const criticalCIAssets = filteredAssets.filter(a => (a.latest_ci || 0) < 40);
    openBulkDialog(criticalCIAssets, `Critical CI Assets (CI < 40)`);
  };

  const openBulkDialogHighUrgency = () => {
    const highUrgencyAssets = filteredAssets.filter(a => {
      const urgency = getAssetUrgency(a);
      return urgency === '4' || urgency === '3';
    });
    openBulkDialog(highUrgencyAssets, `High Urgency Assets (Urgency 3-4)`);
  };

  const openBulkDialogDataIssues = () => {
    const dataIssueAssets = filteredAssets.filter(a => !a.gps_lat || !a.gps_lng);
    openBulkDialog(dataIssueAssets, `Assets with Data Quality Issues`);
  };

  // Calculate Overview Stats
  const totalAssets = filteredAssets.length;
  const avgCI = filteredAssets.length > 0 
    ? filteredAssets.reduce((sum, a) => sum + (a.latest_ci || 0), 0) / filteredAssets.length 
    : 0;
  const criticalAssets = filteredAssets.filter(a => (a.latest_ci || 0) < 40).length;
  const highUrgencyAssets = filteredAssets.filter(a => {
    const urgency = getAssetUrgency(a);
    return urgency === '4' || urgency === '3';
  }).length;
  
  // Active Work Orders - flexible status matching
  const activeWorkOrders = maintenanceRecords.filter(wo => {
    const status = (wo.status || '').toLowerCase().trim().replace(/[_\s]/g, '');
    return status === 'inprogress' || status === 'scheduled';
  }).length;
  
  // Debug logging for data quality
  console.log('[Dashboard] Checking data quality for', filteredAssets.length, 'assets');
  
  // South Africa GPS bounds for outlier detection
  // Latitude: -35° to -22° (negative, southern hemisphere)
  // Longitude: 16° to 33° (positive, eastern hemisphere)
  const SA_LAT_MIN = -35;
  const SA_LAT_MAX = -22;
  const SA_LNG_MIN = 16;
  const SA_LNG_MAX = 33;
  
  // 1. Asset Basic Information Issues - GPS outliers or missing GPS
  const assetsWithGPSIssues = filteredAssets.filter(a => {
    // Missing GPS coordinates
    if (!a.gps_lat || !a.gps_lng) {
      return true;
    }
    // Invalid GPS coordinates (0,0 - equator/null island)
    const lat = parseFloat(a.gps_lat);
    const lng = parseFloat(a.gps_lng);
    if (lat === 0 && lng === 0) {
      return true;
    }
    // GPS outliers - coordinates outside South Africa bounds
    if (lat < SA_LAT_MIN || lat > SA_LAT_MAX || lng < SA_LNG_MIN || lng > SA_LNG_MAX) {
      console.log('[Dashboard] GPS outlier detected:', a.asset_ref, 'lat:', lat, 'lng:', lng);
      return true;
    }
    return false;
  });
  const gpsDataIssues = assetsWithGPSIssues.length;
  
  // 2. Inspection Integrity Issues - Assets with no inspections or incomplete recent inspections
  const assetsWithInspectionIssues = filteredAssets.filter(a => {
    // No inspection recorded
    if (!a.latest_inspection_date) {
      return true;
    }
    // Incomplete inspection data (missing CI or urgency)
    if ((a.latest_ci === null || a.latest_ci === undefined) && 
        (a.latest_urgency === null || a.latest_urgency === undefined)) {
      return true;
    }
    return false;
  });
  const inspectionIntegrityIssues = assetsWithInspectionIssues.length;
  
  // 3. Photo Integrity Issues - Assets missing main image (photo_number = 0)
  // This will need to be fetched from the backend or calculated from photo data
  // For now, we'll set it to 0 and implement the backend check later
  const photoIntegrityIssues = 0; // TODO: Implement photo check via backend
  
  // Total data quality issues
  const dataQualityIssues = gpsDataIssues + inspectionIntegrityIssues + photoIntegrityIssues;
  
  console.log('[Dashboard] Data Quality Summary:', {
    gpsDataIssues,
    inspectionIntegrityIssues,
    photoIntegrityIssues,
    total: dataQualityIssues
  });

  // Data Quality Issue Click Handlers (defined after data calculations)
  const openAssetListDialogGPSIssues = () => {
    setAssetListDialogAssets(assetsWithGPSIssues);
    setAssetListDialogTitle("Assets with GPS Data Issues");
    setAssetListDialogOpen(true);
  };

  const openAssetListDialogInspectionIssues = () => {
    setAssetListDialogAssets(assetsWithInspectionIssues);
    setAssetListDialogTitle("Assets with Inspection Integrity Issues");
    setAssetListDialogOpen(true);
  };

  const openAssetListDialogPhotoIssues = () => {
    setAssetListDialogAssets([]);
    setAssetListDialogTitle("Assets with Photo Integrity Issues");
    setAssetListDialogOpen(true);
  };

  // Critical CI Handlers
  const openAssetListDialogPoorCondition = () => {
    const poorConditionAssets = filteredAssets.filter(a => (a.latest_ci || 0) >= 20 && (a.latest_ci || 0) < 40);
    setAssetListDialogAssets(poorConditionAssets);
    setAssetListDialogTitle("Assets with Poor Condition (CI 20-39)");
    setAssetListDialogOpen(true);
  };

  // Calculate Inspection Data Integrity Metrics
  const missingGPS = filteredAssets.filter(a => {
    // Missing GPS coordinates
    if (!a.gps_lat || !a.gps_lng) return true;
    // Invalid GPS coordinates (0,0 - equator/null island)
    if (parseFloat(a.gps_lat) === 0 && parseFloat(a.gps_lng) === 0) return true;
    return false;
  }).length;
  const incompleteDERU = components.filter(c => {
    // Check if any D-E-R values are missing or zero
    const hasMissingD = !c.degree_value || parseFloat(c.degree_value) === 0;
    const hasMissingE = !c.extent_value || parseFloat(c.extent_value) === 0;
    const hasMissingR = !c.relevancy_value || parseFloat(c.relevancy_value) === 0;
    return hasMissingD || hasMissingE || hasMissingR;
  }).length;
  
  // Calculate overdue inspections (assets not inspected in last 365 days)
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const overdueInspections = filteredAssets.filter(a => {
    if (!a.latest_inspection_date && !a.last_inspection) return true; // Never inspected = overdue
    const lastInspection = new Date(a.latest_inspection_date || a.last_inspection);
    return lastInspection < oneYearAgo;
  }).length;

  // Calculate CI Distribution (match UI legend, include Not Inspected)
  const ciDistribution = [
    { name: '80-100 (Excellent)', count: filteredAssets.filter(a => a.latest_ci !== null && a.latest_ci !== undefined && (a.latest_ci || 0) >= 80).length, range: '80–100', band: 'Excellent' },
    { name: '60-79 (Good)', count: filteredAssets.filter(a => a.latest_ci !== null && a.latest_ci !== undefined && (a.latest_ci || 0) >= 60 && (a.latest_ci || 0) < 80).length, range: '60–79', band: 'Good' },
    { name: '40-59 (Fair)', count: filteredAssets.filter(a => a.latest_ci !== null && a.latest_ci !== undefined && (a.latest_ci || 0) >= 40 && (a.latest_ci || 0) < 60).length, range: '40–59', band: 'Fair' },
    { name: '0-39 (Poor)', count: filteredAssets.filter(a => a.latest_ci !== null && a.latest_ci !== undefined && (a.latest_ci || 0) < 40).length, range: '0–39', band: 'Poor' }, { name: 'Not Inspected', count: filteredAssets.filter(a => a.latest_ci === null || a.latest_ci === undefined).length, range: 'N/A', band: 'Not Inspected' }
  ];

  // Calculate Urgency Distribution - DERU urgency levels (R, 0, 1, 2, 3, 4)
  const urgencyDistribution = [
    { name: 'R - Record only', count: filteredAssets.filter(a => getAssetUrgency(a) === 'R').length, level: 'R' },
    { name: '0 - Monitor only', count: filteredAssets.filter(a => getAssetUrgency(a) === '0').length, level: '0' },
    { name: '1 - Routine maintenance', count: filteredAssets.filter(a => getAssetUrgency(a) === '1').length, level: '1' },
    { name: '2 - Repair (long term)', count: filteredAssets.filter(a => getAssetUrgency(a) === '2').length, level: '2' },
    { name: '3 - Repair (short term)', count: filteredAssets.filter(a => getAssetUrgency(a) === '3').length, level: '3' },
    { name: '4 - Immediate action', count: filteredAssets.filter(a => getAssetUrgency(a) === '4').length, level: '4' }
  ];

  // Calculate DERU Component Drivers
  const deruDrivers = calculateDERUDrivers(components);

  // Calculate Regional Performance
  const regionalPerformance = calculateRegionalPerformance(filteredAssets);

  // Top 10 Worst Assets
  const worstAssets = [...filteredAssets]
    .sort((a, b) => (a.latest_ci || 0) - (b.latest_ci || 0))
    .slice(0, 10);

  // Top Hotspots (Regions with worst CI)
  const topHotspots = regionalPerformance
    .sort((a, b) => a.avgCI - b.avgCI)
    .slice(0, 5);

  // Calculate Monthly Maintenance Spend Data
  const calculateMonthlySpend = () => {
    if (!maintenanceRecords || maintenanceRecords.length === 0) return [];
    
    // Group by month from scheduled_date
    const monthlyData: { [key: string]: { planned: number; actual: number } } = {};
    
    maintenanceRecords.forEach(wo => {
      const date = wo.scheduled_date || wo.completed_date;
      if (!date) return;
      
      // Parse date (format: "DD MM YYYY" or standard date format)
      let monthKey = '';
      try {
        // Try parsing DD MM YYYY format first
        if (date.includes(' ')) {
          const parts = date.split(' ');
          if (parts.length === 3) {
            const month = parseInt(parts[1]);
            const year = parseInt(parts[2]);
            monthKey = `${year}-${String(month).padStart(2, '0')}`;
          }
        } else {
          // Standard date format
          const d = new Date(date);
          monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
      } catch (e) {
        return;
      }
      
      if (!monthKey) return;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { planned: 0, actual: 0 };
      }
      
      // Add estimated cost to planned
      if (wo.estimated_cost) {
        monthlyData[monthKey].planned += parseFloat(wo.estimated_cost) / 1000; // Convert to thousands
      }
      
      // Add actual cost to actual (only if completed)
      if (wo.actual_cost && wo.status?.toLowerCase() === 'completed') {
        monthlyData[monthKey].actual += parseFloat(wo.actual_cost) / 1000; // Convert to thousands
      }
    });
    
    // Convert to array and sort by date
    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12) // Last 12 months
      .map(([key, data]) => {
        // Format month as "Jan 2026"
        const [year, month] = key.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = monthNames[parseInt(month) - 1];
        
        return {
          month: `${monthName} ${year.substring(2)}`,
          planned: parseFloat(data.planned.toFixed(1)),
          actual: parseFloat(data.actual.toFixed(1))
        };
      });
  };
  
  const monthlySpendData = calculateMonthlySpend();

  // Calculate Cost by Activity Type
  const calculateCostByActivity = () => {
    if (!maintenanceRecords || maintenanceRecords.length === 0) return [];
    
    const activityCosts: { [key: string]: number } = {};
    
    maintenanceRecords.forEach(wo => {
      const activity = wo.maintenance_type || 'Unknown';
      const cost = parseFloat(wo.actual_cost || wo.estimated_cost || '0');
      
      if (!activityCosts[activity]) {
        activityCosts[activity] = 0;
      }
      
      activityCosts[activity] += cost / 1000; // Convert to thousands
    });
    
    // Convert to array and sort by cost (highest first)
    return Object.entries(activityCosts)
      .map(([activity, cost]) => ({
        activity,
        cost: parseFloat(cost.toFixed(1))
      }))
      .sort((a, b) => b.cost - a.cost);
  };
  
  const costByActivityData = calculateCostByActivity();

  function calculateDERUDrivers(comps: any[]) {
    if (!comps || comps.length === 0) return [];
    
    // Group by component name
    const grouped: { [key: string]: any[] } = {};
    comps.forEach(c => {
      const name = c.component_name || 'Unknown';
      if (!grouped[name]) grouped[name] = [];
      grouped[name].push(c);
    });

    return Object.entries(grouped).map(([name, items]) => {
      const avgDegree = items.reduce((sum, i) => {
        const degree = parseFloat(i.degree_value) || 0;
        return sum + degree;
      }, 0) / items.length;
      
      const avgExtent = items.reduce((sum, i) => {
        const extent = parseFloat(i.extent_value) || 0;
        return sum + extent;
      }, 0) / items.length;
      
      const avgRelevancy = items.reduce((sum, i) => {
        const relevancy = parseFloat(i.relevancy_value) || 0;
        return sum + relevancy;
      }, 0) / items.length;
      
      const avgCI = items.reduce((sum, i) => sum + (i.component_score || 0), 0) / items.length;
      
      return {
        component: name,
        avgDegree: avgDegree.toFixed(1),
        avgExtent: avgExtent.toFixed(1),
        avgRelevancy: avgRelevancy.toFixed(1),
        impactOnCI: avgCI.toFixed(1),
        count: items.length
      };
    }).sort((a, b) => parseFloat(a.impactOnCI) - parseFloat(b.impactOnCI)); // Sort by lowest CI (worst)
  }

  function calculateRegionalPerformance(assetList: any[]) {
    const grouped: { [key: string]: any[] } = {};
    assetList.forEach(a => {
      const region = a.region || 'Unknown';
      if (!grouped[region]) grouped[region] = [];
      grouped[region].push(a);
    });

    return Object.entries(grouped).map(([region, items]) => {
      const avgCI = items.reduce((sum, i) => sum + (i.latest_ci || 0), 0) / items.length;
      const criticals = items.filter(i => (i.latest_ci || 0) < 40).length;
      const totalCost = items.reduce((sum, i) => sum + (i.replacement_value || 0), 0);
      
      return {
        region,
        totalAssets: items.length,
        avgCI: avgCI.toFixed(1),
        criticals,
        lifetimeCost: totalCost,
        urgentItems: items.filter(i => (i.latest_deru || 0) >= 80).length
      };
    });
  }

  return (
    <div className="p-6 max-w-[1920px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#010D13]">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Network-wide asset condition and performance analytics
        </p>
      </div>

      {/* Global Filter Bar */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-700 uppercase">Filters</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearAllFilters}
              className="text-xs h-7"
            >
              Clear All
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Date Range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last30">Last 30 Days</SelectItem>
                  <SelectItem value="last90">Last 90 Days</SelectItem>
                  <SelectItem value="ytd">Year to Date</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Region</label>
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {regions.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Depot</label>
              <Select value={selectedDepot} onValueChange={setSelectedDepot}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Depots</SelectItem>
                  {depots.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Asset Type</label>
              <Select value={selectedAssetType} onValueChange={setSelectedAssetType}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {assetTypes.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">CI Band</label>
              <Select value={selectedCIBand} onValueChange={setSelectedCIBand}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All CI Bands</SelectItem>
                  <SelectItem value="Excellent">Excellent (80-100)</SelectItem>
                  <SelectItem value="Good">Good (60-79)</SelectItem>
                  <SelectItem value="Fair">Fair (40-59)</SelectItem>
                  <SelectItem value="Poor">Poor (0-39)</SelectItem><SelectItem value="Not Inspected">Not Inspected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Urgency</label>
              <Select value={selectedUrgency} onValueChange={setSelectedUrgency}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Urgency</SelectItem>
                  <SelectItem value="4">4 - Immediate action</SelectItem>
                  <SelectItem value="3">3 - Repair (short term)</SelectItem>
                  <SelectItem value="2">2 - Repair (long term)</SelectItem>
                  <SelectItem value="1">1 - Routine maintenance</SelectItem>
                  <SelectItem value="0">0 - Monitor only</SelectItem>
                  <SelectItem value="R">R - Record only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-white border-b w-full justify-start rounded-none">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="condition">Condition & DERU</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance & Costs</TabsTrigger>
          <TabsTrigger value="regional">Regional Performance</TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW */}
        <TabsContent value="overview" className="space-y-4">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KPICard
              label="Total Assets"
              value={totalAssets}
              subtitle="Across all regions"
              leftBorderColor="#39AEDF"
              onClick={() => navigate('/assets')}
            />
            <KPICard
              label="Average CI"
              value={avgCI.toFixed(1)}
              subtitle={`↓ ${(100 - avgCI).toFixed(1)} to target`}
              leftBorderColor="#5DB32A"
              onClick={() => {}}
            />
            <KPICard
              label="Critical CI"
              value={criticalAssets}
              subtitle="CI 0-39"
              severity="critical"
              leftBorderColor="#d4183d"
              onClick={() => {}}
            />
            <KPICard
              label="High Urgency"
              value={highUrgencyAssets}
              subtitle="Requires action now"
              leftBorderColor="#F8D227"
              onClick={() => {}}
            />
            <KPICard
              label="Open Work Orders"
              value={activeWorkOrders}
              subtitle="In progress"
              leftBorderColor="#455B5E"
              onClick={() => navigate('/maintenance')}
            />
            <KPICard
              label="Data Quality Issues"
              value={dataQualityIssues}
              subtitle="Missing/invalid data"
              leftBorderColor="#94A3B8"
              onClick={() => {}}
            />
          </div>

          {/* Attention Required Module */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase">Attention Required</CardTitle>
              <CardDescription className="text-xs">Critical items requiring immediate action</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="critical" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="critical" className="text-xs">Critical CI ({criticalAssets})</TabsTrigger>
                  <TabsTrigger value="urgent" className="text-xs">High Urgency ({highUrgencyAssets})</TabsTrigger>
                  <TabsTrigger value="cost" className="text-xs">High Cost</TabsTrigger>
                  <TabsTrigger value="data" className="text-xs">Data Issues ({dataQualityIssues})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="critical">
                  <div className="grid md:grid-cols-3 gap-3">
                    <AlertCard
                      icon={<AlertCircle className="w-4 h-4 text-red-600" />}
                      title="Critical Condition"
                      count={criticalAssets}
                      description="CI 0-39, immediate intervention required"
                      bgColor="#FEF3F2"
                      borderColor="#DC2626"
                      actionButton={criticalAssets > 0 ? {
                        label: "Allocate Work Orders",
                        onClick: openBulkDialogCriticalCI,
                        icon: <Wrench className="w-3 h-3 mr-1" />
                      } : undefined}
                    />
                    <AlertCard
                      icon={<AlertTriangle className="w-4 h-4 text-orange-600" />}
                      title="Poor Condition"
                      count={filteredAssets.filter(a => (a.latest_ci || 0) >= 20 && (a.latest_ci || 0) < 40).length}
                      description="CI 20-39, monthly maintenance needed"
                      bgColor="#FFF4ED"
                      borderColor="#F97316"
                      onClick={filteredAssets.filter(a => (a.latest_ci || 0) >= 20 && (a.latest_ci || 0) < 40).length > 0 ? openAssetListDialogPoorCondition : undefined}
                    />
                    <AlertCard
                      icon={<Activity className="w-4 h-4 text-blue-600" />}
                      title="Active Work Orders"
                      count={activeWorkOrders}
                      description="In progress this month"
                      onClick={() => navigate('/maintenance')}
                      bgColor="#F0F9FF"
                      borderColor="#39AEDF"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="urgent">
                  <div className="grid md:grid-cols-3 gap-3">
                    <AlertCard
                      icon={<AlertCircle className="w-4 h-4 text-red-600" />}
                      title="Immediate Action"
                      count={highUrgencyAssets}
                      description="Urgency 3-4, attend immediately"
                      bgColor="#FEF3F2"
                      borderColor="#F8D227"
                      actionButton={highUrgencyAssets > 0 ? {
                        label: "Allocate Work Orders",
                        onClick: openBulkDialogHighUrgency,
                        icon: <Wrench className="w-3 h-3 mr-1" />
                      } : undefined}
                    />
                    <AlertCard
                      icon={<ClipboardCheck className="w-4 h-4 text-orange-600" />}
                      title="Scheduled Inspections"
                      count={0}
                      description="Due this month"
                      bgColor="#FFF4ED"
                      borderColor="#F97316"
                    />
                    <AlertCard
                      icon={<Wrench className="w-4 h-4 text-yellow-600" />}
                      title="Preventive Maintenance"
                      count={0}
                      description="Scheduled this quarter"
                      bgColor="#FFFBEB"
                      borderColor="#EAB308"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="cost">
                  <p className="text-sm text-gray-500">High cost asset analysis coming soon</p>
                </TabsContent>

                <TabsContent value="data">
                  <div className="space-y-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">
                      {dataQualityIssues} total data quality issues across {filteredAssets.length} assets
                    </p>
                    <div className="grid md:grid-cols-3 gap-3">
                      <AlertCard
                        icon={<MapPin className="w-4 h-4 text-blue-600" />}
                        title="GPS Data Issues"
                        count={gpsDataIssues}
                        description="Missing or invalid coordinates"
                        bgColor="#EFF6FF"
                        borderColor="#3B82F6"
                        onClick={gpsDataIssues > 0 ? openAssetListDialogGPSIssues : undefined}
                      />
                      <AlertCard
                        icon={<ClipboardCheck className="w-4 h-4 text-orange-600" />}
                        title="Inspection Issues"
                        count={inspectionIntegrityIssues}
                        description="Missing or incomplete inspections"
                        bgColor="#FFF4ED"
                        borderColor="#F97316"
                        onClick={inspectionIntegrityIssues > 0 ? openAssetListDialogInspectionIssues : undefined}
                      />
                      <AlertCard
                        icon={<ImageIcon className="w-4 h-4 text-purple-600" />}
                        title="Photo Issues"
                        count={photoIntegrityIssues}
                        description="Missing main asset photos"
                        bgColor="#FAF5FF"
                        borderColor="#A855F7"
                        onClick={photoIntegrityIssues > 0 ? openAssetListDialogPhotoIssues : undefined}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Top Hotspots & Network Map */}
          <div className="grid lg:grid-cols-[300px_1fr] gap-4">
            {/* Top Hotspots */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase">Top Hotspots by Region</CardTitle>
                <CardDescription className="text-xs">Critical assets by network region</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {topHotspots.map((hotspot, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-2 border rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedRegion(hotspot.region)}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{hotspot.region}</p>
                      <p className="text-xs text-gray-500">{hotspot.criticals} critical assets</p>
                    </div>
                    <Badge 
                      className="text-xs"
                      style={{ backgroundColor: getCIColor(parseFloat(hotspot.avgCI)) }}
                    >
                      CI {hotspot.avgCI}
                    </Badge>
                  </div>
                ))}
                {topHotspots.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No data available</p>
                )}
              </CardContent>
            </Card>

            {/* Network Map */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold uppercase">Network Map (Interactive)</CardTitle>
                    <CardDescription className="text-xs">Asset clusters by condition category</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/map')}>
                    <MapPin className="w-4 h-4 mr-2" />
                    Open Full Map
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div style={{ height: '400px' }}>
                  <AssetMap 
                    assets={filteredAssets.map(a => ({
                      ...a,
                      asset_id: a.id,
                      asset_ref: a.asset_ref,
                      asset_type: a.asset_type,
                      latitude: a.latitude,
                      longitude: a.longitude,
                      ci_score: a.ci_score,
                      urgency_score: a.urgency_score
                    }))}
                    onViewAsset={(asset) => navigate(`/assets/${asset.asset_id}`)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top 10 Worst Assets Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold uppercase">Top 10 Worst Assets</CardTitle>
                  <CardDescription className="text-xs">Assets with lowest condition index scores</CardDescription>
                </div>
                <Button variant="link" size="sm">View all →</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Asset Ref</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Region</th>
                      <th className="px-3 py-2 text-right">CI</th>
                      <th className="px-3 py-2 text-left">Urgency</th>
                      <th className="px-3 py-2 text-left">Last Inspection</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {worstAssets.map((asset, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{asset.asset_ref || 'N/A'}</td>
                        <td className="px-3 py-2">{asset.asset_type || asset.type || asset.asset_type_name || 'N/A'}</td>
                        <td className="px-3 py-2">{asset.region || 'N/A'}</td>
                        <td className="px-3 py-2 text-right">
                          <Badge style={{ backgroundColor: getCIColor(asset.latest_ci || 0) }}>
                            {(asset.latest_ci || 0).toFixed(0)}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          {(() => {
                            const urgency = getAssetUrgency(asset);
                            return urgency ? (
                              <Badge 
                                style={{ backgroundColor: getUrgencyColor(urgency) }}
                                title={getUrgencyDescription(urgency)}
                              >
                                {getUrgencyLevel(urgency)}
                              </Badge>
                            ) : (
                              <Badge variant="outline">N/A</Badge>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {asset.latest_inspection_date || asset.last_inspection ? 
                            new Date(asset.latest_inspection_date || asset.last_inspection).toLocaleDateString() : 
                            'Not inspected'}
                        </td>
                        <td className="px-3 py-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/assets/${asset.asset_id || asset.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: CONDITION & DERU */}
        <TabsContent value="condition" className="space-y-4">
          {/* CI Band Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {ciDistribution.map((band, idx) => (
              <KPICard
                key={idx}
                label={band.name}
                value={band.count}
                subtitle={`${((band.count / totalAssets) * 100).toFixed(1)}% of assets`}
                leftBorderColor={band.band === 'Not Inspected' ? getCIColor(null) : getCIColor(band.band === 'Excellent' ? 90 : band.band === 'Good' ? 70 : band.band === 'Fair' ? 50 : 30)}
                onClick={() => setSelectedCIBand(band.band)}
              />
            ))}
          </div>

          {/* CI Distribution & Urgency Distribution Charts */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase">Condition Index Distribution</CardTitle>
                <CardDescription className="text-xs">Asset count per CI band</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ciDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={140} />
                    <Tooltip 
                      formatter={(value: any, name: any, props: any) => {
                        const pct = ((value / totalAssets) * 100).toFixed(1);
                        return [`${value} assets (${pct}%)`, props.payload.name];
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {ciDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.band === 'Not Inspected' ? getCIColor(null) : getCIColor(entry.band === 'Excellent' ? 90 : entry.band === 'Good' ? 70 : entry.band === 'Fair' ? 50 : 30)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase">DERU Urgency Distribution</CardTitle>
                <CardDescription className="text-xs">Assets by urgency classification</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={urgencyDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => {
                        const pct = ((entry.count / totalAssets) * 100).toFixed(1);
                        if (parseFloat(pct) < 3) return null;
                        return `${pct}%`;
                      }}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {urgencyDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getUrgencyColor(entry.level)} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any, name: any, props: any) => {
                        const pct = ((value / totalAssets) * 100).toFixed(1);
                        return [`${value} assets (${pct}%)`, props.payload.name];
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value: any, entry: any) => {
                        return <span style={{ color: '#374151', fontSize: '12px' }}>{entry.payload.name}</span>;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* DERU Component Drivers Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase">DERU Component Drivers</CardTitle>
              <CardDescription className="text-xs">Top 10 component defects impacting condition scores</CardDescription>
            </CardHeader>
            <CardContent>
              {deruDrivers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">No component data available</p>
                  <p className="text-xs text-gray-400 mt-1">Component scores will appear here after inspections are conducted</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Component</th>
                        <th className="px-3 py-2 text-right">Avg Degree</th>
                        <th className="px-3 py-2 text-right">Avg Extent (%)</th>
                        <th className="px-3 py-2 text-center">Relevancy</th>
                        <th className="px-3 py-2 text-right">Avg CI Impact</th>
                        <th className="px-3 py-2 text-right">Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {deruDrivers.slice(0, 10).map((driver, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium">{driver.component}</td>
                          <td className="px-3 py-2 text-right">{driver.avgDegree}</td>
                          <td className="px-3 py-2 text-right">{driver.avgExtent}%</td>
                          <td className="px-3 py-2 text-center">
                            <Badge 
                              style={{ 
                                backgroundColor: parseFloat(driver.avgRelevancy) >= 3 ? '#EF4444' : 
                                                 parseFloat(driver.avgRelevancy) >= 2 ? '#F8D227' : '#5DB32A'
                              }}
                            >
                              {parseFloat(driver.avgRelevancy) >= 3 ? 'HIGH' : parseFloat(driver.avgRelevancy) >= 2 ? 'MEDIUM' : 'LOW'}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Badge style={{ backgroundColor: getCIColor(parseFloat(driver.impactOnCI)) }}>
                              {driver.impactOnCI}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-right text-gray-600">{driver.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inspection Data Integrity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase">Inspection Data Integrity</CardTitle>
              <CardDescription className="text-xs">Data completeness and quality metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-3">
                <KPICard
                  label="Missing GPS Coordinates"
                  value={missingGPS}
                  subtitle={`${((missingGPS / totalAssets) * 100).toFixed(1)}% of assets`}
                  leftBorderColor="#F8D227"
                />
                <KPICard
                  label="Incomplete DERU Scores"
                  value={incompleteDERU}
                  subtitle={`${components.length > 0 ? ((incompleteDERU / components.length) * 100).toFixed(1) : 0}% of components`}
                  leftBorderColor="#39AEDF"
                />
                <KPICard
                  label="Overdue Inspections"
                  value={overdueInspections}
                  subtitle={`${((overdueInspections / totalAssets) * 100).toFixed(1)}% not inspected in 1yr`}
                  leftBorderColor="#EF4444"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: MAINTENANCE & COSTS */}
        <TabsContent value="maintenance" className="space-y-4">
          {/* Work Order Pipeline */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard
              label="Scheduled"
              value={maintenanceRecords.filter(wo => wo.status?.toLowerCase() === 'scheduled').length}
              subtitle="Upcoming work"
              leftBorderColor="#39AEDF"
            />
            <KPICard
              label="In Progress"
              value={maintenanceRecords.filter(wo => wo.status?.toLowerCase() === 'in progress').length}
              subtitle="Active now"
              leftBorderColor="#F8D227"
            />
            <KPICard
              label="Overdue"
              value={0}
              subtitle="Past due date"
              severity="critical"
              leftBorderColor="#DC2626"
            />
            <KPICard
              label="Completed YTD"
              value={maintenanceRecords.filter(wo => wo.status?.toLowerCase() === 'completed').length}
              subtitle="This year"
              leftBorderColor="#5DB32A"
            />
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase">Monthly Maintenance Spend</CardTitle>
                <CardDescription className="text-xs">Planned vs Actual (R Thousands)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlySpendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: any) => `R ${value}k`}
                      contentStyle={{ fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="planned" stroke="#39AEDF" name="Estimated" strokeWidth={2} />
                    <Line type="monotone" dataKey="actual" stroke="#5DB32A" name="Actual" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
                {monthlySpendData.length === 0 && (
                  <p className="text-xs text-center text-gray-500 mt-2">No spend data available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase">Cost by Activity Type</CardTitle>
                <CardDescription className="text-xs">Where expenditure is highest (R Thousands)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={costByActivityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="activity" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: any) => `R ${value}k`}
                      contentStyle={{ fontSize: '12px' }}
                    />
                    <Bar dataKey="cost" fill="#F8D227" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                {costByActivityData.length === 0 && (
                  <p className="text-xs text-center text-gray-500 mt-2">No cost breakdown available</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Active Work Orders Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase">Active Work Orders</CardTitle>
              <CardDescription className="text-xs">Current maintenance activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Work Order #</th>
                      <th className="px-3 py-2 text-left">Asset ID</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-right">Est. Cost</th>
                      <th className="px-3 py-2 text-right">Actual Cost</th>
                      <th className="px-3 py-2 text-left">Scheduled Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {maintenanceRecords.slice(0, 10).map((wo, idx) => {
                      const statusColors = getStatusColor(wo.status);
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium">{wo.work_order_number || wo.maintenance_id?.substring(0, 8) || 'N/A'}</td>
                          <td className="px-3 py-2 text-xs">{wo.asset_id?.substring(0, 8) || 'N/A'}</td>
                          <td className="px-3 py-2">{wo.maintenance_type || 'N/A'}</td>
                          <td className="px-3 py-2">
                            <span 
                              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border"
                              style={{ 
                                backgroundColor: statusColors.bg,
                                color: statusColors.text,
                                borderColor: statusColors.border
                              }}
                            >
                              {wo.status || 'N/A'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            {wo.estimated_cost ? `R ${parseFloat(wo.estimated_cost).toLocaleString()}` : 'N/A'}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {wo.actual_cost ? `R ${parseFloat(wo.actual_cost).toLocaleString()}` : '-'}
                          </td>
                          <td className="px-3 py-2">{wo.scheduled_date || 'N/A'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: REGIONAL PERFORMANCE */}
        <TabsContent value="regional" className="space-y-4">
          {/* Region Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {regionalPerformance.slice(0, 4).map((region, idx) => (
              <Card key={idx} className="cursor-pointer hover:shadow-md" onClick={() => setSelectedRegion(region.region)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium uppercase text-gray-500">{region.region}</p>
                    <Building2 className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-lg font-bold mb-1">{region.totalAssets} Assets</p>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge style={{ backgroundColor: getCIColor(parseFloat(region.avgCI)) }}>
                      CI {region.avgCI}
                    </Badge>
                    <span className="text-xs text-gray-600">{region.criticals} Critical</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Region Comparison Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase">Regional Asset Distribution</CardTitle>
              <CardDescription className="text-xs">Asset counts and condition category across regions</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={regionalPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="region" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="totalAssets" fill="#39AEDF" name="Total Assets" />
                  <Bar dataKey="criticals" fill="#d4183d" name="Critical" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Region Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase">Regional Performance Summary</CardTitle>
              <CardDescription className="text-xs">Comparative analysis across network regions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Region</th>
                      <th className="px-3 py-2 text-right">Total Assets</th>
                      <th className="px-3 py-2 text-right">Avg CI</th>
                      <th className="px-3 py-2 text-right">Criticals</th>
                      <th className="px-3 py-2 text-right">Urgent Items</th>
                      <th className="px-3 py-2 text-right">Lifetime Cost</th>
                      <th className="px-3 py-2 text-center">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {regionalPerformance.map((region, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{region.region}</td>
                        <td className="px-3 py-2 text-right">{region.totalAssets}</td>
                        <td className="px-3 py-2 text-right">
                          <Badge style={{ backgroundColor: getCIColor(parseFloat(region.avgCI)) }}>
                            {region.avgCI}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right">{region.criticals}</td>
                        <td className="px-3 py-2 text-right">{region.urgentItems}</td>
                        <td className="px-3 py-2 text-right">R {region.lifetimeCost.toLocaleString()}</td>
                        <td className="px-3 py-2 text-center">
                          <TrendingUp className="w-4 h-4 text-gray-400 mx-auto" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk Work Order Dialog */}
      <BulkWorkOrderDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        preFilteredAssets={bulkDialogAssets}
        filterDescription={bulkDialogDescription}
        onSuccess={() => {
          // Reload dashboard data after successful work order creation
          loadAllData();
        }}
      />

      {/* Asset List Dialog - for viewing/managing assets */}
      <AssetListDialog
        open={assetListDialogOpen}
        onOpenChange={setAssetListDialogOpen}
        assets={assetListDialogAssets}
        title={assetListDialogTitle}
        onAssetDeleted={() => {
          // Reload dashboard data after asset deletion
          loadAllData();
          setAssetListDialogOpen(false);
        }}
      />
    </div>
  );
}