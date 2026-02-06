import React, { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { CheckCircle2, XCircle, AlertCircle, Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { API_URL } from "@/lib/supabaseClient";

interface PreflightResult {
  inputRef: string;
  status: "FOUND" | "FOUND_NORMALIZED" | "MISSING";
  matchedRef: string | null;
  assetId: string | null;
}

interface PreflightSummary {
  total: number;
  found: number;
  normalized: number;
  missing: number;
}

interface PreflightCheckProps {
  assetRefs: string[];
  onPreflightComplete: (canUpload: boolean) => void;
  accessToken: string;
}

export function PreflightCheck({ assetRefs, onPreflightComplete, accessToken }: PreflightCheckProps) {
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<PreflightResult[] | null>(null);
  const [summary, setSummary] = useState<PreflightSummary | null>(null);
  const [creatingAssets, setCreatingAssets] = useState(false);

  const runPreflightCheck = async () => {
    setChecking(true);
    try {
      const response = await fetch(`${API_URL}/photos/preflight-assets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ assetRefs }),
      });

      if (!response.ok) {
        throw new Error(`Preflight check failed: ${response.statusText}`);
      }

      const data = await response.json();
      setResults(data.results);
      setSummary(data.summary);

      if (data.summary.missing === 0) {
        toast.success(`✅ All ${data.summary.total} assets found in database`);
        onPreflightComplete(true);
      } else {
        toast.warning(`⚠️ ${data.summary.missing} assets missing from database`);
        onPreflightComplete(false);
      }
    } catch (error: any) {
      console.error("Preflight check failed:", error);
      toast.error(`Preflight check failed: ${error.message}`);
      onPreflightComplete(false);
    } finally {
      setChecking(false);
    }
  };

  const downloadMissingAssetsCsv = () => {
    if (!results) return;

    const missingRefs = results.filter(r => r.status === "MISSING").map(r => r.inputRef);
    const csv = ["Asset Reference\n", ...missingRefs.map(ref => `${ref}\n`)].join("");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "missing-assets.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${missingRefs.length} missing asset refs`);
  };

  const createMissingAssets = async () => {
    if (!results) return;

    const missingRefs = results.filter(r => r.status === "MISSING").map(r => r.inputRef);
    
    if (missingRefs.length === 0) {
      toast.info("No missing assets to create");
      return;
    }

    setCreatingAssets(true);
    try {
      const response = await fetch(`${API_URL}/photos/create-missing-assets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ assetRefs: missingRefs }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create assets: ${response.statusText}`);
      }

      const data = await response.json();
      toast.success(`✅ Created ${data.summary.created} assets (skipped ${data.summary.skipped})`);

      // Re-run preflight check
      await runPreflightCheck();
    } catch (error: any) {
      console.error("Failed to create assets:", error);
      toast.error(`Failed to create assets: ${error.message}`);
    } finally {
      setCreatingAssets(false);
    }
  };

  // Auto-run on mount
  React.useEffect(() => {
    if (assetRefs.length > 0 && !results) {
      runPreflightCheck();
    }
  }, [assetRefs]);

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>🔍 Checking Assets...</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Validating {assetRefs.length} asset references against database...
          </p>
        </CardContent>
      </Card>
    );
  }

  const missingResults = results?.filter(r => r.status === "MISSING") || [];

  return (
    <Card className="border-yellow-500/20 bg-yellow-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-500" />
          Preflight Check Results
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{summary.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{summary.found}</div>
            <div className="text-sm text-muted-foreground">Found</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{summary.normalized}</div>
            <div className="text-sm text-muted-foreground">Matched</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{summary.missing}</div>
            <div className="text-sm text-muted-foreground">Missing</div>
          </div>
        </div>

        {/* Missing assets warning */}
        {summary.missing > 0 && (
          <>
            <Alert className="bg-red-500/10 border-red-500/20">
              <AlertDescription>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-semibold mb-2">
                      ⚠️ {summary.missing} assets are missing from the database
                    </p>
                    <p className="text-sm text-muted-foreground mb-3">
                      Uploads will fail until these assets are created or imported.
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={downloadMissingAssetsCsv}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download CSV
                      </Button>
                      <Button 
                        size="sm"
                        onClick={createMissingAssets}
                        disabled={creatingAssets}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {creatingAssets ? "Creating..." : "Create Missing Assets"}
                      </Button>
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {/* List missing assets */}
            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
                View missing assets ({missingResults.length})
              </summary>
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                {missingResults.map((result, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1 bg-muted/50 rounded text-xs font-mono">
                    <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                    {result.inputRef}
                  </div>
                ))}
              </div>
            </details>
          </>
        )}

        {/* Success message */}
        {summary.missing === 0 && (
          <Alert className="bg-green-500/10 border-green-500/20">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <AlertDescription>
              ✅ All assets found in database. You can proceed with upload.
            </AlertDescription>
          </Alert>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={runPreflightCheck}
          disabled={checking}
          className="w-full"
        >
          {checking ? "Rechecking..." : "Re-run Preflight Check"}
        </Button>
      </CardContent>
    </Card>
  );
}
