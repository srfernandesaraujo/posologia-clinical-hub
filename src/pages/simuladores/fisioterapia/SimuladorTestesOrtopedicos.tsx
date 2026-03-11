import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, CheckCircle2, Bone } from "lucide-react";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";

const JOINTS_DATA = [
  {
    id: "knee", name: "Joelho", complaint: "Instabilidade após trauma em pivô",
    tests: [
      { id: "lachman", name: "Teste de Lachman", target: "LCA", positive: true, animation: "Translação anterior da tíbia com joelho a 20-30° de flexão" },
      { id: "gaveta-ant", name: "Gaveta Anterior", target: "LCA", positive: true, animation: "Deslizamento anterior da tíbia a 90° de flexão" },
      { id: "pivot-shift", name: "Pivot Shift", target: "LCA", positive: true, animation: "Subluxação rotatória com extensão + valgo + rotação interna" },
      { id: "gaveta-post", name: "Gaveta Posterior", target: "LCP", positive: false, animation: "Deslizamento posterior da tíbia" },
      { id: "mcmurray", name: "McMurray", target: "Menisco", positive: false, animation: "Rotação + extensão do joelho" },
      { id: "apley", name: "Compressão de Apley", target: "Menisco", positive: false, animation: "Compressão + rotação em decúbito ventral" },
    ],
    diagnosis: "Lesão de LCA — Lachman, Gaveta Anterior e Pivot Shift positivos",
    rehabPhases: ["Fase aguda (0-2 sem): crioterapia, isométricos, ADM", "Fase subaguda (2-8 sem): CCA/CCF progressivo, propriocepção", "Retorno funcional (8-16 sem): treino pliométrico, agilidade"]
  },
  {
    id: "shoulder", name: "Ombro", complaint: "Dor e sensação de instabilidade anterior",
    tests: [
      { id: "apprehension", name: "Teste de Apreensão", target: "Instab. anterior", positive: true, animation: "Abdução 90° + rotação externa com pressão anterior" },
      { id: "relocation", name: "Relocation Test", target: "Instab. anterior", positive: true, animation: "Pressão posterior na cabeça umeral — alívio da apreensão" },
      { id: "neer", name: "Neer (Impingement)", target: "Supra-espinhal", positive: false, animation: "Flexão passiva do ombro com escápula estabilizada" },
      { id: "hawkins", name: "Hawkins-Kennedy", target: "Supra-espinhal", positive: false, animation: "Flexão 90° + rotação interna forçada" },
      { id: "jobe", name: "Jobe (Empty Can)", target: "Supra-espinhal", positive: false, animation: "Abdução 90° em rotação interna contra resistência" },
      { id: "speed", name: "Speed", target: "Bíceps", positive: false, animation: "Flexão do ombro contra resistência com cotovelo estendido e supinado" },
    ],
    diagnosis: "Instabilidade glenoumeral anterior — Apreensão e Relocation positivos",
    rehabPhases: ["Fase 1 (0-4 sem): estabilizadores de escápula, isométricos", "Fase 2 (4-8 sem): fortalecimento de manguito rotador", "Fase 3 (8-12 sem): treino funcional e esportivo"]
  },
];

