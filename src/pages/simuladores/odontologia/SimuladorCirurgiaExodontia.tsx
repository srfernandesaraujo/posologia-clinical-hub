import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, CheckCircle2, Eye, Wrench, AlertTriangle, Pill } from "lucide-react";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";

const CASES = [
  { id: "m1", position: "Mesioangular", winter: "Mesioangulado", pellGregory: { class: "II", pos: "B" }, difficulty: "Moderada", needsOsteotomy: true, needsOdontosection: true },
  { id: "m2", position: "Vertical", winter: "Vertical", pellGregory: { class: "I", pos: "A" }, difficulty: "Baixa", needsOsteotomy: false, needsOdontosection: false },
  { id: "m3", position: "Horizontal", winter: "Horizontal", pellGregory: { class: "III", pos: "C" }, difficulty: "Alta", needsOsteotomy: true, needsOdontosection: true },
  { id: "m4", position: "Distoangular", winter: "Distoangulado", pellGregory: { class: "II", pos: "B" }, difficulty: "Alta", needsOsteotomy: true, needsOdontosection: false },
];

const COMPLICATIONS = [
  { id: "alveolite", title: "Alveolite seca", desc: "Paciente retorna 3 dias após com dor intensa, alvéolo exposto sem coágulo", options: [
    { label: "Irrigação com soro + curativo alveolar (Alveolex)", correct: true },
    { label: "Prescrever antibiótico e dispensar", correct: false },
    { label: "Reabrir o alvéolo cirurgicamente", correct: false },
  ]},
  { id: "parestesia", title: "Parestesia do nervo alveolar inferior", desc: "Dormência persistente no lábio e mento no pós-operatório", options: [
    { label: "Documentar, monitorar, encaminhar se >8 semanas", correct: true },
    { label: "Prescrever corticoide em alta dose", correct: false },
    { label: "Informar que é normal e desaparecerá em horas", correct: false },
  ]},
  { id: "fratura", title: "Fratura de mandíbula", desc: "Estalido durante luxação, mobilidade anormal do ângulo mandibular", options: [
    { label: "Bloqueio maxilomandibular + encaminhamento para CTBMF", correct: true },
    { label: "Continuar a extração e suturar", correct: false },
    { label: "Prescrever anti-inflamatório apenas", correct: false },
  ]},
];

function MolarSVG({ position, showRetalho, showOsteotomy, showOdontosection }: { position: string; showRetalho: boolean; showOsteotomy: boolean; showOdontosection: boolean }) {
  const rotation = position === "Mesioangular" ? -35 : position === "Horizontal" ? -80 : position === "Distoangular" ? 25 : 0;

  return (
    <svg viewBox="0 0 260 200" className="w-full">
      {/* Mandible */}
      <path d="M20 50 L20 160 Q30 180 60 185 Q130 190 200 185 Q230 180 240 160 L240 50"
        fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth={1.5} opacity={0.4} />
      {/* Ramus */}
      <rect x={200} y={30} width={40} height={160} rx={8} fill="hsl(var(--muted))" opacity={0.3} stroke="hsl(var(--border))" strokeWidth={1} />
      <text x={220} y={110} textAnchor="middle" fontSize={7} fill="hsl(var(--muted-foreground))" transform="rotate(-90 220 110)">Ramo mandibular</text>
      {/* Canal */}
      <path d="M30 130 Q80 140 140 138 Q180 135 210 125" fill="none" stroke="#fbbf24" strokeWidth={2.5} opacity={0.5} strokeDasharray="5 3" />
      <text x={100} y={152} fontSize={7} fill="#fbbf24">Canal mandibular</text>
      {/* Adjacent tooth (2nd molar) */}
      <rect x={100} y={48} width={35} height={28} rx={5} fill="#f5f0e8" stroke="hsl(var(--border))" strokeWidth={1} />
      <rect x={106} y={76} width={10} height={50} rx={3} fill="#ddd5c0" stroke="hsl(var(--border))" strokeWidth={0.8} />
      <rect x={120} y={76} width={10} height={45} rx={3} fill="#ddd5c0" stroke="hsl(var(--border))" strokeWidth={0.8} />
      {/* Occlusal plane reference */}
      <line x1={30} y1={48} x2={200} y2={48} stroke="hsl(var(--primary))" strokeWidth={0.8} strokeDasharray="6 4" opacity={0.4} />
      <text x={35} y={44} fontSize={6} fill="hsl(var(--primary))" opacity={0.6}>Plano oclusal</text>
      {/* 3rd molar */}
      <g transform={`rotate(${rotation} 165 80)`}>
        <rect x={148} y={55} width={34} height={50} rx={6} fill="#e8dfd0" stroke="#b8a880" strokeWidth={1.5} />
        {/* Odontosection line */}
        {showOdontosection && (
          <line x1={165} y1={52} x2={165} y2={108} stroke="#ef4444" strokeWidth={2} strokeDasharray="4 2" />
        )}
      </g>
      {/* Osteotomy area */}
      {showOsteotomy && (
        <ellipse cx={170} cy={85} rx={28} ry={20} fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 3">
          <animate attributeName="stroke-opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
        </ellipse>
      )}
      {/* Retalho (flap) */}
      {showRetalho && (
        <path d="M90 48 L90 40 Q130 35 170 40 L170 48" fill="none" stroke="#22c55e" strokeWidth={2} />
      )}
      {/* P&G labels */}
      <g transform="translate(10, 175)">
        <text x={0} y={10} fontSize={7} fill="hsl(var(--foreground))">Winter: {position}</text>
      </g>
    </svg>
  );
}

