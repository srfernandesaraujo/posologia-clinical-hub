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
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";

const SLUG = "mutacoes-reparo";

type MutationType = "substituicao" | "delecao" | "insercao" | "frameshift";
type RepairPathway = "MMR" | "BER" | "NER" | "HR" | "NHEJ";

const CODON_TABLE: Record<string, string> = {
  ATG: "Met", TTT: "Phe", TTC: "Phe", TTA: "Leu", TTG: "Leu",
  CTT: "Leu", CTC: "Leu", CTA: "Leu", CTG: "Leu",
  ATT: "Ile", ATC: "Ile", ATA: "Ile",
  GTT: "Val", GTC: "Val", GTA: "Val", GTG: "Val",
  TCT: "Ser", TCC: "Ser", TCA: "Ser", TCG: "Ser",
  CCT: "Pro", CCC: "Pro", CCA: "Pro", CCG: "Pro",
  ACT: "Thr", ACC: "Thr", ACA: "Thr", ACG: "Thr",
  GCT: "Ala", GCC: "Ala", GCA: "Ala", GCG: "Ala",
  TAT: "Tyr", TAC: "Tyr", CAT: "His", CAC: "His",
  CAA: "Gln", CAG: "Gln", AAT: "Asn", AAC: "Asn",
  AAA: "Lys", AAG: "Lys", GAT: "Asp", GAC: "Asp",
  GAA: "Glu", GAG: "Glu", TGT: "Cys", TGC: "Cys",
  TGG: "Trp", CGT: "Arg", CGC: "Arg", CGA: "Arg", CGG: "Arg",
  AGT: "Ser", AGC: "Ser", AGA: "Arg", AGG: "Arg",
  GGT: "Gly", GGC: "Gly", GGA: "Gly", GGG: "Gly",
  TAA: "STOP", TAG: "STOP", TGA: "STOP",
};

function translateDNA(dna: string): string[] {
  const aa: string[] = [];
  for (let i = 0; i + 2 < dna.length; i += 3) {
    const codon = dna.substring(i, i + 3).toUpperCase();
    aa.push(CODON_TABLE[codon] || "?");
    if (CODON_TABLE[codon] === "STOP") break;
  }
  return aa;
}

interface MutCase {
  id?: string;
  title: string;
  difficulty: string;
  isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  originalSequence: string;
  mutationType: MutationType;
  mutationPosition: number;
  mutantBase?: string;
  insertedBase?: string;
  expectedRepair: RepairPathway;
  clinicalTip: string;
}

const BUILT_IN_CASES: MutCase[] = [
  {
    title: "Mutação Pontual no Gene TP53 (Substituição)",
    difficulty: "Fácil",
    patient: { name: "Helena Costa", age: 48, weight: 62, diagnosis: "Carcinoma mamário com mutação TP53" },
    scenario: "Substituição de G→A na posição 248 do gene TP53 (hotspot R248W). Identifique o tipo de mutação e a via de reparo adequada.",
    originalSequence: "ATGACTGAAGCGTCATTTGACCTG",
    mutationType: "substituicao",
    mutationPosition: 8,
    mutantBase: "A",
    expectedRepair: "MMR",
    clinicalTip: "O gene TP53 é o mais frequentemente mutado em cânceres humanos (~50%). A via MMR (Mismatch Repair) corrige erros de pareamento de bases durante a replicação. Deficiência em MMR causa Síndrome de Lynch (HNPCC).",
  },
  {
    title: "Deleção Frameshift no Gene BRCA2",
    difficulty: "Médio",
    patient: { name: "Beatriz Alves", age: 35, weight: 55, diagnosis: "Câncer de mama hereditário — BRCA2" },
    scenario: "Deleção de uma base no éxon 11 do BRCA2, causando mudança no quadro de leitura (frameshift) e proteína truncada.",
    originalSequence: "ATGGCTAAACGTGAATCACTG",
    mutationType: "delecao",
    mutationPosition: 7,
    expectedRepair: "HR",
    clinicalTip: "Mutações frameshift em BRCA2 produzem proteínas truncadas não funcionais. BRCA2 participa do reparo por recombinação homóloga (HR). Pacientes com deficiência em HR respondem bem a inibidores de PARP (olaparibe).",
  },
  {
    title: "Dano UV e Dímeros de Pirimidina",
    difficulty: "Difícil",
    patient: { name: "Antônio Reis", age: 60, weight: 75, diagnosis: "Xeroderma pigmentoso — múltiplos carcinomas cutâneos" },
    scenario: "Exposição UV causou dímeros de timina (T-T). Em pacientes com xeroderma pigmentoso, a via NER é deficiente.",
    originalSequence: "ATGCTTAAGCCTTTGAACTG",
    mutationType: "substituicao",
    mutationPosition: 5,
    mutantBase: "T",
    expectedRepair: "NER",
    clinicalTip: "A via NER (Nucleotide Excision Repair) remove dímeros de pirimidina e adutos volumosos. Deficiência genética em NER causa xeroderma pigmentoso (XP), com risco 1000x maior de câncer de pele. Proteínas envolvidas: XPA-XPG, ERCC1.",
  },
];

