import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, CheckCircle2, Wind, ArrowLeft, Sparkles } from "lucide-react";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";
import SimulatorHowToUse from "@/components/simulators/SimulatorHowToUse";
import SimulatorFeedback, { FeedbackDecision } from "@/components/simulators/SimulatorFeedback";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { useAuth } from "@/contexts/AuthContext";

const HOW_TO = [
  "Selecione um caso clínico para iniciar a avaliação respiratória.",
  "Em M1, revise os dados do paciente.",
  "Em M2, clique nos pontos do tórax para realizar a ausculta virtual.",
  "Em M3, selecione as técnicas de higiene brônquica adequadas.",
  "Em M4, após a reavaliação, decida a conduta seguinte (manter, trocar ou encaminhar).",
  "Ao final, revise o feedback com a evolução respiratória prevista.",
];

type AuscultResult = "MV normal" | "Roncos" | "Crepitações" | "Sibilos" | "MV diminuído" | "Ausente";

const CASES = [
  { id: "c1", name: "Pós-operatório abdominal", desc: "48h PO de colecistectomia aberta, dor à inspiração profunda", difficulty: "Fácil",
    auscultation: { LSD: "MV diminuído" as AuscultResult, LSE: "MV normal" as AuscultResult, LMD: "Crepitações" as AuscultResult, LID: "MV diminuído" as AuscultResult, LIE: "MV normal" as AuscultResult },
    idealTechniques: ["eltgol", "rppi"],
    idealConduct: "manter",
    reEvalResults: { LSD: "MV normal", LSE: "MV normal", LMD: "MV normal", LID: "Crepitações", LIE: "MV normal" } },
  { id: "c2", name: "DPOC exacerbada", desc: "Homem 68a, dispneia, tosse produtiva, saturação 88%", difficulty: "Médio",
    auscultation: { LSD: "Sibilos" as AuscultResult, LSE: "Sibilos" as AuscultResult, LMD: "Roncos" as AuscultResult, LID: "Roncos" as AuscultResult, LIE: "Roncos" as AuscultResult },
    idealTechniques: ["huffing", "vni"],
    idealConduct: "vni",
    reEvalResults: { LSD: "MV normal", LSE: "MV normal", LMD: "Sibilos", LID: "MV normal", LIE: "MV normal" } },
  { id: "c3", name: "Paciente intubado em UTI", desc: "72h de VM, secreção espessa amarelada, FiO2 0.6", difficulty: "Difícil",
    auscultation: { LSD: "Roncos" as AuscultResult, LSE: "Crepitações" as AuscultResult, LMD: "MV diminuído" as AuscultResult, LID: "Ausente" as AuscultResult, LIE: "Crepitações" as AuscultResult },
    idealTechniques: ["bag", "aspiracao"],
    idealConduct: "manter",
    reEvalResults: { LSD: "MV normal", LSE: "MV normal", LMD: "Crepitações", LID: "MV diminuído", LIE: "MV normal" } },
];

const LUNG_ZONES = [
  { id: "LSD", label: "Lobo Superior D", x: 35, y: 22 }, { id: "LSE", label: "Lobo Superior E", x: 65, y: 22 },
  { id: "LMD", label: "Lobo Médio D", x: 35, y: 42 }, { id: "LID", label: "Lobo Inferior D", x: 35, y: 60 },
  { id: "LIE", label: "Lobo Inferior E", x: 65, y: 55 },
];

const TECHNIQUES = [
  { id: "eltgol", name: "ELTGOL", desc: "Expiração lenta total com glote aberta em decúbito lateral" },
  { id: "huffing", name: "Huffing / TEF", desc: "Técnica de expiração forçada para remoção de secreção" },
  { id: "bag", name: "Bag squeezing", desc: "Hiperinsuflação manual com compressão torácica (intubado)" },
  { id: "rppi", name: "RPPI / IPPB", desc: "Respiração com pressão positiva intermitente" },
  { id: "vni", name: "VNI (BiPAP/CPAP)", desc: "Ventilação não-invasiva para reexpansão" },
  { id: "aspiracao", name: "Aspiração traqueal", desc: "Sistema aberto ou fechado (paciente intubado)" },
];

