import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, Loader2, Dna, Eye } from "lucide-react";
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
import { getMutacoesReparoChallenges } from "@/data/simulatorChallenges";

const SLUG = "mutacoes-reparo";

type MutationType = "substituicao" | "delecao" | "insercao" | "frameshift";
type RepairPathway = "MMR" | "BER" | "NER" | "HR" | "NHEJ";

const CODON_TABLE: Record<string, string> = {
  ATG:"Met",TTT:"Phe",TTC:"Phe",TTA:"Leu",TTG:"Leu",CTT:"Leu",CTC:"Leu",CTA:"Leu",CTG:"Leu",
  ATT:"Ile",ATC:"Ile",ATA:"Ile",GTT:"Val",GTC:"Val",GTA:"Val",GTG:"Val",
  TCT:"Ser",TCC:"Ser",TCA:"Ser",TCG:"Ser",CCT:"Pro",CCC:"Pro",CCA:"Pro",CCG:"Pro",
  ACT:"Thr",ACC:"Thr",ACA:"Thr",ACG:"Thr",GCT:"Ala",GCC:"Ala",GCA:"Ala",GCG:"Ala",
  TAT:"Tyr",TAC:"Tyr",CAT:"His",CAC:"His",CAA:"Gln",CAG:"Gln",AAT:"Asn",AAC:"Asn",
  AAA:"Lys",AAG:"Lys",GAT:"Asp",GAC:"Asp",GAA:"Glu",GAG:"Glu",TGT:"Cys",TGC:"Cys",
  TGG:"Trp",CGT:"Arg",CGC:"Arg",CGA:"Arg",CGG:"Arg",AGT:"Ser",AGC:"Ser",AGA:"Arg",AGG:"Arg",
  GGT:"Gly",GGC:"Gly",GGA:"Gly",GGG:"Gly",TAA:"STOP",TAG:"STOP",TGA:"STOP",
};

function translateDNA(dna: string): string[] {
  const aa: string[] = [];
  for (let i = 0; i + 2 < dna.length; i += 3) {
    const c = dna.substring(i, i + 3).toUpperCase();
    aa.push(CODON_TABLE[c] || "?");
    if (CODON_TABLE[c] === "STOP") break;
  }
  return aa;
}

interface MutCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string; originalSequence: string; mutationType: MutationType;
  mutationPosition: number; mutantBase?: string; insertedBase?: string;
  expectedRepair: RepairPathway; clinicalTip: string;
}

const BUILT_IN_CASES: MutCase[] = [
  { title: "Mutação TP53 (Substituição)", difficulty: "Fácil", patient: { name: "Helena Costa", age: 48, weight: 62, diagnosis: "Carcinoma mamário" }, scenario: "Substituição G→A na posição 8 do TP53. Identifique o tipo e escolha a via de reparo.", originalSequence: "ATGACTGAAGCGTCATTTGACCTG", mutationType: "substituicao", mutationPosition: 8, mutantBase: "A", expectedRepair: "MMR", clinicalTip: "TP53 é o gene mais mutado em cânceres (~50%). MMR corrige mismatches pós-replicação. Deficiência = Síndrome de Lynch." },
  { title: "Frameshift em BRCA2", difficulty: "Médio", patient: { name: "Beatriz Alves", age: 35, weight: 55, diagnosis: "Câncer hereditário" }, scenario: "Deleção de 1 base no éxon 11 = frameshift e proteína truncada.", originalSequence: "ATGGCTAAACGTGAATCACTG", mutationType: "delecao", mutationPosition: 7, expectedRepair: "HR", clinicalTip: "BRCA2 participa da HR. Deficiência → resposta a inibidores de PARP (olaparibe). Letalidade sintética." },
  { title: "Dímeros UV — Xeroderma", difficulty: "Difícil", patient: { name: "Antônio Reis", age: 60, weight: 75, diagnosis: "Xeroderma pigmentoso" }, scenario: "Dímeros T-T por UV. Em XP, a via NER é deficiente.", originalSequence: "ATGCTTAAGCCTTTGAACTG", mutationType: "substituicao", mutationPosition: 5, mutantBase: "T", expectedRepair: "NER", clinicalTip: "NER remove dímeros de pirimidina e adutos volumosos. Deficiência = XP (risco 1000x maior de câncer de pele). Proteínas: XPA-XPG, ERCC1." },
];

