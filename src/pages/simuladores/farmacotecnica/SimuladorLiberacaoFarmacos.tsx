import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Sparkles, Loader2, FlaskConical } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { AdminCaseActions } from "@/components/AdminCaseActions";
import { CaseCardMeta } from "@/components/CaseCardMeta";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getLiberacaoFarmacosChallenges } from "@/data/simulatorChallenges";

const SLUG = "liberacao-farmacos";

interface ReleaseCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; product: string; activeIngredient: string };
  scenario: string;
  initialCoating: number; initialParticleSize: number;
  expectedT80Range: [number, number];
  clinicalTip: string;
}

const BUILT_IN_CASES: ReleaseCase[] = [
  {
    title: "Omeprazol Entérico vs Liberação Imediata",
    difficulty: "Fácil",
    patient: { name: "Farmácia Ensino", product: "Cápsulas de omeprazol 20 mg", activeIngredient: "Omeprazol" },
    scenario: "Compare o perfil de liberação de omeprazol com revestimento entérico (resistente ao pH gástrico) versus liberação imediata. Observe o lag-time na formulação entérica.",
    initialCoating: 50, initialParticleSize: 50,
    expectedT80Range: [4, 10],
    clinicalTip: "O omeprazol é degradado em pH ácido. O revestimento entérico protege o fármaco até pH > 5.5 no duodeno, resultando em lag-time de 1-2h.",
  },
  {
    title: "Nifedipino OROS – Liberação Prolongada",
    difficulty: "Médio",
    patient: { name: "Controle de Qualidade", product: "Comprimido OROS nifedipino 30 mg", activeIngredient: "Nifedipino" },
    scenario: "O sistema OROS libera nifedipino por pressão osmótica (cinética de ordem zero). Compare com liberação convencional (Higuchi).",
    initialCoating: 70, initialParticleSize: 30,
    expectedT80Range: [12, 20],
    clinicalTip: "Sistemas osmóticos (OROS) oferecem cinética de ordem zero ideal: concentração plasmática constante sem picos e vales.",
  },
  {
    title: "Patch Transdérmico de Fentanil",
    difficulty: "Difícil",
    patient: { name: "Indústria Farmacêutica", product: "Patch transdérmico de fentanil 50 µg/h", activeIngredient: "Fentanil" },
    scenario: "O sistema transdérmico de fentanil libera por difusão através de membrana controladora. Modele a influência da espessura da membrana e área do patch no perfil.",
    initialCoating: 80, initialParticleSize: 40,
    expectedT80Range: [48, 72],
    clinicalTip: "Patches de fentanil atingem estado estacionário em 12-24h. A absorção depende da perfusão cutânea, temperatura corporal e espessura da pele.",
  },
];

function computeRelease(coating: number, particleSize: number, showImmediate: boolean, showProlonged: boolean, showEnteric: boolean, showPulsatile: boolean, showTransdermal: boolean) {
  const points = [];
  for (let t = 0; t <= 24; t += 0.5) {
    const entry: any = { hour: t };
    // Immediate: Higuchi-like fast
    if (showImmediate) {
      const kI = (100 - particleSize) / 50 + 1;
      entry.imediata = Math.min(100, Math.round(100 * (1 - Math.exp(-kI * t)) * 100) / 100);
    }
    // Prolonged: zero-order-like
    if (showProlonged) {
      const rate = (100 - coating) / 100 * 8;
      entry.prolongada = Math.min(100, Math.round(rate * t * 100) / 100);
    }
    // Enteric: lag + burst
    if (showEnteric) {
      const lag = coating / 30;
      entry.enterica = t < lag ? 0 : Math.min(100, Math.round(100 * (1 - Math.exp(-1.5 * (t - lag))) * 100) / 100);
    }
    // Pulsatile: two pulses
    if (showPulsatile) {
      const p1 = 50 * (1 - Math.exp(-2 * t));
      const p2 = t > 6 ? 50 * (1 - Math.exp(-2 * (t - 6))) : 0;
      entry.pulsatil = Math.min(100, Math.round((p1 + p2) * 100) / 100);
    }
    // Transdermal: slow steady
    if (showTransdermal) {
      const kT = (100 - coating) / 100 * 3;
      entry.transdermica = Math.min(100, Math.round(100 * (1 - Math.exp(-kT * t / 10)) * 100) / 100);
    }
    points.push(entry);
  }
  return points;
}