const CONDUCTS = [
  { id: "manter", name: "Manter técnicas atuais", desc: "Continuar com o mesmo programa por mais sessões" },
  { id: "trocar", name: "Trocar técnicas", desc: "Substituir por outras técnicas mais adequadas" },
  { id: "vni", name: "Ajustar VNI/parâmetros", desc: "Otimizar pressões ou modo ventilatório" },
  { id: "intubacao", name: "Encaminhar para intubação", desc: "Piora do quadro requer suporte invasivo" },
];

const AUSC_COLORS: Record<string, string> = { "MV normal": "#22c55e", "Roncos": "#f59e0b", "Crepitações": "#f97316", "Sibilos": "#a855f7", "MV diminuído": "#ef4444", "Ausente": "#6b7280" };

function LungSVG({ auscultated, onZoneClick }: { auscultated: Record<string, AuscultResult | null>; onZoneClick: (id: string) => void }) {
  return (
    <svg viewBox="0 0 100 85" className="w-full max-w-[300px] mx-auto">
      <rect x={0} y={0} width={100} height={80} fill="hsl(var(--muted)/0.2)" rx={4} />
      <path d="M 50 8 Q 25 15, 22 40 Q 20 65, 35 72 L 45 72 Q 50 68, 50 60" fill="hsl(var(--foreground)/0.05)" stroke="hsl(var(--border))" strokeWidth={0.5} />
      <path d="M 50 8 Q 75 15, 78 40 Q 80 65, 65 72 L 55 72 Q 50 68, 50 60" fill="hsl(var(--foreground)/0.05)" stroke="hsl(var(--border))" strokeWidth={0.5} />
      <line x1={50} y1={2} x2={50} y2={15} stroke="hsl(var(--foreground)/0.2)" strokeWidth={2} />
      {LUNG_ZONES.map(z => {
        const result = auscultated[z.id];
        const color = result ? AUSC_COLORS[result] : "hsl(var(--muted-foreground)/0.3)";
        return (
          <g key={z.id} onClick={() => onZoneClick(z.id)} className="cursor-pointer">
            <circle cx={z.x} cy={z.y} r={6} fill={color} opacity={0.6} stroke="hsl(var(--background))" strokeWidth={0.5} />
            <text x={z.x} y={z.y + 1} textAnchor="middle" fontSize={3} fill="white" fontWeight="bold">{result ? "🔊" : "?"}</text>
            <title>{z.label}: {result ?? "Não auscultado"}</title>
          </g>
        );
      })}
    </svg>
  );
}

const BUILT_IN = CASES.map(c => ({ id: c.id, title: c.name, difficulty: c.difficulty, patient: { diagnosis: c.desc } }));

