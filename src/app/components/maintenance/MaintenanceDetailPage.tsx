import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../../App";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { 
  ArrowLeft, Calendar, User, MapPin, FileText, Wrench, 
  Banknote, Trash2, Edit, DollarSign, CheckCircle2, Clock, AlertTriangle, ExternalLink, ClipboardCheck
} from "lucide-react";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { toast } from "sonner";
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

export default function MaintenanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accessToken } = useContext(AuthContext);
  const [maintenance, setMaintenance] = useState<any>(null);
  const [inspection, setInspection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  useEffect(() => {
    if (id) {
      fetchMaintenance();
    }
  }, [id]);

  const fetchMaintenance = async () => {
    try {
      const response = await fetch(`${API_URL}/maintenance/${id}`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMaintenance(data.maintenance);
        
        // If linked to an inspection, fetch inspection details
        if (data.maintenance?.inspection_id) {
          fetchInspectionDetails(data.maintenance.inspection_id);
        }
      } else {
        toast.error("Failed to load maintenance record");
        navigate("/maintenance");
      }
    } catch (error) {
      console.error("Error fetching maintenance:", error);
      toast.error("Error loading maintenance record");
    } finally {
      setLoading(false);
    }
  };

  const fetchInspectionDetails = async (inspectionId: string) => {
    try {
      const response = await fetch(`${API_URL}/inspections/${inspectionId}`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInspection(data.inspection);
      }
    } catch (error) {
      console.error("Error fetching inspection:", error);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`${API_URL}/maintenance/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        toast.success("Maintenance record deleted successfully");
        navigate("/maintenance");
      } else {
        toast.error("Failed to delete maintenance record");
      }
    } catch (error) {
      console.error("Error deleting maintenance:", error);
      toast.error("Error deleting maintenance record");
    }
  };

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "destructive" | "outline" | "secondary" }> = {
      "Scheduled": { label: "Scheduled", variant: "outline" },
      "pending": { label: "Pending", variant: "outline" },
      "in_progress": { label: "In Progress", variant: "default" },
      "In Progress": { label: "In Progress", variant: "default" },
      "completed": { label: "Completed", variant: "secondary" },
      "Completed": { label: "Completed", variant: "secondary" },
      "Cancelled": { label: "Cancelled", variant: "destructive" },
      "cancelled": { label: "Cancelled", variant: "destructive" },
    };
    return statusMap[status] || { label: status, variant: "outline" as const };
  };

  const getUrgencyInfo = (urgency: string | number) => {
    const urgencyStr = String(urgency);
    const urgencyMap: Record<string, { label: string; variant: "default" | "destructive" | "outline" | "secondary" }> = {
      "1": { label: "Low", variant: "secondary" },
      "2": { label: "Medium", variant: "outline" },
      "3": { label: "High", variant: "destructive" },
      "4": { label: "Immediate", variant: "destructive" },
      "Low": { label: "Low", variant: "secondary" },
      "Medium": { label: "Medium", variant: "outline" },
      "High": { label: "High", variant: "destructive" },
      "Immediate": { label: "Immediate", variant: "destructive" },
    };
    return urgencyMap[urgencyStr] || { label: urgencyStr || "Unknown", variant: "outline" as const };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!maintenance) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Maintenance record not found</p>
      </div>
    );
  }

  const statusInfo = getStatusInfo(maintenance.status);
  const urgencyInfo = maintenance.urgency_label ? getUrgencyInfo(maintenance.urgency_label) : null;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/maintenance")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Maintenance
          </Button>
          <div>
            <h1 className="text-3xl">Maintenance Record</h1>
            <p className="text-muted-foreground">
              {maintenance.asset_ref} - {maintenance.maintenance_type}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
            <CardTitle className="text-sm">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={statusInfo.variant} className="text-lg px-4 py-2">
              {statusInfo.label}
            </Badge>
          </CardContent>
        </Card>

        {urgencyInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Urgency</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={urgencyInfo.variant} className="text-lg px-4 py-2">
                {urgencyInfo.label}
              </Badge>
            </CardContent>
          </Card>
        )}

        {maintenance.estimated_cost && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Estimated Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                R {parseFloat(maintenance.estimated_cost).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
        )}

        {maintenance.actual_cost && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Actual Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                R {parseFloat(maintenance.actual_cost).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Details Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Asset & Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Asset & Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Asset Reference</p>
              <p className="font-medium">{maintenance.asset_ref || "N/A"}</p>
            </div>
            {maintenance.asset_type_name && (
              <div>
                <p className="text-sm text-muted-foreground">Asset Type</p>
                <p className="font-medium">{maintenance.asset_type_name}</p>
              </div>
            )}
            {maintenance.road_number && (
              <div>
                <p className="text-sm text-muted-foreground">Route/Road</p>
                <p className="font-medium">{maintenance.road_number}</p>
              </div>
            )}
            {maintenance.chainage_km && (
              <div>
                <p className="text-sm text-muted-foreground">Chainage (km)</p>
                <p className="font-medium">{maintenance.chainage_km}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Maintenance Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Maintenance Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-medium">{maintenance.maintenance_type || "N/A"}</p>
            </div>
            {maintenance.work_order_number && (
              <div>
                <p className="text-sm text-muted-foreground">Work Order #</p>
                <p className="font-medium">{maintenance.work_order_number}</p>
              </div>
            )}
            {maintenance.contractor_name && (
              <div>
                <p className="text-sm text-muted-foreground">Contractor</p>
                <p className="font-medium">{maintenance.contractor_name}</p>
              </div>
            )}
            {maintenance.assigned_to && (
              <div>
                <p className="text-sm text-muted-foreground">Assigned To</p>
                <p className="font-medium">{maintenance.assigned_to}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {maintenance.scheduled_date && (
              <div>
                <p className="text-sm text-muted-foreground">Scheduled Date</p>
                <p className="font-medium">
                  {new Date(maintenance.scheduled_date).toLocaleDateString('en-ZA')}
                </p>
              </div>
            )}
            {maintenance.completed_date && (
              <div>
                <p className="text-sm text-muted-foreground">Completed Date</p>
                <p className="font-medium">
                  {new Date(maintenance.completed_date).toLocaleDateString('en-ZA')}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">
                {new Date(maintenance.created_at).toLocaleDateString('en-ZA')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Description & Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Description & Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {maintenance.description && (
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="font-medium whitespace-pre-wrap">{maintenance.description}</p>
              </div>
            )}
            {maintenance.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="font-medium whitespace-pre-wrap">{maintenance.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Linked Inspection */}
      {inspection && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" />
              Source Inspection
            </CardTitle>
            <CardDescription>
              This maintenance was created based on findings from an inspection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              className="p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => navigate(`/inspections/${inspection.inspection_id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-lg">{inspection.asset_ref}</h4>
                    {inspection.calculated_urgency && (
                      <Badge variant={getUrgencyInfo(inspection.calculated_urgency).variant} className="text-xs">
                        {getUrgencyInfo(inspection.calculated_urgency).label}
                      </Badge>
                    )}
                  </div>
                  {inspection.finding_summary && (
                    <p className="text-sm text-muted-foreground">{inspection.finding_summary}</p>
                  )}
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Inspection Date</p>
                  <p className="text-sm font-medium">
                    {new Date(inspection.inspection_date).toLocaleDateString('en-ZA')}
                  </p>
                </div>
                {inspection.conditional_index !== null && inspection.conditional_index !== undefined && (
                  <div>
                    <p className="text-xs text-muted-foreground">CI Score</p>
                    <p className="text-sm font-medium">{Math.round(inspection.conditional_index)}/100</p>
                  </div>
                )}
                {inspection.total_remedial_cost && (
                  <div>
                    <p className="text-xs text-muted-foreground">Estimated Cost</p>
                    <p className="text-sm font-medium text-[#F8D227]">
                      R {inspection.total_remedial_cost.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Maintenance Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the maintenance record
              for {maintenance.asset_ref}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}