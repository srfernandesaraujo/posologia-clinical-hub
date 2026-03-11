import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, CheckCircle2, MapPin } from "lucide-react";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";

type Sensitivity = "normal" | "diminuida" | "ausente" | null;

const DERMATOMES = [
  { id: "C5", label: "C5", x: 25, y: 25, side: "lateral do braço" },
  { id: "C6", label: "C6", x: 20, y: 38, side: "polegar e indicador" },
  { id: "C7", label: "C7", x: 22, y: 42, side: "dedo médio" },
  { id: "C8", label: "C8", x: 24, y: 45, side: "dedo mínimo" },
  { id: "T1", label: "T1", x: 30, y: 35, side: "face medial do antebraço" },
  { id: "T4", label: "T4", x: 42, y: 30, side: "nível do mamilo" },
  { id: "T10", label: "T10", x: 42, y: 48, side: "nível do umbigo" },
  { id: "L1", label: "L1", x: 38, y: 55, side: "região inguinal" },
  { id: "L2", label: "L2", x: 35, y: 62, side: "face anterior da coxa" },
  { id: "L3", label: "L3", x: 37, y: 70, side: "face medial do joelho" },
  { id: "L4", label: "L4", x: 35, y: 78, side: "face medial da perna" },
  { id: "L5", label: "L5", x: 32, y: 88, side: "dorso do pé" },
  { id: "S1", label: "S1", x: 38, y: 92, side: "borda lateral do pé" },
  // Right side mirrors
  { id: "C5R", label: "C5", x: 75, y: 25, side: "lateral do braço (D)" },
  { id: "C6R", label: "C6", x: 80, y: 38, side: "polegar e indicador (D)" },
  { id: "L4R", label: "L4", x: 65, y: 78, side: "face medial da perna (D)" },
  { id: "L5R", label: "L5", x: 68, y: 88, side: "dorso do pé (D)" },
  { id: "S1R", label: "S1", x: 62, y: 92, side: "borda lateral do pé (D)" },
];

const CASES = [
  { id: "c1", name: "Lesão medular C5 completa", description: "Tetraplegia — sensibilidade preservada até C5", affected: { C5: "normal", C6: "ausente", C7: "ausente", C8: "ausente", T1: "ausente", T4: "ausente", T10: "ausente", L1: "ausente", L2: "ausente", L3: "ausente", L4: "ausente", L5: "ausente", S1: "ausente", C5R: "normal", C6R: "ausente", L4R: "ausente", L5R: "ausente", S1R: "ausente" } as Record<string, Sensitivity>, asiaLevel: "C5", asiaGrade: "A (Completa)" },
  { id: "c2", name: "Hérnia discal L4-L5", description: "Dor irradiada para membro inferior esquerdo", affected: { C5: "normal", C6: "normal", C7: "normal", C8: "normal", T1: "normal", T4: "normal", T10: "normal", L1: "normal", L2: "normal", L3: "normal", L4: "diminuida", L5: "diminuida", S1: "normal", C5R: "normal", C6R: "normal", L4R: "normal", L5R: "normal", S1R: "normal" } as Record<string, Sensitivity>, asiaLevel: null, asiaGrade: null },
  { id: "c3", name: "Neuropatia diabética distal", description: "Padrão em bota e luva", affected: { C5: "normal", C6: "normal", C7: "normal", C8: "diminuida", T1: "normal", T4: "normal", T10: "normal", L1: "normal", L2: "normal", L3: "normal", L4: "diminuida", L5: "diminuida", S1: "diminuida", C5R: "normal", C6R: "normal", L4R: "diminuida", L5R: "diminuida", S1R: "diminuida" } as Record<string, Sensitivity>, asiaLevel: null, asiaGrade: null },
];

const SENS_COLORS: Record<string, string> = { normal: "#22c55e", diminuida: "#eab308", ausente: "#ef4444" };

