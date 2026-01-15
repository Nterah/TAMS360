import { useContext, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../../App";
import { Button } from "../ui/button";
import {
  LayoutDashboard,
  Map,
  Database,
  ClipboardCheck,
  Wrench,
  Settings,
  LogOut,
  Menu,
  X,
  FolderOpen,
  FileBarChart,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "../ui/sheet";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import Logo from "../ui/Logo";
import OfflineBanner from "../offline/OfflineBanner";
import SyncStatusBadge from "../offline/SyncStatusBadge";
import TenantBanner from "./TenantBanner";

const navigation = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard, roles: ["admin", "supervisor", "field_user", "viewer"] },
  { name: "GIS Map", path: "/map", icon: Map, roles: ["admin", "supervisor", "field_user", "viewer"] },
  { name: "Assets", path: "/assets", icon: Database, roles: ["admin", "supervisor", "field_user"] },
  { name: "Inspections", path: "/inspections", icon: ClipboardCheck, roles: ["admin", "supervisor", "field_user"] },
  { name: "Maintenance", path: "/maintenance", icon: Wrench, roles: ["admin", "supervisor", "field_user"] },
  { name: "Reports", path: "/reports", icon: FileBarChart, roles: ["admin", "supervisor", "viewer"] },
  { name: "Data Management", path: "/data", icon: FolderOpen, roles: ["admin", "supervisor", "field_user"] },
  { name: "Admin Console", path: "/admin", icon: Settings, roles: ["admin"] },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(user?.role || "viewer")
  );

  const NavLinks = () => (
    <>
      {filteredNavigation.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent"
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col bg-sidebar border-r border-sidebar-border">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border">
            <Logo width={48} height={48} />
            <div>
              <h1 className="text-lg font-bold text-sidebar-foreground">TAMS360</h1>
              <p className="text-xs text-sidebar-foreground/70">Road & Traffic Asset Management Suite</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            <NavLinks />
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="mb-3">
              <SyncStatusBadge />
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
                <p className="text-xs text-sidebar-foreground/70 truncate capitalize">{user?.role.replace("_", " ")}</p>
              </div>
            </div>
            <Button
              onClick={logout}
              variant="ghost"
              className="w-full mt-2 text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="md:pl-64">
        {/* Tenant Banner */}
        <TenantBanner />
        
        {/* Offline Banner */}
        <OfflineBanner />
        
        {/* Mobile Header */}
        <header className="sticky top-0 z-40 flex items-center gap-4 px-4 py-3 bg-card border-b md:hidden">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-sidebar">
              <VisuallyHidden.Root>
                <SheetTitle>Navigation Menu</SheetTitle>
                <SheetDescription>
                  Access different sections of TAMS360 application
                </SheetDescription>
              </VisuallyHidden.Root>
              <div className="flex flex-col h-full">
                {/* Logo */}
                <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border">
                  <Logo width={40} height={40} />
                  <div>
                    <h1 className="text-lg font-bold text-sidebar-foreground">TAMS360</h1>
                    <p className="text-xs text-sidebar-foreground/70">Road & Traffic Asset Management Suite</p>
                  </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                  <NavLinks />
                </nav>

                {/* User Section */}
                <div className="p-4 border-t border-sidebar-border">
                  <div className="mb-3">
                    <SyncStatusBadge />
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      {user?.name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
                      <p className="text-xs text-sidebar-foreground/70 truncate capitalize">{user?.role.replace("_", " ")}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    variant="ghost"
                    className="w-full mt-2 text-sidebar-foreground hover:bg-sidebar-accent"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-3 flex-1">
            <Logo width={32} height={32} />
            <h1 className="text-lg font-bold">TAMS360</h1>
          </div>
          <SyncStatusBadge />
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}