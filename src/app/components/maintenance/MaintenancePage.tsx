import { useState, useEffect, useContext } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../../App";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Wrench, Plus, TrendingUp, Calendar, User, Filter, X, Banknote, LayoutGrid, Table as TableIcon, Eye, Edit, Trash2, MoreVertical, Search } from "lucide-react";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { ColumnCustomizer, ColumnConfig } from "../ui/column-customizer";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { toast } from "sonner";

export default function MaintenancePage() {
  const navigate = useNavigate();
  const { user, accessToken } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const [maintenanceRecords, setMaintenanceRecords] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // View toggle state
  const [viewMode, setViewMode] = useState<"card" | "table">(() => {
    return (localStorage.getItem("maintenance-view-mode") as "card" | "table") || "card";
  });

  // Column customization state
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { id: "asset_ref", label: "Asset Reference", visible: true, required: true },
    { id: "maintenance_type", label: "Type", visible: true },
    { id: "scheduled_date", label: "Scheduled Date", visible: true },
    { id: "status", label: "Status", visible: true },
    { id: "technician_name", label: "Technician", visible: true },
    { id: "priority", label: "Priority", visible: true },
    { id: "cost", label: "Cost", visible: true },
    { id: "description", label: "Description", visible: false },
  ]);

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [filterAssetType, setFilterAssetType] = useState<string>("all");
  const [filterTechnician, setFilterTechnician] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  // Extract unique values for filters
  const uniqueAssetTypes = Array.from(new Set(maintenanceRecords.map(m => m.asset_type_name).filter(Boolean)));
  const uniqueTechnicians = Array.from(new Set(maintenanceRecords.map(m => m.technician_name).filter(Boolean)));

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  useEffect(() => {
    fetchMaintenanceRecords();
    fetchStats();
  }, []);

  // Read URL parameters and apply filters
  useEffect(() => {
    const status = searchParams.get('status');
    
    if (status) {
      // Status can be a comma-separated list like "pending,in_progress,scheduled"
      const statuses = status.split(',');
      // For now, just set the first one (we could enhance this to handle multiple)
      if (statuses.length === 1) {
        // Map dashboard status to maintenance status format
        const statusMap: Record<string, string> = {
          'pending': 'Scheduled',
          'in_progress': 'In Progress',
          'scheduled': 'Scheduled'
        };
        const mappedStatus = statusMap[statuses[0].toLowerCase()] || statuses[0];
        setFilterStatus(mappedStatus);
        setShowFilters(true);
      } else {
        // Multiple statuses - just show all matching records
        setShowFilters(true);
      }
    }
  }, [searchParams]);

  const fetchMaintenanceRecords = async () => {
    try {
      const response = await fetch(`${API_URL}/maintenance`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Maintenance records fetched:", data.records?.length || 0, "records");
        setMaintenanceRecords(data.records || []);
      } else {
        const errorData = await response.json();
        console.error("❌ Failed to fetch maintenance records. Status:", response.status, "Error:", errorData);
      }
    } catch (error) {
      console.error("Error fetching maintenance records:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/maintenance/stats`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching maintenance stats:", error);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "Completed":
        return "default";
      case "In Progress":
        return "secondary";
      case "Overdue":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Filter logic
  const filteredRecords = maintenanceRecords.filter((record) => {
    // Search term filter
    const matchesSearch = 
      record.asset_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.maintenance_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.technician_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.asset_type_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (searchTerm && !matchesSearch) return false;

    // Status filter
    if (filterStatus !== "all" && record.status !== filterStatus) return false;

    // Date range filter
    if (filterDateFrom) {
      const recordDate = new Date(record.scheduled_date);
      const fromDate = new Date(filterDateFrom);
      if (recordDate < fromDate) return false;
    }
    if (filterDateTo) {
      const recordDate = new Date(record.scheduled_date);
      const toDate = new Date(filterDateTo);
      if (recordDate > toDate) return false;
    }

    // Asset type filter
    if (filterAssetType !== "all" && record.asset_type_name !== filterAssetType) return false;

    // Technician filter
    if (filterTechnician !== "all" && record.technician_name !== filterTechnician) return false;

    // Priority filter
    if (filterPriority !== "all" && record.priority !== filterPriority) return false;

    return true;
  });

  const clearAllFilters = () => {
    setFilterStatus("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterAssetType("all");
    setFilterTechnician("all");
    setFilterPriority("all");
  };

  const activeFilterCount =
    (filterStatus !== "all" ? 1 : 0) +
    (filterDateFrom ? 1 : 0) +
    (filterDateTo ? 1 : 0) +
    (filterAssetType !== "all" ? 1 : 0) +
    (filterTechnician !== "all" ? 1 : 0) +
    (filterPriority !== "all" ? 1 : 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Maintenance Records</h1>
          <p className="text-muted-foreground">Track and manage asset maintenance activities</p>
        </div>
        <Button onClick={() => navigate("/maintenance/new")}>
          <Plus className="w-4 h-4 mr-2" />
          Log Maintenance
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5 lg:grid-cols-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.scheduled || 0}</div>
            <p className="text-xs text-muted-foreground">Next 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">{stats?.inProgress || 0}</div>
            <p className="text-xs text-muted-foreground">Active tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{stats?.completed || 0}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{stats?.overdue || 0}</div>
            <p className="text-xs text-muted-foreground">Past due date</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cancelled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-muted-foreground">{stats?.cancelled || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle>Maintenance History</CardTitle>
              <CardDescription>{filteredRecords.length} of {maintenanceRecords.length} records • Recent maintenance activities</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <ToggleGroup type="single" value={viewMode} onValueChange={(value) => {
                if (value) {
                  setViewMode(value as "card" | "table");
                  localStorage.setItem("maintenance-view-mode", value);
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
                <Input placeholder="Search maintenance..." className="pl-8 w-[300px]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
                <h4 className="font-medium">Filter Maintenance Records</h4>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                    <X className="h-3 w-3 mr-1" />
                    Clear all
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Status Filter */}
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Scheduled">Scheduled</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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

                {/* Technician Filter */}
                <div className="space-y-2">
                  <Label>Assigned To</Label>
                  <Select value={filterTechnician} onValueChange={setFilterTechnician}>
                    <SelectTrigger>
                      <SelectValue placeholder="All technicians" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Technicians</SelectItem>
                      {uniqueTechnicians.map((tech) => (
                        <SelectItem key={tech} value={tech}>
                          {tech}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority Filter */}
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger>
                      <SelectValue placeholder="All priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
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
              <p className="text-muted-foreground">Loading maintenance records...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wrench className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No maintenance records yet. Click "Log Maintenance" to get started.</p>
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
                {filteredRecords.slice(0, 50).map((maintenance) => (
                  <TableRow key={maintenance.maintenance_id}>
                    {columns.find(c => c.id === "asset_ref")?.visible && (
                      <TableCell className="font-medium">{maintenance.asset_ref || "Unknown"}</TableCell>
                    )}
                    {columns.find(c => c.id === "maintenance_type")?.visible && (
                      <TableCell>{maintenance.maintenance_type || "—"}</TableCell>
                    )}
                    {columns.find(c => c.id === "scheduled_date")?.visible && (
                      <TableCell>
                        {maintenance.scheduled_date 
                          ? new Date(maintenance.scheduled_date).toLocaleDateString()
                          : "—"}
                      </TableCell>
                    )}
                    {columns.find(c => c.id === "status")?.visible && (
                      <TableCell>
                        <Badge variant={getStatusVariant(maintenance.status)}>
                          {maintenance.status}
                        </Badge>
                      </TableCell>
                    )}
                    {columns.find(c => c.id === "technician_name")?.visible && (
                      <TableCell>{maintenance.technician_name || "—"}</TableCell>
                    )}
                    {columns.find(c => c.id === "priority")?.visible && (
                      <TableCell>
                        {maintenance.priority ? (
                          <Badge variant="secondary">{maintenance.priority}</Badge>
                        ) : "—"}
                      </TableCell>
                    )}
                    {columns.find(c => c.id === "cost")?.visible && (
                      <TableCell>
                        {maintenance.cost 
                          ? `R ${maintenance.cost.toLocaleString()}`
                          : "—"}
                      </TableCell>
                    )}
                    {columns.find(c => c.id === "description")?.visible && (
                      <TableCell className="max-w-xs truncate">
                        {maintenance.description || "—"}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/maintenance/${maintenance.maintenance_id}`)}
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
                            <DropdownMenuItem onClick={() => {/* Handle edit */}}>
                              <Edit className="h-4 w-4 mr-2" />
                              Update
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => {/* Handle delete */}}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            // CARD VIEW (existing)
            <div className="space-y-4">
              {filteredRecords.slice(0, 10).map((maintenance) => (
                <div key={maintenance.maintenance_id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <Wrench className="w-10 h-10 text-primary flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{maintenance.asset_ref || "Unknown Asset"}</h4>
                        <p className="text-sm text-muted-foreground">{maintenance.maintenance_type}</p>
                      </div>
                      <Badge variant={getStatusVariant(maintenance.status)}>
                        {maintenance.status}
                      </Badge>
                    </div>
                    {maintenance.description && (
                      <p className="text-sm">{maintenance.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {maintenance.scheduled_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(maintenance.scheduled_date).toLocaleDateString()}
                        </span>
                      )}
                      {maintenance.technician_name && (
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {maintenance.technician_name}
                        </span>
                      )}
                      {maintenance.cost && (
                        <span className="font-medium text-success flex items-center gap-1">
                          <Banknote className="w-4 h-4" />
                          R {maintenance.cost.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigate(`/maintenance/${maintenance.maintenance_id}`)}
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
                        <DropdownMenuItem onClick={() => {/* Handle edit */}}>
                          <Edit className="h-4 w-4 mr-2" />
                          Update
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => {/* Handle delete */}}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}