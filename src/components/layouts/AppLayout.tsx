import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import {
  Pill, LayoutDashboard, Calculator, FlaskConical, Gamepad2, Dna,
  User, LogOut, Shield, BarChart3, Menu, X, Crown, Store, Trophy, DoorOpen, Lock, FileText, MessageSquare, ScanEye, Rocket, GraduationCap,
  LifeBuoy, Headset, ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Badge } from "@/components/ui/badge";
import { SidebarContactForm } from "@/components/SidebarContactForm";
import { OracleAgent } from "@/components/OracleAgent";
import { useCookieAnalytics } from "@/hooks/useCookieAnalytics";
import { PipelineModal } from "@/components/PipelineModal";
import { useSystemUpdates } from "@/hooks/useSystemUpdates";
import { useSupportTickets } from "@/hooks/useSupportTickets";
import { PremiumGate } from "@/components/PremiumGate";
import { UpgradeModal } from "@/components/UpgradeModal";
import { Card, CardContent } from "@/components/ui/card";

// Route prefixes whose sub-pages are Premium-only. Matched against location.pathname
// so direct/deep-link navigation is gated the same way hub-page card locks already are —
// individual calculator/simulator/lab/medview3d page components don't check anything
// themselves, so this is the only thing stopping a bookmarked or shared URL from
// bypassing the plan gate entirely.
const PREMIUM_ROUTE_PREFIXES = ["/laboratorio-virtual/", "/medview-3d/", "/simuladores/"];
const CALCULATOR_ROUTE_PREFIX = "/calculadoras/";

export function AppLayout() {
  useCookieAnalytics();
  const { signOut, isAdmin, isProfessor } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const {
    isPremium, loading: gatingLoading, canUseCalculator, recordCalculatorUse,
    upgradeOpen, setUpgradeOpen, upgradeFeature,
  } = useFeatureGating();

  const isPremiumRoute = PREMIUM_ROUTE_PREFIXES.some((prefix) => location.pathname.startsWith(prefix));
  const isCalculatorRoute = location.pathname.startsWith(CALCULATOR_ROUTE_PREFIX);

  // Consume one unit of the free daily calculator quota per navigation into a
  // calculator page — covers native calculator routes and the dynamic ToolDetail
  // catch-all alike, regardless of whether the user arrived via the hub's click
  // handler, a deep link, or a page refresh.
  const [calculatorBlocked, setCalculatorBlocked] = useState(false);
  useEffect(() => {
    if (!isCalculatorRoute || gatingLoading) return;
    setCalculatorBlocked(!recordCalculatorUse());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, gatingLoading]);

  const navItems = [
    { label: t("nav.dashboard"), to: "/dashboard", icon: LayoutDashboard },
    { label: t("nav.calculators"), to: "/calculadoras", icon: Calculator },
    { label: t("nav.simulators"), to: "/simuladores", icon: FlaskConical },
    { label: "Laboratório Virtual", to: "/laboratorio-virtual", icon: Dna },
    { label: t("nav.games"), to: "/jogos-clinicos", icon: Gamepad2 },
    { label: "MedView 3D", to: "/medview-3d", icon: ScanEye },
    { label: "Feedback de Simulação", to: "/agente-feedback", icon: MessageSquare },
    { label: t("nav.myAccount"), to: "/minha-conta", icon: User },
    { label: t("nav.plans"), to: "/planos", icon: Crown },
    { label: "Documentação", to: "/documentacao", icon: FileText },
    { label: "Suporte", to: "/suporte", icon: LifeBuoy },
  ];

  const premiumItems = [
    { label: "Turmas", to: "/turmas", icon: GraduationCap, premium: true },
    { label: t("nav.virtualRooms"), to: "/salas-virtuais", icon: DoorOpen, premium: true },
    { label: "Marketplace", to: "/marketplace", icon: Store, premium: true },
    { label: t("nav.gamification"), to: "/gamificacao", icon: Trophy },
  ];

  const { pendingIdeas } = useSystemUpdates();
  const { openCount: openTicketsCount } = useSupportTickets();
  const { data: pendingReviewCount = 0 } = useQuery({
    queryKey: ["marketplace-pending-review-count"],
    enabled: isAdmin,
    queryFn: async () => {
      const { count } = await supabase
        .from("tools")
        .select("id", { count: "exact", head: true })
        .eq("is_marketplace", true)
        .eq("clinically_validated", false);
      return count || 0;
    },
  });

  const adminItems = [
    { label: t("nav.admin"), to: "/admin", icon: Shield },
    { label: "Pipeline", to: "/admin/pipeline", icon: Rocket, badge: pendingIdeas.length > 0 ? pendingIdeas.length : undefined },
    { label: "Chamados", to: "/admin/tickets", icon: Headset, badge: openTicketsCount > 0 ? openTicketsCount : undefined },
    { label: "Curadoria", to: "/admin/marketplace-review", icon: ShieldCheck, badge: pendingReviewCount > 0 ? pendingReviewCount : undefined },
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
        location.pathname.startsWith(item.to) && (item.to !== "/admin" || location.pathname === "/admin")
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      <item.icon className="h-4 w-4" />
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <Badge variant="destructive" className="text-[9px] h-4 min-w-[16px] px-1 justify-center">{item.badge}</Badge>
      )}
      {item.premium && !isPremium && (
        <Lock className="h-3 w-3 text-muted-foreground/50" />
      )}
    </Link>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card p-4 gap-2 sticky top-0 h-screen overflow-hidden">
        <Link to="/dashboard" className="flex items-center gap-2 px-3 py-4 mb-4 shrink-0">
          <Pill className="h-7 w-7 text-primary" />
          <span className="text-lg font-bold text-foreground">Posologia</span>
        </Link>
        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto min-h-0">
          {allItems.map((item) => renderNavItem(item))}
        </nav>
        <SidebarContactForm />
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
          {isPremiumRoute && !isPremium ? (
            <PremiumGate
              title={
                location.pathname.startsWith("/laboratorio-virtual/") ? "Laboratório Virtual"
                : location.pathname.startsWith("/medview-3d/") ? "MedView 3D"
                : "Simuladores"
              }
              feature={
                location.pathname.startsWith("/laboratorio-virtual/") ? "O Laboratório Virtual"
                : location.pathname.startsWith("/medview-3d/") ? "O MedView 3D"
                : "Simuladores interativos"
              }
            >
              <Outlet />
            </PremiumGate>
          ) : isCalculatorRoute && calculatorBlocked ? (
            <div className="max-w-3xl mx-auto">
              <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature={upgradeFeature} />
              <div className="flex items-center gap-3 mb-8">
                <Calculator className="h-7 w-7 text-primary" />
                <h1 className="text-3xl font-bold">Calculadoras</h1>
              </div>
              <Card>
                <CardContent className="py-12 text-center space-y-4">
                  <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Você atingiu o limite diário de calculadoras do plano Gratuito.
                  </p>
                  <Button onClick={() => navigate("/planos")}>Assinar Premium</Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
      <OracleAgent />
      {isAdmin && <PipelineModal />}
    </div>
  );
}
