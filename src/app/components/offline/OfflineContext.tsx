import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";

export interface PendingSyncItem {
  id: string;
  type: "asset" | "inspection" | "maintenance";
  action: "create" | "update" | "delete";
  data: any;
  timestamp: string;
  retryCount: number;
  error?: string;
}

interface OfflineContextType {
  isOnline: boolean;
  isSyncing: boolean;
  pendingItems: PendingSyncItem[];
  lastSyncTime: string | null;
  syncStatus: "idle" | "syncing" | "success" | "error";
  syncError: string | null;
  addPendingItem: (item: Omit<PendingSyncItem, "id" | "timestamp" | "retryCount">) => void;
  removePendingItem: (id: string) => void;
  syncNow: () => Promise<void>;
  clearAllPending: () => void;
  hasPendingChanges: (recordId: string) => boolean;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error("useOffline must be used within an OfflineProvider");
  }
  return context;
};

interface OfflineProviderProps {
  children: ReactNode;
}

export const OfflineProvider: React.FC<OfflineProviderProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingItems, setPendingItems] = useState<PendingSyncItem[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [syncError, setSyncError] = useState<string | null>(null);

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  // Load pending items from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("tams360_pending_sync");
    if (stored) {
      try {
        setPendingItems(JSON.parse(stored));
      } catch (error) {
        console.error("Error loading pending sync items:", error);
      }
    }

    const lastSync = localStorage.getItem("tams360_last_sync");
    if (lastSync) {
      setLastSyncTime(lastSync);
    }
  }, []);

  // Save pending items to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("tams360_pending_sync", JSON.stringify(pendingItems));
  }, [pendingItems]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("You're back online!");
      // Auto-sync when coming back online
      if (pendingItems.length > 0) {
        syncNow();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("You're offline. Changes will be saved locally and synced when you're back online.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [pendingItems.length]);

  const addPendingItem = (item: Omit<PendingSyncItem, "id" | "timestamp" | "retryCount">) => {
    const newItem: PendingSyncItem = {
      ...item,
      id: `${item.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    setPendingItems((prev) => [...prev, newItem]);
    toast.info("Change saved locally and will sync when online.");
  };

  const removePendingItem = (id: string) => {
    setPendingItems((prev) => prev.filter((item) => item.id !== id));
  };

  const syncNow = async () => {
    if (!isOnline || isSyncing || pendingItems.length === 0) {
      return;
    }

    setIsSyncing(true);
    setSyncStatus("syncing");
    setSyncError(null);

    const accessToken = localStorage.getItem("tams360_access_token") || publicAnonKey;
    const failedItems: PendingSyncItem[] = [];
    let successCount = 0;

    try {
      console.log(`[Sync] Starting sync of ${pendingItems.length} pending items`);

      for (const item of pendingItems) {
        try {
          let endpoint = "";
          let method = "POST";
          let body = item.data;

          // Determine API endpoint and method based on item type and action
          if (item.type === "inspection") {
            if (item.action === "create") {
              endpoint = `${API_URL}/inspections`;
              method = "POST";
            } else if (item.action === "update") {
              endpoint = `${API_URL}/inspections/${item.data.inspection_id}`;
              method = "PUT";
            } else if (item.action === "delete") {
              endpoint = `${API_URL}/inspections/${item.data.inspection_id}`;
              method = "DELETE";
            }
          } else if (item.type === "asset") {
            if (item.action === "create") {
              endpoint = `${API_URL}/assets`;
              method = "POST";
            } else if (item.action === "update") {
              endpoint = `${API_URL}/assets/${item.data.asset_id}`;
              method = "PUT";
            } else if (item.action === "delete") {
              endpoint = `${API_URL}/assets/${item.data.asset_id}`;
              method = "DELETE";
            }
          }

          if (!endpoint) {
            console.warn(`[Sync] Skipping unknown item type/action: ${item.type}/${item.action}`);
            continue;
          }

          const response = await fetch(endpoint, {
            method,
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${accessToken}`,
            },
            body: method !== "DELETE" ? JSON.stringify(body) : undefined,
          });

          if (response.ok) {
            console.log(`[Sync] Successfully synced ${item.type} ${item.action}:`, item.id);
            successCount++;
          } else {
            const errorText = await response.text();
            console.error(`[Sync] Failed to sync ${item.type} ${item.action}:`, errorText);
            failedItems.push({
              ...item,
              retryCount: item.retryCount + 1,
              error: `HTTP ${response.status}: ${errorText}`,
            });
          }
        } catch (error: any) {
          console.error(`[Sync] Error syncing item ${item.id}:`, error);
          failedItems.push({
            ...item,
            retryCount: item.retryCount + 1,
            error: error.message || "Network error",
          });
        }
      }

      // Update pending items to only include failed ones
      setPendingItems(failedItems);

      const now = new Date().toISOString();
      setLastSyncTime(now);
      localStorage.setItem("tams360_last_sync", now);

      if (failedItems.length === 0) {
        setSyncStatus("success");
        toast.success(`Successfully synced ${successCount} changes!`);
      } else {
        setSyncStatus("error");
        setSyncError(`${failedItems.length} items failed to sync`);
        toast.error(`Synced ${successCount} items, but ${failedItems.length} failed. Will retry automatically.`);
      }
    } catch (error: any) {
      console.error("[Sync] General sync error:", error);
      setSyncStatus("error");
      setSyncError(error.message || "Sync failed");
      toast.error("Sync failed. Will retry automatically.");
    } finally {
      setIsSyncing(false);
      // Reset status after 3 seconds
      setTimeout(() => {
        if (syncStatus !== "idle") setSyncStatus("idle");
      }, 3000);
    }
  };

  const clearAllPending = () => {
    setPendingItems([]);
    localStorage.removeItem("tams360_pending_sync");
    toast.success("All pending changes cleared");
  };

  const hasPendingChanges = (recordId: string): boolean => {
    return pendingItems.some(item => 
      item.data?.inspection_id === recordId || 
      item.data?.asset_id === recordId
    );
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        isSyncing,
        pendingItems,
        lastSyncTime,
        syncStatus,
        syncError,
        addPendingItem,
        removePendingItem,
        syncNow,
        clearAllPending,
        hasPendingChanges,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};