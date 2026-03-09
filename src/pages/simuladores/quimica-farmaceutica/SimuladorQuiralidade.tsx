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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getChallengesBySlug } from "@/data/simulatorChallenges";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SLUG = "quiralidade";

const CHIRAL_DRUGS = [
  { id: "omeprazol", name: "Omeprazol / Esomeprazol", eutomer: "S-omeprazol", distomer: "R-omeprazol", eutomerPotency: 85, distomerPotency: 45, eutomerToxicity: 15, distomerToxicity: 20, eutomerMetab: 70, distomerMetab: 50, eudismicRatio: 1.9, chiralSwitch: true },
  { id: "ibuprofeno", name: "Ibuprofeno R / S", eutomer: "S-ibuprofeno", distomer: "R-ibuprofeno", eutomerPotency: 90, distomerPotency: 10, eutomerToxicity: 20, distomerToxicity: 15, eutomerMetab: 60, distomerMetab: 65, eudismicRatio: 9.0, chiralSwitch: false },
  { id: "talidomida", name: "Talidomida R / S", eutomer: "R-talidomida", distomer: "S-talidomida", eutomerPotency: 80, distomerPotency: 75, eutomerToxicity: 10, distomerToxicity: 95, eutomerMetab: 50, distomerMetab: 50, eudismicRatio: 1.1, chiralSwitch: false },
  { id: "metotrexato", name: "Metotrexato L / D", eutomer: "L-metotrexato", distomer: "D-metotrexato", eutomerPotency: 95, distomerPotency: 5, eutomerToxicity: 60, distomerToxicity: 5, eutomerMetab: 40, distomerMetab: 80, eudismicRatio: 19.0, chiralSwitch: false },
];

interface ChirCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; drug: string; context: string };
  scenario: string; initialDrug: string; initialEnantiomericExcess: number;
  expectedAnswer: string; clinicalTip: string;
}

const BUILT_IN_CASES: ChirCase[] = [
  {
    title: "Esomeprazol – O Primeiro Chiral Switch de Sucesso",
    difficulty: "Fácil",
    patient: { name: "AstraZeneca", drug: "Omeprazol → Esomeprazol", context: "IBP de 2ª geração" },
    scenario: "O omeprazol é um racemato. A AstraZeneca lançou o S-enantiômero puro (esomeprazol) com melhor biodisponibilidade. Compare eutômero vs distômero e calcule a razão eudísmica.",
    initialDrug: "omeprazol", initialEnantiomericExcess: 100,
    expectedAnswer: "eutomer",
    clinicalTip: "O esomeprazol (S) tem menor metabolismo de primeira passagem por CYP2C19, resultando em AUC 65% maior que o racemato na mesma dose.",
  },
  {
    title: "Talidomida – Tragédia da Estereoquímica",
    difficulty: "Médio",
    patient: { name: "Caso Histórico", drug: "Talidomida", context: "Teratogênico" },
    scenario: "A talidomida racêmica causou focomelia nos anos 60. O S-enantiômero é teratogênico. Analise por que separar enantiômeros não resolve o problema (racemização in vivo).",
    initialDrug: "talidomida", initialEnantiomericExcess: 50,
    expectedAnswer: "racemizacao",
    clinicalTip: "A talidomida racemiza in vivo em pH fisiológico (t½ ~4h). Mesmo administrando R puro, 50% se converte em S. Por isso, é contraindicada na gravidez independente do enantiômero.",
  },
  {
    title: "Ibuprofeno – Inversão Quiral In Vivo",
    difficulty: "Difícil",
    patient: { name: "Design de AINE", drug: "Ibuprofeno", context: "Analgésico/Anti-inflamatório" },
    scenario: "O R-ibuprofeno é inativo como anti-inflamatório, mas é convertido em S (ativo) por uma isomerase. Analise se o dexibuprofeno (S puro) oferece vantagem clínica real.",
    initialDrug: "ibuprofeno", initialEnantiomericExcess: 100,
    expectedAnswer: "eutomer",
    clinicalTip: "A razão eudísmica do ibuprofeno é ~100× (COX). Porém, a inversão R→S in vivo (60-70%) torna o racemato clinicamente similar ao S puro, mas com maior custo do dexibuprofeno.",
  },
];

