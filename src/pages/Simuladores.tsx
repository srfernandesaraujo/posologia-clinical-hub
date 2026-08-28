import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  FlaskConical, Search, Bug, Activity, ClipboardList, Syringe, Lock, Crown, Plus, Share2,
  HeartPulse, PillBottle, Zap, Brain, Heart, Droplets, Beaker, Shield, Flame, TestTube, Dna,
  BookOpen, Scan, Accessibility, ChevronRight, LayoutGrid, List, Database,
} from "lucide-react";
import { NATIVE_SIMULATORS } from "@/data/simulatorCatalog";
import { Input } from "@/components/ui/input";
import { useState, useMemo, useRef, useEffect } from "react";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { UpgradeModal } from "@/components/UpgradeModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateToolDialog } from "@/components/CreateToolDialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Category icon mapping
const CATEGORY_ICONS: Record<string, any> = {
  "Farmácia Clínica": ClipboardList,
  "Infectologia": Bug,
  "Farmacocinética": Activity,
  "Endocrinologia": Syringe,
  "Enfermagem / UTI": HeartPulse,
  "Psiquiatria": PillBottle,
  "Farmacologia Clínica": Zap,
  "Fisiologia Humana": Heart,
  "Bioquímica": FlaskConical,
  "Farmacologia Básica": Brain,
  "Farmacotécnica": Beaker,
  "Química Farmacêutica": TestTube,
  "Formação Docente": BookOpen,
  "Odontologia": Scan,
  "Fisioterapia": Accessibility,
  "Nutrição": ClipboardList,
  "Genética": Dna,
  "Farmacoterapia Laboratorial": TestTube,
  "Informática em Saúde": Database,
};

// Category color accents (HSL-based using design tokens where possible)
const CATEGORY_COLORS: Record<string, string> = {
  "Farmácia Clínica": "168 80% 42%",
  "Infectologia": "0 62% 50%",
  "Farmacocinética": "200 70% 50%",
  "Endocrinologia": "45 90% 50%",
  "Enfermagem / UTI": "340 70% 55%",
  "Psiquiatria": "262 83% 65%",
  "Farmacologia Clínica": "30 90% 55%",
  "Fisiologia Humana": "200 70% 50%",
  "Bioquímica": "150 60% 45%",
  "Farmacologia Básica": "280 60% 55%",
  "Farmacotécnica": "190 70% 45%",
  "Química Farmacêutica": "320 60% 50%",
  "Formação Docente": "45 80% 50%",
  "Odontologia": "168 80% 42%",
  "Fisioterapia": "210 70% 50%",
  "Nutrição": "140 60% 45%",
  "Genética": "260 70% 55%",
  "Farmacoterapia Laboratorial": "15 75% 50%",
  "Informática em Saúde": "220 70% 50%",
};

