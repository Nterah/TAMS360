import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../App";
import { useTenant } from "../../contexts/TenantContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { 
  Search, 
  Filter, 
  Wrench,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  ChevronRight,
  Loader2,
  Calendar,
  DollarSign,
  User
} from "lucide-react";
import { projectId } from "../../../../utils/supabase/info";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface MaintenanceRecord {
  id: string;
  maintenance_id: string;
  asset_ref: string;
  asset_description: string;
  maintenance_type: string;
  priority: string;
  status: string;
  scheduled_date: string;
  completion_date?: string;
  assigned_to?: string;
  estimated_cost?: number;
  notes?: string;
}

export default function MobileMaintenancePage() {
  const { accessToken } = useContext(AuthContext);
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch maintenance records
  useEffect(() => {
    fetchMaintenanceRecords();
  }, [accessToken, tenantId]);

  // Apply filters
  useEffect(() => {
    let filtered = [...records];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(record => 
        record.asset_ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.asset_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.maintenance_type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(record => record.status === filterStatus);
    }

    // Priority filter
    if (filterPriority !== "all") {
      filtered = filtered.filter(record => record.priority === filterPriority);
    }

    setFilteredRecords(filtered);
  }, [searchQuery, filterStatus, filterPriority, records]);

  const fetchMaintenanceRecords = async () => {
    const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

    try {
      const response = await fetch(`${API_URL}/maintenance?limit=100`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRecords(data.records || []);
        setFilteredRecords(data.records || []);
      }
    } catch (error) {
      console.error("Failed to fetch maintenance records:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "in progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "scheduled":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "pending":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "cancelled":
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      case "in progress":
        return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
      case "scheduled":
        return <Calendar className="w-3.5 h-3.5" />;
      case "pending":
        return <Clock className="w-3.5 h-3.5" />;
      default:
        return <AlertCircle className="w-3.5 h-3.5" />;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-ZA", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-4">
      {/* Search Bar */}
      <div className="sticky top-[73px] z-10 bg-white dark:bg-slate-800 border-b p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search work orders..."
            className="pl-9 h-10"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
            {(filterStatus !== "all" || filterPriority !== "all") && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                {(filterStatus !== "all" ? 1 : 0) + (filterPriority !== "all" ? 1 : 0)}
              </Badge>
            )}
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/maintenance/new")}
            className="gap-2 flex-1"
          >
            <Plus className="w-4 h-4" />
            New Work Order
          </Button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-600 dark:text-slate-400">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Scheduled">Scheduled</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-600 dark:text-slate-400">Priority</label>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Records Count */}
      <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800/50">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {filteredRecords.length} work order{filteredRecords.length !== 1 ? "s" : ""} found
        </p>
      </div>

      {/* Maintenance Records List */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-12">
            <Wrench className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-500 dark:text-slate-400">
              {searchQuery || filterStatus !== "all" || filterPriority !== "all" 
                ? "No work orders match your filters"
                : "No work orders found"}
            </p>
          </div>
        ) : (
          filteredRecords.map((record, index) => (
            <Card
              key={record.id || `maintenance-${index}`}
              className="border-2 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
              onClick={() => navigate(`/maintenance/${record.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="outline" className="text-xs font-mono">
                        {record.asset_ref}
                      </Badge>
                      <Badge className={`text-xs ${getStatusColor(record.status)}`}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(record.status)}
                          {record.status}
                        </span>
                      </Badge>
                      <Badge className={`text-xs ${getPriorityColor(record.priority)}`}>
                        {record.priority}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm mb-1">
                      {record.maintenance_type}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                      {record.asset_description}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0 mt-1" />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(record.scheduled_date)}</span>
                  </div>
                  {record.estimated_cost && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>R {record.estimated_cost.toLocaleString()}</span>
                    </div>
                  )}
                  {record.assigned_to && (
                    <div className="flex items-center gap-1 col-span-2">
                      <User className="w-3.5 h-3.5" />
                      <span>{record.assigned_to}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}