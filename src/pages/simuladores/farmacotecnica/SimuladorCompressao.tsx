import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Sparkles, Loader2, FlaskConical, Send, Eye } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getCompressaoChallenges } from "@/data/simulatorChallenges";

const SLUG = "compressao";

interface CompCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; product: string; context: string };
  scenario: string;
  initialForce: number; initialGranuleSize: number; initialLubricant: number;
  expectedHardnessRange: [number, number];
  clinicalTip: string;
}

const BUILT_IN_CASES: CompCase[] = [
  {
    title: "Comprimido de Paracetamol 500 mg",
    difficulty: "Fácil",
    patient: { name: "Produção", product: "Comprimido paracetamol 500 mg", context: "Otimização de força de compressão" },
    scenario: "Encontre a força de compressão ideal para obter dureza de 6-10 kp sem comprometer o tempo de desintegração (<15 min).",
    initialForce: 50, initialGranuleSize: 50, initialLubricant: 20,
    expectedHardnessRange: [6, 10],
    clinicalTip: "Compressão excessiva aumenta a dureza mas prolonga a desintegração. O equilíbrio ideal é dureza suficiente para manuseio com desintegração <15 min.",
  },
  {
    title: "Comprimido Orodispersível",
    difficulty: "Médio",
    patient: { name: "P&D", product: "ODT ondansetrona 4 mg", context: "Formulação de desintegração rápida" },
    scenario: "Comprimidos orodispersíveis devem desintegrar em <30s na boca. Encontre baixa força de compressão com dureza mínima aceitável (3-4 kp).",
    initialForce: 20, initialGranuleSize: 30, initialLubricant: 10,
    expectedHardnessRange: [3, 4],
    clinicalTip: "ODTs usam superdesintegrantes (croscarmelose, crospovidona) e baixa força de compressão. Excesso de lubrificante (estearato de Mg) retarda a desintegração.",
  },
  {
    title: "Comprimido de Liberação Prolongada",
    difficulty: "Difícil",
    patient: { name: "CQ Industrial", product: "Metformina XR 750 mg", context: "Matriz HPMC para liberação prolongada" },
    scenario: "A força de compressão afeta a porosidade da matriz e o perfil de liberação. Alta dureza (>12 kp) é necessária para manter a integridade da matriz HPMC.",
    initialForce: 80, initialGranuleSize: 60, initialLubricant: 15,
    expectedHardnessRange: [12, 18],
    clinicalTip: "Em matrizes hidrofílicas (HPMC), a compressão deve formar uma estrutura densa que hidrata uniformemente. Subcompressão causa dose-dumping.",
  },
];

function computeCompression(force: number, granuleSize: number, lubricant: number) {
  const heckelData = [];
  const kawakitaData = [];

  // Heckel: ln(1/(1-D)) vs P
  // Kawakita: P/C vs P
  const Py = 100 - granuleSize * 0.5; // yield pressure
  const D0 = 0.3 + granuleSize / 500;

  for (let p = 5; p <= 200; p += 5) {
    const D = 1 - (1 - D0) * Math.exp(-p / Py);
    const heckelY = D > 0.99 ? 5 : -Math.log(1 - D);
    const C = D > D0 ? (D - D0) / D : 0.001;
    const kawakitaY = C > 0.001 ? p / C : p * 1000;
    heckelData.push({ pressure: p, heckel: Math.round(heckelY * 1000) / 1000 });
    kawakitaData.push({ pressure: p, kawakita: Math.round(kawakitaY * 10) / 10 });
  }

  // Tablet properties
  const hardness = Math.round((force / 10) * (1 + granuleSize / 200) * (1 - lubricant / 200) * 10) / 10;
  const friability = Math.round(Math.max(0.1, 2 - force / 50 + lubricant / 100) * 100) / 100;
  const disintegration = Math.round((force / 8) * (1 + lubricant / 50) * 10) / 10;

  return { heckelData, kawakitaData, hardness, friability, disintegration };
}

