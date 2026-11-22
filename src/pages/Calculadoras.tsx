import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Calculator, Search, Heart, Pill, Syringe, Beaker, Brain, Activity, ShieldAlert, Crown, Plus,
  Lock, Share2, Droplets, Bone, HeartPulse, Thermometer, FlaskConical, Baby, Flame, Zap, Moon,
  Utensils, Dna, ChevronRight, LayoutGrid, List, Stethoscope,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useMemo, useRef } from "react";
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
import { NATIVE_CALCULATORS } from "@/data/calculatorCatalog";


const NATIVE_SLUGS = new Set([
  "risco-cardiovascular", "desmame-corticoide", "equivalencia-opioides",
  "ajuste-dose-renal", "equivalencia-antidepressivos", "homa-ir", "findrisc",
  "ckd-epi", "correcao-sodio", "correcao-calcio", "wells-score", "qsofa",
  "vancomicina-auc", "insulina-basal-bolus", "holliday-segar", "meld-score",
  "qtc-corrigido", "dose-pediatrica", "rass-sedacao", "nutricao-parenteral", "interacoes-cyp",
  "adesao-oncologia", "toxicidade-antineoplasicos", "ajuste-dose-oncologico",
  "curvas-crescimento-oms", "bilirrubina-neonatal", "schwartz-pediatrico", "pews", "drogas-vasoativas-pediatricas",
  "idade-gestacional", "ganho-peso-gestacional", "risco-pre-eclampsia", "bishop-score", "sulfato-magnesio",
  "calculadora-de-risco-cardiovascular", "calculadora-de-desmame-de-corticoide",
  "calculadora-de-equivalencia-de-opioides", "calculadora-de-ajuste-de-dose-renal",
  "calculadora-de-equivalencia-de-antidepressivos", "calculadora-de-resistencia-insulinica-homa-ir",
  "calculadora-de-risco-de-diabetes-tipo-2-findrisc",
]);

const CATEGORY_ICONS: Record<string, any> = {
  "Cardiologia": Heart,
  "Endocrinologia": Syringe,
  "Dor / Cuidados Paliativos": Pill,
  "Nefrologia": Beaker,
  "Psiquiatria": Brain,
  "Emergência / Medicina Interna": Thermometer,
  "Farmacologia Clínica": FlaskConical,
  "Pediatria": Baby,
  "Hepatologia": Flame,
  "Terapia Intensiva": HeartPulse,
  "Oncologia": ShieldAlert,
  "Ginecologia e Obstetrícia": Stethoscope,
};

const CATEGORY_COLORS: Record<string, string> = {
  "Cardiologia": "0 62% 50%",
  "Endocrinologia": "45 90% 50%",
  "Dor / Cuidados Paliativos": "255 92% 76%",
  "Nefrologia": "200 70% 50%",
  "Psiquiatria": "280 60% 55%",
  "Emergência / Medicina Interna": "30 90% 55%",
  "Farmacologia Clínica": "173 66% 50%",
  "Pediatria": "340 70% 55%",
  "Hepatologia": "15 80% 50%",
  "Terapia Intensiva": "190 70% 45%",
  "Oncologia": "300 60% 50%",
  "Ginecologia e Obstetrícia": "330 65% 55%",
};

