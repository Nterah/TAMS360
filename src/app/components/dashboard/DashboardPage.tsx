import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { AuthContext } from "../../App";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Database,
  ClipboardCheck,
  Wrench,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  MapPin,
  Shield,
  Activity,
  Banknote,
  FileWarning,
  CircleDollarSign,
  AlertTriangle,
  Calendar,
  TrendingDown,
  Eye,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Treemap,
} from "recharts";
import { Link, useNavigate } from "react-router-dom";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

/**
 * Measures a div reliably in production (ResizeObserver + a few delayed re-measures).
 * This prevents "0 width" stuck states that can happen with responsive layouts after deploy.
 */
function useMeasuredSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      setSize((prev) => (prev.width !== w || prev.height !== h ? { width: w, height: h } : prev));
    };

    measure();

    const ro = new ResizeObserver(() => measure());
    ro.observe(el);

    const r1 = requestAnimationFrame(measure);
    const r2 = requestAnimationFrame(measure);

    // Important: production layout/fonts often settle late
    const t1 = window.setTimeout(measure, 0);
    const t2 = window.setTimeout(measure, 50);
    const t3 = window.setTimeout(measure, 250);

    window.addEventListener("resize", measure);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return { ref, size };
}




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
  
  // DERU Analysis State
  const [selectedDERUCategory, setSelectedDERUCategory] = useState<'degree' | 'extent' | 'relevancy' | 'urgency' | 'ci'>('degree');
  const [deruData, setDeruData] = useState<any>({
    degree: [],
    extent: [],
    relevancy: [],
    urgency: [],
    ci: []
  });
  // DERU Chart sizing + normalization (production-safe: avoids ResponsiveContainer 0x0 issues)
  const deruChartHeight = 300;
  const { ref: deruBarRef, size: deruBarSize } = useMeasuredSize<HTMLDivElement>();

  const hasDeruRows = (deruData?.[selectedDERUCategory]?.length ?? 0) > 0;
  const deruNormalizedData = useMemo(() => {
    const rows: any[] = Array.isArray(deruData?.[selectedDERUCategory]) ? deruData[selectedDERUCategory] : [];
    if (!rows.length) return [];

    return rows.map((row: any) => {
      const out: any = { ...row };
      const keys = Object.keys(out).filter((k) => k !== "name" && typeof out[k] === "number" && Number.isFinite(out[k]));
      if (!keys.length) return out;

      const total = keys.reduce((s, k) => s + (out[k] as number), 0);
      if (!total || total <= 0) return out;

      // Scale to 100%, round to 1 decimal, then fix rounding drift by nudging the largest slice.
      const factor = 100 / total;
      let maxKey = keys[0];
      let maxVal = -Infinity;

      let roundedSum = 0;
      for (const k of keys) {
        const scaled = (out[k] as number) * factor;
        const rounded = Math.round(scaled * 10) / 10; // 1 decimal
        out[k] = rounded;
        roundedSum += rounded;

        if (rounded > maxVal) {
          maxVal = rounded;
          maxKey = k;
        }
      }

      const drift = Math.round((100 - roundedSum) * 10) / 10; // keep 1 decimal drift
      if (Math.abs(drift) >= 0.1 && maxKey) {
        out[maxKey] = Math.round(((out[maxKey] as number) + drift) * 10) / 10;
      }
      return out;
    });
  }, [deruData, selectedDERUCategory]);
  const [overdueMaintenance, setOverdueMaintenance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  useEffect(() => {
    if (accessToken) {
      // Create abort controller for cleanup
      const abortController = new AbortController();
      const signal = abortController.signal;

      // Pass signal to all fetch functions
      fetchDashboardStats(signal);
      fetchMaintenanceStats(signal);
      fetchInspectionStats(signal);
      fetchCIDistribution(signal);
      fetchCITreemapData(signal);
      fetchUrgencySummary(signal);
      fetchUrgencyDistribution(signal);
      fetchAssetTypeSummary(signal);
      fetchRegionSummary(signal);
      fetchCiTrendData(signal);
      fetchRecentActivity(signal);
      fetchWorstAssets(signal);
      fetchHighestCostAssets(signal);
      fetchDERUAnalysis(signal);
      fetchCriticalAlerts(signal);
      // REMOVED: fetchOverdueInspections() - now using stats.uninspectedAssets from backend
      fetchDataQualityAlerts(signal);
      // REMOVED: fetchOverdueMaintenance() - now using maintenanceStats.overdue from backend
      
      // Cleanup function to abort all pending requests
      return () => {
        abortController.abort();
      };
    }
  }, [accessToken]);

  const fetchDashboardStats = async (signal?: AbortSignal) => {
    if (!accessToken) return;
    try {
      const response = await fetch(`${API_URL}/dashboard/summary`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal,
      });

      if (response.ok) {
        const data = await response.json();
        setStats({
          totalAssets: data.totalAssets || 0,
          totalInspections: data.totalInspections || 0,
          pendingWorkOrders: data.openWorkOrders || 0,
          criticalAssets: data.criticalCount || 0,
          uninspectedAssets: data.uninspectedAssets || 0,
        });
        
        // Set CI and urgency data from the summary endpoint
        if (data.ciDistribution) setCiDistribution(data.ciDistribution);
        if (data.urgencySummary) setUrgencySummary(data.urgencySummary);
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaintenanceStats = async (signal?: AbortSignal) => {
    if (!accessToken) return;
    try {
      const response = await fetch(`${API_URL}/maintenance/stats`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal,
      });

      if (response.ok) {
        const data = await response.json();
        setMaintenanceStats(data.stats);
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error("Error fetching maintenance stats:", error);
    }
  };

  const fetchInspectionStats = async (signal?: AbortSignal) => {
    if (!accessToken) return;
    try {
      const response = await fetch(`${API_URL}/inspections/stats`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal,
      });

      if (response.ok) {
        const data = await response.json();
        setInspectionStats(data.stats);
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error("Error fetching inspection stats:", error);
    }
  };

  const fetchCIDistribution = async (signal?: AbortSignal) => {
    if (!accessToken) return;
    try {
      const response = await fetch(`${API_URL}/dashboard/ci-distribution`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal,
      });

      if (response.ok) {
        const data = await response.json();
        setCiDistribution(data.distribution || []);
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error("Error fetching CI distribution:", error);
    }
  };

  const fetchCITreemapData = async (signal?: AbortSignal) => {
    // Skip if no access token
    if (!accessToken) {
      console.log("Skipping CI treemap fetch - no access token");
      setCiTreemapData([]);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/dashboard/ci-treemap`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal,
      });

      if (response.ok) {
        const data = await response.json();
        console.log("CI Treemap data received:", data.treemapData);
        setCiTreemapData(data.treemapData || []);
      } else {
        if (response.status === 401) {
          console.log("CI treemap data requires authentication");
        } else {
          console.error("Failed to fetch CI treemap data:", response.status);
        }
        setCiTreemapData([]);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return; // Ignore abort errors
      } else {
        console.error("Error fetching CI treemap data:", error);
      }
      setCiTreemapData([]);
    }
  };

  const fetchUrgencySummary = async (signal?: AbortSignal) => {
    if (!accessToken) return;
    try {
      const response = await fetch(`${API_URL}/dashboard/urgency-summary`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal,
      });

      if (response.ok) {
        const data = await response.json();
        setUrgencySummary(data.summary || []);
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error("Error fetching urgency summary:", error);
    }
  };

  const fetchAssetTypeSummary = async (signal?: AbortSignal) => {
    if (!accessToken) return;
    try {
      console.log('📡 [Asset Type] Fetching asset type summary...');
      const response = await fetch(`${API_URL}/dashboard/asset-type-summary`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal,
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [Asset Type] Received data:', data);
        console.log('✅ [Asset Type] Summary array:', data.summary);
        setAssetTypeSummary(data.summary || []);
      } else {
        console.error('❌ [Asset Type] Failed to fetch:', response.status, await response.text());
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error("❌ [Asset Type] Error fetching asset type summary:", error);
    }
  };

  const fetchRegionSummary = async (signal?: AbortSignal) => {
    if (!accessToken) return;
    try {
      const response = await fetch(`${API_URL}/dashboard/stats`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.stats?.regionSummary) {
          setRegionSummary(data.stats.regionSummary);
        }
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error("Error fetching region summary:", error);
    }
  };

  const fetchCiTrendData = async (signal?: AbortSignal) => {
    if (!accessToken) return;
    try {
      let allInspections: any[] = [];
      let page = 1;
      
      while (true) {
        const response = await fetch(`${API_URL}/inspections?page=${page}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          signal,
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
        const ci = insp.conditional_index !== null && insp.conditional_index !== undefined ? insp.conditional_index : 
                   (insp.ci_final !== null && insp.ci_final !== undefined ? insp.ci_final : null);
        
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
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error("Error fetching CI trend:", error);
    }
  };

  const fetchUrgencyDistribution = async (signal?: AbortSignal) => {
    if (!accessToken) return;
    try {
      let allInspections: any[] = [];
      let page = 1;
      
      while (true) {
        const response = await fetch(`${API_URL}/inspections?page=${page}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          signal,
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
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error("Error fetching urgency distribution:", error);
      setUrgencyDistribution([]);
    }
  };

  const fetchHighestCostAssets = async (signal?: AbortSignal) => {
    if (!accessToken) return;
    try {
      const response = await fetch(`${API_URL}/inspections`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal,
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
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error("Error fetching highest cost assets:", error);
    }
  };

  const fetchDERUAnalysis = async (signal?: AbortSignal) => {
    if (!accessToken) return;
    try {
      const response = await fetch(`${API_URL}/inspections/deru-analytics`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal,
      });

      if (response.ok) {
        const data = await response.json();
        const inspections = data.inspections || [];
        
        // Debug: Log first inspection to see what fields are available
        if (inspections.length > 0) {
          const firstInsp = inspections[0];
          console.log('[DERU Debug] First inspection sample:', {
            Degree_1: firstInsp.Degree_1,
            Degree_2: firstInsp.Degree_2,
            Extent_1: firstInsp.Extent_1,
            Extent_2: firstInsp.Extent_2,
            Relevancy_1: firstInsp.Relevancy_1,
            Relevancy_2: firstInsp.Relevancy_2,
            'U - Comp 1': firstInsp['U - Comp 1'],
            'U - Comp 2': firstInsp['U - Comp 2'],
          });
          console.log('[DERU Debug] Total inspections:', inspections.length);
          console.log('[DERU Debug] Asset types found:', [...new Set(inspections.map((i: any) => i.asset_type_name).filter(Boolean))]);
        }
        
        // Process DERU data by asset type
        const assetTypes = [...new Set(inspections.map((i: any) => i.asset_type_name).filter(Boolean))];
        
        const processCategory = (categoryField: string, labels: { [key: string]: string }, isCI: boolean = false) => {
          return assetTypes.map(assetType => {
            const typeInspections = inspections.filter((i: any) => i.asset_type_name === assetType);
            const counts: { [key: string]: number } = {};
            
            typeInspections.forEach((insp: any) => {
              // DERU values are now at the top level (pre-extracted by server)
              
              // Helper to extract numeric value from strings like "1 = Minor", "4 = General"
              const extractNumericValue = (str: string | null | undefined): string | null => {
                if (!str || str === '#N/A' || str === 'null') return null;
                const match = str.match(/^(\d+|[A-Z])\s*=/);
                return match ? match[1] : null;
              };
              
              let values: (string | null)[] = [];
              
              // Extract values from all 6 components based on category
              if (categoryField === 'd_degree') {
                // Extract Degree_1 through Degree_6
                for (let i = 1; i <= 6; i++) {
                  const rawVal = insp[`Degree_${i}`];
                  const val = extractNumericValue(rawVal);
                  if (val) values.push(val);
                }
              } else if (categoryField === 'e_extent') {
                // Extract Extent_1 through Extent_6
                for (let i = 1; i <= 6; i++) {
                  const val = extractNumericValue(insp[`Extent_${i}`]);
                  if (val) values.push(val);
                }
              } else if (categoryField === 'r_relevancy') {
                // Extract Relevancy_1 through Relevancy_6
                for (let i = 1; i <= 6; i++) {
                  const val = extractNumericValue(insp[`Relevancy_${i}`]);
                  if (val) values.push(val);
                }
              } else if (categoryField === 'u_urgency') {
                // Extract U - Comp 1 through U - Comp 6
                for (let i = 1; i <= 6; i++) {
                  const val = insp[`U - Comp ${i}`];
                  if (val && val !== 'null') values.push(val);
                }
              } else if (isCI) {
                // Extract CI from top-level fields
                const ciValue = insp.CI_Final || insp.conditional_index;
                if (ciValue) values.push(ciValue);
              }
              
              // Count each value
              values.forEach(value => {
                if (value !== null) {
                  if (isCI) {
                    // Handle CI ranges
                    const ci = parseFloat(value);
                    if (!isNaN(ci)) {
                      if (ci >= 0 && ci < 20) counts['0-19'] = (counts['0-19'] || 0) + 1;
                      else if (ci >= 20 && ci < 40) counts['20-39'] = (counts['20-39'] || 0) + 1;
                      else if (ci >= 40 && ci < 60) counts['40-59'] = (counts['40-59'] || 0) + 1;
                      else if (ci >= 60 && ci < 80) counts['60-79'] = (counts['60-79'] || 0) + 1;
                      else if (ci >= 80 && ci <= 100) counts['80-100'] = (counts['80-100'] || 0) + 1;
                    }
                  } else {
                    counts[value] = (counts[value] || 0) + 1;
                  }
                }
              });
            });
            
            // Debug logging
            if (categoryField === 'd_degree' && assetType === 'Gantry') {
              console.log('[DERU Debug] Gantry Degree counts:', counts);
              console.log('[DERU Debug] Labels:', labels);
            }
            
            // Calculate total for percentage conversion
            const total = Object.values(counts).reduce((sum: number, val: any) => sum + (val || 0), 0);
            
            // Build row with ALL label keys initialized (critical for stacking)
            const row: any = { name: assetType };
            Object.keys(labels).forEach(key => {
              const count = counts[key] || 0;
              // Convert to percentage (0-100 scale), ensuring ALL keys exist
              row[labels[key]] = total > 0 ? Math.round((count / total) * 100) : 0;
            });
            
            return row;
          }).filter(item => {
            // Keep rows with at least one non-zero value (excluding 'name')
            return Object.keys(item).some(k => k !== 'name' && item[k] > 0);
          });
        };
        
        console.log('[DERU Debug] Processing categories...');
        
        // Wrap in try-catch to prevent silent failures
        try {
          const degreeData = processCategory('d_degree', {
            '0': 'None (Good)',
            '1': 'Not applicable',
            'U': 'Unable to inspect', 
            '2': 'Good defects',
            '3': 'Moderate defects',
            '4': 'Major defects'
          });
          
          // Debug: Validate 100% stacked chart structure
          if (degreeData.length > 0) {
            const firstItem = degreeData[0];
            const categoryKeys = Object.keys(firstItem).filter(k => k !== 'name');
            const total = categoryKeys.reduce((sum, k) => sum + (firstItem[k] || 0), 0);
            console.log('[DERU Debug] First degree item:', firstItem);
            console.log('[DERU Debug] Category keys:', categoryKeys);
            console.log('[DERU Debug] Row total:', total, '% (should be ~100%)');
          }
          
          const extentData = processCategory('e_extent', {
            '0': 'None',
            '1': '<10% affected',
            '2': '10-30% affected',
            '3': '30-60% affected',
            '4': 'Mostly affected (>60%)'
          });
          
          const relevancyData = processCategory('r_relevancy', {
            '0': 'None',
            '1': 'Cosmetic',
            '2': 'Local dysfunction',
            '3': 'Moderate dysfunction',
            '4': 'Major dysfunction'
          });
          
          const urgencyData = processCategory('u_urgency', {
            'X': 'Not applicable',
            '0': 'Monitor only',
            '1': 'Routine maintenance',
            '2': 'Repair within 10 years',
            '3': 'Repair within 10 years',
            '4': 'Immediate action'
          });
          
          const ciData = processCategory('ci_final', {
            '0-19': 'Critical (0-19)',
            '20-39': 'Poor (20-39)',
            '40-59': 'Fair (40-59)',
            '60-79': 'Good (60-79)',
            '80-100': 'Excellent (80-100)'
          }, true);
          
          const newDeruData = {
            degree: degreeData,
            extent: extentData,
            relevancy: relevancyData,
            urgency: urgencyData,
            ci: ciData
          };
          
          console.log('📊 [DERU] Setting DERU data:', newDeruData);
          console.log('📊 [DERU] Degree data length:', newDeruData.degree.length);
          console.log('📊 [DERU] Degree sample:', newDeruData.degree[0]);
          
          setDeruData(newDeruData);
          console.log('✅ [DERU] State updated successfully!');
        } catch (categoryError) {
          console.error('❌ [DERU] Error processing categories:', categoryError);
          // Set empty data so the chart at least initializes
          setDeruData({
            degree: [],
            extent: [],
            relevancy: [],
            urgency: [],
            ci: []
          });
        }
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error("Error fetching DERU analysis:", error);
    }
  };

  const fetchCriticalAlerts = async (signal?: AbortSignal) => {
    if (!accessToken) return;
    try {
      const response = await fetch(`${API_URL}/dashboard/critical-alerts`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal,
      });

      if (response.ok) {
        const data = await response.json();
        setCriticalAlerts(data.alerts || []);
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error("Error fetching critical alerts:", error);
      setCriticalAlerts([]);
    }
  };

  const fetchRecentActivity = async (signal?: AbortSignal) => {
    if (!accessToken) return;
    try {
      // Fetch recent inspections
      const inspectionsResponse = await fetch(`${API_URL}/inspections`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal,
      });

      // Fetch recent maintenance
      const maintenanceResponse = await fetch(`${API_URL}/maintenance`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal,
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
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error("Error fetching recent activity:", error);
    }
  };

  const fetchWorstAssets = async (signal?: AbortSignal) => {
    if (!accessToken) return;
    try {
      const response = await fetch(`${API_URL}/assets`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal,
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
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error("Error fetching worst assets:", error);
    }
  };

  const fetchOverdueInspections = async (signal?: AbortSignal) => {
    if (!accessToken) return;
    try {
      // Fetch all assets to see which ones have never been inspected
      const assetsResponse = await fetch(`${API_URL}/assets?pageSize=2000`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal,
      });

      if (assetsResponse.ok) {
        const assetsData = await assetsResponse.json();
        const assets = assetsData.assets || [];
        
        console.log(`[Overdue Inspections] Checking ${assets.length} assets for uninspected`);
        console.log(`[Overdue Inspections] Sample asset:`, assets[0]);
        
        // Count assets that have never been inspected (latest_ci is null/undefined)
        const uninspectedAssets = assets.filter((asset: any) => 
          asset.latest_ci === null || asset.latest_ci === undefined
        );

        console.log(`[Overdue Inspections] Found ${uninspectedAssets.length} uninspected assets`);
        console.log(`[Overdue Inspections] Uninspected sample:`, uninspectedAssets[0]);
        setOverdueInspections(uninspectedAssets.length);
      } else {
        console.error(`[Overdue Inspections] Failed to fetch assets: ${assetsResponse.status}`);
        setOverdueInspections(0);
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error("Error fetching overdue inspections:", error);
      setOverdueInspections(0);
    }
  };

  const fetchOverdueMaintenance = async (signal?: AbortSignal) => {
    if (!accessToken) return;
    try {
      const response = await fetch(`${API_URL}/maintenance`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal,
      });

      if (response.ok) {
        const data = await response.json();
        const maintenance = data.maintenance || [];
        
        console.log(`[Overdue Maintenance] Checking ${maintenance.length} maintenance records`);
        console.log(`[Overdue Maintenance] Sample record:`, maintenance[0]);
        
        const now = new Date();
        
        // Count maintenance items that are past their scheduled date and not completed
        const overdueItems = maintenance.filter((item: any) => {
          // Skip if status is Completed
          if (item.status === 'Completed' || item.status === 'completed') {
            return false;
          }
          
          // Check if it's past the scheduled date
          if (!item.scheduled_date) {
            return false; // No scheduled date means can't be overdue
          }
          
          const scheduledDate = new Date(item.scheduled_date);
          const isOverdue = scheduledDate < now;
          
          return isOverdue;
        });

        console.log(`[Overdue Maintenance] Found ${overdueItems.length} overdue maintenance items`);
        console.log(`[Overdue Maintenance] Sample overdue item:`, overdueItems[0]);
        setOverdueMaintenance(overdueItems.length);
      } else {
        console.error(`[Overdue Maintenance] Failed to fetch: ${response.status}`);
        setOverdueMaintenance(0);
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error("Error fetching overdue maintenance:", error);
      setOverdueMaintenance(0);
    }
  };

  const fetchDataQualityAlerts = async (signal?: AbortSignal) => {
    // Skip if no access token
    if (!accessToken) {
      console.log("Skipping data quality fetch - no access token");
      setDataQualityAlerts({ count: 0, details: {} });
      return;
    }

    try {
      // Use lightweight count query with head:true
      const response = await fetch(`${API_URL}/assets?pageSize=2000`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal,
      });

      if (response.ok) {
        const data = await response.json();
        const assets = data.assets || [];
        
        console.log(`[Data Quality] Checking ${assets.length} assets for quality issues`);
        
        // Count all critical missing data fields
        const missingGPS = assets.filter((asset: any) => 
          !asset.gps_lat || !asset.gps_lng
        ).length;

        const missingType = assets.filter((asset: any) => 
          !asset.asset_type_name
        ).length;

        const missingDepot = assets.filter((asset: any) => 
          !asset.depot_name
        ).length;

        const missingRegion = assets.filter((asset: any) => 
          !asset.region_name
        ).length;

        const missingRoadName = assets.filter((asset: any) => 
          !asset.road_name
        ).length;

        const missingOwner = assets.filter((asset: any) => 
          !asset.owner_name
        ).length;

        const missingResponsibleParty = assets.filter((asset: any) => 
          !asset.responsible_party_name
        ).length;
        
        const totalIssues = missingGPS + missingType + missingDepot + missingRegion + missingRoadName + missingOwner + missingResponsibleParty;

        console.log(`[Data Quality] Found ${totalIssues} issues (GPS: ${missingGPS}, Type: ${missingType}, Depot: ${missingDepot}, Region: ${missingRegion}, Road: ${missingRoadName}, Owner: ${missingOwner}, Responsible: ${missingResponsibleParty})`);

        setDataQualityAlerts({ 
          count: totalIssues,
          details: {
            missingGPS,
            missingType,
            missingDepot,
            missingRegion,
            missingRoadName,
            missingOwner,
            missingResponsibleParty
          }
        });
      } else {
        if (response.status === 401) {
          console.log("[Data Quality] Asset data requires authentication");
        } else {
          console.error(`[Data Quality] Failed to fetch assets: ${response.status}`);
        }
        setDataQualityAlerts({ count: 0, details: {} });
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') return;
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
    console.log('🔍 [Asset Type Chart] Raw assetTypeSummary:', assetTypeSummary);
    
    const raw = Array.isArray(assetTypeSummary)
      ? assetTypeSummary
      : (assetTypeSummary ? Object.values(assetTypeSummary) : []);

    console.log('🔍 [Asset Type Chart] Processed raw data:', raw);

    const normalized = raw.map((r: any) => ({
      name: toAssetTypeName(r),
      count: toNumber(r?.asset_count ?? r?.total_assets ?? r?.count ?? r?.value ?? 0),
    }));

    console.log('🔍 [Asset Type Chart] Normalized data:', normalized);

    // Sort biggest first
    const final = normalized
      .filter(x => x.count > 0) // Only show types with assets
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
      
    console.log('✅ [Asset Type Chart] Final chart data:', final);
    
    return final;
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

      {/* Dashboard Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="condition">Condition & DERU Analysis</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance & Costs</TabsTrigger>
          <TabsTrigger value="regional">Regional & Activity</TabsTrigger>
        </TabsList>

        {/* ========== TAB 1: OVERVIEW ========== */}
        <TabsContent value="overview" className="space-y-6 mt-6">
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
          onClick={() => navigate('/maintenance?status=in_progress,scheduled')}
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
          onClick={() => navigate('/assets?urgency=immediate')}
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
          onClick={() => navigate('/assets?ciRange=not-inspected')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue Inspections</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {stats?.uninspectedAssets || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {(stats?.uninspectedAssets || 0) > 0 ? (
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
          onClick={() => navigate('/assets?dataQuality=true')}
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
                  <AlertTriangle className="inline w-3 h-3 text-warning" /> Missing required data
                </>
              ) : (
                <>
                  <CheckCircle2 className="inline w-3 h-3 text-success" /> Data quality good
                </>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Total Maintenance Cost */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/maintenance')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Maintenance Cost</CardTitle>
            <Banknote className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#5DB32A]">
              R {maintenanceStats?.totalCost ? (maintenanceStats.totalCost / 1000).toFixed(1) + 'k' : '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {maintenanceStats?.totalCost > 0 ? (
                <>
                  <Banknote className="inline w-3 h-3 text-[#5DB32A]" /> All time expenditure
                </>
              ) : (
                <>
                  <Banknote className="inline w-3 h-3" /> No costs recorded
                </>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Overdue Maintenance */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            // Navigate to maintenance page with filter for overdue
            navigate('/maintenance?status=Overdue');
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue Maintenance</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {maintenanceStats?.overdue || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {(maintenanceStats?.overdue || 0) > 0 ? (
                <>
                  <AlertTriangle className="inline w-3 h-3 text-warning" /> Flagged over 30 days ago
                </>
              ) : (
                <>
                  <CheckCircle2 className="inline w-3 h-3 text-success" /> All on track
                </>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* DERU Inspection Analysis */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>DERU Inspection Analysis</CardTitle>
              <CardDescription>Worst values across all components using DERU methodology (Degree, Extent, Relevancy, Urgency)</CardDescription>
            </div>
            <Select value={selectedDERUCategory} onValueChange={(v: any) => setSelectedDERUCategory(v)}>
              <SelectTrigger className="w-[260px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="degree">D - Degree (Condition Severity)</SelectItem>
                <SelectItem value="extent">E - Extent (How Widespread)</SelectItem>
                <SelectItem value="relevancy">R - Relevancy (Functional Importance)</SelectItem>
                <SelectItem value="urgency">U - Urgency (How Soon to Attend)</SelectItem>
                <SelectItem value="ci">CI - Condition Index (Final)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-3">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]  min-w-0">
            {/* Bar Chart - Asset Type Breakdown */}
            <div className="w-full  min-w-0" style={{ minHeight: '300px' }}>
              <h4 className="text-sm font-semibold mb-3">Breakdown by Asset Type</h4>
              {hasDeruRows ? (



              
                <div className="w-full min-w-0" style={{ height: deruChartHeight }}>
                  <div
                    ref={deruBarRef}
                    style={{ width: "100%", height: deruChartHeight }}
                    className="min-w-0"
                  >
                    {Math.max(deruBarSize.width, 600) > 10 ? (
                      <BarChart
                        key={`deru-${selectedDERUCategory}-${Math.max(deruBarSize.width, 600)}x${deruChartHeight}`}
                        width={Math.max(deruBarSize.width, 600)}
                        height={deruChartHeight}
                        data={deruNormalizedData}
                        layout="vertical"
                        margin={{ top: 10, right: 20, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} />
                        <YAxis dataKey="name" type="category" width={120} />
                        <Tooltip formatter={(v: any) => `${v}%`} />

                        {selectedDERUCategory === "degree" && (
                          <>
                            <Bar dataKey="None (Good)" stackId="a" fill="#5DB32A" />
                            <Bar dataKey="Good defects" stackId="a" fill="#A8D96E" />
                            <Bar dataKey="Moderate defects" stackId="a" fill="#F8D227" />
                            <Bar dataKey="Major defects" stackId="a" fill="#d4183d" />
                            <Bar dataKey="Unable to inspect" stackId="a" fill="#9E9E9E" />
                            <Bar dataKey="Not applicable" stackId="a" fill="#455B5E" />
                          </>
                        )}

                        {selectedDERUCategory === "extent" && (
                          <>
                            <Bar dataKey="None" stackId="a" fill="#5DB32A" />
                            <Bar dataKey="<10% affected" stackId="a" fill="#A8D96E" />
                            <Bar dataKey="10-30% affected" stackId="a" fill="#F8D227" />
                            <Bar dataKey="30-60% affected" stackId="a" fill="#F57C00" />
                            <Bar dataKey="Mostly affected (>60% affected)" stackId="a" fill="#d4183d" />
                          </>
                        )}

                        {selectedDERUCategory === "relevancy" && (
                          <>
                            <Bar dataKey="None" stackId="a" fill="#5DB32A" />
                            <Bar dataKey="Cosmetic" stackId="a" fill="#A8D96E" />
                            <Bar dataKey="Local dysfunction" stackId="a" fill="#F8D227" />
                            <Bar dataKey="Moderate dysfunction" stackId="a" fill="#F57C00" />
                            <Bar dataKey="Major dysfunction" stackId="a" fill="#d4183d" />
                          </>
                        )}

                        {selectedDERUCategory === "urgency" && (
                          <>
                            <Bar dataKey="Monitor only" stackId="a" fill="#5DB32A" />
                            <Bar dataKey="Routine maintenance" stackId="a" fill="#A8D96E" />
                            <Bar dataKey="Repair within 10 years" stackId="a" fill="#F8D227" />
                            <Bar dataKey="Immediate action" stackId="a" fill="#d4183d" />
                            <Bar dataKey="Not applicable" stackId="a" fill="#455B5E" />
                          </>
                        )}

                        {selectedDERUCategory === "ci" && (
                          <>
                            <Bar dataKey="Excellent (80-100)" stackId="a" fill="#5DB32A" />
                            <Bar dataKey="Good (60-79)" stackId="a" fill="#A8D96E" />
                            <Bar dataKey="Fair (40-59)" stackId="a" fill="#F8D227" />
                            <Bar dataKey="Poor (20-39)" stackId="a" fill="#F57C00" />
                            <Bar dataKey="Critical (0-19)" stackId="a" fill="#d4183d" />
                          </>
                        )}
                      </BarChart>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Measuring chart…
                      </div>
                    )}
                  </div>
                </div>




              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <p>No {selectedDERUCategory} data available</p>
                </div>
              )}
            </div>

            {/* Pie Chart - Overall Distribution */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Overall Distribution (All Assets)</h4>
              {deruData[selectedDERUCategory] && deruData[selectedDERUCategory].length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={(() => {
                        // Aggregate all values across asset types
                        const aggregated: any = {};
                        deruData[selectedDERUCategory].forEach((item: any) => {
                          Object.keys(item).forEach(key => {
                            if (key !== 'name' && typeof item[key] === 'number') {
                              aggregated[key] = (aggregated[key] || 0) + item[key];
                            }
                          });
                        });
                        return Object.entries(aggregated).map(([name, value]) => ({ name, value }));
                      })()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={((entry: any) => {
                        const aggregated: any = {};
                        deruData[selectedDERUCategory].forEach((item: any) => {
                          Object.keys(item).forEach(key => {
                            if (key !== 'name' && typeof item[key] === 'number') {
                              aggregated[key] = (aggregated[key] || 0) + item[key];
                            }
                          });
                        });
                        const total = Object.values(aggregated).reduce((sum: any, val: any) => sum + val, 0) as number;
                        const pct = total > 0 ? ((entry.value / total) * 100) : 0;
                        
                        // Only show label if slice is large enough (>5%)
                        if (pct < 5) return null;
                        
                        const RADIAN = Math.PI / 180;
                        const radius = 70 + (110 - 70) / 2; // Middle of donut ring
                        const x = entry.cx + radius * Math.cos(-entry.midAngle * RADIAN);
                        const y = entry.cy + radius * Math.sin(-entry.midAngle * RADIAN);
                        
                        return (
                          <text 
                            x={x} 
                            y={y} 
                            fill="white" 
                            textAnchor="middle" 
                            dominantBaseline="middle"
                            className="text-xs font-semibold"
                            style={{ textShadow: '0 0 3px rgba(0,0,0,0.8)' }}
                          >
                            {pct.toFixed(1)}%
                          </text>
                        );
                      })}
                      innerRadius={70}
                      outerRadius={110}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.entries((() => {
                        const aggregated: any = {};
                        deruData[selectedDERUCategory].forEach((item: any) => {
                          Object.keys(item).forEach(key => {
                            if (key !== 'name' && typeof item[key] === 'number') {
                              aggregated[key] = (aggregated[key] || 0) + item[key];
                            }
                          });
                        });
                        return aggregated;
                      })()).map(([name], index) => {
                        // Unified color map
                        const colorMap: { [key: string]: string } = {
                          'None (Good)': '#5DB32A',
                          'Good defects': '#A8D96E',
                          'Moderate defects': '#F8D227',
                          'Major defects': '#d4183d',
                          'Unable to inspect': '#9E9E9E',
                          'Not applicable': '#455B5E',
                          'None': '#5DB32A',
                          '<10% affected': '#A8D96E',
                          '10-30% affected': '#F8D227',
                          '30-60% affected': '#F57C00',
                          'Mostly affected (>60%)': '#d4183d',
                          'Cosmetic': '#A8D96E',
                          'Local dysfunction': '#F8D227',
                          'Moderate dysfunction': '#F57C00',
                          'Major dysfunction': '#d4183d',
                          'Monitor only': '#5DB32A',
                          'Routine maintenance': '#A8D96E',
                          'Repair within 10 years': '#F8D227',
                          'Immediate action': '#d4183d',
                          'Excellent (80-100)': '#5DB32A',
                          'Good (60-79)': '#A8D96E',
                          'Fair (40-59)': '#F8D227',
                          'Poor (20-39)': '#F57C00',
                          'Critical (0-19)': '#d4183d',
                        };
                        return (
                          <Cell key={`cell-${index}`} fill={colorMap[name] || COLORS[index % COLORS.length]} />
                        );
                      })}
                    </Pie>
                    <Tooltip formatter={(value: any, name: any) => {
                      const aggregated: any = {};
                      deruData[selectedDERUCategory].forEach((item: any) => {
                        Object.keys(item).forEach(key => {
                          if (key !== 'name' && typeof item[key] === 'number') {
                            aggregated[key] = (aggregated[key] || 0) + item[key];
                          }
                        });
                      });
                      const total = Object.values(aggregated).reduce((sum: any, val: any) => sum + val, 0) as number;
                      const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                      return [`${pct}% (${value} components)`, name];
                    }} />
                    {(() => {
                      const result = (() => {
                        // Calculate weighted average rating
                        const aggregated: any = {};
                        deruData[selectedDERUCategory].forEach((item: any) => {
                          Object.keys(item).forEach(key => {
                            if (key !== 'name' && typeof item[key] === 'number') {
                              aggregated[key] = (aggregated[key] || 0) + item[key];
                            }
                          });
                        });
                        
                        // Score maps (lower = better)
                        const scoreMap: { [key: string]: { [key: string]: number } } = {
                          degree: {
                            'None (Good)': 1,
                            'Good defects': 2,
                            'Moderate defects': 3,
                            'Major defects': 4
                          },
                          extent: {
                            'None': 1,
                            '<10% affected': 2,
                            '10-30% affected': 3,
                            '30-60% affected': 4,
                            'Mostly affected (>60%)': 5
                          },
                          relevancy: {
                            'None': 1,
                            'Cosmetic': 2,
                            'Local dysfunction': 3,
                            'Moderate dysfunction': 4,
                            'Major dysfunction': 5
                          },
                          urgency: {
                            'Monitor only': 1,
                            'Routine maintenance': 2,
                            'Repair within 10 years': 3,
                            'Immediate action': 4
                          },
                          ci: {
                            'Excellent (80-100)': 1,
                            'Good (60-79)': 2,
                            'Fair (40-59)': 3,
                            'Poor (20-39)': 4,
                            'Critical (0-19)': 5
                          }
                        };
                        
                        const scores = scoreMap[selectedDERUCategory] || {};
                        let weightedSum = 0;
                        let totalWeight = 0;
                        
                        Object.entries(aggregated).forEach(([label, value]) => {
                          if (scores[label] !== undefined) {
                            weightedSum += scores[label] * (value as number);
                            totalWeight += value as number;
                          }
                        });
                        
                        const avgNum = totalWeight > 0 ? (weightedSum / totalWeight) : 0;
                        const avg = avgNum > 0 ? avgNum.toFixed(2) : 'N/A';
                        
                        // Determine status label and color based on average
                        let statusLabel = '';
                        let statusColor = '#010D13';
                        
                        if (selectedDERUCategory === 'degree') {
                          if (avgNum <= 1.0) { statusLabel = 'Good overall'; statusColor = '#5DB32A'; }
                          else if (avgNum <= 2.0) { statusLabel = 'Minor defects'; statusColor = '#A8D96E'; }
                          else if (avgNum <= 2.9) { statusLabel = 'Moderate defects'; statusColor = '#F8D227'; }
                          else { statusLabel = 'Major defects'; statusColor = '#d4183d'; }
                        } else if (selectedDERUCategory === 'extent') {
                          if (avgNum <= 1.5) { statusLabel = 'Isolated issues'; statusColor = '#5DB32A'; }
                          else if (avgNum <= 2.5) { statusLabel = 'Localized issues'; statusColor = '#A8D96E'; }
                          else if (avgNum <= 3.5) { statusLabel = 'Widespread issues'; statusColor = '#F8D227'; }
                          else { statusLabel = 'Systemic failure'; statusColor = '#d4183d'; }
                        } else if (selectedDERUCategory === 'relevancy') {
                          if (avgNum <= 1.5) { statusLabel = 'Cosmetic'; statusColor = '#5DB32A'; }
                          else if (avgNum <= 2.5) { statusLabel = 'Local dysfunctional'; statusColor = '#A8D96E'; }
                          else if (avgNum <= 3.5) { statusLabel = 'Moderate dysfunctional'; statusColor = '#F8D227'; }
                          else { statusLabel = 'Major dysfunctional'; statusColor = '#d4183d'; }
                        } else if (selectedDERUCategory === 'urgency') {
                          if (avgNum <= 1.5) { statusLabel = 'Monitor only'; statusColor = '#5DB32A'; }
                          else if (avgNum <= 2.5) { statusLabel = 'Routine maintenance'; statusColor = '#A8D96E'; }
                          else if (avgNum <= 3.5) { statusLabel = 'Repair within 10 years'; statusColor = '#F8D227'; }
                          else { statusLabel = 'Immediate action'; statusColor = '#d4183d'; }
                        } else if (selectedDERUCategory === 'ci') {
                          // For CI, calculate actual CI value from bands
                          const ciValue = totalWeight > 0 ? (() => {
                            let ciSum = 0;
                            let ciCount = 0;
                            Object.entries(aggregated).forEach(([label, value]) => {
                              if (label === 'Excellent (80-100)') { ciSum += 90 * (value as number); ciCount += value as number; }
                              else if (label === 'Good (60-79)') { ciSum += 69.5 * (value as number); ciCount += value as number; }
                              else if (label === 'Fair (40-59)') { ciSum += 49.5 * (value as number); ciCount += value as number; }
                              else if (label === 'Poor (20-39)') { ciSum += 29.5 * (value as number); ciCount += value as number; }
                              else if (label === 'Critical (0-19)') { ciSum += 9.5 * (value as number); ciCount += value as number; }
                            });
                            return ciCount > 0 ? (ciSum / ciCount).toFixed(1) : 'N/A';
                          })() : 'N/A';
                          
                          // Determine CI status color
                          const ciNum = parseFloat(ciValue);
                          if (ciNum >= 80) statusColor = '#5DB32A';
                          else if (ciNum >= 60) statusColor = '#A8D96E';
                          else if (ciNum >= 40) statusColor = '#F8D227';
                          else if (ciNum >= 20) statusColor = '#F57C00';
                          else statusColor = '#d4183d';
                          
                          return { text: `Avg CI: ${ciValue}`, color: statusColor };
                        }
                        
                        // For D/E/R/U: show only status label, no numeric value
                        return { text: statusLabel, color: statusColor };
                      })();
                      
                      // Render text with color (wrapping for long text)
                      const text = result.text;
                      const words = text.split(' ');
                      const lines: string[] = [];
                      let currentLine = '';
                      
                      // Wrap text: new line if current line exceeds 11 chars or word is >8 chars
                      words.forEach((word, idx) => {
                        if (word.length > 8 && currentLine.length > 0) {
                          // Long word starts on new line
                          lines.push(currentLine.trim());
                          currentLine = word;
                        } else if ((currentLine + ' ' + word).length > 11 && currentLine.length > 0) {
                          // Line too long, wrap
                          lines.push(currentLine.trim());
                          currentLine = word;
                        } else {
                          // Add word to current line
                          currentLine += (currentLine.length > 0 ? ' ' : '') + word;
                        }
                        
                        // Last word
                        if (idx === words.length - 1 && currentLine.length > 0) {
                          lines.push(currentLine.trim());
                        }
                      });
                      
                      const lineHeight = 16;
                      const startY = 50 - ((lines.length - 1) * lineHeight / 2);
                      
                      return (
                        <>
                          {lines.map((line, idx) => (
                            <text 
                              key={idx}
                              x="50%" 
                              y={`${startY + (idx * lineHeight)}%`} 
                              textAnchor="middle" 
                              dominantBaseline="middle" 
                              className="text-sm font-bold" 
                              fill={result.color}
                            >
                              {line}
                            </text>
                          ))}
                        </>
                      );
                    })()}
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <p>No {selectedDERUCategory} data available</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Shared Legend */}
          {deruData[selectedDERUCategory] && deruData[selectedDERUCategory].length > 0 && (
            <div className="flex flex-wrap gap-4 justify-center mt-4 pt-3 border-t">
              {(() => {
                const legendItems: { [key: string]: Array<{ label: string; color: string }> } = {
                  degree: [
                    { label: 'None (Good)', color: '#5DB32A' },
                    { label: 'Good defects', color: '#A8D96E' },
                    { label: 'Moderate defects', color: '#F8D227' },
                    { label: 'Major defects', color: '#d4183d' },
                    { label: 'Unable to inspect', color: '#9E9E9E' },
                    { label: 'Not applicable', color: '#455B5E' }
                  ],
                  extent: [
                    { label: 'None', color: '#5DB32A' },
                    { label: '<10% affected', color: '#A8D96E' },
                    { label: '10-30% affected', color: '#F8D227' },
                    { label: '30-60% affected', color: '#F57C00' },
                    { label: 'Mostly affected (>60%)', color: '#d4183d' }
                  ],
                  relevancy: [
                    { label: 'None', color: '#5DB32A' },
                    { label: 'Cosmetic', color: '#A8D96E' },
                    { label: 'Local dysfunction', color: '#F8D227' },
                    { label: 'Moderate dysfunction', color: '#F57C00' },
                    { label: 'Major dysfunction', color: '#d4183d' }
                  ],
                  urgency: [
                    { label: 'Monitor only', color: '#5DB32A' },
                    { label: 'Routine maintenance', color: '#A8D96E' },
                    { label: 'Repair within 10 years', color: '#F8D227' },
                    { label: 'Immediate action', color: '#d4183d' },
                    { label: 'Not applicable', color: '#455B5E' }
                  ],
                  ci: [
                    { label: 'Excellent (80-100)', color: '#5DB32A' },
                    { label: 'Good (60-79)', color: '#A8D96E' },
                    { label: 'Fair (40-59)', color: '#F8D227' },
                    { label: 'Poor (20-39)', color: '#F57C00' },
                    { label: 'Critical (0-19)', color: '#d4183d' }
                  ]
                };
                
                return legendItems[selectedDERUCategory]?.map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                ));
              })()}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        {/* ========== TAB 2: CONDITION & DERU ANALYSIS ========== */}
        <TabsContent value="condition" className="space-y-6 mt-6">
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
                  <YAxis dataKey="name" type="category" width={150} />
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

      {/* Top 10 Worst Assets by CI */}
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
        </TabsContent>

        {/* ========== TAB 3: MAINTENANCE & COSTS ========== */}
        <TabsContent value="maintenance" className="space-y-6 mt-6">
      {/* Highest Cost Assets */}
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
      </div>
        </TabsContent>

        {/* ========== TAB 4: REGIONAL & ACTIVITY ========== */}
        <TabsContent value="regional" className="space-y-6 mt-6">
      {/* Regional & Asset Type Distribution */}
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
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" />
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

        </TabsContent>
      </Tabs>
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