const REPAIR_INFO: Record<RepairPathway, { name: string; description: string }> = {
  MMR: { name: "Mismatch Repair", description: "Corrige erros de pareamento de bases após a replicação (MSH2/MLH1)" },
  BER: { name: "Base Excision Repair", description: "Remove bases danificadas por oxidação ou desaminação (OGG1, APE1)" },
  NER: { name: "Nucleotide Excision Repair", description: "Remove lesões volumosas como dímeros de pirimidina (XPA-XPG)" },
  HR: { name: "Recombinação Homóloga", description: "Reparo de quebras de dupla fita usando cromátide irmã (BRCA1/BRCA2, RAD51)" },
  NHEJ: { name: "Non-Homologous End Joining", description: "Reparo rápido de quebras de dupla fita sem molde (Ku70/Ku80, DNA-PKcs)" },
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

  useEffect(() => {
    if (isVirtualRoom && challengeCompleted && !submitted && activeCase) {
      handleFinish();
      const cs = sessionStorage.getItem("challengeScore");
      if (cs) setLastScore(Number(cs));
    }
  }, [challengeCompleted]);

  useEffect(() => {
    if (isVirtualRoom && submitted) {
      const timer = setTimeout(() => navigate("/"), 15000);
      return () => clearTimeout(timer);
    }
  }, [isVirtualRoom, submitted, navigate]);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({
        id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI,
        patient: cd.patient, scenario: cd.scenario, originalSequence: cd.originalSequence ?? "ATGGCTAAACGTGAATCACTG",
        mutationType: cd.mutationType ?? "substituicao", mutationPosition: cd.mutationPosition ?? 5,
        mutantBase: cd.mutantBase, insertedBase: cd.insertedBase,
        expectedRepair: cd.expectedRepair ?? "MMR", clinicalTip: cd.clinicalTip ?? "",
      });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) { setSelectedRepair(null); }
  }, [activeCase]);

  const sequences = useMemo(() => {
    if (!activeCase) return null;
    const orig = activeCase.originalSequence;
    let mutant = "";
    switch (activeCase.mutationType) {
      case "substituicao":
        mutant = orig.substring(0, activeCase.mutationPosition) + (activeCase.mutantBase || "T") + orig.substring(activeCase.mutationPosition + 1);
        break;
      case "delecao":
        mutant = orig.substring(0, activeCase.mutationPosition) + orig.substring(activeCase.mutationPosition + 1);
        break;
      case "insercao":
        mutant = orig.substring(0, activeCase.mutationPosition) + (activeCase.insertedBase || "A") + orig.substring(activeCase.mutationPosition);
        break;
      case "frameshift":
        mutant = orig.substring(0, activeCase.mutationPosition) + orig.substring(activeCase.mutationPosition + 1);
        break;
    }
    const origAA = translateDNA(orig);
    const mutAA = translateDNA(mutant);
    return { original: orig, mutant, origAA, mutAA };
  }, [activeCase]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const correct = selectedRepair === activeCase.expectedRepair;
    const s = correct ? 100 : 25;
    setLastScore(s);
    submitResults({ score: s, actions: { selectedRepair, expectedRepair: activeCase.expectedRepair, mutationType: activeCase.mutationType } });
    return s;
  }, [activeCase, selectedRepair, submitted, submitResults]);

  const loadAICase = (c: any) => {
    setActiveCase({
      id: c.id, title: c.title, difficulty: c.difficulty, isAI: true,
      patient: c.patient, scenario: c.scenario, originalSequence: c.originalSequence ?? "ATGGCTAAACGTGAATCACTG",
      mutationType: c.mutationType ?? "substituicao", mutationPosition: c.mutationPosition ?? 5,
      mutantBase: c.mutantBase, insertedBase: c.insertedBase,
      expectedRepair: c.expectedRepair ?? "MMR", clinicalTip: c.clinicalTip ?? "",
    });
  };

  if (loadingVR) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (isVirtualRoom && !activeCase) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Mutações e Reparo de DNA</h1>
            <p className="text-muted-foreground">Simule mutações e identifique mecanismos de reparo de DNA.</p>
            <AdminPromptViewer toolSlug={`sim-${SLUG}`} toolName="Mutações e Reparo" toolType="simulator" prompt={getNativePrompt(`sim-${SLUG}`) || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Dna className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {BUILT_IN_CASES.map((c, i) => <NativeCaseCard key={i} caseItem={c} onClick={() => setActiveCase(c)} />)}
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

  const MUTATION_LABELS: Record<MutationType, string> = {
    substituicao: "Substituição de Base",
    delecao: "Deleção",
    insercao: "Inserção",
    frameshift: "Frameshift",
  };

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
          <p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age} anos, {activeCase.patient.weight} kg</p>
          <p className="text-sm"><strong>Diagnóstico:</strong> {activeCase.patient.diagnosis}</p>
          <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
        </CardContent>
      </Card>

      {/* DNA Sequences */}
      {sequences && (
        <Card>
          <CardHeader><CardTitle className="text-base">Comparação de Sequências</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Sequência Original (Wild-Type)</p>
              <div className="flex flex-wrap gap-0.5 font-mono text-sm">
                {sequences.original.split("").map((base, i) => (
                  <span key={i} className={`px-1 rounded ${i === activeCase.mutationPosition ? "bg-primary/20 ring-2 ring-primary font-bold" : ""}`}>
                    {base}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {sequences.origAA.map((aa, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] font-mono">{aa}</Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-destructive mb-1">Sequência Mutante</p>
              <div className="flex flex-wrap gap-0.5 font-mono text-sm">
                {sequences.mutant.split("").map((base, i) => {
                  const isChanged = i >= activeCase.mutationPosition && (
                    activeCase.mutationType === "substituicao" ? i === activeCase.mutationPosition :
                    activeCase.mutationType === "insercao" ? i === activeCase.mutationPosition : true
                  );
                  return (
                    <span key={i} className={`px-1 rounded ${isChanged ? "bg-destructive/20 text-destructive font-bold" : ""}`}>
                      {base}
                    </span>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {sequences.mutAA.map((aa, i) => {
                  const changed = i < sequences.origAA.length ? aa !== sequences.origAA[i] : true;
                  return (
                    <Badge key={i} variant={changed ? "destructive" : "outline"} className="text-[10px] font-mono">{aa}</Badge>
                  );
                })}
              </div>
            </div>

            {sequences.origAA.length !== sequences.mutAA.length && (
              <p className="text-xs text-destructive font-medium">⚠️ Frameshift detectado — proteína com {sequences.mutAA.length} aminoácidos (original: {sequences.origAA.length})</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Repair pathway selection */}
      <Card>
        <CardHeader><CardTitle className="text-base">Selecione a Via de Reparo</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(Object.entries(REPAIR_INFO) as [RepairPathway, { name: string; description: string }][]).map(([key, info]) => (
              <Button
                key={key}
                variant={selectedRepair === key ? "default" : "outline"}
                onClick={() => setSelectedRepair(key)}
                className="h-auto py-3 text-left flex-col items-start"
                disabled={submitted}
              >
                <span className="font-bold text-xs">{key} — {info.name}</span>
                <span className="text-[10px] opacity-70 font-normal">{info.description}</span>
              </Button>
            ))}
          </div>

          {submitted && selectedRepair && (
            <div className={`p-3 rounded-lg border ${selectedRepair === activeCase.expectedRepair ? "border-green-500 bg-green-500/10" : "border-destructive bg-destructive/10"}`}>
              <p className="text-sm font-medium">
                {selectedRepair === activeCase.expectedRepair
                  ? `✅ Correto! ${REPAIR_INFO[activeCase.expectedRepair].name}`
                  : `❌ Incorreto. Via correta: ${activeCase.expectedRepair} — ${REPAIR_INFO[activeCase.expectedRepair].name}`}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            {!isVirtualRoom && <Button onClick={() => handleFinish()} disabled={submitted || !selectedRepair} className="flex-1">Finalizar</Button>}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold mb-1">💡 Dica Clínica</p>
          <p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p>
        </CardContent>
      </Card>

      <SimulatorChallengeMode
        challengeSet={{ title: "Desafio: Mutações e Reparo", description: "Teste seus conhecimentos sobre mutações e reparo de DNA", challenges: [] }}
        simulatorState={{ selectedRepair, mutationType: activeCase.mutationType }}
        onComplete={() => setChallengeCompleted(true)}
      />

      {isVirtualRoom && submitted && (
        !showFeedback ? (
          <div className="space-y-2">
            <Button onClick={() => setShowFeedback(true)} variant="outline" className="w-full gap-2"><Eye className="h-4 w-4" /> Mostrar Resultados</Button>
            <p className="text-xs text-center text-muted-foreground">Resultados enviados ✓ — Redirecionando para a página inicial em 15s...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center space-y-2">
              <div className={`text-3xl font-bold ${lastScore >= 80 ? "text-green-600" : lastScore >= 50 ? "text-yellow-600" : "text-destructive"}`}>{lastScore}%</div>
              <p className="text-sm text-muted-foreground">{lastScore >= 80 ? "🏆 Excelente!" : lastScore >= 50 ? "📈 Bom, pode melhorar" : "⚠️ Revise os conceitos"}</p>
            </div>
            <p className="text-xs text-center text-muted-foreground">Redirecionando para a página inicial em 15s...</p>
          </div>
        )
      )}
    </div>
  );
}
