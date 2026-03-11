import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, CheckCircle2, User, FileText } from "lucide-react";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";

const CASES = [
  { id: "c1", name: "Escoliose torácica", description: "Adolescente 15a, assimetria de ombros e escápulas", landmarks: { tragusL: { x: 48, y: 12 }, tragusR: { x: 52, y: 11 }, acromioL: { x: 38, y: 22 }, acromioR: { x: 62, y: 20 }, easiL: { x: 42, y: 52 }, easiR: { x: 58, y: 52 }, maleolL: { x: 43, y: 95 }, maleolR: { x: 57, y: 95 } }, deviations: ["Inclinação lateral da cabeça à direita", "Desnível de ombros (D mais alto)", "Escoliose torácica convexa à direita", "Triângulo de Tales assimétrico"], cobbEstimate: 18 },
  { id: "c2", name: "Hiperlordose lombar", description: "Mulher 35a, queixa de lombalgia crônica", landmarks: { tragusL: { x: 47, y: 12 }, tragusR: { x: 53, y: 12 }, acromioL: { x: 38, y: 22 }, acromioR: { x: 62, y: 22 }, easiL: { x: 42, y: 53 }, easiR: { x: 58, y: 53 }, maleolL: { x: 43, y: 95 }, maleolR: { x: 57, y: 95 } }, deviations: ["Anteversão pélvica", "Hiperlordose lombar", "Abdômen protuso", "Retificação torácica compensatória"], cobbEstimate: null },
  { id: "c3", name: "Joelho valgo bilateral", description: "Criança 8a, pais relatam marcha com joelhos para dentro", landmarks: { tragusL: { x: 49, y: 12 }, tragusR: { x: 51, y: 12 }, acromioL: { x: 38, y: 22 }, acromioR: { x: 62, y: 22 }, easiL: { x: 42, y: 52 }, easiR: { x: 58, y: 52 }, maleolL: { x: 41, y: 95 }, maleolR: { x: 59, y: 95 } }, deviations: ["Joelho valgo bilateral > 8°", "Rotação interna de quadril", "Pés planos compensatórios", "Distância intermaleolar aumentada"], cobbEstimate: null },
];

const CORRECTIONS = [
  { id: "rpg", name: "RPG (Reeducação Postural Global)", desc: "Posturas de alongamento global em cadeia" },
  { id: "pilates", name: "Pilates Clínico", desc: "Fortalecimento de core e estabilizadores" },
  { id: "fort-escapular", name: "Fortalecimento escapular", desc: "Trapézio médio/inferior, serrátil anterior" },
  { id: "along-hip", name: "Alongamento de flexores de quadril", desc: "Iliopsoas e reto femoral" },
  { id: "prop-neuro", name: "Propriocepção e treino neuromuscular", desc: "Equilíbrio e controle postural dinâmico" },
  { id: "palmilha", name: "Palmilhas posturais", desc: "Correção de apoio plantar e alinhamento" },
];

