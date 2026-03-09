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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getDiluicaoChallenges } from "@/data/simulatorChallenges";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SLUG = "diluicao";

interface DilCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; product: string; context: string };
  scenario: string;
  initialC1: number; initialV1: number;
  expectedC2Range: [number, number];
  clinicalTip: string;
}

const BUILT_IN_CASES: DilCase[] = [
  {
    title: "Diluição de Adrenalina 1:1000 para 1:10.000",
    difficulty: "Fácil",
    patient: { name: "Emergência", product: "Adrenalina 1 mg/mL (1:1000)", context: "Preparo para uso IV em PCR" },
    scenario: "Dilua adrenalina 1:1000 para obter solução 1:10.000 (0.1 mg/mL) para uso IV. Determine o volume de diluente necessário.",
    initialC1: 1, initialV1: 1,
    expectedC2Range: [0.08, 0.12],
    clinicalTip: "Adrenalina IV deve SEMPRE ser diluída a 1:10.000. Administrar 1:1000 IV pode causar arritmias fatais. Usar 1 mL + 9 mL de SF 0.9%.",
  },
  {
    title: "Diluição Seriada para Teste de Sensibilidade",
    difficulty: "Médio",
    patient: { name: "Laboratório de Microbiologia", product: "Antimicrobiano para CIM", context: "Determinação de Concentração Inibitória Mínima" },
    scenario: "Prepare uma diluição seriada (1:2) a partir de solução-mãe de 256 µg/mL para obter concentrações de 128 a 0.5 µg/mL em 10 tubos.",
    initialC1: 256, initialV1: 1,
    expectedC2Range: [0.4, 0.6],
    clinicalTip: "Na diluição seriada 1:2, cada tubo tem metade da concentração anterior. Para CIM, o tubo com menor concentração que inibe crescimento = CIM.",
  },
  {
    title: "Isotonia de Colírio – Equivalente em NaCl",
    difficulty: "Difícil",
    patient: { name: "Farmácia Magistral", product: "Colírio de pilocarpina 2%", context: "Ajuste de tonicidade" },
    scenario: "Calcule a quantidade de NaCl para tornar isotônico um colírio de pilocarpina 2% (equivalente em NaCl da pilocarpina HCl = 0.24). Volume final: 30 mL.",
    initialC1: 2, initialV1: 30,
    expectedC2Range: [0.20, 0.28],
    clinicalTip: "Para isotonia: NaCl necessário = 0.9% - (concentração × equivalente em NaCl). Colírios hipotônicos causam ardência; hipertônicos causam desconforto.",
  },
];

function computeDilution(c1: number, v1: number, v2: number) {
  const c2 = (c1 * v1) / v2;
  const diluent = v2 - v1;
  // Serial dilution (1:2) from c1
  const serial = [];
  let c = c1;
  for (let i = 0; i < 10; i++) {
    serial.push({ tube: `Tubo ${i + 1}`, concentration: Math.round(c * 1000) / 1000 });
    c = c / 2;
  }
  // Isotony calculation
  const naclNeeded = Math.max(0, (0.9 / 100) * v2 - (c1 / 100) * 0.24 * v2 / v1);
  return { c2: Math.round(c2 * 10000) / 10000, diluent: Math.round(diluent * 100) / 100, serial, naclNeeded: Math.round(naclNeeded * 1000) / 1000 };
}

export default function SimuladorDiluicao() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<DilCase | null>(null);
  const [c1, setC1] = useState(1);
  const [v1, setV1] = useState(1);
  const [v2, setV2] = useState(10);
  const [mode, setMode] = useState<"simple" | "serial" | "isotony">("simple");

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase.case_data as any;
      setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.is_ai_generated, patient: cd.patient, scenario: cd.scenario, initialC1: cd.initialC1 ?? 1, initialV1: cd.initialV1 ?? 1, expectedC2Range: cd.expectedC2Range ?? [0.05, 0.15], clinicalTip: cd.clinicalTip ?? "" });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) { setC1(activeCase.initialC1); setV1(activeCase.initialV1); setV2(activeCase.initialV1 * 10); }
  }, [activeCase]);

  const { c2, diluent, serial, naclNeeded } = useMemo(() => computeDilution(c1, v1, v2), [c1, v1, v2]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return;
    const ok = c2 >= activeCase.expectedC2Range[0] && c2 <= activeCase.expectedC2Range[1];
    submitResults({ score: ok ? 100 : 30, actions: { c1, v1, v2, c2 } });
  }, [activeCase, c2, c1, v1, v2, submitted, submitResults]);

  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, initialC1: c.initialC1 ?? 1, initialV1: c.initialV1 ?? 1, expectedC2Range: c.expectedC2Range ?? [0.05, 0.15], clinicalTip: c.clinicalTip ?? "" });

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Cálculos de Diluição e Concentração</h1>
            <p className="text-muted-foreground">Diluição simples, seriada, conversão de unidades e isotonia.</p>
            <AdminPromptViewer toolSlug="sim-diluicao" toolName="Diluição e Concentração" toolType="simulator" prompt={getNativePrompt("sim-diluicao") || ""} />
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
        <p className="text-sm"><strong>Contexto:</strong> {activeCase.patient.context}</p>
        <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
      </CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Parâmetros de Diluição</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-2 block">Modo</label>
              <Select value={mode} onValueChange={(v: any) => setMode(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Diluição Simples (C1V1=C2V2)</SelectItem>
                  <SelectItem value="serial">Diluição Seriada</SelectItem>
                  <SelectItem value="isotony">Isotonia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">C1 (concentração inicial)</label><span className="text-sm font-bold">{c1}</span></div><Slider value={[c1 * 10]} onValueChange={([v]) => setC1(v / 10)} min={1} max={500} step={1} /></div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">V1 (volume do soluto, mL)</label><span className="text-sm font-bold">{v1} mL</span></div><Slider value={[v1]} onValueChange={([v]) => setV1(v)} min={0.1} max={50} step={0.1} /></div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">V2 (volume final, mL)</label><span className="text-sm font-bold">{v2} mL</span></div><Slider value={[v2]} onValueChange={([v]) => setV2(Math.max(v, v1 + 0.1))} min={1} max={500} step={1} /></div>
            <Button variant="outline" onClick={handleFinish} disabled={submitted} className="w-full">Finalizar Caso</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Resultados</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">C2 (final)</p><p className="text-2xl font-bold">{c2}</p></div>
              <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">Diluente</p><p className="text-2xl font-bold">{diluent} <span className="text-sm">mL</span></p></div>
              {mode === "isotony" && <div className="p-3 rounded-lg bg-muted text-center col-span-2"><p className="text-xs text-muted-foreground">NaCl para isotonia</p><p className="text-2xl font-bold">{naclNeeded} g</p></div>}
            </div>
            {mode === "serial" && (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={serial}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="tube" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="concentration" fill="hsl(var(--primary))" name="Concentração" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica Clínica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p></CardContent></Card>
      <SimulatorChallengeMode challengeSet={getDiluicaoChallenges()} simulatorState={{ c1, v1, v2, c2 }} />
    </div>
  );
}
