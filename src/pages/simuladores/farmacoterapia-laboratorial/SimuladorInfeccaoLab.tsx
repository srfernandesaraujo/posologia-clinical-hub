import { useState, useEffect, useCallback, useMemo } from "react";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Sparkles, Loader2, Play, Eye, Bug, Activity, ShieldAlert, Thermometer } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { ShareToolButton } from "@/components/ShareToolButton";
import { useIsEmbed, useEmbedCaseId } from "@/contexts/EmbedContext";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getInfeccaoLabChallenges } from "@/data/simulatorChallenges";

const SLUG = "farmacoterapia-infeccao-lab";

interface InfDrug {
  name: string; class: string; doseMin: number; doseMax: number; doseUnit: string; doseStep: number;
  effects: { leucocitos: number; pcr: number; pct: number; lactato: number; temp: number };
  sideEffects: { gi: number; alergia: number; nefrotox: number; cDiff: number };
  hoursToEffect: number; spectrum: string;
  // --- Opcionais (revisão dos desafios): casos por IA e do marketplace não precisam deles ---
  /** Alvo do fármaco: "virus" (antiviral) ou "bacteria" (padrão). Só importa nos casos com `cobertura`. */
  alvo?: "bacteria" | "virus";
  /** Conduta sem dose (slider oculto). */
  noDose?: boolean;
  /** Pseudo-fármaco "Sem antimicrobiano": nada é tratado, os marcadores ficam no valor do caso. */
  semAntimicrobiano?: boolean;
}

/**
 * Resposta dos marcadores a um antibacteriano com cobertura ADEQUADA do agente do caso (perfil único: com o agente coberto,
 * o espectro mais amplo não derruba mais o PCR; o que muda é o custo ecológico). Só vale nos casos com `cobertura`.
 */
const PERFIL_ANTIBACTERIANO = { leucocitos: -3, pcr: -5, pct: -0.5, lactato: -0.3, temp: -0.8 };
/** Multiplicador do efeito conforme a cobertura (didático): adequada 1, parcial 0,4, inadequada 0. */
const MULT_COBERTURA = { adequada: 1, parcial: 0.4, inadequada: 0, nenhuma: 0 } as const;
type StatusCobertura = keyof typeof MULT_COBERTURA;

function coberturaDoFarmaco(drug: InfDrug, caso?: Pick<InfCase, "cobertura">): { status: StatusCobertura; amploDemais: boolean } | null {
  const c = caso?.cobertura;
  if (!c) return null;
  if (drug.semAntimicrobiano) return { status: "nenhuma", amploDemais: false };
  if (c.adequada.includes(drug.name)) return { status: "adequada", amploDemais: !!c.amploDemais?.includes(drug.name) };
  if (c.parcial?.includes(drug.name)) return { status: "parcial", amploDemais: false };
  return { status: "inadequada", amploDemais: false };
}

