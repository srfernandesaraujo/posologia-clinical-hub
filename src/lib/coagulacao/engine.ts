/**
 * Motor do simulador "Coagulação e Anticoagulantes" (Farmacoterapia Laboratorial).
 * Função pura: a página só chama `computeSimulation` e desenha. Os números citados nos desafios
 * (src/data/simulatorChallenges.ts → getCoagulacaoLabChallenges) são fixados em engine.test.ts.
 *
 * Revisão dos desafios (todos os campos novos são OPCIONAIS; casos por IA e do marketplace não os têm):
 *  - `linear`: efeito proporcional à dose (varfarina: +0,3 INR por mg; DOAC e HBPM: anti-Xa por mg).
 *    `perKg` divide a dose pelo peso do paciente (enoxaparina: 0,4 UI/mL por mg/kg/dia ⇒ 1 mg/kg 12/12h ≈ 0,8).
 *    Antes, a varfarina dava INR 2,0–2,5 em QUALQUER dose (1 a 10 mg).
 *  - `reversal`: reversão proporcional ao excesso (vitamina K: 1−e^(−0,45·dose); suspensões: fração fixa;
 *    protamina: dose ÷ dose necessária, com efeito anticoagulante se a dose passa de 1,5× a necessária).
 *    Antes, a vitamina K subtraía 2 de INR em qualquer caso (8,2 → 6,2 mesmo com 10 mg).
 *  - `caseFlag`: condutas sem dose ("Suspender varfarina", "Suspender HNF") e a "Pausa da rivaroxabana"
 *    só aparecem nos casos cujo `flags` as inclui.
 *  - `washout`: a dose é o nº de horas sem tomar o DOAC; anti-Xa = basal × 0,5^(h ÷ meia-vida).
 *  - Heparinas não derrubam mais as plaquetas por dose (a queda por HIT é imune, não dose-dependente).
 *  - Case opcional `infusion.hnfUnitsPerHour`: define a dose de protamina necessária (1 mg por 100 UI das últimas 2 h).
 */

export type CoagKey = "inr" | "ttpa" | "antiXa" | "plaquetas" | "fibrinogenio" | "dDimero";

export interface CoagDrug {
  name: string; class: string;
  doseMin: number; doseMax: number; doseUnit: string; doseStep: number;
  effects: Record<CoagKey, number>;
  sideEffects: { sangramento: number; hit: number; osteoporose: number; necroseCumarinicos: number; gi: number };
  daysToEffect: number;
  /** Dias até o efeito pleno depois de `daysToEffect` (padrão 5, o ritmo da varfarina); heparinas, DOAC e reversores agem em ~1 dia. */
  rampDays?: number;
  linear?: Partial<Record<"inr" | "antiXa", number>>;
  perKg?: boolean;
  reversal?: { k?: number; fixed?: number; targets: ("inr" | "ttpa" | "antiXa")[]; protamine?: boolean };
  washout?: { halfLifeH: number };
  noDose?: boolean;
  caseFlag?: string;
}

export interface CoagBaseLab { inr: number; ttpa: number; tp: number; antiXa: number; plaquetas: number; fibrinogenio: number; dDimero: number; hb: number }

export interface CoagCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; age: number; weight: number; sex: string; specialGroup: string[]; diagnosis?: string };
  scenario: string;
  baseLab: CoagBaseLab;
  expectedDrugs: string[];
  clinicalTip: string;
  references: string[];
  /** Condutas extras liberadas no caso: "suspenderVarfarina" | "suspenderHnf" | "pausaRivaroxabana". */
  flags?: string[];
  /** Infusão de HNF em curso (define a dose de protamina necessária). */
  infusion?: { hnfUnitsPerHour: number };
}

const NO_SIDE = { sangramento: 0, hit: 0, osteoporose: 0, necroseCumarinicos: 0, gi: 0 };
const NO_EFFECT: Record<CoagKey, number> = { inr: 0, ttpa: 0, antiXa: 0, plaquetas: 0, fibrinogenio: 0, dDimero: 0 };

