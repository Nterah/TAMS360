import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../App";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Checkbox } from "../ui/checkbox";
import { MapPin, Building2, Layers, Users, Loader2, ArrowRightLeft, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";

interface Asset {
  id: string;
  reference_number: string;
  asset_type: string;
  region: string;
  depot: string;
  location_name: string;
  condition_index?: number;
  status: string;
}

export default function BulkAssetAssignmentPage() {
  const { accessToken } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Filter states
  const [filterType, setFilterType] = useState<string>("all");
  const [filterRegion, setFilterRegion] = useState<string>("all");
  const [filterDepot, setFilterDepot] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Assignment states
  const [newRegion, setNewRegion] = useState("");
  const [newDepot, setNewDepot] = useState("");

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    setLoading(true);
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
      toast.error("Failed to load assets");
    } finally {
      setLoading(false);
    }
  };

  // Extract unique values for filters
  const uniqueTypes = Array.from(new Set(assets.map(a => a.asset_type).filter(Boolean)));
  const uniqueRegions = Array.from(new Set(assets.map(a => a.region).filter(Boolean)));
  const uniqueDepots = Array.from(new Set(assets.map(a => a.depot).filter(Boolean)));

  // Filter assets based on current filters
  const filteredAssets = assets.filter(asset => {
    const matchesType = filterType === "all" || asset.asset_type === filterType;
    const matchesRegion = filterRegion === "all" || asset.region === filterRegion;
    const matchesDepot = filterDepot === "all" || asset.depot === filterDepot;
    const matchesSearch = !searchQuery || 
      asset.reference_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.location_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesType && matchesRegion && matchesDepot && matchesSearch;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAssets(new Set(filteredAssets.map(a => a.id)));
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

  const handleBulkAssign = async () => {
    if (selectedAssets.size === 0) {
      toast.error("Please select at least one asset");
      return;
    }

    if (!newRegion && !newDepot) {
      toast.error("Please enter a region or depot to assign");
      return;
    }

    setAssigning(true);
    try {
      const response = await fetch(`${API_URL}/assets/bulk-assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          assetIds: Array.from(selectedAssets),
          region: newRegion || undefined,
          depot: newDepot || undefined,
        }),
      });

      if (response.ok) {
        toast.success(`Successfully updated ${selectedAssets.size} assets`);
        setShowAssignDialog(false);
        setSelectedAssets(new Set());
        setNewRegion("");
        setNewDepot("");
        fetchAssets();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update assets");
      }
    } catch (error) {
      console.error("Error updating assets:", error);
      toast.error("Error updating assets");
    } finally {
      setAssigning(false);
    }
  };

  const clearFilters = () => {
    setFilterType("all");
    setFilterRegion("all");
    setFilterDepot("all");
    setSearchQuery("");
  };

  const activeFilterCount = [
    filterType !== "all",
    filterRegion !== "all",
    filterDepot !== "all",
    searchQuery !== "",
  ].filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading assets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Bulk Asset Assignment</h1>
          <p className="text-muted-foreground">
            Reassign multiple assets by region, type, or depot
          </p>
        </div>
        <Button 
          onClick={() => setShowAssignDialog(true)}
          disabled={selectedAssets.size === 0}
        >
          <ArrowRightLeft className="w-4 h-4 mr-2" />
          Assign {selectedAssets.size > 0 ? `(${selectedAssets.size})` : ""}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              <CardTitle>Filters</CardTitle>
              {activeFilterCount > 0 && (
                <Badge variant="secondary">{activeFilterCount} active</Badge>
              )}
            </div>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Reference or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-type">Asset Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger id="filter-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-region">Region</Label>
              <Select value={filterRegion} onValueChange={setFilterRegion}>
                <SelectTrigger id="filter-region">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {uniqueRegions.map(region => (
                    <SelectItem key={region} value={region}>{region}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-depot">Depot</Label>
              <Select value={filterDepot} onValueChange={setFilterDepot}>
                <SelectTrigger id="filter-depot">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Depots</SelectItem>
                  {uniqueDepots.map(depot => (
                    <SelectItem key={depot} value={depot}>{depot}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Showing {filteredAssets.length} of {assets.length} assets
          </span>
          {selectedAssets.size > 0 && (
            <Badge variant="default">
              {selectedAssets.size} selected
            </Badge>
          )}
        </div>
      </div>

      {/* Assets Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedAssets.size === filteredAssets.length && filteredAssets.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Depot</TableHead>
                  <TableHead>CI</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No assets found matching the current filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedAssets.has(asset.id)}
                          onCheckedChange={(checked) => handleSelectAsset(asset.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {asset.reference_number}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{asset.asset_type}</Badge>
                      </TableCell>
                      <TableCell>{asset.location_name || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          {asset.region || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-muted-foreground" />
                          {asset.depot || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {asset.condition_index !== undefined ? (
                          <Badge 
                            variant={
                              asset.condition_index >= 80 ? "default" :
                              asset.condition_index >= 60 ? "secondary" :
                              asset.condition_index >= 40 ? "outline" :
                              "destructive"
                            }
                          >
                            {asset.condition_index}
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={asset.status === "Active" ? "default" : "secondary"}>
                          {asset.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Assign Assets</DialogTitle>
            <DialogDescription>
              Assign {selectedAssets.size} selected asset{selectedAssets.size !== 1 ? "s" : ""} to a new region or depot
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-region">
                <MapPin className="w-4 h-4 inline mr-2" />
                New Region (optional)
              </Label>
              <Input
                id="new-region"
                value={newRegion}
                onChange={(e) => setNewRegion(e.target.value)}
                placeholder="Enter region name or leave blank"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to keep existing region assignments
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-depot">
                <Building2 className="w-4 h-4 inline mr-2" />
                New Depot (optional)
              </Label>
              <Input
                id="new-depot"
                value={newDepot}
                onChange={(e) => setNewDepot(e.target.value)}
                placeholder="Enter depot name or leave blank"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to keep existing depot assignments
              </p>
            </div>

            {newRegion || newDepot ? (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm font-medium mb-2">Changes to be applied:</p>
                <ul className="text-sm space-y-1">
                  {newRegion && (
                    <li className="flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      Region → <strong>{newRegion}</strong>
                    </li>
                  )}
                  {newDepot && (
                    <li className="flex items-center gap-2">
                      <Building2 className="w-3 h-3" />
                      Depot → <strong>{newDepot}</strong>
                    </li>
                  )}
                </ul>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkAssign} disabled={assigning || (!newRegion && !newDepot)}>
              {assigning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  Assign {selectedAssets.size} Assets
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
