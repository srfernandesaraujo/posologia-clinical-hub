import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, CheckCircle2, ArrowLeft, Sparkles } from "lucide-react";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";
import SimulatorHowToUse from "@/components/simulators/SimulatorHowToUse";
import SimulatorFeedback, { FeedbackDecision } from "@/components/simulators/SimulatorFeedback";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { useAuth } from "@/contexts/AuthContext";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";

const HOW_TO = [
  "Selecione um caso de paciente renal crônico.",
  "Em M1, revise os exames laboratoriais e o estágio da DRC.",
  "Em M2, defina a prescrição dietética (proteínas, K, P, Na, líquidos).",
  "Em M3, analise o recordatório alimentar e identifique inadequações.",
  "Em M4, proponha substituições alimentares e suplementação.",
  "Ao final, revise o feedback laboratorial projetado e gere o relatório.",
];

const PATIENTS = [
  {
    id: "p1", name: "Seu Valdir", age: 65, difficulty: "Médio",
    scenario: "DRC estágio 4 (TFGe 22 mL/min), pré-dialítico. K 5.8 mEq/L, P 5.5 mg/dL, Ca 8.2, albumina 3.2 g/dL.",
    labs: { ureia: 98, creatinina: 3.8, K: 5.8, P: 5.5, Ca: 8.2, albumina: 3.2 },
    idealProtein: "0.6-0.8", idealK: "restrito", idealP: "restrito", idealNa: "restrito", idealLiquido: "sem-restricao",
    idealFoodIssues: ["banana", "feijao-preto", "refrigerante"],
    idealSupplements: ["quelante-fosforo", "calcio"],
  },
  {
    id: "p2", name: "Maria das Graças", age: 58, difficulty: "Difícil",
    scenario: "DRC estágio 5D (hemodiálise 3x/semana). K 6.5 mEq/L, P 7.2 mg/dL, Ca 9.0, albumina 2.8 g/dL. Edema ++.",
    labs: { ureia: 145, creatinina: 8.2, K: 6.5, P: 7.2, Ca: 9.0, albumina: 2.8 },
    idealProtein: "1.0-1.2", idealK: "muito-restrito", idealP: "muito-restrito", idealNa: "restrito", idealLiquido: "restrito",
    idealFoodIssues: ["banana", "embutidos", "leite-condensado"],
    idealSupplements: ["quelante-fosforo", "epo-orientacao"],
  },
  {
    id: "p3", name: "Roberto Nascimento", age: 45, difficulty: "Fácil",
    scenario: "DRC estágio 3b (TFGe 38 mL/min). K 4.5 mEq/L, P 4.0 mg/dL, Ca 9.5, albumina 4.0 g/dL. Sem restrição hídrica.",
    labs: { ureia: 55, creatinina: 2.1, K: 4.5, P: 4.0, Ca: 9.5, albumina: 4.0 },
    idealProtein: "0.6-0.8", idealK: "moderado", idealP: "moderado", idealNa: "moderado", idealLiquido: "sem-restricao",
    idealFoodIssues: ["embutidos"],
    idealSupplements: ["calcio"],
  },
];

