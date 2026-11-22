import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import {
  Pill, LayoutDashboard, Calculator, FlaskConical, LogOut, Menu, X, Lock, Search,
  ChevronDown, ChevronRight, ChevronsUpDown, Globe, Check,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { OracleAgent } from "@/components/OracleAgent";
import { useCookieAnalytics } from "@/hooks/useCookieAnalytics";
import { PipelineModal } from "@/components/PipelineModal";
import { useSystemUpdates } from "@/hooks/useSystemUpdates";
import { useSupportTickets } from "@/hooks/useSupportTickets";
import { PremiumGate } from "@/components/PremiumGate";
import { UpgradeModal } from "@/components/UpgradeModal";
import { Card, CardContent } from "@/components/ui/card";
import { CommandPalette } from "@/components/CommandPalette";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NAV_GROUPS, ADMIN_GROUP, ACCOUNT_ITEMS, isNavItemActive, getBreadcrumb,
  type NavGroup, type NavGroupId, type NavItem,
} from "@/components/layouts/appNavigation";

// Route prefixes whose sub-pages are Premium-only. Matched against location.pathname
// so direct/deep-link navigation is gated the same way hub-page card locks already are —
// individual calculator/simulator/lab/medview3d page components don't check anything
// themselves, so this is the only thing stopping a bookmarked or shared URL from
// bypassing the plan gate entirely.
const PREMIUM_ROUTE_PREFIXES = ["/laboratorio-virtual/", "/medview-3d/", "/simuladores/"];
const CALCULATOR_ROUTE_PREFIX = "/calculadoras/";

