import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Lock, CheckCircle2, Syringe, AlertTriangle, Target } from "lucide-react";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";

const PROCEDURES = [
  { id: "exo38", label: "Exodontia do 38", region: "Mandíbula posterior esquerda", nerve: "Alveolar inferior + lingual" },
  { id: "rest16", label: "Restauração do 16", region: "Maxila posterior direita", nerve: "Alveolar superior posterior" },
  { id: "rest11", label: "Restauração do 11", region: "Maxila anterior", nerve: "Alveolar superior anterior (infiltrativa)" },
  { id: "exo46", label: "Exodontia do 46", region: "Mandíbula posterior direita", nerve: "Alveolar inferior + bucal" },
];

const TECHNIQUES = [
  { id: "bloqueio-ai", label: "Bloqueio do nervo alveolar inferior", desc: "Inserção na espinha de Spix, anestesia do lábio inferior e mento ipsilateral", insertionPoint: { x: 70, y: 140 }, nerveTarget: "alveolar-inferior" },
  { id: "infiltrativa", label: "Anestesia infiltrativa", desc: "Deposição junto ao ápice do dente, difusão local", insertionPoint: { x: 160, y: 80 }, nerveTarget: "local" },
  { id: "intraligamentar", label: "Anestesia intraligamentar", desc: "Injeção no espaço do ligamento periodontal sob pressão", insertionPoint: { x: 150, y: 120 }, nerveTarget: "local" },
  { id: "bloqueio-mental", label: "Bloqueio do nervo mentual", desc: "Junto ao forame mentual (região de pré-molares inferiores)", insertionPoint: { x: 120, y: 160 }, nerveTarget: "mentual" },
];

const ANESTHETICS = [
  { id: "lido2-epi", label: "Lidocaína 2% + Epinefrina 1:100.000", mgPerTubete: 36, maxDoseMgKg: 7, vasoconstrictor: true },
  { id: "arti4-epi", label: "Articaína 4% + Epinefrina 1:100.000", mgPerTubete: 72, maxDoseMgKg: 7, vasoconstrictor: true },
  { id: "mepi3", label: "Mepivacaína 3% (sem vaso)", mgPerTubete: 54, maxDoseMgKg: 6.6, vasoconstrictor: false },
  { id: "prilo3-feli", label: "Prilocaína 3% + Felipressina", mgPerTubete: 54, maxDoseMgKg: 6, vasoconstrictor: true },
];

const COMPLICATIONS = [
  { id: "falha", title: "Falha anestésica", desc: "Paciente relata dor durante o procedimento", options: [
    { label: "Repetir a técnica com reposicionamento", correct: true },
    { label: "Trocar para anestesia geral", correct: false },
    { label: "Prosseguir mesmo com dor", correct: false },
  ]},
  { id: "intravascular", title: "Injeção intravascular acidental", desc: "Aspiração positiva com retorno de sangue no tubete", options: [
    { label: "Recuar a agulha, reposicionar e re-aspirar", correct: true },
    { label: "Injetar mesmo assim rapidamente", correct: false },
    { label: "Cancelar o procedimento definitivamente", correct: false },
  ]},
  { id: "parestesia", title: "Parestesia pós-anestésica", desc: "Paciente retorna relatando dormência persistente no lábio após 48h", options: [
    { label: "Orientar, monitorar e encaminhar se persistir >8 semanas", correct: true },
    { label: "Prescrever corticoides imediatamente", correct: false },
    { label: "Considerar normal e dispensar o paciente", correct: false },
  ]},
];

