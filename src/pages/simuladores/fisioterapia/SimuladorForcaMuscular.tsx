import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, CheckCircle2, Dumbbell } from "lucide-react";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";

const CASES = [
  { id: "c1", name: "AVC — Hemiparesia à direita", level: "Cortical (ACM esquerda)", limb: "upper", muscles: { "Deltóide": 2, "Bíceps": 3, "Tríceps": 2, "Flexores de punho": 1, "Extensores de punho": 1, "Interósseos": 0 } },
  { id: "c2", name: "Lesão medular C6 — Tetraparesia", level: "Medular C6", limb: "upper", muscles: { "Deltóide": 4, "Bíceps": 4, "Tríceps": 1, "Flexores de punho": 1, "Extensores de punho": 2, "Interósseos": 0 } },
  { id: "c3", name: "Neuropatia peroneal — Pé caído", level: "Nervo fibular comum", limb: "lower", muscles: { "Quadríceps": 5, "Isquiotibiais": 5, "Tibial anterior": 1, "Fibulares": 1, "Gastrocnêmio": 5, "Extensor longo dos dedos": 0 } },
];

const OXFORD_LABELS: Record<number, string> = {
  0: "Nenhuma contração visível",
  1: "Contração visível/palpável, sem movimento",
  2: "Movimento ativo, sem gravidade",
  3: "Movimento ativo contra gravidade",
  4: "Movimento contra resistência moderada",
  5: "Força normal",
};

const EXERCISES: Record<string, { id: string; name: string; desc: string }[]> = {
  upper: [
    { id: "iso", name: "Isométricos no leito", desc: "Para graus 0-2, manter tônus" },
    { id: "aa", name: "Ativo-assistido com polias", desc: "Para graus 2-3, ganho de ADM" },
    { id: "res", name: "Resistência progressiva com faixas", desc: "Para graus 3-4" },
    { id: "func", name: "Treino funcional de preensão", desc: "Para graus 4-5, AVDs" },
    { id: "fes", name: "FES em extensores de punho", desc: "Estimulação elétrica funcional" },
  ],
  lower: [
    { id: "iso", name: "Isométricos de quadríceps", desc: "Para graus 0-2" },
    { id: "aa", name: "Ativo-assistido em cadeia cinética aberta", desc: "Para graus 2-3" },
    { id: "res", name: "Resistência em leg press", desc: "Para graus 3-4" },
    { id: "marcha", name: "Treino de marcha com órtese", desc: "Para pé caído" },
    { id: "prop", name: "Propriocepção em prancha", desc: "Equilíbrio e controle motor" },
  ],
};

function MuscleSVG({ muscles, grades, onMuscleClick, limb }: { muscles: string[]; grades: Record<string, number | null>; onMuscleClick: (m: string) => void; limb: string }) {
  const gradeColor = (g: number | null) => {
    if (g === null) return "hsl(var(--muted)/0.3)";
    if (g >= 4) return "#22c55e";
    if (g >= 3) return "#eab308";
    if (g >= 2) return "#f97316";
    return "#ef4444";
  };

  const isUpper = limb === "upper";
  const positions = isUpper
    ? [{ y: 10 }, { y: 25 }, { y: 40 }, { y: 55 }, { y: 70 }, { y: 85 }]
    : [{ y: 10 }, { y: 25 }, { y: 40 }, { y: 55 }, { y: 70 }, { y: 85 }];

  return (
    <svg viewBox="0 0 200 100" className="w-full max-w-[350px] mx-auto">
      {/* Limb outline */}
      {isUpper ? (
        <>
          <rect x={85} y={5} width={30} height={90} rx={8} fill="hsl(var(--foreground)/0.05)" stroke="hsl(var(--border))" strokeWidth={0.5} />
          <text x={100} y={100} textAnchor="middle" fontSize={5} fill="hsl(var(--muted-foreground))">Membro Superior</text>
        </>
      ) : (
        <>
          <rect x={85} y={5} width={30} height={90} rx={8} fill="hsl(var(--foreground)/0.05)" stroke="hsl(var(--border))" strokeWidth={0.5} />
          <text x={100} y={100} textAnchor="middle" fontSize={5} fill="hsl(var(--muted-foreground))">Membro Inferior</text>
        </>
      )}

      {muscles.map((m, i) => {
        const y = positions[i]?.y ?? 10 + i * 15;
        const g = grades[m];
        return (
          <g key={m} onClick={() => onMuscleClick(m)} className="cursor-pointer">
            <rect x={88} y={y} width={24} height={12} rx={3} fill={gradeColor(g)} opacity={0.7} stroke="hsl(var(--border))" strokeWidth={0.3} />
            <text x={83} y={y + 8} textAnchor="end" fontSize={4} fill="hsl(var(--foreground))">{m}</text>
            {g !== null && <text x={100} y={y + 8} textAnchor="middle" fontSize={5} fontWeight="bold" fill="white">{g}</text>}
          </g>
        );
      })}
    </svg>
  );
}

