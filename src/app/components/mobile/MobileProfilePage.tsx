import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../App";
import { useTenant } from "../../contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Shield, 
  Building2,
  LogOut,
  Settings,
  ChevronRight
} from "lucide-react";

export default function MobileProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const { tenantName } = useTenant();

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      logout();
      navigate("/login");
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "supervisor":
        return "default";
      case "field_user":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrator";
      case "supervisor":
        return "Supervisor";
      case "field_user":
        return "Field User";
      case "viewer":
        return "Viewer";
      default:
        return role;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Fixed Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-slate-800 border-b shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">Profile</h1>
              <p className="text-xs text-slate-500">Account Settings</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* User Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-10 h-10 text-primary" />
              </div>
              
              {/* Name */}
              <div>
                <h2 className="text-xl font-bold">{user?.name || "User"}</h2>
                <Badge variant={getRoleBadgeColor(user?.role || "viewer")} className="mt-2">
                  {getRoleLabel(user?.role || "viewer")}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Email */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <Mail className="w-5 h-5 text-slate-500" />
              <div className="flex-1">
                <p className="text-xs text-slate-500">Email</p>
                <p className="text-sm font-medium">{user?.email || "Not available"}</p>
              </div>
            </div>

            {/* Organization */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <Building2 className="w-5 h-5 text-slate-500" />
              <div className="flex-1">
                <p className="text-xs text-slate-500">Organization</p>
                <p className="text-sm font-medium">{tenantName || "TAMS360"}</p>
              </div>
            </div>

            {/* Role */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <Shield className="w-5 h-5 text-slate-500" />
              <div className="flex-1">
                <p className="text-xs text-slate-500">Role</p>
                <p className="text-sm font-medium">{getRoleLabel(user?.role || "viewer")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Preferences (Future) */}
            <button
              className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
              onClick={() => {
                // Future: Navigate to preferences
              }}
            >
              <Settings className="w-5 h-5 text-slate-500" />
              <span className="flex-1 text-left text-sm font-medium">Preferences</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* Logout */}
            <button
              className="w-full flex items-center gap-3 p-3 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-red-600"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
              <span className="flex-1 text-left text-sm font-medium">Logout</span>
            </button>
          </CardContent>
        </Card>

        {/* App Info */}
        <div className="text-center text-xs text-slate-500 pt-4">
          <p>TAMS360 Mobile App</p>
          <p className="mt-1">Version 1.0.0</p>
        </div>
      </div>
    </div>
  );
}
