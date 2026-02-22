import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Plus, X, AlertTriangle, ShieldAlert, ShieldCheck, Info, Loader2, Beaker, Sparkles, Trash2, TestTube, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";

/* ─── Types ─── */
interface Drug {
  name: string;
  rxcui: string;
}

interface Interaction {
  severity: "high" | "medium" | "low";
  drugA: string;
  drugB: string;
  description: string;
  source: string;
}

interface Comorbidity {
  id: string;
  name: string;
  effect: string;
}

/* ─── Constants ─── */
const COMORBIDITIES: Comorbidity[] = [
  { id: "renal", name: "Insuficiência Renal", effect: "Reduz a depuração de drogas renais, aumentando toxicidade e tempo de meia-vida." },
  { id: "hepatic", name: "Insuficiência Hepática", effect: "Diminui o metabolismo hepático (CYP450), potencializando efeitos e interações." },
  { id: "cardiac", name: "Insuficiência Cardíaca", effect: "Altera a perfusão orgânica e biodisponibilidade, aumentando risco de arritmias." },
  { id: "elderly", name: "Paciente Idoso (>65 anos)", effect: "Farmacocinética alterada: menor volume de distribuição, menor função renal e hepática." },
];

const PHARMACOLOGY_TERMS: Record<string, string> = {
  "Farmacocinética": "Estudo de como o corpo absorve, distribui, metaboliza e excreta um fármaco (ADME).",
  "Farmacodinâmica": "Estudo do efeito do fármaco no organismo e seu mecanismo de ação.",
  "CYP3A4": "Enzima hepática do citocromo P450, responsável pelo metabolismo de ~50% dos fármacos.",
  "CYP2D6": "Enzima do citocromo P450 que metaboliza antidepressivos, antipsicóticos e opioides.",
  "Meia-vida": "Tempo necessário para que a concentração plasmática do fármaco se reduza pela metade.",
  "Índice Terapêutico": "Relação entre a dose tóxica e a dose terapêutica. Quanto menor, mais perigoso.",
};

/* ─── Dashboard built-in cases ─── */
const BUILT_IN_CASES = [
  {
    id: "demo-1",
    title: "Polifarmácia em Idoso Cardiopata",
    difficulty: "Difícil",
    drugs: ["warfarin", "amiodarone", "omeprazole", "aspirin"],
    comorbidities: ["cardiac", "elderly"],
  },
  {
    id: "demo-2",
    title: "Interação Sildenafila + Nitrato",
    difficulty: "Fácil",
    drugs: ["sildenafil", "nitroglycerin"],
    comorbidities: [],
  },
  {
    id: "demo-3",
    title: "Paciente Renal Crônico com Dor",
    difficulty: "Médio",
    drugs: ["metformin", "ibuprofen", "lisinopril"],
    comorbidities: ["renal"],
  },
];

/* ─── RxNav API helpers ─── */
const RXNAV_BASE = "https://rxnav.nlm.nih.gov/REST";

async function fetchDrugSuggestions(query: string): Promise<Drug[]> {
  if (query.length < 2) return [];
  try {
    const res = await fetch(`${RXNAV_BASE}/drugs.json?name=${encodeURIComponent(query)}`);
    const data = await res.json();
    const groups = data?.drugGroup?.conceptGroup;
    if (!groups) return [];
    const results: Drug[] = [];
    for (const g of groups) {
      if (g.conceptProperties) {
        for (const p of g.conceptProperties) {
          results.push({ name: p.name, rxcui: p.rxcui });
        }
      }
    }
    // Deduplicate by rxcui
    const seen = new Set<string>();
    return results.filter(d => {
      if (seen.has(d.rxcui)) return false;
      seen.add(d.rxcui);
      return true;
    }).slice(0, 15);
  } catch {
    return [];
  }
}

