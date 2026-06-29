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

  // Detect if opened from mobile route
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

      // Build update object using actual assets table columns only
      const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      // Base schema columns (always safe)
      if (assetData.name)             updates.asset_name        = assetData.name;
      if (assetData.roadNumber)       updates.road_number       = assetData.roadNumber;
      if (assetData.roadName)         updates.road_name         = assetData.roadName;
      if (assetData.region)           updates.region            = assetData.region;
      if (assetData.depot)            updates.depot             = assetData.depot;
      if (assetData.kilometer)        updates.km_marker         = parseFloat(assetData.kilometer);
      if (assetData.installDate)      updates.install_date      = assetData.installDate;
      if (assetData.expectedLife)     updates.useful_life_years = parseInt(assetData.expectedLife);
      if (assetData.status)           updates.status            = assetData.status;
      if (assetData.condition)        updates.condition         = assetData.condition;
      if (assetData.notes != null)    updates.notes             = assetData.notes;
      if (assetData.latitude)         updates.gps_lat           = parseFloat(assetData.latitude);
      if (assetData.longitude)        updates.gps_lng           = parseFloat(assetData.longitude);
      if (assetData.owner)            updates.owner             = assetData.owner;
      if (assetData.responsibleParty) updates.responsible_party = assetData.responsibleParty;
      if (assetData.replacementValue) updates.replacement_value = parseFloat(assetData.replacementValue);

      // Columns added by schema enhancements — included but ignored if missing
      if (assetData.installationCost) updates.purchase_price    = parseFloat(assetData.installationCost);
      if (assetData.installer)        updates.installer_name    = assetData.installer;
      if (assetData.endLatitude)      updates.end_latitude      = parseFloat(assetData.endLatitude);
      if (assetData.endLongitude)     updates.end_longitude     = parseFloat(assetData.endLongitude);
      if (assetData.name)             updates.description       = assetData.name;
      if (assetData.owner)            updates.owner_entity      = assetData.owner;
      if (assetData.responsibleParty) updates.maintenance_responsibility = assetData.responsibleParty;

      // Look up asset_type_id if type name provided
      if (assetData.type) {
        try {
          const { data: typeRow } = await supabase
            .schema("tams360" as any)
            .from("asset_types")
            .select("asset_type_id")
            .eq("name", assetData.type)
            .maybeSingle();
          if (typeRow?.asset_type_id) updates.asset_type_id = typeRow.asset_type_id;
        } catch { /* skip if lookup fails */ }
      }

      // Try direct Supabase update (works for authenticated users via RLS)
      // Try tams360 schema first, fall back to public schema
      let updateError: any = null;

      const doUpdate = async (extraCols: boolean) => {
        // Base-only object strips enhanced columns that may not exist
        const safeUpdates = extraCols ? updates : (() => {
          const base = { ...updates };
          delete base.purchase_price;
          delete base.installer_name;
          delete base.end_latitude;
          delete base.end_longitude;
          delete base.description;
          delete base.owner_entity;
          delete base.maintenance_responsibility;
          return base;
        })();

        const { error: e1 } = await supabase
          .schema("tams360" as any)
          .from("assets")
          .update(safeUpdates)
          .eq("asset_id", assetId!);
        if (!e1) return null;

        // Fallback: public schema
        const { error: e2 } = await supabase
          .from("assets")
          .update(safeUpdates)
          .eq("asset_id", assetId!);
        return e2;
      };

      updateError = await doUpdate(true);
      if (updateError?.message?.includes("column")) {
        // Unknown column — retry with only base schema columns
        updateError = await doUpdate(false);
      }

      if (updateError) {
        console.error("Asset update error:", updateError);
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
      {/* Header */}
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
