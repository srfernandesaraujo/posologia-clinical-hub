import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, CheckCircle2, RotateCcw, ArrowLeft, Sparkles } from "lucide-react";
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
  "Selecione um caso clínico para iniciar a avaliação goniométrica.",
  "Em M1, revise os dados do paciente e inicie a avaliação.",
  "Em M2, selecione cada movimento e clique em 'Medir ADM' para obter a medição simulada.",
  "Em M3, classifique o déficit de cada movimento (leve, moderado ou grave) baseado nas medições.",
  "Em M4, selecione as técnicas terapêuticas adequadas para os déficits encontrados.",
  "Ao final, revise o feedback com a previsão clínica e gere seu relatório.",
];

const JOINTS = [
  { id: "shoulder", name: "Ombro", movements: [
    { name: "Flexão", normal: 180 }, { name: "Extensão", normal: 60 }, { name: "Abdução", normal: 180 },
    { name: "Rotação Interna", normal: 70 }, { name: "Rotação Externa", normal: 90 },
  ]},
  { id: "knee", name: "Joelho", movements: [
    { name: "Flexão", normal: 140 }, { name: "Extensão", normal: 0 },
  ]},
  { id: "hip", name: "Quadril", movements: [
    { name: "Flexão", normal: 120 }, { name: "Extensão", normal: 30 },
    { name: "Abdução", normal: 45 }, { name: "Adução", normal: 30 },
  ]},
  { id: "elbow", name: "Cotovelo", movements: [
    { name: "Flexão", normal: 150 }, { name: "Extensão", normal: 0 },
    { name: "Pronação", normal: 80 }, { name: "Supinação", normal: 80 },
  ]},
];

const PATIENTS = [
  { id: "p1", name: "Ana Costa", age: 55, injury: "Capsulite adesiva (ombro congelado) — ombro direito", joint: "shoulder", difficulty: "Médio",
    adm: { "Flexão": { active: 95, passive: 110 }, "Extensão": { active: 25, passive: 35 }, "Abdução": { active: 70, passive: 90 }, "Rotação Interna": { active: 20, passive: 30 }, "Rotação Externa": { active: 15, passive: 25 } },
    idealTechniques: ["along", "mob-grau3", "cinesio", "crioterapia"] },
  { id: "p2", name: "Pedro Alves", age: 32, injury: "Pós-operatório LCA — joelho esquerdo (6 semanas)", joint: "knee", difficulty: "Fácil",
    adm: { "Flexão": { active: 90, passive: 105 }, "Extensão": { active: -10, passive: -5 } },
    idealTechniques: ["cinesio", "fort", "crioterapia"] },
  { id: "p3", name: "Dona Lúcia", age: 72, injury: "Artrose de quadril bilateral — lado direito mais comprometido", joint: "hip", difficulty: "Difícil",
    adm: { "Flexão": { active: 80, passive: 95 }, "Extensão": { active: 10, passive: 15 }, "Abdução": { active: 20, passive: 25 }, "Adução": { active: 15, passive: 20 } },
    idealTechniques: ["along", "cinesio", "fort", "crioterapia"] },
];

const TECHNIQUES = [
  { id: "along", name: "Alongamento sustentado", effect: "Ganho de ADM passiva", best: "leve" },
  { id: "mob-grau3", name: "Mobilização articular (Graus III-IV)", effect: "Restauração de jogo articular", best: "moderado" },
  { id: "cinesio", name: "Cinesioterapia ativa-assistida", effect: "Ganho de ADM ativa", best: "leve" },
  { id: "fort", name: "Fortalecimento isométrico", effect: "Estabilização articular", best: "grave" },
  { id: "crioterapia", name: "Crioterapia pós-exercício", effect: "Controle álgico e inflamatório", best: "moderado" },
  { id: "pnf", name: "Facilitação Neuromuscular (PNF)", effect: "Ganho de ADM + controle motor", best: "moderado" },
];

type DeficitClass = "leve" | "moderado" | "grave" | null;

