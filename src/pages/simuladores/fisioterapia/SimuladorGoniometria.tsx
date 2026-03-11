import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, CheckCircle2, RotateCcw, FileText } from "lucide-react";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";

const JOINTS = [
  { id: "shoulder", name: "Ombro", movements: [
    { name: "Flexão", normal: 180, bone1Angle: -90, bone2Start: -90 },
    { name: "Extensão", normal: 60, bone1Angle: -90, bone2Start: -90 },
    { name: "Abdução", normal: 180, bone1Angle: -90, bone2Start: -90 },
    { name: "Rotação Interna", normal: 70, bone1Angle: 0, bone2Start: 0 },
    { name: "Rotação Externa", normal: 90, bone1Angle: 0, bone2Start: 0 },
  ]},
  { id: "knee", name: "Joelho", movements: [
    { name: "Flexão", normal: 140, bone1Angle: 0, bone2Start: 0 },
    { name: "Extensão", normal: 0, bone1Angle: 0, bone2Start: 0 },
  ]},
  { id: "hip", name: "Quadril", movements: [
    { name: "Flexão", normal: 120, bone1Angle: -90, bone2Start: -90 },
    { name: "Extensão", normal: 30, bone1Angle: -90, bone2Start: -90 },
    { name: "Abdução", normal: 45, bone1Angle: -90, bone2Start: -90 },
    { name: "Adução", normal: 30, bone1Angle: -90, bone2Start: -90 },
  ]},
  { id: "elbow", name: "Cotovelo", movements: [
    { name: "Flexão", normal: 150, bone1Angle: 0, bone2Start: 0 },
    { name: "Extensão", normal: 0, bone1Angle: 0, bone2Start: 0 },
    { name: "Pronação", normal: 80, bone1Angle: 0, bone2Start: 0 },
    { name: "Supinação", normal: 80, bone1Angle: 0, bone2Start: 0 },
  ]},
];

const PATIENTS = [
  { id: "p1", name: "Ana Costa", age: 55, injury: "Capsulite adesiva (ombro congelado) — ombro direito", joint: "shoulder", adm: { "Flexão": { active: 95, passive: 110 }, "Extensão": { active: 25, passive: 35 }, "Abdução": { active: 70, passive: 90 }, "Rotação Interna": { active: 20, passive: 30 }, "Rotação Externa": { active: 15, passive: 25 } } },
  { id: "p2", name: "Pedro Alves", age: 32, injury: "Pós-operatório LCA — joelho esquerdo (6 semanas)", joint: "knee", adm: { "Flexão": { active: 90, passive: 105 }, "Extensão": { active: -10, passive: -5 } } },
  { id: "p3", name: "Dona Lúcia", age: 72, injury: "Artrose de quadril bilateral — lado direito mais comprometido", joint: "hip", adm: { "Flexão": { active: 80, passive: 95 }, "Extensão": { active: 10, passive: 15 }, "Abdução": { active: 20, passive: 25 }, "Adução": { active: 15, passive: 20 } } },
];

