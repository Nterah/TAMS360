import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { ArrowLeft, Database, CheckCircle, XCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { authenticatedFetch } from '@/app/utils/auth';

export function DiagnosticPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<any | null>(null);

  const runDiagnostics = async () => {
    try {
      setLoading(true);
      
      const response = await authenticatedFetch('/diagnostics');
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Diagnostic response:', errorText);
        throw new Error('Failed to run diagnostics');
      }

      const data = await response.json();
      console.log('Diagnostics data:', data);
      setDiagnosticResults(data);
      
      toast.success('Diagnostics completed');
    } catch (error) {
      console.error('Error running diagnostics:', error);
      
      if (error instanceof Error && (error.message === 'AUTH_REQUIRED' || error.message === 'AUTH_EXPIRED')) {
        toast.error('Your session has expired. Please log in again.');
        navigate('/login');
        return;
      }
      
      toast.error('Failed to run diagnostics');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (exists: boolean) => {
    return exists ? (
      <CheckCircle className="w-5 h-5 text-green-600" />
    ) : (
      <XCircle className="w-5 h-5 text-red-600" />
    );
  };

  return (
    <div className="space-y-6">
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
        <h1 className="text-3xl font-bold">Database Diagnostics</h1>
        <p className="text-muted-foreground">
          Check database connection, tables, views, and data status
        </p>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Diagnostic Tools</CardTitle>
          <CardDescription>
            Run diagnostics to check your database configuration and identify issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runDiagnostics} disabled={loading}>
            <Database className="w-4 h-4 mr-2" />
            {loading ? 'Running...' : 'Run Diagnostics'}
          </Button>
        </CardContent>
      </Card>

      {/* Diagnostic Results */}
      {diagnosticResults && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">User</div>
                  <div className="font-medium">{diagnosticResults.user}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Timestamp</div>
                  <div className="font-medium">{new Date(diagnosticResults.timestamp).toLocaleString()}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Profile Check */}
          {diagnosticResults.checks?.userProfile && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(diagnosticResults.checks.userProfile.exists)}
                  User Profile (tams360_user_profiles_v)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {diagnosticResults.checks.userProfile.error ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded">
                    <div className="font-semibold text-red-900">Error</div>
                    <div className="text-sm text-red-700">{diagnosticResults.checks.userProfile.error}</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Tenant ID</div>
                        <div className="font-mono text-sm">{diagnosticResults.checks.userProfile.data?.tenant_id}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Role</div>
                        <Badge>{diagnosticResults.checks.userProfile.data?.role}</Badge>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Email</div>
                      <div className="text-sm">{diagnosticResults.checks.userProfile.data?.email}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tenant Check */}
          {diagnosticResults.checks?.tenant && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(diagnosticResults.checks.tenant.exists)}
                  Tenant (tams360_tenants_v)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {diagnosticResults.checks.tenant.error ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded">
                    <div className="font-semibold text-red-900">Error</div>
                    <div className="text-sm text-red-700">{diagnosticResults.checks.tenant.error}</div>
                  </div>
                ) : diagnosticResults.checks.tenant.data ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Name</div>
                      <div className="font-medium">{diagnosticResults.checks.tenant.data.name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Tier</div>
                      <Badge>{diagnosticResults.checks.tenant.data.tier}</Badge>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Status</div>
                      <Badge variant={diagnosticResults.checks.tenant.data.status === 'active' ? 'default' : 'secondary'}>
                        {diagnosticResults.checks.tenant.data.status}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No tenant data</div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Assets View Check */}
          {diagnosticResults.checks?.assets && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(diagnosticResults.checks.assets.viewExists)}
                  Assets View (tams360_assets_v)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {diagnosticResults.checks.assets.error ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded">
                    <div className="font-semibold text-red-900">Error</div>
                    <div className="text-sm text-red-700">{diagnosticResults.checks.assets.error}</div>
                    {!diagnosticResults.checks.assets.viewExists && (
                      <div className="mt-2 text-sm text-red-700">
                        ⚠️ The view doesn't exist. You need to create the database schema.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl font-bold text-green-600">{diagnosticResults.checks.assets.count || 0}</div>
                      <div className="text-sm text-muted-foreground">assets found for your tenant</div>
                    </div>
                    {diagnosticResults.checks.assets.sample && diagnosticResults.checks.assets.sample.length > 0 && (
                      <div>
                        <div className="text-sm font-semibold mb-2">Sample Assets:</div>
                        <div className="max-h-40 overflow-auto bg-slate-50 p-3 rounded border text-xs font-mono">
                          <pre>{JSON.stringify(diagnosticResults.checks.assets.sample, null, 2)}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Assets Table Check */}
          {diagnosticResults.checks?.assetsTable && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(diagnosticResults.checks.assetsTable.tableExists)}
                  Assets Table (assets)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {diagnosticResults.checks.assetsTable.error ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded">
                    <div className="font-semibold text-red-900">Error</div>
                    <div className="text-sm text-red-700">{diagnosticResults.checks.assetsTable.error}</div>
                    {!diagnosticResults.checks.assetsTable.tableExists && (
                      <div className="mt-2 text-sm text-red-700">
                        ⚠️ The table doesn't exist. You need to create the database schema.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">Table exists and is accessible</div>
                    {diagnosticResults.checks.assetsTable.sample && diagnosticResults.checks.assetsTable.sample.length > 0 && (
                      <div>
                        <div className="text-sm font-semibold mb-2">Sample Records:</div>
                        <div className="max-h-40 overflow-auto bg-slate-50 p-3 rounded border text-xs font-mono">
                          <pre>{JSON.stringify(diagnosticResults.checks.assetsTable.sample, null, 2)}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* All Assets Check */}
          {diagnosticResults.checks?.allAssets && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                  All Assets (Across All Tenants)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {diagnosticResults.checks.allAssets.error ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded">
                    <div className="font-semibold text-red-900">Error</div>
                    <div className="text-sm text-red-700">{diagnosticResults.checks.allAssets.error}</div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-bold text-blue-600">{diagnosticResults.checks.allAssets.totalCount || 0}</div>
                    <div className="text-sm text-muted-foreground">total assets in the database</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                Next Steps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(!diagnosticResults.checks?.assets?.viewExists || !diagnosticResults.checks?.assetsTable?.tableExists) && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="font-semibold text-yellow-900 mb-2">Database Schema Not Found</div>
                  <div className="text-sm text-yellow-700 space-y-2">
                    <p>The TAMS360 database schema has not been created yet. You need to:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Open your Supabase project dashboard</li>
                      <li>Go to the SQL Editor</li>
                      <li>Run the schema creation scripts from the DATABASE_SCHEMA.md file</li>
                      <li>Create the required tables in the <code className="bg-yellow-100 px-1 rounded">tams360</code> schema</li>
                      <li>Create the public views with the <code className="bg-yellow-100 px-1 rounded">tams360_</code> prefix</li>
                    </ol>
                  </div>
                </div>
              )}
              
              {diagnosticResults.checks?.assets?.viewExists && diagnosticResults.checks?.assets?.count === 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                  <div className="font-semibold text-blue-900 mb-2">No Assets Found</div>
                  <div className="text-sm text-blue-700">
                    The database schema exists but there are no assets yet. You can:
                    <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
                      <li>Use the Seed Data page to generate sample assets</li>
                      <li>Import assets from a CSV/Excel file</li>
                      <li>Create assets manually from the Assets page</li>
                    </ul>
                  </div>
                </div>
              )}
              
              {diagnosticResults.checks?.assets?.count > 0 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded">
                  <div className="font-semibold text-green-900 mb-2">✓ Database is working!</div>
                  <div className="text-sm text-green-700">
                    Your database is properly configured with {diagnosticResults.checks.assets.count} assets.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
