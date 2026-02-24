import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Calculator, Search, Heart, Pill, Syringe, Beaker, Brain, Activity, ShieldAlert, Crown, Plus, Lock, Share2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { UpgradeModal } from "@/components/UpgradeModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateToolDialog } from "@/components/CreateToolDialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";

interface NativeCalculator {
  name: string;
  description: string;
  category: string;
  path: string;
  icon: LucideIcon;
  searchKey: string;
}

const NATIVE_CALCULATORS: NativeCalculator[] = [
  { name: "Calculadora de Risco Cardiovascular", description: "Estima o risco CV em 10 anos via Framingham, ASCVD e SCORE2.", category: "Cardiologia", path: "/calculadoras/risco-cardiovascular", icon: Heart, searchKey: "calculadora de risco cardiovascular" },
  { name: "Calculadora de Desmame de Corticoides", description: "Plano individualizado de redução de dose com avaliação de risco de supressão adrenal.", category: "Endocrinologia", path: "/calculadoras/desmame-corticoide", icon: Pill, searchKey: "calculadora de desmame de corticoides" },
  { name: "Calculadora de Equivalência de Opioides", description: "Conversão segura entre opioides com fatores de correção para tolerância cruzada.", category: "Dor / Cuidados Paliativos", path: "/calculadoras/equivalencia-opioides", icon: Syringe, searchKey: "calculadora de equivalência de opioides" },
  { name: "Calculadora de Ajuste de Dose Renal", description: "Cockcroft-Gault, CKD-EPI e ajuste de dose para insuficiência renal.", category: "Nefrologia", path: "/calculadoras/ajuste-dose-renal", icon: Beaker, searchKey: "calculadora de ajuste de dose renal" },
  { name: "Calculadora de Equivalência de Antidepressivos", description: "Conversão segura entre antidepressivos com estratégia de transição terapêutica.", category: "Psiquiatria", path: "/calculadoras/equivalencia-antidepressivos", icon: Brain, searchKey: "calculadora de equivalência de antidepressivos" },
  { name: "Calculadora de Resistência Insulínica (HOMA-IR)", description: "Cálculo e interpretação do índice HOMA-IR para avaliação metabólica.", category: "Endocrinologia", path: "/calculadoras/homa-ir", icon: Activity, searchKey: "calculadora de resistência insulínica homa-ir" },
  { name: "Calculadora de Risco de Diabetes Tipo 2 (FINDRISC)", description: "Escore FINDRISC para estimar risco de DM2 em 10 anos.", category: "Endocrinologia", path: "/calculadoras/findrisc", icon: ShieldAlert, searchKey: "calculadora de risco de diabetes tipo 2 findrisc" },
];

export default function Calculadoras() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isPremium, upgradeOpen, setUpgradeOpen, upgradeFeature, recordCalculatorUse, remainingCalculators, showUpgrade } = useFeatureGating();
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

  const filtered = tools.filter((t: any) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredUser = userTools.filter((t: any) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredNative = NATIVE_CALCULATORS.filter((c) =>
    !search || c.searchKey.includes(search.toLowerCase())
  );

  const handleCalcClick = (e: React.MouseEvent, path: string) => {
    if (recordCalculatorUse()) {
      navigate(path);
    } else {
      e.preventDefault();
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
    }
  };

  const remaining = remainingCalculators();

  return (
    <div>
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature={upgradeFeature} />
      <CreateToolDialog open={createOpen} onOpenChange={setCreateOpen} type="calculadora" />

      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t("calculators.title")}</h1>
            <p className="text-muted-foreground">{t("calculators.subtitle")}</p>
          </div>
          <div className="flex items-center gap-3">
            {!isPremium && (
              <Badge variant="outline" className="gap-1 text-sm">
                <Calculator className="h-3.5 w-3.5" />
                {remaining}/3 {t("calculators.remainingToday")}
              </Badge>
            )}
            {isPremium && (
              <Badge className="gap-1 bg-primary/10 text-primary border-primary/20">
                <Crown className="h-3.5 w-3.5" />
                Premium – {t("calculators.unlimited")}
              </Badge>
            )}
            <Button onClick={handleCreateClick} className="gap-2">
              <Plus className="h-4 w-4" />
              {t("calculators.create")}
            </Button>
          </div>
        </div>
      </div>

      <div className="relative mb-8 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("calculators.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* User's own tools */}
      {filteredUser.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">{t("calculators.myCalculators")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUser.map((tool: any) => (
              <div
                key={tool.id}
                className="rounded-2xl border border-primary/30 bg-card p-5 hover:shadow-lg hover:shadow-primary/5 transition-all hover:-translate-y-0.5 ring-1 ring-primary/20 relative group"
              >
                <div className="cursor-pointer" onClick={(e) => handleCalcClick(e, `/calculadoras/${tool.slug}`)}>
                  <div className="inline-flex rounded-lg bg-primary/10 p-2.5 mb-3">
                    <Calculator className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">{tool.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{tool.short_description || tool.description}</p>
                  {tool.categories && (
                    <span className="inline-block mt-3 text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5">{tool.categories.name}</span>
                  )}
                </div>
                <button
                  onClick={() => toggleMarketplace(tool.id, tool.is_marketplace)}
                  className={`absolute top-3 right-3 p-1.5 rounded-lg transition-colors ${
                    tool.is_marketplace
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                  title={tool.is_marketplace ? "Remover do Marketplace" : "Publicar no Marketplace"}
                >
                  <Share2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredUser.length > 0 && <h2 className="text-lg font-semibold mb-4">{t("calculators.systemCalculators")}</h2>}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Native calculators via config array */}
          {filteredNative.map((calc) => (
            <div
              key={calc.path}
              onClick={(e) => handleCalcClick(e, calc.path)}
              className="cursor-pointer rounded-2xl border border-primary/30 bg-card p-5 hover:shadow-lg hover:shadow-primary/5 transition-all hover:-translate-y-0.5 ring-1 ring-primary/20"
            >
              <div className="inline-flex rounded-lg bg-primary/10 p-2.5 mb-3">
                <calc.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">{calc.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{calc.description}</p>
              <span className="inline-block mt-3 text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5">{calc.category}</span>
            </div>
          ))}

          {/* Dynamic system tools */}
          {filtered.map((tool: any) => (
            <div
              key={tool.id}
              onClick={(e) => handleCalcClick(e, `/calculadoras/${tool.slug}`)}
              className="cursor-pointer rounded-2xl border border-border bg-card p-5 hover:shadow-lg hover:shadow-primary/5 transition-all hover:-translate-y-0.5"
            >
              <div className="inline-flex rounded-lg bg-primary/10 p-2.5 mb-3"><Calculator className="h-5 w-5 text-primary" /></div>
              <h3 className="font-semibold mb-1">{tool.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{tool.short_description || tool.description}</p>
              {tool.categories && (
                <span className="inline-block mt-3 text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5">{tool.categories.name}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
