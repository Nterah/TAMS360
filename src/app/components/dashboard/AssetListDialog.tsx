import { useState } from "react";
import { useNavigate } from "react-router";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Eye, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";

interface Asset {
  id: string;
  asset_ref: string;
  asset_type?: string;
  road_name?: string;
  latest_ci?: number;
  latest_urgency?: number;
  status?: string;
  gps_lat?: string;
  gps_lng?: string;
}

interface AssetListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: Asset[];
  title: string;
  onAssetDeleted?: () => void;
}

export function AssetListDialog({ open, onOpenChange, assets, title, onAssetDeleted }: AssetListDialogProps) {
  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleView = (assetId: string) => {
    onOpenChange(false);
    navigate(`/assets/${assetId}`);
  };

  const handleEdit = (assetId: string) => {
    onOpenChange(false);
    navigate(`/assets/${assetId}?edit=true`);
  };

  const handleDelete = async (assetId: string, assetRef: string) => {
    if (!confirm(`Are you sure you want to delete asset ${assetRef}? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(assetId);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff/assets/${assetId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete asset');
      }

      toast.success(`Asset ${assetRef} deleted successfully`);
      
      // Close dialog and notify parent to refresh data
      onOpenChange(false);
      if (onAssetDeleted) {
        onAssetDeleted();
      }
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast.error(`Failed to delete asset ${assetRef}`);
    } finally {
      setDeletingId(null);
    }
  };

  const getCIBadgeColor = (ci?: number) => {
    if (!ci) return 'bg-gray-100 text-gray-800';
    if (ci < 20) return 'bg-red-100 text-red-800';
    if (ci < 40) return 'bg-orange-100 text-orange-800';
    if (ci < 60) return 'bg-yellow-100 text-yellow-800';
    if (ci < 80) return 'bg-blue-100 text-blue-800';
    return 'bg-green-100 text-green-800';
  };

  const getUrgencyBadgeColor = (urgency?: number) => {
    if (!urgency) return 'bg-gray-100 text-gray-800';
    if (urgency >= 4) return 'bg-red-100 text-red-800';
    if (urgency === 3) return 'bg-orange-100 text-orange-800';
    if (urgency === 2) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{title}</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            {assets.length} asset{assets.length !== 1 ? 's' : ''} found
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {assets.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-500">
              No assets found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700 w-[140px]">Actions</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Asset Ref</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Road</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">CI</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Urgency</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {assets.map((asset) => (
                    <tr key={asset.id || `asset-${asset.asset_ref}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(asset.id)}
                            className="h-8 w-8 p-0"
                            title="View details"
                          >
                            <Eye className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(asset.id)}
                            className="h-8 w-8 p-0"
                            title="Edit asset"
                          >
                            <Pencil className="h-4 w-4 text-gray-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(asset.id, asset.asset_ref)}
                            disabled={deletingId === asset.id}
                            className="h-8 w-8 p-0"
                            title="Delete asset"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{asset.asset_ref}</td>
                      <td className="px-4 py-3 text-gray-600">{asset.asset_type || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{asset.road_name || '—'}</td>
                      <td className="px-4 py-3">
                        {asset.latest_ci !== null && asset.latest_ci !== undefined ? (
                          <Badge className={getCIBadgeColor(asset.latest_ci)}>
                            CI {asset.latest_ci}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {asset.latest_urgency ? (
                          <Badge className={getUrgencyBadgeColor(asset.latest_urgency)}>
                            U{asset.latest_urgency}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {asset.status || 'Active'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}