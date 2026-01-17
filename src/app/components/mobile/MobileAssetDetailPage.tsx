import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../App";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { 
  ArrowLeft, 
  MapPin, 
  Calendar,
  Package,
  FileText,
  Image as ImageIcon,
  Loader2,
  Edit,
  ClipboardCheck,
  Navigation2,
  AlertCircle
} from "lucide-react";
import { projectId } from "../../../../utils/supabase/info";

interface Asset {
  id: string;
  asset_ref: string;
  asset_type: string;
  asset_type_name: string;
  description: string;
  condition: string;
  installation_date: string;
  latitude: number;
  longitude: number;
  location: string;
  road_name?: string;
  chainage?: number;
  side?: string;
  photos?: string[];
  notes?: string;
  last_inspection_date?: string;
  ci_score?: number;
}

export default function MobileAssetDetailPage() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const { accessToken } = useContext(AuthContext);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssetDetails();
  }, [assetId]);

  const fetchAssetDetails = async () => {
    const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

    try {
      const response = await fetch(`${API_URL}/assets/${assetId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAsset(data.asset);
      } else {
        console.error("Failed to fetch asset details");
      }
    } catch (error) {
      console.error("Error fetching asset:", error);
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

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-ZA", { 
      month: "short", 
      day: "numeric", 
      year: "numeric" 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500">Asset not found</p>
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            className="mt-4"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Fixed Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-slate-800 border-b shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">{asset.asset_ref}</h1>
              <p className="text-xs text-slate-500">{asset.asset_type_name}</p>
            </div>
          </div>
          <Badge className={getConditionColor(asset.condition)}>
            {asset.condition}
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Photos */}
        {asset.photos && asset.photos.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Photos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {asset.photos.map((photo, index) => (
                  <img
                    key={index}
                    src={photo}
                    alt={`Asset photo ${index + 1}`}
                    className="w-full aspect-square object-cover rounded-lg border"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Basic Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Asset Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-500 mb-1">Asset Ref</p>
                <p className="text-sm font-medium font-mono">{asset.asset_ref}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Type</p>
                <p className="text-sm font-medium">{asset.asset_type_name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Condition</p>
                <Badge className={getConditionColor(asset.condition)} variant="outline">
                  {asset.condition}
                </Badge>
              </div>
              {asset.ci_score && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">CI Score</p>
                  <p className="text-sm font-bold text-primary">{asset.ci_score}</p>
                </div>
              )}
            </div>

            {asset.description && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Description</p>
                <p className="text-sm">{asset.description}</p>
              </div>
            )}

            {asset.installation_date && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Installation Date</p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <p className="text-sm">{formatDate(asset.installation_date)}</p>
                </div>
              </div>
            )}

            {asset.last_inspection_date && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Last Inspection</p>
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-slate-400" />
                  <p className="text-sm">{formatDate(asset.last_inspection_date)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {asset.location && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Address</p>
                <p className="text-sm">{asset.location}</p>
              </div>
            )}

            {asset.road_name && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Road</p>
                  <p className="text-sm font-medium">{asset.road_name}</p>
                </div>
                {asset.chainage && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Chainage</p>
                    <p className="text-sm font-medium">{asset.chainage}km</p>
                  </div>
                )}
                {asset.side && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Side</p>
                    <p className="text-sm font-medium">{asset.side}</p>
                  </div>
                )}
              </div>
            )}

            {asset.latitude && asset.longitude && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Coordinates</p>
                <p className="text-xs font-mono text-slate-600 dark:text-slate-400">
                  {asset.latitude.toFixed(6)}, {asset.longitude.toFixed(6)}
                </p>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/mobile/map?asset=${asset.id}`)}
                    className="gap-2 flex-1"
                  >
                    <MapPin className="w-4 h-4" />
                    View on Map
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      window.open(
                        `https://www.google.com/maps/dir/?api=1&destination=${asset.latitude},${asset.longitude}`,
                        "_blank"
                      );
                    }}
                    className="gap-2 flex-1"
                  >
                    <Navigation2 className="w-4 h-4" />
                    Navigate
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {asset.notes && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {asset.notes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            className="flex-1 gap-2"
            onClick={() => navigate(`/mobile/inspections/new?asset=${asset.id}`)}
          >
            <ClipboardCheck className="w-4 h-4" />
            New Inspection
          </Button>
        </div>
      </div>
    </div>
  );
}