const PROTEIN_OPTIONS = [
  { value: "0.6-0.8", label: "0.6-0.8 g/kg/dia (conservador)" },
  { value: "0.8-1.0", label: "0.8-1.0 g/kg/dia (moderado)" },
  { value: "1.0-1.2", label: "1.0-1.2 g/kg/dia (dialítico)" },
  { value: "1.2-1.5", label: "1.2-1.5 g/kg/dia (hiperproteico — distrator)" },
];
const RESTRICTION_OPTIONS = [
  { value: "sem-restricao", label: "Sem restrição" },
  { value: "moderado", label: "Restrição moderada" },
  { value: "restrito", label: "Restrito" },
  { value: "muito-restrito", label: "Muito restrito" },
];
const FOOD_ISSUES = [
  { id: "banana", label: "Banana (alto K)" },
  { id: "feijao-preto", label: "Feijão preto (alto K + P)" },
  { id: "embutidos", label: "Embutidos (alto Na + P aditivos)" },
  { id: "refrigerante", label: "Refrigerante (P de aditivos)" },
  { id: "leite-condensado", label: "Leite condensado (P + alto CHO)" },
  { id: "arroz", label: "Arroz branco (distrator)" },
];
const SUPPLEMENT_OPTIONS = [
  { id: "quelante-fosforo", label: "Quelante de fósforo (Sevelamer)" },
  { id: "calcio", label: "Carbonato de cálcio" },
  { id: "epo-orientacao", label: "Orientação sobre eritropoietina" },
  { id: "vitamina-d", label: "Vitamina D ativa (distrator sem indicação)" },
];

const BUILT_IN = PATIENTS.map(p => ({ id: p.id, title: `${p.name} — ${p.age}a`, difficulty: p.difficulty, patient: { diagnosis: p.scenario } }));

