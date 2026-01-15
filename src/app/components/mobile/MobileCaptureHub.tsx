import { useState, useContext } from "react";
import { AuthContext } from "../../App";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Camera, ClipboardCheck, MapPin, Plus, ScanLine, Navigation, CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { syncAllOfflineData } from "../../utils/offlineSync";

export default function MobileCaptureHub() {
  const { user, accessToken } = useContext(AuthContext);
  const navigate = useNavigate();
  const [syncStatus, setSyncStatus] = useState<"synced" | "pending" | "offline">("synced");
  const [syncing, setSyncing] = useState(false);

  // Get pending items from localStorage
  const getPendingCounts = () => {
    const pendingAssets = JSON.parse(localStorage.getItem("offline_assets") || "[]");
    const pendingInspections = JSON.parse(localStorage.getItem("offline_inspections") || "[]");
    
    return {
      assets: pendingAssets.length,
      inspections: pendingInspections.length,
      total: pendingAssets.length + pendingInspections.length
    };
  };

  const pending = getPendingCounts();

  // Handle sync
  const handleSync = async () => {
    if (!accessToken) {
      toast.error("Not authenticated");
      return;
    }

    if (!navigator.onLine) {
      toast.error("No internet connection");
      return;
    }

    setSyncing(true);
    try {
      const result = await syncAllOfflineData(accessToken);
      
      if (result.success) {
        toast.success(`Successfully synced ${result.synced} item(s)`);
        window.location.reload(); // Refresh to update counts
      } else {
        toast.error(`Synced ${result.synced}, failed ${result.failed}`);
        if (result.errors.length > 0) {
          console.error("Sync errors:", result.errors);
        }
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Failed to sync data");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 pb-20">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Quick Capture
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Field data collection for {user?.name || "Field User"}
        </p>
      </div>

      {/* Sync Status Banner */}
      {pending.total > 0 && (
        <Card className="mb-4 border-amber-500 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <div className="flex-1">
                <p className="font-semibold text-amber-900 dark:text-amber-100 text-sm">
                  {pending.total} item{pending.total !== 1 ? 's' : ''} pending sync
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {pending.assets} asset{pending.assets !== 1 ? 's' : ''}, {pending.inspections} inspection{pending.inspections !== 1 ? 's' : ''}
                </p>
              </div>
              <Button size="sm" variant="outline" className="border-amber-600 text-amber-700" onClick={handleSync}>
                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sync Now"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        {/* Capture New Asset */}
        <Card 
          className="border-2 border-primary hover:shadow-lg transition-all cursor-pointer active:scale-95"
          onClick={() => navigate("/mobile/field-capture")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Camera className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">Capture New Asset</CardTitle>
                <CardDescription className="text-xs">
                  Record road sign, guardrail, or barrier
                </CardDescription>
              </div>
              <Plus className="w-5 h-5 text-primary" />
            </div>
          </CardHeader>
        </Card>

        {/* New Inspection */}
        <Card 
          className="border-2 border-green-500 hover:shadow-lg transition-all cursor-pointer active:scale-95"
          onClick={() => navigate("/inspections/new")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <ClipboardCheck className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">New Inspection</CardTitle>
                <CardDescription className="text-xs">
                  Inspect existing asset condition
                </CardDescription>
              </div>
              <Plus className="w-5 h-5 text-green-600" />
            </div>
          </CardHeader>
        </Card>

        {/* View Nearby Assets (Map) */}
        <Card 
          className="border-2 border-blue-500 hover:shadow-lg transition-all cursor-pointer active:scale-95"
          onClick={() => navigate("/map")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">Nearby Assets</CardTitle>
                <CardDescription className="text-xs">
                  View assets on map
                </CardDescription>
              </div>
              <Navigation className="w-5 h-5 text-blue-600" />
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">
                {pending.assets}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Assets Captured Today
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">
                {pending.inspections}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Inspections Today
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Offline Mode Info */}
      <Card className="bg-slate-800 dark:bg-slate-950 text-white border-slate-700">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="font-semibold text-sm mb-1">Offline Mode Active</p>
              <p className="text-xs text-slate-300 leading-relaxed">
                All captures are saved locally and will sync automatically when you're back online. 
                GPS coordinates are captured even without internet.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips Section */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Quick Tips
        </h3>
        <ul className="space-y-1 text-xs text-blue-800 dark:text-blue-200">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
            <span>Enable GPS for automatic location capture</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
            <span>Take clear photos with good lighting</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
            <span>Work offline - data syncs when connected</span>
          </li>
        </ul>
      </div>
    </div>
  );
}