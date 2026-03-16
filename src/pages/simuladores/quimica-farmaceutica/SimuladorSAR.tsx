import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Sparkles, Loader2, FlaskConical, Eye } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getChallengesBySlug } from "@/data/simulatorChallenges";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SLUG = "sar-explorer";

interface SARCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; scaffold: string; drugClass: string };
  scenario: string;
  initialHalogen: number; initialOH: number; initialCH3: number; initialCF3: number;
  expectedPotencyRange: [number, number];
  clinicalTip: string;
}

const SCAFFOLDS = [
  { id: "benzodiazepine", name: "Benzodiazepínico", basePotency: 60, baseLogP: 2.5, baseSolubility: 40, baseSelectivity: 50 },
  { id: "sulfonamide", name: "Sulfonamida", basePotency: 45, baseLogP: 0.8, baseSolubility: 70, baseSelectivity: 60 },
  { id: "fluoroquinolone", name: "Fluoroquinolona", basePotency: 70, baseLogP: 1.2, baseSolubility: 55, baseSelectivity: 65 },
];

const BUILT_IN_CASES: SARCase[] = [
  {
    title: "Otimização de Diazepam – Potência Ansiolítica",
    difficulty: "Fácil",
    patient: { name: "Projeto SAR", scaffold: "benzodiazepine", drugClass: "Benzodiazepínicos" },
    scenario: "O diazepam é um benzodiazepínico clássico. Explore como substituintes halogenados na posição 7 e grupos lipofílicos alteram a potência (pIC50) e a seletividade para receptores GABA-A.",
    initialHalogen: 50, initialOH: 20, initialCH3: 30, initialCF3: 10,
    expectedPotencyRange: [70, 90],
    clinicalTip: "A adição de Cl na posição 7 do anel benzodiazepínico (como no clordiazepóxido→diazepam) aumenta a potência por interação hidrofóbica com o sítio alostérico.",
  },
  {
    title: "Sulfametoxazol – Otimização de Espectro",
    difficulty: "Médio",
    patient: { name: "Projeto Antibacteriano", scaffold: "sulfonamide", drugClass: "Sulfonamidas" },
    scenario: "As sulfonamidas são antimetabólitos que competem com o PABA. Manipule substituintes para otimizar a potência antibacteriana mantendo a solubilidade urinária.",
    initialHalogen: 20, initialOH: 40, initialCH3: 50, initialCF3: 20,
    expectedPotencyRange: [60, 80],
    clinicalTip: "Grupos metil e metóxi no anel heterocíclico das sulfonamidas aumentam a lipofilia e a penetração bacteriana, mas podem reduzir a solubilidade e causar cristalúria.",
  },
  {
    title: "Ciprofloxacino – Design de Fluoroquinolona",
    difficulty: "Difícil",
    patient: { name: "Projeto Anti-infeccioso", scaffold: "fluoroquinolone", drugClass: "Fluoroquinolonas" },
    scenario: "O flúor na posição 6 do ácido nalidíxico deu origem às fluoroquinolonas. Explore como CF₃, piperazina e ciclopropil alteram potência, espectro e farmacocinética.",
    initialHalogen: 70, initialOH: 10, initialCH3: 20, initialCF3: 60,
    expectedPotencyRange: [80, 95],
    clinicalTip: "O grupo ciclopropil (N1) + flúor (C6) + piperazina (C7) é a tríade que confere ao ciprofloxacino amplo espectro e excelente biodisponibilidade oral.",
  },
];

