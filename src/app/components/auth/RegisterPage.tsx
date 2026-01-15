import { useState, useContext, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { AuthContext } from "../../App";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import Logo from "../ui/Logo";

// Registration Page - Fixed hooks issue
export default function RegisterPage() {
  console.log("RegisterPage component rendering...");
  
  // Hooks MUST be at the top level - not in try-catch!
  const [searchParams] = useSearchParams();
  const inviteCodeFromUrl = searchParams.get("invite") || "";
  console.log("Invite code from URL:", inviteCodeFromUrl);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    inviteCode: inviteCodeFromUrl,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();

  console.log("Auth context:", authContext);

  // Update invite code when URL changes
  useEffect(() => {
    console.log("RegisterPage loaded with invite code:", inviteCodeFromUrl);
    if (inviteCodeFromUrl) {
      setFormData(prev => ({ ...prev, inviteCode: inviteCodeFromUrl }));
    }
  }, [inviteCodeFromUrl]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!formData.inviteCode) {
      setError("Invitation code is required");
      return;
    }

    setLoading(true);

    try {
      const result = await authContext.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        inviteCode: formData.inviteCode,
      });
      
      // If first user, redirect to login. Otherwise go to pending approval page
      if (result?.isFirstUser) {
        navigate("/login");
      } else {
        navigate("/pending-approval");
      }
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

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
            <CardTitle>Create Account</CardTitle>
            <CardDescription>
              {inviteCodeFromUrl 
                ? "Complete your registration using the invitation code provided."
                : "Register for access to TAMS360. Your account will be reviewed by an administrator."
              }
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {inviteCodeFromUrl && (
                <Alert className="bg-primary/10 border-primary">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-primary">
                    Invitation code detected and auto-filled!
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="bg-input-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="bg-input-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inviteCode">Invite Code</Label>
                <Input
                  id="inviteCode"
                  name="inviteCode"
                  type="text"
                  placeholder="Your Invite Code"
                  value={formData.inviteCode}
                  onChange={handleChange}
                  className="bg-input-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
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
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating Account..." : "Create Account"}
              </Button>

              <p className="text-sm text-center text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Sign in here
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}