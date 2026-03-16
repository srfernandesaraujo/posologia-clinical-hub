import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Sparkles, Loader2, FlaskConical } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart, Scatter } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getHLBChallenges } from "@/data/simulatorChallenges";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SLUG = "hlb-emulsoes";

const OIL_PHASES = [
  { name: "Óleo mineral", hlbReq: 10.5 },
  { name: "Vaselina líquida", hlbReq: 10.0 },
  { name: "Lanolina anidra", hlbReq: 12.0 },
  { name: "Cera de abelha", hlbReq: 9.0 },
  { name: "Ácido esteárico", hlbReq: 15.0 },
  { name: "Miristato de isopropila", hlbReq: 11.5 },
];

const SURFACTANTS = [
  { name: "Span 20", hlb: 8.6 },
  { name: "Span 60", hlb: 4.7 },
  { name: "Span 80", hlb: 4.3 },
  { name: "Tween 20", hlb: 16.7 },
  { name: "Tween 60", hlb: 14.9 },
  { name: "Tween 80", hlb: 15.0 },
];

interface HLBCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; product: string; oilPhase: string };
  scenario: string;
  expectedHLBRange: [number, number];
  clinicalTip: string;
}

const BUILT_IN_CASES: HLBCase[] = [
  {
    title: "Creme O/A com Óleo Mineral",
    difficulty: "Fácil",
    patient: { name: "Farmácia Magistral", product: "Creme hidratante O/A", oilPhase: "Óleo mineral" },
    scenario: "Formule uma emulsão O/A estável usando óleo mineral (HLB requerido = 10.5). Combine Span 80 e Tween 80 para atingir o HLB alvo.",
    expectedHLBRange: [9.5, 11.5],
    clinicalTip: "Para emulsões O/A, o HLB do sistema de tensoativos deve coincidir com o HLB requerido pela fase oleosa (±1 unidade).",
  },
  {
    title: "Cold Cream (A/O) com Cera de Abelha",
    difficulty: "Médio",
    patient: { name: "Cosmético", product: "Cold cream A/O", oilPhase: "Cera de abelha" },
    scenario: "Emulsões A/O requerem HLB baixo (3-8). A cera de abelha tem HLB requerido = 9 para O/A, mas para A/O precisa de HLB ≈ 4-5. Ajuste os tensoativos.",
    expectedHLBRange: [3.5, 5.5],
    clinicalTip: "Para inverter de O/A para A/O, use tensoativos com HLB baixo (Span 60, 80). A proporção de fase oleosa >50% também favorece A/O.",
  },
  {
    title: "Emulsão Injetável – Lipídio e Lecitina",
    difficulty: "Difícil",
    patient: { name: "Indústria", product: "Emulsão lipídica IV", oilPhase: "Miristato de isopropila" },
    scenario: "Emulsões injetáveis exigem estabilidade excepcional (tamanho de gotícula <500 nm). O HLB ideal é crítico. Use lecitina de soja (HLB ~8) como tensoativo principal.",
    expectedHLBRange: [10.5, 12.5],
    clinicalTip: "Emulsões injetáveis usam lecitina (fosfolipídeo natural, HLB ≈ 8) e poloxamer 188 como co-emulsificante. A esterilização por autoclave requer revalidação da estabilidade.",
  },
];

function computeHLB(surfA: number, surfAhlb: number, surfB: number, surfBhlb: number) {
  const total = surfA + surfB;
  if (total === 0) return 0;
  return (surfA * surfAhlb + surfB * surfBhlb) / total;
}

function computeStabilityProfile(hlbReq: number) {
  const points = [];
  for (let hlb = 1; hlb <= 20; hlb += 0.5) {
    const diff = Math.abs(hlb - hlbReq);
    const stability = Math.max(0, 100 - diff * diff * 3);
    points.push({ hlb, stability: Math.round(stability * 10) / 10 });
  }
  return points;
}

