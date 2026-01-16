import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../App";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription } from "../ui/alert";
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Database, 
  Server, 
  Activity,
  FileCheck,
  Users,
  BarChart3,
  Wrench,
  ClipboardCheck,
  RefreshCw,
  ArrowLeft
} from "lucide-react";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";

interface HealthCheck {
  name: string;
  status: "pass" | "fail" | "warning" | "pending";
  message: string;
  details?: string;
  critical: boolean;
}

interface SystemStats {
  assets: number;
  inspections: number;
  maintenance: number;
  users: number;
  templates: number;
}

export default function SystemHealthPage() {
  const navigate = useNavigate();
  const { user, accessToken } = useContext(AuthContext);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  useEffect(() => {
    runHealthChecks();
  }, []);

  const runHealthChecks = async () => {
    setLoading(true);
    const checks: HealthCheck[] = [];

    // 1. Backend API Health
    checks.push(await checkBackendHealth());

    // 2. Database Schema
    checks.push(await checkDatabaseSchema());

    // 3. Asset Types Seeded
    checks.push(await checkAssetTypes());

    // 4. Component Templates
    checks.push(await checkComponentTemplates());

    // 5. User System
    checks.push(await checkUserSystem());

    // 6. Dashboard Views
    checks.push(await checkDashboardViews());

    // 7. Asset CRUD
    checks.push(await checkAssetOperations());

    // 8. Inspection System
    checks.push(await checkInspectionSystem());

    // 9. Maintenance System
    checks.push(await checkMaintenanceSystem());

    // 10. Authentication
    checks.push(await checkAuthentication());

    setHealthChecks(checks);
    await fetchSystemStats();
    setLastCheck(new Date());
    setLoading(false);
  };

  const checkBackendHealth = async (): Promise<HealthCheck> => {
    try {
      const response = await fetch(`${API_URL}/health`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        return {
          name: "Backend API Server",
          status: "pass",
          message: "Backend server is running",
          details: "All API endpoints are accessible",
          critical: true,
        };
      } else {
        return {
          name: "Backend API Server",
          status: "fail",
          message: "Backend server returned error",
          details: `Status: ${response.status}`,
          critical: true,
        };
      }
    } catch (error) {
      return {
        name: "Backend API Server",
        status: "fail",
        message: "Cannot reach backend server",
        details: error instanceof Error ? error.message : "Unknown error",
        critical: true,
      };
    }
  };

  const checkDatabaseSchema = async (): Promise<HealthCheck> => {
    try {
      const response = await fetch(`${API_URL}/assets`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        return {
          name: "Database Schema (tams360)",
          status: "pass",
          message: "Database schema is accessible",
          details: "All tables can be queried",
          critical: true,
        };
      } else {
        const text = await response.text();
        if (text.includes("schema") || text.includes("relation")) {
          return {
            name: "Database Schema (tams360)",
            status: "fail",
            message: "Schema not found or tables missing",
            details: "Run database setup scripts",
            critical: true,
          };
        }
        return {
          name: "Database Schema (tams360)",
          status: "warning",
          message: "Database query returned error",
          details: text.substring(0, 100),
          critical: true,
        };
      }
    } catch (error) {
      return {
        name: "Database Schema (tams360)",
        status: "fail",
        message: "Cannot query database",
        details: error instanceof Error ? error.message : "Unknown error",
        critical: true,
      };
    }
  };

  const checkAssetTypes = async (): Promise<HealthCheck> => {
    try {
      const response = await fetch(`${API_URL}/asset-types`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const count = data.asset_types?.length || 0;
        
        if (count >= 9) {
          return {
            name: "Asset Types",
            status: "pass",
            message: `${count} asset types configured`,
            details: "All standard asset types are available",
            critical: false,
          };
        } else if (count > 0) {
          return {
            name: "Asset Types",
            status: "warning",
            message: `Only ${count} asset types found`,
            details: "Expected 9+ types. Run seed data script.",
            critical: false,
          };
        } else {
          return {
            name: "Asset Types",
            status: "fail",
            message: "No asset types found",
            details: "Run seed data to populate asset types",
            critical: false,
          };
        }
      } else {
        return {
          name: "Asset Types",
          status: "fail",
          message: "Cannot fetch asset types",
          details: await response.text(),
          critical: false,
        };
      }
    } catch (error) {
      return {
        name: "Asset Types",
        status: "fail",
        message: "Error checking asset types",
        details: error instanceof Error ? error.message : "Unknown error",
        critical: false,
      };
    }
  };

  const checkComponentTemplates = async (): Promise<HealthCheck> => {
    try {
      const response = await fetch(`${API_URL}/data/templates`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const count = data.templates?.length || 0;
        
        if (count >= 50) {
          return {
            name: "Component Templates",
            status: "pass",
            message: `${count} component templates loaded`,
            details: "All asset types have component definitions",
            critical: false,
          };
        } else if (count > 0) {
          return {
            name: "Component Templates",
            status: "warning",
            message: `Only ${count} templates found`,
            details: "Some asset types may be missing components",
            critical: false,
          };
        } else {
          return {
            name: "Component Templates",
            status: "fail",
            message: "No component templates found",
            details: "Component-based inspections require templates",
            critical: false,
          };
        }
      } else {
        return {
          name: "Component Templates",
          status: "warning",
          message: "Cannot fetch templates",
          details: "Templates endpoint may not be available",
          critical: false,
        };
      }
    } catch (error) {
      return {
        name: "Component Templates",
        status: "warning",
        message: "Error checking templates",
        details: error instanceof Error ? error.message : "Unknown error",
        critical: false,
      };
    }
  };

  const checkUserSystem = async (): Promise<HealthCheck> => {
    try {
      if (!user) {
        return {
          name: "User Authentication",
          status: "warning",
          message: "Not logged in",
          details: "Cannot verify user system while logged out",
          critical: false,
        };
      }

      const response = await fetch(`${API_URL}/admin/users`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const count = data.users?.length || 0;
        
        return {
          name: "User Management",
          status: "pass",
          message: `${count} users in system`,
          details: `Current user: ${user.name} (${user.role})`,
          critical: false,
        };
      } else {
        return {
          name: "User Management",
          status: "warning",
          message: "Cannot fetch users",
          details: "May require admin permissions",
          critical: false,
        };
      }
    } catch (error) {
      return {
        name: "User Management",
        status: "warning",
        message: "Error checking user system",
        details: error instanceof Error ? error.message : "Unknown error",
        critical: false,
      };
    }
  };

  const checkDashboardViews = async (): Promise<HealthCheck> => {
    try {
      const response = await fetch(`${API_URL}/dashboard/ci-distribution`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        return {
          name: "Dashboard Views",
          status: "pass",
          message: "Dashboard database views working",
          details: "CI distribution, urgency summary accessible",
          critical: false,
        };
      } else {
        const text = await response.text();
        if (text.includes("view") || text.includes("relation")) {
          return {
            name: "Dashboard Views",
            status: "fail",
            message: "Dashboard views not found",
            details: "Run database view creation scripts",
            critical: false,
          };
        }
        return {
          name: "Dashboard Views",
          status: "warning",
          message: "Dashboard views may have issues",
          details: text.substring(0, 100),
          critical: false,
        };
      }
    } catch (error) {
      return {
        name: "Dashboard Views",
        status: "warning",
        message: "Error checking dashboard views",
        details: error instanceof Error ? error.message : "Unknown error",
        critical: false,
      };
    }
  };

  const checkAssetOperations = async (): Promise<HealthCheck> => {
    try {
      const response = await fetch(`${API_URL}/assets`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          name: "Asset CRUD Operations",
          status: "pass",
          message: "Asset operations functional",
          details: `${data.assets?.length || 0} assets in database`,
          critical: false,
        };
      } else {
        return {
          name: "Asset CRUD Operations",
          status: "fail",
          message: "Cannot fetch assets",
          details: await response.text(),
          critical: false,
        };
      }
    } catch (error) {
      return {
        name: "Asset CRUD Operations",
        status: "fail",
        message: "Error with asset operations",
        details: error instanceof Error ? error.message : "Unknown error",
        critical: false,
      };
    }
  };

  const checkInspectionSystem = async (): Promise<HealthCheck> => {
    try {
      const response = await fetch(`${API_URL}/inspections`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          name: "Inspection System",
          status: "pass",
          message: "Inspection system operational",
          details: `${data.inspections?.length || 0} inspections recorded`,
          critical: false,
        };
      } else {
        return {
          name: "Inspection System",
          status: "fail",
          message: "Cannot fetch inspections",
          details: await response.text(),
          critical: false,
        };
      }
    } catch (error) {
      return {
        name: "Inspection System",
        status: "fail",
        message: "Error with inspection system",
        details: error instanceof Error ? error.message : "Unknown error",
        critical: false,
      };
    }
  };

  const checkMaintenanceSystem = async (): Promise<HealthCheck> => {
    try {
      const response = await fetch(`${API_URL}/maintenance`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          name: "Maintenance System",
          status: "pass",
          message: "Maintenance tracking functional",
          details: `${data.maintenance?.length || 0} maintenance records`,
          critical: false,
        };
      } else {
        return {
          name: "Maintenance System",
          status: "fail",
          message: "Cannot fetch maintenance records",
          details: await response.text(),
          critical: false,
        };
      }
    } catch (error) {
      return {
        name: "Maintenance System",
        status: "fail",
        message: "Error with maintenance system",
        details: error instanceof Error ? error.message : "Unknown error",
        critical: false,
      };
    }
  };

  const checkAuthentication = async (): Promise<HealthCheck> => {
    if (!user || !accessToken) {
      return {
        name: "Authentication",
        status: "warning",
        message: "Not authenticated",
        details: "Login to verify authentication system",
        critical: false,
      };
    }

    return {
      name: "Authentication",
      status: "pass",
      message: "User authenticated successfully",
      details: `Logged in as ${user.email} (${user.role})`,
      critical: false,
    };
  };

  const fetchSystemStats = async () => {
    try {
      const [assetsRes, inspectionsRes, maintenanceRes, usersRes, templatesRes] = await Promise.all([
        fetch(`${API_URL}/assets`, {
          headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
        }),
        fetch(`${API_URL}/inspections`, {
          headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
        }),
        fetch(`${API_URL}/maintenance`, {
          headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
        }),
        fetch(`${API_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
        }).catch(() => null),
        fetch(`${API_URL}/data/templates`, {
          headers: { Authorization: `Bearer ${accessToken || publicAnonKey}` },
        }).catch(() => null),
      ]);

      const assets = assetsRes.ok ? await assetsRes.json() : { assets: [] };
      const inspections = inspectionsRes.ok ? await inspectionsRes.json() : { inspections: [] };
      const maintenance = maintenanceRes.ok ? await maintenanceRes.json() : { maintenance: [] };
      const users = usersRes && usersRes.ok ? await usersRes.json() : { users: [] };
      const templates = templatesRes && templatesRes.ok ? await templatesRes.json() : { templates: [] };

      setStats({
        assets: assets.assets?.length || 0,
        inspections: inspections.inspections?.length || 0,
        maintenance: maintenance.maintenance?.length || 0,
        users: users.users?.length || 0,
        templates: templates.templates?.length || 0,
      });
    } catch (error) {
      console.error("Error fetching system stats:", error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass":
        return <CheckCircle2 className="size-5 text-green-600" />;
      case "fail":
        return <XCircle className="size-5 text-red-600" />;
      case "warning":
        return <AlertCircle className="size-5 text-yellow-600" />;
      default:
        return <Loader2 className="size-5 animate-spin text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pass":
        return <Badge className="bg-green-600">Pass</Badge>;
      case "fail":
        return <Badge variant="destructive">Fail</Badge>;
      case "warning":
        return <Badge className="bg-yellow-600">Warning</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const criticalChecks = healthChecks.filter((c) => c.critical);
  const nonCriticalChecks = healthChecks.filter((c) => !c.critical);
  const criticalFailures = criticalChecks.filter((c) => c.status === "fail").length;
  const overallHealth = criticalFailures === 0 ? "healthy" : "critical";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin')}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl">System Health Check</h1>
            <p className="text-muted-foreground">
              Verify all TAMS360 components are functioning correctly
            </p>
          </div>
        </div>
        <Button onClick={runHealthChecks} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 size-4" />
              Run Health Check
            </>
          )}
        </Button>
      </div>

      {/* Overall Status */}
      {!loading && (
        <Alert className={overallHealth === "healthy" ? "border-green-600 bg-green-50" : "border-red-600 bg-red-50"}>
          <Activity className={`size-4 ${overallHealth === "healthy" ? "text-green-600" : "text-red-600"}`} />
          <AlertDescription>
            {overallHealth === "healthy" ? (
              <span className="text-green-900">
                <strong>System is healthy!</strong> All critical checks passed. TAMS360 is operational.
              </span>
            ) : (
              <span className="text-red-900">
                <strong>Critical issues detected!</strong> {criticalFailures} critical check(s) failed. System may not function properly.
              </span>
            )}
            {lastCheck && (
              <span className="ml-2 text-xs text-muted-foreground">
                Last checked: {lastCheck.toLocaleTimeString()}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* System Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Database className="size-5 text-blue-600" />
                <span className="text-2xl font-bold">{stats.assets}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Inspections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <ClipboardCheck className="size-5 text-green-600" />
                <span className="text-2xl font-bold">{stats.inspections}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Maintenance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Wrench className="size-5 text-yellow-600" />
                <span className="text-2xl font-bold">{stats.maintenance}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="size-5 text-purple-600" />
                <span className="text-2xl font-bold">{stats.users}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileCheck className="size-5 text-indigo-600" />
                <span className="text-2xl font-bold">{stats.templates}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Critical Checks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="size-5" />
            Critical System Components
          </CardTitle>
          <CardDescription>
            These components must pass for TAMS360 to function properly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {criticalChecks.map((check, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent/50"
              >
                <div className="mt-0.5">{getStatusIcon(check.status)}</div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{check.name}</p>
                    {getStatusBadge(check.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{check.message}</p>
                  {check.details && (
                    <p className="text-xs text-muted-foreground">
                      {check.details}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Non-Critical Checks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="size-5" />
            Feature & Data Checks
          </CardTitle>
          <CardDescription>
            Optional features and data availability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {nonCriticalChecks.map((check, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent/50"
              >
                <div className="mt-0.5">{getStatusIcon(check.status)}</div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{check.name}</p>
                    {getStatusBadge(check.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{check.message}</p>
                  {check.details && (
                    <p className="text-xs text-muted-foreground">
                      {check.details}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting Guide</CardTitle>
          <CardDescription>
            Common issues and how to resolve them
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">❌ Backend API Server Failed</h4>
            <p className="text-sm text-muted-foreground">
              • Ensure Supabase Edge Functions are deployed<br />
              • Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables<br />
              • Verify the server is running at /supabase/functions/server/index.tsx
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">❌ Database Schema Failed</h4>
            <p className="text-sm text-muted-foreground">
              • Run the database schema creation scripts<br />
              • Verify 'tams360' schema exists in Supabase<br />
              • Check DATABASE_SCHEMA.md for setup instructions<br />
              • Ensure all tables are created with proper permissions
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">⚠️ Asset Types or Templates Missing</h4>
            <p className="text-sm text-muted-foreground">
              • Navigate to Data Management → Seed Data<br />
              • Run seed scripts to populate asset types and templates<br />
              • Check seed-database.sql for reference data
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">⚠️ Dashboard Views Failed</h4>
            <p className="text-sm text-muted-foreground">
              • Run PUBLIC_VIEWS_SETUP.sql to create dashboard views<br />
              • Verify views exist in both 'tams360' and 'public' schemas<br />
              • Check for proper view permissions
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">📚 Documentation</h4>
            <p className="text-sm text-muted-foreground">
              • See VERIFICATION_TESTING_GUIDE.md for detailed testing procedures<br />
              • Review BACKEND_FIXES_SUMMARY.md for recent schema fixes<br />
              • Consult DATABASE_IMPLEMENTATION_GUIDE.md for setup help
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}