export default function SimuladorForcaMuscular() {
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedCase, setSelectedCase] = useState("");
  const [grades, setGrades] = useState<Record<string, number | null>>({});
  const [gradingMuscle, setGradingMuscle] = useState<string | null>(null);
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);

  const caseData = CASES.find(c => c.id === selectedCase);
  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));
  const muscles = caseData ? Object.keys(caseData.muscles) : [];
  const allGraded = muscles.length > 0 && muscles.every(m => grades[m] !== null && grades[m] !== undefined);

  const expSummary = caseData ? {
    "Caso": `${caseData.name} — Nível: ${caseData.level}`,
    "Força": muscles.map(m => `${m}: ${grades[m] ?? "?"}/5`).join("; "),
    "Padrão": caseData.id === "c1" ? "Hemiparesia" : caseData.id === "c2" ? "Tetraparesia C6" : "Peroneal",
    "Programa": selectedExercises.map(id => EXERCISES[caseData.limb].find(e => e.id === id)?.name).join(", ") || "Nenhum",
  } : undefined;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Dumbbell className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Teste de Força Muscular (Oxford/MRC)</h1>
          <p className="text-sm text-muted-foreground">Avaliação manual de força muscular — graduação 0 a 5</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* M1 */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(1) ? "default" : "secondary"}>M1</Badge>Seleção do Caso{completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedCase} onValueChange={v => { setSelectedCase(v); setGrades({}); setGradingMuscle(null); setSelectedExercises([]); setCompletedModules(new Set()); }}>
              <SelectTrigger><SelectValue placeholder="Selecionar caso" /></SelectTrigger>
              <SelectContent>{CASES.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            {caseData && (
              <div className="text-sm bg-muted/50 p-3 rounded-lg">
                <p><strong>Nível da lesão:</strong> {caseData.level}</p>
                <p><strong>Membro:</strong> {caseData.limb === "upper" ? "Superior" : "Inferior"}</p>
              </div>
            )}
            {caseData && !completedModules.has(1) && <Button size="sm" className="w-full" onClick={() => completeModule(1)}>Iniciar Avaliação</Button>}
          </CardContent>
        </Card>

        {/* M2 */}
        <Card className="relative">
          {!completedModules.has(1) && <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg"><Lock className="h-6 w-6 text-muted-foreground" /></div>}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(2) ? "default" : "secondary"}>M2</Badge>Teste Muscular{completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {caseData && (
              <>
                <p className="text-sm text-muted-foreground">Clique em um músculo e atribua o grau (0-5):</p>
                <MuscleSVG muscles={muscles} grades={grades} onMuscleClick={m => setGradingMuscle(m)} limb={caseData.limb} />
                {gradingMuscle && (
                  <div className="space-y-2 bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm font-medium">{gradingMuscle}</p>
                    <div className="flex gap-1 flex-wrap">
                      {[0, 1, 2, 3, 4, 5].map(g => (
                        <Button key={g} size="sm" variant={grades[gradingMuscle] === g ? "default" : "outline"} onClick={() => {
                          setGrades(prev => ({ ...prev, [gradingMuscle]: g }));
                          setGradingMuscle(null);
                        }} className="w-10">
                          {g}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{OXFORD_LABELS[grades[gradingMuscle] ?? 0]}</p>
                  </div>
                )}
                {allGraded && !completedModules.has(2) && <Button size="sm" className="w-full" onClick={() => completeModule(2)}>Confirmar Graduação</Button>}
              </>
            )}
          </CardContent>
        </Card>

        {/* M3 — Mapa */}
        <Card className="relative">
          {!completedModules.has(2) && <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg"><Lock className="h-6 w-6 text-muted-foreground" /></div>}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(3) ? "default" : "secondary"}>M3</Badge>Mapa de Força{completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {completedModules.has(2) && caseData && (
              <>
                <div className="space-y-1">
                  {muscles.map(m => {
                    const g = grades[m] ?? 0;
                    const real = caseData.muscles[m as keyof typeof caseData.muscles];
                    const correct = g === real;
                    return (
                      <div key={m} className={`flex items-center justify-between text-sm p-2 rounded ${correct ? "bg-green-500/10" : "bg-red-500/10"}`}>
                        <span>{m}</span>
                        <span>Seu: <strong>{g}</strong> | Real: <strong>{real}</strong> {correct ? "✓" : "✗"}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-sm"><strong>Padrão:</strong> {caseData.id === "c1" ? "Hemiparesia com gradiente distal" : caseData.id === "c2" ? "Tetraparesia nível C6" : "Déficit peroneal isolado"}</p>
                {!completedModules.has(3) && <Button size="sm" className="w-full" onClick={() => completeModule(3)}>Confirmar Análise</Button>}
              </>
            )}
          </CardContent>
        </Card>

        {/* M4 */}
        <Card className="relative">
          {!completedModules.has(3) && <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg"><Lock className="h-6 w-6 text-muted-foreground" /></div>}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(4) ? "default" : "secondary"}>M4</Badge>Programa de Fortalecimento{completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {completedModules.has(3) && caseData && (
              <>
                {EXERCISES[caseData.limb].map(e => (
                  <label key={e.id} className="flex items-start gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/50">
                    <input type="checkbox" checked={selectedExercises.includes(e.id)} onChange={ev => setSelectedExercises(prev => ev.target.checked ? [...prev, e.id] : prev.filter(x => x !== e.id))} className="mt-1" />
                    <div className="text-sm"><p className="font-medium">{e.name}</p><p className="text-muted-foreground">{e.desc}</p></div>
                  </label>
                ))}
                {selectedExercises.length > 0 && !completedModules.has(4) && <Button size="sm" className="w-full" onClick={() => completeModule(4)}>Confirmar Programa</Button>}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <LabReportPanel benchTitle="Força Muscular (Oxford/MRC)" isUnlocked={completedModules.has(4)} experimentSummary={expSummary} />
    </div>
  );
}
