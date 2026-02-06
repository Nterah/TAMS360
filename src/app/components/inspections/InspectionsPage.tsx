import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../App";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ClipboardCheck, Plus, Calendar, User, FileText, AlertTriangle, TrendingUp, MoreVertical, Eye, Edit, Trash2, Clock, Banknote, Filter, X, LayoutGrid, Table as TableIcon, Search } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from "../ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { useOffline } from "../offline/OfflineContext";
import { InspectionsCacheService } from "../../utils/offlineCache";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { ColumnCustomizer, ColumnConfig } from "../ui/column-customizer";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";

export default function InspectionsPage() {
  const navigate = useNavigate();
  const { user, accessToken } = useContext(AuthContext);
  const { isOnline, hasPendingChanges } = useOffline();
  const [inspections, setInspections] = useState<any[]>([]);
  const [totalInspectionCount, setTotalInspectionCount] = useState<number>(0);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadedFromCache, setLoadedFromCache] = useState(false);

  // View toggle state
  const [viewMode, setViewMode] = useState<"card" | "table">(() => {
    return (localStorage.getItem("inspections-view-mode") as "card" | "table") || "card";
  });

  // Column customization state
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { id: "asset_ref", label: "Asset Reference", visible: true, required: true },
    { id: "inspection_date", label: "Inspection Date", visible: true },
    { id: "inspector_name", label: "Inspector", visible: true },
    { id: "asset_type_name", label: "Asset Type", visible: true },
    { id: "inspection_type", label: "Inspection Type", visible: true },
    { id: "conditional_index", label: "CI Score", visible: true },
    { id: "calculated_urgency", label: "Urgency", visible: true },
    { id: "total_remedial_cost", label: "Remedial Cost", visible: true },
    { id: "finding_summary", label: "Summary", visible: true },
  ]);

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [filterInspector, setFilterInspector] = useState<string>("all");
  const [filterAssetType, setFilterAssetType] = useState<string>("all");
  const [filterUrgency, setFilterUrgency] = useState<string>("all");
  const [filterCIRange, setFilterCIRange] = useState<string>("all");

  // Extract unique inspectors and asset types
  const uniqueInspectors = Array.from(new Set(inspections.map(i => i.inspector_name).filter(Boolean)));
  const uniqueAssetTypes = Array.from(new Set(inspections.map(i => i.asset_type_name).filter(Boolean)));

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  useEffect(() => {
    loadInspections();
    fetchStats();
  }, [isOnline]);

  const loadInspections = async () => {
    // If offline, try to load from cache first
    if (!isOnline) {
      const cached = await InspectionsCacheService.getAll();
      if (cached.length > 0) {
        setInspections(cached);
        setLoadedFromCache(true);
        setLoading(false);
        toast.info("Loaded inspections from offline cache");
        return;
      }
    }

    // Fetch from API
    await fetchInspections();
  };

  const fetchInspections = async () => {
    try {
      const response = await fetch(`${API_URL}/inspections?pageSize=500`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const inspectionsList = data.inspections || [];
        setInspections(inspectionsList);
        setTotalInspectionCount(data.total || 0);
        setLoadedFromCache(false);
        
        // Load more pages if needed (up to 2000 inspections)
        if (data.totalPages > 1) {
          const allInspections = [...inspectionsList];
          for (let page = 2; page <= Math.min(data.totalPages, 4); page++) {
            const pageResponse = await fetch(`${API_URL}/inspections?page=${page}&pageSize=500`, {
              headers: {
                Authorization: `Bearer ${accessToken || publicAnonKey}`,
              },
            });
            if (pageResponse.ok) {
              const pageData = await pageResponse.json();
              allInspections.push(...(pageData.inspections || []));
            }
          }
          setInspections(allInspections);
        }
        
        // Cache for offline use
        if (isOnline) {
          await InspectionsCacheService.setAll(inspectionsList);
        }
      } else {
        // If fetch fails and we're offline, try cache
        if (!isOnline) {
          const cached = await InspectionsCacheService.getAll();
          if (cached.length > 0) {
            setInspections(cached);
            setTotalInspectionCount(cached.length);
            setLoadedFromCache(true);
            toast.info("Loaded inspections from offline cache");
          }
        }
      }
    } catch (error) {
      console.error("Error fetching inspections:", error);
      // Try cache on error
      const cached = await InspectionsCacheService.getAll();
      if (cached.length > 0) {
        setInspections(cached);
        setTotalInspectionCount(cached.length);
        setLoadedFromCache(true);
        toast.info("Loaded inspections from offline cache");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/inspections/stats`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching inspection stats:", error);
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    // Handle both numeric codes ("4","3","2","1","0") and text labels ("Immediate","High","Medium","Low")
    const urgencyMap: Record<string, { label: string; color: string }> = {
      // Numeric codes (legacy/component-level)
      "4": { label: "Immediate", color: "bg-destructive" },
      "3": { label: "High", color: "bg-orange-500" },
      "2": { label: "Medium", color: "bg-yellow-500" },
      "1": { label: "Low", color: "bg-blue-500" },
      "0": { label: "Routine", color: "bg-success" },
      "R": { label: "Record Only", color: "bg-slate-300" },
      "U": { label: "Unable", color: "bg-slate-400" },
      // Text labels (inspection-level from database)
      "Immediate": { label: "Immediate", color: "bg-destructive" },
      "High": { label: "High", color: "bg-orange-500" },
      "Medium": { label: "Medium", color: "bg-yellow-500" },
      "Low": { label: "Low", color: "bg-blue-500" },
    };
    return urgencyMap[urgency] || { label: urgency || "Unknown", color: "bg-slate-500" };
  };

  const getCIBadge = (ci: number | null) => {
    if (ci === null) return { label: "Not Scored", color: "bg-slate-500" };
    // Ensure CI is always between 0-100
    const normalizedCI = Math.min(Math.max(ci, 0), 100);
    if (normalizedCI >= 80) return { label: "Excellent", color: "bg-success" };
    if (normalizedCI >= 60) return { label: "Good", color: "bg-info" };
    if (normalizedCI >= 40) return { label: "Fair", color: "bg-warning" };
    return { label: "Poor", color: "bg-destructive" };
  };

  const handleDeleteInspection = async (inspectionId: string) => {
    if (!confirm("Are you sure you want to delete this inspection?")) return;
    
    try {
      const response = await fetch(`${API_URL}/inspections/${inspectionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        toast.success("Inspection deleted successfully!");
        fetchInspections();
        fetchStats();
      } else {
        toast.error("Failed to delete inspection");
      }
    } catch (error) {
      toast.error("Error deleting inspection");
    }
  };

  // Filter logic
  const filteredInspections = inspections.filter((inspection) => {
    // Search term filter
    const matchesSearch = 
      inspection.asset_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspection.inspector_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspection.asset_type_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspection.finding_summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspection.inspection_type?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (searchTerm && !matchesSearch) return false;

    // Date range filter
    if (filterDateFrom) {
      const inspectionDate = new Date(inspection.inspection_date);
      const fromDate = new Date(filterDateFrom);
      if (inspectionDate < fromDate) return false;
    }
    if (filterDateTo) {
      const inspectionDate = new Date(inspection.inspection_date);
      const toDate = new Date(filterDateTo);
      if (inspectionDate > toDate) return false;
    }

    // Inspector filter
    if (filterInspector !== "all" && inspection.inspector_name !== filterInspector) return false;

    // Asset type filter
    if (filterAssetType !== "all" && inspection.asset_type_name !== filterAssetType) return false;

    // Urgency filter
    if (filterUrgency !== "all") {
      const urgency = inspection.calculated_urgency;
      if (!urgency && filterUrgency !== "none") return false;
      if (filterUrgency === "immediate" && !(urgency === "4" || urgency === "Immediate")) return false;
      if (filterUrgency === "high" && !(urgency === "3" || urgency === "High")) return false;
      if (filterUrgency === "medium" && !(urgency === "2" || urgency === "Medium")) return false;
      if (filterUrgency === "low" && !(urgency === "1" || urgency === "Low" || urgency === "0")) return false;
    }

    // CI Range filter
    if (filterCIRange !== "all") {
      const ci = inspection.conditional_index;
      if (ci === null || ci === undefined) {
        if (filterCIRange !== "not-inspected") return false;
      } else {
        const normalizedCI = Math.min(Math.max(ci, 0), 100);
        if (filterCIRange === "excellent" && normalizedCI < 80) return false;
        if (filterCIRange === "good" && (normalizedCI < 60 || normalizedCI >= 80)) return false;
        if (filterCIRange === "fair" && (normalizedCI < 40 || normalizedCI >= 60)) return false;
        if (filterCIRange === "poor" && normalizedCI >= 40) return false;
      }
    }

    return true;
  });

  const clearAllFilters = () => {
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterInspector("all");
    setFilterAssetType("all");
    setFilterUrgency("all");
    setFilterCIRange("all");
  };

  const activeFilterCount =
    (filterDateFrom ? 1 : 0) +
    (filterDateTo ? 1 : 0) +
    (filterInspector !== "all" ? 1 : 0) +
    (filterAssetType !== "all" ? 1 : 0) +
    (filterUrgency !== "all" ? 1 : 0) +
    (filterCIRange !== "all" ? 1 : 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Asset Inspections</h1>
          <p className="text-muted-foreground">Component-based inspections with Conditional Index scoring and urgency assessment</p>
        </div>
        <Button onClick={() => navigate("/inspections/new")}>
          <Plus className="w-4 h-4 mr-2" />
          New Inspection
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Inspections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalInspectionCount}</div>
            <p className="text-xs text-muted-foreground">All time (across all assets)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.thisMonth || 0}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-success" />
              Recent activity
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Immediate Urgency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {inspections.filter(i => i.calculated_urgency === "Immediate" || i.calculated_urgency === "4").length}
            </div>
            <p className="text-xs text-muted-foreground">Requires immediate action</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Avg CI Final</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {(() => {
                // Use conditional_index from the database view (0-100 range guaranteed)
                const validCIs = inspections.filter(i => i.conditional_index !== null && i.conditional_index !== undefined).map(i => i.conditional_index);
                const avg = validCIs.length > 0 ? validCIs.reduce((a, b) => a + b, 0) / validCIs.length : 0;
                return avg > 0 ? avg.toFixed(0) : "—";
              })()}
            </div>
            <p className="text-xs text-muted-foreground">Overall condition (0-100)</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle>Recent Inspections</CardTitle>
              <CardDescription>{filteredInspections.length} of {inspections.length} inspections • Component-based condition assessment</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <ToggleGroup type="single" value={viewMode} onValueChange={(value) => {
                if (value) {
                  setViewMode(value as "card" | "table");
                  localStorage.setItem("inspections-view-mode", value);
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
                <Input placeholder="Search inspections..." className="pl-8 w-[300px]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
                <h4 className="font-medium">Filter Inspections</h4>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                    <X className="h-3 w-3 mr-1" />
                    Clear all
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Date From Filter */}
                <div className="space-y-2">
                  <Label>Date From</Label>
                  <Input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                  />
                </div>

                {/* Date To Filter */}
                <div className="space-y-2">
                  <Label>Date To</Label>
                  <Input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                  />
                </div>

                {/* Inspector Filter */}
                <div className="space-y-2">
                  <Label>Inspector</Label>
                  <Select value={filterInspector} onValueChange={setFilterInspector}>
                    <SelectTrigger>
                      <SelectValue placeholder="All inspectors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Inspectors</SelectItem>
                      {uniqueInspectors.map((inspector) => (
                        <SelectItem key={inspector} value={inspector}>
                          {inspector}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Asset Type Filter */}
                <div className="space-y-2">
                  <Label>Asset Type</Label>
                  <Select value={filterAssetType} onValueChange={setFilterAssetType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {uniqueAssetTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
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
                      <SelectItem value="not-inspected">Not Scored</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading inspections...</p>
            </div>
          ) : inspections.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No inspections yet. Click "New Inspection" to get started.</p>
            </div>
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
                {filteredInspections.slice(0, 50).map((inspection) => {
                  const normalizedCI = inspection.conditional_index !== null && inspection.conditional_index !== undefined
                    ? inspection.conditional_index
                    : null;
                  const ciBadge = getCIBadge(normalizedCI);
                  const urgencyBadge = getUrgencyBadge(inspection.calculated_urgency);
                  
                  return (
                    <TableRow key={inspection.inspection_id}>
                      {columns.find(c => c.id === "asset_ref")?.visible && (
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {inspection.asset_ref}
                            {hasPendingChanges(inspection.inspection_id) && (
                              <Badge variant="outline" className="gap-1">
                                <Clock className="w-3 h-3" />
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {columns.find(c => c.id === "inspection_date")?.visible && (
                        <TableCell>
                          {new Date(inspection.inspection_date).toLocaleDateString()}
                        </TableCell>
                      )}
                      {columns.find(c => c.id === "inspector_name")?.visible && (
                        <TableCell>{inspection.inspector_name || "Unknown"}</TableCell>
                      )}
                      {columns.find(c => c.id === "asset_type_name")?.visible && (
                        <TableCell>
                          <Badge variant="outline">{inspection.asset_type_name}</Badge>
                        </TableCell>
                      )}
                      {columns.find(c => c.id === "inspection_type")?.visible && (
                        <TableCell>{inspection.inspection_type || "—"}</TableCell>
                      )}
                      {columns.find(c => c.id === "conditional_index")?.visible && (
                        <TableCell>
                          {normalizedCI !== null ? (
                            <Badge className={ciBadge.color}>
                              {normalizedCI.toFixed(0)}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Not Scored</Badge>
                          )}
                        </TableCell>
                      )}
                      {columns.find(c => c.id === "calculated_urgency")?.visible && (
                        <TableCell>
                          {inspection.calculated_urgency ? (
                            <Badge className={urgencyBadge.color}>
                              {urgencyBadge.label}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      )}
                      {columns.find(c => c.id === "total_remedial_cost")?.visible && (
                        <TableCell>
                          {inspection.total_remedial_cost > 0 
                            ? `R ${inspection.total_remedial_cost.toLocaleString()}`
                            : "—"}
                        </TableCell>
                      )}
                      {columns.find(c => c.id === "finding_summary")?.visible && (
                        <TableCell className="max-w-xs truncate">
                          {inspection.finding_summary || "—"}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/inspections/${inspection.inspection_id}`)}
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
                              <DropdownMenuItem onClick={() => navigate(`/inspections/${inspection.inspection_id}/edit`)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Update
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteInspection(inspection.inspection_id)}
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
            // CARD VIEW (existing)
            <div className="space-y-4">
              {filteredInspections.slice(0, 20).map((inspection) => {
                // Use ci_final from new view (already normalized 0-100)
                const normalizedCI = inspection.conditional_index !== null && inspection.conditional_index !== undefined
                  ? inspection.conditional_index
                  : null;
                return (
                  <div key={inspection.inspection_id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <ClipboardCheck className="w-10 h-10 text-primary flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{inspection.asset_ref}</h4>
                          {hasPendingChanges(inspection.inspection_id) && (
                            <Badge variant="outline" className="gap-1">
                              <Clock className="w-3 h-3" />
                              Pending Sync
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {normalizedCI !== null && (
                            <Badge className={getCIBadge(normalizedCI).color}>
                              CI: {normalizedCI.toFixed(0)}
                            </Badge>
                          )}
                          {inspection.calculated_urgency && (
                            <Badge className={getUrgencyBadge(inspection.calculated_urgency).color}>
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {getUrgencyBadge(inspection.calculated_urgency).label}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                        <p className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {inspection.inspector_name || "Unknown"}
                        </p>
                        <p className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {new Date(inspection.inspection_date).toLocaleDateString()}
                        </p>
                        {inspection.inspection_type && (
                          <p className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            {inspection.inspection_type}
                          </p>
                        )}
                      </div>
                      {inspection.finding_summary && (
                        <p className="text-sm flex items-start gap-2">
                          <FileText className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{inspection.finding_summary}</span>
                        </p>
                      )}
                      {inspection.total_remedial_cost > 0 && (
                        <p className="text-sm font-semibold text-orange-700 bg-orange-50 px-2 py-1 rounded inline-flex items-center gap-1">
                          <Banknote className="w-4 h-4" />
                          Remedial Cost: R {inspection.total_remedial_cost.toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/inspections/${inspection.inspection_id}`);
                        }}
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
                          <DropdownMenuItem onClick={() => navigate(`/inspections/${inspection.inspection_id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/inspections/${inspection.inspection_id}/edit`)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Update
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteInspection(inspection.inspection_id)}
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