import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { FlaskConical, Search, Pill, Bug, Activity, ClipboardList, Syringe, Lock, Crown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { UpgradeModal } from "@/components/UpgradeModal";
import { Badge } from "@/components/ui/badge";

const NATIVE_SIMULATORS = [
  { slug: "prm", name: "Simulador de PRM", description: "Problemas Relacionados a Medicamentos – Avalie prescrições e identifique erros.", icon: Pill, category: "Farmácia Clínica" },
  { slug: "antimicrobianos", name: "Simulador de Antimicrobial Stewardship", description: "Terapia empírica e descalonamento baseado em antibiograma.", icon: Bug, category: "Infectologia" },
  { slug: "tdm", name: "Simulador TDM", description: "Monitoramento Terapêutico de Fármacos – Ajuste de doses de medicamentos de baixo índice terapêutico.", icon: Activity, category: "Farmacocinética" },
  { slug: "acompanhamento", name: "Simulador de Acompanhamento Farmacoterapêutico", description: "Monitore pacientes crônicos ao longo de várias consultas.", icon: ClipboardList, category: "Farmácia Clínica" },
  { slug: "insulina", name: "Simulador de Dose de Insulina", description: "Treinamento de insulinoterapia intensiva baseado no livro Koda-Kimble.", icon: Syringe, category: "Endocrinologia" },
];

export default function Simuladores() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const { isPremium, canUseSimulator, upgradeOpen, setUpgradeOpen, upgradeFeature, showUpgrade } = useFeatureGating();

  const { data: tools = [], isLoading } = useQuery({
    queryKey: ["tools", "simulador"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tools")
        .select("*, categories(name, slug)")
        .eq("type", "simulador")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const filteredNative = NATIVE_SIMULATORS.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase())
  );

  const filteredDynamic = tools.filter((t: any) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature={upgradeFeature} />
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t("simulators.title")}</h1>
            <p className="text-muted-foreground">{t("simulators.subtitle")}</p>
          </div>
          {!canUseSimulator && (
            <Badge variant="outline" className="gap-1 text-sm">
              <Lock className="h-3.5 w-3.5" />
              Premium
            </Badge>
          )}
          {isPremium && (
            <Badge className="gap-1 bg-primary/10 text-primary border-primary/20">
              <Crown className="h-3.5 w-3.5" />
              Premium – Desbloqueado
            </Badge>
          )}
        </div>
      </div>

      <div className="relative mb-8 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("simulators.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Native simulators */}
        {filteredNative.map((sim) => {
          const Icon = sim.icon;
          return canUseSimulator ? (
            <Link
              key={sim.slug}
              to={`/simuladores/${sim.slug}`}
              className="rounded-2xl border border-primary/30 bg-card p-5 hover:shadow-lg hover:shadow-primary/5 transition-all hover:-translate-y-0.5 ring-1 ring-primary/20"
            >
              <div className="inline-flex rounded-lg bg-primary/10 p-2.5 mb-3"><Icon className="h-5 w-5 text-primary" /></div>
              <h3 className="font-semibold mb-1">{sim.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{sim.description}</p>
              <span className="inline-block mt-3 text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5">{sim.category}</span>
            </Link>
          ) : (
            <div
              key={sim.slug}
              onClick={() => showUpgrade("Simuladores avançados são exclusivos do plano Premium")}
              className="cursor-pointer rounded-2xl border border-border bg-card p-5 opacity-75 hover:opacity-100 transition-all relative"
            >
              <div className="absolute top-3 right-3"><Lock className="h-4 w-4 text-muted-foreground" /></div>
              <div className="inline-flex rounded-lg bg-muted p-2.5 mb-3"><Icon className="h-5 w-5 text-muted-foreground" /></div>
              <h3 className="font-semibold mb-1">{sim.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{sim.description}</p>
              <span className="inline-block mt-3 text-xs font-medium text-muted-foreground bg-muted rounded-full px-2.5 py-0.5">{sim.category}</span>
            </div>
          );
        })}


        {/* Dynamic tools from DB */}
        {filteredDynamic.map((tool: any) => (
          <Link
            key={tool.id}
            to={`/simuladores/${tool.slug}`}
            className="rounded-2xl border border-border bg-card p-5 hover:shadow-lg hover:shadow-primary/5 transition-all hover:-translate-y-0.5"
          >
            <div className="inline-flex rounded-lg bg-accent/10 p-2.5 mb-3">
              <FlaskConical className="h-5 w-5 text-accent" />
            </div>
            <h3 className="font-semibold mb-1">{tool.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {tool.short_description || tool.description}
            </p>
            {tool.categories && (
              <span className="inline-block mt-3 text-xs font-medium text-accent bg-accent/10 rounded-full px-2.5 py-0.5">
                {tool.categories.name}
              </span>
            )}
          </Link>
        ))}
      </div>

      {!isLoading && filteredNative.length === 0 && filteredDynamic.length === 0 && (
        <p className="text-muted-foreground text-center py-12">
          {search ? t("simulators.noResults") : t("simulators.empty")}
        </p>
      )}
    </div>
  );
}
