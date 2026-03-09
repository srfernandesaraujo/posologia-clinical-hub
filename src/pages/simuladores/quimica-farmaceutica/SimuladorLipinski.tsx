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
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea, Legend } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getChallengesBySlug } from "@/data/simulatorChallenges";

const SLUG = "lipinski";

const KNOWN_DRUGS = [
  { name: "Aspirina", mw: 180, logP: 1.2, hbd: 1, hba: 4, psa: 63, rotBonds: 3 },
  { name: "Atorvastatina", mw: 559, logP: 4.5, hbd: 4, hba: 6, psa: 112, rotBonds: 12 },
  { name: "Metformina", mw: 129, logP: -1.4, hbd: 3, hba: 5, psa: 92, rotBonds: 2 },
  { name: "Ciclosporina", mw: 1203, logP: 2.9, hbd: 5, hba: 23, psa: 279, rotBonds: 15 },
  { name: "Losartan", mw: 423, logP: 4.0, hbd: 2, hba: 6, psa: 92, rotBonds: 8 },
  { name: "Amoxicilina", mw: 365, logP: 0.9, hbd: 4, hba: 7, psa: 133, rotBonds: 4 },
  { name: "Diazepam", mw: 285, logP: 2.8, hbd: 0, hba: 3, psa: 33, rotBonds: 1 },
  { name: "Omeprazol", mw: 345, logP: 2.2, hbd: 1, hba: 6, psa: 96, rotBonds: 5 },
];

interface LipCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; context: string };
  scenario: string;
  initialMW: number; initialLogP: number; initialHBD: number; initialHBA: number;
  expectedViolations: number;
  clinicalTip: string;
}

const BUILT_IN_CASES: LipCase[] = [
  {
    title: "Design de Novo Anti-hipertensivo Oral",
    difficulty: "Fácil",
    patient: { name: "Projeto Pharma", context: "Fármaco oral de uso diário" },
    scenario: "Projete um candidato anti-hipertensivo que siga a Regra dos 5 de Lipinski para garantir boa biodisponibilidade oral. Ajuste MW, logP, HBD e HBA para zero violações.",
    initialMW: 350, initialLogP: 2.5, initialHBD: 2, initialHBA: 5,
    expectedViolations: 0,
    clinicalTip: "Fármacos que violam 0-1 regra de Lipinski têm ~90% de chance de boa absorção oral.",
  },
  {
    title: "Análise de Druglikeness – Peptídeo Cíclico",
    difficulty: "Médio",
    patient: { name: "Biotech Lab", context: "Peptídeo cíclico inibidor de PPI" },
    scenario: "Peptídeos cíclicos frequentemente violam Lipinski. Analise as propriedades e explique por que ciclosporina funciona apesar de 3+ violações (regra de Veber/extensões).",
    initialMW: 800, initialLogP: 3.5, initialHBD: 5, initialHBA: 15,
    expectedViolations: 3,
    clinicalTip: "Moléculas 'beyond rule of 5' (bRo5) como ciclosporina usam conformações camaleônicas que mascaram grupos polares em membranas lipofílicas.",
  },
  {
    title: "Otimização de Lead – Redução de MW e logP",
    difficulty: "Difícil",
    patient: { name: "Drug Discovery", context: "Otimização de hit-to-lead" },
    scenario: "Um hit de screening possui MW=620, logP=5.8. Otimize removendo grupos desnecessários para entrar no espaço de druglikeness, mantendo atividade (logP > 1).",
    initialMW: 620, initialLogP: 5.8, initialHBD: 3, initialHBA: 8,
    expectedViolations: 0,
    clinicalTip: "A estratégia 'molecular obesity' de Hann sugere remover átomos que não contribuem para binding. Cada 100 Da reduzidos melhora significativamente a farmacocinética.",
  },
];

function computeLipinski(mw: number, logP: number, hbd: number, hba: number) {
  const violations = [mw > 500, logP > 5, hbd > 5, hba > 10].filter(Boolean).length;
  const psa = 20 + hba * 12 + hbd * 8;
  const veberOk = psa <= 140 && (hbd + hba) <= 12;
  const rotBonds = Math.round(mw / 50);
  return { violations, psa, veberOk, rotBonds, druglike: violations <= 1 };
}

