import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, Plus, Crown, Lock, Target, DoorOpen } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NATIVE_SIMULATORS, ROOM_EXCLUDED_SIMULATOR_SLUGS } from "@/data/simulatorCatalog";
import { SIMULATOR_AREAS, SIMULATORS_WITH_CHALLENGES, previewKindForCategory } from "@/data/catalogAreas";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { useAuth } from "@/contexts/AuthContext";
import { UpgradeModal } from "@/components/UpgradeModal";
import { CreateToolDialog } from "@/components/CreateToolDialog";
import { Button } from "@/components/ui/button";
import { CatalogHub, type CatalogItem, type CatalogFilter, type MyCatalogItem } from "@/components/catalog/CatalogHub";

export default function Simuladores() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isPremium, canUseSimulator, upgradeOpen, setUpgradeOpen, upgradeFeature, showUpgrade } = useFeatureGating();
  const [createOpen, setCreateOpen] = useState(false);

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

  const items = useMemo<CatalogItem[]>(() => {
    const native: CatalogItem[] = NATIVE_SIMULATORS.map((sim) => {
      const tags: string[] = [];
      if (SIMULATORS_WITH_CHALLENGES.has(sim.slug)) tags.push("Modo Desafio");
      if (!ROOM_EXCLUDED_SIMULATOR_SLUGS.has(sim.slug)) tags.push("Sala Virtual");
      return {
        id: `sim:${sim.slug}`,
        name: sim.name,
        description: sim.description,
        category: sim.category,
        icon: sim.icon,
        to: `/simuladores/${sim.slug}`,
        previewKind: previewKindForCategory(sim.category),
        tags,
        locked: !canUseSimulator,
      };
    });
    const nativeSlugs = new Set(NATIVE_SIMULATORS.map((s) => s.slug));
    const dynamic: CatalogItem[] = tools
      .filter((t: any) => !nativeSlugs.has(t.slug))
      .map((t: any) => ({
        id: `tool:${t.id}`,
        name: t.name,
        description: t.short_description || t.description || "",
        category: t.categories?.name || "Outros",
        icon: FlaskConical,
        to: `/simuladores/${t.slug}`,
        previewKind: previewKindForCategory(t.categories?.name || ""),
        tags: ["Gerado por IA"],
      }));
    return [...native, ...dynamic];
  }, [tools, canUseSimulator]);

  const filters: CatalogFilter[] = [
    { id: "desafio", label: "Com Modo Desafio", icon: Target, test: (i) => !!i.tags?.includes("Modo Desafio") },
    { id: "sala", label: "Funciona em Sala Virtual", icon: DoorOpen, test: (i) => !!i.tags?.includes("Sala Virtual") },
  ];

  const toggleMarketplace = async (toolId: string, current: boolean) => {
    const { error } = await supabase.from("tools").update({ is_marketplace: !current }).eq("id", toolId);
    if (error) {
      toast.error("Erro ao atualizar");
    } else {
      toast.success(!current ? "Publicado no Marketplace!" : "Removido do Marketplace");
      queryClient.invalidateQueries({ queryKey: ["user-tools"] });
    }
  };

  const mine: MyCatalogItem[] = userTools.map((t: any) => ({
    item: {
      id: `mine:${t.id}`,
      name: t.name,
      description: t.short_description || t.description || "",
      category: t.categories?.name || "Meus simuladores",
      icon: FlaskConical,
      to: `/simuladores/${t.slug}`,
      previewKind: previewKindForCategory(t.categories?.name || ""),
      tags: t.is_marketplace ? ["No Marketplace"] : ["Privado"],
    },
    isMarketplace: !!t.is_marketplace,
    onToggleMarketplace: () => toggleMarketplace(t.id, !!t.is_marketplace),
  }));

  const handleCreateClick = () => {
    if (!isPremium) {
      showUpgrade("Criação de simuladores personalizados");
      return;
    }
    setCreateOpen(true);
  };

  return (
    <>
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature={upgradeFeature} />
      <CreateToolDialog open={createOpen} onOpenChange={setCreateOpen} type="simulador" />
      <CatalogHub
        eyebrow="Praticar"
        title="Simuladores"
        titleAccent="clínicos e de bancada"
        description={`${NATIVE_SIMULATORS.length} simuladores em ${SIMULATOR_AREAS.length} áreas. Você muda os parâmetros, lê o resultado e decide, como no atendimento.`}
        itemNoun={{ singular: "simulador", plural: "simuladores" }}
        items={items}
        areas={SIMULATOR_AREAS}
        filters={filters}
        favoritesKey="posologia_fav_simuladores_v1"
        mine={mine}
        mineTitle="Meus simuladores (criados com IA)"
        isLoading={isLoading}
        onLockedClick={() => showUpgrade("Simuladores avançados são exclusivos do plano Premium")}
        headerActions={
          <>
            {isPremium ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Crown className="h-3.5 w-3.5" /> Premium
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                <Lock className="h-3.5 w-3.5" /> Simuladores nativos são Premium
              </span>
            )}
            <Button onClick={handleCreateClick} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Criar com IA
            </Button>
          </>
        }
      />
    </>
  );
}
