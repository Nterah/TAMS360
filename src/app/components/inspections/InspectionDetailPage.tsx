import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../../App";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { 
  ArrowLeft, Calendar, User, MapPin, FileText, AlertTriangle, 
  Banknote, Trash2, Edit, Info, Image as ImageIcon, Wrench, Plus, ExternalLink
} from "lucide-react";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { toast } from "sonner";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "../ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";

export default function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accessToken } = useContext(AuthContext);
  const [inspection, setInspection] = useState<any>(null);
  const [maintenanceRecords, setMaintenanceRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [componentTemplate, setComponentTemplate] = useState<any>(null);

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  useEffect(() => {
    if (id && id !== 'undefined') {
      fetchInspection();
      fetchMaintenanceRecords();
    } else {
      console.error('Invalid inspection ID:', id);
      toast.error('Invalid inspection ID');
      navigate('/mobile/inspections');
    }
  }, [id]);

  // Fetch photos when inspection is loaded
  useEffect(() => {
    if (inspection?.asset_id) {
      fetchAssetPhotos(inspection.asset_id);
    }
  }, [inspection?.asset_id]);

  // Fetch component template when inspection is loaded
  useEffect(() => {
    if (inspection?.asset_type_name) {
      fetchComponentTemplate(inspection.asset_type_name);
    }
  }, [inspection?.asset_type_name]);

  const fetchAssetPhotos = async (assetId: string) => {
    try {
      console.log(`[Photos] Fetching photos for asset ${assetId}...`);
      
      const response = await fetch(`${API_URL}/assets/${assetId}/photos`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      console.log(`[Photos] Response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[Photos] Found ${data.photos?.length || 0} photos`);
        setPhotos(data.photos || []);
      } else {
        console.error(`[Photos] Failed to fetch photos`);
      }
    } catch (error) {
      console.error("[Photos] Exception fetching photos:", error);
    }
  };

  const fetchInspection = async () => {
    try {
      const response = await fetch(`${API_URL}/inspections/${id}`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInspection(data.inspection);
        setPhotos(data.inspection.photos || []);
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

  const fetchMaintenanceRecords = async () => {
    try {
      const response = await fetch(`${API_URL}/maintenance?inspection_id=${id}`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMaintenanceRecords(data.records || []);
      }
    } catch (error) {
      console.error("Error fetching maintenance records:", error);
    }
  };

  const fetchComponentTemplate = async (assetTypeName: string) => {
    try {
      console.log('[InspectionDetail] Fetching component template for:', assetTypeName);
      const response = await fetch(`${API_URL}/component-templates/${encodeURIComponent(assetTypeName)}`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[InspectionDetail] Component template response:', data);
        if (data.template) {
          setComponentTemplate(data.template);
        } else {
          console.warn('[InspectionDetail] No component template found for:', assetTypeName);
          setComponentTemplate(null);
        }
      } else {
        console.error('[InspectionDetail] Failed to fetch template, status:', response.status);
        setComponentTemplate(null);
      }
    } catch (error) {
      console.error("[InspectionDetail] Error fetching component template:", error);
      setComponentTemplate(null);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`${API_URL}/inspections/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        toast.success("Inspection deleted successfully");
        navigate("/inspections");
      } else {
        toast.error("Failed to delete inspection");
      }
    } catch (error) {
      console.error("Error deleting inspection:", error);
      toast.error("Error deleting inspection");
    }
  };

  const handleCreateMaintenance = () => {
    // Navigate to maintenance creation with inspection context
    navigate(`/maintenance/new?inspection_id=${id}&asset_id=${inspection?.asset_id}`);
  };

  const getUrgencyInfo = (urgency: string | number) => {
    const urgencyStr = String(urgency);
    const urgencyMap: Record<string, { label: string; variant: "default" | "destructive" | "outline" | "secondary" }> = {
      // Numeric codes (component-level)
      "4": { label: "Immediate", variant: "destructive" },
      "3": { label: "High", variant: "destructive" },
      "2": { label: "Medium", variant: "outline" },
      "1": { label: "Low", variant: "secondary" },
      "0": { label: "Minor/Monitor", variant: "secondary" },
      "R": { label: "Record Only", variant: "outline" },
      "U": { label: "Unable to Inspect", variant: "outline" },
      // Text labels (inspection-level from database)
      "Immediate": { label: "Immediate", variant: "destructive" },
      "High": { label: "High", variant: "destructive" },
      "Medium": { label: "Medium", variant: "outline" },
      "Low": { label: "Low", variant: "secondary" },
    };
    return urgencyMap[urgencyStr] || { label: urgencyStr || "Unknown", variant: "outline" as const };
  };

  const getCIBadge = (ci: number | null) => {
    if (ci === null) return { label: "Not Scored", variant: "outline" as const };
    if (ci >= 80) return { label: "Excellent", variant: "default" as const };
    if (ci >= 60) return { label: "Good", variant: "secondary" as const };
    if (ci >= 40) return { label: "Fair", variant: "outline" as const };
    return { label: "Poor", variant: "destructive" as const };
  };

  // Get CI badge color (matching edit page)
  const getCIBadgeColor = (ci: number | null): string => {
    if (ci === null) return "bg-slate-500";
    if (ci >= 80) return "bg-success";
    if (ci >= 60) return "bg-info";
    if (ci >= 40) return "bg-warning";
    return "bg-destructive";
  };

  // Get CI badge text (matching edit page)
  const getCIBadgeText = (ci: number | null): string => {
    if (ci === null) return "Not Scored";
    if (ci >= 80) return "Excellent";
    if (ci >= 60) return "Good";
    if (ci >= 40) return "Fair";
    return "Poor";
  };

  // Get urgency badge (matching edit page)
  const getUrgencyBadge = (urgency: string) => {
    const urgencyLabels: Record<string, { label: string; color: string; icon: any }> = {
      "4": { label: "Critical", color: "bg-destructive", icon: AlertTriangle },
      "3": { label: "High", color: "bg-warning", icon: AlertTriangle },
      "2": { label: "Medium", color: "bg-info", icon: AlertTriangle },
      "1": { label: "Low", color: "bg-slate-500", icon: AlertTriangle },
      "0": { label: "Routine", color: "bg-success", icon: AlertTriangle },
      R: { label: "Record Only", color: "bg-slate-300", icon: AlertTriangle },
      U: { label: "Unable to Inspect", color: "bg-slate-400", icon: AlertTriangle },
    };
    return urgencyLabels[urgency] || { label: "Unknown", color: "bg-slate-500", icon: AlertTriangle };
  };

  const getComponentUrgencyInfo = (degree: string, extent: string, relevancy: string) => {
    // Parse first character only
    const D = degree?.toString().trim().toUpperCase().charAt(0);
    const E = extent?.toString().trim().toUpperCase().charAt(0);
    const R = relevancy?.toString().trim().toUpperCase().charAt(0);

    // Special cases
    if (D === "U" || E === "U" || R === "U") return { urgency: "U", label: "Unable to Inspect", explanation: "One or more components could not be assessed" };
    if (D === "X" || D === "0") return { urgency: "R", label: "Record Only", explanation: "No defect present - record for tracking purposes" };

    // If R is numeric
    if (R === "4") return { urgency: "4", label: "Immediate", explanation: "Critical relevancy requires immediate action" };

    // Convert to numbers for decision tree
    const dNum = parseInt(D);
    const eNum = parseInt(E);
    const rNum = parseInt(R);

    if (isNaN(dNum) || isNaN(eNum) || isNaN(rNum)) {
      return { urgency: "R", label: "Record Only", explanation: "Invalid or missing D/E/R values" };
    }

    // Decision tree logic with explanations
    if (rNum === 4) return { urgency: "4", label: "Immediate", explanation: "Critical relevancy (R=4)" };
    if (rNum === 3) {
      if (dNum >= 3 && eNum >= 4) return { urgency: "4", label: "Immediate", explanation: "R=3, High degree (D≥3) and extensive (E≥4)" };
      if (dNum >= 3 || eNum >= 3) return { urgency: "3", label: "High", explanation: "R=3, High degree or extent" };
      return { urgency: "2", label: "Medium", explanation: "R=3, Moderate degree and extent" };
    }
    if (rNum === 2) {
      if (dNum >= 4 && eNum >= 4) return { urgency: "3", label: "High", explanation: "R=2, Very high degree and extent" };
      if (dNum >= 3 || eNum >= 3) return { urgency: "2", label: "Medium", explanation: "R=2, High degree or extent" };
      return { urgency: "1", label: "Low", explanation: "R=2, Low degree and extent" };
    }
    if (rNum === 1) {
      if (dNum >= 4 || eNum >= 4) return { urgency: "2", label: "Medium", explanation: "R=1, Very high degree or extent" };
      return { urgency: "1", label: "Low", explanation: "R=1, Low degree and extent" };
    }

    return { urgency: "0", label: "Minor/Monitor", explanation: "Minimal urgency" };
  };

  const getRubricMeaning = (rubric: any, value: string): string => {
    if (!rubric || !value) return "";
    
    // Parse first character for lookup
    const key = value.toString().trim().toUpperCase().charAt(0);
    
    // Check if rubric has the key
    if (rubric[key]) {
      return rubric[key];
    }
    
    // Check numeric keys
    const numKey = parseInt(key);
    if (!isNaN(numKey) && rubric[numKey]) {
      return rubric[numKey];
    }
    
    return "";
  };

  // Get photos for a specific component number
  // Supports: 1.jpg, 1_1.jpg, 1_2.jpg (component 1 with sub-photos)
  const getComponentPhotos = (componentOrder: number): any[] => {
    if (!photos || photos.length === 0) return [];
    
    return photos.filter(photo => {
      const photoNum = String(photo.photo_number);
      // Match exact number (e.g., "1") or with underscore (e.g., "1_1", "1_2")
      return photoNum === String(componentOrder) || photoNum.startsWith(`${componentOrder}_`);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
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

  const urgencyInfo = getUrgencyInfo(inspection.calculated_urgency);
  const ciBadge = getCIBadge(inspection.ci_final || inspection.conditional_index);

  // Extract CI values - PRIORITIZE calculation_metadata (authoritative stored values)
  const metadata = inspection.calculation_metadata || {};
  const ciHealth = metadata.ci_health ?? inspection.ci_health ?? null;
  const ciSafety = metadata.ci_safety ?? inspection.ci_safety ?? null;
  const ciFinal = metadata.ci_final ?? inspection.ci_final ?? inspection.conditional_index ?? null;
  const worstUrgency = metadata.worst_urgency ?? inspection.calculated_urgency ?? "R";

  // Merge stored components with latest template metadata
  const components = inspection.components || [];
  const enrichedComponents = components.map((comp: any, index: number) => {
    // Try to match by component_name first, then fall back to index matching
    let templateComp = componentTemplate?.items?.find(
      (tc: any) => tc.component_name === comp.component_name
    );

    // If no match found (e.g., generic "Comp 1"), try matching by position/index
    if (!templateComp && componentTemplate?.items?.[index]) {
      templateComp = componentTemplate.items[index];
      console.log(`[InspectionDetail] Matched component by index ${index}: "${comp.component_name}" -> "${templateComp.component_name}"`);
    }

    // Merge: use stored values for scores, but latest template for metadata including name
    return {
      ...comp,
      // Override component name from template (fixes generic "Comp 1" -> "1. Foundation")
      component_name: templateComp?.component_name || comp.component_name,
      // Override with latest template metadata if available
      what_to_inspect: templateComp?.what_to_inspect || comp.what_to_inspect,
      degree_rubric: templateComp?.degree_rubric || comp.degree_rubric,
      extent_rubric: templateComp?.extent_rubric || comp.extent_rubric,
      relevancy_rubric: templateComp?.relevancy_rubric || comp.relevancy_rubric,
      quantity_unit: templateComp?.quantity_unit || comp.quantity_unit,
    };
  });

  return (
    <TooltipProvider>
      <div className="space-y-6 pb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/inspections")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Inspections
            </Button>
            <div>
              <h1 className="text-3xl">Inspection Details</h1>
              <p className="text-muted-foreground">
                {inspection.asset_ref} - {new Date(inspection.inspection_date).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(`/inspections/${id}/edit`)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Summary Cards - Matching Edit Page Layout */}
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-lg">Overall Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">CI Health</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold">{ciHealth ?? "—"}</span>
                  {ciHealth !== null && ciHealth !== undefined && (
                    <Badge className={getCIBadgeColor(ciHealth)}>
                      {getCIBadgeText(ciHealth)}
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CI Safety</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold">{ciSafety ?? "—"}</span>
                  {ciSafety !== null && ciSafety !== undefined && (
                    <Badge className={getCIBadgeColor(ciSafety)}>
                      {getCIBadgeText(ciSafety)}
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CI Final</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold">{ciFinal ?? "—"}</span>
                  {ciFinal !== null && ciFinal !== undefined && (
                    <Badge className={getCIBadgeColor(ciFinal)}>
                      {getCIBadgeText(ciFinal)}
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Worst Urgency</p>
                <div className="mt-1">
                  {(() => {
                    const { label, color, icon: Icon } = getUrgencyBadge(worstUrgency);
                    return (
                      <Badge className={color}>
                        <Icon className="w-3 h-3 mr-1" />
                        {label}
                      </Badge>
                    );
                  })()}
                </div>
              </div>
            </div>
            {inspection.total_remedial_cost && inspection.total_remedial_cost > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">Total Remedial Cost</p>
                <p className="text-2xl font-bold text-warning mt-1 flex items-center gap-1">
                  <Banknote className="w-5 h-5" />
                  R {inspection.total_remedial_cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inspection Info */}
        <Card>
          <CardHeader>
            <CardTitle>Inspection Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Inspection Date</p>
                  <p>{new Date(inspection.inspection_date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Inspector</p>
                  <p>{inspection.inspector_name || "Unknown"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p>{inspection.road_number || inspection.road_name || "N/A"}</p>
                </div>
              </div>
            </div>
            {inspection.finding_summary && (
              <div className="flex items-start gap-3 pt-4 border-t">
                <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Finding Summary</p>
                  <p>{inspection.finding_summary}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Component Details */}
        {enrichedComponents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Component Details</CardTitle>
              <CardDescription>
                Detailed component-by-component assessment with D/E/R scoring, remedial costs, and photos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {enrichedComponents.map((comp: any, compIndex: number) => {
                  const urgencyCalc = getComponentUrgencyInfo(
                    comp.degree_value,
                    comp.extent_value,
                    comp.relevancy_value
                  );
                  
                  const degreeMeaning = getRubricMeaning(comp.degree_rubric, comp.degree_value);
                  const extentMeaning = getRubricMeaning(comp.extent_rubric, comp.extent_value);
                  const relevancyMeaning = getRubricMeaning(comp.relevancy_rubric, comp.relevancy_value);

                  return (
                    <div key={`comp-${comp.component_order}-${compIndex}`} className="p-5 border rounded-lg bg-muted/30">
                      {/* Component Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-lg">{comp.component_name}</h4>
                          </div>
                          {comp.what_to_inspect && (
                            <p className="text-sm text-muted-foreground italic">
                              What to Inspect: {comp.what_to_inspect}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {comp.ci_component !== null && comp.ci_component !== undefined && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className="text-sm px-3 py-1">
                                  CI: {Math.round(comp.ci_component)}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Component Conditional Index (0-100)</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant={getUrgencyInfo(urgencyCalc.urgency).variant} className="text-sm px-3 py-1">
                                U: {urgencyCalc.urgency}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">
                                <strong>{urgencyCalc.label}</strong><br/>
                                {urgencyCalc.explanation}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>

                      {/* D/E/R Grid */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="p-3 bg-background rounded border">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs uppercase text-muted-foreground font-medium">Degree (Defect)</p>
                            {degreeMeaning && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="w-3 h-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">{degreeMeaning}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <p className="text-2xl font-bold">{comp.degree_value || "—"}</p>
                          {degreeMeaning && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{degreeMeaning}</p>
                          )}
                        </div>
                        <div className="p-3 bg-background rounded border">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs uppercase text-muted-foreground font-medium">Extent</p>
                            {extentMeaning && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="w-3 h-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">{extentMeaning}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <p className="text-2xl font-bold">{comp.extent_value || "—"}</p>
                          {extentMeaning && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{extentMeaning}</p>
                          )}
                        </div>
                        <div className="p-3 bg-background rounded border">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs uppercase text-muted-foreground font-medium">Relevancy</p>
                            {relevancyMeaning && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="w-3 h-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">{relevancyMeaning}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <p className="text-2xl font-bold">{comp.relevancy_value || "—"}</p>
                          {relevancyMeaning && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{relevancyMeaning}</p>
                          )}
                        </div>
                      </div>

                      {/* Remedial Details */}
                      {(comp.quantity || comp.rate || comp.component_cost) && (
                        <div className="grid grid-cols-4 gap-3 mb-4 p-3 bg-background rounded border">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Quantity</p>
                            <p className="font-medium">{comp.quantity || "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Unit</p>
                            <p className="font-medium">{comp.quantity_unit || "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Rate</p>
                            <p className="font-medium">{comp.rate ? `R ${comp.rate.toLocaleString()}` : "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Cost</p>
                            <p className="font-medium text-[#F8D227]">
                              {comp.component_cost ? `R ${comp.component_cost.toLocaleString()}` : "—"}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Notes/Comments */}
                      {comp.component_notes && (
                        <div className="mb-4">
                          <p className="text-xs text-muted-foreground mb-1">Notes</p>
                          <p className="text-sm p-3 bg-background rounded border">{comp.component_notes}</p>
                        </div>
                      )}

                      {/* Remedial Work Description */}
                      {comp.remedial_work_description && (
                        <div className="mb-4">
                          <p className="text-xs text-muted-foreground mb-1">Remedial Work Description</p>
                          <p className="text-sm p-3 bg-background rounded border">{comp.remedial_work_description}</p>
                        </div>
                      )}

                      {/* Component Photos */}
                      {(() => {
                        const componentPhotos = getComponentPhotos(comp.component_order);
                        return componentPhotos.length > 0 ? (
                          <div className="mb-4">
                            <p className="text-xs text-muted-foreground mb-2">Component Photos ({componentPhotos.length})</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {componentPhotos.map((photo, idx) => (
                                <div
                                  key={`comp-${comp.component_order}-${compIndex}-photo-${idx}`}
                                  className="relative group cursor-pointer rounded-lg overflow-hidden border hover:border-primary transition-colors"
                                  onClick={() => window.open(photo.signedUrl || photo.url, '_blank')}
                                >
                                  <div className="aspect-square relative">
                                    {photo.signedUrl || photo.url ? (
                                      <img
                                        src={photo.signedUrl || photo.url}
                                        alt={`Component ${comp.component_order} Photo ${photo.photo_number}`}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';
                                        }}
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-muted">
                                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1.5 text-white text-xs text-center">
                                    Photo {photo.photo_number}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null;
                      })()}

                      {/* Legacy photo URL support */}
                      {comp.photo_url && getComponentPhotos(comp.component_order).length === 0 && (
                        <div className="flex items-center gap-2 p-3 bg-background rounded border">
                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
                          <a 
                            href={comp.photo_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            View Photo
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Maintenance Records */}
        {maintenanceRecords.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Records</CardTitle>
              <CardDescription>
                Maintenance activities linked to this inspection ({maintenanceRecords.length} record{maintenanceRecords.length !== 1 ? 's' : ''})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {maintenanceRecords.map((record: any) => {
                  const getStatusBadge = (status: string) => {
                    const statusMap: Record<string, { variant: "default" | "destructive" | "outline" | "secondary" }> = {
                      "Scheduled": { variant: "outline" },
                      "In Progress": { variant: "default" },
                      "Completed": { variant: "secondary" },
                      "Cancelled": { variant: "destructive" },
                    };
                    return statusMap[status] || { variant: "outline" };
                  };

                  return (
                    <div 
                      key={record.maintenance_id} 
                      className="p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/maintenance/${record.maintenance_id}`)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <Wrench className="w-4 h-4 text-muted-foreground" />
                            <h4 className="font-semibold">{record.maintenance_type || "Maintenance"}</h4>
                            {record.status && (
                              <Badge variant={getStatusBadge(record.status).variant} className="text-xs">
                                {record.status}
                              </Badge>
                            )}
                          </div>
                          {record.description && (
                            <p className="text-sm text-muted-foreground ml-7">{record.description}</p>
                          )}
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="grid grid-cols-3 gap-4 ml-7 mt-2">
                        {record.scheduled_date && (
                          <div>
                            <p className="text-xs text-muted-foreground">Scheduled</p>
                            <p className="text-sm font-medium">{new Date(record.scheduled_date).toLocaleDateString()}</p>
                          </div>
                        )}
                        {record.actual_cost && (
                          <div>
                            <p className="text-xs text-muted-foreground">Cost</p>
                            <p className="text-sm font-medium text-[#F8D227]">R {record.actual_cost.toLocaleString()}</p>
                          </div>
                        )}
                        {record.work_order_number && (
                          <div>
                            <p className="text-xs text-muted-foreground">Work Order</p>
                            <p className="text-sm font-medium">{record.work_order_number}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Maintenance Button */}
        <div className="flex items-center justify-end">
          <Button variant="outline" onClick={handleCreateMaintenance}>
            <Plus className="w-4 h-4 mr-2" />
            Create Maintenance Record
          </Button>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this inspection? This action cannot be undone.
                All component scores and associated data will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete Inspection
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}