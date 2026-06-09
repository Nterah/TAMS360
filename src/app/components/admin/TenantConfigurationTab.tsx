import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Save, Search, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { projectId } from "/utils/supabase/info";

type ConfigKey = "wards" | "lifecycle" | "values" | "maintenance" | "componentRates";

type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "number" | "boolean";
};

const CONFIGS: Record<ConfigKey, { title: string; description: string; fields: FieldDef[] }> = {
  wards: {
    title: "Ward / Region Mapping",
    description: "Maps JRA wards to administrative regions.",
    fields: [
      { key: "ward", label: "Ward" },
      { key: "region", label: "Region" },
      { key: "notes", label: "Notes" },
      { key: "is_active", label: "Active", type: "boolean" },
    ],
  },
  lifecycle: {
    title: "Asset Useful Life / Depreciation",
    description: "Controls useful life and depreciation assumptions per asset type.",
    fields: [
      { key: "asset_type", label: "Asset Type" },
      { key: "subtype", label: "Subtype" },
      { key: "useful_life_years", label: "Useful Life Years", type: "number" },
      { key: "depreciation_rate_percent", label: "Depreciation Rate %", type: "number" },
      { key: "notes", label: "Notes" },
      { key: "is_active", label: "Active", type: "boolean" },
    ],
  },
  values: {
    title: "Asset Estimated Replacement Values",
    description: "Estimated replacement values used for condition-based valuation.",
    fields: [
      { key: "asset_type", label: "Asset Type" },
      { key: "subtype", label: "Subtype" },
      { key: "unit_of_measure", label: "Unit" },
      { key: "estimated_replacement_value", label: "Replacement Value", type: "number" },
      { key: "currency", label: "Currency" },
      { key: "valuation_basis", label: "Valuation Basis" },
      { key: "notes", label: "Notes" },
      { key: "is_active", label: "Active", type: "boolean" },
    ],
  },
  maintenance: {
    title: "Maintenance Cost Defaults",
    description: "Default maintenance cost assumptions per asset type and action.",
    fields: [
      { key: "asset_type", label: "Asset Type" },
      { key: "subtype", label: "Subtype" },
      { key: "maintenance_action", label: "Maintenance Action" },
      { key: "unit_of_measure", label: "Unit" },
      { key: "estimated_unit_cost", label: "Estimated Unit Cost", type: "number" },
      { key: "currency", label: "Currency" },
      { key: "cost_basis", label: "Cost Basis" },
      { key: "notes", label: "Notes" },
      { key: "is_active", label: "Active", type: "boolean" },
    ],
  },
  componentRates: {
    title: "Component Repair Rates",
    description: "Default repair rates used when inspection component quantities are costed.",
    fields: [
      { key: "asset_type", label: "Asset Type" },
      { key: "component_order", label: "Order", type: "number" },
      { key: "component_name", label: "Code" },
      { key: "component_display_name", label: "Component Name" },
      { key: "repair_action", label: "Repair Action" },
      { key: "unit_of_measure", label: "Unit" },
      { key: "default_rate", label: "Default Rate", type: "number" },
      { key: "currency", label: "Currency" },
      { key: "source", label: "Source" },
      { key: "notes", label: "Notes" },
      { key: "is_active", label: "Active", type: "boolean" },
    ],
  },


};

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

function emptyRow(configKey: ConfigKey) {
  const row: any = { is_active: true };

  CONFIGS[configKey].fields.forEach((field) => {
    if (field.key === "is_active") row[field.key] = true;
    else if (field.type === "number") row[field.key] = 0;
    else row[field.key] = "";
  });

  if (configKey === "values" || configKey === "maintenance") {
    row.currency = "ZAR";
  }

  if (configKey === "values") {
    row.unit_of_measure = "each";
  }

  if (configKey === "maintenance") {
    row.unit_of_measure = "each";
  }

  if (configKey === "componentRates") {
    row.repair_action = "Repair / Remedial Work";
    row.unit_of_measure = "each";
    row.currency = "ZAR";
    row.source = "tenant_admin";
  }  

  return row;
}