export default function SimuladorRespiratorio() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const prompt = getNativePrompt("sim-respiratorio") || "";
  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases("respiratorio", BUILT_IN);

  const [activeCase, setActiveCase] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedCase, setSelectedCase] = useState("");
  const [auscultated, setAuscultated] = useState<Record<string, AuscultResult | null>>({});
  const [selectedTechniques, setSelectedTechniques] = useState<string[]>([]);
  const [reEvaluated, setReEvaluated] = useState(false);
  const [selectedConduct, setSelectedConduct] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  const caseData = CASES.find(c => c.id === selectedCase);
  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));
  const allAuscultated = LUNG_ZONES.every(z => auscultated[z.id]);

  const handleAuscultate = (id: string) => { if (caseData) setAuscultated(prev => ({ ...prev, [id]: caseData.auscultation[id] })); };

  const calcFeedback = () => {
    if (!caseData) return { score: 0, decisions: [] as FeedbackDecision[], narrative: "" };
    const decisions: FeedbackDecision[] = [];
    let correct = 0, total = 0;

    const idealSet = new Set(caseData.idealTechniques);
    const techMatch = selectedTechniques.filter(t => idealSet.has(t)).length === caseData.idealTechniques.length && selectedTechniques.filter(t => !idealSet.has(t)).length === 0;
    if (techMatch) correct++;
    total++;
    decisions.push({ label: "Técnicas selecionadas", userChoice: selectedTechniques.map(id => TECHNIQUES.find(t => t.id === id)?.name).join(", "), idealChoice: caseData.idealTechniques.map(id => TECHNIQUES.find(t => t.id === id)?.name).join(", "), correct: techMatch });

    const condCorrect = selectedConduct === caseData.idealConduct;
    if (condCorrect) correct++;
    total++;
    decisions.push({ label: "Conduta pós-reavaliação", userChoice: CONDUCTS.find(c => c.id === selectedConduct)?.name || "-", idealChoice: CONDUCTS.find(c => c.id === caseData.idealConduct)?.name || "-", correct: condCorrect });

    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    const narrative = score >= 80
      ? `Com as técnicas adequadas e conduta correta, o paciente (${caseData.name}) teria melhora progressiva do padrão ventilatório, com resolução da secreção em 24-48h e estabilização dos parâmetros respiratórios.`
      : `Técnicas ou conduta inadequadas podem prolongar o tempo de internação, manter acúmulo de secreção e aumentar o risco de complicações respiratórias como pneumonia nosocomial.`;
    return { score, decisions, narrative };
  };

  const feedback = calcFeedback();

  if (!activeCase) {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1"><h1 className="text-2xl font-bold">Fisioterapia Respiratória</h1><p className="text-sm text-muted-foreground">Mecânica ventilatória, ausculta e técnicas de higiene brônquica</p></div>
          <SimulatorHowToUse title="Respiratória" steps={HOW_TO} />
          <AdminPromptViewer toolSlug="sim-respiratorio" toolName="Fisioterapia Respiratória" toolType="simulator" prompt={prompt} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allCases.map((c: any) => c.isAI
            ? <AICaseCard key={c.id} caseItem={c} onClick={() => { setActiveCase(c.id); setSelectedCase(CASES[0]?.id || ""); }} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />
            : <NativeCaseCard key={c.id} caseItem={c} onClick={() => { setActiveCase(c.id); setSelectedCase(c.id); }} />
          )}
        </div>
        {isAdmin && <Button onClick={() => generateCase()} disabled={isGenerating} variant="outline" className="gap-2"><Sparkles className="h-4 w-4" />{isGenerating ? "Gerando..." : "Gerar Caso com IA"}</Button>}
      </div>
    );
  }

  const LockedOverlay = ({ module }: { module: number }) => (<div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-xl"><Lock className="h-6 w-6 text-muted-foreground" /><p className="text-xs text-muted-foreground font-medium">Complete o módulo {module}</p></div>);
  const expSummary = caseData ? { "Caso": `${caseData.name}`, "Ausculta": LUNG_ZONES.map(z => `${z.label}: ${auscultated[z.id] ?? "-"}`).join("; "), "Técnicas": selectedTechniques.map(id => TECHNIQUES.find(t => t.id === id)?.name).join(", "), "Conduta": CONDUCTS.find(c => c.id === selectedConduct)?.name || "-", "Pontuação": `${feedback.score}%` } : undefined;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => { setActiveCase(null); setCompletedModules(new Set()); setAuscultated({}); setSelectedTechniques([]); setReEvaluated(false); setSelectedConduct(""); setShowFeedback(false); }}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1"><h1 className="text-2xl font-bold">Fisioterapia Respiratória</h1></div>
        <SimulatorHowToUse title="Respiratória" steps={HOW_TO} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(1) ? "default" : "secondary"}>M1</Badge>Seleção do Caso{completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedCase} onValueChange={v => { setSelectedCase(v); setAuscultated({}); setSelectedTechniques([]); setReEvaluated(false); setSelectedConduct(""); setCompletedModules(new Set()); setShowFeedback(false); }}>
              <SelectTrigger><SelectValue placeholder="Selecionar caso" /></SelectTrigger>
              <SelectContent>{CASES.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            {caseData && <p className="text-sm bg-muted/50 p-3 rounded-lg">{caseData.desc}</p>}
            {caseData && !completedModules.has(1) && <Button size="sm" className="w-full" onClick={() => completeModule(1)}>Iniciar</Button>}
          </CardContent>
        </Card>

        <Card className="relative">
          {!completedModules.has(1) && <LockedOverlay module={1} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(2) ? "default" : "secondary"}>M2</Badge>Ausculta Virtual{completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 flex-wrap text-xs">
              {Object.entries(AUSC_COLORS).map(([k, c]) => (<span key={k} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: c }} />{k}</span>))}
            </div>
            <LungSVG auscultated={auscultated} onZoneClick={handleAuscultate} />
            {allAuscultated && !completedModules.has(2) && <Button size="sm" className="w-full" onClick={() => completeModule(2)}>Confirmar Ausculta</Button>}
          </CardContent>
        </Card>

        <Card className="relative">
          {!completedModules.has(2) && <LockedOverlay module={2} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(3) ? "default" : "secondary"}>M3</Badge>Seleção de Técnicas{completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {completedModules.has(2) && (<>
              <p className="text-sm text-muted-foreground">Baseado na ausculta, selecione as manobras:</p>
              {TECHNIQUES.map(t => (
                <label key={t.id} className="flex items-start gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/50">
                  <input type="checkbox" checked={selectedTechniques.includes(t.id)} onChange={e => setSelectedTechniques(prev => e.target.checked ? [...prev, t.id] : prev.filter(x => x !== t.id))} className="mt-1" />
                  <div className="text-sm"><p className="font-medium">{t.name}</p><p className="text-muted-foreground">{t.desc}</p></div>
                </label>
              ))}
              {selectedTechniques.length > 0 && !completedModules.has(3) && <Button size="sm" className="w-full" onClick={() => completeModule(3)}>Aplicar Técnicas</Button>}
            </>)}
          </CardContent>
        </Card>

        {/* M4 — Reavaliação + Conduta (student decides) */}
        <Card className="relative">
          {!completedModules.has(3) && <LockedOverlay module={3} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(4) ? "default" : "secondary"}>M4</Badge>Reavaliação e Conduta{completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedModules.has(3) && caseData && (<>
              {!reEvaluated ? (
                <Button size="sm" className="w-full" onClick={() => setReEvaluated(true)}>Realizar Nova Ausculta</Button>
              ) : (<>
                <p className="text-sm font-medium">Reavaliação pós-manobras:</p>
                <div className="space-y-1">
                  {LUNG_ZONES.map(z => {
                    const result = caseData.reEvalResults[z.id as keyof typeof caseData.reEvalResults];
                    const color = AUSC_COLORS[result] || "#22c55e";
                    return (
                      <div key={z.id} className="flex justify-between text-sm p-2 rounded bg-muted/50">
                        <span>{z.label}</span>
                        <span style={{ color }}>{result}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-sm text-muted-foreground font-medium mt-2">Qual a conduta a seguir?</p>
                {CONDUCTS.map(c => (
                  <label key={c.id} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 ${selectedConduct === c.id ? "border-primary bg-primary/5" : ""}`}>
                    <input type="radio" name="conduct" checked={selectedConduct === c.id} onChange={() => setSelectedConduct(c.id)} />
                    <div className="text-sm"><p className="font-medium">{c.name}</p><p className="text-muted-foreground">{c.desc}</p></div>
                  </label>
                ))}
                {selectedConduct && !completedModules.has(4) && <Button size="sm" className="w-full" onClick={() => { completeModule(4); setShowFeedback(true); }}>Finalizar</Button>}
              </>)}
            </>)}
          </CardContent>
        </Card>
      </div>

      <SimulatorFeedback score={feedback.score} decisions={feedback.decisions} narrative={feedback.narrative} visible={showFeedback} />
      <LabReportPanel benchTitle="Fisioterapia Respiratória" isUnlocked={completedModules.has(4)} experimentSummary={expSummary} />
    </div>
  );
}
