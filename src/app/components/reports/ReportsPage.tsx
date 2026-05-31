import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../App";
import { useTenant } from "../../contexts/TenantContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import {
  Download,
  FileText,
  BarChart3,
  TrendingUp,
  Loader2,
  PieChartIcon,
  Filter,
  Search,
  LineChart as LineChartIcon,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { downloadReport } from "../../utils/reportGenerators";
import { generatePhotoPDFReport, generatePhotoExcelReport } from "../../utils/reportGenerators";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import {
  getCIDisplay,
  getUrgencyDisplay,
  resolveCIHealth,
  resolveCISafety,
} from "../../utils/assetDisplay";


export default function ReportsPage() {
  const { accessToken } = useContext(AuthContext);
  const { settings: tenant } = useTenant();

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [customReportType, setCustomReportType] = useState("assets");
  const [customAssetType, setCustomAssetType] = useState("all");
  const [customRegion, setCustomRegion] = useState("all");

  // Global report filters (applies mainly to asset/photo reports)
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAssetType, setFilterAssetType] = useState("all");
  const [filterRegion, setFilterRegion] = useState("all");
  const [filterWard, setFilterWard] = useState("all");
  const [filterDepot, setFilterDepot] = useState("all");
  const [filterOwner, setFilterOwner] = useState("all");
  const [filterRoadName, setFilterRoadName] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCondition, setFilterCondition] = useState("all");
  const [filterUrgency, setFilterUrgency] = useState("all");

  // Unique filter values
  const [uniqueAssetTypes, setUniqueAssetTypes] = useState<string[]>([]);
  const [uniqueRegions, setUniqueRegions] = useState<string[]>([]);
  const [uniqueWards, setUniqueWards] = useState<string[]>([]);
  const [uniqueDepots, setUniqueDepots] = useState<string[]>([]);
  const [uniqueOwners, setUniqueOwners] = useState<string[]>([]);
  const [uniqueRoadNames, setUniqueRoadNames] = useState<string[]>([]);

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  const getStoredAccessToken = () => {
    try {
      const exactKey = `sb-${projectId}-auth-token`;

      const raw =
        window.localStorage.getItem(exactKey) ||
        Object.keys(window.localStorage)
          .filter((key) => key.includes(projectId) && key.includes("auth-token"))
          .map((key) => window.localStorage.getItem(key))
          .find(Boolean);

      if (!raw) return null;

      const parsed = JSON.parse(raw);

      return (
        parsed?.access_token ||
        parsed?.currentSession?.access_token ||
        parsed?.session?.access_token ||
        parsed?.user?.access_token ||
        null
      );
    } catch (error) {
      console.error("[ReportsPage] Failed to read stored access token:", error);
      return null;
    }
  };

  const getAuthHeaders = () => {
    const token = accessToken || getStoredAccessToken();

    if (!token) {
      console.warn("[ReportsPage] No user access token found. Report export may fail.");
    }

    return {
      Authorization: `Bearer ${token || publicAnonKey}`,
      "Content-Type": "application/json",
    };
  };

  const photoReportTypes = [
    "Inventory with Images",
    "Inspection Photos Summary",
    "Asset Condition Photos",
    "Photo Gallery Report",
  ];

  // -----------------------------
  // Safe helpers
  // -----------------------------
  const getAssetCI = (asset: any) =>
    asset?.latest_ci ?? asset?.condition_index ?? asset?.ci_final ?? "-";

  const getAssetUrgency = (asset: any) =>
    asset?.latest_urgency ?? asset?.urgency ?? "-";

  const getInspectionCI = (insp: any) =>
    insp?.calculation_metadata?.ci_final ??
    insp?.ci_final ??
    insp?.conditional_index ??
    "-";

  const getInspectionUrgency = (insp: any) =>
    insp?.calculation_metadata?.worst_urgency ??
    insp?.calculated_urgency ??
    insp?.urgency ??
    "-";
  const firstDefined = (...values: any[]) => {
    for (const value of values) {
      if (
        value !== undefined &&
        value !== null &&
        value !== "" &&
        value !== "-" &&
        value !== "Invalid Date"
      ) {
        return value;
      }
    }
    return "-";
  };

  const asDash = (value: any) =>
    value === undefined || value === null || value === "" || value === "Invalid Date" ? "-" : value;

  const normaliseFieldName = (value: string) =>
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const getFromObjectByAlias = (source: any, aliases: string[]) => {
    if (!source || typeof source !== "object") return undefined;

    for (const alias of aliases) {
      const value = source[alias];
      if (value !== undefined && value !== null && value !== "" && value !== "-") {
        return value;
      }
    }

    const normalisedAliases = aliases.map(normaliseFieldName);

    for (const key of Object.keys(source)) {
      if (normalisedAliases.includes(normaliseFieldName(key))) {
        const value = source[key];
        if (value !== undefined && value !== null && value !== "" && value !== "-") {
          return value;
        }
      }
    }

    return undefined;
  };

  const getAssetValue = (asset: any, aliases: string[]) => {
    const possibleSources = [
      asset,
      asset?.properties,
      asset?.attributes,
      asset?.metadata,
      asset?.raw,
      asset?.raw_data,
      asset?.register_data,
      asset?.asset_data,
      asset?.custom_fields,
      asset?.additional_fields,
      asset?.extra_fields,
      asset?.import_data,
    ];

    for (const source of possibleSources) {
      const value = getFromObjectByAlias(source, aliases);
      if (value !== undefined && value !== null && value !== "" && value !== "-") {
        return value;
      }
    }

    return undefined;
  };

  const getInspectionValue = (inspection: any, aliases: string[]) => {
    const possibleSources = [
      inspection,
      inspection?.calculation_metadata,
      inspection?.metadata,
      inspection?.inspection_data,
      inspection?.raw_data,
      inspection?.properties,
      inspection?.attributes,
    ];

    for (const source of possibleSources) {
      const value = getFromObjectByAlias(source, aliases);
      if (value !== undefined && value !== null && value !== "" && value !== "-") {
        return value;
      }
    }

    return undefined;
  };

  const buildLatestInspectionByAssetId = (inspections: any[]) => {
    const map = new Map<string, any>();

    [...inspections]
      .sort((a: any, b: any) => {
        const dateA = new Date(a.inspection_date || a.created_at || 0).getTime();
        const dateB = new Date(b.inspection_date || b.created_at || 0).getTime();
        return dateB - dateA;
      })
      .forEach((inspection: any) => {
        if (inspection.asset_id && !map.has(inspection.asset_id)) {
          map.set(inspection.asset_id, inspection);
        }
      });

    return map;
  };

  const makeAssetInspectionDisplaySource = (asset: any, latestInspection: any) => ({
    ...asset,
    latest_inspection: latestInspection || asset.latest_inspection || null,
    inspection: latestInspection || asset.inspection || null,
  });

  const buildAssetRegisterRows = (assets: any[], inspections: any[]) => {
    const latestInspectionByAssetId = buildLatestInspectionByAssetId(inspections);

    return assets.map((asset: any) => {
      const latestInspection = latestInspectionByAssetId.get(asset.asset_id) || asset.latest_inspection || null;
      const source = makeAssetInspectionDisplaySource(asset, latestInspection);

      const ciDisplay = getCIDisplay(source);
      const urgencyDisplay = getUrgencyDisplay(source);

      const metadata = latestInspection?.calculation_metadata || asset.calculation_metadata || {};

      const ciHealth = resolveCIHealth(source);
      const ciSafety = resolveCISafety(source);

      const routeRoad = firstDefined(
        getAssetValue(asset, ["LOCATION/ROAD NAME", "LOCATION ROAD NAME", "ROUTE/ROAD", "ROUTE ROAD"]),
        asset.location_road_name,
        asset.location,
        asset.road_name,
        asset.road_number || asset.road_name
          ? `${asset.road_number || ""} ${asset.road_name || ""}`.trim()
          : "-"
      );

      const startLatitude = firstDefined(
        getAssetValue(asset, ["START LATITUDE", "START_LATITUDE", "START LAT", "LATITUDE", "GPS_LAT"]),
        asset.start_latitude,
        asset.start_lat,
        asset.gps_lat,
        asset.latitude
      );

      const startLongitude = firstDefined(
        getAssetValue(asset, ["START LONGITUDE", "START_LONGITUDE", "START LNG", "START LON", "LONGITUDE", "GPS_LNG"]),
        asset.start_longitude,
        asset.start_lng,
        asset.start_lon,
        asset.gps_lng,
        asset.longitude
      );

      const endLatitude = firstDefined(
        getAssetValue(asset, ["END LATITUDE", "END_LATITUDE", "END LAT", "FINISH LATITUDE", "FINISH LAT"]),
        asset.end_latitude,
        asset.end_lat,
        asset.finish_latitude,
        asset.finish_lat
      );

      const endLongitude = firstDefined(
        getAssetValue(asset, ["END LONGITUDE", "END_LONGITUDE", "END LNG", "END LON", "FINISH LONGITUDE", "FINISH LNG"]),
        asset.end_longitude,
        asset.end_lng,
        asset.end_lon,
        asset.finish_longitude,
        asset.finish_lng
      );

      const geometryStatus =
        startLatitude !== "-" &&
        startLongitude !== "-" &&
        endLatitude !== "-" &&
        endLongitude !== "-"
          ? "LineString-ready"
          : startLatitude !== "-" && startLongitude !== "-"
          ? "Point-only"
          : "Missing geometry";

      return {
        unique_id: firstDefined(asset.unique_id, asset.uniqueId, asset.asset_unique_id, asset.asset_id),
        asset_ref: firstDefined(asset.asset_ref, asset.reference_number, asset.referenceNumber),
        asset_type_name: firstDefined(asset.asset_type_name, asset.type, asset.asset_type),

        description: firstDefined(
          asset.description,
          asset.asset_description,
          asset.name,
          asset.name_code
        ),

        location_road_name: routeRoad,
        region: firstDefined(asset.region, asset.region_name),
        ward: firstDefined(getAssetValue(asset, ["WARD/S", "WARDS", "WARD", "WARD NO", "WARD_NO"]), asset.ward, asset.wards, asset.ward_no),
        depot: firstDefined(getAssetValue(asset, ["DEPOT", "DEPOT NAME", "DEPOT_NAME"]), asset.depot, asset.depot_name),
        owner: firstDefined(getAssetValue(asset, ["OWNER", "OWNED BY", "OWNED_BY", "OWNER NAME"]), asset.owner, asset.owner_name, asset.owned_by),
        status: firstDefined(getAssetValue(asset, ["STATUS", "ASSET STATUS"]), asset.status, asset.status_name),

        start_km: firstDefined(asset.start_km, asset.start_chainage, asset.km_start, asset.km_marker, asset.chainage_km),
        end_km: firstDefined(getAssetValue(asset, ["END KM", "END_KM", "END CHAINAGE", "CHAINAGE END"]), asset.end_km, asset.end_chainage, asset.km_end, asset.chainage_end),

        start_latitude: startLatitude,
        start_longitude: startLongitude,
        end_latitude: endLatitude,
        end_longitude: endLongitude,

        name_code: firstDefined(asset.name_code, asset.name, asset.code, asset.sign_code, asset.asset_ref),
        mounting_type: firstDefined(getAssetValue(asset, ["MOUNTNG TYPE", "MOUNTING TYPE", "MOUNT TYPE", "MOUNT_TYPE"]), asset.mounting_type, asset.mountng_type, asset.mount_type),
        posts_supports: firstDefined(getAssetValue(asset, ["# POSTS/SUPPORTS", "# POSTS / SUPPORTS", "POSTS/SUPPORTS", "NUMBER OF POSTS", "NUM POSTS", "SUPPORTS"]), asset.posts_supports, asset.number_of_posts, asset.num_posts, asset.supports),
        beams: firstDefined(getAssetValue(asset, ["# BEAMS", "BEAMS", "NUMBER OF BEAMS", "NUM BEAMS"]), asset.beams, asset.number_of_beams, asset.num_beams),
        width_m: firstDefined(getAssetValue(asset, ["WIDTH (m)", "WIDTH M", "WIDTH"]), asset.width_m, asset.width),
        length_m: firstDefined(getAssetValue(asset, ["LENGTH (m)", "LENGTH M", "LENGTH"]), asset.length_m, asset.length),
        height_m: firstDefined(getAssetValue(asset, ["HEIGHT (m)", "HEIGHT M", "HEIGHT"]), asset.height_m, asset.height),
        orientation_position: firstDefined(getAssetValue(asset, ["ORIENTATION/POSITION", "ORIENTATION / POSITION", "ORIENTATION", "POSITION", "SIDE OF ROAD"]), asset.orientation_position, asset.orientation, asset.position, asset.side_of_road),
        
        date_of_purchase: firstDefined(asset.date_of_purchase, asset.purchase_date, asset.install_date),
        purchase_cost: firstDefined(asset.purchase_cost, asset.installation_cost),
        last_revaluation: firstDefined(asset.last_revaluation, asset.last_valuation_date),
        residual_value: firstDefined(asset.residual_value),
        useful_life: firstDefined(getAssetValue(asset, ["USEFUL LIFE", "USEFUL_LIFE", "USEFUL LIFE YEARS", "EXPECTED LIFE"]), asset.useful_life, asset.useful_life_years, asset.expected_life_years),
        depreciation_rate: firstDefined(getAssetValue(asset, ["DEPRECIATION RATE", "DEPRICIATION RATE", "DEPRECIATION_RATE"]), asset.depreciation_rate),
        accumulated_depreciation: firstDefined(asset.accumulated_depreciation, asset.accum_depreciation),

        asset_condition: ciDisplay.label,
        deru_degree: firstDefined(
          getAssetValue(asset, ["DERU_DEGREE", "DERU DEGREE"]),
          getInspectionValue(latestInspection, ["OVERALL DEGREE", "OVERALL_DEGREE", "DERU_DEGREE", "DEGREE"]),
          metadata.overall_degree,
          latestInspection?.overall_degree,
          latestInspection?.deru_degree,
          asset.deru_degree
        ),
        deru_extent: firstDefined(
          getAssetValue(asset, ["DERU_EXTENT", "DERU EXTENT"]),
          getInspectionValue(latestInspection, ["OVERALL EXTENT", "OVERALL_EXTENT", "DERU_EXTENT", "EXTENT"]),
          metadata.overall_extent,
          latestInspection?.overall_extent,
          latestInspection?.deru_extent,
          asset.deru_extent
        ),
        deru_relevance: firstDefined(
          getAssetValue(asset, ["DERU_RELEVANCE", "DERU RELEVANCE", "DERU_RELEVANCY", "DERU RELEVANCY"]),
          getInspectionValue(latestInspection, ["OVERALL RELEVANCY", "OVERALL_RELEVANCY", "OVERALL RELEVANCE", "DERU_RELEVANCE", "RELEVANCY"]),
          metadata.overall_relevancy,
          metadata.overall_relevance,
          latestInspection?.overall_relevancy,
          latestInspection?.deru_relevance,
          asset.deru_relevance
        ),
        deru_urgency: urgencyDisplay.label,

        ci_health: ciHealth ?? firstDefined(asset.ci_health, asset.latest_ci_health),
        ci_safety: ciSafety ?? firstDefined(asset.ci_safety, asset.latest_ci_safety),
        ci: ciDisplay.label,

        last_inspection_date: firstDefined(
          latestInspection?.inspection_date,
          latestInspection?.created_at,
          asset.last_inspection_date
        ),
        inspector: firstDefined(
          latestInspection?.inspector_name,
          latestInspection?.inspector,
          asset.inspector_name
        ),
        finding_summary: firstDefined(
          latestInspection?.general_comments,
          latestInspection?.overall_comments,
          latestInspection?.notes,
          asset.finding_summary,
          asset.notes
        ),

        image: firstDefined(
          getAssetValue(asset, ["IMAGE", "PHOTO", "PHOTO_1", "PHOTO 1", "IMAGE URL", "PHOTO URL"]),
          asset.image,
          asset.image_url,
          asset.photo_url,
          asset.main_photo_url,
          latestInspection?.photo_url,
          latestInspection?.image_url,
          latestInspection?.photo_1
        ),

        geometry_status: geometryStatus,
      };
    });
  };
    
  const parseNumericCI = (value: any) => {
    if (value === null || value === undefined || value === "-" || value === "") return NaN;
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? NaN : parsed;
  };

  const getTenantBranding = () => ({
    organizationName: tenant.organization_name || tenant.organizationName,
    logoUrl: tenant.logo_url || tenant.logoUrl,
    primaryColor: tenant.primary_color || tenant.primaryColor || "#010D13",
    regionName: tenant.region_name || tenant.regionName,
    currency: "ZAR",
    tagline: tenant.tagline,
    address: tenant.address,
    phone: tenant.phone,
    email: tenant.email,
    website: tenant.website,
  });

  const fetchAllAssets = async () => {
    const pageSize = 5000;
    let page = 1;
    let totalPages = 1;
    let allAssets: any[] = [];

    do {
      const res = await fetch(`${API_URL}/assets?page=${page}&pageSize=${pageSize}`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(`Failed to fetch assets page ${page}: ${res.status} ${errorText}`);
      }

      const json = await res.json();
      allAssets = allAssets.concat(json.assets || []);
      totalPages = json.totalPages || 1;
      page += 1;
    } while (page <= totalPages);

    return allAssets;
  };

  const fetchAllAssetRegisterReportAssets = async () => {
    const pageSize = 5000;
    let page = 1;
    let totalPages = 1;
    let allAssets: any[] = [];

    do {
      const res = await fetch(`${API_URL}/reports/asset-register?page=${page}&pageSize=${pageSize}`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(
          `Failed to fetch asset register report page ${page}: ${res.status} ${errorText}`
        );
      }

      const json = await res.json();

      console.log("[ReportsPage] Asset register report source:", json.source);
      console.log("[ReportsPage] Asset register report rows received:", json.assets?.length || 0);

      allAssets = allAssets.concat(json.assets || []);
      totalPages = json.totalPages || 1;
      page += 1;
    } while (page <= totalPages);

    return allAssets;
  };

  const fetchAllInspections = async () => {
    const pageSize = 5000;
    let page = 1;
    let totalPages = 1;
    let allInspections: any[] = [];

    do {
      const res = await fetch(`${API_URL}/inspections?page=${page}&pageSize=${pageSize}`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(`Failed to fetch inspections page ${page}: ${res.status} ${errorText}`);
      }

      const json = await res.json();
      allInspections = allInspections.concat(json.inspections || []);
      totalPages = json.totalPages || 1;
      page += 1;
    } while (page <= totalPages);

    return allInspections;
  };

  // TAMS360 Brand Colors
  const COLORS = {
    primary: "#010D13",
    skyBlue: "#39AEDF",
    green: "#5DB32A",
    yellow: "#F8D227",
    grey: "#455B5E",
  };

  const CHART_COLORS = [COLORS.skyBlue, COLORS.green, COLORS.yellow, COLORS.grey, COLORS.primary];

  useEffect(() => {
    const token = accessToken || getStoredAccessToken();

    if (!token) {
      console.warn("[ReportsPage] Waiting for authenticated session before loading report data.");
      setLoading(false);
      return;
    }

    fetchReportSummary();
    fetchAnalyticsData();
    fetchUniqueFilterValues();
  }, [accessToken]);

  const fetchUniqueFilterValues = async () => {
    try {
      const assets = await fetchAllAssets();

      const types = [...new Set(assets.map((a: any) => a.asset_type_name).filter(Boolean))].sort();
      const regions = [...new Set(assets.map((a: any) => a.region).filter(Boolean))].sort();
      const wards = [...new Set(assets.map((a: any) => a.ward).filter(Boolean))].sort();
      const depots = [...new Set(assets.map((a: any) => a.depot).filter(Boolean))].sort();
      const owners = [...new Set(assets.map((a: any) => a.owner).filter(Boolean))].sort();
      const roads = [...new Set(assets.map((a: any) => a.road_name).filter(Boolean))].sort();

      setUniqueAssetTypes(types as string[]);
      setUniqueRegions(regions as string[]);
      setUniqueWards(wards as string[]);
      setUniqueDepots(depots as string[]);
      setUniqueOwners(owners as string[]);
      setUniqueRoadNames(roads as string[]);
    } catch (error) {
      console.error("Error fetching unique filter values:", error);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      const [assets, inspections, maintenanceRes] = await Promise.all([
        fetchAllAssets(),
        fetchAllInspections(),
        fetch(`${API_URL}/maintenance`, {
          headers: getAuthHeaders(),
        }),
      ]);

      const maintenanceData = maintenanceRes.ok ? await maintenanceRes.json() : { records: [] };
      const maintenance = maintenanceData.records || [];

      // Asset Type Distribution
      const assetTypeCounts: Record<string, number> = {};
      assets.forEach((asset: any) => {
        const type = asset.asset_type_name || "Unknown";
        assetTypeCounts[type] = (assetTypeCounts[type] || 0) + 1;
      });
      const assetTypeData = Object.entries(assetTypeCounts).map(([name, value]) => ({ name, value }));

      // CI Distribution
      const ciRanges = {
        "Excellent (80-100)": 0,
        "Good (60-79)": 0,
        "Fair (40-59)": 0,
        "Poor (20-39)": 0,
        "Critical (0-19)": 0,
      };

      inspections.forEach((insp: any) => {
        const ci = parseNumericCI(getInspectionCI(insp));
        if (Number.isNaN(ci)) return;

        if (ci >= 80) ciRanges["Excellent (80-100)"]++;
        else if (ci >= 60) ciRanges["Good (60-79)"]++;
        else if (ci >= 40) ciRanges["Fair (40-59)"]++;
        else if (ci >= 20) ciRanges["Poor (20-39)"]++;
        else if (ci >= 0) ciRanges["Critical (0-19)"]++;
      });

      const ciDistributionData = Object.entries(ciRanges).map(([name, value]) => ({ name, value }));

      // Maintenance Status Distribution
      const statusCounts: Record<string, number> = {};
      maintenance.forEach((maint: any) => {
        const status = maint.status || "Unknown";
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      const maintenanceStatusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

      // Monthly Inspections Trend
      const monthlyInspections: Record<string, number> = {};
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      inspections.forEach((insp: any) => {
        if (!insp.inspection_date) return;
        const date = new Date(insp.inspection_date);
        if (date >= sixMonthsAgo) {
          const monthKey = date.toLocaleDateString("en-ZA", { year: "numeric", month: "short" });
          monthlyInspections[monthKey] = (monthlyInspections[monthKey] || 0) + 1;
        }
      });

      const monthlyInspectionsData = Object.entries(monthlyInspections).map(([month, count]) => ({
        month,
        count,
      }));

      // Maintenance Cost Trends
      const monthlyCosts: Record<string, number> = {};
      maintenance.forEach((maint: any) => {
        const dateToUse = maint.completed_date || maint.scheduled_date;
        if (!dateToUse) return;

        const date = new Date(dateToUse);
        if (date >= sixMonthsAgo) {
          const monthKey = date.toLocaleDateString("en-ZA", { year: "numeric", month: "short" });
          const cost = parseFloat(maint.actual_cost || maint.estimated_cost || 0);
          monthlyCosts[monthKey] = (monthlyCosts[monthKey] || 0) + cost;
        }
      });

      const monthlyCostsData = Object.entries(monthlyCosts).map(([month, cost]) => ({
        month,
        cost: Math.round(cost),
      }));

      setAnalyticsData({
        assetTypeData,
        ciDistributionData,
        maintenanceStatusData,
        monthlyInspectionsData,
        monthlyCostsData,
      });
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    }
  };

  const fetchReportSummary = async () => {
    try {
      setLoading(true);

      const [assetsRes, inspectionsRes, maintenanceRes] = await Promise.all([
        fetch(`${API_URL}/assets/count`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/inspections/count`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/maintenance/count`, { headers: getAuthHeaders() }),
      ]);

      const assetsCount = assetsRes.ok ? (await assetsRes.json()).count : 0;
      const inspectionsCount = inspectionsRes.ok ? (await inspectionsRes.json()).count : 0;
      const maintenanceCount = maintenanceRes.ok ? (await maintenanceRes.json()).count : 0;

      setReportData({ assetsCount, inspectionsCount, maintenanceCount });
    } catch (error) {
      console.error("Error fetching report summary:", error);
      toast.error("Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  const applyAssetFilters = (assets: any[]) => {
    let filtered = [...assets];

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((asset: any) =>
        asset.asset_ref?.toLowerCase().includes(searchLower) ||
        asset.asset_type_name?.toLowerCase().includes(searchLower) ||
        asset.description?.toLowerCase().includes(searchLower) ||
        asset.road_name?.toLowerCase().includes(searchLower) ||
        asset.region?.toLowerCase().includes(searchLower)
      );
    }

    if (filterAssetType !== "all") {
      filtered = filtered.filter((asset: any) => asset.asset_type_name === filterAssetType);
    }

    if (filterRegion !== "all") {
      filtered = filtered.filter((asset: any) => asset.region === filterRegion);
    }

    if (filterWard !== "all") {
      filtered = filtered.filter((asset: any) => asset.ward === filterWard);
    }

    if (filterDepot !== "all") {
      filtered = filtered.filter((asset: any) => asset.depot === filterDepot);
    }

    if (filterOwner !== "all") {
      filtered = filtered.filter((asset: any) => asset.owner === filterOwner);
    }

    if (filterRoadName !== "all") {
      filtered = filtered.filter((asset: any) => asset.road_name === filterRoadName);
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((asset: any) =>
        asset.status?.toLowerCase() === filterStatus.toLowerCase()
      );
    }

    if (filterCondition !== "all") {
      filtered = filtered.filter((asset: any) => {
        const ci = parseNumericCI(getAssetCI(asset));
        if (Number.isNaN(ci)) return false;

        switch (filterCondition) {
          case "excellent":
            return ci >= 80 && ci <= 100;
          case "good":
            return ci >= 60 && ci < 80;
          case "fair":
            return ci >= 40 && ci < 60;
          case "poor":
            return ci >= 20 && ci < 40;
          case "critical":
            return ci >= 0 && ci < 20;
          default:
            return true;
        }
      });
    }

    if (filterUrgency !== "all") {
      filtered = filtered.filter((asset: any) =>
        String(getAssetUrgency(asset)) === String(filterUrgency)
      );
    }

    return filtered;
  };

  const handleExportReport = async (reportType: string, format: string) => {
    try {
      setLoading(true);

      console.log("Tenant settings for report:", tenant);
      console.log("Organization Name:", tenant.organization_name || tenant.organizationName);
      console.log("Logo URL:", tenant.logo_url || tenant.logoUrl);
      console.log("Primary Color:", tenant.primary_color || tenant.primaryColor);

      let data: any[] = [];
      let columns: any[] = [];
      const title = reportType;
      const fileName = reportType.toLowerCase().replace(/ /g, "-");

      switch (reportType) {
        case "Asset Inventory": {
          const [assets, inspections] = await Promise.all([
            fetchAllAssetRegisterReportAssets(),
            fetchAllInspections(),
          ]);

          const assetRegisterRows = buildAssetRegisterRows(assets, inspections);

          data = applyAssetFilters(assetRegisterRows);

          columns = [
            { header: "UNIQUE ID", key: "unique_id" },
            { header: "REFERENCE NUMBER", key: "asset_ref" },
            { header: "TYPE", key: "asset_type_name" },
            { header: "DESCRIPTION", key: "description" },
            { header: "LOCATION/ROAD NAME", key: "location_road_name" },
            { header: "REGION", key: "region" },
            { header: "WARD/S", key: "ward" },
            { header: "DEPOT", key: "depot" },
            { header: "OWNER", key: "owner" },
            { header: "STATUS", key: "status" },

            { header: "START KM", key: "start_km" },
            { header: "END KM", key: "end_km" },
            { header: "START LATITUDE", key: "start_latitude" },
            { header: "START LONGITUDE", key: "start_longitude" },
            { header: "END LATITUDE", key: "end_latitude" },
            { header: "END LONGITUDE", key: "end_longitude" },

            { header: "NAME/CODE", key: "name_code" },
            { header: "MOUNTING TYPE", key: "mounting_type" },
            { header: "# POSTS/SUPPORTS", key: "posts_supports" },
            { header: "# BEAMS", key: "beams" },
            { header: "WIDTH (m)", key: "width_m" },
            { header: "LENGTH (m)", key: "length_m" },
            { header: "HEIGHT (m)", key: "height_m" },
            { header: "ORIENTATION/POSITION", key: "orientation_position" },

            { header: "DATE OF PURCHASE", key: "date_of_purchase" },
            { header: "PURCHASE COST", key: "purchase_cost" },
            { header: "LAST REVALUATION", key: "last_revaluation" },
            { header: "RESIDUAL VALUE", key: "residual_value" },
            { header: "USEFUL LIFE", key: "useful_life" },
            { header: "DEPRECIATION RATE", key: "depreciation_rate" },
            { header: "ACCUM. DEPRECIATION", key: "accumulated_depreciation" },

            { header: "ASSET CONDITION", key: "asset_condition" },
            { header: "DERU_DEGREE", key: "deru_degree" },
            { header: "DERU_EXTENT", key: "deru_extent" },
            { header: "DERU_RELEVANCE", key: "deru_relevance" },
            { header: "DERU_URGENCY", key: "deru_urgency" },
            { header: "CI_HEALTH", key: "ci_health" },
            { header: "CI_SAFETY", key: "ci_safety" },
            { header: "CI", key: "ci" },

            { header: "LAST INSPECTION DATE", key: "last_inspection_date" },
            { header: "INSPECTOR", key: "inspector" },
            { header: "FINDING SUMMARY", key: "finding_summary" },
            { header: "IMAGE", key: "image" },
            { header: "GEOMETRY STATUS", key: "geometry_status" },
          ];
          break;
        }

        case "Condition Summary": {
          const assets = await fetchAllAssets();
          const conditionAssets = assets.map((asset: any) => ({
            ...asset,
            condition_index: getAssetCI(asset),
            urgency_category: getAssetUrgency(asset),
            last_inspection_date: asset.last_inspection_date || "-",
            route_road: asset.road_number || asset.road_name
              ? `${asset.road_number || ""} ${asset.road_name || ""}`.trim()
              : "-",
          }));

          data = applyAssetFilters(conditionAssets);

          columns = [
            { header: "Asset Number", key: "asset_ref" },
            { header: "Asset Type", key: "asset_type_name" },
            { header: "Description", key: "description" },
            { header: "Condition Index (CI)", key: "condition_index" },
            { header: "Urgency Category", key: "urgency_category" },
            { header: "Last Inspection", key: "last_inspection_date" },
            { header: "Route/Road", key: "route_road" },
          ];
          break;
        }

        case "Asset Valuation": {
          const assets = await fetchAllAssets();
          const valuationAssets = assets.map((asset: any) => {
            const installDate = asset.install_date ? new Date(asset.install_date) : null;
            const ageYears = installDate
              ? (Date.now() - installDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
              : 0;
            const usefulLife = asset.useful_life_years || asset.expected_life_years || 20;
            const depreciationRate = usefulLife > 0 ? 100 / usefulLife : 0;

            return {
              ...asset,
              age_years: ageYears.toFixed(1),
              depreciation_rate: depreciationRate.toFixed(2),
            };
          });

          data = applyAssetFilters(valuationAssets);

          columns = [
            { header: "Asset Number", key: "asset_ref" },
            { header: "Asset Type", key: "asset_type_name" },
            { header: "Description", key: "description" },
            { header: "Replacement Value (ZAR)", key: "replacement_value" },
            { header: "Current Value (ZAR)", key: "current_value" },
            { header: "Depreciation Rate (%)", key: "depreciation_rate" },
            { header: "Age (years)", key: "age_years" },
          ];
          break;
        }

        case "Assets by Location": {
          const assets = await fetchAllAssets();
          const locationAssets = assets.map((asset: any) => ({
            ...asset,
            route_road: asset.road_number || asset.road_name
              ? `${asset.road_number || ""} ${asset.road_name || ""}`.trim()
              : "-",
            section: asset.section || "-",
            chainage_km: asset.km_marker || "-",
            side_of_road: asset.side_of_road || "-",
          }));

          data = applyAssetFilters(locationAssets);

          columns = [
            { header: "Route/Road", key: "route_road" },
            { header: "Section", key: "section" },
            { header: "Chainage (km)", key: "chainage_km" },
            { header: "Asset Number", key: "asset_ref" },
            { header: "Asset Type", key: "asset_type_name" },
            { header: "Description", key: "description" },
            { header: "Side of Road", key: "side_of_road" },
            { header: "Region", key: "region" },
            { header: "Latitude", key: "latitude" },
            { header: "Longitude", key: "longitude" },
          ];
          break;
        }

        case "Inspection Summary": {
          const inspections = await fetchAllInspections();
          data = inspections.map((insp: any) => ({
            ...insp,
            asset_number: insp.asset_ref || insp.asset_number || "-",
            asset_type: insp.asset_type_name || insp.asset_type || "-",
            condition_index: getInspectionCI(insp),
            urgency_category: getInspectionUrgency(insp),
          }));

          columns = [
            { header: "Asset Number", key: "asset_number" },
            { header: "Asset Type", key: "asset_type" },
            { header: "Inspection Date", key: "inspection_date" },
            { header: "Inspector", key: "inspector_name" },
            { header: "Condition Index", key: "condition_index" },
            { header: "Urgency Category", key: "urgency_category" },
            { header: "Status", key: "status" },
          ];
          break;
        }

        case "CI Trends": {
          const inspections = await fetchAllInspections();
          data = inspections.map((insp: any) => ({
            ...insp,
            asset_number: insp.asset_ref || insp.asset_number || "-",
            asset_type: insp.asset_type_name || insp.asset_type || "-",
            condition_index: getInspectionCI(insp),
            urgency_category: getInspectionUrgency(insp),
          }));

          columns = [
            { header: "Asset Number", key: "asset_number" },
            { header: "Asset Type", key: "asset_type" },
            { header: "Inspection Date", key: "inspection_date" },
            { header: "Condition Index", key: "condition_index" },
            { header: "Urgency Category", key: "urgency_category" },
            { header: "Inspector", key: "inspector_name" },
          ];
          break;
        }

        case "Defect Analysis": {
          const inspections = await fetchAllInspections();
          data = inspections.map((insp: any) => ({
            ...insp,
            asset_number: insp.asset_ref || insp.asset_number || "-",
            asset_type: insp.asset_type_name || insp.asset_type || "-",
            condition_index: getInspectionCI(insp),
            urgency: getInspectionUrgency(insp),
          }));

          columns = [
            { header: "Asset Number", key: "asset_number" },
            { header: "Asset Type", key: "asset_type" },
            { header: "Inspection Date", key: "inspection_date" },
            { header: "Condition Index", key: "condition_index" },
            { header: "Defect Notes", key: "notes" },
            { header: "Urgency", key: "urgency" },
            { header: "Inspector", key: "inspector_name" },
          ];
          break;
        }

        case "Inspector Performance": {
          const inspections = await fetchAllInspections();
          data = inspections.map((insp: any) => ({
            ...insp,
            asset_number: insp.asset_ref || insp.asset_number || "-",
            asset_type: insp.asset_type_name || insp.asset_type || "-",
            condition_index: getInspectionCI(insp),
          }));

          columns = [
            { header: "Inspector", key: "inspector_name" },
            { header: "Asset Number", key: "asset_number" },
            { header: "Asset Type", key: "asset_type" },
            { header: "Inspection Date", key: "inspection_date" },
            { header: "Condition Index", key: "condition_index" },
            { header: "Status", key: "status" },
          ];
          break;
        }

        case "Maintenance Summary":
        case "Maintenance History": {
          const maintRes = await fetch(`${API_URL}/maintenance`, { headers: getAuthHeaders() });
          const maintData = await maintRes.json();

          data = (maintData.records || []).map((maint: any) => ({
            ...maint,
            asset_number: maint.asset_ref || maint.asset_number || "-",
            asset_type: maint.asset_type_name || maint.asset_type || "-",
          }));

          columns = [
            { header: "Asset Number", key: "asset_number" },
            { header: "Asset Type", key: "asset_type" },
            { header: "Maintenance Type", key: "maintenance_type" },
            { header: "Description", key: "description" },
            { header: "Scheduled Date", key: "scheduled_date" },
            { header: "Completed Date", key: "completed_date" },
            { header: "Status", key: "status" },
            { header: "Estimated Cost (ZAR)", key: "estimated_cost" },
            { header: "Actual Cost (ZAR)", key: "actual_cost" },
            { header: "Contractor", key: "contractor" },
          ];
          break;
        }

        case "Cost Analysis": {
          const costRes = await fetch(`${API_URL}/maintenance`, { headers: getAuthHeaders() });
          const costData = await costRes.json();

          data = (costData.records || []).map((maint: any) => ({
            ...maint,
            asset_number: maint.asset_ref || maint.asset_number || "-",
            asset_type: maint.asset_type_name || maint.asset_type || "-",
            cost_variance: (Number(maint.actual_cost || 0) - Number(maint.estimated_cost || 0)),
          }));

          columns = [
            { header: "Asset Number", key: "asset_number" },
            { header: "Asset Type", key: "asset_type" },
            { header: "Maintenance Type", key: "maintenance_type" },
            { header: "Scheduled Date", key: "scheduled_date" },
            { header: "Completed Date", key: "completed_date" },
            { header: "Estimated Cost (ZAR)", key: "estimated_cost" },
            { header: "Actual Cost (ZAR)", key: "actual_cost" },
            { header: "Cost Variance (ZAR)", key: "cost_variance" },
            { header: "Status", key: "status" },
          ];
          break;
        }

        case "Work Order Status": {
          const workOrderRes = await fetch(`${API_URL}/maintenance`, { headers: getAuthHeaders() });
          const workOrderData = await workOrderRes.json();

          data = (workOrderData.records || []).map((maint: any) => ({
            ...maint,
            id: maint.maintenance_id || maint.id || "-",
            asset_number: maint.asset_ref || maint.asset_number || "-",
            asset_type: maint.asset_type_name || maint.asset_type || "-",
          }));

          columns = [
            { header: "Work Order ID", key: "id" },
            { header: "Asset Number", key: "asset_number" },
            { header: "Asset Type", key: "asset_type" },
            { header: "Maintenance Type", key: "maintenance_type" },
            { header: "Description", key: "description" },
            { header: "Scheduled Date", key: "scheduled_date" },
            { header: "Status", key: "status" },
            { header: "Priority", key: "priority" },
            { header: "Contractor", key: "contractor" },
          ];
          break;
        }

        case "Maintenance Strategy": {
          const strategyRes = await fetch(`${API_URL}/maintenance`, { headers: getAuthHeaders() });
          const strategyData = await strategyRes.json();

          data = (strategyData.records || []).map((maint: any) => ({
            ...maint,
            asset_number: maint.asset_ref || maint.asset_number || "-",
            asset_type: maint.asset_type_name || maint.asset_type || "-",
            maintenance_strategy: maint.maintenance_strategy || maint.maintenance_type || "-",
          }));

          columns = [
            { header: "Asset Number", key: "asset_number" },
            { header: "Asset Type", key: "asset_type" },
            { header: "Maintenance Type", key: "maintenance_type" },
            { header: "Strategy", key: "maintenance_strategy" },
            { header: "Scheduled Date", key: "scheduled_date" },
            { header: "Completed Date", key: "completed_date" },
            { header: "Status", key: "status" },
            { header: "Cost (ZAR)", key: "actual_cost" },
          ];
          break;
        }

        case "Inventory with Images":
        case "Inspection Photos Summary":
        case "Asset Condition Photos":
        case "Photo Gallery Report": {
          const assets = await fetchAllAssets();

          const assetsWithPhotos = await Promise.all(
            assets.map(async (asset: any) => {
              const assetId = asset.asset_id;
              if (!assetId || assetId === "undefined") {
                console.log("[Photos] Skipping asset with invalid ID:", asset.asset_ref);
                return { ...asset, photos: [] };
              }

              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
              if (!uuidRegex.test(assetId)) {
                console.log("[Photos] Skipping asset with invalid UUID format:", asset.asset_ref);
                return { ...asset, photos: [] };
              }

              try {
                const photosRes = await fetch(`${API_URL}/assets/${assetId}/photos`, {
                  headers: getAuthHeaders(),
                });

                if (photosRes.ok) {
                  const photosData = await photosRes.json();
                  const photos = photosData.photos || [];

                  let filteredPhotos = photos;

                  if (reportType === "Inventory with Images") {
                    filteredPhotos = photos.filter(
                      (p: any) =>
                        p.name === "0.jpg" ||
                        p.name === "0.jpeg" ||
                        p.name === "0.png" ||
                        /^[1-6](_\d+)?\./.test(p.name)
                    );
                  } else if (reportType === "Inspection Photos Summary") {
                    filteredPhotos = photos.filter((p: any) => /^[1-6](_\d+)?\./.test(p.name));
                  } else if (reportType === "Asset Condition Photos") {
                    filteredPhotos = photos.filter(
                      (p: any) => p.name === "0.jpg" || p.name === "0.jpeg" || p.name === "0.png"
                    );
                  } else if (reportType === "Photo Gallery Report") {
                    filteredPhotos = photos;
                  }

                  return {
                    ...asset,
                    photos: filteredPhotos,
                    photo_count: filteredPhotos.length,
                    main_photo_url: filteredPhotos.length > 0 ? filteredPhotos[0].signedUrl : null,
                  };
                }
              } catch (error) {
                console.error(`Error fetching photos for asset ${asset.asset_id}:`, error);
              }

              return {
                ...asset,
                photos: [],
                photo_count: 0,
                main_photo_url: null,
              };
            })
          );

          let filteredAssets =
            reportType === "Photo Gallery Report"
              ? assetsWithPhotos.filter((a) => a.photo_count > 0)
              : assetsWithPhotos;

          filteredAssets = applyAssetFilters(filteredAssets);

          data = filteredAssets.map((asset: any) => ({
            ...asset,
            route_road: asset.road_number || asset.road_name
              ? `${asset.road_number || ""} ${asset.road_name || ""}`.trim()
              : "-",
            chainage_km: asset.km_marker || "-",
            condition_index: getAssetCI(asset),
            urgency_category: getAssetUrgency(asset),
            coordinates:
              asset.gps_lat && asset.gps_lng
                ? `${Number(asset.gps_lat).toFixed(6)}, ${Number(asset.gps_lng).toFixed(6)}`
                : "-",
            description: asset.description || asset.asset_type_name || "-",
          }));

          columns = [
            { header: "Reference Number", key: "asset_ref" },
            { header: "Coordinates", key: "coordinates" },
            { header: "Road Name", key: "route_road" },
            { header: "Description", key: "description" },
            { header: "Condition Index", key: "condition_index" },
            { header: "Urgency", key: "urgency_category" },
            { header: "Status", key: "status" },
            { header: "Photos", key: "photo_count" },
          ];
          break;
        }

        default:
          toast.error("Unknown report type");
          return;
      }

      console.log(`[Reports] Exporting ${data.length} rows for ${reportType}`);
      toast.success(`Preparing ${data.length} rows for ${reportType}`);

      if (photoReportTypes.includes(reportType)) {
        if (format === "PDF") {
          await generatePhotoPDFReport({
            title,
            data,
            columns,
            tenant: getTenantBranding(),
            fileName: `${fileName}-${new Date().toISOString().split("T")[0]}`,
            includeDate: true,
            includeFooter: true,
          });
        } else if (format === "Excel") {
          await generatePhotoExcelReport({
            title,
            data,
            columns,
            tenant: getTenantBranding(),
            fileName: `${fileName}-${new Date().toISOString().split("T")[0]}`,
            includeDate: true,
            includeFooter: true,
          });
        } else {
          await downloadReport("csv", {
            title,
            data,
            columns,
            tenant: getTenantBranding(),
            fileName: `${fileName}-${new Date().toISOString().split("T")[0]}`,
            includeDate: true,
            includeFooter: true,
          });
        }
      } else {
        await downloadReport(format.toLowerCase() as "pdf" | "excel" | "csv", {
          title,
          data,
          columns,
          tenant: getTenantBranding(),
          fileName: `${fileName}-${new Date().toISOString().split("T")[0]}`,
          includeDate: true,
          includeFooter: true,
        });
      }

      toast.success(`${reportType} exported as ${format} successfully!`);
    } catch (error) {
      console.error("Error exporting report:", error);
      toast.error(`Failed to export report: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCustomReport = async () => {
    try {
      toast.info("Generating custom report...");

      let data: any[] = [];
      let columns: any[] = [];
      const title = `Custom ${customReportType.charAt(0).toUpperCase() + customReportType.slice(1)} Report`;

      switch (customReportType) {
        case "assets": {
          const assets = await fetchAllAssets();

          data = assets.map((asset: any) => ({
            ...asset,
            route_road: asset.road_number || asset.road_name
              ? `${asset.road_number || ""} ${asset.road_name || ""}`.trim()
              : "-",
            chainage_km: asset.km_marker || "-",
            condition_index: getAssetCI(asset),
          }));

          if (customAssetType !== "all") {
            data = data.filter((asset: any) =>
              asset.asset_type_name?.toLowerCase().includes(customAssetType.toLowerCase())
            );
          }

          if (customRegion !== "all") {
            data = data.filter((asset: any) =>
              asset.region?.toLowerCase().includes(customRegion.toLowerCase())
            );
          }

          columns = [
            { header: "Asset Number", key: "asset_ref" },
            { header: "Asset Type", key: "asset_type_name" },
            { header: "Description", key: "description" },
            { header: "Route/Road", key: "route_road" },
            { header: "Chainage", key: "chainage_km" },
            { header: "Condition Index", key: "condition_index" },
            { header: "Status", key: "status" },
            { header: "Region", key: "region" },
          ];
          break;
        }

        case "inspections": {
          const inspections = await fetchAllInspections();

          data = inspections.map((insp: any) => ({
            ...insp,
            asset_number: insp.asset_ref || insp.asset_number || "-",
            asset_type: insp.asset_type_name || insp.asset_type || "-",
            condition_index: getInspectionCI(insp),
            urgency_category: getInspectionUrgency(insp),
          }));

          columns = [
            { header: "Asset Number", key: "asset_number" },
            { header: "Asset Type", key: "asset_type" },
            { header: "Inspection Date", key: "inspection_date" },
            { header: "Inspector", key: "inspector_name" },
            { header: "Condition Index", key: "condition_index" },
            { header: "Urgency", key: "urgency_category" },
            { header: "Status", key: "status" },
          ];
          break;
        }

        case "maintenance": {
          const maintRes = await fetch(`${API_URL}/maintenance`, { headers: getAuthHeaders() });
          const maintData = await maintRes.json();

          data = (maintData.records || []).map((maint: any) => ({
            ...maint,
            asset_number: maint.asset_ref || maint.asset_number || "-",
            asset_type: maint.asset_type_name || maint.asset_type || "-",
          }));

          columns = [
            { header: "Asset Number", key: "asset_number" },
            { header: "Asset Type", key: "asset_type" },
            { header: "Maintenance Type", key: "maintenance_type" },
            { header: "Scheduled Date", key: "scheduled_date" },
            { header: "Completed Date", key: "completed_date" },
            { header: "Status", key: "status" },
            { header: "Cost (ZAR)", key: "actual_cost" },
          ];
          break;
        }

        default:
          toast.error("Unknown custom report type");
          return;
      }

      console.log(`[Reports] Generating custom report with ${data.length} rows`);
      toast.success(`Preparing ${data.length} rows for custom report`);

      await downloadReport("pdf", {
        title,
        data,
        columns,
        tenant: getTenantBranding(),
        fileName: `custom-report-${customReportType}-${new Date().toISOString().split("T")[0]}`,
        includeDate: true,
        includeFooter: true,
      });

      toast.success("Custom report generated successfully!");
    } catch (error) {
      console.error("Error generating custom report:", error);
      toast.error("Failed to generate custom report");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Generate comprehensive reports for assets, inspections, and maintenance activities
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Total Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{reportData?.assetsCount || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Registered in system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-success" />
              Total Inspections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{reportData?.inspectionsCount || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Completed inspections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-warning" />
              Maintenance Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{reportData?.maintenanceCount || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Total maintenance activities</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Reports</CardTitle>
          <CardDescription>Select a report type and export format</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="standard">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="standard">Standard Reports</TabsTrigger>
              <TabsTrigger value="custom">Custom Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="standard" className="space-y-4 mt-4">
              <div className="p-3 border rounded-lg bg-accent/20 space-y-3">
                <h4 className="text-xs font-semibold flex items-center gap-2">
                  <Filter className="w-3 h-3" />
                  Filter Assets
                </h4>

                <div>
                  <Label className="text-xs mb-1 block">Search Assets</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <Label className="text-xs mb-1 block">Asset Type</Label>
                    <Select value={filterAssetType} onValueChange={setFilterAssetType}>
                      <SelectTrigger className="h-8 text-xs">
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

                  <div>
                    <Label className="text-xs mb-1 block">Region</Label>
                    <Select value={filterRegion} onValueChange={setFilterRegion}>
                      <SelectTrigger className="h-8 text-xs">
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
                    <Label className="text-xs mb-1 block">Ward</Label>
                    <Select value={filterWard} onValueChange={setFilterWard}>
                      <SelectTrigger className="h-8 text-xs">
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
                    <Label className="text-xs mb-1 block">Depot</Label>
                    <Select value={filterDepot} onValueChange={setFilterDepot}>
                      <SelectTrigger className="h-8 text-xs">
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
                    <Label className="text-xs mb-1 block">Owner</Label>
                    <Select value={filterOwner} onValueChange={setFilterOwner}>
                      <SelectTrigger className="h-8 text-xs">
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
                    <Label className="text-xs mb-1 block">Road Name</Label>
                    <Select value={filterRoadName} onValueChange={setFilterRoadName}>
                      <SelectTrigger className="h-8 text-xs">
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
                    <Label className="text-xs mb-1 block">Status</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="h-8 text-xs">
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

                  <div>
                    <Label className="text-xs mb-1 block">Condition (CI)</Label>
                    <Select value={filterCondition} onValueChange={setFilterCondition}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Conditions</SelectItem>
                        <SelectItem value="excellent">Excellent (80-100)</SelectItem>
                        <SelectItem value="good">Good (60-79)</SelectItem>
                        <SelectItem value="fair">Fair (40-59)</SelectItem>
                        <SelectItem value="poor">Poor (20-39)</SelectItem>
                        <SelectItem value="critical">Critical (0-19)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs mb-1 block">Urgency</Label>
                    <Select value={filterUrgency} onValueChange={setFilterUrgency}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Urgency</SelectItem>
                        <SelectItem value="1">Category 1</SelectItem>
                        <SelectItem value="2">Category 2</SelectItem>
                        <SelectItem value="3">Category 3</SelectItem>
                        <SelectItem value="4">Category 4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Asset Reports
                  </h3>
                  <div className="space-y-2">
                    {["Asset Inventory", "Asset Valuation", "Assets by Location", "Condition Summary"].map((report) => (
                      <div key={report} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                        <span className="text-sm font-medium">{report}</span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleExportReport(report, "PDF")}>
                            <Download className="w-3 h-3 mr-1" />
                            PDF
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleExportReport(report, "Excel")}>
                            <Download className="w-3 h-3 mr-1" />
                            Excel
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleExportReport(report, "CSV")}>
                            <Download className="w-3 h-3 mr-1" />
                            CSV
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Inspection Reports
                  </h3>
                  <div className="space-y-2">
                    {["Inspection Summary", "CI Trends", "Defect Analysis", "Inspector Performance"].map((report) => (
                      <div key={report} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                        <span className="text-sm font-medium">{report}</span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleExportReport(report, "PDF")}>
                            <Download className="w-3 h-3 mr-1" />
                            PDF
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleExportReport(report, "Excel")}>
                            <Download className="w-3 h-3 mr-1" />
                            Excel
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleExportReport(report, "CSV")}>
                            <Download className="w-3 h-3 mr-1" />
                            CSV
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Maintenance Reports
                  </h3>
                  <div className="space-y-2">
                    {["Maintenance Summary", "Cost Analysis", "Work Order Status", "Maintenance Strategy"].map((report) => (
                      <div key={report} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                        <span className="text-sm font-medium">{report}</span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleExportReport(report, "PDF")}>
                            <Download className="w-3 h-3 mr-1" />
                            PDF
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleExportReport(report, "Excel")}>
                            <Download className="w-3 h-3 mr-1" />
                            Excel
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleExportReport(report, "CSV")}>
                            <Download className="w-3 h-3 mr-1" />
                            CSV
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4" />
                    Photo Reports
                  </h3>

                  <div className="space-y-2">
                    {["Inventory with Images", "Inspection Photos Summary", "Asset Condition Photos", "Photo Gallery Report"].map((report) => (
                      <div key={report} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                        <span className="text-sm font-medium">{report}</span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleExportReport(report, "PDF")}>
                            <Download className="w-3 h-3 mr-1" />
                            PDF
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleExportReport(report, "Excel")}>
                            <Download className="w-3 h-3 mr-1" />
                            Excel
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="custom" className="space-y-4 mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Report Type</label>
                  <Select value={customReportType} onValueChange={setCustomReportType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assets">Assets</SelectItem>
                      <SelectItem value="inspections">Inspections</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {customReportType === "assets" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Asset Type</label>
                      <Select value={customAssetType} onValueChange={setCustomAssetType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="signage">Signage</SelectItem>
                          <SelectItem value="guardrail">Guardrail</SelectItem>
                          <SelectItem value="traffic">Traffic Signal</SelectItem>
                          <SelectItem value="gantry">Gantry</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Region</label>
                      <Select value={customRegion} onValueChange={setCustomRegion}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Regions</SelectItem>
                          <SelectItem value="north">North</SelectItem>
                          <SelectItem value="south">South</SelectItem>
                          <SelectItem value="east">East</SelectItem>
                          <SelectItem value="west">West</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={handleGenerateCustomReport}>
                  <Download className="w-4 h-4 mr-2" />
                  Generate Custom Report
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
          <CardDescription>Visualize key metrics and trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <PieChartIcon className="w-4 h-4" />
                Asset Type Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analyticsData?.assetTypeData || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analyticsData?.assetTypeData?.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <PieChartIcon className="w-4 h-4" />
                Condition Index Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analyticsData?.ciDistributionData || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analyticsData?.ciDistributionData?.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <PieChartIcon className="w-4 h-4" />
                Maintenance Status Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analyticsData?.maintenanceStatusData || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analyticsData?.maintenanceStatusData?.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Monthly Inspections Trend
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData?.monthlyInspectionsData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <LineChartIcon className="w-4 h-4" />
                Maintenance Cost Trends
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData?.monthlyCostsData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="cost" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
