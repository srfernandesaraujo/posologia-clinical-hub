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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea, ReferenceLine } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getChallengesBySlug } from "@/data/simulatorChallenges";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SLUG = "pka-absorcao";

const DRUG_TYPES = [
  { id: "weak_acid", name: "Ácido fraco", formula: "HH: % não-ionizado = 100 / (1 + 10^(pH - pKa))" },
  { id: "weak_base", name: "Base fraca", formula: "HH: % não-ionizado = 100 / (1 + 10^(pKa - pH))" },
  { id: "zwitterion", name: "Anfótero/Zwitterion", formula: "Possui pKa1 (ácido) e pKa2 (básico)" },
];

const EXAMPLE_DRUGS = [
  { id: "aspirin", name: "Aspirina", type: "weak_acid", pKa: 3.5 },
  { id: "ibuprofen", name: "Ibuprofeno", type: "weak_acid", pKa: 4.4 },
  { id: "diazepam", name: "Diazepam", type: "weak_base", pKa: 3.3 },
  { id: "morphine", name: "Morfina", type: "weak_base", pKa: 8.0 },
  { id: "propranolol", name: "Propranolol", type: "weak_base", pKa: 9.4 },
  { id: "ampicillin", name: "Ampicilina", type: "zwitterion", pKa: 2.5 },
];

interface PkaCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; drug: string; context: string };
  scenario: string; initialPka: number; initialType: string; initialPH: number;
  expectedAbsorptionSite: string; clinicalTip: string;
}

const BUILT_IN_CASES: PkaCase[] = [
  {
    title: "Aspirina – Absorção Gástrica de Ácido Fraco",
    difficulty: "Fácil",
    patient: { name: "Estudo de Absorção", drug: "Aspirina", context: "AINE / antiagregante" },
    scenario: "A aspirina (pKa 3.5) é um ácido fraco. Em pH gástrico (1.5), qual a fração não-ionizada? Onde é predominantemente absorvida?",
    initialPka: 3.5, initialType: "weak_acid", initialPH: 1.5,
    expectedAbsorptionSite: "estomago",
    clinicalTip: "No estômago (pH 1.5), a aspirina está 99% não-ionizada → boa absorção gástrica. Porém, a maior parte da absorção ocorre no duodeno pela enorme área de superfície.",
  },
  {
    title: "Morfina – Base Fraca e Armadilha Iônica",
    difficulty: "Médio",
    patient: { name: "Farmacologia Opioides", drug: "Morfina", context: "Analgésico opioide" },
    scenario: "A morfina (pKa 8.0) é uma base fraca. Compare sua ionização no estômago (pH 1.5), duodeno (pH 6) e sangue (pH 7.4). Explique o fenômeno de 'ion trapping'.",
    initialPka: 8.0, initialType: "weak_base", initialPH: 7.4,
    expectedAbsorptionSite: "duodeno",
    clinicalTip: "No estômago, a morfina está >99% ionizada (NH₃⁺) → não absorvida. No duodeno (pH 6), ~1% não-ionizada → absorção lenta. Ion trapping: base fraca acumula no compartimento mais ácido.",
  },
  {
    title: "Propranolol vs Atenolol – Lipofilia e pKa",
    difficulty: "Difícil",
    patient: { name: "Beta-bloqueadores", drug: "Propranolol / Atenolol", context: "Farmacocinética comparada" },
    scenario: "Propranolol (pKa 9.4, logP 3.6) vs atenolol (pKa 9.6, logP 0.2). Ambos são bases fracas com pKa similar, mas biodisponibilidade oral muito diferente. Analise o papel de pKa + logP.",
    initialPka: 9.4, initialType: "weak_base", initialPH: 6.0,
    expectedAbsorptionSite: "duodeno",
    clinicalTip: "Ambos têm <1% não-ionizado em pH intestinal. Mas propranolol (logP 3.6) atravessa membranas lipídicas mesmo parcialmente ionizado. Atenolol (logP 0.2) não → BD 50% vs 90%.",
  },
];

function computeIonization(type: string, pKa: number) {
  const points = [];
  for (let pH = 0; pH <= 14; pH += 0.2) {
    let nonIonized: number;
    if (type === "weak_acid") {
      nonIonized = 100 / (1 + Math.pow(10, pH - pKa));
    } else if (type === "weak_base") {
      nonIonized = 100 / (1 + Math.pow(10, pKa - pH));
    } else {
      // Simplified zwitterion
      nonIonized = 100 / (1 + Math.pow(10, pH - pKa) + Math.pow(10, (pKa - 2) - pH));
    }
    points.push({ pH: Math.round(pH * 10) / 10, nonIonized: Math.round(nonIonized * 100) / 100 });
  }
  return points;
}

function getFractionAtPH(type: string, pKa: number, pH: number): number {
  if (type === "weak_acid") return 100 / (1 + Math.pow(10, pH - pKa));
  if (type === "weak_base") return 100 / (1 + Math.pow(10, pKa - pH));
  return 100 / (1 + Math.pow(10, pH - pKa) + Math.pow(10, (pKa - 2) - pH));
}