function DermatomesSVG({ userSens, onPointClick }: { userSens: Record<string, Sensitivity>; onPointClick: (id: string) => void }) {
  return (
    <svg viewBox="0 0 100 105" className="w-full max-w-[300px] mx-auto">
      <rect x={0} y={0} width={100} height={100} fill="hsl(var(--muted)/0.2)" rx={4} />

      {/* Body outline */}
      <ellipse cx={50} cy={10} rx={6} ry={7} fill="hsl(var(--foreground)/0.08)" stroke="hsl(var(--border))" strokeWidth={0.3} />
      <rect x={40} y={17} width={20} height={35} rx={5} fill="hsl(var(--foreground)/0.05)" stroke="hsl(var(--border))" strokeWidth={0.3} />
      {/* Arms */}
      <rect x={15} y={20} width={25} height={8} rx={3} fill="hsl(var(--foreground)/0.04)" stroke="hsl(var(--border))" strokeWidth={0.2} />
      <rect x={60} y={20} width={25} height={8} rx={3} fill="hsl(var(--foreground)/0.04)" stroke="hsl(var(--border))" strokeWidth={0.2} />
      {/* Hands */}
      <ellipse cx={15} cy={40} rx={4} ry={5} fill="hsl(var(--foreground)/0.04)" stroke="hsl(var(--border))" strokeWidth={0.2} />
      <ellipse cx={85} cy={40} rx={4} ry={5} fill="hsl(var(--foreground)/0.04)" stroke="hsl(var(--border))" strokeWidth={0.2} />
      {/* Legs */}
      <rect x={35} y={52} width={12} height={40} rx={4} fill="hsl(var(--foreground)/0.04)" stroke="hsl(var(--border))" strokeWidth={0.2} />
      <rect x={53} y={52} width={12} height={40} rx={4} fill="hsl(var(--foreground)/0.04)" stroke="hsl(var(--border))" strokeWidth={0.2} />

      {/* Dermatome points */}
      {DERMATOMES.map(d => {
        const s = userSens[d.id];
        const color = s ? SENS_COLORS[s] : "hsl(var(--muted-foreground)/0.4)";
        return (
          <g key={d.id} onClick={() => onPointClick(d.id)} className="cursor-pointer">
            <circle cx={d.x} cy={d.y} r={s ? 3 : 2.5} fill={color} opacity={0.8} stroke="hsl(var(--background))" strokeWidth={0.3} />
            <text x={d.x} y={d.y - 4} textAnchor="middle" fontSize={2.5} fill="hsl(var(--foreground))">{d.label}</text>
            <title>{d.label} — {d.side}</title>
          </g>
        );
      })}
    </svg>
  );
}

