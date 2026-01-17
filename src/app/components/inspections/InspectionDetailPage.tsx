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

  // Extract CI Health and CI Safety from the new view fields
  const ciHealth = inspection.ci_health;
  const ciSafety = inspection.ci_safety;
  const ciFinal = inspection.ci_final || inspection.conditional_index;

  // Use components from API response
  const components = inspection.components || [];

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

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                CI Final
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Final Conditional Index is the minimum of CI Health and CI Safety (0-100 scale, higher = better condition)</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl">{ciFinal !== null && ciFinal !== undefined ? Math.round(ciFinal) : "—"}</div>
              <Badge variant={ciBadge.variant} className="mt-2">
                {ciBadge.label}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">0-100 scale (higher = better)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                CI Health
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Average of all component CI scores. Calculated from D/E/R penalty model: P = 0.5*(D/3) + 0.25*((E-1)/3) + 0.25*((R-1)/3), CI = 100*(1-P)</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl">{ciHealth !== null && ciHealth !== undefined ? Math.round(ciHealth) : "—"}</div>
              <p className="text-xs text-muted-foreground mt-2">Average component condition</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                CI Safety
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Safety score based on worst urgency: R→100, 0→90, 1→75, 2→50, 3→25, 4→0</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl">{ciSafety !== null && ciSafety !== undefined ? Math.round(ciSafety) : "—"}</div>
              <p className="text-xs text-muted-foreground mt-2">Urgency-based safety score</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                DERU Score
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Derived severity index used for ranking and prioritization analytics. Higher values indicate greater need for intervention.</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl">{inspection.deru_value !== null && inspection.deru_value !== undefined ? inspection.deru_value.toFixed(2) : "—"}</div>
              <p className="text-xs text-muted-foreground mt-2">Prioritization index</p>
            </CardContent>
          </Card>
        </div>

        {/* Urgency and Cost */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Urgency Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Worst Component Urgency</p>
                  <Badge variant={urgencyInfo.variant} className="text-base px-4 py-2">
                    {urgencyInfo.label} ({inspection.calculated_urgency})
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {(inspection.calculated_urgency === "4" || inspection.calculated_urgency === "Immediate") && "Requires immediate action for safety"}
                  {(inspection.calculated_urgency === "3" || inspection.calculated_urgency === "High") && "High priority - address promptly"}
                  {(inspection.calculated_urgency === "2" || inspection.calculated_urgency === "Medium") && "Medium priority - schedule maintenance"}
                  {(inspection.calculated_urgency === "1" || inspection.calculated_urgency === "Low") && "Low priority - monitor condition"}
                  {inspection.calculated_urgency === "0" && "Minor issues - routine monitoring"}
                  {inspection.calculated_urgency === "R" && "Record only - no action required"}
                  {inspection.calculated_urgency === "U" && "Unable to inspect - revisit required"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="w-5 h-5" />
                Remedial Costs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl text-[#F8D227] bg-[#010D13] px-3 py-2 rounded inline-flex items-center gap-2">
                R {inspection.total_remedial_cost ? inspection.total_remedial_cost.toLocaleString() : "0"}
              </div>
              <p className="text-sm text-muted-foreground mt-2">Estimated repair/replacement cost</p>
            </CardContent>
          </Card>
        </div>

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
        {components.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Component Details</CardTitle>
              <CardDescription>
                Detailed component-by-component assessment with D/E/R scoring, remedial costs, and photos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {components.map((comp: any) => {
                  const urgencyCalc = getComponentUrgencyInfo(
                    comp.degree_value,
                    comp.extent_value,
                    comp.relevancy_value
                  );
                  
                  const degreeMeaning = getRubricMeaning(comp.degree_rubric, comp.degree_value);
                  const extentMeaning = getRubricMeaning(comp.extent_rubric, comp.extent_value);
                  const relevancyMeaning = getRubricMeaning(comp.relevancy_rubric, comp.relevancy_value);

                  return (
                    <div key={comp.component_order} className="p-5 border rounded-lg bg-muted/30">
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

                      {/* Photo */}
                      {comp.photo_url && (
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