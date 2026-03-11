import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, CheckCircle2, ClipboardList, Eye, Stethoscope, FileText } from "lucide-react";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";

/* ─── Data ─── */
const PATIENTS = [
  { id: "p1", name: "João Silva", age: 45, complaint: "Dor ao mastigar no lado direito", history: "Hipertensão controlada, fumante", findings: { 16: { O: "carie", M: "restauracao" }, 26: { D: "carie" }, 36: { absent: true }, 46: { V: "fratura", O: "carie" }, 18: { absent: true }, 28: { absent: true }, 38: { absent: true }, 48: { absent: true } } },
  { id: "p2", name: "Maria Oliveira", age: 28, complaint: "Sangramento gengival ao escovar", history: "Gestante (24 sem), sem comorbidades", findings: { 11: { M: "carie" }, 21: { D: "restauracao" }, 14: { O: "carie", D: "carie" }, 24: { O: "restauracao" }, 37: { O: "carie" } } },
  { id: "p3", name: "Carlos Mendes", age: 62, complaint: "Prótese parcial desadaptada", history: "Diabético tipo 2, cardiopata", findings: { 11: { absent: true }, 12: { absent: true }, 21: { absent: true }, 22: { absent: true }, 35: { absent: true }, 36: { absent: true }, 45: { absent: true }, 46: { absent: true }, 15: { V: "carie" }, 25: { O: "restauracao" }, 47: { O: "carie", D: "carie" } } },
];

type Condition = "carie" | "restauracao" | "fratura" | "implante" | "ausente" | null;
const CONDITION_COLORS: Record<string, string> = { carie: "#ef4444", restauracao: "#3b82f6", fratura: "#f59e0b", implante: "#8b5cf6", ausente: "#6b7280" };
const CONDITION_LABELS: Record<string, string> = { carie: "Cárie", restauracao: "Restauração", fratura: "Fratura", implante: "Implante", ausente: "Ausente" };
const FACES = ["V", "L", "M", "D", "O"] as const;
const UPPER_TEETH = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
const LOWER_TEETH = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];

type ToothFindings = Record<string, Condition>;
type AllFindings = Record<number, ToothFindings>;

function ToothSVG({ number, findings, onFaceClick, size = 48 }: { number: number; findings: ToothFindings; onFaceClick: (face: string) => void; size?: number }) {
  const isAbsent = findings.absent === "ausente";
  const cx = size / 2, cy = size / 2, r = size / 2 - 2;
  if (isAbsent) {
    return (
      <svg width={size} height={size + 14} className="cursor-pointer" onClick={() => onFaceClick("absent")}>
        <line x1={4} y1={4} x2={size - 4} y2={size - 4} stroke="hsl(var(--muted-foreground))" strokeWidth={2} />
        <line x1={size - 4} y1={4} x2={4} y2={size - 4} stroke="hsl(var(--muted-foreground))" strokeWidth={2} />
        <text x={cx} y={size + 12} textAnchor="middle" fontSize={9} fill="hsl(var(--muted-foreground))">{number}</text>
      </svg>
    );
  }
  const faceColor = (f: string) => findings[f] ? CONDITION_COLORS[findings[f] as string] : "hsl(var(--muted)/0.3)";
  // 5-face layout: center=O, top=V, bottom=L, left=M, right=D
  const ir = r * 0.4;
  return (
    <svg width={size} height={size + 14} className="cursor-pointer">
      {/* V - top */}
      <path d={`M ${cx - r} ${cy - r} L ${cx + r} ${cy - r} L ${cx + ir} ${cy - ir} L ${cx - ir} ${cy - ir} Z`} fill={faceColor("V")} stroke="hsl(var(--border))" strokeWidth={1} onClick={() => onFaceClick("V")}>
        <title>Vestibular</title>
      </path>
      {/* L - bottom */}
      <path d={`M ${cx - r} ${cy + r} L ${cx + r} ${cy + r} L ${cx + ir} ${cy + ir} L ${cx - ir} ${cy + ir} Z`} fill={faceColor("L")} stroke="hsl(var(--border))" strokeWidth={1} onClick={() => onFaceClick("L")}>
        <title>Lingual</title>
      </path>
      {/* M - left */}
      <path d={`M ${cx - r} ${cy - r} L ${cx - r} ${cy + r} L ${cx - ir} ${cy + ir} L ${cx - ir} ${cy - ir} Z`} fill={faceColor("M")} stroke="hsl(var(--border))" strokeWidth={1} onClick={() => onFaceClick("M")}>
        <title>Mesial</title>
      </path>
      {/* D - right */}
      <path d={`M ${cx + r} ${cy - r} L ${cx + r} ${cy + r} L ${cx + ir} ${cy + ir} L ${cx + ir} ${cy - ir} Z`} fill={faceColor("D")} stroke="hsl(var(--border))" strokeWidth={1} onClick={() => onFaceClick("D")}>
        <title>Distal</title>
      </path>
      {/* O - center */}
      <rect x={cx - ir} y={cy - ir} width={ir * 2} height={ir * 2} fill={faceColor("O")} stroke="hsl(var(--border))" strokeWidth={1} onClick={() => onFaceClick("O")}>
        <title>Oclusal</title>
      </rect>
      <text x={cx} y={size + 12} textAnchor="middle" fontSize={9} fill="hsl(var(--foreground))">{number}</text>
    </svg>
  );
}

