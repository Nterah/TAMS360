import { AlertCircle, WifiOff } from "lucide-react";
import { useOffline } from "./OfflineContext";

export default function OfflineBanner() {
  const { isOnline, pendingItems } = useOffline();

  if (isOnline) {
    return null;
  }

  return (
    <div className="bg-warning/20 border-b border-warning/30 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center gap-3 text-sm">
        <WifiOff className="w-4 h-4 text-warning flex-shrink-0" />
        <div className="flex-1">
          <strong className="font-semibold text-warning-foreground">You're Offline</strong>
          <span className="text-muted-foreground ml-2">
            — changes will sync when you're back online
          </span>
          {pendingItems.length > 0 && (
            <span className="ml-2 text-warning-foreground">
              ({pendingItems.length} pending change{pendingItems.length !== 1 ? "s" : ""})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
