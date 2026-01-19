import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../App";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { 
  Edit2, 
  Trash2, 
  Plus, 
  Save, 
  ChevronDown, 
  ChevronUp, 
  ArrowLeft,
  Loader2,
  Info,
  Settings,
  CheckCircle2,
  X,
  Edit,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "../ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

interface AssetType {
  asset_type_id: string;
  name: string;
  description?: string;
}

interface ComponentTemplate {
  template_id: string;
  asset_type_id: string;
  asset_type_name: string;
  template_name: string;
  description?: string;
  version: number;
  is_active: boolean;
  items?: ComponentTemplateItem[];
}

interface ComponentTemplateItem {
  item_id: string;
  component_name: string;
  component_order: number;
  what_to_inspect?: string;
  degree_rubric?: any;
  extent_rubric?: any;
  relevancy_rubric?: any;
  quantity_unit?: string;
}

export default function ComponentTemplatesPage() {
  const navigate = useNavigate();
  const { accessToken } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [templates, setTemplates] = useState<ComponentTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ComponentTemplate | null>(null);
  const [editingItem, setEditingItem] = useState<ComponentTemplateItem | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newComponent, setNewComponent] = useState({
    component_name: "",
    what_to_inspect: "",
    quantity_unit: ""
  });

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch asset types with timeout
      const assetTypesController = new AbortController();
      const assetTypesTimeout = setTimeout(() => assetTypesController.abort(), 10000);
      
      const assetTypesResponse = await fetch(`${API_URL}/asset-types`, {
        headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
        signal: assetTypesController.signal,
      });
      clearTimeout(assetTypesTimeout);
      
      if (assetTypesResponse.ok) {
        const data = await assetTypesResponse.json();
        setAssetTypes(data.assetTypes || []);
      } else {
        console.error("Failed to fetch asset types:", assetTypesResponse.statusText);
      }

      // Fetch component templates with timeout
      const templatesController = new AbortController();
      const templatesTimeout = setTimeout(() => templatesController.abort(), 15000);
      
      const templatesResponse = await fetch(`${API_URL}/component-templates`, {
        headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
        signal: templatesController.signal,
      });
      clearTimeout(templatesTimeout);
      
      if (templatesResponse.ok) {
        const data = await templatesResponse.json();
        setTemplates(data.templates || []);
      } else {
        const errorData = await templatesResponse.json().catch(() => ({}));
        const errorMsg = errorData.error || templatesResponse.statusText || "Unknown error";
        console.error("Failed to fetch templates:", errorMsg, errorData);
        toast.error(`Failed to load templates: ${errorMsg}`);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          toast.error("Request timed out. Please try again.");
        } else {
          toast.error(`Failed to load templates: ${error.message}`);
        }
      } else {
        toast.error("Failed to load templates");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditComponent = (template: ComponentTemplate, item: ComponentTemplateItem) => {
    setSelectedTemplate(template);
    setEditingItem(item);
    setShowDialog(true);
  };

  const handleSaveComponent = async () => {
    if (!editingItem || !selectedTemplate) return;

    setSaving(true);
    try {
      const response = await fetch(
        `${API_URL}/component-templates/${selectedTemplate.template_id}/items/${editingItem.item_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(editingItem),
        }
      );

      if (response.ok) {
        toast.success("Component updated successfully");
        setShowDialog(false);
        fetchData();
      } else {
        const error = await response.json();
        toast.error(`Failed to update: ${error.error}`);
      }
    } catch (error) {
      console.error("Error saving component:", error);
      toast.error("Failed to save component");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteComponent = async (templateId: string, itemId: string, componentName: string) => {
    if (!confirm(`Are you sure you want to delete component "${componentName}"? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/component-templates/${templateId}/items/${itemId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        toast.success("Component deleted successfully");
        fetchData();
      } else {
        const error = await response.json();
        toast.error(`Failed to delete: ${error.error}`);
      }
    } catch (error) {
      console.error("Error deleting component:", error);
      toast.error("Failed to delete component");
    }
  };

  const handleAddComponent = (template: ComponentTemplate) => {
    setSelectedTemplate(template);
    setNewComponent({ component_name: "", what_to_inspect: "", quantity_unit: "" });
    setShowAddDialog(true);
  };

  const handleSaveNewComponent = async () => {
    if (!selectedTemplate || !newComponent.component_name) {
      toast.error("Component name is required");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        `${API_URL}/component-templates/${selectedTemplate.template_id}/items`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken || publicAnonKey}`,
          },
          body: JSON.stringify(newComponent),
        }
      );

      if (response.ok) {
        toast.success("Component added successfully");
        setShowAddDialog(false);
        setNewComponent({ component_name: "", what_to_inspect: "", quantity_unit: "" });
        fetchData();
      } else {
        const error = await response.json();
        toast.error(`Failed to add component: ${error.error}`);
      }
    } catch (error) {
      console.error("Error adding component:", error);
      toast.error("Failed to add component");
    } finally {
      setSaving(false);
    }
  };

  const toggleCardExpansion = (templateId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(templateId)) {
      newExpanded.delete(templateId);
    } else {
      newExpanded.add(templateId);
    }
    setExpandedCards(newExpanded);
  };

  const parseRubric = (rubric: any): string => {
    if (typeof rubric === "string") {
      try {
        const parsed = JSON.parse(rubric);
        return Object.entries(parsed)
          .map(([key, value]) => `${key}: ${value}`)
          .join("; ");
      } catch {
        return rubric;
      }
    }
    if (typeof rubric === "object" && rubric !== null) {
      return Object.entries(rubric)
        .map(([key, value]) => `${key}: ${value}`)
        .join("; ");
    }
    return "Not configured";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading component templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/admin')}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Admin Console
      </Button>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Inspection Templates Settings</h1>
        <p className="text-muted-foreground">
          Configure inspection templates for each asset type with D/E/R scoring rubrics
        </p>
      </div>

      {/* Info Alert */}
      <Alert className="bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>What are Inspection Templates?</strong> Each asset type (Signage, Guardrail, etc.) has specific components that need inspection. 
          Templates define what to inspect, how to score (Degree/Extent/Relevancy), and how to calculate urgency. 
          <br /><br />
          <strong>⚠️ Removing Unwanted Components:</strong> If you see too many generic or irrelevant components when creating a new inspection, 
          use the delete button below to remove unwanted template items. This will prevent them from appearing in future inspections.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates">Inspection Templates</TabsTrigger>
          <TabsTrigger value="guide">Inspector Guide Reference</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          {templates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-semibold mb-2">No Inspection Templates Found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Inspection templates need to be initialized first.
                </p>
                <Button
                  onClick={async () => {
                    try {
                      const response = await fetch(`${API_URL}/component-templates/initialize`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${accessToken}` },
                      });
                      if (response.ok) {
                        toast.success("Templates initialized successfully");
                        fetchData();
                      } else {
                        const error = await response.json();
                        toast.error(`Failed: ${error.error}`);
                      }
                    } catch (error) {
                      console.error("Error initializing:", error);
                      toast.error("Failed to initialize templates");
                    }
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Initialize Default Templates
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => {
                const isExpanded = expandedCards.has(template.template_id);
                return (
                  <Card key={template.template_id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-xl">{template.asset_type_name}</CardTitle>
                            {template.is_active ? (
                              <Badge variant="default" className="text-xs">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Inactive</Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              v{template.version}
                            </Badge>
                          </div>
                          <CardDescription>
                            {template.description || template.template_name}
                          </CardDescription>
                          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                            <Settings className="w-4 h-4" />
                            <span>{template.items?.length || 0} components configured</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleCardExpansion(template.template_id)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          {template.items && template.items.length > 0 ? (
                            <>
                              {template.items
                                .sort((a, b) => a.component_order - b.component_order)
                                .map((item, index) => (
                                  <Card key={item.item_id} className="border-l-4 border-l-primary/20">
                                    <CardContent className="pt-4">
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 space-y-2">
                                          <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs">
                                              #{item.component_order}
                                            </Badge>
                                            <h4 className="font-semibold">{item.component_name}</h4>
                                          </div>
                                          
                                          {item.what_to_inspect && (
                                            <div className="text-sm">
                                              <span className="text-muted-foreground">What to inspect:</span>
                                              <p className="mt-1">{item.what_to_inspect}</p>
                                            </div>
                                          )}

                                          <div className="grid gap-2 sm:grid-cols-3 text-xs pt-2">
                                            <div>
                                              <span className="font-medium text-muted-foreground">Defect (D):</span>
                                              <p className="mt-1">{parseRubric(item.degree_rubric)}</p>
                                            </div>
                                            <div>
                                              <span className="font-medium text-muted-foreground">Extent (E):</span>
                                              <p className="mt-1">{parseRubric(item.extent_rubric)}</p>
                                            </div>
                                            <div>
                                              <span className="font-medium text-muted-foreground">Relevancy (R):</span>
                                              <p className="mt-1">{parseRubric(item.relevancy_rubric)}</p>
                                            </div>
                                          </div>

                                          {item.quantity_unit && (
                                            <div className="text-xs">
                                              <span className="text-muted-foreground">Unit:</span> {item.quantity_unit}
                                            </div>
                                          )}
                                        </div>

                                        <div className="flex gap-2">
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => handleEditComponent(template, item)}
                                                >
                                                  <Edit className="w-4 h-4" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>Edit component</TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>

                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() =>
                                                    handleDeleteComponent(
                                                      template.template_id,
                                                      item.item_id,
                                                      item.component_name
                                                    )
                                                  }
                                                >
                                                  <Trash2 className="w-4 h-4 text-destructive" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>Delete component</TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              
                              {/* Add Component Button */}
                              <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => handleAddComponent(template)}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Component
                              </Button>
                            </>
                          ) : (
                            <div className="text-center py-8">
                              <p className="text-sm text-muted-foreground mb-4">
                                No components configured for this template
                              </p>
                              <Button
                                variant="outline"
                                onClick={() => handleAddComponent(template)}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add First Component
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Inspector Guide Reference Tab */}
        <TabsContent value="guide" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Inspector Field Guide</CardTitle>
              <CardDescription>
                Professional reference for conducting component-based inspections with D/E/R scoring methodology
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Overview */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Purpose:</strong> This guide provides standardized procedures for assessing road infrastructure assets 
                  using the D/E/R (Defect, Extent, Relevancy) scoring system to calculate Condition Index (CI) values.
                </AlertDescription>
              </Alert>

              {/* D/E/R Scoring Methodology */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Understanding D/E/R Scoring</h3>
                <p className="text-sm text-muted-foreground">
                  Each component of an asset is evaluated using three dimensions to calculate its condition:
                </p>
                
                <div className="grid gap-4 md:grid-cols-3">
                  {/* Defect (D) */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">D - Defect</CardTitle>
                      <CardDescription className="text-xs">Severity of the defect</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">1</Badge>
                        <div>
                          <p className="font-medium">Minor</p>
                          <p className="text-xs text-muted-foreground">Cosmetic issues, no structural impact</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">2</Badge>
                        <div>
                          <p className="font-medium">Moderate</p>
                          <p className="text-xs text-muted-foreground">Noticeable deterioration, limited function loss</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">3</Badge>
                        <div>
                          <p className="font-medium">Significant</p>
                          <p className="text-xs text-muted-foreground">Major degradation, compromised performance</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">4</Badge>
                        <div>
                          <p className="font-medium">Severe</p>
                          <p className="text-xs text-muted-foreground">Critical failure, safety hazard</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Extent (E) */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">E - Extent</CardTitle>
                      <CardDescription className="text-xs">Area or quantity affected</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">1</Badge>
                        <div>
                          <p className="font-medium">Isolated</p>
                          <p className="text-xs text-muted-foreground">&lt;10% of component affected</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">2</Badge>
                        <div>
                          <p className="font-medium">Localized</p>
                          <p className="text-xs text-muted-foreground">10-30% of component affected</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">3</Badge>
                        <div>
                          <p className="font-medium">Widespread</p>
                          <p className="text-xs text-muted-foreground">30-70% of component affected</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">4</Badge>
                        <div>
                          <p className="font-medium">Extensive</p>
                          <p className="text-xs text-muted-foreground">&gt;70% of component affected</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Relevancy (R) */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">R - Relevancy</CardTitle>
                      <CardDescription className="text-xs">Importance to asset function</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">1</Badge>
                        <div>
                          <p className="font-medium">Low</p>
                          <p className="text-xs text-muted-foreground">Aesthetic, non-critical</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">2</Badge>
                        <div>
                          <p className="font-medium">Medium</p>
                          <p className="text-xs text-muted-foreground">Supports secondary function</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">3</Badge>
                        <div>
                          <p className="font-medium">High</p>
                          <p className="text-xs text-muted-foreground">Primary structural/functional element</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">4</Badge>
                        <div>
                          <p className="font-medium">Critical</p>
                          <p className="text-xs text-muted-foreground">Essential for safety/operation</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* CI Calculation */}
                <Alert className="bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription>
                    <strong className="text-blue-900">CI Calculation Formula:</strong>
                    <div className="mt-2 p-3 bg-white rounded border font-mono text-sm">
                      CI = 100 - (D × E × R)
                    </div>
                    <p className="text-xs mt-2 text-blue-800">
                      The Condition Index ranges from 0-100, where higher values indicate better condition. 
                      The final CI for the asset is the weighted average of all component CIs.
                    </p>
                  </AlertDescription>
                </Alert>
              </div>

              {/* Urgency Decision Tree */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold">Urgency Decision Framework</h3>
                <p className="text-sm text-muted-foreground">
                  Use this decision tree to determine the urgency level based on overall asset CI and safety considerations:
                </p>

                <div className="space-y-3">
                  <Card className="border-destructive/50 bg-destructive/5">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <Badge variant="destructive" className="mt-0.5">4 - Immediate</Badge>
                        <div className="flex-1 text-sm">
                          <p className="font-semibold mb-1">CI &lt; 40 OR Safety Hazard Present</p>
                          <p className="text-xs text-muted-foreground">
                            Immediate action required. Asset poses safety risk or critical structural failure. 
                            Repair/replace within 24-48 hours.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-warning/50 bg-warning/5">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-0.5 border-warning text-warning">3 - High</Badge>
                        <div className="flex-1 text-sm">
                          <p className="font-semibold mb-1">CI 40-59</p>
                          <p className="text-xs text-muted-foreground">
                            Urgent attention needed. Significant deterioration affecting function. 
                            Schedule repairs within 1-3 months.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-0.5 border-blue-500 text-blue-700">2 - Medium</Badge>
                        <div className="flex-1 text-sm">
                          <p className="font-semibold mb-1">CI 60-79</p>
                          <p className="text-xs text-muted-foreground">
                            Moderate priority. Noticeable wear, preventive maintenance recommended. 
                            Plan intervention within 6-12 months.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-success/50 bg-success/5">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-0.5 border-success text-success">1 - Low/Routine</Badge>
                        <div className="flex-1 text-sm">
                          <p className="font-semibold mb-1">CI ≥ 80</p>
                          <p className="text-xs text-muted-foreground">
                            Good condition. Include in routine maintenance cycle. 
                            Monitor during next scheduled inspection (12-24 months).
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Best Practices */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold">Inspection Best Practices</h3>
                <div className="grid gap-3">
                  <div className="flex gap-3 p-3 border rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium">Document thoroughly</p>
                      <p className="text-xs text-muted-foreground">
                        Take clear photos of all defects. Include measurements where applicable.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-3 border rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium">Be consistent</p>
                      <p className="text-xs text-muted-foreground">
                        Apply D/E/R scoring uniformly across all assets of the same type for comparability.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-3 border rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium">Consider context</p>
                      <p className="text-xs text-muted-foreground">
                        Factor in asset age, traffic volumes, environmental conditions, and intended lifespan.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-3 border rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium">Flag safety hazards immediately</p>
                      <p className="text-xs text-muted-foreground">
                        Any condition posing immediate danger should be reported and marked as Immediate Urgency regardless of CI.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-3 border rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium">Estimate remedial costs</p>
                      <p className="text-xs text-muted-foreground">
                        Provide realistic repair/replacement cost estimates to support budget planning and prioritization.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Component-Specific Examples */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold">Common Asset Components by Type</h3>
                <p className="text-sm text-muted-foreground">
                  Each asset type has unique components to inspect. Refer to the Inspection Templates tab for detailed lists.
                </p>
                
                <div className="grid gap-3 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Signage</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-xs space-y-1 text-muted-foreground list-disc list-inside">
                        <li>Foundation/Footing</li>
                        <li>Holding Bolts & Base Plates</li>
                        <li>Post/Vertical Member</li>
                        <li>Sign Face/Panel</li>
                        <li>Face Fasteners</li>
                        <li>Nearby Vegetation</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Guardrails</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-xs space-y-1 text-muted-foreground list-disc list-inside">
                        <li>W-Beam Rail Element</li>
                        <li>Posts</li>
                        <li>Connections & Bolts</li>
                        <li>Anchoring/Foundation</li>
                        <li>End Treatments</li>
                        <li>Reflectorization</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Traffic Signals</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-xs space-y-1 text-muted-foreground list-disc list-inside">
                        <li>Signal Heads & Lenses</li>
                        <li>Mast Arm/Support Structure</li>
                        <li>Controller Cabinet</li>
                        <li>Detection System</li>
                        <li>Electrical Wiring</li>
                        <li>Power Supply</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Safety Barriers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-xs space-y-1 text-muted-foreground list-disc list-inside">
                        <li>Barrier Face/Surface</li>
                        <li>Joints & Connections</li>
                        <li>Anchoring System</li>
                        <li>Drainage Provisions</li>
                        <li>Reflective Elements</li>
                        <li>Transitions & Terminals</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* How to Use Templates */}
              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-3">How to Customize Inspection Templates</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-2">
                    <Badge variant="outline" className="mt-0.5">1</Badge>
                    <p>Go to the <strong>Inspection Templates</strong> tab above</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="mt-0.5">2</Badge>
                    <p>Expand the asset type you want to modify</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="mt-0.5">3</Badge>
                    <p>Click the <Edit className="w-3 h-3 inline" /> Edit button on any component</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="mt-0.5">4</Badge>
                    <p>Update component names, inspection criteria, or quantity units as needed</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="mt-0.5">5</Badge>
                    <p>Save changes - new inspections will automatically use the updated templates</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Component Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Component</DialogTitle>
            <DialogDescription>
              Update component details, inspection criteria, and scoring rubrics
            </DialogDescription>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Component Name</Label>
                <Input
                  value={editingItem.component_name}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, component_name: e.target.value })
                  }
                  placeholder="e.g., Foundation"
                />
              </div>

              <div className="space-y-2">
                <Label>What to Inspect</Label>
                <Textarea
                  value={editingItem.what_to_inspect || ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, what_to_inspect: e.target.value })
                  }
                  placeholder="Describe what inspectors should look for..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Quantity Unit</Label>
                <Input
                  value={editingItem.quantity_unit || ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, quantity_unit: e.target.value })
                  }
                  placeholder="e.g., each, m, m², %"
                />
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Note:</strong> Rubric editing is currently view-only. To modify D/E/R scoring rubrics, 
                  please update the database directly or contact system administrator.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSaveComponent} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Component Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Component</DialogTitle>
            <DialogDescription>
              Add a new component to the selected template
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Component Name</Label>
                <Input
                  value={newComponent.component_name}
                  onChange={(e) =>
                    setNewComponent({ ...newComponent, component_name: e.target.value })
                  }
                  placeholder="e.g., Foundation"
                />
              </div>

              <div className="space-y-2">
                <Label>What to Inspect</Label>
                <Textarea
                  value={newComponent.what_to_inspect || ""}
                  onChange={(e) =>
                    setNewComponent({ ...newComponent, what_to_inspect: e.target.value })
                  }
                  placeholder="Describe what inspectors should look for..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Quantity Unit</Label>
                <Input
                  value={newComponent.quantity_unit || ""}
                  onChange={(e) =>
                    setNewComponent({ ...newComponent, quantity_unit: e.target.value })
                  }
                  placeholder="e.g., each, m, m², %"
                />
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Note:</strong> Rubric editing is currently view-only. To modify D/E/R scoring rubrics, 
                  please update the database directly or contact system administrator.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSaveNewComponent} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}