const TECHNIQUES = [
  { id: "along", name: "Alongamento sustentado", effect: "Ganho de ADM passiva", best: "leve" },
  { id: "mob-grau3", name: "Mobilização articular (Graus III-IV)", effect: "Restauração de jogo articular", best: "moderado" },
  { id: "cinesio", name: "Cinesioterapia ativa-assistida", effect: "Ganho de ADM ativa", best: "leve" },
  { id: "fort", name: "Fortalecimento isométrico", effect: "Estabilização articular", best: "grave" },
  { id: "crioterapia", name: "Crioterapia pós-exercício", effect: "Controle álgico e inflamatório", best: "moderado" },
  { id: "pnf", name: "Facilitação Neuromuscular (PNF)", effect: "Ganho de ADM + controle motor", best: "moderado" },
];

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
      {/* Protractor background */}
      {[0, 30, 60, 90, 120, 150, 180].map(deg => {
        const rad = ((fixedAngle + deg) * Math.PI) / 180;
        return (
          <g key={deg}>
            <line x1={cx} y1={cy} x2={cx + r * Math.cos(rad)} y2={cy + r * Math.sin(rad)} stroke="hsl(var(--muted-foreground)/0.15)" strokeWidth={0.5} />
            <text x={cx + (r + 12) * Math.cos(rad)} y={cy + (r + 12) * Math.sin(rad)} textAnchor="middle" dominantBaseline="middle" fontSize={8} fill="hsl(var(--muted-foreground))">{deg}°</text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--muted-foreground)/0.1)" strokeWidth={1} />

      {/* Normal reference arc */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="hsl(var(--primary)/0.3)" strokeWidth={1} strokeDasharray="4 4" />
      <text x={nx + 5} y={ny} fontSize={8} fill="hsl(var(--primary)/0.5)">Ref {normalAngle}°</text>

      {/* Angle arc */}
      <path d={`M ${arcStart.x} ${arcStart.y} A ${arcR} ${arcR} 0 ${largeArc} 1 ${arcEnd.x} ${arcEnd.y}`} fill="hsl(var(--primary)/0.15)" stroke="hsl(var(--primary))" strokeWidth={1.5} />

      {/* Fixed arm (bone 1) */}
      <line x1={cx} y1={cy} x2={fx} y2={fy} stroke="hsl(var(--foreground))" strokeWidth={3} strokeLinecap="round" />
      <circle cx={fx} cy={fy} r={4} fill="hsl(var(--foreground))" />

      {/* Mobile arm (bone 2) */}
      <line x1={cx} y1={cy} x2={mx} y2={my} stroke="hsl(var(--primary))" strokeWidth={3} strokeLinecap="round" />
      <circle cx={mx} cy={my} r={4} fill="hsl(var(--primary))" />

      {/* Pivot */}
      <circle cx={cx} cy={cy} r={6} fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth={2} />

      {/* Angle label */}
      <text x={cx} y={cy + r + 25} textAnchor="middle" fontSize={16} fontWeight="bold" fill="hsl(var(--foreground))">{angle}°</text>
    </svg>
  );
}

function classifyDeficit(measured: number, normal: number): { label: string; color: string } {
  const pct = (measured / normal) * 100;
  if (pct >= 80) return { label: "Leve", color: "text-green-500" };
  if (pct >= 50) return { label: "Moderado", color: "text-yellow-500" };
  return { label: "Grave", color: "text-red-500" };
}

export default function SimuladorGoniometria() {
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedMovement, setSelectedMovement] = useState("");
  const [userMeasurements, setUserMeasurements] = useState<Record<string, { active: number; passive: number }>>({});
  const [selectedTechniques, setSelectedTechniques] = useState<string[]>([]);

  const patient = PATIENTS.find(p => p.id === selectedPatient);
  const joint = patient ? JOINTS.find(j => j.id === patient.joint) : null;
  const movement = joint?.movements.find(m => m.name === selectedMovement);

  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));

  const handleMeasure = () => {
    if (!patient || !selectedMovement) return;
    const real = patient.adm[selectedMovement as keyof typeof patient.adm];
    if (real) {
      setUserMeasurements(prev => ({ ...prev, [selectedMovement]: { active: real.active, passive: real.passive } }));
    }
  };

  const allMeasured = joint ? joint.movements.every(m => userMeasurements[m.name]) : false;

  const reportSections = patient && joint ? [
    { title: "Paciente", content: `${patient.name}, ${patient.age} anos — ${patient.injury}` },
    { title: "Articulação", content: joint.name },
    { title: "Goniometria", content: joint.movements.map(m => {
      const meas = userMeasurements[m.name];
      if (!meas) return `${m.name}: não avaliado`;
      const deficit = classifyDeficit(meas.active, m.normal);
      return `${m.name}: ADM ativa ${meas.active}° / passiva ${meas.passive}° (ref: ${m.normal}°) → Déficit ${deficit.label}`;
    }).join("\n") },
    { title: "Plano Terapêutico", content: selectedTechniques.map(id => TECHNIQUES.find(t => t.id === id)?.name).join(", ") || "Nenhuma técnica selecionada" },
  ] : [];

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <RotateCcw className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Goniometria Articular Interativa</h1>
          <p className="text-sm text-muted-foreground">Medição de amplitude de movimento (ADM) com goniômetro virtual</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* M1 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Badge variant={completedModules.has(1) ? "default" : "secondary"}>M1</Badge>
              Seleção do Paciente e Articulação
              {completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedPatient} onValueChange={v => { setSelectedPatient(v); setUserMeasurements({}); setSelectedMovement(""); setSelectedTechniques([]); setCompletedModules(new Set()); }}>
              <SelectTrigger><SelectValue placeholder="Selecionar paciente" /></SelectTrigger>
              <SelectContent>
                {PATIENTS.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — {p.age}a</SelectItem>)}
              </SelectContent>
            </Select>
            {patient && (
              <div className="text-sm space-y-1 bg-muted/50 p-3 rounded-lg">
                <p><strong>Lesão:</strong> {patient.injury}</p>
                <p><strong>Articulação:</strong> {joint?.name}</p>
              </div>
            )}
            {patient && !completedModules.has(1) && (
              <Button size="sm" className="w-full" onClick={() => completeModule(1)}>Iniciar Avaliação</Button>
            )}
          </CardContent>
        </Card>

        {/* M2 — Goniometria */}
        <Card className="relative">
          {!completedModules.has(1) && <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg"><Lock className="h-6 w-6 text-muted-foreground" /></div>}
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Badge variant={completedModules.has(2) ? "default" : "secondary"}>M2</Badge>
              Medição Goniométrica
              {completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {joint && (
              <>
                <Select value={selectedMovement} onValueChange={setSelectedMovement}>
                  <SelectTrigger><SelectValue placeholder="Selecionar movimento" /></SelectTrigger>
                  <SelectContent>
                    {joint.movements.map(m => (
                      <SelectItem key={m.name} value={m.name}>
                        {m.name} {userMeasurements[m.name] ? "✓" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {movement && (
                  <GoniometerSVG
                    angle={userMeasurements[selectedMovement]?.active ?? 0}
                    normalAngle={movement.normal}
                  />
                )}
                {selectedMovement && !userMeasurements[selectedMovement] && (
                  <Button size="sm" className="w-full" onClick={handleMeasure}>Medir ADM</Button>
                )}
                {userMeasurements[selectedMovement] && (
                  <div className="text-sm bg-muted/50 p-3 rounded-lg space-y-1">
                    <p><strong>ADM Ativa:</strong> {userMeasurements[selectedMovement].active}°</p>
                    <p><strong>ADM Passiva:</strong> {userMeasurements[selectedMovement].passive}°</p>
                    <p><strong>Referência (AAOS):</strong> {movement?.normal}°</p>
                  </div>
                )}
                {allMeasured && !completedModules.has(2) && (
                  <Button size="sm" className="w-full" onClick={() => completeModule(2)}>Confirmar Medições</Button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* M3 — Comparação */}
        <Card className="relative">
          {!completedModules.has(2) && <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg"><Lock className="h-6 w-6 text-muted-foreground" /></div>}
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Badge variant={completedModules.has(3) ? "default" : "secondary"}>M3</Badge>
              Comparação com Valores Normais
              {completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {completedModules.has(2) && joint && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b"><th className="text-left p-1">Movimento</th><th className="p-1">Ativa</th><th className="p-1">Passiva</th><th className="p-1">Ref</th><th className="p-1">Déficit</th></tr></thead>
                    <tbody>
                      {joint.movements.map(m => {
                        const meas = userMeasurements[m.name];
                        const deficit = meas ? classifyDeficit(meas.active, m.normal) : null;
                        return (
                          <tr key={m.name} className="border-b">
                            <td className="p-1">{m.name}</td>
                            <td className="p-1 text-center">{meas?.active ?? "-"}°</td>
                            <td className="p-1 text-center">{meas?.passive ?? "-"}°</td>
                            <td className="p-1 text-center">{m.normal}°</td>
                            <td className={`p-1 text-center font-semibold ${deficit?.color ?? ""}`}>{deficit?.label ?? "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {!completedModules.has(3) && <Button size="sm" className="w-full" onClick={() => completeModule(3)}>Confirmar Análise</Button>}
              </>
            )}
          </CardContent>
        </Card>

        {/* M4 — Plano */}
        <Card className="relative">
          {!completedModules.has(3) && <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg"><Lock className="h-6 w-6 text-muted-foreground" /></div>}
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Badge variant={completedModules.has(4) ? "default" : "secondary"}>M4</Badge>
              Plano Terapêutico
              {completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {completedModules.has(3) && (
              <>
                <p className="text-sm text-muted-foreground">Selecione as técnicas para o programa terapêutico:</p>
                <div className="space-y-2">
                  {TECHNIQUES.map(t => (
                    <label key={t.id} className="flex items-start gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/50">
                      <input type="checkbox" checked={selectedTechniques.includes(t.id)} onChange={e => {
                        setSelectedTechniques(prev => e.target.checked ? [...prev, t.id] : prev.filter(x => x !== t.id));
                      }} className="mt-1" />
                      <div className="text-sm">
                        <p className="font-medium">{t.name}</p>
                        <p className="text-muted-foreground">{t.effect}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {selectedTechniques.length > 0 && !completedModules.has(4) && (
                  <Button size="sm" className="w-full" onClick={() => completeModule(4)}>Confirmar Plano</Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* M5 — Relatório */}
      {completedModules.has(4) && (
        <LabReportPanel
          title="Relatório de Goniometria Articular"
          sections={reportSections}
        />
      )}
    </div>
  );
}
