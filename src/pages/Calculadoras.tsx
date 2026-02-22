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

export default function Calculadoras() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isPremium, upgradeOpen, setUpgradeOpen, upgradeFeature, recordCalculatorUse, remainingCalculators, showUpgrade } = useFeatureGating();
  const [createOpen, setCreateOpen] = useState(false);

  // System tools (no created_by)
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

  // User's own tools
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
                {remaining}/3 restantes hoje
              </Badge>
            )}
            {isPremium && (
              <Badge className="gap-1 bg-primary/10 text-primary border-primary/20">
                <Crown className="h-3.5 w-3.5" />
                Premium – Ilimitado
              </Badge>
            )}
            <Button onClick={handleCreateClick} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Calculadora
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
          <h2 className="text-lg font-semibold mb-4">Minhas Calculadoras</h2>
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

      {/* Section header for system tools */}
      {filteredUser.length > 0 && <h2 className="text-lg font-semibold mb-4">Calculadoras do Sistema</h2>}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Fixed native calculators */}
          {(!search || "calculadora de risco cardiovascular".includes(search.toLowerCase())) && (
            <div onClick={(e) => handleCalcClick(e, "/calculadoras/risco-cardiovascular")} className="cursor-pointer rounded-2xl border border-primary/30 bg-card p-5 hover:shadow-lg hover:shadow-primary/5 transition-all hover:-translate-y-0.5 ring-1 ring-primary/20">
              <div className="inline-flex rounded-lg bg-primary/10 p-2.5 mb-3"><Heart className="h-5 w-5 text-primary" /></div>
              <h3 className="font-semibold mb-1">Calculadora de Risco Cardiovascular</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">Estima o risco CV em 10 anos via Framingham, ASCVD e SCORE2.</p>
              <span className="inline-block mt-3 text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5">Cardiologia</span>
            </div>
          )}
          {(!search || "calculadora de desmame de corticoides".includes(search.toLowerCase())) && (
            <div onClick={(e) => handleCalcClick(e, "/calculadoras/desmame-corticoide")} className="cursor-pointer rounded-2xl border border-primary/30 bg-card p-5 hover:shadow-lg hover:shadow-primary/5 transition-all hover:-translate-y-0.5 ring-1 ring-primary/20">
              <div className="inline-flex rounded-lg bg-primary/10 p-2.5 mb-3"><Pill className="h-5 w-5 text-primary" /></div>
              <h3 className="font-semibold mb-1">Calculadora de Desmame de Corticoides</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">Plano individualizado de redução de dose com avaliação de risco de supressão adrenal.</p>
              <span className="inline-block mt-3 text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5">Endocrinologia</span>
            </div>
          )}
          {(!search || "calculadora de equivalência de opioides".includes(search.toLowerCase())) && (
            <div onClick={(e) => handleCalcClick(e, "/calculadoras/equivalencia-opioides")} className="cursor-pointer rounded-2xl border border-primary/30 bg-card p-5 hover:shadow-lg hover:shadow-primary/5 transition-all hover:-translate-y-0.5 ring-1 ring-primary/20">
              <div className="inline-flex rounded-lg bg-primary/10 p-2.5 mb-3"><Syringe className="h-5 w-5 text-primary" /></div>
              <h3 className="font-semibold mb-1">Calculadora de Equivalência de Opioides</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">Conversão segura entre opioides com fatores de correção para tolerância cruzada.</p>
              <span className="inline-block mt-3 text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5">Dor / Cuidados Paliativos</span>
            </div>
          )}
          {(!search || "calculadora de ajuste de dose renal".includes(search.toLowerCase())) && (
            <div onClick={(e) => handleCalcClick(e, "/calculadoras/ajuste-dose-renal")} className="cursor-pointer rounded-2xl border border-primary/30 bg-card p-5 hover:shadow-lg hover:shadow-primary/5 transition-all hover:-translate-y-0.5 ring-1 ring-primary/20">
              <div className="inline-flex rounded-lg bg-primary/10 p-2.5 mb-3"><Beaker className="h-5 w-5 text-primary" /></div>
              <h3 className="font-semibold mb-1">Calculadora de Ajuste de Dose Renal</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">Cockcroft-Gault, CKD-EPI e ajuste de dose para insuficiência renal.</p>
              <span className="inline-block mt-3 text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5">Nefrologia</span>
            </div>
          )}
          {(!search || "calculadora de equivalência de antidepressivos".includes(search.toLowerCase())) && (
            <div onClick={(e) => handleCalcClick(e, "/calculadoras/equivalencia-antidepressivos")} className="cursor-pointer rounded-2xl border border-primary/30 bg-card p-5 hover:shadow-lg hover:shadow-primary/5 transition-all hover:-translate-y-0.5 ring-1 ring-primary/20">
              <div className="inline-flex rounded-lg bg-primary/10 p-2.5 mb-3"><Brain className="h-5 w-5 text-primary" /></div>
              <h3 className="font-semibold mb-1">Calculadora de Equivalência de Antidepressivos</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">Conversão segura entre antidepressivos com estratégia de transição terapêutica.</p>
              <span className="inline-block mt-3 text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5">Psiquiatria</span>
            </div>
          )}
          {(!search || "calculadora de resistência insulínica homa-ir".includes(search.toLowerCase())) && (
            <div onClick={(e) => handleCalcClick(e, "/calculadoras/homa-ir")} className="cursor-pointer rounded-2xl border border-primary/30 bg-card p-5 hover:shadow-lg hover:shadow-primary/5 transition-all hover:-translate-y-0.5 ring-1 ring-primary/20">
              <div className="inline-flex rounded-lg bg-primary/10 p-2.5 mb-3"><Activity className="h-5 w-5 text-primary" /></div>
              <h3 className="font-semibold mb-1">Calculadora de Resistência Insulínica (HOMA-IR)</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">Cálculo e interpretação do índice HOMA-IR para avaliação metabólica.</p>
              <span className="inline-block mt-3 text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5">Endocrinologia</span>
            </div>
          )}
          {(!search || "calculadora de risco de diabetes tipo 2 findrisc".includes(search.toLowerCase())) && (
            <div onClick={(e) => handleCalcClick(e, "/calculadoras/findrisc")} className="cursor-pointer rounded-2xl border border-primary/30 bg-card p-5 hover:shadow-lg hover:shadow-primary/5 transition-all hover:-translate-y-0.5 ring-1 ring-primary/20">
              <div className="inline-flex rounded-lg bg-primary/10 p-2.5 mb-3"><ShieldAlert className="h-5 w-5 text-primary" /></div>
              <h3 className="font-semibold mb-1">Calculadora de Risco de Diabetes Tipo 2 (FINDRISC)</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">Escore FINDRISC para estimar risco de DM2 em 10 anos.</p>
              <span className="inline-block mt-3 text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5">Endocrinologia</span>
            </div>
          )}

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
