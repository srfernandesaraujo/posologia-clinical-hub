import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import {
  Pill, LayoutDashboard, Calculator, FlaskConical,
  User, LogOut, Shield, BarChart3, Menu, X, Crown, Store, Trophy, DoorOpen, Lock,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Badge } from "@/components/ui/badge";

export function AppLayout() {
  const { signOut, isAdmin, isProfessor } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isPremium } = useFeatureGating();

  const navItems = [
    { label: t("nav.dashboard"), to: "/dashboard", icon: LayoutDashboard },
    { label: t("nav.calculators"), to: "/calculadoras", icon: Calculator },
    { label: t("nav.simulators"), to: "/simuladores", icon: FlaskConical },
    { label: t("nav.myAccount"), to: "/minha-conta", icon: User },
    { label: t("nav.plans"), to: "/planos", icon: Crown },
  ];

  const premiumItems = [
    { label: t("nav.virtualRooms"), to: "/salas-virtuais", icon: DoorOpen, premium: true },
    { label: t("nav.analytics"), to: "/analytics", icon: BarChart3, premium: true },
    { label: "Marketplace", to: "/marketplace", icon: Store, premium: true },
    { label: t("nav.gamification"), to: "/gamificacao", icon: Trophy },
  ];

  const adminItems = [
    { label: t("nav.admin"), to: "/admin", icon: Shield },
  ];

  const allItems = [
    ...navItems,
    ...premiumItems,
    ...(isAdmin ? adminItems : []),
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const renderNavItem = (item: any, onClick?: () => void) => (
    <Link
      key={item.to}
      to={item.to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        location.pathname.startsWith(item.to)
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      <item.icon className="h-4 w-4" />
      <span className="flex-1">{item.label}</span>
      {item.premium && !isPremium && (
        <Lock className="h-3 w-3 text-muted-foreground/50" />
      )}
    </Link>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card p-4 gap-2 sticky top-0 h-screen">
        <Link to="/dashboard" className="flex items-center gap-2 px-3 py-4 mb-4">
          <Pill className="h-7 w-7 text-primary" />
          <span className="text-lg font-bold text-foreground">Posologia</span>
        </Link>
        <nav className="flex flex-col gap-1 flex-1">
          {allItems.map((item) => renderNavItem(item))}
        </nav>
        <div className="border-t border-border pt-3 mt-2 space-y-2">
          <LanguageSwitcher className="px-3" />
          <p className="px-3 text-[10px] text-muted-foreground/50">Posologia Produções</p>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full"
          >
            <LogOut className="h-4 w-4" />
            {t("nav.logout")}
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-col flex-1">
        <header className="md:hidden sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-card px-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Pill className="h-6 w-6 text-primary" />
            <span className="font-bold text-foreground">Posologia</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </header>

        {mobileOpen && (
          <div className="md:hidden fixed inset-0 top-14 z-40 bg-background/95 backdrop-blur-sm p-4">
            <nav className="flex flex-col gap-1">
              {allItems.map((item) => renderNavItem(item, () => setMobileOpen(false)))}
              <button
                onClick={() => { handleSignOut(); setMobileOpen(false); }}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-destructive"
              >
                <LogOut className="h-4 w-4" />
                {t("nav.logout")}
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
