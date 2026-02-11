import { useState, useContext } from "react";
import { AuthContext } from "../../App";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { 
  CheckCircle2, AlertCircle, Loader2, ChevronRight, ChevronLeft,
  Package, User, Calendar, DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";

interface BulkWorkOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preFilteredAssets: any[];
  filterDescription: string;
  onSuccess?: () => void;
}

export function BulkWorkOrderDialog({
  open,
  onOpenChange,
  preFilteredAssets,
  filterDescription,
  onSuccess
}: BulkWorkOrderDialogProps) {
  const { user, accessToken } = useContext(AuthContext);
  const [step, setStep] = useState(1); // 1: Select Assets, 2: Work Order Details, 3: Review
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);
  
  const [workOrderDetails, setWorkOrderDetails] = useState({
    maintenance_type: "",
    scheduled_date: "",
    technician_name: user?.name || "",
    estimated_cost_per_unit: "",
    description: "",
    notes: ""
  });

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  // Toggle asset selection
  const toggleAsset = (assetId: string) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  // Select all assets
  const selectAll = () => {
    setSelectedAssets(preFilteredAssets.map(a => a.asset_id));
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedAssets([]);
  };

  // Calculate total estimated cost
  const getTotalEstimatedCost = () => {
    const perUnit = parseFloat(workOrderDetails.estimated_cost_per_unit) || 0;
    return perUnit * selectedAssets.length;
  };

  // Create bulk work orders
  const handleCreateWorkOrders = async () => {
    if (selectedAssets.length === 0) {
      toast.error("Please select at least one asset");
      return;
    }

    if (!workOrderDetails.maintenance_type) {
      toast.error("Please select a maintenance type");
      return;
    }

    if (!workOrderDetails.scheduled_date) {
      toast.error("Please select a scheduled date");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/maintenance/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
        body: JSON.stringify({
          asset_ids: selectedAssets,
          maintenance_type: workOrderDetails.maintenance_type,
          scheduled_date: workOrderDetails.scheduled_date,
          technician_name: workOrderDetails.technician_name,
          estimated_cost: workOrderDetails.estimated_cost_per_unit 
            ? parseFloat(workOrderDetails.estimated_cost_per_unit) 
            : null,
          description: workOrderDetails.description,
          notes: `${workOrderDetails.notes}\n\nBulk created for: ${filterDescription}`.trim(),
          status: "Scheduled"
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setCreated(true);
        toast.success(`${result.count || selectedAssets.length} work orders created successfully!`);
        
        // Wait a moment then close and refresh
        setTimeout(() => {
          onOpenChange(false);
          onSuccess?.();
          
          // Reset state for next time
          setTimeout(() => {
            setStep(1);
            setSelectedAssets([]);
            setCreated(false);
            setWorkOrderDetails({
              maintenance_type: "",
              scheduled_date: "",
              technician_name: user?.name || "",
              estimated_cost_per_unit: "",
              description: "",
              notes: ""
            });
          }, 300);
        }, 1500);
      } else {
        const error = await response.json();
        toast.error(`Failed to create work orders: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error creating bulk work orders:", error);
      toast.error("Failed to create work orders. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    // Success state
    if (created) {
      return (
        <div className="py-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Work Orders Created!</h3>
          <p className="text-muted-foreground">
            Successfully created {selectedAssets.length} work order{selectedAssets.length !== 1 ? 's' : ''}
          </p>
        </div>
      );
    }

    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Filter Context</p>
                <p className="text-xs text-muted-foreground">{filterDescription}</p>
              </div>
              <Badge variant="outline" className="ml-2">
                {preFilteredAssets.length} asset{preFilteredAssets.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            <div className="flex gap-2 border-b pb-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={selectAll}
                disabled={selectedAssets.length === preFilteredAssets.length}
              >
                Select All
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={deselectAll}
                disabled={selectedAssets.length === 0}
              >
                Clear
              </Button>
              <div className="ml-auto text-sm text-muted-foreground flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-1 text-green-600" />
                {selectedAssets.length} selected
              </div>
            </div>

            <ScrollArea className="h-[400px] border rounded-md p-4">
              <div className="space-y-2">
                {preFilteredAssets.map((asset) => (
                  <div 
                    key={asset.asset_id}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => toggleAsset(asset.asset_id)}
                  >
                    <Checkbox 
                      checked={selectedAssets.includes(asset.asset_id)}
                      onCheckedChange={() => toggleAsset(asset.asset_id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {asset.asset_ref || asset.asset_id?.substring(0, 8)}
                      </p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {asset.asset_type_name || asset.type || 'Unknown'}
                        </Badge>
                        {asset.road_number && (
                          <span className="text-xs text-muted-foreground">
                            {asset.road_number}
                          </span>
                        )}
                        {asset.latest_ci !== null && asset.latest_ci !== undefined && (
                          <Badge 
                            variant="outline" 
                            className="text-xs"
                            style={{ 
                              borderColor: asset.latest_ci < 40 ? '#EF4444' : '#F8D227',
                              color: asset.latest_ci < 40 ? '#EF4444' : '#F8D227'
                            }}
                          >
                            CI: {asset.latest_ci}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {preFilteredAssets.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No assets match the current filters</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="bg-accent/50 p-3 rounded-lg border">
              <div className="flex items-center gap-2 text-sm">
                <Package className="w-4 h-4" />
                <span className="font-medium">
                  Creating work orders for {selectedAssets.length} asset{selectedAssets.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Maintenance Type *</Label>
                <Select 
                  value={workOrderDetails.maintenance_type} 
                  onValueChange={(value) => setWorkOrderDetails({ ...workOrderDetails, maintenance_type: value })}
                >
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
                <Label className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Scheduled Date *
                </Label>
                <Input
                  type="date"
                  value={workOrderDetails.scheduled_date}
                  onChange={(e) => setWorkOrderDetails({ ...workOrderDetails, scheduled_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Technician Name
                </Label>
                <Input
                  value={workOrderDetails.technician_name}
                  onChange={(e) => setWorkOrderDetails({ ...workOrderDetails, technician_name: e.target.value })}
                  placeholder="Assigned technician"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  Estimated Cost per Asset (R)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={workOrderDetails.estimated_cost_per_unit}
                  onChange={(e) => setWorkOrderDetails({ ...workOrderDetails, estimated_cost_per_unit: e.target.value })}
                  placeholder="0.00"
                />
                {workOrderDetails.estimated_cost_per_unit && (
                  <p className="text-xs text-muted-foreground">
                    Total estimated cost: R {getTotalEstimatedCost().toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={workOrderDetails.description}
                onChange={(e) => setWorkOrderDetails({ ...workOrderDetails, description: e.target.value })}
                placeholder="Brief description of maintenance work..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                value={workOrderDetails.notes}
                onChange={(e) => setWorkOrderDetails({ ...workOrderDetails, notes: e.target.value })}
                placeholder="Any additional information..."
                rows={2}
              />
            </div>
          </div>
        );

      case 3:
        const selectedAssetDetails = preFilteredAssets.filter(a => 
          selectedAssets.includes(a.asset_id)
        );
        
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                Review Before Creating
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Assets</p>
                  <p className="font-medium">{selectedAssets.length} work order{selectedAssets.length !== 1 ? 's' : ''}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Maintenance Type</p>
                  <p className="font-medium">{workOrderDetails.maintenance_type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Scheduled Date</p>
                  <p className="font-medium">
                    {new Date(workOrderDetails.scheduled_date).toLocaleDateString('en-ZA')}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Technician</p>
                  <p className="font-medium">{workOrderDetails.technician_name || 'Not assigned'}</p>
                </div>
                {workOrderDetails.estimated_cost_per_unit && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Total Estimated Cost</p>
                    <p className="font-medium text-lg">
                      R {getTotalEstimatedCost().toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Assets to be allocated:</h4>
              <ScrollArea className="h-[300px] border rounded-md p-3">
                <div className="space-y-1">
                  {selectedAssetDetails.map((asset, idx) => (
                    <div key={asset.asset_id} className="flex items-center gap-2 text-xs p-2 border-b">
                      <span className="text-muted-foreground w-6">{idx + 1}.</span>
                      <span className="font-medium flex-1">
                        {asset.asset_ref || asset.asset_id?.substring(0, 8)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {asset.asset_type_name || asset.type}
                      </Badge>
                      {asset.road_number && (
                        <span className="text-muted-foreground">{asset.road_number}</span>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Bulk Allocate Work Orders
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Select assets to create work orders for"}
            {step === 2 && "Enter work order details"}
            {step === 3 && "Review and confirm"}
            {created && "Work orders created successfully"}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        {!created && (
          <div className="flex items-center justify-center gap-2 py-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    s === step 
                      ? 'bg-blue-600 text-white' 
                      : s < step 
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {s < step ? <CheckCircle2 className="w-4 h-4" /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-12 h-1 mx-1 ${s < step ? 'bg-green-600' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {renderStepContent()}
        </div>

        <DialogFooter className="border-t pt-4">
          {!created && (
            <>
              {step > 1 && (
                <Button 
                  variant="outline" 
                  onClick={() => setStep(step - 1)}
                  disabled={loading}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
              
              {step < 3 && (
                <Button 
                  onClick={() => setStep(step + 1)}
                  disabled={step === 1 && selectedAssets.length === 0}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}

              {step === 3 && (
                <Button 
                  onClick={handleCreateWorkOrders}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Create {selectedAssets.length} Work Order{selectedAssets.length !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