export default function SimuladorHLB() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<HLBCase | null>(null);
  const [selectedOil, setSelectedOil] = useState(OIL_PHASES[0].name);
  const [surfAIdx, setSurfAIdx] = useState(2); // Span 80
  const [surfBIdx, setSurfBIdx] = useState(5); // Tween 80
  const [surfAPct, setSurfAPct] = useState(50);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase.case_data as any;
      setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.is_ai_generated, patient: cd.patient, scenario: cd.scenario, expectedHLBRange: cd.expectedHLBRange ?? [9, 12], clinicalTip: cd.clinicalTip ?? "" });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) {
      const oil = OIL_PHASES.find(o => o.name === activeCase.patient.oilPhase);
      if (oil) setSelectedOil(oil.name);
    }
  }, [activeCase]);

  const oil = OIL_PHASES.find(o => o.name === selectedOil) || OIL_PHASES[0];
  const surfA = SURFACTANTS[surfAIdx];
  const surfB = SURFACTANTS[surfBIdx];
  const hlbMix = useMemo(() => computeHLB(surfAPct, surfA.hlb, 100 - surfAPct, surfB.hlb), [surfAPct, surfA, surfB]);
  const stabilityData = useMemo(() => {
    const profile = computeStabilityProfile(oil.hlbReq);
    // Add a marker point for the current mix HLB
    const mixStability = Math.max(0, 100 - Math.pow(Math.abs(hlbMix - oil.hlbReq), 2) * 3);
    return profile.map(p => ({
      ...p,
      mixPoint: Math.abs(p.hlb - Math.round(hlbMix * 2) / 2) < 0.26 ? Math.round(mixStability * 10) / 10 : undefined,
    }));
  }, [oil, hlbMix]);
  const hlbDiff = Math.abs(hlbMix - oil.hlbReq);
  const stabilityPct = Math.max(0, 100 - hlbDiff * hlbDiff * 3);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return;
    const ok = hlbMix >= activeCase.expectedHLBRange[0] && hlbMix <= activeCase.expectedHLBRange[1];
    submitResults({ score: ok ? 100 : 30, actions: { selectedOil, surfA: surfA.name, surfB: surfB.name, surfAPct, hlbMix: Math.round(hlbMix * 10) / 10 } });
  }, [activeCase, hlbMix, selectedOil, surfA, surfB, surfAPct, submitted, submitResults]);

  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, expectedHLBRange: c.expectedHLBRange ?? [9, 12], clinicalTip: c.clinicalTip ?? "" });

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Equilíbrio HLB e Emulsões</h1>
            <p className="text-muted-foreground">Calcule o HLB de misturas de tensoativos e otimize a estabilidade de emulsões.</p>
            <AdminPromptViewer toolSlug="sim-hlb-emulsoes" toolName="HLB e Emulsões" toolType="simulator" prompt={getNativePrompt("sim-hlb-emulsoes") || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {BUILT_IN_CASES.map((c, i) => (
              <NativeCaseCard key={i} caseItem={c} onClick={() => setActiveCase(c)} />
            ))}
            {aiCases.filter((c: any) => c.isAI).map((c: any) => (
              <AICaseCard key={c.id} caseItem={c} onClick={() => loadAICase(c)} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />
            ))}
            <Button onClick={() => generateCase()} disabled={isGenerating} className="w-full gap-2 mt-2">{isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Gerar Caso com IA</Button>
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
        <Button variant="ghost" size="icon" onClick={() => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>
        <h2 className="text-xl font-bold">{activeCase.title}</h2>
        <Badge variant="outline">{activeCase.difficulty}</Badge>
      </div>
      <Card><CardContent className="pt-4 space-y-2">
        <p className="text-sm"><strong>Fase Oleosa:</strong> {oil.name} (HLB requerido = {oil.hlbReq})</p>
        <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
      </CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Sistema de Tensoativos</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-2 block">Fase Oleosa</label>
              <Select value={selectedOil} onValueChange={setSelectedOil}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{OIL_PHASES.map(o => <SelectItem key={o.name} value={o.name}>{o.name} (HLB req = {o.hlbReq})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Tensoativo A</label>
              <Select value={String(surfAIdx)} onValueChange={v => setSurfAIdx(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SURFACTANTS.map((s, i) => <SelectItem key={i} value={String(i)}>{s.name} (HLB = {s.hlb})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Tensoativo B</label>
              <Select value={String(surfBIdx)} onValueChange={v => setSurfBIdx(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SURFACTANTS.map((s, i) => <SelectItem key={i} value={String(i)}>{s.name} (HLB = {s.hlb})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">% Tensoativo A na mistura</label><span className="text-sm font-bold">{surfAPct}%</span></div><Slider value={[surfAPct]} onValueChange={([v]) => setSurfAPct(v)} min={0} max={100} step={5} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">HLB Mistura</p><p className={`text-2xl font-bold ${hlbDiff < 1 ? "text-green-600" : hlbDiff < 2 ? "text-yellow-600" : "text-destructive"}`}>{Math.round(hlbMix * 10) / 10}</p></div>
              <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">HLB Requerido</p><p className="text-2xl font-bold">{oil.hlbReq}</p></div>
              <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">Estabilidade</p><p className={`text-2xl font-bold ${stabilityPct > 80 ? "text-green-600" : stabilityPct > 50 ? "text-yellow-600" : "text-destructive"}`}>{Math.round(stabilityPct)}%</p></div>
            </div>
            <Button variant="outline" onClick={handleFinish} disabled={submitted} className="w-full">Finalizar Caso</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Estabilidade vs HLB</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={stabilityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hlb" label={{ value: "HLB", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 110]} label={{ value: "Estabilidade (%)", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Area type="monotone" dataKey="stability" name="Estabilidade" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                <Scatter dataKey="mixPoint" name="HLB Atual" fill="hsl(var(--destructive))" r={6} />
                <ReferenceLine x={Math.round(hlbMix * 2) / 2} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: `Mix=${Math.round(hlbMix * 10) / 10}`, fill: "hsl(var(--destructive))", position: "top" }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica Clínica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p></CardContent></Card>
      <SimulatorChallengeMode challengeSet={getHLBChallenges()} simulatorState={{ hlbMix, selectedOil }} />
    </div>
  );
}
