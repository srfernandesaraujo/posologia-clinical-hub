import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Microscope, Lock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";
import { AIContextGenerator } from "@/components/lab-virtual/AIContextGenerator";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { LAB_SYSTEM_PROMPTS } from "@/data/labSystemPrompts";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";

const BACTERIA = [
  { id: "ecoli", name: "Escherichia coli", gram: "negativo", habitat: "Trato gastrointestinal", resistance: "Bombas de efluxo, β-lactamases" },
  { id: "saureus", name: "Staphylococcus aureus (MSSA)", gram: "positivo", habitat: "Pele, narinas", resistance: "Penicilinase" },
  { id: "mrsa", name: "Staphylococcus aureus (MRSA)", gram: "positivo", habitat: "Ambiente hospitalar", resistance: "PBP2a (mecA), multirresistência" },
  { id: "kpneumoniae", name: "Klebsiella pneumoniae", gram: "negativo", habitat: "Trato respiratório", resistance: "ESBL, biofilme" },
  { id: "kpc", name: "Klebsiella pneumoniae (KPC)", gram: "negativo", habitat: "UTI hospitalar", resistance: "Carbapenemase KPC, pan-resistência" },
  { id: "paeruginosa", name: "Pseudomonas aeruginosa", gram: "negativo", habitat: "Solo, água, ambiente hospitalar", resistance: "Efluxo, porinas, β-lactamases" },
];

const ANTIBIOTICS = [
  { id: "amoxicilina", name: "Amoxicilina", class: "Penicilina", gramTip: "Gram-negativos produtores de β-lactamase são naturalmente resistentes" },
  { id: "ciprofloxacino", name: "Ciprofloxacino", class: "Fluoroquinolona", gramTip: "Boa cobertura para Gram-negativos" },
  { id: "vancomicina", name: "Vancomicina", class: "Glicopeptídeo", gramTip: "Ineficaz contra Gram-negativos (não penetra membrana externa)" },
  { id: "meropenem", name: "Meropenem", class: "Carbapenêmico", gramTip: "Amplo espectro, reservado para multirresistentes" },
  { id: "gentamicina", name: "Gentamicina", class: "Aminoglicosídeo", gramTip: "Boa contra Gram-negativos aeróbios" },
  { id: "sulfametoxazol", name: "Sulfametoxazol-Trimetoprim", class: "Sulfonamida", gramTip: "Cobertura variável, resistência crescente" },
];

let _customResistance: Record<string, Record<string, { mic: number; breakpointS: number; breakpointR: number }>> = {};

