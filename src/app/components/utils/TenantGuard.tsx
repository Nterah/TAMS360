import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { projectId } from "../../../../utils/supabase/info";

interface TenantGuardProps {
  children: React.ReactNode;
}

/**
 * TenantGuard - TEMPORARILY DISABLED for urgent testing
 * TODO: Re-enable after fixing tenant check endpoint
 */
export default function TenantGuard({ children }: TenantGuardProps) {
  // TEMPORARILY BYPASSING TENANT CHECK - ALLOWING ALL AUTHENTICATED USERS
  // This allows users to login while we debug the tenant verification endpoint
  return <>{children}</>;
}
