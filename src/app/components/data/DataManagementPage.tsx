import { useState, useContext, useEffect } from "react";
import { AuthContext } from "../../App";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Download, Upload, FileText, Database, Trash2, RefreshCw, CheckCircle, AlertCircle, Settings, FileSpreadsheet, Check, X as XIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { Link, useNavigate } from "react-router-dom";
import { downloadReport } from "../../utils/reportGenerators";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Input } from "../ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";

export default function DataManagementPage() {
  const { user, accessToken, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [dataCounts, setDataCounts] = useState({
    assets: 0,
    inspections: 0,
    maintenance: 0,
    loading: true,
  });

  // Batch operations state
  const [batchDataType, setBatchDataType] = useState<string>("assets");
  const [batchRecords, setBatchRecords] = useState<any[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [batchUpdateField, setBatchUpdateField] = useState<string>("");
  const [batchUpdateValue, setBatchUpdateValue] = useState<string>("");

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  useEffect(() => {
    fetchDataCounts();
  }, []);

  const fetchDataCounts = async () => {
    try {
      // Fetch all counts in parallel
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

      const assets = assetsRes.ok ? (await assetsRes.json()).count : 0;
      const inspections = inspectionsRes.ok ? (await inspectionsRes.json()).count : 0;
      const maintenance = maintenanceRes.ok ? (await maintenanceRes.json()).count : 0;

      setDataCounts({
        assets,
        inspections,
        maintenance,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching data counts:", error);
      setDataCounts({ assets: 0, inspections: 0, maintenance: 0, loading: false });
    }
  };

  const handleExportData = async (dataType: string, format: string) => {
    try {
      toast.info(`Exporting ${dataType} as ${format}...`);
      
      // Fetch tenant settings
      const tenantRes = await fetch(`${API_URL}/tenant-settings`, {
        headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
      });
      const tenantData = tenantRes.ok ? await tenantRes.json() : {};
      const tenant = tenantData.settings || {};

      let data: any[] = [];
      let columns: any[] = [];
      let title = `${dataType.charAt(0).toUpperCase() + dataType.slice(1)} Export`;
      
      switch (dataType) {
        case 'assets':
          const assetsRes = await fetch(`${API_URL}/assets`, {
            headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
          });
          const assetsData = await assetsRes.json();
          data = assetsData.assets || [];
          columns = [
            { header: 'Asset Number', key: 'asset_ref' },
            { header: 'Asset Type', key: 'asset_type_name' },
            { header: 'Route/Road', key: 'route_road' },
            { header: 'Chainage', key: 'chainage_km' },
            { header: 'Condition Index', key: 'condition_index' },
            { header: 'Status', key: 'status' },
          ];
          break;
          
        case 'inspections':
          const inspRes = await fetch(`${API_URL}/inspections`, {
            headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
          });
          const inspData = await inspRes.json();
          data = inspData.inspections || [];
          columns = [
            { header: 'Asset Number', key: 'asset_number' },
            { header: 'Inspection Date', key: 'inspection_date' },
            { header: 'Inspector', key: 'inspector_name' },
            { header: 'Condition Index', key: 'condition_index' },
            { header: 'Status', key: 'status' },
          ];
          break;
          
        case 'maintenance':
          const maintRes = await fetch(`${API_URL}/maintenance`, {
            headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
          });
          const maintData = await maintRes.json();
          data = maintData.records || [];
          columns = [
            { header: 'Asset Number', key: 'asset_number' },
            { header: 'Maintenance Type', key: 'maintenance_type' },
            { header: 'Scheduled Date', key: 'scheduled_date' },
            { header: 'Completed Date', key: 'completed_date' },
            { header: 'Status', key: 'status' },
            { header: 'Cost (ZAR)', key: 'actual_cost' },
          ];
          break;
      }

      // Download report
      await downloadReport(format.toLowerCase() as 'pdf' | 'excel' | 'csv', {
        title,
        data,
        columns,
        tenant: {
          organizationName: tenant.organization_name,
          logoUrl: tenant.logo_url,
          primaryColor: tenant.primary_color,
          regionName: tenant.region_name,
          currency: 'ZAR',
        },
        fileName: `${dataType}-export-${new Date().toISOString().split('T')[0]}`,
        includeDate: true,
        includeFooter: true,
      });

      toast.success(`${dataType} exported as ${format}!`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export ${dataType}`);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if user is authenticated
    if (!accessToken) {
      toast.error("Please log in to import data");
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      // Read the file
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Map Excel columns to database fields (flexible mapping)
      const mappedAssets = jsonData.map((row: any) => {
        const mapField = (possibleNames: string[]) => {
          for (const name of possibleNames) {
            if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
              return row[name];
            }
          }
          return null;
        };

        return {
          asset_ref: mapField(['Reference Number', 'Ref No', 'Asset Ref', 'reference_number', 'asset_ref', 'Reference']),
          asset_type_name: mapField(['Asset Type', 'Type', 'asset_type', 'asset_type_name']),
          description: mapField(['Name', 'Description', 'Asset Name', 'name', 'description']),
          installer: mapField(['Installer', 'installer']),
          region: mapField(['Region', 'Depot', 'region', 'depot']),
          road_number: mapField(['Road Number', 'Road No', 'road_number', 'road_no']),
          road_name: mapField(['Road Name', 'road_name']),
          kilometer: mapField(['Kilometer', 'KM', 'kilometer', 'km']),
          latitude: mapField(['Latitude', 'Lat', 'latitude', 'lat']),
          longitude: mapField(['Longitude', 'Long', 'longitude', 'long', 'lng']),
          install_date: mapField(['Install Date', 'Date', 'install_date', 'date']),
          expected_life: mapField(['Expected Life', 'Life', 'expected_life', 'life_years']),
          original_cost: mapField(['Original Cost', 'Cost', 'original_cost', 'cost']),
          notes: mapField(['Notes', 'Remarks', 'notes', 'remarks', 'Comments', 'comments']),
        };
      }).filter((asset) => asset.asset_ref && asset.asset_type_name); // Only include rows with required fields

      if (mappedAssets.length === 0) {
        toast.error("No valid assets found. Please ensure 'Reference Number' and 'Asset Type' columns exist.");
        setImporting(false);
        return;
      }

      // Send to backend
      console.log("Import: Sending request with token:", accessToken ? "present (length: " + accessToken.length + ")" : "MISSING");
      console.log("Import: Token first 20 chars:", accessToken?.substring(0, 20));
      
      const response = await fetch(`${API_URL}/assets/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
        body: JSON.stringify({ assets: mappedAssets }),
      });

      if (response.ok) {
        const result = await response.json();
        setImportResult(result);
        toast.success(`Import complete! ${result.imported || 0} assets imported, ${result.skipped || 0} skipped.`);
        
        // Show detailed errors if any
        if (result.errors && result.errors.length > 0) {
          console.error('Import errors:', result.errors);
          toast.error(`Some errors occurred. Check console for details.`);
        }
      } else {
        const error = await response.json();
        console.error('Import error:', error);
        
        // Handle token expiration
        if (response.status === 401 && (error.error === "Invalid session" || error.message === "Invalid JWT")) {
          toast.error("Your session has expired. Please log in again.");
          logout();
          navigate("/login");
          return;
        }
        
        toast.error(`Import failed: ${error.error || error.details || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error importing file:", error);
      toast.error("Failed to import file. Please check the format and try again.");
    } finally {
      setImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Data Management</h1>
          <p className="text-muted-foreground">Import, export, and manage your asset data</p>
        </div>
        <Link to="/data/seed">
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Seed Database
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="export" className="space-y-6">
        <TabsList>
          <TabsTrigger value="export">Export Data</TabsTrigger>
          <TabsTrigger value="import">Import Data</TabsTrigger>
          <TabsTrigger value="batch">Batch Operations</TabsTrigger>
          <TabsTrigger value="sync">Sync & Backup</TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Export Options</CardTitle>
              <CardDescription>Download your data in various formats</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Assets
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">{dataCounts.assets} records</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="w-full" onClick={() => handleExportData('assets', 'CSV')}>
                        <Download className="w-4 h-4 mr-1" />
                        CSV
                      </Button>
                      <Button size="sm" variant="outline" className="w-full" onClick={() => handleExportData('assets', 'PDF')}>
                        <Download className="w-4 h-4 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-5 h-5 text-success" />
                      Inspections
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">{dataCounts.inspections} records</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="w-full" onClick={() => handleExportData('inspections', 'CSV')}>
                        <Download className="w-4 h-4 mr-1" />
                        CSV
                      </Button>
                      <Button size="sm" variant="outline" className="w-full" onClick={() => handleExportData('inspections', 'PDF')}>
                        <Download className="w-4 h-4 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-5 h-5 text-warning" />
                      Maintenance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">{dataCounts.maintenance} records</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="w-full" onClick={() => handleExportData('maintenance', 'CSV')}>
                        <Download className="w-4 h-4 mr-1" />
                        CSV
                      </Button>
                      <Button size="sm" variant="outline" className="w-full" onClick={() => handleExportData('maintenance', 'PDF')}>
                        <Download className="w-4 h-4 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-dashed">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold mb-1">Full Database Export</h4>
                      <p className="text-sm text-muted-foreground">Download all data in a single archive</p>
                    </div>
                    <Button>
                      <Download className="w-4 h-4 mr-2" />
                      Export All
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          {/* Template Library Banner */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <FileSpreadsheet className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-1 text-blue-900 dark:text-blue-100">
                      Need a template to get started?
                    </h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                      Download pre-formatted Excel templates with example data and instructions. 
                      Much easier than creating your own spreadsheet!
                    </p>
                    <Link to="/data/templates">
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Browse Template Library
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Import Data</CardTitle>
              <CardDescription>Upload data from CSV or Excel files</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!accessToken && (
                <Card className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-700 dark:text-yellow-300" />
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>Authentication Required:</strong> Please log in to import data.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <div className="border-2 border-dashed rounded-lg p-12 text-center hover:border-primary transition-colors cursor-pointer">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">Drag and drop files here</h3>
                <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
                <Button 
                  variant="outline" 
                  onClick={() => document.getElementById('fileInput')?.click()}
                  disabled={importing || !accessToken}
                >
                  {importing ? 'Importing...' : 'Choose File'}
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                  Supports: CSV, XLS, XLSX (Max 10MB)
                </p>
                <input
                  id="fileInput"
                  type="file"
                  accept=".csv, .xls, .xlsx"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={importing || !accessToken}
                />
              </div>

              <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">Import Guidelines</h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                    <li>First row should contain column headers</li>
                    <li>Required fields: Reference Number, Type, Name</li>
                    <li>Dates should be in YYYY-MM-DD format</li>
                    <li>Duplicate reference numbers will be skipped</li>
                  </ul>
                </CardContent>
              </Card>

              {importResult && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      {importResult.imported > 0 ? <CheckCircle className="w-5 h-5 text-success" /> : <AlertCircle className="w-5 h-5 text-danger" />}
                      Import Result
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {importResult.imported} assets imported, {importResult.skipped} skipped.
                    </p>
                    {importResult.errors && importResult.errors.length > 0 && (
                      <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                        <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">Errors:</h4>
                        <ul className="text-xs text-red-800 dark:text-red-200 space-y-1">
                          {importResult.errors.slice(0, 10).map((err: string, idx: number) => (
                            <li key={idx}>{err}</li>
                          ))}
                          {importResult.errors.length > 10 && (
                            <li className="font-semibold">... and {importResult.errors.length - 10} more errors</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Batch Operations</CardTitle>
              <CardDescription>Perform bulk updates on your data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Select Data Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select value={batchDataType} onValueChange={setBatchDataType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select data type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="assets">Assets</SelectItem>
                        <SelectItem value="inspections">Inspections</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Load Records</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button size="sm" variant="outline" onClick={() => setBatchRecords([])}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                    <p className="text-sm text-muted-foreground mt-2">
                      {batchRecords.length} records loaded
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Select Records</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { type: "Asset", count: 3, device: "Mobile Device #1" },
                      { type: "Inspection", count: 5, device: "Mobile Device #2" },
                      { type: "Maintenance", count: 2, device: "Tablet #1" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Database className="w-5 h-5 text-primary" />
                          <div>
                            <p className="font-medium">{item.count} {item.type} records</p>
                            <p className="text-sm text-muted-foreground">{item.device}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">Sync</Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sync & Backup</CardTitle>
              <CardDescription>Synchronize mobile data and manage backups</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Last Sync</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold mb-2">2 hours ago</p>
                    <Badge variant="outline" className="mb-4">All devices synced</Badge>
                    <Button className="w-full">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync Now
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Automatic Backup</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold mb-2">Daily</p>
                    <Badge className="mb-4">Enabled</Badge>
                    <p className="text-sm text-muted-foreground">
                      Next backup: Tomorrow at 2:00 AM
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pending Sync Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { type: "Asset", count: 3, device: "Mobile Device #1" },
                      { type: "Inspection", count: 5, device: "Mobile Device #2" },
                      { type: "Maintenance", count: 2, device: "Tablet #1" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Database className="w-5 h-5 text-primary" />
                          <div>
                            <p className="font-medium">{item.count} {item.type} records</p>
                            <p className="text-sm text-muted-foreground">{item.device}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">Sync</Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}