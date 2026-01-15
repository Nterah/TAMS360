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
  ClipboardCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  ChevronRight,
  Loader2,
  Calendar,
  Package
} from "lucide-react";
import { projectId } from "../../../../utils/supabase/info";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface Inspection {
  id: string;
  inspection_id: string;
  asset_ref: string;
  asset_description: string;
  inspection_date: string;
  inspector_name: string;
  ci: number;
  urgency: string;
  status: string;
}

export default function MobileInspectionsPage() {
  const { accessToken } = useContext(AuthContext);
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [filteredInspections, setFilteredInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterUrgency, setFilterUrgency] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch inspections
  useEffect(() => {
    fetchInspections();
  }, [accessToken, tenantId]);

  // Apply filters
  useEffect(() => {
    let filtered = [...inspections];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(inspection => 
        inspection.asset_ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inspection.asset_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inspection.inspector_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Urgency filter
    if (filterUrgency !== "all") {
      filtered = filtered.filter(inspection => inspection.urgency === filterUrgency);
    }

    setFilteredInspections(filtered);
  }, [searchQuery, filterUrgency, inspections]);

  const fetchInspections = async () => {
    const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

    try {
      const response = await fetch(`${API_URL}/inspections?limit=100`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInspections(data.inspections || []);
        setFilteredInspections(data.inspections || []);
      }
    } catch (error) {
      console.error("Failed to fetch inspections:", error);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency?.toLowerCase()) {
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

  const getCIColor = (ci: number) => {
    if (ci >= 80) return "text-green-600 dark:text-green-400";
    if (ci >= 60) return "text-blue-600 dark:text-blue-400";
    if (ci >= 40) return "text-yellow-600 dark:text-yellow-400";
    if (ci >= 20) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
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
            placeholder="Search inspections..."
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
            {filterUrgency !== "all" && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                1
              </Badge>
            )}
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/inspections/new")}
            className="gap-2 flex-1"
          >
            <Plus className="w-4 h-4" />
            New Inspection
          </Button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="pt-2 border-t">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-600 dark:text-slate-400">Urgency</label>
              <Select value={filterUrgency} onValueChange={setFilterUrgency}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Urgencies</SelectItem>
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

      {/* Inspection Count */}
      <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800/50">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {filteredInspections.length} inspection{filteredInspections.length !== 1 ? "s" : ""} found
        </p>
      </div>

      {/* Inspections List */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredInspections.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardCheck className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-500 dark:text-slate-400">
              {searchQuery || filterUrgency !== "all" 
                ? "No inspections match your filters"
                : "No inspections found"}
            </p>
          </div>
        ) : (
          filteredInspections.map((inspection) => (
            <Card
              key={inspection.id}
              className="border-2 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
              onClick={() => navigate(`/inspections/${inspection.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs font-mono">
                        {inspection.asset_ref}
                      </Badge>
                      <Badge className={`text-xs ${getUrgencyColor(inspection.urgency)}`}>
                        {inspection.urgency}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm mb-1">
                      {inspection.asset_description}
                    </h3>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className={`text-2xl font-bold ${getCIColor(inspection.ci)}`}>
                      {inspection.ci}
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">CI Score</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(inspection.inspection_date)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>by {inspection.inspector_name}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}