export default function Calculadoras() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isPremium, upgradeOpen, setUpgradeOpen, upgradeFeature, canUseCalculator, remainingCalculators, showUpgrade } = useFeatureGating();
  const [createOpen, setCreateOpen] = useState(false);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { data: tools = [], isLoading } = useQuery({
    queryKey: ["tools", "calculadora"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tools")
        .select("*, categories(name, slug)")
        .eq("type", "calculadora")
        .eq("is_active", true)
        .is("created_by", null)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: userTools = [] } = useQuery({
    queryKey: ["user-tools", "calculadora", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tools")
        .select("*, categories(name, slug)")
        .eq("type", "calculadora")
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
    NATIVE_CALCULATORS.forEach(c => catMap.set(c.category, (catMap.get(c.category) || 0) + 1));
    tools.forEach((t: any) => {
      if (t.categories?.name && !NATIVE_SLUGS.has(t.slug)) {
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

  const filteredNative = NATIVE_CALCULATORS.filter(c => {
    const matchesSearch = !search || c.searchKey.includes(search.toLowerCase()) || c.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || c.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredDynamic = tools.filter((t: any) => {
    if (NATIVE_SLUGS.has(t.slug)) return false;
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
  const groupedCalcs = useMemo(() => {
    const groups = new Map<string, Array<{ name: string; description: string; icon: any; category: string; path: string; isDynamic?: boolean; toolId?: string }>>();

    filteredNative.forEach(c => {
      if (!groups.has(c.category)) groups.set(c.category, []);
      groups.get(c.category)!.push(c);
    });

    filteredDynamic.forEach((t: any) => {
      const cat = t.categories?.name || "Outros";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push({
        name: t.name,
        description: t.short_description || t.description || "",
        icon: Calculator,
        category: cat,
        path: `/calculadoras/${t.slug}`,
        isDynamic: true,
        toolId: t.id,
      });
    });

    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredNative, filteredDynamic]);

  const handleCalcClick = (e: React.MouseEvent, path: string) => {
    // Only a pre-flight check for immediate UX feedback here — AppLayout is the
    // sole place that actually records usage, so this also covers deep links.
    if (canUseCalculator()) {
      navigate(path);
    } else {
      e.preventDefault();
      showUpgrade(`Você atingiu o limite de calculadoras por dia`);
    }
  };

  const handleCreateClick = () => {
    if (!isPremium) {
      showUpgrade("Criação de calculadoras personalizadas");
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
      toast.success(!current ? "Publicada no Marketplace!" : "Removida do Marketplace");
      queryClient.invalidateQueries({ queryKey: ["user-tools"] });
      // Dispara a auditoria clínica de IA em segundo plano só ao publicar —
      // não trava a UI, o resultado aparece depois em /admin/marketplace-review.
      if (!current) {
        supabase.functions.invoke("audit-marketplace-tool", { body: { toolId } })
          .catch((err) => console.error("Error triggering clinical audit:", err));
      }
    }
  };

  const remaining = remainingCalculators();

  const CalcCard = ({ calc, isLocked }: { calc: any; isLocked?: boolean }) => {
    const Icon = calc.icon || Calculator;
    const color = CATEGORY_COLORS[calc.category] || "173 66% 50%";

    if (isLocked) {
      return (
        <div
          onClick={() => showUpgrade("Calculadoras são limitadas no plano gratuito")}
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
              <h3 className="font-medium text-sm leading-tight mb-1 pr-6">{calc.name}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{calc.description}</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        onClick={(e) => handleCalcClick(e, calc.path)}
        className="cursor-pointer group relative rounded-xl border border-border/50 bg-card p-4 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all hover:-translate-y-0.5"
      >
        <div className="flex items-start gap-3">
          <div
            className="shrink-0 rounded-lg p-2"
            style={{ backgroundColor: `hsl(${color} / 0.12)` }}
          >
            <Icon className="h-4 w-4" style={{ color: `hsl(${color})` }} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-sm leading-tight mb-1 group-hover:text-primary transition-colors">{calc.name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2">{calc.description}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary/60 transition-colors shrink-0 mt-0.5" />
        </div>
      </div>
    );
  };

  return (
    <div>
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature={upgradeFeature} />
      <CreateToolDialog open={createOpen} onOpenChange={setCreateOpen} type="calculadora" />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">{t("calculators.title")}</h1>
            <p className="text-muted-foreground text-sm">
              {totalCount} calculadoras em {categoriesWithCounts.length} categorias
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isPremium && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Calculator className="h-3 w-3" />
                {remaining}/3
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
        {/* Left sidebar */}
        <div className="hidden lg:block w-56 shrink-0 sticky top-4">
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar calculadora..."
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
                const CatIcon = CATEGORY_ICONS[name] || Calculator;
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
                placeholder="Buscar calculadora..."
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

          {/* User's calculators */}
          {filteredUser.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-5 w-1 rounded-full bg-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Minhas Calculadoras</h2>
              </div>
              <div className={cn(
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3"
                  : "space-y-2"
              )}>
                {filteredUser.map((tool: any) => (
                  <div key={tool.id} className="relative">
                    <CalcCard calc={{ name: tool.name, description: tool.short_description || tool.description, icon: Calculator, category: tool.categories?.name || "", path: `/calculadoras/${tool.slug}` }} />
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

          {/* Grouped calculators */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {groupedCalcs.map(([cat, calcs]) => {
                const CatIcon = CATEGORY_ICONS[cat] || Calculator;
                const color = CATEGORY_COLORS[cat] || "173 66% 50%";
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
                      <span className="text-xs text-muted-foreground">({calcs.length})</span>
                    </div>
                    <div className={cn(
                      viewMode === "grid"
                        ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3"
                        : "space-y-2"
                    )}>
                      {calcs.map((calc) => (
                        <CalcCard key={calc.path} calc={calc} />
                      ))}
                    </div>
                  </div>
                );
              })}

              {!isLoading && groupedCalcs.length === 0 && filteredUser.length === 0 && (
                <div className="text-center py-16">
                  <Calculator className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {search ? "Nenhuma calculadora encontrada para essa busca." : "Nenhuma calculadora disponível."}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
