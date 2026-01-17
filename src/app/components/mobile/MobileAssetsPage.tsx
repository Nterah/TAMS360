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
  MapPin, 
  Package,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Navigation2,
  ChevronRight,
  Loader2
} from "lucide-react";
import { projectId } from "../../../../utils/supabase/info";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface Asset {
  id: string;
  asset_ref: string;
  asset_type_name: string;
  description: string;
  latitude: number;
  longitude: number;
  condition: string;
  status: string;
  created_at: string;
  latest_ci?: number;
  latest_urgency?: string;
}

export default function MobileAssetsPage() {
  const { accessToken } = useContext(AuthContext);
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCondition, setFilterCondition] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch assets
  useEffect(() => {
    fetchAssets();
  }, [accessToken, tenantId]);

  // Apply filters
  useEffect(() => {
    let filtered = [...assets];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(asset => 
        asset.asset_ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.asset_type_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Type filter
    if (filterType !== "all") {
      filtered = filtered.filter(asset => asset.asset_type_name === filterType);
    }

    // Condition filter
    if (filterCondition !== "all") {
      filtered = filtered.filter(asset => asset.condition === filterCondition);
    }

    setFilteredAssets(filtered);
  }, [searchQuery, filterType, filterCondition, assets]);

  const fetchAssets = async () => {
    const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

    try {
      const response = await fetch(`${API_URL}/assets?limit=100`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAssets(data.assets || []);
        setFilteredAssets(data.assets || []);
      }
    } catch (error) {
      console.error("Failed to fetch assets:", error);
    } finally {
      setLoading(false);
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition?.toLowerCase()) {
      case "excellent":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "good":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "fair":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "poor":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200";
    }
  };

  const getConditionIcon = (condition: string) => {
    switch (condition?.toLowerCase()) {
      case "excellent":
      case "good":
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      case "fair":
        return <Clock className="w-3.5 h-3.5" />;
      case "poor":
      case "critical":
        return <AlertCircle className="w-3.5 h-3.5" />;
      default:
        return null;
    }
  };

  // Get unique asset types for filter
  const assetTypes = Array.from(new Set(assets.map(a => a.asset_type_name))).sort();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-4">
      {/* Search Bar */}
      <div className="sticky top-[73px] z-10 bg-white dark:bg-slate-800 border-b p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assets..."
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
            {(filterType !== "all" || filterCondition !== "all") && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                {(filterType !== "all" ? 1 : 0) + (filterCondition !== "all" ? 1 : 0)}
              </Badge>
            )}
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/mobile/field-capture")}
            className="gap-2 flex-1"
          >
            <Plus className="w-4 h-4" />
            New Asset
          </Button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-600 dark:text-slate-400">Type</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {assetTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-600 dark:text-slate-400">Condition</label>
              <Select value={filterCondition} onValueChange={setFilterCondition}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Excellent">Excellent</SelectItem>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Fair">Fair</SelectItem>
                  <SelectItem value="Poor">Poor</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Asset Count */}
      <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800/50">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {filteredAssets.length} asset{filteredAssets.length !== 1 ? "s" : ""} found
        </p>
      </div>

      {/* Assets List */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-500 dark:text-slate-400">
              {searchQuery || filterType !== "all" || filterCondition !== "all" 
                ? "No assets match your filters"
                : "No assets found"}
            </p>
          </div>
        ) : (
          filteredAssets.map((asset, index) => (
            <Card
              key={asset.id || `asset-${index}`}
              className="border-2 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
              onClick={() => navigate(`/mobile/assets/${asset.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs font-mono">
                        {asset.asset_ref}
                      </Badge>
                      <Badge className={`text-xs ${getConditionColor(asset.condition)}`}>
                        <span className="flex items-center gap-1">
                          {getConditionIcon(asset.condition)}
                          {asset.condition}
                        </span>
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm mb-1 truncate">
                      {asset.description}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                      {asset.asset_type_name}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0 mt-1" />
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>
                      {(asset.gps_lat || asset.latitude)?.toFixed(4)}, {(asset.gps_lng || asset.longitude)?.toFixed(4)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/mobile/map?asset=${asset.id}`);
                    }}
                  >
                    <Navigation2 className="w-3 h-3" />
                    Navigate
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}