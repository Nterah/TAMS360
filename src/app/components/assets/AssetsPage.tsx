import { useState, useEffect, useContext } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../../App";
import { 
  Plus, Search, LayoutGrid, List, Download, Upload, Settings2, Filter, 
  Database, MapPin, TrendingUp, CheckCircle2, AlertTriangle, Clock, 
  Banknote, Eye, Edit, Trash2, MoreVertical, X, Table as TableIcon
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { ColumnCustomizer, ColumnConfig } from "../ui/column-customizer";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import EnhancedAssetForm from "./EnhancedAssetForm";
import { requiresMigration, handleMigrationRequired } from "../../utils/migrationHelper";

const ASSET_TYPES = [
  "Signage",
  "Guardrail",
  "Traffic Signal",
  "Gantry",
  "Fence",
  "Safety Barrier",
  "Guidepost",
  "Road Marking",
  "Raised Road Marker",
];

const CONDITIONS = ["Excellent", "Good", "Fair", "Poor"];
const STATUSES = ["Active", "Inactive", "Needs Maintenance", "Scheduled for Replacement"];

export default function AssetsPage() {
  const { accessToken } = useContext(AuthContext);
  const [assets, setAssets] = useState<any[]>([]);
  const [totalAssetCount, setTotalAssetCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // View toggle state
  const [viewMode, setViewMode] = useState<"card" | "table">(() => {
    return (localStorage.getItem("assets-view-mode") as "card" | "table") || "table";
  });

  // Column customization state
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { id: "asset_ref", label: "Asset Reference", visible: true, required: true },
    { id: "asset_type", label: "Type", visible: true },
    { id: "description", label: "Description", visible: true },
    { id: "location", label: "Location", visible: true },
    { id: "install_date", label: "Installed", visible: true },
    { id: "ci_score", label: "CI Score", visible: true },
    { id: "urgency", label: "Urgency", visible: true },
    { id: "remaining_life", label: "Remaining Life", visible: true },
    { id: "valuation", label: "Valuation", visible: true },
    { id: "region", label: "Region", visible: true },
    { id: "depot", label: "Depot", visible: false },
    { id: "status", label: "Status", visible: false },
    { id: "installer", label: "Installer", visible: false },
    { id: "owner", label: "Owner", visible: false },
  ]);

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filterAssetType, setFilterAssetType] = useState<string>("all");
  const [filterRegion, setFilterRegion] = useState<string>("all");
  const [filterDepot, setFilterDepot] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCIRange, setFilterCIRange] = useState<string>("all");
  const [filterUrgency, setFilterUrgency] = useState<string>("all");
  const [filterDataQuality, setFilterDataQuality] = useState<boolean>(false);

  // Extract unique regions and depots from assets
  const uniqueRegions = Array.from(new Set(assets.map(a => a.region).filter(Boolean)));
  const uniqueDepots = Array.from(new Set(assets.map(a => a.depot).filter(Boolean)));

  const [newAsset, setNewAsset] = useState({
    referenceNumber: "",
    type: "",
    name: "",
    installer: "",
    region: "",
    depot: "",
    roadNumber: "",
    roadName: "",
    kilometer: "",
    installDate: "",
    condition: "Good",
    status: "Active",
    expectedLife: "",
    notes: "",
    latitude: "",
    longitude: "",
    owner: "",
    responsibleParty: "",
    replacementValue: "",
    installationCost: "",
  });

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  useEffect(() => {
    fetchAssets();
  }, []);

  // Read URL parameters and apply filters
  useEffect(() => {
    const ciRange = searchParams.get('ciRange');
    const urgency = searchParams.get('urgency');
    const dataQuality = searchParams.get('dataQuality');
    
    console.log('[AssetsPage] URL Params - ciRange:', ciRange, 'urgency:', urgency, 'dataQuality:', dataQuality);
    
    if (ciRange) {
      console.log('[AssetsPage] Setting filterCIRange to:', ciRange);
      setFilterCIRange(ciRange);
      setShowFilters(true);
    }
    if (urgency) {
      console.log('[AssetsPage] Setting filterUrgency to:', urgency);
      setFilterUrgency(urgency);
      setShowFilters(true);
    }
    if (dataQuality === 'true') {
      console.log('[AssetsPage] Setting filterDataQuality to: true');
      setFilterDataQuality(true);
      setShowFilters(true);
    }
  }, [searchParams]);

  const fetchAssets = async () => {
    try {
      // Fetch first page with count
      const response = await fetch(`${API_URL}/assets?pageSize=500`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAssets(data.assets || []);
        setTotalAssetCount(data.total || 0);
        
        // Load more pages if needed (up to 2000 assets for table display)
        if (data.totalPages > 1) {
          const allAssets = [...(data.assets || [])];
          for (let page = 2; page <= Math.min(data.totalPages, 4); page++) {
            const pageResponse = await fetch(`${API_URL}/assets?page=${page}&pageSize=500`, {
              headers: {
                Authorization: `Bearer ${accessToken || publicAnonKey}`,
              },
            });
            if (pageResponse.ok) {
              const pageData = await pageResponse.json();
              allAssets.push(...(pageData.assets || []));
            }
          }
          setAssets(allAssets);
        }
      }
    } catch (error) {
      console.error("Error fetching assets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAsset = async () => {
    try {
      const response = await fetch(`${API_URL}/assets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ...newAsset,
          uniqueId: `${newAsset.type.substring(0, 2).toUpperCase()}-${Date.now()}`,
        }),
      });

      if (response.ok) {
        toast.success("Asset created successfully!");
        setIsAddDialogOpen(false);
        fetchAssets();
        // Reset form
        setNewAsset({
          referenceNumber: "",
          type: "",
          name: "",
          installer: "",
          region: "",
          depot: "",
          roadNumber: "",
          roadName: "",
          kilometer: "",
          installDate: "",
          condition: "Good",
          status: "Active",
          expectedLife: "",
          notes: "",
          latitude: "",
          longitude: "",
          owner: "",
          responsibleParty: "",
          replacementValue: "",
          installationCost: "",
        });
      } else {
        toast.error("Failed to create asset");
      }
    } catch (error) {
      toast.error("Error creating asset");
    }
  };

  const filteredAssets = assets.filter((asset) => {
    // Search term filter
    const matchesSearch =
      asset.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.asset_type_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.asset_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.road_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.road_number?.toLowerCase().includes(searchTerm.toLowerCase());

    // Asset type filter
    const matchesAssetType =
      filterAssetType === "all" || asset.asset_type_name === filterAssetType;

    // Region filter
    const matchesRegion = filterRegion === "all" || asset.region === filterRegion;

    // Depot filter
    const matchesDepot = filterDepot === "all" || asset.depot === filterDepot;

    // Status filter
    const matchesStatus = filterStatus === "all" || asset.status === filterStatus;

    // CI Range filter
    const matchesCIRange = (() => {
      if (filterCIRange === "all") return true;
      const ci = asset.latest_ci;
      if (ci === null || ci === undefined) return filterCIRange === "not-inspected";
      const normalizedCI = Math.min(Math.max(ci, 0), 100);
      if (filterCIRange === "excellent") return normalizedCI >= 80;
      if (filterCIRange === "good") return normalizedCI >= 60 && normalizedCI < 80;
      if (filterCIRange === "fair") return normalizedCI >= 40 && normalizedCI < 60;
      if (filterCIRange === "poor") return normalizedCI < 40;
      return true;
    })();

    // Urgency filter
    const matchesUrgency = (() => {
      if (filterUrgency === "all") return true;
      const urgency = asset.latest_urgency;
      if (!urgency) return filterUrgency === "none";
      if (filterUrgency === "immediate") return urgency === "4" || urgency === "Immediate";
      if (filterUrgency === "high") return urgency === "3" || urgency === "High";
      if (filterUrgency === "medium") return urgency === "2" || urgency === "Medium";
      if (filterUrgency === "low") return urgency === "1" || urgency === "Low" || urgency === "0";
      return true;
    })();

    // Data Quality filter - check for missing critical fields
    const matchesDataQuality = (() => {
      if (!filterDataQuality) return true;
      // Return true if asset has ANY data quality issues
      return (
        !asset.gps_lat || 
        !asset.gps_lng || 
        !asset.asset_type_name || 
        !asset.depot_name || 
        !asset.region_name || 
        !asset.road_name || 
        !asset.owner_name || 
        !asset.responsible_party_name
      );
    })();

    return (
      matchesSearch &&
      matchesAssetType &&
      matchesRegion &&
      matchesDepot &&
      matchesStatus &&
      matchesCIRange &&
      matchesUrgency &&
      matchesDataQuality
    );
  });

  // Log filtering results when filters change
  useEffect(() => {
    if (filterCIRange !== "all" || filterUrgency !== "all") {
      console.log('[AssetsPage] Filtering -', {
        totalAssets: assets.length,
        filteredAssets: filteredAssets.length,
        filterCIRange,
        filterUrgency,
        sampleAssets: assets.slice(0, 3).map(a => ({
          ref: a.asset_ref,
          ci: a.latest_ci,
          urgency: a.latest_urgency
        }))
      });
    }
  }, [assets.length, filteredAssets.length, filterCIRange, filterUrgency]);

  const clearAllFilters = () => {
    setFilterAssetType("all");
    setFilterRegion("all");
    setFilterDepot("all");
    setFilterStatus("all");
    setFilterCIRange("all");
    setFilterUrgency("all");
    setFilterDataQuality(false);
  };

  const activeFilterCount =
    (filterAssetType !== "all" ? 1 : 0) +
    (filterRegion !== "all" ? 1 : 0) +
    (filterDepot !== "all" ? 1 : 0) +
    (filterStatus !== "all" ? 1 : 0) +
    (filterCIRange !== "all" ? 1 : 0) +
    (filterUrgency !== "all" ? 1 : 0) +
    (filterDataQuality ? 1 : 0);

  const getCIBadge = (ci: number | null) => {
    if (ci === null || ci === undefined) return { label: "Not Inspected", variant: "outline" as const };
    // Ensure CI is always between 0-100
    const normalizedCI = Math.min(Math.max(ci, 0), 100);
    if (normalizedCI >= 80) return { label: "Excellent", variant: "default" as const };
    if (normalizedCI >= 60) return { label: "Good", variant: "secondary" as const };
    if (normalizedCI >= 40) return { label: "Fair", variant: "outline" as const };
    return { label: "Poor", variant: "destructive" as const };
  };

  const handleViewAsset = (assetId: string) => {
    navigate(`/assets/${assetId}`);
  };

  const handleEditAsset = (assetId: string) => {
    navigate(`/assets/${assetId}/edit`);
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;
    
    try {
      const response = await fetch(`${API_URL}/assets/${assetId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        toast.success("Asset deleted successfully!");
        fetchAssets();
      } else {
        toast.error("Failed to delete asset");
      }
    } catch (error) {
      toast.error("Error deleting asset");
    }
  };

  // Calculate statistics
  const totalValuation = assets.reduce((sum, asset) => sum + (asset.replacement_value || 0), 0);
  const poorConditionAssets = assets.filter(asset => {
    const ci = asset.latest_ci;
    return ci !== null && ci < 40;
  }).length;
  const excellentConditionAssets = assets.filter(asset => {
    const ci = asset.latest_ci;
    return ci !== null && ci !== undefined && ci >= 80;
  }).length;
  const needsAttention = assets.filter(asset => {
    const urgency = asset.latest_urgency;
    return urgency === "Immediate" || urgency === "Critical" || urgency === "High";
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl">Assets</h2>
          <p className="text-muted-foreground">Manage road infrastructure assets</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/assets/map')}>
            <MapPin className="mr-2 h-4 w-4" />
            Map View
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Asset
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Asset</DialogTitle>
                <DialogDescription>Create a new infrastructure asset in the system</DialogDescription>
              </DialogHeader>
              <EnhancedAssetForm
                onSubmit={async (assetData) => {
                  try {
                    // Show loading state
                    toast.loading("Creating asset...", { id: "create-asset" });

                    // Create abort controller with timeout
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

                    const response = await fetch(`${API_URL}/assets`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${accessToken}`,
                      },
                      body: JSON.stringify({
                        ...assetData,
                        uniqueId: `${assetData.type.substring(0, 2).toUpperCase()}-${Date.now()}`,
                      }),
                      signal: controller.signal,
                    });

                    clearTimeout(timeoutId);

                    if (response.ok) {
                      const result = await response.json();
                      toast.success("Asset created successfully!", { id: "create-asset" });
                      setIsAddDialogOpen(false);
                      fetchAssets();
                    } else {
                      const error = await response.json().catch(() => ({ error: "Unknown error" }));
                      console.error("Asset creation failed:", error);
                      
                      // Check if migration is required
                      if (requiresMigration(error)) {
                        toast.dismiss("create-asset");
                        handleMigrationRequired(navigate);
                        return;
                      }
                      
                      toast.error(`Failed to create asset: ${error.error || "Unknown error"}`, { id: "create-asset" });
                    }
                  } catch (error: any) {
                    console.error("Error creating asset:", error);
                    if (error.name === 'AbortError') {
                      toast.error("Request timed out. The server is taking too long to respond.", { id: "create-asset" });
                    } else if (error.message?.includes('Failed to fetch')) {
                      toast.error("Network error. Please check your internet connection.", { id: "create-asset" });
                    } else {
                      toast.error(`Error creating asset: ${error.message || "Unknown error"}`, { id: "create-asset" });
                    }
                  }
                }}
                onCancel={() => setIsAddDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalAssetCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Database className="w-3 h-3" />
              Across all types
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Valuation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">R {(totalValuation / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Replacement value
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Excellent Condition</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{excellentConditionAssets}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              CI Score ≥ 80
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Needs Attention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{needsAttention}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              High urgency
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Asset Inventory</CardTitle>
              <CardDescription>
                {loading ? "Loading..." : `${filteredAssets.length} of ${totalAssetCount} assets`} • View and manage all infrastructure assets
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <ToggleGroup type="single" value={viewMode} onValueChange={(value) => {
                if (value) {
                  setViewMode(value as "card" | "table");
                  localStorage.setItem("assets-view-mode", value);
                }
              }}>
                <ToggleGroupItem value="card" aria-label="Card view">
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="table" aria-label="Table view">
                  <TableIcon className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>

              {/* Column Customizer (only in table view) */}
              {viewMode === "table" && (
                <ColumnCustomizer columns={columns} onColumnsChange={setColumns} />
              )}

              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search assets..." className="pl-8 w-[300px]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 p-4 border rounded-lg bg-muted/30 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Filter Assets</h4>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                    <X className="h-3 w-3 mr-1" />
                    Clear all
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Asset Type Filter */}
                <div className="space-y-2">
                  <Label>Asset Type</Label>
                  <Select value={filterAssetType} onValueChange={setFilterAssetType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {ASSET_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Region Filter */}
                <div className="space-y-2">
                  <Label>Region</Label>
                  <Select value={filterRegion} onValueChange={setFilterRegion}>
                    <SelectTrigger>
                      <SelectValue placeholder="All regions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Regions</SelectItem>
                      {uniqueRegions.map((region) => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Depot Filter */}
                <div className="space-y-2">
                  <Label>Depot</Label>
                  <Select value={filterDepot} onValueChange={setFilterDepot}>
                    <SelectTrigger>
                      <SelectValue placeholder="All depots" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Depots</SelectItem>
                      {uniqueDepots.map((depot) => (
                        <SelectItem key={depot} value={depot}>
                          {depot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* CI Range Filter */}
                <div className="space-y-2">
                  <Label>CI Range</Label>
                  <Select value={filterCIRange} onValueChange={setFilterCIRange}>
                    <SelectTrigger>
                      <SelectValue placeholder="All ranges" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Ranges</SelectItem>
                      <SelectItem value="excellent">Excellent (80-100)</SelectItem>
                      <SelectItem value="good">Good (60-79)</SelectItem>
                      <SelectItem value="fair">Fair (40-59)</SelectItem>
                      <SelectItem value="poor">Poor (0-39)</SelectItem>
                      <SelectItem value="not-inspected">Not Inspected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Urgency Filter */}
                <div className="space-y-2">
                  <Label>Urgency</Label>
                  <Select value={filterUrgency} onValueChange={setFilterUrgency}>
                    <SelectTrigger>
                      <SelectValue placeholder="All urgencies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Urgencies</SelectItem>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low / Routine</SelectItem>
                      <SelectItem value="none">No Urgency Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Data Quality Filter */}
                <div className="space-y-2">
                  <Label>Data Quality</Label>
                  <Select value={filterDataQuality ? "true" : "false"} onValueChange={(value) => setFilterDataQuality(value === "true")}>
                    <SelectTrigger>
                      <SelectValue placeholder="All data quality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">All Data Quality</SelectItem>
                      <SelectItem value="true">Poor Data Quality</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading assets...</div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No assets found</div>
          ) : viewMode === "table" ? (
            // TABLE VIEW
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.filter(col => col.visible).map(col => (
                    <TableHead key={col.id}>{col.label}</TableHead>
                  ))}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssets.map((asset, index) => {
                  const ciBadge = getCIBadge(asset.latest_ci);
                  return (
                    <TableRow key={`${asset.asset_id}-${index}`}>
                      {columns.find(c => c.id === "asset_ref")?.visible && (
                        <TableCell className="font-medium">{asset.asset_ref || "N/A"}</TableCell>
                      )}
                      {columns.find(c => c.id === "asset_type")?.visible && (
                        <TableCell>
                          <Badge variant="outline">{asset.asset_type_name || "Unknown"}</Badge>
                        </TableCell>
                      )}
                      {columns.find(c => c.id === "description")?.visible && (
                        <TableCell>{asset.description || "No description"}</TableCell>
                      )}
                      {columns.find(c => c.id === "location")?.visible && (
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3" />
                            {asset.road_number || asset.road_name ? (
                              <>
                                {asset.road_number && <span>{asset.road_number}</span>}
                                {asset.road_name && <span className="text-muted-foreground">({asset.road_name})</span>}
                                {asset.km_marker !== null && <span className="text-muted-foreground">KM {asset.km_marker}</span>}
                              </>
                            ) : (
                              "No location"
                            )}
                          </div>
                        </TableCell>
                      )}
                      {columns.find(c => c.id === "install_date")?.visible && (
                        <TableCell>{asset.install_date ? new Date(asset.install_date).toLocaleDateString() : "N/A"}</TableCell>
                      )}
                      {columns.find(c => c.id === "ci_score")?.visible && (
                        <TableCell>
                          <Badge variant={ciBadge.variant}>
                            {asset.latest_ci !== null ? Math.min(Math.max(asset.latest_ci, 0), 100).toFixed(0) : ciBadge.label}
                          </Badge>
                        </TableCell>
                      )}
                      {columns.find(c => c.id === "urgency")?.visible && (
                        <TableCell>
                          {asset.latest_urgency ? (
                            <Badge
                              variant={
                                asset.latest_urgency === "4" || asset.latest_urgency === "Immediate"
                                  ? "destructive"
                                  : asset.latest_urgency === "3" || asset.latest_urgency === "High"
                                  ? "default"
                                  : asset.latest_urgency === "2" || asset.latest_urgency === "Medium"
                                  ? "secondary"
                                  : asset.latest_urgency === "1" || asset.latest_urgency === "Low" || asset.latest_urgency === "0"
                                  ? "outline"
                                  : "outline"
                              }
                            >
                              {asset.latest_urgency}
                            </Badge>
                          ) : (
                            "N/A"
                          )}
                        </TableCell>
                      )}
                      {columns.find(c => c.id === "remaining_life")?.visible && (
                        <TableCell>
                          {asset.remaining_life_years !== undefined && asset.remaining_life_years !== null ? (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-[#39AEDF]" />
                              <Badge
                                variant={
                                  asset.remaining_life_years < 2
                                    ? "destructive"
                                    : asset.remaining_life_years < 5
                                    ? "default"
                                    : asset.remaining_life_years < 10
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {asset.remaining_life_years.toFixed(1)} yrs
                              </Badge>
                            </div>
                          ) : (
                            "N/A"
                          )}
                        </TableCell>
                      )}
                      {columns.find(c => c.id === "valuation")?.visible && (
                        <TableCell>
                          {asset.replacement_value ? (
                            <div className="flex items-center gap-2">
                              <Banknote className="w-4 h-4 text-[#5DB32A]" />
                              <span className="font-medium">R {asset.replacement_value.toLocaleString()}</span>
                            </div>
                          ) : (
                            "N/A"
                          )}
                        </TableCell>
                      )}
                      {columns.find(c => c.id === "region")?.visible && (
                        <TableCell>{asset.region || "—"}</TableCell>
                      )}
                      {columns.find(c => c.id === "depot")?.visible && (
                        <TableCell>{asset.depot || "—"}</TableCell>
                      )}
                      {columns.find(c => c.id === "status")?.visible && (
                        <TableCell>
                          {asset.status_name ? <Badge variant="secondary">{asset.status_name}</Badge> : "—"}
                        </TableCell>
                      )}
                      {columns.find(c => c.id === "installer")?.visible && (
                        <TableCell>{asset.installer_name || asset.installer_id || "—"}</TableCell>
                      )}
                      {columns.find(c => c.id === "owner")?.visible && (
                        <TableCell>{asset.owned_by || "—"}</TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewAsset(asset.asset_id)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditAsset(asset.asset_id)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Update
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteAsset(asset.asset_id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            // CARD VIEW
            <div className="space-y-4">
              {filteredAssets.slice(0, 50).map((asset, index) => {
                const ciBadge = getCIBadge(asset.latest_ci);
                return (
                  <div key={`${asset.asset_id}-${index}`} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <Database className="w-10 h-10 text-primary flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{asset.asset_ref || "N/A"}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{asset.asset_type_name || "Unknown"}</Badge>
                          <Badge variant={ciBadge.variant}>
                            CI: {asset.latest_ci !== null ? Math.min(Math.max(asset.latest_ci, 0), 100).toFixed(0) : "N/A"}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{asset.description || "No description"}</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                        <p className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {asset.road_number || asset.road_name ? (
                            <>
                              {asset.road_number && <span>{asset.road_number}</span>}
                              {asset.road_name && <span>({asset.road_name})</span>}
                            </>
                          ) : (
                            "No location"
                          )}
                        </p>
                        {asset.install_date && (
                          <p>Installed: {new Date(asset.install_date).toLocaleDateString()}</p>
                        )}
                        {asset.replacement_value && (
                          <p>Value: R {asset.replacement_value.toLocaleString()}</p>
                        )}
                      </div>
                      {(asset.region || asset.depot || asset.status) && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {asset.region && <Badge variant="secondary">{asset.region}</Badge>}
                          {asset.depot && <Badge variant="secondary">{asset.depot}</Badge>}
                          {asset.status && <Badge variant="outline">{asset.status}</Badge>}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleViewAsset(asset.asset_id)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditAsset(asset.asset_id)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Update
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteAsset(asset.asset_id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}