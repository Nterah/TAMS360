import { useContext, useEffect, useState, useMemo } from "react";
import { AuthContext } from "../../App";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Database, ClipboardCheck, Wrench, TrendingUp, AlertCircle, CheckCircle2, Clock, MapPin, Shield, Activity, Banknote, FileWarning, CircleDollarSign, AlertTriangle, Calendar, TrendingDown, Eye, BarChart3 } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Treemap } from "recharts";
import { Link, useNavigate } from "react-router-dom";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";

const COLORS = ["#39AEDF", "#5DB32A", "#F8D227", "#455B5E", "#010D13"];

const URGENCY_ORDER = ["Immediate", "Critical", "High", "Medium", "Low", "Record Only", "Unknown"];

const URGENCY_COLORS: Record<string, string> = {
  Immediate: "#d4183d",
  Critical: "#F57C00",
  High: "#F8D227",
  Medium: "#39AEDF",
  Low: "#5DB32A",
  "Record Only": "#455B5E",
  Unknown: "#455B5E",
};

// Safe number conversion
const toNumber = (v: any) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Extract label from various field names
const toLabel = (r: any) =>
  (r?.label ?? r?.name ?? r?.calculated_urgency ?? r?.urgency_label ?? "Unknown").toString().trim() || "Unknown";

// Extract asset type name from various field names
const toAssetTypeName = (r: any) =>
  (r?.asset_type_name ?? r?.asset_type ?? r?.name ?? "Unknown").toString().trim() || "Unknown";