const DRUGS: InfDrug[] = [
  { name: "Amoxicilina", class: "Penicilina", doseMin: 500, doseMax: 1500, doseUnit: "mg 8/8h", doseStep: 250, effects: { leucocitos: -2, pcr: -3, pct: -0.3, lactato: -0.2, temp: -0.5 }, sideEffects: { gi: 0.15, alergia: 0.1, nefrotox: 0.02, cDiff: 0.05 }, hoursToEffect: 6, spectrum: "Gram+ e alguns Gram-" },
  { name: "Ceftriaxona", class: "Cef 3ª", doseMin: 1, doseMax: 4, doseUnit: "g/dia EV", doseStep: 1, effects: { leucocitos: -3, pcr: -5, pct: -0.5, lactato: -0.3, temp: -0.8 }, sideEffects: { gi: 0.1, alergia: 0.08, nefrotox: 0.03, cDiff: 0.1 }, hoursToEffect: 4, spectrum: "Amplo Gram+/Gram-" },
  { name: "Piperacilina-Tazobactam", class: "Pen+inib βlact", doseMin: 4.5, doseMax: 18, doseUnit: "g/dia EV", doseStep: 4.5, effects: { leucocitos: -4, pcr: -6, pct: -0.8, lactato: -0.5, temp: -1.0 }, sideEffects: { gi: 0.12, alergia: 0.08, nefrotox: 0.05, cDiff: 0.08 }, hoursToEffect: 3, spectrum: "Amplo + anaeróbios" },
  { name: "Vancomicina", class: "Glicopeptídeo", doseMin: 500, doseMax: 2000, doseUnit: "mg EV 12/12h", doseStep: 250, effects: { leucocitos: -2, pcr: -4, pct: -0.4, lactato: -0.2, temp: -0.6 }, sideEffects: { gi: 0.05, alergia: 0.12, nefrotox: 0.2, cDiff: 0.03 }, hoursToEffect: 4, spectrum: "Gram+ (MRSA)" },
  { name: "Meropenem", class: "Carbapenêmico", doseMin: 1, doseMax: 6, doseUnit: "g/dia EV", doseStep: 1, effects: { leucocitos: -5, pcr: -8, pct: -1.0, lactato: -0.6, temp: -1.2 }, sideEffects: { gi: 0.08, alergia: 0.05, nefrotox: 0.03, cDiff: 0.12 }, hoursToEffect: 2, spectrum: "Ultra-amplo" },
  // Oseltamivir: o efeito antigo sobre os leucócitos (+0,5) não tem base clínica e foi zerado.
  { name: "Oseltamivir", class: "Antiviral", doseMin: 75, doseMax: 150, doseUnit: "mg 12/12h", doseStep: 75, effects: { leucocitos: 0, pcr: -1, pct: 0, lactato: -0.1, temp: -0.5 }, sideEffects: { gi: 0.2, alergia: 0.02, nefrotox: 0.01, cDiff: 0 }, hoursToEffect: 12, spectrum: "Influenza A/B", alvo: "virus" },
  { name: "Sem antimicrobiano (observação)", class: "Conduta", doseMin: 1, doseMax: 1, doseUnit: "", doseStep: 1, effects: { leucocitos: 0, pcr: 0, pct: 0, lactato: 0, temp: 0 }, sideEffects: { gi: 0, alergia: 0, nefrotox: 0, cDiff: 0 }, hoursToEffect: 0, spectrum: "Nenhum", noDose: true, semAntimicrobiano: true },
];

interface InfCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; age: number; weight: number; sex: string; specialGroup: string[]; diagnosis?: string };
  scenario: string;
  baseLab: { leucocitos: number; neutrofilos: number; linfocitos: number; bastoes: number; pcr: number; pct: number; lactato: number; temp: number; hemocultura: string };
  expectedDrugs: string[]; clinicalTip: string; references: string[];
  /**
   * Opcional. Cobertura de cada fármaco para o agente provável do caso: `adequada` (efeito integral), `parcial` (40%) e,
   * fora das listas, inadequada (sem efeito nos marcadores). `amploDemais` marca as adequadas com espectro maior que o necessário.
   * Casos sem este campo (IA, marketplace) mantêm o comportamento antigo (todo fármaco age pelo próprio perfil).
   */
  cobertura?: { agentes: string; adequada: string[]; parcial?: string[]; amploDemais?: string[] };
}