function realClassify(measured: number, normal: number): DeficitClass {
  if (normal === 0) return measured < -5 ? "moderado" : measured < 0 ? "leve" : null;
  const pct = (measured / normal) * 100;
  if (pct >= 80) return "leve";
  if (pct >= 50) return "moderado";
  return "grave";
}

function GoniometerSVG({ angle, normalAngle }: { angle: number; normalAngle: number }) {
  const cx = 150, cy = 150, r = 120, armLen = 110;
  const fixedAngle = -90;
  const mobileRad = ((fixedAngle + angle) * Math.PI) / 180;
  const normalRad = ((fixedAngle + normalAngle) * Math.PI) / 180;
  const mx = cx + armLen * Math.cos(mobileRad);
  const my = cy + armLen * Math.sin(mobileRad);
  const nx = cx + armLen * Math.cos(normalRad);
  const ny = cy + armLen * Math.sin(normalRad);
  const fx = cx, fy = cy - armLen;
  const arcR = 50;
  const startA = fixedAngle;
  const endA = fixedAngle + angle;
  const arcStart = { x: cx + arcR * Math.cos((startA * Math.PI) / 180), y: cy + arcR * Math.sin((startA * Math.PI) / 180) };
  const arcEnd = { x: cx + arcR * Math.cos((endA * Math.PI) / 180), y: cy + arcR * Math.sin((endA * Math.PI) / 180) };
  const largeArc = angle > 180 ? 1 : 0;
  return (
    <svg viewBox="0 0 300 300" className="w-full max-w-[300px] mx-auto">
      {[0, 30, 60, 90, 120, 150, 180].map(deg => {
        const rad = ((fixedAngle + deg) * Math.PI) / 180;
        return (<g key={deg}><line x1={cx} y1={cy} x2={cx + r * Math.cos(rad)} y2={cy + r * Math.sin(rad)} stroke="hsl(var(--muted-foreground)/0.15)" strokeWidth={0.5} /><text x={cx + (r + 12) * Math.cos(rad)} y={cy + (r + 12) * Math.sin(rad)} textAnchor="middle" dominantBaseline="middle" fontSize={8} fill="hsl(var(--muted-foreground))">{deg}°</text></g>);
      })}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--muted-foreground)/0.1)" strokeWidth={1} />
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="hsl(var(--primary)/0.3)" strokeWidth={1} strokeDasharray="4 4" />
      <text x={nx + 5} y={ny} fontSize={8} fill="hsl(var(--primary)/0.5)">Ref {normalAngle}°</text>
      <path d={`M ${arcStart.x} ${arcStart.y} A ${arcR} ${arcR} 0 ${largeArc} 1 ${arcEnd.x} ${arcEnd.y}`} fill="hsl(var(--primary)/0.15)" stroke="hsl(var(--primary))" strokeWidth={1.5} />
      <line x1={cx} y1={cy} x2={fx} y2={fy} stroke="hsl(var(--foreground))" strokeWidth={3} strokeLinecap="round" />
      <circle cx={fx} cy={fy} r={4} fill="hsl(var(--foreground))" />
      <line x1={cx} y1={cy} x2={mx} y2={my} stroke="hsl(var(--primary))" strokeWidth={3} strokeLinecap="round" />
      <circle cx={mx} cy={my} r={4} fill="hsl(var(--primary))" />
      <circle cx={cx} cy={cy} r={6} fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth={2} />
      <text x={cx} y={cy + r + 25} textAnchor="middle" fontSize={16} fontWeight="bold" fill="hsl(var(--foreground))">{angle}°</text>
    </svg>
  );
}

const BUILT_IN = PATIENTS.map(p => ({ id: p.id, title: p.name + " — " + p.injury, difficulty: p.difficulty, patient: { diagnosis: p.injury } }));

