import { useState } from "react";
import { CheckCircle2, WifiOff, RefreshCw, Clock, AlertCircle, Database, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { useOffline } from "./OfflineContext";
import { ScrollArea } from "../ui/scroll-area";

interface SyncStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SyncStatusModal({ open, onOpenChange }: SyncStatusModalProps) {
  const { isOnline, isSyncing, pendingItems, lastSyncTime, syncNow, clearAllPending } = useOffline();
  const [conflicts, setConflicts] = useState<any[]>([]);

  const formatLastSync = () => {
    if (!lastSyncTime) return "Never synced";
    const date = new Date(lastSyncTime);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    return date.toLocaleString();
  };

  const getSyncPhase = () => {
    if (!isOnline) return "Offline";
    if (isSyncing) return "Syncing in progress...";
    if (pendingItems.length > 0) return "Waiting to sync";
    return "All data synced";
  };

  const getSyncProgress = () => {
    if (!isOnline) return 0;
    if (isSyncing) return 50; // Simulate progress
    if (pendingItems.length === 0) return 100;
    return 25; // Has pending items
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "create": return "➕";
      case "update": return "✏️";
      case "delete": return "🗑️";
      default: return "📝";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Sync Status & Data Management
          </DialogTitle>
          <DialogDescription>
            Monitor offline data caching, pending changes, and sync progress
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Connection Status */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <CheckCircle2 className="w-5 h-5 text-success" />
                ) : (
                  <WifiOff className="w-5 h-5 text-destructive" />
                )}
                <span className="font-semibold">
                  {isOnline ? "Online" : "Offline Mode"}
                </span>
              </div>
              <Badge variant={isOnline ? "default" : "destructive"}>
                {getSyncPhase()}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sync Progress</span>
                <span className="font-medium">{getSyncProgress()}%</span>
              </div>
              <Progress value={getSyncProgress()} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
              <div>
                <p className="text-muted-foreground">Last Sync</p>
                <p className="font-medium">{formatLastSync()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Pending Changes</p>
                <p className="font-medium">{pendingItems.length} items</p>
              </div>
            </div>
          </div>

          {/* Sync Workflow Steps */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Sync Workflow</h4>
            <div className="space-y-2">
              <div className={`flex items-center gap-3 p-2 rounded ${isOnline ? 'bg-success/10' : 'bg-muted'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${isOnline ? 'bg-success text-white' : 'bg-muted-foreground text-white'}`}>
                  {isOnline ? "✓" : "1"}
                </div>
                <span className="text-sm">Initial caching (Assets & Inspections)</span>
              </div>

              <div className={`flex items-center gap-3 p-2 rounded ${pendingItems.length > 0 ? 'bg-warning/10' : 'bg-muted'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${pendingItems.length > 0 ? 'bg-warning text-white' : 'bg-muted-foreground text-white'}`}>
                  {pendingItems.length > 0 ? "!" : "2"}
                </div>
                <span className="text-sm">Offline edits queued ({pendingItems.length})</span>
              </div>

              <div className={`flex items-center gap-3 p-2 rounded ${isSyncing ? 'bg-info/10' : 'bg-muted'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${isSyncing ? 'bg-info text-white' : 'bg-muted-foreground text-white'}`}>
                  {isSyncing ? <RefreshCw className="w-3 h-3 animate-spin" /> : "3"}
                </div>
                <span className="text-sm">Sync in progress</span>
              </div>

              <div className={`flex items-center gap-3 p-2 rounded ${!isSyncing && pendingItems.length === 0 && isOnline ? 'bg-success/10' : 'bg-muted'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${!isSyncing && pendingItems.length === 0 && isOnline ? 'bg-success text-white' : 'bg-muted-foreground text-white'}`}>
                  {!isSyncing && pendingItems.length === 0 && isOnline ? "✓" : "4"}
                </div>
                <span className="text-sm">Synced / Conflict resolution</span>
              </div>
            </div>
          </div>

          {/* Pending Changes List */}
          {pendingItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Pending Changes</h4>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={clearAllPending}
                  disabled={isSyncing}
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              </div>
              <ScrollArea className="h-48 border rounded-lg p-2">
                <div className="space-y-2">
                  {pendingItems.map((item) => (
                    <div key={item.id} className="p-3 bg-muted rounded-lg flex items-start gap-3">
                      <span className="text-lg">{getActionIcon(item.action)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {item.type}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {item.action}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Queued {new Date(item.timestamp).toLocaleString()}
                        </p>
                        {item.retryCount > 0 && (
                          <p className="text-xs text-warning">
                            Retry attempts: {item.retryCount}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Conflict Resolution */}
          {conflicts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-warning" />
                <h4 className="font-semibold text-sm">Conflicts Detected</h4>
              </div>
              <div className="space-y-2">
                {conflicts.map((conflict, index) => (
                  <div key={index} className="p-3 border border-warning rounded-lg bg-warning/5">
                    <p className="font-medium text-sm mb-2">
                      {conflict.type} - {conflict.id}
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      This {conflict.type} was modified on the server since your last sync.
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        Keep Local
                      </Button>
                      <Button size="sm" variant="default" className="flex-1">
                        Use Server
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={syncNow}
              disabled={!isOnline || isSyncing || pendingItems.length === 0}
              className="flex-1"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync Now"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>

          {/* Info Message */}
          {!isOnline && (
            <div className="p-3 bg-info/10 border border-info rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                You're currently offline. Changes will be saved locally and synced automatically when you reconnect.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