export default function SimuladorDermatomos() {
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedCase, setSelectedCase] = useState("");
  const [userSens, setUserSens] = useState<Record<string, Sensitivity>>({});
  const [activePoint, setActivePoint] = useState<string | null>(null);

  const caseData = CASES.find(c => c.id === selectedCase);
  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));
  const allTested = DERMATOMES.every(d => userSens[d.id] !== null && userSens[d.id] !== undefined);

  const handleSetSens = (s: Sensitivity) => {
    if (!activePoint) return;
    setUserSens(prev => ({ ...prev, [activePoint]: s }));
    setActivePoint(null);
  };

  const expSummary = caseData ? {
    "Caso": `${caseData.name} — ${caseData.description}`,
    "Mapa": DERMATOMES.map(d => `${d.label}: ${userSens[d.id] ?? "?"}`).join("; "),
    "Correlação": caseData.asiaLevel ? `ASIA ${caseData.asiaLevel} ${caseData.asiaGrade}` : "Padrão periférico",
  } : undefined;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <MapPin className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Dermátomos e Avaliação Sensitiva</h1>
          <p className="text-sm text-muted-foreground">Mapeamento de sensibilidade e correlação neurológica</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* M1 */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(1) ? "default" : "secondary"}>M1</Badge>Seleção do Caso{completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedCase} onValueChange={v => { setSelectedCase(v); setUserSens({}); setActivePoint(null); setCompletedModules(new Set()); }}>
              <SelectTrigger><SelectValue placeholder="Selecionar caso" /></SelectTrigger>
              <SelectContent>{CASES.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            {caseData && <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">{caseData.description}</p>}
            {caseData && !completedModules.has(1) && <Button size="sm" className="w-full" onClick={() => completeModule(1)}>Iniciar Exame</Button>}
          </CardContent>
        </Card>

        {/* M2 */}
        <Card className="relative">
          {!completedModules.has(1) && <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg"><Lock className="h-6 w-6 text-muted-foreground" /></div>}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(2) ? "default" : "secondary"}>M2</Badge>Exame Sensitivo{completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Clique em um dermátomo e classifique a sensibilidade:</p>
            <div className="flex gap-2 text-xs">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" />Normal</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-500" />Diminuída</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />Ausente</span>
            </div>
            <DermatomesSVG userSens={userSens} onPointClick={id => setActivePoint(id)} />
            {activePoint && (
              <div className="flex gap-2 justify-center">
                <Button size="sm" variant="outline" className="border-green-500 text-green-600" onClick={() => handleSetSens("normal")}>Normal</Button>
                <Button size="sm" variant="outline" className="border-yellow-500 text-yellow-600" onClick={() => handleSetSens("diminuida")}>Diminuída</Button>
                <Button size="sm" variant="outline" className="border-red-500 text-red-600" onClick={() => handleSetSens("ausente")}>Ausente</Button>
              </div>
            )}
            {allTested && !completedModules.has(2) && <Button size="sm" className="w-full" onClick={() => completeModule(2)}>Confirmar Mapa</Button>}
          </CardContent>
        </Card>

        {/* M3 */}
        <Card className="relative">
          {!completedModules.has(2) && <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg"><Lock className="h-6 w-6 text-muted-foreground" /></div>}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(3) ? "default" : "secondary"}>M3</Badge>Correlação Neurológica{completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {completedModules.has(2) && caseData && (
              <>
                <div className="space-y-1">
                  {DERMATOMES.map(d => {
                    const user = userSens[d.id];
                    const real = caseData.affected[d.id];
                    const correct = user === real;
                    return (
                      <div key={d.id} className={`flex items-center justify-between text-xs p-1.5 rounded ${correct ? "bg-green-500/10" : "bg-red-500/10"}`}>
                        <span>{d.label} ({d.side})</span>
                        <span>{user} {correct ? "✓" : `→ ${real}`}</span>
                      </div>
                    );
                  })}
                </div>
                {!completedModules.has(3) && <Button size="sm" className="w-full" onClick={() => completeModule(3)}>Confirmar</Button>}
              </>
            )}
          </CardContent>
        </Card>

        {/* M4 */}
        <Card className="relative">
          {!completedModules.has(3) && <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg"><Lock className="h-6 w-6 text-muted-foreground" /></div>}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(4) ? "default" : "secondary"}>M4</Badge>Classificação ASIA / Diagnóstico{completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {completedModules.has(3) && caseData && (
              <>
                {caseData.asiaLevel ? (
                  <div className="text-sm bg-muted/50 p-3 rounded-lg space-y-1">
                    <p><strong>Nível Sensitivo:</strong> {caseData.asiaLevel}</p>
                    <p><strong>Grau ASIA:</strong> {caseData.asiaGrade}</p>
                  </div>
                ) : (
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">Padrão periférico identificado — classificação ASIA não se aplica. Diagnóstico: {caseData.name}</p>
                )}
                {!completedModules.has(4) && <Button size="sm" className="w-full" onClick={() => completeModule(4)}>Confirmar Classificação</Button>}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <LabReportPanel benchTitle="Dermátomos e Avaliação Sensitiva" isUnlocked={completedModules.has(4)} experimentSummary={expSummary} />
    </div>
  );
}