export default function SimuladorLipinski() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<LipCase | null>(null);
  const [mw, setMw] = useState(350);
  const [logP, setLogP] = useState(2.5);
  const [hbd, setHbd] = useState(2);
  const [hba, setHba] = useState(5);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase.case_data as any;
      setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.is_ai_generated, patient: cd.patient, scenario: cd.scenario, initialMW: cd.initialMW ?? 350, initialLogP: cd.initialLogP ?? 2.5, initialHBD: cd.initialHBD ?? 2, initialHBA: cd.initialHBA ?? 5, expectedViolations: cd.expectedViolations ?? 0, clinicalTip: cd.clinicalTip ?? "" });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) { setMw(activeCase.initialMW); setLogP(activeCase.initialLogP); setHbd(activeCase.initialHBD); setHba(activeCase.initialHBA); }
  }, [activeCase]);

  const result = useMemo(() => computeLipinski(mw, logP, hbd, hba), [mw, logP, hbd, hba]);
  const scatterData = [...KNOWN_DRUGS.map(d => ({ ...d, z: 8 })), { name: "Seu Composto", mw, logP, hbd, hba, z: 12 }];

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return;
    const ok = result.violations === activeCase.expectedViolations;
    submitResults({ score: ok ? 100 : 40, actions: { mw, logP, hbd, hba, violations: result.violations } });
  }, [activeCase, result, mw, logP, hbd, hba, submitted, submitResults]);

  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, initialMW: c.initialMW ?? 350, initialLogP: c.initialLogP ?? 2.5, initialHBD: c.initialHBD ?? 2, initialHBA: c.initialHBA ?? 5, expectedViolations: c.expectedViolations ?? 0, clinicalTip: c.clinicalTip ?? "" });

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Regra de Lipinski e Druglikeness</h1>
            <p className="text-muted-foreground">Avalie propriedades físico-químicas e espaço de druglikeness.</p>
            <AdminPromptViewer toolSlug="sim-lipinski" toolName="Lipinski / Druglikeness" toolType="simulator" prompt={getNativePrompt("sim-lipinski") || ""} />
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
                <CaseCardMeta caseItem={c} />
                <AdminCaseActions caseItem={c} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />
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
          <CardHeader><CardTitle className="text-base">Propriedades do Composto</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Massa Molecular (Da)</label><span className={`text-sm font-bold ${mw > 500 ? 'text-destructive' : ''}`}>{mw}</span></div><Slider value={[mw]} onValueChange={([v]) => setMw(v)} min={100} max={1200} step={10} /></div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">logP</label><span className={`text-sm font-bold ${logP > 5 ? 'text-destructive' : ''}`}>{logP}</span></div><Slider value={[logP * 10]} onValueChange={([v]) => setLogP(v / 10)} min={-20} max={80} step={1} /></div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">H-Bond Donors (HBD)</label><span className={`text-sm font-bold ${hbd > 5 ? 'text-destructive' : ''}`}>{hbd}</span></div><Slider value={[hbd]} onValueChange={([v]) => setHbd(v)} min={0} max={15} step={1} /></div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">H-Bond Acceptors (HBA)</label><span className={`text-sm font-bold ${hba > 10 ? 'text-destructive' : ''}`}>{hba}</span></div><Slider value={[hba]} onValueChange={([v]) => setHba(v)} min={0} max={25} step={1} /></div>
            <Button variant="outline" onClick={handleFinish} disabled={submitted} className="w-full">Finalizar Caso</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Avaliação de Druglikeness</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className={`p-3 rounded-lg text-center ${result.druglike ? 'bg-primary/10' : 'bg-destructive/10'}`}><p className="text-xs text-muted-foreground">Violações Lipinski</p><p className="text-2xl font-bold">{result.violations}</p></div>
              <div className={`p-3 rounded-lg text-center ${result.veberOk ? 'bg-primary/10' : 'bg-destructive/10'}`}><p className="text-xs text-muted-foreground">Veber</p><p className="text-xl font-bold">{result.veberOk ? "✓ OK" : "✗ Falha"}</p></div>
              <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">PSA (Å²)</p><p className="text-xl font-bold">{result.psa}</p></div>
              <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">Rot. Bonds (est.)</p><p className="text-xl font-bold">{result.rotBonds}</p></div>
            </div>
            <div className={`p-3 rounded-lg text-center ${result.druglike ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
              <p className="font-bold text-lg">{result.druglike ? "✓ Drug-like" : "✗ Fora do espaço de druglikeness"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Espaço Químico: MW vs logP</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" dataKey="mw" name="MW" domain={[0, 1300]} stroke="hsl(var(--muted-foreground))" label={{ value: "MW (Da)", position: "insideBottom", offset: -5 }} />
              <YAxis type="number" dataKey="logP" name="logP" domain={[-3, 8]} stroke="hsl(var(--muted-foreground))" label={{ value: "logP", angle: -90, position: "insideLeft" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <ReferenceArea x1={0} x2={500} y1={-3} y2={5} fill="hsl(var(--primary))" fillOpacity={0.05} label={{ value: "Zona Lipinski", fill: "hsl(var(--primary))" }} />
              <ReferenceLine x={500} stroke="hsl(var(--destructive))" strokeDasharray="5 5" />
              <ReferenceLine y={5} stroke="hsl(var(--destructive))" strokeDasharray="5 5" />
              <Scatter name="Fármacos Conhecidos" data={KNOWN_DRUGS} fill="hsl(var(--muted-foreground))" />
              <Scatter name="Seu Composto" data={[{ mw, logP }]} fill="hsl(var(--primary))" />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p></CardContent></Card>
      <SimulatorChallengeMode challengeSet={getChallengesBySlug(SLUG)} simulatorState={{ mw, logP, hbd, hba, violations: result.violations, psa: result.psa }} />
    </div>
  );
}
