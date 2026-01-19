import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../App";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Checkbox } from "../ui/checkbox";
import { ArrowLeft, AlertTriangle, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Alert, AlertDescription } from "../ui/alert";

interface UnassignedAsset {
  asset_id: string;
  asset_ref: string;
  asset_type_name: string;
  road_number: string;
  region: string;
  depot: string;
  install_date: string;
  created_at: string;
}

export default function UnassignedAssetsPage() {
  const navigate = useNavigate();
  const { accessToken, user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<UnassignedAsset[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  useEffect(() => {
    fetchUnassignedAssets();
  }, []);

  const fetchUnassignedAssets = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/unassigned-assets`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAssets(data.assets || []);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to load unassigned assets");
      }
    } catch (error) {
      console.error("Error fetching unassigned assets:", error);
      toast.error("Failed to load unassigned assets");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAssets(new Set(assets.map(a => a.asset_id)));
    } else {
      setSelectedAssets(new Set());
    }
  };

  const handleSelectAsset = (assetId: string, checked: boolean) => {
    const newSelected = new Set(selectedAssets);
    if (checked) {
      newSelected.add(assetId);
    } else {
      newSelected.delete(assetId);
    }
    setSelectedAssets(newSelected);
  };

  const handleClaimAssets = async () => {
    if (selectedAssets.size === 0) {
      toast.error("Please select at least one asset");
      return;
    }

    setClaiming(true);
    try {
      const response = await fetch(`${API_URL}/admin/claim-assets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          assetIds: Array.from(selectedAssets),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Successfully claimed ${data.claimed} asset(s) to your organization`);
        
        if (data.failed > 0) {
          toast.warning(`${data.failed} asset(s) could not be claimed`);
        }

        // Refresh list
        setSelectedAssets(new Set());
        setShowClaimDialog(false);
        fetchUnassignedAssets();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to claim assets");
      }
    } catch (error) {
      console.error("Error claiming assets:", error);
      toast.error("Failed to claim assets");
    } finally {
      setClaiming(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  if (user?.role !== "admin") {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Admin access required to view this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/admin")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Unassigned Assets</h1>
          <p className="text-muted-foreground mt-1">
            Legacy assets with missing tenant assignment - claim them to your organization
          </p>
        </div>
        <Button onClick={fetchUnassignedAssets} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Warning Banner */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> Only claim assets that belong to your organization. 
          This action assigns these assets to your tenant and cannot be easily undone.
          Contact support if you accidentally claim the wrong assets.
        </AlertDescription>
      </Alert>

      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Unassigned Assets Summary</span>
            <Badge variant={assets.length > 0 ? "destructive" : "default"}>
              {assets.length} Unassigned
            </Badge>
          </CardTitle>
          <CardDescription>
            Assets that need to be assigned to a tenant organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedAssets.size > 0 && (
            <div className="mb-4 flex items-center justify-between bg-blue-50 p-4 rounded-lg border border-blue-200">
              <span className="text-sm font-medium">
                {selectedAssets.size} asset(s) selected
              </span>
              <Button
                onClick={() => setShowClaimDialog(true)}
                disabled={claiming}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Claim Selected Assets
              </Button>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-4">Loading unassigned assets...</p>
            </div>
          ) : assets.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">All Assets Assigned</h3>
              <p className="text-sm text-muted-foreground">
                There are no unassigned assets in the database.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedAssets.size === assets.length && assets.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Asset Reference</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Road</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Depot</TableHead>
                    <TableHead>Installed</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset) => (
                    <TableRow key={asset.asset_id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedAssets.has(asset.asset_id)}
                          onCheckedChange={(checked) =>
                            handleSelectAsset(asset.asset_id, !!checked)
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">{asset.asset_ref}</TableCell>
                      <TableCell>{asset.asset_type_name}</TableCell>
                      <TableCell>{asset.road_number || "—"}</TableCell>
                      <TableCell>{asset.region || "—"}</TableCell>
                      <TableCell>{asset.depot || "—"}</TableCell>
                      <TableCell>{formatDate(asset.install_date)}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDate(asset.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Claim Confirmation Dialog */}
      <Dialog open={showClaimDialog} onOpenChange={setShowClaimDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Claim Assets to Your Organization?</DialogTitle>
            <DialogDescription>
              You are about to claim {selectedAssets.size} asset(s) to your organization's tenant.
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This action assigns tenant ownership and cannot be easily reversed.
              Only proceed if these assets belong to your organization.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowClaimDialog(false)}
              disabled={claiming}
            >
              Cancel
            </Button>
            <Button onClick={handleClaimAssets} disabled={claiming}>
              {claiming ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Claiming...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Claim
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
