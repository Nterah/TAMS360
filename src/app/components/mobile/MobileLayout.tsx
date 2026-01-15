import { ReactNode, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../App";
import { useTenant } from "../../contexts/TenantContext";
import { 
  Home, 
  Package, 
  ClipboardCheck, 
  Wrench, 
  Map,
  Menu,
  Bell,
  User
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

interface MobileLayoutProps {
  children: ReactNode;
}

export default function MobileLayout({ children }: MobileLayoutProps) {
  const { user, logout } = useContext(AuthContext);
  const { tenantName } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { 
      path: "/mobile/capture-hub", 
      icon: Home, 
      label: "Home" 
    },
    { 
      path: "/mobile/assets", 
      icon: Package, 
      label: "Assets" 
    },
    { 
      path: "/mobile/inspections", 
      icon: ClipboardCheck, 
      label: "Inspect" 
    },
    { 
      path: "/mobile/maintenance", 
      icon: Wrench, 
      label: "Work" 
    },
    { 
      path: "/mobile/map", 
      icon: Map, 
      label: "Map" 
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-16">
      {/* Top App Bar - Only shown on certain pages */}
      {!location.pathname.includes("/field-capture") && (
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b shadow-sm">
          <div className="flex items-center justify-between p-4">
            <div>
              <h1 className="text-sm font-semibold text-slate-900 dark:text-white">
                {tenantName || "TAMS360"}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {user?.name || "Field Inspector"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 relative">
                <Bell className="w-5 h-5" />
                <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                  3
                </Badge>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9 w-9 p-0"
                onClick={() => navigate("/mobile/profile")}
              >
                <User className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="min-h-screen">
        {children}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t shadow-lg z-20">
        <div className="flex items-center justify-around h-16 px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.path);
            
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
                  active 
                    ? "text-primary" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "fill-current" : ""}`} />
                <span className="text-[10px] font-medium">{tab.label}</span>
                {active && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
