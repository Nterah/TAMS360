import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../App";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: ("admin" | "supervisor" | "field_user" | "viewer")[];
  redirectTo?: string;
}

/**
 * RoleGuard - Protects routes based on user roles
 * 
 * Usage:
 * <RoleGuard allowedRoles={["admin", "supervisor"]}>
 *   <AdminPage />
 * </RoleGuard>
 */
export default function RoleGuard({ children, allowedRoles, redirectTo = "/mobile/capture-hub" }: RoleGuardProps) {
  const { user } = useContext(AuthContext);

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Check if user's role is in the allowed roles
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={redirectTo} />;
  }

  return <>{children}</>;
}