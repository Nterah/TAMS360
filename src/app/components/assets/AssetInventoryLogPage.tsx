import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../App";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { History, Search, Plus, Edit, Trash2, RefreshCw } from "lucide-react";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";

export default function AssetInventoryLogPage() {
  const { accessToken } = useContext(AuthContext);
  const [inventoryLog, setInventoryLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("all");

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  useEffect(() => {
    fetchInventoryLog();
  }, []);

  const fetchInventoryLog = async () => {
    try {
      const response = await fetch(`${API_URL}/assets/inventory-log`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInventoryLog(data.logs || []);
      }
    } catch (error) {
      console.error("Error fetching inventory log:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "CREATE":
        return <Badge className="bg-success">Created</Badge>;
      case "UPDATE":
        return <Badge className="bg-info">Updated</Badge>;
      case "DELETE":
        return <Badge className="bg-destructive">Removed</Badge>;
      case "RESTORE":
        return <Badge className="bg-warning">Restored</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "CREATE":
        return <Plus className="w-4 h-4 text-success" />;
      case "UPDATE":
        return <Edit className="w-4 h-4 text-info" />;
      case "DELETE":
        return <Trash2 className="w-4 h-4 text-destructive" />;
      case "RESTORE":
        return <RefreshCw className="w-4 h-4 text-warning" />;
      default:
        return <History className="w-4 h-4" />;
    }
  };

  const filteredLogs = inventoryLog.filter((log) => {
    const matchesSearch =
      log.asset_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.asset_type_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.changed_by_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterAction === "all" || log.action === filterAction;

    return matchesSearch && matchesFilter;
  });

  // Stats
  const stats = {
    totalChanges: inventoryLog.length,
    created: inventoryLog.filter((l) => l.action === "CREATE").length,
    updated: inventoryLog.filter((l) => l.action === "UPDATE").length,
    removed: inventoryLog.filter((l) => l.action === "DELETE").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Asset Inventory Log</h1>
        <p className="text-muted-foreground">
          Complete audit trail of all asset changes (create, update, remove)
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalChanges}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{stats.created}</div>
            <p className="text-xs text-muted-foreground">New assets</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Updated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-info">{stats.updated}</div>
            <p className="text-xs text-muted-foreground">Modifications</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Removed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{stats.removed}</div>
            <p className="text-xs text-muted-foreground">Soft deletes</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by asset, type, or user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {["all", "CREATE", "UPDATE", "DELETE"].map((action) => (
                <Button
                  key={action}
                  variant={filterAction === action ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterAction(action)}
                >
                  {action === "all" ? "All" : action.toLowerCase()}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Log Table */}
      <Card>
        <CardHeader>
          <CardTitle>Change History</CardTitle>
          <CardDescription>
            Complete record of all asset inventory changes ({filteredLogs.length} entries)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading inventory log...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No inventory changes found matching your filters.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Asset Reference</TableHead>
                    <TableHead>Asset Type</TableHead>
                    <TableHead>Changed By</TableHead>
                    <TableHead>Changes</TableHead>
                    <TableHead>Date & Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.log_id}>
                      <TableCell>{getActionIcon(log.action)}</TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell className="font-medium">{log.asset_ref}</TableCell>
                      <TableCell>{log.asset_type_name}</TableCell>
                      <TableCell className="text-sm">{log.changed_by_name || "System"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs">
                        <div className="line-clamp-2">
                          {log.changes_summary || "No details available"}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {new Date(log.changed_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
