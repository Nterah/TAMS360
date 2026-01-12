import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AlertCircle, Building2, Users, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import Logo from "../ui/Logo";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { toast } from "sonner";

export default function TenantRegisterPage() {
  const [formData, setFormData] = useState({
    // Tenant Info
    tenantName: "",
    tenantDomain: "",
    // First Admin User
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.adminPassword !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.adminPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!formData.tenantName.trim()) {
      setError("Organization name is required");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/tenant-signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          tenantName: formData.tenantName,
          tenantDomain: formData.tenantDomain || undefined,
          adminName: formData.adminName,
          adminEmail: formData.adminEmail,
          adminPassword: formData.adminPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Tenant registration failed");
      }

      toast.success("Organization created successfully! You can now log in.");
      navigate("/login");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#010D13] via-[#1a2d32] to-[#010D13] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <Logo width={160} height={60} />
          </div>
          <p className="text-gray-300">Road & Traffic Asset Management Suite</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-6 h-6 text-primary" />
              Create Organization Account
            </CardTitle>
            <CardDescription>
              Start your 30-day free trial. Set up your organization and become the first admin user.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Trial Info Banner */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">
                      30-Day Free Trial
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      Full access to all features. No credit card required. Invite unlimited users.
                    </p>
                  </div>
                </div>
              </div>

              {/* Organization Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Building2 className="w-4 h-4" />
                  Organization Details
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tenantName">Organization Name *</Label>
                  <Input
                    id="tenantName"
                    name="tenantName"
                    type="text"
                    placeholder="City of Cape Town"
                    value={formData.tenantName}
                    onChange={handleChange}
                    required
                    className="bg-input-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tenantDomain">Email Domain (Optional)</Label>
                  <Input
                    id="tenantDomain"
                    name="tenantDomain"
                    type="text"
                    placeholder="capetown.gov.za"
                    value={formData.tenantDomain}
                    onChange={handleChange}
                    className="bg-input-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for organization identification. You can invite users from any domain.
                  </p>
                </div>
              </div>

              {/* First Admin User */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Users className="w-4 h-4" />
                  Your Admin Account
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminName">Full Name *</Label>
                  <Input
                    id="adminName"
                    name="adminName"
                    type="text"
                    placeholder="John Doe"
                    value={formData.adminName}
                    onChange={handleChange}
                    required
                    className="bg-input-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Email *</Label>
                  <Input
                    id="adminEmail"
                    name="adminEmail"
                    type="email"
                    placeholder="john@organization.com"
                    value={formData.adminEmail}
                    onChange={handleChange}
                    required
                    className="bg-input-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminPassword">Password *</Label>
                  <Input
                    id="adminPassword"
                    name="adminPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.adminPassword}
                    onChange={handleChange}
                    required
                    className="bg-input-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="bg-input-background"
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating Organization..." : "Start Free Trial"}
              </Button>

              <p className="text-sm text-center text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Sign in here
                </Link>
              </p>

              <p className="text-xs text-center text-muted-foreground">
                By creating an account, you agree to our Terms of Service and Privacy Policy.
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