function getMICData(bacteriaId: string, antibioticId: string) {
  if (_customResistance[bacteriaId]?.[antibioticId]) return _customResistance[bacteriaId][antibioticId];
  const resistanceMap: Record<string, Record<string, { mic: number; breakpointS: number; breakpointR: number }>> = {
    ecoli: { amoxicilina: { mic: 4, breakpointS: 8, breakpointR: 32 }, ciprofloxacino: { mic: 0.25, breakpointS: 1, breakpointR: 4 }, vancomicina: { mic: 128, breakpointS: 4, breakpointR: 32 }, meropenem: { mic: 0.06, breakpointS: 2, breakpointR: 8 }, gentamicina: { mic: 1, breakpointS: 4, breakpointR: 16 }, sulfametoxazol: { mic: 2, breakpointS: 2, breakpointR: 4 } },
    saureus: { amoxicilina: { mic: 0.5, breakpointS: 2, breakpointR: 8 }, ciprofloxacino: { mic: 0.5, breakpointS: 1, breakpointR: 4 }, vancomicina: { mic: 1, breakpointS: 2, breakpointR: 16 }, meropenem: { mic: 0.12, breakpointS: 2, breakpointR: 8 }, gentamicina: { mic: 0.5, breakpointS: 4, breakpointR: 16 }, sulfametoxazol: { mic: 0.5, breakpointS: 2, breakpointR: 4 } },
    mrsa: { amoxicilina: { mic: 64, breakpointS: 2, breakpointR: 8 }, ciprofloxacino: { mic: 8, breakpointS: 1, breakpointR: 4 }, vancomicina: { mic: 1, breakpointS: 2, breakpointR: 16 }, meropenem: { mic: 32, breakpointS: 2, breakpointR: 8 }, gentamicina: { mic: 16, breakpointS: 4, breakpointR: 16 }, sulfametoxazol: { mic: 1, breakpointS: 2, breakpointR: 4 } },
    kpneumoniae: { amoxicilina: { mic: 16, breakpointS: 8, breakpointR: 32 }, ciprofloxacino: { mic: 0.5, breakpointS: 1, breakpointR: 4 }, vancomicina: { mic: 256, breakpointS: 4, breakpointR: 32 }, meropenem: { mic: 0.12, breakpointS: 2, breakpointR: 8 }, gentamicina: { mic: 2, breakpointS: 4, breakpointR: 16 }, sulfametoxazol: { mic: 4, breakpointS: 2, breakpointR: 4 } },
    kpc: { amoxicilina: { mic: 128, breakpointS: 8, breakpointR: 32 }, ciprofloxacino: { mic: 16, breakpointS: 1, breakpointR: 4 }, vancomicina: { mic: 256, breakpointS: 4, breakpointR: 32 }, meropenem: { mic: 32, breakpointS: 2, breakpointR: 8 }, gentamicina: { mic: 32, breakpointS: 4, breakpointR: 16 }, sulfametoxazol: { mic: 16, breakpointS: 2, breakpointR: 4 } },
    paeruginosa: { amoxicilina: { mic: 256, breakpointS: 8, breakpointR: 32 }, ciprofloxacino: { mic: 0.5, breakpointS: 1, breakpointR: 4 }, vancomicina: { mic: 512, breakpointS: 4, breakpointR: 32 }, meropenem: { mic: 1, breakpointS: 2, breakpointR: 8 }, gentamicina: { mic: 2, breakpointS: 4, breakpointR: 16 }, sulfametoxazol: { mic: 64, breakpointS: 2, breakpointR: 4 } },
  };
  return resistanceMap[bacteriaId]?.[antibioticId] ?? { mic: 8, breakpointS: 4, breakpointR: 16 };
}

function classify(mic: number, breakpointS: number, breakpointR: number): "S" | "I" | "R" {
  if (mic <= breakpointS) return "S";
  if (mic >= breakpointR) return "R";
  return "I";
}

function getHaloSize(classification: "S" | "I" | "R"): number {
  if (classification === "S") return 22 + Math.random() * 10;
  if (classification === "I") return 12 + Math.random() * 6;
  return Math.random() * 6;
}

function generateGrowthCurve(bacteriaId: string, antibioticId: string, concentration: number) {
  const { mic } = getMICData(bacteriaId, antibioticId);
  const ratio = concentration / mic;
  const points = [];
  for (let t = 0; t <= 24; t += 0.5) {
    const control = 0.05 * Math.exp(0.4 * t) / (1 + 0.05 * Math.exp(0.4 * t) / 2.0);
    let treated: number;
    if (ratio >= 4) { treated = 0.05 * Math.exp(-0.1 * t); }
    else if (ratio >= 1) { const killRate = 0.4 - 0.5 * ratio; treated = 0.05 * Math.exp(killRate * t) / (1 + 0.05 * Math.exp(killRate * t) / (2.0 / ratio)); treated = Math.max(0.01, treated); }
    else { const reducedRate = 0.4 * (1 - ratio * 0.5); treated = 0.05 * Math.exp(reducedRate * t) / (1 + 0.05 * Math.exp(reducedRate * t) / 2.0); }
    points.push({ hora: t, controle: parseFloat(control.toFixed(3)), tratado: parseFloat(Math.max(0.005, treated).toFixed(3)) });
  }
  return points;
}

type AntibiogramResult = { antibioticId: string; name: string; mic: number; classification: "S" | "I" | "R"; halo: number };

