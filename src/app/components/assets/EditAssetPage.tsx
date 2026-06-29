import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../App";
import { toast } from "sonner";
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import EnhancedAssetForm from "./EnhancedAssetForm";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";

export default function EditAssetPage() {
  const { assetId } = useParams<{ assetId: string }>();
  const { accessToken } = useContext(AuthContext);
  const navigate = useNavigate();

  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  useEffect(() => {
    if (assetId) fetchAsset();
  }, [assetId]);

  const fetchAsset = async () => {
    try {
      const response = await fetch(`${API_URL}/assets/${assetId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAsset(data.asset);
      } else {
        toast.error("Asset not found");
        navigate("/assets");
      }
    } catch {
      toast.error("Failed to load asset");
      navigate("/assets");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (assetData: any) => {
    try {
      toast.loading("Saving changes...", { id: "edit-asset" });

      const response = await fetch(`${API_URL}/assets/${assetId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          asset_type: assetData.type,
          asset_type_name: assetData.type,
          description: assetData.name,
          region: assetData.region,
          depot: assetData.depot,
          road_number: assetData.roadNumber,
          road_name: assetData.roadName,
          km_marker: assetData.kilometer ? parseFloat(assetData.kilometer) : null,
          install_date: assetData.installDate || null,
          useful_life_years: assetData.expectedLife ? parseInt(assetData.expectedLife) : null,
          status: assetData.status,
          condition: assetData.condition,
          notes: assetData.notes,
          gps_lat: assetData.latitude ? parseFloat(assetData.latitude) : null,
          gps_lng: assetData.longitude ? parseFloat(assetData.longitude) : null,
          end_latitude: assetData.endLatitude ? parseFloat(assetData.endLatitude) : null,
          end_longitude: assetData.endLongitude ? parseFloat(assetData.endLongitude) : null,
          owned_by: assetData.owner,
          responsible_party: assetData.responsibleParty,
          replacement_value: assetData.replacementValue ? parseFloat(assetData.replacementValue) : null,
          purchase_price: assetData.installationCost ? parseFloat(assetData.installationCost) : null,
          installer_name: assetData.installer,
        }),
      });

      if (response.ok) {
        // Upload new photos if any were added
        if (assetData.photos?.length > 0) {
          for (const file of assetData.photos) {
            try {
              const formData = new FormData();
              formData.append("file", file);
              formData.append("bucket", "tams360-inspection-photos");
              formData.append("folderPath", asset?.asset_ref || assetId!);
              const uploadRes = await fetch(`${API_URL}/storage/upload`, {
                method: "POST",
                headers: { Authorization: `Bearer ${accessToken}` },
                body: formData,
              });
              if (uploadRes.ok) {
                const { path, url } = await uploadRes.json();
                const photoUrl = path || url;
                if (photoUrl && assetId) {
                  try {
                    const existing: string[] = JSON.parse(
                      localStorage.getItem(`asset_photos_${assetId}`) || "[]"
                    );
                    const merged = Array.from(new Set([...existing, photoUrl]));
                    localStorage.setItem(`asset_photos_${assetId}`, JSON.stringify(merged));
                  } catch { /* ignore */ }
                }
              }
            } catch (e) {
              console.error("Photo upload failed:", e);
            }
          }
        }

        toast.success("Asset updated successfully!", { id: "edit-asset" });
        navigate(`/assets/${assetId}`);
      } else {
        const error = await response.json().catch(() => ({ error: "Unknown error" }));
        toast.error(`Failed to update asset: ${error.error || "Unknown error"}`, { id: "edit-asset" });
      }
    } catch (error: any) {
      toast.error(`Error updating asset: ${error.message || "Unknown error"}`, { id: "edit-asset" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading asset...</p>
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/assets/${assetId}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Asset</h1>
          <p className="text-muted-foreground">
            {asset.asset_ref} · {asset.asset_type_name}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <EnhancedAssetForm
            mode="edit"
            initialValues={asset}
            onSubmit={handleSubmit}
            onCancel={() => navigate(`/assets/${assetId}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
