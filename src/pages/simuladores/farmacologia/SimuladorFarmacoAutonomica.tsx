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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getFarmacoAutonomicaChallenges } from "@/data/simulatorChallenges";

const SLUG = "farmaco-autonomica";

const DRUGS = [
  { key: "atropina", label: "Atropina (anti-M)", alpha: 0, beta: 0, muscarinic: -80 },
  { key: "fenilefrina", label: "Fenilefrina (α1-agonista)", alpha: 80, beta: 0, muscarinic: 0 },
  { key: "propranolol", label: "Propranolol (β-bloqueador)", alpha: 0, beta: -70, muscarinic: 0 },
  { key: "pilocarpina", label: "Pilocarpina (M-agonista)", alpha: 0, beta: 0, muscarinic: 70 },
  { key: "noradrenalina", label: "Noradrenalina (α1+β1)", alpha: 90, beta: 40, muscarinic: 0 },
  { key: "isoproterenol", label: "Isoproterenol (β1+β2)", alpha: 0, beta: 90, muscarinic: 0 },
];

interface FACase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  expectedDrug: string;
  clinicalTip: string;
}

const BUILT_IN_CASES: FACase[] = [
  { title: "Bradicardia Sinusal – Atropina", difficulty: "Fácil", patient: { name: "Jorge Nunes", age: 75, weight: 68, diagnosis: "Bradicardia sintomática pós-infarto inferior" }, scenario: "Paciente com FC 38 bpm, PAM 55 mmHg. A atropina bloqueia receptores M2 cardíacos, removendo o tônus vagal. Selecione o fármaco correto.", expectedDrug: "atropina", clinicalTip: "Atropina 0.5-1 mg IV na bradicardia sintomática. Age bloqueando M2 no nó SA/AV. Ineficaz em transplantados (coração desnervado)." },
  { title: "Crise Hipertensiva – Fentolamina", difficulty: "Médio", patient: { name: "Marcos Almeida", age: 50, weight: 88, diagnosis: "Feocromocitoma com PA 240/140 mmHg" }, scenario: "Catecolaminas em excesso ativam α1 causando vasoconstrição severa. A fenilefrina simularia pior cenário; propranolol pode ser útil após α-bloqueio.", expectedDrug: "propranolol", clinicalTip: "No feocromocitoma: SEMPRE α-bloqueio primeiro (fenoxibenzamina/fentolamina), depois β-bloqueio. β-bloqueio isolado causa crise hipertensiva paradoxal." },
  { title: "Glaucoma de Ângulo Aberto – Pilocarpina", difficulty: "Médio", patient: { name: "Dona Tereza", age: 62, weight: 55, diagnosis: "Glaucoma de ângulo aberto – PIO elevada" }, scenario: "A pilocarpina é um agonista muscarínico que contrai o músculo ciliar, abrindo a malha trabecular e facilitando a drenagem do humor aquoso.", expectedDrug: "pilocarpina", clinicalTip: "Pilocarpina (M-agonista): miose + contração do músculo ciliar → ↑drenagem do humor aquoso → ↓PIO. EA: visão turva, espasmo de acomodação." },
];

function computeOrganEffects(selectedDrug: string, drugDose: number) {
  const drug = DRUGS.find(d => d.key === selectedDrug) || DRUGS[0];
  const factor = drugDose / 100;

  const alpha = drug.alpha * factor;
  const beta = drug.beta * factor;
  const musc = drug.muscarinic * factor;

  const fc = 72 + beta * 0.5 - musc * 0.4;
  const pas = 120 + alpha * 0.8 - beta * 0.3;
  const pupila = 4 + alpha * 0.03 - musc * 0.02;
  const motilidade = 50 - alpha * 0.2 + musc * 0.5;
  const bronquios = 50 - beta * 0.3 + musc * 0.3;

  return [
    { organ: "FC (bpm)", value: Math.round(Math.max(30, Math.min(180, fc))), normal: 72 },
    { organ: "PAS (mmHg)", value: Math.round(Math.max(60, Math.min(250, pas))), normal: 120 },
    { organ: "Pupila (mm)", value: Math.round(Math.max(1, Math.min(9, pupila)) * 10) / 10, normal: 4 },
    { organ: "Motilidade GI (%)", value: Math.round(Math.max(0, Math.min(100, motilidade))), normal: 50 },
    { organ: "Tônus Brônquico (%)", value: Math.round(Math.max(0, Math.min(100, bronquios))), normal: 50 },
  ];
}

