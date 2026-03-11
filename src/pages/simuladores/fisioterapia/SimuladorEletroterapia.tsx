import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Lock, CheckCircle2, Zap, ArrowLeft, Sparkles } from "lucide-react";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
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
  "Selecione um caso clínico para iniciar a programação eletroterapêutica.",
  "Em M1, revise o caso e o objetivo terapêutico.",
  "Em M2, escolha a modalidade de corrente adequada.",
  "Em M3, ajuste os parâmetros (frequência, largura de pulso, intensidade, tempos ON/OFF).",
  "Em M4, posicione os eletrodos na região indicada.",
  "Ao final, revise o feedback com a avaliação de adequação dos parâmetros.",
];

const CASES = [
  { id: "c1", name: "Lombalgia crônica — analgesia", objective: "analgesia", region: "lombar", difficulty: "Fácil",
    idealModality: "tens-conv", idealFreqRange: [80, 150], idealPulseRange: [50, 100], idealIntensityRange: [15, 40] },
  { id: "c2", name: "Pós-operatório LCA — fortalecimento", objective: "fortalecimento", region: "coxa anterior", difficulty: "Médio",
    idealModality: "fes", idealFreqRange: [20, 50], idealPulseRange: [200, 400], idealIntensityRange: [30, 60] },
  { id: "c3", name: "Entorse de tornozelo — controle de edema", objective: "edema", region: "tornozelo", difficulty: "Fácil",
    idealModality: "interf", idealFreqRange: [4000, 4100], idealPulseRange: [0, 0], idealIntensityRange: [10, 30] },
];

const MODALITIES = [
  { id: "tens-conv", name: "TENS Convencional", freqRange: [80, 150], pulseRange: [50, 100], desc: "Portão de dor — alta frequência, baixa intensidade" },
  { id: "tens-acu", name: "TENS Acupuntura", freqRange: [2, 10], pulseRange: [150, 300], desc: "Liberação de endorfinas — baixa frequência, alta intensidade" },
  { id: "tens-burst", name: "TENS Burst", freqRange: [2, 4], pulseRange: [150, 250], desc: "Rajadas de 2 Hz com pulsos internos de 100 Hz" },
  { id: "fes", name: "FES", freqRange: [20, 50], pulseRange: [200, 400], desc: "Estimulação elétrica funcional — contração muscular" },
  { id: "russa", name: "Corrente Russa", freqRange: [2500, 2500], pulseRange: [0, 0], desc: "Corrente alternada de média frequência modulada a 50 Hz" },
  { id: "interf", name: "Interferencial", freqRange: [4000, 4100], pulseRange: [0, 0], desc: "Duas correntes cruzadas, AMF entre 1-100 Hz" },
];

function generateWaveData(freq: number, pulseWidth: number, modality: string) {
  const points = [];
  const cycles = 4, samplesPerCycle = 30;
  for (let i = 0; i <= cycles * samplesPerCycle; i++) {
    const t = i / samplesPerCycle;
    let v = 0;
    const phase = t % 1;
    const dutyCycle = Math.min(pulseWidth / 1000 * freq, 0.5) || 0.3;
    if (modality === "russa") v = Math.sin(2 * Math.PI * t * 5) * (phase < 0.5 ? 1 : 0);
    else if (modality === "interf") v = Math.sin(2 * Math.PI * t * 5) * Math.cos(2 * Math.PI * t * 0.3);
    else v = phase < dutyCycle ? 1 : 0;
    points.push({ t: +(t).toFixed(2), v: +v.toFixed(3) });
  }
  return points;
}

function ElectrodeSVG({ region, electrodes, onPlace }: { region: string; electrodes: { a: boolean; b: boolean }; onPlace: (e: "a" | "b") => void }) {
  return (
    <svg viewBox="0 0 100 80" className="w-full max-w-[250px] mx-auto">
      <rect x={5} y={5} width={90} height={70} rx={8} fill="hsl(var(--foreground)/0.05)" stroke="hsl(var(--border))" strokeWidth={0.5} />
      <text x={50} y={15} textAnchor="middle" fontSize={4} fill="hsl(var(--muted-foreground))">{region}</text>
      <g onClick={() => onPlace("a")} className="cursor-pointer">
        <rect x={20} y={30} width={18} height={25} rx={3} fill={electrodes.a ? "hsl(var(--primary))" : "hsl(var(--muted)/0.5)"} opacity={0.7} stroke="hsl(var(--border))" strokeWidth={0.5} />
        <text x={29} y={45} textAnchor="middle" fontSize={4} fill={electrodes.a ? "white" : "hsl(var(--muted-foreground))"}>{electrodes.a ? "+" : "Ânodo"}</text>
      </g>
      <g onClick={() => onPlace("b")} className="cursor-pointer">
        <rect x={62} y={30} width={18} height={25} rx={3} fill={electrodes.b ? "hsl(var(--primary))" : "hsl(var(--muted)/0.5)"} opacity={0.7} stroke="hsl(var(--border))" strokeWidth={0.5} />
        <text x={71} y={45} textAnchor="middle" fontSize={4} fill={electrodes.b ? "white" : "hsl(var(--muted-foreground))"}>{electrodes.b ? "−" : "Cátodo"}</text>
      </g>
      {electrodes.a && electrodes.b && <line x1={38} y1={42} x2={62} y2={42} stroke="hsl(var(--primary))" strokeWidth={0.5} strokeDasharray="2 1" />}
    </svg>
  );
}

