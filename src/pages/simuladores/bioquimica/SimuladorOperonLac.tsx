import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Sparkles, Loader2, Dna } from "lucide-react";
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
import { getOperonLacChallenges } from "@/data/simulatorChallenges";

const SLUG = "operon-lac";

interface OperonCase {
  id?: string;
  title: string;
  difficulty: string;
  isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  initialGlucose: number;
  initialLactose: number;
  expectedTranscription: [number, number];
  clinicalTip: string;
}

const BUILT_IN_CASES: OperonCase[] = [
  {
    title: "Crescimento Diáuxico — Transição Glicose → Lactose",
    difficulty: "Médio",
    patient: { name: "Exercício 1", age: 0, weight: 0, diagnosis: "Regulação do operão lac em E. coli" },
    scenario: "Bactéria E. coli cresce primeiro em glicose (fonte preferida). Quando a glicose se esgota, o cAMP aumenta, CAP liga-se ao promotor e, se a lactose estiver presente, a alolactose desreprime o operon. Observe a fase de latência (lag) do crescimento diáuxico.",
    initialGlucose: 80, initialLactose: 60,
    expectedTranscription: [0, 20],
    clinicalTip: "O crescimento diáuxico demonstra a repressão catabólica: a glicose inibe a expressão de genes para metabolismo de outras fontes de carbono, garantindo eficiência metabólica.",
  },
  {
    title: "Indução Máxima — Lactose sem Glicose",
    difficulty: "Fácil",
    patient: { name: "Exercício 2", age: 0, weight: 0, diagnosis: "Condições de indução máxima do operão lac" },
    scenario: "Meio com lactose mas sem glicose. O cAMP está elevado (CAP ativo), e a alolactose (derivada da lactose) liga-se ao repressor LacI, causando a desrepressão máxima do operon.",
    initialGlucose: 0, initialLactose: 80,
    expectedTranscription: [80, 100],
    clinicalTip: "Para expressão máxima do operão lac são necessárias DUAS condições simultâneas: 1) ausência de glicose (↑cAMP → CAP ativo) e 2) presença de lactose (alolactose desreprime LacI).",
  },
  {
    title: "Mutação no Operador — Operão Constitutivo",
    difficulty: "Difícil",
    patient: { name: "Exercício 3", age: 0, weight: 0, diagnosis: "Mutação Oc (operador constitutivo)" },
    scenario: "Mutação no operador (Oc) que impede a ligação do repressor LacI. O operon é transcrito constitutivamente, independentemente da presença de lactose. Apenas a regulação positiva por CAP-cAMP persiste.",
    initialGlucose: 50, initialLactose: 0,
    expectedTranscription: [20, 60],
    clinicalTip: "Mutações Oc no operador são cis-dominantes: afetam apenas os genes no mesmo cromossoma. Em diplóides parciais (F'/chromossome), o alelo Oc afeta apenas a cópia adjacente do operão.",
  },
];