export default function SimuladorPkaAbsorcao() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<PkaCase | null>(null);
  const [drugType, setDrugType] = useState("weak_acid");
  const [pKa, setPka] = useState(3.5);
  const [pH, setPH] = useState(1.5);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase.case_data as any;
      setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.is_ai_generated, patient: cd.patient, scenario: cd.scenario, initialPka: cd.initialPka ?? 3.5, initialType: cd.initialType ?? "weak_acid", initialPH: cd.initialPH ?? 1.5, expectedAbsorptionSite: cd.expectedAbsorptionSite ?? "estomago", clinicalTip: cd.clinicalTip ?? "" });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) { setDrugType(activeCase.initialType); setPka(activeCase.initialPka); setPH(activeCase.initialPH); }
  }, [activeCase]);

  const ionizationCurve = useMemo(() => computeIonization(drugType, pKa), [drugType, pKa]);

  const compartments = useMemo(() => [
    { name: "Estômago", pH: 1.5, nonIonized: getFractionAtPH(drugType, pKa, 1.5) },
    { name: "Duodeno", pH: 6.0, nonIonized: getFractionAtPH(drugType, pKa, 6.0) },
    { name: "Jejuno", pH: 7.0, nonIonized: getFractionAtPH(drugType, pKa, 7.0) },
    { name: "Sangue", pH: 7.4, nonIonized: getFractionAtPH(drugType, pKa, 7.4) },
  ], [drugType, pKa]);

  const currentFraction = useMemo(() => getFractionAtPH(drugType, pKa, pH), [drugType, pKa, pH]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return;
    submitResults({ score: 80, actions: { drugType, pKa, pH, nonIonized: currentFraction } });
  }, [activeCase, drugType, pKa, pH, currentFraction, submitted, submitResults]);

  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, initialPka: c.initialPka ?? 3.5, initialType: c.initialType ?? "weak_acid", initialPH: c.initialPH ?? 1.5, expectedAbsorptionSite: c.expectedAbsorptionSite ?? "estomago", clinicalTip: c.clinicalTip ?? "" });

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">pKa, Ionização e Absorção de Fármacos</h1>
            <p className="text-muted-foreground">Henderson-Hasselbalch interativo com compartimentos fisiológicos.</p>
            <AdminPromptViewer toolSlug="sim-pka-absorcao" toolName="pKa e Absorção" toolType="simulator" prompt={getNativePrompt("sim-pka-absorcao") || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-primary" /> Casos de Estudo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {BUILT_IN_CASES.map((c, i) => (
              <button key={i} onClick={() => setActiveCase(c)} className="w-full text-left p-4 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-colors">
                <div className="flex items-center justify-between mb-1"><span className="font-semibold">{c.title}</span><Badge variant="outline">{c.difficulty}</Badge></div>
                <p className="text-sm text-muted-foreground">{c.patient.context}</p>
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
      <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">{activeCase.scenario}</p></CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Parâmetros</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Fármaco</label>
              <Select value={drugType} onValueChange={setDrugType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DRUG_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">pKa</label><span className="text-sm font-bold">{pKa}</span></div><Slider value={[pKa * 10]} onValueChange={([v]) => setPka(v / 10)} min={10} max={130} step={1} /></div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">pH do meio</label><span className="text-sm font-bold">{pH}</span></div><Slider value={[pH * 10]} onValueChange={([v]) => setPH(v / 10)} min={10} max={100} step={1} /></div>
            <div className="p-4 rounded-lg bg-primary/10 text-center">
              <p className="text-xs text-muted-foreground mb-1">Fração Não-Ionizada a pH {pH}</p>
              <p className="text-3xl font-bold text-primary">{currentFraction.toFixed(1)}%</p>
            </div>
            <div className="text-xs text-muted-foreground">Fármacos referência: {EXAMPLE_DRUGS.map(d => `${d.name} (pKa ${d.pKa})`).join(", ")}</div>
            <Button variant="outline" onClick={handleFinish} disabled={submitted} className="w-full">Finalizar Caso</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Ionização por Compartimento</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {compartments.map(c => (
                <div key={c.name} className={`p-3 rounded-lg text-center ${c.nonIonized > 50 ? 'bg-primary/10' : 'bg-muted'}`}>
                  <p className="text-xs text-muted-foreground">{c.name} (pH {c.pH})</p>
                  <p className="text-xl font-bold">{c.nonIonized.toFixed(1)}%</p>
                  <p className="text-xs">{c.nonIonized > 50 ? "✓ Absorção favorável" : "Absorção limitada"}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Curva de Ionização (% Não-Ionizado vs pH)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={ionizationCurve}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="pH" label={{ value: "pH", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[0, 100]} label={{ value: "% Não-ionizado", angle: -90, position: "insideLeft" }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <ReferenceArea x1={1} x2={3} fill="hsl(var(--destructive))" fillOpacity={0.05} label={{ value: "Estômago", fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
              <ReferenceArea x1={5.5} x2={7} fill="hsl(var(--primary))" fillOpacity={0.05} label={{ value: "Duodeno", fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
              <ReferenceArea x1={7.2} x2={7.6} fill="hsl(var(--accent))" fillOpacity={0.1} label={{ value: "Sangue", fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
              <ReferenceLine x={pKa} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: `pKa=${pKa}`, fill: "hsl(var(--destructive))" }} />
              <Line type="monotone" dataKey="nonIonized" name="% Não-ionizado" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p></CardContent></Card>
      <SimulatorChallengeMode challengeSet={getChallengesBySlug(SLUG)} simulatorState={{ drugType, pKa, pH, nonIonized: currentFraction }} />
    </div>
  );
}
