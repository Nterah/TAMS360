import { useState, useEffect, useContext } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { AuthContext } from "../../App";
import { AlertCircle, CheckCircle, Mail, UserPlus } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import Logo from "../ui/Logo";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { toast } from "sonner";

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get("code") || searchParams.get("invite") || "";
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [inviteValid, setInviteValid] = useState(false);
  const [inviteDetails, setInviteDetails] = useState<any>(null);
  
  const { user, register, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  useEffect(() => {
    // If user is already logged in, log them out to accept a new invite
    if (user) {
      toast.info("Please log out to accept this invitation");
      logout();
    }
    
    validateInvitation();
  }, [inviteCode]);

  const validateInvitation = async () => {
    if (!inviteCode) {
      setError("No invitation code provided");
      setValidating(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/validate-invite/${inviteCode}`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInviteValid(true);
        setInviteDetails(data.invite);
        
        // Pre-fill email if provided in invitation
        if (data.invite?.email) {
          setFormData(prev => ({ ...prev, email: data.invite.email }));
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Invalid or expired invitation");
      }
    } catch (error) {
      console.error("Error validating invitation:", error);
      setError("Failed to validate invitation");
    } finally {
      setValidating(false);
    }
  };

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

    setLoading(true);

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        inviteCode: inviteCode,
      });

      toast.success("Account created successfully! Please log in.");
      navigate("/login");
    } catch (error: any) {
      setError(error.message || "Registration failed");
      toast.error(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#010D13] via-[#1a2d32] to-[#010D13] flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (!inviteValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#010D13] via-[#1a2d32] to-[#010D13] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <Logo width={160} height={60} />
            </div>
            <p className="text-gray-300">Road & Traffic Asset Management Suite</p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-6 w-6 text-destructive" />
                <CardTitle>Invalid Invitation</CardTitle>
              </div>
              <CardDescription>
                This invitation link is invalid or has expired.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter>
              <Link to="/login" className="w-full">
                <Button variant="outline" className="w-full">
                  Go to Login
                </Button>
              </Link>
            </CardFooter>
          </Card>
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
              <UserPlus className="h-6 w-6 text-primary" />
              <CardTitle>Accept Invitation</CardTitle>
            </div>
            <CardDescription>
              You've been invited to join {inviteDetails?.organizationName || "an organization"} as a{" "}
              {inviteDetails?.role === "admin" ? "Administrator" :
               inviteDetails?.role === "supervisor" ? "Supervisor" :
               inviteDetails?.role === "field_user" ? "Field User" : "User"}
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

              {inviteDetails && (
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Invitation Details:</strong>
                    <br />
                    Role: {inviteDetails.role}
                    <br />
                    {inviteDetails.email && `Email: ${inviteDetails.email}`}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
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
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={!!inviteDetails?.email}
                  className="bg-input-background"
                />
                {inviteDetails?.email && (
                  <p className="text-xs text-muted-foreground">
                    Email is pre-filled from invitation
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
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
                <Label htmlFor="confirmPassword">Confirm Password</Label>
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
                {loading ? "Creating Account..." : "Accept Invitation & Create Account"}
              </Button>

              <p className="text-sm text-center text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-xs text-gray-400 mt-8">
          © 2024 TAMS360. All rights reserved.
        </p>
      </div>
    </div>
  );
}
