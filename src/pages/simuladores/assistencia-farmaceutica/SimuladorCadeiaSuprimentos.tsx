import { useState, useEffect, useCallback, useMemo } from "react";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, Loader2, Eye, Boxes, Target, Info } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import SimulatorHowToUse from "@/components/simulators/SimulatorHowToUse";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { ShareToolButton } from "@/components/ShareToolButton";
import { useIsEmbed, useEmbedCaseId } from "@/contexts/EmbedContext";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getCadeiaSuprimentosChallenges } from "@/data/simulatorChallenges";
import { BUILT_IN_CASES, ETAPAS, type CasoCadeia, type Etapa } from "@/lib/cadeiaSuprimentos/casos";
import { avaliarEtapa, desafiosAutomaticos } from "@/lib/cadeiaSuprimentos/avaliacao";
import BancadaSelecao from "@/components/simulators/cadeia-suprimentos/BancadaSelecao";
import BancadaProgramacao from "@/components/simulators/cadeia-suprimentos/BancadaProgramacao";
import BancadaAquisicao from "@/components/simulators/cadeia-suprimentos/BancadaAquisicao";
import BancadaArmazenamento from "@/components/simulators/cadeia-suprimentos/BancadaArmazenamento";
import BancadaDistribuicao from "@/components/simulators/cadeia-suprimentos/BancadaDistribuicao";
import BancadaDispensacao from "@/components/simulators/cadeia-suprimentos/BancadaDispensacao";
import type { BancadaProps } from "@/components/simulators/cadeia-suprimentos/ui";

const SLUG = "cadeia-suprimentos";
const NOME = "Gestão da Cadeia de Suprimentos Farmacêuticos";

const BANCADAS: Record<Etapa, (p: BancadaProps) => JSX.Element> = {
  selecao: BancadaSelecao,
  programacao: BancadaProgramacao,
  aquisicao: BancadaAquisicao,
  armazenamento: BancadaArmazenamento,
  distribuicao: BancadaDistribuicao,
  dispensacao: BancadaDispensacao,
};

const DADOS_DA_ETAPA: Record<Etapa, keyof CasoCadeia> = {
  selecao: "selecao",
  programacao: "programacao",
  aquisicao: "aquisicao",
  armazenamento: "armazenamento",
  distribuicao: "distribuicao",
  dispensacao: "dispensacao",
};

const COMO_USAR = [
  "Escolha um caso: cada um trabalha uma etapa do ciclo da Assistência Farmacêutica (Seleção, Programação, Aquisição, Armazenamento, Distribuição ou Dispensação) no município fictício de Vale do Sol.",
  "Leia o cenário e a bancada da etapa: os controles (marcar itens, sliders, listas) recalculam os indicadores na hora. Nada é avaliado enquanto você explora.",
  "Abaixo da bancada fica o Modo Desafio: cada desafio diz o que testar, você lê os números que gerou, interpreta e decide (em grupo, se estiver numa Sala Virtual).",
  "O estado da bancada é conferido quando você responde: deixe selecionado o que o enunciado pedir.",
  "Os preços, quantidades e prazos são ilustrativos. As normas citadas (RDC 430/2020, RDC 471/2021, Lei 14.133/2021, RENAME) devem ser consultadas na versão vigente.",
];

/** Monta um caso a partir do JSON do banco (casos por IA e casos de Sala Virtual); devolve null se faltar a base da etapa. */
function montarCaso(c: any, extra: Partial<CasoCadeia> = {}): CasoCadeia | null {
  const etapa = c?.etapa as Etapa | undefined;
  if (!etapa || !BANCADAS[etapa] || !c[DADOS_DA_ETAPA[etapa]]) return null;
  return {
    id: c.id, title: c.title, difficulty: c.difficulty, isAI: c.isAI, etapa,
    patient: c.patient ?? { name: "Caso", diagnosis: ETAPAS.find((e) => e.id === etapa)!.label },
    scenario: c.scenario ?? "", expectedDrugs: c.expectedDrugs ?? [], clinicalTip: c.clinicalTip ?? "", references: c.references ?? [],
    selecao: c.selecao, programacao: c.programacao, aquisicao: c.aquisicao, armazenamento: c.armazenamento, distribuicao: c.distribuicao, dispensacao: c.dispensacao,
    ...extra,
  };
}

