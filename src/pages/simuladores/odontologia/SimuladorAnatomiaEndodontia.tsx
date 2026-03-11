import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, CheckCircle2, Crosshair, Wrench, Shield } from "lucide-react";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";

const CASES = [
  { id: "c1", tooth: "Molar inferior (46)", lesion: "Cárie profunda", pulpStatus: "Pulpite reversível", tests: { cold: "Dor aguda que cessa em 5s", heat: "Sem dor", electric: "Resposta normal (40µA)", percussion: "Sem dor" } },
  { id: "c2", tooth: "Incisivo central (11)", lesion: "Trauma (fratura coronária)", pulpStatus: "Exposição pulpar", tests: { cold: "Dor intensa que persiste >30s", heat: "Dor intensa", electric: "Resposta exagerada (15µA)", percussion: "Dor leve" } },
  { id: "c3", tooth: "Pré-molar superior (24)", lesion: "Necrose pulpar", pulpStatus: "Necrose", tests: { cold: "Sem resposta", heat: "Sem resposta", electric: "Sem resposta (>80µA)", percussion: "Dor à percussão vertical" } },
];

const THERAPIES = [
  { id: "cap-indireto", label: "Capeamento pulpar indireto", desc: "Remoção parcial de cárie, proteção com Ca(OH)₂", indication: "Pulpite reversível sem exposição", prognosis: 90 },
  { id: "cap-direto", label: "Capeamento pulpar direto", desc: "Proteção direta da polpa exposta com MTA", indication: "Exposição pulpar acidental, polpa vital", prognosis: 80 },
  { id: "pulpotomia", label: "Pulpotomia", desc: "Remoção da polpa coronária, manutenção da radicular", indication: "Dentes com rizogênese incompleta", prognosis: 75 },
  { id: "endodontia", label: "Tratamento endodôntico completo", desc: "Pulpectomia, instrumentação e obturação do canal", indication: "Pulpite irreversível ou necrose", prognosis: 95 },
];

const MATERIALS = [
  { id: "guta", label: "Guta-percha + cimento AH Plus", type: "Obturação", desc: "Padrão-ouro para obturação de canais" },
  { id: "mta", label: "MTA (Agregado Trióxido Mineral)", type: "Reparo", desc: "Biocompatível, selamento hermético, induz mineralização" },
  { id: "resina", label: "Resina composta", type: "Restauração coronária", desc: "Restauração estética com técnica incremental" },
  { id: "ionômero", label: "Cimento de ionômero de vidro", type: "Base/forro", desc: "Liberação de flúor, adesão química ao dente" },
];

