import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Sparkles, Loader2, TestTube } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getTitulacaoAminoacidosChallenges } from "@/data/simulatorChallenges";

const SLUG = "titulacao-aminoacidos";

interface AminoAcid {
  name: string;
  pKa1: number; // α-COOH
  pKa2: number; // α-NH3+
  pKaR?: number; // side chain
  pI: number;
  sideChainType: string;
}

const AMINO_ACIDS: AminoAcid[] = [
  { name: "Glicina", pKa1: 2.34, pKa2: 9.60, pI: 5.97, sideChainType: "Não ionizável" },
  { name: "Ácido Glutâmico", pKa1: 2.19, pKa2: 9.67, pKaR: 4.25, pI: 3.22, sideChainType: "Ácido (γ-COOH)" },
  { name: "Lisina", pKa1: 2.18, pKa2: 8.95, pKaR: 10.53, pI: 9.74, sideChainType: "Básico (ε-NH₃⁺)" },
  { name: "Histidina", pKa1: 1.82, pKa2: 9.17, pKaR: 6.00, pI: 7.59, sideChainType: "Básico (Imidazol)" },
];

interface TitrationCase {
  id?: string;
  title: string;
  difficulty: string;
  isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  aminoAcidIndex: number;
  startpH: number;
  clinicalTip: string;
}

const BUILT_IN_CASES: TitrationCase[] = [
  {
    title: "Titulação de Glicina — Aminoácido Simples",
    difficulty: "Fácil",
    patient: { name: "Exercício 1", age: 0, weight: 0, diagnosis: "Titulação de aminoácido monoamino monocarboxílico" },
    scenario: "Titule a glicina desde pH 0 até pH 14. Identifique os dois valores de pKa (α-COOH e α-NH₃⁺) e o ponto isoelétrico. A glicina possui apenas dois grupos ionizáveis.",
    aminoAcidIndex: 0, startpH: 1.0,
    clinicalTip: "O pI de um aminoácido sem cadeia lateral ionizável é a média dos dois pKa: pI = (pKa1 + pKa2) / 2 = (2.34 + 9.60) / 2 = 5.97.",
  },
  {
    title: "Titulação de Ácido Glutâmico — Cadeia Lateral Ácida",
    difficulty: "Médio",
    patient: { name: "Exercício 2", age: 0, weight: 0, diagnosis: "Aminoácido com cadeia lateral ácida" },
    scenario: "O ácido glutâmico possui 3 grupos ionizáveis: α-COOH (pKa1), γ-COOH (pKaR) e α-NH₃⁺ (pKa2). O pI é a média dos dois pKa mais ácidos.",
    aminoAcidIndex: 1, startpH: 1.0,
    clinicalTip: "Para aminoácidos ácidos: pI = (pKa1 + pKaR) / 2. Para o glutamato: pI = (2.19 + 4.25) / 2 = 3.22. O glutamato está negativamente carregado a pH fisiológico (7.4).",
  },
  {
    title: "Titulação de Histidina — Tampão Fisiológico",
    difficulty: "Difícil",
    patient: { name: "Exercício 3", age: 0, weight: 0, diagnosis: "Aminoácido com pKaR próximo do pH fisiológico" },
    scenario: "A histidina possui o anel imidazol com pKaR = 6.0, próximo do pH fisiológico. Isto torna-a um excelente tampão intracelular e é essencial na catálise enzimática.",
    aminoAcidIndex: 3, startpH: 0.5,
    clinicalTip: "A histidina é o único aminoácido cujo pKaR (~6.0) está próximo do pH fisiológico, tornando-o eficaz como tampão e participante na catálise ácido-base em enzimas (ex: tríade catalítica das serina-proteases).",
  },
];