export default function SimuladorNutricaoRenal() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const prompt = getNativePrompt("sim-nutricao-renal") || "";
  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases("nutricao-renal", BUILT_IN);

  const [activeCase, setActiveCase] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedPatient, setSelectedPatient] = useState("");
  const [protein, setProtein] = useState("");
  const [kRestriction, setKRestriction] = useState("");
  const [pRestriction, setPRestriction] = useState("");
  const [naRestriction, setNaRestriction] = useState("");
  const [liquidRestriction, setLiquidRestriction] = useState("");
  const [foodIssues, setFoodIssues] = useState<string[]>([]);
  const [supplements, setSupplements] = useState<string[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);

  const patient = PATIENTS.find(p => p.id === selectedPatient);
  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));

  const calcFeedback = () => {
    if (!patient) return { score: 0, decisions: [] as FeedbackDecision[], narrative: "" };
    const decisions: FeedbackDecision[] = [];
    let correct = 0, total = 0;

    const checks: [string, string, string, any[]][] = [
      ["Quota Proteica", protein, patient.idealProtein, PROTEIN_OPTIONS],
      ["Restrição de K", kRestriction, patient.idealK, RESTRICTION_OPTIONS],
      ["Restrição de P", pRestriction, patient.idealP, RESTRICTION_OPTIONS],
      ["Restrição de Na", naRestriction, patient.idealNa, RESTRICTION_OPTIONS],
      ["Restrição Hídrica", liquidRestriction, patient.idealLiquido, RESTRICTION_OPTIONS],
    ];
    checks.forEach(([label, user, ideal, opts]) => {
      const ok = user === ideal; if (ok) correct++; total++;
      decisions.push({ label, userChoice: opts.find((o: any) => o.value === user)?.label || "—", idealChoice: opts.find((o: any) => o.value === ideal)?.label || "—", correct: ok });
    });

    const idealFoodSet = new Set(patient.idealFoodIssues);
    const foodOk = foodIssues.length === patient.idealFoodIssues.length && foodIssues.every(f => idealFoodSet.has(f));
    if (foodOk) correct++; total++;
    decisions.push({ label: "Inadequações Identificadas", userChoice: foodIssues.map(f => FOOD_ISSUES.find(i => i.id === f)?.label).join(", ") || "—", idealChoice: patient.idealFoodIssues.map(f => FOOD_ISSUES.find(i => i.id === f)?.label).join(", "), correct: foodOk });

    const idealSuppSet = new Set(patient.idealSupplements);
    const suppOk = supplements.length === patient.idealSupplements.length && supplements.every(s => idealSuppSet.has(s));
    if (suppOk) correct++; total++;
    decisions.push({ label: "Suplementação", userChoice: supplements.map(s => SUPPLEMENT_OPTIONS.find(o => o.id === s)?.label).join(", ") || "—", idealChoice: patient.idealSupplements.map(s => SUPPLEMENT_OPTIONS.find(o => o.id === s)?.label).join(", "), correct: suppOk });

    const score = Math.round((correct / total) * 100);
    const narrative = score >= 80
      ? `Conduta adequada! ${patient.name} teria controle laboratorial otimizado (K, P normalizado) e redução do risco de complicações como hipercalemia e osteodistrofia renal.`
      : score >= 50
      ? `Parcialmente adequado. ${patient.name} poderia ter controle subótimo de eletrólitos com risco moderado de complicações.`
      : `Conduta inadequada. ${patient.name} teria alto risco de hipercalemia, hiperfosfatemia descontrolada e progressão acelerada da DRC.`;
    return { score, decisions, narrative };
  };

  const feedback = calcFeedback();
  const location = useLocation();
  const { virtualRoomCase, isVirtualRoom: isVR, goBack: vrGoBack, submitResults: submitVRResults, examProgress, examFeedback, proceedToNext } = useVirtualRoomCase("nutricao-renal");
  const [vrAutoStarted, setVrAutoStarted] = useState(false);
  if (isVR && !vrAutoStarted && !activeCase) { setVrAutoStarted(true); setActiveCase(virtualRoomCase?.id || "vr"); setSelectedPatient(PATIENTS[0]?.id || ""); }
  useEffect(() => { if (isVR && showFeedback) { submitVRResults({ score: feedback.score, actions: feedback.decisions, timeSpentSeconds: 0 }); } }, [showFeedback]);

  if (!activeCase) {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Nutrição no Paciente Renal Crônico</h1>
            <p className="text-sm text-muted-foreground">Prescrição dietética, restrições e suplementação na DRC</p>
          </div>
          <SimulatorHowToUse title="Nutrição Renal" steps={HOW_TO} />
          <AdminPromptViewer toolSlug="sim-nutricao-renal" toolName="Nutrição Renal" toolType="simulator" prompt={prompt} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allCases.map((c: any) => c.isAI
            ? <AICaseCard key={c.id} caseItem={c} onClick={() => { setActiveCase(c.id); setSelectedPatient(PATIENTS[0]?.id || ""); }} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />
            : <NativeCaseCard key={c.id} caseItem={c} onClick={() => { setActiveCase(c.id); setSelectedPatient(c.id); }} />
          )}
        </div>
        {isAdmin && <Button onClick={() => generateCase()} disabled={isGenerating} variant="outline" className="gap-2"><Sparkles className="h-4 w-4" />{isGenerating ? "Gerando..." : "Gerar Caso com IA"}</Button>}
      </div>
    );
  }

  const LockedOverlay = ({ module }: { module: number }) => (<div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-xl"><Lock className="h-6 w-6 text-muted-foreground" /><p className="text-xs text-muted-foreground font-medium">Complete o módulo {module}</p></div>);

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => { setActiveCase(null); setCompletedModules(new Set()); setShowFeedback(false); }}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1"><h1 className="text-2xl font-bold">Nutrição Renal</h1></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(1) ? "default" : "secondary"}>M1</Badge>Caso e Exames{completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {patient && (<div className="text-sm bg-muted/50 p-3 rounded-lg space-y-1">
              <p><strong>{patient.name}, {patient.age}a</strong></p>
              <p>{patient.scenario}</p>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {Object.entries(patient.labs).map(([k, v]) => (<div key={k} className="bg-background p-1.5 rounded text-center"><span className="text-xs text-muted-foreground">{k}</span><br /><span className="font-semibold text-sm">{v}</span></div>))}
              </div>
            </div>)}
            {patient && !completedModules.has(1) && <Button size="sm" className="w-full" onClick={() => completeModule(1)}>Iniciar</Button>}
          </CardContent>
        </Card>

        <Card className="relative">
          {!completedModules.has(1) && <LockedOverlay module={1} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(2) ? "default" : "secondary"}>M2</Badge>Prescrição Dietética{completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedModules.has(1) && (<>
              <Select value={protein} onValueChange={setProtein}><SelectTrigger><SelectValue placeholder="Quota proteica" /></SelectTrigger><SelectContent>{PROTEIN_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
              <Select value={kRestriction} onValueChange={setKRestriction}><SelectTrigger><SelectValue placeholder="Restrição de K" /></SelectTrigger><SelectContent>{RESTRICTION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
              <Select value={pRestriction} onValueChange={setPRestriction}><SelectTrigger><SelectValue placeholder="Restrição de P" /></SelectTrigger><SelectContent>{RESTRICTION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
              <Select value={naRestriction} onValueChange={setNaRestriction}><SelectTrigger><SelectValue placeholder="Restrição de Na" /></SelectTrigger><SelectContent>{RESTRICTION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
              <Select value={liquidRestriction} onValueChange={setLiquidRestriction}><SelectTrigger><SelectValue placeholder="Restrição hídrica" /></SelectTrigger><SelectContent>{RESTRICTION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
              {protein && kRestriction && pRestriction && naRestriction && liquidRestriction && !completedModules.has(2) && <Button size="sm" className="w-full" onClick={() => completeModule(2)}>Confirmar</Button>}
            </>)}
          </CardContent>
        </Card>

        <Card className="relative">
          {!completedModules.has(2) && <LockedOverlay module={2} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(3) ? "default" : "secondary"}>M3</Badge>Recordatório Alimentar{completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedModules.has(2) && (<>
              <p className="text-sm text-muted-foreground">Identifique os alimentos inadequados no recordatório:</p>
              {FOOD_ISSUES.map(f => (
                <label key={f.id} className="flex items-start gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/50">
                  <input type="checkbox" checked={foodIssues.includes(f.id)} onChange={e => setFoodIssues(prev => e.target.checked ? [...prev, f.id] : prev.filter(x => x !== f.id))} className="mt-1" />
                  <span className="text-sm">{f.label}</span>
                </label>
              ))}
              {foodIssues.length > 0 && !completedModules.has(3) && <Button size="sm" className="w-full" onClick={() => completeModule(3)}>Confirmar</Button>}
            </>)}
          </CardContent>
        </Card>

        <Card className="relative">
          {!completedModules.has(3) && <LockedOverlay module={3} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(4) ? "default" : "secondary"}>M4</Badge>Suplementação{completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedModules.has(3) && (<>
              <p className="text-sm text-muted-foreground">Selecione a suplementação adequada:</p>
              {SUPPLEMENT_OPTIONS.map(s => (
                <label key={s.id} className="flex items-start gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/50">
                  <input type="checkbox" checked={supplements.includes(s.id)} onChange={e => setSupplements(prev => e.target.checked ? [...prev, s.id] : prev.filter(x => x !== s.id))} className="mt-1" />
                  <span className="text-sm">{s.label}</span>
                </label>
              ))}
              {supplements.length > 0 && !completedModules.has(4) && <Button size="sm" className="w-full" onClick={() => { completeModule(4); setShowFeedback(true); }}>Confirmar</Button>}
            </>)}
          </CardContent>
        </Card>
      </div>

      <SimulatorFeedback score={feedback.score} decisions={feedback.decisions} narrative={feedback.narrative} visible={showFeedback} />
      <LabReportPanel benchTitle="Nutrição Renal" isUnlocked={completedModules.has(4)} experimentSummary={patient ? { "Paciente": `${patient.name}, ${patient.age}a`, "Proteína": PROTEIN_OPTIONS.find(o => o.value === protein)?.label || "—", "Inadequações": foodIssues.map(f => FOOD_ISSUES.find(i => i.id === f)?.label).join(", ") || "—", "Suplementação": supplements.map(s => SUPPLEMENT_OPTIONS.find(o => o.id === s)?.label).join(", ") || "—", "Pontuação": `${feedback.score}%` } : undefined} />
    </div>
  );
}