export default function TenantConfigurationTab({ accessToken }: { accessToken: string | null }) {
  const [activeConfig, setActiveConfig] = useState<ConfigKey>("wards");
  const [rows, setRows] = useState<Record<ConfigKey, any[]>>({
    wards: [],
    lifecycle: [],
    values: [],
    maintenance: [],
    componentRates: [],
  });
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  const loadConfig = async (configKey: ConfigKey) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/tenant-config/${configKey}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to load configuration");
      }

      const data = await response.json();
      setRows((prev) => ({
        ...prev,
        [configKey]: data.rows || [],
      }));
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed to load ${CONFIGS[configKey].title}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig(activeConfig);
  }, [activeConfig]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    // Hide inactive rows by default.
    // This keeps deactivated/dirty rows such as old Gantry placeholder rates out of the main admin view.
    const currentRows = (rows[activeConfig] || []).filter(
      (row) => row.is_active !== false
    );

    if (!term) return currentRows;

    return currentRows.filter((row) =>
      JSON.stringify(row).toLowerCase().includes(term)
    );
  }, [rows, activeConfig, searchTerm]);

  const startAdd = () => {
    setEditingRow(emptyRow(activeConfig));
  };

  const startEdit = (row: any) => {
    setEditingRow({ ...row });
  };

  const saveRow = async () => {
    if (!editingRow) return;

    try {
      const isExisting = Boolean(editingRow.id);
      const url = isExisting
        ? `${API_URL}/admin/tenant-config/${activeConfig}/${editingRow.id}`
        : `${API_URL}/admin/tenant-config/${activeConfig}`;

      const method = isExisting ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(editingRow),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to save row");
      }

      toast.success("Configuration saved");
      setEditingRow(null);
      loadConfig(activeConfig);
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to save configuration row");
    }
  };

  const deactivateRow = async (row: any) => {
    if (!row.id) return;

    if (row.is_global_default) {
      toast.error("Global default rows cannot be deactivated directly. Edit it first to create a tenant override.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/admin/tenant-config/${activeConfig}/${row.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to deactivate row");
      }

      toast.success("Configuration deactivated");
      loadConfig(activeConfig);
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to deactivate configuration row");
    }
  };

  const activeFields = CONFIGS[activeConfig].fields;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tenant Configuration</CardTitle>
        <CardDescription>
          Edit ward mappings, useful life, replacement values, and maintenance cost defaults.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs value={activeConfig} onValueChange={(value) => setActiveConfig(value as ConfigKey)}>
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="wards">Ward / Region</TabsTrigger>
            <TabsTrigger value="lifecycle">Useful Life</TabsTrigger>
            <TabsTrigger value="values">Asset Values</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance Costs</TabsTrigger>
            <TabsTrigger value="componentRates">Component Rates</TabsTrigger>
          </TabsList>

          {(Object.keys(CONFIGS) as ConfigKey[]).map((configKey) => (
            <TabsContent key={configKey} value={configKey} className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-semibold">{CONFIGS[configKey].title}</h3>
                  <p className="text-sm text-muted-foreground">{CONFIGS[configKey].description}</p>
                </div>

                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search..."
                      className="pl-8 w-[220px]"
                    />
                  </div>

                  <Button variant="outline" onClick={() => loadConfig(configKey)} disabled={loading}>
                    <RefreshCw className="size-4 mr-2" />
                    Refresh
                  </Button>

                  <Button onClick={startAdd}>
                    <Plus className="size-4 mr-2" />
                    Add Row
                  </Button>
                </div>
              </div>


              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead>Actions</TableHead>
                      {activeFields.map((field) => (
                        <TableHead key={field.key}>{field.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={activeFields.length + 2} className="text-center py-8 text-muted-foreground">
                          No configuration rows found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>
                            <Badge variant={row.is_global_default ? "secondary" : "default"}>
                              {row.is_global_default ? "Global Default" : "Tenant"}
                            </Badge>
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => startEdit(row)}>
                                Edit
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => deactivateRow(row)}>
                                <XCircle className="size-4 mr-1" />
                                Deactivate
                              </Button>
                            </div>
                          </TableCell>

                          {activeFields.map((field) => (
                            <TableCell key={field.key} className="whitespace-nowrap">
                              {field.type === "boolean"
                                ? row[field.key]
                                  ? "Yes"
                                  : "No"
                                : row[field.key] ?? "-"}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {editingRow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-lg border bg-background p-6 shadow-lg">
              <div className="flex justify-between items-start gap-4 mb-4">
                <div>
                  <h4 className="font-semibold text-lg">
                    {editingRow.id ? "Edit Configuration Row" : "Add Configuration Row"}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {CONFIGS[activeConfig].title}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {editingRow.is_global_default && (
                    <Badge variant="outline">
                      Editing this global default will create a tenant override
                    </Badge>
                  )}

                  <Button variant="outline" size="sm" onClick={() => setEditingRow(null)}>
                    Cancel
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {activeFields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label>{field.label}</Label>

                    {field.type === "boolean" ? (
                      <select
                        className="w-full border rounded-md h-10 px-3 bg-background"
                        value={editingRow[field.key] ? "true" : "false"}
                        onChange={(event) =>
                          setEditingRow({
                            ...editingRow,
                            [field.key]: event.target.value === "true",
                          })
                        }
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    ) : (
                      <Input
                        type={field.type === "number" ? "number" : "text"}
                        value={editingRow[field.key] ?? ""}
                        onChange={(event) =>
                          setEditingRow({
                            ...editingRow,
                            [field.key]:
                              field.type === "number"
                                ? Number(event.target.value)
                                : event.target.value,
                          })
                        }
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 justify-end mt-6">
                <Button variant="outline" onClick={() => setEditingRow(null)}>
                  Cancel
                </Button>
                <Button onClick={saveRow}>
                  <Save className="size-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}