/* ─── Diagnostics ─── */
function getDiagnoses(findings: AllFindings) {
  const diags: { tooth: number; face: string; condition: string; icdas?: string }[] = [];
  Object.entries(findings).forEach(([t, faces]) => {
    const tooth = Number(t);
    Object.entries(faces).forEach(([face, cond]) => {
      if (cond === "carie") diags.push({ tooth, face, condition: "Cárie", icdas: "ICDAS 3-4" });
      if (cond === "fratura") diags.push({ tooth, face, condition: "Fratura coronária" });
      if (cond === "ausente") diags.push({ tooth, face: "-", condition: "Elemento ausente" });
    });
  });
  return diags;
}

export default function SimuladorOdontograma() {
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [activeTool, setActiveTool] = useState<Condition>("carie");
  const [userFindings, setUserFindings] = useState<AllFindings>({});
  const [diagConfirmed, setDiagConfirmed] = useState(false);
  const [treatmentPlan, setTreatmentPlan] = useState<string[]>([]);

  const patient = PATIENTS.find(p => p.id === selectedPatient);

  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));

  const handleFaceClick = (tooth: number, face: string) => {
    if (!completedModules.has(1)) return;
    setUserFindings(prev => {
      const copy = { ...prev };
      if (!copy[tooth]) copy[tooth] = {};
      if (face === "absent") {
        copy[tooth] = { absent: "ausente" };
      } else {
        if (copy[tooth][face] === activeTool) {
          const { [face]: _, ...rest } = copy[tooth];
          copy[tooth] = rest;
        } else {
          copy[tooth] = { ...copy[tooth], [face]: activeTool };
        }
      }
      return copy;
    });
  };

  const confirmPatient = () => {
    if (!patient) return;
    // Pre-load expected findings for feedback
    completeModule(1);
  };

  const confirmExam = () => {
    completeModule(2);
  };

  const confirmDiagnosis = () => {
    setDiagConfirmed(true);
    completeModule(3);
  };

  const diags = getDiagnoses(userFindings);

  const confirmTreatment = () => {
    completeModule(4);
  };

  const LockedOverlay = ({ module }: { module: number }) => (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-xl">
      <Lock className="h-6 w-6 text-muted-foreground" />
      <p className="text-xs text-muted-foreground font-medium">Complete o módulo {module} para desbloquear</p>
    </div>
  );

  const expSummary: Record<string, string> = patient ? {
    "Paciente": patient.name,
    "Idade": `${patient.age} anos`,
    "Queixa": patient.complaint,
    "Achados registrados": `${Object.keys(userFindings).length} dentes`,
    "Diagnósticos": `${diags.length} encontrados`,
  } : {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Odontograma Interativo e Diagnóstico</h1>
        <p className="text-muted-foreground">Registro clínico odontológico padronizado com arcada SVG interativa</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* M1 — Seleção do Paciente */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" /> 1. Seleção do Paciente
              {completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedPatient} onValueChange={setSelectedPatient}>
              <SelectTrigger><SelectValue placeholder="Selecione um paciente..." /></SelectTrigger>
              <SelectContent>
                {PATIENTS.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — {p.age} anos</SelectItem>)}
              </SelectContent>
            </Select>
            {patient && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                <p><strong>Queixa:</strong> {patient.complaint}</p>
                <p><strong>Histórico:</strong> {patient.history}</p>
              </div>
            )}
            <Button onClick={confirmPatient} disabled={!patient || completedModules.has(1)} className="w-full">
              Confirmar Paciente
            </Button>
          </CardContent>
        </Card>

        {/* M2 — Exame Clínico Visual */}
        <Card className="lg:col-span-1 relative">
          {!completedModules.has(1) && <LockedOverlay module={1} />}
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" /> 2. Exame Clínico — Arcada SVG
              {completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 mb-2">
              {(["carie", "restauracao", "fratura", "implante", "ausente"] as Condition[]).map(c => c && (
                <button
                  key={c}
                  onClick={() => setActiveTool(c)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${activeTool === c ? "border-foreground bg-foreground/10" : "border-border"}`}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CONDITION_COLORS[c] }} />
                  {CONDITION_LABELS[c]}
                </button>
              ))}
            </div>
            {/* Upper arch */}
            <div className="bg-card border rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground mb-1 text-center">Arcada Superior</p>
              <div className="flex justify-center flex-wrap gap-0.5">
                {UPPER_TEETH.map(t => (
                  <ToothSVG key={t} number={t} findings={userFindings[t] || {}} onFaceClick={(f) => handleFaceClick(t, f)} size={40} />
                ))}
              </div>
            </div>
            {/* Lower arch */}
            <div className="bg-card border rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground mb-1 text-center">Arcada Inferior</p>
              <div className="flex justify-center flex-wrap gap-0.5">
                {LOWER_TEETH.map(t => (
                  <ToothSVG key={t} number={t} findings={userFindings[t] || {}} onFaceClick={(f) => handleFaceClick(t, f)} size={40} />
                ))}
              </div>
            </div>
            <Button onClick={confirmExam} disabled={Object.keys(userFindings).length === 0 || completedModules.has(2)} className="w-full">
              Confirmar Exame Clínico
            </Button>
          </CardContent>
        </Card>

        {/* M3 — Classificação Diagnóstica */}
        <Card className="relative">
          {!completedModules.has(2) && <LockedOverlay module={2} />}
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" /> 3. Classificação Diagnóstica
              {completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {diags.length > 0 ? (
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {diags.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-muted/50 rounded p-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CONDITION_COLORS[d.condition === "Cárie" ? "carie" : d.condition === "Fratura coronária" ? "fratura" : "ausente"] }} />
                    <span className="font-medium">Dente {d.tooth}</span>
                    <span className="text-muted-foreground">({d.face})</span>
                    <span>{d.condition}</span>
                    {d.icdas && <Badge variant="outline" className="text-[10px] ml-auto">{d.icdas}</Badge>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Registre achados no módulo 2 para gerar diagnósticos.</p>
            )}
            <Button onClick={confirmDiagnosis} disabled={diags.length === 0 || completedModules.has(3)} className="w-full">
              Confirmar Diagnósticos
            </Button>
          </CardContent>
        </Card>

        {/* M4 — Plano de Tratamento */}
        <Card className="relative">
          {!completedModules.has(3) && <LockedOverlay module={3} />}
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> 4. Plano de Tratamento
              {completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {diagConfirmed && diags.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Priorize os procedimentos sugeridos:</p>
                {diags.map((d, i) => {
                  const proc = d.condition === "Cárie" ? "Restauração direta em resina composta" : d.condition === "Fratura coronária" ? "Avaliação para coroa protética" : "Avaliação para prótese/implante";
                  const checked = treatmentPlan.includes(`${d.tooth}-${d.face}`);
                  return (
                    <label key={i} className="flex items-center gap-2 text-sm bg-muted/30 rounded p-2 cursor-pointer hover:bg-muted/50">
                      <input type="checkbox" checked={checked} onChange={() => {
                        const key = `${d.tooth}-${d.face}`;
                        setTreatmentPlan(prev => checked ? prev.filter(x => x !== key) : [...prev, key]);
                      }} className="rounded" />
                      <span className="font-medium">Dente {d.tooth}:</span>
                      <span>{proc}</span>
                    </label>
                  );
                })}
              </div>
            )}
            <Button onClick={confirmTreatment} disabled={treatmentPlan.length === 0 || completedModules.has(4)} className="w-full">
              Confirmar Plano de Tratamento
            </Button>
          </CardContent>
        </Card>

        {/* M5 — Relatório */}
        <LabReportPanel benchTitle="Odontograma Interativo" isUnlocked={completedModules.has(3)} experimentSummary={expSummary} />
      </div>
    </div>
  );
}
