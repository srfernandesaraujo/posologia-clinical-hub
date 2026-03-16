import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Sparkles, Loader2, FlaskConical } from "lucide-react";
import VirtualRoomSubmitButton from "@/components/simulators/VirtualRoomSubmitButton";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getChallengesBySlug } from "@/data/simulatorChallenges";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SLUG = "docking-simplificado";

const TARGETS = [
  { id: "cox2", name: "COX-2 (Ciclo-oxigenase 2)", optimalDist: 3.2 },
  { id: "ace", name: "ECA (Enzima Conversora de Angiotensina)", optimalDist: 2.8 },
  { id: "hiv_protease", name: "HIV Protease", optimalDist: 3.0 },
  { id: "beta2", name: "Receptor β₂-adrenérgico", optimalDist: 3.5 },
];

const INTERACTIONS = [
  { id: "hbond", name: "Ligação H", strength: -2.5, range: [2.5, 3.5] },
  { id: "ionic", name: "Iônica", strength: -4.0, range: [2.0, 3.5] },
  { id: "vdw", name: "van der Waals", strength: -0.5, range: [3.0, 4.5] },
  { id: "pipi", name: "π-π Stacking", strength: -1.5, range: [3.3, 4.0] },
  { id: "hydrophobic", name: "Hidrofóbica", strength: -1.0, range: [3.5, 5.0] },
];

interface DockCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; target: string; drug: string };
  scenario: string; initialTarget: string; initialDistance: number;
  expectedDeltaGRange: [number, number]; clinicalTip: string;
}

const BUILT_IN_CASES: DockCase[] = [
  {
    title: "Celecoxibe no Sítio da COX-2",
    difficulty: "Fácil",
    patient: { name: "AINE Design", target: "COX-2", drug: "Celecoxibe" },
    scenario: "O celecoxibe se liga seletivamente ao sítio da COX-2 (bolsa lateral). Ajuste a distância e os tipos de interação para maximizar a afinidade (ΔG mais negativo).",
    initialTarget: "cox2", initialDistance: 4.0,
    expectedDeltaGRange: [-12, -8],
    clinicalTip: "A sulfonamida do celecoxibe penetra na bolsa lateral da COX-2 (Arg513, Val523), formando ligações H e interações hidrofóbicas que conferem seletividade COX-2/COX-1 > 300.",
  },
  {
    title: "Enalaprilato na ECA – Coordenação com Zinco",
    difficulty: "Médio",
    patient: { name: "IECA Design", target: "ECA", drug: "Enalaprilato" },
    scenario: "O enalaprilato coordena o Zn²⁺ catalítico da ECA. A distância ligante-Zn é crítica. Explore como interações iônicas e ligações H estabilizam o complexo.",
    initialTarget: "ace", initialDistance: 3.5,
    expectedDeltaGRange: [-15, -10],
    clinicalTip: "O grupo carboxilato do enalaprilato coordena o Zn²⁺ a ~2.0 Å. A interação iônica contribui com -4 a -6 kcal/mol para o ΔG total.",
  },
  {
    title: "Saquinavir na HIV Protease – Design Peptidomimético",
    difficulty: "Difícil",
    patient: { name: "Antirretroviral", target: "HIV Protease", drug: "Saquinavir" },
    scenario: "O saquinavir é um peptidomimético que explora ligações H com Asp25/25' catalíticos. Otimize a pose para máxima afinidade com múltiplos tipos de interação.",
    initialTarget: "hiv_protease", initialDistance: 3.2,
    expectedDeltaGRange: [-14, -10],
    clinicalTip: "O hidroxil do saquinavir forma ligação H bidentada com Asp25 e Asp25' (H₂O catalítica). Análogos com grupos mais rígidos (ritonavir) ganharam potência por efeito entrópico.",
  },
];

function computeDocking(targetId: string, distance: number, activeInteractions: string[]) {
  const target = TARGETS.find(t => t.id === targetId) || TARGETS[0];
  let deltaG = 0;
  const interactionContributions: Array<{ name: string; contribution: number }> = [];

  for (const intId of activeInteractions) {
    const interaction = INTERACTIONS.find(i => i.id === intId);
    if (!interaction) continue;
    const [rMin, rMax] = interaction.range;
    let factor = 0;
    if (distance >= rMin && distance <= rMax) {
      const optDist = (rMin + rMax) / 2;
      factor = 1 - Math.abs(distance - optDist) / (rMax - rMin);
    }
    const contrib = interaction.strength * Math.max(0, factor);
    deltaG += contrib;
    interactionContributions.push({ name: interaction.name, contribution: Math.round(contrib * 100) / 100 });
  }

  // Distance penalty
  const distPenalty = Math.abs(distance - target.optimalDist) * 1.5;
  deltaG -= distPenalty > 0 ? -distPenalty : 0;
  deltaG += distPenalty > 2 ? distPenalty * 0.5 : 0;

  const Ki = Math.exp(deltaG / (0.00198 * 310)); // simplified
  const energyVsDistance = [];
  for (let d = 1.5; d <= 6; d += 0.1) {
    let e = 0;
    for (const intId of activeInteractions) {
      const interaction = INTERACTIONS.find(i => i.id === intId);
      if (!interaction) continue;
      const [rMin, rMax] = interaction.range;
      if (d >= rMin && d <= rMax) {
        const optDist = (rMin + rMax) / 2;
        e += interaction.strength * (1 - Math.abs(d - optDist) / (rMax - rMin));
      }
      if (d < rMin) e += (rMin - d) * 5; // repulsion
    }
    energyVsDistance.push({ distance: Math.round(d * 10) / 10, energy: Math.round(e * 100) / 100 });
  }

  return {
    deltaG: Math.round(deltaG * 100) / 100,
    Ki: Ki > 0 ? Ki.toExponential(2) : "N/A",
    interactionContributions,
    energyVsDistance,
  };
}

