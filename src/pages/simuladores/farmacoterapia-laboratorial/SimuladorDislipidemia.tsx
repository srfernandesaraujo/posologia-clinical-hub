import { useState, useEffect, useCallback, useMemo } from "react";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Sparkles, Loader2, Play, Eye, ShieldAlert, Heart, Activity } from "lucide-react";
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
import { getDislipidemiaLabChallenges } from "@/data/simulatorChallenges";

const SLUG = "farmacoterapia-dislipidemia";

interface LipidDrug {
  name: string; class: string;
  doseMin: number; doseMax: number; doseUnit: string; doseStep: number;
  effects: { ldl: number; hdl: number; tg: number; ct: number };
  sideEffects: { mialgia: number; hepatotox: number; gi: number; rabdomiolise: number };
  weeksToEffect: number;
}

const DRUGS: LipidDrug[] = [
  { name: "Atorvastatina", class: "Estatina alta potência", doseMin: 10, doseMax: 80, doseUnit: "mg/dia", doseStep: 10, effects: { ldl: -50, hdl: 5, tg: -20, ct: -40 }, sideEffects: { mialgia: 0.12, hepatotox: 0.05, gi: 0.08, rabdomiolise: 0.01 }, weeksToEffect: 4 },
  { name: "Rosuvastatina", class: "Estatina alta potência", doseMin: 5, doseMax: 40, doseUnit: "mg/dia", doseStep: 5, effects: { ldl: -55, hdl: 8, tg: -18, ct: -45 }, sideEffects: { mialgia: 0.10, hepatotox: 0.04, gi: 0.06, rabdomiolise: 0.008 }, weeksToEffect: 4 },
  { name: "Sinvastatina", class: "Estatina moderada potência", doseMin: 10, doseMax: 40, doseUnit: "mg/dia", doseStep: 10, effects: { ldl: -35, hdl: 4, tg: -12, ct: -28 }, sideEffects: { mialgia: 0.15, hepatotox: 0.06, gi: 0.1, rabdomiolise: 0.02 }, weeksToEffect: 4 },
  { name: "Ezetimiba", class: "Inibidor absorção colesterol", doseMin: 10, doseMax: 10, doseUnit: "mg/dia", doseStep: 10, effects: { ldl: -18, hdl: 1, tg: -5, ct: -15 }, sideEffects: { mialgia: 0.03, hepatotox: 0.02, gi: 0.08, rabdomiolise: 0 }, weeksToEffect: 2 },
  { name: "Fenofibrato", class: "Fibrato", doseMin: 160, doseMax: 250, doseUnit: "mg/dia", doseStep: 10, effects: { ldl: -5, hdl: 15, tg: -45, ct: -10 }, sideEffects: { mialgia: 0.08, hepatotox: 0.05, gi: 0.1, rabdomiolise: 0.03 }, weeksToEffect: 4 },
  { name: "Evolocumabe", class: "Inibidor PCSK9", doseMin: 140, doseMax: 420, doseUnit: "mg SC/mês", doseStep: 140, effects: { ldl: -60, hdl: 3, tg: -8, ct: -50 }, sideEffects: { mialgia: 0.02, hepatotox: 0.01, gi: 0.03, rabdomiolise: 0 }, weeksToEffect: 2 },
  { name: "Ômega-3 (EPA/DHA)", class: "Ácido graxo", doseMin: 1, doseMax: 4, doseUnit: "g/dia", doseStep: 1, effects: { ldl: 2, hdl: 2, tg: -30, ct: -3 }, sideEffects: { mialgia: 0, hepatotox: 0, gi: 0.1, rabdomiolise: 0 }, weeksToEffect: 8 },
];

interface LipidCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  created_by?: string; is_marketplace?: boolean;
  patient: { name: string; age: number; weight: number; sex: string; specialGroup: string[] };
  scenario: string;
  baseLab: { ct: number; ldl: number; hdl: number; tg: number; apoB: number; cpk: number };
  riskLevel: string; // "baixo" | "intermediário" | "alto" | "muito alto"
  ldlTarget: number;
  expectedDrugs: string[];
  clinicalTip: string;
  references: string[];
}