function PostureSVG({ caseData, markedPoints, onPointClick }: { caseData: typeof CASES[0]; markedPoints: Set<string>; onPointClick: (id: string) => void }) {
  const points = [
    { id: "tragusL", label: "Tragus E", ...caseData.landmarks.tragusL },
    { id: "tragusR", label: "Tragus D", ...caseData.landmarks.tragusR },
    { id: "acromioL", label: "Acrômio E", ...caseData.landmarks.acromioL },
    { id: "acromioR", label: "Acrômio D", ...caseData.landmarks.acromioR },
    { id: "easiL", label: "EIAS E", ...caseData.landmarks.easiL },
    { id: "easiR", label: "EIAS D", ...caseData.landmarks.easiR },
    { id: "maleolL", label: "Maléolo E", ...caseData.landmarks.maleolL },
    { id: "maleolR", label: "Maléolo D", ...caseData.landmarks.maleolR },
  ];

  return (
    <svg viewBox="0 0 100 110" className="w-full max-w-[280px] mx-auto">
      {/* Grid */}
      <rect x={0} y={0} width={100} height={105} fill="hsl(var(--muted)/0.2)" rx={4} />
      {/* Plumb line */}
      <line x1={50} y1={5} x2={50} y2={100} stroke="hsl(var(--primary)/0.3)" strokeWidth={0.3} strokeDasharray="1 1" />
      {/* Horizontal references */}
      {[20, 40, 60, 80].map(y => <line key={y} x1={10} y1={y} x2={90} y2={y} stroke="hsl(var(--muted-foreground)/0.1)" strokeWidth={0.2} />)}

      {/* Body silhouette */}
      <ellipse cx={50} cy={10} rx={5} ry={5} fill="hsl(var(--foreground)/0.15)" /> {/* Head */}
      <line x1={50} y1={15} x2={50} y2={55} stroke="hsl(var(--foreground)/0.15)" strokeWidth={2} /> {/* Spine */}
      <line x1={38} y1={22} x2={62} y2={22} stroke="hsl(var(--foreground)/0.15)" strokeWidth={1.5} /> {/* Shoulders */}
      <line x1={38} y1={22} x2={35} y2={42} stroke="hsl(var(--foreground)/0.1)" strokeWidth={1} /> {/* L arm */}
      <line x1={62} y1={22} x2={65} y2={42} stroke="hsl(var(--foreground)/0.1)" strokeWidth={1} /> {/* R arm */}
      <line x1={50} y1={55} x2={43} y2={95} stroke="hsl(var(--foreground)/0.1)" strokeWidth={1.2} /> {/* L leg */}
      <line x1={50} y1={55} x2={57} y2={95} stroke="hsl(var(--foreground)/0.1)" strokeWidth={1.2} /> {/* R leg */}

      {/* Connection lines between bilateral points */}
      {[["tragusL", "tragusR"], ["acromioL", "acromioR"], ["easiL", "easiR"]].map(([l, r]) => {
        const lp = caseData.landmarks[l as keyof typeof caseData.landmarks];
        const rp = caseData.landmarks[r as keyof typeof caseData.landmarks];
        const bothMarked = markedPoints.has(l) && markedPoints.has(r);
        return bothMarked ? <line key={l+r} x1={lp.x} y1={lp.y} x2={rp.x} y2={rp.y} stroke="hsl(var(--primary))" strokeWidth={0.4} strokeDasharray="1 1" /> : null;
      })}

      {/* Landmark points */}
      {points.map(p => {
        const marked = markedPoints.has(p.id);
        return (
          <g key={p.id} onClick={() => onPointClick(p.id)} className="cursor-pointer">
            <circle cx={p.x} cy={p.y} r={marked ? 2.5 : 2} fill={marked ? "hsl(var(--primary))" : "hsl(var(--muted-foreground)/0.4)"} stroke={marked ? "hsl(var(--primary))" : "none"} strokeWidth={0.5} />
            <title>{p.label}</title>
            {marked && <text x={p.x} y={p.y - 3.5} textAnchor="middle" fontSize={2.5} fill="hsl(var(--primary))">{p.label}</text>}
          </g>
        );
      })}
    </svg>
  );
}