function computeTitrationCurve(aa: AminoAcid): { pH: number; equivalents: number; charge: number }[] {
  const points: { pH: number; equivalents: number; charge: number }[] = [];
  const pKas = [aa.pKa1, ...(aa.pKaR ? [aa.pKaR] : []), aa.pKa2].sort((a, b) => a - b);

  for (let pH = 0; pH <= 14; pH += 0.1) {
    // Henderson-Hasselbalch for each group
    const alpha1 = 1 / (1 + Math.pow(10, pH - aa.pKa1)); // fraction protonated for COOH
    const alpha2 = 1 / (1 + Math.pow(10, pH - aa.pKa2)); // fraction protonated for NH3+
    const alphaR = aa.pKaR ? 1 / (1 + Math.pow(10, pH - aa.pKaR)) : 0;

    // Charge calculation
    let charge = alpha2; // NH3+ contributes +1 when protonated
    charge -= (1 - alpha1); // COO- contributes -1 when deprotonated
    if (aa.pKaR) {
      if (aa.sideChainType.includes("Ácido")) {
        charge -= (1 - alphaR); // acidic side chain: -1 when deprotonated
      } else {
        charge += alphaR; // basic side chain: +1 when protonated
      }
    }

    // Equivalents of OH- added (simplified)
    const totalProtons = aa.pKaR ? 3 : 2;
    const protonsRemaining = alpha1 + alpha2 + (aa.pKaR ? alphaR : 0);
    const equivalents = totalProtons - protonsRemaining;

    points.push({ pH: +pH.toFixed(1), equivalents: +equivalents.toFixed(2), charge: +charge.toFixed(2) });
  }
  return points;
}

