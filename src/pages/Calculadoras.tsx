import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, Plus, Crown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NATIVE_CALCULATORS } from "@/data/calculatorCatalog";
import type { PreviewKind } from "@/data/catalogAreas";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { useAuth } from "@/contexts/AuthContext";
import { UpgradeModal } from "@/components/UpgradeModal";
import { CreateToolDialog } from "@/components/CreateToolDialog";
import { Button } from "@/components/ui/button";
import { CatalogHub, type CatalogItem, type MyCatalogItem } from "@/components/catalog/CatalogHub";

// Slugs (antigos e atuais) das calculadoras nativas que também existem na tabela
// tools — ficam fora da lista dinâmica para não aparecerem duplicadas.
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

const PREVIEW_BY_CATEGORY: Record<string, PreviewKind> = {
  "Cardiologia": "ecg",
  "Pediatria": "curve",
  "Ginecologia e Obstetrícia": "curve",
  "Nefrologia": "bars",
  "Hepatologia": "bars",
};
const previewFor = (category: string): PreviewKind => PREVIEW_BY_CATEGORY[category] || "gauge";

export default function Calculadoras() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isPremium, upgradeOpen, setUpgradeOpen, upgradeFeature, canUseCalculator, remainingCalculators, showUpgrade } = useFeatureGating();
  const [createOpen, setCreateOpen] = useState(false);

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

  const items = useMemo<CatalogItem[]>(() => {
    const native: CatalogItem[] = NATIVE_CALCULATORS.map((c) => ({
      id: `calc:${c.path}`,
      name: c.name,
      description: c.description,
      category: c.category,
      icon: c.icon,
      to: c.path,
      previewKind: previewFor(c.category),
      keywords: c.searchKey,
    }));
    const dynamic: CatalogItem[] = tools
      .filter((t: any) => !NATIVE_SLUGS.has(t.slug))
      .map((t: any) => ({
        id: `tool:${t.id}`,
        name: t.name,
        description: t.short_description || t.description || "",
        category: t.categories?.name || "Outros",
        icon: Calculator,
        to: `/calculadoras/${t.slug}`,
        previewKind: previewFor(t.categories?.name || ""),
        tags: ["Gerada por IA"],
      }));
    return [...native, ...dynamic];
  }, [tools]);

  const toggleMarketplace = async (toolId: string, current: boolean) => {
    const { error } = await supabase.from("tools").update({ is_marketplace: !current }).eq("id", toolId);
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

  const mine: MyCatalogItem[] = userTools.map((t: any) => ({
    item: {
      id: `mine:${t.id}`,
      name: t.name,
      description: t.short_description || t.description || "",
      category: t.categories?.name || "Minhas calculadoras",
      icon: Calculator,
      to: `/calculadoras/${t.slug}`,
      previewKind: previewFor(t.categories?.name || ""),
      tags: t.is_marketplace ? ["No Marketplace"] : ["Privada"],
    },
    isMarketplace: !!t.is_marketplace,
    onToggleMarketplace: () => toggleMarketplace(t.id, !!t.is_marketplace),
  }));

  // Só uma checagem antecipada para avisar na hora — quem registra o uso da
  // cota é o AppLayout, que também cobre links diretos.
  const handleOpen = (item: CatalogItem, e: React.MouseEvent) => {
    if (canUseCalculator()) return true;
    e.preventDefault();
    showUpgrade("Você atingiu o limite de calculadoras por dia");
    return false;
  };

  const handleCreateClick = () => {
    if (!isPremium) {
      showUpgrade("Criação de calculadoras personalizadas");
      return;
    }
    setCreateOpen(true);
  };

  const categoryCount = new Set(NATIVE_CALCULATORS.map((c) => c.category)).size;
  const remaining = remainingCalculators();

  return (
    <>
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature={upgradeFeature} />
      <CreateToolDialog open={createOpen} onOpenChange={setCreateOpen} type="calculadora" />
      <CatalogHub
        eyebrow="Praticar"
        title="Calculadoras"
        titleAccent="clínicas"
        description={`${NATIVE_CALCULATORS.length} calculadoras em ${categoryCount} especialidades, com a fórmula, a interpretação e a referência de cada resultado.`}
        itemNoun={{ singular: "calculadora", plural: "calculadoras" }}
        items={items}
        favoritesKey="posologia_fav_calculadoras_v1"
        mine={mine}
        mineTitle="Minhas calculadoras (criadas com IA)"
        isLoading={isLoading}
        onOpen={handleOpen}
        headerActions={
          <>
            {isPremium ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Crown className="h-3.5 w-3.5" /> Premium
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                <Calculator className="h-3.5 w-3.5" /> <span className="tabular-nums">{remaining}/3</span> hoje no plano gratuito
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
