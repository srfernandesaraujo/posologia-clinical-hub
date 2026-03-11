import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, CheckCircle2, Ruler, ClipboardList, Wrench } from "lucide-react";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";

const CASES = [
  { id: "g1", name: "Gengivite", desc: "Inflamação gengival reversível, sem perda óssea", depths: [2,2,3,2,2,3], bop: [true,false,true,false,true,false], boneLoss: 0 },
  { id: "p1", name: "Periodontite Estágio I", desc: "Perda de inserção 1-2mm, profundidades até 4mm", depths: [3,3,4,3,3,4], bop: [true,true,false,true,false,true], boneLoss: 15 },
  { id: "p2", name: "Periodontite Estágio III", desc: "Perda de inserção ≥5mm, bolsas profundas, mobilidade", depths: [5,6,7,4,5,6], bop: [true,true,true,true,true,true], boneLoss: 50 },
  { id: "p3", name: "Periodontite Estágio IV", desc: "Perda avançada, menos de 20 dentes, função mastigatória comprometida", depths: [7,8,9,6,7,8], bop: [true,true,true,true,true,true], boneLoss: 70 },
];

const CLASSIFICATION = [
  { stage: "I", label: "Estágio I — Inicial" },
  { stage: "II", label: "Estágio II — Moderada" },
  { stage: "III", label: "Estágio III — Severa com potencial perda" },
  { stage: "IV", label: "Estágio IV — Avançada com perda de função" },
];

const GRADES = [
  { grade: "A", label: "Grau A — Progressão lenta" },
  { grade: "B", label: "Grau B — Progressão moderada" },
  { grade: "C", label: "Grau C — Progressão rápida" },
];

const TREATMENTS = [
  { id: "rasp", label: "Raspagem e alisamento radicular (RAR)", desc: "Debridamento mecânico subgengival" },
  { id: "antibio", label: "Antibioticoterapia adjuvante", desc: "Amoxicilina + metronidazol sistêmico" },
  { id: "cirurgia", label: "Cirurgia periodontal a retalho", desc: "Acesso cirúrgico para debridamento" },
  { id: "regeneracao", label: "Regeneração tecidual guiada (RTG)", desc: "Membrana + enxerto ósseo" },
];

const SITES = ["MV", "V", "DV", "ML", "L", "DL"] as const;