export default function SimuladorCirurgiaExodontia() {
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedCase, setSelectedCase] = useState("");
  const [userWinter, setUserWinter] = useState("");
  const [userPGClass, setUserPGClass] = useState("");
  const [userPGPos, setUserPGPos] = useState("");
  const [useRetalho, setUseRetalho] = useState(false);
  const [useOsteotomy, setUseOsteotomy] = useState(false);
  const [useOdontosection, setUseOdontosection] = useState(false);
  const [selectedComplication, setSelectedComplication] = useState("");
  const [complicationAnswer, setComplicationAnswer] = useState<string | null>(null);
  const [preOpMeds, setPreOpMeds] = useState<string[]>([]);
  const [postOpMeds, setPostOpMeds] = useState<string[]>([]);

  const caseData = CASES.find(c => c.id === selectedCase);
  const complication = COMPLICATIONS.find(c => c.id === selectedComplication);
  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));

  const classificationCorrect = caseData && userWinter === caseData.winter && userPGClass === caseData.pellGregory.class && userPGPos === caseData.pellGregory.pos;

  const LockedOverlay = ({ module }: { module: number }) => (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-xl">
      <Lock className="h-6 w-6 text-muted-foreground" />
      <p className="text-xs text-muted-foreground font-medium">Complete o módulo {module}</p>
    </div>
  );

  const expSummary: Record<string, string> = caseData ? {
    "Posição": caseData.position,
    "Winter": userWinter || "-",
    "Pell & Gregory": `Classe ${userPGClass || "?"}, Posição ${userPGPos || "?"}`,
    "Osteotomia": useOsteotomy ? "Sim" : "Não",
    "Odontossecção": useOdontosection ? "Sim" : "Não",
    "Dificuldade": caseData.difficulty,
  } : {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cirurgia e Exodontia — Pell & Gregory</h1>
        <p className="text-muted-foreground">Classificação de terceiros molares e planejamento cirúrgico com SVG interativo</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* M1 — Classificação */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" /> 1. Caso Clínico e Classificação
              {completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedCase} onValueChange={setSelectedCase}>
              <SelectTrigger><SelectValue placeholder="Selecione o caso..." /></SelectTrigger>
              <SelectContent>
                {CASES.map(c => <SelectItem key={c.id} value={c.id}>{c.position} — Dificuldade {c.difficulty}</SelectItem>)}
              </SelectContent>
            </Select>
            {caseData && <MolarSVG position={caseData.position} showRetalho={false} showOsteotomy={false} showOdontosection={false} />}
            {caseData && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium">Classificação de Winter:</label>
                  <Select value={userWinter} onValueChange={setUserWinter}>
                    <SelectTrigger><SelectValue placeholder="Posição..." /></SelectTrigger>
                    <SelectContent>
                      {["Mesioangulado", "Vertical", "Horizontal", "Distoangulado"].map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium">P&G Classe:</label>
                    <Select value={userPGClass} onValueChange={setUserPGClass}>
                      <SelectTrigger><SelectValue placeholder="Classe" /></SelectTrigger>
                      <SelectContent>
                        {["I", "II", "III"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium">P&G Posição:</label>
                    <Select value={userPGPos} onValueChange={setUserPGPos}>
                      <SelectTrigger><SelectValue placeholder="Posição" /></SelectTrigger>
                      <SelectContent>
                        {["A", "B", "C"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {userWinter && userPGClass && userPGPos && (
                  <div className={`text-sm p-2 rounded ${classificationCorrect ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive"}`}>
                    {classificationCorrect ? "✓ Classificação correta!" : `✗ Esperado: Winter ${caseData.winter}, Classe ${caseData.pellGregory.class}, Posição ${caseData.pellGregory.pos}`}
                  </div>
                )}
              </div>
            )}
            <Button onClick={() => completeModule(1)} disabled={!userWinter || !userPGClass || !userPGPos || completedModules.has(1)} className="w-full">Confirmar Classificação</Button>
          </CardContent>
        </Card>

        {/* M2 — Planejamento */}
        <Card className="relative">
          {!completedModules.has(1) && <LockedOverlay module={1} />}
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" /> 2. Planejamento Cirúrgico
              {completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {[
                { label: "Retalho mucoperiósteo", state: useRetalho, toggle: () => setUseRetalho(!useRetalho) },
                { label: "Osteotomia", state: useOsteotomy, toggle: () => setUseOsteotomy(!useOsteotomy) },
                { label: "Odontossecção", state: useOdontosection, toggle: () => setUseOdontosection(!useOdontosection) },
              ].map(item => (
                <label key={item.label} className={`flex items-center gap-2 p-2 rounded border cursor-pointer text-sm ${item.state ? "border-primary bg-primary/5" : "border-border"}`}>
                  <input type="checkbox" checked={item.state} onChange={item.toggle} className="rounded" />
                  {item.label}
                </label>
              ))}
            </div>
            {caseData && <MolarSVG position={caseData.position} showRetalho={useRetalho} showOsteotomy={useOsteotomy} showOdontosection={useOdontosection} />}
            <Button onClick={() => completeModule(2)} disabled={completedModules.has(2)} className="w-full">Confirmar Planejamento</Button>
          </CardContent>
        </Card>

        {/* M3 — Complicações */}
        <Card className="relative">
          {!completedModules.has(2) && <LockedOverlay module={2} />}
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" /> 3. Complicações Pós-operatórias
              {completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
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
                <p className="text-sm bg-muted/50 rounded p-3">{complication.desc}</p>
                {complication.options.map((opt, i) => (
                  <label key={i} className={`block p-2 rounded border text-sm cursor-pointer ${complicationAnswer === opt.label ? (opt.correct ? "border-green-500 bg-green-500/10" : "border-destructive bg-destructive/10") : "border-border"}`}>
                    <input type="radio" name="comp" value={opt.label} checked={complicationAnswer === opt.label} onChange={() => setComplicationAnswer(opt.label)} className="sr-only" />
                    {opt.label}
                  </label>
                ))}
              </div>
            )}
            <Button onClick={() => completeModule(3)} disabled={!complicationAnswer || completedModules.has(3)} className="w-full">Confirmar Conduta</Button>
          </CardContent>
        </Card>

        {/* M4 — Protocolo medicamentoso */}
        <Card className="relative">
          {!completedModules.has(3) && <LockedOverlay module={3} />}
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Pill className="h-4 w-4 text-primary" /> 4. Protocolo Medicamentoso
              {completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-2">Pré-operatório:</p>
              {["Dexametasona 8mg VO 1h antes", "Amoxicilina 2g VO 1h antes (profilaxia)", "Ansiolítico (Midazolam 7.5mg)"].map(m => {
                const checked = preOpMeds.includes(m);
                return (
                  <label key={m} className="flex items-center gap-2 p-1.5 text-sm cursor-pointer">
                    <input type="checkbox" checked={checked} onChange={() => setPreOpMeds(prev => checked ? prev.filter(x => x !== m) : [...prev, m])} className="rounded" />
                    {m}
                  </label>
                );
              })}
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Pós-operatório:</p>
              {["Dipirona 500mg 6/6h por 3 dias", "Ibuprofeno 600mg 8/8h por 3 dias", "Amoxicilina 500mg 8/8h por 7 dias", "Digluconato de clorexidina 0,12% bochechos"].map(m => {
                const checked = postOpMeds.includes(m);
                return (
                  <label key={m} className="flex items-center gap-2 p-1.5 text-sm cursor-pointer">
                    <input type="checkbox" checked={checked} onChange={() => setPostOpMeds(prev => checked ? prev.filter(x => x !== m) : [...prev, m])} className="rounded" />
                    {m}
                  </label>
                );
              })}
            </div>
            <Button onClick={() => completeModule(4)} disabled={(preOpMeds.length === 0 && postOpMeds.length === 0) || completedModules.has(4)} className="w-full">Confirmar Protocolo</Button>
          </CardContent>
        </Card>

        <LabReportPanel benchTitle="Cirurgia e Exodontia" isUnlocked={completedModules.has(3)} experimentSummary={expSummary} />
      </div>
    </div>
  );
}