export default function SimuladorQuiralidade() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<ChirCase | null>(null);
  const [drugId, setDrugId] = useState("omeprazol");
  const [ee, setEe] = useState(100);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase.case_data as any;
      setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.is_ai_generated, patient: cd.patient, scenario: cd.scenario, initialDrug: cd.initialDrug ?? "omeprazol", initialEnantiomericExcess: cd.initialEnantiomericExcess ?? 100, expectedAnswer: cd.expectedAnswer ?? "eutomer", clinicalTip: cd.clinicalTip ?? "" });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) { setDrugId(activeCase.initialDrug); setEe(activeCase.initialEnantiomericExcess); }
  }, [activeCase]);

  const drug = CHIRAL_DRUGS.find(d => d.id === drugId) || CHIRAL_DRUGS[0];
  const eeFraction = ee / 100;
  const eutomerFraction = (1 + eeFraction) / 2;
  const distomerFraction = 1 - eutomerFraction;

  const comparisonData = useMemo(() => [
    { property: "Potência", eutomer: drug.eutomerPotency, distomer: drug.distomerPotency, mixture: Math.round(drug.eutomerPotency * eutomerFraction + drug.distomerPotency * distomerFraction) },
    { property: "Toxicidade", eutomer: drug.eutomerToxicity, distomer: drug.distomerToxicity, mixture: Math.round(drug.eutomerToxicity * eutomerFraction + drug.distomerToxicity * distomerFraction) },
    { property: "Metabolismo", eutomer: drug.eutomerMetab, distomer: drug.distomerMetab, mixture: Math.round(drug.eutomerMetab * eutomerFraction + drug.distomerMetab * distomerFraction) },
  ], [drug, eutomerFraction, distomerFraction]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return;
    submitResults({ score: 80, actions: { drugId, ee, eutomerFraction } });
  }, [activeCase, drugId, ee, eutomerFraction, submitted, submitResults]);

  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, initialDrug: c.initialDrug ?? "omeprazol", initialEnantiomericExcess: c.initialEnantiomericExcess ?? 100, expectedAnswer: c.expectedAnswer ?? "eutomer", clinicalTip: c.clinicalTip ?? "" });

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Quiralidade e Estereoquímica Farmacológica</h1>
            <p className="text-muted-foreground">Compare enantiômeros: eutômero vs distômero em potência, toxicidade e metabolismo.</p>
            <AdminPromptViewer toolSlug="sim-quiralidade" toolName="Quiralidade" toolType="simulator" prompt={getNativePrompt("sim-quiralidade") || ""} />
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
          <CardHeader><CardTitle className="text-base">Parâmetros Estereoquímicos</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-2 block">Fármaco Quiral</label>
              <Select value={drugId} onValueChange={setDrugId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CHIRAL_DRUGS.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><div className="flex justify-between mb-2"><label className="text-sm font-medium">Excesso Enantiomérico (%ee)</label><span className="text-sm font-bold">{ee}%</span></div><Slider value={[ee]} onValueChange={([v]) => setEe(v)} min={0} max={100} step={5} /><p className="text-xs text-muted-foreground mt-1">0% = racemato | 100% = enantiômero puro (eutômero)</p></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-primary/10 text-center"><p className="text-xs text-muted-foreground">Eutômero</p><p className="text-sm font-bold">{drug.eutomer}</p><p className="text-lg font-bold">{Math.round(eutomerFraction * 100)}%</p></div>
              <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">Distômero</p><p className="text-sm font-bold">{drug.distomer}</p><p className="text-lg font-bold">{Math.round(distomerFraction * 100)}%</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">Razão Eudísmica</p><p className="text-xl font-bold">{drug.eudismicRatio}</p></div>
              <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">Chiral Switch?</p><p className="text-xl font-bold">{drug.chiralSwitch ? "✓ Sim" : "✗ Não"}</p></div>
            </div>
            <Button variant="outline" onClick={handleFinish} disabled={submitted} className="w-full">Finalizar Caso</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Comparação Eutômero vs Distômero vs Mistura</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="property" stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Bar dataKey="eutomer" name="Eutômero" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="distomer" name="Distômero" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="mixture" name="Mistura atual" fill="hsl(var(--accent-foreground))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p></CardContent></Card>
      <SimulatorChallengeMode challengeSet={getChallengesBySlug(SLUG)} simulatorState={{ drugId, ee, eutomerFraction }} />
    </div>
  );
}