const BUILT_IN_CASES: InfCase[] = [
  { title: "Caso 1: Pedro Almeida", difficulty: "Fácil", patient: { name: "Pedro Almeida", age: 55, weight: 80, sex: "M", specialGroup: ["DM2", "DPOC"], diagnosis: "PAC moderada — leucocitose com desvio, PCR e PCT altos" }, scenario: "Homem de 55 anos, 80 kg, DM2 e DPOC, com tosse produtiva e febre há 3 dias. Temperatura 39,0 °C e consolidação lobar na radiografia. Leucócitos 18.500/mm³ com 8% de bastões (1.480), PCR 180 mg/L, PCT 3,5 ng/mL e lactato 2,2 mmol/L. Sem alergia a penicilinas. Os marcadores da tela mostram o valor projetado para 48 h depois da conduta escolhida.", baseLab: { leucocitos: 18500, neutrofilos: 14800, linfocitos: 1850, bastoes: 1480, pcr: 180, pct: 3.5, lactato: 2.2, temp: 39.0, hemocultura: "Pendente" }, expectedDrugs: ["Ceftriaxona"], cobertura: { agentes: "Streptococcus pneumoniae e Haemophilus influenzae (PAC em paciente com DPOC)", adequada: ["Ceftriaxona", "Piperacilina-Tazobactam", "Meropenem"], parcial: ["Amoxicilina", "Vancomicina"], amploDemais: ["Piperacilina-Tazobactam", "Meropenem"] }, clinicalTip: "PAC com comorbidades: β-lactâmico (ceftriaxona 1-2 g/dia) + macrolídeo para atípicos (não modelado aqui). PCR >100 e PCT >2 favorecem etiologia bacteriana. Duração mínima de 5 dias, com estabilidade clínica por 48-72 h.", references: ["Metlay JP. Am J Respir Crit Care Med 2019 (ATS/IDSA)", "Schuetz P. Cochrane Database Syst Rev 2017"] },
  { title: "Caso 2: Ana Clara", difficulty: "Difícil", patient: { name: "Ana Clara", age: 42, weight: 65, sex: "F", specialGroup: [], diagnosis: "Sepse de foco urinário — hipotensão e lactato > 4" }, scenario: "Mulher de 42 anos, 65 kg, com pielonefrite: temperatura 39,5 °C, PA 85x50 mmHg (PAM ≈ 62), FC 120 bpm, FR 24 irpm, orientada. Teve ITU de repetição tratada com ceftriaxona há um mês. Leucócitos 24.000/mm³ (9% de bastões), PCR 320 mg/L, PCT 15 ng/mL e lactato 5,2 mmol/L. Hemoculturas pendentes. Os marcadores da tela mostram o valor projetado para 48 h depois da conduta escolhida.", baseLab: { leucocitos: 24000, neutrofilos: 20400, linfocitos: 1200, bastoes: 2160, pcr: 320, pct: 15, lactato: 5.2, temp: 39.5, hemocultura: "Pendente" }, expectedDrugs: ["Piperacilina-Tazobactam", "Meropenem"], cobertura: { agentes: "Enterobactérias (E. coli), com risco de resistência pelo uso recente de ceftriaxona", adequada: ["Piperacilina-Tazobactam", "Meropenem"], parcial: ["Ceftriaxona"] }, clinicalTip: "Sepse (hipotensão + lactato >4): hemoculturas e antibiótico em até 1 h, cristaloide 30 mL/kg, reavaliar lactato e PAM. O espectro se escolhe pelo risco de resistência (aqui, ceftriaxona recente) e se ajusta pela cultura.", references: ["Evans L. Crit Care Med 2021 (Surviving Sepsis Campaign)"] },
  { title: "Caso 3: Juliana Fernandes", difficulty: "Fácil", patient: { name: "Juliana Fernandes", age: 30, weight: 58, sex: "F", specialGroup: [], diagnosis: "Síndrome gripal — PCR e PCT baixos, linfocitose relativa" }, scenario: "Mulher de 30 anos, 58 kg, sem comorbidades, com febre 38,2 °C, mialgia e coriza há 24 horas; vários colegas de trabalho com o mesmo quadro. Leucócitos 5.200/mm³ (40% neutrófilos, 50% linfócitos), PCR 15 mg/L, PCT 0,08 ng/mL e lactato 1,0 mmol/L. Hemocultura não indicada. Os marcadores da tela mostram o valor projetado para 48 h depois da conduta escolhida.", baseLab: { leucocitos: 5200, neutrofilos: 2080, linfocitos: 2600, bastoes: 52, pcr: 15, pct: 0.08, lactato: 1.0, temp: 38.2, hemocultura: "Não indicada" }, expectedDrugs: ["Sem antimicrobiano (observação)", "Oseltamivir"], cobertura: { agentes: "Vírus respiratório (síndrome gripal)", adequada: ["Oseltamivir"] }, clinicalTip: "Perfil viral: leucócitos normais com linfocitose relativa, PCR <50 e PCT <0,25 → sem antibiótico. Oseltamivir pode ser considerado se influenza suspeita e início há menos de 48 h (indicado sobretudo em risco alto ou doença grave). A duração dos sintomas não é modelada aqui.", references: ["Uyeki TM. Clin Infect Dis 2019 (IDSA, influenza)", "Schuetz P. Cochrane Database Syst Rev 2017"] },
  { title: "Caso 4: Ricardo Campos", difficulty: "Difícil", patient: { name: "Ricardo Campos", age: 48, weight: 72, sex: "M", specialGroup: ["Leucemia", "QT"], diagnosis: "Neutropenia febril de alto risco" }, scenario: "Homem de 48 anos, 72 kg, leucemia aguda em quimioterapia (ciclo 3, dia 10), com cateter venoso central. Febre de 38,5 °C aferida duas vezes com 1 h de intervalo; sem hipotensão e sem foco localizado. Leucócitos 600/mm³, neutrófilos 120/mm³ (esperados abaixo de 100 por mais de 7 dias), PCR 45 mg/L, PCT 1,2 ng/mL e lactato 1,8 mmol/L. Hemoculturas de cateter e periférica já colhidas. Os marcadores da tela mostram o valor projetado para 48 h depois da conduta escolhida.", baseLab: { leucocitos: 600, neutrofilos: 120, linfocitos: 300, bastoes: 0, pcr: 45, pct: 1.2, lactato: 1.8, temp: 38.5, hemocultura: "Colhida" }, expectedDrugs: ["Piperacilina-Tazobactam", "Meropenem"], cobertura: { agentes: "Bacilos Gram-negativos, incluindo Pseudomonas aeruginosa, e cocos Gram-positivos", adequada: ["Piperacilina-Tazobactam", "Meropenem"] }, clinicalTip: "Neutropenia febril (neutrófilos <500): β-lactâmico antipseudomonas em monoterapia na 1ª hora; vancomicina só com indicação específica (instabilidade, infecção de cateter ou pele, pneumonia, colonização por MRSA). PCR e PCT subestimam a gravidade; a contagem de neutrófilos recupera por conta da medula, não do antibiótico.", references: ["Freifeld AG. Clin Infect Dis 2011;52:e56-e93 (IDSA)"] },
  { title: "Caso 5: Fátima Souza", difficulty: "Médio", patient: { name: "Fátima Souza", age: 60, weight: 70, sex: "F", specialGroup: ["DM2"], diagnosis: "Sepse urinária em melhora — desescalonamento" }, scenario: "Mulher de 60 anos, 70 kg, DM2, internada com sepse de foco urinário (PCT na admissão 12,5 ng/mL, lactato 5,0 mmol/L) e em meropenem 1 g 8/8 h há 48 h. Hoje está afebril (37,2 °C), com lactato 1,5 mmol/L, leucócitos 12.500/mm³ (5% de bastões), PCR 120 mg/L e PCT 2,5 ng/mL. A hemocultura cresceu E. coli sensível a ceftriaxona, amoxicilina e SMX-TMP. Os marcadores da tela são os de hoje; o simulador projeta as próximas 48 h com a conduta que você escolher.", baseLab: { leucocitos: 12500, neutrofilos: 8750, linfocitos: 2500, bastoes: 625, pcr: 120, pct: 2.5, lactato: 1.5, temp: 37.2, hemocultura: "E. coli S: Ceftriaxona, Amox, TMP-SMX" }, expectedDrugs: ["Ceftriaxona"], cobertura: { agentes: "E. coli da hemocultura (sensível a ceftriaxona, amoxicilina e SMX-TMP)", adequada: ["Amoxicilina", "Ceftriaxona", "Piperacilina-Tazobactam", "Meropenem"], amploDemais: ["Piperacilina-Tazobactam", "Meropenem"] }, clinicalTip: "Desescalonamento: com a cultura, trocar o carbapenêmico por um β-lactâmico dirigido de menor espectro (ceftriaxona), sem perda de eficácia. Em bacteremia por Gram-negativo de foco urinário com boa resposta, 7 dias de terapia efetiva bastam; não se mantém o espectro amplo pelo valor do PCR.", references: ["Evans L. Crit Care Med 2021 (Surviving Sepsis Campaign)", "Yahav D. Clin Infect Dis 2019 (7 versus 14 dias)"] },
];