function computeSAR(scaffoldId: string, halogen: number, oh: number, ch3: number, cf3: number) {
  const scaffold = SCAFFOLDS.find(s => s.id === scaffoldId) || SCAFFOLDS[0];
  const potency = Math.min(100, scaffold.basePotency + halogen * 0.3 + cf3 * 0.2 - oh * 0.1 + ch3 * 0.1);
  const logP = Math.max(-1, Math.min(6, scaffold.baseLogP + halogen * 0.02 + ch3 * 0.015 + cf3 * 0.025 - oh * 0.03));
  const solubility = Math.max(5, Math.min(100, scaffold.baseSolubility - halogen * 0.2 - ch3 * 0.15 - cf3 * 0.1 + oh * 0.4));
  const selectivity = Math.max(10, Math.min(100, scaffold.baseSelectivity + cf3 * 0.15 + halogen * 0.1 - ch3 * 0.05));
  const pIC50 = 4 + potency * 0.06;
  const mw = 200 + halogen * 1.5 + oh * 0.5 + ch3 * 0.8 + cf3 * 2;
  return {
    potency: Math.round(potency),
    logP: Math.round(logP * 100) / 100,
    solubility: Math.round(solubility),
    selectivity: Math.round(selectivity),
    pIC50: Math.round(pIC50 * 100) / 100,
    mw: Math.round(mw),
    radarData: [
      { property: "Potência", value: Math.round(potency), fullMark: 100 },
      { property: "Lipofilia", value: Math.round(Math.min(100, logP * 16)), fullMark: 100 },
      { property: "Solubilidade", value: Math.round(solubility), fullMark: 100 },
      { property: "Seletividade", value: Math.round(selectivity), fullMark: 100 },
      { property: "MW score", value: Math.round(Math.max(0, 100 - (mw - 300) * 0.3)), fullMark: 100 },
    ],
    barData: [
      { name: "Halogen", contribution: Math.round(halogen * 0.3) },
      { name: "OH", contribution: Math.round(-oh * 0.1) },
      { name: "CH₃", contribution: Math.round(ch3 * 0.1) },
      { name: "CF₃", contribution: Math.round(cf3 * 0.2) },
    ],
  };
}