function ToothCrossSectionSVG({ lesion, pulpStatus, therapy, material }: { lesion: string; pulpStatus: string; therapy: string; material: string }) {
  const isNecrotic = pulpStatus === "Necrose";
  const hasEndodontics = therapy === "endodontia";
  const hasCapping = therapy.startsWith("cap");
  const pulpColor = isNecrotic ? "#6b7280" : "#ef4444";
  const canalFill = hasEndodontics ? "#f59e0b" : pulpColor;

  return (
    <svg viewBox="0 0 200 320" className="w-full max-w-[200px] mx-auto">
      {/* Crown outline */}
      <path d="M60 10 Q65 0 80 5 Q100 -2 120 5 Q135 0 140 10 Q145 30 140 70 Q130 90 120 100 L80 100 Q70 90 60 70 Q55 30 60 10 Z" fill="#f5f0e8" stroke="hsl(var(--border))" strokeWidth={1.5} />
      {/* Enamel highlight */}
      <path d="M65 15 Q70 5 85 10 Q100 3 115 10 Q130 5 135 15 Q138 35 135 65 Q125 80 118 90 L82 90 Q75 80 65 65 Q62 35 65 15 Z" fill="#ebe5d9" stroke="none" />
      {/* Caries lesion */}
      {lesion.includes("Cárie") && <ellipse cx={110} cy={30} rx={18} ry={12} fill="#8b4513" opacity={0.7}><title>Lesão de cárie</title></ellipse>}
      {/* Trauma crack */}
      {lesion.includes("Trauma") && <line x1={100} y1={5} x2={105} y2={60} stroke="#ef4444" strokeWidth={2} strokeDasharray="4 2" />}
      {/* Dentin */}
      <path d="M72 50 Q75 40 90 45 Q100 38 110 45 Q125 40 128 50 Q130 65 128 85 Q120 95 115 100 L85 100 Q80 95 72 85 Q70 65 72 50 Z" fill="#d4c5a0" stroke="hsl(var(--border))" strokeWidth={0.8} />
      {/* Pulp chamber */}
      <path d="M85 60 Q90 50 100 52 Q110 50 115 60 Q118 75 115 95 L85 95 Q82 75 85 60 Z" fill={pulpColor} opacity={isNecrotic ? 0.5 : 0.8} stroke="hsl(var(--border))" strokeWidth={0.5}>
        <title>Câmara pulpar — {pulpStatus}</title>
      </path>
      {/* Root */}
      <path d="M82 100 L78 240 Q79 260 85 270 Q90 275 95 270 Q100 260 100 240 Z" fill="#f5f0e8" stroke="hsl(var(--border))" strokeWidth={1.2} />
      <path d="M118 100 L122 240 Q121 260 115 270 Q110 275 105 270 Q100 260 100 240 Z" fill="#f5f0e8" stroke="hsl(var(--border))" strokeWidth={1.2} />
      {/* Root canals */}
      <line x1={88} y1={100} x2={90} y2={260} stroke={canalFill} strokeWidth={3} strokeLinecap="round" />
      <line x1={112} y1={100} x2={110} y2={260} stroke={canalFill} strokeWidth={3} strokeLinecap="round" />
      {/* Canal fill if endodontics */}
      {hasEndodontics && <>
        <line x1={88} y1={100} x2={90} y2={260} stroke="#f59e0b" strokeWidth={4} strokeLinecap="round" opacity={0.7} />
        <line x1={112} y1={100} x2={110} y2={260} stroke="#f59e0b" strokeWidth={4} strokeLinecap="round" opacity={0.7} />
        <text x={100} y={185} textAnchor="middle" fontSize={8} fill="#f59e0b" fontWeight="bold">GP</text>
      </>}
      {/* Capping indicator */}
      {hasCapping && <rect x={83} y={55} width={34} height={6} rx={2} fill="#22c55e" opacity={0.7}><title>Proteção pulpar</title></rect>}
      {/* Periodontal ligament */}
      <path d="M75 105 L72 240 Q73 265 82 275" fill="none" stroke="#f472b6" strokeWidth={1.5} strokeDasharray="3 3" />
      <path d="M125 105 L128 240 Q127 265 118 275" fill="none" stroke="#f472b6" strokeWidth={1.5} strokeDasharray="3 3" />
      {/* Bone */}
      <rect x={40} y={105} width={30} height={180} rx={4} fill="#d1d5db" opacity={0.4} />
      <rect x={130} y={105} width={30} height={180} rx={4} fill="#d1d5db" opacity={0.4} />
      {/* Legend */}
      <g transform="translate(0, 290)">
        <rect x={10} y={0} width={8} height={8} fill="#f5f0e8" stroke="hsl(var(--border))" strokeWidth={0.5} /><text x={22} y={7} fontSize={7} fill="hsl(var(--foreground))">Esmalte</text>
        <rect x={65} y={0} width={8} height={8} fill="#d4c5a0" /><text x={77} y={7} fontSize={7} fill="hsl(var(--foreground))">Dentina</text>
        <rect x={120} y={0} width={8} height={8} fill={pulpColor} opacity={0.8} /><text x={132} y={7} fontSize={7} fill="hsl(var(--foreground))">Polpa</text>
      </g>
    </svg>
  );
}