function computeSimulation(drug: InfDrug, dose: number, baseLab: InfCase["baseLab"], caso?: Pick<InfCase, "cobertura">) {
  const doseFrac = (dose - drug.doseMin) / Math.max(drug.doseMax - drug.doseMin, 1);
  const intensity = 0.65 + doseFrac * 0.35;
  // Casos com `cobertura`: antivirais usam o próprio perfil, antibacterianos o perfil único, tudo × multiplicador da cobertura.
  // Sem `cobertura` (casos por IA/marketplace) vale o perfil antigo de cada fármaco.
  const cov = coberturaDoFarmaco(drug, caso);
  const base = cov ? (drug.alvo === "virus" ? drug.effects : PERFIL_ANTIBACTERIANO) : drug.effects;
  const mult = cov ? MULT_COBERTURA[cov.status] : 1;
  const eff = { leucocitos: base.leucocitos * mult, pcr: base.pcr * mult, pct: base.pct * mult, lactato: base.lactato * mult, temp: base.temp * mult };
  const trend: any[] = [];
  for (let h = 0; h <= 48; h += 6) {
    const p = h >= drug.hoursToEffect ? Math.min((h - drug.hoursToEffect + 1) / 24, 1) : 0;
    const leucDelta = eff.leucocitos * intensity * p * (baseLab.leucocitos / 10);
    // Controlar infecção não empurra um leucograma já baixo (neutropenia) ainda mais para baixo —
    // a recuperação medular depende de fatores não modelados aqui (ex: G-CSF). O efeito só se aplica
    // quando reduz uma leucocitose em direção ao normal.
    const leucFinal = baseLab.leucocitos < 4000 && leucDelta < 0 ? baseLab.leucocitos : baseLab.leucocitos + leucDelta;
    trend.push({ hour: h, pcr: +(Math.max(0.5, baseLab.pcr + eff.pcr * intensity * p * (baseLab.pcr / 10))).toFixed(1), pct: +(Math.max(0.01, baseLab.pct + eff.pct * intensity * p * (baseLab.pct / 2))).toFixed(2), lactato: +(Math.max(0.5, baseLab.lactato + eff.lactato * intensity * p)).toFixed(1), temp: +(Math.max(36, baseLab.temp + eff.temp * intensity * p)).toFixed(1), leucocitos: Math.max(200, Math.round(leucFinal)) });
  }
  const last = trend[trend.length - 1];
  const sideEffects = Object.entries(drug.sideEffects).map(([k, v]) => ({ name: k === "gi" ? "GI" : k === "alergia" ? "Alergia" : k === "nefrotox" ? "Nefrotoxicidade" : "C. difficile", risco: Math.round(Math.max(0, v * (0.5 + doseFrac * 0.8)) * 100) }));
  // Differential escala proporcionalmente ao total de leucócitos tratado, mantendo a mesma composição relativa do caso.
  const leucRatio = last.leucocitos / Math.max(baseLab.leucocitos, 1);
  const leucogramData = [
    { name: "Neutr", valor: Math.round(baseLab.neutrofilos * leucRatio) },
    { name: "Linf", valor: Math.round(baseLab.linfocitos * leucRatio) },
    { name: "Bast", valor: Math.round(baseLab.bastoes * leucRatio) },
  ];
  const neutAbs = leucogramData[0].valor;
  const labGauges = [
    { name: "Leucócitos", value: last.leucocitos, unit: "/mm³", status: last.leucocitos < 4000 ? "baixo" : last.leucocitos > 11000 ? "alto" : "normal" },
    { name: "Neutrófilos", value: neutAbs, unit: "/mm³", status: neutAbs < 1500 ? "baixo" : neutAbs > 7700 ? "alto" : "normal" },
    { name: "PCR", value: last.pcr, unit: "mg/L", status: last.pcr > 10 ? "alto" : "normal" },
    { name: "PCT", value: last.pct, unit: "ng/mL", status: last.pct > 0.5 ? "alto" : "normal" },
    { name: "Lactato", value: last.lactato, unit: "mmol/L", status: last.lactato > 2 ? "alto" : "normal" },
    { name: "Temp", value: last.temp, unit: "°C", status: last.temp > 38 ? "alto" : "normal" },
  ];
  return { trend, sideEffects, labGauges, leucogramData, lastLab: last, cobertura: cov?.status ?? null, amploDemais: cov?.amploDemais ?? false, semAntimicrobiano: !!drug.semAntimicrobiano };
}