const REPAIR_INFO: Record<RepairPathway, { name: string; desc: string; consequence: string; genomicStability: number }> = {
  MMR: { name: "Mismatch Repair", desc: "Corrige mismatches pós-replicação (MSH2/MLH1)", consequence: "Sem MMR: acúmulo de mutações pontuais → instabilidade de microssatélites → câncer colorretal", genomicStability: 85 },
  BER: { name: "Base Excision Repair", desc: "Remove bases oxidadas/desaminadas (OGG1, APE1)", consequence: "Sem BER: acúmulo de 8-oxoG → transversões G:C→T:A → envelhecimento e neurodegeneração", genomicStability: 75 },
  NER: { name: "Nucleotide Excision Repair", desc: "Remove lesões volumosas e dímeros UV (XPA-XPG)", consequence: "Sem NER: dímeros persistem → mutações UV-signature (C→T) → carcinomas cutâneos múltiplos", genomicStability: 80 },
  HR: { name: "Recombinação Homóloga", desc: "Reparo de DSBs com cromátide irmã (BRCA1/2, RAD51)", consequence: "Sem HR: DSBs reparadas por NHEJ (impreciso) → translocações e deleções → câncer de mama/ovário", genomicStability: 90 },
  NHEJ: { name: "Non-Homologous End Joining", desc: "Reparo rápido de DSBs sem molde (Ku70/80)", consequence: "Sem NHEJ: DSBs não reparadas → apoptose, imunodeficiência (sem V(D)J recombination)", genomicStability: 60 },
};