export default function SimuladorFarmacoAutonomica() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<FACase | null>(null);
  const [selectedDrug, setSelectedDrug] = useState("atropina");
  const [drugDose, setDrugDose] = useState(80);

  useEffect(() => { if (virtualRoomCase) { const cd = virtualRoomCase as any; setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI, patient: cd.patient, scenario: cd.scenario, expectedDrug: cd.expectedDrug ?? "atropina", clinicalTip: cd.clinicalTip ?? "" }); } }, [virtualRoomCase]);
  useEffect(() => { if (activeCase) { setSelectedDrug("atropina"); setDrugDose(80); } }, [activeCase]);

  const organEffects = useMemo(() => computeOrganEffects(selectedDrug, drugDose), [selectedDrug, drugDose]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return;
    submitResults({ score: selectedDrug === activeCase.expectedDrug ? 100 : 20, actions: { selectedDrug, drugDose } });
  }, [activeCase, selectedDrug, drugDose, submitted, submitResults]);

  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, expectedDrug: c.expectedDrug ?? "atropina", clinicalTip: c.clinicalTip ?? "" });

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Farmacologia Autonômica</h1>
            <p className="text-muted-foreground">Aplique agonistas e antagonistas adrenérgicos/colinérgicos e observe efeitos em órgãos-alvo.</p>
            <AdminPromptViewer toolSlug="sim-farmaco-autonomica" toolName="Farmacologia Autonômica" toolType="simulator" prompt={getNativePrompt("sim-farmaco-autonomica") || ""} />
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
      <div className="flex items-center gap-3"><Button variant="ghost" size="icon" onClick={() => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button><h2 className="text-xl font-bold">{activeCase.title}</h2><Badge variant="outline">{activeCase.difficulty}</Badge></div>
      <Card><CardContent className="pt-4 space-y-2"><p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age} anos, {activeCase.patient.weight} kg</p><p className="text-sm text-muted-foreground">{activeCase.scenario}</p></CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Fármaco</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-2">
              {DRUGS.map(d => (<button key={d.key} onClick={() => setSelectedDrug(d.key)} className={`p-2.5 rounded-lg border text-xs font-medium transition-colors ${selectedDrug === d.key ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{d.label}</button>))}
            </div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Dose</label><span className="text-sm font-bold">{drugDose}%</span></div><Slider value={[drugDose]} onValueChange={([v]) => setDrugDose(v)} min={0} max={100} step={5} /></div>
            <Button variant="outline" onClick={handleFinish} disabled={submitted} className="w-full">Finalizar Caso</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Efeitos nos Órgãos-Alvo</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={organEffects} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="organ" width={110} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Valor Atual" />
                <Bar dataKey="normal" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} name="Basal" opacity={0.3} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 space-y-1">
              {organEffects.map(e => {
                const diff = e.value - e.normal;
                return <p key={e.organ} className={`text-xs ${Math.abs(diff) > e.normal * 0.2 ? "text-destructive" : "text-muted-foreground"}`}>{e.organ}: {e.value} (basal: {e.normal}) {diff > 0 ? `↑${Math.round(diff)}` : diff < 0 ? `↓${Math.round(Math.abs(diff))}` : "="}</p>;
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica Clínica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p></CardContent></Card>
      <SimulatorChallengeMode challengeSet={getFarmacoAutonomicaChallenges()} simulatorState={{ selectedDrug, drugDose }} />
    </div>
  );
}