export default function SimuladorCompressao() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<CompCase | null>(null);
  const [force, setForce] = useState(50);
  const [granuleSize, setGranuleSize] = useState(50);
  const [lubricant, setLubricant] = useState(20);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastScore, setLastScore] = useState(0);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase.case_data as any;
      setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.is_ai_generated, patient: cd.patient, scenario: cd.scenario, initialForce: cd.initialForce ?? 50, initialGranuleSize: cd.initialGranuleSize ?? 50, initialLubricant: cd.initialLubricant ?? 20, expectedHardnessRange: cd.expectedHardnessRange ?? [6, 10], clinicalTip: cd.clinicalTip ?? "" });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) { setForce(activeCase.initialForce); setGranuleSize(activeCase.initialGranuleSize); setLubricant(activeCase.initialLubricant); }
  }, [activeCase]);

  const { heckelData, kawakitaData, hardness, friability, disintegration } = useMemo(() => computeCompression(force, granuleSize, lubricant), [force, granuleSize, lubricant]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return;
    const ok = hardness >= activeCase.expectedHardnessRange[0] && hardness <= activeCase.expectedHardnessRange[1];
    submitResults({ score: ok ? 100 : 30, actions: { force, granuleSize, lubricant, hardness, friability, disintegration } });
  }, [activeCase, hardness, force, granuleSize, lubricant, friability, disintegration, submitted, submitResults]);

  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, initialForce: c.initialForce ?? 50, initialGranuleSize: c.initialGranuleSize ?? 50, initialLubricant: c.initialLubricant ?? 20, expectedHardnessRange: c.expectedHardnessRange ?? [6, 10], clinicalTip: c.clinicalTip ?? "" });

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Compressão de Comprimidos</h1>
            <p className="text-muted-foreground">Gráficos de Heckel e Kawakita, dureza, friabilidade e desintegração.</p>
            <AdminPromptViewer toolSlug="sim-compressao" toolName="Compressão de Comprimidos" toolType="simulator" prompt={getNativePrompt("sim-compressao") || ""} />
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
        <p className="text-sm"><strong>Produto:</strong> {activeCase.patient.product}</p>
        <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
      </CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Parâmetros de Compressão</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Força de Compressão (%)</label><span className="text-sm font-bold">{force}%</span></div><Slider value={[force]} onValueChange={([v]) => setForce(v)} min={10} max={100} step={5} /></div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Tamanho de Grânulo (%)</label><span className="text-sm font-bold">{granuleSize}%</span></div><Slider value={[granuleSize]} onValueChange={([v]) => setGranuleSize(v)} min={10} max={100} step={5} /></div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Lubrificante (%)</label><span className="text-sm font-bold">{lubricant}%</span></div><Slider value={[lubricant]} onValueChange={([v]) => setLubricant(v)} min={0} max={50} step={5} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">Dureza</p><p className={`text-lg font-bold ${hardness >= 4 && hardness <= 12 ? "" : "text-destructive"}`}>{hardness} kp</p></div>
              <div className="p-2 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">Friabilidade</p><p className={`text-lg font-bold ${friability <= 1 ? "" : "text-destructive"}`}>{friability}%</p></div>
              <div className="p-2 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">Desintegração</p><p className={`text-lg font-bold ${disintegration <= 15 ? "" : "text-destructive"}`}>{disintegration} min</p></div>
            </div>
            <Button variant="outline" onClick={handleFinish} disabled={submitted} className="w-full">Finalizar Caso</Button>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Gráfico de Heckel</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={heckelData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="pressure" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Line type="monotone" dataKey="heckel" name="ln(1/(1-D))" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Gráfico de Kawakita</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={kawakitaData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="pressure" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Line type="monotone" dataKey="kawakita" name="P/C" stroke="hsl(var(--chart-2))" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica Clínica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p></CardContent></Card>
      <SimulatorChallengeMode challengeSet={getCompressaoChallenges()} simulatorState={{ force, granuleSize, lubricant, hardness }} />
    </div>
  );
}
