import { useState, useEffect, useCallback, useMemo } from "react";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Sparkles, Loader2, Play, Eye, ShieldAlert, Bug, Thermometer, Activity } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getInfeccaoLabChallenges } from "@/data/simulatorChallenges";

const SLUG = "farmacoterapia-infeccao-lab";

interface InfDrug {
  name: string; class: string;
  doseMin: number; doseMax: number; doseUnit: string; doseStep: number;
  effects: { leucocitos: number; neutrofilos: number; pcr: number; pct: number; lactato: number; temp: number };
  sideEffects: { gi: number; alergia: number; nefrotox: number; cDiff: number };
  hoursToEffect: number;
  spectrum: string;
}

const DRUGS: InfDrug[] = [
  { name: "Amoxicilina", class: "Penicilina", doseMin: 500, doseMax: 1500, doseUnit: "mg 8/8h", doseStep: 250, effects: { leucocitos: -2, neutrofilos: -1.5, pcr: -3, pct: -0.3, lactato: -0.2, temp: -0.5 }, sideEffects: { gi: 0.15, alergia: 0.1, nefrotox: 0.02, cDiff: 0.05 }, hoursToEffect: 6, spectrum: "Gram+ e alguns Gram-" },
  { name: "Ceftriaxona", class: "Cefalosporina 3ª", doseMin: 1, doseMax: 4, doseUnit: "g/dia EV", doseStep: 1, effects: { leucocitos: -3, neutrofilos: -2, pcr: -5, pct: -0.5, lactato: -0.3, temp: -0.8 }, sideEffects: { gi: 0.1, alergia: 0.08, nefrotox: 0.03, cDiff: 0.1 }, hoursToEffect: 4, spectrum: "Amplo (Gram+ e Gram-)" },
  { name: "Piperacilina-Tazobactam", class: "Penicilina + inibidor β-lactamase", doseMin: 4.5, doseMax: 18, doseUnit: "g/dia EV", doseStep: 4.5, effects: { leucocitos: -4, neutrofilos: -3, pcr: -6, pct: -0.8, lactato: -0.5, temp: -1.0 }, sideEffects: { gi: 0.12, alergia: 0.08, nefrotox: 0.05, cDiff: 0.08 }, hoursToEffect: 3, spectrum: "Amplo + anaeróbios" },
  { name: "Vancomicina", class: "Glicopeptídeo", doseMin: 500, doseMax: 2000, doseUnit: "mg EV 12/12h", doseStep: 250, effects: { leucocitos: -2, neutrofilos: -1.5, pcr: -4, pct: -0.4, lactato: -0.2, temp: -0.6 }, sideEffects: { gi: 0.05, alergia: 0.12, nefrotox: 0.2, cDiff: 0.03 }, hoursToEffect: 4, spectrum: "Gram+ (MRSA, VRE)" },
  { name: "Meropenem", class: "Carbapenêmico", doseMin: 1, doseMax: 6, doseUnit: "g/dia EV", doseStep: 1, effects: { leucocitos: -5, neutrofilos: -4, pcr: -8, pct: -1.0, lactato: -0.6, temp: -1.2 }, sideEffects: { gi: 0.08, alergia: 0.05, nefrotox: 0.03, cDiff: 0.12 }, hoursToEffect: 2, spectrum: "Ultra-amplo (ESBL, KPC sensíveis)" },
  { name: "Oseltamivir", class: "Inibidor neuraminidase", doseMin: 75, doseMax: 150, doseUnit: "mg 12/12h", doseStep: 75, effects: { leucocitos: 0.5, neutrofilos: 0, pcr: -1, pct: 0, lactato: -0.1, temp: -0.5 }, sideEffects: { gi: 0.2, alergia: 0.02, nefrotox: 0.01, cDiff: 0 }, hoursToEffect: 12, spectrum: "Influenza A e B" },
];

