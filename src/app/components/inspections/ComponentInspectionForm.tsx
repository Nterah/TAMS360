import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { AlertTriangle, Camera, TrendingDown, AlertCircle, Banknote, CheckCircle, XCircle, X, Upload } from "lucide-react";
import { toast } from "sonner";

interface ComponentScore {
  component_name: string;
  degree: string; // 0, 1, 2, 3, U, X
  extent: string; // 1, 2, 3, 4, U
  relevancy: string; // 1, 2, 3, 4, U
  urgency: string; // R, 0, 1, 2, 3, 4
  ci: number | null; // Calculated Conditional Index (0-100)
  quantity: number | null;
  unit: string;
  remedial_work: string;
  rate: number | null;
  cost: number | null;
  comments: string;
  photo_url?: string;
}

interface ComponentInspectionFormProps {
  assetType: string;
  components: any[];
  repairThreshold?: number; // Default 60
  onScoresChange?: (scores: ComponentScore[], aggregates: any) => void;
  initialScores?: any[]; // For editing existing inspections
}

export default function ComponentInspectionForm({
  assetType,
  components,
  repairThreshold = 60,
  onScoresChange,
  initialScores,
}: ComponentInspectionFormProps) {
  const [componentScores, setComponentScores] = useState<ComponentScore[]>(() => {
    // If initialScores provided, use them; otherwise create empty scores
    if (initialScores && initialScores.length > 0) {
      return initialScores.map((score) => ({
        component_name: score.component_name,
        degree: score.degree || "",
        extent: score.extent || "",
        relevancy: score.relevancy || "",
        urgency: score.urgency || "",
        ci: score.ci,
        quantity: score.quantity,
        unit: score.unit || "",
        remedial_work: score.remedial_work || "",
        rate: score.rate,
        cost: score.cost,
        comments: score.comments || "",
        photo_url: score.photo_url,
      }));
    }
    
    return components.map((comp) => ({
      component_name: comp.component_name,
      degree: "",
      extent: "",
      relevancy: "",
      urgency: "",
      ci: null,
      quantity: comp.default_quantity || null,
      unit: comp.quantity_unit || "",
      remedial_work: "",
      rate: null,
      cost: null,
      comments: "",
      photo_url: undefined,
    }));
  });

  // Calculate CI for a single component
  const calculateComponentCI = (D: string, E: string, R: string): number | null => {
    // Guard: if any invalid/blank → CI blank
    if (!D || !E || !R || D === "U" || E === "U" || R === "U") {
      return null;
    }

    // D=X or D=0 → CI=100 (Record only / No defect)
    if (D === "X" || D === "0") {
      return 100;
    }

    // Parse to numbers
    const d = parseInt(D);
    const e = parseInt(E);
    const r = parseInt(R);

    // Validate ranges
    if (isNaN(d) || isNaN(e) || isNaN(r) || d < 0 || d > 3 || e < 1 || e > 4 || r < 1 || r > 4) {
      return null;
    }

    // Penalty model: P = 0.5*(D/3) + 0.25*((E-1)/3) + 0.25*((R-1)/3)
    const P = 0.5 * (d / 3) + 0.25 * ((e - 1) / 3) + 0.25 * ((r - 1) / 3);

    // CI = ROUND(100*(1-P), 0) clipped to 0-100
    let ci = Math.round(100 * (1 - P));
    ci = Math.max(0, Math.min(100, ci));

    return ci;
  };

  // Calculate urgency based on decision tree
  const calculateUrgency = (D: string, E: string, R: string): string => {
    // Unable to inspect
    if (D === "U" || E === "U" || R === "U") return "U";

    // Record only
    if (D === "X" || D === "0") return "R";

    const d = parseInt(D);
    const e = parseInt(E);
    const r = parseInt(R);

    // U=4.1: R = 4
    if (r === 4) return "4";

    // U=4.2: D=3 & E=4 & R≥3
    if (d === 3 && e === 4 && r >= 3) return "4";

    // U=3.1: D=3 & E≥3 & R=3
    if (d === 3 && e >= 3 && r === 3) return "3";

    // U=3.2: 2≤D≤3 & E=4 & R≥3
    if (d >= 2 && d <= 3 && e === 4 && r >= 3) return "3";

    // U=3.3: D=1 & E=4 & R=2
    if (d === 1 && e === 4 && r === 2) return "3";

    // U=2.1: D=2 & E=3 & R=3
    if (d === 2 && e === 3 && r === 3) return "2";

    // U=2.2: D=3 & E≤3 & R≤3
    if (d === 3 && e <= 3 && r <= 3) return "2";

    // U=2.3: D=1 & E=3 & R=2
    if (d === 1 && e === 3 && r === 2) return "2";

    // U=2.4: D=1 & E=2 & R=3
    if (d === 1 && e === 2 && r === 3) return "2";

    // U=2.5: D=2 & E≤3 & R=3
    if (d === 2 && e <= 3 && r === 3) return "2";

    // U=1.1: D=2 & E≤3 & R≤2
    if (d === 2 && e <= 3 && r <= 2) return "1";

    // U=1.2: D=1 & E=3 & R=3
    if (d === 1 && e === 3 && r === 3) return "1";

    // U=1.3: D=1 & E=1 & R=3
    if (d === 1 && e === 1 && r === 3) return "1";

    // U=0.1: D=1 & E≤2 & R≤2 (default remaining)
    return "0";
  };

  // Update component score
  const updateComponentScore = (index: number, field: string, value: any) => {
    const updated = [...componentScores];
    updated[index] = { ...updated[index], [field]: value };

    // Recalculate CI and urgency if D/E/R changed
    if (field === "degree" || field === "extent" || field === "relevancy") {
      const { degree, extent, relevancy } = updated[index];
      updated[index].ci = calculateComponentCI(degree, extent, relevancy);
      updated[index].urgency = calculateUrgency(degree, extent, relevancy);

      // Recalculate cost based on CI and repair threshold
      const ci = updated[index].ci;
      if (ci !== null && ci <= repairThreshold) {
        // Apply remedial work and cost
        const quantity = updated[index].quantity || 0;
        const rate = updated[index].rate || 0;
        updated[index].cost = quantity * rate;
      } else {
        // Clear cost if above threshold
        updated[index].cost = null;
      }
    }

    // Recalculate cost if quantity or rate changed
    if (field === "quantity" || field === "rate") {
      const ci = updated[index].ci;
      if (ci !== null && ci <= repairThreshold) {
        const quantity = updated[index].quantity || 0;
        const rate = updated[index].rate || 0;
        updated[index].cost = quantity * rate;
      }
    }

    setComponentScores(updated);

    // Calculate aggregates and notify parent
    const aggregates = calculateAggregates(updated);
    if (onScoresChange) {
      onScoresChange(updated, aggregates);
    }
  };

  // Handle photo upload for a component
  const handleComponentPhotoUpload = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          updateComponentScore(index, "photo_url", e.target.result as string);
          toast.success(`Photo added to ${componentScores[index].component_name}`);
        }
      };
      reader.readAsDataURL(file);
    } else {
      toast.error("Please select a valid image file");
    }
  };

  // Remove photo from a component
  const handleRemoveComponentPhoto = (index: number) => {
    updateComponentScore(index, "photo_url", undefined);
    toast.success("Photo removed");
  };

  // Calculate CI_health, CI_safety, CI_final
  const calculateAggregates = (scores: ComponentScore[]) => {
    // CI_health: average of non-blank CIs
    const validCIs = scores.map((s) => s.ci).filter((ci) => ci !== null) as number[];
    const ci_health = validCIs.length > 0 ? Math.round(validCIs.reduce((a, b) => a + b, 0) / validCIs.length) : null;

    // CI_safety: map worst urgency → 0-100
    const urgencies = scores.map((s) => s.urgency).filter((u) => u && u !== "R" && u !== "U");
    let worstUrgency = "R";
    if (urgencies.includes("4")) worstUrgency = "4";
    else if (urgencies.includes("3")) worstUrgency = "3";
    else if (urgencies.includes("2")) worstUrgency = "2";
    else if (urgencies.includes("1")) worstUrgency = "1";
    else if (urgencies.includes("0")) worstUrgency = "0";

    const urgencyToCI: Record<string, number> = {
      R: 100,
      "0": 90,
      "1": 75,
      "2": 50,
      "3": 25,
      "4": 0,
    };
    const ci_safety = urgencyToCI[worstUrgency] ?? null;

    // CI_final: MIN(CI_health, CI_safety)
    const ci_final =
      ci_health !== null && ci_safety !== null ? Math.min(ci_health, ci_safety) : null;

    // Total remedial cost
    const total_cost = scores.reduce((sum, s) => sum + (s.cost || 0), 0);

    // Overall remedial work (concatenate non-empty)
    const overall_remedial = scores
      .map((s) => s.remedial_work)
      .filter((r) => r)
      .join("; ");

    // Overall D/E/R (worst component)
    const worstComponent = scores.reduce((worst, curr) => {
      if (!worst.urgency) return curr;
      if (!curr.urgency) return worst;
      const urgencyRank: Record<string, number> = { "4": 4, "3": 3, "2": 2, "1": 1, "0": 0, R: -1, U: -2 };
      return (urgencyRank[curr.urgency] ?? -3) > (urgencyRank[worst.urgency] ?? -3) ? curr : worst;
    }, scores[0]);

    return {
      ci_health,
      ci_safety,
      ci_final,
      worst_urgency: worstUrgency,
      total_cost,
      overall_remedial,
      overall_degree: worstComponent?.degree || "",
      overall_extent: worstComponent?.extent || "",
      overall_relevancy: worstComponent?.relevancy || "",
    };
  };

  // Get CI badge color
  const getCIBadgeColor = (ci: number | null): string => {
    if (ci === null) return "bg-slate-500";
    if (ci >= 80) return "bg-success";
    if (ci >= 60) return "bg-info";
    if (ci >= 40) return "bg-warning";
    return "bg-destructive";
  };

  // Get CI badge text
  const getCIBadgeText = (ci: number | null): string => {
    if (ci === null) return "Not Scored";
    if (ci >= 80) return "Excellent";
    if (ci >= 60) return "Good";
    if (ci >= 40) return "Fair";
    return "Poor";
  };

  // Get urgency badge
  const getUrgencyBadge = (urgency: string) => {
    const urgencyLabels: Record<string, { label: string; color: string; icon: any }> = {
      "4": { label: "Critical", color: "bg-destructive", icon: AlertTriangle },
      "3": { label: "High", color: "bg-warning", icon: AlertTriangle },
      "2": { label: "Medium", color: "bg-info", icon: AlertTriangle },
      "1": { label: "Low", color: "bg-slate-500", icon: AlertTriangle },
      "0": { label: "Routine", color: "bg-success", icon: CheckCircle },
      R: { label: "Record Only", color: "bg-slate-300", icon: CheckCircle },
      U: { label: "Unable to Inspect", color: "bg-slate-400", icon: XCircle },
    };
    return urgencyLabels[urgency] || { label: "Unknown", color: "bg-slate-500", icon: XCircle };
  };

  const aggregates = calculateAggregates(componentScores);

  return (
    <div className="space-y-6">
      {/* Aggregate Summary */}
      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="text-lg">Overall Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">CI Health</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold">{aggregates.ci_health ?? "—"}</span>
                {aggregates.ci_health !== null && (
                  <Badge className={getCIBadgeColor(aggregates.ci_health)}>
                    {getCIBadgeText(aggregates.ci_health)}
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CI Safety</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold">{aggregates.ci_safety ?? "—"}</span>
                {aggregates.ci_safety !== null && (
                  <Badge className={getCIBadgeColor(aggregates.ci_safety)}>
                    {getCIBadgeText(aggregates.ci_safety)}
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CI Final</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold">{aggregates.ci_final ?? "—"}</span>
                {aggregates.ci_final !== null && (
                  <Badge className={getCIBadgeColor(aggregates.ci_final)}>
                    {getCIBadgeText(aggregates.ci_final)}
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Worst Urgency</p>
              <div className="mt-1">
                {(() => {
                  const { label, color, icon: Icon } = getUrgencyBadge(aggregates.worst_urgency);
                  return (
                    <Badge className={color}>
                      <Icon className="w-3 h-3 mr-1" />
                      {label}
                    </Badge>
                  );
                })()}
              </div>
            </div>
          </div>
          {aggregates.total_cost > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">Total Remedial Cost</p>
              <p className="text-2xl font-bold text-warning mt-1 flex items-center gap-1">
                <Banknote className="w-5 h-5" />
                R {aggregates.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Component Scores */}
      <div className="space-y-4">
        {componentScores.map((score, index) => (
          <Card key={index} className={score.ci !== null && score.ci <= repairThreshold ? "border-warning" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {score.component_name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {score.ci !== null && (
                    <>
                      <Badge className={getCIBadgeColor(score.ci)}>CI: {score.ci}</Badge>
                      {score.urgency && (() => {
                        const { label, color, icon: Icon } = getUrgencyBadge(score.urgency);
                        return (
                          <Badge className={color}>
                            <Icon className="w-3 h-3 mr-1" />
                            U: {label}
                          </Badge>
                        );
                      })()}
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* D/E/R Scoring */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Degree (D)</Label>
                  <Select
                    value={score.degree}
                    onValueChange={(value) => updateComponentScore(index, "degree", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select degree" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 - No defect</SelectItem>
                      <SelectItem value="1">1 - Minor</SelectItem>
                      <SelectItem value="2">2 - Moderate</SelectItem>
                      <SelectItem value="3">3 - Severe</SelectItem>
                      <SelectItem value="X">X - Record only</SelectItem>
                      <SelectItem value="U">U - Unable to inspect</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Extent (E)</Label>
                  <Select
                    value={score.extent}
                    onValueChange={(value) => updateComponentScore(index, "extent", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select extent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Isolated (&lt;10%)</SelectItem>
                      <SelectItem value="2">2 - Local (10-30%)</SelectItem>
                      <SelectItem value="3">3 - General (30-60%)</SelectItem>
                      <SelectItem value="4">4 - Extensive (&gt;60%)</SelectItem>
                      <SelectItem value="U">U - Unable to inspect</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Relevancy (R)</Label>
                  <Select
                    value={score.relevancy}
                    onValueChange={(value) => updateComponentScore(index, "relevancy", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select relevancy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Insignificant</SelectItem>
                      <SelectItem value="2">2 - Minor</SelectItem>
                      <SelectItem value="3">3 - Significant</SelectItem>
                      <SelectItem value="4">4 - Critical</SelectItem>
                      <SelectItem value="U">U - Unable to inspect</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Remedial Work & Costing (only if CI <= threshold) */}
              {score.ci !== null && score.ci <= repairThreshold && (
                <div className="border-t pt-4 space-y-4">
                  <div className="bg-warning/10 p-3 rounded-md">
                    <p className="text-sm font-medium text-warning">
                      <AlertTriangle className="w-4 h-4 inline mr-1" />
                      Remedial Action Required (CI {score.ci} ≤ Threshold {repairThreshold})
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Unit</Label>
                      <Input
                        value={score.unit}
                        onChange={(e) => updateComponentScore(index, "unit", e.target.value)}
                        placeholder="e.g., m², units"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={score.quantity || ""}
                        onChange={(e) =>
                          updateComponentScore(index, "quantity", parseFloat(e.target.value) || null)
                        }
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Rate</Label>
                      <Input
                        type="number"
                        value={score.rate || ""}
                        onChange={(e) =>
                          updateComponentScore(index, "rate", parseFloat(e.target.value) || null)
                        }
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cost</Label>
                      <div className="flex items-center h-10 px-3 border rounded-md bg-muted gap-1">
                        <Banknote className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">
                          R {(score.cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Remedial Work Description</Label>
                    <Textarea
                      value={score.remedial_work}
                      onChange={(e) => updateComponentScore(index, "remedial_work", e.target.value)}
                      placeholder="Describe the remedial work required..."
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {/* Comments and Photo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Comments</Label>
                  <Textarea
                    value={score.comments}
                    onChange={(e) => updateComponentScore(index, "comments", e.target.value)}
                    placeholder="Additional observations..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Component Photo</Label>
                  <div className="flex gap-2">
                    {/* Camera Capture */}
                    <label htmlFor={`camera-component-${index}`} className="flex-1">
                      <input
                        type="file"
                        id={`camera-component-${index}`}
                        className="hidden"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleComponentPhotoUpload(index, e)}
                      />
                      <Button 
                        type="button"
                        variant="outline" 
                        className="w-full" 
                        size="sm"
                        onClick={() => document.getElementById(`camera-component-${index}`)?.click()}
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Take Photo
                      </Button>
                    </label>

                    {/* File Upload */}
                    <label htmlFor={`upload-component-${index}`} className="flex-1">
                      <input
                        type="file"
                        id={`upload-component-${index}`}
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleComponentPhotoUpload(index, e)}
                      />
                      <Button 
                        type="button"
                        variant="outline" 
                        className="w-full" 
                        size="sm"
                        onClick={() => document.getElementById(`upload-component-${index}`)?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload
                      </Button>
                    </label>
                  </div>

                  {/* Photo Preview */}
                  {score.photo_url && (
                    <div className="relative group mt-2">
                      <img
                        src={score.photo_url}
                        alt={`${score.component_name} photo`}
                        className="w-full h-32 object-cover rounded-md border-2 border-border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveComponentPhoto(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}