const BUILT_IN_CASES: LipidCase[] = [
  {
    title: "Caso 1: Risco Alto — LDL 180 + Meta <70",
    difficulty: "Médio",
    patient: { name: "Carlos Mendes", age: 55, weight: 85, sex: "M", specialGroup: ["DM2", "HAS"] },
    scenario: "Homem 55 anos, DM2 e HAS. Sem evento cardiovascular prévio, mas ERG >20%. CT 280, LDL 180, HDL 38, TG 220. Meta LDL <70 mg/dL (risco alto). Necessita redução de ~61% do LDL — apenas estatina de alta potência em dose máxima.",
    baseLab: { ct: 280, ldl: 180, hdl: 38, tg: 220, apoB: 160, cpk: 120 },
    riskLevel: "alto", ldlTarget: 70,
    expectedDrugs: ["Atorvastatina"],
    clinicalTip: "Risco alto: DM2 + outro fator. Meta LDL <70. Atorvastatina 40-80mg ou Rosuvastatina 20-40mg reduzem LDL em 50-60%. Se não atingir meta, adicionar ezetimiba (+15-20%). Fórmula de Friedewald: LDL = CT - HDL - (TG/5). Válida apenas se TG <400.",
    references: ["2019 ESC/EAS Dyslipidemia Guidelines", "AHA/ACC 2018"],
  },
  {
    title: "Caso 2: Intolerância à Estatina (Mialgia + CPK)",
    difficulty: "Médio",
    patient: { name: "Maria Teresa", age: 62, weight: 65, sex: "F", specialGroup: ["Hipotiroidismo"] },
    scenario: "Mulher 62 anos, LDL 165, em uso de sinvastatina 40mg. Queixa de mialgia intensa em MMII há 3 semanas. CPK 680 (3× LSN). Hipotiroidismo (fator de risco para miopatia). Avaliar troca de estatina ou alternativas.",
    baseLab: { ct: 250, ldl: 165, hdl: 52, tg: 145, apoB: 135, cpk: 680 },
    riskLevel: "intermediário", ldlTarget: 100,
    expectedDrugs: ["Rosuvastatina"],
    clinicalTip: "Intolerância à estatina: suspender se mialgia + CPK >5× LSN ou mialgia intolerável mesmo com CPK normal. Trocar por estatina de menor miotoxicidade (rosuvastatina, pravastatina, pitavastatina). Se intolerância a 2+ estatinas: ezetimiba ± iPCSK9. Corrigir hipotiroidismo (aumenta risco de miopatia).",
    references: ["ACC Expert Consensus 2015"],
  },
  {
    title: "Caso 3: Hipertrigliceridemia Isolada >500",
    difficulty: "Difícil",
    patient: { name: "Roberto Alves", age: 45, weight: 95, sex: "M", specialGroup: ["Etilista", "Obesidade"] },
    scenario: "Homem 45 anos, obeso, etilista social. TG 850 mg/dL (risco de pancreatite aguda!). CT 320, HDL 28, LDL não calculável (TG >400). Prioridade: reduzir TG para <500 (prevenir pancreatite), depois tratar LDL.",
    baseLab: { ct: 320, ldl: 0, hdl: 28, tg: 850, apoB: 140, cpk: 90 },
    riskLevel: "alto", ldlTarget: 70,
    expectedDrugs: ["Fenofibrato"],
    clinicalTip: "TG >500: risco de pancreatite aguda. 1ª linha: fibrato (fenofibrato 250mg ou bezafibrato). Medidas: abstinência alcoólica, perda de peso, restrição de carboidratos simples. Ômega-3 em dose alta (4g/dia) como adjuvante. NÃO calcular LDL por Friedewald se TG >400 — usar LDL direto ou Apo-B.",
    references: ["Berglund L et al. JCEM 2012", "AHA/ACC 2018"],
  },
  {
    title: "Caso 4: Pós-IAM — Risco Muito Alto",
    difficulty: "Difícil",
    patient: { name: "Antônio Ferreira", age: 58, weight: 78, sex: "M", specialGroup: ["IAM prévio", "Stent"] },
    scenario: "Homem 58 anos, 3 meses pós-IAM com stent em DA. Em uso de atorvastatina 80mg. LDL atual: 82 mg/dL. Meta <50 (risco MUITO alto). Necessita terapia combinada para atingir meta.",
    baseLab: { ct: 185, ldl: 82, hdl: 45, tg: 160, apoB: 95, cpk: 140 },
    riskLevel: "muito alto", ldlTarget: 50,
    expectedDrugs: ["Ezetimiba"],
    clinicalTip: "Pós-IAM = risco muito alto. Meta LDL <50 (ESC) ou <55 + redução >50%. Com atorvastatina 80mg (LDL 82→ precisa ~40% adicional): adicionar ezetimiba (+15-20%). Se ainda não atingir: iPCSK9 (evolocumabe/alirocumabe). Benefício comprovado em IMPROVE-IT e FOURIER.",
    references: ["IMPROVE-IT Trial", "FOURIER Trial", "ESC 2019"],
  },
  {
    title: "Caso 5: Dislipidemia Familiar — LDL Refratário",
    difficulty: "Difícil",
    patient: { name: "Patrícia Lima", age: 35, weight: 60, sex: "F", specialGroup: ["HF heterozigota"] },
    scenario: "Mulher 35 anos com hipercolesterolemia familiar heterozigota (mutação LDLR). LDL 320 desde a juventude. Xantomas tendíneos. Em uso de rosuvastatina 40mg + ezetimiba 10mg, LDL ainda 180. Candidata a iPCSK9.",
    baseLab: { ct: 380, ldl: 180, hdl: 55, tg: 110, apoB: 180, cpk: 100 },
    riskLevel: "muito alto", ldlTarget: 50,
    expectedDrugs: ["Evolocumabe"],
    clinicalTip: "HF heterozigota: prevalência 1:250. LDL basal tipicamente >190. Terapia escalonada: estatina máxima → +ezetimiba → +iPCSK9. Evolocumabe 140mg SC a cada 2 semanas reduz LDL adicional em ~60%. Rastreamento familiar em cascata (parentes de 1º grau). Sem tratamento: risco de DAC prematura 20× maior.",
    references: ["ESC/EAS HF Guidelines 2020", "Nordestgaard BG et al. EHJ 2013"],
  },
];

