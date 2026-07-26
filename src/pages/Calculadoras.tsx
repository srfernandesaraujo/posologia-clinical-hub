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
import { cn } from "@/lib/utils";
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
  { name: "CKD-EPI 2021 (TFG estimada)", description: "Equação 2021 sem correção racial — estimativa da taxa de filtração glomerular.", category: "Nefrologia", path: "/calculadoras/ckd-epi", icon: Beaker, searchKey: "ckd-epi tfg taxa filtracao glomerular renal creatinina" },
  { name: "Correção de Sódio por Hiperglicemia", description: "Corrige sódio pela glicemia (fórmula de Katz) — essencial em CAD/EHH.", category: "Emergência / Medicina Interna", path: "/calculadoras/correcao-sodio", icon: Droplets, searchKey: "correcao sodio hiponatremia hiperglicemia katz" },
  { name: "Correção de Cálcio pela Albumina", description: "Ajusta o cálcio total pela albumina sérica (fórmula de Payne).", category: "Emergência / Medicina Interna", path: "/calculadoras/correcao-calcio", icon: Bone, searchKey: "correcao calcio albumina payne hipocalcemia" },
  { name: "Escore de Wells (TEP / TVP)", description: "Estratificação de probabilidade pré-teste para tromboembolismo venoso.", category: "Cardiologia", path: "/calculadoras/wells-score", icon: HeartPulse, searchKey: "wells score tep tvp embolia pulmonar trombose venosa" },
  { name: "qSOFA (Quick SOFA)", description: "Triagem rapida a beira-leito para risco de sepse — Sepsis-3.", category: "Emergência / Medicina Interna", path: "/calculadoras/qsofa", icon: Thermometer, searchKey: "qsofa sofa sepse sepsis triagem" },
  { name: "Vancomicina AUC/MIC", description: "Monitoramento farmacocinetico baseado em AUC — IDSA/ASHP 2020.", category: "Farmacologia Clínica", path: "/calculadoras/vancomicina-auc", icon: FlaskConical, searchKey: "vancomicina auc mic farmacocinetica" },
  { name: "Insulina Basal-Bolus + Correcao", description: "Calculo de dose basal, prandial e escala de correcao hospitalar.", category: "Endocrinologia", path: "/calculadoras/insulina-basal-bolus", icon: Syringe, searchKey: "insulina basal bolus correcao hospitalar" },
  { name: "Holliday-Segar (Hidratacao Pediatrica)", description: "Volume de manutencao IV com eletrolitos — regra 4-2-1.", category: "Pediatria", path: "/calculadoras/holliday-segar", icon: Baby, searchKey: "holliday segar pediatria hidratacao 4-2-1" },
  { name: "MELD / MELD-Na / Child-Pugh", description: "Prognostico hepatico e priorizacao para transplante.", category: "Hepatologia", path: "/calculadoras/meld-score", icon: Flame, searchKey: "meld meld-na child pugh hepatologia cirrose transplante" },
  { name: "QTc Corrigido (Bazett / Fridericia)", description: "Correcao do intervalo QT pela frequencia cardiaca.", category: "Cardiologia", path: "/calculadoras/qtc-corrigido", icon: Zap, searchKey: "qtc corrigido bazett fridericia intervalo qt ecg" },
  { name: "Dose Pediatrica por Peso", description: "Calculo de dose por kg para medicamentos pediatricos comuns.", category: "Pediatria", path: "/calculadoras/dose-pediatrica", icon: Baby, searchKey: "dose pediatrica peso crianca amoxicilina ibuprofeno" },
  { name: "Escala RASS (Sedacao em UTI)", description: "Richmond Agitation-Sedation Scale — avaliacao e conduta.", category: "Terapia Intensiva", path: "/calculadoras/rass-sedacao", icon: Moon, searchKey: "rass sedacao uti agitacao richmond" },
  { name: "Nutricao Parenteral Total (NPT)", description: "Calculo de macronutrientes, GIR e volume para NPT.", category: "Terapia Intensiva", path: "/calculadoras/nutricao-parenteral", icon: Utensils, searchKey: "nutricao parenteral npt gir harris benedict" },
  { name: "Radar de Interacoes CYP450", description: "Visualizacao das interacoes farmacocineticas via citocromo P450.", category: "Farmacologia Clínica", path: "/calculadoras/interacoes-cyp", icon: Dna, searchKey: "interacoes cyp450 citocromo farmacologia" },
  { name: "Predição de Risco de Não Adesão Oncológica", description: "ARMS, MOATT, Morisky e AQT para avaliar risco de não adesão em pacientes oncológicos.", category: "Oncologia", path: "/calculadoras/adesao-oncologia", icon: Pill, searchKey: "adesao oncologia arms moatt morisky aqt" },
  { name: "Predição de Reações Adversas a Antineoplásicos", description: "CARG, CRASH e HFA-ICOS para predição de toxicidade e cardiotoxicidade.", category: "Oncologia", path: "/calculadoras/toxicidade-antineoplasicos", icon: Activity, searchKey: "toxicidade antineoplasicos carg crash hfa icos cardiotoxicidade" },
  { name: "Ajuste de Dose Oncológico (Renal/Hepático)", description: "Carboplatina (Calvert), ajuste renal (Cockcroft-Gault) e hepático (NCI-ODWG / Child-Pugh).", category: "Oncologia", path: "/calculadoras/ajuste-dose-oncologico", icon: FlaskConical, searchKey: "ajuste dose oncologico carboplatina calvert renal hepatico child pugh nci odwg" },
  { name: "Curvas de Crescimento OMS (Z-Score)", description: "Peso-para-idade com percentis WHO 2006 — criancas 0-5 anos.", category: "Pediatria", path: "/calculadoras/curvas-crescimento-oms", icon: Baby, searchKey: "curvas crescimento oms zscore peso idade percentil who pediatria" },
  { name: "Bilirrubina Neonatal (Bhutani/AAP)", description: "Nomograma de risco e indicacao de fototerapia neonatal.", category: "Pediatria", path: "/calculadoras/bilirrubina-neonatal", icon: Baby, searchKey: "bilirrubina neonatal bhutani aap fototerapia ictericia recem nascido" },
  { name: "TFG Pediatrica (Schwartz)", description: "Estimativa da TFG em criancas — Bedside Schwartz 2009.", category: "Pediatria", path: "/calculadoras/schwartz-pediatrico", icon: Baby, searchKey: "schwartz pediatrico tfg taxa filtracao glomerular crianca creatinina" },
  { name: "PEWS (Pediatric Early Warning Score)", description: "Deteccao precoce de deterioracao clinica em criancas hospitalizadas.", category: "Pediatria", path: "/calculadoras/pews", icon: Baby, searchKey: "pews pediatric early warning score deterioracao crianca" },
  { name: "Drogas Vasoativas Pediatricas", description: "Calculo de infusao e diluicao para vasopressores e inotropicos pediatricos.", category: "Pediatria", path: "/calculadoras/drogas-vasoativas-pediatricas", icon: Baby, searchKey: "drogas vasoativas pediatricas dopamina dobutamina noradrenalina adrenalina milrinona" },
  { name: "Idade Gestacional + DPP", description: "Calculo por DUM ou USG com timeline gestacional e data provavel do parto.", category: "Ginecologia e Obstetrícia", path: "/calculadoras/idade-gestacional", icon: HeartPulse, searchKey: "idade gestacional dum usg dpp naegele obstetrica" },
  { name: "Ganho de Peso Gestacional (IOM)", description: "Avaliacao do ganho ponderal conforme IMC pre-gestacional (IOM 2009).", category: "Ginecologia e Obstetrícia", path: "/calculadoras/ganho-peso-gestacional", icon: HeartPulse, searchKey: "ganho peso gestacional iom imc gravidez obstetrica" },
  { name: "Risco de Pre-Eclampsia (ACOG/NICE)", description: "Rastreio de fatores de risco e indicacao de AAS profilatico.", category: "Ginecologia e Obstetrícia", path: "/calculadoras/risco-pre-eclampsia", icon: HeartPulse, searchKey: "pre eclampsia acog nice aas aspirina risco obstetrica" },
  { name: "Bishop Score", description: "Avaliacao do amadurecimento cervical para inducao do parto.", category: "Ginecologia e Obstetrícia", path: "/calculadoras/bishop-score", icon: HeartPulse, searchKey: "bishop score inducao parto cervical obstetrica" },
  { name: "Dosagem de Sulfato de Magnesio", description: "Protocolos Zuspan e Pritchard para eclampsia/pre-eclampsia grave.", category: "Ginecologia e Obstetrícia", path: "/calculadoras/sulfato-magnesio", icon: HeartPulse, searchKey: "sulfato magnesio zuspan pritchard eclampsia obstetrica" },
];

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
  "Dor / Cuidados Paliativos": "262 83% 65%",
  "Nefrologia": "200 70% 50%",
  "Psiquiatria": "280 60% 55%",
  "Emergência / Medicina Interna": "30 90% 55%",
  "Farmacologia Clínica": "168 80% 42%",
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
    }
  };

  const remaining = remainingCalculators();

  const CalcCard = ({ calc, isLocked }: { calc: any; isLocked?: boolean }) => {
    const Icon = calc.icon || Calculator;
    const color = CATEGORY_COLORS[calc.category] || "168 80% 42%";

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
                className={cn("p-2 transition-colors", viewMode === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn("p-2 transition-colors", viewMode === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
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
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                  !selectedCategory
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                Todas
              </button>
              {categoriesWithCounts.map(({ name, count }) => (
                <button
                  key={name}
                  onClick={() => setSelectedCategory(selectedCategory === name ? null : name)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                    selectedCategory === name
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {name} ({count})
                </button>
              ))}
            </div>
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
                        "absolute top-3 right-3 p-1.5 rounded-lg transition-colors z-10",
                        tool.is_marketplace ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                      title={tool.is_marketplace ? "Remover do Marketplace" : "Publicar no Marketplace"}
                    >
                      <Share2 className="h-3 w-3" />
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