async function fetchInteractions(rxcuis: string[]): Promise<Interaction[]> {
  if (rxcuis.length < 2) return [];
  try {
    const res = await fetch(`${RXNAV_BASE}/interaction/list.json?rxcuis=${rxcuis.join("+")}`);
    const data = await res.json();
    const interactions: Interaction[] = [];
    const groups = data?.fullInteractionTypeGroup;
    if (!groups) return [];
    for (const group of groups) {
      for (const type of group.fullInteractionType || []) {
        for (const pair of type.interactionPair || []) {
          const sev = pair.severity?.toLowerCase() || "n/a";
          let severity: "high" | "medium" | "low" = "low";
          if (sev === "high" || sev.includes("contra")) severity = "high";
          else if (sev === "medium" || sev === "moderate" || sev === "n/a") severity = "medium";

          const names = type.minConceptItem?.map((c: any) => c.name) || [];
          interactions.push({
            severity,
            drugA: names[0] || "Droga A",
            drugB: names[1] || "Droga B",
            description: pair.description || "Interação descrita na base.",
            source: group.sourceName || "RxNav/NIH",
          });
        }
      }
    }
    return interactions;
  } catch {
    return [];
  }
}

/* ─── Component ─── */
export default function SimuladorInteracoes() {
  const navigate = useNavigate();
  const { allCases, generateCase, isGenerating } = useSimulatorCases("interacoes", BUILT_IN_CASES);

  // Dashboard vs simulator
  const [activeCase, setActiveCase] = useState<any | null>(null);

  // Simulator state
  const [selectedDrugs, setSelectedDrugs] = useState<Drug[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Drug[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isLoadingInteractions, setIsLoadingInteractions] = useState(false);
  const [selectedComorbidities, setSelectedComorbidities] = useState<string[]>([]);
  const [showScenario, setShowScenario] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) { setSuggestions([]); return; }
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      const results = await fetchDrugSuggestions(searchQuery);
      setSuggestions(results);
      setIsSearching(false);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Fetch interactions when drugs change
  useEffect(() => {
    if (selectedDrugs.length < 2) { setInteractions([]); return; }
    const load = async () => {
      setIsLoadingInteractions(true);
      const result = await fetchInteractions(selectedDrugs.map(d => d.rxcui));
      setInteractions(result);
      setIsLoadingInteractions(false);
    };
    load();
  }, [selectedDrugs]);

  const addDrug = useCallback((drug: Drug) => {
    if (selectedDrugs.find(d => d.rxcui === drug.rxcui)) {
      toast.info("Medicamento já adicionado.");
      return;
    }
    setSelectedDrugs(prev => [...prev, drug]);
    setSearchQuery("");
    setSuggestions([]);
  }, [selectedDrugs]);

  const removeDrug = useCallback((rxcui: string) => {
    setSelectedDrugs(prev => prev.filter(d => d.rxcui !== rxcui));
  }, []);

  const toggleComorbidity = useCallback((id: string) => {
    setSelectedComorbidities(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  }, []);

  // Start a case from dashboard
  const startCase = async (c: any) => {
    setActiveCase(c);
    // If case has pre-defined drug names, search them via RxNav
    if (c.drugs && Array.isArray(c.drugs)) {
      const drugs: Drug[] = [];
      for (const name of c.drugs) {
        const results = await fetchDrugSuggestions(name);
        if (results.length > 0) drugs.push(results[0]);
      }
      setSelectedDrugs(drugs);
    }
    if (c.comorbidities && Array.isArray(c.comorbidities)) {
      setSelectedComorbidities(c.comorbidities);
    }
  };

  // Sorted interactions by severity
  const sortedInteractions = useMemo(() => {
    const order = { high: 0, medium: 1, low: 2 };
    return [...interactions].sort((a, b) => order[a.severity] - order[b.severity]);
  }, [interactions]);

  const sevLabel = (s: string) => s === "high" ? "Contraindicado" : s === "medium" ? "Monitoramento" : "Baixo Risco";
  const sevColor = (s: string) => s === "high" ? "bg-red-500/10 text-red-600 border-red-500/30" : s === "medium" ? "bg-yellow-500/10 text-yellow-700 border-yellow-500/30" : "bg-green-500/10 text-green-600 border-green-500/30";
  const sevIcon = (s: string) => s === "high" ? <ShieldAlert className="h-5 w-5 text-red-500" /> : s === "medium" ? <AlertTriangle className="h-5 w-5 text-yellow-500" /> : <ShieldCheck className="h-5 w-5 text-green-500" />;

  /* ─── Dashboard ─── */
  if (!activeCase) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Simulador de Interações Medicamentosas</h1>
            <p className="text-sm text-muted-foreground">Analise interações entre fármacos com dados do RxNav (NIH)</p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-sm text-yellow-700 dark:text-yellow-400 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Base de dados para fins educacionais. Sempre consulte o bulário oficial e o julgamento clínico antes de prescrever.</span>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Casos Clínicos</h2>
          <Button onClick={generateCase} disabled={isGenerating} variant="outline" className="gap-2">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Gerar com IA
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Free mode */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow border-dashed border-primary/40" onClick={() => setActiveCase({ id: "free", title: "Modo Livre" })}>
            <CardContent className="flex flex-col items-center justify-center py-8 gap-2">
              <Beaker className="h-8 w-8 text-primary" />
              <span className="font-semibold">Modo Livre</span>
              <span className="text-xs text-muted-foreground text-center">Adicione medicamentos manualmente e analise interações</span>
            </CardContent>
          </Card>

          {allCases.map((c: any) => (
            <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => startCase(c)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">{c.difficulty}</Badge>
                  {c.isAI && <Sparkles className="h-3.5 w-3.5 text-primary" />}
                </div>
                <CardTitle className="text-sm mt-1">{c.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{c.drugs ? `${c.drugs.length} medicamentos` : "Caso clínico"}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  /* ─── Simulator UI ─── */
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => { setActiveCase(null); setSelectedDrugs([]); setInteractions([]); setSelectedComorbidities([]); }}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{activeCase.title || "Interações Medicamentosas"}</h1>
          <p className="text-xs text-muted-foreground">Dados: RxNav / National Library of Medicine</p>
        </div>
        <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1"><HelpCircle className="h-4 w-4" /> Glossário</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Glossário Farmacológico</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {Object.entries(PHARMACOLOGY_TERMS).map(([term, def]) => (
                <div key={term}>
                  <p className="font-semibold text-sm">{term}</p>
                  <p className="text-sm text-muted-foreground">{def}</p>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Disclaimer */}
      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-sm text-yellow-700 dark:text-yellow-400 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>SIMULADOR DIDÁTICO. Sempre consulte o bulário oficial e o julgamento clínico antes de prescrever.</span>
      </div>

      {/* Case context */}
      {activeCase.patient && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3 text-sm space-y-1">
            <p><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age} anos</p>
            {activeCase.scenario && <p><strong>Cenário:</strong> {activeCase.scenario}</p>}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ─── Left: Drug List ─── */}
        <div className="lg:col-span-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TestTube className="h-4 w-4 text-primary" />
                Prescrição
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar medicamento..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 text-sm"
                />
                {isSearching && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
              </div>

              {/* Suggestions dropdown */}
              {suggestions.length > 0 && (
                <div className="border rounded-md bg-popover max-h-48 overflow-y-auto shadow-lg">
                  {suggestions.map(s => (
                    <button
                      key={s.rxcui}
                      onClick={() => addDrug(s)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50 transition-colors flex items-center justify-between"
                    >
                      <span className="truncate">{s.name}</span>
                      <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}

              {/* Selected drugs */}
              <div className="space-y-1.5">
                {selectedDrugs.length === 0 && (
                  <p className="text-xs text-muted-foreground py-4 text-center">Adicione medicamentos para iniciar a análise</p>
                )}
                {selectedDrugs.map(d => (
                  <div key={d.rxcui} className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
                    <span className="text-sm font-medium truncate">{d.name}</span>
                    <button onClick={() => removeDrug(d.rxcui)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Scenario Test */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Beaker className="h-4 w-4 text-primary" />
                Cenário de Teste
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Selecione comorbidades para avaliar agravamento de interações:</p>
              {COMORBIDITIES.map(c => (
                <div key={c.id} className="flex items-start gap-2">
                  <Checkbox
                    id={c.id}
                    checked={selectedComorbidities.includes(c.id)}
                    onCheckedChange={() => toggleComorbidity(c.id)}
                  />
                  <label htmlFor={c.id} className="text-sm cursor-pointer">
                    <span className="font-medium">{c.name}</span>
                  </label>
                </div>
              ))}
              {selectedComorbidities.length > 0 && (
                <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => setShowScenario(!showScenario)}>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {showScenario ? "Ocultar Análise" : "Testar Prescrição"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── Right: Interaction Timeline ─── */}
        <div className="lg:col-span-8 space-y-4">
          {/* Comorbidity warnings */}
          {showScenario && selectedComorbidities.length > 0 && (
            <Card className="border-orange-500/30 bg-orange-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-orange-600">⚠️ Análise de Cenário Clínico</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedComorbidities.map(id => {
                  const c = COMORBIDITIES.find(x => x.id === id);
                  if (!c) return null;
                  return (
                    <div key={id} className="text-sm">
                      <span className="font-semibold">{c.name}:</span>{" "}
                      <span className="text-muted-foreground">{c.effect}</span>
                    </div>
                  );
                })}
                {interactions.length > 0 && (
                  <div className="mt-2 p-2 rounded bg-red-500/10 text-sm text-red-600 dark:text-red-400">
                    <strong>Atenção:</strong> As comorbidades selecionadas podem agravar as {interactions.length} interação(ões) detectadas. Reavalie a necessidade de ajuste de dose ou troca de fármacos.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Loading */}
          {isLoadingInteractions && (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Consultando base RxNav...</span>
            </div>
          )}

          {/* No interactions */}
          {!isLoadingInteractions && selectedDrugs.length >= 2 && interactions.length === 0 && (
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="py-6 text-center space-y-1">
                <ShieldCheck className="h-8 w-8 text-green-500 mx-auto" />
                <p className="text-sm font-medium text-green-600">Nenhuma interação grave encontrada entre estes fármacos na base RxNav.</p>
                <p className="text-xs text-muted-foreground">Isso não exclui interações não documentadas. Consulte sempre o bulário oficial.</p>
              </CardContent>
            </Card>
          )}

          {/* Prompt */}
          {!isLoadingInteractions && selectedDrugs.length < 2 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <TestTube className="h-10 w-10" />
              <p className="text-sm">Adicione pelo menos 2 medicamentos para verificar interações</p>
            </div>
          )}

          {/* Interaction cards */}
          {sortedInteractions.map((inter, idx) => (
            <Card key={idx} className={`border ${inter.severity === "high" ? "border-red-500/40" : inter.severity === "medium" ? "border-yellow-500/40" : "border-green-500/40"}`}>
              <CardContent className="py-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {sevIcon(inter.severity)}
                  <Badge className={sevColor(inter.severity)}>{sevLabel(inter.severity)}</Badge>
                  <span className="text-sm font-semibold">{inter.drugA}</span>
                  <span className="text-xs text-muted-foreground">×</span>
                  <span className="text-sm font-semibold">{inter.drugB}</span>
                </div>

                <div className="text-sm text-muted-foreground leading-relaxed">
                  <strong>Mecanismo:</strong>{" "}
                  {inter.description.split(/(\b(?:CYP\w+|farmacocinética|farmacodinâmica|meia-vida|índice terapêutico)\b)/gi).map((part, i) => {
                    const key = Object.keys(PHARMACOLOGY_TERMS).find(k => k.toLowerCase() === part.toLowerCase());
                    if (key) {
                      return (
                        <Tooltip key={i}>
                          <TooltipTrigger asChild>
                            <span className="underline decoration-dotted cursor-help font-medium text-foreground">{part}</span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">{PHARMACOLOGY_TERMS[key]}</TooltipContent>
                        </Tooltip>
                      );
                    }
                    return <span key={i}>{part}</span>;
                  })}
                </div>

                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Fonte: {inter.source}
                </div>

                {inter.severity === "high" && (
                  <div className="rounded bg-red-500/10 p-2 text-xs text-red-600 dark:text-red-400 font-medium">
                    🔴 Conduta: Evitar associação. Risco de toxicidade severa ou risco de vida.
                  </div>
                )}
                {inter.severity === "medium" && (
                  <div className="rounded bg-yellow-500/10 p-2 text-xs text-yellow-700 dark:text-yellow-400 font-medium">
                    🟡 Conduta: Monitorar sinais clínicos e considerar ajuste de dose ou espaçamento.
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