function LabGauge({ name, value, unit, status }: { name: string; value: number; unit: string; status: string }) {
  const color = status === "baixo" ? "text-destructive" : status === "alto" ? "text-chart-5" : "text-green-500";
  const bg = status === "baixo" ? "bg-destructive/10 border-destructive/30" : status === "alto" ? "bg-chart-5/10 border-chart-5/30" : "bg-green-500/10 border-green-500/30";
  return (<div className={`rounded-lg border p-3 text-center ${bg}`}><p className="text-xs text-muted-foreground font-medium">{name}</p><p className={`text-lg font-mono font-bold ${color}`}>{typeof value === "number" ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}</p><p className="text-[10px] text-muted-foreground">{unit}</p><p className={`text-[9px] font-semibold ${color}`}>{status === "baixo" ? "▼ BAIXO" : status === "alto" ? "▲ ALTO" : "● NORMAL"}</p></div>);
}

export default function SimuladorInfeccaoLab() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<InfCase | null>(null);
  const isEmbed = useIsEmbed();
  const embedCaseId = useEmbedCaseId();
  useEffect(() => {
    if (isEmbed && embedCaseId && !activeCase) {
      const decoded = decodeURIComponent(embedCaseId);
      const found = BUILT_IN_CASES.find((c: any) => c.title === decoded);
      if (found) setActiveCase(found as any);
    }
  }, [isEmbed, embedCaseId, activeCase]);
  const [selectedDrugIdx, setSelectedDrugIdx] = useState(0);
  const [dose, setDose] = useState(DRUGS[0].doseMin);
  const [running, setRunning] = useState(false);
  const [animStep, setAnimStep] = useState(0);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);

  const selectedDrug = DRUGS[selectedDrugIdx];

  useEffect(() => { if (virtualRoomCase) { const cd = virtualRoomCase as any; setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI, patient: cd.patient ?? { name: "Paciente", age: 50, weight: 70, sex: "M", specialGroup: [] }, scenario: cd.scenario ?? "", baseLab: cd.baseLab ?? BUILT_IN_CASES[0].baseLab, expectedDrugs: cd.expectedDrugs ?? [], clinicalTip: cd.clinicalTip ?? "", references: cd.references ?? [], cobertura: cd.cobertura }); } }, [virtualRoomCase]);

  // Ao trocar de caso, volta ao primeiro fármaco (a conduta/dose do caso anterior não pode ficar presa na tela).
  useEffect(() => { setSelectedDrugIdx(0); setDose(DRUGS[0].doseMin); }, [activeCase?.title]);

  const simulation = useMemo(() => computeSimulation(selectedDrug, dose, activeCase?.baseLab ?? BUILT_IN_CASES[0].baseLab, activeCase ?? undefined), [selectedDrug, dose, activeCase]);
  const displayTrend = useMemo(() => running ? simulation.trend.slice(0, animStep + 1) : simulation.trend, [running, animStep, simulation.trend]);

  useEffect(() => { if (!running) return; if (animStep >= simulation.trend.length - 1) { setRunning(false); return; } const t = setTimeout(() => setAnimStep(s => s + 1), 200); return () => clearTimeout(t); }, [running, animStep, simulation.trend.length]);
  const handleStart = () => { setAnimStep(0); setRunning(true); };

  const handleFinish = useCallback(() => { if (!activeCase || submitted) return; const s = lastScore; const decisions: SimDecision[] = [{ label: "ATB", userChoice: selectedDrug.name, idealChoice: activeCase.expectedDrugs.join(", ") || "—", correct: activeCase.expectedDrugs.includes(selectedDrug.name), category: "Seleção" }]; submitResults({ score: s, actions: buildSimulatorDecisions(SLUG, decisions) }); }, [activeCase, selectedDrug, submitted, submitResults, lastScore]);
  useEffect(() => { if (challengeCompleted && !submitted && activeCase) handleFinish(); }, [challengeCompleted]);
  useEffect(() => { if (isVirtualRoom && submitted) { const t = setTimeout(() => navigate("/"), 15000); return () => clearTimeout(t); } }, [isVirtualRoom, submitted, navigate]);
  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient ?? { name: "Paciente", age: 50, weight: 70, sex: "M", specialGroup: [] }, scenario: c.scenario ?? "", baseLab: c.baseLab ?? BUILT_IN_CASES[0].baseLab, expectedDrugs: c.expectedDrugs ?? [], clinicalTip: c.clinicalTip ?? "", references: c.references ?? [], cobertura: c.cobertura });

  if (isVirtualRoom && !activeCase) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3"><Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button><div><h1 className="text-2xl font-bold">Sinais Laboratoriais de Infecção</h1><p className="text-muted-foreground">Interprete leucograma, PCR, PCT e lactato para guiar antibioticoterapia.</p><ShareToolButton toolSlug="farmacoterapia-infeccao-lab" toolName="Marcadores de Infecção e Antibioticoterapia" /><AdminPromptViewer toolSlug={`sim-${SLUG}`} toolName="Infecção Lab" toolType="simulator" prompt={getNativePrompt(`sim-${SLUG}`) || ""} /></div></div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Bug className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader><CardContent className="space-y-3">
          {BUILT_IN_CASES.map((c, i) => <NativeCaseCard key={i} caseItem={c} onClick={() => setActiveCase(c)} />)}
          {!isVirtualRoom && aiCases.filter((c: any) => c.isAI).map((c: any) => <AICaseCard key={c.id} caseItem={c} onClick={() => loadAICase(c)} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />)}
          {!isVirtualRoom && <Button onClick={() => generateCase()} disabled={isGenerating} className="w-full gap-2 mt-2">{isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Gerar Caso com IA</Button>}
        </CardContent></Card>
      </div>
    );
  }

  const leucColors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"];

  return (
    <div className="space-y-4">
      {examFeedback && <ExamFeedbackOverlay score={examFeedback.score} simulatorSlug={SLUG} caseTitle={examFeedback.caseTitle} examProgress={examProgress!} onProceed={proceedToNext} isFinalActivity={examFeedback.isFinalActivity} />}
      <ExamBanner simulatorSlug={SLUG} caseTitle={activeCase.title} examProgress={examProgress} />
      <div className="flex items-center gap-3 flex-wrap">{!isEmbed && <Button variant="ghost" size="icon" onClick={isVirtualRoom ? () => navigate("/") : () => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>}<h2 className="text-xl font-bold">{activeCase.title}</h2><Badge variant="outline">{activeCase.difficulty}</Badge><div className="ml-auto"><ShareToolButton toolSlug="farmacoterapia-infeccao-lab" toolName="Marcadores de Infecção e Antibioticoterapia" caseId={activeCase.title} /></div></div>
      <Card><CardContent className="pt-4 space-y-2"><p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age}a, {activeCase.patient.weight}kg, {activeCase.patient.sex}</p><p className="text-sm text-muted-foreground">{activeCase.scenario}</p><p className="text-xs font-mono bg-muted/50 p-2 rounded">Hemocultura: {activeCase.baseLab.hemocultura}</p></CardContent></Card>

      <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Marcadores (após tratamento)</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">{simulation.labGauges.map(g => <LabGauge key={g.name} {...g} />)}</div></CardContent></Card>

      {/* Cobertura do provável agente (só nos casos que a definem) */}
      {activeCase.cobertura && (
        <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4 space-y-1">
          <p className="text-xs text-muted-foreground">Cobertura para o provável agente — {activeCase.cobertura.agentes}</p>
          {simulation.cobertura === "adequada" && <p className="text-sm font-semibold text-green-600">{selectedDrug.name}: cobertura ADEQUADA{simulation.amploDemais ? " — espectro mais amplo que o necessário" : ""}</p>}
          {simulation.cobertura === "parcial" && <p className="text-sm font-semibold text-chart-5">{selectedDrug.name}: cobertura PARCIAL — efeito reduzido sobre os marcadores</p>}
          {simulation.cobertura === "inadequada" && <p className="text-sm font-semibold text-destructive">{selectedDrug.name}: cobertura INADEQUADA — sem efeito sobre os marcadores</p>}
          {simulation.cobertura === "nenhuma" && <p className="text-sm font-semibold text-muted-foreground">Sem antimicrobiano: nenhum agente é tratado</p>}
        </CardContent></Card>
      )}

      {/* Leucogram */}
      <Card><CardHeader><CardTitle className="text-base">Leucograma Diferencial</CardTitle></CardHeader><CardContent>
        <ResponsiveContainer width="100%" height={120}><BarChart data={simulation.leucogramData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} /><YAxis stroke="hsl(var(--muted-foreground))" /><Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} labelStyle={{ color: "hsl(var(--foreground))" }} itemStyle={{ color: "hsl(var(--foreground))" }} /><Bar dataKey="valor" name="/mm³">{simulation.leucogramData.map((_, i) => <Cell key={i} fill={leucColors[i % leucColors.length]} />)}</Bar></BarChart></ResponsiveContainer>
      </CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle className="text-base">Antibioticoterapia</CardTitle></CardHeader><CardContent className="space-y-4">
          <Select value={String(selectedDrugIdx)} onValueChange={v => { setSelectedDrugIdx(Number(v)); setDose(DRUGS[Number(v)].doseMin); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DRUGS.map((d, i) => <SelectItem key={i} value={String(i)}>{d.name}</SelectItem>)}</SelectContent></Select>
          <p className="text-[10px] text-muted-foreground">Espectro: {selectedDrug.spectrum}</p>
          {selectedDrug.noDose ? <p className="text-xs text-muted-foreground">Sem dose: representa a conduta de não iniciar antimicrobiano e observar. Os marcadores ficam no valor do caso (o simulador não modela a evolução natural da doença).</p> : <div><div className="flex justify-between mb-1"><span className="text-xs">Dose</span><span className="text-xs font-bold">{dose} {selectedDrug.doseUnit}</span></div><Slider value={[dose]} onValueChange={([v]) => setDose(v)} min={selectedDrug.doseMin} max={selectedDrug.doseMax} step={selectedDrug.doseStep} /></div>}
          <Button className="w-full gap-2" onClick={handleStart} disabled={running}><Play className="h-4 w-4" /> {running ? "Simulando..." : "Simular 48h"}</Button>
        </CardContent></Card>
        <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-base">Tendência (48h)</CardTitle><p className="text-xs text-muted-foreground">Eixo esquerdo: PCR (mg/L). Eixo direito: PCT (ng/mL) e Lactato (mmol/L). A Temp (tracejada) usa uma escala própria de 36 a 41 °C; leia o valor exato no medidor Temp. Passe o mouse sobre os pontos para ver cada hora.</p></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={220}><LineChart data={displayTrend} margin={{ right: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="hour" label={{ value: "Horas", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" /><YAxis yAxisId="pcr" stroke="hsl(var(--chart-1))" /><YAxis yAxisId="pct" orientation="right" stroke="hsl(var(--chart-2))" /><YAxis yAxisId="temp" hide domain={[36, 41]} /><Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} labelStyle={{ color: "hsl(var(--foreground))" }} itemStyle={{ color: "hsl(var(--foreground))" }} /><Legend /><Line yAxisId="pcr" type="monotone" dataKey="pcr" name="PCR (mg/L)" stroke="hsl(var(--chart-1))" strokeWidth={2} dot /><Line yAxisId="pct" type="monotone" dataKey="pct" name="PCT (ng/mL)" stroke="hsl(var(--chart-2))" strokeWidth={2} dot /><Line yAxisId="pct" type="monotone" dataKey="lactato" name="Lactato (mmol/L)" stroke="hsl(var(--chart-3))" strokeWidth={2} dot /><Line yAxisId="temp" type="monotone" dataKey="temp" name="Temp (°C)" stroke="hsl(var(--chart-4))" strokeWidth={2} strokeDasharray="4 3" dot /></LineChart></ResponsiveContainer>
        </CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-destructive" /> Risco de Eventos Adversos (%)</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={120}><BarChart data={simulation.sideEffects} layout="vertical" margin={{ left: 80 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" domain={[0, 100]} /><YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={80} /><Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} labelStyle={{ color: "hsl(var(--foreground))" }} itemStyle={{ color: "hsl(var(--foreground))" }} /><Bar dataKey="risco" name="Risco %">{simulation.sideEffects.map((e, i) => <Cell key={i} fill={e.risco > 30 ? "hsl(var(--destructive))" : e.risco > 15 ? "hsl(38 92% 50%)" : "hsl(142 71% 45%)"} />)}</Bar></BarChart></ResponsiveContainer></CardContent></Card>


      {(() => { const idx = BUILT_IN_CASES.findIndex(c => c.title === activeCase.title); return <SimulatorChallengeMode challengeSet={getInfeccaoLabChallenges(idx >= 0 ? idx : undefined)} simulatorState={{ drug: selectedDrug.name, dose, spectrum: selectedDrug.spectrum, labGauges: simulation.labGauges, sideEffects: simulation.sideEffects, trend: simulation.trend, lastLab: simulation.lastLab, baseLab: activeCase.baseLab, leucogramData: simulation.leucogramData, cobertura: simulation.cobertura, amploDemais: simulation.amploDemais, semAntimicrobiano: simulation.semAntimicrobiano }} onComplete={(score, total) => { setLastScore(total > 0 ? Math.round((score / total) * 100) : 0); setChallengeCompleted(true); }} />; })()}

      {isVirtualRoom && submitted && <div className="space-y-2"><Button onClick={() => setShowFeedback(true)} variant="outline" className="w-full gap-2"><Eye className="h-4 w-4" /> Mostrar Resultados</Button></div>}
    </div>
  );
}
