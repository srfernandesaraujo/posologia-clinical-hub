import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Sparkles, Loader2, FlaskConical } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { AdminCaseActions } from "@/components/AdminCaseActions";
import { CaseCardMeta } from "@/components/CaseCardMeta";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getCineticaAvancadaChallenges } from "@/data/simulatorChallenges";

const SLUG = "cinetica-avancada";

interface KineticsCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  initialVmax: number; initialKm: number;
  inhibitorType: string;
  expectedKmApp: [number, number];
  expectedVmaxApp: [number, number];
  clinicalTip: string;
}

const BUILT_IN_CASES: KineticsCase[] = [
  {
    title: "Inibição Competitiva — Metotrexato",
    difficulty: "Fácil",
    patient: { name: "Clara Nunes", age: 45, weight: 65, diagnosis: "Artrite reumatoide em tratamento com metotrexato" },
    scenario: "O metotrexato é um inibidor competitivo da di-hidrofolato redutase. Adicione o inibidor e observe o aumento do Km aparente sem alteração do Vmax.",
    initialVmax: 100, initialKm: 10, inhibitorType: "competitive",
    expectedKmApp: [15, 40], expectedVmaxApp: [95, 105],
    clinicalTip: "Na inibição competitiva, o inibidor compete pelo sítio ativo. Km↑ (menor afinidade aparente), Vmax inalterado (saturação de substrato ultrapassa a inibição).",
  },
  {
    title: "Inibição Não-Competitiva — Metais Pesados",
    difficulty: "Médio",
    patient: { name: "António Pereira", age: 50, weight: 80, diagnosis: "Intoxicação por chumbo" },
    scenario: "O chumbo liga-se a sítios alostéricos de várias enzimas. Observe a diminuição do Vmax com Km inalterado.",
    initialVmax: 100, initialKm: 10, inhibitorType: "noncompetitive",
    expectedKmApp: [8, 12], expectedVmaxApp: [40, 75],
    clinicalTip: "Na inibição não-competitiva, o inibidor liga-se a um sítio diferente do ativo. Vmax↓ (menos enzima funcional), Km inalterado.",
  },
  {
    title: "Inibição Acompetitiva — Lítio na GSK-3",
    difficulty: "Difícil",
    patient: { name: "Sofia Cardoso", age: 35, weight: 58, diagnosis: "Transtorno bipolar em tratamento com lítio" },
    scenario: "O lítio inibe acompetitivamente a GSK-3β. Tanto o Km como o Vmax diminuem proporcionalmente. Analise os gráficos de Lineweaver-Burk.",
    initialVmax: 100, initialKm: 10, inhibitorType: "uncompetitive",
    expectedKmApp: [4, 8], expectedVmaxApp: [40, 75],
    clinicalTip: "Na inibição acompetitiva, o inibidor liga-se apenas ao complexo ES. Km↓ e Vmax↓ proporcionalmente. No gráfico de Lineweaver-Burk, linhas paralelas.",
  },
];

type InhibitorType = "none" | "competitive" | "noncompetitive" | "uncompetitive";

function computeKinetics(vmax: number, km: number, inhibitorType: InhibitorType, inhibitorConc: number, ki: number) {
  const alpha = inhibitorType === "competitive" ? 1 + inhibitorConc / ki : 1;
  const alphaPrime = inhibitorType === "uncompetitive" ? 1 + inhibitorConc / ki : 1;
  const nonCompFactor = inhibitorType === "noncompetitive" ? 1 / (1 + inhibitorConc / ki) : 1;

  const kmApp = km * alpha / alphaPrime;
  const vmaxApp = inhibitorType === "noncompetitive" ? vmax * nonCompFactor :
    inhibitorType === "uncompetitive" ? vmax / alphaPrime : vmax;

  // Generate Michaelis-Menten curve
  const mmData = [];
  const lwbData = [];
  for (let s = 0.5; s <= 100; s += 0.5) {
    const vNoInhib = (vmax * s) / (km + s);
    const v = (vmaxApp * s) / (kmApp + s);
    mmData.push({ s: +s.toFixed(1), v: +v.toFixed(2), vRef: +vNoInhib.toFixed(2) });
  }

  // Lineweaver-Burk (1/V vs 1/[S])
  for (let s = 2; s <= 100; s += 2) {
    const invS = +(1 / s).toFixed(4);
    const vNoInhib = (vmax * s) / (km + s);
    const v = (vmaxApp * s) / (kmApp + s);
    lwbData.push({ invS, invV: +(1 / v).toFixed(4), invVRef: +(1 / vNoInhib).toFixed(4) });
  }

  return { kmApp: +kmApp.toFixed(1), vmaxApp: +vmaxApp.toFixed(1), mmData, lwbData };
}