export default function SimuladorAvaliacaoPostural() {
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedCase, setSelectedCase] = useState("");
  const [markedPoints, setMarkedPoints] = useState<Set<string>>(new Set());
  const [confirmedDeviations, setConfirmedDeviations] = useState<string[]>([]);
  const [selectedCorrections, setSelectedCorrections] = useState<string[]>([]);

  const caseData = CASES.find(c => c.id === selectedCase);
  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));
  const allMarked = markedPoints.size === 8;

  const expSummary = caseData ? {
    "Caso": `${caseData.name} — ${caseData.description}`,
    "Pontos Marcados": `${markedPoints.size}/8 pontos anatômicos identificados`,
    "Desvios Identificados": caseData.deviations.join("; "),
    "Ângulo de Cobb": caseData.cobbEstimate ? `Estimado: ${caseData.cobbEstimate}°` : "N/A",
    "Programa Corretivo": selectedCorrections.map(id => CORRECTIONS.find(c => c.id === id)?.name).join(", ") || "Nenhum",
  } : undefined;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <User className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Avaliação Postural — Simetrógrafo Virtual</h1>
          <p className="text-sm text-muted-foreground">Análise postural com marcação de pontos anatômicos e fio de prumo</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* M1 */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(1) ? "default" : "secondary"}>M1</Badge>Seleção do Caso{completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedCase} onValueChange={v => { setSelectedCase(v); setMarkedPoints(new Set()); setConfirmedDeviations([]); setSelectedCorrections([]); setCompletedModules(new Set()); }}>
              <SelectTrigger><SelectValue placeholder="Selecionar caso" /></SelectTrigger>
              <SelectContent>{CASES.map(c => <SelectItem key={c.id} value={c.id}>{c.name} — {c.description}</SelectItem>)}</SelectContent>
            </Select>
            {caseData && !completedModules.has(1) && <Button size="sm" className="w-full" onClick={() => completeModule(1)}>Iniciar Avaliação</Button>}
          </CardContent>
        </Card>

        {/* M2 — Marcação */}
        <Card className="relative">
          {!completedModules.has(1) && <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg"><Lock className="h-6 w-6 text-muted-foreground" /></div>}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(2) ? "default" : "secondary"}>M2</Badge>Marcação de Pontos Anatômicos{completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {caseData && (
              <>
                <p className="text-sm text-muted-foreground">Clique nos pontos anatômicos na silhueta ({markedPoints.size}/8)</p>
                <PostureSVG caseData={caseData} markedPoints={markedPoints} onPointClick={id => setMarkedPoints(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; })} />
                {allMarked && !completedModules.has(2) && <Button size="sm" className="w-full" onClick={() => completeModule(2)}>Confirmar Pontos</Button>}
              </>
            )}
          </CardContent>
        </Card>

        {/* M3 — Diagnóstico */}
        <Card className="relative">
          {!completedModules.has(2) && <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg"><Lock className="h-6 w-6 text-muted-foreground" /></div>}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(3) ? "default" : "secondary"}>M3</Badge>Diagnóstico Postural{completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {completedModules.has(2) && caseData && (
              <>
                <p className="text-sm text-muted-foreground">Desvios identificados pelo sistema:</p>
                <ul className="space-y-1">
                  {caseData.deviations.map((d, i) => (
                    <li key={i} className="text-sm flex items-center gap-2 p-2 rounded bg-muted/50">
                      <span className="h-2 w-2 rounded-full bg-yellow-500" />
                      {d}
                    </li>
                  ))}
                </ul>
                {caseData.cobbEstimate && <p className="text-sm"><strong>Ângulo de Cobb estimado:</strong> {caseData.cobbEstimate}°</p>}
                {!completedModules.has(3) && <Button size="sm" className="w-full" onClick={() => completeModule(3)}>Confirmar Diagnóstico</Button>}
              </>
            )}
          </CardContent>
        </Card>

        {/* M4 — Programa */}
        <Card className="relative">
          {!completedModules.has(3) && <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg"><Lock className="h-6 w-6 text-muted-foreground" /></div>}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(4) ? "default" : "secondary"}>M4</Badge>Programa de Correção{completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {completedModules.has(3) && (
              <>
                {CORRECTIONS.map(c => (
                  <label key={c.id} className="flex items-start gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/50">
                    <input type="checkbox" checked={selectedCorrections.includes(c.id)} onChange={e => setSelectedCorrections(prev => e.target.checked ? [...prev, c.id] : prev.filter(x => x !== c.id))} className="mt-1" />
                    <div className="text-sm"><p className="font-medium">{c.name}</p><p className="text-muted-foreground">{c.desc}</p></div>
                  </label>
                ))}
                {selectedCorrections.length > 0 && !completedModules.has(4) && <Button size="sm" className="w-full" onClick={() => completeModule(4)}>Confirmar Programa</Button>}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <LabReportPanel benchTitle="Avaliação Postural" isUnlocked={completedModules.has(4)} experimentSummary={expSummary} />
    </div>
  );
}