export const DRUGS: CoagDrug[] = [
  { name: "Varfarina", class: "Antagonista Vit K", doseMin: 1, doseMax: 10, doseUnit: "mg/dia", doseStep: 0.5, effects: { ...NO_EFFECT, ttpa: 5 }, linear: { inr: 0.3 }, sideEffects: { sangramento: 0.3, hit: 0, osteoporose: 0, necroseCumarinicos: 0.05, gi: 0.05 }, daysToEffect: 3 },
  { name: "Heparina NF (HNF)", class: "Heparina", doseMin: 5000, doseMax: 30000, doseUnit: "UI/dia EV", doseStep: 2500, effects: { inr: 0.1, ttpa: 30, antiXa: 0.3, plaquetas: 0, fibrinogenio: 0, dDimero: -0.2 }, sideEffects: { sangramento: 0.35, hit: 0.15, osteoporose: 0.1, necroseCumarinicos: 0, gi: 0 }, daysToEffect: 0.5, rampDays: 1 },
  { name: "Enoxaparina", class: "HBPM", doseMin: 40, doseMax: 160, doseUnit: "mg/dia SC", doseStep: 20, effects: { inr: 0, ttpa: 5, antiXa: 0, plaquetas: 0, fibrinogenio: 0, dDimero: -0.3 }, linear: { antiXa: 0.4 }, perKg: true, sideEffects: { sangramento: 0.2, hit: 0.03, osteoporose: 0.05, necroseCumarinicos: 0, gi: 0.02 }, daysToEffect: 1, rampDays: 1 },
  { name: "Rivaroxabana", class: "DOAC (anti-Xa)", doseMin: 10, doseMax: 30, doseUnit: "mg/dia", doseStep: 5, effects: { inr: 0, ttpa: 5, antiXa: 0, plaquetas: 0, fibrinogenio: 0, dDimero: -0.4 }, linear: { inr: 0.015, antiXa: 0.025 }, sideEffects: { sangramento: 0.2, hit: 0, osteoporose: 0, necroseCumarinicos: 0, gi: 0.15 }, daysToEffect: 1, rampDays: 1 },
  { name: "Apixabana", class: "DOAC (anti-Xa)", doseMin: 2.5, doseMax: 10, doseUnit: "mg 12/12h", doseStep: 2.5, effects: { inr: 0, ttpa: 3, antiXa: 0, plaquetas: 0, fibrinogenio: 0, dDimero: -0.3 }, linear: { inr: 0.03, antiXa: 0.08 }, sideEffects: { sangramento: 0.15, hit: 0, osteoporose: 0, necroseCumarinicos: 0, gi: 0.08 }, daysToEffect: 1, rampDays: 1 },
  { name: "Dabigatrana", class: "DOAC (anti-IIa)", doseMin: 110, doseMax: 150, doseUnit: "mg 12/12h", doseStep: 40, effects: { inr: 0.2, ttpa: 15, antiXa: 0, plaquetas: 0, fibrinogenio: -10, dDimero: -0.3 }, sideEffects: { sangramento: 0.2, hit: 0, osteoporose: 0, necroseCumarinicos: 0, gi: 0.15 }, daysToEffect: 1, rampDays: 1 },
  { name: "Vitamina K (Fitomenadiona)", class: "Reversor", doseMin: 1, doseMax: 10, doseUnit: "mg EV/VO", doseStep: 0.5, effects: { ...NO_EFFECT }, reversal: { k: 0.45, targets: ["inr", "ttpa"] }, sideEffects: { ...NO_SIDE, sangramento: -0.3 }, daysToEffect: 1, rampDays: 2 },
  { name: "Ácido Tranexâmico", class: "Antifibrinolítico", doseMin: 500, doseMax: 3000, doseUnit: "mg/dia", doseStep: 250, effects: { inr: 0, ttpa: 0, antiXa: 0, plaquetas: 0, fibrinogenio: 20, dDimero: -0.5 }, sideEffects: { sangramento: -0.3, hit: 0, osteoporose: 0, necroseCumarinicos: 0, gi: 0.1 }, daysToEffect: 0.5, rampDays: 1 },
  { name: "Protamina", class: "Reversor HNF", doseMin: 10, doseMax: 100, doseUnit: "mg EV", doseStep: 10, effects: { ...NO_EFFECT }, reversal: { targets: ["ttpa", "antiXa"], protamine: true }, sideEffects: { ...NO_SIDE, sangramento: -0.4, gi: 0.05 }, daysToEffect: 0.1, rampDays: 1 },
  // Condutas sem dose / pausa: só aparecem nos casos que as liberam em `flags`.
  { name: "Suspender varfarina (sem dose)", class: "Conduta", doseMin: 0, doseMax: 0, doseUnit: "", doseStep: 1, effects: { ...NO_EFFECT }, reversal: { fixed: 0.7, targets: ["inr", "ttpa"] }, sideEffects: { ...NO_SIDE }, daysToEffect: 2, rampDays: 4, noDose: true, caseFlag: "suspenderVarfarina" },
  { name: "Suspender HNF (sem dose)", class: "Conduta", doseMin: 0, doseMax: 0, doseUnit: "", doseStep: 1, effects: { ...NO_EFFECT }, reversal: { fixed: 0.85, targets: ["ttpa", "antiXa"] }, sideEffects: { ...NO_SIDE }, daysToEffect: 0.1, rampDays: 1, noDose: true, caseFlag: "suspenderHnf" },
  { name: "Pausa da rivaroxabana", class: "Conduta pré-operatória", doseMin: 0, doseMax: 96, doseUnit: "h sem tomar", doseStep: 12, effects: { ...NO_EFFECT }, washout: { halfLifeH: 12 }, sideEffects: { ...NO_SIDE }, daysToEffect: 0, noDose: false, caseFlag: "pausaRivaroxabana" },
];

