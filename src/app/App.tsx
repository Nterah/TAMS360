import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import React from "react";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { OfflineProvider } from "./components/offline/OfflineContext";

// Auth Pages
import LoginPage from "./components/auth/LoginPage";
import RegisterPage from "./components/auth/RegisterPage";
import TenantRegisterPage from "./components/auth/TenantRegisterPage";
import PendingApprovalPage from "./components/auth/PendingApprovalPage";
import SplashScreen from "./components/auth/SplashScreen";

// Main App Pages
import DashboardPage from "./components/dashboard/DashboardPage";
import GISMapPage from "./components/map/GISMapPage";
import AssetsPage from "./components/assets/AssetsPage";
import AssetDetailPage from "./components/assets/AssetDetailPage";
import AssetInventoryLogPage from "./components/assets/AssetInventoryLogPage";
import InspectionsPage from "./components/inspections/InspectionsPage";
import NewInspectionPage from "./components/inspections/NewInspectionPage";
import InspectionDetailPage from "./components/inspections/InspectionDetailPage";
import EditInspectionPage from "./components/inspections/EditInspectionPage";
import MaintenancePage from "./components/maintenance/MaintenancePage";
import NewMaintenancePage from "./components/maintenance/NewMaintenancePage";
import ReportsPage from "./components/reports/ReportsPage";
import AdminConsolePage from "./components/admin/AdminConsolePage";
import SystemHealthPage from "./components/admin/SystemHealthPage";
import ComponentTemplatesPage from "./components/admin/ComponentTemplatesPage"; // Inspection Templates
import TenantSettingsPage from "./components/admin/TenantSettingsPage";
import UserInvitationsPage from "./components/admin/UserInvitationsPage";
import BulkAssetAssignmentPage from "./components/admin/BulkAssetAssignmentPage";
import MobileCaptureHub from "./components/mobile/MobileCaptureHub";

// Layout
import AppLayout from "./components/layout/AppLayout";
import PWAInstallPrompt from "./components/pwa/PWAInstallPrompt";

// Types
export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  organization?: string;
  role: "admin" | "supervisor" | "field_user" | "viewer";
  tier: string;
  status: "approved" | "pending" | "denied";
}

// Auth Context
interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: any) => Promise<void>;
}

export const AuthContext = React.createContext<AuthContextType>({
  user: null,
  accessToken: null,
  login: async () => {},
  logout: () => {},
  register: async () => {},
});

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  // Check for existing session on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("tams360_token");
    const storedUser = localStorage.getItem("tams360_user");

    if (storedToken && storedUser) {
      // Validate the stored token
      validateStoredToken(storedToken, storedUser);
    } else {
      setLoading(false);
    }
  }, []);

  const validateStoredToken = async (token: string, userJson: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/session`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAccessToken(token);
        setUser(data.user);
      } else {
        // Token is invalid or expired, clear it
        console.log("Stored token is invalid, clearing session");
        localStorage.removeItem("tams360_token");
        localStorage.removeItem("tams360_user");
      }
    } catch (error) {
      console.error("Error validating token:", error);
      localStorage.removeItem("tams360_token");
      localStorage.removeItem("tams360_user");
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.status === "pending") {
          throw new Error("pending");
        }
        throw new Error(data.error || "Login failed");
      }

      setAccessToken(data.accessToken);
      setUser(data.user);

      localStorage.setItem("tams360_token", data.accessToken);
      localStorage.setItem("tams360_user", JSON.stringify(data.user));

      toast.success("Login successful!");
    } catch (error: any) {
      if (error.message === "pending") {
        throw error;
      }
      toast.error(error.message || "Login failed");
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem("tams360_token");
    localStorage.removeItem("tams360_user");
    toast.success("Logged out successfully");
  };

  const register = async (data: any) => {
    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Registration failed");
      }

      // Show different message for first user
      if (result.isFirstUser) {
        toast.success("Welcome! You are the first admin. You can now log in!");
      } else {
        toast.success("Registration submitted! Awaiting admin approval.");
      }

      return result;
    } catch (error: any) {
      toast.error(error.message || "Registration failed");
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#010D13] via-[#1a2d32] to-[#010D13]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#39AEDF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Loading TAMS360...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, accessToken, login, logout, register }}>
      <OfflineProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route
              path="/login"
              element={user ? <Navigate to="/dashboard" /> : <LoginPage />}
            />
            <Route
              path="/register"
              element={user ? <Navigate to="/dashboard" /> : <RegisterPage />}
            />
            <Route
              path="/tenant-register"
              element={user ? <Navigate to="/dashboard" /> : <TenantRegisterPage />}
            />
            <Route path="/pending-approval" element={<PendingApprovalPage />} />
            <Route
              path="/"
              element={user ? <Navigate to="/dashboard" /> : <SplashScreen />}
            />

            {/* Protected Routes */}
            <Route
              path="/*"
              element={
                user ? (
                  <AppLayout>
                    <Routes>
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/map" element={<GISMapPage />} />
                      <Route path="/assets" element={<AssetsPage />} />
                      <Route
                        path="/assets/inventory-log"
                        element={<AssetInventoryLogPage />}
                      />
                      <Route path="/assets/:assetId" element={<AssetDetailPage />} />
                      <Route path="/inspections" element={<InspectionsPage />} />
                      <Route path="/inspections/new" element={<NewInspectionPage />} />
                      <Route path="/inspections/:id" element={<InspectionDetailPage />} />
                      <Route path="/inspections/:id/edit" element={<EditInspectionPage />} />
                      <Route path="/maintenance" element={<MaintenancePage />} />
                      <Route path="/maintenance/new" element={<NewMaintenancePage />} />
                      <Route path="/reports" element={<ReportsPage />} />
                      <Route path="/admin" element={<AdminConsolePage />} />
                      <Route path="/admin/system-health" element={<SystemHealthPage />} />
                      <Route path="/admin/component-templates" element={<ComponentTemplatesPage />} />
                      <Route path="/admin/tenant-settings" element={<TenantSettingsPage />} />
                      <Route path="/admin/user-invitations" element={<UserInvitationsPage />} />
                      <Route path="/admin/bulk-asset-assignment" element={<BulkAssetAssignmentPage />} />
                      <Route path="/mobile/capture-hub" element={<MobileCaptureHub />} />
                      <Route path="*" element={<Navigate to="/dashboard" />} />
                    </Routes>
                  </AppLayout>
                ) : (
                  <Navigate to="/" />
                )
              }
            />
          </Routes>
        </BrowserRouter>

        <Toaster richColors position="top-right" />
        <PWAInstallPrompt />
      </OfflineProvider>
    </AuthContext.Provider>
  );
}

export default App;