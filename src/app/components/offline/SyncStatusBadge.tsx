import { useState } from "react";
import { CheckCircle2, WifiOff, RefreshCw, Clock, ExternalLink } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { useOffline } from "./OfflineContext";
import SyncStatusModal from "./SyncStatusModal";

export default function SyncStatusBadge() {
  const { isOnline, isSyncing, pendingItems, lastSyncTime, syncNow } = useOffline();
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="w-3 h-3" />;
    if (isSyncing) return <RefreshCw className="w-3 h-3 animate-spin" />;
    if (pendingItems.length > 0) return <Clock className="w-3 h-3" />;
    return <CheckCircle2 className="w-3 h-3" />;
  };

  const getStatusText = () => {
    if (!isOnline) return "Offline";
    if (isSyncing) return "Syncing...";
    if (pendingItems.length > 0) return `Pending (${pendingItems.length})`;
    return "Synced";
  };

  const getStatusVariant = () => {
    if (!isOnline) return "destructive";
    if (isSyncing) return "default";
    if (pendingItems.length > 0) return "secondary";
    return "outline";
  };

  const formatLastSync = () => {
    if (!lastSyncTime) return "Never";
    const date = new Date(lastSyncTime);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    return date.toLocaleDateString();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="focus:outline-none">
          <Badge variant={getStatusVariant() as any} className="gap-1 cursor-pointer hover:opacity-80">
            {getStatusIcon()}
            <span className="text-xs">{getStatusText()}</span>
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Sync Status</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Connection:</span>
                <span className="font-medium">{isOnline ? "Online" : "Offline"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pending items:</span>
                <span className="font-medium">{pendingItems.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last sync:</span>
                <span className="font-medium">{formatLastSync()}</span>
              </div>
            </div>
          </div>

          {pendingItems.length > 0 && (
            <div>
              <h5 className="font-medium text-sm mb-2">Pending Changes</h5>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {pendingItems.map((item) => (
                  <div key={item.id} className="text-xs p-2 bg-muted rounded flex justify-between items-center">
                    <div>
                      <span className="font-medium capitalize">{item.action}</span>
                      <span className="text-muted-foreground ml-1">{item.type}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={syncNow}
              disabled={!isOnline || isSyncing || pendingItems.length === 0}
              className="flex-1"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync Now"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setModalOpen(true);
              }}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </PopoverContent>
      <SyncStatusModal open={modalOpen} onOpenChange={setModalOpen} />
    </Popover>
  );
}