interface InfCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  created_by?: string; is_marketplace?: boolean;
  patient: { name: string; age: number; weight: number; sex: string; specialGroup: string[] };
  scenario: string;
  baseLab: { leucocitos: number; neutrofilos: number; linfocitos: number; bastoes: number; monocitos: number; eosinofilos: number; pcr: number; pct: number; lactato: number; temp: number; hemocultura: string };
  expectedDrugs: string[];
  clinicalTip: string;
  references: string[];
}

const BUILT_IN_CASES: InfCase[] = [
  {
    title: "Caso 1: Pneumonia Comunitária — Leucocitose + PCR Alta",
    difficulty: "Fácil",
    patient: { name: "Pedro Almeida", age: 55, weight: 80, sex: "M", specialGroup: ["DM2", "DPOC"] },
    scenario: "Homem 55 anos com tosse produtiva, febre 39°C há 3 dias e dispneia. RX tórax: consolidação lobar direita. Leucocitose com desvio à esquerda (bastões elevados). PCR alta, PCT >2. CURB-65 = 2 (internação).",
    baseLab: { leucocitos: 18500, neutrofilos: 14800, linfocitos: 1850, bastoes: 1480, monocitos: 185, eosinofilos: 185, pcr: 180, pct: 3.5, lactato: 2.2, temp: 39.0, hemocultura: "Pendente" },
    expectedDrugs: ["Ceftriaxona"],
    clinicalTip: "PAC moderada (CURB-65=2): ceftriaxona 1g/dia + azitromicina 500mg/dia por 7 dias. Leucocitose >15.000 com bastões >10% = desvio à esquerda (infecção bacteriana provável). PCR >100 e PCT >2 favorecem etiologia bacteriana. Reavaliar em 48-72h com PCR seriada.",
    references: ["BTS Pneumonia Guidelines 2015", "IDSA/ATS CAP 2019"],
  },
  {
    title: "Caso 2: Sepse — PCT >10 + Lactato >4",
    difficulty: "Difícil",
    patient: { name: "Ana Clara", age: 42, weight: 65, sex: "F", specialGroup: [] },
    scenario: "Mulher 42 anos admitida com foco urinário (pielonefrite). PA 85/50, FC 120, FR 26. Leucocitose severa, PCT >10 (alta probabilidade de sepse bacteriana), lactato 5.2. qSOFA ≥2. Necessita ressuscitação + ATB imediato.",
    baseLab: { leucocitos: 24000, neutrofilos: 20400, linfocitos: 1200, bastoes: 2160, monocitos: 240, eosinofilos: 0, pcr: 320, pct: 15, lactato: 5.2, temp: 39.5, hemocultura: "Pendente" },
    expectedDrugs: ["Piperacilina-Tazobactam"],
    clinicalTip: "Sepse (SEPSIS-3): disfunção orgânica + infecção. Hour-1 Bundle: (1) Lactato, (2) Hemoculturas ANTES do ATB, (3) ATB amplo espectro <1h, (4) Cristaloide 30 mL/kg se hipotensão ou lactato >4. PCT >10 = sepse bacteriana provável. Meta de lactato: queda >20% em 6h.",
    references: ["Surviving Sepsis Campaign 2021", "Singer M et al. JAMA 2016"],
  },
  {
    title: "Caso 3: Infecção Viral vs Bacteriana",
    difficulty: "Fácil",
    patient: { name: "Juliana Fernandes", age: 30, weight: 58, sex: "F", specialGroup: [] },
    scenario: "Mulher 30 anos com febre 38.2°C, mialgia, cefaleia e coriza há 2 dias. Leucócitos normais com LINFOCITOSE relativa. PCR baixa (15), PCT <0.1. Sem foco bacteriano. Perfil compatível com virose (Influenza?).",
    baseLab: { leucocitos: 5200, neutrofilos: 2080, linfocitos: 2600, bastoes: 52, monocitos: 364, eosinofilos: 104, pcr: 15, pct: 0.08, lactato: 1.0, temp: 38.2, hemocultura: "Não indicada" },
    expectedDrugs: ["Oseltamivir"],
    clinicalTip: "Perfil VIRAL: leucócitos normais ou baixos, linfocitose relativa, PCR <50, PCT <0.25. NÃO usar antibiótico! Oseltamivir: apenas se Influenza confirmada/suspeita dentro de 48h do início dos sintomas. PCT <0.1 praticamente exclui infecção bacteriana significativa.",
    references: ["Schuetz P et al. Lancet ID 2018"],
  },
  {
    title: "Caso 4: Neutropenia Febril — ATB Empírico Imediato",
    difficulty: "Difícil",
    patient: { name: "Ricardo Campos", age: 48, weight: 72, sex: "M", specialGroup: ["Leucemia", "QT"] },
    scenario: "Homem 48 anos, leucemia em QT ciclo 3, dia 10. Febre 38.5°C há 2h. Leucócitos 600, neutrófilos 120 (neutropenia profunda). PCR 45, PCT 1.2. EMERGÊNCIA: ATB <1h.",
    baseLab: { leucocitos: 600, neutrofilos: 120, linfocitos: 300, bastoes: 0, monocitos: 120, eosinofilos: 60, pcr: 45, pct: 1.2, lactato: 1.8, temp: 38.5, hemocultura: "Colhida" },
    expectedDrugs: ["Piperacilina-Tazobactam"],
    clinicalTip: "Neutropenia febril: neutrófilos <500 + febre ≥38.3°C (ou ≥38°C sustentada 1h). ATB empírico <1h: cefepime ou pipe-tazo (monoterapia). Adicionar vancomicina SE: mucosite grave, cateter infectado, hipotensão, MRSA documentado. G-CSF: considerar se risco de infecção prolongada.",
    references: ["Freifeld AG et al. CID 2011", "NCCN 2023"],
  },
  {
    title: "Caso 5: Desescalonamento Guiado por Cultura",
    difficulty: "Médio",
    patient: { name: "Fátima Souza", age: 60, weight: 70, sex: "F", specialGroup: ["DM2"] },
    scenario: "Mulher 60 anos, sepse urinária tratada inicialmente com meropenem. Após 48h: melhora clínica, hemocultura positiva para E. coli sensível a ceftriaxona e amoxicilina. PCR caindo (320→120). É hora de desescalonar!",
    baseLab: { leucocitos: 12500, neutrofilos: 8750, linfocitos: 2500, bastoes: 625, monocitos: 500, eosinofilos: 125, pcr: 120, pct: 2.5, lactato: 1.5, temp: 37.2, hemocultura: "E. coli — S: Ceftriaxona, Amoxicilina, TMP-SMX" },
    expectedDrugs: ["Ceftriaxona"],
    clinicalTip: "Desescalonamento: trocar ATB amplo por dirigido ao patógeno após cultura. Meropenem → Ceftriaxona (E. coli sensível). Benefícios: menor seleção de resistência, menor custo, menos C. difficile. Critérios: melhora clínica + cultura com sensibilidade. Duração total: 7-10 dias para ITU complicada.",
    references: ["IDSA UTI Guidelines 2010", "Surviving Sepsis 2021"],
  },
];

