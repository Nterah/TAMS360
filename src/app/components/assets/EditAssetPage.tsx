import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../App";
import { toast } from "sonner";
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import EnhancedAssetForm from "./EnhancedAssetForm";
import { supabase, API_URL } from "../../../lib/supabaseClient";

export default function EditAssetPage() {
  const { assetId } = useParams<{ assetId: string }>();
  const { accessToken } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const isMobile = location.pathname.startsWith("/mobile/");
  const detailPath = isMobile ? `/mobile/assets/${assetId}` : `/assets/${assetId}`;

  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
        navigate(isMobile ? "/mobile/assets" : "/assets");
      }
    } catch {
      toast.error("Failed to load asset");
      navigate(isMobile ? "/mobile/assets" : "/assets");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (assetData: any) => {
    try {
      toast.loading("Saving changes...", { id: "edit-asset" });

      // Build update payload using real tams360_assets column names
      const updates: Record<string, any> = {};

      if (assetData.roadNumber  !== undefined) updates.road_number   = assetData.roadNumber  || null;
      if (assetData.roadName    !== undefined) updates.road_name     = assetData.roadName    || null;
      if (assetData.region      !== undefined) updates.region        = assetData.region      || null;
      if (assetData.depot       !== undefined) updates.depot         = assetData.depot       || null;
      if (assetData.installDate !== undefined) updates.install_date  = assetData.installDate || null;
      if (assetData.notes       !== undefined) updates.notes         = assetData.notes       || null;

      if (assetData.kilometer)
        updates.km_marker = parseFloat(assetData.kilometer);
      if (assetData.expectedLife)
        updates.useful_life_years = parseInt(assetData.expectedLife);
      if (assetData.latitude)
        updates.gps_lat = parseFloat(assetData.latitude);
      if (assetData.longitude)
        updates.gps_lng = parseFloat(assetData.longitude);
      if (assetData.replacementValue)
        updates.replacement_value = parseFloat(assetData.replacementValue);
      if (assetData.installationCost)
        updates.purchase_price = parseFloat(assetData.installationCost);

      // owner / responsibleParty → actual column names
      if (assetData.owner !== undefined)
        updates.owner_entity = assetData.owner || null;
      if (assetData.responsibleParty !== undefined)
        updates.maintenance_responsibility = assetData.responsibleParty || null;

      // status → look up status_id
      if (assetData.status) {
        const { data: statusRow } = await supabase
          .from("asset_status")
          .select("status_id")
          .ilike("name", assetData.status)
          .maybeSingle();
        if (statusRow?.status_id) updates.status_id = statusRow.status_id;
      }

      // type → look up asset_type_id
      if (assetData.type) {
        const { data: typeRow } = await supabase
          .from("asset_types")
          .select("asset_type_id")
          .ilike("name", assetData.type)
          .maybeSingle();
        if (typeRow?.asset_type_id) updates.asset_type_id = typeRow.asset_type_id;
      }

      // condition / asset_name → stored in metadata JSONB
      if (assetData.name !== undefined || assetData.condition !== undefined) {
        const existingMeta = asset?.metadata || {};
        updates.metadata = {
          ...existingMeta,
          ...(assetData.name      !== undefined ? { asset_name: assetData.name }      : {}),
          ...(assetData.condition !== undefined ? { condition:  assetData.condition }  : {}),
        };
      }

      const { error: updateError } = await supabase
        .from("tams360_assets")
        .update(updates)
        .eq("asset_id", assetId!);

      if (updateError) {
        toast.error(`Failed to update asset: ${updateError.message}`, { id: "edit-asset" });
        return;
      }

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
                  localStorage.setItem(
                    `asset_photos_${assetId}`,
                    JSON.stringify(Array.from(new Set([...existing, photoUrl])))
                  );
                } catch { /* ignore */ }
              }
            }
          } catch (e) {
            console.error("Photo upload failed:", e);
          }
        }
      }

      toast.success("Asset updated successfully!", { id: "edit-asset" });
      navigate(detailPath);
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
            <Button onClick={() => navigate(isMobile ? "/mobile/assets" : "/assets")}>
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(detailPath)}>
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
            onCancel={() => navigate(detailPath)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
