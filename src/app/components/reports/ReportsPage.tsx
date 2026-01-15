import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../App";
import { useTenant } from "../../contexts/TenantContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Download, FileText, BarChart3, TrendingUp, Loader2, PieChart as PieChartIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { downloadReport } from "../../utils/reportGenerators";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function ReportsPage() {
  const { accessToken } = useContext(AuthContext);
  const { settings: tenant } = useTenant();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [customReportType, setCustomReportType] = useState('assets');
  const [customAssetType, setCustomAssetType] = useState('all');
  const [customRegion, setCustomRegion] = useState('all');

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  // TAMS360 Brand Colors
  const COLORS = {
    primary: '#010D13', // Deep Navy
    skyBlue: '#39AEDF',
    green: '#5DB32A',
    yellow: '#F8D227',
    grey: '#455B5E',
  };

  const CHART_COLORS = [COLORS.skyBlue, COLORS.green, COLORS.yellow, COLORS.grey, COLORS.primary];

  useEffect(() => {
    fetchReportSummary();
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      const [assetsRes, inspectionsRes, maintenanceRes] = await Promise.all([
        fetch(`${API_URL}/assets`, {
          headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
        }),
        fetch(`${API_URL}/inspections`, {
          headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
        }),
        fetch(`${API_URL}/maintenance`, {
          headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
        }),
      ]);

      const assetsData = assetsRes.ok ? await assetsRes.json() : { assets: [] };
      const inspectionsData = inspectionsRes.ok ? await inspectionsRes.json() : { inspections: [] };
      const maintenanceData = maintenanceRes.ok ? await maintenanceRes.json() : { records: [] };

      const assets = assetsData.assets || [];
      const inspections = inspectionsData.inspections || [];
      const maintenance = maintenanceData.records || [];

      // Asset Type Distribution
      const assetTypeCounts: Record<string, number> = {};
      assets.forEach((asset: any) => {
        const type = asset.asset_type_name || 'Unknown';
        assetTypeCounts[type] = (assetTypeCounts[type] || 0) + 1;
      });
      const assetTypeData = Object.entries(assetTypeCounts).map(([name, value]) => ({ name, value }));

      // CI Distribution (Condition Index ranges)
      const ciRanges = { 'Excellent (80-100)': 0, 'Good (60-79)': 0, 'Fair (40-59)': 0, 'Poor (20-39)': 0, 'Critical (0-19)': 0 };
      inspections.forEach((insp: any) => {
        const ci = insp.conditional_index || insp.ci_final;
        if (ci >= 80) ciRanges['Excellent (80-100)']++;
        else if (ci >= 60) ciRanges['Good (60-79)']++;
        else if (ci >= 40) ciRanges['Fair (40-59)']++;
        else if (ci >= 20) ciRanges['Poor (20-39)']++;
        else if (ci >= 0) ciRanges['Critical (0-19)']++;
      });
      const ciDistributionData = Object.entries(ciRanges).map(([name, value]) => ({ name, value }));

      // Maintenance Status Distribution
      const statusCounts: Record<string, number> = {};
      maintenance.forEach((maint: any) => {
        const status = maint.status || 'Unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      const maintenanceStatusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

      // Monthly Inspections Trend (last 6 months)
      const monthlyInspections: Record<string, number> = {};
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      inspections.forEach((insp: any) => {
        const date = new Date(insp.inspection_date);
        if (date >= sixMonthsAgo) {
          const monthKey = date.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short' });
          monthlyInspections[monthKey] = (monthlyInspections[monthKey] || 0) + 1;
        }
      });
      const monthlyInspectionsData = Object.entries(monthlyInspections).map(([month, count]) => ({ month, count }));

      // Maintenance Cost Trends (last 6 months)
      const monthlyCosts: Record<string, number> = {};
      maintenance.forEach((maint: any) => {
        const dateToUse = maint.completed_date || maint.scheduled_date;
        if (dateToUse) {
          const date = new Date(dateToUse);
          if (date >= sixMonthsAgo) {
            const monthKey = date.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short' });
            const cost = parseFloat(maint.actual_cost || maint.estimated_cost || 0);
            monthlyCosts[monthKey] = (monthlyCosts[monthKey] || 0) + cost;
          }
        }
      });
      const monthlyCostsData = Object.entries(monthlyCosts).map(([month, cost]) => ({ month, cost: Math.round(cost) }));

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
        fetch(`${API_URL}/assets/count`, {
          headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
        }),
        fetch(`${API_URL}/inspections/count`, {
          headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
        }),
        fetch(`${API_URL}/maintenance/count`, {
          headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
        }),
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

  const handleExportReport = async (reportType: string, format: string) => {
    try {
      setLoading(true);
      
      // Debug: Log tenant data to check branding info
      console.log('Tenant settings for report:', tenant);
      console.log('Organization Name:', tenant.organization_name || tenant.organizationName);
      console.log('Logo URL:', tenant.logo_url || tenant.logoUrl);
      console.log('Primary Color:', tenant.primary_color || tenant.primaryColor);

      let data: any[] = [];
      let columns: any[] = [];
      let title = reportType;
      let fileName = reportType.toLowerCase().replace(/ /g, '-');

      switch (reportType) {
        case 'Asset Inventory':
          const assetsRes = await fetch(`${API_URL}/assets`, {
            headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
          });
          const assetsData = await assetsRes.json();
          data = (assetsData.assets || []).map((asset: any) => ({
            ...asset,
            route_road: asset.road_number || asset.road_name ? `${asset.road_number || ''} ${asset.road_name || ''}`.trim() : '-',
            chainage_km: asset.km_marker || '-',
            condition_index: asset.latest_ci || '-',
          }));
          columns = [
            { header: 'Asset Number', key: 'asset_ref' },
            { header: 'Asset Type', key: 'asset_type_name' },
            { header: 'Description', key: 'description' },
            { header: 'Route/Road', key: 'route_road' },
            { header: 'Chainage', key: 'chainage_km' },
            { header: 'Condition Index', key: 'condition_index' },
            { header: 'Status', key: 'status' },
            { header: 'Region', key: 'region' },
          ];
          break;

        case 'Condition Summary':
          const ciRes = await fetch(`${API_URL}/assets`, {
            headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
          });
          const ciData = await ciRes.json();
          data = (ciData.assets || []).map((asset: any) => ({
            ...asset,
            condition_index: asset.latest_ci || '-',
            urgency_category: asset.latest_urgency || '-',
            last_inspection_date: asset.last_inspection_date || '-',
            route_road: asset.road_number || asset.road_name ? `${asset.road_number || ''} ${asset.road_name || ''}`.trim() : '-',
          }));
          columns = [
            { header: 'Asset Number', key: 'asset_ref' },
            { header: 'Asset Type', key: 'asset_type_name' },
            { header: 'Description', key: 'description' },
            { header: 'Condition Index (CI)', key: 'condition_index' },
            { header: 'Urgency Category', key: 'urgency_category' },
            { header: 'Last Inspection', key: 'last_inspection_date' },
            { header: 'Route/Road', key: 'route_road' },
          ];
          break;

        case 'Asset Valuation':
          const valRes = await fetch(`${API_URL}/assets`, {
            headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
          });
          const valData = await valRes.json();
          data = (valData.assets || []).map((asset: any) => {
            const installDate = asset.install_date ? new Date(asset.install_date) : null;
            const ageYears = installDate ? (Date.now() - installDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25) : 0;
            const usefulLife = asset.useful_life_years || asset.expected_life_years || 20;
            const depreciationRate = usefulLife > 0 ? (100 / usefulLife) : 0;
            return {
              ...asset,
              age_years: ageYears.toFixed(1),
              depreciation_rate: depreciationRate.toFixed(2),
            };
          });
          columns = [
            { header: 'Asset Number', key: 'asset_ref' },
            { header: 'Asset Type', key: 'asset_type_name' },
            { header: 'Description', key: 'description' },
            { header: 'Replacement Value (ZAR)', key: 'replacement_value' },
            { header: 'Current Value (ZAR)', key: 'current_value' },
            { header: 'Depreciation Rate (%)', key: 'depreciation_rate' },
            { header: 'Age (years)', key: 'age_years' },
          ];
          break;

        case 'Assets by Location':
          const locRes = await fetch(`${API_URL}/assets`, {
            headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
          });
          const locData = await locRes.json();
          data = (locData.assets || []).map((asset: any) => ({
            ...asset,
            route_road: asset.road_number || asset.road_name ? `${asset.road_number || ''} ${asset.road_name || ''}`.trim() : '-',
            section: asset.section || '-',
            chainage_km: asset.km_marker || '-',
            side_of_road: asset.side_of_road || '-',
          }));
          columns = [
            { header: 'Route/Road', key: 'route_road' },
            { header: 'Section', key: 'section' },
            { header: 'Chainage (km)', key: 'chainage_km' },
            { header: 'Asset Number', key: 'asset_ref' },
            { header: 'Asset Type', key: 'asset_type_name' },
            { header: 'Description', key: 'description' },
            { header: 'Side of Road', key: 'side_of_road' },
            { header: 'Region', key: 'region' },
            { header: 'Latitude', key: 'latitude' },
            { header: 'Longitude', key: 'longitude' },
          ];
          break;

        case 'Inspection Summary':
          const inspRes = await fetch(`${API_URL}/inspections`, {
            headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
          });
          const inspData = await inspRes.json();
          data = (inspData.inspections || []).map((insp: any) => ({
            ...insp,
            asset_number: insp.asset_ref || insp.asset_number || '-',
            asset_type: insp.asset_type_name || insp.asset_type || '-',
            condition_index: insp.ci_final || insp.conditional_index || '-',
            urgency_category: insp.calculated_urgency || insp.urgency || '-',
          }));
          columns = [
            { header: 'Asset Number', key: 'asset_number' },
            { header: 'Asset Type', key: 'asset_type' },
            { header: 'Inspection Date', key: 'inspection_date' },
            { header: 'Inspector', key: 'inspector_name' },
            { header: 'Condition Index', key: 'condition_index' },
            { header: 'Urgency Category', key: 'urgency_category' },
            { header: 'Status', key: 'status' },
          ];
          break;

        case 'CI Trends':
          const ciTrendsRes = await fetch(`${API_URL}/inspections`, {
            headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
          });
          const ciTrendsData = await ciTrendsRes.json();
          data = (ciTrendsData.inspections || []).map((insp: any) => ({
            ...insp,
            asset_number: insp.asset_ref || insp.asset_number || '-',
            asset_type: insp.asset_type_name || insp.asset_type || '-',
            condition_index: insp.ci_final || insp.conditional_index || '-',
            urgency_category: insp.calculated_urgency || insp.urgency || '-',
          }));
          columns = [
            { header: 'Asset Number', key: 'asset_number' },
            { header: 'Asset Type', key: 'asset_type' },
            { header: 'Inspection Date', key: 'inspection_date' },
            { header: 'Condition Index', key: 'condition_index' },
            { header: 'Urgency Category', key: 'urgency_category' },
            { header: 'Inspector', key: 'inspector_name' },
          ];
          break;

        case 'Defect Analysis':
          const defectRes = await fetch(`${API_URL}/inspections`, {
            headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
          });
          const defectData = await defectRes.json();
          data = (defectData.inspections || []).map((insp: any) => ({
            ...insp,
            asset_number: insp.asset_ref || insp.asset_number || '-',
            asset_type: insp.asset_type_name || insp.asset_type || '-',
            condition_index: insp.ci_final || insp.conditional_index || '-',
            urgency: insp.calculated_urgency || insp.urgency || '-',
          }));
          columns = [
            { header: 'Asset Number', key: 'asset_number' },
            { header: 'Asset Type', key: 'asset_type' },
            { header: 'Inspection Date', key: 'inspection_date' },
            { header: 'Condition Index', key: 'condition_index' },
            { header: 'Defect Notes', key: 'notes' },
            { header: 'Urgency', key: 'urgency' },
            { header: 'Inspector', key: 'inspector_name' },
          ];
          break;

        case 'Inspector Performance':
          const inspPerfRes = await fetch(`${API_URL}/inspections`, {
            headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
          });
          const inspPerfData = await inspPerfRes.json();
          data = (inspPerfData.inspections || []).map((insp: any) => ({
            ...insp,
            asset_number: insp.asset_ref || insp.asset_number || '-',
            asset_type: insp.asset_type_name || insp.asset_type || '-',
            condition_index: insp.ci_final || insp.conditional_index || '-',
          }));
          columns = [
            { header: 'Inspector', key: 'inspector_name' },
            { header: 'Asset Number', key: 'asset_number' },
            { header: 'Asset Type', key: 'asset_type' },
            { header: 'Inspection Date', key: 'inspection_date' },
            { header: 'Condition Index', key: 'condition_index' },
            { header: 'Status', key: 'status' },
          ];
          break;

        case 'Maintenance Summary':
        case 'Maintenance History':
          const maintRes = await fetch(`${API_URL}/maintenance`, {
            headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
          });
          const maintData = await maintRes.json();
          data = (maintData.records || []).map((maint: any) => ({
            ...maint,
            asset_number: maint.asset_ref || maint.asset_number || '-',
            asset_type: maint.asset_type_name || maint.asset_type || '-',
          }));
          columns = [
            { header: 'Asset Number', key: 'asset_number' },
            { header: 'Asset Type', key: 'asset_type' },
            { header: 'Maintenance Type', key: 'maintenance_type' },
            { header: 'Description', key: 'description' },
            { header: 'Scheduled Date', key: 'scheduled_date' },
            { header: 'Completed Date', key: 'completed_date' },
            { header: 'Status', key: 'status' },
            { header: 'Estimated Cost (ZAR)', key: 'estimated_cost' },
            { header: 'Actual Cost (ZAR)', key: 'actual_cost' },
            { header: 'Contractor', key: 'contractor' },
          ];
          break;

        case 'Cost Analysis':
          const costRes = await fetch(`${API_URL}/maintenance`, {
            headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
          });
          const costData = await costRes.json();
          data = (costData.records || []).map((maint: any) => ({
            ...maint,
            asset_number: maint.asset_ref || maint.asset_number || '-',
            asset_type: maint.asset_type_name || maint.asset_type || '-',
            cost_variance: ((maint.actual_cost || 0) - (maint.estimated_cost || 0)),
          }));
          columns = [
            { header: 'Asset Number', key: 'asset_number' },
            { header: 'Asset Type', key: 'asset_type' },
            { header: 'Maintenance Type', key: 'maintenance_type' },
            { header: 'Scheduled Date', key: 'scheduled_date' },
            { header: 'Completed Date', key: 'completed_date' },
            { header: 'Estimated Cost (ZAR)', key: 'estimated_cost' },
            { header: 'Actual Cost (ZAR)', key: 'actual_cost' },
            { header: 'Cost Variance (ZAR)', key: 'cost_variance' },
            { header: 'Status', key: 'status' },
          ];
          break;

        case 'Work Order Status':
          const workOrderRes = await fetch(`${API_URL}/maintenance`, {
            headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
          });
          const workOrderData = await workOrderRes.json();
          data = (workOrderData.records || []).map((maint: any) => ({
            ...maint,
            id: maint.maintenance_id || maint.id || '-',
            asset_number: maint.asset_ref || maint.asset_number || '-',
            asset_type: maint.asset_type_name || maint.asset_type || '-',
          }));
          columns = [
            { header: 'Work Order ID', key: 'id' },
            { header: 'Asset Number', key: 'asset_number' },
            { header: 'Asset Type', key: 'asset_type' },
            { header: 'Maintenance Type', key: 'maintenance_type' },
            { header: 'Description', key: 'description' },
            { header: 'Scheduled Date', key: 'scheduled_date' },
            { header: 'Status', key: 'status' },
            { header: 'Priority', key: 'priority' },
            { header: 'Contractor', key: 'contractor' },
          ];
          break;

        case 'Maintenance Strategy':
          const strategyRes = await fetch(`${API_URL}/maintenance`, {
            headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
          });
          const strategyData = await strategyRes.json();
          data = (strategyData.records || []).map((maint: any) => ({
            ...maint,
            asset_number: maint.asset_ref || maint.asset_number || '-',
            asset_type: maint.asset_type_name || maint.asset_type || '-',
            maintenance_strategy: maint.maintenance_strategy || maint.maintenance_type || '-',
          }));
          columns = [
            { header: 'Asset Number', key: 'asset_number' },
            { header: 'Asset Type', key: 'asset_type' },
            { header: 'Maintenance Type', key: 'maintenance_type' },
            { header: 'Strategy', key: 'maintenance_strategy' },
            { header: 'Scheduled Date', key: 'scheduled_date' },
            { header: 'Completed Date', key: 'completed_date' },
            { header: 'Status', key: 'status' },
            { header: 'Cost (ZAR)', key: 'actual_cost' },
          ];
          break;

        default:
          toast.error('Unknown report type');
          return;
      }

      await downloadReport(format.toLowerCase() as 'pdf' | 'excel' | 'csv', {
        title,
        data,
        columns,
        tenant: {
          organizationName: tenant.organization_name || tenant.organizationName,
          logoUrl: tenant.logo_url || tenant.logoUrl,
          primaryColor: tenant.primary_color || tenant.primaryColor || '#010D13',
          regionName: tenant.region_name || tenant.regionName,
          currency: 'ZAR',
          tagline: tenant.tagline,
          address: tenant.address,
          phone: tenant.phone,
          email: tenant.email,
          website: tenant.website,
        },
        fileName: `${fileName}-${new Date().toISOString().split('T')[0]}`,
        includeDate: true,
        includeFooter: true,
      });

      toast.success(`${reportType} exported as ${format} successfully!`);
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error(`Failed to export report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCustomReport = async () => {
    try {
      toast.info('Generating custom report...');
      
      let data: any[] = [];
      let columns: any[] = [];
      let title = `Custom ${customReportType.charAt(0).toUpperCase() + customReportType.slice(1)} Report`;
      
      switch (customReportType) {
        case 'assets':
          const assetsRes = await fetch(`${API_URL}/assets`, {
            headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
          });
          const assetsData = await assetsRes.json();
          data = (assetsData.assets || []).map((asset: any) => ({
            ...asset,
            route_road: asset.road_number || asset.road_name ? `${asset.road_number || ''} ${asset.road_name || ''}`.trim() : '-',
            chainage_km: asset.km_marker || '-',
            condition_index: asset.latest_ci || '-',
          }));
          
          if (customAssetType !== 'all') {
            data = data.filter((asset: any) => 
              asset.asset_type_name?.toLowerCase().includes(customAssetType)
            );
          }
          if (customRegion !== 'all') {
            data = data.filter((asset: any) => 
              asset.region?.toLowerCase().includes(customRegion)
            );
          }
          
          columns = [
            { header: 'Asset Number', key: 'asset_ref' },
            { header: 'Asset Type', key: 'asset_type_name' },
            { header: 'Description', key: 'description' },
            { header: 'Route/Road', key: 'route_road' },
            { header: 'Chainage', key: 'chainage_km' },
            { header: 'Condition Index', key: 'condition_index' },
            { header: 'Status', key: 'status' },
            { header: 'Region', key: 'region' },
          ];
          break;
          
        case 'inspections':
          const inspRes = await fetch(`${API_URL}/inspections`, {
            headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
          });
          const inspData = await inspRes.json();
          data = (inspData.inspections || []).map((insp: any) => ({
            ...insp,
            asset_number: insp.asset_ref || insp.asset_number || '-',
            asset_type: insp.asset_type_name || insp.asset_type || '-',
            condition_index: insp.ci_final || insp.conditional_index || '-',
            urgency_category: insp.calculated_urgency || insp.urgency || '-',
          }));
          
          columns = [
            { header: 'Asset Number', key: 'asset_number' },
            { header: 'Asset Type', key: 'asset_type' },
            { header: 'Inspection Date', key: 'inspection_date' },
            { header: 'Inspector', key: 'inspector_name' },
            { header: 'Condition Index', key: 'condition_index' },
            { header: 'Urgency', key: 'urgency_category' },
            { header: 'Status', key: 'status' },
          ];
          break;
          
        case 'maintenance':
          const maintRes = await fetch(`${API_URL}/maintenance`, {
            headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
          });
          const maintData = await maintRes.json();
          data = (maintData.records || []).map((maint: any) => ({
            ...maint,
            asset_number: maint.asset_ref || maint.asset_number || '-',
            asset_type: maint.asset_type_name || maint.asset_type || '-',
          }));
          
          columns = [
            { header: 'Asset Number', key: 'asset_number' },
            { header: 'Asset Type', key: 'asset_type' },
            { header: 'Maintenance Type', key: 'maintenance_type' },
            { header: 'Scheduled Date', key: 'scheduled_date' },
            { header: 'Completed Date', key: 'completed_date' },
            { header: 'Status', key: 'status' },
            { header: 'Cost (ZAR)', key: 'actual_cost' },
          ];
          break;
      }

      await downloadReport('pdf', {
        title,
        data,
        columns,
        tenant: {
          organizationName: tenant.organization_name,
          logoUrl: tenant.logo_url,
          primaryColor: tenant.primary_color,
          regionName: tenant.region_name,
          currency: 'ZAR',
          tagline: tenant.tagline,
          address: tenant.address,
          phone: tenant.phone,
          email: tenant.email,
          website: tenant.website,
        },
        fileName: `custom-report-${customReportType}-${new Date().toISOString().split('T')[0]}`,
        includeDate: true,
        includeFooter: true,
      });

      toast.success('Custom report generated successfully!');
    } catch (error) {
      console.error('Error generating custom report:', error);
      toast.error('Failed to generate custom report');
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
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Asset Reports
                  </h3>
                  <div className="space-y-2">
                    {['Asset Inventory', 'Asset Valuation', 'Assets by Location', 'Condition Summary'].map((report) => (
                      <div key={report} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                        <span className="text-sm font-medium">{report}</span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleExportReport(report, 'PDF')}>
                            <Download className="w-3 h-3 mr-1" />
                            PDF
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleExportReport(report, 'Excel')}>
                            <Download className="w-3 h-3 mr-1" />
                            Excel
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleExportReport(report, 'CSV')}>
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
                    {['Inspection Summary', 'CI Trends', 'Defect Analysis', 'Inspector Performance'].map((report) => (
                      <div key={report} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                        <span className="text-sm font-medium">{report}</span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleExportReport(report, 'PDF')}>
                            <Download className="w-3 h-3 mr-1" />
                            PDF
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleExportReport(report, 'Excel')}>
                            <Download className="w-3 h-3 mr-1" />
                            Excel
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleExportReport(report, 'CSV')}>
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
                    {['Maintenance Summary', 'Cost Analysis', 'Work Order Status', 'Maintenance Strategy'].map((report) => (
                      <div key={report} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                        <span className="text-sm font-medium">{report}</span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleExportReport(report, 'PDF')}>
                            <Download className="w-3 h-3 mr-1" />
                            PDF
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleExportReport(report, 'Excel')}>
                            <Download className="w-3 h-3 mr-1" />
                            Excel
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleExportReport(report, 'CSV')}>
                            <Download className="w-3 h-3 mr-1" />
                            CSV
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

                {customReportType === 'assets' && (
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
                <BarChart
                  data={analyticsData?.monthlyInspectionsData || []}
                >
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
                <LineChart className="w-4 h-4" />
                Maintenance Cost Trends
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={analyticsData?.monthlyCostsData || []}
                >
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