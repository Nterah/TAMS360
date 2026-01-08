import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../App";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";

export default function NewMaintenancePage() {
  const navigate = useNavigate();
  const { user, accessToken } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    asset_id: "",
    maintenance_type: "",
    scheduled_date: "",
    completed_date: "",
    technician_name: user?.name || "",
    cost: "",
    status: "Scheduled",
    description: "",
    work_performed: "",
    parts_used: "",
    notes: "",
  });

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  useEffect(() => {
    fetchAssets();
  }, []);

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

  const handleSubmit = async () => {
    if (!formData.asset_id || !formData.maintenance_type) {
      toast.error("Please fill in required fields");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/maintenance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
        body: JSON.stringify({
          ...formData,
          cost: formData.cost ? parseFloat(formData.cost) : null,
          logged_by: user?.id,
        }),
      });

      if (response.ok) {
        toast.success("Maintenance record created successfully!");
        navigate("/maintenance");
      } else {
        const error = await response.json();
        toast.error(`Error: ${error.error || "Failed to create maintenance record"}`);
      }
    } catch (error) {
      console.error("Error creating maintenance record:", error);
      toast.error("Failed to create maintenance record");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/maintenance")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">Log Maintenance Activity</h1>
          <p className="text-muted-foreground">Record maintenance work performed on assets</p>
        </div>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Record
            </>
          )}
        </Button>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Asset *</Label>
              <Select value={formData.asset_id} onValueChange={(value) => setFormData({ ...formData, asset_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select asset" />
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
              <Label>Maintenance Type *</Label>
              <Select value={formData.maintenance_type} onValueChange={(value) => setFormData({ ...formData, maintenance_type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Preventive">Preventive</SelectItem>
                  <SelectItem value="Corrective">Corrective</SelectItem>
                  <SelectItem value="Emergency">Emergency</SelectItem>
                  <SelectItem value="Inspection">Inspection</SelectItem>
                  <SelectItem value="Cleaning">Cleaning</SelectItem>
                  <SelectItem value="Repair">Repair</SelectItem>
                  <SelectItem value="Replacement">Replacement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Scheduled">Scheduled</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Technician Name</Label>
              <Input
                value={formData.technician_name}
                onChange={(e) => setFormData({ ...formData, technician_name: e.target.value })}
                placeholder="Name of technician"
              />
            </div>

            <div className="space-y-2">
              <Label>Scheduled Date</Label>
              <Input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Completed Date</Label>
              <Input
                type="date"
                value={formData.completed_date}
                onChange={(e) => setFormData({ ...formData, completed_date: e.target.value })}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Cost (R)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of maintenance activity..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Work Performed</Label>
            <Textarea
              value={formData.work_performed}
              onChange={(e) => setFormData({ ...formData, work_performed: e.target.value })}
              placeholder="Detailed description of work completed..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Parts Used</Label>
            <Textarea
              value={formData.parts_used}
              onChange={(e) => setFormData({ ...formData, parts_used: e.target.value })}
              placeholder="List of parts and materials used..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional observations or notes..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