function getBestEmpiricAntibiotic(results: AntibiogramResult[]): { id: string; reason: string } {
  const sensitive = results.filter(r => r.classification === "S");
  if (sensitive.length === 0) return { id: results[0].antibioticId, reason: "Nenhum antibiótico sensível — considerar terapia combinada ou polimixinas" };
  // Prefer narrowest spectrum with lowest MIC
  const sorted = [...sensitive].sort((a, b) => a.mic - b.mic);
  const best = sorted[0];
  return { id: best.antibioticId, reason: `Menor MIC entre os sensíveis (${best.mic} µg/mL), favorecendo eficácia e reduzindo pressão seletiva` };
}

export default function BancadaMicrobiologia() {
  const navigate = useNavigate();
  const {
    isVirtualRoom, submitResults: submitVRResults, submitted: vrSubmitted, goBack,
  } = useVirtualRoomCase("microbiologia");
  const startTimeRef = useRef(Date.now());

  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [bacteria, setBacteria] = useState("ecoli");
  const [selectedAntibiotics, setSelectedAntibiotics] = useState<string[]>(["amoxicilina", "ciprofloxacino", "meropenem"]);
  const [concentration, setConcentration] = useState([8]);
  const [antibiogram, setAntibiogram] = useState<AntibiogramResult[] | null>(null);

  // M3 decision: manual S/I/R classification
  const [userClassifications, setUserClassifications] = useState<Record<string, "S" | "I" | "R">>({});
  const [m3Submitted, setM3Submitted] = useState(false);
  const [m3Feedback, setM3Feedback] = useState<{ results: { antibioticId: string; name: string; userChoice: string; real: string; correct: boolean }[] } | null>(null);

  // M4 decision: choose empiric antibiotic
  const [userEmpiricChoice, setUserEmpiricChoice] = useState("");
  const [userEmpiricJustification, setUserEmpiricJustification] = useState("");
  const [m4Submitted, setM4Submitted] = useState(false);
  const [m4Feedback, setM4Feedback] = useState<{ correct: boolean; idealId: string; idealName: string; idealReason: string } | null>(null);

  const [growthAntibiotic, setGrowthAntibiotic] = useState<string | null>(null);
  const [growthConc, setGrowthConc] = useState([8]);
  const [growthCurve, setGrowthCurve] = useState<any[] | null>(null);

  const [customBacterium, setCustomBacterium] = useState<typeof BACTERIA[0] | null>(null);
  const allBacteria = useMemo(() => [...BACTERIA, ...(customBacterium ? [customBacterium] : [])], [customBacterium]);

  const selectedBacteria = allBacteria.find((b) => b.id === bacteria) ?? BACTERIA[0];
  const completeModule = (n: number) => setCompletedModules((prev) => new Set([...prev, n]));

  const confirmStrain = () => {
    setCompletedModules(new Set([1])); setAntibiogram(null); setGrowthCurve(null);
    setM3Submitted(false); setM3Feedback(null); setUserClassifications({});
    setM4Submitted(false); setM4Feedback(null); setUserEmpiricChoice(""); setUserEmpiricJustification("");
  };

  const runIncubation = () => {
    const results = selectedAntibiotics.map((aId) => {
      const ab = ANTIBIOTICS.find((a) => a.id === aId)!;
      const { mic, breakpointS, breakpointR } = getMICData(bacteria, aId);
      const c = classify(mic, breakpointS, breakpointR);
      return { antibioticId: aId, name: ab.name, mic, classification: c, halo: getHaloSize(c) };
    });
    setAntibiogram(results);
    setGrowthCurve(null);
    setM3Submitted(false); setM3Feedback(null); setUserClassifications({});
    setM4Submitted(false); setM4Feedback(null); setUserEmpiricChoice(""); setUserEmpiricJustification("");
    completeModule(2);
  };

  // M3 decision: classify S/I/R manually
  const submitM3Decision = () => {
    if (!antibiogram) return;
    const results = antibiogram.map(r => ({
      antibioticId: r.antibioticId,
      name: r.name,
      userChoice: userClassifications[r.antibioticId] || "S",
      real: r.classification,
      correct: (userClassifications[r.antibioticId] || "S") === r.classification,
    }));
    setM3Feedback({ results });
    setM3Submitted(true);

    // Auto-generate growth curve for M4
    const firstSensitive = antibiogram.find((r) => r.classification === "S");
    setGrowthAntibiotic(firstSensitive?.antibioticId ?? antibiogram[0].antibioticId);
    setGrowthConc([concentration[0]]);
    const abForCurve = firstSensitive?.antibioticId ?? antibiogram[0].antibioticId;
    setGrowthCurve(generateGrowthCurve(bacteria, abForCurve, concentration[0]));
    completeModule(3);
  };

  // M4 decision: choose empiric antibiotic
  const submitM4Decision = () => {
    if (!antibiogram) return;
    const best = getBestEmpiricAntibiotic(antibiogram);
    const correct = userEmpiricChoice === best.id;
    const idealName = ANTIBIOTICS.find(a => a.id === best.id)?.name || best.id;
    setM4Feedback({ correct, idealId: best.id, idealName, idealReason: best.reason });
    setM4Submitted(true);
    completeModule(4);
  };

  const updateGrowthRealtime = (abId: string, conc: number) => {
    setGrowthAntibiotic(abId);
    setGrowthConc([conc]);
    if (completedModules.has(3)) setGrowthCurve(generateGrowthCurve(bacteria, abId, conc));
  };

  const toggleAntibiotic = (id: string) => {
    setSelectedAntibiotics((prev) => prev.includes(id) ? prev.filter((a) => a !== id) : prev.length < 6 ? [...prev, id] : prev);
  };

  const experimentSummary: Record<string, string> = {
    "Bactéria": selectedBacteria.name,
    "Gram": `Gram-${selectedBacteria.gram}`,
    "Antibióticos testados": selectedAntibiotics.map((id) => ANTIBIOTICS.find((a) => a.id === id)?.name).join(", "),
    "Concentração teste": `${concentration[0]} µg/mL`,
  };
  if (antibiogram) {
    const sensitive = antibiogram.filter((r) => r.classification === "S").map((r) => r.name);
    experimentSummary["Sensível a"] = sensitive.length > 0 ? sensitive.join(", ") : "Nenhum";
    experimentSummary["Resistente a"] = antibiogram.filter((r) => r.classification === "R").map((r) => r.name).join(", ") || "Nenhum";
  }

  const handleVRSubmit = (reportData: { hypothesis: string; results: string; conclusion: string }) => {
    const decisions: { label: string; userChoice: string; correct: boolean; idealChoice?: string }[] = [
      { label: "Bactéria selecionada", userChoice: selectedBacteria.name, correct: true },
    ];
    if (m3Feedback) {
      m3Feedback.results.forEach(r => {
        decisions.push({
          label: `Classificação: ${r.name}`,
          userChoice: r.userChoice,
          correct: r.correct,
          idealChoice: r.real,
        });
      });
    }
    if (m4Feedback) {
      decisions.push({
        label: "Antibiótico empírico escolhido",
        userChoice: ANTIBIOTICS.find(a => a.id === userEmpiricChoice)?.name || userEmpiricChoice,
        correct: m4Feedback.correct,
        idealChoice: m4Feedback.idealName,
      });
    }
    const score = Math.round((decisions.filter(d => d.correct).length / decisions.length) * 100);
    submitVRResults({ score, actions: { decisions, report: reportData, experimentSummary }, timeSpentSeconds: Math.round((Date.now() - startTimeRef.current) / 1000) });
  };

  const LockedOverlay = ({ requiredModule }: { requiredModule: number }) => (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-lg">
      <Lock className="h-6 w-6 text-muted-foreground" /><p className="text-xs text-muted-foreground">Complete o módulo {requiredModule} para desbloquear</p>
    </div>
  );
  const ModuleBadge = ({ n }: { n: number }) => (completedModules.has(n) ? <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" /> : null);
  const FeedbackIcon = ({ correct }: { correct: boolean }) => correct
    ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
    : <XCircle className="h-4 w-4 text-destructive shrink-0" />;

  const JUSTIFICATIONS = [
    { value: "menor_mic", label: "Menor MIC entre os sensíveis (maior potência)" },
    { value: "espectro_estreito", label: "Espectro mais estreito (menor pressão seletiva)" },
    { value: "amplo_espectro", label: "Maior cobertura empírica (amplo espectro)" },
    { value: "disponibilidade", label: "Disponibilidade e custo-efetividade" },
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => isVirtualRoom ? goBack() : navigate("/laboratorio-virtual")}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Microscope className="h-7 w-7 text-primary" /> Bancada de Microbiologia</h1>
          <p className="text-sm text-muted-foreground">Antibiograma, curvas de crescimento e classificação S/I/R</p>
        </div>
        <AdminPromptViewer toolSlug={LAB_SYSTEM_PROMPTS.microbiologia.slug} toolName={LAB_SYSTEM_PROMPTS.microbiologia.name} toolType="laboratory" prompt={LAB_SYSTEM_PROMPTS.microbiologia.prompt} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* M1 */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">1. Seleção do Microrganismo <ModuleBadge n={1} /></CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Bactéria</label>
              <Select value={bacteria} onValueChange={setBacteria}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{allBacteria.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-xs space-y-1">
              <p><strong>Gram:</strong> {selectedBacteria.gram}</p>
              <p><strong>Habitat:</strong> {selectedBacteria.habitat}</p>
              <p><strong>Mecanismos de resistência:</strong> {selectedBacteria.resistance}</p>
            </div>
            <Button onClick={confirmStrain} className="w-full">Confirmar Cepa</Button>
            <AIContextGenerator labType="microbiologia" onContextGenerated={(data: any) => {
              setCustomBacterium(data.bacteria);
              const resMap: Record<string, { mic: number; breakpointS: number; breakpointR: number }> = {};
              (data.resistanceData || []).forEach((r: any) => { resMap[r.antibioticId] = { mic: r.mic, breakpointS: r.breakpointS, breakpointR: r.breakpointR }; });
              _customResistance = { [data.bacteria.id]: resMap };
              setBacteria(data.bacteria.id);
              setCompletedModules(new Set([1])); setAntibiogram(null); setGrowthCurve(null);
              setM3Submitted(false); setM3Feedback(null); setM4Submitted(false); setM4Feedback(null);
            }} />
          </CardContent>
        </Card>

        {/* M2 */}
        <Card className="relative">
          {!completedModules.has(1) && <LockedOverlay requiredModule={1} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">2. Painel de Antibióticos <ModuleBadge n={2} /></CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Antibióticos (selecione até 6)</label>
              <div className="flex flex-wrap gap-2">
                {ANTIBIOTICS.map((ab) => (
                  <Badge key={ab.id} variant={selectedAntibiotics.includes(ab.id) ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => toggleAntibiotic(ab.id)}>{ab.name}</Badge>
                ))}
              </div>
            </div>
            {selectedAntibiotics.length > 0 && (
              <div className="p-2 rounded bg-muted/30 text-[10px] text-muted-foreground space-y-0.5">
                {selectedAntibiotics.map((id) => { const ab = ANTIBIOTICS.find((a) => a.id === id)!; return <p key={id}><strong>{ab.name}</strong> ({ab.class}): {ab.gramTip}</p>; })}
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Concentração do teste: {concentration[0]} µg/mL</label>
              <Slider value={concentration} onValueChange={setConcentration} min={0.5} max={128} step={0.5} className="mt-2" />
            </div>
            <Button onClick={runIncubation} disabled={selectedAntibiotics.length === 0} className="w-full">Iniciar Incubação</Button>
          </CardContent>
        </Card>

        {/* M3 - Placa de Petri + Decisão: classificar S/I/R manualmente */}
        <Card className="lg:col-span-2 relative">
          {!completedModules.has(2) && <LockedOverlay requiredModule={2} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">3. Interpretação do Antibiograma <ModuleBadge n={3} /></CardTitle></CardHeader>
          <CardContent>
            {!antibiogram ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Aguardando incubação</div>
            ) : (
              <div className="space-y-4">
                {/* Petri plate visualization */}
                <div className="relative mx-auto" style={{ width: 240, height: 240 }}>
                  <svg viewBox="0 0 240 240" className="w-full h-full">
                    <circle cx="120" cy="120" r="115" fill="hsl(45 60% 85%)" stroke="hsl(var(--border))" strokeWidth="2" />
                    {antibiogram.map((r, i) => {
                      const angle = (i / antibiogram.length) * 2 * Math.PI - Math.PI / 2;
                      const dist = 60;
                      const cx = 120 + dist * Math.cos(angle);
                      const cy = 120 + dist * Math.sin(angle);
                      const haloR = r.halo * 2;
                      return (
                        <g key={r.antibioticId}>
                          {r.halo > 2 && <circle cx={cx} cy={cy} r={haloR} fill="hsl(45 60% 95%)" opacity={0.7} />}
                          <circle cx={cx} cy={cy} r={7} fill="hsl(var(--primary))" />
                          <text x={cx} y={cy + haloR + 12} textAnchor="middle" fontSize="7" fill="hsl(var(--foreground))">{r.name.substring(0, 6)}</text>
                          {/* Show halo diameter in mm */}
                          {r.halo > 2 && <text x={cx} y={cy - haloR - 4} textAnchor="middle" fontSize="6" fill="hsl(var(--muted-foreground))">{r.halo.toFixed(0)}mm</text>}
                        </g>
                      );
                    })}
                  </svg>
                </div>

                <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <AlertTriangle className="h-4 w-4" />
                    Decisão Crítica: Classifique cada antibiótico como S, I ou R
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Analise o tamanho dos halos de inibição na placa de Petri e classifique cada antibiótico. Halos grandes (&gt;18mm) geralmente indicam sensibilidade, halos médios (13-17mm) indicam intermediário, e halos pequenos (&lt;13mm) ou ausentes indicam resistência.
                  </p>

                  <div className="space-y-2">
                    {antibiogram.map(r => (
                      <div key={r.antibioticId} className="flex items-center gap-3">
                        <span className="text-xs font-medium w-32 truncate">{r.name}</span>
                        <span className="text-[10px] text-muted-foreground w-16">Halo: {r.halo.toFixed(0)}mm</span>
                        <RadioGroup
                          value={userClassifications[r.antibioticId] || ""}
                          onValueChange={v => setUserClassifications(prev => ({ ...prev, [r.antibioticId]: v as "S" | "I" | "R" }))}
                          disabled={m3Submitted}
                          className="flex gap-3"
                        >
                          <div className="flex items-center gap-1">
                            <RadioGroupItem value="S" id={`${r.antibioticId}-S`} />
                            <Label htmlFor={`${r.antibioticId}-S`} className="text-xs cursor-pointer text-green-600">S</Label>
                          </div>
                          <div className="flex items-center gap-1">
                            <RadioGroupItem value="I" id={`${r.antibioticId}-I`} />
                            <Label htmlFor={`${r.antibioticId}-I`} className="text-xs cursor-pointer text-yellow-600">I</Label>
                          </div>
                          <div className="flex items-center gap-1">
                            <RadioGroupItem value="R" id={`${r.antibioticId}-R`} />
                            <Label htmlFor={`${r.antibioticId}-R`} className="text-xs cursor-pointer text-red-600">R</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    ))}
                  </div>

                  {!m3Submitted ? (
                    <Button
                      onClick={submitM3Decision}
                      disabled={Object.keys(userClassifications).length < antibiogram.length}
                      className="w-full"
                    >
                      Confirmar Classificações
                    </Button>
                  ) : m3Feedback && (
                    <div className="space-y-2 animate-fade-in">
                      {m3Feedback.results.map(r => (
                        <div key={r.antibioticId} className="flex items-center gap-2 text-xs">
                          <FeedbackIcon correct={r.correct} />
                          <span><strong>{r.name}</strong>: você = {r.userChoice} | real = <strong>{r.real}</strong> (MIC = {antibiogram.find(a => a.antibioticId === r.antibioticId)?.mic} µg/mL)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* M4 - Curva de crescimento + Decisão: antibiótico empírico */}
        <Card className="lg:col-span-2 relative">
          {!completedModules.has(3) && <LockedOverlay requiredModule={3} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">4. Escolha do Antibiótico Empírico <ModuleBadge n={4} /></CardTitle></CardHeader>
          <CardContent>
            {!growthCurve ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Aguardando módulo 3</div>
            ) : (
              <div className="space-y-3">
                {antibiogram && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <label className="text-xs font-medium">Explorar curva:</label>
                    {antibiogram.map((r) => (
                      <Badge key={r.antibioticId} variant={growthAntibiotic === r.antibioticId ? "default" : "outline"} className="cursor-pointer text-[10px]" onClick={() => updateGrowthRealtime(r.antibioticId, growthConc[0])}>{r.name.substring(0, 8)}</Badge>
                    ))}
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium">Concentração: {growthConc[0]} µg/mL</label>
                  <Slider value={growthConc} onValueChange={(v) => updateGrowthRealtime(growthAntibiotic!, v[0])} min={0.5} max={128} step={0.5} className="mt-1" />
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={growthCurve}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="hora" label={{ value: "Tempo (h)", position: "insideBottom", offset: -2, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis label={{ value: "OD600", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="controle" stroke="hsl(var(--muted-foreground))" name="Controle" dot={false} strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="tratado" stroke="hsl(var(--primary))" name={`Tratado (${growthConc[0]} µg/mL)`} dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>

                {m3Feedback && m3Feedback.results.some(r => !r.correct) && !m4Submitted && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
                    ⚠️ Algumas classificações S/I/R foram incorretas. Use as curvas de crescimento para validar sua interpretação antes de escolher o antibiótico empírico.
                  </div>
                )}

                <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <AlertTriangle className="h-4 w-4" />
                    Decisão Crítica: Selecione o antibiótico para tratamento empírico
                  </div>

                  <div>
                    <Label className="text-xs font-medium">Antibiótico de escolha:</Label>
                    <Select value={userEmpiricChoice} onValueChange={setUserEmpiricChoice} disabled={m4Submitted}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {antibiogram?.map(r => (
                          <SelectItem key={r.antibioticId} value={r.antibioticId}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium">Justificativa:</Label>
                    <RadioGroup value={userEmpiricJustification} onValueChange={setUserEmpiricJustification} disabled={m4Submitted} className="mt-2 space-y-1">
                      {JUSTIFICATIONS.map(j => (
                        <div key={j.value} className="flex items-center gap-2">
                          <RadioGroupItem value={j.value} id={`just-${j.value}`} />
                          <Label htmlFor={`just-${j.value}`} className="text-xs cursor-pointer">{j.label}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  {!m4Submitted ? (
                    <Button onClick={submitM4Decision} disabled={!userEmpiricChoice || !userEmpiricJustification} className="w-full">
                      Confirmar Escolha Terapêutica
                    </Button>
                  ) : m4Feedback && (
                    <div className="space-y-2 animate-fade-in">
                      <div className="flex items-center gap-2 text-sm">
                        <FeedbackIcon correct={m4Feedback.correct} />
                        <span>
                          Sua escolha: <strong>{ANTIBIOTICS.find(a => a.id === userEmpiricChoice)?.name}</strong> | Ideal: <strong>{m4Feedback.idealName}</strong>
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{m4Feedback.idealReason}</p>
                      <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                        <strong className="text-foreground">Princípio:</strong> Na terapia empírica, prefere-se o antibiótico sensível com menor MIC (maior potência), espectro mais estreito (menor pressão seletiva para resistência), e boa penetração no sítio de infecção.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* M5 */}
        <LabReportPanel benchTitle="Bancada de Microbiologia" isUnlocked={completedModules.has(4)} experimentSummary={experimentSummary} isVirtualRoom={isVirtualRoom} onVRSubmit={handleVRSubmit} vrSubmitted={vrSubmitted} />
      </div>
    </div>
  );
}