export default function SimuladorOperonLac() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<OperonCase | null>(null);
  const [glucose, setGlucose] = useState(50);
  const [lactose, setLactose] = useState(50);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase.case_data as any;
      setActiveCase({
        id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.is_ai_generated,
        patient: cd.patient, scenario: cd.scenario, initialGlucose: cd.initialGlucose ?? 50,
        initialLactose: cd.initialLactose ?? 50, expectedTranscription: cd.expectedTranscription ?? [0, 100],
        clinicalTip: cd.clinicalTip ?? "",
      });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) {
      setGlucose(activeCase.initialGlucose);
      setLactose(activeCase.initialLactose);
    }
  }, [activeCase]);

  const model = useMemo(() => {
    // cAMP is inversely proportional to glucose
    const camp = Math.max(0, 100 - glucose);
    // CAP-cAMP complex activity
    const capActive = camp > 30 ? (camp - 30) / 70 : 0; // threshold effect

    // Allolactose from lactose
    const allolactose = lactose * 0.8;
    // Repressor inactivation by allolactose
    const repressorFree = allolactose > 20 ? Math.min(1, (allolactose - 20) / 60) : 0;

    // Transcription requires: CAP active (positive) AND repressor inactive (derepression)
    // Basal level ~2% even fully repressed
    const positiveRegulation = capActive; // 0-1
    const negativeRegulation = repressorFree; // 0-1 (1 = fully derepressed)

    const transcription = Math.min(100, 2 + positiveRegulation * negativeRegulation * 98);

    // β-galactosidase proportional to transcription
    const betaGal = transcription * 0.95;
    // Permease
    const permease = transcription * 0.9;

    return {
      camp: Math.round(camp),
      capActive: Math.round(capActive * 100),
      allolactose: Math.round(allolactose),
      repressorBound: Math.round((1 - repressorFree) * 100),
      transcription: Math.round(transcription),
      betaGal: Math.round(betaGal),
      permease: Math.round(permease),
    };
  }, [glucose, lactose]);

  // Time-course of gene expression when conditions change
  const expressionTimeline = useMemo(() => {
    const pts = [];
    for (let m = 0; m <= 60; m += 5) {
      const rampFactor = Math.min(1, m / 30); // takes ~30 min to reach steady state
      pts.push({
        tempo: `${m}min`,
        betaGal: Math.round(model.betaGal * rampFactor),
        permease: Math.round(model.permease * rampFactor),
        camp: model.camp,
      });
    }
    return pts;
  }, [model]);

  const regulationData = [
    { name: "cAMP", value: model.camp },
    { name: "CAP ativo", value: model.capActive },
    { name: "Alolactose", value: model.allolactose },
    { name: "Repressor\nligado", value: model.repressorBound },
    { name: "Transcrição", value: model.transcription },
  ];

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return;
    const ok = model.transcription >= activeCase.expectedTranscription[0] && model.transcription <= activeCase.expectedTranscription[1];
    const s = ok ? 100 : Math.max(0, 100 - Math.abs(model.transcription - (activeCase.expectedTranscription[0] + activeCase.expectedTranscription[1]) / 2) * 2);
    submitResults({ score: Math.round(s), actions: { glucose, lactose, transcription: model.transcription } });
  }, [activeCase, model, glucose, lactose, submitted, submitResults]);

  const loadAICase = (c: any) => {
    setActiveCase({
      id: c.id, title: c.title, difficulty: c.difficulty, isAI: true,
      patient: c.patient, scenario: c.scenario, initialGlucose: c.initialGlucose ?? 50,
      initialLactose: c.initialLactose ?? 50, expectedTranscription: c.expectedTranscription ?? [0, 100],
      clinicalTip: c.clinicalTip ?? "",
    });
  };

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Operon Lac — Regulação Genética</h1>
            <p className="text-muted-foreground">Regulação positiva (CAP-cAMP) e negativa (repressor LacI) da transcrição</p>
            <AdminPromptViewer toolSlug="sim-operon-lac" toolName="Operon Lac" toolType="simulator" prompt={getNativePrompt("sim-operon-lac") || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Dna className="h-5 w-5 text-primary" /> Casos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {BUILT_IN_CASES.map((c, i) => (
              <NativeCaseCard key={i} caseItem={c} onClick={() => setActiveCase(c)} />
            ))}
            {aiCases.filter((c: any) => c.isAI).map((c: any) => (
              <AICaseCard key={c.id} caseItem={c} onClick={() => loadAICase(c)} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />
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
        <CardContent className="pt-4">
          <p className="text-sm">{activeCase.scenario}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Meio Ambiente</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="flex justify-between text-sm mb-2"><span>Glicose no meio</span><span className="font-semibold">{glucose}%</span></div>
                <Slider value={[glucose]} onValueChange={([v]) => setGlucose(v)} min={0} max={100} step={5} />
                <p className="text-xs text-muted-foreground mt-1">↑ Glicose → ↓ cAMP → CAP inativo</p>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2"><span>Lactose no meio</span><span className="font-semibold">{lactose}%</span></div>
                <Slider value={[lactose]} onValueChange={([v]) => setLactose(v)} min={0} max={100} step={5} />
                <p className="text-xs text-muted-foreground mt-1">↑ Lactose → ↑ Alolactose → Repressor inativo</p>
              </div>
            </CardContent>
          </Card>

          {/* DNA Diagram */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Estrutura do Operon</CardTitle></CardHeader>
            <CardContent>
              <div className="text-xs font-mono space-y-2">
                <div className="flex gap-1 items-center">
                  <div className="px-2 py-1 rounded bg-muted text-muted-foreground">lacI</div>
                  <span>→</span>
                  <div className={`px-2 py-1 rounded ${model.capActive > 30 ? "bg-primary/20 border border-primary/40" : "bg-muted"}`}>
                    P <span className="text-[10px]">{model.capActive > 30 ? "(CAP ✓)" : "(CAP ✗)"}</span>
                  </div>
                  <div className={`px-2 py-1 rounded ${model.repressorBound > 50 ? "bg-destructive/20 border border-destructive/40" : "bg-primary/20 border border-primary/40"}`}>
                    O <span className="text-[10px]">{model.repressorBound > 50 ? "(Rep ✓)" : "(Rep ✗)"}</span>
                  </div>
                  <span>→</span>
                  <div className={`px-2 py-1 rounded ${model.transcription > 10 ? "bg-primary/20" : "bg-muted"}`}>lacZ</div>
                  <div className={`px-2 py-1 rounded ${model.transcription > 10 ? "bg-primary/20" : "bg-muted"}`}>lacY</div>
                  <div className={`px-2 py-1 rounded ${model.transcription > 10 ? "bg-primary/20" : "bg-muted"}`}>lacA</div>
                </div>
                <div className="text-muted-foreground">
                  {model.repressorBound > 50 && "⛔ Repressor ligado ao operador — transcrição bloqueada"}
                  {model.repressorBound <= 50 && model.capActive <= 30 && "⚠️ Repressor inativo mas CAP inativo — transcrição basal"}
                  {model.repressorBound <= 50 && model.capActive > 30 && "✅ Repressor inativo + CAP ativo — transcrição máxima!"}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Estado Regulatório</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={regulationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="value" name="Nível (%)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Produtos do Operão</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 text-center mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Transcrição</p>
                  <p className={`text-2xl font-bold ${model.transcription > 50 ? "text-primary" : "text-muted-foreground"}`}>{model.transcription}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">β-Galactosidase</p>
                  <p className="text-2xl font-bold text-primary">{model.betaGal}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Permease</p>
                  <p className="text-2xl font-bold text-primary">{model.permease}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Expressão Génica ao Longo do Tempo</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={expressionTimeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tempo" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="betaGal" name="β-Galactosidase (%)" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="permease" name="Permease (%)" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="camp" name="cAMP (%)" stroke="hsl(var(--chart-1))" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Truth table */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Tabela de Regulação</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Glicose</th>
                      <th className="text-left p-2">Lactose</th>
                      <th className="text-left p-2">cAMP</th>
                      <th className="text-left p-2">CAP</th>
                      <th className="text-left p-2">Repressor</th>
                      <th className="text-left p-2">Transcrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { glu: "+", lac: "-", camp: "Baixo", cap: "Inativo", rep: "Ligado", trans: "Muito Baixa" },
                      { glu: "+", lac: "+", camp: "Baixo", cap: "Inativo", rep: "Livre", trans: "Baixa" },
                      { glu: "-", lac: "-", camp: "Alto", cap: "Ativo", rep: "Ligado", trans: "Baixa" },
                      { glu: "-", lac: "+", camp: "Alto", cap: "Ativo", rep: "Livre", trans: "MÁXIMA ✅" },
                    ].map((row, i) => {
                      const isCurrentState =
                        (row.glu === "+" ? glucose > 30 : glucose <= 30) &&
                        (row.lac === "+" ? lactose > 30 : lactose <= 30);
                      return (
                        <tr key={i} className={`border-b ${isCurrentState ? "bg-primary/10 font-semibold" : ""}`}>
                          <td className="p-2">{row.glu}</td>
                          <td className="p-2">{row.lac}</td>
                          <td className="p-2">{row.camp}</td>
                          <td className="p-2">{row.cap}</td>
                          <td className="p-2">{row.rep}</td>
                          <td className="p-2">{row.trans}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleFinish} disabled={submitted}>Finalizar Simulação</Button>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold text-primary mb-1">💡 Dica Clínica</p>
          <p className="text-sm">{activeCase.clinicalTip}</p>
        </CardContent>
      </Card>

      <SimulatorChallengeMode
        challengeSet={getOperonLacChallenges()}
        simulatorState={{ glucose, lactose }}
      />
    </div>
  );
}