export default function SimuladorCineticaAvancada() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<KineticsCase | null>(null);
  const [vmax, setVmax] = useState(100);
  const [km, setKm] = useState(10);
  const [inhibitorType, setInhibitorType] = useState<InhibitorType>("none");
  const [inhibitorConc, setInhibitorConc] = useState(0);
  const [ki, setKi] = useState(5);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase.case_data as any;
      setActiveCase({
        id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.is_ai_generated,
        patient: cd.patient, scenario: cd.scenario, initialVmax: cd.initialVmax ?? 100, initialKm: cd.initialKm ?? 10,
        inhibitorType: cd.inhibitorType ?? "none",
        expectedKmApp: cd.expectedKmApp ?? [8, 12], expectedVmaxApp: cd.expectedVmaxApp ?? [90, 110],
        clinicalTip: cd.clinicalTip ?? "",
      });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) {
      setVmax(activeCase.initialVmax); setKm(activeCase.initialKm);
      setInhibitorType(activeCase.inhibitorType as InhibitorType);
      setInhibitorConc(activeCase.inhibitorType !== "none" ? 5 : 0);
      setKi(5);
    }
  }, [activeCase]);

  const outputs = useMemo(() => computeKinetics(vmax, km, inhibitorType, inhibitorConc, ki), [vmax, km, inhibitorType, inhibitorConc, ki]);

  const handleFinish = useCallback(() => {
    if (!activeCase) return;
    const kmOk = outputs.kmApp >= activeCase.expectedKmApp[0] && outputs.kmApp <= activeCase.expectedKmApp[1];
    const vmOk = outputs.vmaxApp >= activeCase.expectedVmaxApp[0] && outputs.vmaxApp <= activeCase.expectedVmaxApp[1];
    const s = (kmOk ? 50 : 0) + (vmOk ? 50 : 0);
    if (submitted) return;
    submitResults({ score: s, actions: { vmax, km, inhibitorType, inhibitorConc, ki, kmApp: outputs.kmApp, vmaxApp: outputs.vmaxApp } });
  }, [activeCase, outputs, vmax, km, inhibitorType, inhibitorConc, ki, submitted, submitResults]);

  const loadAICase = (c: any) => {
    setActiveCase({
      id: c.id, title: c.title, difficulty: c.difficulty, isAI: true,
      patient: c.patient, scenario: c.scenario, initialVmax: c.initialVmax ?? 100, initialKm: c.initialKm ?? 10,
      inhibitorType: c.inhibitorType ?? "none",
      expectedKmApp: c.expectedKmApp ?? [8, 12], expectedVmaxApp: c.expectedVmaxApp ?? [90, 110],
      clinicalTip: c.clinicalTip ?? "",
    });
  };

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Cinética Enzimática Avançada</h1>
            <p className="text-muted-foreground">Michaelis-Menten, Lineweaver-Burk e inibição competitiva, não-competitiva e acompetitiva.</p>
            <AdminPromptViewer toolSlug="sim-cinetica-avancada" toolName="Cinética Enzimática Avançada" toolType="simulator" prompt={getNativePrompt("sim-cinetica-avancada") || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {BUILT_IN_CASES.map((c, i) => (
              <button key={i} onClick={() => setActiveCase(c)} className="w-full text-left p-4 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-colors">
                <div className="flex items-center justify-between mb-1"><span className="font-semibold">{c.title}</span><Badge variant="outline">{c.difficulty}</Badge></div>
                <p className="text-sm text-muted-foreground">{c.patient.diagnosis}</p>
              </button>
            ))}
            {aiCases.filter((c: any) => c.isAI).map((c: any) => (
              <button key={c.id} onClick={() => loadAICase(c)} className="w-full text-left p-4 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-colors">
                <div className="flex items-center justify-between mb-1"><span className="font-semibold">{c.title}</span><div className="flex gap-2"><Badge variant="secondary">IA</Badge><Badge variant="outline">{c.difficulty}</Badge></div></div>
                <AdminCaseActions caseItem={c} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} />
              </button>
            ))}
            <Button onClick={() => generateCase()} disabled={isGenerating} className="w-full gap-2 mt-2">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Gerar Caso com IA
            </Button>
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

      <Card>
        <CardContent className="pt-4 space-y-2">
          <p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age} anos, {activeCase.patient.weight} kg</p>
          <p className="text-sm"><strong>Diagnóstico:</strong> {activeCase.patient.diagnosis}</p>
          <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Parâmetros Enzimáticos</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex justify-between mb-2"><label className="text-sm font-medium">Vmax</label><span className="text-sm font-bold">{vmax} µmol/min</span></div>
              <Slider value={[vmax]} onValueChange={([v]) => setVmax(v)} min={10} max={200} step={5} />
            </div>
            <div>
              <div className="flex justify-between mb-2"><label className="text-sm font-medium">Km</label><span className="text-sm font-bold">{km} mM</span></div>
              <Slider value={[km]} onValueChange={([v]) => setKm(v)} min={1} max={50} step={1} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Tipo de Inibidor</label>
              <Select value={inhibitorType} onValueChange={(v) => setInhibitorType(v as InhibitorType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem Inibidor</SelectItem>
                  <SelectItem value="competitive">Competitivo</SelectItem>
                  <SelectItem value="noncompetitive">Não-Competitivo</SelectItem>
                  <SelectItem value="uncompetitive">Acompetitivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {inhibitorType !== "none" && (
              <>
                <div>
                  <div className="flex justify-between mb-2"><label className="text-sm font-medium text-destructive">[Inibidor]</label><span className="text-sm font-bold">{inhibitorConc} mM</span></div>
                  <Slider value={[inhibitorConc]} onValueChange={([v]) => setInhibitorConc(v)} min={0} max={30} step={0.5} />
                </div>
                <div>
                  <div className="flex justify-between mb-2"><label className="text-sm font-medium">Ki</label><span className="text-sm font-bold">{ki} mM</span></div>
                  <Slider value={[ki]} onValueChange={([v]) => setKi(v)} min={0.5} max={20} step={0.5} />
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted text-center">
                <p className="text-xs text-muted-foreground">Km aparente</p>
                <p className="text-2xl font-bold">{outputs.kmApp}</p>
                <p className="text-xs text-muted-foreground">mM</p>
              </div>
              <div className="p-3 rounded-lg bg-muted text-center">
                <p className="text-xs text-muted-foreground">Vmax aparente</p>
                <p className="text-2xl font-bold">{outputs.vmaxApp}</p>
                <p className="text-xs text-muted-foreground">µmol/min</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleFinish} disabled={submitted} className="w-full">Finalizar</Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Michaelis-Menten</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={outputs.mmData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="s" label={{ value: "[S] (mM)", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis label={{ value: "V (µmol/min)", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                  <Line dataKey="vRef" name="Sem inibidor" stroke="hsl(var(--muted-foreground))" dot={false} strokeWidth={1} strokeDasharray="5 5" />
                  <Line dataKey="v" name="Com inibidor" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Lineweaver-Burk (Duplo Recíproco)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={outputs.lwbData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="invS" label={{ value: "1/[S]", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis label={{ value: "1/V", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                  <Line dataKey="invVRef" name="Sem inibidor" stroke="hsl(var(--muted-foreground))" dot={false} strokeWidth={1} strokeDasharray="5 5" />
                  <Line dataKey="invV" name="Com inibidor" stroke="hsl(var(--destructive))" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold mb-1">💡 Dica Clínica</p>
          <p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p>
        </CardContent>
      </Card>

      <SimulatorChallengeMode
        challengeSet={getCineticaAvancadaChallenges()}
        simulatorState={{ vmax, km, inhibitorType, inhibitorConc, ki }}
      />
    </div>
  );
}