function TestSVG({ jointId, activeTest }: { jointId: string; activeTest: string | null }) {
  const isKnee = jointId === "knee";
  return (
    <svg viewBox="0 0 120 100" className="w-full max-w-[280px] mx-auto">
      <rect x={0} y={0} width={120} height={95} fill="hsl(var(--muted)/0.2)" rx={4} />
      {isKnee ? (
        <>
          {/* Femur */}
          <rect x={50} y={5} width={12} height={35} rx={3} fill="hsl(var(--foreground)/0.15)" stroke="hsl(var(--border))" strokeWidth={0.5} />
          {/* Joint */}
          <ellipse cx={56} cy={42} rx={14} ry={8} fill="hsl(var(--foreground)/0.08)" stroke="hsl(var(--border))" strokeWidth={0.5} />
          {/* Tibia */}
          <rect x={50} y={50} width={12} height={40} rx={3} fill="hsl(var(--foreground)/0.15)" stroke="hsl(var(--border))" strokeWidth={0.5} />
          {/* LCA */}
          <line x1={53} y1={38} x2={59} y2={52} stroke="#ef4444" strokeWidth={1} opacity={0.6} />
          <text x={65} y={46} fontSize={3.5} fill="hsl(var(--muted-foreground))">LCA</text>
          {/* LCP */}
          <line x1={59} y1={38} x2={53} y2={52} stroke="#3b82f6" strokeWidth={1} opacity={0.6} />
          {/* Animation indicator */}
          {activeTest && (
            <g>
              <animateTransform attributeName="transform" type="translate" values="0,0;0,-3;0,0" dur="1s" repeatCount="indefinite" />
              <rect x={48} y={50} width={16} height={40} rx={3} fill="hsl(var(--primary)/0.1)" stroke="hsl(var(--primary))" strokeWidth={0.5} strokeDasharray="2 1" />
            </g>
          )}
        </>
      ) : (
        <>
          {/* Scapula */}
          <path d="M 40 20 L 55 15 L 60 35 L 45 40 Z" fill="hsl(var(--foreground)/0.1)" stroke="hsl(var(--border))" strokeWidth={0.5} />
          {/* Humerus */}
          <rect x={58} y={25} width={8} height={45} rx={3} fill="hsl(var(--foreground)/0.15)" stroke="hsl(var(--border))" strokeWidth={0.5} transform="rotate(15 62 47)" />
          {/* Glenoid */}
          <ellipse cx={58} cy={28} rx={6} ry={8} fill="hsl(var(--foreground)/0.08)" stroke="hsl(var(--border))" strokeWidth={0.5} />
          {/* Rotator cuff */}
          <path d="M 48 22 Q 58 18, 65 25" fill="none" stroke="#f59e0b" strokeWidth={0.8} opacity={0.6} />
          <text x={48} y={18} fontSize={3} fill="hsl(var(--muted-foreground))">Manguito</text>
          {activeTest && (
            <g>
              <animateTransform attributeName="transform" type="rotate" values="0 58 28;10 58 28;0 58 28" dur="1.5s" repeatCount="indefinite" />
              <circle cx={58} cy={28} r={10} fill="none" stroke="hsl(var(--primary))" strokeWidth={0.5} strokeDasharray="2 1" />
            </g>
          )}
        </>
      )}
      {activeTest && (
        <text x={60} y={92} textAnchor="middle" fontSize={3.5} fill="hsl(var(--primary))">Manobra em execução...</text>
      )}
    </svg>
  );
}

