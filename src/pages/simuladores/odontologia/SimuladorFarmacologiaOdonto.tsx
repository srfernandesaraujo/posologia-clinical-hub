import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, CheckCircle2, User, Pill, Shield, FileText } from "lucide-react";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";

const PATIENTS = [
  { id: "p1", name: "Adulto saudável (35 anos)", profile: "Sem comorbidades", weight: 70, contraindications: [], risks: { renal: 0, hepatic: 0, cardiovascular: 0, gastric: 10 } },
  { id: "p2", name: "Gestante (28 sem)", profile: "Gestação sem intercorrências", weight: 65, contraindications: ["AINEs (3° trimestre)", "Tetraciclinas", "Metronidazol (1° tri)"], risks: { renal: 5, hepatic: 10, cardiovascular: 5, gastric: 15 } },
  { id: "p3", name: "Cardiopata (62 anos)", profile: "HAS + FA, uso de varfarina", weight: 80, contraindications: ["AINEs (risco hemorrágico)", "Epinefrina em alta dose"], risks: { renal: 20, hepatic: 15, cardiovascular: 60, gastric: 40 } },
  { id: "p4", name: "Criança (8 anos, 25kg)", profile: "ASA I, sem alergias", weight: 25, contraindications: ["AAS (Sd. Reye)", "Dipirona IV (risco)"], risks: { renal: 5, hepatic: 5, cardiovascular: 0, gastric: 10 } },
  { id: "p5", name: "Nefropata (55 anos)", profile: "DRC estágio 3, TFG 45 mL/min", weight: 72, contraindications: ["AINEs (nefrotóxicos)", "Doses plenas de amoxicilina"], risks: { renal: 70, hepatic: 20, cardiovascular: 30, gastric: 25 } },
];

const PROCEDURES = ["Exodontia simples", "Exodontia de incluso", "Restauração extensa", "Cirurgia periodontal", "Implante dentário"];

const ANALGESICS = [
  { id: "dipirona", name: "Dipirona 500mg", posology: "500mg VO 6/6h", maxDoseAdult: "4g/dia", maxDoseChild: "15mg/kg/dose", alerts: [] },
  { id: "paracetamol", name: "Paracetamol 750mg", posology: "750mg VO 6/6h", maxDoseAdult: "4g/dia", maxDoseChild: "10-15mg/kg/dose", alerts: ["Hepatotoxicidade em doses elevadas"] },
  { id: "tramadol", name: "Tramadol 50mg", posology: "50mg VO 6/6h", maxDoseAdult: "400mg/dia", maxDoseChild: "Contraindicado <12 anos", alerts: ["Opioide — risco de dependência"] },
];

const AINES = [
  { id: "ibuprofeno", name: "Ibuprofeno 600mg", posology: "600mg VO 8/8h por 3 dias", alerts: ["Risco GI", "Contraindicado em nefropatas"] },
  { id: "nimesulida", name: "Nimesulida 100mg", posology: "100mg VO 12/12h por 5 dias", alerts: ["Hepatotoxicidade", "Contraindicado <12 anos"] },
  { id: "dexametasona", name: "Dexametasona 4mg", posology: "4mg VO dose única pré-op", alerts: ["Corticoide — não é AINE clássico"] },
];

const ANTIBIOTICS = [
  { id: "amoxicilina", name: "Amoxicilina 500mg", posology: "500mg VO 8/8h por 7 dias", alerts: [] },
  { id: "amoxi-clav", name: "Amoxicilina + Clavulanato", posology: "875/125mg VO 12/12h por 7 dias", alerts: ["Maior espectro"] },
  { id: "clindamicina", name: "Clindamicina 300mg", posology: "300mg VO 8/8h por 7 dias", alerts: ["Alternativa para alérgicos a penicilinas"] },
  { id: "azitromicina", name: "Azitromicina 500mg", posology: "500mg VO 1x/dia por 3 dias", alerts: ["Interação com varfarina"] },
];

