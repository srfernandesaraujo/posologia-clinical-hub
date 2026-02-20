import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Stethoscope, LayoutDashboard, Calculator, FlaskConical,
  User, LogOut, Shield, BarChart3, Menu, X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Calculadoras", to: "/calculadoras", icon: Calculator },
  { label: "Simuladores", to: "/simuladores", icon: FlaskConical },
  { label: "Minha Conta", to: "/minha-conta", icon: User },
];

const adminItems = [
  { label: "Admin", to: "/admin", icon: Shield },
  { label: "Analytics", to: "/analytics", icon: BarChart3 },
];

export function AppLayout() {
  const { signOut, isAdmin } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const allItems = isAdmin ? [...navItems, ...adminItems] : navItems;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card p-4 gap-2 sticky top-0 h-screen">
        <Link to="/dashboard" className="flex items-center gap-2 px-3 py-4 mb-4">
          <Stethoscope className="h-7 w-7 text-primary" />
          <span className="text-lg font-bold">MedCalc Hub</span>
        </Link>
        <nav className="flex flex-col gap-1 flex-1">
          {allItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                location.pathname.startsWith(item.to)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={signOut}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-col flex-1">
        <header className="md:hidden sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-card px-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-primary" />
            <span className="font-bold">MedCalc Hub</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </header>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 top-14 z-40 bg-background/95 backdrop-blur-sm p-4">
            <nav className="flex flex-col gap-1">
              {allItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                    location.pathname.startsWith(item.to)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
              <button
                onClick={() => { signOut(); setMobileOpen(false); }}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </nav>
          </div>
        )}

        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