export default function DashboardPage() {
  const { user, accessToken } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [maintenanceStats, setMaintenanceStats] = useState<any>(null);
  const [inspectionStats, setInspectionStats] = useState<any>(null);
  const [ciDistribution, setCiDistribution] = useState<any[]>([]);
  const [ciTreemapData, setCiTreemapData] = useState<any[]>([]);
  const [urgencySummary, setUrgencySummary] = useState<any[]>([]);
  const [assetTypeSummary, setAssetTypeSummary] = useState<any[]>([]);
  const [regionSummary, setRegionSummary] = useState<any[]>([]);
  const [ciTrendData, setCiTrendData] = useState<any[]>([]);
  const [urgencyDistribution, setUrgencyDistribution] = useState<any[]>([]);
  const [highestCostAssets, setHighestCostAssets] = useState<any[]>([]);
  const [criticalAlerts, setCriticalAlerts] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [worstAssets, setWorstAssets] = useState<any[]>([]);
  const [overdueInspections, setOverdueInspections] = useState<number>(0);
  const [dataQualityAlerts, setDataQualityAlerts] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  useEffect(() => {
    if (accessToken) {
      fetchDashboardStats();
      fetchMaintenanceStats();
      fetchInspectionStats();
      fetchCIDistribution();
      fetchCITreemapData();
      fetchUrgencySummary();
      fetchUrgencyDistribution();
      fetchAssetTypeSummary();
      fetchRegionSummary();
      fetchCiTrendData();
      fetchRecentActivity();
      fetchWorstAssets();
      fetchHighestCostAssets();
      fetchCriticalAlerts();
      fetchOverdueInspections();
      fetchDataQualityAlerts();
    }
  }, [accessToken]);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch(`${API_URL}/dashboard/summary`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats({
          totalAssets: data.totalAssets || 0,
          totalInspections: data.totalInspections || 0,
          pendingWorkOrders: data.openWorkOrders || 0,
          criticalAssets: data.criticalCount || 0,
        });
        
        // Set CI and urgency data from the summary endpoint
        if (data.ciDistribution) setCiDistribution(data.ciDistribution);
        if (data.urgencySummary) setUrgencySummary(data.urgencySummary);
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaintenanceStats = async () => {
    try {
      const response = await fetch(`${API_URL}/maintenance/stats`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMaintenanceStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching maintenance stats:", error);
    }
  };

  const fetchInspectionStats = async () => {
    try {
      const response = await fetch(`${API_URL}/inspections/stats`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInspectionStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching inspection stats:", error);
    }
  };

  const fetchCIDistribution = async () => {
    try {
      const response = await fetch(`${API_URL}/dashboard/ci-distribution`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCiDistribution(data.distribution || []);
      }
    } catch (error) {
      console.error("Error fetching CI distribution:", error);
    }
  };

  const fetchCITreemapData = async () => {
    try {
      // Add timeout to prevent hanging connections
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`${API_URL}/dashboard/ci-treemap`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log("CI Treemap data received:", data.treemapData);
        setCiTreemapData(data.treemapData || []);
      } else {
        console.error("Failed to fetch CI treemap data:", response.status);
        setCiTreemapData([]);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error("CI treemap data fetch timed out");
      } else {
        console.error("Error fetching CI treemap data:", error);
      }
      setCiTreemapData([]);
    }
  };

  const fetchUrgencySummary = async () => {
    try {
      const response = await fetch(`${API_URL}/dashboard/urgency-summary`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUrgencySummary(data.summary || []);
      }
    } catch (error) {
      console.error("Error fetching urgency summary:", error);
    }
  };

  const fetchAssetTypeSummary = async () => {
    try {
      const response = await fetch(`${API_URL}/dashboard/asset-type-summary`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAssetTypeSummary(data.summary || []);
      }
    } catch (error) {
      console.error("Error fetching asset type summary:", error);
    }
  };

  const fetchRegionSummary = async () => {
    try {
      let allAssets: any[] = [];
      let page = 1;
      
      while (true) {
        const response = await fetch(`${API_URL}/assets?page=${page}`, {
          headers: {
            Authorization: `Bearer ${accessToken || publicAnonKey}`,
          },
        });

        if (!response.ok) break;
        
        const data = await response.json();
        const assets = data.assets || [];
        
        if (assets.length === 0) break;
        
        allAssets = [...allAssets, ...assets];
        
        if (!data.hasMore) break;
        page++;
      }
      
      // Group by region
      const regionCounts: { [key: string]: number } = {};
      allAssets.forEach((asset: any) => {
        const region = asset.region || "Unknown";
        regionCounts[region] = (regionCounts[region] || 0) + 1;
      });

      const summary = Object.entries(regionCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setRegionSummary(summary);
    } catch (error) {
      console.error("Error fetching region summary:", error);
    }
  };

  const fetchCiTrendData = async () => {
    try {
      let allInspections: any[] = [];
      let page = 1;
      
      while (true) {
        const response = await fetch(`${API_URL}/inspections?page=${page}`, {
          headers: {
            Authorization: `Bearer ${accessToken || publicAnonKey}`,
          },
        });

        if (!response.ok) break;
        
        const data = await response.json();
        const inspections = data.inspections || [];
        
        if (inspections.length === 0) break;
        
        allInspections = [...allInspections, ...inspections];
        
        if (!data.hasMore) break;
        page++;
      }
      
      // Group by month and calculate average CI
      const monthlyData: { [key: string]: { total: number; count: number } } = {};
      
      allInspections.forEach((insp: any) => {
        const date = new Date(insp.inspection_date || insp.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const ci = insp.ci_final !== null && insp.ci_final !== undefined ? insp.ci_final : null;
        
        if (ci !== null) {
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { total: 0, count: 0 };
          }
          monthlyData[monthKey].total += ci;
          monthlyData[monthKey].count++;
        }
      });

      // Convert to array and calculate averages
      const trend = Object.entries(monthlyData)
        .map(([month, data]) => ({
          month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          avgCI: Math.round(data.total / data.count),
        }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-12); // Last 12 months

      setCiTrendData(trend);
    } catch (error) {
      console.error("Error fetching CI trend:", error);
    }
  };

  const fetchUrgencyDistribution = async () => {
    try {
      let allInspections: any[] = [];
      let page = 1;
      
      while (true) {
        const response = await fetch(`${API_URL}/inspections?page=${page}`, {
          headers: {
            Authorization: `Bearer ${accessToken || publicAnonKey}`,
          },
        });

        if (!response.ok) break;
        
        const data = await response.json();
        const inspections = data.inspections || [];
        
        if (inspections.length === 0) break;
        
        allInspections = [...allInspections, ...inspections];
        
        if (!data.hasMore) break;
        page++;
      }
      
      console.log('📊 Urgency Distribution - Raw inspections count:', allInspections.length);
      console.log('📊 Sample inspection:', allInspections[0]);
      
      // Count by calculated_urgency from inspections
      const urgencyCounts: { [key: string]: number } = {};

      allInspections.forEach((insp: any) => {
        const urgency = insp.calculated_urgency || insp.urgency_label || insp.urgency || "Unknown";
        urgencyCounts[urgency] = (urgencyCounts[urgency] || 0) + 1;
      });

      console.log('📊 Urgency Counts:', urgencyCounts);

      // Map to standard urgency labels
      const distribution = Object.entries(urgencyCounts).map(([label, count]) => ({
        label,
        name: label,
        calculated_urgency: label,
        count,
        value: count,
        inspection_count: count,
      }));

      console.log('📊 Final distribution array:', distribution);

      setUrgencyDistribution(distribution);
    } catch (error) {
      console.error("Error fetching urgency distribution:", error);
      setUrgencyDistribution([]);
    }
  };

  const fetchHighestCostAssets = async () => {
    try {
      const response = await fetch(`${API_URL}/inspections`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const inspections = data.inspections || [];
        
        // Group by asset and sum remedial costs
        const assetCosts: { [key: string]: any } = {};
        
        inspections.forEach((insp: any) => {
          const assetId = insp.asset_id;
          const cost = insp.total_remedial_cost || 0;
          
          if (!assetCosts[assetId]) {
            assetCosts[assetId] = {
              asset_id: assetId,
              asset_ref: insp.asset_ref,
              asset_type_name: insp.asset_type_name,
              road_name: insp.road_name,
              road_number: insp.road_number,
              latest_ci: insp.ci_final,
              total_remedial_cost: 0,
            };
          }
          
          // Take the highest remedial cost for this asset
          if (cost > assetCosts[assetId].total_remedial_cost) {
            assetCosts[assetId].total_remedial_cost = cost;
            assetCosts[assetId].latest_ci = insp.ci_final;
          }
        });

        const sorted = Object.values(assetCosts)
          .filter((asset: any) => asset.total_remedial_cost > 0)
          .sort((a: any, b: any) => b.total_remedial_cost - a.total_remedial_cost)
          .slice(0, 10);

        setHighestCostAssets(sorted);
      }
    } catch (error) {
      console.error("Error fetching highest cost assets:", error);
    }
  };

  const fetchCriticalAlerts = async () => {
    try {
      const response = await fetch(`${API_URL}/dashboard/critical-alerts`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCriticalAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error("Error fetching critical alerts:", error);
      setCriticalAlerts([]);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      // Fetch recent inspections
      const inspectionsResponse = await fetch(`${API_URL}/inspections`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      // Fetch recent maintenance
      const maintenanceResponse = await fetch(`${API_URL}/maintenance`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      const activities: any[] = [];

      if (inspectionsResponse.ok) {
        const inspectionsData = await inspectionsResponse.json();
        const recentInspections = (inspectionsData.inspections || []).slice(0, 3);
        
        recentInspections.forEach((insp: any) => {
          activities.push({
            type: "inspection",
            action: "Inspection completed",
            detail: `${insp.asset_type_name || 'Asset'} ${insp.asset_ref || ''} - CI: ${insp.conditional_index || insp.ci_final || 'N/A'}`,
            time: formatTimeAgo(insp.inspection_date || insp.created_at),
            color: insp.calculated_urgency === "4" ? "text-destructive" : "text-success",
          });
        });
      }

      if (maintenanceResponse.ok) {
        const maintenanceData = await maintenanceResponse.json();
        const recentMaintenance = (maintenanceData.records || maintenanceData.maintenance || []).slice(0, 2);
        
        recentMaintenance.forEach((maint: any) => {
          activities.push({
            type: "maintenance",
            action: maint.status === "Completed" ? "Maintenance completed" : "Maintenance scheduled",
            detail: `${maint.asset_type_name || 'Asset'} ${maint.asset_ref || ''} - ${maint.maintenance_type || 'Work'}`,
            time: formatTimeAgo(maint.completed_date || maint.scheduled_date || maint.created_at),
            color: maint.status === "Completed" ? "text-success" : "text-warning",
          });
        });
      }

      // Sort by most recent
      activities.sort((a, b) => {
        // This is a simple sort, in reality you'd compare actual dates
        return 0;
      });

      setRecentActivity(activities.slice(0, 5));
    } catch (error) {
      console.error("Error fetching recent activity:", error);
    }
  };

  const fetchWorstAssets = async () => {
    try {
      const response = await fetch(`${API_URL}/assets`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const assets = data.assets || [];
        
        // Get assets with CI values and sort by lowest CI (worst condition)
        const assetsWithCI = assets
          .filter((a: any) => a.latest_ci !== null && a.latest_ci !== undefined)
          .map((a: any) => ({
            ...a,
            normalized_ci: Math.min(Math.max(a.latest_ci, 0), 100),
          }))
          .sort((a: any, b: any) => a.normalized_ci - b.normalized_ci)
          .slice(0, 10);

        setWorstAssets(assetsWithCI);
      }
    } catch (error) {
      console.error("Error fetching worst assets:", error);
    }
  };

  const fetchOverdueInspections = async () => {
    try {
      const response = await fetch(`${API_URL}/inspections`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const inspections = data.inspections || [];
        
        const now = new Date();
        let overdueCount = 0;

        // Group inspections by asset to find the most recent inspection per asset
        const assetInspections: { [key: string]: any } = {};
        
        inspections.forEach((insp: any) => {
          const assetId = insp.asset_id;
          const inspDate = new Date(insp.inspection_date || insp.created_at);
          
          if (!assetInspections[assetId] || inspDate > new Date(assetInspections[assetId].inspection_date)) {
            assetInspections[assetId] = insp;
          }
        });

        // Check each asset's most recent inspection
        Object.values(assetInspections).forEach((insp: any) => {
          const inspDate = new Date(insp.inspection_date || insp.created_at);
          const daysSince = Math.floor((now.getTime() - inspDate.getTime()) / (1000 * 60 * 60 * 24));
          
          // If inspection_frequency is specified, use that; otherwise default to 365 days (annual)
          const frequency = insp.inspection_frequency || 365;
          
          // Only count as overdue if past the inspection frequency
          if (daysSince > frequency) {
            overdueCount++;
          }
        });

        setOverdueInspections(overdueCount);
      }
    } catch (error) {
      console.error("Error fetching overdue inspections:", error);
      setOverdueInspections(0);
    }
  };

  const fetchDataQualityAlerts = async () => {
    try {
      // Use lightweight count query with head:true
      const response = await fetch(`${API_URL}/assets?pageSize=2000`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const assets = data.assets || [];
        
        // Only count CRITICAL issues (GPS and asset_type are required)
        // Missing GPS coordinates (but allow 0,0 as it might be a placeholder)
        const missingGPS = assets.filter((asset: any) => 
          !asset.gps_lat || !asset.gps_lng
        ).length;

        // Find assets with missing asset type - this is critical
        const missingType = assets.filter((asset: any) => 
          !asset.asset_type_name
        ).length;
        
        const totalIssues = missingGPS + missingType;

        setDataQualityAlerts({ 
          count: totalIssues,
          details: {
            missingGPS,
            missingType
          }
        });
      }
    } catch (error) {
      console.error("Error fetching data quality alerts:", error);
      setDataQualityAlerts({ count: 0, details: {} });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return "Recently";
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  // Map CI band names to colors
  const getCIColor = (bandName: string) => {
    const name = bandName?.toLowerCase() || "";
    
    if (name.includes("excellent") || name.includes("80-100")) return "#5DB32A"; // Green
    if (name.includes("good") || name.includes("60-79")) return "#39AEDF"; // Blue
    if (name.includes("fair") || name.includes("40-59")) return "#F8D227"; // Yellow
    if (name.includes("poor") || name.includes("20-39")) return "#F57C00"; // Orange
    if (name.includes("critical") || name.includes("0-19")) return "#d4183d"; // Red
    
    return "#F8D227"; // Default to yellow/fair
  };

  // Memoized urgency chart data with robust normalization
  const urgencyChartData = useMemo(() => {
    console.log('🔄 Normalizing urgency chart data...');
    console.log('📥 Raw urgencyDistribution:', urgencyDistribution);
    
    const raw = Array.isArray(urgencyDistribution)
      ? urgencyDistribution
      : (urgencyDistribution ? Object.values(urgencyDistribution) : []);

    console.log('📦 Converted to array:', raw);

    // Normalize rows from API → { label, count }
    const normalized = raw.map((r: any) => ({
      label: toLabel(r),
      count: toNumber(r?.count ?? r?.value ?? r?.inspection_count ?? r?.asset_count ?? r?.total ?? 0),
    }));

    console.log('✨ Normalized data:', normalized);

    // Merge duplicates (e.g., multiple "Low" rows)
    const merged = new Map<string, number>();
    for (const row of normalized) {
      merged.set(row.label, (merged.get(row.label) || 0) + row.count);
    }

    console.log('🔗 Merged duplicates:', Array.from(merged.entries()));

    // Seed all categories so chart never disappears (optional - helps with debugging)
    for (const key of URGENCY_ORDER) {
      if (!merged.has(key)) merged.set(key, 0);
    }

    // Sort in fixed order; anything unknown goes last
    const sorted = Array.from(merged.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => {
        const ai = URGENCY_ORDER.indexOf(a.label);
        const bi = URGENCY_ORDER.indexOf(b.label);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });

    console.log('📊 Sorted data:', sorted);

    // Filter out zero counts only after seeding (helps keep chart stable)
    const final = sorted.filter(x => x.count > 0);
    
    console.log('✅ Final chart data:', final);

    return final;
  }, [urgencyDistribution]);

  // Memoized asset type chart data with robust normalization
  const assetTypeChartData = useMemo(() => {
    const raw = Array.isArray(assetTypeSummary)
      ? assetTypeSummary
      : (assetTypeSummary ? Object.values(assetTypeSummary) : []);

    const normalized = raw.map((r: any) => ({
      name: toAssetTypeName(r),
      count: toNumber(r?.asset_count ?? r?.total_assets ?? r?.count ?? r?.value ?? 0),
    }));

    // Sort biggest first
    return normalized
      .filter(x => x.count > 0) // Only show types with assets
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [assetTypeSummary]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.name}. Here's an overview of your road asset management system.
        </p>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/assets')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Database className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAssets || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalAssets > 0 ? (
                <>
                  <TrendingUp className="inline w-3 h-3 text-success" /> Active and managed
                </>
              ) : (
                "Import assets to get started"
              )}
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/inspections')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inspections This Month</CardTitle>
            <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inspectionStats?.thisMonth || 0}</div>
            <p className="text-xs text-muted-foreground">
              {inspectionStats?.total > 0 ? (
                <>
                  <CheckCircle2 className="inline w-3 h-3 text-success" /> {inspectionStats?.total} total inspections
                </>
              ) : (
                "No inspections yet"
              )}
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/maintenance')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Maintenance Tasks</CardTitle>
            <Wrench className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(maintenanceStats?.scheduled || 0) + (maintenanceStats?.inProgress || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {maintenanceStats?.completed > 0 ? (
                <>
                  <CheckCircle2 className="inline w-3 h-3 text-success" /> {maintenanceStats?.completed} completed
                </>
              ) : (
                "No maintenance records"
              )}
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/inspections')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Immediate Urgency</CardTitle>
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats?.criticalUrgency || inspectionStats?.criticalUrgency || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {(stats?.criticalUrgency || inspectionStats?.criticalUrgency || 0) > 0 ? (
                <>
                  <AlertCircle className="inline w-3 h-3 text-destructive" /> Requires immediate action
                </>
              ) : (
                <>
                  <CheckCircle2 className="inline w-3 h-3 text-success" /> No immediate issues
                </>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* New Executive KPI Row - Overdue & Data Quality */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Overdue Inspections */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/inspections')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue Inspections</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {overdueInspections || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {overdueInspections > 0 ? (
                <>
                  <AlertCircle className="inline w-3 h-3 text-warning" /> Require rescheduling
                </>
              ) : (
                <>
                  <CheckCircle2 className="inline w-3 h-3 text-success" /> All up to date
                </>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Data Quality Alerts */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/assets')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Data Quality Alerts</CardTitle>
            <FileWarning className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {dataQualityAlerts?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {dataQualityAlerts?.count > 0 ? (
                <>
                  <AlertTriangle className="inline w-3 h-3 text-warning" /> Missing GPS/photos/data
                </>
              ) : (
                <>
                  <CheckCircle2 className="inline w-3 h-3 text-success" /> Data quality good
                </>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Placeholder for balance */}
        <Card className="opacity-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reserved</CardTitle>
            <Eye className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">
              Future expansion
            </p>
          </CardContent>
        </Card>

        {/* Placeholder for balance */}
        <Card className="opacity-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reserved</CardTitle>
            <Eye className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">
              Future expansion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Condition & Risk Overview Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* CI Distribution Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Condition Index Distribution</CardTitle>
            <CardDescription>Overall asset condition (hover bars for asset type breakdown)</CardDescription>
          </CardHeader>
          <CardContent>
            {ciTreemapData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={(() => {
                    // Flatten and aggregate data by CI band
                    const aggregated = ciTreemapData.flatMap((assetType: any) => 
                      assetType.children.map((band: any) => ({
                        ...band,
                        assetType: assetType.name,
                      }))
                    ).reduce((acc: any[], item: any) => {
                      const existing = acc.find(x => x.name === item.name);
                      if (existing) {
                        existing.size += item.size;
                        existing.breakdown = existing.breakdown || [];
                        existing.breakdown.push({ assetType: item.assetType, count: item.size });
                      } else {
                        acc.push({
                          name: item.name,
                          size: item.size,
                          ci_band: item.ci_band,
                          breakdown: [{ assetType: item.assetType, count: item.size }]
                        });
                      }
                      return acc;
                    }, []);
                    
                    // Sort by CI band order
                    const order = ['Excellent', 'Good', 'Fair', 'Poor', 'Critical'];
                    return aggregated.sort((a: any, b: any) => order.indexOf(a.name) - order.indexOf(b.name));
                  })()}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    label={{ value: 'Number of Assets', angle: -90, position: 'insideLeft' }}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    content={(props: any) => {
                      if (!props.active || !props.payload || !props.payload[0]) return null;
                      const data = props.payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
                          <p className="font-bold text-sm mb-2">{data.name}</p>
                          <p className="text-sm mb-2">Total: <strong>{data.size}</strong> assets</p>
                          {data.breakdown && data.breakdown.length > 0 && (
                            <>
                              <div className="border-t pt-2 mt-2">
                                <p className="text-xs text-gray-600 mb-1">Breakdown by type:</p>
                                {data.breakdown.sort((a: any, b: any) => b.count - a.count).map((item: any, i: number) => (
                                  <div key={i} className="text-xs flex justify-between gap-4">
                                    <span className="text-gray-700">{item.assetType}:</span>
                                    <span className="font-semibold">{item.count}</span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Bar 
                    dataKey="size" 
                    radius={[8, 8, 0, 0]}
                  >
                    {(() => {
                      // Flatten and aggregate data by CI band
                      const aggregated = ciTreemapData.flatMap((assetType: any) => 
                        assetType.children.map((band: any) => ({
                          ...band,
                          assetType: assetType.name,
                        }))
                      ).reduce((acc: any[], item: any) => {
                        const existing = acc.find(x => x.name === item.name);
                        if (existing) {
                          existing.size += item.size;
                          existing.breakdown = existing.breakdown || [];
                          existing.breakdown.push({ assetType: item.assetType, count: item.size });
                        } else {
                          acc.push({
                            name: item.name,
                            size: item.size,
                            ci_band: item.ci_band,
                            breakdown: [{ assetType: item.assetType, count: item.size }]
                          });
                        }
                        return acc;
                      }, []);
                      
                      // Sort by CI band order
                      const order = ['Excellent', 'Good', 'Fair', 'Poor', 'Critical'];
                      return aggregated.sort((a: any, b: any) => order.indexOf(a.name) - order.indexOf(b.name)).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={getCIColor(entry.ci_band)} />
                      ));
                    })()}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No CI distribution data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Urgency Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Urgency Distribution</CardTitle>
            <CardDescription>Urgency levels across all inspections (click bars to view details)</CardDescription>
          </CardHeader>
          <CardContent>
            {urgencyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={urgencyChartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const urgencyLabel = data.label;
                        const count = data.count;
                        const percentage = urgencyChartData.length > 0 
                          ? ((count / urgencyChartData.reduce((sum, item) => sum + item.count, 0)) * 100).toFixed(1)
                          : 0;
                        
                        return (
                          <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3">
                            <p className="font-semibold text-sm mb-1">{urgencyLabel}</p>
                            <p className="text-sm">
                              <span className="font-bold">{count}</span> inspection{count !== 1 ? 's' : ''}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {percentage}% of total
                            </p>
                            <p className="text-xs text-primary mt-2">
                              Click to view inspections →
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    cursor="pointer"
                    radius={[8, 8, 0, 0]}
                    onClick={(data) => {
                      if (data && data.label) {
                        navigate(`/inspections?urgency=${encodeURIComponent(data.label)}`);
                      }
                    }}
                  >
                    {urgencyChartData.map((entry, idx) => (
                      <Cell 
                        key={`u-${idx}`} 
                        fill={URGENCY_COLORS[entry.label] || URGENCY_COLORS.Unknown}
                        className="hover:opacity-80 transition-opacity"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <p>No urgency data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CI Trend Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>CI Trend Over Time</CardTitle>
          <CardDescription>Average condition index history</CardDescription>
        </CardHeader>
        <CardContent>
          {ciTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={ciTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="avgCI" 
                  name="Average CI"
                  stroke="#39AEDF" 
                  strokeWidth={3}
                  dot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              <p>Insufficient data for trend analysis. Complete more inspections over time.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Breakdown Charts: Region & Asset Type */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Region Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Breakdown by Region</CardTitle>
            <CardDescription>Asset count per region</CardDescription>
          </CardHeader>
          <CardContent>
            {regionSummary.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={regionSummary} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip 
                    formatter={(value: any) => [`${value} assets`, 'Count']}
                    labelStyle={{ color: '#000' }}
                  />
                  <Bar dataKey="count" fill="#5DB32A" radius={[0, 4, 4, 0]}>
                    {regionSummary.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <p>No region data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Critical Alerts Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Critical Alerts</CardTitle>
            <CardDescription>Issues requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            {criticalAlerts.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {criticalAlerts.map((alert, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded-lg border-destructive/30 bg-destructive/5">
                    <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{alert.title || alert.message}</p>
                      <p className="text-xs text-muted-foreground">{alert.description || alert.detail}</p>
                      {alert.asset_ref && (
                        <p className="text-xs font-mono mt-1">{alert.asset_ref}</p>
                      )}
                    </div>
                    {alert.count && (
                      <Badge variant="destructive" className="flex-shrink-0">
                        {alert.count}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-center text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mb-4 opacity-50 text-success" />
                <p className="font-medium">No critical alerts</p>
                <p className="text-sm">System is operating within normal parameters</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Highest Cost Assets & Top 10 Worst */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Highest Remedial Cost Assets */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Highest Remedial Cost</CardTitle>
            <CardDescription>Assets requiring most expensive repairs</CardDescription>
          </CardHeader>
          <CardContent>
            {highestCostAssets.length > 0 ? (
              <div className="space-y-3">
                {highestCostAssets.slice(0, 10).map((asset, index) => (
                  <div 
                    key={asset.asset_id || index} 
                    className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${asset.asset_id ? 'hover:bg-accent/50 cursor-pointer' : ''}`}
                    onClick={() => asset.asset_id && navigate(`/assets/${asset.asset_id}`)}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-warning/10 text-warning flex items-center justify-center font-bold text-sm">
                      #{index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{asset.asset_ref || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {asset.asset_type_name} • {asset.road_name || asset.road_number || 'Location N/A'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className="font-bold text-warning border-warning">
                        R {((asset.total_remedial_cost || asset.remedial_cost || 0) / 1000).toFixed(0)}k
                      </Badge>
                      {asset.latest_ci !== null && asset.latest_ci !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          CI: {Math.min(Math.max(asset.latest_ci, 0), 100).toFixed(0)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Banknote className="w-12 h-12 mb-4 opacity-50" />
                <p>No remedial cost data</p>
                <p className="text-sm">Complete inspections to see repair cost estimates</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 10 Worst Assets */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Worst Assets</CardTitle>
            <CardDescription>Assets with lowest CI scores requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            {worstAssets.length > 0 ? (
              <div className="space-y-3">
                {worstAssets.map((asset, index) => (
                  <div 
                    key={asset.asset_id || index} 
                    className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${asset.asset_id ? 'hover:bg-accent/50 cursor-pointer' : ''}`}
                    onClick={() => asset.asset_id && navigate(`/assets/${asset.asset_id}`)}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center font-bold text-sm">
                      #{index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{asset.asset_ref}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {asset.asset_type_name} • {asset.road_name || asset.road_number || 'Location N/A'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="destructive" className="font-bold">
                        CI: {asset.normalized_ci.toFixed(0)}
                      </Badge>
                      {asset.replacement_value && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Banknote className="w-3 h-3" />
                          R {(asset.replacement_value / 1000).toFixed(0)}k
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
                <p>No assets with CI scores</p>
                <p className="text-sm">Perform inspections to see assets ranked by condition</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Worst Assets & Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Asset Distribution by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Distribution by Type</CardTitle>
            <CardDescription>Breakdown of assets by category</CardDescription>
          </CardHeader>
          <CardContent>
            {assetTypeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={assetTypeChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 140, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={130} />
                  <Tooltip 
                    formatter={(v: any) => [`${v} assets`, "Count"]} 
                    labelStyle={{ color: "#000" }} 
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {assetTypeChartData.map((_, idx) => (
                      <Cell key={`a-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <p>No asset data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates and actions in the system</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-4 pb-4 border-b last:border-0">
                    <div className={`w-2 h-2 rounded-full mt-2 ${activity.color.replace("text-", "bg-")}`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{activity.action}</p>
                      <p className="text-sm text-muted-foreground">{activity.detail}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Activity className="w-12 h-12 mb-4 opacity-50" />
                <p>No recent activity</p>
                <p className="text-sm">Import assets and create inspections to see activity here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Asset Condition Overview & Quick Actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Asset Condition */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Asset Condition Overview</CardTitle>
            <CardDescription>Current state of all managed assets (hover bars for asset type breakdown)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart 
                data={(() => {
                  // Flatten and aggregate data by CI band from ciTreemapData
                  if (!ciTreemapData || ciTreemapData.length === 0) return [];
                  
                  const aggregated = ciTreemapData.flatMap((assetType: any) => 
                    assetType.children.map((band: any) => ({
                      ...band,
                      assetType: assetType.name,
                    }))
                  ).reduce((acc: any[], item: any) => {
                    const existing = acc.find(x => x.name === item.name);
                    if (existing) {
                      existing.value += item.size;
                      existing.breakdown = existing.breakdown || [];
                      existing.breakdown.push({ assetType: item.assetType, count: item.size });
                    } else {
                      acc.push({
                        name: item.name,
                        value: item.size,
                        ci_band: item.ci_band,
                        breakdown: [{ assetType: item.assetType, count: item.size }]
                      });
                    }
                    return acc;
                  }, []);
                  
                  // Sort by CI band order
                  const order = ['Excellent', 'Good', 'Fair', 'Poor', 'Critical'];
                  return aggregated.sort((a: any, b: any) => order.indexOf(a.name) - order.indexOf(b.name));
                })()} 
                layout="vertical"
                margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                <Tooltip 
                  content={(props: any) => {
                    if (!props.active || !props.payload || !props.payload[0]) return null;
                    const data = props.payload[0].payload;
                    return (
                      <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
                        <p className="font-bold text-sm mb-2">{data.name}</p>
                        <p className="text-sm mb-2">Total: <strong>{data.value}</strong> assets</p>
                        {data.breakdown && data.breakdown.length > 0 && (
                          <>
                            <div className="border-t pt-2 mt-2">
                              <p className="text-xs text-gray-600 mb-1">Breakdown by type:</p>
                              {data.breakdown.sort((a: any, b: any) => b.count - a.count).map((item: any, i: number) => (
                                <div key={i} className="text-xs flex justify-between gap-4">
                                  <span className="text-gray-700">{item.assetType}:</span>
                                  <span className="font-semibold">{item.count}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {(() => {
                    // Flatten and aggregate data by CI band from ciTreemapData
                    if (!ciTreemapData || ciTreemapData.length === 0) return [];
                    
                    const aggregated = ciTreemapData.flatMap((assetType: any) => 
                      assetType.children.map((band: any) => ({
                        ...band,
                        assetType: assetType.name,
                      }))
                    ).reduce((acc: any[], item: any) => {
                      const existing = acc.find(x => x.name === item.name);
                      if (existing) {
                        existing.value += item.size;
                        existing.breakdown = existing.breakdown || [];
                        existing.breakdown.push({ assetType: item.assetType, count: item.size });
                      } else {
                        acc.push({
                          name: item.name,
                          value: item.size,
                          ci_band: item.ci_band,
                          breakdown: [{ assetType: item.assetType, count: item.size }]
                        });
                      }
                      return acc;
                    }, []);
                    
                    // Sort by CI band order
                    const order = ['Excellent', 'Good', 'Fair', 'Poor', 'Critical'];
                    return aggregated.sort((a: any, b: any) => order.indexOf(a.name) - order.indexOf(b.name)).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={getCIColor(entry.ci_band)} />
                    ));
                  })()}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/assets">
              <Button variant="outline" className="w-full justify-start">
                <Database className="w-4 h-4 mr-2" />
                Add New Asset
              </Button>
            </Link>
            <Link to="/inspections/new">
              <Button variant="outline" className="w-full justify-start">
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Schedule Inspection
              </Button>
            </Link>
            <Link to="/maintenance/new">
              <Button variant="outline" className="w-full justify-start">
                <Wrench className="w-4 h-4 mr-2" />
                Log Maintenance
              </Button>
            </Link>
            <Link to="/map">
              <Button variant="outline" className="w-full justify-start">
                <MapPin className="w-4 h-4 mr-2" />
                View GIS Map
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* CI Distribution Treemap */}
      
    </div>
  );
}

// Custom content for Treemap
const CustomTreemapContent = ({ colors }: { colors: (bandName: string) => string }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <p className="text-sm font-bold text-white">Asset Type</p>
      <p className="text-xs text-white">CI Band</p>
    </div>
  );
};