/** Protamina necessária (mg): 1 mg por 100 UI de HNF das últimas ~2 h de infusão (ACCP 2012). Sem infusão no caso: 30 mg. */
export function protamineNeedMg(c?: { infusion?: { hnfUnitsPerHour: number } } | null): number {
  return c?.infusion ? (c.infusion.hnfUnitsPerHour * 2) / 100 : 30;
}

export interface SimOpts { weight?: number; infusion?: { hnfUnitsPerHour: number } }

const r1 = (x: number) => +x.toFixed(1);

export function computeSimulation(drug: CoagDrug, dose: number, baseLab: CoagBaseLab, opts: SimOpts = {}) {
  const weight = opts.weight && opts.weight > 0 ? opts.weight : 70;
  const doseFrac = (dose - drug.doseMin) / Math.max(drug.doseMax - drug.doseMin, 1);
  const intensity = 0.65 + doseFrac * 0.35;
  const eff = (k: "inr" | "antiXa" | CoagKey): number => {
    const lin = (drug.linear as any)?.[k];
    if (lin !== undefined) return lin * (drug.perKg ? dose / weight : dose);
    return drug.effects[k as CoagKey] * intensity;
  };
  // fração do excesso revertida no efeito pleno (0–1) e efeito anticoagulante de protamina em excesso
  let revFrac = 0, protExcess = 0;
  if (drug.reversal) {
    if (drug.reversal.protamine) {
      const need = protamineNeedMg(opts);
      revFrac = Math.min(dose / need, 1);
      protExcess = Math.max(0, dose - 1.5 * need);
    } else if (drug.reversal.fixed !== undefined) revFrac = drug.reversal.fixed;
    else if (drug.reversal.k !== undefined) revFrac = 1 - Math.exp(-drug.reversal.k * dose);
  }
  const rev = (t: "inr" | "ttpa" | "antiXa") => !!drug.reversal && drug.reversal.targets.includes(t);
  const trend: any[] = [];
  for (let d = 0; d <= 7; d++) {
    const p = d >= drug.daysToEffect ? Math.min((d - drug.daysToEffect + 1) / (drug.rampDays ?? 5), 1) : 0;
    let inr = baseLab.inr + eff("inr") * p;
    let ttpa = baseLab.ttpa + eff("ttpa") * p;
    let antiXa = baseLab.antiXa + eff("antiXa") * p;
    if (rev("inr")) inr -= (baseLab.inr - 1.0) * revFrac * p;
    if (rev("ttpa")) ttpa -= (baseLab.ttpa - 30) * revFrac * p;
    if (rev("antiXa")) antiXa -= baseLab.antiXa * revFrac * p;
    if (protExcess > 0) ttpa += protExcess * p;
    if (drug.washout) antiXa = baseLab.antiXa * Math.pow(0.5, (dose * (d / 7)) / drug.washout.halfLifeH);
    trend.push({
      day: d,
      inr: Math.max(0.8, r1(inr)),
      ttpa: Math.max(20, Math.round(ttpa)),
      antiXa: Math.max(0, +antiXa.toFixed(2)),
      plaquetas: Math.max(10, Math.round(baseLab.plaquetas + drug.effects.plaquetas * intensity * p * 10)),
      fibrinogenio: Math.max(50, Math.round(baseLab.fibrinogenio + drug.effects.fibrinogenio * intensity * p)),
      dDimero: Math.max(0, +(baseLab.dDimero + drug.effects.dDimero * intensity * p).toFixed(2)),
    });
  }
  const last = trend[trend.length - 1];
  const sideEffects = Object.entries(drug.sideEffects).map(([k, v]) => ({
    name: k === "sangramento" ? "Sangramento" : k === "hit" ? "HIT" : k === "osteoporose" ? "Osteoporose" : k === "necroseCumarinicos" ? "Necrose Cutânea" : "GI",
    risco: Math.round(Math.max(0, v * (0.5 + doseFrac * 0.8)) * 100),
  }));
  // "elevado" = acima do normal de quem NÃO anticoagula; o alvo terapêutico fica no texto do desafio.
  const labGauges = [
    { name: "INR", value: last.inr, unit: "", refLow: 0.8, refHigh: 1.2, status: last.inr > 4.5 ? "alto" : last.inr > 1.2 ? "elevado" : "normal" },
    { name: "TTPa", value: last.ttpa, unit: "s", refLow: 25, refHigh: 35, status: last.ttpa > 80 ? "alto" : last.ttpa > 35 ? "elevado" : "normal" },
    { name: "Anti-Xa", value: last.antiXa, unit: "UI/mL", refLow: 0, refHigh: 0.1, status: last.antiXa > 1.0 ? "alto" : last.antiXa > 0.1 ? "elevado" : "normal" },
    { name: "Plaquetas", value: last.plaquetas, unit: "×10³/µL", refLow: 150, refHigh: 400, status: last.plaquetas < 50 ? "alto" : last.plaquetas < 150 ? "baixo" : "normal" },
    { name: "Fibrinogênio", value: last.fibrinogenio, unit: "mg/dL", refLow: 200, refHigh: 400, status: last.fibrinogenio < 150 ? "baixo" : "normal" },
    { name: "D-dímero", value: last.dDimero, unit: "µg/mL FEU", refLow: 0, refHigh: 0.5, status: last.dDimero > 4.0 ? "alto" : last.dDimero > 0.5 ? "elevado" : "normal" },
    { name: "Hb", value: baseLab.hb, unit: "g/dL", refLow: 12, refHigh: 17, status: baseLab.hb < 8 ? "alto" : baseLab.hb < 12 ? "baixo" : "normal" },
  ];
  return { trend, sideEffects, labGauges, lastLab: last };
}

/** Texto do valor no cartão: Anti-Xa e D-dímero com 2 casas (0,03 não pode aparecer como 0,0). */
export function formatLab(name: string, value: number): string {
  if (name === "Anti-Xa" || name === "D-dímero") return value.toFixed(2);
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function bleedingRisk(inr: number, ttpa: number, plaquetas: number, hb: number) {
  const risk = (inr > 4 ? 3 : inr > 3 ? 2 : 0) + (ttpa > 80 ? 2 : ttpa > 60 ? 1 : 0) + (plaquetas < 50 ? 3 : plaquetas < 100 ? 1 : 0) + (hb < 8 ? 3 : hb < 10 ? 1 : 0);
  const level = risk >= 6 ? "CRÍTICO" : risk >= 3 ? "ALTO" : risk >= 1 ? "MODERADO" : "BAIXO";
  return { risk, level };
}