function ProbeSVG({ depths, bopFlags }: { depths: number[]; bopFlags: boolean[] }) {
  const w = 300, h = 200;
  const toothX = 150, toothW = 80;
  const gumLine = 60;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      {/* Bone */}
      <rect x={20} y={120} width={w - 40} height={60} rx={4} fill="hsl(var(--muted))" opacity={0.3} />
      {/* Tooth body */}
      <rect x={toothX - toothW / 2} y={30} width={toothW} height={140} rx={6} fill="#f5f0e8" stroke="hsl(var(--border))" strokeWidth={1.5} />
      {/* Crown portion */}
      <rect x={toothX - toothW / 2} y={30} width={toothW} height={35} rx={6} fill="#ebe5d9" stroke="hsl(var(--border))" strokeWidth={1} />
      {/* Gum tissue */}
      <path d={`M 30 ${gumLine} Q ${toothX - toothW / 2 - 10} ${gumLine + 5} ${toothX - toothW / 2} ${gumLine + 3} Q ${toothX} ${gumLine - 5} ${toothX + toothW / 2} ${gumLine + 3} Q ${toothX + toothW / 2 + 10} ${gumLine + 5} ${w - 30} ${gumLine} L ${w - 30} ${gumLine + 20} Q ${toothX} ${gumLine + 25} 30 ${gumLine + 20} Z`}
        fill="#f472b6" opacity={0.5} stroke="#ec4899" strokeWidth={0.8} />
      {/* Probing sites */}
      {depths.map((d, i) => {
        const siteX = toothX - 35 + (i * 14);
        const probeEnd = gumLine + d * 8;
        const isBleeding = bopFlags[i];
        return (
          <g key={i}>
            {/* Probe line */}
            <line x1={siteX} y1={gumLine - 5} x2={siteX} y2={probeEnd} stroke={d >= 5 ? "#ef4444" : d >= 4 ? "#f59e0b" : "#22c55e"} strokeWidth={2} strokeLinecap="round" />
            {/* Depth label */}
            <text x={siteX} y={probeEnd + 12} textAnchor="middle" fontSize={8} fill={d >= 5 ? "#ef4444" : "hsl(var(--foreground))"} fontWeight="bold">{d}</text>
            {/* BOP dot */}
            {isBleeding && <circle cx={siteX} cy={gumLine} r={3} fill="#ef4444" />}
            {/* Site label */}
            <text x={siteX} y={gumLine - 12} textAnchor="middle" fontSize={6} fill="hsl(var(--muted-foreground))">{SITES[i]}</text>
          </g>
        );
      })}
      {/* Legend */}
      <g transform={`translate(20, ${h - 18})`}>
        <circle cx={5} cy={5} r={3} fill="#22c55e" /><text x={12} y={8} fontSize={7} fill="hsl(var(--foreground))">≤3mm</text>
        <circle cx={55} cy={5} r={3} fill="#f59e0b" /><text x={62} y={8} fontSize={7} fill="hsl(var(--foreground))">4mm</text>
        <circle cx={95} cy={5} r={3} fill="#ef4444" /><text x={102} y={8} fontSize={7} fill="hsl(var(--foreground))">≥5mm</text>
        <circle cx={145} cy={5} r={3} fill="#ef4444" /><text x={152} y={8} fontSize={7} fill="hsl(var(--foreground))">BOP</text>
      </g>
    </svg>
  );
}