export default function SimuladorTestesOrtopedicos() {
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedJoint, setSelectedJoint] = useState("");
  const [testedResults, setTestedResults] = useState<Record<string, boolean | null>>({});
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const [selectedPhases, setSelectedPhases] = useState<string[]>([]);

  const jointData = JOINTS_DATA.find(j => j.id === selectedJoint);
  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));
  const allTested = jointData ? jointData.tests.every(t => testedResults[t.id] !== null && testedResults[t.id] !== undefined) : false;

  const handleRunTest = (testId: string) => {
    setActiveTest(testId);
    const test = jointData?.tests.find(t => t.id === testId);
    setTimeout(() => {
      setTestedResults(prev => ({ ...prev, [testId]: test?.positive ?? false }));
      setActiveTest(null);
    }, 1500);
  };

  const expSummary = jointData ? {
    "Articulação": `${jointData.name} — ${jointData.complaint}`,
    "Testes": jointData.tests.map(t => `${t.name}: ${testedResults[t.id] ? "+" : "-"}`).join("; "),
    "Diagnóstico": jointData.diagnosis,
    "Reabilitação": selectedPhases.join("; ") || "Nenhuma",
  } : undefined;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Bone className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Testes Ortopédicos Especiais</h1>
          <p className="text-sm text-muted-foreground">Execução e interpretação de testes provocativos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* M1 */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(1) ? "default" : "secondary"}>M1</Badge>Seleção da Articulação{completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedJoint} onValueChange={v => { setSelectedJoint(v); setTestedResults({}); setActiveTest(null); setSelectedPhases([]); setCompletedModules(new Set()); }}>
              <SelectTrigger><SelectValue placeholder="Selecionar articulação" /></SelectTrigger>
              <SelectContent>{JOINTS_DATA.map(j => <SelectItem key={j.id} value={j.id}>{j.name} — {j.complaint}</SelectItem>)}</SelectContent>
            </Select>
            {jointData && !completedModules.has(1) && <Button size="sm" className="w-full" onClick={() => completeModule(1)}>Iniciar Bateria</Button>}
          </CardContent>
        </Card>

        {/* M2 */}
        <Card className="relative">
          {!completedModules.has(1) && <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg"><Lock className="h-6 w-6 text-muted-foreground" /></div>}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(2) ? "default" : "secondary"}>M2</Badge>Bateria de Testes{completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {jointData && (
              <>
                <TestSVG jointId={jointData.id} activeTest={activeTest} />
                <div className="space-y-1">
                  {jointData.tests.map(t => {
                    const result = testedResults[t.id];
                    return (
                      <div key={t.id} className="flex items-center justify-between p-2 rounded border text-sm">
                        <div>
                          <span className="font-medium">{t.name}</span>
                          <span className="text-muted-foreground text-xs ml-2">({t.target})</span>
                        </div>
                        {result !== null && result !== undefined ? (
                          <Badge variant={result ? "destructive" : "secondary"}>{result ? "POSITIVO" : "Negativo"}</Badge>
                        ) : (
                          <Button size="sm" variant="outline" disabled={activeTest !== null} onClick={() => handleRunTest(t.id)}>
                            {activeTest === t.id ? "Testando..." : "Testar"}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {allTested && !completedModules.has(2) && <Button size="sm" className="w-full" onClick={() => completeModule(2)}>Confirmar Resultados</Button>}
              </>
            )}
          </CardContent>
        </Card>

        {/* M3 */}
        <Card className="relative">
          {!completedModules.has(2) && <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg"><Lock className="h-6 w-6 text-muted-foreground" /></div>}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(3) ? "default" : "secondary"}>M3</Badge>Diagnóstico Diferencial{completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {completedModules.has(2) && jointData && (
              <>
                <div className="bg-muted/50 p-3 rounded-lg text-sm">
                  <p className="font-medium mb-1">Testes positivos:</p>
                  {jointData.tests.filter(t => t.positive).map(t => (
                    <p key={t.id} className="text-red-500">• {t.name} → {t.target}</p>
                  ))}
                  <p className="mt-2 font-medium">Conclusão:</p>
                  <p className="text-primary">{jointData.diagnosis}</p>
                </div>
                {!completedModules.has(3) && <Button size="sm" className="w-full" onClick={() => completeModule(3)}>Confirmar Diagnóstico</Button>}
              </>
            )}
          </CardContent>
        </Card>

        {/* M4 */}
        <Card className="relative">
          {!completedModules.has(3) && <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg"><Lock className="h-6 w-6 text-muted-foreground" /></div>}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(4) ? "default" : "secondary"}>M4</Badge>Programa de Reabilitação{completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {completedModules.has(3) && jointData && (
              <>
                {jointData.rehabPhases.map((p, i) => (
                  <label key={i} className="flex items-start gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/50">
                    <input type="checkbox" checked={selectedPhases.includes(p)} onChange={e => setSelectedPhases(prev => e.target.checked ? [...prev, p] : prev.filter(x => x !== p))} className="mt-1" />
                    <span className="text-sm">{p}</span>
                  </label>
                ))}
                {selectedPhases.length > 0 && !completedModules.has(4) && <Button size="sm" className="w-full" onClick={() => completeModule(4)}>Confirmar Programa</Button>}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <LabReportPanel benchTitle="Testes Ortopédicos Especiais" isUnlocked={completedModules.has(4)} experimentSummary={expSummary} />
    </div>
  );
}