export default function SimuladorGoniometria() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const prompt = getNativePrompt("sim-goniometria") || "";
  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases("goniometria", BUILT_IN);

  const [activeCase, setActiveCase] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedMovement, setSelectedMovement] = useState("");
  const [userMeasurements, setUserMeasurements] = useState<Record<string, { active: number; passive: number }>>({});
  const [userClassifications, setUserClassifications] = useState<Record<string, DeficitClass>>({});
  const [selectedTechniques, setSelectedTechniques] = useState<string[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);

  const patient = PATIENTS.find(p => p.id === selectedPatient);
  const joint = patient ? JOINTS.find(j => j.id === patient.joint) : null;
  const movement = joint?.movements.find(m => m.name === selectedMovement);
  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));

  const handleMeasure = () => {
    if (!patient || !selectedMovement) return;
    const real = patient.adm[selectedMovement as keyof typeof patient.adm];
    if (real) setUserMeasurements(prev => ({ ...prev, [selectedMovement]: { active: real.active, passive: real.passive } }));
  };

  const allMeasured = joint ? joint.movements.every(m => userMeasurements[m.name]) : false;
  const allClassified = joint ? joint.movements.every(m => userClassifications[m.name]) : false;

  // Feedback calculation
  const calcFeedback = () => {
    if (!patient || !joint) return { score: 0, decisions: [] as FeedbackDecision[], narrative: "" };
    const decisions: FeedbackDecision[] = [];
    let correct = 0;
    let total = 0;

    // Classification accuracy
    joint.movements.forEach(m => {
      const meas = userMeasurements[m.name];
      if (!meas) return;
      const realClass = realClassify(meas.active, m.normal);
      const userClass = userClassifications[m.name];
      const isCorrect = userClass === realClass;
      if (isCorrect) correct++;
      total++;
      decisions.push({ label: `Classificação: ${m.name}`, userChoice: userClass || "-", idealChoice: realClass || "Normal", correct: isCorrect });
    });

    // Technique match
    const idealSet = new Set(patient.idealTechniques);
    const userSet = new Set(selectedTechniques);
    const techCorrect = selectedTechniques.filter(t => idealSet.has(t));
    const techMissing = patient.idealTechniques.filter(t => !userSet.has(t));
    const techExtra = selectedTechniques.filter(t => !idealSet.has(t));
    if (techCorrect.length === patient.idealTechniques.length && techExtra.length === 0) { correct++; }
    total++;
    decisions.push({
      label: "Plano terapêutico",
      userChoice: selectedTechniques.map(id => TECHNIQUES.find(t => t.id === id)?.name).join(", ") || "Nenhum",
      idealChoice: patient.idealTechniques.map(id => TECHNIQUES.find(t => t.id === id)?.name).join(", "),
      correct: techCorrect.length === patient.idealTechniques.length && techExtra.length === 0,
      explanation: techMissing.length > 0 ? `Faltou: ${techMissing.map(id => TECHNIQUES.find(t => t.id === id)?.name).join(", ")}` : undefined,
    });

    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    const narrative = score >= 80
      ? `Com o programa terapêutico escolhido, ${patient.name} teria evolução favorável com ganho progressivo de ADM em 6-8 semanas, retornando às atividades diárias com mínimas restrições.`
      : score >= 50
      ? `O programa é parcialmente adequado. ${patient.name} teria alguma melhora, mas déficits residuais persistiriam por não abordar todos os padrões de restrição encontrados.`
      : `O programa não aborda adequadamente os déficits encontrados. ${patient.name} teria pouca evolução funcional e risco de cronificação da limitação articular.`;

    return { score, decisions, narrative };
  };

  const feedback = calcFeedback();
  const location = useLocation();
  const { virtualRoomCase, isVirtualRoom: isVR, goBack: vrGoBack, submitResults: submitVRResults, submitted, examProgress, examFeedback, proceedToNext } = useVirtualRoomCase("goniometria");
  const [vrAutoStarted, setVrAutoStarted] = useState(false);
  if (isVR && !vrAutoStarted && !activeCase) { setVrAutoStarted(true); setActiveCase(virtualRoomCase?.id || "vr"); setSelectedPatient(PATIENTS[0]?.id || ""); }
  const handleVRSubmit = (reportData: { hypothesis: string; results: string; conclusion: string }) => { submitVRResults({ score: feedback.score, actions: { decisions: feedback.decisions, report: reportData }, timeSpentSeconds: 0 }); };

  useEffect(() => { if (isVR && showFeedback && !submitted) { submitVRResults({ score: feedback.score, actions: { decisions: feedback.decisions }, timeSpentSeconds: 0 }); } }, [showFeedback]);
  useEffect(() => { if (isVR && submitted) { const t = setTimeout(() => navigate("/"), 15000); return () => clearTimeout(t); } }, [isVR, submitted, navigate]);

  if (!activeCase) {
    return (
      <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Goniometria Articular Interativa</h1>
            <p className="text-sm text-muted-foreground">Medição de amplitude de movimento (ADM) com goniômetro virtual</p>
          </div>
          <SimulatorHowToUse title="Goniometria" steps={HOW_TO} />
          <AdminPromptViewer toolSlug="sim-goniometria" toolName="Goniometria Articular" toolType="simulator" prompt={prompt} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allCases.map((c: any) => c.isAI
            ? <AICaseCard key={c.id} caseItem={c} onClick={() => { setActiveCase(c.id); setSelectedPatient(PATIENTS[0]?.id || ""); }} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />
            : <NativeCaseCard key={c.id} caseItem={c} onClick={() => { setActiveCase(c.id); setSelectedPatient(c.id); }} />
          )}
        </div>
        {isAdmin && !isVR && <Button onClick={() => generateCase()} disabled={isGenerating} variant="outline" className="gap-2"><Sparkles className="h-4 w-4" />{isGenerating ? "Gerando..." : "Gerar Caso com IA"}</Button>}
      </div>
    );
  }

  const LockedOverlay = ({ module }: { module: number }) => (<div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-xl"><Lock className="h-6 w-6 text-muted-foreground" /><p className="text-xs text-muted-foreground font-medium">Complete o módulo {module}</p></div>);

  const expSummary = patient && joint ? {
    "Paciente": `${patient.name}, ${patient.age} anos — ${patient.injury}`,
    "Articulação": joint.name,
    "Goniometria": joint.movements.map(m => { const meas = userMeasurements[m.name]; if (!meas) return `${m.name}: não avaliado`; return `${m.name}: ${meas.active}°/${meas.passive}° (ref ${m.normal}°) — ${userClassifications[m.name] || "?"}`; }).join("; "),
    "Plano": selectedTechniques.map(id => TECHNIQUES.find(t => t.id === id)?.name).join(", ") || "Nenhum",
    "Pontuação": `${feedback.score}%`,
  } : undefined;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => { setActiveCase(null); setCompletedModules(new Set()); setUserMeasurements({}); setUserClassifications({}); setSelectedTechniques([]); setShowFeedback(false); }}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1"><h1 className="text-2xl font-bold">Goniometria Articular</h1></div>
        <SimulatorHowToUse title="Goniometria" steps={HOW_TO} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* M1 */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(1) ? "default" : "secondary"}>M1</Badge>Seleção do Paciente{completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedPatient} onValueChange={v => { setSelectedPatient(v); setUserMeasurements({}); setUserClassifications({}); setSelectedMovement(""); setSelectedTechniques([]); setCompletedModules(new Set()); setShowFeedback(false); }}>
              <SelectTrigger><SelectValue placeholder="Selecionar paciente" /></SelectTrigger>
              <SelectContent>{PATIENTS.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — {p.age}a</SelectItem>)}</SelectContent>
            </Select>
            {patient && (
              <div className="text-sm space-y-1 bg-muted/50 p-3 rounded-lg">
                <p><strong>Lesão:</strong> {patient.injury}</p>
                <p><strong>Articulação:</strong> {joint?.name}</p>
              </div>
            )}
            {patient && !completedModules.has(1) && <Button size="sm" className="w-full" onClick={() => completeModule(1)}>Iniciar Avaliação</Button>}
          </CardContent>
        </Card>

        {/* M2 — Goniometria */}
        <Card className="relative">
          {!completedModules.has(1) && <LockedOverlay module={1} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(2) ? "default" : "secondary"}>M2</Badge>Medição Goniométrica{completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {joint && (<>
              <Select value={selectedMovement} onValueChange={setSelectedMovement}>
                <SelectTrigger><SelectValue placeholder="Selecionar movimento" /></SelectTrigger>
                <SelectContent>{joint.movements.map(m => (<SelectItem key={m.name} value={m.name}>{m.name} {userMeasurements[m.name] ? "✓" : ""}</SelectItem>))}</SelectContent>
              </Select>
              {movement && <GoniometerSVG angle={userMeasurements[selectedMovement]?.active ?? 0} normalAngle={movement.normal} />}
              {selectedMovement && !userMeasurements[selectedMovement] && <Button size="sm" className="w-full" onClick={handleMeasure}>Medir ADM</Button>}
              {userMeasurements[selectedMovement] && (
                <div className="text-sm bg-muted/50 p-3 rounded-lg space-y-1">
                  <p><strong>ADM Ativa:</strong> {userMeasurements[selectedMovement].active}°</p>
                  <p><strong>ADM Passiva:</strong> {userMeasurements[selectedMovement].passive}°</p>
                  <p><strong>Referência (AAOS):</strong> {movement?.normal}°</p>
                </div>
              )}
              {allMeasured && !completedModules.has(2) && <Button size="sm" className="w-full" onClick={() => completeModule(2)}>Confirmar Medições</Button>}
            </>)}
          </CardContent>
        </Card>

        {/* M3 — Classificação de Déficit (decisão do aluno) */}
        <Card className="relative">
          {!completedModules.has(2) && <LockedOverlay module={2} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(3) ? "default" : "secondary"}>M3</Badge>Classificação de Déficits{completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedModules.has(2) && joint && (<>
              <p className="text-sm text-muted-foreground">Com base nas medições, classifique cada déficit:</p>
              {joint.movements.map(m => {
                const meas = userMeasurements[m.name];
                if (!meas) return null;
                return (
                  <div key={m.name} className="flex items-center justify-between gap-2 p-2 rounded-lg border">
                    <div className="text-sm">
                      <span className="font-medium">{m.name}</span>
                      <span className="text-muted-foreground ml-2">{meas.active}° / ref {m.normal}°</span>
                    </div>
                    <Select value={userClassifications[m.name] || ""} onValueChange={(v) => setUserClassifications(prev => ({ ...prev, [m.name]: v as DeficitClass }))}>
                      <SelectTrigger className="w-[130px]"><SelectValue placeholder="Classificar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="leve">Leve</SelectItem>
                        <SelectItem value="moderado">Moderado</SelectItem>
                        <SelectItem value="grave">Grave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
              {allClassified && !completedModules.has(3) && <Button size="sm" className="w-full" onClick={() => completeModule(3)}>Confirmar Classificação</Button>}
            </>)}
          </CardContent>
        </Card>

        {/* M4 — Plano */}
        <Card className="relative">
          {!completedModules.has(3) && <LockedOverlay module={3} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(4) ? "default" : "secondary"}>M4</Badge>Plano Terapêutico{completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {completedModules.has(3) && (<>
              <p className="text-sm text-muted-foreground">Selecione as técnicas para o programa terapêutico:</p>
              {TECHNIQUES.map(t => (
                <label key={t.id} className="flex items-start gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/50">
                  <input type="checkbox" checked={selectedTechniques.includes(t.id)} onChange={e => setSelectedTechniques(prev => e.target.checked ? [...prev, t.id] : prev.filter(x => x !== t.id))} className="mt-1" />
                  <div className="text-sm"><p className="font-medium">{t.name}</p><p className="text-muted-foreground">{t.effect}</p></div>
                </label>
              ))}
              {selectedTechniques.length > 0 && !completedModules.has(4) && <Button size="sm" className="w-full" onClick={() => { completeModule(4); setShowFeedback(true); }}>Confirmar Plano</Button>}
            </>)}
          </CardContent>
        </Card>
      </div>

      <SimulatorFeedback score={feedback.score} decisions={feedback.decisions} narrative={feedback.narrative} visible={showFeedback} />
      <LabReportPanel benchTitle="Goniometria Articular" isUnlocked={completedModules.has(4)} experimentSummary={expSummary} isVirtualRoom={isVR} onVRSubmit={handleVRSubmit} vrSubmitted={submitted} />
    </div>
  );
}