export default function SimuladorLiberacaoFarmacos() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<ReleaseCase | null>(null);
  const [coating, setCoating] = useState(50);
  const [particleSize, setParticleSize] = useState(50);
  const [showImmediate, setShowImmediate] = useState(true);
  const [showProlonged, setShowProlonged] = useState(true);
  const [showEnteric, setShowEnteric] = useState(false);
  const [showPulsatile, setShowPulsatile] = useState(false);
  const [showTransdermal, setShowTransdermal] = useState(false);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase.case_data as any;
      setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.is_ai_generated, patient: cd.patient, scenario: cd.scenario, initialCoating: cd.initialCoating ?? 50, initialParticleSize: cd.initialParticleSize ?? 50, expectedT80Range: cd.expectedT80Range ?? [4, 12], clinicalTip: cd.clinicalTip ?? "" });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) { setCoating(activeCase.initialCoating); setParticleSize(activeCase.initialParticleSize); }
  }, [activeCase]);

  const points = useMemo(() => computeRelease(coating, particleSize, showImmediate, showProlonged, showEnteric, showPulsatile, showTransdermal), [coating, particleSize, showImmediate, showProlonged, showEnteric, showPulsatile, showTransdermal]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return;
    submitResults({ score: 80, actions: { coating, particleSize, showImmediate, showProlonged, showEnteric, showPulsatile, showTransdermal } });
  }, [activeCase, coating, particleSize, showImmediate, showProlonged, showEnteric, showPulsatile, showTransdermal, submitted, submitResults]);

  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, initialCoating: c.initialCoating ?? 50, initialParticleSize: c.initialParticleSize ?? 50, expectedT80Range: c.expectedT80Range ?? [4, 12], clinicalTip: c.clinicalTip ?? "" });

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Sistemas de Liberação de Fármacos</h1>
            <p className="text-muted-foreground">Compare perfis: imediata, prolongada, entérica, pulsátil e transdérmica.</p>
            <AdminPromptViewer toolSlug="sim-liberacao-farmacos" toolName="Liberação de Fármacos" toolType="simulator" prompt={getNativePrompt("sim-liberacao-farmacos") || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {BUILT_IN_CASES.map((c, i) => (
              <button key={i} onClick={() => setActiveCase(c)} className="w-full text-left p-4 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-colors">
                <div className="flex items-center justify-between mb-1"><span className="font-semibold">{c.title}</span><Badge variant="outline">{c.difficulty}</Badge></div>
                <p className="text-sm text-muted-foreground">{c.patient.product}</p>
              </button>
            ))}
            {aiCases.filter((c: any) => c.isAI).map((c: any) => (
              <button key={c.id} onClick={() => loadAICase(c)} className="w-full text-left p-4 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-colors">
                <div className="flex items-center justify-between mb-1"><span className="font-semibold">{c.title}</span><div className="flex gap-2"><Badge variant="secondary">IA</Badge><Badge variant="outline">{c.difficulty}</Badge></div></div>
                <AdminCaseActions caseItem={c} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} />
              </button>
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
        <p className="text-sm"><strong>Produto:</strong> {activeCase.patient.product}</p>
        <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
      </CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Parâmetros da Formulação</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Espessura do Revestimento</label><span className="text-sm font-bold">{coating}%</span></div><Slider value={[coating]} onValueChange={([v]) => setCoating(v)} min={0} max={100} step={5} /></div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Tamanho de Partícula</label><span className="text-sm font-bold">{particleSize}%</span></div><Slider value={[particleSize]} onValueChange={([v]) => setParticleSize(v)} min={10} max={100} step={5} /></div>
            <div className="border rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold">Perfis de Liberação</p>
              <div className="flex items-center justify-between"><label className="text-sm">Imediata</label><Switch checked={showImmediate} onCheckedChange={setShowImmediate} /></div>
              <div className="flex items-center justify-between"><label className="text-sm">Prolongada (ordem zero)</label><Switch checked={showProlonged} onCheckedChange={setShowProlonged} /></div>
              <div className="flex items-center justify-between"><label className="text-sm">Entérica (lag-time)</label><Switch checked={showEnteric} onCheckedChange={setShowEnteric} /></div>
              <div className="flex items-center justify-between"><label className="text-sm">Pulsátil</label><Switch checked={showPulsatile} onCheckedChange={setShowPulsatile} /></div>
              <div className="flex items-center justify-between"><label className="text-sm">Transdérmica</label><Switch checked={showTransdermal} onCheckedChange={setShowTransdermal} /></div>
            </div>
            <Button variant="outline" onClick={handleFinish} disabled={submitted} className="w-full">Finalizar Caso</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Curvas de Dissolução</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={points}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" label={{ value: "Horas", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 110]} label={{ value: "% Liberada", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                {showImmediate && <Line type="monotone" dataKey="imediata" name="Imediata" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />}
                {showProlonged && <Line type="monotone" dataKey="prolongada" name="Prolongada" stroke="hsl(var(--chart-2))" dot={false} strokeWidth={2} />}
                {showEnteric && <Line type="monotone" dataKey="enterica" name="Entérica" stroke="hsl(var(--chart-3))" dot={false} strokeWidth={2} />}
                {showPulsatile && <Line type="monotone" dataKey="pulsatil" name="Pulsátil" stroke="hsl(var(--chart-4))" dot={false} strokeWidth={2} />}
                {showTransdermal && <Line type="monotone" dataKey="transdermica" name="Transdérmica" stroke="hsl(var(--chart-5))" dot={false} strokeWidth={2} />}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica Clínica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p></CardContent></Card>
      <SimulatorChallengeMode challengeSet={getLiberacaoFarmacosChallenges()} simulatorState={{ coating, particleSize }} />
    </div>
  );
}
