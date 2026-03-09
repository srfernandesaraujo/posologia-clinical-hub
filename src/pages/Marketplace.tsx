import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { useMarketplacePurchases } from "@/hooks/useMarketplacePurchases";
import { UpgradeModal } from "@/components/UpgradeModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Search, Calculator, FlaskConical, Lock, Star, TrendingUp,
  Sparkles, ChevronRight, ShoppingBag, BookOpen,
} from "lucide-react";
import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";

const TOOL_PRICES: Record<string, number> = {
  calculadora: 5,
  simulador: 10,
  caso_clinico: 2,
};

const SELLER_CREDITS: Record<string, number> = {
  calculadora: 3,
  simulador: 6,
  caso_clinico: 1,
};

export default function Marketplace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isPremium, upgradeOpen, setUpgradeOpen, upgradeFeature, showUpgrade } = useFeatureGating();
  const { hasPurchased, purchaseTool, isPurchasing } = useMarketplacePurchases();
  const [search, setSearch] = useState("");
  const [purchaseDialog, setPurchaseDialog] = useState<{ open: boolean; item: any | null; itemType: string }>({ open: false, item: null, itemType: "" });

  // Tools (calculadoras + simuladores)
  const { data: tools = [], isLoading } = useQuery({
    queryKey: ["marketplace-tools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tools")
        .select("*, categories(name)")
        .eq("is_marketplace", true)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Clinical cases from marketplace
  const { data: marketplaceCases = [], isLoading: casesLoading } = useQuery({
    queryKey: ["marketplace-cases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("simulator_cases" as any)
        .select("id, title, difficulty, simulator_slug, created_by, created_at, is_marketplace")
        .eq("is_marketplace", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Collect all creator IDs (tools + cases)
  const creatorIds = useMemo(() => {
    const ids = new Set<string>();
    tools.filter((t: any) => t.created_by).forEach((t: any) => ids.add(t.created_by));
    marketplaceCases.filter((c: any) => c.created_by).forEach((c: any) => ids.add(c.created_by));
    return [...ids];
  }, [tools, marketplaceCases]);

  const { data: profiles = [] } = useQuery({
    queryKey: ["marketplace-profiles", creatorIds],
    queryFn: async () => {
      if (creatorIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("user_id, full_name").in("user_id", creatorIds);
      return data || [];
    },
    enabled: creatorIds.length > 0,
  });

  const toolIds = useMemo(() => tools.map((t: any) => t.id), [tools]);

  const { data: reviews = [] } = useQuery({
    queryKey: ["marketplace-reviews", toolIds],
    queryFn: async () => {
      if (toolIds.length === 0) return [];
      const { data } = await supabase.from("tool_reviews" as any).select("tool_id, rating").in("tool_id", toolIds);
      return (data || []) as unknown as { tool_id: string; rating: number }[];
    },
    enabled: toolIds.length > 0,
  });

  const profileMap = useMemo(() => {
    const map: Record<string, string> = {};
    profiles.forEach((p: any) => { map[p.user_id] = p.full_name || "Usuário"; });
    return map;
  }, [profiles]);

  const reviewStats = useMemo(() => {
    const map: Record<string, { avg: number; count: number }> = {};
    const grouped: Record<string, number[]> = {};
    reviews.forEach((r: any) => {
      if (!grouped[r.tool_id]) grouped[r.tool_id] = [];
      grouped[r.tool_id].push(r.rating);
    });
    Object.entries(grouped).forEach(([tid, ratings]) => {
      map[tid] = { avg: ratings.reduce((s, v) => s + v, 0) / ratings.length, count: ratings.length };
    });
    return map;
  }, [reviews]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tools.filter((t: any) => t.name.toLowerCase().includes(q) || t.short_description?.toLowerCase().includes(q));
  }, [tools, search]);

  const filteredCases = useMemo(() => {
    const q = search.toLowerCase();
    return marketplaceCases.filter((c: any) => c.title.toLowerCase().includes(q) || c.simulator_slug?.toLowerCase().includes(q));
  }, [marketplaceCases, search]);

  const calculadoras = filtered.filter((t: any) => t.type === "calculadora");
  const simuladores = filtered.filter((t: any) => t.type === "simulador");

  // Featured: highest rated tool
  const featured = useMemo(() => {
    let best: any = null;
    let bestScore = -1;
    for (const t of tools) {
      const s = reviewStats[t.id];
      if (s && s.avg > bestScore) { bestScore = s.avg; best = t; }
    }
    return best || tools[0];
  }, [tools, reviewStats]);

  const handleToolClick = (tool: any) => {
    if (!isPremium) {
      showUpgrade("O Marketplace é exclusivo para usuários Premium");
      return;
    }
    const isOwner = tool.created_by === user?.id;
    const purchased = hasPurchased(tool.id);
    const isNative = !tool.created_by;

    if (isOwner || purchased || isNative) {
      const basePath = tool.type === "calculadora" ? "/calculadoras" : "/simuladores";
      navigate(`${basePath}/${tool.slug}`);
    } else {
      setPurchaseDialog({ open: true, item: tool, itemType: tool.type });
    }
  };

  const handleCaseClick = (caseItem: any) => {
    if (!isPremium) {
      showUpgrade("O Marketplace é exclusivo para usuários Premium");
      return;
    }
    const isOwner = caseItem.created_by === user?.id;
    const purchased = hasPurchased(caseItem.id);

    if (isOwner || purchased) {
      navigate(`/simuladores/${caseItem.simulator_slug}`);
    } else {
      setPurchaseDialog({ open: true, item: caseItem, itemType: "caso_clinico" });
    }
  };

  const handlePurchase = async () => {
    if (!purchaseDialog.item) return;
    try {
      await purchaseTool(purchaseDialog.item.id, purchaseDialog.itemType);
      setPurchaseDialog({ open: false, item: null, itemType: "" });
    } catch {}
  };

  const getToolActionLabel = (tool: any) => {
    if (!tool.created_by) return "Abrir";
    if (tool.created_by === user?.id) return "Sua";
    if (hasPurchased(tool.id)) return "Abrir";
    return `R$ ${TOOL_PRICES[tool.type] || 5},00`;
  };

  const getCaseActionLabel = (caseItem: any) => {
    if (caseItem.created_by === user?.id) return "Seu";
    if (hasPurchased(caseItem.id)) return "Abrir";
    return "R$ 2,00";
  };

  const getActionVariant = (item: any, type: string): "default" | "secondary" | "outline" => {
    if (type === "caso_clinico") {
      if (item.created_by === user?.id) return "outline";
      if (hasPurchased(item.id)) return "secondary";
      return "default";
    }
    if (!item.created_by || hasPurchased(item.id)) return "secondary";
    if (item.created_by === user?.id) return "outline";
    return "default";
  };

  /* ─── Horizontal scroll section ─── */
  const HorizontalSection = ({ title, icon: Icon, items, renderCard }: { title: string; icon: any; items: any[]; renderCard: (item: any) => React.ReactNode }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    if (items.length === 0) return null;
    return (
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            {title}
          </h2>
          <span className="text-sm text-muted-foreground">{items.length} disponíveis</span>
        </div>
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: "none" }}
        >
          {items.map((item: any) => renderCard(item))}
        </div>
      </section>
    );
  };

  /* ─── Tool Card (App Store style) ─── */
  const ToolCard = ({ tool }: { tool: any }) => {
    const authorName = tool.created_by ? (profileMap[tool.created_by] || "Usuário") : "Sérgio Araújo";
    const stats = reviewStats[tool.id];
    const Icon = tool.type === "simulador" ? FlaskConical : Calculator;
    const actionLabel = getToolActionLabel(tool);
    const actionVariant = getActionVariant(tool, tool.type);

    return (
      <div
        onClick={() => handleToolClick(tool)}
        className={`group cursor-pointer flex-shrink-0 snap-start rounded-2xl border border-border bg-card transition-all hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 w-[280px] ${!isPremium ? "opacity-70" : ""}`}
      >
        <div className="p-5 pb-0">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 p-3 group-hover:scale-105 transition-transform">
              <Icon className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm leading-tight line-clamp-2">{tool.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">por {authorName}</p>
            </div>
            {!isPremium && <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />}
          </div>
        </div>
        <div className="px-5 pt-2 pb-3">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {tool.short_description || tool.description || "Sem descrição"}
          </p>
        </div>
        <div className="px-5 pb-4 flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-1">
            {stats ? (
              <>
                <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                <span className="text-xs font-semibold">{stats.avg.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">({stats.count})</span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">Novo</span>
            )}
          </div>
          <Button
            size="sm"
            variant={actionVariant}
            className="h-7 text-xs px-3 rounded-full font-semibold"
            onClick={(e) => { e.stopPropagation(); handleToolClick(tool); }}
          >
            {actionLabel}
          </Button>
        </div>
        {tool.categories && (
          <div className="px-5 pb-4 -mt-1">
            <span className="text-[10px] font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">
              {tool.categories.name}
            </span>
          </div>
        )}
      </div>
    );
  };

  /* ─── Case Card ─── */
  const CaseCard = ({ caseItem }: { caseItem: any }) => {
    const authorName = caseItem.created_by ? (profileMap[caseItem.created_by] || "Usuário") : "Sistema";
    const actionLabel = getCaseActionLabel(caseItem);
    const actionVariant = getActionVariant(caseItem, "caso_clinico");

    const difficultyColor = caseItem.difficulty === "Fácil"
      ? "text-green-600 bg-green-500/10"
      : caseItem.difficulty === "Difícil"
        ? "text-red-600 bg-red-500/10"
        : "text-yellow-600 bg-yellow-500/10";

    return (
      <div
        onClick={() => handleCaseClick(caseItem)}
        className={`group cursor-pointer flex-shrink-0 snap-start rounded-2xl border border-border bg-card transition-all hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 w-[280px] ${!isPremium ? "opacity-70" : ""}`}
      >
        <div className="p-5 pb-0">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 p-3 group-hover:scale-105 transition-transform">
              <BookOpen className="h-7 w-7 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm leading-tight line-clamp-2">{caseItem.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">por {authorName}</p>
            </div>
            {!isPremium && <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />}
          </div>
        </div>
        <div className="px-5 pt-2 pb-3">
          <p className="text-xs text-muted-foreground line-clamp-2">
            Simulador: {caseItem.simulator_slug}
          </p>
        </div>
        <div className="px-5 pb-4 flex items-center justify-between border-t border-border pt-3">
          <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${difficultyColor}`}>
            {caseItem.difficulty}
          </span>
          <Button
            size="sm"
            variant={actionVariant}
            className="h-7 text-xs px-3 rounded-full font-semibold"
            onClick={(e) => { e.stopPropagation(); handleCaseClick(caseItem); }}
          >
            {actionLabel}
          </Button>
        </div>
      </div>
    );
  };

  const purchasePrice = purchaseDialog.itemType
    ? TOOL_PRICES[purchaseDialog.itemType] || 2
    : 0;
  const purchaseLabel = purchaseDialog.itemType === "caso_clinico" ? "Caso Clínico" : purchaseDialog.itemType === "simulador" ? "Simulador" : "Calculadora";

  return (
    <div className="max-w-7xl mx-auto">
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature={upgradeFeature} />

      {/* Hero Banner */}
      {featured && !search && (
        <div
          className="relative rounded-3xl overflow-hidden mb-10 cursor-pointer group"
          onClick={() => handleToolClick(featured)}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/10 to-transparent" />
          <div className="relative p-8 md:p-12 flex items-center gap-8">
            <div className="rounded-2xl bg-card/80 backdrop-blur-sm border border-border p-5 group-hover:scale-105 transition-transform">
              {featured.type === "simulador" ? (
                <FlaskConical className="h-12 w-12 text-primary" />
              ) : (
                <Calculator className="h-12 w-12 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <Badge className="mb-2 gap-1 bg-primary/20 text-primary border-0">
                <Sparkles className="h-3 w-3" /> Destaque
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold mb-1">{featured.name}</h2>
              <p className="text-muted-foreground text-sm md:text-base line-clamp-2 max-w-xl">
                {featured.short_description || featured.description}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                por {featured.created_by ? (profileMap[featured.created_by] || "Usuário") : "Sérgio Araújo"}
              </p>
            </div>
            <div className="hidden md:flex flex-col items-end gap-2">
              {reviewStats[featured.id] && (
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-4 w-4 ${s <= Math.round(reviewStats[featured.id].avg) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`}
                    />
                  ))}
                </div>
              )}
              <Button size="lg" className="rounded-full gap-2 px-6">
                {getToolActionLabel(featured)}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="relative mb-8 max-w-lg">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar no marketplace..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-11 h-12 rounded-xl bg-card border-border text-base"
        />
      </div>

      {isLoading && casesLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <HorizontalSection title="Calculadoras" icon={Calculator} items={calculadoras} renderCard={(t) => <ToolCard key={t.id} tool={t} />} />
          <HorizontalSection title="Simuladores" icon={FlaskConical} items={simuladores} renderCard={(t) => <ToolCard key={t.id} tool={t} />} />
          <HorizontalSection title="Casos Clínicos" icon={BookOpen} items={filteredCases} renderCard={(c) => <CaseCard key={c.id} caseItem={c} />} />

          {filtered.length === 0 && filteredCases.length === 0 && (
            <div className="text-center py-20">
              <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-lg">Nenhum item encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">Tente outra busca ou volte mais tarde</p>
            </div>
          )}
        </>
      )}

      {/* Purchase confirmation dialog */}
      <Dialog open={purchaseDialog.open} onOpenChange={(o) => !o && setPurchaseDialog({ open: false, item: null, itemType: "" })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Adquirir {purchaseLabel}
            </DialogTitle>
            <DialogDescription>
              Deseja adquirir <strong>{purchaseDialog.item?.name || purchaseDialog.item?.title}</strong>?
            </DialogDescription>
          </DialogHeader>
          {purchaseDialog.item && (
            <div className="py-4 space-y-3">
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
                <div>
                  <p className="font-medium text-sm">{purchaseDialog.item.name || purchaseDialog.item.title}</p>
                  <p className="text-xs text-muted-foreground">{purchaseLabel}</p>
                </div>
                <span className="text-lg font-bold text-primary">
                  R$ {purchasePrice},00
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                O valor será adicionado à sua próxima fatura mensal como cobrança única. Você terá acesso permanente.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurchaseDialog({ open: false, item: null, itemType: "" })}>
              Cancelar
            </Button>
            <Button onClick={handlePurchase} disabled={isPurchasing} className="gap-2">
              {isPurchasing ? "Processando..." : "Confirmar compra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}