function RiskGaugeSVG({ label, value }: { label: string; value: number }) {
  const color = value >= 50 ? "#ef4444" : value >= 25 ? "#f59e0b" : "#22c55e";
  return (
    <div className="text-center">
      <svg viewBox="0 0 60 36" className="w-16 mx-auto">
        <path d="M6 30 A24 24 0 0 1 54 30" fill="none" stroke="hsl(var(--muted))" strokeWidth={5} strokeLinecap="round" />
        <path d="M6 30 A24 24 0 0 1 54 30" fill="none" stroke={color} strokeWidth={5} strokeLinecap="round"
          strokeDasharray={`${(value / 100) * 75.4} 75.4`} />
        <text x={30} y={28} textAnchor="middle" fontSize={10} fill={color} fontWeight="bold">{value}%</text>
      </svg>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

export default function SimuladorFarmacologiaOdonto() {
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedProcedure, setSelectedProcedure] = useState("");
  const [selectedAnalgesic, setSelectedAnalgesic] = useState("");
  const [selectedAINE, setSelectedAINE] = useState("");
  const [selectedAntibiotic, setSelectedAntibiotic] = useState("");

  const patient = PATIENTS.find(p => p.id === selectedPatient);
  const analgesic = ANALGESICS.find(a => a.id === selectedAnalgesic);
  const aine = AINES.find(a => a.id === selectedAINE);
  const antibiotic = ANTIBIOTICS.find(a => a.id === selectedAntibiotic);

  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));

  // Calculate adjusted risks based on drug choices
  const adjustedRisks = patient ? { ...patient.risks } : { renal: 0, hepatic: 0, cardiovascular: 0, gastric: 0 };
  if (selectedAINE === "ibuprofeno") { adjustedRisks.renal += 20; adjustedRisks.gastric += 25; }
  if (selectedAINE === "nimesulida") { adjustedRisks.hepatic += 15; }
  if (selectedAnalgesic === "paracetamol") { adjustedRisks.hepatic += 10; }

  const hasContraindication = patient && (
    (patient.contraindications.some(c => c.includes("AINEs")) && selectedAINE && selectedAINE !== "dexametasona") ||
    (patient.id === "p4" && selectedAINE === "nimesulida") ||
    (patient.id === "p3" && selectedAntibiotic === "azitromicina")
  );

  const LockedOverlay = ({ module }: { module: number }) => (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-xl">
      <Lock className="h-6 w-6 text-muted-foreground" />
      <p className="text-xs text-muted-foreground font-medium">Complete o módulo {module}</p>
    </div>
  );

  const expSummary: Record<string, string> = {
    "Paciente": patient?.name || "-",
    "Procedimento": selectedProcedure || "-",
    "Analgésico": analgesic?.name || "-",
    "Anti-inflamatório": aine?.name || "-",
    "Antibiótico": antibiotic?.name || "Não prescrito",
    "Contraindicação detectada": hasContraindication ? "SIM" : "Não",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Farmacologia Odontológica e Prescrição</h1>
        <p className="text-muted-foreground">Prescrição segura com análise de risco por perfil do paciente</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* M1 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> 1. Caso Clínico
              {completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedPatient} onValueChange={setSelectedPatient}>
              <SelectTrigger><SelectValue placeholder="Perfil do paciente..." /></SelectTrigger>
              <SelectContent>
                {PATIENTS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedProcedure} onValueChange={setSelectedProcedure}>
              <SelectTrigger><SelectValue placeholder="Procedimento realizado..." /></SelectTrigger>
              <SelectContent>
                {PROCEDURES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            {patient && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <p><strong>Perfil:</strong> {patient.profile}</p>
                <p><strong>Peso:</strong> {patient.weight} kg</p>
                {patient.contraindications.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium text-destructive text-xs">Contraindicações:</p>
                    {patient.contraindications.map(c => <Badge key={c} variant="destructive" className="text-[10px] mr-1">{c}</Badge>)}
                  </div>
                )}
              </div>
            )}
            <Button onClick={() => completeModule(1)} disabled={!patient || !selectedProcedure || completedModules.has(1)} className="w-full">Confirmar Caso</Button>
          </CardContent>
        </Card>

        {/* M2 — Prescrição */}
        <Card className="relative">
          {!completedModules.has(1) && <LockedOverlay module={1} />}
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Pill className="h-4 w-4 text-primary" /> 2. Prescrição
              {completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Analgésico:</label>
              <Select value={selectedAnalgesic} onValueChange={setSelectedAnalgesic}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{ANALGESICS.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
              {analgesic && <p className="text-xs text-muted-foreground mt-1">{analgesic.posology}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Anti-inflamatório:</label>
              <Select value={selectedAINE} onValueChange={setSelectedAINE}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{AINES.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
              {aine && <p className="text-xs text-muted-foreground mt-1">{aine.posology}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Antibiótico (se indicado):</label>
              <Select value={selectedAntibiotic} onValueChange={setSelectedAntibiotic}>
                <SelectTrigger><SelectValue placeholder="Selecione ou deixe em branco..." /></SelectTrigger>
                <SelectContent>{ANTIBIOTICS.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
              {antibiotic && <p className="text-xs text-muted-foreground mt-1">{antibiotic.posology}</p>}
            </div>
            <Button onClick={() => completeModule(2)} disabled={!selectedAnalgesic || completedModules.has(2)} className="w-full">Confirmar Prescrição</Button>
          </CardContent>
        </Card>

        {/* M3 — Análise de risco */}
        <Card className="relative">
          {!completedModules.has(2) && <LockedOverlay module={2} />}
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> 3. Análise de Risco
              {completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <RiskGaugeSVG label="Renal" value={Math.min(adjustedRisks.renal, 100)} />
              <RiskGaugeSVG label="Hepático" value={Math.min(adjustedRisks.hepatic, 100)} />
              <RiskGaugeSVG label="Cardiov." value={Math.min(adjustedRisks.cardiovascular, 100)} />
              <RiskGaugeSVG label="Gástrico" value={Math.min(adjustedRisks.gastric, 100)} />
            </div>
            {hasContraindication && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                ⚠️ Contraindicação detectada! Revise a prescrição considerando o perfil do paciente.
              </div>
            )}
            {patient?.id === "p4" && analgesic && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium">Dose pediátrica ({patient.weight} kg):</p>
                <p className="text-muted-foreground">{analgesic.maxDoseChild}</p>
              </div>
            )}
            <Button onClick={() => completeModule(3)} disabled={completedModules.has(3)} className="w-full">Confirmar Análise</Button>
          </CardContent>
        </Card>

        {/* M4 — Receituário */}
        <Card className="relative">
          {!completedModules.has(3) && <LockedOverlay module={3} />}
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> 4. Receituário Final
              {completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-card border-2 border-dashed border-border rounded-lg p-4 text-sm space-y-2">
              <p className="text-center font-bold text-base">RECEITUÁRIO</p>
              <p className="text-center text-muted-foreground text-xs">Dr(a). _____________ — CRO: _________</p>
              <hr className="border-border" />
              <p><strong>Paciente:</strong> {patient?.name}</p>
              <div className="space-y-1 mt-2">
                {analgesic && <p>1) {analgesic.name} — {analgesic.posology}</p>}
                {aine && <p>2) {aine.name} — {aine.posology}</p>}
                {antibiotic && <p>3) {antibiotic.name} — {antibiotic.posology}</p>}
              </div>
              <hr className="border-border mt-3" />
              <p className="text-xs text-muted-foreground text-center">Data: {new Date().toLocaleDateString("pt-BR")}</p>
            </div>
            <Button onClick={() => completeModule(4)} disabled={completedModules.has(4)} className="w-full">Validar Receituário</Button>
          </CardContent>
        </Card>

        <LabReportPanel benchTitle="Farmacologia Odontológica" isUnlocked={completedModules.has(3)} experimentSummary={expSummary} />
      </div>
    </div>
  );
}