export default function SimuladorTitulacaoAminoacidos() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<TitrationCase | null>(null);
  const [selectedAA, setSelectedAA] = useState(0);
  const [currentpH, setCurrentpH] = useState(1.0);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase.case_data as any;
      setActiveCase({
        id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.is_ai_generated,
        patient: cd.patient, scenario: cd.scenario, aminoAcidIndex: cd.aminoAcidIndex ?? 0,
        startpH: cd.startpH ?? 1.0, clinicalTip: cd.clinicalTip ?? "",
      });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) {
      setSelectedAA(activeCase.aminoAcidIndex);
      setCurrentpH(activeCase.startpH);
    }
  }, [activeCase]);

  const aa = AMINO_ACIDS[selectedAA];
  const curveData = useMemo(() => computeTitrationCurve(aa), [aa]);

  const currentPoint = useMemo(() => {
    const closest = curveData.reduce((prev, curr) =>
      Math.abs(curr.pH - currentpH) < Math.abs(prev.pH - currentpH) ? curr : prev
    );
    return closest;
  }, [curveData, currentpH]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return;
    submitResults({ score: 100, actions: { aminoAcid: aa.name, currentpH } });
  }, [activeCase, aa, currentpH, submitted, submitResults]);

  const loadAICase = (c: any) => {
    setActiveCase({
      id: c.id, title: c.title, difficulty: c.difficulty, isAI: true,
      patient: c.patient, scenario: c.scenario, aminoAcidIndex: c.aminoAcidIndex ?? 0,
      startpH: c.startpH ?? 1.0, clinicalTip: c.clinicalTip ?? "",
    });
  };

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Titulação de Aminoácidos</h1>
            <p className="text-muted-foreground">Curvas de titulação, pKa, pI e carga líquida</p>
            <AdminPromptViewer toolSlug="sim-titulacao-aminoacidos" toolName="Titulação de Aminoácidos" toolType="simulator" prompt={getNativePrompt("sim-titulacao-aminoacidos") || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TestTube className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {BUILT_IN_CASES.map((c, i) => (
              <button key={i} onClick={() => setActiveCase(c)} className="w-full text-left p-4 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-colors">
                <div className="flex items-center justify-between mb-1"><span className="font-semibold">{c.title}</span><Badge variant="outline">{c.difficulty}</Badge></div>
                <p className="text-sm text-muted-foreground">{c.scenario?.substring(0, 100)}...</p>
              </button>
            ))}
            {aiCases.filter((c: any) => c.isAI).map((c: any) => (
              <button key={c.id} onClick={() => loadAICase(c)} className="w-full text-left p-4 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-colors">
                <div className="flex items-center justify-between mb-1"><span className="font-semibold">{c.title}</span><div className="flex gap-2"><Badge variant="secondary">IA</Badge><Badge variant="outline">{c.difficulty}</Badge></div></div>
                <CaseCardMeta caseItem={c} />
                <AdminCaseActions caseItem={c} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />
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
        <CardContent className="pt-4">
          <p className="text-sm">{activeCase.scenario}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Aminoácido</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {AMINO_ACIDS.map((a, i) => (
                <button key={a.name} onClick={() => setSelectedAA(i)}
                  className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${selectedAA === i ? "bg-primary/10 border-primary/30" : "hover:bg-muted/50"}`}>
                  <div className="flex justify-between">
                    <span className="font-semibold">{a.name}</span>
                    <span className="text-xs text-muted-foreground">{a.sideChainType}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    pKa1={a.pKa1} | pKa2={a.pKa2}{a.pKaR ? ` | pKaR=${a.pKaR}` : ""} | pI={a.pI}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">pH do Meio</CardTitle></CardHeader>
            <CardContent>
              <div className="flex justify-between text-sm mb-2"><span>pH</span><span className="font-semibold text-lg">{currentpH.toFixed(1)}</span></div>
              <Slider value={[currentpH * 10]} onValueChange={([v]) => setCurrentpH(v / 10)} min={0} max={140} step={1} />
              <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Carga Líquida</p>
                  <p className={`text-xl font-bold ${currentPoint.charge > 0 ? "text-chart-1" : currentPoint.charge < 0 ? "text-destructive" : "text-primary"}`}>
                    {currentPoint.charge > 0 ? "+" : ""}{currentPoint.charge.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Eq. OH⁻</p>
                  <p className="text-xl font-bold text-primary">{currentPoint.equivalents.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">pI</p>
                  <p className="text-xl font-bold text-primary">{aa.pI}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Curva de Titulação — {aa.name}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={curveData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="equivalents" label={{ value: "Equivalentes de OH⁻", position: "insideBottom", offset: -5 }} />
                  <YAxis domain={[0, 14]} label={{ value: "pH", angle: -90, position: "insideLeft" }} />
                  <Tooltip formatter={(v: number) => v.toFixed(2)} />
                  <ReferenceLine y={aa.pKa1} stroke="hsl(var(--chart-1))" strokeDasharray="5 5" label={{ value: `pKa1=${aa.pKa1}`, position: "right", fontSize: 10 }} />
                  <ReferenceLine y={aa.pKa2} stroke="hsl(var(--chart-3))" strokeDasharray="5 5" label={{ value: `pKa2=${aa.pKa2}`, position: "right", fontSize: 10 }} />
                  {aa.pKaR && <ReferenceLine y={aa.pKaR} stroke="hsl(var(--chart-5))" strokeDasharray="5 5" label={{ value: `pKaR=${aa.pKaR}`, position: "right", fontSize: 10 }} />}
                  <ReferenceLine y={aa.pI} stroke="hsl(var(--primary))" strokeDasharray="3 3" label={{ value: `pI=${aa.pI}`, position: "left", fontSize: 10 }} />
                  <ReferenceLine y={currentpH} stroke="hsl(var(--destructive))" strokeWidth={2} label={{ value: `pH=${currentpH.toFixed(1)}`, position: "right", fontSize: 11 }} />
                  <Line type="monotone" dataKey="pH" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Carga vs pH</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={curveData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="pH" label={{ value: "pH", position: "insideBottom", offset: -5 }} />
                  <YAxis label={{ value: "Carga", angle: -90, position: "insideLeft" }} />
                  <Tooltip formatter={(v: number) => v.toFixed(2)} />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
                  <ReferenceLine x={aa.pI} stroke="hsl(var(--primary))" strokeDasharray="3 3" label={{ value: "pI", position: "top", fontSize: 10 }} />
                  <ReferenceLine x={currentpH} stroke="hsl(var(--destructive))" strokeWidth={2} />
                  <Line type="monotone" dataKey="charge" name="Carga" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
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
        challengeSet={getTitulacaoAminoacidosChallenges()}
        simulatorState={{ selectedAA, currentpH }}
      />
    </div>
  );
}
