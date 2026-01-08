import { useState, useEffect, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../../App";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import ComponentInspectionForm from "./ComponentInspectionForm";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { toast } from "sonner";

export default function EditInspectionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, accessToken } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inspection, setInspection] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [componentTemplate, setComponentTemplate] = useState<any>(null);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);

  const [formData, setFormData] = useState({
    asset_id: "",
    inspection_date: "",
    inspector_name: "",
    weather_conditions: "",
    overall_comments: "",
    component_scores: [] as any[],
    aggregates: {},
  });

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  useEffect(() => {
    fetchAssets();
    fetchInspection();
  }, [id]);

  const fetchInspection = async () => {
    try {
      const response = await fetch(`${API_URL}/inspections/${id}`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const insp = data.inspection;
        setInspection(insp);

        // Pre-populate form data from components array
        const componentScores = (insp.components || []).map((comp: any) => ({
          component_number: comp.component_order,
          component_name: comp.component_name,
          degree: comp.degree_value || "",
          extent: comp.extent_value || "",
          relevancy: comp.relevancy_value || "",
          urgency: comp.urgency_token || "",
          ci: comp.ci_component,
          quantity: comp.quantity || 0,
          unit: comp.quantity_unit || "",
          remedial_work: comp.remedial_work_description || "",
          rate: comp.rate || 0,
          cost: comp.component_cost || 0,
          comments: comp.component_notes || "",
          photo_url: comp.photo_url || "",
        }));

        setFormData({
          asset_id: insp.asset_id,
          inspection_date: insp.inspection_date?.split("T")[0] || "",
          inspector_name: insp.inspector_name || "",
          weather_conditions: insp.weather_conditions || "",
          overall_comments: insp.finding_summary || "",
          component_scores: componentScores,
          aggregates: {
            ci_health: insp.ci_health,
            ci_safety: insp.ci_safety,
            ci_final: insp.ci_final,
            worst_urgency: insp.calculated_urgency,
            overall_degree: insp.degree,
            overall_extent: insp.extent,
            overall_relevancy: insp.relevancy,
            total_cost: insp.total_remedial_cost,
            overall_remedial: insp.details || "",
          },
        });

        // Fetch asset and template
        const assetResponse = await fetch(`${API_URL}/assets/${insp.asset_id}`, {
          headers: {
            Authorization: `Bearer ${accessToken || publicAnonKey}`,
          },
        });

        if (assetResponse.ok) {
          const assetData = await assetResponse.json();
          setSelectedAsset(assetData.asset);
          if (assetData.asset?.asset_type_name) {
            fetchComponentTemplate(assetData.asset.asset_type_name);
          }
        }
      } else {
        toast.error("Failed to load inspection");
        navigate("/inspections");
      }
    } catch (error) {
      console.error("Error fetching inspection:", error);
      toast.error("Error loading inspection");
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    try {
      const response = await fetch(`${API_URL}/assets`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAssets(data.assets || []);
      }
    } catch (error) {
      console.error("Error fetching assets:", error);
    }
  };

  const fetchComponentTemplate = async (assetTypeName: string) => {
    setTemplateLoading(true);
    try {
      console.log('[EditInspection] Fetching component template for:', assetTypeName);
      const response = await fetch(
        `${API_URL}/component-templates/${encodeURIComponent(assetTypeName)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken || publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('[EditInspection] Component template response:', data);
        
        if (data.template) {
          setComponentTemplate(data.template);
        } else {
          console.warn('[EditInspection] No component template found for:', assetTypeName);
          if (data.error) {
            console.error('[EditInspection] Server error:', data.error);
            
            // If asset type not found, fetch and log all available asset types for debugging
            if (data.error.includes('not found in database')) {
              fetchAndLogAssetTypes(assetTypeName);
            }
            
            toast.error(`Template error: ${data.error}`);
          } else {
            toast.error(`No component template found for asset type: ${assetTypeName}`);
          }
          setComponentTemplate(null);
        }
      } else {
        const errorText = await response.text();
        console.error('[EditInspection] Failed to fetch template, status:', response.status, 'body:', errorText);
        toast.error('Failed to load component template');
        setComponentTemplate(null);
      }
    } catch (error) {
      console.error("[EditInspection] Error fetching component template:", error);
      toast.error('Error loading component template');
      setComponentTemplate(null);
    } finally {
      setTemplateLoading(false);
    }
  };

  const fetchAndLogAssetTypes = async (requestedType: string) => {
    try {
      const response = await fetch(`${API_URL}/asset-types`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.error('[EditInspection] Available asset types in database:', data.assetTypes);
        console.error(`[EditInspection] Requested type "${requestedType}" not found. Available types:`, 
          data.assetTypes?.map((t: any) => t.name).join(', '));
      }
    } catch (error) {
      console.error('[EditInspection] Error fetching asset types:', error);
    }
  };

  const handleAssetChange = (assetId: string) => {
    const asset = assets.find((a) => a.asset_id === assetId);
    setSelectedAsset(asset);
    setFormData({ ...formData, asset_id: assetId });

    if (asset?.asset_type_name) {
      fetchComponentTemplate(asset.asset_type_name);
    }
  };

  const handleComponentScoresChange = (scores: any[], aggregates: any) => {
    setFormData({ ...formData, component_scores: scores, aggregates });
  };

  const handleInitializeTemplates = async () => {
    setInitializing(true);
    try {
      const response = await fetch(`${API_URL}/component-templates/initialize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Component templates initialized successfully!');
        
        // Retry fetching the template for the current asset
        if (selectedAsset?.asset_type_name) {
          setTimeout(() => {
            fetchComponentTemplate(selectedAsset.asset_type_name);
          }, 1000);
        }
      } else {
        const error = await response.json();
        toast.error(`Error initializing templates: ${error.error}`);
      }
    } catch (error) {
      console.error('Error initializing templates:', error);
      toast.error('Failed to initialize component templates');
    } finally {
      setInitializing(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.asset_id) {
      toast.error("Please select an asset");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        asset_id: formData.asset_id,
        inspection_date: formData.inspection_date,
        inspector_name: formData.inspector_name,
        weather_conditions: formData.weather_conditions,
        // Overall fields from aggregates
        conditional_index: formData.aggregates.ci_health,
        ci_safety: formData.aggregates.ci_safety,
        ci_final: formData.aggregates.ci_final,
        calculated_urgency: formData.aggregates.worst_urgency,
        degree: formData.aggregates.overall_degree,
        extent: formData.aggregates.overall_extent,
        relevancy: formData.aggregates.overall_relevancy,
        total_remedial_cost: formData.aggregates.total_cost || 0,
        remedial_notes: formData.aggregates.overall_remedial || "",
        // Combined comments
        comments: [formData.aggregates.overall_remedial, formData.overall_comments]
          .filter((c) => c)
          .join("\n\n"),
        // Component scores with correct field names
        component_scores: formData.component_scores.map((score: any) => ({
          component_name: score.component_name,
          degree_value: score.degree,
          extent_value: score.extent,
          relevancy_value: score.relevancy,
          urgency_token: score.urgency,
          component_score: score.ci,
          quantity: score.quantity,
          quantity_unit: score.unit,
          remedial_work_description: score.remedial_work,
          rate: score.rate,
          component_cost: score.cost,
          component_notes: score.comments,
          photo_url: score.photo_url,
        })),
      };

      const response = await fetch(`${API_URL}/inspections/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("Inspection updated successfully!");
        navigate(`/inspections/${id}`);
      } else {
        const error = await response.json();
        toast.error(`Error updating inspection: ${error.error}`);
      }
    } catch (error) {
      console.error("Error updating inspection:", error);
      toast.error("Failed to update inspection");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading inspection...</p>
        </div>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Inspection not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(`/inspections/${id}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">Edit Inspection</h1>
          <p className="text-muted-foreground">
            Modify component-based inspection with D/E/R scoring
          </p>
        </div>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Inspection Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Asset *</Label>
              <Select value={formData.asset_id} onValueChange={handleAssetChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select asset to inspect" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((asset) => (
                    <SelectItem key={asset.asset_id} value={asset.asset_id}>
                      {asset.asset_ref} - {asset.asset_type_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Inspection Date *</Label>
              <Input
                type="date"
                value={formData.inspection_date}
                onChange={(e) => setFormData({ ...formData, inspection_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Inspector Name</Label>
              <Input
                value={formData.inspector_name}
                onChange={(e) => setFormData({ ...formData, inspector_name: e.target.value })}
                placeholder="Name of inspector"
              />
            </div>
            <div className="space-y-2">
              <Label>Weather Conditions</Label>
              <Select
                value={formData.weather_conditions}
                onValueChange={(value) => setFormData({ ...formData, weather_conditions: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select weather" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Clear">Clear</SelectItem>
                  <SelectItem value="Cloudy">Cloudy</SelectItem>
                  <SelectItem value="Rainy">Rainy</SelectItem>
                  <SelectItem value="Windy">Windy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Overall Comments</Label>
            <Textarea
              value={formData.overall_comments}
              onChange={(e) => setFormData({ ...formData, overall_comments: e.target.value })}
              placeholder="General observations about the inspection..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Component Inspection Form */}
      {selectedAsset && componentTemplate && formData.component_scores.length > 0 ? (
        <ComponentInspectionForm
          assetType={selectedAsset.asset_type_name}
          components={componentTemplate.items || []}
          repairThreshold={60}
          onScoresChange={handleComponentScoresChange}
          initialScores={formData.component_scores}
        />
      ) : templateLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Loader2 className="w-12 h-12 mx-auto mb-4 opacity-50 animate-spin" />
            <p>Loading component template...</p>
            {selectedAsset && (
              <p className="text-sm mt-2">Asset Type: {selectedAsset.asset_type_name}</p>
            )}
          </CardContent>
        </Card>
      ) : selectedAsset && !componentTemplate && formData.component_scores.length > 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <p className="text-muted-foreground">
                Component template not found for asset type: <strong>{selectedAsset.asset_type_name}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                This inspection has {formData.component_scores.length} component(s), but no template is configured for this asset type.
              </p>
              <div className="flex gap-2 justify-center">
                <Button 
                  onClick={handleInitializeTemplates} 
                  disabled={initializing}
                  className="mt-4"
                >
                  {initializing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Initializing...
                    </>
                  ) : (
                    'Initialize Default Templates'
                  )}
                </Button>
                <Button variant="outline" onClick={() => navigate('/admin-console')} className="mt-4">
                  Admin Console
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Click "Initialize Default Templates" to create default component templates for all asset types.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>Select an asset to load component inspection form</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}