export default function SimuladorCadeiaSuprimentos() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<CasoCadeia | null>(null);
  const isEmbed = useIsEmbed();
  const embedCaseId = useEmbedCaseId();
  useEffect(() => {
    if (isEmbed && embedCaseId && !activeCase) {
      const found = BUILT_IN_CASES.find((c) => c.title === decodeURIComponent(embedCaseId));
      if (found) setActiveCase(found);
    }
  }, [isEmbed, embedCaseId, activeCase]);

  const [simState, setSimState] = useState<Record<string, any>>({});
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const onState = useCallback((s: Record<string, any>) => setSimState(s), []);

  useEffect(() => {
    if (!virtualRoomCase) return;
    const caso = montarCaso(virtualRoomCase);
    if (caso) setActiveCase(caso);
    else toast.error("Este caso não tem os dados necessários para o simulador.");
  }, [virtualRoomCase]);

  useEffect(() => { setSimState({}); setChallengeCompleted(false); }, [activeCase?.title]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const decisions: SimDecision[] = avaliarEtapa(activeCase, simState).map((v) => ({
      label: v.label, userChoice: v.ok ? "Atende ao critério" : "Não atende ao critério", idealChoice: "Atende ao critério", correct: v.ok,
      category: ETAPAS.find((e) => e.id === activeCase.etapa)!.label, explanation: v.detalhe,
    }));
    submitResults({ score: lastScore, actions: buildSimulatorDecisions(SLUG, decisions) });
    return lastScore;
  }, [activeCase, simState, submitted, submitResults, lastScore]);

  useEffect(() => { if (challengeCompleted && !submitted && activeCase) handleFinish(); }, [challengeCompleted]);
  useEffect(() => { if (isVirtualRoom && submitted) { const t = setTimeout(() => navigate("/"), 15000); return () => clearTimeout(t); } }, [isVirtualRoom, submitted, navigate]);

  const loadAICase = (c: any) => {
    const caso = montarCaso(c, { isAI: true });
    if (caso) setActiveCase(caso);
    else toast.error("Este caso gerado por IA não tem os dados da etapa. Gere outro.");
  };

  const challengeSet = useMemo(() => {
    if (!activeCase) return null;
    const idx = BUILT_IN_CASES.findIndex((c) => c.title === activeCase.title);
    return idx >= 0 ? getCadeiaSuprimentosChallenges(idx) : desafiosAutomaticos(activeCase);
  }, [activeCase]);

  if (isVirtualRoom && !activeCase) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">{NOME}</h1>
            <p className="text-muted-foreground">Treine as etapas do ciclo da Assistência Farmacêutica em situações realistas: seleção, programação, aquisição, armazenamento, distribuição e dispensação.</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <SimulatorHowToUse title="Cadeia de Suprimentos" steps={COMO_USAR} />
              <ShareToolButton toolSlug={SLUG} toolName={NOME} />
              <AdminPromptViewer toolSlug={`sim-${SLUG}`} toolName="Cadeia de Suprimentos" toolType="simulator" prompt={getNativePrompt(`sim-${SLUG}`) || ""} />
            </div>
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Boxes className="h-5 w-5 text-primary" /> Casos: um por etapa do ciclo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {BUILT_IN_CASES.map((c, i) => (
              <div key={i} className="relative">
                <NativeCaseCard caseItem={c} onClick={() => setActiveCase(c)} />
                <Badge variant="secondary" className="absolute top-3 right-24 hidden sm:inline-flex">{ETAPAS.find((e) => e.id === c.etapa)!.label}</Badge>
              </div>
            ))}
            {!isVirtualRoom && aiCases.filter((c: any) => c.isAI).map((c: any) => (
              <AICaseCard key={c.id} caseItem={c} onClick={() => loadAICase(c)} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />
            ))}
            {!isVirtualRoom && <Button onClick={() => generateCase()} disabled={isGenerating} className="w-full gap-2 mt-2">{isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Gerar Caso com IA</Button>}
          </CardContent>
        </Card>
      </div>
    );
  }

  const Bancada = BANCADAS[activeCase.etapa];
  const idxEtapa = ETAPAS.findIndex((e) => e.id === activeCase.etapa);

  return (
    <div className="space-y-4">
      {examFeedback && <ExamFeedbackOverlay score={examFeedback.score} simulatorSlug={SLUG} caseTitle={examFeedback.caseTitle} examProgress={examProgress!} onProceed={proceedToNext} isFinalActivity={examFeedback.isFinalActivity} />}
      <ExamBanner simulatorSlug={SLUG} caseTitle={activeCase.title} examProgress={examProgress} />
      <div className="flex items-center gap-3 flex-wrap">
        {!isEmbed && <Button variant="ghost" size="icon" onClick={isVirtualRoom ? () => navigate("/") : () => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>}
        <h2 className="text-xl font-bold">{activeCase.title}</h2>
        <Badge variant="outline">{activeCase.difficulty}</Badge>
        <div className="ml-auto flex items-center gap-2">
          <SimulatorHowToUse title="Cadeia de Suprimentos" steps={COMO_USAR} />
          <ShareToolButton toolSlug={SLUG} toolName={NOME} caseId={activeCase.title} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5" aria-label="Etapas do ciclo da Assistência Farmacêutica">
        {ETAPAS.map((e, i) => (
          <span key={e.id} className={`text-xs rounded-full border px-3 py-1 ${i === idxEtapa ? "bg-primary text-primary-foreground border-primary font-semibold" : "text-muted-foreground"}`}>{i + 1}. {e.label}</span>
        ))}
      </div>

      <Card><CardContent className="pt-4 space-y-2">
        <p className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-primary shrink-0" /><span><strong>Etapa:</strong> {ETAPAS[idxEtapa].label}. {ETAPAS[idxEtapa].resumo}</span></p>
        <p className="text-sm text-muted-foreground">{activeCase.scenario}</p>
        {activeCase.selecao || activeCase.programacao || activeCase.aquisicao || activeCase.armazenamento || activeCase.distribuicao || activeCase.dispensacao ? null : (
          <p className="text-xs text-destructive flex items-center gap-1"><Info className="h-3 w-3" /> Este caso não traz os dados da etapa.</p>
        )}
      </CardContent></Card>

      <Bancada key={activeCase.title} caso={activeCase} onState={onState} />

      {challengeSet && (
        <SimulatorChallengeMode
          challengeSet={challengeSet}
          simulatorState={simState}
          onComplete={(score, total) => { setLastScore(total > 0 ? Math.round((score / total) * 100) : 0); setChallengeCompleted(true); }}
        />
      )}

      {isVirtualRoom && submitted && (!showFeedback ? (
        <div className="space-y-2"><Button onClick={() => setShowFeedback(true)} variant="outline" className="w-full gap-2"><Eye className="h-4 w-4" /> Mostrar Resultados</Button><p className="text-xs text-center text-muted-foreground">Resultados enviados ✓ — Redirecionando em 15s...</p></div>
      ) : (
        <div className="space-y-2"><div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center space-y-2"><div className={`text-3xl font-bold ${lastScore >= 80 ? "text-green-600" : lastScore >= 50 ? "text-yellow-600" : "text-destructive"}`}>{lastScore}%</div></div><p className="text-xs text-center text-muted-foreground">Redirecionando em 15s...</p></div>
      ))}
    </div>
  );
}