export default function SimuladorDislipidemia() {
  const navigate = useNavigate();
  const location = useLocation();
  const isVirtualRoom = location.pathname.startsWith("/sala/");
  const { roomCase, isExam, enunciado } = useVirtualRoomCase(SLUG);
  const { cases: aiCases, isLoading: casesLoading, generateCase, isGenerating } = useSimulatorCases(SLUG);

  const [activeCase, setActiveCase] = useState<LipidCase | null>(null);
  const [activeCaseIndex, setActiveCaseIndex] = useState<number>(0);
  const [selectedDrug, setSelectedDrug] = useState<LipidDrug>(DRUGS[0]);
  const [dose, setDose] = useState(DRUGS[0].doseMin);
  const [week, setWeek] = useState(0);
  const [labValues, setLabValues] = useState<LipidCase["baseLab"] | null>(null);
  const [trendData, setTrendData] = useState<any[]>([]);

  useEffect(() => {
    if (roomCase) {
      const rc = roomCase as any;
      const c: LipidCase = {
        title: rc.title || "Caso da Sala Virtual", difficulty: rc.difficulty || "Médio",
        patient: rc.patient || { name: "Paciente", age: 50, weight: 70, sex: "M", specialGroup: [] },
        scenario: rc.scenario || rc.enunciado || "", baseLab: rc.baseLab || BUILT_IN_CASES[0].baseLab,
        riskLevel: rc.riskLevel || "alto", ldlTarget: rc.ldlTarget || 70,
        expectedDrugs: rc.expectedDrugs || [], clinicalTip: rc.clinicalTip || "", references: rc.references || [], isAI: true,
      };
      setActiveCase(c); setLabValues(c.baseLab);
      setTrendData([{ week: 0, ldl: c.baseLab.ldl, hdl: c.baseLab.hdl, tg: c.baseLab.tg, ct: c.baseLab.ct }]);
    }
  }, [roomCase]);

  const loadCase = useCallback((c: LipidCase, idx: number) => {
    setActiveCase(c); setActiveCaseIndex(idx); setLabValues(c.baseLab); setWeek(0);
    setTrendData([{ week: 0, ldl: c.baseLab.ldl, hdl: c.baseLab.hdl, tg: c.baseLab.tg, ct: c.baseLab.ct }]);
    setSelectedDrug(DRUGS[0]); setDose(DRUGS[0].doseMin);
  }, []);

  const simulate = useCallback(() => {
    if (!labValues || !activeCase) return;
    const baseLab = activeCase.baseLab;
    const doseFraction = (dose - selectedDrug.doseMin) / Math.max(selectedDrug.doseMax - selectedDrug.doseMin, 1);
    const intensity = 0.3 + doseFraction * 0.7;

    const newTrend: any[] = [...trendData];
    let current = { ...labValues };

    for (let w = 1; w <= 8; w++) {
      const progress = w >= selectedDrug.weeksToEffect ? Math.min((w - selectedDrug.weeksToEffect + 1) / 6, 1) : 0;
      const ldl = Math.max(20, baseLab.ldl + (selectedDrug.effects.ldl * intensity * progress * baseLab.ldl) / 100);
      const hdl = Math.max(20, baseLab.hdl + (selectedDrug.effects.hdl * intensity * progress * baseLab.hdl) / 100);
      const tg = Math.max(30, baseLab.tg + (selectedDrug.effects.tg * intensity * progress * baseLab.tg) / 100);
      const ct = Math.max(80, baseLab.ct + (selectedDrug.effects.ct * intensity * progress * baseLab.ct) / 100);

      current = { ...baseLab, ldl: Math.round(ldl), hdl: Math.round(hdl), tg: Math.round(tg), ct: Math.round(ct), apoB: Math.round(ldl * 0.9), cpk: baseLab.cpk };
      newTrend.push({ week: trendData.length + w - 1, ldl: Math.round(ldl), hdl: Math.round(hdl), tg: Math.round(tg), ct: Math.round(ct) });
    }
    setLabValues(current); setTrendData(newTrend); setWeek(prev => prev + 8);
  }, [labValues, activeCase, dose, selectedDrug, trendData]);

  const sideEffectData = useMemo(() => {
    const doseFraction = (dose - selectedDrug.doseMin) / Math.max(selectedDrug.doseMax - selectedDrug.doseMin, 1);
    return Object.entries(selectedDrug.sideEffects).map(([key, val]) => ({
      name: key === "mialgia" ? "Mialgia" : key === "hepatotox" ? "Hepatotoxicidade" : key === "gi" ? "GI" : "Rabdomiólise",
      value: Math.round(Math.max(0, val * (0.5 + doseFraction * 0.8)) * 100),
    }));
  }, [selectedDrug, dose]);

  const atTarget = labValues && activeCase ? labValues.ldl <= activeCase.ldlTarget : false;
  const ldlReduction = labValues && activeCase ? Math.round(((activeCase.baseLab.ldl - labValues.ldl) / activeCase.baseLab.ldl) * 100) : 0;

  const simulatorState = useMemo(() => ({
    selectedDrug: selectedDrug.name, dose, labValues, sideEffectData, week,
    atTarget, ldlReduction, ldlTarget: activeCase?.ldlTarget, riskLevel: activeCase?.riskLevel,
  }), [selectedDrug, dose, labValues, sideEffectData, week, atTarget, ldlReduction, activeCase]);

  const decisions: SimDecision[] = useMemo(() => {
    if (!activeCase || !labValues) return [];
    return buildSimulatorDecisions({
      drug: selectedDrug.name, dose: `${dose} ${selectedDrug.doseUnit}`,
      ldl: labValues.ldl, hdl: labValues.hdl, tg: labValues.tg, ct: labValues.ct,
      ldlTarget: activeCase.ldlTarget, riskLevel: activeCase.riskLevel,
      atTarget: atTarget ? "SIM" : "NÃO", ldlReduction: `${ldlReduction}%`,
    });
  }, [activeCase, labValues, selectedDrug, dose, atTarget, ldlReduction]);

  const riskBadgeColor = (r: string) => r === "muito alto" ? "bg-red-500/20 text-red-400" : r === "alto" ? "bg-orange-500/20 text-orange-400" : r === "intermediário" ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400";

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Dislipidemia e Risco Cardiovascular</h1>
            <p className="text-sm text-muted-foreground">Interprete lipidograma, calcule risco CV e ajuste hipolipemiantes</p>
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
        <Badge className={riskBadgeColor(activeCase.riskLevel)}>Risco {activeCase.riskLevel}</Badge>
        <Badge variant="outline">{activeCase.difficulty}</Badge>
      </div>

      {isExam && enunciado && <ExamBanner enunciado={enunciado} />}
      <Card><CardContent className="pt-4"><p className="text-sm leading-relaxed">{activeCase.scenario}</p></CardContent></Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Controls */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Heart className="h-4 w-4 text-primary" /> Hipolipemiante</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium">Fármaco</label>
              <Select value={selectedDrug.name} onValueChange={v => { const d = DRUGS.find(x => x.name === v)!; setSelectedDrug(d); setDose(d.doseMin); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DRUGS.map(d => <SelectItem key={d.name} value={d.name}>{d.name} ({d.class})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium">Dose: {dose} {selectedDrug.doseUnit}</label>
              <Slider min={selectedDrug.doseMin} max={selectedDrug.doseMax} step={selectedDrug.doseStep} value={[dose]} onValueChange={v => setDose(v[0])} />
            </div>
            {/* LDL Target */}
            <div className={`rounded-lg p-3 ${atTarget ? "bg-green-500/10 border border-green-500/30" : "bg-destructive/10 border border-destructive/30"}`}>
              <p className="text-xs font-semibold">Meta LDL: &lt;{activeCase.ldlTarget} mg/dL</p>
              <p className="text-lg font-mono font-bold">{labValues?.ldl ?? "—"} <span className="text-xs font-normal">mg/dL</span></p>
              <p className="text-[10px]">{atTarget ? "✅ Meta atingida!" : `❌ Faltam ${(labValues?.ldl ?? 0) - activeCase.ldlTarget} mg/dL`} (redução: {ldlReduction}%)</p>
            </div>
            <Button onClick={simulate} className="w-full gap-2"><Play className="h-4 w-4" /> Simular 8 semanas</Button>
          </CardContent>
        </Card>

        {/* Lab Panel */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Lipidograma</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {labValues && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { label: "CT", value: labValues.ct, unit: "mg/dL", low: 0, high: 200, max: 500, color: labValues.ct > 200 ? "text-destructive" : "text-green-400" },
                  { label: "LDL", value: labValues.ldl, unit: "mg/dL", low: 0, high: activeCase.ldlTarget, max: 400, color: labValues.ldl > activeCase.ldlTarget ? "text-destructive" : "text-green-400" },
                  { label: "HDL", value: labValues.hdl, unit: "mg/dL", low: 40, high: 999, max: 100, color: labValues.hdl < 40 ? "text-destructive" : "text-green-400" },
                  { label: "TG", value: labValues.tg, unit: "mg/dL", low: 0, high: 150, max: 1000, color: labValues.tg > 500 ? "text-destructive" : labValues.tg > 150 ? "text-yellow-400" : "text-green-400" },
                  { label: "Apo-B", value: labValues.apoB, unit: "mg/dL", low: 0, high: 100, max: 250, color: labValues.apoB > 100 ? "text-destructive" : "text-green-400" },
                  { label: "CPK", value: labValues.cpk, unit: "U/L", low: 30, high: 200, max: 2000, color: labValues.cpk > 200 ? "text-destructive" : "text-green-400" },
                ].map(g => (
                  <div key={g.label} className="bg-muted/50 rounded-lg p-2 text-center space-y-1">
                    <p className="text-[10px] text-muted-foreground">{g.label}</p>
                    <p className={`text-sm font-mono font-bold ${g.color}`}>{g.value}</p>
                    <p className="text-[8px] text-muted-foreground">{g.unit}</p>
                  </div>
                ))}
              </div>
            )}

            {trendData.length > 1 && (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} label={{ value: "Semana", position: "insideBottom", offset: -2, fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                    <Line type="monotone" dataKey="ldl" name="LDL" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="hdl" name="HDL" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="tg" name="TG" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 2 }} />
                    <ReferenceLine y={activeCase?.ldlTarget || 70} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ value: `Meta LDL`, fontSize: 9 }} />
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
              <BarChart data={sideEffectData} layout="vertical" margin={{ top: 0, right: 10, left: 70, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={100} />
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

      <SimulatorChallengeMode simulatorSlug={SLUG} getChallenges={getDislipidemiaLabChallenges} activeCaseIndex={activeCaseIndex >= 0 ? activeCaseIndex : undefined} simulatorState={simulatorState} decisions={decisions} />
      {isExam && <ExamFeedbackOverlay decisions={decisions} />}
    </div>
  );
}