const BUILT_IN = CASES.map(c => ({ id: c.id, title: c.name, difficulty: c.difficulty, patient: { diagnosis: c.objective } }));

export default function SimuladorEletroterapia() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const prompt = getNativePrompt("sim-eletroterapia") || "";
  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases("eletroterapia", BUILT_IN);

  const [activeCase, setActiveCase] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedCase, setSelectedCase] = useState("");
  const [selectedModality, setSelectedModality] = useState("");
  const [freq, setFreq] = useState(80);
  const [pulseWidth, setPulseWidth] = useState(100);
  const [intensity, setIntensity] = useState(20);
  const [timeOn, setTimeOn] = useState(6);
  const [timeOff, setTimeOff] = useState(12);
  const [electrodes, setElectrodes] = useState({ a: false, b: false });
  const [showFeedback, setShowFeedback] = useState(false);

  const caseData = CASES.find(c => c.id === selectedCase);
  const modality = MODALITIES.find(m => m.id === selectedModality);
  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));
  const waveData = modality ? generateWaveData(freq, pulseWidth, selectedModality) : [];

  const calcFeedback = () => {
    if (!caseData) return { score: 0, decisions: [] as FeedbackDecision[], narrative: "" };
    const decisions: FeedbackDecision[] = [];
    let correct = 0, total = 0;

    const modCorrect = selectedModality === caseData.idealModality;
    if (modCorrect) correct++;
    total++;
    decisions.push({ label: "Modalidade", userChoice: modality?.name || "-", idealChoice: MODALITIES.find(m => m.id === caseData.idealModality)?.name || "-", correct: modCorrect });

    const freqOk = freq >= caseData.idealFreqRange[0] && freq <= caseData.idealFreqRange[1];
    if (freqOk) correct++;
    total++;
    decisions.push({ label: "Frequência", userChoice: `${freq} Hz`, idealChoice: `${caseData.idealFreqRange[0]}-${caseData.idealFreqRange[1]} Hz`, correct: freqOk });

    const intOk = intensity >= caseData.idealIntensityRange[0] && intensity <= caseData.idealIntensityRange[1];
    if (intOk) correct++;
    total++;
    decisions.push({ label: "Intensidade", userChoice: `${intensity} mA`, idealChoice: `${caseData.idealIntensityRange[0]}-${caseData.idealIntensityRange[1]} mA`, correct: intOk });

    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    const narrative = score >= 80
      ? `Parâmetros adequados. O paciente teria ${caseData.objective === "analgesia" ? "alívio significativo da dor em 20-30 min" : caseData.objective === "fortalecimento" ? "contração muscular efetiva com ganho de força progressivo" : "redução mensurável do edema em 24-48h"}.`
      : `Parâmetros inadequados para o objetivo de ${caseData.objective}. ${caseData.objective === "analgesia" ? "A dor não seria controlada adequadamente." : caseData.objective === "fortalecimento" ? "A contração muscular seria ineficaz." : "O edema não seria reduzido significativamente."}`;
    return { score, decisions, narrative };
  };

  const feedback = calcFeedback();

  if (!activeCase) {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1"><h1 className="text-2xl font-bold">Eletroterapia e Parâmetros de Corrente</h1><p className="text-sm text-muted-foreground">Programação de TENS, FES, corrente russa e interferencial</p></div>
          <SimulatorHowToUse title="Eletroterapia" steps={HOW_TO} />
          <AdminPromptViewer toolSlug="sim-eletroterapia" toolName="Eletroterapia" toolType="simulator" prompt={prompt} />
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
  const expSummary = caseData && modality ? { "Caso": `${caseData.name}`, "Modalidade": modality.name, "Parâmetros": `${freq}Hz | ${pulseWidth}μs | ${intensity}mA | ON${timeOn}s/OFF${timeOff}s`, "Região": caseData.region, "Pontuação": `${feedback.score}%` } : undefined;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => { setActiveCase(null); setCompletedModules(new Set()); setElectrodes({ a: false, b: false }); setShowFeedback(false); }}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1"><h1 className="text-2xl font-bold">Eletroterapia</h1></div>
        <SimulatorHowToUse title="Eletroterapia" steps={HOW_TO} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(1) ? "default" : "secondary"}>M1</Badge>Seleção do Caso{completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedCase} onValueChange={v => { setSelectedCase(v); setSelectedModality(""); setElectrodes({ a: false, b: false }); setCompletedModules(new Set()); setShowFeedback(false); }}>
              <SelectTrigger><SelectValue placeholder="Selecionar caso" /></SelectTrigger>
              <SelectContent>{CASES.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            {caseData && <p className="text-sm bg-muted/50 p-3 rounded-lg"><strong>Objetivo:</strong> {caseData.objective} | <strong>Região:</strong> {caseData.region}</p>}
            {caseData && !completedModules.has(1) && <Button size="sm" className="w-full" onClick={() => completeModule(1)}>Iniciar</Button>}
          </CardContent>
        </Card>

        <Card className="relative">
          {!completedModules.has(1) && <LockedOverlay module={1} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(2) ? "default" : "secondary"}>M2</Badge>Escolha da Corrente{completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedModality} onValueChange={v => { setSelectedModality(v); const m = MODALITIES.find(x => x.id === v); if (m) { setFreq(m.freqRange[0]); setPulseWidth(m.pulseRange[0]); } }}>
              <SelectTrigger><SelectValue placeholder="Selecionar modalidade" /></SelectTrigger>
              <SelectContent>{MODALITIES.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
            </Select>
            {modality && <p className="text-sm bg-muted/50 p-3 rounded-lg">{modality.desc}</p>}
            {selectedModality && !completedModules.has(2) && <Button size="sm" className="w-full" onClick={() => completeModule(2)}>Confirmar Modalidade</Button>}
          </CardContent>
        </Card>

        <Card className="relative">
          {!completedModules.has(2) && <LockedOverlay module={2} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(3) ? "default" : "secondary"}>M3</Badge>Parametrização{completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {completedModules.has(2) && modality && (<>
              <div className="space-y-3">
                <div><label className="text-sm font-medium">Frequência: {freq} Hz</label><Slider min={modality.freqRange[0]} max={modality.freqRange[1] || modality.freqRange[0] + 1} step={1} value={[freq]} onValueChange={([v]) => setFreq(v)} /></div>
                {modality.pulseRange[1] > 0 && <div><label className="text-sm font-medium">Largura de pulso: {pulseWidth} μs</label><Slider min={modality.pulseRange[0]} max={modality.pulseRange[1]} step={10} value={[pulseWidth]} onValueChange={([v]) => setPulseWidth(v)} /></div>}
                <div><label className="text-sm font-medium">Intensidade: {intensity} mA</label><Slider min={1} max={80} step={1} value={[intensity]} onValueChange={([v]) => setIntensity(v)} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-sm font-medium">T ON: {timeOn}s</label><Slider min={2} max={15} step={1} value={[timeOn]} onValueChange={([v]) => setTimeOn(v)} /></div>
                  <div><label className="text-sm font-medium">T OFF: {timeOff}s</label><Slider min={2} max={30} step={1} value={[timeOff]} onValueChange={([v]) => setTimeOff(v)} /></div>
                </div>
              </div>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={waveData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" /><XAxis dataKey="t" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" /><YAxis domain={[-1.2, 1.2]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" /><Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" dot={false} strokeWidth={1.5} /></LineChart>
                </ResponsiveContainer>
              </div>
              {!completedModules.has(3) && <Button size="sm" className="w-full" onClick={() => completeModule(3)}>Confirmar Parâmetros</Button>}
            </>)}
          </CardContent>
        </Card>

        <Card className="relative">
          {!completedModules.has(3) && <LockedOverlay module={3} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(4) ? "default" : "secondary"}>M4</Badge>Posicionamento de Eletrodos{completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedModules.has(3) && caseData && (<>
              <p className="text-sm text-muted-foreground">Clique para posicionar os eletrodos na região {caseData.region}:</p>
              <ElectrodeSVG region={caseData.region} electrodes={electrodes} onPlace={e => setElectrodes(prev => ({ ...prev, [e]: true }))} />
              {electrodes.a && electrodes.b && !completedModules.has(4) && <Button size="sm" className="w-full" onClick={() => { completeModule(4); setShowFeedback(true); }}>Confirmar Posicionamento</Button>}
            </>)}
          </CardContent>
        </Card>
      </div>

      <SimulatorFeedback score={feedback.score} decisions={feedback.decisions} narrative={feedback.narrative} visible={showFeedback} />
      <LabReportPanel benchTitle="Eletroterapia" isUnlocked={completedModules.has(4)} experimentSummary={expSummary} />
    </div>
  );
}