export default function SimuladorMutacoesReparo() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, loading: loadingVR, goBack, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<MutCase | null>(null);
  const [selectedRepair, setSelectedRepair] = useState<RepairPathway | null>(null);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastScore, setLastScore] = useState(0);

  useEffect(() => { if (isVirtualRoom && challengeCompleted && !submitted && activeCase) { handleFinish(); } }, [challengeCompleted]);
  useEffect(() => { if (isVirtualRoom && submitted) { const t = setTimeout(() => navigate("/"), 15000); return () => clearTimeout(t); } }, [isVirtualRoom, submitted, navigate]);

  useEffect(() => {
    if (virtualRoomCase) { const cd = virtualRoomCase as any; setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI, patient: cd.patient, scenario: cd.scenario, originalSequence: cd.originalSequence ?? "ATGGCTAAACGTGAATCACTG", mutationType: cd.mutationType ?? "substituicao", mutationPosition: cd.mutationPosition ?? 5, mutantBase: cd.mutantBase, insertedBase: cd.insertedBase, expectedRepair: cd.expectedRepair ?? "MMR", clinicalTip: cd.clinicalTip ?? "" }); }
  }, [virtualRoomCase]);

  useEffect(() => { if (activeCase) setSelectedRepair(null); }, [activeCase]);

  const sequences = useMemo(() => {
    if (!activeCase) return null;
    const orig = activeCase.originalSequence;
    let mutant = "";
    switch (activeCase.mutationType) {
      case "substituicao": mutant = orig.substring(0, activeCase.mutationPosition) + (activeCase.mutantBase || "T") + orig.substring(activeCase.mutationPosition + 1); break;
      case "delecao": case "frameshift": mutant = orig.substring(0, activeCase.mutationPosition) + orig.substring(activeCase.mutationPosition + 1); break;
      case "insercao": mutant = orig.substring(0, activeCase.mutationPosition) + (activeCase.insertedBase || "A") + orig.substring(activeCase.mutationPosition); break;
    }
    return { original: orig, mutant, origAA: translateDNA(orig), mutAA: translateDNA(mutant) };
  }, [activeCase]);

  // Consequence graph: mutation accumulation over time depending on repair choice
  const consequenceData = useMemo(() => {
    if (!selectedRepair || !activeCase) return [];
    const isCorrect = selectedRepair === activeCase.expectedRepair;
    const repairEfficiency = isCorrect ? REPAIR_INFO[selectedRepair].genomicStability / 100 : 0.2;
    return Array.from({ length: 50 }, (_, gen) => ({
      generation: gen,
      mutations: Math.round((1 - repairEfficiency) * gen * 2.5 + Math.random() * gen * 0.3),
      cancerRisk: Math.min(100, Math.round((1 - repairEfficiency) * gen * 3)),
      genomicIntegrity: Math.max(0, Math.round(100 - (1 - repairEfficiency) * gen * 3.5)),
    }));
  }, [selectedRepair, activeCase]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const s = selectedRepair === activeCase.expectedRepair ? 100 : 25;
    setLastScore(s); submitResults({ score: s, actions: { selectedRepair, expectedRepair: activeCase.expectedRepair } });
    return s;
  }, [activeCase, selectedRepair, submitted, submitResults]);

  const loadAICase = (c: any) => { setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, originalSequence: c.originalSequence ?? "ATGGCTAAACGTGAATCACTG", mutationType: c.mutationType ?? "substituicao", mutationPosition: c.mutationPosition ?? 5, mutantBase: c.mutantBase, insertedBase: c.insertedBase, expectedRepair: c.expectedRepair ?? "MMR", clinicalTip: c.clinicalTip ?? "" }); };

  const MUTATION_LABELS: Record<MutationType, string> = { substituicao: "Substituição", delecao: "Deleção", insercao: "Inserção", frameshift: "Frameshift" };

  if (loadingVR) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (isVirtualRoom && !activeCase) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Mutações e Reparo de DNA</h1>
            <p className="text-muted-foreground">Simule mutações e escolha mecanismos de reparo.</p>
            <AdminPromptViewer toolSlug={`sim-${SLUG}`} toolName="Mutações e Reparo" toolType="simulator" prompt={getNativePrompt(`sim-${SLUG}`) || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Dna className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {BUILT_IN_CASES.map((c, i) => <NativeCaseCard key={i} caseItem={c} onClick={() => setActiveCase(c)} />)}
            {aiCases.filter((c: any) => c.isAI).map((c: any) => (<AICaseCard key={c.id} caseItem={c} onClick={() => loadAICase(c)} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />))}
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
        <Button variant="ghost" size="icon" onClick={isVirtualRoom ? goBack : () => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>
        <h2 className="text-xl font-bold">{activeCase.title}</h2>
        <Badge variant="outline">{activeCase.difficulty}</Badge>
        <Badge variant="secondary">{MUTATION_LABELS[activeCase.mutationType]}</Badge>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-2">
          <p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age} anos</p>
          <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
        </CardContent>
      </Card>

      {/* Sequences comparison */}
      {sequences && (
        <Card>
          <CardHeader><CardTitle className="text-base">Comparação de Sequências</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Wild-Type</p>
              <div className="flex flex-wrap gap-0.5 font-mono text-sm">
                {sequences.original.split("").map((base, i) => (
                  <span key={i} className={`px-1 rounded ${i === activeCase.mutationPosition ? "bg-primary/20 ring-2 ring-primary font-bold" : ""}`}>{base}</span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">{sequences.origAA.map((aa, i) => <Badge key={i} variant="outline" className="text-[10px] font-mono">{aa}</Badge>)}</div>
            </div>
            <div>
              <p className="text-xs font-medium text-destructive mb-1">Mutante</p>
              <div className="flex flex-wrap gap-0.5 font-mono text-sm">
                {sequences.mutant.split("").map((base, i) => {
                  const isChanged = i >= activeCase.mutationPosition && (activeCase.mutationType === "substituicao" ? i === activeCase.mutationPosition : true);
                  return <span key={i} className={`px-1 rounded ${isChanged ? "bg-destructive/20 text-destructive font-bold" : ""}`}>{base}</span>;
                })}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {sequences.mutAA.map((aa, i) => {
                  const changed = i < sequences.origAA.length ? aa !== sequences.origAA[i] : true;
                  return <Badge key={i} variant={changed ? "destructive" : "outline"} className="text-[10px] font-mono">{aa}</Badge>;
                })}
              </div>
            </div>
            {sequences.origAA.length !== sequences.mutAA.length && <p className="text-xs text-destructive font-medium">⚠️ Frameshift — proteína com {sequences.mutAA.length} aa (original: {sequences.origAA.length})</p>}
          </CardContent>
        </Card>
      )}

      {/* Repair selection */}
      <Card>
        <CardHeader><CardTitle className="text-base">Selecione a Via de Reparo</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(Object.entries(REPAIR_INFO) as [RepairPathway, typeof REPAIR_INFO[RepairPathway]][]).map(([key, info]) => (
              <Button key={key} variant={selectedRepair === key ? "default" : "outline"} onClick={() => setSelectedRepair(key)} className="h-auto py-3 text-left flex-col items-start" disabled={submitted}>
                <span className="font-bold text-xs">{key} — {info.name}</span>
                <span className="text-[10px] opacity-70 font-normal">{info.desc}</span>
              </Button>
            ))}
          </div>

          {submitted && selectedRepair && (
            <div className={`p-3 rounded-lg border ${selectedRepair === activeCase.expectedRepair ? "border-green-500 bg-green-500/10" : "border-destructive bg-destructive/10"}`}>
              <p className="text-sm font-medium">
                {selectedRepair === activeCase.expectedRepair ? `✅ Correto! ${REPAIR_INFO[activeCase.expectedRepair].name}` : `❌ Via correta: ${activeCase.expectedRepair} — ${REPAIR_INFO[activeCase.expectedRepair].name}`}
              </p>
            </div>
          )}

          {!isVirtualRoom && <Button onClick={() => handleFinish()} disabled={submitted || !selectedRepair} className="w-full">Finalizar</Button>}
        </CardContent>
      </Card>

      {/* Consequence graph */}
      {selectedRepair && consequenceData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Consequências da Escolha: {REPAIR_INFO[selectedRepair].name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`p-3 rounded-lg border mb-4 ${selectedRepair === activeCase.expectedRepair ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"}`}>
              <p className="text-xs">{REPAIR_INFO[selectedRepair].consequence}</p>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={consequenceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="generation" stroke="hsl(var(--muted-foreground))" label={{ value: "Divisões celulares", position: "insideBottom", offset: -5 }} />
                <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" label={{ value: "%", angle: -90, position: "insideLeft" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Line type="monotone" dataKey="genomicIntegrity" name="Integridade Genômica" stroke="hsl(var(--chart-1))" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="cancerRisk" name="Risco de Câncer" stroke="hsl(var(--destructive))" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica Clínica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p></CardContent>
      </Card>

      <SimulatorChallengeMode challengeSet={getMutacoesReparoChallenges()} simulatorState={{ selectedRepair, mutationType: activeCase.mutationType }} onComplete={() => setChallengeCompleted(true)} />

      {isVirtualRoom && submitted && (!showFeedback ? (
        <div className="space-y-2"><Button onClick={() => setShowFeedback(true)} variant="outline" className="w-full gap-2"><Eye className="h-4 w-4" /> Mostrar Resultados</Button><p className="text-xs text-center text-muted-foreground">Redirecionando em 15s...</p></div>
      ) : (
        <div className="space-y-2"><div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center"><div className={`text-3xl font-bold ${lastScore >= 80 ? "text-green-600" : "text-destructive"}`}>{lastScore}%</div></div><p className="text-xs text-center text-muted-foreground">Redirecionando em 15s...</p></div>
      ))}
    </div>
  );
}
