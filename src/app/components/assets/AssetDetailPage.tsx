import { useState, useContext, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../../App";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  MapPin, 
  Calendar, 
  DollarSign,
  ClipboardCheck,
  Wrench,
  Info,
  Building2,
  Shield,
  Ruler,
  Navigation,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingDown,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";

export default function AssetDetailPage() {
  const { assetId } = useParams<{ assetId: string }>();
  const { accessToken } = useContext(AuthContext);
  const navigate = useNavigate();
  const [asset, setAsset] = useState<any>(null);
  const [inspections, setInspections] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  useEffect(() => {
    if (assetId) {
      fetchAssetDetails();
      fetchAssetInspections();
      fetchAssetMaintenance();
    }
  }, [assetId]);

  const fetchAssetDetails = async () => {
    try {
      // Validate assetId is a UUID before making the request
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(assetId || '')) {
        toast.error("Invalid asset ID");
        navigate("/assets");
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/assets/${assetId}`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAsset(data.asset);
      } else {
        const error = await response.json();
        toast.error(`Failed to load asset: ${error.error || 'Unknown error'}`);
        navigate("/assets");
      }
    } catch (error) {
      console.error("Error fetching asset details:", error);
      toast.error("Failed to load asset details");
      navigate("/assets");
    } finally {
      setLoading(false);
    }
  };

  const fetchAssetInspections = async () => {
    try {
      const response = await fetch(`${API_URL}/assets/${assetId}/inspections`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInspections(data.inspections || []);
      }
    } catch (error) {
      console.error("Error fetching inspections:", error);
    }
  };

  const fetchAssetMaintenance = async () => {
    try {
      const response = await fetch(`${API_URL}/assets/${assetId}/maintenance`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMaintenance(data.maintenance || data.records || []);
      }
    } catch (error) {
      console.error("Error fetching maintenance:", error);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this asset?")) return;

    try {
      const response = await fetch(`${API_URL}/assets/${assetId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        toast.success("Asset deleted successfully");
        navigate("/assets");
      } else {
        const error = await response.json();
        toast.error(`Failed to delete: ${error.error}`);
      }
    } catch (error) {
      console.error("Error deleting asset:", error);
      toast.error("Failed to delete asset");
    }
  };

  const getCIBadge = (ci: number | null | undefined) => {
    if (ci === null || ci === undefined) {
      return <Badge variant="outline">No CI</Badge>;
    }
    const normalizedCI = Math.min(Math.max(ci, 0), 100);
    if (normalizedCI >= 80) return <Badge className="bg-[#5DB32A]">Excellent ({normalizedCI})</Badge>;
    if (normalizedCI >= 60) return <Badge className="bg-[#39AEDF]">Good ({normalizedCI})</Badge>;
    if (normalizedCI >= 40) return <Badge className="bg-[#F8D227] text-black">Fair ({normalizedCI})</Badge>;
    return <Badge variant="destructive">Poor ({normalizedCI})</Badge>;
  };

  const getUrgencyBadge = (urgency: any) => {
    if (!urgency) return <Badge variant="outline">No Data</Badge>;
    const urgencyNum = typeof urgency === 'string' ? parseInt(urgency) : urgency;
    if (urgencyNum === 4) return <Badge variant="destructive">4 - Immediate</Badge>;
    if (urgencyNum === 3) return <Badge className="bg-orange-500">3 - High</Badge>;
    if (urgencyNum === 2) return <Badge className="bg-blue-500">2 - Medium</Badge>;
    return <Badge className="bg-green-600">1 - Low</Badge>;
  };

  // Get the latest CI from the most recent inspection
  const getLatestCI = () => {
    if (!inspections || inspections.length === 0) return null;
    // Inspections are already sorted by date (descending) from the API
    const latestInspection = inspections[0];
    return latestInspection.ci_final || latestInspection.conditional_index || null;
  };

  // Get the latest urgency from the most recent inspection
  const getLatestUrgency = () => {
    if (!inspections || inspections.length === 0) return null;
    // Inspections are already sorted by date (descending) from the API
    const latestInspection = inspections[0];
    return latestInspection.calculated_urgency || latestInspection.urgency || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading asset details...</p>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h3 className="text-lg font-semibold mb-2">Asset Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The asset you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate("/assets")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Assets
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/assets")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{asset.asset_ref || asset.reference_number}</h1>
            <p className="text-muted-foreground">
              {asset.asset_type_name || asset.type} • {asset.road_name || asset.road_number || 'Location'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/assets/${assetId}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Condition Index</CardTitle>
          </CardHeader>
          <CardContent>
            {getCIBadge(getLatestCI() || asset.conditional_index)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Urgency Level</CardTitle>
          </CardHeader>
          <CardContent>
            {getUrgencyBadge(getLatestUrgency() || asset.urgency)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Inspections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold">{inspections.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Maintenance Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold">{maintenance.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Asset Details */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Core asset details and identification</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Asset Reference</p>
                <p className="font-medium">{asset.asset_ref || asset.reference_number || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Asset Type</p>
                <Badge variant="outline">{asset.asset_type_name || asset.type}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <Badge>{asset.status || "Active"}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Installation Date</p>
                <p className="font-medium">
                  {asset.installation_date ? new Date(asset.installation_date).toLocaleDateString() : "N/A"}
                </p>
              </div>
            </div>
            {asset.description && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p className="font-medium">{asset.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location Information */}
        <Card>
          <CardHeader>
            <CardTitle>Location Information</CardTitle>
            <CardDescription>Geographic and administrative details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Region
                </p>
                <p className="font-medium">{asset.region || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  Depot
                </p>
                <p className="font-medium">{asset.depot || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Road Name</p>
                <p className="font-medium">{asset.road_name || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Road Number</p>
                <p className="font-medium">{asset.road_number || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  <Navigation className="w-3 h-3" />
                  Latitude
                </p>
                <p className="font-medium font-mono text-sm">
                  {asset.latitude ? asset.latitude.toFixed(6) : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  <Navigation className="w-3 h-3" />
                  Longitude
                </p>
                <p className="font-medium font-mono text-sm">
                  {asset.longitude ? asset.longitude.toFixed(6) : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ownership & Responsibility */}
        <Card>
          <CardHeader>
            <CardTitle>Ownership & Responsibility</CardTitle>
            <CardDescription>Management and maintenance responsibility</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Owner</p>
                <p className="font-medium">{asset.owner || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Responsible Party</p>
                <p className="font-medium">{asset.responsible_party || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Installer</p>
                <p className="font-medium">{asset.installer || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Information */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Information</CardTitle>
            <CardDescription>Cost and valuation details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  Replacement Value
                </p>
                <p className="font-bold text-lg">
                  {asset.replacement_value ? `R ${asset.replacement_value.toLocaleString()}` : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Installation Cost</p>
                <p className="font-medium">
                  {asset.installation_cost ? `R ${asset.installation_cost.toLocaleString()}` : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Inspections */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Inspections</CardTitle>
              <CardDescription>
                {inspections.length} inspection{inspections.length !== 1 ? 's' : ''} recorded
              </CardDescription>
            </div>
            <Link to={`/inspections/new?assetId=${assetId}`}>
              <Button size="sm">
                <ClipboardCheck className="w-4 h-4 mr-2" />
                New Inspection
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {inspections.length > 0 ? (
            <div className="space-y-3">
              {inspections.slice(0, 5).map((inspection) => (
                <div
                  key={inspection.inspection_id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/inspections/${inspection.inspection_id}`)}
                >
                  <div className="flex-1">
                    <p className="font-medium">
                      {new Date(inspection.inspection_date || inspection.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      By {inspection.inspector_name || 'Unknown'} • 
                      {inspection.components?.length || 0} components
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getCIBadge(inspection.ci_final || inspection.conditional_index)}
                    {getUrgencyBadge(inspection.calculated_urgency || inspection.urgency)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No inspections recorded</p>
              <Link to={`/inspections/new?assetId=${assetId}`}>
                <Button variant="outline" size="sm" className="mt-4">
                  Create First Inspection
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Maintenance History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Maintenance History</CardTitle>
              <CardDescription>
                {maintenance.length} maintenance record{maintenance.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <Link to={`/maintenance/new?assetId=${assetId}`}>
              <Button size="sm">
                <Wrench className="w-4 h-4 mr-2" />
                Log Maintenance
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {maintenance.length > 0 ? (
            <div className="space-y-3">
              {maintenance.slice(0, 5).map((record) => (
                <div
                  key={record.maintenance_id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{record.maintenance_type || 'Maintenance'}</p>
                    <p className="text-sm text-muted-foreground">
                      {record.scheduled_date ? new Date(record.scheduled_date).toLocaleDateString() : 'No date'}
                      {record.completed_date && ` • Completed ${new Date(record.completed_date).toLocaleDateString()}`}
                    </p>
                  </div>
                  <Badge variant={record.status === 'Completed' ? 'default' : 'outline'}>
                    {record.status || 'Scheduled'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Wrench className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No maintenance records</p>
              <Link to={`/maintenance/new?assetId=${assetId}`}>
                <Button variant="outline" size="sm" className="mt-4">
                  Log First Maintenance
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}