export default function SimuladorAnatomiaEndodontia() {
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedCase, setSelectedCase] = useState("");
  const [performedTests, setPerformedTests] = useState<Set<string>>(new Set());
  const [selectedTherapy, setSelectedTherapy] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState("");

  const caseData = CASES.find(c => c.id === selectedCase);
  const therapy = THERAPIES.find(t => t.id === selectedTherapy);
  const material = MATERIALS.find(m => m.id === selectedMaterial);

  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));

  const LockedOverlay = ({ module }: { module: number }) => (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-xl">
      <Lock className="h-6 w-6 text-muted-foreground" />
      <p className="text-xs text-muted-foreground font-medium">Complete o módulo {module}</p>
    </div>
  );

  const expSummary: Record<string, string> = caseData ? {
    "Dente": caseData.tooth,
    "Lesão": caseData.lesion,
    "Status pulpar": caseData.pulpStatus,
    "Terapia": therapy?.label || "-",
    "Material": material?.label || "-",
    "Prognóstico": therapy ? `${therapy.prognosis}%` : "-",
  } : {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Anatomia Dental em Corte (Endodontia)</h1>
        <p className="text-muted-foreground">Anatomia interna do dente e tomada de decisão endodôntica com SVG interativo</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* M1 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Crosshair className="h-4 w-4 text-primary" /> 1. Seleção do Dente e Lesão
              {completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedCase} onValueChange={setSelectedCase}>
              <SelectTrigger><SelectValue placeholder="Selecione o caso clínico..." /></SelectTrigger>
              <SelectContent>
                {CASES.map(c => <SelectItem key={c.id} value={c.id}>{c.tooth} — {c.lesion}</SelectItem>)}
              </SelectContent>
            </Select>
            {caseData && (
              <div className="bg-muted/50 rounded-lg p-3">
                <ToothCrossSectionSVG lesion={caseData.lesion} pulpStatus={caseData.pulpStatus} therapy="" material="" />
              </div>
            )}
            <Button onClick={() => completeModule(1)} disabled={!caseData || completedModules.has(1)} className="w-full">
              Confirmar Caso
            </Button>
          </CardContent>
        </Card>

        {/* M2 — Testes de vitalidade */}
        <Card className="relative">
          {!completedModules.has(1) && <LockedOverlay module={1} />}
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Crosshair className="h-4 w-4 text-primary" /> 2. Testes de Vitalidade
              {completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {caseData && (
              <div className="space-y-2">
                {(["cold", "heat", "electric", "percussion"] as const).map(test => {
                  const labels: Record<string, string> = { cold: "Teste ao frio", heat: "Teste ao calor", electric: "Teste elétrico", percussion: "Percussão vertical" };
                  const done = performedTests.has(test);
                  return (
                    <div key={test} className="bg-muted/30 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{labels[test]}</span>
                        <Button size="sm" variant={done ? "outline" : "default"} onClick={() => setPerformedTests(prev => new Set(prev).add(test))}>
                          {done ? "Realizado" : "Executar"}
                        </Button>
                      </div>
                      {done && <p className="text-sm text-muted-foreground mt-1">{caseData.tests[test]}</p>}
                    </div>
                  );
                })}
              </div>
            )}
            <Button onClick={() => completeModule(2)} disabled={performedTests.size < 2 || completedModules.has(2)} className="w-full">
              Concluir Testes
            </Button>
          </CardContent>
        </Card>

        {/* M3 — Decisão terapêutica */}
        <Card className="relative">
          {!completedModules.has(2) && <LockedOverlay module={2} />}
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" /> 3. Decisão Terapêutica
              {completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {THERAPIES.map(t => (
                <label key={t.id} className={`block p-3 rounded-lg border cursor-pointer transition-colors ${selectedTherapy === t.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"}`}>
                  <input type="radio" name="therapy" value={t.id} checked={selectedTherapy === t.id} onChange={() => setSelectedTherapy(t.id)} className="sr-only" />
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                  <Badge variant="outline" className="text-[10px] mt-1">{t.indication}</Badge>
                </label>
              ))}
            </div>
            {caseData && selectedTherapy && (
              <div className="bg-muted/50 rounded-lg p-3">
                <ToothCrossSectionSVG lesion={caseData.lesion} pulpStatus={caseData.pulpStatus} therapy={selectedTherapy} material="" />
              </div>
            )}
            <Button onClick={() => completeModule(3)} disabled={!selectedTherapy || completedModules.has(3)} className="w-full">
              Confirmar Terapia
            </Button>
          </CardContent>
        </Card>

        {/* M4 — Material e prognóstico */}
        <Card className="relative">
          {!completedModules.has(3) && <LockedOverlay module={3} />}
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> 4. Obturação e Restauração
              {completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
              <SelectTrigger><SelectValue placeholder="Selecione o material..." /></SelectTrigger>
              <SelectContent>
                {MATERIALS.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {material && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <p><strong>Tipo:</strong> {material.type}</p>
                <p>{material.desc}</p>
              </div>
            )}
            {therapy && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-sm">
                <p className="font-medium text-green-700 dark:text-green-400">Prognóstico: {therapy.prognosis}% de sucesso</p>
              </div>
            )}
            {caseData && selectedTherapy && (
              <div className="bg-muted/50 rounded-lg p-3">
                <ToothCrossSectionSVG lesion={caseData.lesion} pulpStatus={caseData.pulpStatus} therapy={selectedTherapy} material={selectedMaterial} />
              </div>
            )}
            <Button onClick={() => completeModule(4)} disabled={!selectedMaterial || completedModules.has(4)} className="w-full">
              Confirmar Restauração
            </Button>
          </CardContent>
        </Card>

        <LabReportPanel benchTitle="Anatomia Dental — Endodontia" isUnlocked={completedModules.has(3)} experimentSummary={expSummary} />
      </div>
    </div>
  );
}
