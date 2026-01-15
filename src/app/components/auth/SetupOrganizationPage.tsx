import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Building2, Check } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import Logo from "../ui/Logo";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { toast } from "sonner";

export default function SetupOrganizationPage() {
  const [tenantName, setTenantName] = useState("");
  const [tenantDomain, setTenantDomain] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  useEffect(() => {
    const checkTenantStatus = async () => {
      try {
        const token = localStorage.getItem("tams360_token");
        if (!token) {
          navigate("/login");
          return;
        }

        const response = await fetch(`${API_URL}/auth/check-tenant`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        
        if (data.hasTenant && data.tenantExists) {
          // User already has a tenant, redirect to dashboard
          toast.success("Organization already set up!");
          navigate("/dashboard");
        }
      } catch (error) {
        console.error("Error checking tenant status:", error);
      } finally {
        setChecking(false);
      }
    };

    checkTenantStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const token = localStorage.getItem("tams360_token");
      if (!token) {
        throw new Error("Not authenticated. Please log in again.");
      }

      const response = await fetch(`${API_URL}/auth/migrate-to-tenant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantName,
          tenantDomain: tenantDomain || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create organization");
      }

      // Update user in localStorage with new tenant info
      const userResponse = await fetch(`${API_URL}/auth/session`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        localStorage.setItem("tams360_user", JSON.stringify(userData.user));
      }

      toast.success("Organization created successfully!");
      
      // Redirect to dashboard
      setTimeout(() => {
        navigate("/dashboard");
        window.location.reload(); // Reload to update context
      }, 500);
    } catch (err: any) {
      setError(err.message || "Failed to create organization");
      toast.error(err.message || "Failed to create organization");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#010D13] via-[#1a2d32] to-[#010D13] flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Checking your account...</p>
          {/* EMERGENCY BYPASS BUTTON */}
          <Button 
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="mt-4"
          >
            Skip to Dashboard (Emergency Bypass)
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#010D13] via-[#1a2d32] to-[#010D13] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <Logo width={160} height={60} />
          </div>
          <p className="text-gray-300">Road & Traffic Asset Management Suite</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-6 w-6 text-primary" />
              <CardTitle>Set Up Your Organization</CardTitle>
            </div>
            <CardDescription>
              Your account needs to be associated with an organization. Create one to get started.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Alert>
                <Check className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  You'll become the administrator of this new organization with full access.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="tenantName">
                  Organization Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="tenantName"
                  type="text"
                  placeholder="e.g., City of Cape Town Roads Dept"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  required
                  className="bg-input-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenantDomain">
                  Domain (optional)
                </Label>
                <Input
                  id="tenantDomain"
                  type="text"
                  placeholder="e.g., capetown.gov.za"
                  value={tenantDomain}
                  onChange={(e) => setTenantDomain(e.target.value)}
                  className="bg-input-background"
                />
                <p className="text-xs text-muted-foreground">
                  Used for domain-based features in the future
                </p>
              </div>

              <div className="pt-4">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating Organization..." : "Create Organization"}
                </Button>
              </div>

              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground text-center">
                  Need to join an existing organization?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.clear();
                      navigate("/register");
                    }}
                    className="text-primary hover:underline"
                  >
                    Use an invitation code
                  </button>
                </p>
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    toast.info("Redirecting to dashboard...");
                    navigate("/dashboard");
                  }}
                >
                  Already have an organization? Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>

        <p className="text-center text-xs text-gray-400 mt-8">
          © 2024 TAMS360. All rights reserved.
        </p>
      </div>
    </div>
  );
}