const COLLAPSED_GROUPS_KEY = "posologia_nav_collapsed_v1";
const LANGUAGES = [
  { code: "pt", label: "Português" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
];

function readCollapsed(): Partial<Record<NavGroupId, boolean>> | null {
  try {
    const raw = localStorage.getItem(COLLAPSED_GROUPS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-lg border border-primary/25 bg-primary/10 shadow-[0_0_18px_hsl(var(--primary)/0.18)]">
        <Pill className="h-4 w-4 text-primary" />
      </span>
      <span className="leading-none">
        <span className="block font-display text-[15px] font-semibold tracking-tight text-foreground">Posologia</span>
        {!compact && <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Clinical Hub</span>}
      </span>
    </span>
  );
}

export function AppLayout() {
  useCookieAnalytics();
  const { user, signOut, isAdmin, isProfessor } = useAuth();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const {
    isPremium, loading: gatingLoading, recordCalculatorUse,
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

  // Fecha a gaveta do celular ao trocar de página
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Ctrl+K / Cmd+K abre a busca universal de qualquer tela
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  const adminBadges: Record<string, number> = {
    "/admin/pipeline": pendingIdeas.length,
    "/admin/tickets": openTicketsCount,
    "/admin/marketplace-review": pendingReviewCount,
  };
  const adminPending = Object.values(adminBadges).reduce((sum, n) => sum + (n || 0), 0);

  const groups: NavGroup[] = useMemo(() => (isAdmin ? [...NAV_GROUPS, ADMIN_GROUP] : NAV_GROUPS), [isAdmin]);

  // Grupos recolhíveis. Padrão: "Ensinar" aberto só para professor/admin,
  // "Administração" recolhido. A escolha do usuário fica salva no navegador.
  const [collapsed, setCollapsed] = useState<Partial<Record<NavGroupId, boolean>>>(() => readCollapsed() ?? {});
  const isGroupCollapsed = (id: NavGroupId) => {
    const group = groups.find((g) => g.id === id);
    if (group?.items.some((item) => isNavItemActive(item, location.pathname))) return false;
    if (collapsed[id] !== undefined) return !!collapsed[id];
    if (id === "ensinar") return !(isProfessor || isAdmin);
    if (id === "admin") return true;
    return false;
  };
  const toggleGroup = (id: NavGroupId) => {
    const next = { ...collapsed, [id]: !isGroupCollapsed(id) };
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify(next));
    } catch {
      /* sem armazenamento: o estado vale só para esta visita */
    }
  };

  const breadcrumb = getBreadcrumb(location.pathname, groups);
  const fullName: string = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Minha conta";
  const initials = fullName.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "P";
  const label = (item: NavItem) => (item.labelKey ? t(item.labelKey, { defaultValue: item.label }) : item.label);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const renderNavItem = (item: NavItem) => {
    const active = isNavItemActive(item, location.pathname);
    const badge = adminBadges[item.to];
    return (
      <Link
        key={item.to}
        to={item.to}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors min-h-[38px]",
          active
            ? "bg-primary/10 text-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
        )}
      >
        {active && <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-primary" aria-hidden />}
        <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
        <span className="flex-1 truncate">{label(item)}</span>
        {!!badge && (
          <span className="rounded-full bg-destructive/15 px-1.5 text-[10px] font-semibold tabular-nums text-destructive">{badge}</span>
        )}
        {item.count !== undefined && !badge && (
          <span className="text-[11px] tabular-nums text-muted-foreground/70">{item.count}</span>
        )}
        {item.premium && !isPremium && <Lock className="h-3 w-3 text-muted-foreground/60" aria-label="Premium" />}
      </Link>
    );
  };

  const renderGroups = () => (
    <div className="flex flex-col gap-4">
      {groups.map((group) => {
        const isCollapsible = group.id === "ensinar" || group.id === "admin";
        const isCollapsed = isCollapsible && isGroupCollapsed(group.id);
        return (
          <div key={group.id} className="flex flex-col gap-0.5">
            {group.id !== "inicio" && (
              isCollapsible ? (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={!isCollapsed}
                  className="flex items-center gap-1.5 px-3 pb-1 text-left text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80 hover:text-foreground"
                >
                  <span className="flex-1">{group.label}</span>
                  {group.id === "admin" && adminPending > 0 && isCollapsed && (
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive" aria-label={`${adminPending} pendências`} />
                  )}
                  {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              ) : (
                <span className="px-3 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">{group.label}</span>
              )
            )}
            {!isCollapsed && group.items.map(renderNavItem)}
          </div>
        );
      })}
    </div>
  );

  const searchButton = (className?: string) => (
    <button
      type="button"
      onClick={() => setPaletteOpen(true)}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg border border-border bg-background/40 px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground",
        className,
      )}
    >
      <Search className="h-4 w-4" />
      <span className="flex-1 text-left">Buscar…</span>
      <kbd className="rounded border border-border px-1.5 font-mono text-[10px]">Ctrl K</kbd>
    </button>
  );

  const accountMenu = (side: "top" | "bottom", trigger: React.ReactNode) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent side={side} align={side === "top" ? "start" : "end"} className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-sm font-semibold">{fullName}</span>
          <span className="block truncate text-xs text-muted-foreground">{user?.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ACCOUNT_ITEMS.map((item) => (
          <DropdownMenuItem key={item.to} onSelect={() => navigate(item.to)} className="gap-2.5">
            <item.icon className="h-4 w-4 text-muted-foreground" />
            {label(item)}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2.5">
            <Globe className="h-4 w-4 text-muted-foreground" />
            Idioma
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {LANGUAGES.map((lang) => (
              <DropdownMenuItem key={lang.code} onSelect={() => i18n.changeLanguage(lang.code)} className="gap-2.5">
                <Check className={cn("h-4 w-4", i18n.language?.startsWith(lang.code) ? "text-primary" : "opacity-0")} />
                {lang.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleSignOut} className="gap-2.5 text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" />
          {t("nav.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const avatar = (size = "h-8 w-8") => (
    <span className={cn("grid shrink-0 place-items-center rounded-full bg-gradient-primary text-[11px] font-bold text-primary-foreground", size)}>
      {initials}
    </span>
  );

  // Barra inferior do celular: os destinos mais usados + Buscar ao centro + Mais.
  const bottomNavItems = [
    { label: "Início", to: "/dashboard", icon: LayoutDashboard },
    { label: t("nav.simulators"), to: "/simuladores", icon: FlaskConical },
    { label: t("nav.calculators"), to: "/calculadoras", icon: Calculator },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Barra lateral (desktop) */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar sticky top-0 h-screen">
        <div className="px-4 pt-5 pb-4">
          <Link to="/dashboard" aria-label="Posologia — Painel">
            <BrandMark />
          </Link>
        </div>
        <div className="px-3 pb-4">{searchButton()}</div>
        <nav className="flex-1 overflow-y-auto min-h-0 px-3 pb-4" aria-label="Navegação principal">
          {renderGroups()}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          {accountMenu(
            "top",
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-sidebar-accent"
            >
              {avatar()}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">{fullName}</span>
                <span className={cn("block text-[11px]", isPremium ? "text-primary" : "text-muted-foreground")}>
                  {isPremium ? "Plano Premium" : "Plano Gratuito"}
                </span>
              </span>
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
            </button>,
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Cabeçalho (celular) */}
        <header className="md:hidden sticky top-0 z-50 flex h-14 items-center justify-between gap-2 border-b border-border bg-background/90 px-4 backdrop-blur-xl pt-safe">
          <Link to="/dashboard" aria-label="Posologia — Painel">
            <BrandMark compact />
          </Link>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setPaletteOpen(true)} aria-label="Buscar">
              <Search className="h-5 w-5" />
            </Button>
            {accountMenu("bottom", <button type="button" aria-label="Conta" className="p-1">{avatar("h-8 w-8")}</button>)}
          </div>
        </header>

        {/* Trilha de navegação (desktop) */}
        {breadcrumb && breadcrumb.section.to !== "/dashboard" && (
          <div className="hidden md:flex h-12 shrink-0 items-center border-b border-border/60 px-8">
            <nav aria-label="Você está em" className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-muted-foreground">
              <span>{breadcrumb.group}</span>
              <ChevronRight className="h-3.5 w-3.5 opacity-50" />
              {breadcrumb.leaf ? (
                <>
                  <Link to={breadcrumb.section.to} className="hover:text-foreground">{label(breadcrumb.section)}</Link>
                  <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                  <span className="truncate font-medium text-foreground">{breadcrumb.leaf}</span>
                </>
              ) : (
                <span className="font-medium text-foreground">{label(breadcrumb.section)}</span>
              )}
            </nav>
          </div>
        )}

        {/* Gaveta "Mais" (celular) */}
        {mobileOpen && (
          <div
            className="md:hidden fixed inset-x-0 top-14 z-40 overflow-y-auto bg-background/98 p-4 backdrop-blur-sm"
            style={{ bottom: "calc(4rem + env(safe-area-inset-bottom))" }}
          >
            <nav aria-label="Navegação principal">{renderGroups()}</nav>
            <div className="mt-6 border-t border-border pt-4 flex flex-col gap-0.5">
              {ACCOUNT_ITEMS.map(renderNavItem)}
              <button
                onClick={handleSignOut}
                className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive"
              >
                <LogOut className="h-4 w-4" />
                {t("nav.logout")}
              </button>
            </div>
          </div>
        )}

        {/* Barra inferior (celular) */}
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 z-50 flex items-stretch border-t border-border bg-background/92 backdrop-blur-xl pb-safe"
          aria-label="Atalhos"
        >
          {bottomNavItems.slice(0, 2).map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[56px] py-2 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="max-w-full truncate px-0.5">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[56px] py-2 text-[10px] font-medium text-muted-foreground"
          >
            <span className="grid h-9 w-9 -mt-1 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.35)]">
              <Search className="h-4 w-4" />
            </span>
            <span>Buscar</span>
          </button>
          {bottomNavItems.slice(2).map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[56px] py-2 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="max-w-full truncate px-0.5">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[56px] py-2 text-[10px] font-medium transition-colors",
              mobileOpen ? "text-primary" : "text-muted-foreground",
            )}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span>Mais</span>
          </button>
        </nav>

        <main className="flex-1 p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:p-8">
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
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} groups={groups} isPremium={isPremium} />
      <OracleAgent />
      {isAdmin && <PipelineModal />}
    </div>
  );
}