export default function SimuladorInfeccaoLab() {
  const navigate = useNavigate();
  const location = useLocation();
  const isVirtualRoom = location.pathname.startsWith("/sala/");
  const { roomCase, isExam, enunciado } = useVirtualRoomCase(SLUG);
  const { cases: aiCases, isLoading: casesLoading, generateCase, isGenerating } = useSimulatorCases(SLUG);

  const [activeCase, setActiveCase] = useState<InfCase | null>(null);
  const [activeCaseIndex, setActiveCaseIndex] = useState<number>(0);
  const [selectedDrug, setSelectedDrug] = useState<InfDrug>(DRUGS[0]);
  const [dose, setDose] = useState(DRUGS[0].doseMin);
  const [hour, setHour] = useState(0);
  const [labValues, setLabValues] = useState<InfCase["baseLab"] | null>(null);
  const [trendData, setTrendData] = useState<any[]>([]);

  useEffect(() => {
    if (roomCase) {
      const rc = roomCase as any;
      const c: InfCase = {
        title: rc.title || "Caso da Sala Virtual", difficulty: rc.difficulty || "Médio",
        patient: rc.patient || { name: "Paciente", age: 50, weight: 70, sex: "M", specialGroup: [] },
        scenario: rc.scenario || rc.enunciado || "", baseLab: rc.baseLab || BUILT_IN_CASES[0].baseLab,
        expectedDrugs: rc.expectedDrugs || [], clinicalTip: rc.clinicalTip || "", references: rc.references || [], isAI: true,
      };
      setActiveCase(c); setLabValues(c.baseLab);
      setTrendData([{ hour: 0, pcr: c.baseLab.pcr, pct: c.baseLab.pct, lactato: c.baseLab.lactato, temp: c.baseLab.temp }]);
    }
  }, [roomCase]);

  const loadCase = useCallback((c: InfCase, idx: number) => {
    setActiveCase(c); setActiveCaseIndex(idx); setLabValues(c.baseLab); setHour(0);
    setTrendData([{ hour: 0, pcr: c.baseLab.pcr, pct: c.baseLab.pct, lactato: c.baseLab.lactato, temp: c.baseLab.temp }]);
    setSelectedDrug(DRUGS[0]); setDose(DRUGS[0].doseMin);
  }, []);

  const simulate = useCallback(() => {
    if (!labValues || !activeCase) return;
    const baseLab = activeCase.baseLab;
    const doseFraction = (dose - selectedDrug.doseMin) / Math.max(selectedDrug.doseMax - selectedDrug.doseMin, 1);
    const intensity = 0.3 + doseFraction * 0.7;

    const newTrend: any[] = [...trendData];
    let current = { ...labValues };

    for (let h = 6; h <= 48; h += 6) {
      const progress = h >= selectedDrug.hoursToEffect ? Math.min((h - selectedDrug.hoursToEffect + 1) / 24, 1) : 0;
      const pcr = Math.max(0.5, baseLab.pcr + selectedDrug.effects.pcr * intensity * progress * (baseLab.pcr / 10));
      const pct = Math.max(0.01, baseLab.pct + selectedDrug.effects.pct * intensity * progress * (baseLab.pct / 2));
      const lactato = Math.max(0.5, baseLab.lactato + selectedDrug.effects.lactato * intensity * progress);
      const temp = Math.max(36.0, baseLab.temp + selectedDrug.effects.temp * intensity * progress);
      const leucocitos = Math.max(500, baseLab.leucocitos + selectedDrug.effects.leucocitos * intensity * progress * 1000);

      current = { ...baseLab, leucocitos: Math.round(leucocitos), neutrofilos: Math.round(leucocitos * 0.7), linfocitos: Math.round(leucocitos * 0.2), bastoes: Math.round(leucocitos * 0.05), monocitos: Math.round(leucocitos * 0.04), eosinofilos: Math.round(leucocitos * 0.01), pcr: +pcr.toFixed(1), pct: +pct.toFixed(2), lactato: +lactato.toFixed(1), temp: +temp.toFixed(1), hemocultura: baseLab.hemocultura };
      newTrend.push({ hour: trendData.length * 6 + h, pcr: +pcr.toFixed(1), pct: +pct.toFixed(2), lactato: +lactato.toFixed(1), temp: +temp.toFixed(1) });
    }
    setLabValues(current); setTrendData(newTrend); setHour(prev => prev + 48);
  }, [labValues, activeCase, dose, selectedDrug, trendData]);

  const sideEffectData = useMemo(() => {
    const doseFraction = (dose - selectedDrug.doseMin) / Math.max(selectedDrug.doseMax - selectedDrug.doseMin, 1);
    return Object.entries(selectedDrug.sideEffects).map(([key, val]) => ({
      name: key === "gi" ? "GI" : key === "alergia" ? "Alergia" : key === "nefrotox" ? "Nefrotoxicidade" : "C. difficile",
      value: Math.round(Math.max(0, val * (0.5 + doseFraction * 0.8)) * 100),
    }));
  }, [selectedDrug, dose]);

  // Leucogram bar data
  const leucogramData = useMemo(() => {
    if (!labValues) return [];
    return [
      { name: "Neutr", value: labValues.neutrofilos, color: "hsl(var(--chart-1))" },
      { name: "Linf", value: labValues.linfocitos, color: "hsl(var(--chart-2))" },
      { name: "Bast", value: labValues.bastoes, color: "hsl(var(--chart-3))" },
      { name: "Mono", value: labValues.monocitos, color: "hsl(var(--chart-4))" },
      { name: "Eos", value: labValues.eosinofilos, color: "hsl(var(--chart-5))" },
    ];
  }, [labValues]);

  const simulatorState = useMemo(() => ({
    selectedDrug: selectedDrug.name, dose, labValues, sideEffectData, hour,
    spectrum: selectedDrug.spectrum,
  }), [selectedDrug, dose, labValues, sideEffectData, hour]);

  const decisions: SimDecision[] = useMemo(() => {
    if (!activeCase || !labValues) return [];
    return buildSimulatorDecisions({
      drug: selectedDrug.name, dose: `${dose} ${selectedDrug.doseUnit}`, spectrum: selectedDrug.spectrum,
      leucocitos: labValues.leucocitos, neutrofilos: labValues.neutrofilos, bastoes: labValues.bastoes,
      pcr: labValues.pcr, pct: labValues.pct, lactato: labValues.lactato, temp: labValues.temp,
      hemocultura: labValues.hemocultura,
    });
  }, [activeCase, labValues, selectedDrug, dose]);

  const gaugeColor = (val: number, low: number, high: number) => val < low ? "text-blue-400" : val > high ? "text-destructive" : "text-green-400";

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Sinais Laboratoriais de Infecção</h1>
            <p className="text-sm text-muted-foreground">Interprete leucograma, PCR, PCT e lactato para guiar antibioticoterapia</p>
          </div>
        </div>
        {isExam && enunciado && <ExamBanner enunciado={enunciado} />}
        <AdminPromptViewer toolSlug={SLUG} getNativePrompt={getNativePrompt} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {BUILT_IN_CASES.map((c, i) => (
            <NativeCaseCard key={i} title={c.title} difficulty={c.difficulty} patient={c.patient} scenario={c.scenario} onSelect={() => loadCase(c, i)} />
          ))}
          {aiCases?.map((c: any) => (
            <AICaseCard key={c.id} id={c.id} title={c.title} difficulty={c.difficulty} scenario={c.case_data?.scenario} createdBy={c.created_by} isMarketplace={c.is_marketplace}
              onSelect={() => { const cd = c.case_data as any; loadCase({ ...cd, id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, created_by: c.created_by, is_marketplace: c.is_marketplace }, -1); }} />
          ))}
        </div>
        {!isVirtualRoom && (
          <Button onClick={() => generateCase()} disabled={isGenerating} className="gap-2">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Gerar Caso com IA
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{activeCase.title}</h1>
          <p className="text-xs text-muted-foreground">{activeCase.patient.name}, {activeCase.patient.age}a, {activeCase.patient.sex}, {activeCase.patient.weight}kg</p>
        </div>
        <Badge variant="outline">{activeCase.difficulty}</Badge>
      </div>

      {isExam && enunciado && <ExamBanner enunciado={enunciado} />}
      <Card><CardContent className="pt-4"><p className="text-sm leading-relaxed">{activeCase.scenario}</p></CardContent></Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Controls */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Bug className="h-4 w-4 text-primary" /> Antibioticoterapia</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium">Antibiótico</label>
              <Select value={selectedDrug.name} onValueChange={v => { const d = DRUGS.find(x => x.name === v)!; setSelectedDrug(d); setDose(d.doseMin); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DRUGS.map(d => <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">Espectro: {selectedDrug.spectrum}</p>
            </div>
            <div>
              <label className="text-xs font-medium">Dose: {dose} {selectedDrug.doseUnit}</label>
              <Slider min={selectedDrug.doseMin} max={selectedDrug.doseMax} step={selectedDrug.doseStep} value={[dose]} onValueChange={v => setDose(v[0])} />
            </div>
            <Button onClick={simulate} className="w-full gap-2"><Play className="h-4 w-4" /> Simular 48h</Button>
          </CardContent>
        </Card>

        {/* Lab Panel */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Marcadores Inflamatórios</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {labValues && (
              <>
                {/* Key markers */}
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Leucócitos</p>
                    <p className={`text-sm font-mono font-bold ${gaugeColor(labValues.leucocitos, 4000, 11000)}`}>{(labValues.leucocitos / 1000).toFixed(1)}k</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">PCR</p>
                    <p className={`text-sm font-mono font-bold ${gaugeColor(labValues.pcr, 0, 10)}`}>{labValues.pcr}</p>
                    <p className="text-[8px] text-muted-foreground">mg/L (ref &lt;10)</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">PCT</p>
                    <p className={`text-sm font-mono font-bold ${labValues.pct > 2 ? "text-destructive" : labValues.pct > 0.5 ? "text-yellow-400" : "text-green-400"}`}>{labValues.pct}</p>
                    <p className="text-[8px] text-muted-foreground">ng/mL</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Lactato</p>
                    <p className={`text-sm font-mono font-bold ${gaugeColor(labValues.lactato, 0.5, 2.0)}`}>{labValues.lactato}</p>
                    <p className="text-[8px] text-muted-foreground">mmol/L (ref &lt;2)</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><Thermometer className="h-3 w-3" />Temp</p>
                    <p className={`text-sm font-mono font-bold ${labValues.temp > 38 ? "text-destructive" : "text-green-400"}`}>{labValues.temp}°C</p>
                  </div>
                </div>

                {/* Leucogram bars */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Leucograma Diferencial</p>
                  <div className="h-[100px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={leucogramData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                        <Bar dataKey="value" name="/mm³">
                          {leucogramData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Hemocultura */}
                <div className="bg-muted/30 rounded-lg p-2">
                  <p className="text-[10px] font-semibold text-muted-foreground">Hemocultura</p>
                  <p className="text-xs font-mono">{labValues.hemocultura}</p>
                </div>
              </>
            )}

            {trendData.length > 1 && (
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} label={{ value: "Horas", position: "insideBottom", offset: -2, fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                    <Line type="monotone" dataKey="pcr" name="PCR" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="pct" name="PCT" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="lactato" name="Lactato" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="temp" name="Temp" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Side Effects */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-destructive" /> Risco de Efeitos Adversos</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sideEffectData} layout="vertical" margin={{ top: 0, right: 10, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={90} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                <Bar dataKey="value" name="Risco %">
                  {sideEffectData.map((e, i) => <Cell key={i} fill={e.value > 30 ? "hsl(var(--destructive))" : e.value > 15 ? "hsl(38 92% 50%)" : "hsl(142 71% 45%)"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <Eye className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-primary mb-1">Dica Clínica</p>
              <p className="text-xs leading-relaxed">{activeCase.clinicalTip}</p>
              {activeCase.references.length > 0 && <p className="text-[10px] text-muted-foreground mt-1">Ref: {activeCase.references.join("; ")}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <SimulatorChallengeMode simulatorSlug={SLUG} getChallenges={getInfeccaoLabChallenges} activeCaseIndex={activeCaseIndex >= 0 ? activeCaseIndex : undefined} simulatorState={simulatorState} decisions={decisions} />
      {isExam && <ExamFeedbackOverlay decisions={decisions} />}
    </div>
  );
}