export default function SimuladorPeriodontograma() {
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedCase, setSelectedCase] = useState("");
  const [probedDepths, setProbedDepths] = useState<number[]>([]);
  const [bopFlags, setBopFlags] = useState<boolean[]>([]);
  const [selectedStage, setSelectedStage] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);

  const caseData = CASES.find(c => c.id === selectedCase);
  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));

  const startProbing = () => {
    if (!caseData) return;
    // Simulate probing with some variance
    const depths = caseData.depths.map(d => d + Math.round((Math.random() - 0.5) * 1));
    setProbedDepths(depths);
    setBopFlags(caseData.bop);
    completeModule(2);
  };

  const LockedOverlay = ({ module }: { module: number }) => (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-xl">
      <Lock className="h-6 w-6 text-muted-foreground" />
      <p className="text-xs text-muted-foreground font-medium">Complete o módulo {module}</p>
    </div>
  );

  const bopPercent = bopFlags.length > 0 ? Math.round(bopFlags.filter(Boolean).length / bopFlags.length * 100) : 0;
  const maxDepth = probedDepths.length > 0 ? Math.max(...probedDepths) : 0;

  const expSummary: Record<string, string> = caseData ? {
    "Caso": caseData.name,
    "Profundidade máxima": `${maxDepth}mm`,
    "BOP": `${bopPercent}%`,
    "Classificação": selectedStage ? `Estágio ${selectedStage}` : "-",
    "Grau": selectedGrade || "-",
    "Tratamentos": selectedTreatments.length > 0 ? selectedTreatments.join(", ") : "-",
  } : {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Periodontograma e Classificação Periodontal</h1>
        <p className="text-muted-foreground">Sondagem periodontal interativa com régua animada e classificação AAP/EFP 2018</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* M1 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" /> 1. Seleção do Caso Clínico
              {completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedCase} onValueChange={setSelectedCase}>
              <SelectTrigger><SelectValue placeholder="Selecione a condição..." /></SelectTrigger>
              <SelectContent>
                {CASES.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {caseData && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p>{caseData.desc}</p>
                <p className="text-muted-foreground mt-1">Perda óssea estimada: {caseData.boneLoss}%</p>
              </div>
            )}
            <Button onClick={() => completeModule(1)} disabled={!caseData || completedModules.has(1)} className="w-full">
              Confirmar Caso
            </Button>
          </CardContent>
        </Card>

        {/* M2 — Sondagem */}
        <Card className="relative">
          {!completedModules.has(1) && <LockedOverlay module={1} />}
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Ruler className="h-4 w-4 text-primary" /> 2. Sondagem Periodontal
              {completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {probedDepths.length > 0 ? (
              <>
                <ProbeSVG depths={probedDepths} bopFlags={bopFlags} />
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-muted-foreground text-xs">Prof. Máx.</p>
                    <p className="font-bold text-lg">{maxDepth}mm</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-muted-foreground text-xs">BOP</p>
                    <p className="font-bold text-lg">{bopPercent}%</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-muted-foreground text-xs">Sítios ≥5mm</p>
                    <p className="font-bold text-lg">{probedDepths.filter(d => d >= 5).length}</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Clique para iniciar a sondagem nos 6 sítios por dente</p>
            )}
            <Button onClick={startProbing} disabled={completedModules.has(2)} className="w-full">
              {probedDepths.length > 0 ? "Sondagem Concluída" : "Iniciar Sondagem"}
            </Button>
          </CardContent>
        </Card>

        {/* M3 — Classificação */}
        <Card className="relative">
          {!completedModules.has(2) && <LockedOverlay module={2} />}
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" /> 3. Classificação Periodontal
              {completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-2">Estágio (AAP/EFP 2018):</p>
              <div className="space-y-1.5">
                {CLASSIFICATION.map(c => (
                  <label key={c.stage} className={`block p-2 rounded border text-sm cursor-pointer ${selectedStage === c.stage ? "border-primary bg-primary/5" : "border-border"}`}>
                    <input type="radio" name="stage" value={c.stage} checked={selectedStage === c.stage} onChange={() => setSelectedStage(c.stage)} className="sr-only" />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Grau:</p>
              <div className="space-y-1.5">
                {GRADES.map(g => (
                  <label key={g.grade} className={`block p-2 rounded border text-sm cursor-pointer ${selectedGrade === g.grade ? "border-primary bg-primary/5" : "border-border"}`}>
                    <input type="radio" name="grade" value={g.grade} checked={selectedGrade === g.grade} onChange={() => setSelectedGrade(g.grade)} className="sr-only" />
                    {g.label}
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={() => completeModule(3)} disabled={!selectedStage || !selectedGrade || completedModules.has(3)} className="w-full">
              Confirmar Classificação
            </Button>
          </CardContent>
        </Card>

        {/* M4 — Plano terapêutico */}
        <Card className="relative">
          {!completedModules.has(3) && <LockedOverlay module={3} />}
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" /> 4. Plano Terapêutico
              {completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {TREATMENTS.map(t => {
              const checked = selectedTreatments.includes(t.id);
              return (
                <label key={t.id} className="flex items-start gap-2 p-2 rounded border border-border hover:bg-muted/30 cursor-pointer text-sm">
                  <input type="checkbox" checked={checked} onChange={() => setSelectedTreatments(prev => checked ? prev.filter(x => x !== t.id) : [...prev, t.id])} className="mt-1 rounded" />
                  <div>
                    <p className="font-medium">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </div>
                </label>
              );
            })}
            <Button onClick={() => completeModule(4)} disabled={selectedTreatments.length === 0 || completedModules.has(4)} className="w-full">
              Confirmar Tratamento
            </Button>
          </CardContent>
        </Card>

        <LabReportPanel benchTitle="Periodontograma" isUnlocked={completedModules.has(3)} experimentSummary={expSummary} />
      </div>
    </div>
  );
}