function JawSVG({ selectedTechnique }: { selectedTechnique: string }) {
  const tech = TECHNIQUES.find(t => t.id === selectedTechnique);
  return (
    <svg viewBox="0 0 260 220" className="w-full max-w-[280px] mx-auto">
      {/* Mandible body */}
      <path d="M30 40 Q40 20 80 15 Q130 5 180 15 Q220 20 230 40 Q240 80 235 120 Q225 160 200 185 Q170 200 130 205 Q90 200 60 185 Q35 160 25 120 Q20 80 30 40 Z"
        fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth={1.5} opacity={0.4} />
      {/* Teeth row upper */}
      {[60,80,100,120,140,160,180,200].map((x, i) => (
        <rect key={`u${i}`} x={x - 8} y={25} width={16} height={20} rx={3} fill="#f5f0e8" stroke="hsl(var(--border))" strokeWidth={0.8} />
      ))}
      {/* Teeth row lower */}
      {[60,80,100,120,140,160,180,200].map((x, i) => (
        <rect key={`l${i}`} x={x - 8} y={50} width={16} height={20} rx={3} fill="#f5f0e8" stroke="hsl(var(--border))" strokeWidth={0.8} />
      ))}
      {/* Nerves */}
      <path d="M40 100 Q60 110 80 115 Q120 125 160 120 Q200 115 220 100" fill="none" stroke="#fbbf24" strokeWidth={2} strokeDasharray="5 3">
        <title>Nervo alveolar inferior</title>
      </path>
      <circle cx={120} cy={150} r={4} fill="#fbbf24" stroke="#f59e0b" strokeWidth={1}>
        <title>Forame mentual</title>
      </circle>
      <path d="M40 85 Q80 75 130 70 Q180 75 220 85" fill="none" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="4 3">
        <title>Nervo lingual</title>
      </path>
      {/* Injection point */}
      {tech && (
        <g>
          <line x1={tech.insertionPoint.x} y1={tech.insertionPoint.y - 30} x2={tech.insertionPoint.x} y2={tech.insertionPoint.y} stroke="#ef4444" strokeWidth={2} markerEnd="url(#arrowhead)" />
          <circle cx={tech.insertionPoint.x} cy={tech.insertionPoint.y} r={5} fill="#ef4444" opacity={0.5}>
            <animate attributeName="r" values="5;8;5" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <text x={tech.insertionPoint.x + 10} y={tech.insertionPoint.y - 20} fontSize={7} fill="#ef4444" fontWeight="bold">Inserção</text>
        </g>
      )}
      <defs>
        <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#ef4444" />
        </marker>
      </defs>
      {/* Legend */}
      <g transform="translate(10, 200)">
        <line x1={0} y1={5} x2={15} y2={5} stroke="#fbbf24" strokeWidth={2} /><text x={20} y={8} fontSize={7} fill="hsl(var(--foreground))">N. Alv. Inf.</text>
        <line x1={80} y1={5} x2={95} y2={5} stroke="#a78bfa" strokeWidth={2} /><text x={100} y={8} fontSize={7} fill="hsl(var(--foreground))">N. Lingual</text>
        <circle cx={165} cy={5} r={3} fill="#fbbf24" /><text x={172} y={8} fontSize={7} fill="hsl(var(--foreground))">For. Mentual</text>
      </g>
    </svg>
  );
}

