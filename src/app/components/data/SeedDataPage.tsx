import { useState, useContext } from "react";
import { AuthContext } from "../../App";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Database, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";

export default function SeedDataPage() {
  const { accessToken } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  const handleSeedData = async () => {
    if (!confirm("This will seed the database with default asset types, conditions, and inspection templates. Continue?")) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/seed-data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        toast.success("Database seeded successfully!");
      } else {
        const error = await response.json();
        toast.error(`Seeding failed: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error seeding data:", error);
      toast.error("Failed to seed data. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Seed Database</h1>
        <p className="text-muted-foreground">
          Initialize the database with default asset types, inspection templates, and lookup data.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Database Seeding</CardTitle>
          <CardDescription>
            This will populate the database with:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>9 Asset Types (Signage, Guardrail, Traffic Signal, Gantry, Fence, Safety Barrier, Guidepost, Road Marking, Raised Road Marker)</li>
            <li>Condition Lookup (Excellent, Good, Fair, Poor)</li>
            <li>Asset Status (Active, Damaged, Missing, Repaired, Replaced, Decommissioned)</li>
            <li>Urgency Levels (Immediate, High, Medium, Low)</li>
            <li>Inspection Types (Routine, Incident, Verification, Compliance, Safety Audit)</li>
            <li>Inspection Templates for each asset type with D/E/R rubrics</li>
          </ul>

          <div className="pt-4">
            <Button
              onClick={handleSeedData}
              disabled={loading}
              size="lg"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Seeding Database...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Seed Database Now
                </>
              )}
            </Button>
          </div>

          {result && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-success mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">Seeding Complete!</p>
                  <div className="mt-2 text-sm text-muted-foreground space-y-1">
                    {result.assetTypes && <p>✓ {result.assetTypes} asset types created</p>}
                    {result.conditions && <p>✓ {result.conditions} conditions created</p>}
                    {result.statuses && <p>✓ {result.statuses} status values created</p>}
                    {result.urgencyLevels && <p>✓ {result.urgencyLevels} urgency levels created</p>}
                    {result.inspectionTypes && <p>✓ {result.inspectionTypes} inspection types created</p>}
                    {result.componentTemplates && <p>✓ {result.componentTemplates} component templates created</p>}
                    {result.templateItems && <p>✓ {result.templateItems} template items created</p>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Important Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
              <p>This operation is idempotent - running it multiple times won't create duplicates.</p>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
              <p>Existing data will be preserved. Only missing records will be added.</p>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
              <p>After seeding, you can create inspections using the component-based templates.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