export default function Simuladores() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { isPremium, canUseSimulator, upgradeOpen, setUpgradeOpen, upgradeFeature, showUpgrade } = useFeatureGating();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { data: tools = [], isLoading } = useQuery({
    queryKey: ["tools", "simulador"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tools")
        .select("*, categories(name, slug)")
        .eq("type", "simulador")
        .eq("is_active", true)
        .is("created_by", null)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: userTools = [] } = useQuery({
    queryKey: ["user-tools", "simulador", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tools")
        .select("*, categories(name, slug)")
        .eq("type", "simulador")
        .eq("is_active", true)
        .eq("created_by", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Build categories with counts
  const categoriesWithCounts = useMemo(() => {
    const catMap = new Map<string, number>();
    NATIVE_SIMULATORS.forEach(s => catMap.set(s.category, (catMap.get(s.category) || 0) + 1));
    tools.forEach((t: any) => {
      if (t.categories?.name) {
        catMap.set(t.categories.name, (catMap.get(t.categories.name) || 0) + 1);
      }
    });
    return Array.from(catMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tools]);

  const totalCount = useMemo(() =>
    categoriesWithCounts.reduce((sum, c) => sum + c.count, 0),
    [categoriesWithCounts]
  );

  const filteredNative = NATIVE_SIMULATORS.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredDynamic = tools.filter((t: any) => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || t.categories?.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredUser = userTools.filter((t: any) => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || t.categories?.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group filtered results by category
  const groupedSimulators = useMemo(() => {
    const groups = new Map<string, Array<{ slug: string; name: string; description: string; icon: any; category: string; isDynamic?: boolean; toolId?: string }>>();

    filteredNative.forEach(s => {
      if (!groups.has(s.category)) groups.set(s.category, []);
      groups.get(s.category)!.push(s);
    });

    filteredDynamic.forEach((t: any) => {
      const cat = t.categories?.name || "Outros";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push({
        slug: t.slug,
        name: t.name,
        description: t.short_description || t.description || "",
        icon: FlaskConical,
        category: cat,
        isDynamic: true,
        toolId: t.id,
      });
    });

    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredNative, filteredDynamic]);

  const handleCreateClick = () => {
    if (!isPremium) {
      showUpgrade("Criação de simuladores personalizados");
      return;
    }
    setCreateOpen(true);
  };

  const toggleMarketplace = async (toolId: string, current: boolean) => {
    const { error } = await supabase
      .from("tools")
      .update({ is_marketplace: !current })
      .eq("id", toolId);
    if (error) {
      toast.error("Erro ao atualizar");
    } else {
      toast.success(!current ? "Publicado no Marketplace!" : "Removido do Marketplace");
      queryClient.invalidateQueries({ queryKey: ["user-tools"] });
    }
  };

  const scrollToCategory = (cat: string) => {
    setSelectedCategory(null);
    setTimeout(() => {
      categoryRefs.current[cat]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const SimCard = ({ sim, isDynamic, isLocked }: { sim: any; isDynamic?: boolean; isLocked?: boolean }) => {
    const Icon = sim.icon;
    const color = CATEGORY_COLORS[sim.category] || "168 80% 42%";

    if (isLocked) {
      return (
        <div
          onClick={() => showUpgrade("Simuladores avançados são exclusivos do plano Premium")}
          className="cursor-pointer group relative rounded-xl border border-border bg-card/50 p-4 opacity-60 hover:opacity-90 transition-all"
        >
          <div className="absolute top-3 right-3">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="flex items-start gap-3">
            <div className="shrink-0 rounded-lg p-2 bg-muted">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-sm leading-tight mb-1 pr-6">{sim.name}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{sim.description}</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <Link
        to={`/simuladores/${sim.slug}`}
        className="group relative block rounded-xl border border-border/50 bg-card p-4 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all hover:-translate-y-0.5"
      >
        <div className="flex items-start gap-3">
          <div
            className="shrink-0 rounded-lg p-2"
            style={{ backgroundColor: `hsl(${color} / 0.12)` }}
          >
            <Icon className="h-4 w-4" style={{ color: `hsl(${color})` }} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-sm leading-tight mb-1 group-hover:text-primary transition-colors">{sim.name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2">{sim.description}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary/60 transition-colors shrink-0 mt-0.5" />
        </div>
      </Link>
    );
  };

  return (
    <div>
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature={upgradeFeature} />
      <CreateToolDialog open={createOpen} onOpenChange={setCreateOpen} type="simulador" />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">{t("simulators.title")}</h1>
            <p className="text-muted-foreground text-sm">
              {totalCount} simuladores em {categoriesWithCounts.length} categorias
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!canUseSimulator && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Lock className="h-3 w-3" />
                Premium
              </Badge>
            )}
            {isPremium && (
              <Badge className="gap-1 bg-primary/10 text-primary border-primary/20 text-xs">
                <Crown className="h-3 w-3" />
                Premium
              </Badge>
            )}
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={cn("p-3 sm:p-2 transition-colors", viewMode === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn("p-3 sm:p-2 transition-colors", viewMode === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <Button onClick={handleCreateClick} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Criar
            </Button>
          </div>
        </div>
      </div>

      {/* Search + Category navigation */}
      <div className="flex gap-6 items-start">
        {/* Left sidebar - category nav (hidden on mobile) */}
        <div className="hidden lg:block w-56 shrink-0 sticky top-4">
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar simulador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <ScrollArea className="h-[calc(100vh-220px)]">
            <nav className="space-y-0.5 pr-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                  !selectedCategory
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <span>Todas</span>
                <span className="text-xs tabular-nums opacity-60">{totalCount}</span>
              </button>
              {categoriesWithCounts.map(({ name, count }) => {
                const CatIcon = CATEGORY_ICONS[name] || FlaskConical;
                return (
                  <button
                    key={name}
                    onClick={() => setSelectedCategory(selectedCategory === name ? null : name)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                      selectedCategory === name
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <CatIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate flex-1 text-left">{name}</span>
                    <span className="text-xs tabular-nums opacity-60 shrink-0">{count}</span>
                  </button>
                );
              })}
            </nav>
          </ScrollArea>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Mobile search */}
          <div className="lg:hidden mb-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar simulador..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* Mobile category filter — dropdown em vez de chips que quebravam
                em várias linhas e empurravam o conteúdo para baixo. */}
            <Select
              value={selectedCategory ?? "all"}
              onValueChange={(v) => setSelectedCategory(v === "all" ? null : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias ({totalCount})</SelectItem>
                {categoriesWithCounts.map(({ name, count }) => (
                  <SelectItem key={name} value={name}>{name} ({count})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* User's simulators */}
          {filteredUser.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-5 w-1 rounded-full bg-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Meus Simuladores</h2>
              </div>
              <div className={cn(
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3"
                  : "space-y-2"
              )}>
                {filteredUser.map((tool: any) => (
                  <div key={tool.id} className="relative">
                    <SimCard sim={{ slug: tool.slug, name: tool.name, description: tool.short_description || tool.description, icon: FlaskConical, category: tool.categories?.name || "" }} />
                    <button
                      onClick={() => toggleMarketplace(tool.id, tool.is_marketplace)}
                      className={cn(
                        "absolute top-2 right-2 p-2.5 rounded-lg transition-colors z-10",
                        tool.is_marketplace ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                      title={tool.is_marketplace ? "Remover do Marketplace" : "Publicar no Marketplace"}
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grouped simulators */}
          {groupedSimulators.map(([cat, sims]) => {
            const CatIcon = CATEGORY_ICONS[cat] || FlaskConical;
            const color = CATEGORY_COLORS[cat] || "168 80% 42%";
            return (
              <div key={cat} className="mb-6" ref={el => { categoryRefs.current[cat] = el; }}>
                <div className="flex items-center gap-2.5 mb-3">
                  <div
                    className="rounded-lg p-1.5"
                    style={{ backgroundColor: `hsl(${color} / 0.12)` }}
                  >
                    <CatIcon className="h-4 w-4" style={{ color: `hsl(${color})` }} />
                  </div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">{cat}</h2>
                  <span className="text-xs text-muted-foreground">({sims.length})</span>
                </div>
                <div className={cn(
                  viewMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3"
                    : "space-y-2"
                )}>
                  {sims.map((sim) => (
                    <SimCard
                      key={sim.slug}
                      sim={sim}
                      isDynamic={sim.isDynamic}
                      isLocked={!canUseSimulator && !sim.isDynamic}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {!isLoading && groupedSimulators.length === 0 && filteredUser.length === 0 && (
            <div className="text-center py-16">
              <FlaskConical className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">
                {search ? "Nenhum simulador encontrado para essa busca." : t("simulators.empty")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