export default function SimuladorDocking() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<DockCase | null>(null);
  const [targetId, setTargetId] = useState("cox2");
  const [distance, setDistance] = useState(3.5);
  const [activeInter, setActiveInter] = useState<string[]>(["hbond", "hydrophobic"]);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI, patient: cd.patient, scenario: cd.scenario, initialTarget: cd.initialTarget ?? "cox2", initialDistance: cd.initialDistance ?? 3.5, expectedDeltaGRange: cd.expectedDeltaGRange ?? [-12, -8], clinicalTip: cd.clinicalTip ?? "" });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) { setTargetId(activeCase.initialTarget); setDistance(activeCase.initialDistance); }
  }, [activeCase]);

  const result = useMemo(() => computeDocking(targetId, distance, activeInter), [targetId, distance, activeInter]);

  const toggleInteraction = (id: string) => {
    setActiveInter(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const ok = result.deltaG >= activeCase.expectedDeltaGRange[0] && result.deltaG <= activeCase.expectedDeltaGRange[1];
    const s = ok ? 100 : 30;
    submitResults({ score: s, actions: { targetId, distance, activeInter, deltaG: result.deltaG } });
    return s;
  }, [activeCase, result, targetId, distance, activeInter, submitted, submitResults]);

  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, initialTarget: c.initialTarget ?? "cox2", initialDistance: c.initialDistance ?? 3.5, expectedDeltaGRange: c.expectedDeltaGRange ?? [-12, -8], clinicalTip: c.clinicalTip ?? "" });

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Interação Fármaco-Receptor (Docking)</h1>
            <p className="text-muted-foreground">Simule interações moleculares e energia de ligação.</p>
            <AdminPromptViewer toolSlug="sim-docking-simplificado" toolName="Docking Simplificado" toolType="simulator" prompt={getNativePrompt("sim-docking-simplificado") || ""} />
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
      <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">{activeCase.scenario}</p></CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Parâmetros de Docking</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-2 block">Alvo Molecular</label>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TARGETS.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Distância Ligante-Receptor (Å)</label><span className="text-sm font-bold">{distance} Å</span></div><Slider value={[distance * 10]} onValueChange={([v]) => setDistance(v / 10)} min={15} max={60} step={1} /></div>
            <div>
              <label className="text-sm font-medium mb-2 block">Interações Ativas</label>
              <div className="flex flex-wrap gap-2">
                {INTERACTIONS.map(i => (
                  <button key={i.id} onClick={() => toggleInteraction(i.id)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeInter.includes(i.id) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {i.name}
                  </button>
                ))}
              </div>
            </div>
            <VirtualRoomSubmitButton isVirtualRoom={isVirtualRoom} submitted={submitted} onSubmit={handleFinish} fallbackLabel="Finalizar Caso" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Resultados</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className={`p-3 rounded-lg text-center ${result.deltaG < -8 ? 'bg-primary/10' : 'bg-muted'}`}><p className="text-xs text-muted-foreground">ΔG (kcal/mol)</p><p className="text-2xl font-bold">{result.deltaG}</p></div>
              <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">Ki (estimado)</p><p className="text-sm font-bold">{result.Ki}</p></div>
            </div>
            <h4 className="text-sm font-medium mb-2">Contribuições por Interação</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={result.interactionContributions} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="name" width={120} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="contribution" name="ΔG (kcal/mol)" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Energia vs Distância (Å)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={result.energyVsDistance}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="distance" label={{ value: "Distância (Å)", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis label={{ value: "Energia (kcal/mol)", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Line type="monotone" dataKey="energy" name="Energia" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p></CardContent></Card>
      <SimulatorChallengeMode challengeSet={getChallengesBySlug(SLUG)} simulatorState={{ targetId, distance, activeInter, deltaG: result.deltaG }} />
    </div>
  );
}
