import { useState, useContext } from "react";
import { AuthContext } from "../../App";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ArrowLeft, Database, RefreshCw, CheckCircle2, AlertCircle, Loader2, MapPin } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

export default function MigrationUtilityPage() {
  const { user, accessToken, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<any>(null);
  const [tenantStatus, setTenantStatus] = useState<"checking" | "uuid" | "old-format" | "error">("checking");
  const [updatingCoords, setUpdatingCoords] = useState(false);
  const [coordsResult, setCoordsResult] = useState<any>(null);

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  // Check tenant format on mount
  useState(() => {
    checkTenantStatus();
  });

  const checkTenantStatus = async () => {
    try {
      setTenantStatus("checking");
      
      // Simple check: if user's tenantId is already a UUID, we're good
      const tenantId = user?.tenantId;
      if (!tenantId) {
        setTenantStatus("error");
        return;
      }

      // UUID regex check
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(tenantId)) {
        setTenantStatus("uuid");
      } else {
        setTenantStatus("old-format");
      }
    } catch (error) {
      console.error("Error checking tenant status:", error);
      setTenantStatus("error");
    }
  };

  const handleMigrateTenant = async () => {
    if (!accessToken) {
      toast.error("Not authenticated");
      return;
    }

    setMigrating(true);
    setMigrationResult(null);

    try {
      const response = await fetch(`${API_URL}/auth/migrate-tenant-to-uuid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setMigrationResult(result);
        
        if (result.alreadyMigrated) {
          toast.success("Organization is already using UUID format");
        } else {
          toast.success("Migration completed successfully! Please log in again.");
          // Log out user and redirect to login
          setTimeout(() => {
            logout();
            navigate("/login");
          }, 2000);
        }
      } else {
        const error = await response.json();
        console.error("Migration error:", error);
        toast.error(`Migration failed: ${error.error || "Unknown error"}`);
        setMigrationResult({ error: error.error || "Migration failed" });
      }
    } catch (error: any) {
      console.error("Error during migration:", error);
      toast.error(`Error: ${error.message || "Migration failed"}`);
      setMigrationResult({ error: error.message || "Migration failed" });
    } finally {
      setMigrating(false);
    }
  };

  const handleUpdateHNCoordinates = async () => {
    if (!accessToken) {
      toast.error("Not authenticated");
      return;
    }

    if (!confirm("This will update all HN Consulting assets to have coordinates along roads in Pietermaritzburg (R403, M70, R33). Continue?")) {
      return;
    }

    setUpdatingCoords(true);
    setCoordsResult(null);

    try {
      const response = await fetch(`${API_URL}/admin/update-hn-coordinates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (response.ok) {
        setCoordsResult(result);
        toast.success(`Successfully updated ${result.updated} assets!`);
      } else {
        console.error("Coordinate update error:", result);
        toast.error(`Update failed: ${result.error || "Unknown error"}`);
        setCoordsResult({ error: result.error || "Update failed" });
      }
    } catch (error: any) {
      console.error("Error updating coordinates:", error);
      toast.error(`Error: ${error.message || "Update failed"}`);
      setCoordsResult({ error: error.message || "Update failed" });
    } finally {
      setUpdatingCoords(false);
    }
  };

  // Only allow admins to access this page
  if (user?.role !== "admin") {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Only administrators can access the Migration Utility.
          </AlertDescription>
        </Alert>
        <Link to="/dashboard">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link to="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Migration Utility</h1>
              <p className="text-muted-foreground">
                Migrate organization data to UUID-based format
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Status</CardTitle>
          <CardDescription>
            Current organization identifier format
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-primary" />
              <div>
                <p className="font-semibold">Organization ID</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {user?.tenantId || "Not available"}
                </p>
              </div>
            </div>
            <div>
              {tenantStatus === "checking" && (
                <Badge variant="outline">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Checking...
                </Badge>
              )}
              {tenantStatus === "uuid" && (
                <Badge variant="default" className="bg-success">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  UUID Format ✓
                </Badge>
              )}
              {tenantStatus === "old-format" && (
                <Badge variant="destructive">
                  <AlertCircle className="mr-1 h-3 w-3" />
                  Old Format
                </Badge>
              )}
              {tenantStatus === "error" && (
                <Badge variant="outline">
                  <AlertCircle className="mr-1 h-3 w-3" />
                  Error
                </Badge>
              )}
            </div>
          </div>

          {tenantStatus === "uuid" && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Migration Not Required</AlertTitle>
              <AlertDescription>
                Your organization is already using the UUID-based identifier format.
                No action is needed.
              </AlertDescription>
            </Alert>
          )}

          {tenantStatus === "old-format" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Migration Recommended</AlertTitle>
              <AlertDescription>
                Your organization is using an older identifier format. We recommend
                migrating to the UUID-based format for better compatibility and security.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Migration Action Card */}
      {tenantStatus === "old-format" && (
        <Card>
          <CardHeader>
            <CardTitle>Migrate to UUID Format</CardTitle>
            <CardDescription>
              This will update your organization's identifier to use UUID format
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                What will happen:
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                <li>Your organization ID will be converted to UUID format</li>
                <li>All associated users will be updated automatically</li>
                <li>You will need to log in again after migration</li>
                <li>Your data will remain intact and accessible</li>
              </ul>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                ⚠️ Important Notes:
              </h4>
              <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1 list-disc list-inside">
                <li>All users will need to log in again</li>
                <li>Active sessions will be invalidated</li>
                <li>The migration typically takes less than a minute</li>
                <li>This operation cannot be reversed</li>
              </ul>
            </div>

            <Button
              onClick={handleMigrateTenant}
              disabled={migrating}
              size="lg"
              className="w-full"
            >
              {migrating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Migrating...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Start Migration
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Migration Result */}
      {migrationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {migrationResult.error ? (
                <>
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Migration Failed
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  Migration Complete
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {migrationResult.error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{migrationResult.error}</AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>
                  {migrationResult.message || "Migration completed successfully"}
                  {migrationResult.tenantId && (
                    <div className="mt-2 font-mono text-xs">
                      New ID: {migrationResult.tenantId}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Update HN Coordinates Action Card */}
      <Card>
        <CardHeader>
          <CardTitle>Update HN Coordinates</CardTitle>
          <CardDescription>
            This will update all HN Consulting assets to have coordinates along roads in Pietermaritzburg (R403, M70, R33)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              What will happen:
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
              <li>All HN Consulting assets will be updated with new coordinates</li>
              <li>The coordinates will be along roads in Pietermaritzburg (R403, M70, R33)</li>
              <li>Your data will remain intact and accessible</li>
            </ul>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
              ⚠️ Important Notes:
            </h4>
            <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1 list-disc list-inside">
              <li>This operation cannot be reversed</li>
              <li>The update typically takes less than a minute</li>
            </ul>
          </div>

          <Button
            onClick={handleUpdateHNCoordinates}
            disabled={updatingCoords}
            size="lg"
            className="w-full"
          >
            {updatingCoords ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Update Coordinates
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Update HN Coordinates Result */}
      {coordsResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {coordsResult.error ? (
                <>
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Update Failed
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  Update Complete
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {coordsResult.error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{coordsResult.error}</AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>
                  {coordsResult.message || "Update completed successfully"}
                  {coordsResult.updated && (
                    <div className="mt-2 font-mono text-xs">
                      Updated Assets: {coordsResult.updated}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}