export default function SimuladorSAR() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<SARCase | null>(null);
  const [scaffoldId, setScaffoldId] = useState("benzodiazepine");
  const [halogen, setHalogen] = useState(50);
  const [oh, setOh] = useState(20);
  const [ch3, setCh3] = useState(30);
  const [cf3, setCf3] = useState(10);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [showFeedbackVR, setShowFeedbackVR] = useState(false);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI, patient: cd.patient, scenario: cd.scenario, initialHalogen: cd.initialHalogen ?? 50, initialOH: cd.initialOH ?? 20, initialCH3: cd.initialCH3 ?? 30, initialCF3: cd.initialCF3 ?? 10, expectedPotencyRange: cd.expectedPotencyRange ?? [60, 90], clinicalTip: cd.clinicalTip ?? "" });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) {
      setScaffoldId(activeCase.patient.scaffold || "benzodiazepine");
      setHalogen(activeCase.initialHalogen);
      setOh(activeCase.initialOH);
      setCh3(activeCase.initialCH3);
      setCf3(activeCase.initialCF3);
    }
  }, [activeCase]);

  const result = useMemo(() => computeSAR(scaffoldId, halogen, oh, ch3, cf3), [scaffoldId, halogen, oh, ch3, cf3]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const ok = result.potency >= activeCase.expectedPotencyRange[0] && result.potency <= activeCase.expectedPotencyRange[1];
    const s = ok ? 100 : 30;
    submitResults({ score: s, actions: { scaffoldId, halogen, oh, ch3, cf3, potency: result.potency } });
    return s;
  }, [activeCase, result, scaffoldId, halogen, oh, ch3, cf3, submitted, submitResults]);

  useEffect(() => {
    if (isVirtualRoom && challengeCompleted && !submitted && activeCase) {
      const score = handleFinish();
      setLastScore(typeof score === "number" ? score : 0);
    }
  }, [challengeCompleted]);

  useEffect(() => {
    if (isVirtualRoom && submitted) {
      const timer = setTimeout(() => navigate("/"), 15000);
      return () => clearTimeout(timer);
    }
  }, [isVirtualRoom, submitted, navigate]);

  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, initialHalogen: c.initialHalogen ?? 50, initialOH: c.initialOH ?? 20, initialCH3: c.initialCH3 ?? 30, initialCF3: c.initialCF3 ?? 10, expectedPotencyRange: c.expectedPotencyRange ?? [60, 90], clinicalTip: c.clinicalTip ?? "" });

  if (!activeCase) {
    if (isVirtualRoom) return <div className="p-8 text-center text-muted-foreground">Carregando caso da sala virtual...</div>;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Relação Estrutura-Atividade (SAR)</h1>
            <p className="text-muted-foreground">Manipule substituintes e observe alterações em potência, lipofilia e seletividade.</p>
            <AdminPromptViewer toolSlug="sim-sar-explorer" toolName="SAR Explorer" toolType="simulator" prompt={getNativePrompt("sim-sar-explorer") || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-primary" /> Casos de Estudo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {BUILT_IN_CASES.map((c, i) => (
              <NativeCaseCard key={i} caseItem={c} onClick={() => setActiveCase(c)} />
            ))}
            {aiCases.filter((c: any) => c.isAI).map((c: any) => (
              <AICaseCard key={c.id} caseItem={c} onClick={() => loadAICase(c)} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />
            ))}
            {!isVirtualRoom && <Button onClick={() => generateCase()} disabled={isGenerating} className="w-full gap-2 mt-2">{isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Gerar Caso com IA</Button>}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {examFeedback && <ExamFeedbackOverlay score={examFeedback.score} simulatorSlug={SLUG} caseTitle={examFeedback.caseTitle} examProgress={examProgress!} onProceed={proceedToNext} isFinalActivity={examFeedback.isFinalActivity} />}
      <ExamBanner simulatorSlug={SLUG} caseTitle={activeCase.title} examProgress={examProgress} />
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => isVirtualRoom ? navigate("/") : setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>
        <h2 className="text-xl font-bold">{activeCase.title}</h2>
        <Badge variant="outline">{activeCase.difficulty}</Badge>
      </div>
      <Card><CardContent className="pt-4 space-y-2">
        <p className="text-sm"><strong>Scaffold:</strong> {SCAFFOLDS.find(s => s.id === scaffoldId)?.name}</p>
        <p className="text-sm"><strong>Classe:</strong> {activeCase.patient.drugClass}</p>
        <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
      </CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Substituintes</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-2 block">Scaffold</label>
              <Select value={scaffoldId} onValueChange={setScaffoldId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SCAFFOLDS.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Halogen (F, Cl, Br)</label><span className="text-sm font-bold">{halogen}%</span></div><Slider value={[halogen]} onValueChange={([v]) => setHalogen(v)} min={0} max={100} step={5} /></div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Hidroxila (-OH)</label><span className="text-sm font-bold">{oh}%</span></div><Slider value={[oh]} onValueChange={([v]) => setOh(v)} min={0} max={100} step={5} /></div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Metil (-CH₃)</label><span className="text-sm font-bold">{ch3}%</span></div><Slider value={[ch3]} onValueChange={([v]) => setCh3(v)} min={0} max={100} step={5} /></div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Trifluormetil (-CF₃)</label><span className="text-sm font-bold">{cf3}%</span></div><Slider value={[cf3]} onValueChange={([v]) => setCf3(v)} min={0} max={100} step={5} /></div>
            {isVirtualRoom && submitted && !showFeedbackVR && (
              <Button onClick={() => setShowFeedbackVR(true)} variant="outline" className="w-full gap-2"><Eye className="h-4 w-4" /> Mostrar Resultados</Button>
            )}
            {isVirtualRoom && showFeedbackVR && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center space-y-2">
                <div className={`text-3xl font-bold ${lastScore >= 80 ? "text-green-600" : lastScore >= 50 ? "text-yellow-600" : "text-destructive"}`}>{lastScore}%</div>
                <p className="text-sm text-muted-foreground">{lastScore >= 80 ? "🏆 Excelente!" : lastScore >= 50 ? "📈 Bom, pode melhorar" : "⚠️ Revise os conceitos"}</p>
                <p className="text-xs text-muted-foreground">Redirecionando em 15s...</p>
              </div>
            )}
            {!isVirtualRoom && <Button variant="outline" onClick={() => handleFinish()} disabled={submitted} className="w-full">Finalizar Caso</Button>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Propriedades Moleculares</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">Potência</p><p className="text-2xl font-bold">{result.potency}%</p></div>
              <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">logP</p><p className="text-xl font-bold">{result.logP}</p></div>
              <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">pIC₅₀</p><p className="text-xl font-bold">{result.pIC50}</p></div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">Solubilidade</p><p className="text-xl font-bold">{result.solubility}%</p></div>
              <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">Seletividade</p><p className="text-xl font-bold">{result.selectivity}%</p></div>
              <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">MW</p><p className="text-xl font-bold">{result.mw}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Perfil Radar</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={result.radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="property" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <Radar name="Perfil" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Contribuição dos Substituintes</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={result.barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="contribution" name="Δ Potência" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</CardContent></Card>
      <SimulatorChallengeMode challengeSet={getChallengesBySlug(SLUG)} simulatorState={{ scaffoldId, halogen, oh, ch3, cf3, potency: result.potency, logP: result.logP, selectivity: result.selectivity }} onComplete={(score) => { setChallengeCompleted(true); setLastScore(score); }} />
    </div>
  );
}