export default function SimuladorAnestesiologia() {
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedProcedure, setSelectedProcedure] = useState("");
  const [selectedTechnique, setSelectedTechnique] = useState("");
  const [selectedAnesthetic, setSelectedAnesthetic] = useState("");
  const [patientWeight, setPatientWeight] = useState([70]);
  const [selectedComplication, setSelectedComplication] = useState("");
  const [complicationAnswer, setComplicationAnswer] = useState<string | null>(null);

  const procedure = PROCEDURES.find(p => p.id === selectedProcedure);
  const technique = TECHNIQUES.find(t => t.id === selectedTechnique);
  const anesthetic = ANESTHETICS.find(a => a.id === selectedAnesthetic);
  const complication = COMPLICATIONS.find(c => c.id === selectedComplication);

  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));

  const maxDoseMg = anesthetic ? anesthetic.maxDoseMgKg * patientWeight[0] : 0;
  const maxTubetes = anesthetic ? Math.floor(maxDoseMg / anesthetic.mgPerTubete) : 0;

  const LockedOverlay = ({ module }: { module: number }) => (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-xl">
      <Lock className="h-6 w-6 text-muted-foreground" />
      <p className="text-xs text-muted-foreground font-medium">Complete o módulo {module}</p>
    </div>
  );

  const expSummary: Record<string, string> = {
    "Procedimento": procedure?.label || "-",
    "Técnica": technique?.label || "-",
    "Anestésico": anesthetic?.label || "-",
    "Peso": `${patientWeight[0]} kg`,
    "Dose máx.": `${maxDoseMg.toFixed(0)} mg (${maxTubetes} tubetes)`,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Anestesiologia Odontológica</h1>
        <p className="text-muted-foreground">Técnicas de bloqueio anestésico com anatomia nervosa SVG e cálculo de dose</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* M1 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> 1. Procedimento e Região
              {completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedProcedure} onValueChange={setSelectedProcedure}>
              <SelectTrigger><SelectValue placeholder="Selecione o procedimento..." /></SelectTrigger>
              <SelectContent>
                {PROCEDURES.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {procedure && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <p><strong>Região:</strong> {procedure.region}</p>
                <p><strong>Nervo-alvo:</strong> {procedure.nerve}</p>
              </div>
            )}
            <Button onClick={() => completeModule(1)} disabled={!procedure || completedModules.has(1)} className="w-full">Confirmar Procedimento</Button>
          </CardContent>
        </Card>

        {/* M2 — Técnica */}
        <Card className="relative">
          {!completedModules.has(1) && <LockedOverlay module={1} />}
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Syringe className="h-4 w-4 text-primary" /> 2. Técnica Anestésica
              {completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              {TECHNIQUES.map(t => (
                <label key={t.id} className={`block p-2 rounded border text-sm cursor-pointer ${selectedTechnique === t.id ? "border-primary bg-primary/5" : "border-border"}`}>
                  <input type="radio" name="tech" value={t.id} checked={selectedTechnique === t.id} onChange={() => setSelectedTechnique(t.id)} className="sr-only" />
                  <p className="font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </label>
              ))}
            </div>
            <JawSVG selectedTechnique={selectedTechnique} />
            <Button onClick={() => completeModule(2)} disabled={!selectedTechnique || completedModules.has(2)} className="w-full">Confirmar Técnica</Button>
          </CardContent>
        </Card>

        {/* M3 — Cálculo de dose */}
        <Card className="relative">
          {!completedModules.has(2) && <LockedOverlay module={2} />}
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Syringe className="h-4 w-4 text-primary" /> 3. Cálculo de Dose
              {completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium">Peso do paciente: {patientWeight[0]} kg</label>
              <Slider value={patientWeight} onValueChange={setPatientWeight} min={20} max={120} step={1} className="mt-2" />
            </div>
            <Select value={selectedAnesthetic} onValueChange={setSelectedAnesthetic}>
              <SelectTrigger><SelectValue placeholder="Selecione o anestésico..." /></SelectTrigger>
              <SelectContent>
                {ANESTHETICS.map(a => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {anesthetic && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <p><strong>mg/tubete:</strong> {anesthetic.mgPerTubete}</p>
                <p><strong>Dose máx.:</strong> {anesthetic.maxDoseMgKg} mg/kg = <span className="font-bold">{maxDoseMg.toFixed(0)} mg</span></p>
                <p><strong>Tubetes máx.:</strong> <span className="font-bold text-lg">{maxTubetes}</span></p>
                {!anesthetic.vasoconstrictor && <Badge variant="outline" className="text-[10px]">Sem vasoconstritor — indicado para cardiopatas</Badge>}
              </div>
            )}
            <Button onClick={() => completeModule(3)} disabled={!anesthetic || completedModules.has(3)} className="w-full">Calcular e Confirmar</Button>
          </CardContent>
        </Card>

        {/* M4 — Complicações */}
        <Card className="relative">
          {!completedModules.has(3) && <LockedOverlay module={3} />}
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" /> 4. Complicações
              {completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedComplication} onValueChange={(v) => { setSelectedComplication(v); setComplicationAnswer(null); }}>
              <SelectTrigger><SelectValue placeholder="Selecione o cenário..." /></SelectTrigger>
              <SelectContent>
                {COMPLICATIONS.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
            {complication && (
              <div className="space-y-2">
                <p className="text-sm bg-muted/50 rounded-lg p-3">{complication.desc}</p>
                {complication.options.map((opt, i) => (
                  <label key={i} className={`block p-2 rounded border text-sm cursor-pointer ${complicationAnswer === opt.label ? (opt.correct ? "border-green-500 bg-green-500/10" : "border-destructive bg-destructive/10") : "border-border hover:bg-muted/30"}`}>
                    <input type="radio" name="complication" value={opt.label} checked={complicationAnswer === opt.label} onChange={() => setComplicationAnswer(opt.label)} className="sr-only" />
                    {opt.label}
                  </label>
                ))}
              </div>
            )}
            <Button onClick={() => completeModule(4)} disabled={!complicationAnswer || completedModules.has(4)} className="w-full">Confirmar Conduta</Button>
          </CardContent>
        </Card>

        <LabReportPanel benchTitle="Anestesiologia Odontológica" isUnlocked={completedModules.has(3)} experimentSummary={expSummary} />
      </div>
    </div>
  );
}
